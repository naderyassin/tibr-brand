import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, Compass, Fingerprint } from "lucide-react";
import "./AboutPage.css";

export default function AboutPage() {
  return (
    <div className="about-page">
      {/* 1. FULL-SCREEN IMAGE HERO */}
      <section className="about-hero" aria-label="Introduction">
        <div className="about-hero__bg" />
        <div className="about-hero__content">
          <span className="about-hero__kicker">About Tibr</span>
          <h1 className="about-hero__title">The Narrative of Tibr</h1>
          <div className="about-hero__line-deco" />
          <p className="about-hero__lead">
            Bridging the sacred prestige of ancient Egyptian perfumery with contemporary luxury fragrance design.
          </p>
        </div>
        <div className="about-hero__scroll" aria-hidden="true">
          <span className="about-hero__scroll-text">Scroll to explore</span>
          <span className="about-hero__scroll-line" />
        </div>
      </section>

      <div className="store-container">
        {/* 2. COMPOSING LEGACY SPLIT SECTION */}
        <section className="about-philosophy" aria-label="Our Philosophy">
          <div className="about-philosophy__inner">
            <div className="about-philosophy__text-col">
              <motion.h2 
                className="about-philosophy__section-title"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
              >
                Composing Legacy
              </motion.h2>
              <motion.p 
                className="about-philosophy__text"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                TIBR (تِبْر) translates to "gold dust" or "raw gold before it is shaped" in classical Arabic. 
                Like raw gold, we believe scent is one of nature’s most precious raw treasures, awaiting 
                the touch of alchemy to be shaped into art.
              </motion.p>
            </div>
            <div className="about-philosophy__image-col">
              <div className="about-philosophy__img-frame">
                <img 
                  src="/categories/about_manifesto.png" 
                  alt="Tibr Amber bottle on volcanic gold sand" 
                  className="about-philosophy__img" 
                />
              </div>
            </div>
          </div>
        </section>

        {/* 3. INVERTED HERITAGE SPLIT */}
        <section className="about-heritage" aria-label="Egyptian Heritage">
          <div className="about-heritage__inner">
            <div className="about-heritage__image-col">
              <div className="about-heritage__img-frame">
                <img 
                  src="/categories/about_heritage.png" 
                  alt="Raw golden amber resins and frankincense tears" 
                  className="about-heritage__img" 
                />
              </div>
            </div>
            <div className="about-heritage__text-col">
              <motion.h2 
                className="about-heritage__section-title"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
              >
                Sacred Roots
              </motion.h2>
              <motion.p 
                className="about-heritage__text"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                For thousands of years, scent in Egypt was a sacred bridge between the physical and the spiritual. 
                The legendary temple recipes of <em>Kyphi</em>—blended from frankincense, myrrh, resins, and honey—were 
                aged in heavy stone jars to produce scents of unmatched depth and longevity.
              </motion.p>
              <motion.p 
                className="about-heritage__text"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                We honor this lineage by researching ancient extraction methodologies and classic structures. 
                We carry this history forward into contemporary extraits de parfum, offering sophisticated modern formulations 
                that retain the rich, heavy base notes that define classical Middle Eastern perfumery.
              </motion.p>
            </div>
          </div>
        </section>


        {/* 5. BOTANICAL INGREDIENTS VIGNETTES (Luxury Apothecary Style) */}
        <section className="about-ingredients" aria-label="Ingredients Grid">
          <h2 className="about-ingredients__title">Botanical Origins</h2>
          <p className="about-ingredients__subtitle">
            A curated selection of the finest natural extractions sourced directly from historical Egyptian fields.
          </p>
          <div className="about-ingredients__vignettes">
            <div className="about-ingredient-vignette">
              <div className="about-ingredient-vignette__img-wrapper">
                <img 
                  src="/categories/about_jasmine.png" 
                  alt="Nile Jasmine grandiflorum" 
                  className="about-ingredient-vignette__img" 
                />
              </div>
              <h3 className="about-ingredient-vignette__title">Nile Jasmine</h3>
              <span className="about-ingredient-vignette__ar">ياسمين النيل</span>
              <p className="about-ingredient-vignette__text">
                Hand-harvested at dawn in the Nile Delta, yielding a rich, deeply floral nectar with clean green facets.
              </p>
            </div>

            <div className="about-ingredient-vignette">
              <div className="about-ingredient-vignette__img-wrapper">
                <img 
                  src="/categories/about_rose.png" 
                  alt="Egyptian Damask Rose" 
                  className="about-ingredient-vignette__img" 
                />
              </div>
              <h3 className="about-ingredient-vignette__title">Damask Rose</h3>
              <span className="about-ingredient-vignette__ar">الورد البلدي</span>
              <p className="about-ingredient-vignette__text">
                Distilled in traditional copper vessels, offering a luxurious, velvety heart note with spicy honeyed undertones.
              </p>
            </div>

            <div className="about-ingredient-vignette">
              <div className="about-ingredient-vignette__img-wrapper">
                <img 
                  src="/categories/about_amber.png" 
                  alt="Golden Amber" 
                  className="about-ingredient-vignette__img" 
                />
              </div>
              <h3 className="about-ingredient-vignette__title">Golden Amber</h3>
              <span className="about-ingredient-vignette__ar">الكهرمان الدافئ</span>
              <p className="about-ingredient-vignette__text">
                A rich, warm, resinous accord matured in heavy vessels to anchor the base with exceptional longevity.
                </p>
            </div>

            <div className="about-ingredient-vignette">
              <div className="about-ingredient-vignette__img-wrapper">
                <img 
                  src="/categories/about_frankincense.png" 
                  alt="Sacred Frankincense Tears" 
                  className="about-ingredient-vignette__img" 
                />
              </div>
              <h3 className="about-ingredient-vignette__title">Frankincense</h3>
              <span className="about-ingredient-vignette__ar">اللبان المقدس</span>
              <p className="about-ingredient-vignette__text">
                A mystical, wood resin sourced from historic trade routes to add a divine, clean incense glow.
              </p>
            </div>
          </div>
        </section>

        {/* 6. MINIMAL BOUTIQUE SCCNTS CTA */}
        <section className="about-cta" aria-label="Explore collection">
          <div className="about-cta__box">
            <h2 className="about-cta__title">Find Your Signature</h2>
            <p className="about-cta__text">
              Every scent has a story, waiting to become unmistakably yours the moment it meets skin.
            </p>
            <Link to="/shop" className="cta-button">
              Explore The Collection
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
