import { useT } from "@/stores/lang";

export default function AboutBlurb() {
  const t = useT();
  return (
    <section className="about-blurb" aria-label={t("Who we are", "من نحن")}>
      <h2 className="about-blurb__title">{t("Who We Are", "من نحن")}</h2>
      <p className="about-blurb__text">
        {t(
          "TIBR is an Egyptian house built on authenticity, nostalgia, and luxury. Every fragrance we carry joins the heritage of the past to the luxury of the present, chosen with the same care whether it's our own signature or a name you already know.",
          "تِبر بيت عطور مصري بُني على الأصالة والحنين والفخامة. كل عطر نقدّمه يجمع بين إرث الماضي وفخامة الحاضر، ويُختار بنفس العناية سواء كان توقيعنا الخاص أو اسمًا تعرفه بالفعل."
        )}
      </p>
    </section>
  );
}
