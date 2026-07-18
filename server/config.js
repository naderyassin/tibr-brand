// Environment + shared runtime configuration.
//
// Loads .env (from the process CWD, i.e. the repo root when the server is
// started with `npm start` / `node server/index.js`) and exposes the values the
// rest of the backend needs. `rootDir` deliberately resolves to the REPO ROOT
// (one level up from this file) so paths to /assets and dist/client are
// unchanged from when everything lived in a single root-level server.js.
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const rootDir = path.resolve(__dirname, "..");
const host = process.env.HOST || "127.0.0.1";
const port = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Set SUPABASE_URL/SUPABASE_ANON_KEY or VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY."
  );
}

const CACHE_DURATION = 365 * 24 * 60 * 60; // 1 year
const CACHE_IMMUTABLE = `public, max-age=${CACHE_DURATION}, immutable`;

module.exports = {
  rootDir,
  host,
  port,
  supabaseUrl,
  supabaseAnonKey,
  CACHE_DURATION,
  CACHE_IMMUTABLE,
};
