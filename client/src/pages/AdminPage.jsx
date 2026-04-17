import { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import useSWR from "swr";
import { mutate } from "swr";
import { request } from "../api/http";
import { printInvoice } from "../utils/invoice";
import { OrderTimeline } from "../components/OrderTimeline";
import { PaymentPassbookTable } from "../components/PaymentPassbookTable";
import { ProgressBar } from "../components/ProgressBar";

const emptyProduct = {
  name: "",
  category: "Sand",
  price: "",
  unit: "per ton",
  description: "",
  image: "",
  stock: ""
};

const emptyCoupon = {
  code: "",
  type: "percentage",
  value: "",
  expiryDate: "",
  usageLimit: ""
};

const emptyPaymentForm = {
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  method: "Cash",
  note: ""
};

export function AdminPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [productForm, setProductForm] = useState(emptyProduct);
  const [couponForm, setCouponForm] = useState(emptyCoupon);
  const [settingsForm, setSettingsForm] = useState({
    companyName: "",
    companyAddress: "",
    companyPhone: "",
    companyEmail: "",
    upiId: "",
    qrCodeUrl: "",
    gstPercentage: 18,
    gstNumber: "",
    logoUrl: "",
    signatureUrl: "",
    stampUrl: "",
    termsAndConditions: ""
  });
  const [paymentForms, setPaymentForms] = useState({});
  const [selectedPaymentOrder, setSelectedPaymentOrder] = useState(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [approvalFilter, setApprovalFilter] = useState("Pending Approval");
  const [approvalLoadingId, setApprovalLoadingId] = useState("");
  const [rejectingPayment, setRejectingPayment] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const { data: analytics } = useSWR("/admin/analytics", { refreshInterval: 5000 });
  const { data: products } = useSWR("/products?page=1&limit=50");
  const { data: orders } = useSWR("/orders", { refreshInterval: 5000 });
  const { data: coupons } = useSWR("/coupons");
  const { data: pendingPayments } = useSWR(`/payments/pending?status=${encodeURIComponent(approvalFilter)}`, {
    refreshInterval: 5000
  });
  const { data: settings } = useSWR("/settings/public", {
    onSuccess: (value) =>
      setSettingsForm({
        companyName: value.companyName || "",
        companyAddress: value.companyAddress || "",
        companyPhone: value.companyPhone || "",
        companyEmail: value.companyEmail || "",
        upiId: value.upiId || "",
        qrCodeUrl: value.qrCodeUrl || "",
        gstPercentage: value.gstPercentage ?? 18,
        gstNumber: value.gstNumber || "",
        logoUrl: value.logoUrl || "",
        signatureUrl: value.signatureUrl || "",
        stampUrl: value.stampUrl || "",
        termsAndConditions: value.termsAndConditions || ""
      })
  });

  async function createProduct(event) {
    event.preventDefault();
    await request("/products", {
      method: "POST",
      body: JSON.stringify({
        ...productForm,
        price: Number(productForm.price),
        stock: Number(productForm.stock)
      })
    });
    setProductForm(emptyProduct);
    toast.success("Product created");
    mutate("/products?page=1&limit=50");
  }

  async function createCoupon(event) {
    event.preventDefault();
    await request("/coupons", {
      method: "POST",
      body: JSON.stringify({
        ...couponForm,
        value: Number(couponForm.value),
        usageLimit: Number(couponForm.usageLimit)
      })
    });
    setCouponForm(emptyCoupon);
    toast.success("Coupon created");
    mutate("/coupons");
  }

  async function saveUpi(event) {
    event.preventDefault();
    await request("/settings/upi", {
      method: "PUT",
      body: JSON.stringify(settingsForm)
    });
    toast.success("UPI settings updated");
    mutate("/settings/public");
  }

  async function deleteProduct(productId) {
    await request(`/products/${productId}`, { method: "DELETE" });
    toast.success("Product removed");
    mutate("/products?page=1&limit=50");
  }

  async function editProduct(product) {
    const price = Number(window.prompt("Updated price", product.price) || product.price);
    const stock = Number(window.prompt("Updated stock", product.stock) || product.stock);
    await request(`/products/${product._id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...product,
        price,
        stock
      })
    });
    toast.success("Product updated");
    mutate("/products?page=1&limit=50");
  }

  async function deleteCoupon(couponId) {
    await request(`/coupons/${couponId}`, { method: "DELETE" });
    toast.success("Coupon removed");
    mutate("/coupons");
  }

  async function editCoupon(coupon) {
    const value = Number(window.prompt("Updated discount value", coupon.value) || coupon.value);
    const usageLimit = Number(window.prompt("Updated usage limit", coupon.usageLimit) || coupon.usageLimit);
    await request(`/coupons/${coupon._id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...coupon,
        value,
        usageLimit
      })
    });
    toast.success("Coupon updated");
    mutate("/coupons");
  }

  async function addPayment(order) {
    const form = paymentForms[order._id] || emptyPaymentForm;
    const amount = Number(form.amount || 0);

    if (!amount) {
      toast.error("Enter a payment amount");
      return;
    }

    if (amount > order.remainingAmount) {
      toast.error("Payment exceeds the remaining due");
      return;
    }

    setPaymentSubmitting(true);
    try {
      await request("/payments/add", {
        method: "POST",
        body: JSON.stringify({
          orderId: order._id,
          amount,
          date: form.date,
          method: form.method,
          note: form.note
        })
      });
      toast.success("Payment added");
      setPaymentForms((current) => ({ ...current, [order._id]: emptyPaymentForm }));
      setSelectedPaymentOrder(null);
      mutate("/orders");
      mutate("/admin/analytics");
    } catch (error) {
      toast.error(error.message || "Unable to add payment");
    } finally {
      setPaymentSubmitting(false);
    }
  }

  function updatePaymentForm(orderId, field, value) {
    setPaymentForms((current) => ({
      ...current,
      [orderId]: {
        ...(current[orderId] || emptyPaymentForm),
        [field]: value
      }
    }));
  }

  async function updateOrderStatus(orderId) {
    const status = window.prompt("Enter status: Pending, Confirmed, Delivered, Cancelled");
    if (!status) {
      return;
    }
    await request(`/orders/${orderId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status })
    });
    toast.success("Order status updated");
    mutate("/orders");
  }

  async function approvePaymentRequest(paymentId) {
    setApprovalLoadingId(paymentId);
    try {
      await request(`/payments/${paymentId}/approve`, { method: "POST" });
      toast.success("Payment approved successfully");
      mutate("/payments/pending?status=Pending%20Approval");
      mutate(`/payments/pending?status=${encodeURIComponent(approvalFilter)}`);
      mutate("/orders");
      mutate("/admin/analytics");
    } catch (error) {
      toast.error(error.message || "Unable to approve payment");
    } finally {
      setApprovalLoadingId("");
    }
  }

  async function rejectPaymentRequest(paymentId) {
    setApprovalLoadingId(paymentId);
    try {
      await request(`/payments/${paymentId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason })
      });
      toast.success("Payment rejected");
      setRejectingPayment(null);
      setRejectReason("");
      mutate("/payments/pending?status=Pending%20Approval");
      mutate(`/payments/pending?status=${encodeURIComponent(approvalFilter)}`);
      mutate("/orders");
      mutate("/admin/analytics");
    } catch (error) {
      toast.error(error.message || "Unable to reject payment");
    } finally {
      setApprovalLoadingId("");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        {["overview", "products", "orders", "approvals", "coupons", "upi"].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeTab === tab ? "bg-brand-500 text-white" : "bg-white/80 text-slate-600 dark:bg-slate-900/80 dark:text-slate-300"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["Total Sales", `Rs. ${(analytics?.totalSales || 0).toLocaleString("en-IN")}`],
            ["Pending Payments", `Rs. ${(analytics?.pendingPayments || 0).toLocaleString("en-IN")}`],
            ["Orders", analytics?.orderCount || 0]
          ].map(([label, value]) => (
            <div key={label} className="rounded-[28px] border border-white/10 bg-white/80 p-6 shadow-sm dark:bg-slate-900/80">
              <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{value}</p>
            </div>
          ))}
        </section>
      )}

      {activeTab === "products" && (
        <section className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <form onSubmit={createProduct} className="rounded-[28px] border border-white/10 bg-white/80 p-6 shadow-sm dark:bg-slate-900/80">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Add product</h2>
            <div className="mt-5 space-y-4">
              {[
                ["name", "Product name"],
                ["price", "Price"],
                ["unit", "Unit"],
                ["image", "Image URL"],
                ["stock", "Stock"],
                ["description", "Description"]
              ].map(([field, placeholder]) => (
                <input
                  key={field}
                  required
                  value={productForm[field]}
                  onChange={(event) => setProductForm((current) => ({ ...current, [field]: event.target.value }))}
                  placeholder={placeholder}
                  className="input-field"
                />
              ))}
              <select
                value={productForm.category}
                onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))}
                className="input-field"
              >
                <option>Sand</option>
                <option>Rod</option>
                <option>Cement</option>
              </select>
            </div>
            <button type="submit" className="mt-6 w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white dark:bg-brand-500">
              Save Product
            </button>
          </form>

          <div className="rounded-[28px] border border-white/10 bg-white/80 p-6 shadow-sm dark:bg-slate-900/80">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Inventory</h2>
            <div className="mt-5 space-y-4">
              {products?.products?.map((product) => (
                <div key={product._id} className="flex items-center justify-between rounded-[24px] bg-slate-50/70 p-4 dark:bg-slate-950/60">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{product.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{product.category} • Stock {product.stock}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-brand-500">Rs. {product.price}</p>
                    <button type="button" onClick={() => editProduct(product)} className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteProduct(product._id)} className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === "orders" && (
        <section className="space-y-4">
          {orders?.orders?.map((order) => (
            <div key={order._id} className="rounded-[28px] border border-white/10 bg-white/80 p-6 shadow-sm dark:bg-slate-900/80">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-brand-500">{order.invoiceNumber}</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{order.user?.name || "Customer order"}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Total Rs. {order.totalAmount} • Paid Rs. {order.paidAmount} • Due Rs. {order.remainingAmount} • {order.status}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Subtotal Rs. {order.subtotal} • GST {order.gstApplied ? `${order.gstPercentage}% (Rs. ${order.gstAmount})` : "Not Applied"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => printInvoice(order._id)}
                    className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    View Invoice
                  </button>
                  <button type="button" onClick={() => updateOrderStatus(order._id)} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-700">
                    Update Status
                  </button>
                  <button type="button" onClick={() => setSelectedPaymentOrder(order)} className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white">
                    Add Payment
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                <div className="space-y-5 rounded-[24px] bg-slate-50/70 p-5 dark:bg-slate-950/60">
                  <div className="grid gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex justify-between"><span>Total amount</span><span>Rs. {order.totalAmount}</span></div>
                    <div className="flex justify-between text-emerald-600"><span>Total paid</span><span>Rs. {order.paidAmount}</span></div>
                    <div className="flex justify-between font-semibold text-rose-500"><span>Remaining</span><span>Rs. {order.remainingAmount}</span></div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Payment completion</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {order.totalAmount ? Math.round((order.paidAmount / order.totalAmount) * 100) : 0}%
                      </span>
                    </div>
                    <ProgressBar value={order.totalAmount ? (order.paidAmount / order.totalAmount) * 100 : 0} />
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Payment timeline</h3>
                    <OrderTimeline payments={order.paymentHistory} />
                  </div>
                  <div>
                    <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Passbook</h3>
                    <PaymentPassbookTable payments={order.paymentHistory} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {activeTab === "approvals" && (
        <section className="space-y-6">
          <div className="flex flex-wrap gap-3">
            {["Pending Approval", "Approved", "Rejected"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setApprovalFilter(status)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  approvalFilter === status
                    ? "bg-brand-500 text-white"
                    : "bg-white/80 text-slate-600 dark:bg-slate-900/80 dark:text-slate-300"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/80 p-6 shadow-sm dark:bg-slate-900/80">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Payment Approval Queue</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Review customer-submitted payment requests and approve them before they affect order totals.
            </p>
            <div className="mt-6">
              <PaymentPassbookTable
                payments={pendingPayments?.payments || []}
                showRequestedBy
                showOrder
                actionRenderer={(payment) =>
                  payment.status === "Pending Approval" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={approvalLoadingId === payment._id}
                        onClick={() => approvePaymentRequest(payment._id)}
                        className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                      >
                        {approvalLoadingId === payment._id ? "..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        disabled={approvalLoadingId === payment._id}
                        onClick={() => {
                          setRejectingPayment(payment);
                          setRejectReason("");
                        }}
                        className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500">No action</span>
                  )
                }
              />
            </div>
          </div>
        </section>
      )}

      {rejectingPayment ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Reject payment request</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Order {rejectingPayment.order?.invoiceNumber || rejectingPayment.order?._id || "--"} ke liye rejection reason
                  optional hai.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRejectingPayment(null);
                  setRejectReason("");
                }}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-slate-100/80 p-4 text-sm dark:bg-slate-800/80">
                <p className="font-medium text-slate-900 dark:text-white">
                  Amount: Rs. {Number(rejectingPayment.amount || 0).toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-slate-500 dark:text-slate-400">
                  Method: {rejectingPayment.method} | Status: {rejectingPayment.status}
                </p>
              </div>
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                rows={4}
                placeholder="Optional reject reason"
                className="input-field min-h-[120px] resize-none"
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectingPayment(null);
                  setRejectReason("");
                }}
                className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={approvalLoadingId === rejectingPayment._id}
                onClick={() => rejectPaymentRequest(rejectingPayment._id)}
                className="rounded-full bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
              >
                {approvalLoadingId === rejectingPayment._id ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "coupons" && (
        <section className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <form onSubmit={createCoupon} className="rounded-[28px] border border-white/10 bg-white/80 p-6 shadow-sm dark:bg-slate-900/80">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Create coupon</h2>
            <div className="mt-5 space-y-4">
              <input value={couponForm.code} onChange={(event) => setCouponForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="SAVE500" className="input-field" />
              <select value={couponForm.type} onChange={(event) => setCouponForm((current) => ({ ...current, type: event.target.value }))} className="input-field">
                <option value="percentage">Percentage</option>
                <option value="flat">Flat</option>
              </select>
              <input value={couponForm.value} onChange={(event) => setCouponForm((current) => ({ ...current, value: event.target.value }))} placeholder="Discount value" className="input-field" />
              <input type="date" value={couponForm.expiryDate} onChange={(event) => setCouponForm((current) => ({ ...current, expiryDate: event.target.value }))} className="input-field" />
              <input value={couponForm.usageLimit} onChange={(event) => setCouponForm((current) => ({ ...current, usageLimit: event.target.value }))} placeholder="Usage limit" className="input-field" />
            </div>
            <button type="submit" className="mt-6 w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white dark:bg-brand-500">
              Save Coupon
            </button>
          </form>
          <div className="rounded-[28px] border border-white/10 bg-white/80 p-6 shadow-sm dark:bg-slate-900/80">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Active coupons</h2>
            <div className="mt-5 space-y-4">
              {coupons?.coupons?.map((coupon) => (
                <div key={coupon._id} className="rounded-[24px] bg-slate-50/70 p-4 dark:bg-slate-950/60">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900 dark:text-white">{coupon.code}</p>
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-brand-500">{coupon.type === "percentage" ? `${coupon.value}%` : `Rs. ${coupon.value}`}</p>
                      <button type="button" onClick={() => editCoupon(coupon)} className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        Edit
                      </button>
                      <button type="button" onClick={() => deleteCoupon(coupon._id)} className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600">
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Limit {coupon.usageLimit} • Used {coupon.usedCount}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === "upi" && (
        <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <form onSubmit={saveUpi} className="rounded-[28px] border border-white/10 bg-white/80 p-6 shadow-sm dark:bg-slate-900/80">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Billing & Invoice Settings</h2>
            <div className="mt-5 space-y-4">
              <input value={settingsForm.companyName} onChange={(event) => setSettingsForm((current) => ({ ...current, companyName: event.target.value }))} placeholder="Company name" className="input-field" />
              <input value={settingsForm.companyAddress} onChange={(event) => setSettingsForm((current) => ({ ...current, companyAddress: event.target.value }))} placeholder="Company address" className="input-field" />
              <input value={settingsForm.companyPhone} onChange={(event) => setSettingsForm((current) => ({ ...current, companyPhone: event.target.value }))} placeholder="Company phone" className="input-field" />
              <input value={settingsForm.companyEmail} onChange={(event) => setSettingsForm((current) => ({ ...current, companyEmail: event.target.value }))} placeholder="Company email" className="input-field" />
              <input value={settingsForm.upiId} onChange={(event) => setSettingsForm((current) => ({ ...current, upiId: event.target.value }))} placeholder="admin@upi" className="input-field" />
              <input value={settingsForm.qrCodeUrl} onChange={(event) => setSettingsForm((current) => ({ ...current, qrCodeUrl: event.target.value }))} placeholder="QR image URL" className="input-field" />
              <input type="number" min="0" max="100" value={settingsForm.gstPercentage} onChange={(event) => setSettingsForm((current) => ({ ...current, gstPercentage: event.target.value }))} placeholder="GST Percentage" className="input-field" />
              <input value={settingsForm.gstNumber} onChange={(event) => setSettingsForm((current) => ({ ...current, gstNumber: event.target.value }))} placeholder="GST Number (optional)" className="input-field" />
              <input value={settingsForm.logoUrl} onChange={(event) => setSettingsForm((current) => ({ ...current, logoUrl: event.target.value }))} placeholder="Company logo image URL" className="input-field" />
              <input value={settingsForm.signatureUrl} onChange={(event) => setSettingsForm((current) => ({ ...current, signatureUrl: event.target.value }))} placeholder="Signature image URL" className="input-field" />
              <input value={settingsForm.stampUrl} onChange={(event) => setSettingsForm((current) => ({ ...current, stampUrl: event.target.value }))} placeholder="Stamp image URL" className="input-field" />
              <textarea value={settingsForm.termsAndConditions} onChange={(event) => setSettingsForm((current) => ({ ...current, termsAndConditions: event.target.value }))} placeholder="Terms & Conditions" rows={4} className="input-field min-h-[120px] resize-none" />
            </div>
            <button type="submit" className="mt-6 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white dark:bg-brand-500">
              Update Billing Settings
            </button>
          </form>

          <div className="rounded-[28px] border border-white/10 bg-white/80 p-6 shadow-sm dark:bg-slate-900/80">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Current invoice setup</h2>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              {settings?.companyName || "BuildMart Construction Supplies"} • {settings?.upiId || "UPI not configured"} • GST: {settings?.gstPercentage ?? 18}% {settings?.gstNumber ? `• ${settings.gstNumber}` : ""}
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                ["Logo", settings?.logoUrl],
                ["Signature", settings?.signatureUrl],
                ["Stamp", settings?.stampUrl]
              ].map(([label, image]) => (
                <div key={label} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
                  {image ? (
                    <img src={image} alt={label} className="mt-3 h-28 w-full rounded-2xl bg-white object-contain p-2 dark:bg-slate-900" />
                  ) : (
                    <div className="mt-3 flex h-28 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-700">
                      Not uploaded
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-[24px] bg-slate-50/80 p-4 text-sm text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
              <p className="font-semibold text-slate-900 dark:text-white">Terms & Conditions</p>
              <p className="mt-2">{settings?.termsAndConditions || "Not configured yet."}</p>
            </div>
          </div>
        </section>
      )}

      {selectedPaymentOrder ? (
        <>
          <button
            type="button"
            onClick={() => setSelectedPaymentOrder(null)}
            className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm"
            aria-label="Close payment modal"
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-[32px] border border-white/10 bg-white p-6 shadow-2xl dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-brand-500">Add Payment</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {selectedPaymentOrder.invoiceNumber}
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Remaining due: Rs. {selectedPaymentOrder.remainingAmount}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPaymentOrder(null)}
                className="rounded-full bg-slate-100 p-2 dark:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <input
                type="number"
                min="0"
                max={selectedPaymentOrder.remainingAmount}
                value={(paymentForms[selectedPaymentOrder._id] || emptyPaymentForm).amount}
                onChange={(event) => updatePaymentForm(selectedPaymentOrder._id, "amount", event.target.value)}
                placeholder="Amount"
                className="input-field"
              />
              <select
                value={(paymentForms[selectedPaymentOrder._id] || emptyPaymentForm).method}
                onChange={(event) => updatePaymentForm(selectedPaymentOrder._id, "method", event.target.value)}
                className="input-field"
              >
                <option value="Cash">Cash (COD)</option>
                <option value="UPI">UPI</option>
              </select>
              <input
                type="date"
                value={(paymentForms[selectedPaymentOrder._id] || emptyPaymentForm).date}
                onChange={(event) => updatePaymentForm(selectedPaymentOrder._id, "date", event.target.value)}
                className="input-field"
              />
              <textarea
                rows="3"
                value={(paymentForms[selectedPaymentOrder._id] || emptyPaymentForm).note}
                onChange={(event) => updatePaymentForm(selectedPaymentOrder._id, "note", event.target.value)}
                placeholder="Notes (optional)"
                className="input-field"
              />
              {Number((paymentForms[selectedPaymentOrder._id] || emptyPaymentForm).amount || 0) > selectedPaymentOrder.remainingAmount ? (
                <p className="text-sm font-medium text-rose-500">Invalid amount: payment exceeds remaining due.</p>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedPaymentOrder(null)}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={paymentSubmitting}
                onClick={() => addPayment(selectedPaymentOrder)}
                className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {paymentSubmitting ? "Saving..." : "Submit Payment"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
