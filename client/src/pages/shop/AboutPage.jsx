import { Link } from "react-router-dom";
import { Sparkles, Compass, Fingerprint } from "lucide-react";
import "./AboutPage.css";

export default function AboutPage() {
  return (
    <div className="about-page">
      {/* HERO SECTION */}
      <section className="about-hero" aria-label="About Tibr">
        <div 
          className="about-hero__bg" 
          style={{ backgroundImage: `url('/categories/about_hero.png')` }}
        />
        <div className="about-hero__content">
          <span className="about-hero__subtitle">The Narrative of Tibr</span>
          <h1 className="about-hero__title">حكاية تِبر</h1>
        </div>
      </section>

      <div className="store-container">
        {/* MANIFESTO SECTION */}
        <section className="about-manifesto" aria-label="Our Manifesto">
          <div className="about-manifesto__inner">
            <div className="about-manifesto__content">
              <span className="about-manifesto__kicker">Egypt's Liquid Gold</span>
              <h2 className="about-manifesto__title">Composing Legacy</h2>
              <p className="about-manifesto__text">
                TIBR (تِبْر) translates to "gold dust" or "raw gold before it is shaped" in classical Arabic. 
                Like raw gold, we believe scent is one of nature’s most precious raw treasures, awaiting 
                the touch of alchemy to be shaped into art.
              </p>
              <p className="about-manifesto__text">
                Egypt is the cradle of perfumery—the land of sacred *Kyphi* resins, temple incense, and 
                world-renowned flower oils. TIBR was built to bridge this ancient prestige with contemporary 
                perfume design, composing high-concentration *extraits de parfum* that carry the mystery of the past 
                into modern luxury.
              </p>
            </div>
            <div className="about-manifesto__image-wrapper">
              <img 
                src="/categories/about_manifesto.png" 
                alt="TIBR Amber Perfume Bottle" 
                className="about-manifesto__image" 
              />
            </div>
          </div>
        </section>

        {/* PILLARS SECTION */}
        <section className="about-pillars" aria-label="Our Pillars">
          <h2 className="about-pillars__title">Our Pillars</h2>
          <div className="about-pillars__grid">
            <div className="about-pillar-card">
              <div className="about-pillar-card__icon-wrapper">
                <Sparkles />
              </div>
              <h3 className="about-pillar-card__title">Nostalgia (الحنين)</h3>
              <p className="about-pillar-card__text">
                Reminiscent of ancient temples, heritage gardens of Alexandria, and the warm, narrow corridors of 
                historic Cairo's spice markets.
              </p>
            </div>
            
            <div className="about-pillar-card">
              <div className="about-pillar-card__icon-wrapper">
                <Compass />
              </div>
              <h3 className="about-pillar-card__title">Sourcing (المصدر)</h3>
              <p className="about-pillar-card__text">
                We hunt the finest natural materials: Nile Delta jasmine grandiflorum, damask rose, warm Sinai labdanum, 
                and hand-crystallized amber.
              </p>
            </div>
            
            <div className="about-pillar-card">
              <div className="about-pillar-card__icon-wrapper">
                <Fingerprint />
              </div>
              <h3 className="about-pillar-card__title">Alchemy (الحِرفة)</h3>
              <p className="about-pillar-card__text">
                No shortcuts. Every extrait is blended in meticulous micro-batches, allowing the oils to age and mature 
                to absolute perfection.
              </p>
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="about-cta" aria-label="Find Your Scent">
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
