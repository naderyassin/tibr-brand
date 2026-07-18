// Wishlist. GET returns the saved product ids plus the full product graph for
// each, so the Account page can render real cards without a second round-trip
// per item.
const express = require("express");
const { createAuthedClient, createServiceClient } = require("../db");
const { requireUser } = require("../middleware/auth");
const {
  PRODUCT_GRAPH_SELECT,
  normalizeProduct,
  getActiveAutomaticProductDiscounts,
  applyAutomaticProductDiscounts,
} = require("../services/products");

const router = express.Router();

router.get("/api/wishlist", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { data, error } = await userClient
    .from("wishlist_items")
    .select(`created_at, products(${PRODUCT_GRAPH_SELECT}, brands(id, slug, name_en, name_ar))`)
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: "Failed to load wishlist." });

  const products = (data || []).map((row) => row.products).filter(Boolean);
  const activeDiscounts = await getActiveAutomaticProductDiscounts(createServiceClient());
  const items = applyAutomaticProductDiscounts(products, activeDiscounts).map(normalizeProduct);
  res.json({ data: items });
});

router.post("/api/wishlist/:productId", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { error } = await userClient
    .from("wishlist_items")
    .upsert(
      { user_id: req.user.id, product_id: req.params.productId },
      { onConflict: "user_id,product_id", ignoreDuplicates: true }
    );

  if (error) return res.status(500).json({ error: "Failed to add to wishlist." });
  res.status(201).json({ success: true });
});

router.delete("/api/wishlist/:productId", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { error } = await userClient
    .from("wishlist_items")
    .delete()
    .eq("user_id", req.user.id)
    .eq("product_id", req.params.productId);

  if (error) return res.status(500).json({ error: "Failed to remove from wishlist." });
  res.json({ success: true });
});

module.exports = router;
