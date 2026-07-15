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
const BagIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M8 8V6a4 4 0 0 1 8 0v2" /><rect width="16" height="14" x="4" y="8" rx="2" />
  </svg>
);

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

  if (items.length === 0) {
    return (
      <div className="store-container">
        <div className="cart-breadcrumbs">
          <Link to="/">Home</Link> &gt; <span>Your Shopping Cart</span>
        </div>
        <motion.div
          className="cart-empty-panel"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="cart-empty-panel__heading">why your cart empty let's start shopping</h1>
          <p className="cart-empty-panel__sub">Your cart is empty</p>
          <Link className="btn-pill" to="/shop/perfumes">
            Continue shopping <span className="btn-pill__arrow">&gt;</span>
          </Link>
          {!token && (
            <div className="cart-empty-panel__login">
              <h3 className="cart-empty-panel__login-title">Have an account?</h3>
               <p className="cart-empty-panel__login-sub">
                <Link to="/login">Log in</Link> to check out faster.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="store-container">
      <header className="page-head">
        <h1 className="page-head__title">Your cart</h1>
      </header>

      <div className="cart">
        <div className="cart-lines">
          <AnimatePresence initial={false}>
            {items.map((item) => {
              const name = item.product.en_name || item.product.ar_name;
              const price = item.price ?? item.product.price ?? 0;

              return (
                <motion.div
                  key={item.key}
                  className="cart-line"
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0, marginBlock: 0 }}
                  transition={{ duration: 0.28 }}
                >
                  {item.product.image ? (
                    <img className="cart-line__thumb" src={item.product.image} alt={name} />
                  ) : (
                    <div className="cart-line__thumb" style={{ background: "var(--surface)" }} />
                  )}

                  <div>
                    <Link className="cart-line__name" to={`/product?id=${item.product.id}`}>{name}</Link>
                    {item.size && <p className="cart-line__attr">Size: {item.size}</p>}
                    <button
                      className="cart-line__remove"
                      type="button"
                      onClick={() => removeItem(item.key)}
                    >
                      <TrashIcon /> Remove
                    </button>
                  </div>

                  <div className="cart-line__end">
                    <p className="cart-line__price">{price * item.qty} EGP</p>
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

        <div className="summary">
          <h2 className="summary__title">Order summary</h2>
          <div className="summary__items">
            {items.map((item) => {
              const name = item.product.en_name || item.product.ar_name;
              const price = item.price ?? item.product.price ?? 0;
              return (
                <div key={item.key} className="summary__item">
                  {item.product.image ? (
                    <img className="summary__item-img" src={item.product.image} alt={name} />
                  ) : (
                    <div className="summary__item-img summary__item-img--empty" />
                  )}
                  <div className="summary__item-info">
                    <span className="summary__item-name">{name}</span>
                    <span className="summary__item-meta">Qty: {item.qty}{item.size ? ` · ${item.size}` : ""}</span>
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
          <button
            className="btn btn--primary btn--block btn--lg"
            type="button"
            style={{ marginTop: "1.5rem" }}
            onClick={() => navigate("/checkout")}
          >
            Checkout
          </button>
          <p className="summary__note">Cash on delivery · Free shipping across Egypt</p>
        </div>
      </div>
    </div>
  );
}
