import { useMemo } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getProducts, getFacets } from "@/lib/api";
import ProductCard from "@/components/catalog/ProductCard";
import { ROUTE_PRESETS, FILTER_GROUPS, SORT_OPTIONS } from "@/lib/shopNav";
import { biLabel } from "@/lib/taxonomy";

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

// Every filter the API understands. Anything not in here is ignored, so a
// hand-typed junk param can't reach the query.
const FILTER_KEYS = [
  "line", "type", "audience", "classification", "concentration",
  "family", "season", "tag", "brand", "inspired_by", "note", "collection", "q",
];

/**
 * The ONLY collection page. A route preset seeds filters; the URL query string
 * overrides them; the sidebar edits the query string. There is no per-tab
 * component and no nav-specific column behind any of it.
 */
export default function CollectionPage() {
  const [params, setParams] = useSearchParams();
  const { pathname } = useLocation();

  const preset = ROUTE_PRESETS[pathname] || { title: "Shop — المتجر", filters: {} };

  // Preset first, URL second — so /shop/men?line=inspired narrows within Men.
  const filters = useMemo(() => {
    const merged = { ...preset.filters };
    for (const key of FILTER_KEYS) {
      const value = params.get(key);
      if (value) merged[key] = value;
    }
    return merged;
  }, [preset, params]);

  const sort = params.get("sort") || preset.sort || "newest";

  const { data, isLoading } = useQuery({
    queryKey: ["products", filters, sort],
    queryFn: () => getProducts({ ...filters, sort }),
  });
  const { data: facetsRes } = useQuery({ queryKey: ["facets"], queryFn: getFacets });

  const products = data?.data ?? [];
  const facets = facetsRes?.data ?? {};

  // A filter the preset already pins isn't editable here — you don't offer a
  // "Perfume" toggle on a page that is by definition perfumes.
  const pinned = new Set(Object.keys(preset.filters));

  const toggle = (key, value) => {
    const next = new URLSearchParams(params);
    if (next.get(key) === value) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const clearAll = () => {
    const next = new URLSearchParams();
    if (params.get("sort")) next.set("sort", params.get("sort"));
    setParams(next, { replace: true });
  };

  const activeCount = FILTER_KEYS.filter((k) => params.get(k)).length;

  return (
    <div className="store-container collection">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/shop">Shop</Link>
        <span className="breadcrumb__sep" aria-hidden="true">/</span>
        <span aria-current="page">{preset.title.split(" —")[0]}</span>
      </nav>

      <header className="shop-header">
        <h1 className="shop-header__title">{preset.title}</h1>
        <div className="shop-header__sort">
          <label htmlFor="sort-select" className="sort-label">Sort by:</label>
          <select
            id="sort-select"
            className="sort__select"
            value={sort}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              next.set("sort", e.target.value);
              setParams(next, { replace: true });
            }}
            aria-label="Sort"
          >
            {SORT_OPTIONS.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}
          </select>
        </div>
      </header>

      <div className="collection__body">
        <aside className="filters" aria-label="Filters">
          <div className="filters__head">
            <h2 className="filters__title">Filter</h2>
            {activeCount > 0 && (
              <button type="button" className="filters__clear" onClick={clearAll}>
                Clear ({activeCount})
              </button>
            )}
          </div>

          {FILTER_GROUPS.filter((g) => !pinned.has(g.key)).map((group) => {
            const counts = facets[group.key] || {};
            // Only offer a value that has products behind it — a filter that
            // leads to an empty grid is a dead end, not a feature.
            const options = group.vocab.filter((v) => counts[v.slug]);
            if (!options.length) return null;

            return (
              <div className="filters__group" key={group.key}>
                <p className="filters__group-title">{group.label}</p>
                <ul className="filters__list">
                  {options.map((v) => {
                    const on = params.get(group.key) === v.slug;
                    return (
                      <li key={v.slug}>
                        <button
                          type="button"
                          className={`filters__option${on ? " is-on" : ""}`}
                          onClick={() => toggle(group.key, v.slug)}
                          aria-pressed={on}
                        >
                          <span>{biLabel(group.vocab, v.slug)}</span>
                          <span className="filters__count">{counts[v.slug]}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {(facets.brand || []).length > 1 && (
            <div className="filters__group">
              <p className="filters__group-title">Brand — الماركة</p>
              <ul className="filters__list">
                {facets.brand.map((b) => {
                  const on = params.get("brand") === b.slug;
                  return (
                    <li key={b.slug}>
                      <button
                        type="button"
                        className={`filters__option${on ? " is-on" : ""}`}
                        onClick={() => toggle("brand", b.slug)}
                        aria-pressed={on}
                      >
                        <span>{b.name_en}</span>
                        <span className="filters__count">{b.count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>

        <div className="collection__results">
          <p className="collection__count" role="status">
            {isLoading ? "Loading…" : `${products.length} product${products.length === 1 ? "" : "s"}`}
          </p>

          {isLoading ? (
            <div className="catalog-grid skeleton-grid" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <motion.div className="catalog-empty is-shown" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <svg className="catalog-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" /><path d="M8.5 11h5" strokeLinecap="round" />
              </svg>
              <h2 className="catalog-empty__title">Nothing matches those filters</h2>
              <p className="catalog-empty__text">Try removing one, or clear them all.</p>
              {activeCount > 0 && (
                <button type="button" className="btn btn--outline" onClick={clearAll}>Clear filters</button>
              )}
            </motion.div>
          ) : (
            <section className="catalog-grid" id="product-grid" aria-label={`${preset.title} list`}>
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
