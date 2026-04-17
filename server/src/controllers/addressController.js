import { Address } from "../models/Address.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function validateAddressPayload(payload) {
  const requiredFields = ["name", "phone", "address", "city", "state", "pincode"];

  for (const field of requiredFields) {
    if (!String(payload[field] || "").trim()) {
      throw new Error(`${field} is required`);
    }
  }
}

async function ensureDefaultAddress(userId, addressId, session) {
  await Address.updateMany(
    { user: userId, _id: { $ne: addressId } },
    { $set: { isDefault: false } },
    { session }
  );
}

export const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
  res.json({ addresses });
});

export const createAddress = asyncHandler(async (req, res) => {
  validateAddressPayload(req.body);
  const existingCount = await Address.countDocuments({ user: req.user._id });

  const address = await Address.create({
    ...req.body,
    user: req.user._id,
    isDefault: req.body.isDefault || existingCount === 0
  });

  if (address.isDefault) {
    await ensureDefaultAddress(req.user._id, address._id);
  }

  res.status(201).json(address);
});

export const updateAddress = asyncHandler(async (req, res) => {
  validateAddressPayload(req.body);

  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
  if (!address) {
    res.status(404);
    throw new Error("Address not found");
  }

  Object.assign(address, req.body);
  await address.save();

  if (address.isDefault) {
    await ensureDefaultAddress(req.user._id, address._id);
  }

  res.json(address);
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
  if (!address) {
    res.status(404);
    throw new Error("Address not found");
  }

  const removedDefault = address.isDefault;
  await address.deleteOne();

  if (removedDefault) {
    const nextDefault = await Address.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (nextDefault) {
      nextDefault.isDefault = true;
      await nextDefault.save();
    }
  }

  res.json({ message: "Address removed" });
});
