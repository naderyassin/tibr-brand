import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/stores/cart";
import { useAuth } from "@/stores/auth";

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  </svg>
);
const MinusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M5 12h14" />
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const BagIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 16v-2a8 8 0 0 1 16 0v2" /><rect width="30" height="24" x="9" y="16" rx="3" />
  </svg>
);

// Trust row shared with checkout — cash on delivery, free shipping, private.
const TRUST = [
  { t: "Cash on delivery across Egypt", i: <path d="M2 7h20v10H2zM6 12h.01M18 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" strokeLinecap="round" strokeLinejoin="round" /> },
  { t: "Free shipping, always", i: <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" strokeLinecap="round" strokeLinejoin="round" /> },
  { t: "Your details stay private", i: <path d="M12 3l7 3v5c0 4.4-3 8.3-7 10-4-1.7-7-5.6-7-10V6l7-3zM9.5 12l1.8 1.8L15 10" strokeLinecap="round" strokeLinejoin="round" /> },
];

function TrustList() {
  return (
    <ul className="osum__trust">
      {TRUST.map((x) => (
        <li key={x.t}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{x.i}</svg>
          {x.t}
        </li>
      ))}
    </ul>
  );
}

const fmt = (v) => `${Number(v ?? 0).toLocaleString()} EGP`;

export default function Cart() {
  const items = useCart((s) => s.items);
  const removeItem = useCart((s) => s.removeItem);
  const updateQty = useCart((s) => s.updateQty);
  const token = useAuth((s) => s.token);
  const navigate = useNavigate();

  const subtotal = items.reduce(
    (sum, i) => sum + (i.price ?? i.product.price ?? 0) * i.qty,
    0
  );
  const count = items.reduce((n, i) => n + i.qty, 0);

  if (items.length === 0) {
    return (
      <div className="store-container">
        <div className="co-layout" style={{ gridTemplateColumns: "1fr" }}>
          <motion.div
            className="acct-empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ maxInlineSize: "38rem", marginInline: "auto" }}
          >
            <span className="acct-empty__mark" aria-hidden="true"><BagIcon /></span>
            <h1 className="acct-empty__title">Your cart is empty</h1>
            <p className="acct-empty__sub">
              Nothing here yet. Explore the collection and add the fragrances that speak to you —
              they&apos;ll be ready when you are.
            </p>
            <div className="acct-empty__actions">
              <Link className="btn btn--primary" to="/shop/perfumes">Explore fragrances</Link>
              {!token && <Link className="btn btn--secondary" to="/login">Log in to check out faster</Link>}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="store-container">
      <div className="co-layout">
        <div className="co-main">
          <header className="co-head">
            <h1 className="co-head__title">Your cart</h1>
            <p className="co-head__sub">{count} item{count !== 1 ? "s" : ""} · free shipping across Egypt</p>
          </header>

          <div className="panel cart-items">
            <AnimatePresence initial={false}>
              {items.map((item) => {
                const name = item.product.en_name || item.product.ar_name;
                const price = item.price ?? item.product.price ?? 0;
                return (
                  <motion.div
                    key={item.key}
                    className="cartline"
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBlock: 0, paddingBlock: 0 }}
                    transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {item.product.image ? (
                      <img className="cartline__thumb" src={item.product.image} alt={name} />
                    ) : (
                      <div className="cartline__thumb" />
                    )}

                    <div className="cartline__info">
                      <Link className="cartline__name" to={`/product?id=${item.product.id}`}>{name}</Link>
                      {item.size && <p className="cartline__attr">Size: {item.size}</p>}
                      <button className="cartline__remove" type="button" onClick={() => removeItem(item.key)}>
                        <TrashIcon /> Remove
                      </button>
                    </div>

                    <div className="cartline__end">
                      <p className="cartline__price">{fmt(price * item.qty)}</p>
                      <div className="stepper">
                        <button
                          className="stepper__btn"
                          type="button"
                          disabled={item.qty <= 1}
                          onClick={() => updateQty(item.key, item.qty - 1)}
                          aria-label="Decrease quantity"
                        >
                          <MinusIcon />
                        </button>
                        <span className="stepper__value">{item.qty}</span>
                        <button
                          className="stepper__btn"
                          type="button"
                          onClick={() => updateQty(item.key, item.qty + 1)}
                          aria-label="Increase quantity"
                        >
                          <PlusIcon />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <Link className="cartline__remove" to="/shop/perfumes" style={{ marginBlockStart: "var(--sp-4)", color: "var(--ink-2)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" style={{ width: "0.9rem", height: "0.9rem" }}><path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Continue shopping
          </Link>
        </div>

        <aside className="panel osum" aria-label="Order summary">
          <div className="osum__body">
            <h2 className="osum__title">Order summary</h2>

            <div className="osum__items">
              {items.map((item) => {
                const name = item.product.en_name || item.product.ar_name;
                const price = item.price ?? item.product.price ?? 0;
                return (
                  <div key={item.key} className="osum__item">
                    {item.product.image ? (
                      <img className="osum__thumb" src={item.product.image} alt={name} />
                    ) : (
                      <div className="osum__thumb" />
                    )}
                    <div className="osum__iinfo">
                      <span className="osum__iname">{name}</span>
                      <span className="osum__imeta">{[item.size, `Qty ${item.qty}`].filter(Boolean).join(" · ")}</span>
                    </div>
                    <span className="osum__iprice">{fmt(price * item.qty)}</span>
                  </div>
                );
              })}
            </div>

            <div className="osum__rule" />

            <dl className="osum__totals">
              <div className="osum__row"><dt>Subtotal</dt><dd>{fmt(subtotal)}</dd></div>
              <div className="osum__row"><dt>Shipping</dt><dd className="osum__free">Free</dd></div>
              <div className="osum__row osum__row--total"><dt>Total</dt><dd>{fmt(subtotal)}</dd></div>
            </dl>

            <button
              className="btn btn--primary btn--block btn--lg osum__cta"
              type="button"
              onClick={() => navigate("/checkout")}
            >
              Proceed to checkout
            </button>

            <TrustList />
          </div>
        </aside>
      </div>
    </div>
  );
}
