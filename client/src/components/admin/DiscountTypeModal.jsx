import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

const CLASSES = [
  {
    id: "order",
    label: "Amount off order",
    desc: "Discount the total order amount",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M4 8l1.5-3.5A1.5 1.5 0 0 1 6.9 3.5h10.2a1.5 1.5 0 0 1 1.4 1L20 8" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="3.5" y="8" width="17" height="12" rx="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8.5 12a3.5 3.5 0 0 0 7 0" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: "product",
    label: "Amount off products",
    desc: "Discount specific products",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M11.3 3.5h5.2a1.5 1.5 0 0 1 1.5 1.5v5.2a1.5 1.5 0 0 1-.44 1.06l-8 8a1.5 1.5 0 0 1-2.12 0l-5.2-5.2a1.5 1.5 0 0 1 0-2.12l8-8A1.5 1.5 0 0 1 11.3 3.5z" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="14.5" cy="8.5" r="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: "buy_x_get_y",
    label: "Buy X get Y",
    desc: "Discount products when customers buy specific products",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="3.5" y="9" width="17" height="11" rx="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 9V6a2.5 2.5 0 0 0-4.8-1M12 9V6a2.5 2.5 0 0 1 4.8-1M12 9v11" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: "shipping",
    label: "Free shipping",
    desc: "Offer free shipping on an order",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="2.5" y="7" width="12" height="10" rx="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14.5 10h3.5l3 3v4h-6.5v-7z" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="6.5" cy="18" r="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="16.5" cy="18" r="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function DiscountTypeModal({ open, onClose }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="discount-modal-backdrop admin-theme"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            className="discount-modal admin-theme"
            role="dialog"
            aria-modal="true"
            aria-label="Select discount type"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="discount-modal__head">
              <p className="discount-modal__title">Select discount type</p>
              <button type="button" className="discount-modal__close" onClick={onClose} aria-label="Close">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="discount-modal__grid">
              {CLASSES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="discount-modal__card"
                  onClick={() => navigate(`/admin/discounts/new?class=${c.id}`)}
                >
                  <span className="discount-modal__card-icon">{c.icon}</span>
                  <span className="discount-modal__card-body">
                    <span className="discount-modal__card-title">{c.label}</span>
                    <span className="discount-modal__card-desc">{c.desc}</span>
                  </span>
                  <svg className="discount-modal__card-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
