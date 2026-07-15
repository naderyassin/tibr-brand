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
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  // "Men" toggle on a page that is by definition Men. Product type is the one
  // exception: the mockup always shows it, and it's how a shopper pivots off
  // perfumes into candles/sets/samples from any collection page.
  const pinned = new Set(Object.keys(preset.filters).filter((k) => k !== "type"));

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

  // Removable chips for the toolbar — one per active URL filter, labelled from
  // the taxonomy (or the brand list, which lives in facets rather than a vocab).
  const activeChips = useMemo(() => {
    const chips = [];
    for (const key of FILTER_KEYS) {
      const value = params.get(key);
      if (!value) continue;
      if (key === "brand") {
        const b = (facets.brand || []).find((x) => x.slug === value);
        chips.push({ key, label: b?.name_en || value });
      } else if (key === "q") {
        chips.push({ key, label: `“${value}”` });
      } else {
        const group = FILTER_GROUPS.find((g) => g.key === key);
        chips.push({ key, label: group ? label(group.vocab, value) : value });
      }
    }
    return chips;
  }, [params, facets]);

  const removeFilter = (key) => {
    const next = new URLSearchParams(params);
    next.delete(key);
    setParams(next, { replace: true });
  };

  // Lock the page behind the drawer while it's open.
  useEffect(() => {
    document.body.classList.toggle("drawer-open", filtersOpen);
    return () => document.body.classList.remove("drawer-open");
  }, [filtersOpen]);

  const displayTitle = useMemo(() => {
    const audience = params.get("audience");
    const classification = params.get("classification");
    if (audience === "men") return "Men Fragrances";
    if (audience === "women") return "Women Fragrances";
    if (audience === "unisex") return "Unisex Fragrances";
    if (classification === "arabian") return "Gulf Fragrances";
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
      </header>

      <div className="collection-toolbar">
        <button
          type="button"
          className="filter-trigger"
          onClick={() => setFiltersOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M3 6h18M6 12h12M10 18h4" />
          </svg>
          <span>Filter{activeCount > 0 ? ` (${activeCount})` : ""}</span>
        </button>

        <span className="collection-toolbar__count" role="status">
          {isLoading ? "…" : `${displayedProducts.length} product${displayedProducts.length === 1 ? "" : "s"}`}
        </span>

        {activeChips.length > 0 && (
          <div className="collection-toolbar__chips">
            {activeChips.map((c) => (
              <button key={c.key} type="button" className="chip" onClick={() => removeFilter(c.key)}>
                {c.label}
                <span className="chip__x" aria-hidden="true">×</span>
              </button>
            ))}
            <button type="button" className="chip chip--clear" onClick={clearAll}>Clear all</button>
          </div>
        )}

        <div className="collection-toolbar__sort">
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
      </div>

      <div className={`filter-drawer${filtersOpen ? " is-open" : ""}`}>
        <div className="filter-drawer__scrim" onClick={() => setFiltersOpen(false)} aria-hidden="true" />
        <aside className="filter-drawer__panel" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="filter-drawer__head">
            <h2 className="filter-drawer__title">Filters</h2>
            <button
              type="button"
              className="filter-drawer__close"
              onClick={() => setFiltersOpen(false)}
              aria-label="Close filters"
            >
              ×
            </button>
          </div>

          <div className="filter-drawer__scroll" data-lenis-prevent>
          <div className="filter-rail" aria-label="Filters">
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
          </div>
          </div>
          <div className="filter-drawer__foot">
            <button
              type="button"
              className="filter-drawer__apply"
              onClick={() => setFiltersOpen(false)}
            >
              {isLoading ? "View results" : `View ${displayedProducts.length} result${displayedProducts.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </aside>
      </div>

      <div className="collection__results collection__results--full">

          {isLoading ? (
            <div className="catalog-grid skeleton-grid" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : displayedProducts.length === 0 ? (
            <motion.div className="catalog-empty is-shown" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <svg className="catalog-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="6" />
                <path d="M21 21l-4.3-4.3" />
                <path d="M3 3l18 18" />
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
  );
}
