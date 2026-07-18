import ShopHero from "./ShopHero";
import CategoryTiles from "./home/CategoryTiles";
import MerchandisingRails from "./home/MerchandisingRails";
import PromoTiles from "./home/PromoTiles";
import TrustBadges from "./home/TrustBadges";
import BrandLogoStrip from "./home/BrandLogoStrip";
import ReviewsBanner from "./home/ReviewsBanner";
import AboutBlurb from "./home/AboutBlurb";
import PersonalityBanner from "./home/PersonalityBanner";

export default function ShopHome() {
  return (
    <>
      <ShopHero />
      <div className="store-container">
        <CategoryTiles />
        <MerchandisingRails filterKey="spotlight" />
      </div>

      <div className="store-container shop-home">
        <MerchandisingRails filterKey="others" />
        <PromoTiles />
        
        <PersonalityBanner />
        <BrandLogoStrip />
        <ReviewsBanner />
        <AboutBlurb />
      </div>
    </>
  );
}
