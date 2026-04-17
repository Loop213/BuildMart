import { Coupon } from "../models/Coupon.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function validateCoupon(coupon, totalAmount) {
  if (!coupon || !coupon.isActive) {
    throw new Error("Coupon is invalid");
  }
  if (coupon.expiryDate < new Date()) {
    throw new Error("Coupon has expired");
  }
  if (coupon.usedCount >= coupon.usageLimit) {
    throw new Error("Coupon usage limit reached");
  }
  if (totalAmount <= 0) {
    throw new Error("Cart total is invalid");
  }
}

export const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ coupons });
});

export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body);
  res.status(201).json(coupon);
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  res.json(coupon);
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ message: "Coupon removed" });
});

export const applyCoupon = asyncHandler(async (req, res) => {
  const { code, totalAmount } = req.body;
  const coupon = await Coupon.findOne({ code: code?.toUpperCase() });

  validateCoupon(coupon, totalAmount);

  res.json({
    coupon: {
      _id: coupon._id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value
    }
  });
});

export { validateCoupon };

