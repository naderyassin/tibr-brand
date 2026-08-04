import { motion } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";
import { useLang, useT } from "@/stores/lang";
import "./SignatureBrand.css";

const rise = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
};

export default function SignatureBrand() {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const dir = useLang((s) => s.dir);

  // Second paragraph is width-matched to the first line's rendered width (not
  // just given the same max-width value) so it can never read wider than the
  // lead sentence. Measured synchronously (getBoundingClientRect, not
  // ResizeObserver) so it doesn't depend on a rendering/animation-frame tick;
  // re-measured on language toggle (text/direction changes the lead's width)
  // and on viewport resize.
  const leadRef = useRef(null);
  const [leadWidth, setLeadWidth] = useState(null);
  useLayoutEffect(() => {
    const measure = () => {
      if (leadRef.current) setLeadWidth(leadRef.current.getBoundingClientRect().width);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [lang]);

  return (
    <div className="store-container sigbrand" dir={dir}>
      <motion.video
        {...rise}
        className="sigbrand__video"
        src="/assets/videos/your-own-signature.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
      />

      <motion.div {...rise}>
        <div className="sigbrand__headline">
          <span className="sigbrand__headline-line sigbrand__kicker">{t("Your Own Signature", "بصمتك الخاصة")}</span>
          <h1 className="sigbrand__headline-line sigbrand__title">{t("Sign Your Signature", "توقيع بصمتك")}</h1>
          <span className="sigbrand__headline-line sigbrand__tag">{t("Yours Alone", "لك وحدك")}</span>
        </div>
        <div className="sigbrand__rule" aria-hidden="true" />
        <p ref={leadRef} className="sigbrand__body sigbrand__body--lead">
          {t(
            "Available for brand owners, hotels, restaurants, business owners, gyms, and wellness spaces.",
            "هذا متوفر لأصحاب العلامات التجارية والبراندات والفنادق والمطاعم وأصحاب الأعمال والجيمات والأماكن الصحية."
          )}
        </p>
        <p
          className="sigbrand__body sigbrand__body--sub"
          style={leadWidth ? { maxWidth: `${leadWidth}px` } : undefined}
        >
          {t(
            "You can create the fragrance you want and love for your brand — and design a scent that is yours alone.",
            "يمكنك صناعة العطر الذي تريد وتحب لعلامتك التجارية، وتصميم العطر الخاص بعلامتك."
          )}
        </p>
      </motion.div>

      <motion.a
        {...rise}
        className="sigbrand__cta"
        href="https://wa.me/message/7IF766RWOGXAA1"
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("Start your signature", "ابدأ بصمتك")}
      </motion.a>
    </div>
  );
}
