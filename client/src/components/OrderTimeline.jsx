import { CalendarClock, Wallet } from "lucide-react";

export function OrderTimeline({ payments = [] }) {
  if (!payments.length) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No payments logged yet.</p>;
  }

  return (
    <div className="space-y-4">
      {payments.map((payment) => (
        <div key={payment._id || `${payment.date}-${payment.amount}`} className="flex gap-4">
          <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
            <Wallet size={18} />
          </div>
          <div className="flex-1 rounded-2xl border border-white/10 bg-slate-50/70 p-4 dark:bg-slate-900/70">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium text-slate-900 dark:text-white">Rs. {payment.amount.toLocaleString("en-IN")}</p>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <CalendarClock size={14} />
                {new Date(payment.date).toLocaleDateString("en-IN")}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {payment.method} {payment.note ? `• ${payment.note}` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

