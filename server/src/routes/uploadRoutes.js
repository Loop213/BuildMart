import express from "express";
import { createUploadSignature } from "../controllers/uploadController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signature", protect, createUploadSignature);

export default router;
