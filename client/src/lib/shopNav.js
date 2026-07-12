// Shop navigation. Every tab and every dropdown entry is a SAVED QUERY over the
// taxonomy axes — there are no nav-specific columns, and no per-collection page
// components. A route just seeds the filter state that /api/products already
// understands. (docs/DATA-MODEL.md §5)
//
// Replaces the old listing_type / fragrance_category / sample_type vocabularies,
// which described columns that never existed in the database.

import { LINES, PRODUCT_TYPES, AUDIENCES, CLASSIFICATIONS, FAMILIES, SEASONS } from "./taxonomy";

const sub = (vocab, slug, path) => {
  const v = vocab.find((x) => x.slug === slug);
  return { slug, path, label: `${v.en} — ${v.ar}` };
};

/** The 5 top-level tabs, in nav order. `filters` is what the tab preselects. */
export const SHOP_NAV = [
  {
    key: "perfumes",
    label: "Perfumes — العطور",
    path: "/shop/perfumes",
    filters: { type: "perfume" },
    groups: [
      {
        title: "By audience — حسب الفئة",
        items: AUDIENCES.map((a) => sub(AUDIENCES, a.slug, `/shop/perfumes?audience=${a.slug}`)),
      },
      {
        title: "By line — حسب المصدر",
        items: LINES.map((l) => sub(LINES, l.slug, `/shop/perfumes?line=${l.slug}`)),
      },
      {
        title: "By classification — حسب التصنيف",
        items: CLASSIFICATIONS.map((c) => sub(CLASSIFICATIONS, c.slug, `/shop/perfumes?classification=${c.slug}`)),
      },
      {
        title: "By family — حسب العائلة",
        items: FAMILIES.slice(0, 6).map((f) => sub(FAMILIES, f.slug, `/shop/perfumes?family=${f.slug}`)),
      },
      {
        title: "By season — حسب الموسم",
        items: SEASONS.map((s) => sub(SEASONS, s.slug, `/shop/perfumes?season=${s.slug}`)),
      },
    ],
  },
  {
    key: "home",
    label: "Home & Ambience — المنزل",
    path: "/shop/home-fragrance",
    filters: {},
    groups: [
      {
        title: "Product type — نوع المنتج",
        items: ["candle", "air-freshener", "bakhoor"].map((t) =>
          sub(PRODUCT_TYPES, t, `/shop/all?type=${t}`)),
      },
    ],
  },
  {
    key: "sets",
    label: "Sets & Samples — الأطقم والعينات",
    path: "/shop/all?type=set",
    filters: {},
    groups: [
      {
        title: "Product type — نوع المنتج",
        items: ["set", "sample"].map((t) => sub(PRODUCT_TYPES, t, `/shop/all?type=${t}`)),
      },
    ],
  },
  { key: "brands", label: "Shop by Brand — تسوق حسب الماركة", path: "/shop/brands" },
  { key: "new-arrivals", label: "New Arrivals — وصل حديثاً", path: "/shop/new-arrivals" },
];

/**
 * Pretty routes → the filters they seed. These exist for SEO and for links
 * people can remember; each one hydrates exactly the same filter state as the
 * equivalent ?query=string, and the page is the same component.
 */
export const ROUTE_PRESETS = {
  "/shop/all":            { title: "Everything — كل المنتجات",        filters: {} },
  "/shop/perfumes":       { title: "Perfumes — العطور",               filters: { type: "perfume" } },
  "/shop/men":            { title: "For Men — رجالي",                 filters: { audience: "men" } },
  "/shop/women":          { title: "For Women — نسائي",               filters: { audience: "women" } },
  "/shop/unisex":         { title: "Unisex — للجنسين",                filters: { audience: "unisex" } },
  "/shop/original":       { title: "Original — أصلي",                 filters: { line: "original" } },
  "/shop/inspired":       { title: "Inspired — مستوحى",               filters: { line: "inspired" } },
  "/shop/signature":      { title: "Your Own Signature — توقيعك الخاص", filters: { line: "signature" } },
  "/shop/arabian":        { title: "Arabian & Gulf — خليجي",          filters: { classification: "arabian" } },
  "/shop/niche":          { title: "Niche — نيش",                     filters: { classification: "niche" } },
  "/shop/candles":        { title: "Candles — شموع",                  filters: { type: "candle" } },
  "/shop/home-fragrance": { title: "Home & Ambience — عطور المنزل",   filters: { type: "air-freshener" } },
  "/shop/samples":        { title: "Samples & Travel — عينات وأحجام السفر", filters: { type: "sample" } },
  "/shop/new-arrivals":   { title: "New Arrivals — وصل حديثاً",       filters: {}, sort: "newest" },
};

/** Facet groups rendered in the filter sidebar, in order. */
export const FILTER_GROUPS = [
  { key: "audience",       label: "Audience — الفئة",          vocab: AUDIENCES },
  { key: "line",           label: "Line — المصدر",             vocab: LINES },
  { key: "type",           label: "Product type — نوع المنتج", vocab: PRODUCT_TYPES },
  { key: "classification", label: "Classification — التصنيف",  vocab: CLASSIFICATIONS },
  { key: "family",         label: "Fragrance family — العائلة", vocab: FAMILIES },
  { key: "season",         label: "Season — الموسم",           vocab: SEASONS },
];

export const SORT_OPTIONS = [
  { slug: "newest",     label: "Newest first" },
  { slug: "price-asc",  label: "Price: low to high" },
  { slug: "price-desc", label: "Price: high to low" },
  { slug: "alpha",      label: "Alphabetically, A–Z" },
];
