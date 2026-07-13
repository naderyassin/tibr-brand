const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");
const express = require("express");
const compression = require("compression");
const dotenv = require("dotenv");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

const app = express();
const host = process.env.HOST || "127.0.0.1";
const port = process.env.PORT || 3000;
const rootDir = __dirname;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Set SUPABASE_URL/SUPABASE_ANON_KEY or VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY."
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

app.use(compression());

const CACHE_DURATION = 365 * 24 * 60 * 60; // 1 year
const CACHE_IMMUTABLE = `public, max-age=${CACHE_DURATION}, immutable`;

// Serve uploaded product images and brand media from /assets
app.use("/assets", express.static(path.join(rootDir, "assets"), {
  setHeaders: (res, filePath) => {
    if (/\.(png|jpg|jpeg|gif|ico|svg|webp|avif|mp4|webm)$/i.test(path.extname(filePath))) {
      res.setHeader("Cache-Control", "public, max-age=86400");
    }
  }
}));

app.use(express.json());

const normalizeSizes = (sizes) => {
  if (Array.isArray(sizes)) {
    return sizes;
  }

  if (typeof sizes === "string" && sizes.trim()) {
    try {
      const parsed = JSON.parse(sizes);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_) {
      return sizes.split(/[,،]/).map((size) => size.trim()).filter(Boolean);
    }
  }

  return [];
};

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

const slugifyValue = (value) =>
  String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const parseStringArray = (value, allowed) => {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,،]/)
      : [];
  const out = [...new Set(raw.map((v) => trimValue(v)).filter(Boolean))];
  return allowed ? out.filter((v) => allowed.has(v)) : out;
};

const parseBool = (value) => value === true || value === "true" || value === "on" || value === "1";

const trimValue = (value) => (typeof value === "string" ? value.trim() : value);

const parseSizesInput = (sizes) => {
  if (Array.isArray(sizes)) {
    return sizes.map((size) => trimValue(size)).filter(Boolean);
  }

  if (typeof sizes === "string") {
    const text = sizes.trim();
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((size) => trimValue(size)).filter(Boolean);
      }
    } catch (_) {
      // fall back to comma-separated parsing
    }

    return text
      .split(/[,،]/)
      .map((size) => size.trim())
      .filter(Boolean);
  }

  return [];
};

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

const parsePrice = (price) => {
  if (typeof price === "number") return price;
  return Number(
    String(price || "")
      .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
      .replace(/[^0-9.]/g, "")
  ) || 0;
};

const PAYMENT_METHODS = new Set([
  "cash_on_delivery",
  "vodafone_cash",
  "instapay"
]);

// Builds real, DB-priced cart lines from a raw items array. Used everywhere
// a discount needs to be evaluated against a cart — /api/discounts/validate,
// /api/discounts/automatic, and /api/checkout — so all three price
// identically and none of them trust a client-supplied amount.
const buildCartLines = async (items) => {
  const productIds = [...new Set((items || []).map((i) => i.productId).filter(Boolean))];
  if (productIds.length === 0) return { error: "Your cart is empty." };

  const { data: products, error } = await supabase
    .from("products")
    .select("id, ar_price, en_price")
    .in("id", productIds);

  if (error) return { error: "Failed to load cart products." };

  const productsMap = new Map((products || []).map((p) => [p.id, p]));
  const lines = [];
  for (const item of items) {
    const product = productsMap.get(item.productId);
    if (!product) return { error: `Product not found: ${item.productId}` };
    const qty = Number(item.qty) > 0 ? Number(item.qty) : 1;
    const unitPrice = parsePrice(product.ar_price || product.en_price);
    lines.push({ productId: item.productId, qty, unitPrice, lineTotal: unitPrice * qty });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  return { cart: { lines, subtotal } };
};

// Spreads `amount` proportionally across `lines` (weighted by each line's
// share of `poolSubtotal`), aggregating into a productId -> amount map —
// the remainder goes to the last line so the parts always sum exactly to
// `amount`. Shared by the order and product discount classes.
const spreadAcrossLines = (lines, amount, poolSubtotal) => {
  const map = {};
  if (amount <= 0 || poolSubtotal <= 0 || lines.length === 0) return map;
  let remaining = amount;
  lines.forEach((line, i) => {
    const isLast = i === lines.length - 1;
    const share = isLast ? remaining : Math.round((line.lineTotal / poolSubtotal) * amount);
    map[line.productId] = (map[line.productId] || 0) + share;
    remaining -= share;
  });
  return map;
};

const evaluateOrderClass = (discount, cart) => {
  const amount = discount.type === "percentage"
    ? Math.round((cart.subtotal * discount.value) / 100)
    : Math.min(discount.value, cart.subtotal);
  return { line_adjustments: spreadAcrossLines(cart.lines, amount, cart.subtotal), total_amount: amount };
};

const evaluateProductClass = (discount, cart) => {
  const targetLines = discount.applies_to === "all"
    ? cart.lines
    : cart.lines.filter((l) => discount.product_ids.includes(l.productId));

  if (targetLines.length === 0) {
    return { error: "This discount doesn't apply to any items in your cart." };
  }

  const eligibleSubtotal = targetLines.reduce((sum, l) => sum + l.lineTotal, 0);
  const amount = discount.type === "percentage"
    ? Math.round((eligibleSubtotal * discount.value) / 100)
    : Math.min(discount.value, eligibleSubtotal);

  return { line_adjustments: spreadAcrossLines(targetLines, amount, eligibleSubtotal), total_amount: amount };
};

// "Buy X, get Y" — the one class that doesn't fit the shared type/value
// shape. Reserves buy-pool units per product BEFORE computing discountable
// "get" units, so a same-product offer (e.g. buy 2 get 1 free of the exact
// same item) correctly excludes the reserved units from being discounted.
// Discounts the cheapest eligible "get" units first.
const evaluateBuyXGetY = (discount, cart) => {
  const buyPool = discount.buy_applies_to === "all"
    ? cart.lines
    : cart.lines.filter((l) => discount.buy_product_ids.includes(l.productId));

  let numSets = 0;
  if (discount.buy_type === "quantity") {
    const buyQtyAvailable = buyPool.reduce((sum, l) => sum + l.qty, 0);
    numSets = Math.floor(buyQtyAvailable / discount.buy_quantity);
  } else if (discount.buy_type === "amount") {
    // Amount-based triggers are a pure $ threshold check — they don't repeat
    // within one order.
    const buyAmountAvailable = buyPool.reduce((sum, l) => sum + l.lineTotal, 0);
    numSets = buyAmountAvailable >= discount.buy_amount ? 1 : 0;
  }

  if (discount.buy_x_get_y_max_uses_per_order != null) {
    numSets = Math.min(numSets, discount.buy_x_get_y_max_uses_per_order);
  }
  if (numSets <= 0) {
    return { error: "Your cart doesn't meet this offer's requirements yet." };
  }

  // Reserve buy-pool units per product (quantity-trigger only — an
  // amount-trigger doesn't consume units, it's a pure $ threshold).
  const reserved = {};
  if (discount.buy_type === "quantity") {
    let remaining = discount.buy_quantity * numSets;
    for (const line of buyPool) {
      if (remaining <= 0) break;
      const take = Math.min(line.qty, remaining);
      reserved[line.productId] = (reserved[line.productId] || 0) + take;
      remaining -= take;
    }
  }

  // Expand "get" lines into individual priced units, respecting
  // reservations (consumed progressively across lines of the same
  // product), cheapest unit first.
  const units = [];
  for (const line of cart.lines.filter((l) => discount.get_product_ids.includes(l.productId))) {
    const reservedForProduct = reserved[line.productId] || 0;
    const availableQty = Math.max(0, line.qty - reservedForProduct);
    for (let i = 0; i < availableQty; i++) units.push({ productId: line.productId, unitPrice: line.unitPrice });
    reserved[line.productId] = Math.max(0, reservedForProduct - line.qty);
  }
  units.sort((a, b) => a.unitPrice - b.unitPrice);

  const getUnitsEligible = Math.min(discount.get_quantity * numSets, units.length);
  if (getUnitsEligible === 0) {
    return { error: "No eligible items to discount." };
  }

  const line_adjustments = {};
  let total = 0;
  for (const unit of units.slice(0, getUnitsEligible)) {
    const perUnitAmount =
      discount.get_discount_type === "free" ? unit.unitPrice
      : discount.get_discount_type === "percentage" ? Math.round((unit.unitPrice * discount.get_discount_value) / 100)
      : Math.min(discount.get_discount_value, unit.unitPrice);
    line_adjustments[unit.productId] = (line_adjustments[unit.productId] || 0) + perUnitAmount;
    total += perUnitAmount;
  }

  return { line_adjustments, total_amount: total };
};

// Shared eligibility + amount logic for a discount, used by
// /api/discounts/validate, /api/discounts/automatic, and checkout itself so
// none of them can ever disagree about whether a discount still applies.
const evaluateCartDiscount = async (discount, cart, { userId, customerPhone, serviceClient } = {}) => {
  if (!discount.active) return { error: "This discount code is no longer active." };

  const now = new Date();
  if (discount.starts_at && new Date(discount.starts_at) > now) {
    return { error: "This discount code isn't active yet." };
  }
  if (discount.ends_at && new Date(discount.ends_at) < now) {
    return { error: "This discount code has expired." };
  }
  if (discount.usage_limit != null && discount.used_count >= discount.usage_limit) {
    return { error: "This discount code has reached its usage limit." };
  }

  if (discount.one_per_customer && (userId || customerPhone) && serviceClient) {
    let query = serviceClient.from("orders").select("id").eq("discount_id", discount.id).limit(1);
    query = userId ? query.eq("user_id", userId) : query.eq("customer_phone", customerPhone);
    const { data: priorUsage } = await query;
    if (priorUsage && priorUsage.length > 0) {
      return { error: "You've already used this discount." };
    }
  }

  if (discount.min_purchase != null && cart.subtotal < discount.min_purchase) {
    return { error: `This code requires a minimum order of ${discount.min_purchase} EGP.` };
  }

  if (discount.eligibility === "specific_customers") {
    const allowed = Array.isArray(discount.customer_ids) ? discount.customer_ids : [];
    if (!userId || !allowed.includes(userId)) {
      return { error: "This discount isn't available for your account." };
    }
  }

  let outcome;
  if (discount.discount_class === "order") {
    outcome = evaluateOrderClass(discount, cart);
  } else if (discount.discount_class === "product") {
    outcome = evaluateProductClass(discount, cart);
  } else if (discount.discount_class === "shipping") {
    outcome = { line_adjustments: {}, total_amount: 0, free_shipping: true };
  } else if (discount.discount_class === "buy_x_get_y") {
    outcome = evaluateBuyXGetY(discount, cart);
  } else {
    return { error: "Unknown discount type." };
  }
  if (outcome.error) return outcome;

  return {
    result: {
      id: discount.id,
      code: discount.code,
      title: discount.title,
      method: discount.method,
      discount_class: discount.discount_class,
      free_shipping: !!outcome.free_shipping,
      total_amount: outcome.total_amount,
      line_adjustments: outcome.line_adjustments
    }
  };
};

// Spreads a discount's productId -> amount map across the actual order rows
// being inserted (a product can appear in multiple rows via different
// sizes) — generalizes the single-amount proportional spread used before
// per-class computation existed. For an 'order'-class discount the map
// covers every product in the cart, so this collapses to a plain
// order-total-weighted spread across all rows.
const applyLineAdjustments = (orderRows, lineAdjustments) => {
  const rowsByProduct = {};
  orderRows.forEach((row) => {
    (rowsByProduct[row.product_id] ||= []).push(row);
  });

  for (const [productId, amount] of Object.entries(lineAdjustments || {})) {
    const rows = rowsByProduct[productId];
    if (!rows || rows.length === 0 || amount <= 0) continue;
    const matchingSubtotal = rows.reduce((sum, r) => sum + r.order_total, 0);
    if (matchingSubtotal <= 0) continue;

    let remaining = amount;
    rows.forEach((row, i) => {
      const isLast = i === rows.length - 1;
      const share = isLast ? remaining : Math.round((row.order_total / matchingSubtotal) * amount);
      row.discount_amount = share;
      row.order_total = Math.max(0, row.order_total - share);
      remaining -= share;
    });
  }
};

// Evaluates every candidate discount against the cart and returns the
// single best-value eligible result (or null) — used both by the
// /api/discounts/automatic preview and checkout's no-code branch, so a
// shopper never sees a preview that checkout wouldn't actually honor.
// Ties broken by earliest created_at for a deterministic pick.
const pickBestDiscount = async (candidates, cart, ctx) => {
  let bestResult = null;
  let bestCreatedAt = null;

  for (const discount of candidates) {
    const outcome = await evaluateCartDiscount(discount, cart, ctx);
    if (outcome.error) continue;

    const amount = outcome.result.total_amount;
    const better =
      !bestResult ||
      amount > bestResult.total_amount ||
      (amount === bestResult.total_amount && discount.created_at < bestCreatedAt);

    if (better) {
      bestResult = outcome.result;
      bestCreatedAt = discount.created_at;
    }
  }

  return bestResult;
};

// An order is a row + its lines. Each line points at the VARIANT bought, and
// carries snapshots — an order is a historical record, so renaming or repricing
// a product must never rewrite what the customer bought.
const ORDER_SELECT =
  "*, order_items(*, product_variants(id, size_label, sku), products(id, slug, en_name, ar_name, image))";

/**
 * Turn cart lines into priced order_items rows.
 *
 * PRICE COMES FROM THE VARIANT, never from the client and never from
 * products.ar_price. The old checkout charged every size the product's single
 * price, so picking 100ml paid the 50ml price. Accepts `variantId`, and falls
 * back to resolving productId (+ optional size) to a variant so an older client
 * or a stale cart still checks out correctly.
 */
const buildOrderLines = async (items) => {
  const variantIds = items.map((i) => i.variantId).filter(Boolean);
  const productIds = items.filter((i) => !i.variantId).map((i) => i.productId).filter(Boolean);

  const [{ data: byId }, { data: byProduct }] = await Promise.all([
    variantIds.length
      ? supabase.from("product_variants")
          .select("*, products(id, en_name, ar_name, image)").in("id", variantIds)
      : Promise.resolve({ data: [] }),
    productIds.length
      ? supabase.from("product_variants")
          .select("*, products(id, en_name, ar_name, image)").in("product_id", productIds)
      : Promise.resolve({ data: [] })
  ]);

  const variantById = new Map((byId || []).map((v) => [v.id, v]));
  const variantsByProduct = new Map();
  for (const v of byProduct || []) {
    if (!variantsByProduct.has(v.product_id)) variantsByProduct.set(v.product_id, []);
    variantsByProduct.get(v.product_id).push(v);
  }

  const lines = [];
  for (const item of items) {
    let variant = item.variantId ? variantById.get(item.variantId) : null;

    if (!variant && item.productId) {
      const candidates = variantsByProduct.get(item.productId) || [];
      variant =
        (item.size && candidates.find((v) => v.size_label === item.size)) ||
        candidates.find((v) => v.is_default) ||
        candidates[0];
    }

    if (!variant) {
      return { error: `No purchasable size found for ${item.variantId || item.productId}.` };
    }

    const qty = Number(item.qty) > 0 ? Math.floor(Number(item.qty)) : 1;
    if (variant.quantity < qty) {
      const name = variant.products?.en_name || "This item";
      return {
        error: variant.quantity === 0
          ? `${name} (${variant.size_label}) is out of stock.`
          : `Only ${variant.quantity} left of ${name} (${variant.size_label}).`
      };
    }

    lines.push({
      variant_id: variant.id,
      product_id: variant.product_id,
      qty,
      unit_price: Number(variant.price),
      name_snapshot: variant.products?.en_name || variant.products?.ar_name || "Product",
      size_snapshot: variant.size_label,
      image_snapshot: variant.products?.image || null
    });
  }

  return { lines };
};

/**
 * Write the order and its lines.
 *
 * Not atomic (supabase-js has no transactions), so if the lines fail we delete
 * the order we just made — an order with no lines is worse than no order, and
 * it would break every "every order has ≥1 line" assumption downstream.
 */
const saveOrder = async (client, { order, lines }) => {
  const { data: created, error: orderError } = await client
    .from("orders").insert(order).select().single();
  if (orderError) return { error: orderError };

  const { error: linesError } = await client
    .from("order_items")
    .insert(lines.map((l) => ({ ...l, order_id: created.id })));

  if (linesError) {
    await client.from("orders").delete().eq("id", created.id);
    return { error: linesError };
  }

  const { data: full } = await client.from("orders").select(ORDER_SELECT).eq("id", created.id).single();
  return { data: full || created };
};

const getAccessToken = (req) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
};

const createAuthedClient = (token) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

// Bypasses RLS — used server-side only, for looking up a discount code at
// checkout without granting shoppers direct table read access (which would
// let the client SDK enumerate every active code).
const createServiceClient = () =>
  createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

const requireUser = async (req, res, next) => {
  const token = getAccessToken(req);

  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Auth timeout")), 8000)
    );
    const authCall = supabase.auth.getUser(token);
    const { data: { user }, error } = await Promise.race([authCall, timeout]);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired session." });
    }

    req.user = user;
    req.accessToken = token;
    next();
  } catch {
    return res.status(503).json({ error: "Auth service unavailable." });
  }
};

const requireAdmin = async (req, res, next) => {
  const userClient = createAuthedClient(req.accessToken);

  const { data: profile, error } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", req.user.id)
    .single();

  if (error) {
    return res.status(500).json({ error: "Failed to load user profile." });
  }

  if (!profile || profile.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }

  next();
};

const ADMIN_ORDER_STATUSES = new Set([
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled"
]);

app.get("/js/config.js", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.type("application/javascript");
  res.send(`window.TIBR_CONFIG=${JSON.stringify({ url: supabaseUrl, key: supabaseAnonKey })};`);
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Every storefront listing is this one endpoint with different filters — there
// are no per-collection queries. A nav tab is just a saved set of params.
// (docs/DATA-MODEL.md §5)
//
//   ?line=inspired&audience=men&family=oud&season=winter
//   ?brand=dior                 — Dior's own bottles
//   ?inspired_by=dior           — OUR versions of Dior originals
//   ?note=bergamot              — shop by note
//   ?type=candle&sort=price-asc
const SORTS = {
  newest: { column: "created_at", ascending: false },
  oldest: { column: "created_at", ascending: true },
  alpha: { column: "en_name", ascending: true },
};

app.get("/api/products", async (req, res) => {
  const q = req.query || {};

  // Relational filters are expressed by making the EXISTING embed !inner —
  // adding a second embed of the same relation makes PostgREST build an invalid
  // query ("aggregate functions are not allowed in FROM clause").
  const notesEmbed = q.note
    ? "product_notes!inner(layer, sort, notes!inner(slug, name_en, name_ar, family))"
    : "product_notes(layer, sort, notes(slug, name_en, name_ar, family))";

  const select = [
    "*",
    "product_variants(*)",
    notesEmbed,
    q.brand ? "brands!inner(id, slug, name_en, name_ar)" : "brands(id, slug, name_en, name_ar)",
    q.inspired_by ? "original_perfumes!inner(id, slug, name_en, brands!inner(slug, name_en))" : null,
    q.collection ? "product_collections!inner(collections!inner(slug))" : null
  ].filter(Boolean).join(", ");

  let query = supabase
    .from("products")
    .select(select)
    .eq("status", "active");

  // Scalar facets — each maps 1:1 to a column.
  if (LINES.has(q.line)) query = query.eq("line", q.line);
  if (PRODUCT_TYPES.has(q.type)) query = query.eq("product_type", q.type);
  if (AUDIENCES.has(q.audience)) query = query.eq("audience", q.audience);
  if (CLASSIFICATIONS.has(q.classification)) query = query.eq("classification", q.classification);
  if (CONCENTRATIONS.has(q.concentration)) query = query.eq("concentration", q.concentration);

  // Array facets — `contains`, backed by the GIN indexes.
  if (FAMILIES.has(q.family)) query = query.contains("families", [q.family]);
  if (SEASONS.has(q.season)) query = query.contains("seasons", [q.season]);
  if (q.tag) query = query.contains("tags", [trimValue(q.tag)]);

  // Relational facets.
  if (q.brand) query = query.eq("brands.slug", trimValue(q.brand));
  if (q.inspired_by) query = query.eq("original_perfumes.brands.slug", trimValue(q.inspired_by));
  if (q.note) query = query.eq("product_notes.notes.slug", trimValue(q.note));
  if (q.collection) query = query.eq("product_collections.collections.slug", trimValue(q.collection));

  if (q.q) {
    const term = trimValue(q.q).replace(/[%,()]/g, "");
    if (term) query = query.or(`en_name.ilike.%${term}%,ar_name.ilike.%${term}%`);
  }

  const sort = SORTS[q.sort] || SORTS.newest;
  query = query.order(sort.column, { ascending: sort.ascending });

  const { data, error } = await query;
  if (error) {
    console.error("[products] filter query failed:", error.message);
    return res.status(500).json({ error: "Failed to load products." });
  }

  let products = (data || []).map(normalizeProduct);

  // Price sorts run here, not in Postgres: the price lives on the default
  // VARIANT, not on the product row, so the database can't order by it.
  if (q.sort === "price-asc") products.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  if (q.sort === "price-desc") products.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));

  res.json({ data: products });
});

// Facet counts for the filter sidebar — which values actually have products
// behind them, so we never render a filter that leads to an empty grid.
app.get("/api/facets", async (_req, res) => {
  const { data, error } = await supabase
    .from("products")
    .select("line, product_type, audience, classification, concentration, families, seasons, brands(slug, name_en, name_ar)")
    .eq("status", "active");

  if (error) return res.status(500).json({ error: "Failed to load facets." });

  const tally = (rows, key) => rows.reduce((acc, r) => {
    const values = Array.isArray(r[key]) ? r[key] : [r[key]];
    for (const v of values) if (v) acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});

  const brands = {};
  for (const r of data) {
    if (!r.brands) continue;
    brands[r.brands.slug] = brands[r.brands.slug] || { ...r.brands, count: 0 };
    brands[r.brands.slug].count += 1;
  }

  res.json({
    data: {
      line: tally(data, "line"),
      type: tally(data, "product_type"),
      audience: tally(data, "audience"),
      classification: tally(data, "classification"),
      concentration: tally(data, "concentration"),
      family: tally(data, "families"),
      season: tally(data, "seasons"),
      brand: Object.values(brands).sort((a, b) => b.count - a.count),
      total: data.length
    }
  });
});

// Accepts either the numeric id or the SEO slug, so /product/sauvage-… works
// without breaking the existing /product?id=2 links.
app.get("/api/products/:id", async (req, res) => {
  const key = req.params.id;
  const { data, error } = await supabase
    .from("products")
    .select(`${PRODUCT_GRAPH_SELECT}, brands(id, slug, name_en, name_ar), original_perfumes(id, slug, name_en, name_ar, brands(name_en, slug))`)
    .or(`id.eq.${key},slug.eq.${key}`)
    .maybeSingle();

  if (error) return res.status(500).json({ error: "Failed to load product." });
  if (!data) return res.status(404).json({ error: "Product not found." });

  res.json({ data: normalizeProduct(data) });
});

app.get("/api/profile", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);

  const { data, error } = await userClient
    .from("profiles")
    .select("id, full_name, phone_number, address, governorate, latitude, longitude, gender, date_of_birth, role")
    .eq("id", req.user.id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: "Failed to load profile." });
  }

  res.json({ data });
});

app.post("/api/orders", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const {
    product_id: productId,
    size,
    qty,
    payment_method: paymentMethod,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_address: customerAddress
  } = req.body || {};

  if (!productId || !customerName || !customerPhone) {
    return res.status(400).json({
      error: "product_id, customer_name, and customer_phone are required."
    });
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, ar_price, en_price")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return res.status(400).json({ error: "Selected product does not exist." });
  }

  const safePaymentMethod = PAYMENT_METHODS.has(paymentMethod)
    ? paymentMethod
    : "cash_on_delivery";

  // One-line order — same path as checkout, so pricing comes from the variant.
  const { lines, error: lineError } = await buildOrderLines([
    { variantId: req.body?.variant_id, productId, size, qty }
  ]);
  if (lineError) return res.status(400).json({ error: lineError });

  const subtotal = lines.reduce((sum, l) => sum + l.unit_price * l.qty, 0);

  const { data, error } = await saveOrder(userClient, {
    order: {
      user_id: req.user.id,
      status: "pending",
      payment_method: safePaymentMethod,
      checkout_reference: randomUUID(),
      subtotal,
      shipping: 0,
      discount_amount: 0,
      total: subtotal,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress || null
    },
    lines
  });

  if (error) {
    return res.status(500).json({ error: "Failed to create order." });
  }

  res.status(201).json({ data });
});

app.post("/api/checkout", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const {
    items,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_address: customerAddress,
    payment_method: paymentMethod,
    discount_code: discountCode
  } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "At least one cart item is required." });
  }

  if (!customerName || !customerPhone || !customerAddress) {
    return res.status(400).json({
      error: "customer_name, customer_phone, and customer_address are required."
    });
  }

  const safePaymentMethod = PAYMENT_METHODS.has(paymentMethod)
    ? paymentMethod
    : "cash_on_delivery";

  // Price and stock come from the VARIANT — never the client, never
  // products.ar_price (which charged every size the default size's price).
  const { lines, error: lineError } = await buildOrderLines(items);
  if (lineError) return res.status(400).json({ error: lineError });

  const checkoutReference = randomUUID();
  const orderRows = [];

  {
    // Shape the lines for the discount engine, which still reasons per-line.
    for (const line of lines) orderRows.push({
      product_id: line.product_id,
      variant_id: line.variant_id,
      qty: line.qty,
      unit_price: line.unit_price,
      order_total: line.unit_price * line.qty,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress
    });
  }

  // Re-validate the discount server-side (never trust a client-supplied
  // amount) and spread it across just the order rows it targets. A typed
  // code always wins if valid — never silently swapped for an automatic
  // discount. With no code, the single best-value active automatic
  // discount applies, via the exact same selection checkout preview
  // (/api/discounts/automatic) already showed the shopper.
  const cart = {
    lines: orderRows.map((row) => ({
      productId: row.product_id,
      qty: row.qty,
      unitPrice: row.unit_price,
      lineTotal: row.order_total
    })),
    subtotal: orderRows.reduce((sum, row) => sum + row.order_total, 0)
  };
  const serviceClient = createServiceClient();
  const evalCtx = { userId: req.user.id, customerPhone, serviceClient };

  let appliedDiscount = null;
  const code = String(discountCode || "").trim().toUpperCase();
  if (code) {
    const { data: discount } = await serviceClient
      .from("discounts")
      .select("*")
      .eq("code", code)
      .eq("method", "code")
      .single();

    const outcome = discount ? await evaluateCartDiscount(discount, cart, evalCtx) : null;
    if (!outcome || outcome.error) {
      return res.status(400).json({ error: outcome?.error || "This discount code isn't valid." });
    }
    appliedDiscount = outcome.result;
  } else {
    const { data: candidates } = await serviceClient
      .from("discounts")
      .select("*")
      .eq("method", "automatic")
      .eq("active", true);
    appliedDiscount = await pickBestDiscount(candidates || [], cart, evalCtx);
  }

  if (appliedDiscount) {
    applyLineAdjustments(orderRows, appliedDiscount.line_adjustments);
    orderRows.forEach((row) => {
      row.discount_id = appliedDiscount.id;
      row.discount_title = appliedDiscount.title ?? appliedDiscount.code;
      row.discount_code = appliedDiscount.method === "code" ? appliedDiscount.code : null;
    });
  }

  // The discount engine spread its adjustment across the per-line rows; roll
  // that back up to the single order, which is where the money now lives.
  const subtotal = lines.reduce((sum, l) => sum + l.unit_price * l.qty, 0);
  const discountAmount = orderRows.reduce((sum, r) => sum + (r.discount_amount || 0), 0);
  const total = Math.max(0, subtotal - discountAmount);

  const { data, error } = await saveOrder(userClient, {
    order: {
      user_id: req.user.id,
      status: "pending",
      payment_method: safePaymentMethod,
      checkout_reference: checkoutReference,
      subtotal,
      shipping: 0,
      discount_amount: discountAmount,
      discount_code: appliedDiscount?.method === "code" ? appliedDiscount.code : null,
      total,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress
    },
    lines
  });

  if (error) {
    return res.status(500).json({ error: error.message || "Failed to complete checkout." });
  }

  // Decrement stock per VARIANT. Best-effort and non-transactional: an oversell
  // under concurrent checkouts is possible and is a known gap — the honest fix
  // is a Postgres function that checks and decrements atomically.
  for (const line of lines) {
    const { data: v } = await supabase
      .from("product_variants").select("quantity").eq("id", line.variant_id).single();
    if (v) {
      await createServiceClient()
        .from("product_variants")
        .update({ quantity: Math.max(0, v.quantity - line.qty) })
        .eq("id", line.variant_id);
    }
  }

  if (appliedDiscount) {
    const { data: current } = await serviceClient
      .from("discounts")
      .select("used_count")
      .eq("id", appliedDiscount.id)
      .single();

    if (current) {
      await serviceClient
        .from("discounts")
        .update({ used_count: current.used_count + 1 })
        .eq("id", appliedDiscount.id);
    }
  }

  res.status(201).json({
    data: {
      order_id: data.id,
      checkout_reference: checkoutReference,
      payment_method: safePaymentMethod,
      subtotal,
      total_amount: total,
      item_count: lines.reduce((sum, l) => sum + l.qty, 0),
      discount: appliedDiscount
        ? {
            code: appliedDiscount.code,
            title: appliedDiscount.title,
            amount: discountAmount,
            free_shipping: appliedDiscount.free_shipping
          }
        : null,
      order: data
    }
  });
});

app.get("/api/orders", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);

  const { data, error } = await userClient
    .from("orders")
    .select(ORDER_SELECT)
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Failed to load orders." });
  }

  res.json({ data: data || [] });
});

app.get("/api/admin/orders", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { data, error } = await userClient
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Failed to load admin orders." });
  }

  res.json({ data: data || [] });
});

app.get("/api/admin/customers", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);

  const { data, error } = await userClient
    .from("orders")
    .select("id, status, total, subtotal, customer_name, customer_phone, customer_address, created_at, user_id")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Failed to load customers." });
  }

  // Aggregate orders into one row per customer. Registered customers group by
  // user_id; guest orders (no user_id) group by their phone number. Orders are
  // already sorted newest-first, so the first row we see for a key carries the
  // most recent name/phone/address.
  const map = new Map();
  for (const o of data) {
    const key = o.user_id || (o.customer_phone ? `guest:${o.customer_phone}` : `guest:${o.id}`);
    let c = map.get(key);
    if (!c) {
      c = {
        id: key,
        is_registered: !!o.user_id,
        name: o.customer_name || null,
        phone: o.customer_phone || null,
        address: o.customer_address || null,
        order_count: 0,
        total_spent: 0,
        last_order_at: o.created_at,
        first_order_at: o.created_at,
      };
      map.set(key, c);
    }
    c.order_count += 1;
    if (o.total != null) c.total_spent += Number(o.total) || 0;
    if (o.created_at < c.first_order_at) c.first_order_at = o.created_at;
    if (o.created_at > c.last_order_at) c.last_order_at = o.created_at;
    // Fill in any details missing from the newest order using older ones.
    if (!c.name && o.customer_name) c.name = o.customer_name;
    if (!c.phone && o.customer_phone) c.phone = o.customer_phone;
    if (!c.address && o.customer_address) c.address = o.customer_address;
  }

  const customers = Array.from(map.values()).sort(
    (a, b) => new Date(b.last_order_at) - new Date(a.last_order_at)
  );

  res.json({ data: customers });
});

app.get("/api/admin/customers/:id", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const key = req.params.id;

  const { data, error } = await userClient
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Failed to load customer." });
  }

  const keyOf = (o) => o.user_id || (o.customer_phone ? `guest:${o.customer_phone}` : `guest:${o.id}`);
  const orders = data.filter((o) => keyOf(o) === key);

  if (orders.length === 0) {
    return res.status(404).json({ error: "Customer not found." });
  }

  // Orders come newest-first, so orders[0] carries the freshest details.
  const customer = {
    id: key,
    is_registered: !!orders[0].user_id,
    name: null, phone: null, address: null,
    order_count: orders.length,
    total_spent: 0,
    first_order_at: orders[0].created_at,
    last_order_at: orders[0].created_at,
  };
  for (const o of orders) {
    if (o.order_total != null) customer.total_spent += Number(o.order_total) || 0;
    if (o.created_at < customer.first_order_at) customer.first_order_at = o.created_at;
    if (o.created_at > customer.last_order_at) customer.last_order_at = o.created_at;
    if (!customer.name && o.customer_name) customer.name = o.customer_name;
    if (!customer.phone && o.customer_phone) customer.phone = o.customer_phone;
    if (!customer.address && o.customer_address) customer.address = o.customer_address;
  }

  res.json({ data: { customer, orders } });
});

// ── Discounts (Admin) ────────────────────────────────────────────────────────

const DISCOUNT_CLASSES = new Set(["order", "product", "buy_x_get_y", "shipping"]);
const DISCOUNT_VALUE_TYPES = new Set(["percentage", "fixed"]);
const GET_DISCOUNT_TYPES = new Set(["percentage", "fixed", "free"]);

const asIdArray = (v) => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);

// Class-aware: which fields matter depends on discount_class/method. Always
// returns every column (unused ones reset to their neutral default) so an
// edit that switches, say, `applies_to` back to "all" clears out a stale
// product_ids list rather than leaving it behind.
const sanitizeDiscountPayload = (body) => {
  const discount_class = DISCOUNT_CLASSES.has(body.discount_class) ? body.discount_class : "order";
  const method = body.method === "automatic" ? "automatic" : "code";
  const eligibility = body.eligibility === "specific_customers" ? "specific_customers" : "all";
  const isValueClass = discount_class === "order" || discount_class === "product";

  const d = {
    discount_class,
    method,
    code: method === "code" ? String(body.code || "").trim().toUpperCase() : null,
    title: method === "automatic" ? String(body.title || "").trim() : null,
    type: isValueClass && DISCOUNT_VALUE_TYPES.has(body.type) ? body.type : null,
    value: isValueClass ? Number(body.value) || 0 : 0,
    min_purchase: body.min_purchase != null && body.min_purchase !== "" ? Number(body.min_purchase) : null,
    usage_limit: body.usage_limit != null && body.usage_limit !== "" ? parseInt(body.usage_limit, 10) : null,
    one_per_customer: !!body.one_per_customer,
    starts_at: body.starts_at || new Date().toISOString(),
    ends_at: body.ends_at || null,
    active: body.active !== false,
    eligibility,
    customer_ids: eligibility === "specific_customers" ? asIdArray(body.customer_ids) : [],
    applies_to: discount_class === "product" && body.applies_to === "specific_products" ? "specific_products" : "all",
    product_ids: [],
    buy_type: null,
    buy_quantity: null,
    buy_amount: null,
    buy_applies_to: "all",
    buy_product_ids: [],
    get_quantity: null,
    get_product_ids: [],
    get_discount_type: null,
    get_discount_value: 0,
    buy_x_get_y_max_uses_per_order: null
  };

  if (discount_class === "product" && d.applies_to === "specific_products") {
    d.product_ids = asIdArray(body.product_ids);
  }

  if (discount_class === "buy_x_get_y") {
    d.buy_type = body.buy_type === "amount" ? "amount" : "quantity";
    d.buy_quantity = d.buy_type === "quantity" ? parseInt(body.buy_quantity, 10) || null : null;
    d.buy_amount = d.buy_type === "amount" ? Number(body.buy_amount) || null : null;
    d.buy_applies_to = body.buy_applies_to === "specific_products" ? "specific_products" : "all";
    d.buy_product_ids = d.buy_applies_to === "specific_products" ? asIdArray(body.buy_product_ids) : [];
    d.get_quantity = parseInt(body.get_quantity, 10) || null;
    d.get_product_ids = asIdArray(body.get_product_ids);
    d.get_discount_type = GET_DISCOUNT_TYPES.has(body.get_discount_type) ? body.get_discount_type : null;
    d.get_discount_value = d.get_discount_type === "free" ? 0 : Number(body.get_discount_value) || 0;
    d.buy_x_get_y_max_uses_per_order =
      body.buy_x_get_y_max_uses_per_order != null && body.buy_x_get_y_max_uses_per_order !== ""
        ? parseInt(body.buy_x_get_y_max_uses_per_order, 10)
        : null;
  }

  return d;
};

const validateDiscountPayload = (d) => {
  if (d.method === "code" && !d.code) return "Discount code is required.";
  if (d.method === "automatic" && !d.title) return "Title is required for an automatic discount.";

  if (d.discount_class === "order" || d.discount_class === "product") {
    if (!d.type) return "Select a valid discount type.";
    if (d.type === "percentage" && (d.value <= 0 || d.value > 100)) {
      return "Percentage discounts must be between 1 and 100.";
    }
    if (d.type === "fixed" && d.value <= 0) {
      return "Fixed discount amount must be greater than 0.";
    }
  }

  if (d.discount_class === "product" && d.applies_to === "specific_products" && d.product_ids.length === 0) {
    return "Select at least one product.";
  }

  if (d.discount_class === "buy_x_get_y") {
    if (d.buy_type === "quantity" && (!d.buy_quantity || d.buy_quantity <= 0)) {
      return "Enter a minimum quantity for the buy condition.";
    }
    if (d.buy_type === "amount" && (!d.buy_amount || d.buy_amount <= 0)) {
      return "Enter a minimum purchase amount for the buy condition.";
    }
    if (d.buy_applies_to === "specific_products" && d.buy_product_ids.length === 0) {
      return "Select at least one product customers must buy.";
    }
    if (!d.get_quantity || d.get_quantity <= 0) {
      return "Enter how many items the customer gets.";
    }
    if (d.get_product_ids.length === 0) {
      return "Select at least one product the customer gets.";
    }
    if (!d.get_discount_type) return "Select the discount applied to the items customers get.";
    if (d.get_discount_type === "percentage" && (d.get_discount_value <= 0 || d.get_discount_value > 100)) {
      return "Percentage must be between 1 and 100.";
    }
    if (d.get_discount_type === "fixed" && d.get_discount_value <= 0) {
      return "Amount off must be greater than 0.";
    }
    if (d.buy_x_get_y_max_uses_per_order != null && d.buy_x_get_y_max_uses_per_order <= 0) {
      return "Max uses per order must be greater than 0.";
    }
  }

  if (d.eligibility === "specific_customers" && d.customer_ids.length === 0) {
    return "Select at least one customer.";
  }

  if (d.min_purchase != null && d.min_purchase < 0) return "Minimum purchase can't be negative.";
  if (d.usage_limit != null && d.usage_limit <= 0) return "Usage limit must be greater than 0.";
  if (d.ends_at && new Date(d.ends_at) <= new Date(d.starts_at)) {
    return "End date must be after the start date.";
  }
  return null;
};

app.get("/api/admin/discounts", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { data, error } = await userClient
    .from("discounts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Failed to load discounts." });
  }

  res.json({ data });
});

app.get("/api/admin/discounts/:id", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { data, error } = await userClient
    .from("discounts")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) {
    return res.status(404).json({ error: "Discount not found." });
  }

  res.json({ data });
});

app.post("/api/admin/discounts", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const discount = sanitizeDiscountPayload(req.body || {});
  const validationError = validateDiscountPayload(discount);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { data, error } = await userClient
    .from("discounts")
    .insert(discount)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return res.status(400).json({ error: `Discount code "${discount.code}" already exists.` });
    }
    return res.status(500).json({ error: error.message || "Failed to create discount." });
  }

  res.status(201).json({ data });
});

app.patch("/api/admin/discounts/:id", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const discount = sanitizeDiscountPayload(req.body || {});
  const validationError = validateDiscountPayload(discount);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  // discount_class is immutable after creation — never part of an update,
  // regardless of what the request body claims it is.
  delete discount.discount_class;

  const { data, error } = await userClient
    .from("discounts")
    .update(discount)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return res.status(400).json({ error: `Discount code "${discount.code}" already exists.` });
    }
    return res.status(500).json({ error: error.message || "Failed to update discount." });
  }

  res.json({ data });
});

app.delete("/api/admin/discounts/:id", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { error } = await userClient
    .from("discounts")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    return res.status(500).json({ error: error.message || "Failed to delete discount." });
  }

  res.json({ success: true });
});

// Validate a discount code against the real cart — used by checkout, before
// the order is placed, so the shopper sees the applied discount immediately.
// Builds cart lines from real DB prices, same as /api/checkout, so the two
// can never disagree about the amount.
// Public (no auth) — lets the catalog show a "free shipping unlocked" badge
// that reflects whatever automatic shipping discount is actually live in
// admin, instead of a hardcoded claim. Returns the lowest min_purchase among
// currently-active automatic shipping discounts (null = unconditional), or
// null overall if no such discount is active right now.
app.get("/api/discounts/shipping", async (_req, res) => {
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("discounts")
    .select("min_purchase, starts_at, ends_at")
    .eq("method", "automatic")
    .eq("discount_class", "shipping")
    .eq("active", true);

  if (error) {
    return res.status(500).json({ error: "Failed to load shipping discounts." });
  }

  const now = new Date();
  const active = (data || []).filter((d) => {
    if (d.starts_at && new Date(d.starts_at) > now) return false;
    if (d.ends_at && new Date(d.ends_at) < now) return false;
    return true;
  });

  if (active.length === 0) return res.json({ data: null });

  const unconditional = active.some((d) => d.min_purchase == null);
  const minPurchase = unconditional
    ? null
    : Math.min(...active.map((d) => d.min_purchase));

  res.json({ data: { min_purchase: minPurchase } });
});

app.post("/api/discounts/validate", requireUser, async (req, res) => {
  const code = String(req.body?.code || "").trim().toUpperCase();
  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  if (!code) return res.status(400).json({ error: "Enter a discount code." });

  const { cart, error: cartError } = await buildCartLines(items);
  if (cartError) return res.status(400).json({ error: cartError });

  const serviceClient = createServiceClient();
  const { data: discount, error } = await serviceClient
    .from("discounts")
    .select("*")
    .eq("code", code)
    .eq("method", "code")
    .single();

  if (error || !discount) {
    return res.status(404).json({ error: "This discount code isn't valid." });
  }

  const outcome = await evaluateCartDiscount(discount, cart, { userId: req.user.id, serviceClient });
  if (outcome.error) {
    return res.status(400).json({ error: outcome.error });
  }

  res.json({ data: outcome.result });
});

// Preview the best-matching *automatic* discount for the current cart — no
// code required. Read-only (no used_count increment, no order insert); used
// by Checkout.jsx to show an auto-applied discount before the shopper
// submits. Shares evaluateCartDiscount/pickBestDiscount with /api/checkout
// so the preview can never disagree with what checkout actually applies.
app.post("/api/discounts/automatic", requireUser, async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  const { cart, error: cartError } = await buildCartLines(items);
  if (cartError) return res.status(400).json({ error: cartError });

  const serviceClient = createServiceClient();
  const { data: candidates, error } = await serviceClient
    .from("discounts")
    .select("*")
    .eq("method", "automatic")
    .eq("active", true);

  if (error) {
    return res.status(500).json({ error: "Failed to check automatic discounts." });
  }

  const best = await pickBestDiscount(candidates || [], cart, { userId: req.user.id, serviceClient });
  res.json({ data: best });
});

app.patch("/api/admin/orders/:id", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const nextStatus = String(req.body?.status || "").trim().toLowerCase();

  if (!ADMIN_ORDER_STATUSES.has(nextStatus)) {
    return res.status(400).json({ error: "Invalid order status." });
  }

  const { data, error } = await userClient
    .from("orders")
    .update({ status: nextStatus })
    .eq("id", req.params.id)
    .select(ORDER_SELECT)
    .single();

  if (error) {
    return res.status(500).json({ error: "Failed to update order status." });
  }

  res.json({ data });
});

app.put("/api/profile", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { full_name, phone_number, address, governorate, latitude, longitude, gender, date_of_birth } = req.body || {};

  const { data, error } = await userClient
    .from("profiles")
    .update({
      full_name, phone_number, address,
      governorate: governorate || null,
      latitude:  latitude  != null ? Number(latitude)  : null,
      longitude: longitude != null ? Number(longitude) : null,
      gender, date_of_birth: date_of_birth || null
    })
    .eq("id", req.user.id)
    .select("id, full_name, phone_number, address, governorate, latitude, longitude, gender, date_of_birth, role")
    .single();

  if (error) {
    return res.status(500).json({ error: "Failed to update profile." });
  }

  res.json({ data });
});

// ── Addresses ────────────────────────────────────────────────────────────────

app.get("/api/profile/addresses", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { data, error } = await userClient
    .from("addresses")
    .select("*")
    .eq("user_id", req.user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: "Failed to load addresses." });
  res.json({ data });
});

app.post("/api/profile/addresses", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { label, city, street, phone, governorate, latitude, longitude, is_default } = req.body || {};

  if (!street) {
    return res.status(400).json({ error: "street is required." });
  }

  if (is_default) {
    await userClient.from("addresses").update({ is_default: false }).eq("user_id", req.user.id);
  }

  const { data, error } = await userClient
    .from("addresses")
    .insert({
      user_id:    req.user.id,
      label:      label || "Home",
      city:       city || governorate || "",
      governorate: governorate || null,
      street,
      phone:      phone || null,
      latitude:   latitude  != null ? Number(latitude)  : null,
      longitude:  longitude != null ? Number(longitude) : null,
      is_default: !!is_default
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: "Failed to add address." });
  res.status(201).json({ data });
});

app.delete("/api/profile/addresses/:id", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { error } = await userClient
    .from("addresses")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error: "Failed to delete address." });
  res.json({ success: true });
});

app.put("/api/profile/addresses/:id", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { label, city, street, phone, governorate, latitude, longitude, is_default } = req.body || {};

  if (!street) return res.status(400).json({ error: "street is required." });

  if (is_default) {
    await userClient.from("addresses").update({ is_default: false }).eq("user_id", req.user.id);
  }

  const { error } = await userClient
    .from("addresses")
    .update({
      label:       label || "Home",
      city:        city || governorate || "",
      governorate: governorate || null,
      street,
      phone:       phone || null,
      latitude:    latitude  != null ? Number(latitude)  : null,
      longitude:   longitude != null ? Number(longitude) : null,
      is_default:  !!is_default
    })
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) {
    console.error("PUT /api/profile/addresses/:id error:", error);
    return res.status(500).json({ error: error.message || "Failed to update address." });
  }
  res.json({ success: true });
});

app.put("/api/profile/addresses/:id/default", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  await userClient.from("addresses").update({ is_default: false }).eq("user_id", req.user.id);

  const { data, error } = await userClient
    .from("addresses")
    .update({ is_default: true })
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: "Failed to update default address." });
  res.json({ data });
});

// ── Reviews ──────────────────────────────────────────────────────────────────

app.get("/api/reviews/summary", async (_req, res) => {
  const { data, error } = await supabase.from("reviews").select("rating");

  if (error) {
    console.warn("[reviews] summary query failed (table may not exist yet):", error.message);
    return res.json({ data: { avg: 0, count: 0 } });
  }

  const count = data.length;
  const avg = count ? data.reduce((sum, r) => sum + r.rating, 0) / count : 0;
  res.json({ data: { avg: Math.round(avg * 10) / 10, count } });
});

app.get("/api/products/:id/reviews", async (req, res) => {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, body, created_at, profiles(full_name)")
    .eq("product_id", req.params.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.warn("[reviews] query failed (table may not exist yet):", error.message);
    return res.json({ data: [] });
  }
  res.json({ data });
});

app.post("/api/products/:id/reviews", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { rating, body } = req.body || {};

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5." });
  }

  const { data, error } = await userClient
    .from("reviews")
    .insert({
      user_id: req.user.id,
      product_id: req.params.id,
      rating: Number(rating),
      body: body || null
    })
    .select("id, rating, body, created_at")
    .single();

  if (error) return res.status(error.code === "42P01" ? 503 : 500).json({ error: error.message || "Failed to submit review." });
  res.status(201).json({ data });
});

// ── Products (Admin) ─────────────────────────────────────────────────────────

const createProductHandler = async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const graph = sanitizeProductPayload(req.body || {});
  const validationError = validateProductPayload(graph, true);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { data, error } = await saveProductGraph(userClient, graph);

  if (error) {
    return res.status(500).json({ error: error.message || "Failed to save product." });
  }

  res.status(201).json({ data: normalizeProduct(data) });
};

app.post("/api/products", requireUser, requireAdmin, createProductHandler);
app.post("/api/admin/products", requireUser, requireAdmin, createProductHandler);

app.get("/api/admin/products", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { data, error } = await userClient
    .from("products")
    .select(`${PRODUCT_GRAPH_SELECT}, brands(id, slug, name_en, name_ar)`)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Failed to load products." });
  }

  res.json({ data: (data || []).map(normalizeProduct) });
});

app.patch("/api/admin/products/:id", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const graph = sanitizeProductPayload({ ...req.body, id: req.params.id });
  const validationError = validateProductPayload(graph, false);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { data, error } = await saveProductGraph(userClient, graph, { id: req.params.id });

  if (error) {
    return res.status(500).json({ error: error.message || "Failed to update product." });
  }

  res.json({ data: normalizeProduct(data) });
});

// ── Brands + the original-perfume registry — the two entities the product form
// picks from. Both are admin-writable so a new house or a newly-referenced
// original can be created without leaving the product page. ─────────────────

app.get("/api/admin/brands", requireUser, requireAdmin, async (req, res) => {
  const { data, error } = await createAuthedClient(req.accessToken)
    .from("brands")
    .select("*")
    .order("sort", { ascending: true })
    .order("name_en", { ascending: true });

  if (error) return res.status(500).json({ error: "Failed to load brands." });
  res.json({ data: data || [] });
});

app.post("/api/admin/brands", requireUser, requireAdmin, async (req, res) => {
  const body = req.body || {};
  const name_en = trimValue(body.name_en);
  if (!name_en) return res.status(400).json({ error: "Brand name (EN) is required." });

  const { data, error } = await createAuthedClient(req.accessToken)
    .from("brands")
    .insert({
      slug: slugifyValue(body.slug || name_en),
      name_en,
      name_ar: trimValue(body.name_ar) || null,
      country: trimValue(body.country) || null,
      is_house: parseBool(body.is_house)
    })
    .select()
    .single();

  if (error) {
    const conflict = error.code === "23505";
    return res.status(conflict ? 409 : 500)
      .json({ error: conflict ? "A brand with that name already exists." : "Failed to create brand." });
  }
  res.status(201).json({ data });
});

app.get("/api/admin/originals", requireUser, requireAdmin, async (req, res) => {
  const { data, error } = await createAuthedClient(req.accessToken)
    .from("original_perfumes")
    .select("*, brands(id, slug, name_en, name_ar)")
    .order("name_en", { ascending: true });

  if (error) return res.status(500).json({ error: "Failed to load original perfumes." });
  res.json({ data: data || [] });
});

app.post("/api/admin/originals", requireUser, requireAdmin, async (req, res) => {
  const body = req.body || {};
  const name_en = trimValue(body.name_en);
  const brand_id = trimValue(body.brand_id);
  const audience = trimValue(body.audience);

  if (!name_en) return res.status(400).json({ error: "Original perfume name (EN) is required." });
  if (!brand_id) return res.status(400).json({ error: "The original's house (brand) is required." });
  if (!AUDIENCES.has(audience)) return res.status(400).json({ error: "Audience must be Men, Women, or Unisex." });

  const { data, error } = await createAuthedClient(req.accessToken)
    .from("original_perfumes")
    .insert({
      slug: slugifyValue(body.slug || name_en),
      brand_id,
      name_en,
      name_ar: trimValue(body.name_ar) || null,
      audience,
      year: parseInt(body.year, 10) || null,
      families: parseStringArray(body.families, FAMILIES)
    })
    .select("*, brands(id, slug, name_en, name_ar)")
    .single();

  if (error) {
    const conflict = error.code === "23505";
    return res.status(conflict ? 409 : 500)
      .json({ error: conflict ? "That original perfume already exists." : "Failed to create original perfume." });
  }
  res.status(201).json({ data });
});

app.delete("/api/admin/products/:id", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { error } = await userClient
    .from("products")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    return res.status(500).json({ error: error.message || "Failed to delete product." });
  }

  res.json({ success: true });
});

// Image upload — stores in Supabase Storage (works on Vercel / any host)
const STORAGE_BUCKET = "brand-assets";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (_req, file, cb) {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  }
});

app.post("/api/admin/upload", requireUser, requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file received" });

  const ext = path.extname(req.file.originalname).toLowerCase() || ".jpg";
  const filename = "product-" + Date.now() + "-" + randomUUID().slice(0, 8) + ext;
  const storagePath = "images/products/" + filename;

  const serviceKey = SUPABASE_SERVICE_KEY || supabaseAnonKey;
  const storageClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { error } = await storageClient.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

  if (error) return res.status(500).json({ error: "Upload failed: " + error.message });

  const { data } = storageClient.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  res.json({ url: data.publicUrl });
});

// ── React client (production build) ──────────────────────────────────────────
// In production (`npm run build` was run), serve the Vite output for all store
// routes.  In dev, Vite runs on :5173 and proxies /api back here — these routes
// are never reached from Vite's dev server.
const clientDist = path.join(rootDir, "dist", "client");
const clientDistExists = fs.existsSync(path.join(clientDist, "index.html"));

// Store routes — all handled by the React SPA. "/" is the home/hero page
// (Collection.jsx) and is included here so a fresh load lands on the hero
// instead of falling through to the "/shop" catch-all below.
const STORE_ROUTES = [
  '/',
  '/shop',
  '/shop/all',
  '/shop/perfumes',
  '/shop/perfumes/original', '/shop/perfumes/inspired', '/shop/perfumes/signature',
  '/shop/men', '/shop/women', '/shop/unisex',
  '/shop/original', '/shop/inspired', '/shop/signature',
  '/shop/arabian', '/shop/niche',
  '/shop/candles', '/shop/bakhoor', '/shop/home-fragrance', '/shop/body-splash',
  '/shop/sets', '/shop/samples', '/shop/new-arrivals',
  '/shop/brands', '/shop/brands/:brand',
  '/product', '/cart', '/checkout',
  '/login', '/signup',
  '/account', '/admin', '/admin/product', '/wishlist',
];

if (clientDistExists) {
  // Serve Vite build assets with long-lived cache. index:false so this
  // static middleware doesn't auto-serve index.html at "/" itself — the
  // explicit STORE_ROUTES handler below does that instead.
  app.use(express.static(clientDist, {
    index: false,
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath);
      if (/\.(js|css|mjs)$/i.test(ext)) {
        res.setHeader("Cache-Control", "no-cache");
      } else if (/\.(png|jpg|jpeg|gif|ico|svg|webp|avif|woff2?|ttf)$/i.test(ext)) {
        res.setHeader("Cache-Control", CACHE_IMMUTABLE);
      }
    }
  }));

  STORE_ROUTES.forEach(route => {
    app.get(route, (_req, res) =>
      res.sendFile(path.join(clientDist, "index.html"))
    );
  });
} else {
  // No build present. In dev, Vite serves the store on :5173 (`npm run client:dev`).
  // For a production server the build is required — run `npm run client:build`.
  console.warn(
    "[store] dist/client not found — store routes are unavailable until you run `npm run client:build`."
  );
}

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }
  res.redirect(301, "/shop");
});

if (!process.env.SKIP_LISTEN) {
  app.listen(port, host, () => {
    console.log(`Tibr server running at http://${host}:${port}`);
  });
}

module.exports = app;

// Exposed for tests (scripts/test-product-graph.cjs) — the product write path
// is a graph across three tables and is worth exercising without booting HTTP
// or minting an admin session. Not used at runtime.
module.exports.catalog = {
  sanitizeProductPayload,
  validateProductPayload,
  saveProductGraph,
  normalizeProduct,
  PRODUCT_GRAPH_SELECT
};
