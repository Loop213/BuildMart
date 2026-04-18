import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const initialSignup = {
  name: "",
  email: "",
  password: ""
};

export function AuthPage() {
  const navigate = useNavigate();
  const { login, signup, loading } = useAuth();
  const [mode, setMode] = useState("login");
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState(initialSignup);

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = mode === "login" ? loginData : signupData;
    const authAction = mode === "login" ? login : signup;
    try {
      await authAction(payload);
      navigate("/");
    } catch (error) {
      toast.error(error.message || "Login failed");
    }
  }

  const formData = mode === "login" ? loginData : signupData;
  const setFormData = mode === "login" ? setLoginData : setSignupData;

  return (
    <div className="mx-auto grid min-h-[75vh] max-w-5xl items-center gap-10 md:grid-cols-2">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-brand-500">Access BuildMart</p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-900 dark:text-white">
          Manage your construction orders with a polished, secure workflow.
        </h1>
        <p className="mt-4 text-slate-500 dark:text-slate-400">
          Sign in as a customer to track dues and invoices, or use an admin account to manage products, coupons, and UPI payments.
        </p>
        <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          New customer accounts start with <strong>Pending Approval</strong>. You can still login and use the app while admin review is in progress.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-[28px] border border-white/10 bg-white/80 p-8 shadow-sm dark:bg-slate-900/80">
        <div className="mb-6 flex rounded-full bg-slate-100 p-1 dark:bg-slate-800">
          {["login", "signup"].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${mode === value ? "bg-brand-500 text-white" : "text-slate-500"}`}
            >
              {value === "login" ? "Login" : "Create Account"}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {mode === "signup" && (
            <input
              required
              value={formData.name}
              onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
              placeholder="Full name"
              className="input-field"
            />
          )}
          <input
            required
            type="email"
            value={formData.email}
            onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
            placeholder="Email address"
            className="input-field"
          />
          <input
            required
            minLength={6}
            type="password"
            value={formData.password}
            onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
            placeholder="Password"
            className="input-field"
          />
        </div>

        <button type="submit" disabled={loading} className="mt-6 w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:opacity-60 dark:bg-brand-500">
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
        </button>
      </form>
    </div>
  );
}
