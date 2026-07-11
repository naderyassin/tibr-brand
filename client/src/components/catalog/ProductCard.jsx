import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "@/stores/cart";
import { useToast } from "@/components/ui/Toast";
import "./ProductCardNew.css";

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

const TruckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M3 10h18M8 10V4M16 10V4" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="17" cy="18" r="2" />
    <path d="M17 16H7" />
    <path d="M5 18H2v-4h1" />
    <path d="M19 18h3v-4h-1" />
  </svg>
);

export default function ProductCard({ product, index = 0, showInspiredTag = false }) {
  const addItem = useCart((s) => s.addItem);
  const toast = useToast();

  const name = product.en_name || product.ar_name;
  const price = product.price ?? product.ar_price ?? product.en_price ?? 0;
  
  // Calculate discount if old price exists (mock logic for demo if no old price)
  const discount = product.old_price ? Math.round(((product.old_price - price) / product.old_price) * 100) : 20;

  const handleAddToCart = (e) => {
    e.preventDefault();
    addItem(product);
    toast(`<strong>${name}</strong> added to cart`);
  };

  return (
    <motion.article
      className="product-new is-visible"
      data-product
      data-id={product.id}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="product-new__media">
        <Link className="product-new__link" to={`/product?id=${product.id}`} aria-label={name}>
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
        </Link>
        <span className="product-new__classification-tag">
          {product.classification ? (product.classification.charAt(0).toUpperCase() + product.classification.slice(1)) : 'Niche'}
        </span>
      </div>

      <div className="product-new__body">
        <Link className="product-new__name" to={`/product?id=${product.id}`}>{name}</Link>
        <p className="product-new__size">{product.size || "100ml"}</p>
        <p className="product-new__brand">{product.brand || "Luxury Brand"}</p>
        <p className="product-new__scent">Scent: {product.fragrance_category || "Oriental"}</p>
        
        <div className="product-new__price-row">
          <span className="product-new__price">EGP {price}</span>
          {product.old_price && (
            <>
              <span className="product-new__old-price">EGP {product.old_price}</span>
              <span className="product-new__discount-badge">%{discount}</span>
            </>
          )}
        </div>

        <div className="product-new__shipping">
          <TruckIcon />
          <span>You've unlocked Free Shipping!</span>
        </div>
      </div>

      <div className="product-new__footer">
        {product.in_stock === false ? (
          <button className="product-new__btn product-new__btn--disabled" disabled>
            Sold out
          </button>
        ) : (
          <button className="product-new__btn" type="button" onClick={handleAddToCart}>
            Add to cart
          </button>
        )}
      </div>
    </motion.article>
  );
}
