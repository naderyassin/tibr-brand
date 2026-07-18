import { Link } from "react-router-dom";
import { useDraggableScroll } from "@/hooks/useDraggableScroll";
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
  const { ref, onMouseDown, showLeftArrow, showRightArrow, scroll } = useDraggableScroll();

  return (
    <section className="shop-home-section" aria-label="Shop by category">
      <h2 className="shop-home-section__title">Shop by Category</h2>
      <div className="slider-wrapper">
        {showLeftArrow && (
          <button
            className="slider-arrow slider-arrow--left"
            onClick={() => scroll("left")}
            aria-label="Previous categories"
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <div
          ref={ref}
          onMouseDown={onMouseDown}
          className="o2morny-category-grid"
        >
          {TILES.map((tile) => (
            <Link key={tile.key} to={tile.to} className="o2morny-category-card" draggable="false">
              <div className="o2morny-category-image" draggable="false">
                <img
                  src={`/categories/${tile.key}.png`}
                  alt={tile.label}
                  draggable="false"
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
        {showRightArrow && (
          <button
            className="slider-arrow slider-arrow--right"
            onClick={() => scroll("right")}
            aria-label="Next categories"
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}
      </div>
    </section>
  );
}
