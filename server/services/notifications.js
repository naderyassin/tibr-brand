// Out-of-band delivery for account-security codes.
//
// This is deliberately a CHANNEL ABSTRACTION, not "an email sender": each
// channel is a transport with the same shape, so adding SMS later is dropping in
// one function + wiring an env var — no changes to the security service that
// calls send(). Today `email` is live (SMTP via nodemailer) and `sms` is a stub
// that reports itself unavailable.
//
// Delivery is best-effort-observable: send() returns { delivered, devCode? }.
// When email isn't configured yet, the email transport logs the code to the
// server console and returns delivered:false with the code echoed back ONLY in
// non-production, so the flow is fully testable before SMTP exists — and never
// leaks a code to clients in production.
const { smtpConfig, isProduction } = require("../config");

const ACTION_LABELS = {
  password: { en: "password change", ar: "تغيير كلمة المرور" },
  email: { en: "email change", ar: "تغيير البريد الإلكتروني" },
  phone: { en: "phone number change", ar: "تغيير رقم الهاتف" },
};

// Mask a destination for safe display back to the client ("ah•••@gmail.com").
const maskEmail = (email) => {
  const [name = "", domain = ""] = String(email).split("@");
  const head = name.slice(0, 2);
  return `${head}${"•".repeat(Math.max(1, name.length - 2))}@${domain}`;
};

const maskPhone = (phone) => {
  const d = String(phone).replace(/\s+/g, "");
  return d.length > 4 ? `${d.slice(0, 3)}${"•".repeat(d.length - 5)}${d.slice(-2)}` : d;
};

const maskDestination = (channel, dest) =>
  channel === "sms" ? maskPhone(dest) : maskEmail(dest);

// ── Transports ───────────────────────────────────────────────────────────────

let cachedTransporter = null;
const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;
  // Lazy require so a missing nodemailer install never breaks module load /
  // the dev console fallback — it only matters once SMTP is actually configured.
  const nodemailer = require("nodemailer");
  cachedTransporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: smtpConfig.user ? { user: smtpConfig.user, pass: smtpConfig.pass } : undefined,
  });
  return cachedTransporter;
};

const emailBody = ({ code, action, lang }) => {
  const label = ACTION_LABELS[action] || { en: "account change", ar: "تغيير في الحساب" };
  const isAr = lang === "ar";
  const heading = isAr ? "رمز التحقق من تِبْر" : "Your TIBR verification code";
  const line = isAr
    ? `استخدم هذا الرمز لتأكيد ${label.ar}:`
    : `Use this code to confirm your ${label.en}:`;
  const expiry = isAr
    ? "ينتهي هذا الرمز خلال 10 دقائق. إن لم تطلب هذا التغيير، تجاهل هذه الرسالة وغيّر كلمة المرور."
    : "This code expires in 10 minutes. If you didn't request this change, ignore this email and change your password.";

  const text = `${heading}\n\n${line}\n\n${code}\n\n${expiry}`;
  const html = `<div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;max-width:440px;margin:0 auto;padding:24px;color:#1a1a1a" dir="${isAr ? "rtl" : "ltr"}">
    <p style="letter-spacing:.28em;font-size:12px;color:#9a7b3f;text-transform:uppercase;margin:0 0 16px">TIBR · تِبْر</p>
    <h1 style="font-size:19px;margin:0 0 8px">${heading}</h1>
    <p style="font-size:14px;color:#555;margin:0 0 20px">${line}</p>
    <div style="font-size:34px;font-weight:700;letter-spacing:.34em;background:#f5f1e8;color:#8a6d34;padding:16px 8px;text-align:center;border-radius:12px;margin:0 0 20px">${code}</div>
    <p style="font-size:12px;color:#888;line-height:1.6;margin:0">${expiry}</p>
  </div>`;

  return { subject: `${code} — ${heading}`, text, html };
};

const transports = {
  email: async ({ to, code, action, lang }) => {
    if (!smtpConfig.configured) {
      // No SMTP yet: log so the flow works in dev, and only surface the code to
      // the caller when we're NOT in production.
      console.log(`[otp] email transport not configured — code for ${to} (${action}): ${code}`);
      return { delivered: false, devCode: isProduction ? undefined : code };
    }
    const { subject, text, html } = emailBody({ code, action, lang });
    await getTransporter().sendMail({ from: smtpConfig.from, to, subject, text, html });
    return { delivered: true };
  },

  // Not wired yet. Kept as an explicit unavailable transport so the security
  // service can offer 'sms' the moment a provider (Twilio/Vonage/etc.) is added
  // here — see docs/SECURITY-OTP.md.
  sms: async () => {
    throw new Error("SMS delivery is not configured yet.");
  },
};

// send({ channel, to, code, action, lang }) → { delivered, devCode? }
const send = async ({ channel = "email", to, code, action, lang = "en" }) => {
  const transport = transports[channel];
  if (!transport) throw new Error(`Unknown notification channel: ${channel}`);
  return transport({ to, code, action, lang });
};

module.exports = { send, maskDestination };
