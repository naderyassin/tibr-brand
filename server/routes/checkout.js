// Cart checkout — cash-on-delivery / wallet checkout, the Paymob card-payment
// start, and the Paymob server-to-server webhook that confirms a card payment.
const express = require("express");
const { randomUUID } = require("crypto");
const { supabase, createAuthedClient, createServiceClient } = require("../db");
const { requireUser } = require("../middleware/auth");
const { PAYMENT_METHODS, buildOrderLines, saveOrder } = require("../services/orders");
const {
  evaluateCartDiscount,
  applyLineAdjustments,
  pickBestDiscount,
} = require("../services/discounts");
const paymob = require("../paymob");

const router = express.Router();

router.post("/api/checkout", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const {
    items,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_address: customerAddress,
    payment_method: paymentMethod,
    discount_code: discountCode
  } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "At least one cart item is required." });
  }

  if (!customerName || !customerPhone || !customerAddress) {
    return res.status(400).json({
      error: "customer_name, customer_phone, and customer_address are required."
    });
  }

  const safePaymentMethod = PAYMENT_METHODS.has(paymentMethod)
    ? paymentMethod
    : "cash_on_delivery";

  // Price and stock come from the VARIANT — never the client, never
  // products.ar_price (which charged every size the default size's price).
  const { lines, error: lineError } = await buildOrderLines(items);
  if (lineError) return res.status(400).json({ error: lineError });

  const checkoutReference = randomUUID();
  const orderRows = [];

  {
    // Shape the lines for the discount engine, which still reasons per-line.
    for (const line of lines) orderRows.push({
      product_id: line.product_id,
      variant_id: line.variant_id,
      qty: line.qty,
      unit_price: line.unit_price,
      order_total: line.unit_price * line.qty,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress
    });
  }

  // Re-validate the discount server-side (never trust a client-supplied
  // amount) and spread it across just the order rows it targets. A typed
  // code always wins if valid — never silently swapped for an automatic
  // discount. With no code, the single best-value active automatic
  // discount applies, via the exact same selection checkout preview
  // (/api/discounts/automatic) already showed the shopper.
  const cart = {
    lines: orderRows.map((row) => ({
      productId: row.product_id,
      qty: row.qty,
      unitPrice: row.unit_price,
      lineTotal: row.order_total
    })),
    subtotal: orderRows.reduce((sum, row) => sum + row.order_total, 0)
  };
  const serviceClient = createServiceClient();
  const evalCtx = { userId: req.user.id, customerPhone, serviceClient };

  let appliedDiscount = null;
  const code = String(discountCode || "").trim().toUpperCase();
  if (code) {
    const { data: discount } = await serviceClient
      .from("discounts")
      .select("*")
      .eq("code", code)
      .eq("method", "code")
      .single();

    const outcome = discount ? await evaluateCartDiscount(discount, cart, evalCtx) : null;
    if (!outcome || outcome.error) {
      return res.status(400).json({ error: outcome?.error || "This discount code isn't valid." });
    }
    appliedDiscount = outcome.result;
  } else {
    const { data: candidates } = await serviceClient
      .from("discounts")
      .select("*")
      .eq("method", "automatic")
      .eq("active", true);
    appliedDiscount = await pickBestDiscount(candidates || [], cart, evalCtx);
  }

  if (appliedDiscount) {
    applyLineAdjustments(orderRows, appliedDiscount.line_adjustments);
    orderRows.forEach((row) => {
      row.discount_id = appliedDiscount.id;
      row.discount_title = appliedDiscount.title ?? appliedDiscount.code;
      row.discount_code = appliedDiscount.method === "code" ? appliedDiscount.code : null;
    });
  }

  // The discount engine spread its adjustment across the per-line rows; roll
  // that back up to the single order, which is where the money now lives.
  const subtotal = lines.reduce((sum, l) => sum + l.unit_price * l.qty, 0);
  const discountAmount = orderRows.reduce((sum, r) => sum + (r.discount_amount || 0), 0);
  const total = Math.max(0, subtotal - discountAmount);

  const { data, error } = await saveOrder(userClient, {
    order: {
      user_id: req.user.id,
      status: "pending",
      payment_method: safePaymentMethod,
      checkout_reference: checkoutReference,
      subtotal,
      shipping: 0,
      discount_amount: discountAmount,
      discount_code: appliedDiscount?.method === "code" ? appliedDiscount.code : null,
      total,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress
    },
    lines
  });

  if (error) {
    return res.status(500).json({ error: error.message || "Failed to complete checkout." });
  }

  // Decrement stock per VARIANT. Best-effort and non-transactional: an oversell
  // under concurrent checkouts is possible and is a known gap — the honest fix
  // is a Postgres function that checks and decrements atomically.
  for (const line of lines) {
    const { data: v } = await supabase
      .from("product_variants").select("quantity").eq("id", line.variant_id).single();
    if (v) {
      await createServiceClient()
        .from("product_variants")
        .update({ quantity: Math.max(0, v.quantity - line.qty) })
        .eq("id", line.variant_id);
    }
  }

  if (appliedDiscount) {
    const { data: current } = await serviceClient
      .from("discounts")
      .select("used_count")
      .eq("id", appliedDiscount.id)
      .single();

    if (current) {
      await serviceClient
        .from("discounts")
        .update({ used_count: current.used_count + 1 })
        .eq("id", appliedDiscount.id);
    }
  }

  res.status(201).json({
    data: {
      order_id: data.id,
      checkout_reference: checkoutReference,
      payment_method: safePaymentMethod,
      subtotal,
      total_amount: total,
      item_count: lines.reduce((sum, l) => sum + l.qty, 0),
      discount: appliedDiscount
        ? {
            code: appliedDiscount.code,
            title: appliedDiscount.title,
            amount: discountAmount,
            free_shipping: appliedDiscount.free_shipping
          }
        : null,
      order: data
    }
  });
});

// ── Card payments (Paymob) ───────────────────────────────────────────────────
// Creates a PENDING, UNPAID order, then a Paymob intention, and returns the
// hosted-checkout URL to redirect to. Stock decrement and discount-usage counting
// happen only after the webhook confirms payment — never here. Card data never
// touches this server (Paymob hosts the form).

router.post("/api/checkout/card", requireUser, async (req, res) => {
  if (!paymob.isConfigured()) {
    return res.status(503).json({ error: "Card payments are not available right now." });
  }

  const userClient = createAuthedClient(req.accessToken);
  const {
    items,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_address: customerAddress,
    customer_email: customerEmail,
    discount_code: discountCode
  } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "At least one cart item is required." });
  }
  if (!customerName || !customerPhone || !customerAddress) {
    return res.status(400).json({ error: "customer_name, customer_phone, and customer_address are required." });
  }

  const { lines, error: lineError } = await buildOrderLines(items);
  if (lineError) return res.status(400).json({ error: lineError });

  const checkoutReference = randomUUID();
  const orderRows = lines.map((line) => ({
    product_id: line.product_id,
    variant_id: line.variant_id,
    qty: line.qty,
    unit_price: line.unit_price,
    order_total: line.unit_price * line.qty,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_address: customerAddress
  }));

  // Server-side discount re-validation — identical policy to COD checkout: a
  // valid typed code wins, else the single best active automatic discount.
  const cart = {
    lines: orderRows.map((row) => ({ productId: row.product_id, qty: row.qty, unitPrice: row.unit_price, lineTotal: row.order_total })),
    subtotal: orderRows.reduce((sum, row) => sum + row.order_total, 0)
  };
  const serviceClient = createServiceClient();
  const evalCtx = { userId: req.user.id, customerPhone, serviceClient };

  let appliedDiscount = null;
  const code = String(discountCode || "").trim().toUpperCase();
  if (code) {
    const { data: discount } = await serviceClient
      .from("discounts").select("*").eq("code", code).eq("method", "code").single();
    const outcome = discount ? await evaluateCartDiscount(discount, cart, evalCtx) : null;
    if (!outcome || outcome.error) {
      return res.status(400).json({ error: outcome?.error || "This discount code isn't valid." });
    }
    appliedDiscount = outcome.result;
  } else {
    const { data: candidates } = await serviceClient
      .from("discounts").select("*").eq("method", "automatic").eq("active", true);
    appliedDiscount = await pickBestDiscount(candidates || [], cart, evalCtx);
  }

  if (appliedDiscount) {
    applyLineAdjustments(orderRows, appliedDiscount.line_adjustments);
    orderRows.forEach((row) => {
      row.discount_id = appliedDiscount.id;
      row.discount_title = appliedDiscount.title ?? appliedDiscount.code;
      row.discount_code = appliedDiscount.method === "code" ? appliedDiscount.code : null;
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.unit_price * l.qty, 0);
  const discountAmount = orderRows.reduce((sum, r) => sum + (r.discount_amount || 0), 0);
  const total = Math.max(0, subtotal - discountAmount);

  const { data: order, error } = await saveOrder(userClient, {
    order: {
      user_id: req.user.id,
      status: "pending",
      payment_method: "card",
      payment_provider: "paymob",
      payment_status: "unpaid",
      checkout_reference: checkoutReference,
      subtotal,
      shipping: 0,
      discount_amount: discountAmount,
      discount_code: appliedDiscount?.method === "code" ? appliedDiscount.code : null,
      total,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress
    },
    lines
  });
  if (error) return res.status(500).json({ error: error.message || "Failed to start checkout." });

  // Paymob rejects an intention whose items don't sum to `amount`; when a
  // discount applies we can't itemise cleanly, so send one summarised line.
  const items_payload = discountAmount > 0
    ? [{ name: "TIBR order", amount: Math.round(total * 100), description: `${lines.length} item(s)`, quantity: 1 }]
    : lines.map((l) => ({
        name: (l.name_snapshot || "Item").slice(0, 50),
        amount: Math.round(l.unit_price * 100),
        description: (l.size_snapshot || "TIBR").slice(0, 50),
        quantity: l.qty
      }));

  const [firstName, ...rest] = String(customerName).trim().split(/\s+/);
  const lastName = rest.join(" ") || firstName || "Customer";
  const appBase = process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
  const email = customerEmail || req.user.email || "NA";

  try {
    const intention = await paymob.createIntention({
      amountPiasters: Math.round(total * 100),
      items: items_payload,
      billingData: {
        first_name: firstName || "Customer", last_name: lastName,
        phone_number: customerPhone, email,
        apartment: "NA", floor: "NA", street: customerAddress || "NA",
        building: "NA", shipping_method: "NA", postal_code: "NA",
        city: "NA", country: "EG", state: "NA"
      },
      customer: { first_name: firstName || "Customer", last_name: lastName, email },
      specialReference: checkoutReference,
      redirectionUrl: `${appBase}/checkout/callback`
    });

    res.status(201).json({
      data: {
        order_id: order.id,
        checkout_reference: checkoutReference,
        checkout_url: intention.checkoutUrl,
        total_amount: total
      }
    });
  } catch (err) {
    // Couldn't start the payment — don't leave a live unpaid order dangling.
    await userClient.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
    res.status(502).json({ error: err.message || "Could not start the card payment." });
  }
});

// Public — Paymob calls this server-to-server. Trust the payload ONLY after the
// HMAC verifies. Idempotent: a repeat callback for a paid order is a no-op.
router.post("/api/payments/paymob/webhook", async (req, res) => {
  const receivedHmac = req.query.hmac || (req.body && req.body.hmac);
  const obj = req.body && req.body.obj;
  const type = req.body && req.body.type;

  if (!obj || !paymob.verifyHmac(obj, receivedHmac)) {
    return res.status(401).json({ error: "Invalid signature." });
  }
  if (type && type !== "TRANSACTION") {
    return res.json({ received: true });
  }

  const reference = obj.order && obj.order.merchant_order_id;
  const success = obj.success === true || obj.success === "true";
  const pending = obj.pending === true || obj.pending === "true";
  if (!reference) return res.json({ received: true });

  const serviceClient = createServiceClient();
  const { data: order } = await serviceClient
    .from("orders").select("*, order_items(*)").eq("checkout_reference", reference).single();
  if (!order || order.payment_status === "paid") return res.json({ received: true });

  if (success && !pending) {
    // The lookup key (order.merchant_order_id) is NOT part of Paymob's signed HMAC
    // field set, so a genuine-but-cheap signature could otherwise be retargeted or
    // replayed onto a different/expensive order. Bind the authentic, signed values
    // to THIS order before trusting them: the signed amount + currency must match,
    // and a given Paymob transaction id (signed) may settle only one order.
    const amountMatches = Number(obj.amount_cents) === Math.round(Number(order.total) * 100);
    const currencyOk = String(obj.currency || "EGP").toUpperCase() === "EGP";
    const txnRef = String(obj.id);
    const { data: sameTxn } = await serviceClient
      .from("orders").select("id").eq("transaction_ref", txnRef);
    const txnReused = (sameTxn || []).some((o) => o.id !== order.id);
    if (!amountMatches || !currencyOk || txnReused) {
      return res.status(400).json({ error: "Payment does not match this order." });
    }

    await serviceClient.from("orders").update({
      payment_status: "paid",
      status: "confirmed",
      transaction_ref: txnRef,
      paid_at: new Date().toISOString()
    }).eq("id", order.id);

    // Money is in — now decrement variant stock (best-effort, mirrors COD).
    for (const line of order.order_items || []) {
      if (!line.variant_id) continue;
      const { data: v } = await serviceClient
        .from("product_variants").select("quantity").eq("id", line.variant_id).single();
      if (v) {
        await serviceClient.from("product_variants")
          .update({ quantity: Math.max(0, v.quantity - line.qty) }).eq("id", line.variant_id);
      }
    }
    // Count a typed discount code's usage once, on the confirmed payment.
    if (order.discount_code) {
      const { data: d } = await serviceClient
        .from("discounts").select("id, used_count").eq("code", order.discount_code).single();
      if (d) await serviceClient.from("discounts").update({ used_count: d.used_count + 1 }).eq("id", d.id);
    }
  } else if (!pending) {
    await serviceClient.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
  }

  res.json({ received: true });
});

module.exports = router;
