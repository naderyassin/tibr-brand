import CollectionPage from "./CollectionPage";
import { COLLECTIONS } from "@/lib/shopNav";

const meta = COLLECTIONS["new-arrivals"];

export default function NewArrivals() {
  return (
    <CollectionPage
      title={meta.title}
      breadcrumb={meta.breadcrumb}
      sortDefault={meta.sortDefault}
    />
  );
}
