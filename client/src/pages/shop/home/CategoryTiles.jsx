import { Link } from "react-router-dom";
import { useDraggableScroll } from "@/hooks/useDraggableScroll";
import { useT } from "@/stores/lang";
import "./CategoryTiles.css";

// Each tile is a saved filter query, not a route of its own — same contract as
// the nav (docs/DATA-MODEL.md §5).
const TILES = [
  { key: "men",       label: "Men",      label_ar: "رجالي",   to: "/shop/perfumes?audience=men" },
  { key: "women",     label: "Women",    label_ar: "نسائي",   to: "/shop/perfumes?audience=women" },
  { key: "unisex",    label: "Unisex",   label_ar: "للجنسين", to: "/shop/perfumes?audience=unisex" },
  { key: "sets",      label: "Sets",     label_ar: "أطقم",     to: "/shop/sets" },
  { key: "arabian",   label: "Arabian",  label_ar: "خليجي",   to: "/shop/arabian" },
  { key: "candles",   label: "Candles",  label_ar: "شموع",    to: "/shop/candles" },
];

export default function CategoryTiles() {
  const { ref, onMouseDown, showLeftArrow, showRightArrow, scroll } = useDraggableScroll();
  const t = useT();

  return (
    <section className="shop-home-section" aria-label={t("Shop by category", "تسوق حسب الفئة")}>
      <h2 className="shop-home-section__title">{t("Shop by Category", "تسوق حسب الفئة")}</h2>
      <div className="slider-wrapper">
        {showLeftArrow && (
          <button
            className="slider-arrow slider-arrow--left"
            onClick={() => scroll("left")}
            aria-label={t("Previous categories", "الفئات السابقة")}
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
                  alt={t(tile.label, tile.label_ar)}
                  draggable="false"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.parentElement.style.background = "var(--surface-2)";
                  }}
                />
              </div>
              <div className="o2morny-category-footer">
                <span className="o2morny-category-title">{t(tile.label, tile.label_ar)}</span>
              </div>
            </Link>
          ))}
        </div>
        {showRightArrow && (
          <button
            className="slider-arrow slider-arrow--right"
            onClick={() => scroll("right")}
            aria-label={t("Next categories", "الفئات التالية")}
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
