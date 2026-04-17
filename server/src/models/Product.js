import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, enum: ["Sand", "Rod", "Cement"], required: true },
    price: { type: Number, required: true },
    unit: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    stock: { type: Number, required: true, min: 0 }
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);

