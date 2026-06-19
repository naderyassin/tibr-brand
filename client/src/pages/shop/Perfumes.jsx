import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getProducts } from "@/lib/api";
import ProductCard from "@/components/catalog/ProductCard";
import "./Perfumes.css";

// SVG Icons for the slider arrows
export default function Perfumes() {
  const { data, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const products = useMemo(() => {
    return (data?.data ?? []).filter((p) => p.category === "perfumes");
  }, [data]);

  // Original Brand Fragrance Collection with real photorealistic imagery
  const featured = [
    { id: 'feat-1', en_name: 'TOM FORD', image: '/assets/images/fragrance_midnight_oud.png' },
    { id: 'feat-2', en_name: 'DIOR', image: '/assets/images/fragrance_royal_amber.png' },
    { id: 'feat-3', en_name: 'CHANEL', image: '/assets/images/fragrance_velvet_rose.png' },
    { id: 'feat-4', en_name: 'YVES SAINT LAURENT', image: '/assets/images/fragrance_midnight_oud.png' },
    { id: 'feat-5', en_name: 'CREED', image: '/assets/images/fragrance_royal_amber.png' },
    { id: 'feat-6', en_name: 'GIORGIO ARMANI', image: '/assets/images/fragrance_velvet_rose.png' },
    { id: 'feat-7', en_name: 'GUCCI', image: '/assets/images/fragrance_midnight_oud.png' },
    { id: 'feat-8', en_name: 'VERSACE', image: '/assets/images/fragrance_royal_amber.png' },
    { id: 'feat-9', en_name: 'LE LABO', image: '/assets/images/fragrance_velvet_rose.png' },
    { id: 'feat-10', en_name: 'BYREDO', image: '/assets/images/fragrance_midnight_oud.png' },
    { id: 'feat-11', en_name: 'GIVENCHY', image: '/assets/images/fragrance_royal_amber.png' },
    { id: 'feat-12', en_name: 'BVLGARI', image: '/assets/images/fragrance_velvet_rose.png' }
  ];

  const carouselRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (carouselRef.current) {
      setWidth(carouselRef.current.scrollWidth - carouselRef.current.offsetWidth);
    }
  }, []);

  return (
    <div className="perfume-page">
      {/* HERO SECTION */}
      <section className="perfume-hero-split">
        <div className="perfume-hero-split__left">
          <div className="perfume-hero-split__content">

            <h1 className="perfume-hero-split__title">
              LUXURY<br />PERFUME
            </h1>

            <p className="perfume-hero-split__desc">
              Discover the essence of sophistication with our exclusive collection of luxurious fragrances.
            </p>
            <div className="perfume-hero-split__btn-wrapper">
              <a href="#collection" className="cta-ghost"><span>SHOP NOW</span></a>
            </div>
          </div>
        </div>
        <div className="perfume-hero-split__right">
          <img 
            src="/assets/images/perfume_hero_product_tibr.png" 
            alt="TIBR Luxury Perfume" 
            className="perfume-hero-split__img" 
          />
        </div>
      </section>

      {/* COLLECTION SECTION */}
      <section id="collection" className="perfume-collection">
        <h2 className="perfume-collection__title">Our Collection</h2>
        
        <div className="cw-v1" ref={(el) => { if (el) setWidth(el.scrollWidth - el.offsetWidth); }}>
          <motion.div
            className="carousel-v1"
            drag="x"
            dragConstraints={{ right: 0, left: -width }}
            whileTap={{ cursor: "grabbing" }}
            whileDrag={{ scale: 0.99 }}
            dragElastic={0.08}
            dragTransition={{ power: 0.4, timeConstant: 250, modifyTarget: (t) => Math.round(t / 260) * 260 }}
          >
            {featured.map((item, index) => (
              <motion.div
                key={item.id}
                className="crd-v1"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link className="crd-v1__link" to={`/product?id=${item.id}`} draggable="false">
                  <img src={item.image} alt={item.en_name} className="crd-v1__img" draggable="false" />
                </Link>
                <div className="crd-v1__overlay">
                  <h3 className="crd-v1__name">{item.en_name}</h3>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FULL CATALOG GRID */}
      {products.length > 0 && (
        <div className="store-container" style={{ paddingBottom: '4rem' }}>
          <header className="catalog-head" style={{ marginTop: '2rem' }}>
            <h2 className="catalog-head__title" style={{ fontSize: '1.5rem', color: '#fff' }}>All Perfumes</h2>
            <hr className="catalog-head__rule" style={{ borderColor: 'rgba(214, 176, 116, 0.3)' }} />
          </header>
          <section className="catalog-grid" aria-label="All Perfumes">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
