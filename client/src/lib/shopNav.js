// Shop navigation. Every tab and every dropdown entry is a SAVED QUERY over the
// taxonomy axes — there are no nav-specific columns, and no per-collection page
// components. A route just seeds the filter state that /api/products already
// understands. (docs/DATA-MODEL.md §5)
//
// Replaces the old listing_type / fragrance_category / sample_type vocabularies,
// which described columns that never existed in the database.
//
// English-only for now — Arabic labels come back with the dedicated AR page.

import { LINES, PRODUCT_TYPES, AUDIENCES, CLASSIFICATIONS, CONCENTRATIONS, FAMILIES, SEASONS } from "./taxonomy";

const sub = (vocab, slug, path) => {
  const v = vocab.find((x) => x.slug === slug);
  return { slug, path, label: v.en };
};

/** The 5 top-level tabs, in nav order. `filters` is what the tab preselects. */
export const SHOP_NAV = [
  {
    key: "perfumes",
    label: "Fragrances",
    path: "/shop/perfumes",
    filters: { type: "perfume" },
    groups: [
      {
        title: "Category",
        items: [
          { slug: "men", path: "/shop/perfumes?audience=men", label: "Men Fragrances" },
          { slug: "women", path: "/shop/perfumes?audience=women", label: "Women Fragrances" },
          { slug: "unisex", path: "/shop/perfumes?audience=unisex", label: "Unisex Fragrances" },
          { slug: "gulf", path: "/shop/perfumes?classification=arabian", label: "Gulf Fragrances" },
        ],
      },
    ],
  },
  {
    key: "home",
    label: "Home & Ambience",
    path: "/shop/home-fragrance",
    filters: {},
    groups: [
      {
        title: "Product type",
        items: [
          sub(PRODUCT_TYPES, "candle", "/shop/candles"),
          sub(PRODUCT_TYPES, "air-freshener", "/shop/home-fragrance"),
          sub(PRODUCT_TYPES, "bakhoor", "/shop/bakhoor"),
        ],
      },
    ],
  },
  {
    key: "sets",
    label: "Sets & Samples",
    path: "/shop/sets",
    filters: {},
    groups: [
      {
        title: "Product type",
        items: [
          sub(PRODUCT_TYPES, "set", "/shop/sets"),
          sub(PRODUCT_TYPES, "sample", "/shop/samples"),
        ],
      },
    ],
  },
  { key: "brands", label: "Shop by Brand", path: "/shop/brands" },
  { key: "new-arrivals", label: "New Arrivals", path: "/shop/new-arrivals" },
];

/**
 * Pretty routes → the filters they seed. These exist for SEO and for links
 * people can remember; each one hydrates exactly the same filter state as the
 * equivalent ?query=string, and the page is the same component.
 */
export const ROUTE_PRESETS = {
  "/shop/all":            { title: "Everything",            filters: {} },
  "/shop/perfumes":       { title: "Fragrances",               filters: { type: "perfume" } },
  "/shop/men":            { title: "For Men",                filters: { audience: "men" } },
  "/shop/women":          { title: "For Women",              filters: { audience: "women" } },
  "/shop/unisex":         { title: "Unisex",                 filters: { audience: "unisex" } },
  "/shop/original":       { title: "Original",               filters: { line: "original" } },
  "/shop/inspired":       { title: "Inspired",               filters: { line: "inspired" } },
  // "/shop/signature" is NOT a filtered listing (line=signature has zero
  // products, verified at build time) — it's the scent-finder quiz, its own
  // component (pages/shop/Signature.jsx), routed directly in App.jsx. No
  // preset needed here.
  "/shop/arabian":        { title: "Arabian & Gulf",         filters: { classification: "arabian" } },
  "/shop/niche":          { title: "Niche",                  filters: { classification: "niche" } },
  "/shop/candles":        { title: "Candles",                filters: { type: "candle" } },
  "/shop/bakhoor":        { title: "Bakhoor",                filters: { type: "bakhoor" } },
  "/shop/home-fragrance": { title: "Home & Ambience",        filters: { type: "air-freshener" } },
  "/shop/sets":           { title: "Sets & Bundles",         filters: { type: "set" } },
  "/shop/samples":        { title: "Samples & Travel",       filters: { type: "sample" } },
  "/shop/new-arrivals":   { title: "New Arrivals",           filters: {}, sort: "newest" },

  // Admin-curated merchandising — the "View All" targets of the shop-home rails.
  "/shop/spotlight":      { title: "Spotlight",              filters: { spotlight: "1" } },
  "/shop/bestsellers":    { title: "Best Sellers",           filters: { bestseller: "1" } },
  "/shop/offers":         { title: "Offers",                 filters: { on_sale: "1" } },
};

/** Facet groups rendered in the filter sidebar, in order. */
export const FILTER_GROUPS = [
  { key: "audience",       label: "Audience",          vocab: AUDIENCES },
  { key: "line",           label: "Line",              vocab: LINES },
  { key: "type",           label: "Product type",      vocab: PRODUCT_TYPES },
  { key: "classification", label: "Classification",    vocab: CLASSIFICATIONS },
  { key: "concentration",  label: "Concentration",     vocab: CONCENTRATIONS },
  { key: "family",         label: "Fragrance family",  vocab: FAMILIES },
  { key: "season",         label: "Season",            vocab: SEASONS },
];

export const SORT_OPTIONS = [
  { slug: "newest",     label: "Newest first" },
  { slug: "price-asc",  label: "Price: low to high" },
  { slug: "price-desc", label: "Price: high to low" },
  { slug: "alpha",      label: "Alphabetically, A–Z" },
];
