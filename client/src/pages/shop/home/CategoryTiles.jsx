import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/api";
import "./CategoryTiles.css";

// Each tile is a saved filter query, not a route of its own — same contract as
// the nav (docs/DATA-MODEL.md §5).
const TILES = [
  { key: "men",       label: "Men",        ar: "رجالي",   to: "/shop/perfumes?audience=men",   match: (p) => p.audience === "men" },
  { key: "women",     label: "Women",      ar: "نسائي",   to: "/shop/perfumes?audience=women", match: (p) => p.audience === "women" },
  { key: "unisex",    label: "Unisex",     ar: "للجنسين", to: "/shop/perfumes?audience=unisex", match: (p) => p.audience === "unisex" },
  { key: "inspired",  label: "Inspired",   ar: "مستوحى",  to: "/shop/inspired",                match: (p) => p.line === "inspired" },
  { key: "arabian",   label: "Arabian",    ar: "خليجي",   to: "/shop/arabian",                 match: (p) => p.classification === "arabian" },
  { key: "candles",   label: "Candles",    ar: "شموع",    to: "/shop/candles",                 match: (p) => p.product_type === "candle" },
];

export default function CategoryTiles() {
  const { data } = useQuery({ queryKey: ["products", {}, "newest"], queryFn: () => getProducts() });
  const products = data?.data ?? [];

  // Borrow a real product shot per tile; fall back to the static art.
  const imageFor = useMemo(() => {
    const map = {};
    for (const tile of TILES) {
      const hit = products.find((p) => tile.match(p) && (p.images?.[0] || p.image));
      if (hit) map[tile.key] = hit.images?.[0] || hit.image;
    }
    return map;
  }, [products]);

  return (
    <section className="shop-home-section" aria-label="Shop by category">
      <h2 className="shop-home-section__title">Shop by Category</h2>
      <div className="o2morny-category-grid">
        {TILES.map((tile) => (
          <Link key={tile.key} to={tile.to} className="o2morny-category-card">
            <div className="o2morny-category-image">
              <img
                src={imageFor[tile.key] || `/categories/${tile.key}.png`}
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
