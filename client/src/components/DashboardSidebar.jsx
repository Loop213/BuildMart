import { X } from "lucide-react";
import clsx from "clsx";

export function DashboardSidebar({ items, activeSection, setActiveSection, mobileOpen, setMobileOpen }) {
  function handleSelect(sectionId) {
    setActiveSection(sectionId);
    setMobileOpen(false);
  }

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
        />
      ) : null}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-[290px] border-r border-white/10 bg-white/95 p-5 shadow-2xl transition-transform duration-300 dark:bg-slate-950/95 lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:translate-x-0 lg:rounded-[32px] lg:border",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <p className="text-lg font-semibold text-slate-900 dark:text-white">Account Menu</p>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-full bg-slate-100 p-2 dark:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={clsx(
                  "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition",
                  active
                    ? "bg-brand-500 text-white shadow-glow"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                )}
              >
                <span className={clsx("rounded-2xl p-2", active ? "bg-white/15" : "bg-brand-50 text-brand-600 dark:bg-brand-500/10")}>
                  <Icon size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className={clsx("block text-xs", active ? "text-white/75" : "text-slate-400 dark:text-slate-500")}>
                    {item.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
}

