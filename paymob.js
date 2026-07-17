// Paymob (Egypt) — Unified Intention integration.
//
// Flow: our backend creates an "intention" with the SECRET key, Paymob returns a
// client_secret, and we redirect the shopper to the hosted Unified Checkout using
// the PUBLIC key + client_secret. Card data never touches our server (low PCI
// scope). Paymob then POSTs a server-to-server webhook we verify by HMAC.
//
// Docs: https://developers.paymob.com/paymob-docs/developers/intention-apis/create-intention
//       https://developers.paymob.com/paymob-docs/developers/webhook-callbacks-and-hmac

const crypto = require("crypto");

const API_BASE = () => process.env.PAYMOB_API_BASE || "https://accept.paymob.com";

// The FIXED field order Paymob concatenates to sign a TRANSACTION (processed)
// callback, then HMAC-SHA512 (hex, lowercase). Nested paths use dots. This order
// is Paymob's published contract for transaction callbacks — if a real sandbox
// transaction ever fails verification, this array is the single thing to re-check
// against the dashboard's callback payload.
const HMAC_FIELD_ORDER = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
];

const resolvePath = (obj, path) =>
  path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

// Booleans become 'true'/'false', numbers stringify, missing → ''. This matches
// how Paymob serialises the values before hashing.
const buildHmacString = (obj) =>
  HMAC_FIELD_ORDER.map((path) => {
    const v = resolvePath(obj, path);
    return v === undefined || v === null ? "" : String(v);
  }).join("");

// Constant-time compare of the received hex hmac against the one we compute.
const verifyHmac = (obj, receivedHmac) => {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret || !receivedHmac || !obj) return false;
  const computed = crypto.createHmac("sha512", secret).update(buildHmacString(obj)).digest("hex");
  const a = Buffer.from(computed);
  const b = Buffer.from(String(receivedHmac));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const isConfigured = () =>
  !!(process.env.PAYMOB_SECRET_KEY && process.env.PAYMOB_PUBLIC_KEY && process.env.PAYMOB_INTEGRATION_IDS);

const integrationIds = () =>
  (process.env.PAYMOB_INTEGRATION_IDS || "")
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n));

// Creates a payment intention and returns the hosted-checkout URL to redirect to.
// `amountPiasters` is the total in the currency's minor unit (EGP × 100).
const createIntention = async ({
  amountPiasters, items, billingData, customer, specialReference, redirectionUrl, notificationUrl,
}) => {
  if (!isConfigured()) {
    throw new Error("Paymob is not configured (set PAYMOB_SECRET_KEY, PAYMOB_PUBLIC_KEY, PAYMOB_INTEGRATION_IDS).");
  }
  const body = {
    amount: amountPiasters,
    currency: "EGP",
    payment_methods: integrationIds(),
    items,
    billing_data: billingData,
    customer,
    special_reference: specialReference,
    extras: { reference: specialReference },
    redirection_url: redirectionUrl,
  };
  if (notificationUrl) body.notification_url = notificationUrl;

  const res = await fetch(`${API_BASE()}/v1/intention/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Token ${process.env.PAYMOB_SECRET_KEY}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || !data.client_secret) {
    const msg = data?.detail || data?.message || (data && JSON.stringify(data)) || `HTTP ${res.status}`;
    throw new Error(`Paymob intention failed: ${msg}`);
  }

  const checkoutUrl =
    `${API_BASE()}/unifiedcheckout/?publicKey=${encodeURIComponent(process.env.PAYMOB_PUBLIC_KEY)}` +
    `&clientSecret=${encodeURIComponent(data.client_secret)}`;

  return { clientSecret: data.client_secret, intentionId: data.id, checkoutUrl };
};

module.exports = {
  HMAC_FIELD_ORDER,
  buildHmacString,
  verifyHmac,
  isConfigured,
  createIntention,
};
