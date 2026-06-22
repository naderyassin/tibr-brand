import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getProducts } from "@/lib/api";
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
    act: "ACT I: THE PREMIERE",
    title: "Obsidian Noir",
    image: "/assets/images/frontier_intense.png",
    btnText: "DISCOVER"
  },
  {
    act: "ACT II: GOLDEN HOUR",
    title: "Amber Epilogue",
    image: "/assets/images/frontier_perfume_4.png",
    btnText: "DISCOVER"
  }
];

const COLLECTIONS = [
  {
    key: "stories",
    kicker: "",
    title: "The Stories",
    blurb: "Behind every frame lies a narrative waiting to be told.",
    to: "#",
    image: "/assets/images/frontier_stories.png",
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
    key: "collections_seats",
    kicker: "COLLECTIONS",
    title: "",
    to: "#",
    image: "/assets/images/frontier_collections.png",
    variant: "bento-half",
  },
];

const TIMELINE = [
  {
    year: "1924",
    title: "The First Exposure",
    body: "Founded in the heart of the Golden Age, Frontier established its signature rich contrast that would define the era's dramatic storytelling.",
    image: "/assets/images/frontier_1924.png",
    align: "right",
    chapter: "CHAPTER 01",
  },
  {
    year: "1997",
    title: "Wide-Format Revolution",
    body: "The introduction of anamorphic mastery. Frontier expanded the frame, embracing the 21:9 canvas as the true theater of human emotion.",
    image: "/assets/images/frontier_1997.png",
    align: "left",
  },
];

const FEATURED_FALLBACK = [
  {
    id: "aurum-absolu",
    act: "SIGNATURE EXTRAIT",
    en_name: "Aurum Absolu",
    price: "450",
    image: "/assets/images/frontier_perfume_4.png",
    blurb: "A rich, crystalline composition of rare amber and midnight oud, housed in an obsidian-grade vessel.",
  },
  {
    id: "silver-flare",
    act: "LUMIÈRE COLLECTION",
    en_name: "Silver Flare",
    price: "320",
    image: "/assets/images/frontier_perfume_5.png",
    blurb: "Master the senses with our signature cold-pressed bergamot and silver-tinted aromatic finish.",
  },
];

export default function Collection() {
  const { data } = useQuery({ queryKey: ["products"], queryFn: getProducts });

  const featured = useMemo(() => {
    // For the exact Frontier Cinematic design, we want to hardcode the featured pieces
    // to match the design, rather than pulling from the Tibr database.
    return FEATURED_FALLBACK;
  }, [data]);

  return (
    <div className="collection-page frontier-cinematic">
      {/* ── HERO ───────────────────────────────────────────── */}
      <header className="col-hero">
        <div className="col-hero__bg" aria-hidden="true">
          <div
            className="col-hero__img"
            style={{ backgroundImage: "url('/assets/images/frontier_hero.png')" }}
          />
          <div className="col-hero__overlay" />
        </div>

        <div className="col-hero__inner">
          <h1 className="col-hero__title">FRONTIER</h1>
          <p className="col-hero__subtitle">THE ART OF COLOR</p>
          <div className="col-hero__actions">
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
            <h2 className="col-marquee__title">The Art of Olfactory Cinema</h2>
            <p className="col-marquee__desc">
              Inspired by the golden age of wide-format storytelling, the Lumière line translates the texture of film grain, the warmth of studio lights, and the mystery of the cutting room floor into sensory experiences. Each scent is a frame, frozen in time.
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
                  {c.image && (
                    <div
                      className="col-tile__img"
                      style={{ backgroundImage: `url('${c.image}')` }}
                      aria-hidden="true"
                    />
                  )}
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
            <h2 className="col-house__title">THE TIMELINE</h2>
            <p className="col-house__sub">
              Tracing the evolution of the Frontier aesthetic across a century of innovation.
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
                  {t.chapter && (
                    <div className="col-entry__chapter">{t.chapter}</div>
                  )}
                </div>
                <div className="col-entry__text">
                  <span className="col-entry__year">{t.year}</span>
                  <h3 className="col-entry__title">{t.title}</h3>
                  <p className="col-entry__body">{t.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── INSTRUMENTS ──────────────────────────────── */}
        <section className="col-section col-featured">
          <motion.div className="col-featured__head" {...reveal}>
            <span className="col-kicker">AESTHETIC FOCUS</span>
            <h2 className="col-featured__title">Cinematic Instruments</h2>
          </motion.div>

          <div className="col-featured__grid">
            {featured.map((p) => (
              <motion.article key={p.id} className="col-card" {...reveal}>
                <Link className="col-card__media" to={`#`}>
                  {p.image ? (
                    <img
                      className="col-card__img"
                      src={p.image}
                      alt={p.en_name}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="col-card__img col-card__img--ph" />
                  )}
                </Link>
                <div className="col-card__body">
                  <div className="col-card__row">
                    <div>
                      <span className="col-kicker">{p.act}</span>
                      <h3 className="col-card__name">{p.en_name}</h3>
                    </div>
                    <span className="col-card__price">${p.price}</span>
                  </div>
                  <p className="col-card__blurb">{p.blurb}</p>
                  <Link className="col-btn col-btn--ghost" to={`#`}>
                    DISCOVER
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
