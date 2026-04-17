import { ArrowRight, ShieldCheck, Sparkles, Truck } from "lucide-react";
import useSWR from "swr";
import { ProductCard } from "../components/ProductCard";
import { SkeletonCard } from "../components/SkeletonCard";
import { useCart } from "../context/CartContext";

const categories = ["All", "Sand", "Rod", "Cement"];

export function HomePage({
  search,
  category,
  setCategory,
  page,
  setPage,
  showHero = true,
  title = "Construction essentials",
  eyebrow = "Catalog",
  description = "Search instantly, review stock, and add items directly to your cart."
}) {
  const { addToCart } = useCart();
  const categoryQuery = category !== "All" ? `&category=${encodeURIComponent(category)}` : "";
  const { data, isLoading } = useSWR(
    `/products?search=${encodeURIComponent(search)}&page=${page}&limit=9${categoryQuery}`
  );

  return (
    <div className="space-y-12">
      {showHero ? (
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-500 via-sky-500 to-slate-900 p-8 text-white shadow-glow md:p-12">
        <div className="absolute -right-16 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative grid gap-10 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="inline-flex rounded-full border border-white/20 px-4 py-1 text-xs uppercase tracking-[0.4em] text-white/80">
              Trusted by contractors
            </p>
            <h1 className="mt-6 max-w-2xl font-display text-4xl font-semibold leading-tight md:text-6xl">
              Premium building materials with transparent dues tracking.
            </h1>
            <p className="mt-5 max-w-xl text-white/80">
              Source sand, TMT rods, and cement with flexible payments, coupon savings, and a professional order workflow built for construction teams.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#catalog" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:scale-[1.02]">
                Explore catalog
                <ArrowRight size={16} />
              </a>
              <div className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/80">
                Partial payment ready
              </div>
            </div>
          </div>
          <div className="grid gap-4 self-end">
            {[
              ["Fast Dispatch", "Same-day logistics support for active sites.", Truck],
              ["Secure Payments", "COD and admin-managed UPI collections.", ShieldCheck],
              ["Smart Checkout", "Coupons, due tracking, and invoice access.", Sparkles]
            ].map(([title, description, Icon]) => (
              <div key={title} className="rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <div className="mb-3 inline-flex rounded-2xl bg-white/15 p-3">
                  <Icon size={18} />
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-white/80">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      ) : null}

      {showHero ? (
      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Live Stock View", "Track availability before ordering."],
          ["Flexible Billing", "Monitor total, paid, and remaining dues."],
          ["Admin Controls", "Manage products, coupons, UPI, and payments."]
        ].map(([title, text]) => (
          <div key={title} className="rounded-[24px] border border-white/10 bg-white/70 p-6 shadow-sm dark:bg-slate-900/70">
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{title}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{text}</p>
          </div>
        ))}
      </section>
      ) : null}

      <section id="catalog" className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-brand-500">{eyebrow}</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-slate-900 dark:text-white">{title}</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {categories.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                value === category
                  ? "bg-brand-500 text-white"
                  : "bg-white/80 text-slate-600 shadow-sm dark:bg-slate-900/80 dark:text-slate-300"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {isLoading
            ? Array.from({ length: 6 }, (_, index) => <SkeletonCard key={index} />)
            : data?.products?.map((product) => (
                <ProductCard key={product._id} product={product} onAdd={addToCart} />
              ))}
        </div>
        <div className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/70 px-5 py-4 dark:bg-slate-900/70">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Page {data?.page || 1} of {data?.totalPages || 1}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={(data?.page || 1) <= 1}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-brand-500"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={(data?.page || 1) >= (data?.totalPages || 1)}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-brand-500"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
