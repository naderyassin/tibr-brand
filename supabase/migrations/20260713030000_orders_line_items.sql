-- Catalog data model, step 4a of 5 — orders become a real entity. ADDITIVE.
-- Design: docs/DATA-MODEL.md §7 (option B)
-- Depends on: 20260713000000 (product_variants)
--
-- TODAY an "order" is not a row. It is N rows in `orders` sharing a
-- checkout_reference UUID (server.js insertOrdersCompat inserts an array), each
-- redundantly carrying order_total and the customer's name/phone/address. There
-- is no row that IS the order: no order-level status, no integrity, and the
-- total duplicated N ways.
--
-- AFTER this: `orders` is the order; `order_items` is one row per line, each
-- pointing at the VARIANT purchased. That last part is the point — without it we
-- cannot record which size was bought at which price, and checkout is currently
-- charging every size the DEFAULT variant's price.
--
-- ⚠ NOTHING IS DROPPED HERE. The legacy per-line columns (product_id, size, qty,
-- unit_price, order_total) stay in place and keep working, so the running
-- checkout does not break the moment this lands. Once the new write path is
-- live and proven, 20260713040000_orders_drop_legacy_columns.sql removes them.
-- Strangler fig, not a big-bang cutover.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ORDER ITEMS
--
--    Snapshots (name/size/price/image) are deliberate: an order is a historical
--    record. If a product is renamed, repriced or deleted next year, what the
--    customer bought must not change under them. The FKs are ON DELETE SET NULL
--    for the same reason — deleting a product must never delete history.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.order_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  variant_id     uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_id     text REFERENCES public.products(id)         ON DELETE SET NULL,
  qty            integer NOT NULL CHECK (qty > 0),
  unit_price     numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  name_snapshot  text NOT NULL,
  size_snapshot  text,
  image_snapshot text,
  created_at     timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx   ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_variant_id_idx ON public.order_items (variant_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items (product_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ORDERS gains the order-level money columns. `order_total` (duplicated onto
--    every line today) is superseded by `total`, but is NOT dropped yet.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subtotal        numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping        numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_code   text,
  ADD COLUMN IF NOT EXISTS total           numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at      timestamptz NOT NULL DEFAULT timezone('utc'::text, now());
  -- No FK to public.discounts: that table does not exist (DATA-MODEL §10).
  -- discount_code is the free-text record until it does.

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_allowed;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_allowed
  CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'));

DROP TRIGGER IF EXISTS orders_touch_updated_at ON public.orders;
CREATE TRIGGER orders_touch_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. BACKFILL history into order_items. Read-only against `orders` — no row is
--    deleted and no column is dropped. A checkout_reference group's lines all
--    attach to its EARLIEST row, which becomes the canonical order; any sibling
--    rows are left in place for now and swept in step 4b.
--
--    Legacy rows carry no variant: the old schema never recorded which size was
--    bought at which price. Match the size string to a variant where possible,
--    leave NULL where not — the snapshots preserve what the customer saw either
--    way.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TEMP TABLE _order_groups AS
SELECT
  o.id,
  first_value(o.id) OVER (
    PARTITION BY COALESCE(o.checkout_reference::text, o.id::text)
    ORDER BY o.created_at, o.id
  ) AS canonical_id
FROM public.orders o;

INSERT INTO public.order_items
  (order_id, variant_id, product_id, qty, unit_price, name_snapshot, size_snapshot, image_snapshot)
SELECT
  g.canonical_id,
  v.id,
  o.product_id,
  GREATEST(COALESCE(o.qty, 1), 1),
  COALESCE(o.unit_price, p.en_price, p.ar_price, 0),
  COALESCE(p.en_name, p.ar_name, 'Unknown product'),
  o.size,
  p.image
FROM public.orders o
JOIN _order_groups g ON g.id = o.id
LEFT JOIN public.products p ON p.id = o.product_id
LEFT JOIN public.product_variants v
       ON v.product_id = o.product_id AND v.size_label = o.size
-- Idempotent: re-running must not double-insert history.
WHERE NOT EXISTS (SELECT 1 FROM public.order_items i WHERE i.order_id = g.canonical_id);

UPDATE public.orders o
SET subtotal = i.sum_total,
    total    = i.sum_total
FROM (
  SELECT order_id, SUM(unit_price * qty)::numeric(10,2) AS sum_total
  FROM public.order_items GROUP BY order_id
) i
WHERE o.id = i.order_id AND o.total = 0;

DROP TABLE _order_groups;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. RLS — a customer sees their own lines, through their own order.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
CREATE POLICY "Users can view their own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o
             WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert their own order items" ON public.order_items;
CREATE POLICY "Users can insert their own order items" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o
             WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
CREATE POLICY "Admins can manage order items" ON public.order_items
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. VALIDATION
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 'order_items backfilled from history' AS check,
       (SELECT count(*) FROM public.order_items)::int AS actual,
       (SELECT count(*) FROM public.orders)::int AS expected,
       CASE WHEN (SELECT count(*) FROM public.order_items) >= (SELECT count(*) FROM public.orders)
            THEN 'PASS' ELSE 'FAIL' END AS result
UNION ALL
SELECT 'every order has at least one line',
       count(*)::int, 0, CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
FROM public.orders o
WHERE NOT EXISTS (SELECT 1 FROM public.order_items i WHERE i.order_id = o.id)
UNION ALL
SELECT 'no orphan line items',
       count(*)::int, 0, CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
FROM public.order_items i
WHERE NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = i.order_id)
UNION ALL
SELECT 'order total = sum of its lines',
       count(*)::int, 0, CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
FROM public.orders o
JOIN (SELECT order_id, SUM(unit_price * qty) AS s FROM public.order_items GROUP BY order_id) i
  ON i.order_id = o.id
WHERE o.total <> i.s
UNION ALL
SELECT 'legacy columns still present (nothing dropped)',
       count(*)::int, 5, CASE WHEN count(*) = 5 THEN 'PASS' ELSE 'FAIL' END
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders'
  AND column_name IN ('product_id', 'size', 'qty', 'unit_price', 'order_total')
UNION ALL
SELECT 'RLS on order_items', count(*)::int, 1,
       CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END
FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_items' AND rowsecurity;

SELECT o.id, o.status, o.total, o.customer_name,
       count(i.id) AS lines,
       string_agg(i.name_snapshot || ' × ' || i.qty || ' @ ' || i.unit_price, ' | ') AS items,
       bool_and(i.variant_id IS NOT NULL) AS all_lines_matched_a_variant
FROM public.orders o
LEFT JOIN public.order_items i ON i.order_id = o.id
GROUP BY o.id, o.status, o.total, o.customer_name;
