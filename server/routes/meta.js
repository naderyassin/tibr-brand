// Meta / runtime-config endpoints: the storefront's Supabase bootstrap script,
// a health probe, and the public feature-flag config.
const express = require("express");
const { supabaseUrl, supabaseAnonKey } = require("../config");
const paymob = require("../paymob");

const router = express.Router();

router.get("/js/config.js", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.type("application/javascript");
  res.send(`window.TIBR_CONFIG=${JSON.stringify({ url: supabaseUrl, key: supabaseAnonKey })};`);
});

router.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Public runtime config the storefront reads — e.g. whether to offer card
// payments at all (Paymob configured) so the checkout doesn't show a dead option.
router.get("/api/config", (req, res) => {
  res.json({ data: { cardPayments: paymob.isConfigured() } });
});

module.exports = router;
