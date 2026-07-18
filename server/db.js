// Supabase client factories + the request access-token helper.
//
// `supabase` is the shared anon client used for public reads. Per-request work
// that must respect RLS uses createAuthedClient(token); server-only work that
// must bypass RLS (looking up discount codes, admin user lookups) uses
// createServiceClient().
const { createClient } = require("@supabase/supabase-js");
const { supabaseUrl, supabaseAnonKey } = require("./config");

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
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
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

// Bypasses RLS — used server-side only, for looking up a discount code at
// checkout without granting shoppers direct table read access (which would
// let the client SDK enumerate every active code).
const createServiceClient = () =>
  createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

module.exports = {
  supabase,
  getAccessToken,
  createAuthedClient,
  createServiceClient,
};
