// Order confirmations via Meta's WhatsApp Cloud API. Best-effort: a failed
// send never blocks or fails the checkout — see docs/WHATSAPP.md for setup.
const { whatsappConfig } = require("../config");

// Egyptian local numbers are stored as 01xxxxxxxxx; the Cloud API wants full
// international digits with no leading zero or "+" (e.g. 201012345678).
const toInternational = (phone) => {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  return digits;
};

const sendOrderConfirmation = async ({ phone, name, orderId, total }) => {
  if (!whatsappConfig.configured) {
    console.log(`[whatsapp] not configured — order confirmation for ${phone} (order ${orderId}) skipped`);
    return { delivered: false };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${whatsappConfig.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsappConfig.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: toInternational(phone),
          type: "template",
          template: {
            name: whatsappConfig.templateName,
            language: { code: whatsappConfig.templateLang },
            components: [{
              type: "body",
              parameters: [
                { type: "text", text: String(name) },
                { type: "text", text: String(orderId) },
                { type: "text", text: String(total) },
              ],
            }],
          },
        }),
      }
    );
    if (!res.ok) {
      console.error(`[whatsapp] send failed (${res.status}): ${await res.text()}`);
      return { delivered: false };
    }
    return { delivered: true };
  } catch (err) {
    console.error("[whatsapp] send error:", err.message);
    return { delivered: false };
  }
};

module.exports = { sendOrderConfirmation };
