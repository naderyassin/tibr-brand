-- Add real category taxonomy: perfumes (original/inspired/signature) + bakhoor,
-- home fragrance, body splash.
-- Run in: Supabase Dashboard → SQL Editor → New query

-- 1. Re-add the gender/olfactory-family sub-category chain (3 levels).
--    Note: sub_category_2 and sub_category_3 never existed as columns before
--    this migration — the admin form has been sending them into the void
--    since inception.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sub_category   text,
  ADD COLUMN IF NOT EXISTS sub_category_2 text,
  ADD COLUMN IF NOT EXISTS sub_category_3 text;

-- 2. New, independent axis: perfume_type (original / inspired / signature).
--    Only meaningful when category = 'perfumes'; NULL for the other 3.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS perfume_type text;

-- 3. Widen the category CHECK constraint to the 4 top-level categories.
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_category_perfumes_only;

ALTER TABLE public.products
  ADD CONSTRAINT products_category_allowed
  CHECK (category IN ('perfumes', 'bakhoor', 'home_fragrance', 'body_splash'));

-- 4. Constrain perfume_type to the 3 known values (or NULL for non-perfume rows).
ALTER TABLE public.products
  ADD CONSTRAINT products_perfume_type_allowed
  CHECK (perfume_type IS NULL OR perfume_type IN ('original', 'inspired', 'signature'));

-- 5. Backfill existing perfume rows BEFORE requiring perfume_type below, so the
--    NOT-NULL-via-CHECK constraint doesn't reject them.
--    ⚠ Admin: these are genuine designer perfumes (Si Passione Giorgio Armani,
--    Sauvage EDP Dior, Scandal) so 'original' is the reasonable default —
--    double-check after deploy in case any should be 'inspired'.
UPDATE public.products
SET perfume_type = 'original'
WHERE category = 'perfumes' AND perfume_type IS NULL;

-- 6. Require perfume_type when category = 'perfumes'.
ALTER TABLE public.products
  ADD CONSTRAINT products_perfume_type_required_for_perfumes
  CHECK (category != 'perfumes' OR perfume_type IS NOT NULL);
