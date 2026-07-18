// Product reviews — the storefront-wide rating summary, a product's review
// list, and posting a review (auth required).
const express = require("express");
const { supabase, createAuthedClient } = require("../db");
const { requireUser } = require("../middleware/auth");
const { reviewLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.get("/api/reviews/summary", async (_req, res) => {
  const { data, error } = await supabase.from("reviews").select("rating");

  if (error) {
    console.warn("[reviews] summary query failed (table may not exist yet):", error.message);
    return res.json({ data: { avg: 0, count: 0 } });
  }

  const count = data.length;
  const avg = count ? data.reduce((sum, r) => sum + r.rating, 0) / count : 0;
  res.json({ data: { avg: Math.round(avg * 10) / 10, count } });
});

router.get("/api/products/:id/reviews", async (req, res) => {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, body, created_at, profiles(full_name)")
    .eq("product_id", req.params.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.warn("[reviews] query failed (table may not exist yet):", error.message);
    return res.json({ data: [] });
  }
  res.json({ data });
});

router.post("/api/products/:id/reviews", reviewLimiter, requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { rating, body } = req.body || {};

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5." });
  }

  const { data, error } = await userClient
    .from("reviews")
    .insert({
      user_id: req.user.id,
      product_id: req.params.id,
      rating: Number(rating),
      body: body || null
    })
    .select("id, rating, body, created_at")
    .single();

  if (error) return res.status(error.code === "42P01" ? 503 : 500).json({ error: error.message || "Failed to submit review." });
  res.status(201).json({ data });
});

module.exports = router;
