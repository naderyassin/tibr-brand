import { Truck, ShieldCheck, RotateCcw, Award } from "lucide-react";
import "./TrustBadges.css";

// Every claim here is already stated elsewhere on the site (Footer.jsx) —
// no new promises are invented for this badge row.
const BADGES = [
  {
    title: "FREE SHIPPING",
    text: "Free shipping on all orders above 3000",
    icon: <Truck />,
  },
  {
    title: "PAYMENT SECURE",
    text: "We ensure your data is fully protected.",
    icon: <ShieldCheck />,
  },
  {
    title: "14 DAYS RETURN",
    text: "Simply return it within 14 days",
    icon: <RotateCcw />,
  },
  {
    title: "ORIGINAL 100%",
    text: "All products are guaranteed authentic.",
    icon: <Award />,
  },
];

export default function TrustBadges() {
  return (
    <section className="trust-badges-container" aria-label="Why shop with us">
      <div className="trust-badges-grid">
        {BADGES.map((b) => (
          <div className="trust-badge-card" key={b.title}>
            <div className="trust-badge-card__icon-wrapper" aria-hidden="true">
              {b.icon}
            </div>
            <h3 className="trust-badge-card__title">{b.title}</h3>
            <p className="trust-badge-card__text">{b.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
