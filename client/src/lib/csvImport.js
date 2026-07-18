// CSV bulk-import for products — parses a spreadsheet export into the same
// payload shape AdminProduct.jsx sends to POST /api/admin/products, so an
// imported row runs through the exact same server-side validation as a
// manually-entered product. No new backend endpoint: each row is just a
// create call, resolved and posted one at a time by the import page.
import { slugify, requiresOriginal } from "./taxonomy";

export const CSV_COLUMNS = [
  "en_name", "ar_name", "brand", "line", "original_name", "product_type",
  "audience", "classification", "concentration", "longevity", "sillage",
  "families", "seasons", "tags", "images", "en_desc", "ar_desc", "status",
  "is_bestseller", "is_spotlight", "notes_top", "notes_heart", "notes_base",
  "variants",
];

const TEMPLATE_ROW = {
  en_name: "Amber Nights",
  ar_name: "ليالي العنبر",
  brand: "TIBR House",
  line: "signature",
  original_name: "",
  product_type: "perfume",
  audience: "unisex",
  classification: "niche",
  concentration: "edp",
  longevity: "long",
  sillage: "moderate",
  families: "amber|woody",
  seasons: "fall|winter",
  tags: "bestseller",
  images: "https://example.com/amber-nights-1.jpg|https://example.com/amber-nights-2.jpg",
  en_desc: "A warm amber signature scent.",
  ar_desc: "عطر توقيع دافئ من العنبر.",
  status: "active",
  is_bestseller: "false",
  is_spotlight: "false",
  notes_top: "Bergamot|Black Pepper",
  notes_heart: "Amber|Rose",
  notes_base: "Musk|Sandalwood",
  variants: "50ml:850:20:true|100ml:1400:15",
};

// Human labels for the grid header — a plain textual column name reads worse
// in a compact table than a short phrase.
export const CSV_COLUMN_LABELS = {
  en_name: "Name (EN)", ar_name: "Name (AR)", brand: "Brand", line: "Line",
  original_name: "Original", product_type: "Type", audience: "Audience",
  classification: "Class", concentration: "Concentration", longevity: "Longevity",
  sillage: "Sillage", families: "Families", seasons: "Seasons", tags: "Tags",
  images: "Images (URLs)", en_desc: "Description (EN)", ar_desc: "Description (AR)",
  status: "Status", is_bestseller: "Bestseller", is_spotlight: "Spotlight",
  notes_top: "Top notes", notes_heart: "Heart notes", notes_base: "Base notes",
  variants: "Variants (size:price:qty)",
};

const csvField = (value) => {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const buildCsvTemplate = () =>
  [CSV_COLUMNS.join(","), CSV_COLUMNS.map((c) => csvField(TEMPLATE_ROW[c])).join(",")].join("\n");

// A blank row, e.g. for the "+ Add row" button — line/audience/status default
// to the most common values so a manually-added row needs less typing.
export const blankCsvRow = () => ({
  ...Object.fromEntries(CSV_COLUMNS.map((c) => [c, ""])),
  line: "signature", audience: "unisex", status: "active", product_type: "perfume",
});

// Delimiter-agnostic RFC-4180-ish parser: quoted fields, escaped "" quotes,
// commas/tabs and newlines inside quotes, \r\n or \n line endings. Returns an
// array of row objects keyed by the header row. Used for both uploaded .csv
// files (delimiter ",") and pasted Excel/Sheets selections (delimiter "\t").
function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const body = text.replace(/^﻿/, "");

  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };

  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (inQuotes) {
      if (c === '"') {
        if (body[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === delimiter) pushField();
    else if (c === "\n") pushRow();
    else if (c === "\r") continue;
    else field += c;
  }
  if (field !== "" || row.length) pushRow();

  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ""));
  if (!nonEmpty.length) return [];
  const headers = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((r) =>
    Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()]))
  );
}

export const parseCsv = (text) => parseDelimited(text, ",");

// Excel/Google Sheets clipboard data is tab-separated; a plain CSV upload is
// comma-separated. Pick the delimiter from whichever one actually appears in
// the header line rather than asking the admin to know the difference.
export function parseClipboard(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const delimiter = firstLine.includes("\t") ? "\t" : ",";
  return parseDelimited(text, delimiter);
}

const splitList = (s) => String(s || "").split("|").map((v) => v.trim()).filter(Boolean);
const toBool = (s) => /^(true|1|yes)$/i.test(String(s || "").trim());

// "50ml:850:20:true" / "size_label:price:quantity[:compare_at_price][:is_default]"
const parseVariantField = (s, rowErrors) => {
  const groups = splitList(s);
  const variants = groups.map((g, i) => {
    const parts = g.split(":").map((p) => p.trim());
    const [size_label, price, quantity, compare_at_price, is_default] = parts;
    return {
      size_label: size_label || "One size",
      size_ml: null,
      sku: null,
      price: Number(price),
      compare_at_price: compare_at_price ? Number(compare_at_price) : null,
      quantity: Number(quantity) || 0,
      is_default: toBool(is_default) || i === 0,
    };
  });
  if (!variants.length) rowErrors.push("No variants — expected e.g. \"50ml:850:20\".");
  else if (variants.some((v) => !(Number.isFinite(v.price) && v.price > 0))) {
    rowErrors.push("Every variant needs size_label:price:quantity with a price > 0.");
  }
  return variants;
};

/**
 * Resolve one CSV row into a product payload ready for adminCreateProduct.
 * brands/originals are the already-fetched admin lists; nextId is this row's
 * product id (caller increments across the batch). Brand names not found in
 * `brands` are flagged via needsBrandCreate so the caller can create them
 * first and re-resolve.
 */
export function buildProductPayload(row, { brands, originals, nextId }) {
  const errors = [];

  const line = row.line?.trim().toLowerCase();
  const productType = row.product_type?.trim().toLowerCase() || "perfume";
  const audience = row.audience?.trim().toLowerCase();
  const brandName = row.brand?.trim();
  const enName = row.en_name?.trim();
  const arName = row.ar_name?.trim();
  const images = splitList(row.images);

  if (!enName || !arName) errors.push("en_name and ar_name are both required.");
  if (!brandName) errors.push("brand is required.");
  if (!line) errors.push("line is required (original, inspired, or signature).");
  if (!audience) errors.push("audience is required (men, women, or unisex).");
  if (!images.length) errors.push("At least one image URL is required.");

  const brand = brands.find(
    (b) => b.name_en?.toLowerCase() === brandName?.toLowerCase() || b.slug === slugify(brandName || "")
  );
  // A brand not found by name isn't a row error — the import page creates it
  // first (see `brandName` in the return value) and re-resolves.

  let originalPerfumeId = null;
  if (requiresOriginal(line, productType)) {
    const originalName = row.original_name?.trim();
    if (!originalName) {
      errors.push("An Original or Inspired perfume needs original_name.");
    } else if (brand) {
      const match = originals.find(
        (o) => o.brand_id === brand.id && o.name_en?.toLowerCase() === originalName.toLowerCase()
      );
      if (match) originalPerfumeId = match.id;
      else errors.push(`Original perfume "${originalName}" not found under brand "${brandName}" — add it in Admin → Originals first.`);
    }
  }

  const variants = parseVariantField(row.variants, errors);

  const payload = {
    id: String(nextId),
    slug: slugify(enName || ""),
    status: row.status?.trim().toLowerCase() || "active",
    brand_id: brand?.id || null,
    line,
    original_perfume_id: line === "signature" ? null : originalPerfumeId,
    product_type: productType,
    audience,
    classification: row.classification?.trim().toLowerCase() || null,
    concentration: row.concentration?.trim().toLowerCase() || null,
    longevity: row.longevity?.trim().toLowerCase() || null,
    sillage: row.sillage?.trim().toLowerCase() || null,
    families: splitList(row.families),
    seasons: splitList(row.seasons),
    tags: splitList(row.tags),
    images,
    ar_name: arName,
    en_name: enName,
    ar_desc: row.ar_desc || "",
    en_desc: row.en_desc || "",
    is_bestseller: toBool(row.is_bestseller),
    is_spotlight: toBool(row.is_spotlight),
    variants,
    notes: {
      top: splitList(row.notes_top).map((n) => slugify(n)),
      heart: splitList(row.notes_heart).map((n) => slugify(n)),
      base: splitList(row.notes_base).map((n) => slugify(n)),
    },
  };

  return { payload, errors, brandName: brand ? null : brandName };
}
