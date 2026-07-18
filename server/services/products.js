// Product catalog service — taxonomy vocabulary, the product "graph"
// (row + variants + notes) read/normalize/write path, and the automatic
// product-discount → live-sale-price computation.
const {
  normalizeSizes,
  trimValue,
  slugifyValue,
  parseStringArray,
  parseBool,
  parsePrice,
} = require("../lib/parse");

// The product graph: the row plus its variants and its notes pyramid.
const PRODUCT_GRAPH_SELECT =
  "*, product_variants(*), product_notes(layer, sort, notes(slug, name_en, name_ar, family))";

const normalizeProduct = (product) => {
  const variants = [...(product.product_variants || [])].sort((a, b) => (a.sort || 0) - (b.sort || 0));
  const defaultVariant = variants.find((v) => v.is_default) || variants[0] || null;

  // Notes come back flat from PostgREST; regroup into the pyramid.
  const notes = { top: [], heart: [], base: [] };
  for (const row of [...(product.product_notes || [])].sort((a, b) => (a.sort || 0) - (b.sort || 0))) {
    if (row.notes && notes[row.layer]) notes[row.layer].push(row.notes);
  }

  return {
    ...product,
    variants,
    notes,
    // `price` is the default variant's; the legacy columns are the fallback
    // until step 5 of docs/DATA-MODEL.md drops them.
    price: defaultVariant
      ? Number(defaultVariant.price)
      : parsePrice(product.ar_price || product.en_price || product.price),
    inStock: variants.length
      ? variants.some((v) => v.quantity > 0)
      : (product.quantity || 0) > 0,
    sizes: variants.length ? variants.map((v) => v.size_label) : normalizeSizes(product.sizes)
  };
};

// Catalog taxonomy — must stay in lockstep with the CHECK constraints in
// 20260713010000_products_taxonomy.sql and with client/src/lib/taxonomy.js.
// (The old listing_type / fragrance_category / sample_type / perfume_classification
// vocabularies are gone: they described columns that never existed in the DB.)
const LINES = new Set(["original", "inspired", "signature"]);
const PRODUCT_TYPES = new Set(["perfume", "candle", "air-freshener", "set", "sample", "bakhoor"]);
const AUDIENCES = new Set(["men", "women", "unisex"]);
const CLASSIFICATIONS = new Set(["designer", "niche", "arabian", "celebrity"]);
const CONCENTRATIONS = new Set(["parfum", "edp", "edt", "edc", "attar", "mist"]);
const LONGEVITIES = new Set(["light", "moderate", "long", "eternal"]);
const SILLAGES = new Set(["intimate", "moderate", "strong", "enormous"]);
const FAMILIES = new Set(["floral", "woody", "oriental", "fresh", "citrus", "gourmand",
                          "spicy", "aquatic", "leather", "musk", "oud", "fruity"]);
const SEASONS = new Set(["spring", "summer", "fall", "winter"]);
const STATUSES = new Set(["draft", "active", "archived"]);
const NOTE_LAYERS = ["top", "heart", "base"];

// A product write is a graph: the products row, its variants, and its notes.
// sanitize splits the incoming payload into those three pieces.
const sanitizeProductPayload = (payload) => {
  const images = parseStringArray(payload.images);
  const variants = parseVariantsInput(payload.variants);
  const defaultVariant = variants.find((v) => v.is_default) || variants[0] || null;

  const row = {
    id: trimValue(payload.id),
    slug: slugifyValue(payload.slug || payload.en_name),
    status: trimValue(payload.status) || "active",
    brand_id: trimValue(payload.brand_id) || null,
    line: trimValue(payload.line) || null,
    original_perfume_id: trimValue(payload.original_perfume_id) || null,
    product_type: trimValue(payload.product_type) || null,
    audience: trimValue(payload.audience) || null,
    classification: trimValue(payload.classification) || null,
    concentration: trimValue(payload.concentration) || null,
    longevity: trimValue(payload.longevity) || null,
    sillage: trimValue(payload.sillage) || null,
    families: parseStringArray(payload.families, FAMILIES),
    seasons: parseStringArray(payload.seasons, SEASONS),
    tags: parseStringArray(payload.tags),
    images,
    ar_name: trimValue(payload.ar_name) || null,
    en_name: trimValue(payload.en_name) || null,
    ar_desc: trimValue(payload.ar_desc) || null,
    en_desc: trimValue(payload.en_desc) || null,
    is_bestseller: parseBool(payload.is_bestseller),
    is_spotlight: parseBool(payload.is_spotlight),
    review_avg: Math.min(5, Math.max(0, parseFloat(payload.review_avg) || 0)),
    review_count: parseInt(payload.review_count, 10) || 0,

    // ── Legacy bridge. These columns are still NOT NULL / still read by the
    // live storefront, so they are kept in sync FROM the variants until step 5
    // of docs/DATA-MODEL.md drops them. Do not hand-edit them anywhere else.
    category: "perfumes",
    image: images[0] || null,
    ar_price: defaultVariant ? defaultVariant.price : 0,
    en_price: defaultVariant ? defaultVariant.price : 0,
    sizes: variants.map((v) => v.size_label),
    quantity: variants.reduce((sum, v) => sum + v.quantity, 0)
  };

  // { top: [...slugs], heart: [...], base: [...] }
  const notes = {};
  for (const layer of NOTE_LAYERS) notes[layer] = parseStringArray(payload.notes?.[layer]);

  return { row, variants, notes };
};

// Signature products are bespoke and reference no original; a perfume that is
// Original or Inspired must resolve to one. Mirrors the CHECK constraint
// products_perfume_line_needs_original.
const requiresOriginal = (line, productType) =>
  productType === "perfume" && (line === "original" || line === "inspired");

const parseVariantsInput = (input) => {
  const list = Array.isArray(input) ? input : [];
  const variants = list.map((v, i) => ({
    size_label: trimValue(v.size_label) || "One size",
    size_ml: v.size_ml === "" || v.size_ml == null ? null : Number(v.size_ml),
    sku: trimValue(v.sku) || null,
    price: parsePrice(v.price),
    compare_at_price:
      v.compare_at_price === "" || v.compare_at_price == null ? null : parsePrice(v.compare_at_price),
    quantity: parseInt(v.quantity, 10) || 0,
    is_default: parseBool(v.is_default),
    sort: i + 1
  }));

  // Exactly one default — the DB has a partial unique index that enforces this,
  // so fix it here rather than bouncing the admin with a constraint error.
  const defaults = variants.filter((v) => v.is_default);
  if (defaults.length !== 1 && variants.length) {
    variants.forEach((v, i) => { v.is_default = i === 0; });
  }
  return variants;
};

const validateProductPayload = ({ row, variants }, requireId = true) => {
  if (requireId && !row.id) return "id is required.";
  if (!row.en_name || !row.ar_name) return "Product name (AR + EN) is required.";
  if (!row.slug) return "Could not derive a URL slug from the product name.";
  if (!row.images.length) return "At least one product image is required.";
  if (!row.brand_id) return "Brand is required.";
  if (!STATUSES.has(row.status)) return "Status must be draft, active, or archived.";
  if (!LINES.has(row.line)) return "Line must be Original, Inspired, or Signature.";
  if (!PRODUCT_TYPES.has(row.product_type)) return "Product type is invalid.";
  if (!AUDIENCES.has(row.audience)) return "Audience must be Men, Women, or Unisex.";
  if (row.classification && !CLASSIFICATIONS.has(row.classification)) return "Classification is invalid.";
  if (row.concentration && !CONCENTRATIONS.has(row.concentration)) return "Concentration is invalid.";
  if (row.longevity && !LONGEVITIES.has(row.longevity)) return "Longevity is invalid.";
  if (row.sillage && !SILLAGES.has(row.sillage)) return "Sillage is invalid.";

  if (row.line === "signature" && row.original_perfume_id) {
    return "A Signature product is bespoke — it cannot reference an original perfume.";
  }
  if (requiresOriginal(row.line, row.product_type) && !row.original_perfume_id) {
    return "An Original or Inspired perfume must be linked to an original perfume.";
  }

  if (!variants.length) return "At least one variant (size + price) is required.";
  if (variants.some((v) => !(Number.isFinite(v.price) && v.price > 0))) {
    return "Every variant needs a price greater than zero.";
  }
  if (new Set(variants.map((v) => v.size_label)).size !== variants.length) {
    return "Variant sizes must be unique.";
  }
  if (variants.some((v) => v.compare_at_price != null && v.compare_at_price < v.price)) {
    return "A variant's compare-at price cannot be lower than its price.";
  }
  return null;
};

// Writes the row, then replaces its variants and notes.
//
// NOT atomic — supabase-js has no transaction support, so a failure after the
// row lands leaves the product saved but its variants stale. The admin fixes
// that by hitting Save again (every step is idempotent). Making it atomic means
// moving this into a Postgres function; deliberately deferred, since this is a
// single-admin panel and a retry is a full repair.
const saveProductGraph = async (client, { row, variants, notes }, { id } = {}) => {
  const productId = id || row.id;
  const payload = { ...row };
  if (id) delete payload.id;

  const { data, error } = await writeProductRow(client, payload, id ? { id } : {});
  if (error) return { error };

  const { error: variantDeleteError } = await client
    .from("product_variants").delete().eq("product_id", productId);
  if (variantDeleteError) return { error: variantDeleteError };

  const { error: variantInsertError } = await client
    .from("product_variants")
    .insert(variants.map((v) => ({ ...v, product_id: productId })));
  if (variantInsertError) return { error: variantInsertError };

  const { error: noteDeleteError } = await client
    .from("product_notes").delete().eq("product_id", productId);
  if (noteDeleteError) return { error: noteDeleteError };

  // The admin sends note SLUGS (it holds the catalog locally); resolve to ids.
  const wanted = NOTE_LAYERS.flatMap((layer) => notes[layer] || []);
  if (wanted.length) {
    const { data: noteRows, error: noteLookupError } = await client
      .from("notes").select("id, slug").in("slug", wanted);
    if (noteLookupError) return { error: noteLookupError };

    const idBySlug = new Map((noteRows || []).map((n) => [n.slug, n.id]));
    const rows = NOTE_LAYERS.flatMap((layer) =>
      (notes[layer] || [])
        .map((slug, i) => ({ product_id: productId, note_id: idBySlug.get(slug), layer, sort: i + 1 }))
        .filter((r) => r.note_id)
    );
    if (rows.length) {
      const { error: noteInsertError } = await client.from("product_notes").insert(rows);
      if (noteInsertError) return { error: noteInsertError };
    }
  }

  return { data };
};

// Optional columns that may not exist yet on deployments where the matching
// migration hasn't been applied. writeProductRow drops any of these that
// Postgres reports as unknown and retries, so product saves never hard-fail
// just because a newer column hasn't been migrated on.
const OPTIONAL_PRODUCT_COLUMNS = ["product_category"];

const isMissingColumnError = (error, column) =>
  !!error &&
  (error.code === "PGRST204" || /column/i.test(error.message || "")) &&
  (error.message || "").includes(column);

const writeProductRow = async (client, row, { id } = {}) => {
  const payload = { ...row };
  for (;;) {
    const query = id
      ? client.from("products").update(payload).eq("id", id)
      : client.from("products").insert(payload);
    const { data, error } = await query.select().single();
    if (!error) return { data };
    const missing = OPTIONAL_PRODUCT_COLUMNS.find(
      (col) => col in payload && isMissingColumnError(error, col)
    );
    if (missing) { delete payload[missing]; continue; }
    return { error };
  }
};

// Automatic product-class discounts read as a live "sale price" on the
// storefront: computed into the same compare_at_price/price pair ProductCard
// and the PDP already render for a manual markdown, instead of a new display
// path. Public (no auth) — mirrors /api/discounts/shipping, which reads the
// discounts table (admin-only via RLS) through the service client for the
// same reason: shoppers need to see the effect of a live discount without
// being able to read the discounts table directly.
const getActiveAutomaticProductDiscounts = async (serviceClient) => {
  const { data, error } = await serviceClient
    .from("discounts")
    .select("id, type, value, applies_to, product_ids, starts_at, ends_at")
    .eq("method", "automatic")
    .eq("discount_class", "product")
    .eq("active", true)
    .eq("eligibility", "all");

  if (error) return [];

  const now = new Date();
  return (data || []).filter((d) => {
    if (d.starts_at && new Date(d.starts_at) > now) return false;
    if (d.ends_at && new Date(d.ends_at) < now) return false;
    return true;
  });
};

// Mutates each product's raw product_variants in place, before normalizeProduct
// runs, so the derived top-level `price` picks up the discounted amount for
// free. A variant that already carries its own compare_at_price (a manual
// sale set on the product form) is left alone — the manual price wins rather
// than stacking with an automatic discount.
const applyAutomaticProductDiscounts = (products, discounts) => {
  if (!discounts.length) return products;

  for (const product of products) {
    for (const variant of product.product_variants || []) {
      if (variant.compare_at_price != null || variant.price == null) continue;

      const price = Number(variant.price);
      let best = null;
      for (const d of discounts) {
        if (d.applies_to !== "all" && !(d.product_ids || []).includes(String(product.id))) continue;
        const discounted = d.type === "percentage"
          ? Math.round(price * (1 - d.value / 100))
          : Math.max(0, price - d.value);
        if (discounted < price && (best == null || discounted < best)) best = discounted;
      }

      if (best != null) {
        variant.compare_at_price = price;
        variant.price = best;
      }
    }
  }

  return products;
};

module.exports = {
  // graph read/normalize
  PRODUCT_GRAPH_SELECT,
  normalizeProduct,
  // taxonomy vocabulary
  LINES,
  PRODUCT_TYPES,
  AUDIENCES,
  CLASSIFICATIONS,
  CONCENTRATIONS,
  LONGEVITIES,
  SILLAGES,
  FAMILIES,
  SEASONS,
  STATUSES,
  NOTE_LAYERS,
  // write path
  sanitizeProductPayload,
  validateProductPayload,
  saveProductGraph,
  // automatic discount → live sale price
  getActiveAutomaticProductDiscounts,
  applyAutomaticProductDiscounts,
};
