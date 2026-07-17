import CardFanCarousel from "../../components/ui/CardFanCarousel";
import "./Perfumes.css";

const FEATURED = [
  { id: "feat-1",  en_name: "TOM FORD",       image: "/brands/tomford_noir.png" },
  { id: "feat-2",  en_name: "DIOR",           image: "/brands/dior_homme_intense.png" },
  { id: "feat-3",  en_name: "CHANEL",         image: "/brands/bleu_de_chanel.png" },
  { id: "feat-4",  en_name: "GUCCI",          image: "/brands/gucci_guilty_black.png" },
  { id: "feat-5",  en_name: "GIORGIO ARMANI", image: "/brands/si_passione.png" },
  { id: "feat-6",  en_name: "VERSACE",        image: "/brands/tomford_noir.png" },
  { id: "feat-7",  en_name: "CREED",          image: "/brands/dior_homme_intense.png" },
];

const CAROUSEL_CARDS = FEATURED.map((item) => ({
  imgUrl: item.image,
  alt: item.en_name,
  linkUrl: `/product?id=${item.id}`,
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
        <h2 className="perfume-collection__title">Our Collection</h2>
        <CardFanCarousel cards={CAROUSEL_CARDS} />
      </section>
    </>
  );
}
