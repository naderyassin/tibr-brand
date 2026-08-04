import { createContext, useContext, useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLang } from "@/stores/lang";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const dir = useLang((s) => s.dir);
  const [msg, setMsg] = useState(null);
  const timerRef = useRef(null);

  const toast = useCallback((content, duration = 2800) => {
    clearTimeout(timerRef.current);
    setMsg(content);
    timerRef.current = setTimeout(() => setMsg(null), duration);
  }, []);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <AnimatePresence>
        {msg && (
          <motion.div
            className={`store-toast is-open${typeof msg === "object" && msg.rich ? " is-rich" : ""}`}
            dir={dir}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, scale: 0.92, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 20 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {typeof msg === "object" && msg.rich ? (
              <>
                {msg.avatar && (
                  <motion.img
                    src={msg.avatar}
                    alt=""
                    className="store-toast__avatar"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                  />
                )}
                <div className="store-toast__content">
                  <motion.div
                    className="store-toast__greeting"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                  >
                    <span className="store-toast__checkmark">
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
                      </svg>
                    </span>
                    <span className="store-toast__title">{msg.title}</span>
                  </motion.div>
                  {msg.subtitle && (
                    <motion.p
                      className="store-toast__subtitle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                    >
                      {msg.subtitle}
                    </motion.p>
                  )}
                </div>
              </>
            ) : (
              <>
                <span className="store-toast__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="store-toast__msg">{msg}</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
