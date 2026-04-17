import { HardHat, Search, ShoppingCart, UserCircle2 } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export function Navbar({ search, setSearch }) {
  const { user, logout } = useAuth();
  const { totals } = useCart();
  const navigate = useNavigate();

  function handleSearchSubmit(event) {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : "/products");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-white/70 backdrop-blur-xl dark:bg-slate-950/75">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 md:px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-glow">
            <HardHat size={22} />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-slate-900 dark:text-white">BuildMart</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Construction eCommerce</p>
          </div>
        </Link>

        <form onSubmit={handleSearchSubmit} className="relative hidden flex-1 md:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search sand, rod, cement..."
            className="w-full rounded-full border border-white/10 bg-slate-100/80 py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:bg-slate-900 dark:text-white dark:focus:ring-brand-500/20"
          />
        </form>

        <nav className="hidden items-center gap-5 md:flex">
          <NavLink className="nav-link" to="/">Store</NavLink>
          <NavLink className="nav-link" to="/products">Products</NavLink>
          <NavLink className="nav-link" to="/orders">Orders</NavLink>
          <NavLink className="nav-link" to="/profile">Profile</NavLink>
          {user?.role === "admin" && <NavLink className="nav-link" to="/admin">Admin</NavLink>}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/cart" className="relative rounded-full border border-white/10 bg-white/70 p-2.5 shadow-sm dark:bg-slate-900/70">
            <ShoppingCart size={18} />
            {totals.quantity > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-brand-500 px-1.5 text-[10px] font-semibold text-white">
                {totals.quantity}
              </span>
            )}
          </Link>
          {user ? (
            <button type="button" onClick={logout} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-900">
              Logout
            </button>
          ) : (
            <Link to="/auth" className="rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-glow">
              Login
            </Link>
          )}
          <Link to={user ? "/profile" : "/auth"} className="hidden rounded-full border border-white/10 bg-white/70 p-2 dark:bg-slate-900/70 md:block">
            <UserCircle2 size={20} />
          </Link>
        </div>
      </div>
    </header>
  );
}
