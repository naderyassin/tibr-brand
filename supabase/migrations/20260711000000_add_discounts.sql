-- Discount codes (admin-managed) + the columns orders need to record which
-- discount, if any, was applied at checkout.
--
-- v2: full Shopify-parity discount classes (order / product / buy_x_get_y /
-- shipping), the code-vs-automatic method toggle, product targeting, and
-- customer eligibility. This file has never been applied to the live
-- project, so it's edited in place rather than layered with a second
-- migration.
-- Run in: Supabase Dashboard → SQL Editor → New query

CREATE TABLE public.discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text,
  -- Percentage (0-100) or fixed EGP amount off. Only meaningful for the
  -- 'order'/'product' classes — null for 'shipping' and 'buy_x_get_y'
  -- (which use get_discount_type/get_discount_value instead).
  type text CHECK (type IS NULL OR type IN ('percentage', 'fixed')),
  value numeric NOT NULL DEFAULT 0,
  min_purchase numeric,             -- null = no minimum order amount
  usage_limit integer,              -- null = unlimited total uses
  used_count integer NOT NULL DEFAULT 0,
  one_per_customer boolean NOT NULL DEFAULT false,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,              -- null = never expires
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ── Discount class + method — the two axes Shopify's "Select discount
-- type" modal and the code/automatic toggle represent. ─────────────────────

ALTER TABLE public.discounts
  ADD COLUMN IF NOT EXISTS discount_class text NOT NULL DEFAULT 'order';
ALTER TABLE public.discounts DROP CONSTRAINT IF EXISTS discounts_class_allowed;
ALTER TABLE public.discounts
  ADD CONSTRAINT discounts_class_allowed
  CHECK (discount_class IN ('order', 'product', 'buy_x_get_y', 'shipping'));

ALTER TABLE public.discounts
  ADD COLUMN IF NOT EXISTS method text NOT NULL DEFAULT 'code';
ALTER TABLE public.discounts DROP CONSTRAINT IF EXISTS discounts_method_allowed;
ALTER TABLE public.discounts
  ADD CONSTRAINT discounts_method_allowed
  CHECK (method IN ('code', 'automatic'));

ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS title text;

-- `code` is nullable (automatic discounts have a Title, never a Code) and
-- unique only when present — a partial unique index, not a column-level
-- UNIQUE constraint (which would allow only one NULL).
DROP INDEX IF EXISTS discounts_code_unique_idx;
CREATE UNIQUE INDEX discounts_code_unique_idx
  ON public.discounts (code) WHERE code IS NOT NULL;

ALTER TABLE public.discounts DROP CONSTRAINT IF EXISTS discounts_method_fields_valid;
ALTER TABLE public.discounts
  ADD CONSTRAINT discounts_method_fields_valid
  CHECK (
    (method = 'code'      AND code  IS NOT NULL AND title IS NULL)
    OR
    (method = 'automatic' AND title IS NOT NULL AND code IS NULL)
  );

-- ── Product targeting ("Applies to") — Product class only. Order class
-- always targets the whole cart; Buy X Get Y has its own buy_/get_
-- targeting below; Shipping class ignores these. No "specific collections"
-- option — this codebase has no Collections entity (categories are flat
-- CHECK-constraint enums, not a joinable/manageable thing). ─────────────────

ALTER TABLE public.discounts
  ADD COLUMN IF NOT EXISTS applies_to text NOT NULL DEFAULT 'all';
ALTER TABLE public.discounts DROP CONSTRAINT IF EXISTS discounts_applies_to_allowed;
ALTER TABLE public.discounts
  ADD CONSTRAINT discounts_applies_to_allowed
  CHECK (applies_to IN ('all', 'specific_products'));

ALTER TABLE public.discounts
  ADD COLUMN IF NOT EXISTS product_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.discounts DROP CONSTRAINT IF EXISTS discounts_product_ids_is_array;
ALTER TABLE public.discounts
  ADD CONSTRAINT discounts_product_ids_is_array
  CHECK (jsonb_typeof(product_ids) = 'array');
  -- Array of public.products.id (text) values.

-- ── Eligibility — All customers / Specific customers only (no Markets, no
-- Customer segments: single-country store, no segment entity). Shown on
-- every class for one consistent code path. ────────────────────────────────

ALTER TABLE public.discounts
  ADD COLUMN IF NOT EXISTS eligibility text NOT NULL DEFAULT 'all';
ALTER TABLE public.discounts DROP CONSTRAINT IF EXISTS discounts_eligibility_allowed;
ALTER TABLE public.discounts
  ADD CONSTRAINT discounts_eligibility_allowed
  CHECK (eligibility IN ('all', 'specific_customers'));

ALTER TABLE public.discounts
  ADD COLUMN IF NOT EXISTS customer_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.discounts DROP CONSTRAINT IF EXISTS discounts_customer_ids_is_array;
ALTER TABLE public.discounts
  ADD CONSTRAINT discounts_customer_ids_is_array
  CHECK (jsonb_typeof(customer_ids) = 'array');
  -- Array of auth.users.id (uuid, stored as text) — registered users only.
  -- Guests have no stable identity and can never be targeted.

-- ── Buy X Get Y — the one class that doesn't fit the shared type/value
-- shape. "Customer buys" + "Customer gets" are independent targeting +
-- pricing sub-structures. ───────────────────────────────────────────────────

ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS buy_type text;
ALTER TABLE public.discounts DROP CONSTRAINT IF EXISTS discounts_buy_type_allowed;
ALTER TABLE public.discounts
  ADD CONSTRAINT discounts_buy_type_allowed
  CHECK (buy_type IS NULL OR buy_type IN ('quantity', 'amount'));

ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS buy_quantity integer;
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS buy_amount numeric;

ALTER TABLE public.discounts
  ADD COLUMN IF NOT EXISTS buy_applies_to text NOT NULL DEFAULT 'all';
ALTER TABLE public.discounts DROP CONSTRAINT IF EXISTS discounts_buy_applies_to_allowed;
ALTER TABLE public.discounts
  ADD CONSTRAINT discounts_buy_applies_to_allowed
  CHECK (buy_applies_to IN ('all', 'specific_products'));

ALTER TABLE public.discounts
  ADD COLUMN IF NOT EXISTS buy_product_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.discounts DROP CONSTRAINT IF EXISTS discounts_buy_product_ids_is_array;
ALTER TABLE public.discounts
  ADD CONSTRAINT discounts_buy_product_ids_is_array
  CHECK (jsonb_typeof(buy_product_ids) = 'array');

ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS get_quantity integer;

ALTER TABLE public.discounts
  ADD COLUMN IF NOT EXISTS get_product_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.discounts DROP CONSTRAINT IF EXISTS discounts_get_product_ids_is_array;
ALTER TABLE public.discounts
  ADD CONSTRAINT discounts_get_product_ids_is_array
  CHECK (jsonb_typeof(get_product_ids) = 'array');
  -- Unlike buy_product_ids, there is no "all" option — Shopify always
  -- requires an explicit product pick for "Customer gets", and so do we.

ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS get_discount_type text;
ALTER TABLE public.discounts DROP CONSTRAINT IF EXISTS discounts_get_discount_type_allowed;
ALTER TABLE public.discounts
  ADD CONSTRAINT discounts_get_discount_type_allowed
  CHECK (get_discount_type IS NULL OR get_discount_type IN ('percentage', 'fixed', 'free'));

ALTER TABLE public.discounts
  ADD COLUMN IF NOT EXISTS get_discount_value numeric NOT NULL DEFAULT 0;

ALTER TABLE public.discounts
  ADD COLUMN IF NOT EXISTS buy_x_get_y_max_uses_per_order integer;
  -- null = unlimited repeats within one order (still bounded by cart qty).

-- Class-specific *required-field* validation (e.g. "buy_quantity required
-- when buy_type = 'quantity'") is intentionally not encoded as SQL CHECKs —
-- matches this codebase's existing convention (products.fragrance_category
-- is only conditionally required, enforced in validateProductPayload, not a
-- DB constraint). Same approach here, in validateDiscountPayload.

ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;

-- Admin-only. Discount codes are looked up at checkout via the server's
-- service-role client (bypasses RLS), so shoppers never need direct table
-- access — this also stops codes from being enumerable via the client SDK.
CREATE POLICY "Admins can view discounts" ON public.discounts
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert discounts" ON public.discounts
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update discounts" ON public.discounts
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete discounts" ON public.discounts
  FOR DELETE USING (public.is_admin(auth.uid()));

-- Record which discount (if any) applied to an order.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric,
  ADD COLUMN IF NOT EXISTS discount_id uuid REFERENCES public.discounts(id),
  -- Always populated when a discount applied — the code for method='code'
  -- orders, the title for method='automatic' ones — so admin order views
  -- have one reliable display field regardless of method. discount_code
  -- stays populated only for method='code' orders.
  ADD COLUMN IF NOT EXISTS discount_title text;
