-- Add the Shopify-style Standard Product Category to `products`. This is the
-- searchable, drill-down "Category" field in the admin product form — a
-- curated, perfume-focused slice of the Google/Shopify product taxonomy. It is
-- ADDITIVE and independent of the shop-tab taxonomy (listing_type /
-- fragrance_category / sample_type), matching how Shopify's product category is
-- separate from collections.
--
-- Run in: Supabase Dashboard → SQL Editor → New query
--
-- The stored value is a stable leaf/branch slug from
-- client/src/lib/productTaxonomy.js (e.g. 'eau-de-parfum', 'candles'). The tree
-- lives in app code, so there is no CHECK constraint here — the admin UI only
-- ever submits known ids, and keeping the list in one place avoids drift.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_category text;
