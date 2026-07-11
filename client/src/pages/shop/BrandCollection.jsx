import { useParams } from "react-router-dom";
import CollectionPage from "./CollectionPage";

export default function BrandCollection() {
  const { brand } = useParams();
  const decoded = decodeURIComponent(brand || "");
  return (
    <CollectionPage
      title={decoded}
      breadcrumb={`Shop by Brand / ${decoded}`}
      sortDefault="newest"
      predicate={(p) => String(p.brand || "").toLowerCase() === decoded.toLowerCase()}
    />
  );
}
