// Single source of truth for the catalog taxonomy — slugs + bilingual labels.
//
// ⚠ Every `slug` here MUST match a value in the corresponding CHECK constraint
// on public.products (migration 20260713010000_products_taxonomy.sql). Adding a
// value here without widening the CHECK will fail the write at the database.
// Design + rationale: docs/DATA-MODEL.md
//
// Replaces the old shopNav.js vocabularies (listing_type / fragrance_category /
// sample_type), which described columns that never existed in the database.

/** Provenance. Structural, exactly one per product. */
export const LINES = [
  { slug: "original",  en: "Original",          ar: "أصلي" },
  { slug: "inspired",  en: "Inspired",          ar: "مستوحى" },
  { slug: "signature", en: "Your Own Signature", ar: "توقيعك الخاص" },
];

export const PRODUCT_TYPES = [
  { slug: "perfume",       en: "Perfume",             ar: "عطر" },
  { slug: "candle",        en: "Candle",              ar: "شمعة" },
  { slug: "air-freshener", en: "Air Freshener",       ar: "معطر جو" },
  { slug: "set",           en: "Set / Bundle",        ar: "طقم" },
  { slug: "sample",        en: "Sample / Travel Size", ar: "عينة / حجم سفر" },
  { slug: "bakhoor",       en: "Bakhoor",             ar: "بخور" },
];

/** Required on every product — a candle is usually `unisex`. */
export const AUDIENCES = [
  { slug: "men",    en: "Men",    ar: "رجالي" },
  { slug: "women",  en: "Women",  ar: "نسائي" },
  { slug: "unisex", en: "Unisex", ar: "للجنسين" },
];

/** Market segment. Mutually exclusive — Luxury/Classic are `tags`, not this. */
export const CLASSIFICATIONS = [
  { slug: "designer",  en: "Designer",       ar: "ديزاينر" },
  { slug: "niche",     en: "Niche",          ar: "نيش" },
  { slug: "arabian",   en: "Arabian / Gulf", ar: "خليجي" },
  { slug: "celebrity", en: "Celebrity",      ar: "مشاهير" },
];

export const CONCENTRATIONS = [
  { slug: "parfum", en: "Extrait / Parfum", ar: "برفان" },
  { slug: "edp",    en: "Eau de Parfum",    ar: "او دي بارفان" },
  { slug: "edt",    en: "Eau de Toilette",  ar: "او دي تواليت" },
  { slug: "edc",    en: "Eau de Cologne",   ar: "كولونيا" },
  { slug: "attar",  en: "Attar / Oil",      ar: "عطر زيتي" },
  { slug: "mist",   en: "Body Mist",        ar: "بخاخ للجسم" },
];

export const LONGEVITY = [
  { slug: "light",    en: "Light",    ar: "خفيف" },
  { slug: "moderate", en: "Moderate", ar: "متوسط" },
  { slug: "long",     en: "Long",     ar: "طويل" },
  { slug: "eternal",  en: "Eternal",  ar: "يدوم طويلاً" },
];

export const SILLAGE = [
  { slug: "intimate", en: "Intimate", ar: "قريب" },
  { slug: "moderate", en: "Moderate", ar: "متوسط" },
  { slug: "strong",   en: "Strong",   ar: "قوي" },
  { slug: "enormous", en: "Enormous", ar: "ضخم" },
];

/** Multi-select. The first four are also the NOTES_CATALOG keys. */
export const FAMILIES = [
  { slug: "citrus",   en: "Citrus",          ar: "حمضي" },
  { slug: "floral",   en: "Floral",          ar: "زهري" },
  { slug: "fruity",   en: "Fruity",          ar: "فواكه" },
  { slug: "spicy",    en: "Spicy",           ar: "توابل" },
  { slug: "woody",    en: "Woody",           ar: "خشبي" },
  { slug: "oriental", en: "Oriental / Amber", ar: "شرقي" },
  { slug: "fresh",    en: "Fresh",           ar: "منعش" },
  { slug: "gourmand", en: "Gourmand",        ar: "حلو" },
  { slug: "aquatic",  en: "Aquatic",         ar: "مائي" },
  { slug: "leather",  en: "Leather",         ar: "جلدي" },
  { slug: "musk",     en: "Musk",            ar: "مسك" },
  { slug: "oud",      en: "Oud",             ar: "عود" },
];

/** Multi-select. Empty = all-season. */
export const SEASONS = [
  { slug: "spring", en: "Spring", ar: "ربيع" },
  { slug: "summer", en: "Summer", ar: "صيف" },
  { slug: "fall",   en: "Fall",   ar: "خريف" },
  { slug: "winter", en: "Winter", ar: "شتاء" },
];

export const STATUSES = [
  { slug: "draft",    en: "Draft",    ar: "مسودة" },
  { slug: "active",   en: "Active",   ar: "منشور" },
  { slug: "archived", en: "Archived", ar: "مؤرشف" },
];

/** product_notes.layer — the olfactory pyramid. */
export const NOTE_LAYERS = [
  { slug: "top",   en: "Top notes",   ar: "النوتات الأولى" },
  { slug: "heart", en: "Heart notes", ar: "النوتات الوسطى" },
  { slug: "base",  en: "Base notes",  ar: "النوتات الأساسية" },
];

/** Look up a bilingual label. Falls back to the slug for unknown values. */
export const label = (vocab, slug, lang = "en") =>
  vocab.find((v) => v.slug === slug)?.[lang] ?? slug;

/** Both labels, for the admin (which is bilingual on one line). */
export const biLabel = (vocab, slug) => {
  const v = vocab.find((x) => x.slug === slug);
  return v ? `${v.en} — ${v.ar}` : slug;
};

/**
 * A perfume that is Original or Inspired must resolve to an original_perfumes
 * row; a candle need not. Mirrors the products_perfume_line_needs_original
 * CHECK so the form can block the save before the database does.
 */
export const requiresOriginal = (line, productType) =>
  productType === "perfume" && (line === "original" || line === "inspired");

/** Slug a product name for the URL. Mirrors the SQL used in the migration. */
export const slugify = (s) =>
  String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
