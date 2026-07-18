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

const isProduction = process.env.NODE_ENV === "production";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Set SUPABASE_URL/SUPABASE_ANON_KEY or VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY."
  );
}

// ── Security OTP (account changes: password / email / phone) ─────────────────
// Codes are hashed with this pepper before storage; a strong dedicated value is
// preferred, but we fall back to the service-role key (already a secret in this
// environment) so the feature is never silently unpeppered.
const otpConfig = {
  pepper: process.env.OTP_PEPPER || supabaseServiceRoleKey || supabaseAnonKey,
  ttlMinutes: Number(process.env.OTP_TTL_MINUTES) || 10,
  codeLength: 6,
  maxAttempts: 5,
};

// ── Outbound email (SMTP) — powers OTP delivery ──────────────────────────────
// When SMTP_HOST is set, notifications go out as real email (nodemailer). When
// it isn't, the email transport degrades to logging the code to the server
// console (dev), so the whole flow is testable before SMTP is provisioned.
const smtpConfig = {
  host: process.env.SMTP_HOST || "",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
  user: process.env.SMTP_USER || "",
  pass: process.env.SMTP_PASS || "",
  from: process.env.SMTP_FROM || process.env.SMTP_USER || "TIBR <no-reply@tibr.example>",
  configured: !!process.env.SMTP_HOST,
};

const CACHE_DURATION = 365 * 24 * 60 * 60; // 1 year
const CACHE_IMMUTABLE = `public, max-age=${CACHE_DURATION}, immutable`;

module.exports = {
  rootDir,
  host,
  port,
  isProduction,
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  otpConfig,
  smtpConfig,
  CACHE_DURATION,
  CACHE_IMMUTABLE,
};
