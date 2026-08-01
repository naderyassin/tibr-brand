import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getFacets } from "@/lib/api";
import { useT, useLang } from "@/stores/lang";

export default function BrandLogoStrip() {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const { data } = useQuery({ queryKey: ["facets"], queryFn: getFacets });

  // Top carried brands by product count, excluding the TIBR house brand
  // itself (that's covered by the separate TIBR House nav tab).
  const brands = (data?.data?.brand ?? []).filter((b) => b.slug !== "tibr").slice(0, 6);

  if (!brands.length) return null;

  return (
    <section className="brand-strip-container" aria-label={t("Brands we carry", "الماركات لدينا")}>
      <h2 className="brand-strip__header">{t("Famous brands", "ماركات عالمية")}</h2>
      <div className="brand-strip">
        {brands.map((b) => (
          <Link
            key={b.slug}
            to={`/shop/brands/${b.slug}`}
            className="brand-strip__card"
          >
            {b.logo_url ? (
              <img src={b.logo_url} alt={b.name_en} className="brand-strip__logo" />
            ) : (
              <span className="brand-strip__wordmark">{(lang === "ar" ? b.name_ar : b.name_en) || b.name_en}</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
