// Rate limiters. The general API ceiling is mounted in index.js; the stricter
// ones guard the endpoints where repeated calls are an attack, not a workload:
// discount-code guessing, order creation (each order also decrements stock),
// and review posting. The Paymob webhook is deliberately NOT limited — Paymob
// retries legitimately and the HMAC check already rejects forgeries.
const rateLimit = require("express-rate-limit");

const json = (message) => ({
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: message },
});

// Broad ceiling for all /api traffic from one IP.
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 600,
  ...json("Too many requests. Please slow down."),
});

// Order creation: /api/checkout, /api/checkout/card, /api/orders.
const checkoutLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  ...json("Too many checkout attempts. Please wait a few minutes."),
});

// Discount-code validation — the brute-force target.
const discountCodeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 15,
  ...json("Too many discount code attempts. Please wait a few minutes."),
});

const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  ...json("Too many reviews submitted. Please try again later."),
});

// Account-security OTP: sending codes and guessing them are both attack
// surfaces (email/SMS flooding on send; brute force on verify). Kept tight —
// each challenge is also attempt-capped in the DB, this is the outer IP ceiling.
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  ...json("Too many verification attempts. Please wait a few minutes."),
});

module.exports = { apiLimiter, checkoutLimiter, discountCodeLimiter, reviewLimiter, otpLimiter };
