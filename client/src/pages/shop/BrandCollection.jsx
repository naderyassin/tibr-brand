import { useParams } from "react-router-dom";
import CollectionPage from "./CollectionPage";
import { useT } from "@/stores/lang";

export default function BrandCollection() {
  const t = useT();
  const { brand } = useParams();
  const decoded = decodeURIComponent(brand || "");
  return (
    <CollectionPage
      title={decoded}
      breadcrumb={`${t("Shop by Brand", "تسوق حسب الماركة")} / ${decoded}`}
      sortDefault="newest"
      predicate={(p) => String(p.brand || "").toLowerCase() === decoded.toLowerCase()}
    />
  );
}
