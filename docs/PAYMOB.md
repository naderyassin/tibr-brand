# Card payments — Paymob (Egypt)

TIBR takes card payments through **Paymob's Unified Checkout** (hosted). Card data
never touches this server, so we stay out of PCI scope. COD and wallet checkout are
unchanged and keep working even if Paymob is unconfigured.

## The flow

```
shopper picks "Card" → POST /api/checkout/card
  → server creates a PENDING, UNPAID order (no stock decrement yet)
  → server creates a Paymob "intention" (secret key) → gets client_secret
  → returns checkout_url → browser redirects to Paymob hosted checkout
shopper pays on Paymob's page
  → Paymob redirects browser to APP_BASE_URL/checkout/callback   (display only)
  → Paymob POSTs webhook → /api/payments/paymob/webhook           (source of truth)
      → verify HMAC (SHA-512) → mark order paid + confirmed,
        decrement variant stock, count discount usage
```

The **webhook is the source of truth**, not the browser redirect. The callback page
only shows a provisional message; fulfilment state is set by the verified webhook.

## Files

- `paymob.js` — `createIntention()` and `verifyHmac()`. The HMAC field order is the
  constant `HMAC_FIELD_ORDER` — if a real transaction ever fails verification, that
  array is the one thing to re-check against the dashboard's callback payload.
- `server.js` — `POST /api/checkout/card`, `POST /api/payments/paymob/webhook`.
- `client/src/pages/Checkout.jsx` — "Card" option + redirect.
- `client/src/pages/CheckoutCallback.jsx` — the `/checkout/callback` screen.
- Migration `20260717010000_orders_payment_status.sql` — `payment_status`,
  `payment_provider`, `transaction_ref`, `paid_at` on `orders`.

## Get sandbox credentials

1. Create a Paymob account and use the **test/sandbox** mode.
2. Dashboard → **Settings → API Keys**: copy the **Secret key** (`egy_sk_test_…`) and
   **Public key** (`egy_pk_test_…`) → `PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY`.
3. Dashboard → **Developers / Payment Integrations**: create/enable a **card**
   integration, copy its **Integration ID** (a number) → `PAYMOB_INTEGRATION_IDS`
   (comma-separate if you enable more, e.g. wallet too).
4. Dashboard → **Settings → Account Info / Profile**: copy the **HMAC secret** →
   `PAYMOB_HMAC_SECRET`.

Put all of these in `.env` (gitignored). See `.env.example`.

## Wire the callback + webhook URLs

Paymob needs to reach your server, so localhost won't do for end-to-end testing.

1. Start the app: `npm run dev:all` (or `npm run dev` for just the API).
2. Expose it publicly, e.g. `ngrok http 3000`, and set `APP_BASE_URL` to the https
   tunnel URL (e.g. `https://ab12.ngrok.app`). Restart the server after changing it.
3. In the Paymob integration settings, set:
   - **Transaction processed callback (webhook):** `<APP_BASE_URL>/api/payments/paymob/webhook`
   - **Transaction response callback (redirect):** `<APP_BASE_URL>/checkout/callback`
   (We also pass the redirect per-intention, but set it in the dashboard too.)

## Test

Use Paymob's sandbox **test cards** (from their docs). A successful test payment
should: land you on `/checkout/callback?success=true`, fire the webhook, and flip the
order to `payment_status='paid'`, `status='confirmed'` (check `/admin/orders` or the
DB). A declined test card should leave the order `payment_status='failed'`.

## Go live

Swap the four `PAYMOB_*` test values for the live ones and point `APP_BASE_URL` at the
production domain. Re-enter the live callback URLs in the live integration. Nothing in
code changes.

## Known gaps (intentional, not bugs)

- **Automatic (non-code) discount usage isn't counted on card orders.** The webhook
  only has `orders.discount_code`, so it increments usage for typed codes only. COD
  counts both. Fix later by storing `discount_id` on `orders`.
- **No transaction/refund reconciliation UI.** Refunds/voids initiated in the Paymob
  dashboard won't reflect back here yet (would need to handle the refund webhook and a
  `refunded` status transition — the column already allows it).
- **Pending orders can accumulate.** A shopper who starts card checkout but never pays
  leaves a `pending/unpaid` order. Consider a sweep that expires stale unpaid orders.
