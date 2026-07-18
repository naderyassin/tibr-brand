// Admin API — orders, customers, discounts, products, the brand + original
// registries the product form picks from, and image upload. Every route is
// gated by requireUser + requireAdmin (role promotion additionally requires
// requireSuperAdmin). Route registration order is preserved from the original
// monolith.
const express = require("express");
const path = require("path");
const { randomUUID } = require("crypto");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const { supabaseUrl, supabaseAnonKey } = require("../config");
const { createAuthedClient, createServiceClient } = require("../db");
const { requireUser, requireAdmin, requireSuperAdmin } = require("../middleware/auth");
const {
  ORDER_SELECT,
  ADMIN_ORDER_STATUSES,
  REVENUE_STATUSES,
} = require("../services/orders");
const { sanitizeDiscountPayload, validateDiscountPayload } = require("../services/discounts");
const {
  PRODUCT_GRAPH_SELECT,
  normalizeProduct,
  sanitizeProductPayload,
  validateProductPayload,
  saveProductGraph,
  AUDIENCES,
  FAMILIES,
} = require("../services/products");
const { trimValue, slugifyValue, parseStringArray, parseBool } = require("../lib/parse");

const router = express.Router();

// ── Orders ───────────────────────────────────────────────────────────────────

router.get("/api/admin/orders", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { data, error } = await userClient
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Failed to load admin orders." });
  }

  res.json({ data: data || [] });
});

router.get("/api/admin/customers", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);

  const { data, error } = await userClient
    .from("orders")
    .select("id, status, total, subtotal, customer_name, customer_phone, customer_address, created_at, user_id")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Failed to load customers." });
  }

  // Aggregate orders into one row per customer. Registered customers group by
  // user_id; guest orders (no user_id) group by their phone number. Orders are
  // already sorted newest-first, so the first row we see for a key carries the
  // most recent name/phone/address.
  const map = new Map();
  for (const o of data) {
    const key = o.user_id || (o.customer_phone ? `guest:${o.customer_phone}` : `guest:${o.id}`);
    let c = map.get(key);
    if (!c) {
      c = {
        id: key,
        is_registered: !!o.user_id,
        name: o.customer_name || null,
        phone: o.customer_phone || null,
        address: o.customer_address || null,
        order_count: 0,
        total_spent: 0,
        last_order_at: o.created_at,
        first_order_at: o.created_at,
      };
      map.set(key, c);
    }
    c.order_count += 1;
    if (REVENUE_STATUSES.has(o.status) && o.total != null) c.total_spent += Number(o.total) || 0;
    if (o.created_at < c.first_order_at) c.first_order_at = o.created_at;
    if (o.created_at > c.last_order_at) c.last_order_at = o.created_at;
    // Fill in any details missing from the newest order using older ones.
    if (!c.name && o.customer_name) c.name = o.customer_name;
    if (!c.phone && o.customer_phone) c.phone = o.customer_phone;
    if (!c.address && o.customer_address) c.address = o.customer_address;
  }

  const customers = Array.from(map.values()).sort(
    (a, b) => new Date(b.last_order_at) - new Date(a.last_order_at)
  );

  res.json({ data: customers });
});

router.get("/api/admin/customers/:id", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const key = req.params.id;

  const { data, error } = await userClient
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Failed to load customer." });
  }

  const keyOf = (o) => o.user_id || (o.customer_phone ? `guest:${o.customer_phone}` : `guest:${o.id}`);
  const orders = data.filter((o) => keyOf(o) === key);

  if (orders.length === 0) {
    return res.status(404).json({ error: "Customer not found." });
  }

  // Orders come newest-first, so orders[0] carries the freshest details.
  const customer = {
    id: key,
    is_registered: !!orders[0].user_id,
    name: null, phone: null, address: null,
    order_count: orders.length,
    total_spent: 0,
    first_order_at: orders[0].created_at,
    last_order_at: orders[0].created_at,
  };
  for (const o of orders) {
    if (REVENUE_STATUSES.has(o.status) && o.total != null) customer.total_spent += Number(o.total) || 0;
    if (o.created_at < customer.first_order_at) customer.first_order_at = o.created_at;
    if (o.created_at > customer.last_order_at) customer.last_order_at = o.created_at;
    if (!customer.name && o.customer_name) customer.name = o.customer_name;
    if (!customer.phone && o.customer_phone) customer.phone = o.customer_phone;
    if (!customer.address && o.customer_address) customer.address = o.customer_address;
  }

  // Role/email live in auth.users + profiles, which RLS keeps admins out of
  // for other people's rows — the service client bypasses that deliberately.
  if (customer.is_registered) {
    const serviceClient = createServiceClient();
    const [{ data: profile }, { data: userRes }] = await Promise.all([
      serviceClient.from("profiles").select("role").eq("id", customer.id).maybeSingle(),
      serviceClient.auth.admin.getUserById(customer.id),
    ]);
    customer.role = profile?.role || "customer";
    customer.email = userRes?.user?.email || null;
  }

  res.json({ data: { customer, orders } });
});

// Promote a registered customer to admin. Only a super_admin may grant admin
// access (requireSuperAdmin) — the client additionally re-confirms the
// caller's own password immediately before this call, as a speed bump
// against someone using an unattended admin session.
router.patch("/api/admin/customers/:id/role", requireUser, requireAdmin, requireSuperAdmin, async (req, res) => {
  const targetId = req.params.id;

  if (!/^[0-9a-f-]{36}$/i.test(targetId)) {
    return res.status(400).json({ error: "This customer has no account to promote." });
  }
  if (targetId === req.user.id) {
    return res.status(400).json({ error: "You can't change your own role here." });
  }
  if (req.body.role !== "admin") {
    return res.status(400).json({ error: "Invalid role." });
  }

  const serviceClient = createServiceClient();

  // super_admin is protected: never overwritten by this endpoint, no matter
  // who's calling or what role was requested.
  const { data: existing } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", targetId)
    .maybeSingle();
  if (existing?.role === "super_admin") {
    return res.status(400).json({ error: "This account's role can't be changed." });
  }

  const { data, error } = await serviceClient
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", targetId)
    .select("id, role")
    .maybeSingle();

  if (error || !data) {
    return res.status(500).json({ error: "Failed to update role." });
  }

  res.json({ data });
});

// ── Discounts ────────────────────────────────────────────────────────────────

router.get("/api/admin/discounts", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { data, error } = await userClient
    .from("discounts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Failed to load discounts." });
  }

  res.json({ data });
});

router.get("/api/admin/discounts/:id", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { data, error } = await userClient
    .from("discounts")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) {
    return res.status(404).json({ error: "Discount not found." });
  }

  res.json({ data });
});

router.post("/api/admin/discounts", requireUser, requireAdmin, async (req, res) => {
  try {
    const userClient = createAuthedClient(req.accessToken);
    const discount = sanitizeDiscountPayload(req.body || {});
    const validationError = validateDiscountPayload(discount);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { data, error } = await userClient
      .from("discounts")
      .insert(discount)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(400).json({ error: `Discount code "${discount.code}" already exists.` });
      }
      return res.status(500).json({ error: error.message || "Failed to create discount." });
    }

    res.status(201).json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to create discount." });
  }
});

router.patch("/api/admin/discounts/:id", requireUser, requireAdmin, async (req, res) => {
  try {
    const userClient = createAuthedClient(req.accessToken);
    const discount = sanitizeDiscountPayload(req.body || {});
    const validationError = validateDiscountPayload(discount);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // discount_class is immutable after creation — never part of an update,
    // regardless of what the request body claims it is.
    delete discount.discount_class;

    const { data, error } = await userClient
      .from("discounts")
      .update(discount)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(400).json({ error: `Discount code "${discount.code}" already exists.` });
      }
      return res.status(500).json({ error: error.message || "Failed to update discount." });
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to update discount." });
  }
});

router.delete("/api/admin/discounts/:id", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { error } = await userClient
    .from("discounts")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    return res.status(500).json({ error: error.message || "Failed to delete discount." });
  }

  res.json({ success: true });
});

// ── Order status ─────────────────────────────────────────────────────────────

router.patch("/api/admin/orders/:id", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const nextStatus = String(req.body?.status || "").trim().toLowerCase();

  if (!ADMIN_ORDER_STATUSES.has(nextStatus)) {
    return res.status(400).json({ error: "Invalid order status." });
  }

  const { data, error } = await userClient
    .from("orders")
    .update({ status: nextStatus })
    .eq("id", req.params.id)
    .select(ORDER_SELECT)
    .single();

  if (error) {
    return res.status(500).json({ error: "Failed to update order status." });
  }

  res.json({ data });
});

// ── Products ─────────────────────────────────────────────────────────────────

const createProductHandler = async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const graph = sanitizeProductPayload(req.body || {});
  const validationError = validateProductPayload(graph, true);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { data, error } = await saveProductGraph(userClient, graph);

  if (error) {
    return res.status(500).json({ error: error.message || "Failed to save product." });
  }

  res.status(201).json({ data: normalizeProduct(data) });
};

router.post("/api/products", requireUser, requireAdmin, createProductHandler);
router.post("/api/admin/products", requireUser, requireAdmin, createProductHandler);

router.get("/api/admin/products", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { data, error } = await userClient
    .from("products")
    .select(`${PRODUCT_GRAPH_SELECT}, brands(id, slug, name_en, name_ar)`)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Failed to load products." });
  }

  res.json({ data: (data || []).map(normalizeProduct) });
});

router.patch("/api/admin/products/:id", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const graph = sanitizeProductPayload({ ...req.body, id: req.params.id });
  const validationError = validateProductPayload(graph, false);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { data, error } = await saveProductGraph(userClient, graph, { id: req.params.id });

  if (error) {
    return res.status(500).json({ error: error.message || "Failed to update product." });
  }

  res.json({ data: normalizeProduct(data) });
});

// ── Brands + the original-perfume registry — the two entities the product form
// picks from. Both are admin-writable so a new house or a newly-referenced
// original can be created without leaving the product page. ─────────────────

router.get("/api/admin/brands", requireUser, requireAdmin, async (req, res) => {
  const { data, error } = await createAuthedClient(req.accessToken)
    .from("brands")
    .select("*")
    .order("sort", { ascending: true })
    .order("name_en", { ascending: true });

  if (error) return res.status(500).json({ error: "Failed to load brands." });
  res.json({ data: data || [] });
});

router.post("/api/admin/brands", requireUser, requireAdmin, async (req, res) => {
  const body = req.body || {};
  const name_en = trimValue(body.name_en);
  if (!name_en) return res.status(400).json({ error: "Brand name (EN) is required." });

  const { data, error } = await createAuthedClient(req.accessToken)
    .from("brands")
    .insert({
      slug: slugifyValue(body.slug || name_en),
      name_en,
      name_ar: trimValue(body.name_ar) || null,
      country: trimValue(body.country) || null,
      is_house: parseBool(body.is_house)
    })
    .select()
    .single();

  if (error) {
    const conflict = error.code === "23505";
    return res.status(conflict ? 409 : 500)
      .json({ error: conflict ? "A brand with that name already exists." : "Failed to create brand." });
  }
  res.status(201).json({ data });
});

router.get("/api/admin/originals", requireUser, requireAdmin, async (req, res) => {
  const { data, error } = await createAuthedClient(req.accessToken)
    .from("original_perfumes")
    .select("*, brands(id, slug, name_en, name_ar)")
    .order("name_en", { ascending: true });

  if (error) return res.status(500).json({ error: "Failed to load original perfumes." });
  res.json({ data: data || [] });
});

router.post("/api/admin/originals", requireUser, requireAdmin, async (req, res) => {
  const body = req.body || {};
  const name_en = trimValue(body.name_en);
  const brand_id = trimValue(body.brand_id);
  const audience = trimValue(body.audience);

  if (!name_en) return res.status(400).json({ error: "Original perfume name (EN) is required." });
  if (!brand_id) return res.status(400).json({ error: "The original's house (brand) is required." });
  if (!AUDIENCES.has(audience)) return res.status(400).json({ error: "Audience must be Men, Women, or Unisex." });

  const { data, error } = await createAuthedClient(req.accessToken)
    .from("original_perfumes")
    .insert({
      slug: slugifyValue(body.slug || name_en),
      brand_id,
      name_en,
      name_ar: trimValue(body.name_ar) || null,
      audience,
      year: parseInt(body.year, 10) || null,
      families: parseStringArray(body.families, FAMILIES)
    })
    .select("*, brands(id, slug, name_en, name_ar)")
    .single();

  if (error) {
    const conflict = error.code === "23505";
    return res.status(conflict ? 409 : 500)
      .json({ error: conflict ? "That original perfume already exists." : "Failed to create original perfume." });
  }
  res.status(201).json({ data });
});

router.delete("/api/admin/products/:id", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { error } = await userClient
    .from("products")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    return res.status(500).json({ error: error.message || "Failed to delete product." });
  }

  res.json({ success: true });
});

// ── Image upload — stores in Supabase Storage (works on Vercel / any host) ────

const STORAGE_BUCKET = "brand-assets";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Extension + mimetype whitelist. Notably NO svg: SVGs can carry scripts, and
// the bucket is public — an uploaded SVG would be a stored-XSS vector.
const ALLOWED_IMAGE_TYPES = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".avif", "image/avif"],
  [".gif", "image/gif"],
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const expected = ALLOWED_IMAGE_TYPES.get(ext);
    if (expected && file.mimetype === expected) cb(null, true);
    else cb(new Error("Only png, jpg, webp, avif, or gif images are allowed"));
  }
});

router.post("/api/admin/upload", requireUser, requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file received" });

  const ext = path.extname(req.file.originalname).toLowerCase();
  const filename = "product-" + Date.now() + "-" + randomUUID().slice(0, 8) + ext;
  const storagePath = "images/products/" + filename;

  const serviceKey = SUPABASE_SERVICE_KEY || supabaseAnonKey;
  const storageClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { error } = await storageClient.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

  if (error) return res.status(500).json({ error: "Upload failed: " + error.message });

  const { data } = storageClient.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  res.json({ url: data.publicUrl });
});

module.exports = router;
