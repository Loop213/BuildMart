import mongoose from "mongoose";

export async function connectDatabase() {
  const mongoUri = process.env.MONGO_URI;
  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
}

