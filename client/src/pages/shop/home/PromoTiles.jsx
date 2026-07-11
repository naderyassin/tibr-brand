import { Link } from "react-router-dom";
import "./PromoTiles.css";

// Presentational only — there's no coupon/discount-code engine in this
// codebase, so these are marketing tiles pointing into the catalog, not
// automatic checkout discounts.
const TIERS = [
  { pct: 10, theme: 'black', label: 'SAVE 10%' },
  { pct: 15, theme: 'slate', label: 'SAVE 15%' },
  { pct: 20, theme: 'gray', label: 'Save 20%' },
  { pct: 25, theme: 'light-gray', label: 'Save 25%' },
];

export default function PromoTiles() {
  return (
    <section className="promo-tiles-container" aria-label="Savings">
      <header className="promo-tiles-header">
        <h2>New Offers</h2>
        <p>Shop our collections and save big</p>
      </header>
      <div className="promo-tiles-grid">
        {TIERS.map((t) => (
          <div className="promo-tile-card" key={t.pct}>
            <div className={`promo-tile-box ${t.theme}`}>
              <div className="promo-tile-save">SAVE</div>
              <div className="promo-tile-pct">{t.pct}%</div>
            </div>
            <div className="promo-tile-footer">
              <div className="promo-tile-title">{t.label}</div>
              <Link className="promo-tile-btn" to="/shop/fragrances">Shop Now</Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
