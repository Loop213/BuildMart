import mongoose from "mongoose";

const shippingAddressSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true }
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    method: { type: String, enum: ["COD", "UPI", "Cash"], required: true },
    note: { type: String, default: "" },
    remainingBalance: { type: Number, required: true, min: 0 }
  },
  { _id: true }
);

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    category: { type: String, default: "" },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userStatusSnapshot: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    items: [orderItemSchema],
    shippingAddress: { type: shippingAddressSchema, required: true },
    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    gstApplied: { type: Boolean, default: false },
    gstPercentage: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["COD", "UPI"], required: true },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Partially Paid", "Paid"],
      default: "Pending"
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Delivered", "Cancelled"],
      default: "Pending"
    },
    paymentHistory: [paymentSchema],
    paymentCount: { type: Number, default: 0 },
    coupon: {
      code: String,
      type: String,
      value: Number
    },
    invoiceNumber: { type: String, required: true, unique: true }
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
