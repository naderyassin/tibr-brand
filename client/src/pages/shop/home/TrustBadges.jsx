import { Truck, ShieldCheck, RotateCcw, Award } from "lucide-react";
import { useT } from "@/stores/lang";
import "./TrustBadges.css";

// Every claim here is already stated elsewhere on the site (Footer.jsx) —
// no new promises are invented for this badge row.
const BADGES = [
  {
    title: "FREE SHIPPING",
    title_ar: "شحن مجاني",
    text: "Free shipping on all orders above 3000",
    text_ar: "شحن مجاني على الطلبات فوق 3000 جنيه",
    icon: <Truck />,
  },
  {
    title: "PAYMENT SECURE",
    title_ar: "دفع آمن",
    text: "We ensure your data is fully protected.",
    text_ar: "نضمن حماية بياناتك بالكامل.",
    icon: <ShieldCheck />,
  },
  {
    title: "14 DAYS RETURN",
    title_ar: "إرجاع خلال 14 يوم",
    text: "Simply return it within 14 days",
    text_ar: "أرجعه بكل سهولة خلال 14 يومًا",
    icon: <RotateCcw />,
  },
  {
    title: "ORIGINAL 100%",
    title_ar: "أصلي 100%",
    text: "All products are guaranteed authentic.",
    text_ar: "جميع المنتجات مضمونة الأصالة.",
    icon: <Award />,
  },
];

export default function TrustBadges() {
  const t = useT();
  return (
    <section className="trust-badges-container" aria-label={t("Why shop with us", "لماذا تتسوق معنا")}>
      <div className="trust-badges-grid">
        {BADGES.map((b) => (
          <div className="trust-badge-card" key={b.title}>
            <div className="trust-badge-card__icon-wrapper" aria-hidden="true">
              {b.icon}
            </div>
            <h3 className="trust-badge-card__title">{t(b.title, b.title_ar)}</h3>
            <p className="trust-badge-card__text">{t(b.text, b.text_ar)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
