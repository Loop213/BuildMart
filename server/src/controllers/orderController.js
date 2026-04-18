import { Address } from "../models/Address.js";
import { Coupon } from "../models/Coupon.js";
import { Order } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import { Product } from "../models/Product.js";
import { Setting } from "../models/Setting.js";
import { validateCoupon } from "./couponController.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { formatAddress, getPaymentStatus, normalizePaymentMethod } from "../utils/paymentUtils.js";
import mongoose from "mongoose";

function isTransactionUnsupported(error) {
  return (
    error?.message?.includes("Transaction numbers are only allowed on a replica set member or mongos") ||
    error?.codeName === "IllegalOperation"
  );
}

async function buildOrderPayload({ req, items, shippingAddress, selectedAddressId, paymentMethod, couponCode, initialPayment, gstApplied, session }) {
  const productIds = items.map((item) => item.product);
  const productQuery = Product.find({ _id: { $in: productIds } });
  const products = session ? await productQuery.session(session) : await productQuery;
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  const normalizedItems = items.map((item) => {
    const product = productMap.get(String(item.product));
    if (!product) {
      throw new Error("A selected product no longer exists");
    }
    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }
    return {
      product: product._id,
      name: product.name,
      category: product.category,
      image: product.image,
      price: product.price,
      unit: product.unit,
      quantity: item.quantity
    };
  });

  let resolvedAddress = shippingAddress;
  if (selectedAddressId) {
    let addressQuery = Address.findOne({ _id: selectedAddressId, user: req.user._id });
    if (session) {
      addressQuery = addressQuery.session(session);
    }
    const savedAddress = await addressQuery;
    if (!savedAddress) {
      throw new Error("Saved address not found");
    }
    resolvedAddress = {
      name: savedAddress.name,
      phone: savedAddress.phone,
      address: savedAddress.address,
      city: savedAddress.city,
      state: savedAddress.state,
      pincode: savedAddress.pincode
    };
  }

  validateShippingAddress(resolvedAddress);

  const subtotal = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let coupon = null;
  let discountAmount = 0;

  if (couponCode) {
    let couponQuery = Coupon.findOne({ code: couponCode.toUpperCase() });
    if (session) {
      couponQuery = couponQuery.session(session);
    }
    coupon = await couponQuery;
    validateCoupon(coupon, subtotal);
    discountAmount =
      coupon.type === "percentage"
        ? Math.min((subtotal * coupon.value) / 100, subtotal)
        : Math.min(coupon.value, subtotal);
  }

  let settingsQuery = Setting.findOne();
  if (session) {
    settingsQuery = settingsQuery.session(session);
  }
  const settings = await settingsQuery;
  const taxableAmount = Math.max(subtotal - discountAmount, 0);
  const gstPercentage = gstApplied ? Number(settings?.gstPercentage || 18) : 0;
  const gstAmount = Number(((taxableAmount * gstPercentage) / 100).toFixed(2));
  const totalAmount = Number((taxableAmount + gstAmount).toFixed(2));
  const requestedInitialPayment = Number(initialPayment || 0);

  if (requestedInitialPayment > totalAmount) {
    throw new Error("Initial payment cannot exceed the order total");
  }

  const paidAmount = Math.min(requestedInitialPayment, totalAmount);
  const remainingAmount = Math.max(totalAmount - paidAmount, 0);
  const normalizedMethod = normalizePaymentMethod(paymentMethod);
  const paymentHistory = paidAmount
    ? [
        {
          amount: paidAmount,
          method: normalizedMethod,
          note: "Initial payment",
          remainingBalance: remainingAmount
        }
      ]
    : [];

  return {
    normalizedItems,
    resolvedAddress,
    subtotal,
    discountAmount,
    coupon,
    gstPercentage,
    gstAmount,
    totalAmount,
    paidAmount,
    remainingAmount,
    normalizedMethod,
    paymentHistory,
    invoiceNumber: `BM-${Date.now()}`
  };
}

function validateShippingAddress(address) {
  const requiredFields = ["name", "phone", "address", "city", "state", "pincode"];

  for (const field of requiredFields) {
    if (!String(address?.[field] || "").trim()) {
      throw new Error(`${field} is required`);
    }
  }
}

async function buildInvoicePayload(orderId, currentUser) {
  const order = await Order.findById(orderId).populate("user", "name email").lean();
  if (!order) {
    throw new Error("Order not found");
  }

  if (currentUser.role !== "admin" && String(order.user?._id || order.user) !== String(currentUser._id)) {
    throw new Error("You cannot view this invoice");
  }

  const [payments, settings] = await Promise.all([
    Payment.find({ order: order._id }).lean().sort({ date: 1, createdAt: 1 }),
    Setting.findOne().lean()
  ]);

  return {
    company: {
      name: settings?.companyName || "BuildMart Construction Supplies",
      address: settings?.companyAddress || "Industrial Area, New Delhi, India",
      phone: settings?.companyPhone || "+91 98765 43210",
      email: settings?.companyEmail || "support@buildmart.com",
      gstNumber: settings?.gstNumber || "",
      logoUrl: settings?.logoUrl || "",
      signatureUrl: settings?.signatureUrl || "",
      stampUrl: settings?.stampUrl || "",
      termsAndConditions:
        settings?.termsAndConditions ||
        "Materials once delivered will be considered accepted unless reported the same day."
    },
    order: {
      ...order,
      billingAddress: order.shippingAddress,
      shippingAddressText: formatAddress(order.shippingAddress),
      paymentHistory: payments
    }
  };
}

export const createOrder = asyncHandler(async (req, res) => {
  const {
    items,
    shippingAddress,
    selectedAddressId,
    paymentMethod,
    couponCode,
    initialPayment = 0,
    gstApplied = false
  } = req.body;

  if (!items?.length) {
    res.status(400);
    throw new Error("Order items are required");
  }

  const createWithoutTransaction = async () => {
    const payload = await buildOrderPayload({
      req,
      items,
      shippingAddress,
      selectedAddressId,
      paymentMethod,
      couponCode,
      initialPayment,
      gstApplied,
      session: null
    });

    if (payload.coupon) {
      payload.coupon.usedCount += 1;
      await payload.coupon.save();
    }

    const order = await Order.create({
      user: req.user._id,
      userStatusSnapshot: req.user.status || "pending",
      items: payload.normalizedItems,
      shippingAddress: payload.resolvedAddress,
      subtotal: payload.subtotal,
      discountAmount: payload.discountAmount,
      gstApplied: Boolean(gstApplied),
      gstPercentage: payload.gstPercentage,
      gstAmount: payload.gstAmount,
      totalAmount: payload.totalAmount,
      paidAmount: payload.paidAmount,
      remainingAmount: payload.remainingAmount,
      paymentMethod: payload.normalizedMethod === "Cash" ? "COD" : payload.normalizedMethod,
      paymentStatus: getPaymentStatus(payload.totalAmount, payload.paidAmount),
      paymentHistory: payload.paymentHistory,
      paymentCount: payload.paymentHistory.length,
      coupon: payload.coupon
        ? {
            code: payload.coupon.code,
            type: payload.coupon.type,
            value: payload.coupon.value
          }
        : undefined,
      invoiceNumber: payload.invoiceNumber
    });

    await Promise.all(
      payload.normalizedItems.map((item) =>
        Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } })
      )
    );

    if (payload.paidAmount > 0) {
      await Payment.create({
        order: order._id,
        user: req.user._id,
        amount: payload.paidAmount,
        method: payload.normalizedMethod,
        date: new Date(),
        note: "Initial payment",
        remainingBalance: payload.remainingAmount,
        status: "Approved",
        approvedBy: req.user._id,
        approvedAt: new Date(),
        createdByRole: "customer"
      });
    }

    return order;
  };

  try {
    const session = await mongoose.startSession();
    let createdOrder;
    try {
      await session.withTransaction(async () => {
        const payload = await buildOrderPayload({
          req,
          items,
          shippingAddress,
          selectedAddressId,
          paymentMethod,
          couponCode,
          initialPayment,
          gstApplied,
          session
        });

        if (payload.coupon) {
          payload.coupon.usedCount += 1;
          await payload.coupon.save({ session });
        }

        const [order] = await Order.create(
          [
            {
              user: req.user._id,
              userStatusSnapshot: req.user.status || "pending",
              items: payload.normalizedItems,
              shippingAddress: payload.resolvedAddress,
              subtotal: payload.subtotal,
              discountAmount: payload.discountAmount,
              gstApplied: Boolean(gstApplied),
              gstPercentage: payload.gstPercentage,
              gstAmount: payload.gstAmount,
              totalAmount: payload.totalAmount,
              paidAmount: payload.paidAmount,
              remainingAmount: payload.remainingAmount,
              paymentMethod: payload.normalizedMethod === "Cash" ? "COD" : payload.normalizedMethod,
              paymentStatus: getPaymentStatus(payload.totalAmount, payload.paidAmount),
              paymentHistory: payload.paymentHistory,
              paymentCount: payload.paymentHistory.length,
              coupon: payload.coupon
                ? {
                    code: payload.coupon.code,
                    type: payload.coupon.type,
                    value: payload.coupon.value
                  }
                : undefined,
              invoiceNumber: payload.invoiceNumber
            }
          ],
          { session }
        );

        await Promise.all(
          payload.normalizedItems.map((item) =>
            Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } }, { session })
          )
        );

        if (payload.paidAmount > 0) {
          await Payment.create(
            [
              {
                order: order._id,
                user: req.user._id,
                amount: payload.paidAmount,
                method: payload.normalizedMethod,
                date: new Date(),
                note: "Initial payment",
                remainingBalance: payload.remainingAmount,
                status: "Approved",
                approvedBy: req.user._id,
                approvedAt: new Date(),
                createdByRole: "customer"
              }
            ],
            { session }
          );
        }

        createdOrder = order;
      });
      res.status(201).json(createdOrder);
      return;
    } catch (error) {
      if (!isTransactionUnsupported(error)) {
        throw error;
      }
    } finally {
      session.endSession();
    }
  } catch (error) {
    if (!isTransactionUnsupported(error)) {
      throw error;
    }
  }

  const createdOrder = await createWithoutTransaction();
  res.status(201).json(createdOrder);
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).lean().sort({ createdAt: -1 });
  const orderIds = orders.map((order) => order._id);
  const payments = await Payment.find({ order: { $in: orderIds } }).lean().sort({ date: 1, createdAt: 1 });
  const paymentMap = payments.reduce((accumulator, payment) => {
    const key = String(payment.order);
    accumulator[key] = accumulator[key] || [];
    accumulator[key].push(payment);
    return accumulator;
  }, {});

  const normalizedOrders = orders.map((order) => ({
    ...order,
    shippingAddressText: formatAddress(order.shippingAddress),
    paymentHistory: paymentMap[String(order._id)] || order.paymentHistory || []
  }));

  res.json({ orders: normalizedOrders });
});

export const getOrders = asyncHandler(async (req, res) => {
  const query = req.user.role === "admin" ? {} : { user: req.user._id };
  const orders = await Order.find(query).populate("user", "name email").lean().sort({ createdAt: -1 });
  const orderIds = orders.map((order) => order._id);
  const payments = await Payment.find({ order: { $in: orderIds } }).lean().sort({ date: 1, createdAt: 1 });
  const paymentMap = payments.reduce((accumulator, payment) => {
    const key = String(payment.order);
    accumulator[key] = accumulator[key] || [];
    accumulator[key].push(payment);
    return accumulator;
  }, {});

  const normalizedOrders = orders.map((order) => ({
    ...order,
    shippingAddressText: formatAddress(order.shippingAddress),
    paymentHistory: paymentMap[String(order._id)] || order.paymentHistory || []
  }));

  res.json({ orders: normalizedOrders });
});

export const addPaymentToOrder = asyncHandler(async (req, res) => {
  req.body.orderId = req.params.id;
  return null;
});

export const getOrderPayments = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (req.user.role !== "admin" && String(order.user) !== String(req.user._id)) {
    res.status(403);
    throw new Error("You cannot view this passbook");
  }

  const payments = await Payment.find({ order: order._id }).lean().sort({ date: 1, createdAt: 1 });
  res.json({
    orderId: order._id,
    invoiceNumber: order.invoiceNumber,
    totalAmount: order.totalAmount,
    paidAmount: order.paidAmount,
    remainingAmount: order.remainingAmount,
    paymentStatus: order.paymentStatus,
    payments
  });
});

export const getOrderInvoice = asyncHandler(async (req, res) => {
  try {
    const invoice = await buildInvoicePayload(req.params.id, req.user);
    res.json(invoice);
  } catch (error) {
    if (error.message === "Order not found") {
      res.status(404);
    } else if (error.message === "You cannot view this invoice") {
      res.status(403);
    } else {
      res.status(400);
    }
    throw error;
  }
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const allowedStatuses = ["Pending", "Confirmed", "Delivered", "Cancelled"];
  const { status } = req.body;

  if (!allowedStatuses.includes(status)) {
    res.status(400);
    throw new Error("Invalid order status");
  }

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  res.json(order);
});
