import { BadgeIndianRupee, Box, ShoppingCart } from "lucide-react";
import clsx from "clsx";

export function ProductCard({ product, onAdd }) {
  const inStock = product.stock > 0;

  return (
    <article className="group overflow-hidden rounded-[24px] border border-white/10 bg-white/80 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-glow dark:bg-slate-900/80">
      <div className="relative h-48 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <span
          className={clsx(
            "absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-medium",
            inStock ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
          )}
        >
          {inStock ? `In stock: ${product.stock}` : "Out of stock"}
        </span>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{product.category}</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{product.name}</h3>
          </div>
          <div className="rounded-2xl bg-brand-50 p-3 text-brand-600 dark:bg-brand-500/10">
            <Box size={18} />
          </div>
        </div>
        <p className="line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{product.description}</p>
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-1 text-2xl font-semibold text-slate-900 dark:text-white">
              <BadgeIndianRupee size={18} />
              {product.price.toLocaleString("en-IN")}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{product.unit}</p>
          </div>
          <button
            type="button"
            disabled={!inStock}
            onClick={() => onAdd(product)}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-brand-500"
          >
            <ShoppingCart size={16} />
            Add
          </button>
        </div>
      </div>
    </article>
  );
}

