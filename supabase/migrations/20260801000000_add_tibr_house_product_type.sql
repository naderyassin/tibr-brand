-- Adds "TIBR House" as a product_type value — a new, independent top-level
-- catalog section (nav: replaces the removed "Sets & Samples" tab). Not a
-- filter/tag: it's a real taxonomy value, same footing as candle/bakhoor/etc.

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_product_type_allowed;
ALTER TABLE public.products ADD CONSTRAINT products_product_type_allowed
  CHECK (product_type IN ('perfume', 'candle', 'air-freshener', 'set', 'sample', 'bakhoor', 'tibr-house'));
