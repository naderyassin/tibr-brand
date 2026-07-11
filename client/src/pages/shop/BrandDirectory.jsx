import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/api";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

// Bucket a brand under its first letter (non A-Z → "#").
function bucketOf(brand) {
  const c = brand.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
}

export default function BrandDirectory() {
  const { data, isLoading } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => getProducts(),
  });

  const groups = useMemo(() => {
    const map = {};
    (data?.data ?? []).forEach((p) => {
      if (!p.brand) return;
      const letter = bucketOf(p.brand);
      (map[letter] ||= new Set()).add(p.brand);
    });
    const out = {};
    Object.entries(map).forEach(([letter, set]) => {
      out[letter] = [...set].sort((a, b) => a.localeCompare(b));
    });
    return out;
  }, [data]);

  const activeLetters = LETTERS.filter((l) => groups[l]?.length);

  return (
    <div className="store-container brand-directory">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/shop/fragrances">Shop</Link>
        <span className="breadcrumb__sep" aria-hidden="true">/</span>
        <span aria-current="page">Shop by Brand</span>
      </nav>

      <header className="shop-header">
        <h1 className="shop-header__title">Shop by Brand — تسوق حسب الماركة</h1>
      </header>

      <nav className="brand-directory__jump" aria-label="Jump to letter">
        {LETTERS.map((l) => {
          const on = activeLetters.includes(l);
          return on ? (
            <a key={l} href={`#brand-${l}`} className="brand-directory__jump-link">{l}</a>
          ) : (
            <span key={l} className="brand-directory__jump-link is-disabled" aria-hidden="true">{l}</span>
          );
        })}
      </nav>

      {isLoading ? (
        <p className="brand-directory__note">Loading brands…</p>
      ) : activeLetters.length === 0 ? (
        <div className="catalog-empty is-shown" role="status">
          <h2 className="catalog-empty__title">No brands yet</h2>
          <p className="catalog-empty__text">Brands appear here once products are tagged with a brand.</p>
        </div>
      ) : (
        <div className="brand-directory__sections">
          {activeLetters.map((letter) => (
            <section key={letter} id={`brand-${letter}`} className="brand-directory__section">
              <h2 className="brand-directory__letter">{letter}</h2>
              <ul className="brand-directory__list">
                {groups[letter].map((brand) => (
                  <li key={brand}>
                    <Link to={`/shop/brands/${encodeURIComponent(brand)}`} className="brand-directory__brand">
                      {brand}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
