# Account-security OTP

Sensitive account changes — **password, email, and phone number** — are gated by
a one-time 6-digit code sent to the user. This document is the map.

## Flow

Two server calls, both requiring a valid session (`requireUser`) and rate-limited
(`otpLimiter` — 20 / 15 min / IP, on top of a per-challenge attempt cap):

1. `POST /api/account/security/challenge` `{ action, new_value, lang }`
   - Validates the requested change, mints a code, stores **only** its peppered
     SHA-256 hash plus a hash of the target value, and delivers the code.
   - The code goes to the **new email** for an email change (proving the new
     mailbox), or the **account email** for password/phone (proving the owner).
   - Returns `{ challenge_id, destination_masked, expires_at, delivered, dev_code? }`.
     `dev_code` is echoed back **only when SMTP is unconfigured and NODE_ENV is
     not production**, so the flow is testable before email exists.

2. `POST /api/account/security/verify` `{ challenge_id, code, new_value }`
   - Checks expiry, attempt cap, the value binding (`new_value` must match what
     the code was issued for), and the code. On success it applies the change
     **server-side** via the Supabase admin API (password/email) or a service
     write (phone), then consumes the challenge.

## Why server-side

The mutation runs on the server after verification, so the code is a real gate —
the change can't be applied without a verified challenge. Auth attributes use
`supabase.auth.admin.updateUserById` (service role); the phone lives in
`profiles.phone_number`.

## Delivery channels (email now, SMS later)

`server/services/notifications.js` is a **channel abstraction**: each channel is a
transport with the same shape. Adding SMS is (a) implementing the `sms` transport
(currently a stub that reports itself unavailable) with a provider like Twilio,
and (b) letting the security service pass `channel: "sms"`. Nothing else changes.

Email delivery uses SMTP via nodemailer (`SMTP_*` in `.env` — see `.env.example`).
Without `SMTP_HOST`, the email transport logs the code to the server console.

## Storage

`otp_challenges` (migration `20260719000000_otp_challenges.sql`): RLS enabled with
**no policies**, so only the service role reaches it. Stores hashes only — never a
code or a plaintext new value. Short expiry (`OTP_TTL_MINUTES`, default 10) and a
5-attempt cap per challenge.

## Files

| Area | File |
|---|---|
| Table | `supabase/migrations/20260719000000_otp_challenges.sql` |
| Code primitives | `server/lib/otp.js` |
| Delivery | `server/services/notifications.js` |
| Business logic | `server/services/security.js` |
| Routes | `server/routes/account-security.js` |
| Client API | `client/src/lib/api.js` (`requestSecurityOtp`, `verifySecurityOtp`) |
| Client UI | `client/src/components/account/SecurityCenter.jsx` (Account → Profile tab) |

## Hardening notes (optional, dashboard-side)

The OTP protects the change path exposed by the app. A holder of a valid session
token could still call Supabase's client `updateUser` directly, bypassing this UI.
To close that, enable Supabase's **"Secure email change"** and reauthentication
settings in the dashboard (Auth → Providers/Settings). Out of scope for the code
here, but worth turning on for defense in depth.
