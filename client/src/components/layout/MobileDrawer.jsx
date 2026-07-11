import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { SHOP_NAV } from "@/lib/shopNav";

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
  </svg>
);
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.1 14.9l-.3-.2-2.8.8.8-2.7-.2-.3A8 8 0 0 1 12 4zm4.4 10.2c-.2-.1-1.3-.7-1.5-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.1-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.1-.2 0-.4.1-.5l.4-.5c.1-.1.1-.3 0-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.8.8-.8 2 0 3.2a9 9 0 0 0 3.9 3.5c1.3.6 1.9.6 2.6.5.4 0 1.3-.5 1.5-1 .2-.5.2-1 .1-1z" />
  </svg>
);

const NAV_LINKS = [
  ...SHOP_NAV.map((tab) => ({ to: tab.path, label: tab.label.split(" —")[0] })),
  { to: "/account?tab=wishlist", label: "Wishlist" },
  { to: "/account", label: "Account" },
];

export default function MobileDrawer({ open, onClose }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="store-scrim is-open"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />
          <motion.aside
            className="store-drawer is-open"
            id="drawer"
            aria-label="Menu"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="store-drawer__head">
              <span className="store-wordmark">Tibr<span className="dot">.</span></span>
              <button className="store-iconbtn" id="drawer-close" type="button" aria-label="Close" onClick={onClose}>
                <CloseIcon />
              </button>
            </div>
            <nav className="store-drawer__nav" aria-label="Categories">
              {NAV_LINKS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  className="store-drawer__link"
                  to={to}
                  onClick={onClose}
                  aria-current={undefined}
                >
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="store-drawer__foot">
              <a className="store-footer__whatsapp" href="https://wa.me/" target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon />
                Chat on WhatsApp
              </a>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
