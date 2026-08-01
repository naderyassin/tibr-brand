import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "@/stores/cart";
import { useAuth } from "@/stores/auth";
import { useLang, useT } from "@/stores/lang";
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

const fmt = (v, currency) => `${Number(v ?? 0).toLocaleString()} ${currency}`;
const govTitle = (slug) => (slug || "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const composeAddress = (addr) =>
  [addr?.street, govTitle(addr?.governorate)].filter(Boolean).join(", ");

const PAYMENT_METHODS = [
  {
    id: "card",
    label: "Debit / Credit Card",
    label_ar: "بطاقة ائتمان / خصم",
    desc: "Visa · Mastercard · Meeza",
    desc_ar: "فيزا · ماستركارد · ميزة",
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
    label_ar: "فودافون كاش",
    desc: "Mobile wallet",
    desc_ar: "محفظة إلكترونية",
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
    label_ar: "إنستاباي",
    desc: "Instant bank transfer",
    desc_ar: "تحويل بنكي فوري",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
  {
    id: "cash_on_delivery",
    label: "Cash on Delivery",
    label_ar: "الدفع عند الاستلام",
    desc: "Pay in cash when it arrives",
    desc_ar: "ادفع نقدًا عند وصول الطلب",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="13" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-4 0v2M12 12v3M10 14h4"/>
      </svg>
    ),
  },
];

const TRUST = [
  { t: "Cash on delivery across Egypt", t_ar: "الدفع عند الاستلام في جميع أنحاء مصر", i: <path d="M2 7h20v10H2zM6 12h.01M18 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" strokeLinecap="round" strokeLinejoin="round" /> },
  { t: "Free shipping, always", t_ar: "شحن مجاني دائمًا", i: <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" strokeLinecap="round" strokeLinejoin="round" /> },
  { t: "Your details stay private", t_ar: "بياناتك تبقى خاصة", i: <path d="M12 3l7 3v5c0 4.4-3 8.3-7 10-4-1.7-7-5.6-7-10V6l7-3zM9.5 12l1.8 1.8L15 10" strokeLinecap="round" strokeLinejoin="round" /> },
];

export default function Checkout() {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const currency = t("EGP", "ج.م");
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
      setDiscountError(err.message || t("This discount code isn't valid.", "كود الخصم هذا غير صالح."));
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
            <h1 className="acct-empty__title">{t("Your cart is empty", "سلتك فارغة")}</h1>
            <p className="acct-empty__sub">{t("There's nothing to check out yet. Browse the collection and add a fragrance first.", "لا يوجد شيء لإتمام شرائه بعد. تصفّح المجموعة وأضف عطرًا أولاً.")}</p>
            <div className="acct-empty__actions">
              <Link className="btn btn--primary" to="/shop/perfumes">{t("Browse the store", "تصفّح المتجر")}</Link>
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
          <h1 className="co-success__title">{t("Order received", "تم استلام طلبك")}</h1>
          <p className="co-success__sub">{t("Thank you. We'll confirm delivery with you over WhatsApp shortly.", "شكرًا لك. سنؤكد التوصيل معك عبر واتساب قريبًا.")}</p>

          <div className="co-success__receipt">
            <div className="co-success__rrow">
              <span className="co-success__rlabel">{t("Order number", "رقم الطلب")}</span>
              <span className="co-success__rref">#{success.checkout_reference?.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="co-success__rrow">
              <span className="co-success__rlabel">{t("Total", "الإجمالي")}</span>
              <span className="co-success__rtotal">{fmt(success.total_amount, currency)}</span>
            </div>
          </div>

          {success.discount && (
            <p className="co-success__discount">
              {t(
                `${success.discount.code || success.discount.title} applied${success.discount.free_shipping ? " · free shipping" : ` · −${fmt(success.discount.amount, currency)}`}`,
                `تم تطبيق ${success.discount.code || success.discount.title}${success.discount.free_shipping ? " · شحن مجاني" : ` · −${fmt(success.discount.amount, currency)}`}`
              )}
            </p>
          )}

          <div className="co-success__actions">
            <Link className="btn btn--primary" to="/account?tab=orders">{t("View my orders", "عرض طلباتي")}</Link>
            <Link className="btn btn--secondary" to="/shop/perfumes">{t("Keep shopping", "مواصلة التسوق")}</Link>
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
      setError(t("Please add your name, phone and delivery address.", "أضف اسمك ورقم هاتفك وعنوان التوصيل."));
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
        throw new Error(t("Could not start the card payment.", "تعذّر بدء الدفع بالبطاقة."));
      }

      const res = await apiCheckout(payload, token);
      clearCart();
      setSuccess(res.data);
    } catch (err) {
      setError(err.message || t("Failed to place order.", "تعذّر تنفيذ الطلب."));
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
        <h1 className="co-head__title">{t("Checkout", "الدفع")}</h1>
      </header>

      <form className="co-layout" onSubmit={handleSubmit} noValidate>
        <div className="co-main">
          <div className="co-blocks">

            {/* Deliver to */}
            <section className="co-block">
              <div className="co-block__head co-block__head--bordered">
                <span className="co-block__title">{t("Delivery address", "عنوان التوصيل")}</span>
                {hasSummaryAddress && (
                  <button type="button" className="co-block__link" onClick={() => setAddrEditing(true)}>
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M14.5 2.5a2 2 0 0 1 2.83 2.83L7 15.67 3 17l1.33-4L14.5 2.5z" strokeLinejoin="round" /></svg>
                    {t("Edit", "تعديل")}
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
                        {t(`Deliver to ${selectedAddr?.label || form.customer_name || "you"}`, `التوصيل إلى ${selectedAddr?.label || form.customer_name || "عنوانك"}`)}
                      </p>
                      <p className="co-deliver__line">{form.customer_address}</p>
                      {form.customer_phone && <p className="co-deliver__line">{form.customer_name ? `${form.customer_name} · ` : ""}{form.customer_phone}</p>}
                    </div>
                  </div>
                ) : (
                  <>
                    {addresses.length > 0 && (
                      <div className="field field--full co-pick" style={{ marginBlockEnd: "var(--sp-4)" }}>
                        <p className="co-pick__hint">{t("Use a saved address", "استخدم عنوانًا محفوظًا")}</p>
                        <div className="select-field">
                          <select
                            className="select"
                            value={selectedAddrId || ""}
                            onChange={(e) => { const a = addresses.find((x) => x.id === e.target.value); if (a) applyAddress(a); }}
                          >
                            <option value="">{t("Choose an address…", "اختر عنوانًا…")}</option>
                            {addresses.map((a) => (
                              <option key={a.id} value={a.id}>
                                {(a.label || t("Address", "العنوان"))}{a.governorate ? ` — ${govTitle(a.governorate)}` : ""}{a.is_default ? ` (${t("default", "افتراضي")})` : ""}
                              </option>
                            ))}
                          </select>
                          <svg className="select-field__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                        </div>
                      </div>
                    )}

                    <div className="form-grid">
                      <div className="field">
                        <label className="field__label" htmlFor="co-name">{t("Full name", "الاسم الكامل")} <span className="field__req">*</span></label>
                        <input id="co-name" className="input" type="text" value={form.customer_name} onChange={(e) => handleChange("customer_name", e.target.value)} autoComplete="name" required />
                      </div>
                      <div className="field">
                        <label className="field__label" htmlFor="co-phone">{t("Phone number", "رقم الهاتف")} <span className="field__req">*</span></label>
                        <input id="co-phone" className="input" type="tel" inputMode="numeric" value={form.customer_phone} onChange={(e) => handleChange("customer_phone", e.target.value)} autoComplete="tel" placeholder="01XXXXXXXXX" required />
                      </div>
                      <div className="field field--full">
                        <label className="field__label" htmlFor="co-address">{t("Delivery address", "عنوان التوصيل")} <span className="field__req">*</span></label>
                        <textarea id="co-address" className="textarea" value={form.customer_address} onChange={(e) => handleChange("customer_address", e.target.value)} required rows={3} placeholder={t("Street, building, floor, governorate…", "الشارع، المبنى، الدور، المحافظة…")} />
                      </div>
                      {form.customer_name && form.customer_phone && form.customer_address && (
                        <div className="field--full">
                          <button type="button" className="btn btn--secondary" onClick={() => setAddrEditing(false)}>{t("Use this address", "استخدام هذا العنوان")}</button>
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
                <span className="co-block__title">{t("Your order", "طلبك")} <span className="co-block__title-meta">{t(`${count} item${count !== 1 ? "s" : ""}`, `${count} منتج`)}</span></span>
              </div>
              <div className="co-block__body">
                <div className="co-ship">
                  {items.map((item) => {
                    const name = lang === "ar"
                      ? item.product.ar_name || item.product.en_name
                      : item.product.en_name || item.product.ar_name;
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
                          <p className="co-ship-meta">{[item.size, t(`Qty ${item.qty}`, `الكمية ${item.qty}`)].filter(Boolean).join(" · ")}</p>
                        </div>
                        <span className="co-ship-price">{fmt(price * item.qty, currency)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Delivery */}
            <section className="co-block">
              <div className="co-block__head co-block__head--bordered">
                <span className="co-block__title">{t("Delivery", "التوصيل")}</span>
              </div>
              <div className="co-block__body">
                <div className="co-deliv-row">
                  <span className="co-deliv-row__left">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h11v8H3zM14 10h4l3 3v2h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>
                    {t("Standard delivery · across Egypt", "توصيل عادي · في جميع أنحاء مصر")}
                  </span>
                  <span className="co-deliv-row__free">{t("FREE", "مجاني")}</span>
                </div>
              </div>
            </section>

            {/* Pay with */}
            <section className="co-block">
              <div className="co-block__head co-block__head--bordered">
                <span className="co-block__title">{t("Pay with", "الدفع باستخدام")}</span>
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
                          <span className="co-payopt__label">{t(m.label, m.label_ar)}</span>
                          <span className="co-payopt__desc">{saved ? maskHandle(m.id, saved.handle) : t(m.desc, m.desc_ar)}</span>
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
        <aside className="panel osum" aria-label={t("Payment summary", "ملخص الدفع")}>
          <div className="osum__body">
            <h2 className="osum__title">
              {t("Payment summary", "ملخص الدفع")}
              <span className="osum__title-meta">{t(`${count} item${count !== 1 ? "s" : ""}`, `${count} منتج`)}</span>
            </h2>

            {/* Discount */}
            <div className="osum__discount">
              {discount ? (
                <div className="osum__applied">
                  <span className="osum__applied-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {discount.code}
                  </span>
                  <button type="button" className="osum__applied-remove" onClick={handleRemoveDiscount}>{t("Remove", "إزالة")}</button>
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
                      className="input" type="text" placeholder={t("Discount code", "كود الخصم")}
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
                      {applyingDiscount ? "" : t("Apply", "تطبيق")}
                    </button>
                  </div>
                </>
              )}
              {discountError && <p className="osum__promo-err" role="alert">{discountError}</p>}
            </div>

            <div className="osum__rule" />

            <dl className="osum__totals">
              <div className="osum__row">
                <dt>{t("Subtotal", "الإجمالي الفرعي")}</dt>
                <dd>
                  {effectiveDiscount && !effectiveDiscount.free_shipping && (
                    <span className="osum__strike">{fmt(subtotal, currency)}</span>
                  )}
                  {fmt(effectiveDiscount && !effectiveDiscount.free_shipping ? total : subtotal, currency)}
                </dd>
              </div>
              {effectiveDiscount && (
                <div className="osum__row">
                  <dt>{t(`Discount (${discount ? discount.code : autoDiscount.title})`, `الخصم (${discount ? discount.code : autoDiscount.title})`)}</dt>
                  <dd className="osum__save">{effectiveDiscount.free_shipping ? t("Free shipping", "شحن مجاني") : `−${fmt(discountAmount, currency)}`}</dd>
                </div>
              )}
              <div className="osum__row"><dt>{t("Shipping fee", "رسوم الشحن")}</dt><dd className="osum__free">{t("Free", "مجاني")}</dd></div>
              <div className="osum__row osum__row--total"><dt>{t("Total", "الإجمالي")}</dt><dd>{fmt(total, currency)}</dd></div>
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
              {loading ? "" : form.payment_method === "card" ? t("Pay with card", "الدفع بالبطاقة") : t("Place order", "تأكيد الطلب")}
            </button>

            <ul className="osum__trust">
              {TRUST.map((x) => (
                <li key={x.t}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{x.i}</svg>
                  {t(x.t, x.t_ar)}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </form>
    </div>
  );
}
