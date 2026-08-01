import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/stores/auth";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/stores/lang";

export default function Signup() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const signUp = useAuth((s) => s.signUp);
  const navigate = useNavigate();
  const toast = useToast();
  const t = useT();

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
      navigate("/login");
    } catch (err) {
      setError(err.message || t("Failed to create account.", "فشل إنشاء الحساب."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="store-container auth">
      <motion.div
        className="auth__card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="auth__brand">
          <Link className="store-wordmark" to="/" style={{ fontSize: "1.8rem" }}>
            Tibr<span className="dot">.</span>
          </Link>
        </div>
        <h1 className="auth__title">{t("Create account", "إنشاء حساب")}</h1>
        <p className="auth__sub">{t("Join Tibr and discover Egyptian luxury.", "انضم إلى تيبر واكتشف الفخامة المصرية.")}</p>

        <form className="auth__form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="name">
              {t("Full name", "الاسم الكامل")} <span className="field__req" aria-hidden="true">*</span>
            </label>
            <input
              id="name"
              className="input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="phone">
              {t("Phone number", "رقم الهاتف")} <span className="field__req" aria-hidden="true">*</span>
            </label>
            <input
              id="phone"
              className="input"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              placeholder="01XXXXXXXXX"
              required
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="email">
              {t("Email", "البريد الإلكتروني")} <span className="field__req" aria-hidden="true">*</span>
            </label>
            <input
              id="email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="password">
              {t("Password", "كلمة المرور")} <span className="field__req" aria-hidden="true">*</span>
            </label>
            <input
              id="password"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <p className="field__hint">{t("At least 8 characters.", "8 أحرف على الأقل.")}</p>
          </div>

          <div className={`field${error ? " is-invalid" : ""}`}>
            <label className="field__label" htmlFor="confirm">
              {t("Confirm password", "تأكيد كلمة المرور")} <span className="field__req" aria-hidden="true">*</span>
            </label>
            <input
              id="confirm"
              className="input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
            {error && <p className="field__error" role="alert">{error}</p>}
          </div>

          <button
            className={`btn btn--primary btn--block btn--lg${loading ? " is-loading" : ""}`}
            type="submit"
            disabled={loading}
          >
            {loading ? "" : t("Create account", "إنشاء حساب")}
          </button>
        </form>

        <p className="auth__switch">
          {t("Already have an account?", "لديك حساب بالفعل؟")} <Link to="/login">{t("Sign in", "تسجيل الدخول")}</Link>
        </p>
      </motion.div>
    </div>
  );
}

