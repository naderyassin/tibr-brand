-- Add the taxonomy columns the new shop tabs (Fragrances, Sample & Travel Size,
-- Bundle, Shop by Brand) already read but that never existed on `products`.
-- Run in: Supabase Dashboard → SQL Editor → New query

-- 1. Brand (free text) — powers the Shop by Brand A-Z directory + the brand
--    line on product cards.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand text;

-- 2. Which of the 3 taxonomy-bearing tabs a product belongs to.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS listing_type text;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_listing_type_allowed;

ALTER TABLE public.products
  ADD CONSTRAINT products_listing_type_allowed
  CHECK (listing_type IS NULL OR listing_type IN ('fragrance', 'sample', 'bundle'));

-- 3. Fragrances dropdown slug — also used by Bundle, which reuses the same
--    submenu shape.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS fragrance_category text;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_fragrance_category_allowed;

ALTER TABLE public.products
  ADD CONSTRAINT products_fragrance_category_allowed
  CHECK (fragrance_category IS NULL OR fragrance_category IN (
    'men', 'women', 'unisex', 'gulf', 'sets', 'air-fresheners', 'candles'
  ));

-- 4. Sample & Travel Size dropdown slug.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sample_type text;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_sample_type_allowed;

ALTER TABLE public.products
  ADD CONSTRAINT products_sample_type_allowed
  CHECK (sample_type IS NULL OR sample_type IN ('special', 'travel'));

-- 5. Backfill existing rows so they don't disappear from the shop: today
--    every row is a legacy perfume, so treat it as a Fragrance. Brand and
--    fragrance_category are left NULL — the admin fills them in per-product
--    after this deploys (they'll fail the app-level "required" validation
--    the next time each one is edited, same pattern as the perfume_type
--    backfill in 20260704000000_add_category_taxonomy.sql).
UPDATE public.products
SET listing_type = 'fragrance'
WHERE listing_type IS NULL;
