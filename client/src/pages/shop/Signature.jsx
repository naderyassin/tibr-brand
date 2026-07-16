import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { getProducts } from "@/lib/api";
import { matchSignature, pickTopMatches } from "@/lib/signatureMatch";
import { HERO_NOTES, NOTES_BY_SLUG } from "@/lib/notesCatalog";
import { AUDIENCES, SEASONS, SILLAGE, FAMILIES, label } from "@/lib/taxonomy";
import { useLang, useT } from "@/stores/lang";
import "./Signature.css";

const QUIZ_KEYS = ["audience", "love", "hate", "season", "sillage"];

const parseList = (v) => (v ? v.split(",").filter(Boolean) : []);

/** Notes grouped by family, in FAMILIES order, restricted to HERO_NOTES. */
const NOTES_BY_FAMILY = FAMILIES.map((f) => ({
  family: f,
  notes: HERO_NOTES.map((slug) => NOTES_BY_SLUG.get(slug)).filter((n) => n?.family === f.slug),
})).filter((g) => g.notes.length);

const EASE = [0.22, 1, 0.36, 1];

/**
 * Put the next screen at the top of the page.
 *
 * App.jsx's ScrollToTop only fires on `pathname` changes — the quiz steps are
 * local state and the result screen only changes the query string, so neither
 * transition triggers it. Without this the scroll position carries over from a
 * long step (the notes lists) into a short one, and the shopper lands mid-page
 * or in the footer.
 *
 * Same mechanics as App.jsx: Lenis owns the scroll, so a native scrollTo(0,0)
 * is overwritten on its next frame — reset THROUGH Lenis (immediate + force),
 * falling back to native before Lenis initializes.
 */
function scrollToTop() {
  const lenis = window.__lenis;
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
}

function StepShell({ t, dir, step, total, title, subtitle, children, onBack, onNext, nextLabel, nextDisabled, skip }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="finder-step"
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
      transition={{ duration: reduceMotion ? 0 : 0.32, ease: EASE }}
    >
      <div className="finder-step__progress" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={total}>
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={`finder-step__dot${i < step ? " is-done" : ""}${i === step - 1 ? " is-current" : ""}`} />
        ))}
      </div>
      <p className="finder-step__count">{t(`Step ${step} of ${total}`, `الخطوة ${step} من ${total}`)}</p>
      <h1 className="finder-step__title">{title}</h1>
      {subtitle && <p className="finder-step__subtitle">{subtitle}</p>}

      <div className="finder-step__body">{children}</div>

      <div className="finder-step__actions">
        {onBack ? (
          <button type="button" className="btn btn--ghost" onClick={onBack}>
            {t("Back", "السابق")}
          </button>
        ) : (
          <Link to="/shop" className="btn btn--ghost">
            {t("Cancel", "إلغاء")}
          </Link>
        )}
        <div className="finder-step__actions-right">
          {skip && (
            <button type="button" className="btn btn--ghost" onClick={skip}>
              {t("Skip", "تخطي")}
            </button>
          )}
          <button type="button" className="btn btn--primary" onClick={onNext} disabled={nextDisabled}>
            {nextLabel}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function NoteChips({ t, selected, exclude = [], onToggle }) {
  const excludeSet = useMemo(() => new Set(exclude), [exclude]);
  return (
    <div className="finder-note-groups">
      {NOTES_BY_FAMILY.map(({ family, notes }) => {
        const visible = notes.filter((n) => !excludeSet.has(n.slug));
        if (!visible.length) return null;
        return (
          <div className="finder-note-group" key={family.slug}>
            <h3 className="finder-note-group__title">{t(family.en, family.ar)}</h3>
            <div className="finder-chip-row">
              {visible.map((n) => {
                const on = selected.includes(n.slug);
                return (
                  <button
                    key={n.slug}
                    type="button"
                    className={`finder-chip${on ? " is-on" : ""}`}
                    aria-pressed={on}
                    onClick={() => onToggle(n.slug)}
                  >
                    {t(n.en, n.ar)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QuizFlow({ t, dir, onFinish }) {
  const [step, setStep] = useState(1);
  const [audience, setAudience] = useState("");
  const [love, setLove] = useState([]);
  const [hate, setHate] = useState([]);
  const [season, setSeason] = useState("");
  const [sillage, setSillage] = useState("");

  // Every step starts at its first choice, not wherever the previous step was
  // scrolled to.
  useEffect(scrollToTop, [step]);

  const toggleLove = (slug) =>
    setLove((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  const toggleHate = (slug) =>
    setHate((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  const finish = () => onFinish({ audience, love, hate, season, sillage });

  return (
    <AnimatePresence mode="wait">
      {step === 1 && (
        <StepShell
          key="s1"
          t={t}
          dir={dir}
          step={1}
          total={4}
          title={t("Who is this signature for?", "لمن هذا التوقيع؟")}
          subtitle={t(
            "We'll narrow the catalog to fragrances built for them.",
            "سنُقصر البحث على العطور المصممة لهم."
          )}
          onNext={() => setStep(2)}
          nextLabel={t("Continue", "متابعة")}
          skip={() => { setAudience(""); setStep(2); }}
        >
          <div className="finder-choice-row">
            {AUDIENCES.map((a) => (
              <button
                key={a.slug}
                type="button"
                className={`finder-choice${audience === a.slug ? " is-on" : ""}`}
                aria-pressed={audience === a.slug}
                onClick={() => setAudience(a.slug)}
              >
                {t(a.en, a.ar)}
              </button>
            ))}
          </div>
        </StepShell>
      )}

      {step === 2 && (
        <StepShell
          key="s2"
          t={t}
          dir={dir}
          step={2}
          total={4}
          title={t("Which notes do you love?", "ما النوتات التي تحبها؟")}
          subtitle={t(
            "Pick as many as you like — the base notes matter most.",
            "اختر ما تشاء — النوتات الأساسية هي الأهم."
          )}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
          nextLabel={t("Continue", "متابعة")}
          nextDisabled={false}
        >
          <NoteChips t={t} selected={love} onToggle={toggleLove} />
        </StepShell>
      )}

      {step === 3 && (
        <StepShell
          key="s3"
          t={t}
          dir={dir}
          step={3}
          total={4}
          title={t("Anything you can't stand?", "هل هناك ما لا تتحمله؟")}
          subtitle={t("Optional — we'll rule out any fragrance built on these.", "اختياري — سنستبعد أي عطر مبني عليها.")}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
          nextLabel={t("Continue", "متابعة")}
          skip={() => setStep(4)}
        >
          <NoteChips t={t} selected={hate} exclude={love} onToggle={toggleHate} />
        </StepShell>
      )}

      {step === 4 && (
        <StepShell
          key="s4"
          t={t}
          dir={dir}
          step={4}
          total={4}
          title={t("Occasion and strength", "المناسبة والقوة")}
          subtitle={t("Gentle preferences — they'll never rule anything out.", "تفضيلات لطيفة — لن تستبعد أي شيء.")}
          onBack={() => setStep(3)}
          onNext={finish}
          nextLabel={t("See my signature", "اعرض توقيعي")}
        >
          <div className="finder-subsection">
            <h3 className="finder-note-group__title">{t("Season", "الموسم")}</h3>
            <div className="finder-choice-row">
              {SEASONS.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  className={`finder-choice${season === s.slug ? " is-on" : ""}`}
                  aria-pressed={season === s.slug}
                  onClick={() => setSeason(season === s.slug ? "" : s.slug)}
                >
                  {t(s.en, s.ar)}
                </button>
              ))}
            </div>
          </div>
          <div className="finder-subsection">
            <h3 className="finder-note-group__title">{t("Sillage", "الفوحان")}</h3>
            <div className="finder-choice-row">
              {SILLAGE.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  className={`finder-choice${sillage === s.slug ? " is-on" : ""}`}
                  aria-pressed={sillage === s.slug}
                  onClick={() => setSillage(sillage === s.slug ? "" : s.slug)}
                >
                  {t(s.en, s.ar)}
                </button>
              ))}
            </div>
          </div>
        </StepShell>
      )}
    </AnimatePresence>
  );
}

function PyramidLayer({ t, title, notes, loveSet }) {
  if (!notes.length) return null;
  return (
    <div className="finder-pyramid__layer">
      <span className="finder-pyramid__layer-label">{title}</span>
      <div className="finder-pyramid__notes">
        {notes.map((n) => (
          <span key={n.slug} className={`finder-pyramid__note${loveSet.has(n.slug) ? " is-loved" : ""}`}>
            {loveSet.has(n.slug) && (
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {t(n.name_en, n.name_ar)}
          </span>
        ))}
      </div>
    </div>
  );
}

function MatchCard({ t, dir, entry, love, hero = false }) {
  const p = entry.product;
  const name = p.en_name || p.ar_name;
  const loveSet = useMemo(() => new Set(love), [love]);
  const hasPyramid = (p.notes?.top?.length || 0) + (p.notes?.heart?.length || 0) + (p.notes?.base?.length || 0) > 0;

  return (
    <motion.article
      className={`finder-match${hero ? " finder-match--hero" : ""}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <div className="finder-match__media">
        {p.image ? <img src={p.image} alt={name} loading="lazy" /> : <div className="finder-match__media-placeholder" />}
      </div>
      <div className="finder-match__body">
        {hero && <span className="finder-match__eyebrow">{t("Your signature", "توقيعك")}</span>}
        <h3 className="finder-match__name">{name}</h3>

        <div className="finder-match__meter" aria-hidden="true">
          <div className="finder-match__meter-fill" style={{ width: `${entry.score}%` }} />
        </div>
        <p className="finder-match__meter-label">
          {t(`${entry.score}% match`, `توافق ${entry.score}%`)}
        </p>

        {hasPyramid ? (
          <div className="finder-pyramid">
            <PyramidLayer t={t} title={t("Top", "أولى")} notes={p.notes.top} loveSet={loveSet} />
            <PyramidLayer t={t} title={t("Heart", "وسطى")} notes={p.notes.heart} loveSet={loveSet} />
            <PyramidLayer t={t} title={t("Base", "أساسية")} notes={p.notes.base} loveSet={loveSet} />
          </div>
        ) : entry.familyMatches.length ? (
          <div className="finder-match__families">
            <span className="finder-match__families-label">
              {t("Shares its character:", "يشترك في طابع:")}
            </span>
            {entry.familyMatches.map((f) => (
              <span key={f} className="finder-match__family-tag">
                {t(label(FAMILIES, f, "en"), label(FAMILIES, f, "ar"))}
              </span>
            ))}
          </div>
        ) : null}

        <Link to={`/product?id=${p.id}`} className="btn btn--primary finder-match__cta">
          {t("View this fragrance", "عرض هذا العطر")}
        </Link>
      </div>
    </motion.article>
  );
}

function ResultScreen({ t, dir, answers, onRestart }) {
  const { data, isLoading } = useQuery({
    queryKey: ["products", "signature-finder"],
    queryFn: () => getProducts({ type: "perfume" }),
  });

  const products = data?.data ?? [];
  const { results, hasInput } = useMemo(() => matchSignature(answers, products), [answers, products]);
  const { hero, alternates } = useMemo(() => pickTopMatches({ results }, 3), [results]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const [copied, setCopied] = useState(false);
  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the visible link input is the fallback */
    }
  }, [shareUrl]);

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    t(`My TIBR fragrance signature: ${shareUrl}`, `توقيعي العطري من تِبر: ${shareUrl}`)
  )}`;

  if (isLoading) {
    return <div className="finder-loading" role="status">{t("Finding your signature…", "جارٍ إيجاد توقيعك…")}</div>;
  }

  if (!hero) {
    return (
      <motion.div className="finder-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="status">
        <svg className="finder-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
          <circle cx="11" cy="11" r="6" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
        <h1 className="finder-empty__title">
          {hasInput
            ? t("Nothing matches those notes yet", "لا يوجد ما يطابق هذه النوتات بعد")
            : t("Let's find your signature", "لنبدأ رحلة إيجاد توقيعك")}
        </h1>
        <p className="finder-empty__text">
          {hasInput
            ? t(
                "Try loosening a preference — especially the ones you can't stand.",
                "جرّب تخفيف أحد الشروط — خصوصًا ما لا تتحمله."
              )
            : t("Answer a few quick questions and we'll suggest a fragrance for you.", "أجب عن بضعة أسئلة سريعة وسنقترح عليك عطرًا.")}
        </p>
        <button type="button" className="btn btn--primary" onClick={onRestart}>
          {t("Start the quiz", "ابدأ الاختبار")}
        </button>
      </motion.div>
    );
  }

  return (
    <div className="finder-result">
      <header className="finder-result__head">
        <h1 className="finder-result__title">{t("Your fragrance signature", "توقيعك العطري")}</h1>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRestart}>
          {t("Retake the quiz", "أعد الاختبار")}
        </button>
      </header>

      <MatchCard t={t} dir={dir} entry={hero} love={answers.love} hero />

      {alternates.length > 0 && (
        <section className="finder-alternates">
          <h2 className="finder-alternates__title">{t("Also worth a try", "يستحق التجربة أيضًا")}</h2>
          <div className="finder-alternates__grid">
            {alternates.map((entry) => (
              <MatchCard key={entry.product.id} t={t} dir={dir} entry={entry} love={answers.love} />
            ))}
          </div>
        </section>
      )}

      <div className="finder-share">
        <p className="finder-share__label">{t("Share your signature", "شارك توقيعك")}</p>
        <div className="finder-share__row">
          <input className="finder-share__input" type="text" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
          <button type="button" className="btn btn--secondary btn--sm" onClick={copyLink}>
            {copied ? t("Copied", "تم النسخ") : t("Copy link", "نسخ الرابط")}
          </button>
          <a className="btn btn--primary btn--sm" href={whatsappHref} target="_blank" rel="noopener noreferrer">
            {t("Share on WhatsApp", "مشاركة عبر واتساب")}
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * /shop/signature — the "design your own fragrance" scent finder. Four
 * quick questions, then a ranked result the shopper can share (the answers
 * round-trip through the URL query string: ?love=oud,bergamot&audience=men…).
 */
export default function Signature() {
  const [params, setParams] = useSearchParams();
  const lang = useLang((s) => s.lang);
  const toggleLang = useLang((s) => s.toggle);
  const t = useT();
  const dir = lang === "ar" ? "rtl" : "ltr";

  const isResultMode = QUIZ_KEYS.some((k) => params.has(k));

  // Entering the result (and going back to the quiz) only changes the query
  // string, so App.jsx's pathname-keyed ScrollToTop never fires for it.
  useEffect(scrollToTop, [isResultMode]);

  const answers = useMemo(
    () => ({
      audience: params.get("audience") || "",
      love: parseList(params.get("love")),
      hate: parseList(params.get("hate")),
      season: params.get("season") || "",
      sillage: params.get("sillage") || "",
    }),
    [params]
  );

  const handleFinish = useCallback(
    (a) => {
      const next = new URLSearchParams();
      if (a.audience) next.set("audience", a.audience);
      if (a.love.length) next.set("love", a.love.join(","));
      if (a.hate.length) next.set("hate", a.hate.join(","));
      if (a.season) next.set("season", a.season);
      if (a.sillage) next.set("sillage", a.sillage);
      // Nothing answered at all — still show the (graceful) result screen
      // rather than silently doing nothing on "See my signature".
      if (![...next.keys()].length) next.set("audience", "");
      setParams(next, { replace: false });
    },
    [setParams]
  );

  const restart = useCallback(() => setParams(new URLSearchParams(), { replace: false }), [setParams]);

  return (
    <div className="finder-page store-container" dir={dir}>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/shop">{t("Shop", "المتجر")}</Link>
        <span className="breadcrumb__sep" aria-hidden="true">/</span>
        <span aria-current="page">{t("Design Your Fragrance", "صمّم عطرك")}</span>
      </nav>

      <button type="button" className="finder-lang-toggle" onClick={toggleLang} aria-label={t("Switch to Arabic", "التبديل إلى الإنجليزية")}>
        {lang === "ar" ? "EN" : "AR"}
      </button>

      <AnimatePresence mode="wait">
        {isResultMode ? (
          <ResultScreen key="result" t={t} dir={dir} answers={answers} onRestart={restart} />
        ) : (
          <QuizFlow key="quiz" t={t} dir={dir} onFinish={handleFinish} />
        )}
      </AnimatePresence>
    </div>
  );
}
