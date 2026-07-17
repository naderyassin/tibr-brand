import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CONCENTRATIONS, FAMILIES, label } from "@/lib/taxonomy";
import { useAuth } from "@/stores/auth";
import { useWishlist } from "@/stores/wishlist";
import { useToast } from "@/components/ui/Toast";
import "./ProductCardNew.css";

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
      strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

/* Dior-style "Intensity" meter — concentration is the honest driver of how
   loud a fragrance reads, so it maps straight to the 5 dots. */
const INTENSITY_BY_CONCENTRATION = {
  parfum: 5,
  attar: 5,
  edp: 4,
  edt: 3,
  edc: 2,
  mist: 2,
};
const INTENSITY_DOTS = 5;

/* "Citrus", "Citrus and Vanilla", "Citrus, Vanilla, Amber" — mirrors the
   reference's note phrasing. */
function joinNotes(list) {
  if (list.length <= 1) return list[0] || "";
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return list.join(", ");
}

export default function ProductCard({ product, index = 0 }) {
  const navigate = useNavigate();
  const token = useAuth((s) => s.token);
  const isSaved = useWishlist((s) => s.ids.has(product.id));
  const toggleWishlist = useWishlist((s) => s.toggle);
  const toast = useToast();

  const name = product.en_name || product.ar_name;

  // "From" price = the cheapest variant, so a range of sizes reads honestly.
  const variants = product.product_variants || product.variants || [];
  const cheapest = variants.length
    ? variants.reduce((lo, v) => (v.price < lo.price ? v : lo), variants[0])
    : null;
  const fromPrice =
    cheapest?.price ?? product.price ?? product.ar_price ?? 0;
  const fromSize = cheapest?.size_label ?? product.sizes?.[0] ?? "";

  // Offer pricing: the "was" price is the struck-through compare-at on the same
  // (cheapest) variant we quote the "From" price from, so the discount reads
  // honestly. A product is "on offer" when that compare-at beats the price.
  const compareAt =
    cheapest?.compare_at_price != null ? Number(cheapest.compare_at_price) : null;
  const onSale = compareAt != null && compareAt > Number(fromPrice);
  const discountPct = onSale ? Math.round((1 - Number(fromPrice) / compareAt) * 100) : 0;

  // Descriptor line: "Eau de Parfum — Floral and Fruity Notes"
  const concLabel = product.concentration
    ? label(CONCENTRATIONS, product.concentration)
    : null;
  const noteLabels = (product.families || []).map((f) => label(FAMILIES, f));
  const notesText = noteLabels.length ? `${joinNotes(noteLabels)} Notes` : null;
  const descriptor = [concLabel, notesText].filter(Boolean).join(" — ");

  const intensity = INTENSITY_BY_CONCENTRATION[product.concentration] ?? 3;

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) {
      toast("Sign in to save items to your wishlist");
      navigate("/login");
      return;
    }
    try {
      const nowSaved = await toggleWishlist(product, token);
      toast(nowSaved ? "Added to wishlist" : "Removed from wishlist");
    } catch {
      toast("Couldn't update your wishlist. Try again.");
    }
  };

  return (
    <motion.article
      className={`product-new is-visible${product.is_bestseller ? " product-new--bestseller" : ""}`}
      data-product
      data-id={product.id}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        type="button"
        className="product-new__wish"
        aria-pressed={isSaved}
        aria-label={isSaved ? "Remove from wishlist" : "Add to wishlist"}
        onClick={handleToggleWishlist}
      >
        <HeartIcon />
      </button>

      <Link className="product-new__link" to={`/product?id=${product.id}`} aria-label={name}>
        <div className="product-new__media">
          {onSale && (
            <div className="product-new__badges">
              <span className="product-new__badge product-new__badge--sale">-{discountPct}%</span>
            </div>
          )}
          {product.image ? (
            <img
              className="product-new__img"
              src={product.image}
              loading="lazy"
              decoding="async"
              alt={name}
            />
          ) : (
            <div className="product-new__img product-new__img--placeholder" />
          )}
        </div>

        <div className="product-new__body">
          {concLabel && <span className="product-new__eyebrow">{concLabel}</span>}
          <h3 className="product-new__name">{name}</h3>
          {notesText && <p className="product-new__desc">{notesText}</p>}

          <div className="product-new__intensity">
            <span className="product-new__intensity-label">Intensity</span>
            <span className="product-new__dots" aria-hidden="true">
              {Array.from({ length: INTENSITY_DOTS }).map((_, i) => (
                <span
                  key={i}
                  className={`product-new__dot${i < intensity ? " is-on" : ""}`}
                />
              ))}
            </span>
          </div>

          <div className="product-new__price-row">
            <span className="product-new__price">
              EGP {Number(fromPrice).toLocaleString()}
            </span>
            {onSale && (
              <span className="product-new__price-was">
                EGP {compareAt.toLocaleString()}
              </span>
            )}
          </div>

          <div className="product-new__action-pill">
            <span className="product-new__action-text">Add to cart</span>
            <span className="product-new__arrow-wrap">
              <svg className="product-new__arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
