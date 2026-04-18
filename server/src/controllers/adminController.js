import { User } from "../models/User.js";
import { Order } from "../models/Order.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getAnalytics = asyncHandler(async (req, res) => {
  const orders = await Order.find();
  const users = await User.find().select("status");
  const totalSales = orders.reduce((sum, order) => sum + order.paidAmount, 0);
  const pendingPayments = orders.reduce((sum, order) => sum + order.remainingAmount, 0);
  const gstCollected = orders.reduce((sum, order) => sum + (order.gstAmount || 0), 0);
  const userStatusCounts = users.reduce(
    (accumulator, user) => {
      accumulator[user.status || "pending"] += 1;
      return accumulator;
    },
    { pending: 0, approved: 0, rejected: 0 }
  );

  res.json({
    totalSales,
    pendingPayments,
    orderCount: orders.length,
    gstCollected,
    userStatusCounts
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  const status = req.query.status;
  const query = status && status !== "all" ? { status } : {};
  const users = await User.find(query).select("-password").sort({ createdAt: -1 });
  res.json({ users });
});

async function updateUserStatus(req, res, nextStatus) {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.role === "admin") {
    res.status(400);
    throw new Error("Admin users cannot be moderated");
  }

  user.status = nextStatus;
  await user.save();

  res.json({
    message: `User ${nextStatus} successfully`,
    user
  });
}

export const approveUser = asyncHandler(async (req, res) => {
  await updateUserStatus(req, res, "approved");
});

export const rejectUser = asyncHandler(async (req, res) => {
  await updateUserStatus(req, res, "rejected");
});
