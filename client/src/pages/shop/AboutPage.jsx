import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Compass, Fingerprint } from "lucide-react";
import "./AboutPage.css";

export default function AboutPage() {
  const philosophyRef = useRef(null);
  const [philosophyVisible, setPhilosophyVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhilosophyVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { 
        threshold: 0.1,
        rootMargin: "0px 0px -100px 0px"
      }
    );

    if (philosophyRef.current) {
      observer.observe(philosophyRef.current);
    }

    return () => observer.disconnect();
  }, []);

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
        {/* 2. CENTERED EDITORIAL MANIFESTO (With Scroll Reveal) */}
        <section 
          ref={philosophyRef}
          className={`about-philosophy ${philosophyVisible ? "is-visible" : ""}`} 
          aria-label="Our Philosophy"
        >
          <div className="about-philosophy__content">
            <h2 className="about-philosophy__title">Composing Legacy</h2>
            <p className="about-philosophy__quote">
              TIBR (تِبْر) translates to "gold dust" or "raw gold before it is shaped" in classical Arabic. 
              Like raw gold, we believe scent is one of nature’s most precious raw treasures, awaiting 
              the touch of alchemy to be shaped into art.
            </p>
          </div>
        </section>

        {/* 3. INVERTED HERITAGE SPLIT */}
        <section className="about-heritage" aria-label="Egyptian Heritage">
          <div className="about-heritage__inner">
            <div className="about-heritage__image-col">
              <div className="about-heritage__img-frame">
                <img 
                  src="/categories/about_manifesto.png" 
                  alt="Tibr Amber bottle on volcanic gold sand" 
                  className="about-heritage__img" 
                />
              </div>
            </div>
            <div className="about-heritage__text-col">
              <h2 className="about-heritage__section-title">Sacred Roots</h2>
              <p className="about-heritage__text">
                For thousands of years, scent in Egypt was a sacred bridge between the physical and the spiritual. 
                The legendary temple recipes of <em>Kyphi</em>—blended from frankincense, myrrh, resins, and honey—were 
                aged in heavy stone jars to produce scents of unmatched depth and longevity.
              </p>
              <p className="about-heritage__text">
                We honor this lineage by researching ancient extraction methodologies and classic structures. 
                We carry this history forward into contemporary extraits de parfum, offering sophisticated modern formulations 
                that retain the rich, heavy base notes that define classical Middle Eastern perfumery.
              </p>
            </div>
          </div>
        </section>

        {/* 4. ASYMMETRIC BENTO GRID (Pillars) */}
        <section className="about-pillars" aria-label="Sourcing and Craftsmanship">
          <h2 className="about-pillars__title">Sourcing & Craftsmanship</h2>
          <div className="about-pillars__bento">
            {/* Double-width Featured Card */}
            <div className="about-pillar-card about-pillar-card--featured">
              <div className="about-pillar-card__icon-wrapper">
                <Fingerprint />
              </div>
              <div className="about-pillar-card__featured-content">
                <h3 className="about-pillar-card__title">Alchemy & Formulation (الحِرفة)</h3>
                <p className="about-pillar-card__text">
                  No shortcuts. Every extrait is blended in micro-batches, allowing the natural oils to age, 
                  mature, and settle to absolute perfection. We combine traditional copper vessel distillation 
                  with state-of-the-art modern formulation to create scents that wear beautifully for hours on the skin.
                </p>
              </div>
            </div>

            {/* Stacked Column of Single Cards */}
            <div className="about-pillars__stack">
              <div className="about-pillar-card">
                <div className="about-pillar-card__icon-wrapper">
                  <Sparkles />
                </div>
                <h3 className="about-pillar-card__title">Nostalgia (الحنين)</h3>
                <p className="about-pillar-card__text">
                  Reminiscent of ancient gardens, coastal Alexandria, and the warm, spice-laden air of Cairo's old markets.
                </p>
              </div>

              <div className="about-pillar-card">
                <div className="about-pillar-card__icon-wrapper">
                  <Compass />
                </div>
                <h3 className="about-pillar-card__title">Sourcing (المصدر)</h3>
                <p className="about-pillar-card__text">
                  We hunt the finest natural materials: Nile Delta jasmine, damask rose, and Sinai labdanum.
                </p>
              </div>
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
