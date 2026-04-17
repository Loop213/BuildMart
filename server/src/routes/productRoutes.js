import express from "express";
import {
  createProduct,
  deleteProduct,
  getProducts,
  searchProducts,
  updateProduct
} from "../controllers/productController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/search", searchProducts);
router.route("/").get(getProducts).post(protect, adminOnly, createProduct);
router.route("/:id").put(protect, adminOnly, updateProduct).delete(protect, adminOnly, deleteProduct);

export default router;
