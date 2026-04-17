export function SimpleBarChart({ data, title, subtitle }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/80 p-6 shadow-sm dark:bg-slate-900/80">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className="mt-8 flex h-64 items-end gap-3">
        {data.map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-3">
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-[18px] bg-gradient-to-t from-brand-500 to-cyan-400 shadow-glow transition hover:opacity-90"
                style={{ height: `${Math.max((item.value / max) * 100, 8)}%` }}
                title={`${item.label}: Rs. ${item.value.toLocaleString("en-IN")}`}
              />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-slate-900 dark:text-white">{item.shortLabel || item.label}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Rs. {item.value.toLocaleString("en-IN")}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

