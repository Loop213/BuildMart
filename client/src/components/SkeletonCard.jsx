export function SkeletonCard() {
  return (
    <div className="animate-pulseSoft rounded-[24px] border border-white/10 bg-white/80 p-5 shadow-sm dark:bg-slate-900/80">
      <div className="h-48 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="mt-5 h-5 w-20 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mt-3 h-7 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mt-4 h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mt-2 h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

