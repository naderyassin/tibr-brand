import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "@/stores/cart";
import { useAuth } from "@/stores/auth";
import { useLang } from "@/stores/lang";
import { checkout as apiCheckout } from "@/lib/api";

const PAYMENT_METHODS = [
  {
    id: "cash_on_delivery",
    label: "Cash on delivery",
    desc: "Pay on arrival",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="13" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-4 0v2M12 12v3M10 14h4"/>
      </svg>
    ),
  },
  {
    id: "vodafone_cash",
    label: "Vodafone Cash",
    desc: "Mobile wallet",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2"/>
        <path d="M9 7h6M9 11h6M9 15h4"/>
        <circle cx="15" cy="17" r="1" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    id: "instapay",
    label: "InstaPay",
    desc: "Instant transfer",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
];

export default function Checkout() {
  const { lang } = useLang();
  const items = useCart((s) => s.items);
  const clearCart = useCart((s) => s.clear);
  const token = useAuth((s) => s.token);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    payment_method: "cash_on_delivery",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const subtotal = items.reduce(
    (sum, i) => sum + (i.product.price ?? i.product.ar_price ?? 0) * i.qty,
    0
  );

  if (items.length === 0 && !success) {
    return (
      <div className="store-container" style={{ paddingBlock: "4rem", textAlign: "center" }}>
        <p style={{ color: "var(--muted)" }}>Your cart is empty.</p>
        <Link className="btn btn--primary" to="/shop/perfumes" style={{ marginTop: "1rem" }}>Browse store</Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="store-container">
        <motion.div
          className="checkout-success"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="checkout-success__mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-h2)", color: "var(--ink)" }}>
            Order received
          </h2>
          <p style={{ color: "var(--muted)" }}>We'll confirm delivery over WhatsApp. Your order number:</p>
          <p className="checkout-success__ref">#{success.checkout_reference?.slice(0, 8).toUpperCase()}</p>
          <p style={{ color: "var(--muted)" }}>
            Total: <strong style={{ color: "var(--gold)" }}>{success.total_amount} EGP</strong>
          </p>
          <div style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap", justifyContent: "center" }}>
            <Link className="btn btn--primary" to="/account?tab=orders">View my orders</Link>
            <Link className="btn btn--secondary" to="/shop/perfumes">Keep shopping</Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.customer_name || !form.customer_phone || !form.customer_address) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!token) {
      navigate("/login");
      return;
    }
    setLoading(true);
    try {
      const res = await apiCheckout(
        {
          items: items.map((i) => ({ productId: i.product.id, size: i.size, qty: i.qty })),
          ...form,
        },
        token
      );
      clearCart();
      setSuccess(res.data);
    } catch (err) {
      setError(err.message || "Failed to place order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="store-container">
      {/* Progress steps */}
      <nav className="co-steps" aria-label="Checkout progress">
        <Link to="/cart" className="co-step co-step--done" aria-label="Go back to cart">
          <span className="co-step__dot">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="co-step__label">Cart</span>
        </Link>
        <span className="co-steps__line" aria-hidden="true" />
        <span className="co-step co-step--active" aria-current="step">
          <span className="co-step__dot">2</span>
          <span className="co-step__label">Delivery</span>
        </span>
        <span className="co-steps__line" aria-hidden="true" />
        <span className="co-step">
          <span className="co-step__dot">3</span>
          <span className="co-step__label">Confirm</span>
        </span>
      </nav>

      <form className="checkout" onSubmit={handleSubmit} noValidate>
        <div className="co-sections">
          {/* 01 Contact */}
          <div className="co-card">
            <h2 className="co-card__title">
              <span className="co-card__num">01</span>Contact
            </h2>
            <div className="form-grid">
              <div className="field field--full">
                <label className="field__label" htmlFor="co-name">
                  Full name <span className="field__req">*</span>
                </label>
                <input
                  id="co-name"
                  className="input"
                  type="text"
                  value={form.customer_name}
                  onChange={(e) => handleChange("customer_name", e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="field field--full">
                <label className="field__label" htmlFor="co-phone">
                  Phone number <span className="field__req">*</span>
                </label>
                <input
                  id="co-phone"
                  className="input"
                  type="tel"
                  inputMode="numeric"
                  value={form.customer_phone}
                  onChange={(e) => handleChange("customer_phone", e.target.value)}
                  autoComplete="tel"
                  placeholder="01XXXXXXXXX"
                  required
                />
              </div>
              <div className="field field--full">
                <label className="field__label" htmlFor="co-address">
                  Delivery address <span className="field__req">*</span>
                </label>
                <textarea
                  id="co-address"
                  className="textarea"
                  value={form.customer_address}
                  onChange={(e) => handleChange("customer_address", e.target.value)}
                  required
                  rows={3}
                  placeholder="Street, building, floor, governorate…"
                />
              </div>
            </div>
          </div>

          {/* 02 Payment */}
          <div className="co-card">
            <h2 className="co-card__title">
              <span className="co-card__num">02</span>Payment method
            </h2>
            <div className="pay-options">
              {PAYMENT_METHODS.map((m) => (
                <label key={m.id} className="pay-option">
                  <input
                    type="radio"
                    name="payment"
                    value={m.id}
                    checked={form.payment_method === m.id}
                    onChange={() => handleChange("payment_method", m.id)}
                  />
                  <span className="pay-option__icon" aria-hidden="true">{m.icon}</span>
                  <span className="pay-option__label">{m.label}</span>
                  <span className="pay-option__desc">{m.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" style={{ color: "var(--danger)", fontSize: "var(--fs-sm)" }}>{error}</p>
          )}

          <button
            className={`btn btn--primary btn--block btn--lg${loading ? " is-loading" : ""}`}
            type="submit"
            disabled={loading}
          >
            {loading ? "" : "Place order"}
          </button>
        </div>

        {/* Order summary sidebar */}
        <aside className="summary" aria-label="Order summary">
          <h2 className="summary__title">Order summary</h2>
          <div className="summary__items">
            {items.map((item) => {
              const name = lang === "ar"
                ? (item.product.ar_name || item.product.en_name)
                : (item.product.en_name || item.product.ar_name);
              const price = item.product.price ?? item.product.ar_price ?? 0;
              return (
                <div key={item.key} className="summary__item">
                  {item.product.image ? (
                    <img className="summary__item-img" src={item.product.image} alt={name} />
                  ) : (
                    <div className="summary__item-img summary__item-img--empty" />
                  )}
                  <div className="summary__item-info">
                    <span className="summary__item-name">{name}</span>
                    <span className="summary__item-meta">
                      Qty: {item.qty}{item.size ? ` · ${item.size}` : ""}
                    </span>
                  </div>
                  <span className="summary__item-price">{price * item.qty} EGP</span>
                </div>
              );
            })}
          </div>
          <div className="summary__divider" />
          <div className="summary__row">
            <span>Subtotal</span>
            <span className="val">{subtotal} EGP</span>
          </div>
          <div className="summary__row">
            <span>Shipping</span>
            <span className="val summary__free">Free</span>
          </div>
          <div className="summary__row summary__row--total">
            <span>Total</span>
            <span className="val">{subtotal} EGP</span>
          </div>
          <p className="summary__note">Cash on delivery · Free shipping across Egypt</p>
        </aside>
      </form>
    </div>
  );
}
