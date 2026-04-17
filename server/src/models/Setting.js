import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: "BuildMart Construction Supplies" },
    companyAddress: { type: String, default: "Industrial Area, New Delhi, India" },
    companyPhone: { type: String, default: "+91 98765 43210" },
    companyEmail: { type: String, default: "support@buildmart.com" },
    upiId: { type: String, default: "admin@upi" },
    gstPercentage: { type: Number, default: 18, min: 0, max: 100 },
    gstNumber: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    signatureUrl: { type: String, default: "" },
    stampUrl: { type: String, default: "" },
    termsAndConditions: {
      type: String,
      default: "Materials once delivered will be considered accepted unless reported the same day."
    },
    qrCodeUrl: {
      type: String,
      default:
        "https://images.unsplash.com/photo-1556740764-3a3e2b9d8d18?auto=format&fit=crop&w=600&q=80"
    }
  },
  { timestamps: true }
);

export const Setting = mongoose.model("Setting", settingSchema);
