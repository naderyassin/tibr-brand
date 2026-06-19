import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useLang = create(
  persist(
    (set) => ({
      lang: "en",
      toggle: () =>
        set((s) => {
          const next = s.lang === "ar" ? "en" : "ar";
          document.documentElement.lang = next;
          document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
          return { lang: next };
        }),
      setLang: (lang) =>
        set(() => {
          document.documentElement.lang = lang;
          document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
          return { lang };
        }),
    }),
    { name: "rb-lang" }
  )
);
