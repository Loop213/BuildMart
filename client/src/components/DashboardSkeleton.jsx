export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="animate-pulseSoft rounded-[28px] border border-white/10 bg-white/80 p-6 shadow-sm dark:bg-slate-900/80">
            <div className="h-12 w-12 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="mt-6 h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-3 h-8 w-32 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>
      <div className="animate-pulseSoft rounded-[28px] border border-white/10 bg-white/80 p-8 shadow-sm dark:bg-slate-900/80">
        <div className="h-8 w-48 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="h-44 rounded-[24px] bg-slate-200 dark:bg-slate-800" />
          <div className="h-44 rounded-[24px] bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

