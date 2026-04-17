import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ["COD", "UPI", "Cash"], required: true },
    date: { type: Date, default: Date.now },
    note: { type: String, default: "" },
    remainingBalance: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["Pending Approval", "Approved", "Rejected"],
      default: "Approved",
      index: true
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    rejectedReason: { type: String, default: "" },
    createdByRole: { type: String, enum: ["customer", "admin"], required: true },
    transactionReference: { type: String, default: "" },
    screenshotUrl: { type: String, default: "" }
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payment", paymentSchema);
