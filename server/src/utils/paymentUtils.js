export function getPaymentStatus(totalAmount, paidAmount) {
  if (paidAmount <= 0) {
    return "Pending";
  }

  if (paidAmount < totalAmount) {
    return "Partially Paid";
  }

  return "Paid";
}

export function normalizePaymentMethod(method) {
  if (method === "Cash") {
    return "Cash";
  }

  if (method === "UPI") {
    return "UPI";
  }

  return "COD";
}

export function formatAddress(address) {
  if (!address) {
    return "";
  }

  if (typeof address === "string") {
    return address;
  }

  return [address.address, address.city, address.state, address.pincode].filter(Boolean).join(", ");
}
