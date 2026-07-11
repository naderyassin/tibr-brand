import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getProducts } from "@/lib/api";
import ProductCard from "@/components/catalog/ProductCard";

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-card__media" />
      <div className="skeleton-card__body">
        <div className="skeleton skeleton-line skeleton-line--sm" />
        <div className="skeleton skeleton-line skeleton-line--lg" />
        <div className="skeleton skeleton-line skeleton-line--price" />
      </div>
    </div>
  );
}

const SORTS = {
  newest:       { label: "Newest first", cmp: (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0) },
  "price-asc":  { label: "Price: low to high", cmp: (a, b) => (a.price ?? 0) - (b.price ?? 0) },
  "price-desc": { label: "Price: high to low", cmp: (a, b) => (b.price ?? 0) - (a.price ?? 0) },
  alpha:        { label: "Alphabetically, A-Z", cmp: (a, b) => String(a.en_name || "").localeCompare(String(b.en_name || "")) },
};

// A subcategory (fragrances/samples) only narrows the list when its backing
// field is actually populated on some product — Phase 1 has no such data, so
// the page shows the full list rather than an empty grid.
function narrowBySub(products, sub, subField) {
  if (!sub || !subField) return products;
  const anyPopulated = products.some((p) => p[subField] != null && p[subField] !== "");
  if (!anyPopulated) return products;
  return products.filter((p) => String(p[subField]).toLowerCase() === String(sub).toLowerCase());
}

export default function CollectionPage({
  title,
  breadcrumb,
  sortDefault = "newest",
  showInspiredTag = false,
  sub = null,
  subField = null,
  predicate = null,
}) {
  const [sort, setSort] = useState(sortDefault);

  const { data, isLoading } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => getProducts(),
  });

  const allProducts = data?.data ?? [];

  const products = useMemo(() => {
    let list = allProducts;
    if (predicate) list = list.filter(predicate);
    list = narrowBySub(list, sub, subField);
    const cmp = SORTS[sort]?.cmp;
    if (cmp) list = [...list].sort(cmp);
    return list;
  }, [allProducts, predicate, sub, subField, sort]);

  const isEmpty = !isLoading && products.length === 0;

  return (
    <div className="store-container collection">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/shop/fragrances">Shop</Link>
        <span className="breadcrumb__sep" aria-hidden="true">/</span>
        <span aria-current="page">{breadcrumb}</span>
      </nav>

      <header className="shop-header">
        <h1 className="shop-header__title">{title}</h1>
        <div className="shop-header__sort">
          <label htmlFor="sort-select" className="sort-label">Sort by:</label>
          <select
            id="sort-select"
            className="sort__select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort"
          >
            {Object.entries(SORTS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </header>

      {isLoading ? (
        <div className="catalog-grid skeleton-grid" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : isEmpty ? (
        <motion.div className="catalog-empty is-shown" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <svg className="catalog-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" /><path d="M8.5 11h5" strokeLinecap="round" />
          </svg>
          <h2 className="catalog-empty__title">Nothing here yet</h2>
          <p className="catalog-empty__text">We're still stocking this collection — check back soon.</p>
        </motion.div>
      ) : (
        <section className="catalog-grid" id="product-grid" aria-label={`${title} list`}>
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} showInspiredTag={showInspiredTag} />
          ))}
        </section>
      )}
    </div>
  );
}
