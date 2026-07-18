// Authentication + authorization middleware.
//
//   requireUser       — verifies the bearer token, sets req.user / req.accessToken
//   requireAdmin      — loads the profile role, requires admin | super_admin
//   requireSuperAdmin — requires super_admin (chain AFTER requireAdmin)
const { supabase, getAccessToken, createAuthedClient } = require("../db");

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

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

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

  if (!profile || !ADMIN_ROLES.has(profile.role)) {
    return res.status(403).json({ error: "Admin access required." });
  }

  req.role = profile.role;
  next();
};

// Stricter than requireAdmin — only the super_admin tier can grant admin
// access to someone else. Chain after requireAdmin so req.role is set.
const requireSuperAdmin = (req, res, next) => {
  if (req.role !== "super_admin") {
    return res.status(403).json({ error: "Super admin access required." });
  }
  next();
};

module.exports = {
  requireUser,
  requireAdmin,
  requireSuperAdmin,
  ADMIN_ROLES,
};
