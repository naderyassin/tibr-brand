import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, Compass, Fingerprint } from "lucide-react";
import { useT } from "@/stores/lang";
import "./AboutPage.css";

export default function AboutPage() {
  const t = useT();
  return (
    <div className="about-page">
      {/* 1. FULL-SCREEN IMAGE HERO */}
      <section className="about-hero" aria-label={t("Introduction", "مقدمة")}>
        <div className="about-hero__bg" />
        <div className="about-hero__content">
          <span className="about-hero__kicker">{t("About Tibr", "عن تِبر")}</span>
          <h1 className="about-hero__title">{t("The Narrative of Tibr", "حكاية تِبر")}</h1>
          <div className="about-hero__line-deco" />
          <p className="about-hero__lead">
            {t(
              "Bridging the sacred prestige of ancient Egyptian perfumery with contemporary luxury fragrance design.",
              "نمزج بين مكانة العطارة المصرية القديمة المقدّسة وتصميم العطور الفاخرة المعاصر."
            )}
          </p>
        </div>
        <div className="about-hero__scroll" aria-hidden="true">
          <span className="about-hero__scroll-text">{t("Scroll to explore", "مرّر للاستكشاف")}</span>
          <span className="about-hero__scroll-line" />
        </div>
      </section>

      <div className="store-container">
        {/* 2. COMPOSING LEGACY SPLIT SECTION */}
        <section className="about-philosophy" aria-label={t("Our Philosophy", "فلسفتنا")}>
          <div className="about-philosophy__inner">
            <div className="about-philosophy__text-col">
              <motion.h2
                className="about-philosophy__section-title"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
              >
                {t("Composing Legacy", "تأليف الإرث")}
              </motion.h2>
              <motion.p
                className="about-philosophy__text"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {t(
                  `TIBR (تِبْر) translates to "gold dust" or "raw gold before it is shaped" in classical Arabic. Like raw gold, we believe scent is one of nature’s most precious raw treasures, awaiting the touch of alchemy to be shaped into art.`,
                  `تِبر تعني في اللغة العربية الفصحى "غبار الذهب" أو "الذهب الخام قبل أن يُصاغ". وكما هو الذهب الخام، نؤمن بأن العطر هو أحد أثمن كنوز الطبيعة الخام، في انتظار لمسة الكيمياء لتحيله إلى فن.`
                )}
              </motion.p>
            </div>
            <div className="about-philosophy__image-col">
              <div className="about-philosophy__img-frame">
                <img
                  src="/categories/about_manifesto.png"
                  alt={t("Tibr Amber bottle on volcanic gold sand", "زجاجة عنبر تِبر على رمال ذهبية بركانية")}
                  className="about-philosophy__img"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 3. INVERTED HERITAGE SPLIT */}
        <section className="about-heritage" aria-label={t("Egyptian Heritage", "الإرث المصري")}>
          <div className="about-heritage__inner">
            <div className="about-heritage__image-col">
              <div className="about-heritage__img-frame">
                <img
                  src="/categories/about_heritage.png"
                  alt={t("Raw golden amber resins and frankincense tears", "راتنجات العنبر الذهبي الخام ودموع اللبان")}
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
                {t("Sacred Roots", "جذور مقدسة")}
              </motion.h2>
              <motion.p
                className="about-heritage__text"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {t(
                  "For thousands of years, scent in Egypt was a sacred bridge between the physical and the spiritual. The legendary temple recipes of Kyphi—blended from frankincense, myrrh, resins, and honey—were aged in heavy stone jars to produce scents of unmatched depth and longevity.",
                  "منذ آلاف السنين، كان العطر في مصر جسرًا مقدسًا بين المادي والروحي. وصفات الكيفي الأسطورية في المعابد، المكوّنة من اللبان والمر والراتنجات والعسل، كانت تُعتَّق في جرار حجرية ثقيلة لتنتج عطورًا ذات عمق وثبات لا مثيل لهما."
                )}
              </motion.p>
              <motion.p
                className="about-heritage__text"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                {t(
                  "We honor this lineage by researching ancient extraction methodologies and classic structures. We carry this history forward into contemporary extraits de parfum, offering sophisticated modern formulations that retain the rich, heavy base notes that define classical Middle Eastern perfumery.",
                  "نُكرّم هذا الإرث من خلال دراسة أساليب الاستخلاص القديمة وتركيباتها الكلاسيكية، ونحمل هذا التاريخ إلى مستخلصات العطور المعاصرة، لنقدّم تركيبات عصرية راقية تحافظ على قاعدة العطر الغنية والثقيلة التي تُميّز العطارة الشرق أوسطية الكلاسيكية."
                )}
              </motion.p>
            </div>
          </div>
        </section>


        {/* 5. BOTANICAL INGREDIENTS VIGNETTES (Luxury Apothecary Style) */}
        <section className="about-ingredients" aria-label={t("Ingredients Grid", "شبكة المكونات")}>
          <h2 className="about-ingredients__title">{t("Botanical Origins", "أصول نباتية")}</h2>
          <p className="about-ingredients__subtitle">
            {t(
              "A curated selection of the finest natural extractions sourced directly from historical Egyptian fields.",
              "مجموعة مختارة بعناية من أرقى المستخلصات الطبيعية، مصدرها مباشرة من حقول مصر التاريخية."
            )}
          </p>
          <div className="about-ingredients__vignettes">
            <div className="about-ingredient-vignette">
              <div className="about-ingredient-vignette__img-wrapper">
                <img
                  src="/categories/about_jasmine.png"
                  alt={t("Nile Jasmine grandiflorum", "ياسمين النيل الكبير الأزهار")}
                  className="about-ingredient-vignette__img"
                />
              </div>
              <h3 className="about-ingredient-vignette__title">{t("Nile Jasmine", "ياسمين النيل")}</h3>
              <span className="about-ingredient-vignette__ar">ياسمين النيل</span>
              <p className="about-ingredient-vignette__text">
                {t(
                  "Hand-harvested at dawn in the Nile Delta, yielding a rich, deeply floral nectar with clean green facets.",
                  "يُقطف يدويًا عند الفجر في دلتا النيل، لينتج رحيقًا زهريًا غنيًا وعميقًا بلمسات خضراء نقية."
                )}
              </p>
            </div>

            <div className="about-ingredient-vignette">
              <div className="about-ingredient-vignette__img-wrapper">
                <img
                  src="/categories/about_rose.png"
                  alt={t("Egyptian Damask Rose", "الورد البلدي المصري")}
                  className="about-ingredient-vignette__img"
                />
              </div>
              <h3 className="about-ingredient-vignette__title">{t("Damask Rose", "الورد البلدي")}</h3>
              <span className="about-ingredient-vignette__ar">الورد البلدي</span>
              <p className="about-ingredient-vignette__text">
                {t(
                  "Distilled in traditional copper vessels, offering a luxurious, velvety heart note with spicy honeyed undertones.",
                  "يُقطّر في أوانٍ نحاسية تقليدية، ليمنح نغمة قلب مخملية فاخرة بلمسات عسلية متبّلة."
                )}
              </p>
            </div>

            <div className="about-ingredient-vignette">
              <div className="about-ingredient-vignette__img-wrapper">
                <img
                  src="/categories/about_amber.png"
                  alt={t("Golden Amber", "العنبر الذهبي")}
                  className="about-ingredient-vignette__img"
                />
              </div>
              <h3 className="about-ingredient-vignette__title">{t("Golden Amber", "العنبر الذهبي")}</h3>
              <span className="about-ingredient-vignette__ar">الكهرمان الدافئ</span>
              <p className="about-ingredient-vignette__text">
                {t(
                  "A rich, warm, resinous accord matured in heavy vessels to anchor the base with exceptional longevity.",
                  "توليفة راتنجية دافئة وغنية، تُنضَج في أوانٍ ثقيلة لترسّخ قاعدة العطر بثبات استثنائي."
                )}
                </p>
            </div>

            <div className="about-ingredient-vignette">
              <div className="about-ingredient-vignette__img-wrapper">
                <img
                  src="/categories/about_frankincense.png"
                  alt={t("Sacred Frankincense Tears", "دموع اللبان المقدس")}
                  className="about-ingredient-vignette__img"
                />
              </div>
              <h3 className="about-ingredient-vignette__title">{t("Frankincense", "اللبان")}</h3>
              <span className="about-ingredient-vignette__ar">اللبان المقدس</span>
              <p className="about-ingredient-vignette__text">
                {t(
                  "A mystical, wood resin sourced from historic trade routes to add a divine, clean incense glow.",
                  "راتنج خشبي غامض، مصدره طرق التجارة التاريخية، يضيف توهجًا بخوريًا نقيًا وروحانيًا."
                )}
              </p>
            </div>
          </div>
        </section>

        {/* 6. MINIMAL BOUTIQUE SCCNTS CTA */}
        <section className="about-cta" aria-label={t("Explore collection", "استكشاف المجموعة")}>
          <div className="about-cta__box">
            <h2 className="about-cta__title">{t("Find Your Signature", "اعثر على توقيعك")}</h2>
            <p className="about-cta__text">
              {t(
                "Every scent has a story, waiting to become unmistakably yours the moment it meets skin.",
                "لكل عطر حكاية، تنتظر أن تصبح بصمتك الخاصة فور ملامستها لبشرتك."
              )}
            </p>
            <Link to="/shop" className="cta-button">
              {t("Explore The Collection", "استكشف المجموعة")}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
