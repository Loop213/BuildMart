import express from "express";
import { approveUser, getAnalytics, getUsers, rejectUser } from "../controllers/adminController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/analytics", protect, adminOnly, getAnalytics);
router.get("/users", protect, adminOnly, getUsers);
router.patch("/approve/:id", protect, adminOnly, approveUser);
router.patch("/reject/:id", protect, adminOnly, rejectUser);

export default router;
