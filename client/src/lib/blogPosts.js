// Simple hardcoded blog content — no CMS/database yet. Same pattern as
// NOTES_CATALOG in AdminProduct.jsx: edit this array directly to add,
// change, or remove posts.
export const BLOG_POSTS = [
  {
    slug: "how-to-choose-your-signature-scent",
    title: "How to Choose Your Signature Scent",
    excerpt: "A signature scent should feel inevitable, not accidental. Here's how to actually find yours.",
    image: "",
    date: "2026-06-01",
    body: `Choosing a signature scent isn't about picking whatever smells good on the test strip — it's about how a fragrance behaves on your own skin over the next few hours.

Start with the family that matches how you actually want to feel: fresh and citrus-forward for daytime confidence, woody and amber for evening presence, floral for softness, oriental for depth. Then test no more than three at a time — your nose fatigues fast, and everything starts smelling the same after that.

Wear each candidate for a full day before deciding. Top notes fade within the first hour; what's left after four hours — the heart and base — is what people will actually remember about you. A scent you love in the bottle but that turns sharp or synthetic on your skin isn't the one, no matter how good the marketing.`,
  },
  {
    slug: "edp-vs-edt-whats-the-difference",
    title: "EDP vs EDT: What's the Difference?",
    excerpt: "Eau de Parfum, Eau de Toilette — the difference isn't just the name, it's concentration, longevity, and price.",
    image: "",
    date: "2026-06-10",
    body: `The letters on the bottle tell you how concentrated the fragrance oil is, and that changes almost everything else about how it wears.

Eau de Parfum (EDP) typically holds 15–20% fragrance oil. It lasts longer — often 6–8 hours — and tends to sit closer to the skin with a richer, warmer character. Eau de Toilette (EDT) sits lower, around 5–15%, so it's lighter, fresher, and fades faster, usually 3–5 hours, which makes it a natural pick for daytime or hot weather.

Neither is objectively "better" — EDT is often the more versatile everyday choice, while EDP suits occasions where you want the scent to carry through the evening without reapplying. If you're deciding between the two versions of the same fragrance, let the season and the length of your day decide for you.`,
  },
  {
    slug: "how-to-make-your-fragrance-last-longer",
    title: "How to Make a Fragrance Last Longer",
    excerpt: "Application technique matters more than how much you spray. Here's what actually extends wear time.",
    image: "",
    date: "2026-06-18",
    body: `Most people lose fragrance longevity before they even leave the house — not because the perfume is weak, but because of where and how it's applied.

Moisturized skin holds fragrance far longer than dry skin, so apply an unscented lotion first. Target pulse points — wrists, neck, behind the ears — where body heat helps the scent diffuse gradually instead of blasting off in the first ten minutes. Don't rub your wrists together after spraying; that friction breaks down the top notes and changes how the fragrance develops.

Layering helps too: a matching scented shower gel or body lotion, if available, builds a base the perfume can sit on top of. And store your bottles away from direct sunlight and heat — a fragrance that's been baking on a windowsill won't perform the way it did the day you bought it.`,
  },
  {
    slug: "the-story-behind-tibr",
    title: "The Story Behind TIBR",
    excerpt: "Why TIBR exists, and what authenticity, nostalgia, and luxury actually mean to us.",
    image: "",
    date: "2026-06-25",
    body: `TIBR started from a simple frustration: it was hard to find fragrance in Egypt that felt both genuinely Egyptian and genuinely luxurious at once — most options felt like you had to choose one or the other.

Authenticity, nostalgia, and luxury — isn't a slogan we picked after the fact. It's the filter every product goes through before it reaches the shop: does this feel true to where we're from, does it carry something worth remembering, and does it meet a standard we'd stand behind.

That's why you'll find both our own house fragrances and select designer names carried side by side here — not because we couldn't decide on a lane, but because we don't think authenticity and recognizable luxury have to be opposites.`,
  },
];

export const getBlogPost = (slug) => BLOG_POSTS.find((p) => p.slug === slug);
