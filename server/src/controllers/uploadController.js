import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";

function ensureCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary server configuration is missing");
  }

  return { cloudName, apiKey, apiSecret };
}

function sanitizeFolder(folder = "buildmart") {
  const normalized = String(folder || "buildmart")
    .trim()
    .replace(/[^a-zA-Z0-9/_-]/g, "")
    .replace(/\/+/g, "/");

  return normalized || "buildmart";
}

export const createUploadSignature = asyncHandler(async (req, res) => {
  const { cloudName, apiKey, apiSecret } = ensureCloudinaryConfig();
  const folder = sanitizeFolder(req.body.folder);
  const timestamp = Math.floor(Date.now() / 1000);

  const signatureBase = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(signatureBase).digest("hex");

  res.json({
    cloudName,
    apiKey,
    folder,
    timestamp,
    signature
  });
});
