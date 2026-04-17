export function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/80 p-6 shadow-sm transition hover:-translate-y-1 dark:bg-slate-900/80">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
        <Icon size={20} />
      </div>
      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
      {hint ? <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">{hint}</p> : null}
    </div>
  );
}

