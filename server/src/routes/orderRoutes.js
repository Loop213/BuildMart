import express from "express";
import {
  createOrder,
  getOrderInvoice,
  getOrderPayments,
  getMyOrders,
  getOrders,
  updateOrderStatus
} from "../controllers/orderController.js";
import { addPayment } from "../controllers/paymentController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/my-orders", getMyOrders);
router.get("/create", (req, res) => res.status(405).json({ message: "Use POST to create orders" }));
router.route("/").get(getOrders).post(createOrder);
router.post("/create", createOrder);
router.post("/:id/payments", (req, res, next) => {
  req.body.orderId = req.params.id;
  return addPayment(req, res, next);
});
router.get("/:id/invoice", getOrderInvoice);
router.get("/:id/payments", getOrderPayments);
router.put("/:id/status", adminOnly, updateOrderStatus);

export default router;
