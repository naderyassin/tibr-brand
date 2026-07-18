// TIBR backend entry point.
//
// Wires up the Express app: shared middleware, then the domain route modules
// (each an express.Router mounted with its own full /api paths), then the
// React SPA static serving + store-route fallbacks, then the catch-all. The
// business logic lives in services/, request handling in routes/ — this file
// only assembles them.
const path = require("path");
const fs = require("fs");
const express = require("express");
const compression = require("compression");

const { rootDir, host, port, CACHE_IMMUTABLE } = require("./config");

const app = express();

app.use(compression());

// Serve uploaded product images and brand media from /assets
app.use("/assets", express.static(path.join(rootDir, "assets"), {
  setHeaders: (res, filePath) => {
    if (/\.(png|jpg|jpeg|gif|ico|svg|webp|avif|mp4|webm)$/i.test(path.extname(filePath))) {
      res.setHeader("Cache-Control", "public, max-age=86400");
    }
  }
}));

app.use(express.json());

// ── API + storefront-config routes ───────────────────────────────────────────
// All use full paths internally, so mount order among them is not significant
// (no route shadows another). They must all be registered BEFORE the SPA
// static/fallback handlers below.
app.use(require("./routes/meta"));
app.use(require("./routes/catalog"));
app.use(require("./routes/reviews"));
app.use(require("./routes/orders"));
app.use(require("./routes/checkout"));
app.use(require("./routes/discounts"));
app.use(require("./routes/profile"));
app.use(require("./routes/wishlist"));
app.use(require("./routes/admin"));

// ── React client (production build) ──────────────────────────────────────────
// In production (`npm run client:build` was run), serve the Vite output for all
// store routes. In dev, Vite runs on :5173 and proxies /api back here — these
// routes are never reached from Vite's dev server.
const clientDist = path.join(rootDir, "dist", "client");
const clientDistExists = fs.existsSync(path.join(clientDist, "index.html"));

// Store routes — all handled by the React SPA. "/" is the home/hero page
// (Collection.jsx) and is included here so a fresh load lands on the hero
// instead of falling through to the "/shop" catch-all below.
const STORE_ROUTES = [
  '/',
  '/shop',
  '/shop/all',
  '/shop/perfumes',
  '/shop/perfumes/original', '/shop/perfumes/inspired', '/shop/perfumes/signature',
  '/shop/men', '/shop/women', '/shop/unisex',
  '/shop/original', '/shop/inspired', '/shop/signature',
  '/shop/arabian', '/shop/niche',
  '/shop/candles', '/shop/bakhoor', '/shop/home-fragrance', '/shop/body-splash',
  '/shop/sets', '/shop/samples', '/shop/new-arrivals',
  '/shop/spotlight', '/shop/bestsellers', '/shop/offers',
  '/shop/brands', '/shop/brands/:brand',
  '/product', '/cart', '/checkout',
  '/login', '/signup',
  '/account', '/admin', '/admin/product', '/wishlist',
];

if (clientDistExists) {
  // Serve Vite build assets with long-lived cache. index:false so this
  // static middleware doesn't auto-serve index.html at "/" itself — the
  // explicit STORE_ROUTES handler below does that instead.
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
  res.redirect(301, "/shop");
});

if (!process.env.SKIP_LISTEN) {
  app.listen(port, host, () => {
    console.log(`Tibr server running at http://${host}:${port}`);
  });
}

module.exports = app;

// Exposed for tests (scripts/test-product-graph.cjs) — the product write path
// is a graph across three tables and is worth exercising without booting HTTP
// or minting an admin session. Not used at runtime.
const {
  sanitizeProductPayload,
  validateProductPayload,
  saveProductGraph,
  normalizeProduct,
  PRODUCT_GRAPH_SELECT,
} = require("./services/products");

module.exports.catalog = {
  sanitizeProductPayload,
  validateProductPayload,
  saveProductGraph,
  normalizeProduct,
  PRODUCT_GRAPH_SELECT,
};
