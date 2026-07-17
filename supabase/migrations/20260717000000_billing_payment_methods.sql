-- Phase 2 billing: saved wallet payment handles + per-user billing details.
-- Both mirror addresses'/wishlist' RLS shape — a user only ever sees or writes
-- their own rows, enforced at the database (auth.uid() = user_id).
--
-- NO card data and NO PCI scope: payment_methods stores mobile-wallet handles
-- only (a Vodafone Cash phone number or an InstaPay address). Real card
-- payments are a separate track (a gateway integration), not this table.
--
-- Idempotent: IF NOT EXISTS / DROP POLICY IF EXISTS so a re-run is a no-op.

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type       text NOT NULL CHECK (type IN ('vodafone_cash', 'instapay')),
  handle     text NOT NULL,
  label      text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own payment methods" ON public.payment_methods;
CREATE POLICY "Users can manage their own payment methods"
  ON public.payment_methods FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS payment_methods_user_id_idx ON public.payment_methods (user_id);

-- One billing profile per user, so the PK IS the user_id (upsert on conflict).
CREATE TABLE IF NOT EXISTS public.billing_details (
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name   text,
  company     text,
  tax_id      text,
  governorate text,
  city        text,
  street      text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.billing_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own billing details" ON public.billing_details;
CREATE POLICY "Users can manage their own billing details"
  ON public.billing_details FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Self-validating PASS/FAIL (FAILs sort to the top) ───────────────────────
SELECT
  t.check,
  t.pass,
  CASE WHEN t.pass THEN 'PASS' ELSE 'FAIL' END AS status
FROM (
  SELECT 'payment_methods table exists'    AS check,
         to_regclass('public.payment_methods') IS NOT NULL AS pass
  UNION ALL SELECT 'billing_details table exists',
         to_regclass('public.billing_details') IS NOT NULL
  UNION ALL SELECT 'payment_methods RLS enabled',
         (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.payment_methods'::regclass)
  UNION ALL SELECT 'billing_details RLS enabled',
         (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.billing_details'::regclass)
  UNION ALL SELECT 'payment_methods policy present',
         EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payment_methods')
  UNION ALL SELECT 'billing_details policy present',
         EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='billing_details')
  UNION ALL SELECT 'type CHECK constraint present',
         EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.payment_methods'::regclass AND contype='c')
) t
ORDER BY t.pass, t.check;
