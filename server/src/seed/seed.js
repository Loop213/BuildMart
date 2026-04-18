import dotenv from "dotenv";
import { connectDatabase } from "../config/db.js";
import { Coupon } from "../models/Coupon.js";
import { Product } from "../models/Product.js";
import { Setting } from "../models/Setting.js";
import { User } from "../models/User.js";

dotenv.config();

async function seed() {
  await connectDatabase();

  await Promise.all([User.deleteMany(), Product.deleteMany(), Coupon.deleteMany(), Setting.deleteMany()]);

  await User.create([
    {
      name: "Admin User",
      email: "admin@buildmart.com",
      password: "Admin@123",
      role: "admin",
      status: "approved"
    },
    {
      name: "Site Contractor",
      email: "customer@buildmart.com",
      password: "Customer@123",
      role: "customer",
      status: "approved"
    }
  ]);

  await Product.create([
    {
      name: "Premium River Sand",
      category: "Sand",
      price: 2800,
      unit: "per ton",
      description: "Clean and well-graded river sand ideal for plastering and masonry work.",
      image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80",
      stock: 120
    },
    {
      name: "TMT Rod 12mm",
      category: "Rod",
      price: 68,
      unit: "per kg",
      description: "High tensile TMT bars designed for durable residential and commercial structures.",
      image: "https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=900&q=80",
      stock: 850
    },
    {
      name: "OPC Cement 53 Grade",
      category: "Cement",
      price: 420,
      unit: "per bag",
      description: "Reliable 53 grade OPC cement for RCC, precast, and fast-setting construction requirements.",
      image: "https://images.unsplash.com/photo-1599707254554-027aeb4deacd?auto=format&fit=crop&w=900&q=80",
      stock: 320
    }
  ]);

  await Coupon.create([
    {
      code: "SAVE10",
      type: "percentage",
      value: 10,
      expiryDate: new Date("2027-12-31"),
      usageLimit: 100
    },
    {
      code: "FLAT500",
      type: "flat",
      value: 500,
      expiryDate: new Date("2027-12-31"),
      usageLimit: 50
    }
  ]);

  await Setting.create({
    upiId: "buildmart@upi",
    qrCodeUrl: "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=600&q=80",
    gstPercentage: 18,
    gstNumber: "27ABCDE1234F1Z5"
  });

  console.log("Seed data inserted");
  process.exit(0);
}

seed();
