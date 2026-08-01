// Public catalog reads — the single filterable product listing, the facet
// counts for the filter sidebar, and a single product by id-or-slug.
//
// All three are anonymous, identical for every visitor, and read-only, so they
// sit behind the in-process TTL cache in ../lib/cache and ship a short public
// Cache-Control. Admin writes call cache.bust() (see routes/admin.js), so an
// edit is live immediately rather than after the TTL.
const express = require("express");
const { supabase, createServiceClient } = require("../db");
const { trimValue, parseBool } = require("../lib/parse");
const { remember, queryKey, DEFAULT_TTL_MS } = require("../lib/cache");
const { CACHE_CATALOG } = require("../config");
const {
  PRODUCT_GRAPH_SELECT,
  normalizeProduct,
  LINES,
  PRODUCT_TYPES,
  AUDIENCES,
  CLASSIFICATIONS,
  CONCENTRATIONS,
  FAMILIES,
  SEASONS,
  getActiveAutomaticProductDiscounts,
  applyAutomaticProductDiscounts,
} = require("../services/products");

const router = express.Router();

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

// Only these params change the answer — anything else is ignored when building
// the cache key, so a crawler appending ?utm_source=… can't shard the cache.
const PRODUCT_QUERY_PARAMS = [
  "line", "type", "audience", "classification", "concentration",
  "spotlight", "bestseller", "family", "season", "tag",
  "brand", "inspired_by", "note", "collection", "q", "sort", "on_sale",
];

// The active automatic product discounts are the same for every listing and
// every PDP, so they are memoized once rather than re-fetched per request.
const loadAutomaticDiscounts = () =>
  remember("discounts:automatic-product", DEFAULT_TTL_MS, () =>
    getActiveAutomaticProductDiscounts(createServiceClient())
  );

const loadProducts = async (q) => {
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

  // Merchandising flags — the admin-curated shop-home rails filter by these.
  if (parseBool(q.spotlight)) query = query.eq("is_spotlight", true);
  if (parseBool(q.bestseller)) query = query.eq("is_bestseller", true);

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
    throw new Error("Failed to load products.");
  }

  const activeDiscounts = await loadAutomaticDiscounts();
  let products = applyAutomaticProductDiscounts(data || [], activeDiscounts).map(normalizeProduct);

  // "On offer" is a per-VARIANT fact (a size with a compare-at above its price),
  // so it can't be a Postgres column filter — apply it after normalization.
  if (parseBool(q.on_sale)) {
    products = products.filter((p) =>
      (p.variants || []).some(
        (v) => v.compare_at_price != null && Number(v.compare_at_price) > Number(v.price)
      )
    );
  }

  // Price sorts run here, not in Postgres: the price lives on the default
  // VARIANT, not on the product row, so the database can't order by it.
  if (q.sort === "price-asc") products.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  if (q.sort === "price-desc") products.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));

  return products;
};

router.get("/api/products", async (req, res) => {
  const q = req.query || {};
  try {
    const products = await remember(
      queryKey("products", q, PRODUCT_QUERY_PARAMS),
      DEFAULT_TTL_MS,
      () => loadProducts(q)
    );
    res.setHeader("Cache-Control", CACHE_CATALOG);
    res.json({ data: products });
  } catch {
    res.status(500).json({ error: "Failed to load products." });
  }
});

// Facet counts for the filter sidebar — which values actually have products
// behind them, so we never render a filter that leads to an empty grid.
const loadFacets = async () => {
  const { data, error } = await supabase
    .from("products")
    .select("line, product_type, audience, classification, concentration, families, seasons, brands(slug, name_en, name_ar, logo_url)")
    .eq("status", "active");

  if (error) {
    console.error("[facets] query failed:", error.message);
    throw new Error("Failed to load facets.");
  }

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

  return {
    line: tally(data, "line"),
    type: tally(data, "product_type"),
    audience: tally(data, "audience"),
    classification: tally(data, "classification"),
    concentration: tally(data, "concentration"),
    family: tally(data, "families"),
    season: tally(data, "seasons"),
    brand: Object.values(brands).sort((a, b) => b.count - a.count),
    total: data.length
  };
};

router.get("/api/facets", async (_req, res) => {
  try {
    const facets = await remember("facets", DEFAULT_TTL_MS, loadFacets);
    res.setHeader("Cache-Control", CACHE_CATALOG);
    res.json({ data: facets });
  } catch {
    res.status(500).json({ error: "Failed to load facets." });
  }
});

// Accepts either the numeric id or the SEO slug, so /product/sauvage-… works
// without breaking the existing /product?id=2 links.
const loadProduct = async (key) => {
  const { data, error } = await supabase
    .from("products")
    .select(`${PRODUCT_GRAPH_SELECT}, brands(id, slug, name_en, name_ar), original_perfumes(id, slug, name_en, name_ar, brands(name_en, slug))`)
    .or(`id.eq.${key},slug.eq.${key}`)
    .maybeSingle();

  if (error) {
    console.error("[product] query failed:", error.message);
    throw new Error("Failed to load product.");
  }
  if (!data) return null;

  const activeDiscounts = await loadAutomaticDiscounts();
  applyAutomaticProductDiscounts([data], activeDiscounts);
  return normalizeProduct(data);
};

router.get("/api/products/:id", async (req, res) => {
  const key = req.params.id;
  try {
    const product = await remember(`product:${key}`, DEFAULT_TTL_MS, () => loadProduct(key));
    if (!product) return res.status(404).json({ error: "Product not found." });
    res.setHeader("Cache-Control", CACHE_CATALOG);
    res.json({ data: product });
  } catch {
    res.status(500).json({ error: "Failed to load product." });
  }
});

module.exports = router;
