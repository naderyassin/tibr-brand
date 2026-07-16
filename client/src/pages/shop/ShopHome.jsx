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
        <MerchandisingRails filterKey="spotlight" />
        <CategoryTiles />
      </div>

      {/* Full-bleed: the banner's background and image run edge-to-edge, while
          its text stays aligned to the --container column (see Perfumes.css). */}
      <PersonalityBanner />

      <div className="store-container shop-home">
        <MerchandisingRails filterKey="others" />
        <PromoTiles />
        
        <BrandLogoStrip />
        <ReviewsBanner />
        <TrustBadges />
        <AboutBlurb />
      </div>
    </>
  );
}
