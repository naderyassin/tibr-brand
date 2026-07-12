-- Catalog data model, step 4b of 5 — retire the legacy per-line columns.
--
-- ⚠⚠ DESTRUCTIVE. DO NOT RUN UNTIL ALL OF THE FOLLOWING ARE TRUE:
--   1. 20260713030000_orders_line_items.sql has been applied.
--   2. The new server.js checkout (orders + order_items) is deployed and has
--      successfully placed at least one real order.
--   3. You have a snapshot/export of `orders`.
--
-- This is the ONLY step in the whole data-model migration that destroys data.
-- Everything before it was additive. It:
--
--   • DELETEs the redundant sibling rows — the rows that were never an order in
--     their own right, only extra lines of one (same checkout_reference). Their
--     content already lives in order_items, copied there by step 4a.
--   • DROPs orders.product_id, size, qty, unit_price, order_total — the per-line
--     columns that have no meaning on an order-level row.
--
-- After this, the old checkout code path CANNOT write an order. That is
-- intended: by the time you run this, it is no longer the code path.
--
-- Reversal: recreate the columns and repopulate from order_items (the data is
-- all there). The sibling rows are NOT recoverable — but they were duplicates
-- carrying no unique information.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Refuse to run if step 4a hasn't landed, or if any order would be left
--    with no line items. Better to abort loudly than to shred history.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  orphans int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'order_items'
  ) THEN
    RAISE EXCEPTION 'ABORT: order_items does not exist — run 20260713030000 first.';
  END IF;

  SELECT count(*) INTO orphans
  FROM public.orders o
  WHERE NOT EXISTS (SELECT 1 FROM public.order_items i WHERE i.order_id = o.id)
    AND o.id IN (
      SELECT first_value(id) OVER (
               PARTITION BY COALESCE(checkout_reference::text, id::text)
               ORDER BY created_at, id)
      FROM public.orders
    );

  IF orphans > 0 THEN
    RAISE EXCEPTION
      'ABORT: % canonical order(s) have no line items. Step 4a did not back them up.', orphans;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Collapse the sibling rows. Their lines are already in order_items.
-- ═══════════════════════════════════════════════════════════════════════════

DELETE FROM public.orders o
WHERE o.id <> (
  SELECT first_value(x.id) OVER (
           PARTITION BY COALESCE(x.checkout_reference::text, x.id::text)
           ORDER BY x.created_at, x.id)
  FROM public.orders x
  WHERE COALESCE(x.checkout_reference::text, x.id::text)
      = COALESCE(o.checkout_reference::text, o.id::text)
  LIMIT 1
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Drop the per-line columns. `orders` is an order now, not a line.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.orders
  DROP COLUMN IF EXISTS product_id,
  DROP COLUMN IF EXISTS size,
  DROP COLUMN IF EXISTS qty,
  DROP COLUMN IF EXISTS unit_price,
  DROP COLUMN IF EXISTS order_total;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. VALIDATION
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 'legacy per-line columns removed' AS check, count(*)::int AS actual, 0 AS expected,
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders'
  AND column_name IN ('product_id', 'size', 'qty', 'unit_price', 'order_total')
UNION ALL
SELECT 'one row per checkout_reference', count(*)::int, 0,
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
FROM (
  SELECT checkout_reference FROM public.orders WHERE checkout_reference IS NOT NULL
  GROUP BY checkout_reference HAVING count(*) > 1
) d
UNION ALL
SELECT 'every order still has its lines', count(*)::int, 0,
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
FROM public.orders o
WHERE NOT EXISTS (SELECT 1 FROM public.order_items i WHERE i.order_id = o.id);
