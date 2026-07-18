import CardFanCarousel from "../../components/ui/CardFanCarousel";
import TrustBadges from "./home/TrustBadges";
import "./Perfumes.css";

// Each entry is a real brand in the catalog (slug matches brands.slug) — the
// card image is that brand's own product photo, and the card links to every
// product carried under that brand, per docs/DATA-MODEL.md §5's brand facet.
const FEATURED = [
  { slug: "tom-ford",       en_name: "TOM FORD",        image: "/brands/tomford_noir.jpg" },
  { slug: "dior",           en_name: "DIOR",            image: "/brands/dior_homme_intense.jpg" },
  { slug: "chanel",         en_name: "CHANEL",          image: "/brands/bleu_de_chanel.jpg" },
  { slug: "gucci",          en_name: "GUCCI",           image: "/brands/gucci_guilty_black.jpg" },
  { slug: "yves-saint-laurent", en_name: "YVES SAINT LAURENT", image: "/brands/yves_saint_laurent.jpg" },
  { slug: "emporio-armani", en_name: "EMPORIO ARMANI",  image: "/brands/emporio_armani_stronger_with_you.jpg" },
  { slug: "creed",          en_name: "CREED",           image: "/brands/creed_aventus.jpg" },
];

const CAROUSEL_CARDS = FEATURED.map((item) => ({
  imgUrl: item.image,
  alt: item.en_name,
  linkUrl: `/shop/all?brand=${item.slug}`,
}));

export default function ShopHero() {
  return (
    <>
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
            src="/perfume_hero_product_tibr_white.png"
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

      {/* COLLECTION CAROUSEL */}
      <section id="collection" className="perfume-collection">
        <h2 className="perfume-collection__title">Original Brands</h2>
        <CardFanCarousel cards={CAROUSEL_CARDS} />
        <TrustBadges />
      </section>
    </>
  );
}
