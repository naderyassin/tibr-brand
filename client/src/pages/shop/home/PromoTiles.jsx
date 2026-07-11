import { useState } from "react";
import "./PromoTiles.css";

export default function PromoTiles() {
  const [copiedCode, setCopiedCode] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [distillState, setDistillState] = useState("idle"); // 'idle' | 'distilling' | 'completed'

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

  const handleDistill = () => {
    setDistillState("distilling");
    setTimeout(() => {
      setDistillState("completed");
      showToast("Exclusive 30% VIP promo code distilled successfully!");
    }, 2500);
  };

  return (
    <section className="promo-tiles-container" aria-label="Savings">
      <div className="promo-ambient-glow promo-glow-1"></div>
      <div className="promo-ambient-glow promo-glow-2"></div>

      {/* Secret Distiller Mystery Section */}
      <div className="promo-mystery-section">
        <div className="promo-mystery-card">
          <div className="promo-mystery-glow"></div>
          <div className="promo-mystery-badge">VIP SPECIAL</div>
          <h3>Unveil Secret Elixir Offer</h3>
          <p>Distill an exclusive, high-value promotional coupon from our vault. Available only once per session.</p>
          
          <div className="promo-distiller-container">
            <div className={`promo-distiller ${distillState === "distilling" ? "active" : ""}`} id="perfumeDistiller">
              <div className="promo-flask">
                <div className="promo-flask-neck"></div>
                <div className="promo-flask-liquid">
                  <div className="promo-bubble promo-bubble-1"></div>
                  <div className="promo-bubble promo-bubble-2"></div>
                  <div className="promo-bubble promo-bubble-3"></div>
                  <div className="promo-bubble promo-bubble-4"></div>
                </div>
              </div>
              <div className="promo-distiller-droplets">
                <div className="promo-droplet"></div>
              </div>
            </div>
          </div>

          {distillState !== "completed" && (
            <button 
              type="button"
              className="promo-distill-btn" 
              onClick={handleDistill}
              disabled={distillState === "distilling"}
            >
              {distillState === "distilling" ? "Distilling..." : "Distill Scent Code"}
            </button>
          )}

          {distillState === "completed" && (
            <div className="promo-secret-reveal-box">
              <div className="promo-revealed-header">CURATED DISCOVERY</div>
              <div className="promo-revealed-percent">30% OFF</div>
              <div className="promo-revealed-name">ELIXIR SUPRÊME PRIVILEGE</div>
              <p>You have unlocked our highest tier reward. Valid for the next 24 hours.</p>
              
              <div className="promo-coupon-wrapper center">
                <button 
                  type="button"
                  className={`promo-coupon-code large ${copiedCode === "ELIXIR30" ? "copied" : ""}`}
                  onClick={() => handleCopy("ELIXIR30")}
                  title="Click to copy coupon code"
                >
                  <span className="promo-code-val">ELIXIR30</span>
                  <span className="promo-copy-badge">
                    {copiedCode === "ELIXIR30" ? "Copied!" : "Copy"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
