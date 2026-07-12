-- Catalog data model, step 1 of 5 — the entity tables.
-- Design + ERD: docs/DATA-MODEL.md
-- Run in: Supabase Dashboard → SQL Editor → New query
--
-- ADDITIVE ONLY. Nothing is dropped and no existing column changes meaning, so
-- this is safe to apply while the current frontend is still live — it keeps
-- reading the old columns and never sees these tables.
--
-- ⚠ THE LIVE SCHEMA IS NOT WHAT THIS DIRECTORY IMPLIES. Verified against the
-- project on 2026-07-12: `products` is exactly
--   id, category, sizes, image, ar_name, ar_desc, ar_price,
--   en_name, en_desc, en_price, created_at, quantity, review_avg, review_count
-- Every migration from 20260704 onward was written but NEVER APPLIED, so
-- `brand`, `perfume_type`, `listing_type`, `fragrance_category`, `sample_type`,
-- `product_category`, `perfume_classification`, `gender`, `season` and
-- `is_egyptian_brand` DO NOT EXIST, and neither does the `discounts` table.
-- (That is also why server.js carries OPTIONAL_PRODUCT_COLUMNS and
-- insertOrdersCompat — shims for a DB that never matched its migrations.)
--
-- The upside: there is no legacy taxonomy to backfill. This file therefore
-- seeds nothing from those phantom columns, and step 5's destructive pass
-- shrinks to `category`, `sizes`, `quantity`, `ar_price`/`en_price`, `image`.
--
-- Depends on: public.is_admin(uuid) — verified present.
--
-- Step 2 (new columns on `products` + families view) and step 4 (orders →
-- order_items) are separate files.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. BRANDS — the real maker. An Inspired product's brand is TIBR, never Dior;
--    the Dior relationship is expressed through original_perfumes (§3).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.brands (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text NOT NULL UNIQUE,
  name_en    text NOT NULL,
  name_ar    text,
  logo_url   text,
  country    text,                                  -- ISO-3166-1 alpha-2. 'EG' replaces products.is_egyptian_brand.
  is_house   boolean NOT NULL DEFAULT false,        -- true for TIBR itself
  sort       integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. NOTES — the olfactory pyramid. Seeded from the 500-entry bilingual
--    NOTES_CATALOG currently hardcoded in client/src/pages/AdminProduct.jsx.
--    `family` is that catalog's group key, which is what makes
--    product_families_effective (step 2) able to derive families from notes.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text NOT NULL UNIQUE,
  name_en    text NOT NULL,
  name_ar    text,
  family     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- `layer`, not `position` — POSITION is a reserved word in Postgres and would
-- need quoting at every call site.
CREATE TABLE IF NOT EXISTS public.product_notes (
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  note_id    uuid NOT NULL REFERENCES public.notes(id)    ON DELETE RESTRICT,
  layer      text NOT NULL CHECK (layer IN ('top', 'heart', 'base')),
  sort       integer NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, note_id, layer)
);

-- Powers "shop by note" (/shop/notes/oud) — the reverse lookup.
CREATE INDEX IF NOT EXISTS product_notes_note_id_idx ON public.product_notes (note_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ORIGINAL PERFUMES — the registry. A SUPERSET of what we stock: a row can
--    exist purely as the reference target of an Inspired product we make,
--    without ever being sold as a product itself.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.original_perfumes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text NOT NULL UNIQUE,
  brand_id   uuid NOT NULL REFERENCES public.brands(id) ON DELETE RESTRICT,
  name_en    text NOT NULL,
  name_ar    text,
  audience   text NOT NULL CHECK (audience IN ('men', 'women', 'unisex')),
  year       integer,
  families   text[] NOT NULL DEFAULT '{}',
  image_url  text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS original_perfumes_brand_id_idx ON public.original_perfumes (brand_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. COLLECTIONS — marketing/seasonal groupings (Ramadan, Limited Edition).
--    Deliberately SEPARATE from products.line (original/inspired/signature):
--    line is structural and exactly-one; a collection is promotional and
--    many-to-many. See docs/DATA-MODEL.md §2.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.collections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text NOT NULL UNIQUE,
  name_en    text NOT NULL,
  name_ar    text,
  description_en text,
  description_ar text,
  image_url  text,
  starts_at  timestamptz,                           -- null = always on
  ends_at    timestamptz,                           -- null = never expires
  active     boolean NOT NULL DEFAULT true,
  sort       integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.product_collections (
  product_id    text NOT NULL REFERENCES public.products(id)    ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  sort          integer NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, collection_id)
);

CREATE INDEX IF NOT EXISTS product_collections_collection_id_idx
  ON public.product_collections (collection_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. PRODUCT VARIANTS — price, stock and SKU are per-size, not per-product.
--    This is what lets 50ml sell out while 100ml stays in stock, and what lets
--    a discount target one size.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.product_variants (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size_label       text NOT NULL,                   -- '50ml', 'One size'
  size_ml          numeric,                         -- nullable: candles/sets have no ml. Used for sorting.
  sku              text UNIQUE,
  price            numeric(10,2) NOT NULL CHECK (price >= 0),
  compare_at_price numeric(10,2) CHECK (compare_at_price IS NULL OR compare_at_price >= price),
  quantity         integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  is_default       boolean NOT NULL DEFAULT false,
  sort             integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (product_id, size_label)
);

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON public.product_variants (product_id);

-- At most one default variant per product — the one the PDP preselects and the
-- one legacy orders backfill against in step 4.
CREATE UNIQUE INDEX IF NOT EXISTS product_variants_one_default_idx
  ON public.product_variants (product_id) WHERE is_default;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. RLS — catalog tables are world-readable (the storefront reads them with
--    the anon key); writes are admin-only. Mirrors the products/discounts
--    policy shape, using the existing public.is_admin(uuid).
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'brands', 'notes', 'product_notes', 'original_perfumes',
    'collections', 'product_collections', 'product_variants'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS "%s are viewable by everyone" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s are viewable by everyone" ON public.%I FOR SELECT USING (true)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "Admins can write %s" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "Admins can write %s" ON public.%I FOR ALL '
      'USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))', t, t);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. SEED — brands.
--
--    There is NO products.brand column to seed from (see the header), so this
--    seeds the house brand plus the three designer houses the three live
--    products actually belong to. Products get their brand_id in step 2.
-- ═══════════════════════════════════════════════════════════════════════════

-- The house brand. Every Inspired and Signature product points here.
INSERT INTO public.brands (slug, name_en, name_ar, country, is_house, sort) VALUES
  ('tibr', 'TIBR', 'تبر', 'EG', true, -1)
ON CONFLICT (slug) DO NOTHING;

-- The houses behind the three products currently in the catalogue
-- (Si Passione → Armani, Sauvage EDP → Dior, Scandal → Jean Paul Gaultier).
INSERT INTO public.brands (slug, name_en, name_ar, country) VALUES
  ('giorgio-armani',     'Giorgio Armani',     'جورجيو أرماني',  'IT'),
  ('dior',               'Dior',               'ديور',           'FR'),
  ('jean-paul-gaultier', 'Jean Paul Gaultier', 'جان بول غوتييه', 'FR')
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. BACKFILL — one variant per existing product per size.
--
--    ⚠ ADMIN ACTION REQUIRED AFTER THIS RUNS. A product with sizes
--    ["50ml","100ml"] becomes two variants AT THE SAME PRICE and with the
--    product's stock count duplicated onto EACH — because the old schema
--    simply never recorded per-size price or per-size stock. There is no way
--    to recover that data; it has to be re-entered.
--
--    Verified against live data — all 3 products are multi-size, so ALL of
--    them need a manual pricing/stock pass. Expect exactly 11 variant rows:
--      id 1  Si Passione     [25,50,100,200]ml  price 10000  qty 3  -> 4 rows
--      id 2  Sauvage EDP     [25,50,100,200]ml  price  9000  qty 3  -> 4 rows
--      id 3  Scandal         [50,100,150]ml     price  6000  qty 6  -> 3 rows
-- ═══════════════════════════════════════════════════════════════════════════

WITH exploded AS (
  SELECT
    p.id AS product_id,
    COALESCE(NULLIF(btrim(s.size_label), ''), 'One size') AS size_label,
    COALESCE(p.en_price, p.ar_price, 0)::numeric(10,2)    AS price,
    COALESCE(p.quantity, 0)                               AS quantity,
    s.ord
  FROM public.products p
  LEFT JOIN LATERAL (
    SELECT value AS size_label, ordinality AS ord
    FROM jsonb_array_elements_text(
           CASE WHEN jsonb_typeof(p.sizes) = 'array' THEN p.sizes ELSE '[]'::jsonb END
         ) WITH ORDINALITY AS t(value, ordinality)
  ) s ON true
),
-- LEFT JOIN LATERAL yields one NULL-size row for products with no sizes at
-- all; COALESCE above turns that into a single 'One size' variant.
deduped AS (
  SELECT DISTINCT ON (product_id, size_label)
    product_id, size_label, price, quantity, ord
  FROM exploded
  ORDER BY product_id, size_label, ord NULLS FIRST
)
INSERT INTO public.product_variants
  (product_id, size_label, size_ml, price, quantity, is_default, sort)
SELECT
  d.product_id,
  d.size_label,
  NULLIF(regexp_replace(d.size_label, '[^0-9.]', '', 'g'), '')::numeric,
  d.price,
  d.quantity,
  ROW_NUMBER() OVER (PARTITION BY d.product_id ORDER BY COALESCE(d.ord, 1)) = 1,
  COALESCE(d.ord, 1)::integer
FROM deduped d
ON CONFLICT (product_id, size_label) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. VALIDATION — run the file inside BEGIN; … ROLLBACK; first. These SELECTs
--    print the evidence; compare against `expected`, then re-run with COMMIT.
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 'brands' AS check, count(*) AS actual, 4 AS expected,
       CASE WHEN count(*) = 4 THEN 'PASS' ELSE 'FAIL' END AS result
FROM public.brands
UNION ALL
SELECT 'variants (total)', count(*), 11,
       CASE WHEN count(*) = 11 THEN 'PASS' ELSE 'FAIL' END
FROM public.product_variants
UNION ALL
SELECT 'variants: exactly one default per product', count(*), 3,
       CASE WHEN count(*) = 3 THEN 'PASS' ELSE 'FAIL' END
FROM public.product_variants WHERE is_default
UNION ALL
SELECT 'variants: every product covered', count(DISTINCT product_id), 3,
       CASE WHEN count(DISTINCT product_id) = 3 THEN 'PASS' ELSE 'FAIL' END
FROM public.product_variants
UNION ALL
SELECT 'variants: none priced 0', count(*), 0,
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
FROM public.product_variants WHERE price = 0
UNION ALL
SELECT 'variants: size_ml parsed from every label', count(*), 0,
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
FROM public.product_variants WHERE size_ml IS NULL
UNION ALL
SELECT 'RLS enabled on all 7 new tables', count(*), 7,
       CASE WHEN count(*) = 7 THEN 'PASS' ELSE 'FAIL' END
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity
  AND tablename IN ('brands','notes','product_notes','original_perfumes',
                    'collections','product_collections','product_variants')
UNION ALL
SELECT 'policies created (2 per table)', count(*), 14,
       CASE WHEN count(*) = 14 THEN 'PASS' ELSE 'FAIL' END
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('brands','notes','product_notes','original_perfumes',
                    'collections','product_collections','product_variants')
UNION ALL
SELECT 'indexes created', count(*), 4,
       CASE WHEN count(*) = 4 THEN 'PASS' ELSE 'FAIL' END
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN ('product_notes_note_id_idx', 'original_perfumes_brand_id_idx',
                    'product_collections_collection_id_idx', 'product_variants_product_id_idx');

-- The variant rows themselves — eyeball the price/qty duplication you'll be
-- fixing by hand afterwards.
SELECT product_id, size_label, size_ml, price, quantity, is_default, sort
FROM public.product_variants
ORDER BY product_id, sort;
