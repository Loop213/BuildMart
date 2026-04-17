import { Product } from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function buildProductQuery({ search = "", category }) {
  const trimmedSearch = String(search || "").trim();
  const regex = { $regex: trimmedSearch, $options: "i" };

  return {
    ...(trimmedSearch
      ? {
          $or: [{ name: regex }, { description: regex }, { category: regex }]
        }
      : {}),
    ...(category ? { category } : {})
  };
}

export const getProducts = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 9);
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const category = req.query.category;
  const query = buildProductQuery({ search, category });

  const [products, total] = await Promise.all([
    Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Product.countDocuments(query)
  ]);

  res.json({
    products,
    page,
    totalPages: Math.ceil(total / limit),
    total
  });
});

export const searchProducts = asyncHandler(async (req, res) => {
  const query = buildProductQuery({ search: req.query.q || "" });
  const products = await Product.find(query).sort({ createdAt: -1 });

  res.json({
    products,
    total: products.length
  });
});

export const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  res.json(product);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: "Product removed" });
});
