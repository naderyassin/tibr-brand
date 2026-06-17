import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/stores/auth";
import { useToast } from "@/components/ui/Toast";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
}
function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
function IconEye({ off }) {
  return off ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const signIn   = useAuth((s) => s.signIn);
  const navigate = useNavigate();
  const toast    = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      toast("Welcome back!");
      navigate("/account");
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* ── Left: brand panel ── */}
      <div className="auth-brand" aria-hidden="true">
        <div className="auth-brand__orb auth-brand__orb--a" />
        <div className="auth-brand__orb auth-brand__orb--b" />
        <div className="auth-brand__orb auth-brand__orb--c" />
        <div className="auth-brand__grid" />
        <div className="auth-brand__content">
          <motion.span
            className="auth-brand__mark"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            TIBR<span className="dot">.</span>
          </motion.span>
          <motion.p
            className="auth-brand__ar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            الأصالة والحنين والفخامة
          </motion.p>
          <motion.p
            className="auth-brand__en"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.8 }}
          >
            Authenticity · Nostalgia · Luxury
          </motion.p>
        </div>
      </div>

      {/* ── Right: form panel ── */}
      <div className="auth-panel">
        <motion.div
          className="auth-panel__inner"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeUp} className="auth-panel__head">
            <h1 className="auth-panel__title">Sign in</h1>
            <p className="auth-panel__sub">Welcome back to Tibr.</p>
          </motion.div>

          <form className="auth-panel__form" onSubmit={handleSubmit} noValidate>

            {/* Email */}
            <motion.div variants={fadeUp} className="aff">
              <span className="aff__icon"><IconMail /></span>
              <input
                id="aff-email"
                className={`aff__input${error ? " is-err" : ""}`}
                type="email"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <label className="aff__label" htmlFor="aff-email">Email</label>
            </motion.div>

            {/* Password */}
            <motion.div variants={fadeUp} className="aff">
              <span className="aff__icon"><IconLock /></span>
              <input
                id="aff-pw"
                className={`aff__input${error ? " is-err" : ""}`}
                type={showPw ? "text" : "password"}
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <label className="aff__label" htmlFor="aff-pw">Password</label>
              <button
                type="button"
                className="aff__eye"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                <IconEye off={showPw} />
              </button>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  className="aff-error"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  role="alert"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.div variants={fadeUp} className="aff-row">
              <Link className="aff-link" to="/forgot-password">Forgot password?</Link>
            </motion.div>

            <motion.button
              variants={fadeUp}
              className={`btn btn--primary btn--block btn--lg auth-submit${loading ? " is-loading" : ""}`}
              type="submit"
              disabled={loading}
              whileHover={loading ? {} : { scale: 1.012 }}
              whileTap={loading ? {} : { scale: 0.985 }}
            >
              {loading ? "" : (
                <>
                  <span>Sign in</span>
                  <svg className="auth-submit__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </>
              )}
            </motion.button>
          </form>

          <motion.p variants={fadeUp} className="auth-switch">
            New to Tibr? <Link to="/signup">Create account</Link>
          </motion.p>
        </motion.div>
      </div>

    </div>
  );
}
