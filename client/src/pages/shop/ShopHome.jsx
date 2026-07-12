import ShopHero from "./ShopHero";
import CategoryTiles from "./home/CategoryTiles";
import PromoTiles from "./home/PromoTiles";
import TrustBadges from "./home/TrustBadges";
import BrandLogoStrip from "./home/BrandLogoStrip";
import ReviewsBanner from "./home/ReviewsBanner";
import AboutBlurb from "./home/AboutBlurb";

export default function ShopHome() {
  return (
    <>
      <ShopHero />
      <div className="store-container shop-home">
        <CategoryTiles />
        <PromoTiles />
        <TrustBadges />

        <BrandLogoStrip />
        <ReviewsBanner />
        <AboutBlurb />
      </div>
    </>
  );
}
