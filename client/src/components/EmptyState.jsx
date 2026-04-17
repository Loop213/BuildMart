export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="rounded-[28px] border border-dashed border-brand-200 bg-white/80 p-8 text-center shadow-sm dark:border-brand-500/20 dark:bg-slate-900/80">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
        <Icon size={24} />
      </div>
      <h3 className="mt-5 text-xl font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

