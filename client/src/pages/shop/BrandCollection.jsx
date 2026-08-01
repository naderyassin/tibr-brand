import { Navigate, useParams } from "react-router-dom";

// /shop/brands/:brand is a pretty URL for the brand facet that CollectionPage
// (the ONLY collection page, docs/DATA-MODEL.md §5) already filters by.
export default function BrandCollection() {
  const { brand } = useParams();
  return <Navigate to={`/shop/all?brand=${encodeURIComponent(brand)}`} replace />;
}
