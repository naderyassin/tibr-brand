import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "@/stores/cart";
import { useAuth } from "@/stores/auth";
import {
  checkout as apiCheckout, checkoutCard, validateDiscount, getAutomaticDiscount,
  getPaymentMethods, getConfig, getProfile, getAddresses,
} from "@/lib/api";

// Wallet numbers are partially masked in the picker; InstaPay addresses show as-is.
const maskHandle = (type, handle) => {
  if (!handle) return "";
  if (type === "vodafone_cash") {
    const d = String(handle);
    return d.length > 5 ? `${d.slice(0, 3)}••••${d.slice(-2)}` : d;
  }
  return handle;
};

const fmt = (v) => `${Number(v ?? 0).toLocaleString()} EGP`;
const govTitle = (slug) => (slug || "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const composeAddress = (addr) =>
  [addr?.street, govTitle(addr?.governorate)].filter(Boolean).join(", ");

const PAYMENT_METHODS = [
  {
    id: "card",
    label: "Debit / Credit Card",
    desc: "Visa · Mastercard · Meeza",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <path d="M2 10h20M6 15h4"/>
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
    desc: "Instant bank transfer",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
  {
    id: "cash_on_delivery",
    label: "Cash on Delivery",
    desc: "Pay in cash when it arrives",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="13" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-4 0v2M12 12v3M10 14h4"/>
      </svg>
    ),
  },
];

const TRUST = [
  { t: "Cash on delivery across Egypt", i: <path d="M2 7h20v10H2zM6 12h.01M18 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" strokeLinecap="round" strokeLinejoin="round" /> },
  { t: "Free shipping, always", i: <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" strokeLinecap="round" strokeLinejoin="round" /> },
  { t: "Your details stay private", i: <path d="M12 3l7 3v5c0 4.4-3 8.3-7 10-4-1.7-7-5.6-7-10V6l7-3zM9.5 12l1.8 1.8L15 10" strokeLinecap="round" strokeLinejoin="round" /> },
];

export default function Checkout() {
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
  const [savedMethods, setSavedMethods] = useState([]);
  const [cardEnabled, setCardEnabled] = useState(false);

  // Saved addresses power the "Deliver to" card; the form is the fallback for
  // guests / people with no saved address. The checkout payload is unchanged —
  // it still sends customer_name / phone / address strings.
  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddrId, setSelectedAddrId] = useState(null);
  const [addrEditing, setAddrEditing] = useState(false);

  const [discountInput, setDiscountInput] = useState("");
  const [discount, setDiscount] = useState(null);
  const [discountError, setDiscountError] = useState(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [autoDiscount, setAutoDiscount] = useState(null);

  const subtotal = items.reduce(
    (sum, i) => sum + (i.price ?? i.product.price ?? 0) * i.qty,
    0
  );
  const count = items.reduce((n, i) => n + i.qty, 0);
  const effectiveDiscount = discount || autoDiscount;
  const discountAmount = effectiveDiscount?.total_amount ?? 0;
  const total = Math.max(0, subtotal - discountAmount);

  const cartItems = items.map((i) => ({ productId: i.product.id, qty: i.qty }));
  const cartItemsKey = JSON.stringify(cartItems);

  useEffect(() => {
    if (!token || items.length === 0 || discount) {
      setAutoDiscount(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await getAutomaticDiscount(cartItems, token);
        if (!cancelled) setAutoDiscount(res.data || null);
      } catch {
        if (!cancelled) setAutoDiscount(null);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, discount, cartItemsKey]);

  useEffect(() => {
    getConfig().then((res) => setCardEnabled(!!res?.data?.cardPayments)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) { setAddrEditing(true); return; }
    let cancelled = false;

    getPaymentMethods(token)
      .then((res) => {
        if (cancelled) return;
        const methods = res.data || [];
        setSavedMethods(methods);
        const def = methods.find((m) => m.is_default) || methods[0];
        if (def) setForm((f) => ({ ...f, payment_method: def.type }));
      })
      .catch(() => {});

    Promise.all([
      getProfile(token).then((r) => r.data).catch(() => null),
      getAddresses(token).then((r) => r.data || []).catch(() => []),
    ]).then(([prof, addrs]) => {
      if (cancelled) return;
      setProfile(prof);
      setAddresses(addrs);
      const def = addrs.find((a) => a.is_default) || addrs[0];
      if (def) {
        setSelectedAddrId(def.id);
        setForm((f) => ({
          ...f,
          customer_name: f.customer_name || prof?.full_name || "",
          customer_phone: f.customer_phone || def.phone || prof?.phone || "",
          customer_address: f.customer_address || composeAddress(def),
        }));
        setAddrEditing(false);
      } else {
        setForm((f) => ({
          ...f,
          customer_name: f.customer_name || prof?.full_name || "",
          customer_phone: f.customer_phone || prof?.phone || "",
        }));
        setAddrEditing(true);
      }
    });

    return () => { cancelled = true; };
  }, [token]);

  const applyAddress = (addr) => {
    if (!addr) return;
    setSelectedAddrId(addr.id);
    setForm((f) => ({
      ...f,
      customer_name: f.customer_name || profile?.full_name || "",
      customer_phone: addr.phone || profile?.phone || f.customer_phone || "",
      customer_address: composeAddress(addr),
    }));
    setAddrEditing(false);
  };

  const handleApplyDiscount = async () => {
    const code = discountInput.trim();
    if (!code) return;
    if (!token) { navigate("/login"); return; }
    setDiscountError(null);
    setApplyingDiscount(true);
    try {
      const res = await validateDiscount(code, cartItems, token);
      setDiscount(res.data);
    } catch (err) {
      setDiscount(null);
      setDiscountError(err.message || "This discount code isn't valid.");
    } finally {
      setApplyingDiscount(false);
    }
  };

  const handleRemoveDiscount = () => {
    setDiscount(null);
    setDiscountInput("");
    setDiscountError(null);
  };

  if (items.length === 0 && !success) {
    return (
      <div className="store-container">
        <div className="co-layout" style={{ gridTemplateColumns: "1fr" }}>
          <div className="acct-empty" style={{ maxInlineSize: "38rem", marginInline: "auto" }}>
            <span className="acct-empty__mark" aria-hidden="true">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 16v-2a8 8 0 0 1 16 0v2" /><rect width="30" height="24" x="9" y="16" rx="3" />
              </svg>
            </span>
            <h1 className="acct-empty__title">Your cart is empty</h1>
            <p className="acct-empty__sub">There&apos;s nothing to check out yet. Browse the collection and add a fragrance first.</p>
            <div className="acct-empty__actions">
              <Link className="btn btn--primary" to="/shop/perfumes">Browse the store</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="store-container">
        <motion.div
          className="co-success"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="co-success__mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="co-success__title">Order received</h1>
          <p className="co-success__sub">Thank you. We&apos;ll confirm delivery with you over WhatsApp shortly.</p>

          <div className="co-success__receipt">
            <div className="co-success__rrow">
              <span className="co-success__rlabel">Order number</span>
              <span className="co-success__rref">#{success.checkout_reference?.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="co-success__rrow">
              <span className="co-success__rlabel">Total</span>
              <span className="co-success__rtotal">{fmt(success.total_amount)}</span>
            </div>
          </div>

          {success.discount && (
            <p className="co-success__discount">
              {success.discount.code || success.discount.title} applied
              {success.discount.free_shipping ? " · free shipping" : ` · −${fmt(success.discount.amount)}`}
            </p>
          )}

          <div className="co-success__actions">
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
      setError("Please add your name, phone and delivery address.");
      setAddrEditing(true);
      return;
    }
    if (!token) {
      navigate("/login");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        items: items.map((i) => ({ variantId: i.variantId, productId: i.product.id, size: i.size, qty: i.qty })),
        ...form,
        discount_code: discount?.code || undefined,
      };

      if (form.payment_method === "card") {
        const res = await checkoutCard(payload, token);
        if (res?.data?.checkout_url) {
          window.location.href = res.data.checkout_url;
          return;
        }
        throw new Error("Could not start the card payment.");
      }

      const res = await apiCheckout(payload, token);
      clearCart();
      setSuccess(res.data);
    } catch (err) {
      setError(err.message || "Failed to place order.");
    } finally {
      setLoading(false);
    }
  };

  const selectedAddr = addresses.find((a) => a.id === selectedAddrId);
  const hasSummaryAddress = !addrEditing && !!form.customer_address;
  const methods = PAYMENT_METHODS.filter((m) => m.id !== "card" || cardEnabled);

  return (
    <div className="store-container">
      <header className="co-head" style={{ paddingBlock: "var(--sp-5)" }}>
        <h1 className="co-head__title">Checkout</h1>
      </header>

      <form className="co-layout" onSubmit={handleSubmit} noValidate>
        <div className="co-main">
          <div className="co-blocks">

            {/* Deliver to */}
            <section className="co-block">
              <div className="co-block__head co-block__head--bordered">
                <span className="co-block__title">Delivery address</span>
                {hasSummaryAddress && (
                  <button type="button" className="co-block__link" onClick={() => setAddrEditing(true)}>
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M14.5 2.5a2 2 0 0 1 2.83 2.83L7 15.67 3 17l1.33-4L14.5 2.5z" strokeLinejoin="round" /></svg>
                    Edit
                  </button>
                )}
              </div>

              <div className="co-block__body">
                {hasSummaryAddress ? (
                  <div className="co-deliver">
                    <span className="co-deliver__pin" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" strokeLinejoin="round"/><circle cx="12" cy="10" r="2.5"/></svg>
                    </span>
                    <div className="co-deliver__info">
                      <p className="co-deliver__label">
                        Deliver to {selectedAddr?.label || form.customer_name || "you"}
                      </p>
                      <p className="co-deliver__line">{form.customer_address}</p>
                      {form.customer_phone && <p className="co-deliver__line">{form.customer_name ? `${form.customer_name} · ` : ""}{form.customer_phone}</p>}
                    </div>
                  </div>
                ) : (
                  <>
                    {addresses.length > 0 && (
                      <div className="field field--full co-pick" style={{ marginBlockEnd: "var(--sp-4)" }}>
                        <p className="co-pick__hint">Use a saved address</p>
                        <div className="select-field">
                          <select
                            className="select"
                            value={selectedAddrId || ""}
                            onChange={(e) => { const a = addresses.find((x) => x.id === e.target.value); if (a) applyAddress(a); }}
                          >
                            <option value="">Choose an address…</option>
                            {addresses.map((a) => (
                              <option key={a.id} value={a.id}>
                                {(a.label || "Address")}{a.governorate ? ` — ${govTitle(a.governorate)}` : ""}{a.is_default ? " (default)" : ""}
                              </option>
                            ))}
                          </select>
                          <svg className="select-field__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                        </div>
                      </div>
                    )}

                    <div className="form-grid">
                      <div className="field">
                        <label className="field__label" htmlFor="co-name">Full name <span className="field__req">*</span></label>
                        <input id="co-name" className="input" type="text" value={form.customer_name} onChange={(e) => handleChange("customer_name", e.target.value)} autoComplete="name" required />
                      </div>
                      <div className="field">
                        <label className="field__label" htmlFor="co-phone">Phone number <span className="field__req">*</span></label>
                        <input id="co-phone" className="input" type="tel" inputMode="numeric" value={form.customer_phone} onChange={(e) => handleChange("customer_phone", e.target.value)} autoComplete="tel" placeholder="01XXXXXXXXX" required />
                      </div>
                      <div className="field field--full">
                        <label className="field__label" htmlFor="co-address">Delivery address <span className="field__req">*</span></label>
                        <textarea id="co-address" className="textarea" value={form.customer_address} onChange={(e) => handleChange("customer_address", e.target.value)} required rows={3} placeholder="Street, building, floor, governorate…" />
                      </div>
                      {form.customer_name && form.customer_phone && form.customer_address && (
                        <div className="field--full">
                          <button type="button" className="btn btn--secondary" onClick={() => setAddrEditing(false)}>Use this address</button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Order / shipment */}
            <section className="co-block">
              <div className="co-block__head co-block__head--bordered">
                <span className="co-block__title">Your order <span className="co-block__title-meta">{count} item{count !== 1 ? "s" : ""}</span></span>
              </div>
              <div className="co-block__body">
                <div className="co-ship">
                  {items.map((item) => {
                    const name = item.product.en_name || item.product.ar_name;
                    const price = item.price ?? item.product.price ?? 0;
                    return (
                      <div key={item.key} className="co-ship-item">
                        {item.product.image ? (
                          <img className="co-ship-thumb" src={item.product.image} alt={name} />
                        ) : (
                          <div className="co-ship-thumb" />
                        )}
                        <div className="co-ship-info">
                          <p className="co-ship-name">{name}</p>
                          <p className="co-ship-meta">{[item.size, `Qty ${item.qty}`].filter(Boolean).join(" · ")}</p>
                        </div>
                        <span className="co-ship-price">{fmt(price * item.qty)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Delivery */}
            <section className="co-block">
              <div className="co-block__head co-block__head--bordered">
                <span className="co-block__title">Delivery</span>
              </div>
              <div className="co-block__body">
                <div className="co-deliv-row">
                  <span className="co-deliv-row__left">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h11v8H3zM14 10h4l3 3v2h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>
                    Standard delivery · across Egypt
                  </span>
                  <span className="co-deliv-row__free">FREE</span>
                </div>
              </div>
            </section>

            {/* Pay with */}
            <section className="co-block">
              <div className="co-block__head co-block__head--bordered">
                <span className="co-block__title">Pay with</span>
              </div>
              <div className="co-block__body">
                <div className="co-pay">
                  {methods.map((m) => {
                    const saved = savedMethods.find((s) => s.type === m.id);
                    return (
                      <label key={m.id} className="co-payopt">
                        <input type="radio" name="payment" value={m.id} checked={form.payment_method === m.id} onChange={() => handleChange("payment_method", m.id)} />
                        <span className="co-payopt__icon" aria-hidden="true">{m.icon}</span>
                        <span className="co-payopt__text">
                          <span className="co-payopt__label">{m.label}</span>
                          <span className="co-payopt__desc">{saved ? maskHandle(m.id, saved.handle) : m.desc}</span>
                        </span>
                        <span className="co-payopt__check" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* Payment summary sidebar */}
        <aside className="panel osum" aria-label="Payment summary">
          <div className="osum__body">
            <h2 className="osum__title">
              Payment summary
              <span className="osum__title-meta">{count} item{count !== 1 ? "s" : ""}</span>
            </h2>

            {/* Discount */}
            <div className="osum__discount">
              {discount ? (
                <div className="osum__applied">
                  <span className="osum__applied-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {discount.code}
                  </span>
                  <button type="button" className="osum__applied-remove" onClick={handleRemoveDiscount}>Remove</button>
                </div>
              ) : (
                <>
                  {autoDiscount && (
                    <div className="osum__applied" style={{ marginBlockEnd: "var(--sp-2)" }}>
                      <span className="osum__applied-label">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {autoDiscount.title}
                      </span>
                    </div>
                  )}
                  <div className="osum__promo">
                    <input
                      className="input" type="text" placeholder="Discount code"
                      value={discountInput}
                      onChange={(e) => { setDiscountInput(e.target.value); setDiscountError(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApplyDiscount(); } }}
                    />
                    <button
                      type="button"
                      className={`btn btn--secondary${applyingDiscount ? " is-loading" : ""}`}
                      onClick={handleApplyDiscount}
                      disabled={applyingDiscount || !discountInput.trim()}
                    >
                      {applyingDiscount ? "" : "Apply"}
                    </button>
                  </div>
                </>
              )}
              {discountError && <p className="osum__promo-err" role="alert">{discountError}</p>}
            </div>

            <div className="osum__rule" />

            <dl className="osum__totals">
              <div className="osum__row">
                <dt>Subtotal</dt>
                <dd>
                  {effectiveDiscount && !effectiveDiscount.free_shipping && (
                    <span className="osum__strike">{fmt(subtotal)}</span>
                  )}
                  {fmt(effectiveDiscount && !effectiveDiscount.free_shipping ? total : subtotal)}
                </dd>
              </div>
              {effectiveDiscount && (
                <div className="osum__row">
                  <dt>Discount ({discount ? discount.code : autoDiscount.title})</dt>
                  <dd className="osum__save">{effectiveDiscount.free_shipping ? "Free shipping" : `−${fmt(discountAmount)}`}</dd>
                </div>
              )}
              <div className="osum__row"><dt>Shipping fee</dt><dd className="osum__free">Free</dd></div>
              <div className="osum__row osum__row--total"><dt>Total</dt><dd>{fmt(total)}</dd></div>
            </dl>

            {error && (
              <p className="co-error" role="alert" style={{ marginBlockStart: "var(--sp-4)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01" strokeLinecap="round"/></svg>
                {error}
              </p>
            )}

            <button
              className={`btn btn--primary btn--block btn--lg osum__cta${loading ? " is-loading" : ""}`}
              type="submit"
              disabled={loading}
            >
              {loading ? "" : form.payment_method === "card" ? "Pay with card" : "Place order"}
            </button>

            <ul className="osum__trust">
              {TRUST.map((x) => (
                <li key={x.t}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{x.i}</svg>
                  {x.t}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </form>
    </div>
  );
}
