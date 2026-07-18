import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getProduct, getProductReviews, getProducts } from "@/lib/api";
import ProductCard from "@/components/catalog/ProductCard";
import { useDraggableScroll } from "@/hooks/useDraggableScroll";
import { useCart } from "@/stores/cart";
import { useAuth } from "@/stores/auth";
import { useWishlist } from "@/stores/wishlist";
import { useToast } from "@/components/ui/Toast";

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
      strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);
const TruckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
    <rect x="9" y="11" width="14" height="10" rx="2" />
    <circle cx="12" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
  </svg>
);

export default function Product() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const navigate = useNavigate();
  const addItem = useCart((s) => s.addItem);
  const token = useAuth((s) => s.token);
  const savedIds = useWishlist((s) => s.ids);
  const toggleWishlist = useWishlist((s) => s.toggle);
  const toast = useToast();
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const { ref: railRef, onMouseDown: onRailMouseDown, showLeftArrow: showRailLeft, showRightArrow: showRailRight, scroll: scrollRail } = useDraggableScroll();

  useEffect(() => {
    setQty(1);
  }, [id, selectedVariantId]);

  const { data: productData, isLoading, isError } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id),
    enabled: !!id,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ["reviews", id],
    queryFn: () => getProductReviews(id),
    enabled: !!id,
  });

  const { data: recommendedData } = useQuery({
    queryKey: ["products-recommended", id],
    queryFn: () => getProducts({}),
    enabled: !!productData?.data,
  });

  if (!id) {
    navigate("/shop/perfumes", { replace: true });
    return null;
  }

  if (isLoading) {
    return (
      <div className="store-container">
        <div className="pdp" style={{ paddingTop: "2rem" }}>
          <div className="pdp__media skeleton" />
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="skeleton skeleton-line skeleton-line--sm" style={{ width: "40%" }} />
            <div className="skeleton skeleton-line skeleton-line--lg" style={{ width: "70%" }} />
            <div className="skeleton skeleton-line skeleton-line--price" style={{ width: "30%" }} />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !productData?.data) {
    return (
      <div className="store-container">
        <div className="rb-empty" style={{ paddingTop: "4rem" }}>
          <h2 className="rb-empty__title">Product not found</h2>
          <Link className="btn btn--secondary" to="/shop/perfumes">Back to shop</Link>
        </div>
      </div>
    );
  }

  const p = productData.data;
  const name = p.en_name || p.ar_name;
  const desc = p.en_desc || p.ar_desc;

  // Sizes are VARIANTS: each has its own price and stock, so choosing a size
  // changes the price on the page and can be sold out on its own.
  const variants = p.variants ?? [];
  const activeVariant =
    variants.find((v) => v.id === selectedVariantId)
    || variants.find((v) => v.is_default)
    || variants[0]
    || null;

  const price = activeVariant ? Number(activeVariant.price) : (p.price ?? 0);
  const compareAt = activeVariant?.compare_at_price ?? null;
  const soldOut = activeVariant ? activeVariant.quantity < 1 : false;

  const catLabel = p.brands?.name_en || "TIBR";
  const catPath = p.brands?.slug ? `/shop/perfumes?brand=${p.brands.slug}` : "/shop/perfumes";

  const images = p.images?.length ? p.images : (p.image ? [p.image] : []);

  const relatedProducts = (() => {
    const all = recommendedData?.data || [];
    const candidates = all.filter((item) => item.id !== p.id);
    return [...candidates]
      .sort((a, b) => {
        const aSameBrand = a.brands?.slug === p.brands?.slug ? 1 : 0;
        const bSameBrand = b.brands?.slug === p.brands?.slug ? 1 : 0;
        return bSameBrand - aSameBrand;
      })
      .slice(0, 4);
  })();

  const handleAddToCart = () => {
    addItem(p, activeVariant, qty);
    toast(`<strong>${name}</strong>${activeVariant ? ` (${activeVariant.size_label})` : ""} x${qty} added to cart`);
  };

  const isWishlisted = savedIds.has(p.id);
  const handleToggleWishlist = async () => {
    if (!token) {
      toast("Sign in to save items to your wishlist");
      navigate("/login");
      return;
    }
    try {
      const nowSaved = await toggleWishlist(p, token);
      toast(nowSaved ? "Added to wishlist" : "Removed from wishlist");
    } catch {
      toast("Couldn't update your wishlist. Try again.");
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <div className="store-container">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span className="breadcrumb__sep" aria-hidden="true">/</span>
        <Link to={catPath}>{catLabel}</Link>
        <span className="breadcrumb__sep" aria-hidden="true">/</span>
        <span aria-current="page">{name}</span>
      </nav>

      <motion.article
        className="pdp"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <div className="pdp__gallery">
          {images.length > 0 ? (
            images.map((img, idx) => (
              <motion.div key={idx} variants={itemVariants} className="pdp__gallery-item">
                <img src={img} alt={`${name} - View ${idx + 1}`} loading={idx > 0 ? "lazy" : "eager"} />
              </motion.div>
            ))
          ) : (
            <motion.div variants={itemVariants} className="pdp__gallery-item skeleton" />
          )}
          <button
            className="pdp__wish"
            type="button"
            aria-pressed={isWishlisted}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            onClick={handleToggleWishlist}
          >
            <HeartIcon />
          </button>
        </div>

        <div className="pdp__buy">
          <motion.div variants={itemVariants}>
            <p className="pdp__collection">{catLabel}</p>
            <h1 className="pdp__title">{name}</h1>
            {compareAt && Number(compareAt) > price && (
              <p className="pdp__price-was">EGP {Number(compareAt).toLocaleString()}</p>
            )}
            <p className="pdp__price">
              EGP {Number(price).toLocaleString()}
            </p>
          </motion.div>

          {variants.length > 0 && (
            <motion.div variants={itemVariants}>
              <p className="pdp__field-label">Size</p>
              <div className="size-options">
                {variants.map((v) => (
                  <label
                    key={v.id}
                    className={`size-chip${v.quantity < 1 ? " is-sold-out" : ""}${activeVariant?.id === v.id ? " is-selected" : ""}`}
                    title={v.quantity < 1 ? "Sold out" : `${v.price} EGP`}
                  >
                    <input
                      type="radio"
                      name="size"
                      value={v.id}
                      checked={activeVariant?.id === v.id}
                      disabled={v.quantity < 1}
                      onChange={() => setSelectedVariantId(v.id)}
                    />
                    {v.size_label}
                  </label>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div variants={itemVariants} className="pdp__actions">
            <div className="pdp__qty-wrapper">
              <span className="pdp__field-label pdp__qty-label">Quantity</span>
              <div className="pdp__qty-selector">
                <button
                  type="button"
                  className="pdp__qty-btn"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1 || soldOut}
                >
                  —
                </button>
                <span className="pdp__qty-value">{qty}</span>
                <button
                  type="button"
                  className="pdp__qty-btn"
                  onClick={() => setQty((q) => q + 1)}
                  disabled={soldOut}
                >
                  +
                </button>
              </div>
            </div>

            <button
              className="btn btn--primary btn--lg pdp__add-cart"
              type="button"
              onClick={handleAddToCart}
              disabled={!activeVariant || soldOut}
            >
              {soldOut ? "SOLD OUT" : "ADD TO CART"}
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" style={{flexShrink:0}}>
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </motion.div>

          <motion.div variants={itemVariants} className="pdp__trust">
            <span className="pdp__trust-item"><TruckIcon /> Cash on delivery across Egypt</span>
            <span className="pdp__trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> 
              100% Authentic Guarantee
            </span>
          </motion.div>

          <motion.div variants={itemVariants} className="pdp__accordions">
            {desc && (
              <details className="pdp-accordion" open>
                <summary className="pdp-accordion__title">Description <span className="pdp-accordion__icon">+</span></summary>
                <div className="pdp-accordion__content">
                  <div className="pdp__desc pdp__desc--rich" dangerouslySetInnerHTML={{ __html: desc }} />
                </div>
              </details>
            )}

            {(p.top_notes || p.mid_notes || p.base_notes) && (
              <details className="pdp-accordion">
                <summary className="pdp-accordion__title">Fragrance Notes <span className="pdp-accordion__icon">+</span></summary>
                <div className="pdp-accordion__content">
                  <div className="pdp__notes">
                    {p.top_notes && <div><p className="note__label">Top Notes</p><p className="note__val">{p.top_notes}</p></div>}
                    {p.mid_notes && <div><p className="note__label">Heart Notes</p><p className="note__val">{p.mid_notes}</p></div>}
                    {p.base_notes && <div><p className="note__label">Base Notes</p><p className="note__val">{p.base_notes}</p></div>}
                  </div>
                </div>
              </details>
            )}

            {reviewsData?.data?.length > 0 && (
              <details className="pdp-accordion">
                <summary className="pdp-accordion__title">Reviews ({reviewsData.data.length}) <span className="pdp-accordion__icon">+</span></summary>
                <div className="pdp-accordion__content">
                  {reviewsData.data.slice(0, 3).map((r) => (
                    <div key={r.id} className="pdp__review">
                      <p className="pdp__review-stars">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
                      {r.body && <p className="pdp__review-body">{r.body}</p>}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </motion.div>
        </div>
      </motion.article>

      {relatedProducts.length > 0 && (
        <section className="product-rail pdp__recommended">
          <h2 className="product-rail__title pdp__recommended-title">You May Also Like</h2>
          <div className="slider-wrapper">
            {showRailLeft && (
              <button
                className="slider-arrow slider-arrow--left"
                onClick={() => scrollRail("left")}
                aria-label="Previous products"
                type="button"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}
            <div
              ref={railRef}
              onMouseDown={onRailMouseDown}
              className="product-rail__track"
              data-lenis-prevent-horizontal
            >
              {relatedProducts.map((prod, idx) => (
                <div className="product-rail__item" key={prod.id} draggable="false">
                  <ProductCard product={prod} index={idx} />
                </div>
              ))}
            </div>
            {showRailRight && (
              <button
                className="slider-arrow slider-arrow--right"
                onClick={() => scrollRail("right")}
                aria-label="Next products"
                type="button"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
