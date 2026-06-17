import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/stores/auth";
import { useToast } from "@/components/ui/Toast";

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, { full_name: name, phone });
      toast("Account created! Check your email to confirm.");
      navigate("/login");
    } catch (err) {
      setError(err.message || "Failed to create account.");
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
        <h1 className="auth__title">Create account</h1>
        <p className="auth__sub">Join Tibr and discover Egyptian luxury.</p>

        <form className="auth__form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="name">
              Full name <span className="field__req" aria-hidden="true">*</span>
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
              Phone number <span className="field__req" aria-hidden="true">*</span>
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
              Email <span className="field__req" aria-hidden="true">*</span>
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
              Password <span className="field__req" aria-hidden="true">*</span>
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
            <p className="field__hint">At least 8 characters.</p>
          </div>

          <div className={`field${error ? " is-invalid" : ""}`}>
            <label className="field__label" htmlFor="confirm">
              Confirm password <span className="field__req" aria-hidden="true">*</span>
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
            {loading ? "" : "Create account"}
          </button>
        </form>

        <p className="auth__switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
