// One-time-code primitives for the account-security OTP flow.
//
// Codes are short (6 digits) by necessity — a human types them — so the security
// comes from the surrounding controls (short expiry, low attempt cap, rate
// limiting), NOT from the code space. We still never store a code in the clear:
// only a peppered SHA-256 hash lands in the database, and comparisons are
// constant-time so a timing side channel can't leak it.
const crypto = require("crypto");
const { otpConfig } = require("../config");

// A uniformly-distributed numeric code of `length` digits, leading zeros kept.
const generateCode = (length = otpConfig.codeLength) => {
  const max = 10 ** length;
  // randomInt is unbiased over [0, max); pad to preserve leading zeros.
  return String(crypto.randomInt(0, max)).padStart(length, "0");
};

// Peppered hash. The pepper (a server secret) means a leaked DB dump alone can't
// be brute-forced offline without also stealing the app secret.
const hash = (value) =>
  crypto.createHash("sha256").update(`${otpConfig.pepper}:${value}`).digest("hex");

const hashCode = (code) => hash(String(code).trim());

// Binds a challenge to the exact requested change (new password/email/phone), so
// a verified code cannot be replayed to apply a different value. Normalized so
// trivial whitespace/case differences don't break a legitimate match for email.
const hashTarget = (action, value) => {
  const normalized =
    action === "email" ? String(value).trim().toLowerCase() : String(value);
  return hash(`${action}:${normalized}`);
};

// Constant-time equality over the hex digests. timingSafeEqual throws on length
// mismatch, so guard first (hex of same-length inputs is always equal length,
// but be defensive against a malformed stored value).
const safeEqualHex = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
};

module.exports = { generateCode, hashCode, hashTarget, safeEqualHex };
