// Exercises the admin product write path end-to-end against the real database:
// sanitize -> validate -> saveProductGraph (products + product_variants +
// product_notes) -> read back through normalizeProduct.
//
//   node scripts/test-product-graph.cjs
//
// Creates a product under a __test_ id and DELETES it again, pass or fail.
// Uses the service-role client (bypasses RLS) so it needs no admin session.

process.env.SKIP_LISTEN = "1";
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { catalog } = require("../server.js");
const { sanitizeProductPayload, validateProductPayload, saveProductGraph, normalizeProduct, PRODUCT_GRAPH_SELECT } = catalog;

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const TEST_ID = "__test_graph";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `  <- ${detail}`}`);
  ok ? pass++ : fail++;
};

const cleanup = async () => { await db.from("products").delete().eq("id", TEST_ID); };

(async () => {
  await cleanup();

  const { data: brands } = await db.from("brands").select("id, slug");
  const { data: originals } = await db.from("original_perfumes").select("id, slug");
  const tibr = brands.find((b) => b.slug === "tibr");
  const dior = brands.find((b) => b.slug === "dior");
  const sauvage = originals.find((o) => o.slug === "sauvage-eau-de-parfum");

  // ── 1. Validation rejects what the DB would reject ────────────────────────
  console.log("\nvalidation:");
  const base = {
    id: TEST_ID, ar_name: "تبر ١", en_name: "TIBR One", brand_id: tibr.id,
    line: "inspired", product_type: "perfume", audience: "men",
    original_perfume_id: sauvage.id, images: ["http://img/1.png"],
    variants: [{ size_label: "50ml", price: 900, quantity: 5 }]
  };
  const err = (patch) => validateProductPayload(sanitizeProductPayload({ ...base, ...patch }), true);

  check("accepts a well-formed inspired perfume", err({}) === null, err({}));
  check("rejects an inspired perfume with no original",
    !!err({ original_perfume_id: "" }));
  check("rejects a signature product carrying an original",
    !!err({ line: "signature", original_perfume_id: sauvage.id }));
  check("allows an inspired CANDLE with no original",
    err({ product_type: "candle", original_perfume_id: "" }) === null);
  check("rejects a product with no variants", !!err({ variants: [] }));
  check("rejects a zero-priced variant",
    !!err({ variants: [{ size_label: "50ml", price: 0, quantity: 1 }] }));
  check("rejects duplicate variant sizes",
    !!err({ variants: [{ size_label: "50ml", price: 9, quantity: 1 }, { size_label: "50ml", price: 9, quantity: 1 }] }));
  check("rejects compare-at below price",
    !!err({ variants: [{ size_label: "50ml", price: 900, compare_at_price: 500, quantity: 1 }] }));
  check("rejects an unknown line", !!err({ line: "bogus" }));
  check("rejects a product with no images", !!err({ images: [] }));

  // ── 2. Save the graph ─────────────────────────────────────────────────────
  console.log("\nwrite:");
  const graph = sanitizeProductPayload({
    ...base,
    classification: "designer", concentration: "edp",
    longevity: "long", sillage: "strong",
    families: ["fresh", "spicy", "not-a-family"],   // junk must be filtered out
    seasons: ["winter", "fall"], tags: ["luxury"],
    ar_desc: "وصف", en_desc: "desc",
    variants: [
      { size_label: "50ml", price: 900, quantity: 5, sku: "TIBR-1-50" },
      { size_label: "100ml", price: 1400, compare_at_price: 1600, quantity: 2, sku: "TIBR-1-100", is_default: true }
    ],
    notes: { top: ["bergamot", "lemon"], heart: ["jasmine"], base: ["vanilla"] }
  });

  check("junk family filtered before write", !graph.row.families.includes("not-a-family"),
    JSON.stringify(graph.row.families));
  check("legacy bridge: sizes mirrored from variants",
    JSON.stringify(graph.row.sizes) === '["50ml","100ml"]', JSON.stringify(graph.row.sizes));
  check("legacy bridge: ar_price = default variant price", graph.row.ar_price === 1400, String(graph.row.ar_price));
  check("legacy bridge: quantity = sum of variants", graph.row.quantity === 7, String(graph.row.quantity));

  const { error: saveError } = await saveProductGraph(db, graph);
  check("saveProductGraph succeeded", !saveError, saveError?.message);

  // ── 3. Read it back ───────────────────────────────────────────────────────
  console.log("\nread back:");
  const { data: row } = await db.from("products").select(PRODUCT_GRAPH_SELECT).eq("id", TEST_ID).maybeSingle();
  const p = row ? normalizeProduct(row) : null;

  check("product round-trips", !!p);
  if (p) {
    check("slug derived from name", p.slug === "tibr-one", p.slug);
    check("2 variants persisted", p.variants.length === 2, String(p.variants.length));
    check("price = default variant (100ml)", p.price === 1400, String(p.price));
    check("exactly one default variant", p.variants.filter((v) => v.is_default).length === 1);
    check("notes pyramid: 2 top / 1 heart / 1 base",
      p.notes.top.length === 2 && p.notes.heart.length === 1 && p.notes.base.length === 1,
      `${p.notes.top.length}/${p.notes.heart.length}/${p.notes.base.length}`);
    check("note resolved to a real row", p.notes.top[0]?.name_ar != null, JSON.stringify(p.notes.top[0]));
    check("families view-ready", JSON.stringify(p.families) === '["fresh","spicy"]', JSON.stringify(p.families));
  }

  // ── 4. Re-save replaces rather than duplicates ────────────────────────────
  console.log("\nidempotent re-save:");
  const graph2 = sanitizeProductPayload({
    ...base,
    variants: [{ size_label: "75ml", price: 1100, quantity: 3 }],
    notes: { top: ["bergamot"], heart: [], base: [] }
  });
  const { error: e2 } = await saveProductGraph(db, graph2, { id: TEST_ID });
  check("re-save succeeded", !e2, e2?.message);
  const { data: row2 } = await db.from("products").select(PRODUCT_GRAPH_SELECT).eq("id", TEST_ID).maybeSingle();
  const p2 = row2 ? normalizeProduct(row2) : null;
  check("variants replaced, not appended", p2?.variants.length === 1, String(p2?.variants.length));
  check("notes replaced, not appended", p2?.notes.top.length === 1 && p2?.notes.heart.length === 0);

  await cleanup();
  const { data: gone } = await db.from("products").select("id").eq("id", TEST_ID);
  check("cleanup: test product removed", (gone || []).length === 0);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => {
  await cleanup();
  console.error("threw:", e.message);
  process.exit(1);
});
