const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const ws = require("ws");
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
  },
  realtime: {
    transport: ws
  }
});

app.use(express.json());

const normalizeProduct = (product) => ({
  ...product,
  sizes: Array.isArray(product.sizes)
    ? product.sizes
    : typeof product.sizes === "string" && product.sizes.trim()
      ? JSON.parse(product.sizes)
      : []
});

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
    realtime: {
      transport: ws
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

  const {
    data: { user },
    error
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: "Invalid or expired session." });
  }

  req.user = user;
  req.accessToken = token;
  next();
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

app.get("/api/profile", requireUser, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);

  const { data, error } = await userClient
    .from("profiles")
    .select("id, full_name, phone_number, address, gender, date_of_birth, role")
    .eq("id", req.user.id)
    .single();

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
    .select("id")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return res.status(400).json({ error: "Selected product does not exist." });
  }

  const { data, error } = await userClient
    .from("orders")
    .insert({
      user_id: req.user.id,
      product_id: productId,
      size: size || null,
      status: "pending",
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress || null
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: "Failed to create order." });
  }

  res.status(201).json({ data });
});

app.post("/api/products", requireUser, requireAdmin, async (req, res) => {
  const userClient = createAuthedClient(req.accessToken);
  const payload = req.body || {};

  if (!payload.id || !payload.category || !payload.gender || !payload.image) {
    return res.status(400).json({
      error: "id, category, gender, and image are required."
    });
  }

  if (!payload.ar_name || !payload.en_name || !payload.ar_price || !payload.en_price) {
    return res.status(400).json({
      error: "Arabic/English names and prices are required."
    });
  }

  const productToInsert = {
    ...payload,
    sizes: Array.isArray(payload.sizes) ? payload.sizes : []
  };

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

app.use(express.static(rootDir, { extensions: ["html"] }));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  res.sendFile(path.join(rootDir, "index.html"));
});

if (!process.env.SKIP_LISTEN) {
  app.listen(port, host, () => {
    console.log(`Robabikia server running at http://${host}:${port}`);
  });
}

module.exports = app;
