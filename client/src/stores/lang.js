import { create } from "zustand";

// There is no site-wide bilingual toggle yet — index.html is hard-coded
// dir="ltr" lang="en" and nothing else in client/src reads a language store
// (verified: no other file imports one, no dir="rtl" anywhere in the client).
// The store surface is English-only today, despite CLAUDE.md/PRODUCT.md's
// "Arabic-first RTL, EN toggle" mandate.
//
// Rather than flip <html> globally (the rest of the store's CSS has never
// been exercised in RTL and could break in ways out of scope here), this
// store is scoped: consumers apply `dir` to their own root element. New
// bilingual features (like the scent finder) can opt in without silently
// changing the rest of the app's layout direction.
const STORAGE_KEY = "tibr-lang";

const readInitial = () => {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "ar" || saved === "en" ? saved : "en";
  } catch {
    return "en";
  }
};

const initialLang = readInitial();

export const useLang = create((set, get) => ({
  lang: initialLang,
  // Plain field, not a getter — zustand's shallow-merge on set() would copy a
  // getter's current value once and freeze it, silently breaking reactivity.
  dir: initialLang === "ar" ? "rtl" : "ltr",
  setLang: (lang) => {
    if (lang !== "ar" && lang !== "en") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore (private mode, etc.) */
    }
    // Flipping `dir` also flips every [dir="rtl"] transform override (drawer
    // closed-positions, icon mirroring, ...). Elements that are off-screen
    // but still mounted (e.g. the shop filter drawer) have a transition on
    // that transform, so without this they visibly slide across the whole
    // viewport for the duration of the transition. Killing transitions for
    // one frame around the flip keeps the position change instant.
    document.documentElement.classList.add("lang-switching");
    set({ lang, dir: lang === "ar" ? "rtl" : "ltr" });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("lang-switching");
      });
    });
  },
  toggle: () => get().setLang(get().lang === "ar" ? "en" : "ar"),
}));

/** `t(en, ar)` picks the right string for the current lang. */
export const useT = () => {
  const lang = useLang((s) => s.lang);
  return (en, ar) => (lang === "ar" ? ar : en);
};
