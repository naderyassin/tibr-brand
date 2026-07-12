// Seeds public.notes from client/src/lib/notesCatalog.js.
//   node scripts/seed-notes.mjs [--commit]
// Idempotent: ON CONFLICT (slug) DO UPDATE, so re-running syncs label edits.
// Without --commit it rolls back and just reports what it would do.

import { readFileSync } from "node:fs";
import pg from "pg";
import { NOTES_CATALOG } from "../client/src/lib/notesCatalog.js";
import { FAMILIES, slugify } from "../client/src/lib/taxonomy.js";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const commit = process.argv.includes("--commit");
const legalFamilies = new Set(FAMILIES.map((f) => f.slug));

// Flatten, dedupe by slug (the catalog has genuine duplicates across families,
// e.g. "Neroli" is both citrus and floral — first family wins).
const rows = [];
const seen = new Set();
for (const [family, notes] of Object.entries(NOTES_CATALOG)) {
  if (!legalFamilies.has(family)) {
    console.error(`FATAL: catalog family "${family}" is not in taxonomy.js FAMILIES.`);
    console.error("The derived-families view would emit a value products' CHECK rejects.");
    process.exit(1);
  }
  for (const n of notes) {
    const slug = slugify(n.en);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    rows.push({ slug, name_en: n.en, name_ar: n.ar || null, family });
  }
}

const byFamily = rows.reduce((a, r) => ({ ...a, [r.family]: (a[r.family] || 0) + 1 }), {});
console.log(`${commit ? "COMMIT" : "DRY RUN"} — ${rows.length} unique notes`);
console.log(Object.entries(byFamily).map(([f, n]) => `  ${f}: ${n}`).join("\n"));

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
await client.query("BEGIN");
try {
  await client.query(
    `INSERT INTO public.notes (slug, name_en, name_ar, family)
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
     ON CONFLICT (slug) DO UPDATE
       SET name_en = EXCLUDED.name_en,
           name_ar = EXCLUDED.name_ar,
           family  = EXCLUDED.family`,
    [rows.map((r) => r.slug), rows.map((r) => r.name_en),
     rows.map((r) => r.name_ar), rows.map((r) => r.family)]
  );

  const { rows: [check] } = await client.query(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE name_ar IS NULL)::int AS missing_ar,
            count(DISTINCT family)::int AS families
       FROM public.notes`
  );
  console.log(`\nnotes in DB: ${check.total} | families: ${check.families} | missing Arabic: ${check.missing_ar}`);

  if (commit) { await client.query("COMMIT"); console.log("COMMITTED."); }
  else { await client.query("ROLLBACK"); console.log("ROLLED BACK — database unchanged."); }
} catch (e) {
  await client.query("ROLLBACK");
  console.error("FAILED — rolled back.", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
