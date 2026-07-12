import ProductRail from "@/components/catalog/ProductRail";
import { FRAGRANCE_SUBS } from "@/lib/shopNav";
import ShopHero from "./ShopHero";
import CategoryTiles from "./home/CategoryTiles";
import PromoTiles from "./home/PromoTiles";
import TrustBadges from "./home/TrustBadges";
import BrandLogoStrip from "./home/BrandLogoStrip";
import ReviewsBanner from "./home/ReviewsBanner";
import AboutBlurb from "./home/AboutBlurb";

const SPOTLIGHT_PILLS = [
  { key: "all", label: "All" },
  { key: "fall", label: "Fall" },
  { key: "spring", label: "Spring" },
];

const spotlightPredicate = (pill) => (p) =>
  p.is_spotlight && (pill === "all" || p.season === pill);

const PERFUME_CATEGORY_PILLS = [
  { key: "niche", label: "Niche" },
  { key: "design", label: "Design" },
  { key: "gulf", label: "Gulf Fragrances" },
  { key: "egyptian", label: "Egyptian Brands" },
];

const perfumeCategoryPredicate = (pill) => (p) => {
  if (pill === "gulf") return p.fragrance_category === "gulf";
  if (pill === "egyptian") return !!p.is_egyptian_brand;
  return p.perfume_classification === pill;
};

export default function ShopHome() {
  return (
    <>
      <ShopHero />
      <div className="store-container shop-home">
        <CategoryTiles />
        <PromoTiles />
        <TrustBadges />

        <ProductRail
          title="Bundle"
          viewAllHref="/shop/bundle"
          predicateForPill={() => (p) => p.listing_type === "bundle"}
        />

        <ProductRail
          title="Spotlight"
          pills={SPOTLIGHT_PILLS}
          predicateForPill={spotlightPredicate}
        />

        <ProductRail
          title="Perfume Categories"
          pills={PERFUME_CATEGORY_PILLS}
          predicateForPill={perfumeCategoryPredicate}
        />

        <BrandLogoStrip />
        <ReviewsBanner />
        <AboutBlurb />
      </div>
    </>
  );
}
