// End-to-end checkout test against the real API and the real database.
//   node scripts/test-checkout.cjs
//
// Proves the thing step 4 exists for: buying the 100ml charges the 100ml price.
// The old code priced every line from products.ar_price, so picking a larger
// size paid the DEFAULT size's price.
//
// Signs in as the admin (a real user), places an order through HTTP, verifies
// what landed in orders + order_items, then deletes the order it made.

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const BASE = process.env.TEST_BASE_URL || "http://localhost:3100";
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Set TEST_EMAIL and TEST_PASSWORD (a real account) to run this.");
  process.exit(2);
}

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `  <- ${detail}`}`);
  ok ? pass++ : fail++;
};

(async () => {
  const { data: auth, error: authError } = await anon.auth.signInWithPassword({
    email: EMAIL, password: PASSWORD,
  });
  if (authError) { console.error("sign-in failed:", authError.message); process.exit(1); }
  const token = auth.session.access_token;

  // Pick a NON-default variant — that's the case the old code got wrong.
  const { data: variants } = await db
    .from("product_variants")
    .select("*, products(en_name)")
    .eq("is_default", false)
    .gt("quantity", 0)
    .order("price", { ascending: false })
    .limit(1);

  const target = variants?.[0];
  if (!target) { console.error("no non-default variant in stock to test with"); process.exit(1); }

  const { data: def } = await db
    .from("product_variants").select("id, price, size_label")
    .eq("product_id", target.product_id).eq("is_default", true).single();

  // The variant backfill copied ONE price onto every size, so today the sizes
  // all cost the same and a price test would be vacuous. Give the size we're
  // buying a distinct price for the duration of the test, then restore it.
  const priceBefore = Number(target.price);
  const testPrice = Number(def.price) + 1234;
  await db.from("product_variants").update({ price: testPrice }).eq("id", target.id);
  target.price = testPrice;

  console.log(`\nproduct: ${target.products.en_name}`);
  console.log(`  default variant : ${def.size_label} @ ${def.price}`);
  console.log(`  buying          : ${target.size_label} @ ${testPrice}  <- must be charged THIS, not ${def.price}\n`);

  const stockBefore = target.quantity;
  const restore = async () => {
    await db.from("product_variants")
      .update({ price: priceBefore, quantity: stockBefore }).eq("id", target.id);
  };

  const res = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      items: [{ variantId: target.id, qty: 2 }],
      customer_name: "Checkout Test",
      customer_phone: "01000000000",
      customer_address: "Test address, Cairo",
      payment_method: "cash_on_delivery",
    }),
  });
  const body = await res.json();

  check("checkout returned 201", res.status === 201, `${res.status} ${JSON.stringify(body).slice(0, 120)}`);
  if (res.status !== 201) process.exit(1);

  const expected = Number(target.price) * 2;
  check(`charged the ${target.size_label} price (${expected}), not the ${def.size_label} price (${Number(def.price) * 2})`,
    Number(body.data.total_amount) === expected, `got ${body.data.total_amount}`);

  const orderId = body.data.order_id;

  const { data: order } = await db
    .from("orders").select("*, order_items(*)").eq("id", orderId).single();

  check("one order row (not one per line)", !!order);
  check("order has exactly 1 line", order.order_items.length === 1, String(order.order_items.length));

  const line = order.order_items[0];
  check("line points at the VARIANT bought", line.variant_id === target.id);
  check("line unit_price = variant price", Number(line.unit_price) === Number(target.price),
    `${line.unit_price} vs ${target.price}`);
  check("line size snapshot recorded", line.size_snapshot === target.size_label, line.size_snapshot);
  check("line name snapshot recorded", !!line.name_snapshot, line.name_snapshot);
  check("order.total = sum of lines", Number(order.total) === expected, String(order.total));
  check("order.subtotal set", Number(order.subtotal) === expected, String(order.subtotal));
  check("status pending", order.status === "pending", order.status);

  const { data: after } = await db
    .from("product_variants").select("quantity").eq("id", target.id).single();
  check("stock decremented on the VARIANT", after.quantity === stockBefore - 2,
    `${stockBefore} -> ${after.quantity}`);

  // Over-ordering must be refused, not silently oversold.
  const res2 = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      items: [{ variantId: target.id, qty: 9999 }],
      customer_name: "Checkout Test", customer_phone: "01000000000",
      customer_address: "Test address", payment_method: "cash_on_delivery",
    }),
  });
  const body2 = await res2.json();
  check("refuses to oversell", res2.status === 400 && /left|out of stock/i.test(body2.error || ""),
    `${res2.status} ${body2.error}`);

  // Cleanup: remove the test order, restore the variant's price and stock.
  await db.from("orders").delete().eq("id", orderId);
  await restore();
  const { data: gone } = await db.from("order_items").select("id").eq("order_id", orderId);
  const { data: restored } = await db
    .from("product_variants").select("price, quantity").eq("id", target.id).single();
  check("cleanup: order + lines removed (cascade)", (gone || []).length === 0);
  check("cleanup: variant price + stock restored",
    Number(restored.price) === priceBefore && restored.quantity === stockBefore,
    `${restored.price} / ${restored.quantity}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
