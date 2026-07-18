// Account-security business logic: the two-step, OTP-gated change flow for a
// signed-in user's password, email, and phone.
//
//   createChallenge → validate the requested change, mint a code, store only its
//                     hash + a hash of the target value, deliver the code.
//   verifyChallenge → check the code (attempt-capped, expiry-bound, value-bound),
//                     then apply the change with the service role.
//
// The change is applied SERVER-SIDE (Supabase admin API for auth attributes, a
// service-role write for the phone profile field), so the code is a real gate:
// the mutation cannot happen without a verified challenge.
const { createServiceClient } = require("../db");
const { otpConfig } = require("../config");
const { generateCode, hashCode, hashTarget, safeEqualHex } = require("../lib/otp");
const notifications = require("./notifications");

const ACTIONS = new Set(["password", "email", "phone"]);

// ── Input validation ─────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Egyptian mobile numbers are 11 digits (01X…); accept an optional +20/0020
// country prefix and normalize to the local 11-digit form for storage.
const normalizePhone = (raw) => {
  const digits = String(raw).replace(/[^\d]/g, "");
  const local = digits.replace(/^(0020|20)/, "");
  return local.startsWith("0") ? local : `0${local}`;
};

const validateChange = (action, rawValue) => {
  const value = String(rawValue ?? "").trim();
  if (action === "password") {
    if (value.length < 8) return { error: "Password must be at least 8 characters." };
    if (value.length > 72) return { error: "Password is too long (max 72 characters)." };
    return { value };
  }
  if (action === "email") {
    const email = value.toLowerCase();
    if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
    return { value: email };
  }
  if (action === "phone") {
    const phone = normalizePhone(value);
    if (!/^01\d{9}$/.test(phone)) return { error: "Enter a valid Egyptian mobile number (11 digits)." };
    return { value: phone };
  }
  return { error: "Unsupported action." };
};

// ── Create ───────────────────────────────────────────────────────────────────

// user: the authed req.user (has id + email). Returns a client-safe descriptor
// of the pending challenge (never the code, unless dev echo from notifications).
const createChallenge = async ({ user, action, newValue, lang = "en" }) => {
  if (!ACTIONS.has(action)) return { status: 400, error: "Unsupported action." };

  const { value, error } = validateChange(action, newValue);
  if (error) return { status: 400, error };

  // No-op guards: don't send a code to change something to its current value.
  if (action === "email" && value === String(user.email || "").toLowerCase()) {
    return { status: 400, error: "That's already your email address." };
  }

  // Where the code goes: proving the NEW mailbox for an email change; proving the
  // account owner (current email) for password/phone. SMS would target the phone.
  const channel = "email";
  const destination = action === "email" ? value : user.email;
  if (!destination) return { status: 400, error: "No verification destination on file." };

  const svc = createServiceClient();

  // Clear any earlier unconsumed challenge for this same action so only the
  // latest code is live (prevents a pile-up and old-code confusion).
  await svc
    .from("otp_challenges")
    .delete()
    .eq("user_id", user.id)
    .eq("action", action)
    .is("consumed_at", null);

  const code = generateCode();
  const expiresAt = new Date(Date.now() + otpConfig.ttlMinutes * 60 * 1000).toISOString();

  const { data: challenge, error: insertError } = await svc
    .from("otp_challenges")
    .insert({
      user_id: user.id,
      action,
      channel,
      destination,
      code_hash: hashCode(code),
      target_hash: hashTarget(action, value),
      max_attempts: otpConfig.maxAttempts,
      expires_at: expiresAt,
    })
    .select("id, expires_at")
    .single();

  if (insertError) {
    console.error("[security] failed to create challenge:", insertError.message);
    return { status: 500, error: "Could not start verification. Please try again." };
  }

  let delivery;
  try {
    delivery = await notifications.send({ channel, to: destination, code, action, lang });
  } catch (err) {
    console.error("[security] failed to send code:", err.message);
    return { status: 502, error: "Could not send the verification code. Please try again." };
  }

  return {
    status: 200,
    data: {
      challenge_id: challenge.id,
      channel,
      destination_masked: notifications.maskDestination(channel, destination),
      expires_at: challenge.expires_at,
      delivered: delivery.delivered,
      ...(delivery.devCode ? { dev_code: delivery.devCode } : {}),
    },
  };
};

// ── Verify + apply ─────────────────────────────────────────────────────────────

const applyChange = async (svc, user, action, value) => {
  if (action === "password") {
    const { error } = await svc.auth.admin.updateUserById(user.id, { password: value });
    if (error) throw new Error(error.message || "Failed to update password.");
    return {};
  }
  if (action === "email") {
    const { error } = await svc.auth.admin.updateUserById(user.id, {
      email: value,
      email_confirm: true, // we already proved the new mailbox via the OTP
    });
    if (error) throw new Error(error.message || "Failed to update email.");
    return { email: value };
  }
  if (action === "phone") {
    const { error } = await svc.from("profiles").update({ phone_number: value }).eq("id", user.id);
    if (error) throw new Error(error.message || "Failed to update phone number.");
    return { phone_number: value };
  }
  throw new Error("Unsupported action.");
};

const verifyChallenge = async ({ user, challengeId, code, newValue }) => {
  if (!challengeId || !code) return { status: 400, error: "Missing verification code." };

  const svc = createServiceClient();

  const { data: challenge, error } = await svc
    .from("otp_challenges")
    .select("*")
    .eq("id", challengeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[security] failed to load challenge:", error.message);
    return { status: 500, error: "Verification failed. Please try again." };
  }
  if (!challenge) return { status: 404, error: "This verification has expired. Start again." };
  if (challenge.consumed_at) return { status: 410, error: "This code was already used. Start again." };
  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    return { status: 410, error: "This code has expired. Request a new one." };
  }
  if (challenge.attempts >= challenge.max_attempts) {
    await svc.from("otp_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", challenge.id);
    return { status: 429, error: "Too many incorrect attempts. Start again." };
  }

  // Re-validate + re-bind: the value presented at verify must match the exact
  // value the code was issued for (target_hash), so a code can't be repurposed.
  const { value, error: valError } = validateChange(challenge.action, newValue);
  if (valError) return { status: 400, error: valError };
  if (!safeEqualHex(challenge.target_hash, hashTarget(challenge.action, value))) {
    return { status: 400, error: "The change details don't match this verification. Start again." };
  }

  // Wrong code: burn an attempt, lock out on the last one.
  if (!safeEqualHex(challenge.code_hash, hashCode(code))) {
    const attempts = challenge.attempts + 1;
    const consumed = attempts >= challenge.max_attempts;
    await svc
      .from("otp_challenges")
      .update({ attempts, ...(consumed ? { consumed_at: new Date().toISOString() } : {}) })
      .eq("id", challenge.id);
    return {
      status: 401,
      error: consumed
        ? "Incorrect code. Too many attempts — start again."
        : `Incorrect code. ${challenge.max_attempts - attempts} attempt(s) left.`,
    };
  }

  // Correct: consume first (so the same code can't be double-applied), then apply.
  await svc.from("otp_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", challenge.id);

  let applied;
  try {
    applied = await applyChange(svc, user, challenge.action, value);
  } catch (err) {
    console.error("[security] failed to apply change:", err.message);
    return { status: 500, error: err.message || "Verified, but the change could not be applied." };
  }

  return { status: 200, data: { success: true, action: challenge.action, ...applied } };
};

module.exports = { createChallenge, verifyChallenge };
