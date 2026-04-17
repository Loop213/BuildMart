import { Moon, SunMedium } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-full border border-white/10 bg-white/70 p-2 text-slate-700 shadow-sm transition hover:scale-105 dark:bg-slate-900/70 dark:text-slate-50"
      aria-label="Toggle theme"
    >
      {theme === "light" ? <Moon size={18} /> : <SunMedium size={18} />}
    </button>
  );
}

