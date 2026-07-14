import { Link } from "react-router-dom";
import "./CategoryTiles.css";

// Each tile is a saved filter query, not a route of its own — same contract as
// the nav (docs/DATA-MODEL.md §5).
const TILES = [
  { key: "men",       label: "Men",      to: "/shop/perfumes?audience=men" },
  { key: "women",     label: "Women",    to: "/shop/perfumes?audience=women" },
  { key: "unisex",    label: "Unisex",   to: "/shop/perfumes?audience=unisex" },
  { key: "sets",      label: "Sets",     to: "/shop/sets" },
  { key: "arabian",   label: "Arabian",  to: "/shop/arabian" },
  { key: "candles",   label: "Candles",  to: "/shop/candles" },
];

export default function CategoryTiles() {
  return (
    <section className="shop-home-section" aria-label="Shop by category">
      <h2 className="shop-home-section__title">Shop by Category</h2>
      <div className="o2morny-category-grid">
        {TILES.map((tile) => (
          <Link key={tile.key} to={tile.to} className="o2morny-category-card">
            <div className="o2morny-category-image">
              <img
                src={`/categories/${tile.key}.png`}
                alt={tile.label}
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.parentElement.style.background = "var(--surface-2)";
                }}
              />
            </div>
            <div className="o2morny-category-footer">
              <span className="o2morny-category-title">{tile.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
