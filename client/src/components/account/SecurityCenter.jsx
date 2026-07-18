import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";
import { useToast } from "@/components/ui/Toast";
import { useLang } from "@/stores/lang";
import { supabase } from "@/lib/supabase";
import { requestSecurityOtp, verifySecurityOtp } from "@/lib/api";

// Sign-in & security: OTP-gated changes to email, password, and phone.
//
// Every one of these is a two-step flow — enter the new value, then a 6-digit
// code we email — so they share one modal driven by a small state machine:
//   step "input" → collect + locally validate the new value, request a code
//   step "code"  → enter the code, verify, apply server-side
// The actual mutation happens on the server (see server/services/security.js);
// this component only orchestrates the two calls and the post-change refresh.

const LockIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" strokeLinejoin="round" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
  </svg>
);
const MailIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" strokeLinejoin="round" />
    <path d="M4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const PhoneIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <rect x="7" y="3" width="10" height="18" rx="2" strokeLinejoin="round" />
    <path d="M11 18h2" strokeLinecap="round" />
  </svg>
);

const ACTION_META = {
  email:    { title: "Change email",        badge: MailIcon,  verb: "email address" },
  password: { title: "Change password",     badge: LockIcon,  verb: "password" },
  phone:    { title: "Change phone number", badge: PhoneIcon, verb: "phone number" },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Local pre-checks mirror the server's, so obvious mistakes never cost an email.
// Returns { value } (the value to send) or { error }.
const localValidate = (action, form, currentEmail) => {
  if (action === "email") {
    const email = form.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
    if (email === String(currentEmail || "").toLowerCase()) return { error: "That's already your email address." };
    return { value: email };
  }
  if (action === "password") {
    if (form.password.length < 8) return { error: "Password must be at least 8 characters." };
    if (form.password !== form.confirm) return { error: "Passwords do not match." };
    return { value: form.password };
  }
  if (action === "phone") {
    const phone = form.phone.replace(/[^\d]/g, "");
    if (!/^01\d{9}$/.test(phone)) return { error: "Enter a valid Egyptian mobile number (11 digits)." };
    return { value: phone };
  }
  return { error: "Unsupported change." };
};

const EMPTY_FORM = { email: "", password: "", confirm: "", phone: "" };

export default function SecurityCenter({ phone }) {
  const { user, token } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const lang = useLang((s) => s.lang);

  const [action, setAction] = useState(null); // null = modal closed
  const [step, setStep] = useState("input");
  const [form, setForm] = useState(EMPTY_FORM);
  const [pendingValue, setPendingValue] = useState("");
  const [challenge, setChallenge] = useState(null); // { challenge_id, destination_masked, dev_code }
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const open = (which) => {
    setAction(which);
    setStep("input");
    setForm(EMPTY_FORM);
    setPendingValue("");
    setChallenge(null);
    setCode("");
    setError(null);
  };
  const close = () => { if (!busy) setAction(null); };

  const sendCode = async (e) => {
    e?.preventDefault();
    setError(null);
    const { value, error: vErr } = localValidate(action, form, user?.email);
    if (vErr) { setError(vErr); return; }
    setBusy(true);
    try {
      const res = await requestSecurityOtp(action, value, lang, token);
      setPendingValue(value);
      setChallenge(res);
      setStep("code");
      setCode("");
    } catch (err) {
      setError(err.message || "Could not send the code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e?.preventDefault();
    setError(null);
    if (!/^\d{4,8}$/.test(code.trim())) { setError("Enter the code from your email."); return; }
    setBusy(true);
    try {
      await verifySecurityOtp(challenge.challenge_id, code.trim(), pendingValue, token);
      // Post-change refresh. An email change rewrites the session's identity, so
      // pull a fresh session; phone lives in the profile query.
      if (action === "email") {
        await supabase.auth.refreshSession();
        qc.invalidateQueries({ queryKey: ["profile"] });
        toast("Email updated!");
      } else if (action === "phone") {
        qc.invalidateQueries({ queryKey: ["profile"] });
        toast("Phone number updated!");
      } else {
        toast("Password updated!");
      }
      setAction(null);
    } catch (err) {
      setError(err.message || "Verification failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await requestSecurityOtp(action, pendingValue, lang, token);
      setChallenge(res);
      setCode("");
      toast("New code sent.");
    } catch (err) {
      setError(err.message || "Could not resend the code.");
    } finally {
      setBusy(false);
    }
  };

  const meta = action ? ACTION_META[action] : null;

  return (
    <div className="acct-section">
      <div className="acct-section__head">
        <div>
          <h2 className="acct-section__title acct-section__sub-title">Sign-in &amp; security</h2>
          <p className="acct-section__desc">
            Changing any of these needs a 6-digit code we email you — so only you can update them.
          </p>
        </div>
      </div>
      <div className="panel">
        <div className="acct-rows">
          <div className="acct-row">
            <div className="acct-row__info">
              <p className="acct-row__label">Email address</p>
              <p className="acct-row__value">{user?.email}</p>
              <p className="acct-row__hint">We&apos;ll send a code to the new address to confirm it&apos;s yours.</p>
            </div>
            <button className="btn btn--secondary" type="button" onClick={() => open("email")}>
              Change email
            </button>
          </div>

          <div className="acct-row">
            <div className="acct-row__info">
              <p className="acct-row__label">Password</p>
              <p className="acct-row__value acct-row__value--dots" aria-hidden="true">••••••••••</p>
              <p className="acct-row__hint">Choose a strong password you don&apos;t reuse elsewhere.</p>
            </div>
            <button className="btn btn--secondary" type="button" onClick={() => open("password")}>
              Change password
            </button>
          </div>

          <div className="acct-row">
            <div className="acct-row__info">
              <p className="acct-row__label">Phone number</p>
              <p className="acct-row__value">{phone || "Not set"}</p>
              <p className="acct-row__hint">Used to reach you about an order. Verified before it changes.</p>
            </div>
            <button className="btn btn--secondary" type="button" onClick={() => open("phone")}>
              {phone ? "Change number" : "Add number"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Two-step verification modal ── */}
      <div
        className={`pw-modal-backdrop${action ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sec-modal-title"
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      >
        <div className="pw-modal__card">
          <div className="pw-modal__head">
            <div className="pw-modal__heading">
              <span className="pw-modal__badge" aria-hidden="true">{meta?.badge}</span>
              <div>
                <h2 className="pw-modal__title" id="sec-modal-title">{meta?.title}</h2>
                <p className="pw-modal__sub">
                  {step === "input"
                    ? `Confirm the change with a code we'll email you.`
                    : `Enter the 6-digit code sent to ${challenge?.destination_masked || "your email"}.`}
                </p>
              </div>
            </div>
            <button className="acct-icon-btn" type="button" onClick={close} aria-label="Close" disabled={busy}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: "1.1rem", height: "1.1rem" }}><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
            </button>
          </div>

          {step === "input" ? (
            <form className="pw-modal__form" onSubmit={sendCode} noValidate>
              {action === "email" && (
                <div className={`field${error ? " is-invalid" : ""}`}>
                  <label className="field__label" htmlFor="sec-email">New email address</label>
                  <input id="sec-email" className="input" type="email" autoComplete="email" value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
                </div>
              )}
              {action === "phone" && (
                <div className={`field${error ? " is-invalid" : ""}`}>
                  <label className="field__label" htmlFor="sec-phone">New phone number</label>
                  <input id="sec-phone" className="input" type="tel" inputMode="numeric" autoComplete="tel"
                    placeholder="01XXXXXXXXX" value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
                </div>
              )}
              {action === "password" && (
                <>
                  <div className="field">
                    <label className="field__label" htmlFor="sec-pw">New password</label>
                    <input id="sec-pw" className="input" type="password" autoComplete="new-password" value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
                    <p className="field__hint">At least 8 characters.</p>
                  </div>
                  <div className={`field${error ? " is-invalid" : ""}`}>
                    <label className="field__label" htmlFor="sec-pw2">Confirm new password</label>
                    <input id="sec-pw2" className="input" type="password" autoComplete="new-password" value={form.confirm}
                      onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} required />
                  </div>
                </>
              )}
              {error && <p className="field__error" role="alert">{error}</p>}
              <button className={`btn btn--primary btn--block${busy ? " is-loading" : ""}`} type="submit" disabled={busy}>
                {busy ? "" : "Send code"}
              </button>
            </form>
          ) : (
            <form className="pw-modal__form" onSubmit={verify} noValidate>
              <div className={`field${error ? " is-invalid" : ""}`}>
                <label className="field__label" htmlFor="sec-code">Verification code</label>
                <input
                  id="sec-code"
                  className="input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="••••••"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, ""))}
                  style={{ textAlign: "center", letterSpacing: "0.5em" }}
                  autoFocus
                  required
                />
                {challenge?.dev_code && (
                  <p className="field__hint">Dev: email isn&apos;t configured — your code is <strong>{challenge.dev_code}</strong> (also in the server log).</p>
                )}
                {error && <p className="field__error" role="alert">{error}</p>}
              </div>
              <button className={`btn btn--primary btn--block${busy ? " is-loading" : ""}`} type="submit" disabled={busy}>
                {busy ? "" : `Verify & update ${meta?.verb}`}
              </button>
              <div className="pw-modal__foot-row">
                <button type="button" className="acct-link-btn" onClick={() => { setStep("input"); setError(null); }} disabled={busy}>
                  ← Back
                </button>
                <button type="button" className="acct-link-btn" onClick={resend} disabled={busy}>
                  Resend code
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
