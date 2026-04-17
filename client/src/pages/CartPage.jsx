import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import useSWR, { mutate } from "swr";
import { CheckCheck, MapPin, Minus, Plus, QrCode, Save, Trash2 } from "lucide-react";
import { request } from "../api/http";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

const emptyAddressForm = {
  name: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false
};

export function CartPage() {
  const { user } = useAuth();
  const { items, totals, updateQuantity, removeFromCart, clearCart } = useCart();
  const { data: settings } = useSWR("/settings/public");
  const { data: addressData } = useSWR(user ? "/addresses" : null);
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [initialPayment, setInitialPayment] = useState(0);
  const [gstApplied, setGstApplied] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState("new");
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [saveAddress, setSaveAddress] = useState(false);
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  const [addressHydrated, setAddressHydrated] = useState(false);

  const addresses = addressData?.addresses || [];

  useEffect(() => {
    if (!user || addressHydrated) {
      return;
    }

    const defaultAddress = addresses.find((address) => address.isDefault) || addresses[0];

    if (defaultAddress) {
      setSelectedAddressId(defaultAddress._id);
      setAddressForm({
        name: defaultAddress.name,
        phone: defaultAddress.phone,
        address: defaultAddress.address,
        city: defaultAddress.city,
        state: defaultAddress.state,
        pincode: defaultAddress.pincode,
        isDefault: defaultAddress.isDefault
      });
      setUseSavedAddress(true);
    }

    setAddressHydrated(true);
  }, [addresses, addressHydrated, user]);

  const discountAmount = useMemo(() => {
    if (!coupon) {
      return 0;
    }
    return coupon.type === "percentage"
      ? Math.min((totals.subtotal * coupon.value) / 100, totals.subtotal)
      : Math.min(coupon.value, totals.subtotal);
  }, [coupon, totals.subtotal]);

  const taxableSubtotal = Math.max(totals.subtotal - discountAmount, 0);
  const gstPercentage = Number(settings?.gstPercentage || 18);
  const gstAmount = gstApplied ? Number(((taxableSubtotal * gstPercentage) / 100).toFixed(2)) : 0;
  const grandTotal = Number((taxableSubtotal + gstAmount).toFixed(2));
  const remaining = Math.max(grandTotal - Number(initialPayment || 0), 0);
  const selectedAddress = addresses.find((address) => address._id === selectedAddressId);

  function handleAddressSelection(nextId) {
    setSelectedAddressId(nextId);

    if (nextId === "new") {
      setAddressForm({
        ...emptyAddressForm,
        name: user?.name || "",
        phone: user?.phone || ""
      });
      setUseSavedAddress(false);
      return;
    }

    const address = addresses.find((entry) => entry._id === nextId);
    if (!address) {
      return;
    }

    setAddressForm({
      name: address.name,
      phone: address.phone,
      address: address.address,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      isDefault: address.isDefault
    });
    setUseSavedAddress(true);
  }

  function validateAddressForm() {
    if (!addressForm.name.trim()) {
      throw new Error("Full name is required");
    }
    if (!/^\d{10}$/.test(addressForm.phone)) {
      throw new Error("Phone number must be 10 digits");
    }
    if (!addressForm.address.trim() || !addressForm.city.trim() || !addressForm.state.trim() || !addressForm.pincode.trim()) {
      throw new Error("Complete address, city, state, and pincode are required");
    }
  }

  async function handleCoupon() {
    if (!couponCode) {
      return;
    }
    const response = await request("/coupons/apply", {
      method: "POST",
      body: JSON.stringify({
        code: couponCode,
        totalAmount: totals.subtotal
      })
    });
    setCoupon(response.coupon);
    toast.success("Coupon applied");
  }

  async function syncAddressBook() {
    if (!saveAddress || !user) {
      return null;
    }

    const payload = {
      ...addressForm,
      isDefault: Boolean(addressForm.isDefault)
    };

    if (selectedAddressId !== "new") {
      const updated = await request(`/addresses/${selectedAddressId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      await mutate("/addresses");
      toast.success("Saved address updated");
      return updated;
    }

    const created = await request("/addresses", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    await mutate("/addresses");
    toast.success("Address saved to address book");
    return created;
  }

  async function handlePlaceOrder() {
    if (!user) {
      toast.error("Please login before placing an order");
      return;
    }
    if (!items.length) {
      toast.error("Cart is empty");
      return;
    }

    try {
      validateAddressForm();
    } catch (error) {
      toast.error(error.message);
      return;
    }

    if (Number(initialPayment || 0) > grandTotal) {
      toast.error("Initial payment cannot exceed the total amount");
      return;
    }

    setPlacingOrder(true);
    try {
      const persistedAddress = await syncAddressBook();

      await request("/orders/create", {
        method: "POST",
        body: JSON.stringify({
          items,
          selectedAddressId: persistedAddress?._id,
          shippingAddress: {
            name: addressForm.name,
            phone: addressForm.phone,
            address: addressForm.address,
            city: addressForm.city,
            state: addressForm.state,
            pincode: addressForm.pincode
          },
          gstApplied,
          paymentMethod,
          couponCode: coupon?.code || "",
          initialPayment: Number(initialPayment || 0)
        })
      });
      toast.success("Order placed successfully");
      clearCart();
      setCoupon(null);
      setCouponCode("");
      setInitialPayment(0);
    } finally {
      setPlacingOrder(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-[28px] border border-white/10 bg-white/80 p-6 shadow-sm dark:bg-slate-900/80">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold text-slate-900 dark:text-white">Cart Summary</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Adjust quantity, review saved addresses, and complete checkout.</p>
          </div>
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.product} className="flex flex-col gap-4 rounded-[24px] border border-white/10 bg-slate-50/70 p-4 dark:bg-slate-950/60 md:flex-row md:items-center">
              <img src={item.image} alt={item.name} className="h-24 w-full rounded-2xl object-cover md:w-28" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{item.name}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.unit}</p>
                <p className="mt-2 text-sm font-medium text-brand-500">Rs. {item.price.toLocaleString("en-IN")}</p>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => updateQuantity(item.product, item.quantity - 1)} className="rounded-full bg-slate-200 p-2 dark:bg-slate-800">
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center font-semibold">{item.quantity}</span>
                <button type="button" onClick={() => updateQuantity(item.product, item.quantity + 1)} className="rounded-full bg-slate-200 p-2 dark:bg-slate-800">
                  <Plus size={16} />
                </button>
                <button type="button" onClick={() => removeFromCart(item.product)} className="rounded-full bg-rose-100 p-2 text-rose-600">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <aside className="space-y-6">
        <div className="rounded-[28px] border border-white/10 bg-white/80 p-6 shadow-sm dark:bg-slate-900/80">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Checkout</h2>
          <div className="mt-5 space-y-5">
            <div className="rounded-[24px] bg-slate-50/70 p-4 dark:bg-slate-950/60">
              <div className="mb-4 flex items-center gap-2">
                <MapPin size={17} className="text-brand-500" />
                <p className="font-medium text-slate-900 dark:text-white">Delivery Address</p>
                {useSavedAddress ? (
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 dark:bg-brand-500/10">
                    Saved Address
                  </span>
                ) : null}
              </div>

              {addresses.length ? (
                <select
                  value={selectedAddressId}
                  onChange={(event) => handleAddressSelection(event.target.value)}
                  className="input-field"
                >
                  {addresses.map((address) => (
                    <option key={address._id} value={address._id}>
                      {address.name} - {address.city} {address.isDefault ? "(Default)" : ""}
                    </option>
                  ))}
                  <option value="new">Add new address</option>
                </select>
              ) : null}

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {[
                  ["name", "Full Name"],
                  ["phone", "Phone Number"],
                  ["city", "City"],
                  ["state", "State"],
                  ["pincode", "Pincode"]
                ].map(([field, label]) => (
                  <label key={field} className={field === "name" || field === "phone" ? "" : ""}>
                    <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
                    <input
                      value={addressForm[field]}
                      onChange={(event) => setAddressForm((current) => ({ ...current, [field]: event.target.value }))}
                      className="input-field"
                    />
                  </label>
                ))}
                <label className="md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Full Address</span>
                  <textarea
                    rows="3"
                    value={addressForm.address}
                    onChange={(event) => setAddressForm((current) => ({ ...current, address: event.target.value }))}
                    className="input-field"
                  />
                </label>
              </div>

              <label className="mt-4 inline-flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(event) => setSaveAddress(event.target.checked)}
                  className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="inline-flex items-center gap-2">
                  <Save size={14} />
                  Save or update this address in Address Book
                </span>
              </label>

              {saveAddress ? (
                <label className="mt-3 inline-flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={addressForm.isDefault}
                    onChange={(event) => setAddressForm((current) => ({ ...current, isDefault: event.target.checked }))}
                    className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                  />
                  Mark as default address
                </label>
              ) : null}
            </div>

            {selectedAddress ? (
              <div className="rounded-[24px] border border-dashed border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCheck size={16} />
                  Autofilled from your address book
                </p>
              </div>
            ) : null}

            <div className="flex gap-3">
              <input
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                placeholder="Coupon code"
                className="input-field"
              />
              <button type="button" onClick={handleCoupon} className="rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white">
                Apply
              </button>
            </div>

            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="input-field">
              <option value="COD">Cash on Delivery</option>
              <option value="UPI">UPI Payment</option>
            </select>

            <div className="rounded-[24px] bg-slate-50/70 p-4 dark:bg-slate-950/60">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">GST at final billing</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Apply {gstPercentage}% GST only during checkout.
                  </p>
                </div>
                <div className="flex rounded-full bg-slate-200 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setGstApplied(true)}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${gstApplied ? "bg-brand-500 text-white" : "text-slate-500"}`}
                  >
                    With GST
                  </button>
                  <button
                    type="button"
                    onClick={() => setGstApplied(false)}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${!gstApplied ? "bg-brand-500 text-white" : "text-slate-500"}`}
                  >
                    Without GST
                  </button>
                </div>
              </div>
            </div>

            <input
              type="number"
              min="0"
              max={grandTotal}
              value={initialPayment}
              onChange={(event) => setInitialPayment(event.target.value)}
              placeholder="Initial partial payment"
              className="input-field"
            />

            {paymentMethod === "UPI" && (
              <div className="rounded-[24px] border border-dashed border-brand-200 bg-brand-50/70 p-5 dark:border-brand-500/20 dark:bg-brand-500/10">
                <div className="mb-4 flex items-center gap-3 text-brand-600">
                  <QrCode size={18} />
                  <p className="font-medium">Pay using UPI</p>
                </div>
                {settings?.qrCodeUrl ? (
                  <img src={settings.qrCodeUrl} alt="UPI QR" className="mb-4 h-36 w-36 rounded-2xl object-cover" />
                ) : null}
                <p className="text-sm text-slate-600 dark:text-slate-300">UPI ID: {settings?.upiId || "admin@upi"}</p>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-3 rounded-[24px] bg-slate-50/70 p-5 dark:bg-slate-950/60">
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400"><span>Subtotal</span><span>Rs. {totals.subtotal.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400"><span>Discount</span><span>- Rs. {discountAmount.toLocaleString("en-IN")}</span></div>
            {gstApplied ? (
              <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400"><span>GST ({gstPercentage}%)</span><span>Rs. {gstAmount.toLocaleString("en-IN")}</span></div>
            ) : null}
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400"><span>Initial Paid</span><span>Rs. {Number(initialPayment || 0).toLocaleString("en-IN")}</span></div>
            <div className="border-t border-slate-200 pt-3 text-base font-semibold text-slate-900 dark:border-slate-800 dark:text-white">
              <div className="flex justify-between"><span>Total</span><span>Rs. {grandTotal.toLocaleString("en-IN")}</span></div>
              <div className="mt-2 flex justify-between text-brand-500"><span>Remaining Due</span><span>Rs. {remaining.toLocaleString("en-IN")}</span></div>
            </div>
          </div>

          <button type="button" disabled={placingOrder} onClick={handlePlaceOrder} className="mt-6 w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white dark:bg-brand-500">
            {placingOrder ? "Placing order..." : "Place Order"}
          </button>
        </div>
      </aside>
    </div>
  );
}
