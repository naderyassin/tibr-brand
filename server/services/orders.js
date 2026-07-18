// Order service — turns cart items into priced order_items rows and writes the
// order + its lines. Also holds the order-related constant vocabularies.
const { supabase } = require("../db");

const PAYMENT_METHODS = new Set([
  "cash_on_delivery",
  "vodafone_cash",
  "instapay"
]);

const ADMIN_ORDER_STATUSES = new Set([
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled"
]);

// Revenue only recognizes orders that actually completed — pending/confirmed/
// shipped are still in flight and could still be cancelled, so counting them
// would overstate revenue before the sale is final.
const REVENUE_STATUSES = new Set(["delivered"]);

// An order is a row + its lines. Each line points at the VARIANT bought, and
// carries snapshots — an order is a historical record, so renaming or repricing
// a product must never rewrite what the customer bought.
const ORDER_SELECT =
  "*, order_items(*, product_variants(id, size_label, sku), products(id, slug, en_name, ar_name, image))";

/**
 * Turn cart lines into priced order_items rows.
 *
 * PRICE COMES FROM THE VARIANT, never from the client and never from
 * products.ar_price. The old checkout charged every size the product's single
 * price, so picking 100ml paid the 50ml price. Accepts `variantId`, and falls
 * back to resolving productId (+ optional size) to a variant so an older client
 * or a stale cart still checks out correctly.
 */
const buildOrderLines = async (items) => {
  const variantIds = items.map((i) => i.variantId).filter(Boolean);
  const productIds = items.filter((i) => !i.variantId).map((i) => i.productId).filter(Boolean);

  const [{ data: byId }, { data: byProduct }] = await Promise.all([
    variantIds.length
      ? supabase.from("product_variants")
          .select("*, products(id, en_name, ar_name, image)").in("id", variantIds)
      : Promise.resolve({ data: [] }),
    productIds.length
      ? supabase.from("product_variants")
          .select("*, products(id, en_name, ar_name, image)").in("product_id", productIds)
      : Promise.resolve({ data: [] })
  ]);

  const variantById = new Map((byId || []).map((v) => [v.id, v]));
  const variantsByProduct = new Map();
  for (const v of byProduct || []) {
    if (!variantsByProduct.has(v.product_id)) variantsByProduct.set(v.product_id, []);
    variantsByProduct.get(v.product_id).push(v);
  }

  const lines = [];
  for (const item of items) {
    let variant = item.variantId ? variantById.get(item.variantId) : null;

    if (!variant && item.productId) {
      const candidates = variantsByProduct.get(item.productId) || [];
      variant =
        (item.size && candidates.find((v) => v.size_label === item.size)) ||
        candidates.find((v) => v.is_default) ||
        candidates[0];
    }

    if (!variant) {
      return { error: `No purchasable size found for ${item.variantId || item.productId}.` };
    }

    const qty = Number(item.qty) > 0 ? Math.floor(Number(item.qty)) : 1;
    if (variant.quantity < qty) {
      const name = variant.products?.en_name || "This item";
      return {
        error: variant.quantity === 0
          ? `${name} (${variant.size_label}) is out of stock.`
          : `Only ${variant.quantity} left of ${name} (${variant.size_label}).`
      };
    }

    lines.push({
      variant_id: variant.id,
      product_id: variant.product_id,
      qty,
      unit_price: Number(variant.price),
      name_snapshot: variant.products?.en_name || variant.products?.ar_name || "Product",
      size_snapshot: variant.size_label,
      image_snapshot: variant.products?.image || null
    });
  }

  return { lines };
};

/**
 * Write the order and its lines.
 *
 * Not atomic (supabase-js has no transactions), so if the lines fail we delete
 * the order we just made — an order with no lines is worse than no order, and
 * it would break every "every order has ≥1 line" assumption downstream.
 */
const saveOrder = async (client, { order, lines }) => {
  const { data: created, error: orderError } = await client
    .from("orders").insert(order).select().single();
  if (orderError) return { error: orderError };

  const { error: linesError } = await client
    .from("order_items")
    .insert(lines.map((l) => ({ ...l, order_id: created.id })));

  if (linesError) {
    await client.from("orders").delete().eq("id", created.id);
    return { error: linesError };
  }

  const { data: full } = await client.from("orders").select(ORDER_SELECT).eq("id", created.id).single();
  return { data: full || created };
};

module.exports = {
  PAYMENT_METHODS,
  ADMIN_ORDER_STATUSES,
  REVENUE_STATUSES,
  ORDER_SELECT,
  buildOrderLines,
  saveOrder,
};
