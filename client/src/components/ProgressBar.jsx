export function ProgressBar({ value }) {
  const safeValue = Math.min(Math.max(Number(value || 0), 0), 100);

  return (
    <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400 transition-all duration-500"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

