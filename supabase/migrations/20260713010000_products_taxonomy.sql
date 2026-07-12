-- Catalog data model, step 2 of 5 — the taxonomy axes on `products`.
-- Design + ERD: docs/DATA-MODEL.md
-- Depends on: 20260713000000_catalog_entities.sql (brands, original_perfumes).
--
-- ADDITIVE. No column is dropped and no existing column changes meaning, so the
-- current frontend keeps working untouched (it reads category/sizes/ar_price,
-- all still present). Step 5 drops those, after the frontend cuts over.
--
-- There is NO legacy taxonomy to migrate — `perfume_type`, `product_category`,
-- `listing_type`, `gender`, `season` etc. never existed in this database (see
-- docs/DATA-MODEL.md §6). The 3 live products are therefore classified by hand
-- below, from their own names.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. THE AXES
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS slug                text,
  ADD COLUMN IF NOT EXISTS status              text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS brand_id            uuid REFERENCES public.brands(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS line                text,
  ADD COLUMN IF NOT EXISTS original_perfume_id uuid REFERENCES public.original_perfumes(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS product_type        text,
  ADD COLUMN IF NOT EXISTS audience            text,
  ADD COLUMN IF NOT EXISTS classification      text,
  ADD COLUMN IF NOT EXISTS concentration       text,
  ADD COLUMN IF NOT EXISTS longevity           text,
  ADD COLUMN IF NOT EXISTS sillage             text,
  ADD COLUMN IF NOT EXISTS families            text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seasons             text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags                text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS images              text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at          timestamptz NOT NULL DEFAULT timezone('utc'::text, now());

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. SEED original_perfumes — the three we actually stock.
--    ⚠ `year` and `families` are best-effort and admin-editable. Verify.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.original_perfumes (slug, brand_id, name_en, name_ar, audience, year, families)
SELECT v.slug, b.id, v.name_en, v.name_ar, v.audience, v.year, v.families
FROM (VALUES
  ('si-passione',           'giorgio-armani',     'Sì Passione',           'سي باشيون', 'women', 2017, ARRAY['floral','fruity']),
  ('sauvage-eau-de-parfum', 'dior',               'Sauvage Eau de Parfum', 'سوفاج',     'men',   2018, ARRAY['fresh','spicy','woody']),
  ('scandal',               'jean-paul-gaultier', 'Scandal',               'سكاندال',   'women', 2017, ARRAY['gourmand','floral'])
) AS v(slug, brand_slug, name_en, name_ar, audience, year, families)
JOIN public.brands b ON b.slug = v.brand_slug
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. BACKFILL the 3 live products.
--    All three are genuine designer bottles we resell => line = 'original',
--    each mapped to its registry row from §2.
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE public.products p
SET
  slug = regexp_replace(
           regexp_replace(lower(p.en_name), '[^a-z0-9]+', '-', 'g'),
           '(^-+|-+$)', '', 'g'),
  status              = 'active',
  line                = 'original',
  product_type        = 'perfume',
  classification      = 'designer',
  concentration       = 'edp',
  images              = CASE WHEN p.image IS NOT NULL AND p.image <> '' THEN ARRAY[p.image] ELSE '{}' END,
  brand_id            = o.brand_id,
  audience            = o.audience,
  families            = o.families,
  original_perfume_id = o.id
FROM public.original_perfumes o
WHERE o.slug = CASE p.id
                 WHEN '1' THEN 'si-passione'
                 WHEN '2' THEN 'sauvage-eau-de-parfum'
                 WHEN '3' THEN 'scandal'
               END;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. CONSTRAINTS — applied AFTER the backfill so existing rows can satisfy them.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_status_allowed;
ALTER TABLE public.products ADD CONSTRAINT products_status_allowed
  CHECK (status IN ('draft', 'active', 'archived'));

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_line_allowed;
ALTER TABLE public.products ADD CONSTRAINT products_line_allowed
  CHECK (line IN ('original', 'inspired', 'signature'));

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_product_type_allowed;
ALTER TABLE public.products ADD CONSTRAINT products_product_type_allowed
  CHECK (product_type IN ('perfume', 'candle', 'air-freshener', 'set', 'sample', 'bakhoor'));

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_audience_allowed;
ALTER TABLE public.products ADD CONSTRAINT products_audience_allowed
  CHECK (audience IN ('men', 'women', 'unisex'));

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_classification_allowed;
ALTER TABLE public.products ADD CONSTRAINT products_classification_allowed
  CHECK (classification IS NULL OR classification IN ('designer', 'niche', 'arabian', 'celebrity'));

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_concentration_allowed;
ALTER TABLE public.products ADD CONSTRAINT products_concentration_allowed
  CHECK (concentration IS NULL OR concentration IN ('parfum', 'edp', 'edt', 'edc', 'attar', 'mist'));

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_longevity_allowed;
ALTER TABLE public.products ADD CONSTRAINT products_longevity_allowed
  CHECK (longevity IS NULL OR longevity IN ('light', 'moderate', 'long', 'eternal'));

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_sillage_allowed;
ALTER TABLE public.products ADD CONSTRAINT products_sillage_allowed
  CHECK (sillage IS NULL OR sillage IN ('intimate', 'moderate', 'strong', 'enormous'));

-- Array members must come from the closed vocabulary — an array column is not
-- an excuse to let junk in.
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_families_allowed;
ALTER TABLE public.products ADD CONSTRAINT products_families_allowed
  CHECK (families <@ ARRAY['floral','woody','oriental','fresh','citrus','gourmand',
                           'spicy','aquatic','leather','musk','oud','fruity']);

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_seasons_allowed;
ALTER TABLE public.products ADD CONSTRAINT products_seasons_allowed
  CHECK (seasons <@ ARRAY['spring','summer','fall','winter']);

-- ── The line ⇄ original_perfume_id relationship ────────────────────────────
--
-- A Signature product is bespoke — it is inspired by nothing.
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_signature_has_no_original;
ALTER TABLE public.products ADD CONSTRAINT products_signature_has_no_original
  CHECK (line <> 'signature' OR original_perfume_id IS NULL);

-- A PERFUME that is Original or Inspired must resolve to a registry row:
-- 'original' => this product IS that original; 'inspired' => it copies it.
-- Scoped to perfumes on purpose — an inspired CANDLE has no original perfume
-- to point at, but still carries a line (it's our own make).
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_perfume_line_needs_original;
ALTER TABLE public.products ADD CONSTRAINT products_perfume_line_needs_original
  CHECK (
    product_type <> 'perfume'
    OR line NOT IN ('original', 'inspired')
    OR original_perfume_id IS NOT NULL
  );

-- ── Required once backfilled ───────────────────────────────────────────────
ALTER TABLE public.products
  ALTER COLUMN slug         SET NOT NULL,
  ALTER COLUMN brand_id     SET NOT NULL,
  ALTER COLUMN line         SET NOT NULL,
  ALTER COLUMN product_type SET NOT NULL,
  ALTER COLUMN audience     SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS products_slug_key ON public.products (slug);

-- Filter facets — the storefront's hot path.
CREATE INDEX IF NOT EXISTS products_brand_id_idx            ON public.products (brand_id);
CREATE INDEX IF NOT EXISTS products_original_perfume_id_idx ON public.products (original_perfume_id);
CREATE INDEX IF NOT EXISTS products_facets_idx              ON public.products (status, line, product_type, audience);
CREATE INDEX IF NOT EXISTS products_families_gin            ON public.products USING gin (families);
CREATE INDEX IF NOT EXISTS products_seasons_gin             ON public.products USING gin (seasons);
CREATE INDEX IF NOT EXISTS products_tags_gin                ON public.products USING gin (tags);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. updated_at
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_touch_updated_at ON public.products;
CREATE TRIGGER products_touch_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. product_families_effective — explicit families, else derived from notes.
--    Automation by default, perfumer override when note arithmetic is wrong.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.product_families_effective AS
SELECT
  p.id AS product_id,
  COALESCE(
    NULLIF(p.families, '{}'),
    (SELECT array_agg(DISTINCT n.family ORDER BY n.family)
       FROM public.product_notes pn
       JOIN public.notes n ON n.id = pn.note_id
      WHERE pn.product_id = p.id),
    '{}'
  ) AS families,
  p.families <> '{}' AS is_override
FROM public.products p;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. VALIDATION
-- ═══════════════════════════════════════════════════════════════════════════

-- Prove the CHECKs actually bite: each of these SHOULD fail. If one succeeds,
-- the constraint is not doing its job.
DO $$
DECLARE
  passed int := 0;
BEGIN
  -- a signature product may not reference an original
  BEGIN
    INSERT INTO public.products (id, category, image, ar_name, en_name, slug, brand_id, line, product_type, audience, original_perfume_id)
    SELECT '__probe_a', 'perfumes', 'x', 'x', 'x', '__probe_a', b.id, 'signature', 'perfume', 'unisex', o.id
    FROM public.brands b, public.original_perfumes o WHERE b.slug='tibr' AND o.slug='scandal' LIMIT 1;
    RAISE EXCEPTION 'CONSTRAINT HOLE: signature product accepted an original_perfume_id';
  EXCEPTION WHEN check_violation THEN passed := passed + 1;
  END;

  -- an inspired PERFUME must reference an original
  BEGIN
    INSERT INTO public.products (id, category, image, ar_name, en_name, slug, brand_id, line, product_type, audience)
    SELECT '__probe_b', 'perfumes', 'x', 'x', 'x', '__probe_b', b.id, 'inspired', 'perfume', 'men'
    FROM public.brands b WHERE b.slug='tibr';
    RAISE EXCEPTION 'CONSTRAINT HOLE: inspired perfume accepted a NULL original_perfume_id';
  EXCEPTION WHEN check_violation THEN passed := passed + 1;
  END;

  -- ...but an inspired CANDLE may not (that's the point of scoping to perfume)
  BEGIN
    INSERT INTO public.products (id, category, image, ar_name, en_name, slug, brand_id, line, product_type, audience)
    SELECT '__probe_c', 'perfumes', 'x', 'x', 'x', '__probe_c', b.id, 'inspired', 'candle', 'unisex'
    FROM public.brands b WHERE b.slug='tibr';
    passed := passed + 1;                       -- expected to SUCCEED
    DELETE FROM public.products WHERE id = '__probe_c';
  EXCEPTION WHEN check_violation THEN
    RAISE EXCEPTION 'TOO STRICT: an inspired candle was rejected for having no original perfume';
  END;

  -- junk may not enter the families array
  BEGIN
    UPDATE public.products SET families = ARRAY['not-a-family'] WHERE id = '1';
    RAISE EXCEPTION 'CONSTRAINT HOLE: families accepted a value outside the vocabulary';
  EXCEPTION WHEN check_violation THEN passed := passed + 1;
  END;

  RAISE NOTICE 'constraint probes passed: %/4', passed;
END $$;

SELECT 'products: all classified'          AS check, count(*) AS actual, 3 AS expected,
       CASE WHEN count(*) = 3 THEN 'PASS' ELSE 'FAIL' END AS result
FROM public.products
WHERE brand_id IS NOT NULL AND line IS NOT NULL AND audience IS NOT NULL
  AND product_type IS NOT NULL AND slug IS NOT NULL AND status = 'active'
UNION ALL
SELECT 'products: slugs unique', count(DISTINCT slug), 3,
       CASE WHEN count(DISTINCT slug) = 3 THEN 'PASS' ELSE 'FAIL' END FROM public.products
UNION ALL
SELECT 'products: images backfilled', count(*), 3,
       CASE WHEN count(*) = 3 THEN 'PASS' ELSE 'FAIL' END
FROM public.products WHERE array_length(images, 1) = 1
UNION ALL
SELECT 'original_perfumes seeded', count(*), 3,
       CASE WHEN count(*) = 3 THEN 'PASS' ELSE 'FAIL' END FROM public.original_perfumes
UNION ALL
SELECT 'every product resolves to its original', count(*), 3,
       CASE WHEN count(*) = 3 THEN 'PASS' ELSE 'FAIL' END
FROM public.products p JOIN public.original_perfumes o ON o.id = p.original_perfume_id
UNION ALL
SELECT 'brand_id agrees with the original''s house', count(*), 3,
       CASE WHEN count(*) = 3 THEN 'PASS' ELSE 'FAIL' END
FROM public.products p JOIN public.original_perfumes o ON o.id = p.original_perfume_id
WHERE p.brand_id = o.brand_id
UNION ALL
SELECT 'families view returns a row per product', count(*), 3,
       CASE WHEN count(*) = 3 THEN 'PASS' ELSE 'FAIL' END FROM public.product_families_effective
UNION ALL
SELECT 'no probe rows left behind', count(*), 0,
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
FROM public.products WHERE id LIKE '__probe%';

-- The classified catalogue.
SELECT p.id, p.slug, b.name_en AS brand, p.line, p.product_type, p.audience,
       p.classification, p.concentration, p.families, o.name_en AS original
FROM public.products p
JOIN public.brands b ON b.id = p.brand_id
LEFT JOIN public.original_perfumes o ON o.id = p.original_perfume_id
ORDER BY p.id;
