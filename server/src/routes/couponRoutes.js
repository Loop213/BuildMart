import express from "express";
import {
  applyCoupon,
  createCoupon,
  deleteCoupon,
  getCoupons,
  updateCoupon
} from "../controllers/couponController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/apply", applyCoupon);
router.route("/").get(protect, adminOnly, getCoupons).post(protect, adminOnly, createCoupon);
router.route("/:id").put(protect, adminOnly, updateCoupon).delete(protect, adminOnly, deleteCoupon);

export default router;

