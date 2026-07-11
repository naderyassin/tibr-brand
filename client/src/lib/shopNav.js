// Single source of truth for the SHOP surface's O2morny-style navigation.
// Consumed by: App.jsx (routes), ShopNav.jsx (tab bar + dropdowns),
// Footer.jsx, MobileDrawer.jsx, and the thin collection page wrappers.
//
// No filter sidebar for now — subcategories are handled entirely by the tab
// dropdowns below. A filter sidebar may come back in a later phase.

// ----- Fragrances dropdown submenu -----
export const FRAGRANCE_SUBS = [
  { slug: "men",            label: "Men Fragrances — رجالي" },
  { slug: "women",          label: "Women Fragrances — نسائي" },
  { slug: "unisex",         label: "Unisex Fragrances — للجنسين" },
  { slug: "gulf",           label: "Gulf Fragrances — خليجي" },
  { slug: "sets",           label: "Sets — أطقم" },
  { slug: "air-fresheners", label: "Air Fresheners — معطرات جو" },
  { slug: "candles",        label: "Candles — شموع" },
];

// ----- Sample & Travel Size dropdown submenu -----
export const SAMPLE_SUBS = [
  { slug: "special",  label: "Special Samples — عينات خاصة" },
  { slug: "travel",   label: "Travel Size & Mini Travel Perfume — أحجام السفر" },
];

// ----- product.listing_type — which taxonomy-bearing tab a product belongs
// to. Consumed by AdminProduct.jsx (the field select) and Admin.jsx (the
// products table's Listing column). -----
export const LISTING_TYPES = {
  fragrance: { label: "Fragrances — العطور" },
  sample:    { label: "Sample & Travel Size — العينات" },
  bundle:    { label: "Bundle — باقات" },
};

// ----- The 5 top-level shop tabs (in nav order) -----
// Bundle reuses the Fragrances submenu shape.
// Shop by Brand (A-Z directory) and New Arrivals (flat, date-sorted) stay flat.
export const SHOP_NAV = [
  { key: "fragrances",   label: "Fragrances — العطور",            path: "/shop/fragrances",   subKind: "fragrances", subs: FRAGRANCE_SUBS },
  { key: "samples",      label: "Sample & Travel Size — العينات",  path: "/shop/samples",      subKind: "samples",    subs: SAMPLE_SUBS },
  { key: "bundle",       label: "Bundle — باقات",                  path: "/shop/bundle" },
  { key: "brands",       label: "Shop by Brand — تسوق حسب الماركة", path: "/shop/brands" },
  { key: "new-arrivals", label: "New Arrivals — وصل حديثاً",       path: "/shop/new-arrivals" },
];

// ----- Collection metadata keyed by a stable id, used by CollectionPage -----
// `sortDefault`  → default sort key (see CollectionPage SORTS)
// `subField`     → the product field a subcategory slug filters on (Phase 2 data)
export const COLLECTIONS = {
  fragrances: {
    title: "Fragrances — العطور",
    breadcrumb: "Fragrances",
    sortDefault: "newest",
    subField: "fragrance_category",
    subs: FRAGRANCE_SUBS,
  },
  samples: {
    title: "Sample & Travel Size — العينات وأحجام السفر",
    breadcrumb: "Sample & Travel Size",
    sortDefault: "newest",
    subField: "sample_type",
    subs: SAMPLE_SUBS,
  },
  bundle: {
    title: "Bundle — باقات",
    breadcrumb: "Bundle",
    sortDefault: "newest",
    subField: "fragrance_category",
    subs: FRAGRANCE_SUBS,
  },
  "new-arrivals": {
    title: "New Arrivals — وصل حديثاً",
    breadcrumb: "New Arrivals",
    sortDefault: "newest",
  },
};

export const getSubLabel = (subs, slug) => subs?.find((s) => s.slug === slug)?.label || slug;
