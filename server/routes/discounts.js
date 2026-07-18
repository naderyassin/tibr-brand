// Shopper-facing discount endpoints: the live free-shipping threshold badge,
// validating a typed code against the real cart, and previewing the best
// automatic discount. All share the discount engine with checkout so a preview
// can never disagree with what checkout actually applies.
const express = require("express");
const { createServiceClient } = require("../db");
const { requireUser } = require("../middleware/auth");
const { discountCodeLimiter } = require("../middleware/rateLimit");
const {
  buildCartLines,
  evaluateCartDiscount,
  pickBestDiscount,
} = require("../services/discounts");

const router = express.Router();

// Public (no auth) — lets the catalog show a "free shipping unlocked" badge
// that reflects whatever automatic shipping discount is actually live in
// admin, instead of a hardcoded claim. Returns the lowest min_purchase among
// currently-active automatic shipping discounts (null = unconditional), or
// null overall if no such discount is active right now.
router.get("/api/discounts/shipping", async (_req, res) => {
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("discounts")
    .select("min_purchase, starts_at, ends_at")
    .eq("method", "automatic")
    .eq("discount_class", "shipping")
    .eq("active", true);

  if (error) {
    return res.status(500).json({ error: "Failed to load shipping discounts." });
  }

  const now = new Date();
  const active = (data || []).filter((d) => {
    if (d.starts_at && new Date(d.starts_at) > now) return false;
    if (d.ends_at && new Date(d.ends_at) < now) return false;
    return true;
  });

  if (active.length === 0) return res.json({ data: null });

  const unconditional = active.some((d) => d.min_purchase == null);
  const minPurchase = unconditional
    ? null
    : Math.min(...active.map((d) => d.min_purchase));

  res.json({ data: { min_purchase: minPurchase } });
});

// Validate a discount code against the real cart — used by checkout, before
// the order is placed, so the shopper sees the applied discount immediately.
// Builds cart lines from real DB prices, same as /api/checkout, so the two
// can never disagree about the amount.
router.post("/api/discounts/validate", discountCodeLimiter, requireUser, async (req, res) => {
  const code = String(req.body?.code || "").trim().toUpperCase();
  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  if (!code) return res.status(400).json({ error: "Enter a discount code." });

  const { cart, error: cartError } = await buildCartLines(items);
  if (cartError) return res.status(400).json({ error: cartError });

  const serviceClient = createServiceClient();
  const { data: discount, error } = await serviceClient
    .from("discounts")
    .select("*")
    .eq("code", code)
    .eq("method", "code")
    .single();

  if (error || !discount) {
    return res.status(404).json({ error: "This discount code isn't valid." });
  }

  const outcome = await evaluateCartDiscount(discount, cart, { userId: req.user.id, serviceClient });
  if (outcome.error) {
    return res.status(400).json({ error: outcome.error });
  }

  res.json({ data: outcome.result });
});

// Preview the best-matching *automatic* discount for the current cart — no
// code required. Read-only (no used_count increment, no order insert); used
// by Checkout.jsx to show an auto-applied discount before the shopper
// submits. Shares evaluateCartDiscount/pickBestDiscount with /api/checkout
// so the preview can never disagree with what checkout actually applies.
router.post("/api/discounts/automatic", requireUser, async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  const { cart, error: cartError } = await buildCartLines(items);
  if (cartError) return res.status(400).json({ error: cartError });

  const serviceClient = createServiceClient();
  const { data: candidates, error } = await serviceClient
    .from("discounts")
    .select("*")
    .eq("method", "automatic")
    .eq("active", true);

  if (error) {
    return res.status(500).json({ error: "Failed to check automatic discounts." });
  }

  const best = await pickBestDiscount(candidates || [], cart, { userId: req.user.id, serviceClient });
  res.json({ data: best });
});

module.exports = router;
