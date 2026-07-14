import { Link } from "react-router-dom";
import { Sparkles, Compass, Fingerprint } from "lucide-react";
import "./AboutPage.css";

export default function AboutPage() {
  return (
    <div className="about-page">
      {/* 1. ASYMMETRIC SPLIT HERO */}
      <section className="about-hero" aria-label="Introduction">
        <div className="about-hero__inner">
          <div className="about-hero__text-side">
            <h1 className="about-hero__title">The Narrative of Tibr</h1>
            <div className="about-hero__line-deco" />
            <p className="about-hero__lead">
              Bridging the sacred prestige of ancient Egyptian perfumery with contemporary luxury fragrance design.
            </p>
          </div>
          <div className="about-hero__image-side">
            <img 
              src="/categories/about_hero.png" 
              alt="Frankincense and jasmine on basalt stone" 
              className="about-hero__img" 
            />
          </div>
        </div>
      </section>

      <div className="store-container">
        {/* 2. CENTERED EDITORIAL MANIFESTO */}
        <section className="about-philosophy" aria-label="Our Philosophy">
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

        {/* NEW SECTION 1: A LETTER FROM THE FOUNDERS */}
        <section className="about-founders" aria-label="Founders Letter">
          <div className="about-founders__inner">
            <div className="about-founders__text">
              <h2 className="about-founders__title">A Letter from the Founders</h2>
              <p className="about-founders__paragraph">
                TIBR was born out of a shared obsession with olfactory heritage. Growing up surrounded by the rich 
                scent culture of Egypt—from the jasmine fields of the Nile Delta to the historic perfume souks of Old Cairo—we 
                realized that modern commercial perfumery had lost its soul. High-concentration natural oils had been 
                replaced by mass-produced synthetic copies that lacked character and staying power.
              </p>
              <p className="about-founders__paragraph">
                We established TIBR to reclaim that lost prestige. By marrying ancient Egyptian maceration methods 
                with contemporary French perfume design, we create extraits that are slow, complex, and deeply personal. 
                We invite you to experience scent not just as an accessory, but as a living memory.
              </p>
              <span className="about-founders__signature">Nader & The Alchemists of Tibr</span>
            </div>
            <div className="about-founders__visual">
              <div className="about-founders__quote-box">
                <span className="about-founders__large-quote">“</span>
                <p className="about-founders__vision">
                  We don't manufacture scents; we bottle memories, trade-routes, and historical alchemies.
                </p>
              </div>
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

        {/* NEW SECTION 2: THE SCENT RITUAL (Editorial Guide) */}
        <section className="about-ritual" aria-label="Scent Ritual">
          <h2 className="about-ritual__title">The Art of the Extrait</h2>
          <p className="about-ritual__subtitle">How to wear and care for high-concentration perfume oils.</p>
          <div className="about-ritual__grid">
            <div className="about-ritual-step">
              <span className="about-ritual-step__num">01</span>
              <h3 className="about-ritual-step__title">Pulse Points (نقاط النبض)</h3>
              <p className="about-ritual-step__text">
                Apply extraits directly to your warm pulse points—wrists, inner elbows, and the nape of the neck. 
                The heat of your body will slowly unfurl the complex layers over 12+ hours.
              </p>
            </div>
            
            <div className="about-ritual-step">
              <span className="about-ritual-step__num">02</span>
              <h3 className="about-ritual-step__title">Layering (مزج الطبقات)</h3>
              <p className="about-ritual-step__text">
                Our pure extraits are designed to be layered. Spray a base of warm Golden Amber, then crown it 
                with the bright floral notes of Nile Jasmine to compose your own bespoke signature.
              </p>
            </div>

            <div className="about-ritual-step">
              <span className="about-ritual-step__num">03</span>
              <h3 className="about-ritual-step__title">Maturation (التعتيق)</h3>
              <p className="about-ritual-step__text">
                Like fine wine, high-concentration natural perfumes mature over time. Keep your bottles in a cool, 
                dark sanctuary to let the natural botanical oils deepen in complexity.
              </p>
            </div>
          </div>
        </section>

        {/* NEW SECTION 3: EXTRACTION METHODS */}
        <section className="about-extractions" aria-label="Extraction Methods">
          <div className="about-extractions__header">
            <h2 className="about-extractions__title">The Extraction</h2>
            <p className="about-extractions__subtitle">Traditional processes that preserve botanical integrity.</p>
          </div>
          <div className="about-extractions__grid">
            <div className="about-extraction-card">
              <span className="about-extraction-card__kicker">Method I</span>
              <h3 className="about-extraction-card__title">Enfleurage (استخلاص البتلات)</h3>
              <p className="about-extraction-card__text">
                An ancient, labor-intensive technique where delicate jasmine and rose petals are laid over organic fats 
                to capture their volatile aromatic molecules without heat damage, preserving the living flower note.
              </p>
            </div>

            <div className="about-extraction-card">
              <span className="about-extraction-card__kicker">Method II</span>
              <h3 className="about-extraction-card__title">Copper Maceration (التخمير بالنحاس)</h3>
              <p className="about-extraction-card__text">
                Our base resins, including myrrh and frankincense, are macerated in heavy copper vessels for up to three 
                months, allowing the base compounds to build deep, resinous resonance and unparalleled staying power.
              </p>
            </div>

            <div className="about-extraction-card">
              <span className="about-extraction-card__kicker">Method III</span>
              <h3 className="about-extraction-card__title">Resin Clay Aging (تعتيق اللبان)</h3>
              <p className="about-extraction-card__text">
                Pure resins harvested from the dry mountains of Sinai are aged in clay vessels to round out their sharp, 
                balsamic edges and develop a smooth, dry woodiness before blending.
              </p>
            </div>
          </div>
        </section>

        {/* 5. BOTANICAL INGREDIENTS VIGNETTES (Apothicary Style) */}
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

        {/* NEW SECTION 4: OUR PROMISES */}
        <section className="about-promises" aria-label="Our Commitments">
          <div className="about-promises__inner">
            <div className="about-promise-item">
              <h3 className="about-promise-item__title">100% Traceability</h3>
              <p className="about-promise-item__text">
                Every raw material is sourced ethically and directly from independent Egyptian farmers, guaranteeing fair wages and crop sustainability.
              </p>
            </div>
            <div className="about-promise-item">
              <h3 className="about-promise-item__title">Zero Synthetic Fillers</h3>
              <p className="about-promise-item__text">
                We blend with 100% natural oil extracts. No synthetic silicones, petrochemicals, parabens, or chemical colorants.
              </p>
            </div>
            <div className="about-promise-item">
              <h3 className="about-promise-item__title">Micro-Batch Crafted</h3>
              <p className="about-promise-item__text">
                All Tibr perfumes are aged, hand-poured, and numbered in micro-batches under local artisan supervision in Cairo.
              </p>
            </div>
          </div>
        </section>

        {/* 6. MINIMAL BOUTIQUE SCENTS CTA */}
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
