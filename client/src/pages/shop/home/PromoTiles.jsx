import { useState } from "react";
import "./PromoTiles.css";

export default function PromoTiles() {
  const [copiedCode, setCopiedCode] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const handleCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      showToast(`Code "${code}" copied to clipboard!`);
      setTimeout(() => {
        setCopiedCode(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy code: ", err);
      showToast("Failed to copy code. Please copy manually.");
    }
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 3000);
  };


  return (
    <section className="promo-tiles-container" aria-label="Savings">
      <div className="promo-ambient-glow promo-glow-1"></div>
      <div className="promo-ambient-glow promo-glow-2"></div>



      {/* Local Toast System */}
      {toastMessage && (
        <div className="promo-toast-container">
          <div className="promo-toast">
            <svg className="promo-toast-success-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </section>
  );
}
