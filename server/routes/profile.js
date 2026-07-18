// The signed-in customer's own account data: profile, saved addresses, saved
// mobile-wallet payment methods, and billing details. RLS keeps each user to
// their own rows; every handler runs on the caller's authed client.
const express = require("express");
const { createAuthedClient } = require("../db");
const { requireUser } = require("../middleware/auth");

const router = express.Router();

router.get("/api/profile", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);

  const { data, error } = await userClient
    .from("profiles")
    .select("id, full_name, phone_number, address, governorate, latitude, longitude, gender, date_of_birth, role")
    .eq("id", req.user.id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: "Failed to load profile." });
  }

  res.json({ data });
});

router.put("/api/profile", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { full_name, phone_number, address, governorate, latitude, longitude, gender, date_of_birth } = req.body || {};

  const { data, error } = await userClient
    .from("profiles")
    .update({
      full_name, phone_number, address,
      governorate: governorate || null,
      latitude:  latitude  != null ? Number(latitude)  : null,
      longitude: longitude != null ? Number(longitude) : null,
      gender, date_of_birth: date_of_birth || null
    })
    .eq("id", req.user.id)
    .select("id, full_name, phone_number, address, governorate, latitude, longitude, gender, date_of_birth, role")
    .single();

  if (error) {
    return res.status(500).json({ error: "Failed to update profile." });
  }

  res.json({ data });
});

// ── Addresses ────────────────────────────────────────────────────────────────

router.get("/api/profile/addresses", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { data, error } = await userClient
    .from("addresses")
    .select("*")
    .eq("user_id", req.user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: "Failed to load addresses." });
  res.json({ data });
});

router.post("/api/profile/addresses", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { label, city, street, phone, governorate, latitude, longitude, is_default } = req.body || {};

  if (!street) {
    return res.status(400).json({ error: "street is required." });
  }

  if (is_default) {
    await userClient.from("addresses").update({ is_default: false }).eq("user_id", req.user.id);
  }

  const { data, error } = await userClient
    .from("addresses")
    .insert({
      user_id:    req.user.id,
      label:      label || "Home",
      city:       city || governorate || "",
      governorate: governorate || null,
      street,
      phone:      phone || null,
      latitude:   latitude  != null ? Number(latitude)  : null,
      longitude:  longitude != null ? Number(longitude) : null,
      is_default: !!is_default
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: "Failed to add address." });
  res.status(201).json({ data });
});

router.delete("/api/profile/addresses/:id", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { error } = await userClient
    .from("addresses")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error: "Failed to delete address." });
  res.json({ success: true });
});

router.put("/api/profile/addresses/:id", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { label, city, street, phone, governorate, latitude, longitude, is_default } = req.body || {};

  if (!street) return res.status(400).json({ error: "street is required." });

  if (is_default) {
    await userClient.from("addresses").update({ is_default: false }).eq("user_id", req.user.id);
  }

  const { error } = await userClient
    .from("addresses")
    .update({
      label:       label || "Home",
      city:        city || governorate || "",
      governorate: governorate || null,
      street,
      phone:       phone || null,
      latitude:    latitude  != null ? Number(latitude)  : null,
      longitude:   longitude != null ? Number(longitude) : null,
      is_default:  !!is_default
    })
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) {
    console.error("PUT /api/profile/addresses/:id error:", error);
    return res.status(500).json({ error: error.message || "Failed to update address." });
  }
  res.json({ success: true });
});

router.put("/api/profile/addresses/:id/default", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  await userClient.from("addresses").update({ is_default: false }).eq("user_id", req.user.id);

  const { data, error } = await userClient
    .from("addresses")
    .update({ is_default: true })
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: "Failed to update default address." });
  res.json({ data });
});

// ── Payment methods ──────────────────────────────────────────────────────────
// Saved mobile-wallet handles (Vodafone Cash number / InstaPay address) for
// faster checkout. NO card data. Mirrors the addresses routes' shape; RLS keeps
// each user to their own rows.

const PAYMENT_METHOD_TYPES = ["vodafone_cash", "instapay"];

router.get("/api/profile/payment-methods", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { data, error } = await userClient
    .from("payment_methods")
    .select("*")
    .eq("user_id", req.user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: "Failed to load payment methods." });
  res.json({ data });
});

router.post("/api/profile/payment-methods", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { type, handle, label, is_default } = req.body || {};

  if (!PAYMENT_METHOD_TYPES.includes(type)) {
    return res.status(400).json({ error: "Unsupported payment type." });
  }
  if (!handle || !String(handle).trim()) {
    return res.status(400).json({ error: "handle is required." });
  }

  if (is_default) {
    await userClient.from("payment_methods").update({ is_default: false }).eq("user_id", req.user.id);
  }

  const { data, error } = await userClient
    .from("payment_methods")
    .insert({
      user_id:    req.user.id,
      type,
      handle:     String(handle).trim(),
      label:      label ? String(label).trim() : null,
      is_default: !!is_default,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: "Failed to add payment method." });
  res.status(201).json({ data });
});

router.put("/api/profile/payment-methods/:id", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { type, handle, label, is_default } = req.body || {};

  if (!PAYMENT_METHOD_TYPES.includes(type)) {
    return res.status(400).json({ error: "Unsupported payment type." });
  }
  if (!handle || !String(handle).trim()) {
    return res.status(400).json({ error: "handle is required." });
  }

  if (is_default) {
    await userClient.from("payment_methods").update({ is_default: false }).eq("user_id", req.user.id);
  }

  const { error } = await userClient
    .from("payment_methods")
    .update({
      type,
      handle:     String(handle).trim(),
      label:      label ? String(label).trim() : null,
      is_default: !!is_default,
    })
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error: error.message || "Failed to update payment method." });
  res.json({ success: true });
});

router.delete("/api/profile/payment-methods/:id", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { error } = await userClient
    .from("payment_methods")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error: "Failed to delete payment method." });
  res.json({ success: true });
});

router.put("/api/profile/payment-methods/:id/default", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  await userClient.from("payment_methods").update({ is_default: false }).eq("user_id", req.user.id);

  const { data, error } = await userClient
    .from("payment_methods")
    .update({ is_default: true })
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: "Failed to update default payment method." });
  res.json({ data });
});

// ── Billing details ──────────────────────────────────────────────────────────
// One row per user (PK = user_id), so writes are an upsert. Used to prefill an
// invoice's billed-to / tax section.

router.get("/api/profile/billing", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { data, error } = await userClient
    .from("billing_details")
    .select("*")
    .eq("user_id", req.user.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: "Failed to load billing details." });
  res.json({ data: data || null });
});

router.put("/api/profile/billing", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { full_name, company, tax_id, governorate, city, street } = req.body || {};

  const { data, error } = await userClient
    .from("billing_details")
    .upsert({
      user_id:     req.user.id,
      full_name:   full_name ? String(full_name).trim() : null,
      company:     company ? String(company).trim() : null,
      tax_id:      tax_id ? String(tax_id).trim() : null,
      governorate: governorate || null,
      city:        city ? String(city).trim() : null,
      street:      street ? String(street).trim() : null,
      updated_at:  new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message || "Failed to save billing details." });
  res.json({ data });
});

module.exports = router;
