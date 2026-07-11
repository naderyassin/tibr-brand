import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/api";
import ProductCard from "./ProductCard";

// Shared horizontal-scroll product row, optionally filtered by a pill bar.
// Backs Best Sellers, Bundle, Spotlight, and Perfume Categories on the shop
// home page — one scroll/pill/card implementation instead of four.
export default function ProductRail({
  title,
  viewAllHref,
  pills = null,          // [{ key, label }] — omit for a plain, unfiltered rail
  predicateForPill,      // (pillKey) => (product) => boolean
  limit = 10,
}) {
  const [activePill, setActivePill] = useState(pills?.[0]?.key ?? null);

  const { data, isLoading } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => getProducts(),
  });

  const products = useMemo(() => {
    const all = data?.data ?? [];
    const predicate = predicateForPill?.(activePill);
    const filtered = predicate ? all.filter(predicate) : all;
    return [...filtered]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, limit);
  }, [data, predicateForPill, activePill, limit]);

  if (!isLoading && products.length === 0) return null;

  return (
    <section className="product-rail">
      <div className="product-rail__head">
        <h2 className="product-rail__title">{title}</h2>
        {viewAllHref && (
          <Link className="product-rail__view-all" to={viewAllHref}>View All</Link>
        )}
      </div>

      {pills && (
        <div className="product-rail__pills" role="group" aria-label={`Filter ${title}`}>
          {pills.map((p) => (
            <button
              key={p.key}
              type="button"
              className="product-rail__pill"
              aria-pressed={activePill === p.key}
              onClick={() => setActivePill(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="product-rail__track" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="product-rail__item skeleton-card">
              <div className="skeleton skeleton-card__media" />
              <div className="skeleton-card__body">
                <div className="skeleton skeleton-line skeleton-line--sm" />
                <div className="skeleton skeleton-line skeleton-line--lg" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="product-rail__track">
          {products.map((p, i) => (
            <div key={p.id} className="product-rail__item">
              <ProductCard product={p} index={i} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
