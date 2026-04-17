import { SearchX } from "lucide-react";
import useSWR from "swr";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ProductCard } from "../components/ProductCard";
import { SkeletonCard } from "../components/SkeletonCard";
import { useCart } from "../context/CartContext";

export function SearchPage() {
  const { addToCart } = useCart();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const { data, isLoading } = useSWR(query ? `/products/search?q=${encodeURIComponent(query)}` : null);

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/10 bg-white/80 p-8 shadow-sm dark:bg-slate-900/80">
        <p className="text-sm uppercase tracking-[0.35em] text-brand-500">Search</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-slate-900 dark:text-white">
          Results for "{query}"
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Browse matching materials by product name or category.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => <SkeletonCard key={index} />)}
        </div>
      ) : data?.products?.length ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {data.products.map((product) => (
            <ProductCard key={product._id} product={product} onAdd={addToCart} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={SearchX}
          title="No results found"
          description="Try searching by product name or category like Sand, Rod, or Cement."
        />
      )}
    </div>
  );
}
