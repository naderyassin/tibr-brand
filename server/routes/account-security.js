// OTP-gated account changes for the signed-in user: password, email, phone.
//
//   POST /api/account/security/challenge  { action, new_value, lang }
//        → sends a code, returns { challenge_id, destination_masked, expires_at }
//   POST /api/account/security/verify      { challenge_id, code, new_value }
//        → verifies the code and applies the change
//
// Both require a valid session (requireUser) and are rate-limited (otpLimiter)
// on top of the per-challenge attempt cap enforced in services/security.js.
const express = require("express");
const { requireUser } = require("../middleware/auth");
const { otpLimiter } = require("../middleware/rateLimit");
const security = require("../services/security");

const router = express.Router();

router.post("/api/account/security/challenge", otpLimiter, requireUser, async (req, res) => {
  const { action, new_value, lang } = req.body || {};
  const result = await security.createChallenge({
    user: req.user,
    action,
    newValue: new_value,
    lang: lang === "ar" ? "ar" : "en",
  });
  res.status(result.status).json(result.status === 200 ? result.data : { error: result.error });
});

router.post("/api/account/security/verify", otpLimiter, requireUser, async (req, res) => {
  const { challenge_id, code, new_value } = req.body || {};
  const result = await security.verifyChallenge({
    user: req.user,
    challengeId: challenge_id,
    code,
    newValue: new_value,
  });
  res.status(result.status).json(result.status === 200 ? result.data : { error: result.error });
});

module.exports = router;
