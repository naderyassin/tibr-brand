/* -------------------------------------------------------------
 * LANG.JS — Language Toggle & Core translation Controller
 * ------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  // Determine starting language: check localStorage, otherwise default to Arabic ('ar')
  let currentLang = localStorage.getItem("tibr-lang") || "ar";

  const langSwitchBtn = document.getElementById("lang-switch");
  const langText = langSwitchBtn ? langSwitchBtn.querySelector(".lang-text") : null;

  // Apply translations to all DOM elements marked with [data-i18n]
  const applyTranslations = (lang) => {
    const dict = translations[lang];
    if (!dict) return;

    // Set html lang and dir attributes
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");

    // Translate page title and metadata for SEO
    if (dict["doc-title"]) document.title = dict["doc-title"];
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && dict["meta-desc"]) metaDesc.setAttribute("content", dict["meta-desc"]);
    const metaKeys = document.querySelector('meta[name="keywords"]');
    if (metaKeys && dict["meta-keys"]) metaKeys.setAttribute("content", dict["meta-keys"]);

    // Translate all static nodes
    const elements = document.querySelectorAll("[data-i18n]");
    elements.forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const translation = dict[key];
      if (translation !== undefined) {
        // If it contains tags (like strong), set innerHTML, otherwise textContent
        if (translation.includes("<") && translation.includes(">")) {
          el.innerHTML = translation;
        } else {
          el.textContent = translation;
        }
      }
    });

    // Translate elements with aria-label (like close buttons)
    const ariaElements = document.querySelectorAll("[data-i18n-aria]");
    ariaElements.forEach((el) => {
      const key = el.getAttribute("data-i18n-aria");
      const translation = dict[key];
      if (translation !== undefined) {
        el.setAttribute("aria-label", translation);
      }
    });

    // Translate input placeholders if any exist
    const placeholderElements = document.querySelectorAll("[data-i18n-placeholder]");
    placeholderElements.forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      const translation = dict[key];
      if (translation !== undefined) {
        el.setAttribute("placeholder", translation);
      }
    });

    // Update language toggle button visual text
    if (langText) {
      langText.textContent = lang === "ar" ? "EN" : "العربية";
    }

    // Trigger dynamic component translations by dispatching a custom event
    const event = new CustomEvent("languageChanged", { detail: { lang } });
    document.dispatchEvent(event);
  };

  // Switch action trigger
  const toggleLanguage = () => {
    currentLang = currentLang === "ar" ? "en" : "ar";
    localStorage.setItem("tibr-lang", currentLang);
    document.body.classList.add('no-transitions');
    applyTranslations(currentLang);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.body.classList.remove('no-transitions');
    }));
  };

  // Bind click event
  if (langSwitchBtn) {
    langSwitchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      toggleLanguage();
    });
  }

  // Initial application of current language
  applyTranslations(currentLang);
});
