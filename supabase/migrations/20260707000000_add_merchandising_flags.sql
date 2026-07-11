-- Merchandising/curation flags for the new shop home page: Best Sellers,
-- Spotlight, and Perfume Categories rails all need a way for the admin to
-- manually curate which products show up in them.
-- Run in: Supabase Dashboard → SQL Editor → New query

-- 1. Best Sellers rail.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_bestseller boolean NOT NULL DEFAULT false;

-- 2. Spotlight rail + optional season tag.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_spotlight boolean NOT NULL DEFAULT false;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS season text;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_season_allowed;

ALTER TABLE public.products
  ADD CONSTRAINT products_season_allowed
  CHECK (season IS NULL OR season IN ('spring', 'summer', 'fall', 'winter'));

-- 3. Perfume Categories rail: Niche vs Design pill.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS perfume_classification text;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_perfume_classification_allowed;

ALTER TABLE public.products
  ADD CONSTRAINT products_perfume_classification_allowed
  CHECK (perfume_classification IS NULL OR perfume_classification IN ('niche', 'design'));

-- 4. Perfume Categories rail: Egyptian Brands pill.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_egyptian_brand boolean NOT NULL DEFAULT false;
