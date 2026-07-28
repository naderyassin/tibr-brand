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
const helmet = require("helmet");

const { rootDir, host, port, CACHE_IMMUTABLE } = require("./config");
const { apiLimiter } = require("./middleware/rateLimit");
const { trafficMonitor } = require("./middleware/traffic");

const app = express();

// One hop in front of us in production (Hostinger reverse proxy / NGINX / Cloudflare) — needed so req.ip reflects
// the real client for rate limiting, not the proxy.
app.set("trust proxy", 1);

// CSP is off for now: the SPA loads images/fonts and calls Supabase cross-origin,
// so a real policy needs an allowlist built for those origins first.
app.use(helmet({ contentSecurityPolicy: false }));

app.use(compression());

// Counts document + /api requests per IP into a rolling window. Mounted before
// the routes so it sees everything, including requests the rate limiter later
// rejects — a blocked flood is exactly what we want visible. Read it back at
// GET /api/admin/traffic.
app.use(trafficMonitor);

// Serve uploaded product images and brand media from /assets
app.use("/assets", express.static(path.join(rootDir, "assets"), {
  setHeaders: (res, filePath) => {
    if (/\.(png|jpg|jpeg|gif|ico|svg|webp|avif|mp4|webm|woff2?|ttf)$/i.test(path.extname(filePath))) {
      res.setHeader("Cache-Control", CACHE_IMMUTABLE);
    }
  }
}));

app.use(express.json());

app.use("/api", apiLimiter);

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
app.use(require("./routes/account-security"));
app.use(require("./routes/wishlist"));
app.use(require("./routes/admin"));

// ── React client (production build) ──────────────────────────────────────────
// In production (`npm run client:build` was run), serve the Vite output for all
// store routes. In dev, Vite runs on :5173 and proxies /api back here — these
// routes are never reached from Vite's dev server.
const clientDist = path.join(rootDir, "dist", "client");
const indexPath = path.join(clientDist, "index.html");

if (fs.existsSync(clientDist)) {
  // index:false so this static middleware doesn't auto-serve index.html at
  // "/" itself — the SPA fallback below does that with explicit no-cache.
  app.use(express.static(clientDist, {
    index: false,
    setHeaders: (res, filePath) => {
      // Everything Vite emits under assets/ is content-hashed → cache forever.
      const isAssetFolder = filePath.includes("assets") || filePath.includes("assets/");
      const isMediaOrFont = /\.(png|jpg|jpeg|gif|ico|svg|webp|avif|woff2?|ttf)$/i.test(filePath);
      if (isAssetFolder || isMediaOrFont) {
        res.setHeader("Cache-Control", CACHE_IMMUTABLE);
      } else {
        res.setHeader("Cache-Control", "no-cache");
      }
    }
  }));
}

// SPA fallback: every non-API, non-file GET gets index.html, and React Router
// owns the path.
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  if (path.extname(req.path)) return next();

  if (fs.existsSync(indexPath)) {
    res.setHeader("Cache-Control", "no-cache");
    return res.sendFile(indexPath);
  }

  res.redirect(302, "/");
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
