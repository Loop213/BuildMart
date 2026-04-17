import { startTransition, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import useSWR, { mutate } from "swr";
import {
  Bell,
  ChartColumnBig,
  CreditCard,
  FileText,
  Home,
  Layers3,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Package,
  Phone,
  Save,
  Settings2,
  ShieldCheck,
  Upload,
  User,
  Wallet,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { request } from "../api/http";
import { useTheme } from "../context/ThemeContext";
import { printInvoice } from "../utils/invoice";
import { DashboardSidebar } from "../components/DashboardSidebar";
import { DashboardSkeleton } from "../components/DashboardSkeleton";
import { EmptyState } from "../components/EmptyState";
import { OrderTimeline } from "../components/OrderTimeline";
import { PaymentPassbookTable } from "../components/PaymentPassbookTable";
import { ProgressBar } from "../components/ProgressBar";
import { SimpleBarChart } from "../components/SimpleBarChart";
import { SimpleLineChart } from "../components/SimpleLineChart";
import { StatCard } from "../components/StatCard";

const sections = [
  { id: "profile", label: "Profile Info", description: "Personal details and identity", icon: User },
  { id: "orders", label: "My Orders", description: "Track purchases and statuses", icon: Package },
  { id: "payments", label: "Payments & Dues", description: "Outstanding balances and history", icon: Wallet },
  { id: "addresses", label: "Address Book", description: "Delivery locations", icon: Home },
  { id: "settings", label: "Settings", description: "Theme, password, notifications", icon: Settings2 }
];

function getScopedKey(baseKey, userId) {
  return `${baseKey}_${userId || "guest"}`;
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function getOrderProgress(order) {
  if (!order.totalAmount) {
    return 0;
  }
  return Math.round((order.paidAmount / order.totalAmount) * 100);
}

function summarizeProducts(items = []) {
  return items.map((item) => item.name).join(", ");
}

function buildBarData(orders) {
  return orders.slice(0, 6).reverse().map((order) => ({
    label: new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    shortLabel: new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    value: order.totalAmount
  }));
}

function buildLineData(orders) {
  const paymentEntries = orders
    .flatMap((order) => order.paymentHistory || [])
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!paymentEntries.length) {
    return [];
  }

  const grouped = paymentEntries.reduce((accumulator, payment) => {
    const label = new Date(payment.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    accumulator[label] = (accumulator[label] || 0) + payment.amount;
    return accumulator;
  }, {});

  return Object.entries(grouped).map(([label, value]) => ({
    label,
    shortLabel: label,
    value
  }));
}

function SectionCard({ title, description, action, children }) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/80 p-6 shadow-sm dark:bg-slate-900/80 md:p-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h2>
          {description ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ProfileHeader({ user, onUpload, onEdit, onLogout }) {
  return (
    <div className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-white to-brand-50 p-6 shadow-sm dark:from-slate-900 dark:to-slate-950 md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 overflow-hidden rounded-[28px] border border-white/40 bg-brand-500 text-white shadow-glow">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-semibold">
                {user?.name?.[0] || "U"}
              </div>
            )}
            <label className="absolute bottom-2 right-2 cursor-pointer rounded-full bg-white p-2 text-slate-900 shadow-lg dark:bg-slate-900 dark:text-white">
              <Upload size={14} />
              <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
            </label>
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-brand-500">Customer workspace</p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-slate-900 dark:text-white">{user?.name}</h1>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-2"><Phone size={14} /> {user?.phone || "Add phone number"}</span>
              <span className="inline-flex items-center gap-2"><Mail size={14} /> {user?.email}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onEdit} className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white dark:bg-brand-500">
            Edit profile
          </button>
          <button type="button" onClick={onLogout} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white">
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage({ initialSection = "profile" }) {
  const { user, logout, updateProfile, updateAvatar, changePassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data, isLoading } = useSWR("/orders/my-orders", { refreshInterval: 5000 });
  const { data: addressData, isLoading: addressesLoading } = useSWR("/addresses", { refreshInterval: 5000 });
  const { data: myRequests } = useSWR("/payments/my-requests", { refreshInterval: 5000 });
  const [activeSection, setActiveSection] = useState(initialSection);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [selectedRequestOrder, setSelectedRequestOrder] = useState(null);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestForm, setRequestForm] = useState({
    amount: "",
    method: "UPI",
    date: new Date().toISOString().slice(0, 10),
    note: "",
    transactionReference: "",
    screenshotUrl: ""
  });

  const profileKey = getScopedKey("buildmart_profile_form", user?._id);
  const settingsKey = getScopedKey("buildmart_settings", user?._id);

  const storedProfileForm = JSON.parse(localStorage.getItem(profileKey) || "null");
  const storedSettings = JSON.parse(localStorage.getItem(settingsKey) || "null");

  const [profileForm, setProfileForm] = useState(
    storedProfileForm || {
      name: user?.name || "",
      phone: user?.phone || "",
      email: user?.email || "",
      address: user?.address || ""
    }
  );
  const [errors, setErrors] = useState({});
  const [addressForm, setAddressForm] = useState({
    label: "",
    name: user?.name || "",
    phone: user?.phone || "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    isDefault: false
  });
  const [settingsForm, setSettingsForm] = useState(
    storedSettings || {
      emailNotifications: true,
      orderAlerts: true,
      marketingUpdates: false,
      currentPassword: "",
      nextPassword: "",
      confirmPassword: ""
    }
  );

  const orders = data?.orders || [];
  const addresses = addressData?.addresses || [];
  const paymentRequests = myRequests?.payments || [];
  const selectedOrder = orders.find((order) => order._id === selectedOrderId) || orders[0] || null;

  const totals = useMemo(() => {
    const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalPaid = orders.reduce((sum, order) => sum + order.paidAmount, 0);
    const totalDue = orders.reduce((sum, order) => sum + order.remainingAmount, 0);
    return {
      totalSpent,
      totalPaid,
      totalDue
    };
  }, [orders]);

  const barData = useMemo(() => buildBarData(orders), [orders]);
  const lineData = useMemo(() => buildLineData(orders), [orders]);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  function persistProfileForm(nextForm) {
    setProfileForm(nextForm);
    localStorage.setItem(profileKey, JSON.stringify(nextForm));
  }

  function persistSettings(nextSettings) {
    setSettingsForm(nextSettings);
    localStorage.setItem(settingsKey, JSON.stringify(nextSettings));
  }

  useEffect(() => {
    if (!editingAddressId) {
      return;
    }

    const editingAddress = addresses.find((address) => address._id === editingAddressId);
    if (!editingAddress) {
      return;
    }

    setAddressForm({
      label: editingAddress.label || "",
      name: editingAddress.name,
      phone: editingAddress.phone,
      address: editingAddress.address,
      city: editingAddress.city,
      state: editingAddress.state,
      pincode: editingAddress.pincode,
      isDefault: editingAddress.isDefault
    });
  }, [addresses, editingAddressId]);

  function handleSectionChange(sectionId) {
    startTransition(() => {
      setActiveSection(sectionId);
      setMobileOpen(false);
    });
  }

  function openPaymentRequest(order) {
    setSelectedRequestOrder(order);
    setRequestForm({
      amount: "",
      method: "UPI",
      date: new Date().toISOString().slice(0, 10),
      note: "",
      transactionReference: "",
      screenshotUrl: ""
    });
  }

  async function submitPaymentRequest() {
    if (!selectedRequestOrder) {
      return;
    }

    const amount = Number(requestForm.amount || 0);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }

    if (amount > selectedRequestOrder.remainingAmount) {
      toast.error("Payment exceeds remaining dues");
      return;
    }

    setRequestSubmitting(true);
    try {
      await request("/payments/request", {
        method: "POST",
        body: JSON.stringify({
          orderId: selectedRequestOrder._id,
          amount,
          method: requestForm.method,
          date: requestForm.date,
          note: requestForm.note,
          transactionReference: requestForm.transactionReference,
          screenshotUrl: requestForm.screenshotUrl
        })
      });
      toast.success("Payment submitted for admin approval");
      setSelectedRequestOrder(null);
      mutate("/payments/my-requests");
    } catch (error) {
      toast.error(error.message || "Unable to submit payment request");
    } finally {
      setRequestSubmitting(false);
    }
  }

  function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function validateProfile() {
    const nextErrors = {};

    if (!profileForm.name.trim()) {
      nextErrors.name = "Name is required";
    }
    if (!/^\S+@\S+\.\S+$/.test(profileForm.email)) {
      nextErrors.email = "Enter a valid email";
    }
    if (profileForm.phone && !/^\d{10}$/.test(profileForm.phone)) {
      nextErrors.phone = "Phone must be 10 digits";
    }
    if (!profileForm.address.trim()) {
      nextErrors.address = "Address is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleProfileSave(event) {
    event.preventDefault();
    if (!validateProfile()) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    updateProfile(profileForm);
  }

  async function handleAddressSubmit(event) {
    event.preventDefault();
    const nextAddress = {
      ...addressForm,
      label: addressForm.label || "Site Address"
    };

    if (editingAddressId) {
      await request(`/addresses/${editingAddressId}`, {
        method: "PUT",
        body: JSON.stringify(nextAddress)
      });
      toast.success("Address updated");
    } else {
      await request("/addresses", {
        method: "POST",
        body: JSON.stringify(nextAddress)
      });
      toast.success("Address added");
    }

    await mutate("/addresses");
    setAddressForm({
      label: "",
      name: user?.name || "",
      phone: user?.phone || "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      isDefault: false
    });
    setEditingAddressId(null);
  }

  function handleEditAddress(address) {
    setAddressForm({
      label: address.label || "",
      name: address.name,
      phone: address.phone,
      address: address.address,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      isDefault: address.isDefault
    });
    setEditingAddressId(address._id);
    handleSectionChange("addresses");
  }

  async function handleDeleteAddress(addressId) {
    await request(`/addresses/${addressId}`, { method: "DELETE" });
    await mutate("/addresses");
    toast.success("Address removed");
  }

  async function handleDefaultAddress(address) {
    await request(`/addresses/${address._id}`, {
      method: "PUT",
      body: JSON.stringify({
        label: address.label || "Site Address",
        name: address.name,
        phone: address.phone,
        address: address.address,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        isDefault: true
      })
    });
    await mutate("/addresses");
    toast.success("Default address updated");
  }

  function handleSettingsSave(event) {
    event.preventDefault();

    if (settingsForm.nextPassword || settingsForm.confirmPassword || settingsForm.currentPassword) {
      if (settingsForm.nextPassword.length < 6) {
        toast.error("New password must be at least 6 characters");
        return;
      }
      if (settingsForm.nextPassword !== settingsForm.confirmPassword) {
        toast.error("Password confirmation does not match");
        return;
      }

      try {
        changePassword({
          currentPassword: settingsForm.currentPassword,
          nextPassword: settingsForm.nextPassword
        });
      } catch (error) {
        toast.error(error.message);
        return;
      }
    }

    persistSettings({
      ...settingsForm,
      currentPassword: "",
      nextPassword: "",
      confirmPassword: ""
    });
    toast.success("Settings saved");
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[290px_minmax(0,1fr)]">
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-brand-500"
        >
          <Menu size={16} />
          Account Menu
        </button>
      </div>

      <DashboardSidebar
        items={sections}
        activeSection={activeSection}
        setActiveSection={handleSectionChange}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="space-y-6">
        <ProfileHeader
          user={user}
          onUpload={handleAvatarUpload}
          onEdit={() => handleSectionChange("profile")}
          onLogout={logout}
        />

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard icon={Layers3} label="Orders" value={orders.length} hint="All completed and active material orders" />
          <StatCard icon={CreditCard} label="Total Paid" value={formatCurrency(totals.totalPaid)} hint="All successful installment and full payments" />
          <StatCard icon={FileText} label="Remaining Dues" value={formatCurrency(totals.totalDue)} hint="Pending balances across your orders" />
        </section>

        {activeSection === "profile" ? (
          <SectionCard
            title="Profile Information"
            description="Keep your contact details and primary delivery information up to date."
            action={
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-600 dark:bg-brand-500/10">
                <ShieldCheck size={16} />
                Secure account details
              </span>
            }
          >
            <form onSubmit={handleProfileSave} className="grid gap-5 md:grid-cols-2">
              {[
                ["name", "Full name", User],
                ["phone", "Phone number", Phone],
                ["email", "Email address", Mail]
              ].map(([field, label, Icon]) => (
                <label key={field} className="block">
                  <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                    <Icon size={15} />
                    {label}
                  </span>
                  <input
                    value={profileForm[field]}
                    onChange={(event) => persistProfileForm({ ...profileForm, [field]: event.target.value })}
                    className={`input-field ${errors[field] ? "border-rose-300 focus:ring-rose-100 dark:border-rose-500/30" : ""}`}
                  />
                  {errors[field] ? <p className="mt-2 text-xs text-rose-500">{errors[field]}</p> : null}
                </label>
              ))}
              <label className="block md:col-span-2">
                <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                  <MapPin size={15} />
                  Address
                </span>
                <textarea
                  rows="4"
                  value={profileForm.address}
                  onChange={(event) => persistProfileForm({ ...profileForm, address: event.target.value })}
                  className={`input-field ${errors.address ? "border-rose-300 focus:ring-rose-100 dark:border-rose-500/30" : ""}`}
                />
                {errors.address ? <p className="mt-2 text-xs text-rose-500">{errors.address}</p> : null}
              </label>
              <div className="md:col-span-2">
                <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white dark:bg-brand-500">
                  <Save size={16} />
                  Save / Update
                </button>
              </div>
            </form>
          </SectionCard>
        ) : null}

        {activeSection === "orders" ? (
          <SectionCard title="My Orders" description="Review order history, payment status, and full material details.">
            {!orders.length ? (
              <EmptyState
                icon={Package}
                title="No orders yet"
                description="Once you place sand, rod, or cement orders, they’ll appear here with invoice details and payment status."
              />
            ) : (
              <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
                <div className="space-y-4">
                  {orders.map((order) => (
                    <button
                      key={order._id}
                      type="button"
                      onClick={() => setSelectedOrderId(order._id)}
                      className={`w-full rounded-[24px] border p-5 text-left transition ${
                        selectedOrder?._id === order._id
                          ? "border-brand-500 bg-brand-50/70 shadow-glow dark:bg-brand-500/10"
                          : "border-white/10 bg-slate-50/70 hover:-translate-y-0.5 dark:bg-slate-950/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-brand-500">{order.invoiceNumber}</p>
                          <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                            {summarizeProducts(order.items)}
                          </h3>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                          {order.paymentStatus}
                        </span>
                      </div>
                <div className="mt-4 grid gap-2 text-sm text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                  <p>Order ID: {order._id.slice(-6).toUpperCase()}</p>
                  <p>Date: {new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
                  <p>Total: {formatCurrency(order.totalAmount)}</p>
                  <p>Status: {order.status}</p>
                  <p>GST: {order.gstApplied ? `${order.gstPercentage}%` : "Not Applied"}</p>
                  <p>GST Amount: {formatCurrency(order.gstAmount)}</p>
                </div>
                    </button>
                  ))}
                </div>

                {selectedOrder ? (
                  <article className="rounded-[28px] border border-white/10 bg-slate-50/70 p-6 dark:bg-slate-950/60">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-[0.35em] text-brand-500">{selectedOrder.invoiceNumber}</p>
                        <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{selectedOrder.status}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => printInvoice(selectedOrder._id)}
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-brand-500"
                      >
                        View / Download Invoice
                      </button>
                    </div>

                    <div className="mt-6 space-y-4">
                      {selectedOrder.items.map((item) => (
                        <div key={`${selectedOrder._id}-${item.product}`} className="flex items-center gap-4 rounded-[24px] bg-white/90 p-4 shadow-sm dark:bg-slate-900/80">
                          <img src={item.image} alt={item.name} className="h-16 w-16 rounded-2xl object-cover" />
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{item.quantity} × {item.unit}</p>
                          </div>
                          <p className="font-semibold text-brand-500">{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                ) : null}
              </div>
            )}
          </SectionCard>
        ) : null}

        {activeSection === "payments" ? (
          <div className="space-y-6">
            <SectionCard title="Payments & Dues" description="See how much you’ve spent, paid, and what remains outstanding across every order.">
              {!orders.length ? (
                <EmptyState
                  icon={Wallet}
                  title="No payment records yet"
                  description="Payment activity and due tracking will appear here as soon as your first order is placed."
                />
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <StatCard icon={ChartColumnBig} label="Total Spent" value={formatCurrency(totals.totalSpent)} />
                    <StatCard icon={CreditCard} label="Total Paid" value={formatCurrency(totals.totalPaid)} />
                    <StatCard icon={Wallet} label="Remaining Dues" value={formatCurrency(totals.totalDue)} />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <SimpleBarChart
                      data={barData.length ? barData : [{ label: "No Data", shortLabel: "--", value: 0 }]}
                      title="Spending Trend"
                      subtitle="Order amount distribution across recent purchase dates."
                    />
                    <SimpleLineChart
                      data={lineData.length ? lineData : [{ label: "No Data", shortLabel: "--", value: 0 }]}
                      title="Payment History"
                      subtitle="Installments and order payments over time."
                    />
                  </div>

                  <SectionCard
                    title="My Payment Requests"
                    description="Submitted passbook updates waiting for admin approval."
                  >
                    <PaymentPassbookTable payments={paymentRequests} showRequestedBy={false} />
                  </SectionCard>
                </div>
              )}
            </SectionCard>

            {orders.map((order) => (
              <SectionCard
                key={order._id}
                title={order.invoiceNumber}
                description={`${summarizeProducts(order.items)} • ${new Date(order.createdAt).toLocaleDateString("en-IN")}`}
                action={<span className="rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-600 dark:bg-brand-500/10">{order.paymentStatus}</span>}
              >
                <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                  <div className="space-y-5 rounded-[24px] bg-slate-50/70 p-5 dark:bg-slate-950/60">
                    <div className="grid gap-3 text-sm text-slate-500 dark:text-slate-400">
                      <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
                      <div className="flex justify-between"><span>Discount</span><span>{formatCurrency(order.discountAmount)}</span></div>
                      <div className="flex justify-between"><span>GST</span><span>{order.gstApplied ? `${order.gstPercentage}% • ${formatCurrency(order.gstAmount)}` : "Not Applied"}</span></div>
                      <div className="flex justify-between"><span>Total amount</span><span>{formatCurrency(order.totalAmount)}</span></div>
                      <div className="flex justify-between"><span>Paid amount</span><span>{formatCurrency(order.paidAmount)}</span></div>
                      <div className="flex justify-between font-semibold text-brand-500"><span>Remaining amount</span><span>{formatCurrency(order.remainingAmount)}</span></div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Payment completion</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{getOrderProgress(order)}%</span>
                      </div>
                      <ProgressBar value={getOrderProgress(order)} />
                    </div>
                    <button
                      type="button"
                      onClick={() => openPaymentRequest(order)}
                      className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white dark:bg-brand-500"
                    >
                      Add Payment Request
                    </button>
                  </div>
                  <div>
                    <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Payment timeline</h3>
                    <OrderTimeline payments={order.paymentHistory} />
                    <div className="mt-5">
                      <PaymentPassbookTable payments={order.paymentHistory} />
                    </div>
                  </div>
                </div>
              </SectionCard>
            ))}
          </div>
        ) : null}

        {activeSection === "addresses" ? (
          <SectionCard title="Address Book" description="Manage multiple delivery destinations and choose a default construction site.">
            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <form onSubmit={handleAddressSubmit} className="space-y-4 rounded-[24px] bg-slate-50/70 p-5 dark:bg-slate-950/60">
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["label", "Address label"],
                    ["name", "Contact name"],
                    ["phone", "Phone"],
                    ["city", "City"],
                    ["state", "State"],
                    ["pincode", "PIN code"]
                  ].map(([field, label]) => (
                    <label key={field} className={field === "label" ? "md:col-span-2" : ""}>
                      <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
                      <input
                        required={field !== "pincode"}
                        value={addressForm[field]}
                        onChange={(event) => setAddressForm((current) => ({ ...current, [field]: event.target.value }))}
                        className="input-field"
                      />
                    </label>
                  ))}
                  <label className="md:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">Address line</span>
                      <textarea
                        rows="4"
                        value={addressForm.address}
                        onChange={(event) => setAddressForm((current) => ({ ...current, address: event.target.value }))}
                        className="input-field"
                      />
                  </label>
                </div>
                <label className="inline-flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={addressForm.isDefault}
                    onChange={(event) => setAddressForm((current) => ({ ...current, isDefault: event.target.checked }))}
                    className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                  />
                  Make this my default address
                </label>
                <button type="submit" className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white dark:bg-brand-500">
                  {editingAddressId ? "Update Address" : "Add Address"}
                </button>
              </form>

              <div className="space-y-4">
                {!addresses.length && !addressesLoading ? (
                  <EmptyState
                    icon={Home}
                    title="No addresses saved"
                    description="Add a billing or delivery location to speed up future checkout flows."
                  />
                ) : (
                  addresses.map((address) => (
                    <div key={address._id} className="rounded-[24px] border border-white/10 bg-white/80 p-5 shadow-sm dark:bg-slate-900/80">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{address.label || "Site Address"}</h3>
                            {address.isDefault ? <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 dark:bg-brand-500/10">Default</span> : null}
                          </div>
                          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{address.name} • {address.phone}</p>
                          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                            {address.address}, {address.city}, {address.state} {address.pincode}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => handleEditAddress(address)} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium dark:bg-slate-800">
                            Edit
                          </button>
                          <button type="button" onClick={() => handleDefaultAddress(address)} className="rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-600 dark:bg-brand-500/10">
                            Set Default
                          </button>
                          <button type="button" onClick={() => handleDeleteAddress(address._id)} className="rounded-full bg-rose-100 px-4 py-2 text-sm font-medium text-rose-600">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </SectionCard>
        ) : null}

        {activeSection === "settings" ? (
          <SectionCard title="Settings" description="Control appearance, password preferences, and notification behavior.">
            <form onSubmit={handleSettingsSave} className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-5 rounded-[24px] bg-slate-50/70 p-5 dark:bg-slate-950/60">
                <div className="flex items-center justify-between gap-4 rounded-[22px] bg-white/90 p-4 shadow-sm dark:bg-slate-900/80">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Theme mode</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Switch between clean daylight and neon dark mode.</p>
                  </div>
                  <button type="button" onClick={toggleTheme} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-brand-500">
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </button>
                </div>

                {[
                  ["emailNotifications", "Email Notifications", "Receive order and invoice updates in email."],
                  ["orderAlerts", "Order Alerts", "Get notified when your order status or payment state changes."],
                  ["marketingUpdates", "Promotions", "Hear about material discounts and seasonal coupon offers."]
                ].map(([field, label, description]) => (
                  <label key={field} className="flex items-start justify-between gap-4 rounded-[22px] bg-white/90 p-4 shadow-sm dark:bg-slate-900/80">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{label}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settingsForm[field]}
                      onChange={(event) => persistSettings({ ...settingsForm, [field]: event.target.checked })}
                      className="mt-1 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                    />
                  </label>
                ))}
              </div>

              <div className="space-y-4 rounded-[24px] bg-slate-50/70 p-5 dark:bg-slate-950/60">
                <div className="mb-2 flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-brand-500">
                  <Bell size={14} />
                  Account Security
                </div>
                {[
                  ["currentPassword", "Current Password"],
                  ["nextPassword", "New Password"],
                  ["confirmPassword", "Confirm Password"]
                ].map(([field, label]) => (
                  <label key={field}>
                    <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
                    <input
                      type="password"
                      value={settingsForm[field]}
                      onChange={(event) => persistSettings({ ...settingsForm, [field]: event.target.value })}
                      className="input-field"
                    />
                  </label>
                ))}
                <button type="submit" className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white dark:bg-brand-500">
                  Save Settings
                </button>
              </div>
            </form>
          </SectionCard>
        ) : null}

        {selectedRequestOrder ? (
          <>
            <button
              type="button"
              onClick={() => setSelectedRequestOrder(null)}
              className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm"
              aria-label="Close payment request modal"
            />
            <div className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-[32px] border border-white/10 bg-white p-6 shadow-2xl dark:bg-slate-950">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-brand-500">Payment Request</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                    {selectedRequestOrder.invoiceNumber}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Remaining due: {formatCurrency(selectedRequestOrder.remainingAmount)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequestOrder(null)}
                  className="rounded-full bg-slate-100 p-2 dark:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <input
                  type="number"
                  value={requestForm.amount}
                  onChange={(event) => setRequestForm((current) => ({ ...current, amount: event.target.value }))}
                  placeholder="Amount"
                  className="input-field"
                />
                <select
                  value={requestForm.method}
                  onChange={(event) => setRequestForm((current) => ({ ...current, method: event.target.value }))}
                  className="input-field"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                </select>
                <input
                  type="date"
                  value={requestForm.date}
                  onChange={(event) => setRequestForm((current) => ({ ...current, date: event.target.value }))}
                  className="input-field"
                />
                <input
                  value={requestForm.transactionReference}
                  onChange={(event) => setRequestForm((current) => ({ ...current, transactionReference: event.target.value }))}
                  placeholder="Transaction reference / note"
                  className="input-field"
                />
                <textarea
                  rows="3"
                  value={requestForm.note}
                  onChange={(event) => setRequestForm((current) => ({ ...current, note: event.target.value }))}
                  placeholder="Additional notes"
                  className="input-field"
                />
                <input
                  value={requestForm.screenshotUrl}
                  onChange={(event) => setRequestForm((current) => ({ ...current, screenshotUrl: event.target.value }))}
                  placeholder="Screenshot upload placeholder URL"
                  className="input-field"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRequestOrder(null)}
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={requestSubmitting}
                  onClick={submitPaymentRequest}
                  className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {requestSubmitting ? "Submitting..." : "Submit for Approval"}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
