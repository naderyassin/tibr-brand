import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/api";
import ProductCard from "@/components/catalog/ProductCard";
import CardFanCarousel from "../../components/ui/CardFanCarousel";
import "./Perfumes.css";

const FEATURED = [
  { id: 'feat-1', en_name: 'TOM FORD', image: 'https://hlmbehyjshdtklhjqiii.supabase.co/storage/v1/object/public/brand-assets/images/fragrance_midnight_oud.png' },
  { id: 'feat-2', en_name: 'DIOR', image: 'https://hlmbehyjshdtklhjqiii.supabase.co/storage/v1/object/public/brand-assets/images/fragrance_royal_amber.png' },
  { id: 'feat-3', en_name: 'CHANEL', image: 'https://hlmbehyjshdtklhjqiii.supabase.co/storage/v1/object/public/brand-assets/images/fragrance_velvet_rose.png' },
  { id: 'feat-4', en_name: 'YVES SAINT LAURENT', image: 'https://hlmbehyjshdtklhjqiii.supabase.co/storage/v1/object/public/brand-assets/images/fragrance_midnight_oud.png' },
  { id: 'feat-5', en_name: 'CREED', image: 'https://hlmbehyjshdtklhjqiii.supabase.co/storage/v1/object/public/brand-assets/images/fragrance_royal_amber.png' },
  { id: 'feat-6', en_name: 'GIORGIO ARMANI', image: 'https://hlmbehyjshdtklhjqiii.supabase.co/storage/v1/object/public/brand-assets/images/fragrance_velvet_rose.png' },
  { id: 'feat-7', en_name: 'GUCCI', image: 'https://hlmbehyjshdtklhjqiii.supabase.co/storage/v1/object/public/brand-assets/images/fragrance_midnight_oud.png' },
  { id: 'feat-8', en_name: 'VERSACE', image: 'https://hlmbehyjshdtklhjqiii.supabase.co/storage/v1/object/public/brand-assets/images/fragrance_royal_amber.png' },
  { id: 'feat-9', en_name: 'LE LABO', image: 'https://hlmbehyjshdtklhjqiii.supabase.co/storage/v1/object/public/brand-assets/images/fragrance_velvet_rose.png' },
  { id: 'feat-10', en_name: 'BYREDO', image: 'https://hlmbehyjshdtklhjqiii.supabase.co/storage/v1/object/public/brand-assets/images/fragrance_midnight_oud.png' },
  { id: 'feat-11', en_name: 'GIVENCHY', image: 'https://hlmbehyjshdtklhjqiii.supabase.co/storage/v1/object/public/brand-assets/images/fragrance_royal_amber.png' },
  { id: 'feat-12', en_name: 'BVLGARI', image: 'https://hlmbehyjshdtklhjqiii.supabase.co/storage/v1/object/public/brand-assets/images/fragrance_velvet_rose.png' },
];

const CAROUSEL_CARDS = FEATURED.map((item) => ({
  imgUrl: item.image,
  alt: item.en_name,
  linkUrl: `/product?id=${item.id}`,
}));

export default function Perfumes() {
  const { data } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const products = useMemo(
    () => (data?.data ?? []).filter((p) => p.category === "perfumes"),
    [data]
  );

  return (
    <div className="perfume-page">
      {/* HERO SECTION */}
      <section className="perfume-hero-split">
        <div className="perfume-hero-split__left">
          <div className="perfume-hero-split__content">
            <h1 className="perfume-hero-split__title">
              LUXURY<br />PERFUME
            </h1>
            <p className="perfume-hero-split__desc">
              Discover the essence of sophistication with our exclusive collection of luxurious fragrances.
            </p>
            <div className="perfume-hero-split__btn-wrapper">
              <a href="#collection" className="cta-ghost"><span>SHOP NOW</span></a>
            </div>
          </div>
        </div>
        <div className="perfume-hero-split__right">
          <img
            src="https://hlmbehyjshdtklhjqiii.supabase.co/storage/v1/object/public/brand-assets/images/perfume_hero_product_tibr.png?v=2"
            alt="TIBR Luxury Perfume"
            className="perfume-hero-split__img"
          />
        </div>
      </section>

      {/* ELEGANT SECTION TRANSITION */}
      <div className="section-divider" aria-hidden="true">
        <span className="section-divider__line" />
        <span className="section-divider__gem" />
        <span className="section-divider__line section-divider__line--right" />
      </div>

      {/* COLLECTION SECTION */}
      <section id="collection" className="perfume-collection">
        <h2 className="perfume-collection__title">Our Collection</h2>
        <CardFanCarousel cards={CAROUSEL_CARDS} />
      </section>

      {/* FULL CATALOG GRID */}
      {products.length > 0 && (
        <div className="store-container" style={{ paddingBottom: '4rem' }}>
          <header className="catalog-head" style={{ marginTop: '2rem' }}>
            <h2 className="catalog-head__title" style={{ fontSize: '1.5rem', color: '#fff' }}>
              All Perfumes
            </h2>
            <hr className="catalog-head__rule" style={{ borderColor: 'rgba(214, 176, 116, 0.3)' }} />
          </header>
          <section className="catalog-grid" aria-label="All Perfumes">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
