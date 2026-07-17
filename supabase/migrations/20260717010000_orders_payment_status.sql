-- Phase 3 (card payments): order payment lifecycle columns.
-- A card order is created 'pending' + 'unpaid', then a Paymob webhook flips it
-- to 'paid' (or 'failed'). COD/wallet orders keep the existing behaviour and are
-- simply backfilled to 'unpaid' (they collect on delivery / out of band).
--
-- Additive + idempotent (ADD COLUMN IF NOT EXISTS). Does NOT touch existing rows
-- beyond the DEFAULT backfill, and leaves the COD flow's own columns untouched.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status   text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS transaction_ref  text,
  ADD COLUMN IF NOT EXISTS paid_at          timestamptz;

-- Constrain the lifecycle values. Guarded so a re-run doesn't error on the dup.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_payment_status_check' AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_payment_status_check
      CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded'));
  END IF;
END $$;

-- Webhook looks orders up by their special_reference (= checkout_reference).
CREATE INDEX IF NOT EXISTS orders_checkout_reference_idx ON public.orders (checkout_reference);

-- ── Self-validating PASS/FAIL (FAILs sort to the top) ───────────────────────
SELECT
  t.check,
  t.pass,
  CASE WHEN t.pass THEN 'PASS' ELSE 'FAIL' END AS status
FROM (
  SELECT 'payment_status column exists' AS check,
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='payment_status') AS pass
  UNION ALL SELECT 'payment_provider column exists',
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='payment_provider')
  UNION ALL SELECT 'transaction_ref column exists',
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='transaction_ref')
  UNION ALL SELECT 'paid_at column exists',
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='paid_at')
  UNION ALL SELECT 'payment_status CHECK present',
         EXISTS (SELECT 1 FROM pg_constraint WHERE conname='orders_payment_status_check' AND conrelid='public.orders'::regclass)
  UNION ALL SELECT 'existing rows backfilled to unpaid',
         NOT EXISTS (SELECT 1 FROM public.orders WHERE payment_status IS NULL)
) t
ORDER BY t.pass, t.check;
