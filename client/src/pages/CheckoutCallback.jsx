import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "@/stores/cart";
import { useT } from "@/stores/lang";

// Paymob redirects here after the hosted checkout with the transaction result in
// the query string. This screen is a DISPLAY confirmation only — the order's real
// paid/failed state is set by the server-to-server webhook (which verifies HMAC),
// not by these params. On success we clear the cart and point to the orders list.
export default function CheckoutCallback() {
  const t = useT();
  const [params] = useSearchParams();
  const clearCart = useCart((s) => s.clear);

  const success = params.get("success") === "true";
  const ref = params.get("merchant_order_id") || "";
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (success && !cleared) { clearCart(); setCleared(true); }
  }, [success, cleared, clearCart]);

  return (
    <div className="store-container">
      <motion.div
        className="checkout-success"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="checkout-success__mark" style={success ? undefined : { color: "var(--danger)" }}>
          {success ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          )}
        </div>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-h2)", color: "var(--ink)" }}>
          {success ? t("Payment received", "تم استلام الدفع") : t("Payment not completed", "لم تكتمل عملية الدفع")}
        </h2>
        <p style={{ color: "var(--muted)" }}>
          {success
            ? t("We're confirming your order now — it'll appear in your orders shortly.", "نقوم بتأكيد طلبك الآن — سيظهر في طلباتك قريبًا.")
            : t("Your card wasn't charged. You can try again or choose another payment method.", "لم يتم خصم أي مبلغ من بطاقتك. يمكنك المحاولة مرة أخرى أو اختيار وسيلة دفع أخرى.")}
        </p>
        {ref && (
          <p className="checkout-success__ref">#{ref.slice(0, 8).toUpperCase()}</p>
        )}

        <div style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap", justifyContent: "center" }}>
          {success ? (
            <>
              <Link className="btn btn--primary" to="/account?tab=orders">{t("View my orders", "عرض طلباتي")}</Link>
              <Link className="btn btn--secondary" to="/shop/perfumes">{t("Keep shopping", "مواصلة التسوق")}</Link>
            </>
          ) : (
            <>
              <Link className="btn btn--primary" to="/checkout">{t("Try again", "حاول مرة أخرى")}</Link>
              <Link className="btn btn--secondary" to="/cart">{t("Back to cart", "العودة إلى السلة")}</Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
