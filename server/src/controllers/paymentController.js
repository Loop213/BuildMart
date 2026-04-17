import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { formatAddress, getPaymentStatus, normalizePaymentMethod } from "../utils/paymentUtils.js";

function isTransactionUnsupported(error) {
  return (
    error?.message?.includes("Transaction numbers are only allowed on a replica set member or mongos") ||
    error?.codeName === "IllegalOperation"
  );
}

async function loadOrder(orderId, session) {
  let query = Order.findById(orderId);
  if (session) {
    query = query.session(session);
  }
  return query;
}

async function buildOrderResponse(order) {
  const paymentHistory = await Payment.find({ order: order._id }).lean().sort({ date: 1, createdAt: 1 });
  return {
    ...order.toObject(),
    shippingAddressText: formatAddress(order.shippingAddress),
    paymentHistory
  };
}

async function applyApprovedPayment({ orderId, payment, adminUserId }) {
  const amount = Number(payment.amount || 0);
  const method = normalizePaymentMethod(payment.method);
  const paymentDate = payment.date ? new Date(payment.date) : new Date();
  const note = payment.note || "";

  const applyWithoutTransaction = async () => {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (amount > order.remainingAmount) {
      throw new Error("Payment exceeds remaining amount");
    }

    const nextPaidAmount = Number((order.paidAmount + amount).toFixed(2));
    const nextRemainingAmount = Number((order.totalAmount - nextPaidAmount).toFixed(2));

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, remainingAmount: { $gte: amount } },
      {
        $inc: {
          paidAmount: amount,
          paymentCount: 1
        },
        $set: {
          remainingAmount: nextRemainingAmount,
          paymentStatus: getPaymentStatus(order.totalAmount, nextPaidAmount)
        },
        $push: {
          paymentHistory: {
            amount,
            method,
            date: paymentDate,
            note,
            remainingBalance: nextRemainingAmount
          }
        }
      },
      { new: true }
    );

    if (!updatedOrder) {
      throw new Error("Order balance changed. Please refresh and try again.");
    }

    const paymentUpdate = await Payment.findByIdAndUpdate(
      payment._id,
      {
        status: "Approved",
        approvedBy: adminUserId,
        approvedAt: new Date(),
        remainingBalance: nextRemainingAmount,
        method,
        date: paymentDate,
        note
      },
      { new: true }
    );

    if (!paymentUpdate) {
      await Order.updateOne(
        { _id: updatedOrder._id },
        {
          $inc: { paidAmount: -amount, paymentCount: -1 },
          $set: {
            remainingAmount: order.remainingAmount,
            paymentStatus: order.paymentStatus
          },
          $pop: { paymentHistory: 1 }
        }
      );
      throw new Error("Payment approval failed");
    }

    return updatedOrder;
  };

  let updatedOrder;
  try {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const order = await loadOrder(orderId, session);
        if (!order) {
          throw new Error("Order not found");
        }

        if (amount > order.remainingAmount) {
          throw new Error("Payment exceeds remaining amount");
        }

        const nextPaidAmount = Number((order.paidAmount + amount).toFixed(2));
        const nextRemainingAmount = Number((order.totalAmount - nextPaidAmount).toFixed(2));

        await Order.updateOne(
          { _id: order._id },
          {
            $inc: {
              paidAmount: amount,
              paymentCount: 1
            },
            $set: {
              remainingAmount: nextRemainingAmount,
              paymentStatus: getPaymentStatus(order.totalAmount, nextPaidAmount)
            },
            $push: {
              paymentHistory: {
                amount,
                method,
                date: paymentDate,
                note,
                remainingBalance: nextRemainingAmount
              }
            }
          },
          { session }
        );

        await Payment.updateOne(
          { _id: payment._id },
          {
            $set: {
              status: "Approved",
              approvedBy: adminUserId,
              approvedAt: new Date(),
              remainingBalance: nextRemainingAmount,
              method,
              date: paymentDate,
              note
            }
          },
          { session }
        );

        updatedOrder = await loadOrder(order._id, session);
      });
    } catch (error) {
      if (!isTransactionUnsupported(error)) {
        throw error;
      }
      updatedOrder = await applyWithoutTransaction();
    } finally {
      session.endSession();
    }
  } catch (error) {
    if (!isTransactionUnsupported(error)) {
      throw error;
    }
    updatedOrder = await applyWithoutTransaction();
  }

  return updatedOrder;
}

export const addPayment = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Only admin can add payments");
  }

  const { orderId, amount: rawAmount, method, date, note } = req.body;
  if (!orderId) {
    res.status(400);
    throw new Error("orderId is required");
  }

  const amount = Number(rawAmount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400);
    throw new Error("Valid payment amount is required");
  }

  const targetOrder = await Order.findById(orderId).select("user");
  if (!targetOrder) {
    res.status(404);
    throw new Error("Order not found");
  }

  const payment = await Payment.create({
    order: orderId,
    user: targetOrder.user,
    amount,
    method: normalizePaymentMethod(method),
    date: date ? new Date(date) : new Date(),
    note: note || "",
    status: "Pending Approval",
    createdByRole: "admin"
  });

  const order = await applyApprovedPayment({
    orderId,
    payment,
    adminUserId: req.user._id
  });

  res.json({
    message: "Payment added successfully",
    order: await buildOrderResponse(order)
  });
});

export const requestPayment = asyncHandler(async (req, res) => {
  const { orderId, amount: rawAmount, method, date, note, transactionReference, screenshotUrl } = req.body;

  if (!orderId) {
    res.status(400);
    throw new Error("orderId is required");
  }

  const amount = Number(rawAmount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400);
    throw new Error("Valid payment amount is required");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (String(order.user) !== String(req.user._id)) {
    res.status(403);
    throw new Error("You cannot request payment for this order");
  }

  if (amount > order.remainingAmount) {
    res.status(400);
    throw new Error("Payment exceeds remaining amount");
  }

  const payment = await Payment.create({
    order: orderId,
    user: req.user._id,
    amount,
    method: normalizePaymentMethod(method),
    date: date ? new Date(date) : new Date(),
    note: note || "",
    transactionReference: transactionReference || "",
    screenshotUrl: screenshotUrl || "",
    status: "Pending Approval",
    createdByRole: "customer",
    remainingBalance: order.remainingAmount
  });

  res.status(201).json({
    message: "Payment submitted for admin approval",
    payment
  });
});

export const getMyRequests = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ user: req.user._id }).lean().sort({ createdAt: -1 });
  res.json({ payments });
});

export const getPendingPayments = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Admin access required");
  }

  const status = req.query.status;
  const query = status ? { status } : { status: "Pending Approval" };
  const payments = await Payment.find(query)
    .populate("user", "name email")
    .populate("order", "invoiceNumber totalAmount paidAmount remainingAmount paymentStatus")
    .lean()
    .sort({ createdAt: -1 });

  res.json({ payments });
});

export const approvePayment = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Admin access required");
  }

  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    res.status(404);
    throw new Error("Payment request not found");
  }

  if (payment.status === "Approved") {
    res.status(400);
    throw new Error("Payment is already approved");
  }

  if (payment.status === "Rejected") {
    res.status(400);
    throw new Error("Rejected payments cannot be approved");
  }

  const order = await applyApprovedPayment({
    orderId: payment.order,
    payment,
    adminUserId: req.user._id
  });

  res.json({
    message: "Payment approved successfully",
    order: await buildOrderResponse(order)
  });
});

export const rejectPayment = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Admin access required");
  }

  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    res.status(404);
    throw new Error("Payment request not found");
  }

  if (payment.status === "Approved") {
    res.status(400);
    throw new Error("Approved payments cannot be rejected");
  }

  payment.status = "Rejected";
  payment.rejectedReason = req.body.reason || "";
  payment.approvedBy = req.user._id;
  payment.approvedAt = new Date();
  await payment.save();

  res.json({
    message: "Payment rejected",
    payment
  });
});
