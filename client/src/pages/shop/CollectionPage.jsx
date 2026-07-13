import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getProducts, getFacets } from "@/lib/api";
import ProductCard from "@/components/catalog/ProductCard";
import { ROUTE_PRESETS, FILTER_GROUPS, SORT_OPTIONS } from "@/lib/shopNav";
import { label } from "@/lib/taxonomy";

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
  const [expandedGroups, setExpandedGroups] = useState({
    audience: true,
    brand: true,
  });

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const preset = ROUTE_PRESETS[pathname] || { title: "Shop", filters: {} };

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

  const [availabilityOnly, setAvailabilityOnly] = useState(false);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(2000);

  // Dynamic price bounds based on active category products
  const priceBounds = useMemo(() => {
    if (!products.length) return { min: 0, max: 2000 };
    const prices = products.map((p) => p.price || 0);
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }, [products]);

  // Adjust price sliders when category products load
  useEffect(() => {
    setMinPrice(priceBounds.min);
    setMaxPrice(priceBounds.max);
  }, [priceBounds]);

  const displayedProducts = useMemo(() => {
    let result = products;
    if (availabilityOnly) {
      result = result.filter((p) => p.inStock);
    }
    result = result.filter((p) => p.price >= minPrice && p.price <= maxPrice);
    return result;
  }, [products, availabilityOnly, minPrice, maxPrice]);

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

  const displayTitle = useMemo(() => {
    const audience = params.get("audience");
    const classification = params.get("classification");
    if (audience === "men") return "Men Fragrances — عطور رجالية";
    if (audience === "women") return "Women Fragrances — عطور نسائية";
    if (audience === "unisex") return "Unisex Fragrances — عطور للجنسين";
    if (classification === "arabian") return "Gulf Fragrances — عطور خليجية";
    return preset.title;
  }, [preset, params]);

  return (
    <div className="store-container collection">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span className="breadcrumb__sep" aria-hidden="true">/</span>
        <span aria-current="page">{preset.title.split(" —")[0]}</span>
      </nav>

      <header className="shop-header">
        <h1 className="shop-header__title">{displayTitle}</h1>
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
        <aside className="filter-rail" aria-label="Filters">
          <div className="avail">
            <span className="avail__label">Availability</span>
            <button
              type="button"
              className={`toggle${availabilityOnly ? " is-on" : ""}`}
              onClick={() => setAvailabilityOnly(!availabilityOnly)}
              role="switch"
              aria-checked={availabilityOnly}
              aria-label="Availability"
            >
              <span className="toggle__handle" />
            </button>
          </div>

          <div className="filter-head">
            <h2 className="filter-head__title">Filter:</h2>
            {activeCount > 0 && (
              <button type="button" className="filter-head__clear" onClick={clearAll}>
                Clear ({activeCount})
              </button>
            )}
          </div>
          <p className="count">
            {isLoading ? "…" : `${displayedProducts.length} product${displayedProducts.length === 1 ? "" : "s"}`}
          </p>

          <h3 className="price-title">Filter by price</h3>
          <div className="slider">
            <div className="slider__rail" />
            <div
              className="slider__fill"
              style={{
                left: `${((minPrice - priceBounds.min) / (priceBounds.max - priceBounds.min || 1)) * 100}%`,
                right: `${100 - ((maxPrice - priceBounds.min) / (priceBounds.max - priceBounds.min || 1)) * 100}%`,
              }}
            />
            <input
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              value={minPrice}
              onChange={(e) => setMinPrice(Math.min(Number(e.target.value), maxPrice))}
              aria-label="Minimum price"
            />
            <input
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Math.max(Number(e.target.value), minPrice))}
              aria-label="Maximum price"
            />
          </div>
          <div className="price-inputs">
            <div className="price-box">
              <span className="price-box__cur">ج.م</span>
              <input
                type="number"
                value={minPrice}
                min={priceBounds.min}
                max={maxPrice}
                onChange={(e) => setMinPrice(Math.min(Number(e.target.value), maxPrice))}
                aria-label="Min price value"
              />
            </div>
            <span className="price-to">to</span>
            <div className="price-box">
              <span className="price-box__cur">ج.م</span>
              <input
                type="number"
                value={maxPrice}
                min={minPrice}
                max={priceBounds.max}
                onChange={(e) => setMaxPrice(Math.max(Number(e.target.value), minPrice))}
                aria-label="Max price value"
              />
            </div>
          </div>

          <div className="facets">
            {FILTER_GROUPS.filter((g) => !pinned.has(g.key) && g.vocab.length).map((group) => {
              const counts = facets[group.key] || {};
              const isOpen = !!expandedGroups[group.key];
              return (
                <div className={`facet${isOpen ? " is-open" : ""}`} key={group.key}>
                  <button
                    type="button"
                    className="facet__trigger"
                    onClick={() => toggleGroup(group.key)}
                    aria-expanded={isOpen}
                  >
                    <span>{group.label}</span>
                    <span className="facet__chev" aria-hidden="true" />
                  </button>
                  <div className="facet__panel">
                    <div>
                      <ul className="facet__list">
                        {group.vocab.map((v) => {
                          const on = params.get(group.key) === v.slug;
                          return (
                            <li key={v.slug}>
                              <button
                                type="button"
                                className="opt"
                                onClick={() => toggle(group.key, v.slug)}
                                aria-pressed={on}
                              >
                                <span className="opt__left">
                                  <span className={`opt__box${on ? " is-checked" : ""}`} />
                                  <span>{label(group.vocab, v.slug)}</span>
                                </span>
                                <span className="opt__count">{counts[v.slug] || 0}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}

            {(facets.brand || []).length > 0 && (
              <div className={`facet${expandedGroups.brand ? " is-open" : ""}`}>
                <button
                  type="button"
                  className="facet__trigger"
                  onClick={() => toggleGroup("brand")}
                  aria-expanded={!!expandedGroups.brand}
                >
                  <span>Brand</span>
                  <span className="facet__chev" aria-hidden="true" />
                </button>
                <div className="facet__panel">
                  <div>
                    <ul className="facet__list">
                      {facets.brand.map((b) => {
                        const on = params.get("brand") === b.slug;
                        return (
                          <li key={b.slug}>
                            <button
                              type="button"
                              className="opt"
                              onClick={() => toggle("brand", b.slug)}
                              aria-pressed={on}
                            >
                              <span className="opt__left">
                                <span className={`opt__box${on ? " is-checked" : ""}`} />
                                <span>{b.name_en}</span>
                              </span>
                              <span className="opt__count">{b.count || 0}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        <div className="collection__results">
          <p className="collection__count" role="status">
            {isLoading ? "Loading…" : `${displayedProducts.length} product${displayedProducts.length === 1 ? "" : "s"}`}
          </p>

          {isLoading ? (
            <div className="catalog-grid skeleton-grid" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : displayedProducts.length === 0 ? (
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
              {displayedProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
