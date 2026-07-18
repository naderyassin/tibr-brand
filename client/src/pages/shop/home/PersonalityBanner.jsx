import React from "react";
import { Link } from "react-router-dom";
import { useT } from "@/stores/lang";
import "../Perfumes.css";

// CTA into the scent-finder quiz (client/src/pages/shop/Signature.jsx) at
// /shop/signature. Bilingual via the lang store — matches the treatment the
// scent finder itself uses (no site-wide toggle exists yet; see stores/lang.js).
export default function PersonalityBanner() {
  const t = useT();

  return (
    <section className="perfume-personality-banner">
      <div className="perfume-personality-banner__left">
        <div className="perfume-personality-banner__content">
          <h2 className="perfume-personality-banner__title">
            {t("Explore your perfumes that suit your personality", "استكشف العطور التي تناسب شخصيتك")}
          </h2>
          <div className="perfume-personality-banner__btn-wrapper">
            <Link to="/shop/signature" className="cta-start-now">
              {t("START NOW", "ابدأ الآن")}
            </Link>
          </div>
        </div>
      </div>
      <div className="perfume-personality-banner__right">
        <img
          src="/perfume_spray_hero.png"
          alt={t("Design a fragrance as unique as your story", "صمّم عطرًا فريدًا كقصّتك")}
          className="perfume-personality-banner__img"
        />
      </div>
    </section>
  );
}
