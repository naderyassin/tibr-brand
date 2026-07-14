import { Link } from "react-router-dom";
import { Sparkles, Compass, Fingerprint } from "lucide-react";
import "./AboutPage.css";

export default function AboutPage() {
  return (
    <div className="about-page">
      {/* HERO SECTION */}
      <section className="about-hero" aria-label="About Tibr">
        <div className="about-hero__content">
          <span className="about-hero__kicker">Egypt's Liquid Gold</span>
          <h1 className="about-hero__title">The Narrative of Tibr</h1>
          <div className="about-hero__divider" aria-hidden="true">
            <span className="about-hero__line" />
            <span className="about-hero__gem" />
            <span className="about-hero__line" />
          </div>
        </div>
      </section>

      <div className="store-container">
        {/* OUR STORY & MANIFESTO */}
        <section className="about-manifesto" aria-label="Our Story">
          <div className="about-manifesto__inner">
            <div className="about-manifesto__content">
              <span className="about-manifesto__kicker">Our Story</span>
              <h2 className="about-manifesto__title">Composing Legacy</h2>
              <p className="about-manifesto__text">
                TIBR (تِبْر) translates to "gold dust" or "raw gold before it is shaped" in classical Arabic. 
                Like raw gold, we believe scent is one of nature’s most precious raw treasures, awaiting 
                the touch of alchemy to be shaped into art.
              </p>
              <p className="about-manifesto__text">
                TIBR was built on authenticity, nostalgia, and luxury. Every fragrance we carry joins the 
                heritage of the past to the luxury of the present, composed with the same meticulous care whether 
                it is our own signature perfume or a classic Egyptian recipe.
              </p>
            </div>
            <div className="about-manifesto__image-wrapper">
              <img 
                src="/categories/about_manifesto.png" 
                alt="TIBR Perfume Bottle on Volcanic Gold Sand" 
                className="about-manifesto__image" 
              />
            </div>
          </div>
        </section>

        {/* THE EGYPTIAN HERITAGE (New Section) */}
        <section className="about-heritage" aria-label="The Egyptian Heritage">
          <h2 className="about-heritage__title">The Egyptian Heritage</h2>
          <div className="about-heritage__quote-box">
            <p className="about-heritage__quote">
              "Egypt is the cradle of perfumery—the land of sacred Kyphi, temple resins, and world-renowned flower oils."
            </p>
          </div>
          <div className="about-heritage__text-grid">
            <p className="about-heritage__desc">
              For thousands of years, scent in Egypt was more than a cosmetic; it was a sacred bridge between the physical 
              and the spiritual. The legendary temple recipes of *Kyphi*—blended from frankincense, myrrh, raisins, and honey—were 
              aged in stone jars to produce scents of unmatched depth and longevity.
            </p>
            <p className="about-heritage__desc">
              At TIBR, we honor this heritage by researching ancient extraction methodologies and classic Egyptian structures. 
              We carry this history forward into contemporary extraits de parfum, offering sophisticated modern formulations 
              that retain the rich, heavy base notes that define classical Middle Eastern perfumery.
            </p>
          </div>
        </section>

        {/* PILLARS SECTION */}
        <section className="about-pillars" aria-label="Sourcing & Craftsmanship">
          <h2 className="about-pillars__title">Sourcing & Craftsmanship</h2>
          <div className="about-pillars__grid">
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
                We hunt the finest natural materials: Nile Delta jasmine grandiflorum, damask rose, and Sinai labdanum.
              </p>
            </div>
            
            <div className="about-pillar-card">
              <div className="about-pillar-card__icon-wrapper">
                <Fingerprint />
              </div>
              <h3 className="about-pillar-card__title">Alchemy (الحِرفة)</h3>
              <p className="about-pillar-card__text">
                No shortcuts. Every extrait is blended in micro-batches, allowing the oils to age and mature to perfection.
              </p>
            </div>
          </div>
        </section>

        {/* NATURAL INGREDIENTS GRID (New Section) */}
        <section className="about-ingredients" aria-label="Our Natural Ingredients">
          <h2 className="about-ingredients__title">Our Ingredients</h2>
          <p className="about-ingredients__subtitle">
            A curated selection of the finest natural extractions sourced directly from historical Egyptian fields.
          </p>
          <div className="about-ingredients__grid">
            <div className="about-ingredient-card">
              <div className="about-ingredient-card__img-wrapper">
                <img 
                  src="/categories/about_jasmine.png" 
                  alt="Nile Jasmine Flowers" 
                  className="about-ingredient-card__img" 
                />
              </div>
              <div className="about-ingredient-card__content">
                <h3 className="about-ingredient-card__title">Nile Jasmine (ياسمين النيل)</h3>
                <p className="about-ingredient-card__text">
                  Hand-harvested at dawn in the Nile Delta, yielding a rich, deeply floral nectar with clean green facets.
                </p>
              </div>
            </div>

            <div className="about-ingredient-card">
              <div className="about-ingredient-card__img-wrapper">
                <img 
                  src="/categories/about_rose.png" 
                  alt="Egyptian Damask Rose Petals" 
                  className="about-ingredient-card__img" 
                />
              </div>
              <div className="about-ingredient-card__content">
                <h3 className="about-ingredient-card__title">Damask Rose (الورد البلدي)</h3>
                <p className="about-ingredient-card__text">
                  Distilled in traditional copper vessels, offering a luxurious, velvety heart note with spicy honeyed undertones.
                </p>
              </div>
            </div>

            <div className="about-ingredient-card">
              <div className="about-ingredient-card__img-wrapper">
                <img 
                  src="/categories/about_amber.png" 
                  alt="Golden Amber Resins" 
                  className="about-ingredient-card__img" 
                />
              </div>
              <div className="about-ingredient-card__content">
                <h3 className="about-ingredient-card__title">Golden Amber (الكهرمان الدافئ)</h3>
                <p className="about-ingredient-card__text">
                  A rich, warm, resinous accord matured in heavy vessels to anchor the base with exceptional longevity.
                </p>
              </div>
            </div>

            <div className="about-ingredient-card">
              <div className="about-ingredient-card__img-wrapper">
                <img 
                  src="/categories/about_frankincense.png" 
                  alt="Sacred Frankincense Tears" 
                  className="about-ingredient-card__img" 
                />
              </div>
              <div className="about-ingredient-card__content">
                <h3 className="about-ingredient-card__title">Frankincense (اللبان المقدس)</h3>
                <p className="about-ingredient-card__text">
                  A mystical, lemon-bright wood resin sourced from historic trade routes to add a divine, clean incense glow.
                </p>
              </div>
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
