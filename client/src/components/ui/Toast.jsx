import { createContext, useContext, useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const timerRef = useRef(null);

  const toast = useCallback((text, duration = 2800) => {
    clearTimeout(timerRef.current);
    setMsg(text);
    timerRef.current = setTimeout(() => setMsg(null), duration);
  }, []);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <AnimatePresence>
        {msg && (
          <motion.div
            className="store-toast is-open"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="store-toast__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="store-toast__msg">{msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
