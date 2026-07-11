import { useParams } from "react-router-dom";
import CollectionPage from "./CollectionPage";
import { COLLECTIONS, getSubLabel } from "@/lib/shopNav";

const meta = COLLECTIONS.bundle;

export default function Bundle() {
  const { sub } = useParams();
  const subLabel = sub ? getSubLabel(meta.subs, sub) : null;
  return (
    <CollectionPage
      title={subLabel || meta.title}
      breadcrumb={subLabel ? `Bundle / ${subLabel.split(" —")[0]}` : meta.breadcrumb}
      sortDefault={meta.sortDefault}
      sub={sub || null}
      subField={meta.subField}
      predicate={(p) => p.listing_type === "bundle"}
    />
  );
}
