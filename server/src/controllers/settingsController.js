import { Setting } from "../models/Setting.js";
import { asyncHandler } from "../utils/asyncHandler.js";

async function ensureSettings() {
  let settings = await Setting.findOne();
  if (!settings) {
    settings = await Setting.create({});
  }
  return settings;
}

export const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await ensureSettings();
  res.json(settings);
});

export const updateUpiSettings = asyncHandler(async (req, res) => {
  const settings = await ensureSettings();
  [
    "companyName",
    "companyAddress",
    "companyPhone",
    "companyEmail",
    "upiId",
    "qrCodeUrl",
    "gstNumber",
    "logoUrl",
    "signatureUrl",
    "stampUrl",
    "termsAndConditions"
  ].forEach((field) => {
    if (req.body[field] !== undefined) {
      settings[field] = req.body[field];
    }
  });
  if (req.body.gstPercentage !== undefined) {
    settings.gstPercentage = Number(req.body.gstPercentage);
  }
  await settings.save();
  res.json(settings);
});
