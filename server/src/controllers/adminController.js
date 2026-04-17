import { Order } from "../models/Order.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getAnalytics = asyncHandler(async (req, res) => {
  const orders = await Order.find();
  const totalSales = orders.reduce((sum, order) => sum + order.paidAmount, 0);
  const pendingPayments = orders.reduce((sum, order) => sum + order.remainingAmount, 0);
  const gstCollected = orders.reduce((sum, order) => sum + (order.gstAmount || 0), 0);

  res.json({
    totalSales,
    pendingPayments,
    orderCount: orders.length,
    gstCollected
  });
});
