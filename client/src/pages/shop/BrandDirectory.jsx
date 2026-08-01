import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getFacets } from "@/lib/api";
import { useT, useLang } from "@/stores/lang";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

// Bucket a brand under its first letter (non A-Z → "#").
function bucketOf(name) {
  const c = name.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
}

export default function BrandDirectory() {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const { data, isLoading } = useQuery({ queryKey: ["facets"], queryFn: getFacets });
  const brands = data?.data?.brand ?? [];

  const groups = useMemo(() => {
    const map = {};
    brands.forEach((b) => {
      const name = (lang === "ar" ? b.name_ar : b.name_en) || b.name_en;
      if (!name) return;
      const letter = bucketOf(name);
      (map[letter] ||= []).push({ ...b, displayName: name });
    });
    Object.values(map).forEach((list) => list.sort((a, b) => a.displayName.localeCompare(b.displayName)));
    return map;
  }, [brands, lang]);

  const activeLetters = LETTERS.filter((l) => groups[l]?.length);

  return (
    <div className="store-container brand-directory">
      <nav className="breadcrumb" aria-label={t("Breadcrumb", "مسار التنقل")}>
        <Link to="/shop/fragrances">{t("Shop", "المتجر")}</Link>
        <span className="breadcrumb__sep" aria-hidden="true">/</span>
        <span aria-current="page">{t("Shop by Brand", "تسوق حسب الماركة")}</span>
      </nav>

      <header className="shop-header">
        <h1 className="shop-header__title">{t("Shop by Brand", "تسوق حسب الماركة")}</h1>
      </header>

      <nav className="brand-directory__jump" aria-label={t("Jump to letter", "الانتقال إلى حرف")}>
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
        <p className="brand-directory__note">{t("Loading brands…", "جارٍ تحميل الماركات…")}</p>
      ) : activeLetters.length === 0 ? (
        <div className="catalog-empty is-shown" role="status">
          <h2 className="catalog-empty__title">{t("No brands yet", "لا توجد ماركات بعد")}</h2>
          <p className="catalog-empty__text">{t("Brands appear here once products are tagged with a brand.", "ستظهر الماركات هنا بمجرد ربط المنتجات بماركة.")}</p>
        </div>
      ) : (
        <div className="brand-directory__sections">
          {activeLetters.map((letter) => (
            <section key={letter} id={`brand-${letter}`} className="brand-directory__section">
              <h2 className="brand-directory__letter">{letter}</h2>
              <ul className="brand-directory__list">
                {groups[letter].map((b) => (
                  <li key={b.slug}>
                    <Link to={`/shop/brands/${b.slug}`} className="brand-directory__brand">
                      {b.displayName}
                      <span className="brand-directory__count"> ({b.count})</span>
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
