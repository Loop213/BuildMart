import express from "express";
import { getPublicSettings, updateUpiSettings } from "../controllers/settingsController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/public", getPublicSettings);
router.put("/upi", protect, adminOnly, updateUpiSettings);
router.put("/billing", protect, adminOnly, updateUpiSettings);

export default router;
