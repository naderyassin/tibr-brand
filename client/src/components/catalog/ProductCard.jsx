import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CONCENTRATIONS, FAMILIES, label } from "@/lib/taxonomy";
import { useAuth } from "@/stores/auth";
import { useWishlist } from "@/stores/wishlist";
import { useToast } from "@/components/ui/Toast";
import { useLang, useT } from "@/stores/lang";
import "./ProductCardNew.css";

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
      strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);



/* "Citrus", "Citrus and Vanilla", "Citrus, Vanilla, Amber" — mirrors the
   reference's note phrasing. */
function joinNotes(list, and) {
  if (list.length <= 1) return list[0] || "";
  if (list.length === 2) return `${list[0]} ${and} ${list[1]}`;
  return list.join(", ");
}

export default function ProductCard({ product, index = 0 }) {
  const navigate = useNavigate();
  const token = useAuth((s) => s.token);
  const isSaved = useWishlist((s) => s.ids.has(product.id));
  const toggleWishlist = useWishlist((s) => s.toggle);
  const toast = useToast();
  const t = useT();
  const lang = useLang((s) => s.lang);

  const name =
    lang === "ar"
      ? product.ar_name || product.en_name
      : product.en_name || product.ar_name;

  // "From" price = the cheapest variant, so a range of sizes reads honestly.
  const variants = product.product_variants || product.variants || [];
  const cheapest = variants.length
    ? variants.reduce((lo, v) => (v.price < lo.price ? v : lo), variants[0])
    : null;

  // Server-computed inStock is authoritative; fall back to summing variant
  // quantity for callers that pass a raw (non-normalized) product row.
  const outOfStock =
    product.inStock != null
      ? !product.inStock
      : variants.length
      ? !variants.some((v) => (v.quantity ?? v.stock ?? 0) > 0)
      : false;
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
    ? label(CONCENTRATIONS, product.concentration, lang)
    : null;
  const noteLabels = (product.families || []).map((f) => label(FAMILIES, f, lang));
  const notesJoined = joinNotes(noteLabels, lang === "ar" ? "و" : "and");
  const notesText = noteLabels.length
    ? (lang === "ar" ? `نوتات ${notesJoined}` : `${notesJoined} Notes`)
    : null;
  const descriptor = [concLabel, notesText].filter(Boolean).join(" — ");



  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) {
      toast(t("Sign in to save items to your wishlist", "سجّل الدخول لحفظ المنتجات في مفضلتك"));
      navigate("/login");
      return;
    }
    try {
      const nowSaved = await toggleWishlist(product, token);
      toast(nowSaved ? t("Added to wishlist", "أُضيف إلى المفضلة") : t("Removed from wishlist", "أُزيل من المفضلة"));
    } catch {
      toast(t("Couldn't update your wishlist. Try again.", "تعذّر تحديث المفضلة. حاول مرة أخرى."));
    }
  };

  return (
    <motion.article
      className={`product-new is-visible${product.is_bestseller ? " product-new--bestseller" : ""}${outOfStock ? " product-new--oos" : ""}`}
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
        aria-label={isSaved ? t("Remove from wishlist", "إزالة من المفضلة") : t("Add to wishlist", "إضافة إلى المفضلة")}
        onClick={handleToggleWishlist}
      >
        <HeartIcon />
      </button>

      <Link className="product-new__link" to={`/product?id=${product.id}`} aria-label={name}>
        <div className="product-new__media">
          {(onSale || product.is_bestseller) && (
            <div className="product-new__badges">
              {product.is_bestseller && (
                <span className="product-new__badge product-new__badge--bestseller">{t("Best Seller", "الأكثر مبيعًا")}</span>
              )}
              {onSale && (
                <span className="product-new__badge product-new__badge--sale">-{discountPct}%</span>
              )}
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



          <div className="product-new__price-row">
            <span className="product-new__price">
              {t("EGP", "ج.م")} {Number(fromPrice).toLocaleString()}
            </span>
            {onSale && (
              <span className="product-new__price-was">
                {t("EGP", "ج.م")} {compareAt.toLocaleString()}
              </span>
            )}
          </div>

          <div className={`product-new__action-pill${outOfStock ? " product-new__action-pill--oos" : ""}`}>
            <span className="product-new__action-text">{outOfStock ? t("Sold out", "نفدت الكمية") : t("Add to cart", "أضف إلى السلة")}</span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
