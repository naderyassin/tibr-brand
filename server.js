const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");
const express = require("express");
const compression = require("compression");
const dotenv = require("dotenv");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

const app = express();
const host = process.env.HOST || "127.0.0.1";
const port = process.env.PORT || 3000;
const rootDir = __dirname;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Set SUPABASE_URL/SUPABASE_ANON_KEY or VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY."
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

app.use(compression());

const CACHE_DURATION = 365 * 24 * 60 * 60; // 1 year
const CACHE_IMMUTABLE = `public, max-age=${CACHE_DURATION}, immutable`;

// Serve uploaded product images and brand media from /assets
app.use("/assets", express.static(path.join(rootDir, "assets"), {
  setHeaders: (res, filePath) => {
    if (/\.(png|jpg|jpeg|gif|ico|svg|webp|avif|mp4|webm)$/i.test(path.extname(filePath))) {
      res.setHeader("Cache-Control", "public, max-age=86400");
    }
  }
}));

app.use(express.json());

const normalizeSizes = (sizes) => {
  if (Array.isArray(sizes)) {
    return sizes;
  }

  if (typeof sizes === "string" && sizes.trim()) {
    try {
      const parsed = JSON.parse(sizes);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_) {
      return sizes.split(/[,،]/).map((size) => size.trim()).filter(Boolean);
    }
  }

  return [];
};

const normalizeProduct = (product) => ({
  ...product,
  price: parsePrice(product.ar_price || product.en_price || product.price),
  sizes: normalizeSizes(product.sizes)
});

const PRODUCT_CATEGORIES = new Set(["perfumes"]);

const trimValue = (value) => (typeof value === "string" ? value.trim() : value);

const parseSizesInput = (sizes) => {
  if (Array.isArray(sizes)) {
    return sizes.map((size) => trimValue(size)).filter(Boolean);
  }

  if (typeof sizes === "string") {
    const text = sizes.trim();
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((size) => trimValue(size)).filter(Boolean);
      }
    } catch (_) {
      // fall back to comma-separated parsing
    }

    return text
      .split(/[,،]/)
      .map((size) => size.trim())
      .filter(Boolean);
  }

  return [];
};

const sanitizeProductPayload = (payload) => {
  const sizes = parseSizesInput(payload.sizes);
  const cat = trimValue(payload.category);
  const arPrice = payload.ar_price ?? payload.arPrice;
  const enPrice = payload.en_price ?? payload.enPrice;

  return {
    id: trimValue(payload.id),
    category: cat,
    image: trimValue(payload.image) || null,
    ar_name: trimValue(payload.ar_name) || null,
    en_name: trimValue(payload.en_name) || null,
    ar_price: parsePrice(arPrice),
    en_price: parsePrice(enPrice),
    quantity: parseInt(payload.quantity, 10) || 0,
    sizes,
    review_avg: Math.min(5, Math.max(0, parseFloat(payload.review_avg) || 0)),
    review_count: parseInt(payload.review_count, 10) || 0,
    ar_desc: trimValue(payload.ar_desc) || null,
    en_desc: trimValue(payload.en_desc) || null
  };
};

const validateProductPayload = (payload, requireId = true) => {
  if (requireId && !payload.id) return "id is required.";
  if (!payload.category || !PRODUCT_CATEGORIES.has(payload.category)) return "category is required.";
  if (!payload.en_name) return "Product name is required.";
  if (!(Number.isFinite(payload.ar_price) && payload.ar_price > 0) || !(Number.isFinite(payload.en_price) && payload.en_price > 0)) return "Arabic/English prices are required.";
  if (!payload.image) return "image is required.";
  return null;
};

const parsePrice = (price) => {
  if (typeof price === "number") return price;
  return Number(
    String(price || "")
      .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
      .replace(/[^0-9.]/g, "")
  ) || 0;
};

const PAYMENT_METHODS = new Set([
  "cash_on_delivery",
  "vodafone_cash",
  "instapay"
]);

const isLegacyOrdersSchemaError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();
  const hint = String(error?.hint || "").toLowerCase();
  const combined = `${message} ${details} ${hint}`;

  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    /qty|payment_method|checkout_reference|unit_price|order_total/.test(combined)
  );
};

const toLegacyOrderRow = (row) => ({
  user_id: row.user_id,
  product_id: row.product_id,
  size: row.size,
  status: row.status,
  customer_name: row.customer_name,
  customer_phone: row.customer_phone,
  customer_address: row.customer_address
});

const insertOrdersCompat = async (client, rows) => {
  let response = await client.from("orders").insert(rows).select();

  if (response.error && isLegacyOrdersSchemaError(response.error)) {
    response = await client
      .from("orders")
      .insert(rows.map(toLegacyOrderRow))
      .select();
  }

  return response;
};

const selectOrdersCompat = async (client, userId) => {
  let response = await client
    .from("orders")
    .select("id, status, size, qty, payment_method, checkout_reference, unit_price, order_total, customer_name, customer_address, created_at, product_id, products(id, ar_name, en_name, ar_price, en_price, image)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (response.error && isLegacyOrdersSchemaError(response.error)) {
    response = await client
      .from("orders")
      .select("id, status, size, customer_name, customer_address, created_at, product_id, products(id, ar_name, en_name, ar_price, en_price, image)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!response.error && Array.isArray(response.data)) {
      response.data = response.data.map((order) => ({
        ...order,
        qty: 1,
        payment_method: "cash_on_delivery",
        checkout_reference: null,
        unit_price: null,
        order_total: null
      }));
    }
  }

  return response;
};

const getAccessToken = (req) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
};

const createAuthedClient = (token) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

const requireUser = async (req, res, next) => {
  const token = getAccessToken(req);

  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Auth timeout")), 8000)
    );
    const authCall = supabase.auth.getUser(token);
    const { data: { user }, error } = await Promise.race([authCall, timeout]);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired session." });
    }

    req.user = user;
    req.accessToken = token;
    next();
  } catch {
    return res.status(503).json({ error: "Auth service unavailable." });
  }
};

const requireAdmin = async (req, res, next) => {
  const userClient = createAuthedClient(req.accessToken);

  const { data: profile, error } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", req.user.id)
    .single();

  if (error) {
    return res.status(500).json({ error: "Failed to load user profile." });
  }

  if (!profile || profile.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }

  next();
};

const ADMIN_ORDER_STATUSES = new Set([
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled"
]);

app.get("/js/config.js", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.type("application/javascript");
  res.send(`window.TIBR_CONFIG=${JSON.stringify({ url: supabaseUrl, key: supabaseAnonKey })};`);
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/products", async (_req, res) => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return res.status(500).json({ error: "Failed to load products." });
  }

  res.json({ data: data.map(normalizeProduct) });
});

app.get("/api/products/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: "Failed to load product." });
  if (!data) return res.status(404).json({ error: "Product not found." });

  res.json({ data: normalizeProduct(data) });
});

app.get("/api/profile", requireUser, async (req, res) => {
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

app.post("/api/orders", requireUser, async (req, res) => {
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

  const quantity = Number(qty) > 0 ? Number(qty) : 1;
  const safePaymentMethod = PAYMENT_METHODS.has(paymentMethod)
    ? paymentMethod
    : "cash_on_delivery";

  const unitPrice = parsePrice(product.ar_price || product.en_price);
  const orderTotal = unitPrice * quantity;

  const { data, error } = await insertOrdersCompat(userClient, [{
      user_id: req.user.id,
      product_id: productId,
      size: size || null,
      qty: quantity,
      status: "pending",
      payment_method: safePaymentMethod,
      checkout_reference: randomUUID(),
      unit_price: unitPrice,
      order_total: orderTotal,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress || null
    }]);

  if (error) {
    return res.status(500).json({ error: "Failed to create order." });
  }

  res.status(201).json({ data: Array.isArray(data) ? data[0] : data });
});

app.post("/api/checkout", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const {
    items,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_address: customerAddress,
    payment_method: paymentMethod
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
  const productIds = [...new Set(items.map((item) => item.productId).filter(Boolean))];

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, ar_price, en_price")
    .in("id", productIds);

  if (productsError) {
    return res.status(500).json({ error: "Failed to load selected products." });
  }

  const productsMap = new Map((products || []).map((product) => [product.id, product]));
  const checkoutReference = randomUUID();
  const orderRows = [];

  for (const item of items) {
    const product = productsMap.get(item.productId);
    if (!product) {
      return res.status(400).json({ error: `Product not found: ${item.productId}` });
    }

    const quantity = Number(item.qty) > 0 ? Number(item.qty) : 1;
    const unitPrice = parsePrice(product.ar_price || product.en_price);

    orderRows.push({
      user_id: req.user.id,
      product_id: item.productId,
      size: item.size || null,
      qty: quantity,
      status: "pending",
      payment_method: safePaymentMethod,
      checkout_reference: checkoutReference,
      unit_price: unitPrice,
      order_total: unitPrice * quantity,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress
    });
  }

  const { data, error } = await insertOrdersCompat(userClient, orderRows);

  if (error) {
    return res.status(500).json({ error: error.message || "Failed to complete checkout." });
  }

  const totalAmount = orderRows.reduce((sum, row) => sum + (row.order_total || 0), 0);
  const itemCount = orderRows.reduce((sum, row) => sum + (row.qty || 0), 0);

  res.status(201).json({
    data: {
      checkout_reference: checkoutReference,
      payment_method: safePaymentMethod,
      total_amount: totalAmount,
      item_count: itemCount,
      orders: (data || []).map((order, index) => ({
        ...order,
        qty: order.qty ?? orderRows[index]?.qty ?? 1,
        payment_method: order.payment_method ?? safePaymentMethod,
        checkout_reference: order.checkout_reference ?? checkoutReference,
        unit_price: order.unit_price ?? orderRows[index]?.unit_price ?? null,
        order_total: order.order_total ?? orderRows[index]?.order_total ?? null
      }))
    }
  });
});

app.get("/api/orders", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);

  const { data, error } = await selectOrdersCompat(userClient, req.user.id);

  if (error) {
    return res.status(500).json({ error: "Failed to load orders." });
  }

  res.json({ data });
});

app.get("/api/admin/orders", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  let { data, error } = await userClient
    .from("orders")
    .select("id, status, size, qty, payment_method, checkout_reference, unit_price, order_total, customer_name, customer_phone, customer_address, created_at, user_id, product_id, products(id, ar_name, en_name, ar_price, en_price, image)")
    .order("created_at", { ascending: false });

  if (error && isLegacyOrdersSchemaError(error)) {
    ({ data, error } = await userClient
      .from("orders")
      .select("id, status, size, customer_name, customer_phone, customer_address, created_at, user_id, product_id, products(id, ar_name, en_name, ar_price, en_price, image)")
      .order("created_at", { ascending: false }));

    if (!error && Array.isArray(data)) {
      data = data.map((order) => ({
        ...order,
        qty: 1,
        payment_method: "cash_on_delivery",
        checkout_reference: null,
        unit_price: null,
        order_total: null
      }));
    }
  }

  if (error) {
    return res.status(500).json({ error: "Failed to load admin orders." });
  }

  res.json({ data });
});

app.patch("/api/admin/orders/:id", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const nextStatus = String(req.body?.status || "").trim().toLowerCase();

  if (!ADMIN_ORDER_STATUSES.has(nextStatus)) {
    return res.status(400).json({ error: "Invalid order status." });
  }

  const { data, error } = await userClient
    .from("orders")
    .update({ status: nextStatus })
    .eq("id", req.params.id)
    .select("id, status, size, qty, payment_method, checkout_reference, unit_price, order_total, customer_name, customer_phone, customer_address, created_at, user_id, product_id")
    .single();

  if (error && isLegacyOrdersSchemaError(error)) {
    const legacyResponse = await userClient
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", req.params.id)
      .select("id, status, size, customer_name, customer_phone, customer_address, created_at, user_id, product_id")
      .single();

    if (legacyResponse.error) {
      return res.status(500).json({ error: "Failed to update order status." });
    }

    return res.json({
      data: {
        ...legacyResponse.data,
        qty: 1,
        payment_method: "cash_on_delivery",
        checkout_reference: null,
        unit_price: null,
        order_total: null
      }
    });
  }

  if (error) {
    return res.status(500).json({ error: "Failed to update order status." });
  }

  res.json({ data });
});

app.put("/api/profile", requireUser, async (req, res) => {
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

app.get("/api/profile/addresses", requireUser, async (req, res) => {
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

app.post("/api/profile/addresses", requireUser, async (req, res) => {
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

app.delete("/api/profile/addresses/:id", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { error } = await userClient
    .from("addresses")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error: "Failed to delete address." });
  res.json({ success: true });
});

app.put("/api/profile/addresses/:id", requireUser, async (req, res) => {
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

app.put("/api/profile/addresses/:id/default", requireUser, async (req, res) => {
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

// ── Reviews ──────────────────────────────────────────────────────────────────

app.get("/api/products/:id/reviews", async (req, res) => {
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

app.post("/api/products/:id/reviews", requireUser, async (req, res) => {
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

// ── Products (Admin) ─────────────────────────────────────────────────────────

app.post("/api/products", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const productToInsert = sanitizeProductPayload(req.body || {});
  const validationError = validateProductPayload(productToInsert, true);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { data, error } = await userClient
    .from("products")
    .insert(productToInsert)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message || "Failed to save product." });
  }

  res.status(201).json({ data: normalizeProduct(data) });
});

app.post("/api/admin/products", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const productToInsert = sanitizeProductPayload(req.body || {});
  const validationError = validateProductPayload(productToInsert, true);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { data, error } = await userClient
    .from("products")
    .insert(productToInsert)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message || "Failed to save product." });
  }

  res.status(201).json({ data: normalizeProduct(data) });
});

app.get("/api/admin/products", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const { data, error } = await userClient
    .from("products")
    .select("*")
    .order("category", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: "Failed to load products." });
  }

  res.json({ data: (data || []).map(normalizeProduct) });
});

app.patch("/api/admin/products/:id", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const productToUpdate = sanitizeProductPayload(req.body || {});
  delete productToUpdate.id;
  const validationError = validateProductPayload({ ...productToUpdate, id: req.params.id }, false);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { data, error } = await userClient
    .from("products")
    .update(productToUpdate)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message || "Failed to update product." });
  }

  res.json({ data: normalizeProduct(data) });
});

app.delete("/api/admin/products/:id", requireUser, requireAdmin, async (req, res) => {
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

// Image upload — stores in Supabase Storage (works on Vercel / any host)
const STORAGE_BUCKET = "brand-assets";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (_req, file, cb) {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  }
});

app.post("/api/admin/upload", requireUser, requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file received" });

  const ext = path.extname(req.file.originalname).toLowerCase() || ".jpg";
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

// ── React client (production build) ──────────────────────────────────────────
// In production (`npm run build` was run), serve the Vite output for all store
// routes.  In dev, Vite runs on :5173 and proxies /api back here — these routes
// are never reached from Vite's dev server.
const clientDist = path.join(rootDir, "dist", "client");
const clientDistExists = fs.existsSync(path.join(clientDist, "index.html"));

// Store routes — all handled by the React SPA
const STORE_ROUTES = [
  '/shop/perfumes',
  '/product', '/cart', '/checkout',
  '/login', '/signup',
  '/account', '/admin', '/admin/product', '/wishlist',
];

if (clientDistExists) {
  // Serve Vite build assets with long-lived cache.
  // index:false so the build's index.html never auto-serves at "/" — the root
  // must stay the locked vanilla Egyptian landing (served by the "*" fallback).
  app.use(express.static(clientDist, {
    index: false,
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath);
      if (/\.(js|css|mjs)$/i.test(ext)) {
        res.setHeader("Cache-Control", "no-cache");
      } else if (/\.(png|jpg|jpeg|gif|ico|svg|webp|avif|woff2?|ttf)$/i.test(ext)) {
        res.setHeader("Cache-Control", CACHE_IMMUTABLE);
      }
    }
  }));

  STORE_ROUTES.forEach(route => {
    app.get(route, (_req, res) =>
      res.sendFile(path.join(clientDist, "index.html"))
    );
  });
} else {
  // No build present. In dev, Vite serves the store on :5173 (`npm run client:dev`).
  // For a production server the build is required — run `npm run client:build`.
  console.warn(
    "[store] dist/client not found — store routes are unavailable until you run `npm run client:build`."
  );
}

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }
  res.redirect(301, "/shop/perfumes");
});

if (!process.env.SKIP_LISTEN) {
  app.listen(port, host, () => {
    console.log(`Tibr server running at http://${host}:${port}`);
  });
}

module.exports = app;
