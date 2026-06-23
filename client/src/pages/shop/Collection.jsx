import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import VideoScrubber from "@/components/ui/VideoScrubber";
import "./Collection.css";

/* Reveal preset — product-register restraint, ease-out only. */
const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

const MARQUEE_CARDS = [
  {
    act: "ESSENCE I: MIDNIGHT",
    title: "Aurora Nocturne",
    image: "/assets/images/obsidian_noir_wide.png",
    btnText: "DISCOVER"
  },
  {
    act: "ESSENCE II: DAWN",
    title: "Aurélia",
    image: "/assets/images/amber_epilogue_wide.png",
    btnText: "DISCOVER"
  }
];

const COLLECTIONS = [
  {
    key: "stories",
    kicker: "",
    title: "The Signatures",
    blurb: "Behind every scent lies a narrative waiting to be discovered.",
    to: "#",
    video: "/assets/videos/frontier_stories.mp4",
    variant: "bento-large is-editorial",
  },
  {
    key: "heritage",
    kicker: "HERITAGE",
    title: "",
    to: "#",
    image: "/assets/images/frontier_heritage.png",
    variant: "bento-half",
  },
  {
    key: "collections_fragrances",
    kicker: "COLLECTIONS",
    title: "",
    to: "/shop/perfumes",
    image: "/assets/images/perfume_collection.png",
    variant: "bento-half",
  },
];

const TIMELINE = [
  {
    year: "1924",
    title: "The First Extraction",
    body: "Founded in the heart of the Golden Age, TIBR established its signature rich olfactory contrast that would define modern high perfumery.",
    image: "/assets/images/frontier_1924.png",
    align: "right",
    chapter: "CHAPTER 01",
  },
  {
    year: "1997",
    title: "The Pure Extract Revolution",
    body: "The introduction of pure perfume mastery with our legendary Aurum extract. TIBR expanded its collection, embracing rare raw materials as the true theater of human emotion.",
    image: "/assets/images/frontier_1997.png",
    align: "left",
  },
];

export default function Collection() {

  return (
    <div className="collection-page frontier-cinematic">
      {/* ── HERO ───────────────────────────────────────────── */}
      <header className="col-hero">
        <div className="col-hero__bg" aria-hidden="true">
          <VideoScrubber
            src="/assets/videos/frontier_stories.mp4"
            className="col-hero__img"
          />
          <div className="col-hero__overlay" />
        </div>

        <div className="col-hero__inner pointer-events-none">
          <h1 className="col-hero__title" style={{ fontSize: "clamp(2.5rem, 4vw, 5rem)" }}>Discover Your Perfect Fragrance</h1>
          <div className="col-hero__actions pointer-events-auto">
            <a className="col-btn" href="#collections">
              BEGIN THE JOURNEY
            </a>
          </div>
          <div className="col-hero__cue" aria-hidden="true">
            <span className="col-hero__cue-dot" />
          </div>
        </div>
      </header>

      <main className="col-body">
        {/* ── MARQUEE: ADS ───────────────────────────── */}
        <section className="col-marquee-section">
          <div className="col-marquee__header">
            <h2 className="col-marquee__title">The Essence of Elegance</h2>
            <p className="col-marquee__desc">
              Inspired by the golden age of high perfumery, the TIBR collection translates the texture of rare woods, the warmth of pure amber, and the mystery of midnight spices into unforgettable sensory experiences. Each fragrance is a memory, captured in a bottle.
            </p>
          </div>
          <div className="col-marquee">
            <div className="col-marquee__track">
              {/* Duplicate array ONCE for a seamless 50% loop */}
              {[...MARQUEE_CARDS, ...MARQUEE_CARDS].map((card, i) => (
                <div key={i} className="col-marquee__item">
                  <div className="col-marquee__img" style={{ backgroundImage: `url('${card.image}')` }} />
                  <div className="col-marquee__scrim" />
                  <div className="col-marquee__content">
                    <span className="col-kicker">{card.act}</span>
                    <h3 className="col-marquee__card-title">{card.title}</h3>
                    <Link to="#" className="col-btn col-btn--ghost">{card.btnText}</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BENTO: COLLECTIONS ───────────────────────────── */}
        <section id="collections" className="col-section col-bento-wrap">
          <div className="col-bento">
            {COLLECTIONS.map((c) => (
              <motion.div
                key={c.key}
                className={`col-tile ${c.span || ""} ${c.variant || ""}`}
                {...reveal}
              >
                <Link className="col-tile__link" to={c.to} aria-label={c.title || c.kicker}>
                  {c.video ? (
                    <video
                      className="col-tile__video"
                      src={c.video}
                      autoPlay
                      loop
                      muted
                      playsInline
                      aria-hidden="true"
                    />
                  ) : c.image ? (
                    <div
                      className="col-tile__img"
                      style={{ backgroundImage: `url('${c.image}')` }}
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="col-tile__scrim" aria-hidden="true" />
                  <div className="col-tile__content">
                    {c.kicker && <span className="col-kicker">{c.kicker}</span>}
                    {c.title && <h2 className="col-tile__title">{c.title}</h2>}
                    {c.blurb && <p className="col-tile__blurb">{c.blurb}</p>}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── THE TIMELINE ─────────────────────────── */}
        <section className="col-section col-house">
          <motion.div className="col-house__head" {...reveal}>
            <h2 className="col-house__title">OUR HERITAGE</h2>
            <p className="col-house__sub">
              Tracing the evolution of the TIBR aesthetic across a century of olfactory innovation.
            </p>
          </motion.div>

          <div className="col-house__entries">
            {TIMELINE.map((t) => (
              <motion.div
                key={t.title}
                className={`col-entry is-${t.align}`}
                {...reveal}
              >
                <div className="col-entry__media">
                  <img
                    className="col-entry__img"
                    src={t.image}
                    alt={t.title}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="col-entry__text">
                  <h3 className="col-entry__title">{t.title}</h3>
                  <p className="col-entry__body">{t.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>


      </main>
    </div>
  );
}
