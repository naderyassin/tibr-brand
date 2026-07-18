// The customer's own orders: the single-item "buy now" order create, and the
// order history list. Multi-item cart checkout lives in routes/checkout.js.
const express = require("express");
const { randomUUID } = require("crypto");
const { supabase, createAuthedClient } = require("../db");
const { requireUser } = require("../middleware/auth");
const {
  PAYMENT_METHODS,
  ORDER_SELECT,
  buildOrderLines,
  saveOrder,
} = require("../services/orders");

const router = express.Router();

router.post("/api/orders", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const {
    product_id: productId,
    size,
    qty,
    payment_method: paymentMethod,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_address: customerAddress
  } = req.body || {};

  if (!productId || !customerName || !customerPhone) {
    return res.status(400).json({
      error: "product_id, customer_name, and customer_phone are required."
    });
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, ar_price, en_price")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return res.status(400).json({ error: "Selected product does not exist." });
  }

  const safePaymentMethod = PAYMENT_METHODS.has(paymentMethod)
    ? paymentMethod
    : "cash_on_delivery";

  // One-line order — same path as checkout, so pricing comes from the variant.
  const { lines, error: lineError } = await buildOrderLines([
    { variantId: req.body?.variant_id, productId, size, qty }
  ]);
  if (lineError) return res.status(400).json({ error: lineError });

  const subtotal = lines.reduce((sum, l) => sum + l.unit_price * l.qty, 0);

  const { data, error } = await saveOrder(userClient, {
    order: {
      user_id: req.user.id,
      status: "pending",
      payment_method: safePaymentMethod,
      checkout_reference: randomUUID(),
      subtotal,
      shipping: 0,
      discount_amount: 0,
      total: subtotal,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress || null
    },
    lines
  });

  if (error) {
    return res.status(500).json({ error: "Failed to create order." });
  }

  res.status(201).json({ data });
});

router.get("/api/orders", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);

  const { data, error } = await userClient
    .from("orders")
    .select(ORDER_SELECT)
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Failed to load orders." });
  }

  res.json({ data: data || [] });
});

module.exports = router;
