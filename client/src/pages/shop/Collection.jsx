import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ScrollSequence from "@/components/ui/ScrollSequence";
import "./Collection.css";

gsap.registerPlugin(ScrollTrigger);

/* Hero image sequence — frames extracted from hero-section.mp4 at 30fps. */
const HERO_FRAME_COUNT = 91;
const heroFrameSrc = (i) =>
  `/assets/hero-frames/frame_${String(i + 1).padStart(4, "0")}.jpg`;

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
    image: "https://hlmbehyjshdtklhjqiii.supabase.co/storage/v1/object/public/brand-assets/images/obsidian_noir_wide.png",
    btnText: "DISCOVER"
  },
  {
    act: "ESSENCE II: DAWN",
    title: "Aurélia",
    image: "https://hlmbehyjshdtklhjqiii.supabase.co/storage/v1/object/public/brand-assets/images/amber_epilogue_wide.png",
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
    video: "https://hlmbehyjshdtklhjqiii.supabase.co/storage/v1/object/public/brand-assets/videos/frontier_stories.mp4",
    variant: "is-large is-editorial",
  },
  {
    key: "heritage",
    kicker: "HERITAGE",
    title: "",
    to: "#",
    image: "https://hlmbehyjshdtklhjqiii.supabase.co/storage/v1/object/public/brand-assets/images/frontier_heritage.png",
    variant: "is-half",
  },
  {
    key: "collections_fragrances",
    kicker: "COLLECTIONS",
    title: "",
    to: "/shop/perfumes",
    image: "https://hlmbehyjshdtklhjqiii.supabase.co/storage/v1/object/public/brand-assets/images/perfume_collection.png",
    variant: "is-half",
  },
];

const TIMELINE = [
  {
    year: "1924",
    title: "The First Extraction",
    body: "Founded in the heart of the Golden Age, TIBR established its signature rich olfactory contrast that would define modern high perfumery.",
    image: "https://hlmbehyjshdtklhjqiii.supabase.co/storage/v1/object/public/brand-assets/images/frontier_1924.png",
    align: "right",
    chapter: "CHAPTER 01",
  },
  {
    year: "1997",
    title: "The Pure Extract Revolution",
    body: "The introduction of pure perfume mastery with our legendary Aurum extract. TIBR expanded its collection, embracing rare raw materials as the true theater of human emotion.",
    image: "https://hlmbehyjshdtklhjqiii.supabase.co/storage/v1/object/public/brand-assets/images/frontier_1997.png",
    align: "left",
    chapter: "CHAPTER 02",
  },
];

/* Mouse-tracked tilt card — a distinct Framer Motion moment for the collections grid. */
function TiltCard({ c }) {
  const cardRef = useRef(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const springCfg = { stiffness: 200, damping: 22, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [7, -7]), springCfg);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-7, 7]), springCfg);

  const onMouseMove = (e) => {
    const rect = cardRef.current.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width - 0.5);
    py.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const onMouseLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      className={`col-collection-card ${c.variant || ""}`}
      style={{ rotateX, rotateY, transformPerspective: 1200 }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      onViewportEnter={(entry) => {
        if (c.video) entry?.target.querySelector("video")?.play();
      }}
    >
      <Link className="col-collection-card__link" to={c.to} aria-label={c.title || c.kicker}>
        {c.video ? (
          <video
            className="col-collection-card__media"
            src={c.video}
            loop
            muted
            playsInline
            aria-hidden="true"
          />
        ) : c.image ? (
          <div
            className="col-collection-card__media"
            style={{ backgroundImage: `url('${c.image}')` }}
            aria-hidden="true"
          />
        ) : null}
        <div className="col-collection-card__scrim" aria-hidden="true" />
        <motion.div
          className="col-collection-card__content"
          style={{ transform: "translateZ(40px)" }}
        >
          {c.kicker && <span className="col-kicker">{c.kicker}</span>}
          {c.title && <h3 className="col-collection-card__title">{c.title}</h3>}
          {c.blurb && <p className="col-collection-card__blurb">{c.blurb}</p>}
        </motion.div>
      </Link>
    </motion.div>
  );
}

export default function Collection() {
  const [marqueePlaying, setMarqueePlaying] = useState(false);
  const philosophyRef = useRef(null);
  const timelineRef = useRef(null);

  const { scrollYProgress: philosophyProgress } = useScroll({
    target: philosophyRef,
    offset: ["start 0.75", "end 0.3"],
  });
  const dividerScale = useTransform(philosophyProgress, [0, 1], [0, 1]);

  const { scrollYProgress: timelineProgress } = useScroll({
    target: timelineRef,
    offset: ["start 0.6", "end 0.4"],
  });

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      gsap.set(".col-hero-scene", { display: "none" });
      gsap.set(".scene-4", { display: "flex", opacity: 1, y: 0 });
      return;
    }

    // Set initial states explicitly to avoid CSS layout shift or race conditions
    gsap.set(".scene-1", { opacity: 1, y: 0 });
    gsap.set(".scene-2, .scene-3, .scene-4", { opacity: 0, y: 35 });

    // Create a GSAP timeline that scrub-syncs with the pinned scroll sequence
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".col-hero",
        start: "top top",
        end: "+=2600", // Matches the scrollLength of ScrollSequence
        scrub: 0.5,
      }
    });

    // ── ANIMATION SEQUENCE ──
    // Scene 1: Intro (starts visible, fades out as you scroll)
    tl.to(".scene-1", { opacity: 0, y: -35, duration: 2 }, "+=1.5")

    // Scene 2: Heritage (25% to 50%)
    tl.to(".scene-2", { opacity: 1, y: 0, duration: 2 }, "+=1")
      .to(".scene-2", { opacity: 0, y: -35, duration: 2 }, "+=1.5")

    // Scene 3: Profile (55% to 80%)
    tl.to(".scene-3", { opacity: 1, y: 0, duration: 2 }, "+=1")
      .to(".scene-3", { opacity: 0, y: -35, duration: 2 }, "+=1.5")

    // Scene 4: Finale / CTA (85% to 100%)
    tl.to(".scene-4", { opacity: 1, y: 0, duration: 2 }, "+=1");

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <div className="collection-page frontier-cinematic">
      {/* ── HERO (scroll-driven frame sequence) ────────────── */}
      <ScrollSequence
        frameCount={HERO_FRAME_COUNT}
        frameSrc={heroFrameSrc}
        scrollLength={2600}
        zoom={0.85}
        className="col-hero"
      >
        <div className="col-hero__overlay" aria-hidden="true" />

        <div className="col-hero__text-layer pointer-events-none">
          {/* Scene 1: Top-Right Initial Hook */}
          <div className="col-hero-scene scene-1">
            <span className="col-kicker">EXTRAIT DE PARFUM</span>
            <h2 className="col-scene-title is-large">TIBR</h2>
            <div className="col-scene-divider" />
            <p className="col-scene-desc">Discover Your Perfect Fragrance</p>
          </div>

          {/* Scene 2: Bottom-Right Editorial Detail */}
          <div className="col-hero-scene scene-2">
            <span className="col-kicker">THE HERITAGE</span>
            <h2 className="col-scene-title">A Legacy of Luxury</h2>
            <div className="col-scene-divider" />
            <p className="col-scene-desc">Handcrafted extraits de parfum, inspired by the heritage of Egypt.</p>
          </div>

          {/* Scene 3: Middle-Left Asymmetric Focus */}
          <div className="col-hero-scene scene-3">
            <span className="col-kicker">THE PROFILE</span>
            <h2 className="col-scene-title">Rare Olfactory Contrast</h2>
            <div className="col-scene-divider" />
            <p className="col-scene-desc">Warm amber, midnight spices, and aged woods colliding.</p>
          </div>

          {/* Scene 4: Center Finale / CTA */}
          <div className="col-hero-scene scene-4 pointer-events-auto">
            <h2 className="col-scene-title is-large">TIBR</h2>
            <div className="col-scene-divider" />
            <p className="col-scene-desc">Begin your olfactory story today.</p>
            <a className="col-btn" href="#collections">
              BEGIN THE JOURNEY
            </a>
          </div>
        </div>
      </ScrollSequence>

      <main className="col-body">
        {/* ── PHILOSOPHY ───────────────────────────────────── */}
        <section className="col-philosophy" ref={philosophyRef}>
          <motion.div
            className="col-philosophy__head"
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="col-kicker">THE PHILOSOPHY</span>
            <h2 className="col-philosophy__title">The Architecture of Scent</h2>
          </motion.div>

          <div className="col-philosophy__body">
            <motion.div
              className="col-philosophy__line"
              style={{ scaleY: dividerScale }}
              aria-hidden="true"
            />

            <motion.p
              className="col-philosophy__text"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              Every TIBR flacon is meticulously engineered to reflect the gravity of the elixir within. We believe luxury is tactile—defined not just by the aroma, but by the physical weight of the glass, the magnetic snap of the cap, and the sharp, machined edges that command space on your vanity.
            </motion.p>

            <motion.p
              className="col-philosophy__text is-secondary"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
            >
              Our design language is rooted in industrial minimalism, stripping away the ornate to reveal the raw, powerful essence of modern perfumery.
            </motion.p>
          </div>
        </section>

        {/* ── MARQUEE: ADS ───────────────────────────── */}
        <section className="col-marquee-section">
          <motion.div
            className="col-marquee__header"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.15 } },
            }}
          >
            <motion.h2
              className="col-marquee__title"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
              }}
            >
              The Essence of Elegance
            </motion.h2>
            <motion.p
              className="col-marquee__desc"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
              }}
            >
              Inspired by the golden age of high perfumery, the TIBR collection translates the texture of rare woods, the warmth of pure amber, and the mystery of midnight spices into unforgettable sensory experiences. Each fragrance is a memory, captured in a bottle.
            </motion.p>
          </motion.div>

          <motion.div
            className="col-marquee"
            onViewportEnter={() => setMarqueePlaying(true)}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className={`col-marquee__track ${marqueePlaying ? "is-playing" : ""}`}>
              {/* Duplicate array ONCE for a seamless 50% loop */}
              {[...MARQUEE_CARDS, ...MARQUEE_CARDS].map((card, i) => (
                <motion.div
                  key={i}
                  className="col-marquee__item"
                  whileHover={{ y: -10 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="col-marquee__img" style={{ backgroundImage: `url('${card.image}')` }} />
                  <div className="col-marquee__scrim" />
                  <div className="col-marquee__content">
                    <span className="col-kicker">{card.act}</span>
                    <h3 className="col-marquee__card-title">{card.title}</h3>
                    <Link to="#" className="col-btn col-btn--ghost">{card.btnText}</Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── COLLECTIONS ───────────────────────────── */}
        <section id="collections" className="col-section col-collections-wrap">
          <motion.div className="col-collections__head" {...reveal}>
            <span className="col-kicker">EXPLORE</span>
            <h2 className="col-collections__title">The Collections</h2>
          </motion.div>

          <div className="col-collections-grid">
            {COLLECTIONS.map((c) => (
              <TiltCard key={c.key} c={c} />
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

          <div className="col-house__entries" ref={timelineRef}>
            <div className="col-house__spine" aria-hidden="true">
              <motion.div
                className="col-house__spine-fill"
                style={{ scaleY: timelineProgress }}
              />
            </div>

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
                  <span className="col-entry__chapter">{t.chapter}</span>
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


      </main>
    </div>
  );
}
