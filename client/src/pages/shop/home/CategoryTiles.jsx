import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/api";
import { FRAGRANCE_SUBS } from "@/lib/shopNav";
import "./CategoryTiles.css";

export default function CategoryTiles() {
  const { data } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => getProducts(),
  });

  const imageByCategory = useMemo(() => {
    const map = {};
    (data?.data ?? []).forEach((p) => {
      if (p.fragrance_category && p.image && !map[p.fragrance_category]) {
        map[p.fragrance_category] = p.image;
      }
    });
    return map;
  }, [data]);

  return (
    <section className="shop-home-section" aria-label="Shop by category">
      <h2 className="shop-home-section__title">Shop by Category</h2>
      <div className="o2morny-category-grid">
        {FRAGRANCE_SUBS.map((c) => {
          // Fallback to local image in /categories/ if API doesn't provide one
          const image = imageByCategory[c.slug] || `/categories/${c.slug}.png`;
          
          return (
            <Link
              key={c.slug}
              to={`/shop/fragrances/${c.slug}`}
              className="o2morny-category-card"
            >
              <div className="o2morny-category-image">
                <img src={image} alt={c.label.split(" —")[0]} 
                  onError={(e) => {
                    // Fallback if local image doesn't exist either
                    e.target.style.display = 'none';
                    e.target.parentElement.style.background = 'var(--surface-2)';
                  }} 
                />
              </div>
              <div className="o2morny-category-footer">
                <span className="o2morny-category-title">{c.label.split(" —")[0]}</span>
                <span className="o2morny-category-arrow">&gt;</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
