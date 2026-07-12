-- Catalog data model, step 2b — the two merchandising flags.
--
-- docs/DATA-MODEL.md's ERD lists these on `products` and AdminProduct.jsx has
-- had toggles for them since inception, but the columns never existed in the
-- database (they were in the never-applied 20260707 migration). Any product
-- save that sent them would have failed on an unknown column.
--
-- Additive, nullable-free, defaulted — safe on live rows.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_bestseller boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_spotlight  boolean NOT NULL DEFAULT false;

-- Partial indexes: these power "featured" rails, which only ever ask for the
-- true rows.
CREATE INDEX IF NOT EXISTS products_bestseller_idx ON public.products (is_bestseller) WHERE is_bestseller;
CREATE INDEX IF NOT EXISTS products_spotlight_idx  ON public.products (is_spotlight)  WHERE is_spotlight;

SELECT 'merchandising flags present' AS check,
       count(*) AS actual, 2 AS expected,
       CASE WHEN count(*) = 2 THEN 'PASS' ELSE 'FAIL' END AS result
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'products'
  AND column_name IN ('is_bestseller', 'is_spotlight');
