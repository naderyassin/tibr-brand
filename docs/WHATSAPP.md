# WhatsApp order confirmations (Meta Cloud API)

TIBR sends a WhatsApp message to the customer's phone right after checkout, via
Meta's WhatsApp Cloud API. COD and card checkout both work unchanged if this
is unconfigured — the send is best-effort and never blocks or fails checkout.

The **chat button** (footer "WhatsApp Support" link, `wa.me/message/...`) is
separate and unrelated — that's a static link, no API or setup needed.

## Why a template, not a plain text message

The Cloud API only allows free-form text replies within 24h of the customer
messaging your business number. An order confirmation is *business-initiated*
outside that window, so it must use a **pre-approved message template**.

## Files

- `server/services/whatsapp.js` — `sendOrderConfirmation()`, builds the
  template call and normalizes the phone to international digits.
- `server/routes/checkout.js` — called after a COD order is saved, and after
  the Paymob webhook confirms a card payment.
- `server/config.js` — `whatsappConfig`.

## Setup

1. Create a [Meta for Developers](https://developers.facebook.com/) app, add
   the **WhatsApp** product.
2. In the app's WhatsApp → API Setup page: copy the **temporary access token**
   (for testing) and the **Phone Number ID** → `WHATSAPP_TOKEN`,
   `WHATSAPP_PHONE_NUMBER_ID`. For production, generate a permanent token via
   a System User in Meta Business Manager instead — the temporary one expires
   in 24h.
3. In WhatsApp Manager → **Message Templates**, create a template named
   `order_confirmation` (category: Utility), body e.g.:
   `"Hi {{1}}, your TIBR order #{{2}} has been received — total {{3}} EGP. Thank you!"`
   Submit for approval (usually minutes to a few hours). The three `{{n}}`
   placeholders are filled with the customer name, order id, and total, in
   that order — keep `server/services/whatsapp.js`'s parameter list in sync if
   you change the template's wording/order.
4. Put the values in `.env` (gitignored). See `.env.example`.

## Test

Place a test order (COD is simplest) with a real WhatsApp number as the
customer phone. Check the server console: `[whatsapp] not configured...` means
the env vars aren't set; a `[whatsapp] send failed (...)` logs Meta's error
body (commonly: template not yet approved, or the recipient number needs the
country code).

## Known gaps (intentional, not bugs)

- **No delivery status tracking.** The Cloud API's delivery/read-receipt
  webhooks aren't wired up — sends are fire-and-forget, logged only.
- **Single template, no order-item detail.** The confirmation is name/order
  id/total only; itemized lines would need a richer template.
