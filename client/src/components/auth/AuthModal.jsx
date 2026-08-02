import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthModal } from "@/stores/authModal";
import { useT } from "@/stores/lang";
import LoginCard from "./LoginCard";
import SignupCard from "./SignupCard";

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
  </svg>
);

export default function AuthModal() {
  const mode       = useAuthModal((s) => s.mode);
  const close      = useAuthModal((s) => s.closeModal);
  const openLogin  = useAuthModal((s) => s.openLogin);
  const openSignup = useAuthModal((s) => s.openSignup);
  const t          = useT();
  const navigate   = useNavigate();
  const open = mode !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // The site scrolls via Lenis (main.jsx), which drives its own rAF loop
    // and intercepts wheel/touch input independently of the DOM — locking
    // body overflow alone doesn't stop it from scrolling the page behind
    // the modal.
    window.__lenis?.stop();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      window.__lenis?.start();
    };
  }, [open, close]);

  const goToShop = () => {
    close();
    navigate("/shop");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="auth-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={mode === "signup" ? t("Create account", "إنشاء حساب") : t("Sign in", "تسجيل الدخول")}
        >
          {/* opacity-only: animating scale/transform on the same element that
              is also the overflow-y scroll container makes some browsers
              transiently repaint a scrollbar during the transform (a real
              flash even when content never actually overflows). */}
          <motion.div
            className="auth-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="auth-modal__close" type="button" onClick={close} aria-label={t("Close", "إغلاق")}>
              <CloseIcon />
            </button>
            {mode === "signup" ? (
              <SignupCard onSuccess={openLogin} onSwitch={openLogin} />
            ) : (
              <LoginCard onSuccess={goToShop} onNav={close} onSwitch={openSignup} />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
