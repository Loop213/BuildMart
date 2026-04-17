import express from "express";
import {
  addPayment,
  approvePayment,
  getMyRequests,
  getPendingPayments,
  rejectPayment,
  requestPayment
} from "../controllers/paymentController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/my-requests", getMyRequests);
router.post("/request", requestPayment);
router.post("/add", adminOnly, addPayment);
router.get("/pending", adminOnly, getPendingPayments);
router.post("/:id/approve", adminOnly, approvePayment);
router.post("/:id/reject", adminOnly, rejectPayment);

export default router;
