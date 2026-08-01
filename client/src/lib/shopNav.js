// Shop navigation. Every tab and every dropdown entry is a SAVED QUERY over the
// taxonomy axes — there are no nav-specific columns, and no per-collection page
// components. A route just seeds the filter state that /api/products already
// understands. (docs/DATA-MODEL.md §5)
//
// Replaces the old listing_type / fragrance_category / sample_type vocabularies,
// which described columns that never existed in the database.
//
// Bilingual: every label carries `label`/`label_ar`, `title`/`title_ar` (group
// headings). Consumers render via t(label, label_ar) from stores/lang.js.

import { LINES, PRODUCT_TYPES, AUDIENCES, CLASSIFICATIONS, CONCENTRATIONS, FAMILIES, SEASONS } from "./taxonomy";

const sub = (vocab, slug, path) => {
  const v = vocab.find((x) => x.slug === slug);
  return { slug, path, label: v.en, label_ar: v.ar };
};

/** The 5 top-level tabs, in nav order. `filters` is what the tab preselects. */
export const SHOP_NAV = [
  {
    key: "perfumes",
    label: "Fragrances",
    label_ar: "العطور",
    path: "/shop/perfumes",
    filters: { type: "perfume" },
    groups: [
      {
        title: "Category",
        title_ar: "الفئة",
        items: [
          { slug: "men", path: "/shop/perfumes?audience=men", label: "Men Fragrances", label_ar: "عطور رجالي" },
          { slug: "inspired", path: "/shop/perfumes?line=inspired", label: "Inspired Fragrances", label_ar: "عطور مستوحاة" },
          { slug: "women", path: "/shop/perfumes?audience=women", label: "Women Fragrances", label_ar: "عطور نسائي" },
          { slug: "unisex", path: "/shop/perfumes?audience=unisex", label: "Unisex Fragrances", label_ar: "عطور للجنسين" },
          { slug: "gulf", path: "/shop/perfumes?classification=arabian", label: "Gulf Fragrances", label_ar: "عطور خليجية" },
          { ...sub(PRODUCT_TYPES, "set", "/shop/sets"), label: "Sets", label_ar: "أطقم" },
          { ...sub(PRODUCT_TYPES, "sample", "/shop/samples"), label: "Samples", label_ar: "عينات" },
        ],
      },
    ],
  },
  {
    key: "home",
    label: "Home & Ambience",
    label_ar: "المنزل والأجواء",
    path: "/shop/home-fragrance",
    filters: {},
    groups: [
      {
        title: "Product type",
        title_ar: "نوع المنتج",
        items: [
          sub(PRODUCT_TYPES, "candle", "/shop/candles"),
          sub(PRODUCT_TYPES, "air-freshener", "/shop/home-fragrance"),
          sub(PRODUCT_TYPES, "bakhoor", "/shop/bakhoor"),
        ],
      },
    ],
  },
  { key: "tibr-house", label: "TIBR House", label_ar: "تيبر هاوس", path: "/shop/tibr-house", filters: { type: "tibr-house" } },
  { key: "brands", label: "Shop by Brand", label_ar: "تسوق حسب الماركة", path: "/shop/brands" },
  { key: "new-arrivals", label: "New Arrivals", label_ar: "وصل حديثًا", path: "/shop/new-arrivals" },
];

/**
 * Pretty routes → the filters they seed. These exist for SEO and for links
 * people can remember; each one hydrates exactly the same filter state as the
 * equivalent ?query=string, and the page is the same component.
 */
export const ROUTE_PRESETS = {
  "/shop/all":            { title: "Everything",            title_ar: "الكل",                  filters: {} },
  "/shop/perfumes":       { title: "Fragrances",             title_ar: "العطور",                filters: { type: "perfume" } },
  "/shop/men":            { title: "For Men",                title_ar: "للرجال",                 filters: { audience: "men" } },
  "/shop/women":          { title: "For Women",              title_ar: "للنساء",                 filters: { audience: "women" } },
  "/shop/unisex":         { title: "Unisex",                 title_ar: "للجنسين",                filters: { audience: "unisex" } },
  "/shop/original":       { title: "Original",               title_ar: "أصلي",                   filters: { line: "original" } },
  "/shop/inspired":       { title: "Inspired",               title_ar: "مستوحى",                 filters: { line: "inspired" } },
  // "/shop/signature" is NOT a filtered listing (line=signature has zero
  // products, verified at build time) — it's the scent-finder quiz, its own
  // component (pages/shop/Signature.jsx), routed directly in App.jsx. No
  // preset needed here.
  "/shop/arabian":        { title: "Arabian & Gulf",         title_ar: "خليجي",                  filters: { classification: "arabian" } },
  "/shop/niche":          { title: "Niche",                  title_ar: "نيش",                    filters: { classification: "niche" } },
  "/shop/candles":        { title: "Candles",                title_ar: "الشموع",                 filters: { type: "candle" } },
  "/shop/bakhoor":        { title: "Bakhoor",                title_ar: "البخور",                 filters: { type: "bakhoor" } },
  "/shop/home-fragrance": { title: "Home & Ambience",        title_ar: "المنزل والأجواء",        filters: { type: "air-freshener" } },
  "/shop/sets":           { title: "Sets",                   title_ar: "أطقم",                   filters: { type: "set" } },
  "/shop/samples":        { title: "Samples",                title_ar: "عينات",                  filters: { type: "sample" } },
  "/shop/new-arrivals":   { title: "New Arrivals",           title_ar: "وصل حديثًا",             filters: {}, sort: "newest" },
  "/shop/tibr-house":     { title: "TIBR House",             title_ar: "تيبر هاوس",              filters: { type: "tibr-house" } },

  // Admin-curated merchandising — the "View All" targets of the shop-home rails.
  "/shop/spotlight":      { title: "Spotlight",              title_ar: "مختارات",                filters: { spotlight: "1" } },
  "/shop/bestsellers":    { title: "Best Sellers",           title_ar: "الأكثر مبيعًا",          filters: { bestseller: "1" } },
  "/shop/offers":         { title: "Offers",                 title_ar: "العروض",                 filters: { on_sale: "1" } },
};

/** Facet groups rendered in the filter sidebar, in order. */
export const FILTER_GROUPS = [
  { key: "audience",       label: "Audience",          label_ar: "الفئة المستهدفة", vocab: AUDIENCES },
  { key: "line",           label: "Line",              label_ar: "الخط",            vocab: LINES },
  { key: "type",           label: "Product type",      label_ar: "نوع المنتج",       vocab: PRODUCT_TYPES },
  { key: "classification", label: "Classification",    label_ar: "التصنيف",          vocab: CLASSIFICATIONS },
  { key: "concentration",  label: "Concentration",     label_ar: "التركيز",          vocab: CONCENTRATIONS },
  { key: "family",         label: "Fragrance family",  label_ar: "عائلة العطر",      vocab: FAMILIES },
  { key: "season",         label: "Season",            label_ar: "الموسم",           vocab: SEASONS },
];

export const SORT_OPTIONS = [
  { slug: "newest",     label: "Newest first",           label_ar: "الأحدث أولاً" },
  { slug: "price-asc",  label: "Price: low to high",     label_ar: "السعر: من الأقل للأعلى" },
  { slug: "price-desc", label: "Price: high to low",     label_ar: "السعر: من الأعلى للأقل" },
  { slug: "alpha",      label: "Alphabetically, A–Z",    label_ar: "أبجديًا، أ–ي" },
];
