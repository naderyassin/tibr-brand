import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getProducts } from "@/lib/api";
import ProductCard from "@/components/catalog/ProductCard";

/* A product is "on offer" when any of its sizes carries a compare-at price
   higher than what it actually sells for — the same struck-through discount the
   admin enters in the variants editor. No separate flag or column. */
const isOffer = (p) =>
  (p.variants || p.product_variants || []).some(
    (v) => v.compare_at_price != null && Number(v.compare_at_price) > Number(v.price)
  );

const MAX_PER_RAIL = 12;

/**
 * Admin-curated merchandising carousels on the shop home. Each rail is driven
 * by what you mark in the admin panel:
 *   • Spotlight    → the "Spotlight" checkbox (Merchandising, §6)
 *   • Best Sellers → the "Best Seller" checkbox
 *   • Offers       → any size with a compare-at (was) price
 * A rail only renders when it has products, and the whole block disappears when
 * nothing is marked — so it stays invisible until you start curating.
 */
export default function MerchandisingRails({ filterKey }) {
  const { data } = useQuery({
    queryKey: ["products", { merchandising: true }],
    queryFn: () => getProducts(),
  });

  const products = data?.data ?? [];

  const rails = [
    {
      key: "spotlight",
      title: "Spotlight",
      to: "/shop/spotlight",
      items: products.filter((p) => p.is_spotlight),
    },
    {
      key: "bestsellers",
      title: "Best Sellers",
      to: "/shop/bestsellers",
      items: products.filter((p) => p.is_bestseller),
    },
    {
      key: "offers",
      title: "Offers",
      to: "/shop/offers",
      items: products.filter(isOffer),
    },
  ].filter((rail) => {
    if (rail.items.length === 0) return false;
    if (filterKey === "spotlight") return rail.key === "spotlight";
    if (filterKey === "others") return rail.key !== "spotlight";
    return true;
  });

  if (rails.length === 0) return null;

  return (
    <>
      {rails.map((rail) => (
        <motion.section
          key={rail.key}
          className="product-rail"
          aria-label={rail.title}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="product-rail__head">
            <h2 className="product-rail__title">{rail.title}</h2>
            <Link className="product-rail__view-all" to={rail.to}>View All</Link>
          </div>
          {/* Prevent horizontal gestures only, so the rail's own left-right
              scroll-snap still works. Excluding vertical gestures too (the
              old data-lenis-prevent / data-lenis-prevent-touch) let native
              scroll move the page here without Lenis knowing, desyncing its
              internal scroll position from the real one — the next Lenis
              scroll anywhere else on the page then "corrects" to that stale
              position, jumping the viewport somewhere unrelated (e.g. straight
              to the footer). */}
          <div className="product-rail__track" data-lenis-prevent-horizontal>
            {rail.items.slice(0, MAX_PER_RAIL).map((p, i) => (
              <div className="product-rail__item" key={p.id}>
                <ProductCard product={p} index={i} />
              </div>
            ))}
          </div>
        </motion.section>
      ))}
    </>
  );
}
