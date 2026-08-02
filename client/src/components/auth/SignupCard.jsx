import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/stores/auth";
import { useToast } from "@/components/ui/Toast";
import { ImageSlider } from "@/components/ui/ImageSlider";
import { useT } from "@/stores/lang";

const SLIDER_IMAGES = [
  "/categories/about_hero.png",
  "/categories/about_rose.png",
  "/categories/about_amber.png",
  "/categories/about_jasmine.png",
];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

function IconGoogle() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7v3h3.9c2.3-2.1 3.6-5.2 3.6-8.9z"/>
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1C3.3 21.3 7.3 24 12 24z"/>
      <path fill="#FBBC05" d="M5.3 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.3C.5 8.2 0 10 0 12s.5 3.8 1.3 5.4l4-3.1z"/>
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.3 2.7 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"/>
    </svg>
  );
}
function IconApple() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}

/**
 * Shared signup card (image slider + form). Rendered full-screen by the Signup
 * route and inside a popup by AuthModal.
 * @param {() => void} [onSuccess] called after a successful sign-up
 * @param {() => void} [onSwitch]  if set, "Sign in" toggles in-place instead of navigating
 */
export default function SignupCard({ onSuccess, onSwitch }) {
  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);
  const signUp = useAuth((s) => s.signUp);
  const oauth  = useAuth((s) => s.oauth);
  const toast  = useToast();
  const t      = useT();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t("Password must be at least 8 characters.", "يجب أن تكون كلمة المرور 8 أحرف على الأقل."));
      return;
    }
    if (password !== confirm) {
      setError(t("Passwords do not match.", "كلمتا المرور غير متطابقتين."));
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, { full_name: name, phone });
      toast(t("Account created! Check your email to confirm.", "تم إنشاء الحساب! تحقق من بريدك الإلكتروني للتأكيد."));
      onSuccess?.();
    } catch (err) {
      setError(err.message || t("Failed to create account.", "فشل إنشاء الحساب."));
    } finally {
      setLoading(false);
    }
  };

  const handleOauth = async (provider) => {
    try {
      await oauth(provider);
    } catch (err) {
      toast(err.message || t("Sign-in unavailable.", "تسجيل الدخول غير متاح."));
    }
  };

  return (
    <div className="auth-card">
      {/* ── Left: image slider ── */}
      <div className="auth-card__media" aria-hidden="true">
        <ImageSlider images={SLIDER_IMAGES} interval={4000} />
        <div className="auth-card__scrim" />
        <div className="auth-card__brand">
          <span className="auth-card__mark">TIBR<span className="dot">.</span></span>
          <span className="auth-card__tag">
            {t("Authenticity · Nostalgia · Luxury", "الأصالة · الحنين · الفخامة")}
          </span>
        </div>
      </div>

      {/* ── Right: form ── */}
      <div className="auth-card__panel">
        <motion.div className="auth-card__inner" variants={stagger} initial="hidden" animate="show">
          <motion.h1 variants={fadeUp} className="auth-card__title">
            {t("Create account", "إنشاء حساب")}
          </motion.h1>
          <motion.p variants={fadeUp} className="auth-card__subtitle">
            {t("Join Tibr and discover Egyptian luxury.", "انضم إلى تيبر واكتشف الفخامة المصرية.")}
          </motion.p>

          <motion.div variants={fadeUp} className="auth-oauth">
            <button type="button" className="auth-oauth__btn" onClick={() => handleOauth("google")}>
              <IconGoogle /> {t("Google", "جوجل")}
            </button>
            <button type="button" className="auth-oauth__btn" onClick={() => handleOauth("apple")}>
              <IconApple /> {t("Apple", "آبل")}
            </button>
          </motion.div>

          <motion.div variants={fadeUp} className="auth-divider">
            <span>{t("Or sign up with email", "أو سجّل بالبريد الإلكتروني")}</span>
          </motion.div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <motion.div variants={fadeUp} className="auth-field">
              <label className="auth-label" htmlFor="su-name">{t("Full name", "الاسم الكامل")}</label>
              <input id="su-name" className="auth-input" type="text" value={name}
                onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </motion.div>

            <motion.div variants={fadeUp} className="auth-field">
              <label className="auth-label" htmlFor="su-phone">{t("Phone number", "رقم الهاتف")}</label>
              <input id="su-phone" className="auth-input" type="tel" inputMode="numeric" value={phone}
                onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="01XXXXXXXXX" required />
            </motion.div>

            <motion.div variants={fadeUp} className="auth-field">
              <label className="auth-label" htmlFor="su-email">{t("Email", "البريد الإلكتروني")}</label>
              <input id="su-email" className="auth-input" type="email" placeholder="m@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </motion.div>

            <motion.div variants={fadeUp} className="auth-field">
              <label className="auth-label" htmlFor="su-pw">{t("Password", "كلمة المرور")}</label>
              <input id="su-pw" className={`auth-input${error ? " is-err" : ""}`} type="password" value={password}
                onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
              <p className="auth-hint">{t("At least 8 characters.", "8 أحرف على الأقل.")}</p>
            </motion.div>

            <motion.div variants={fadeUp} className="auth-field">
              <label className="auth-label" htmlFor="su-confirm">{t("Confirm password", "تأكيد كلمة المرور")}</label>
              <input id="su-confirm" className={`auth-input${error ? " is-err" : ""}`} type="password" value={confirm}
                onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.p className="auth-error" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert">
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              variants={fadeUp}
              className={`auth-btn${loading ? " is-loading" : ""}`}
              type="submit"
              disabled={loading}
              whileTap={loading ? {} : { scale: 0.985 }}
            >
              {loading ? t("Creating account…", "جارٍ إنشاء الحساب…") : t("Create account", "إنشاء حساب")}
            </motion.button>
          </form>

          <motion.p variants={fadeUp} className="auth-switch">
            {t("Already have an account?", "لديك حساب بالفعل؟")}{" "}
            {onSwitch ? (
              <button type="button" className="auth-switch__link" onClick={onSwitch}>{t("Sign in", "تسجيل الدخول")}</button>
            ) : (
              <Link to="/login">{t("Sign in", "تسجيل الدخول")}</Link>
            )}
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
