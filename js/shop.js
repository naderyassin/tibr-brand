/* -------------------------------------------------------------
 * SHOP.JS — Per-category Store controller
 * Each nav tab (العطور / الملابس / الأحذية) is its own dedicated
 * store: a responsive grid scoped to a single category, with its
 * own gender filter + sort. Cards reuse .product-card / .shop-card
 * (modal via .product-card-btn delegation in products.js) and
 * .wishlist-btn (wishlist.js), so they wire up automatically.
 * Reads the shared window.catalogProducts source.
 * ------------------------------------------------------------- */

(function () {
  function getBottleVariant(product) {
    const src = `${product.image || ''} ${product.id || ''}`.toLowerCase();
    if (src.includes('jasmine') || src.includes('etoilee') || src.includes('فل')) return 'jasmine';
    if (src.includes('nostalgia') || src.includes('rouge') || src.includes('نوستالج')) return 'nostalgia';
    return 'oud';
  }

  // Build one store bound to a fixed category and its own DOM nodes.
  function createStore({ key, category, gridId, toolbarSelector }) {
    return {
      key,
      category,
      state: { gender: "all", sort: "featured" },
      bound: false,

      init() {
        this.grid = document.getElementById(gridId);
        this.toolbar = document.querySelector(toolbarSelector);
        if (!this.grid || !this.toolbar) return;
        this.countEl = this.toolbar.querySelector(".shop-count");

        // Gender chips (scoped to this store's toolbar)
        this.toolbar.addEventListener("click", (e) => {
          const chip = e.target.closest(".shop-chip");
          if (!chip) return;
          const group = chip.dataset.group; // "gender"
          const value = chip.dataset.value;
          if (!group || this.state[group] === value) return;
          this.state[group] = value;
          this.toolbar
            .querySelectorAll(`.shop-chip[data-group="${group}"]`)
            .forEach((c) => c.classList.toggle("active", c === chip));
          this.render();
        });

        // Sort
        const sortSelect = this.toolbar.querySelector(".store-sort");
        sortSelect?.addEventListener("change", (e) => {
          this.state.sort = e.target.value;
          this.render();
        });

        // Empty-state reset (delegated; the button is re-rendered)
        this.grid.addEventListener("click", (e) => {
          if (e.target.closest(".shop-empty__reset")) this.reset();
        });

        // React to shared catalog + language changes
        document.addEventListener("productsLoaded", () => this.render());
        document.addEventListener("languageChanged", () => {
          this.syncLabels();
          this.render();
        });

        this.bound = true;

        if (Array.isArray(window.catalogProducts) && window.catalogProducts.length) {
          this.render();
        } else {
          this.renderSkeletons();
        }
      },

      reset() {
        this.state = { gender: "all", sort: "featured" };
        this.toolbar?.querySelectorAll(".shop-chip").forEach((c) => {
          c.classList.toggle("active", c.dataset.value === "all");
        });
        const sortSelect = this.toolbar?.querySelector(".store-sort");
        if (sortSelect) sortSelect.value = "featured";
        this.render();
      },

      syncLabels() {
        const lang = window.utils?.getCurrentLang() || "ar";
        const dict = translations[lang] || {};
        this.toolbar?.querySelectorAll("[data-i18n]").forEach((el) => {
          const key = el.getAttribute("data-i18n");
          if (dict[key] !== undefined) el.textContent = dict[key];
        });
      },

      _filtered() {
        const products = window.catalogProducts || [];
        const { gender } = this.state;
        const list = products.filter((p) => {
          if (p.category !== this.category) return false;
          return (
            gender === "all" ||
            p.gender === gender ||
            (gender !== "unisex" && p.gender === "unisex")
          );
        });

        const price = (p) =>
          window.utils?.parsePrice(p.ar?.price ?? p.en?.price ?? 0) ?? 0;

        switch (this.state.sort) {
          case "price-asc":  return list.sort((a, b) => price(a) - price(b));
          case "price-desc": return list.sort((a, b) => price(b) - price(a));
          case "name":       return list.sort((a, b) =>
            (a.ar?.name || "").localeCompare(b.ar?.name || "", "ar"));
          default:           return list; // featured = catalog order
        }
      },

      // Public entry — called by router on navigation
      render() {
        if (!this.bound) this.init();
        if (!this.grid) return;

        const lang = window.utils?.getCurrentLang() || "ar";
        const dict = translations[lang] || {};

        if (!Array.isArray(window.catalogProducts) || !window.catalogProducts.length) {
          this.renderSkeletons();
          return;
        }

        const results = this._filtered();
        const discoverText = dict["scents-discover-btn"] || (lang === "ar" ? "اكتشف المنتج" : "Discover");

        if (this.countEl) {
          const n = results.length;
          const word = lang === "ar"
            ? (n === 1 ? "منتج" : n === 2 ? "منتجين" : n <= 10 ? "منتجات" : "منتج")
            : (n === 1 ? "item" : "items");
          this.countEl.innerHTML = `<span>${n}</span> ${word}`;
        }

        if (results.length === 0) {
          this.grid.innerHTML = `
            <div class="shop-empty">
              <span class="shop-empty__mark" aria-hidden="true">🏺</span>
              <h3 class="shop-empty__title">${dict["shop-empty-title"] || "لا توجد منتجات مطابقة"}</h3>
              <p class="shop-empty__hint">${dict["shop-empty-hint"] || "جرّب تغيير الفلاتر لاستكشاف باقي المجموعة."}</p>
              <button class="shop-empty__reset" type="button">${dict["shop-reset"] || "إعادة تعيين الفلاتر"}</button>
            </div>`;
          return;
        }

        this.grid.innerHTML = results.map((p, i) => {
          const data = p[lang] || p.ar || {};
          const wished = window.wishlist?.has?.(p.id) ? "active" : "";
          const glow = p.accentGlow || "rgba(201, 168, 76, 0.12)";
          const color = p.accentColor || "var(--gold)";
          const heartLabel = lang === "ar" ? "أضف إلى المفضلة" : "Add to wishlist";
          const isPerf = p.category === "perfumes";
          const variant = isPerf ? getBottleVariant(p) : null;
          const moodLabel = isPerf && data.mood ? data.mood : null;

          const visualInner = isPerf
            ? `<div class="store-card__bottle-silhouette store-card__bottle--${variant}"></div>
               <div class="store-card__glow"></div>
               ${moodLabel ? `<span class="store-card__mood">${moodLabel}</span>` : ""}`
            : `<div class="store-card__pattern"></div>`;

          return `
            <article class="product-card shop-card store-card" id="${this.key}-card-${p.id}"
                     style="--product-color:${color};--accent-glow:${glow};--i:${i};">
              <div class="store-card__visual ${isPerf ? "store-card__visual--perfume" : "store-card__visual--apparel"}">
                ${visualInner}
                <button class="wishlist-btn ${wished}" data-id="${p.id}"
                        aria-label="${heartLabel}" aria-pressed="${wished ? "true" : "false"}">♥</button>
              </div>
              <div class="store-card__info">
                <h3 class="store-card__name">${data.name || ""}</h3>
                ${data.shortDesc ? `<p class="store-card__line">${data.shortDesc}</p>` : ""}
                <div class="store-card__footer">
                  ${data.price ? `<span class="store-card__price">${data.price}</span>` : ""}
                  <button class="store-card__cta product-card-btn" data-id="${p.id}">${discoverText}</button>
                </div>
              </div>
            </article>`;
        }).join("");
      },

      renderSkeletons(count = 8) {
        if (!this.grid) return;
        if (this.countEl) this.countEl.innerHTML = "";
        this.grid.innerHTML = Array.from({ length: count }).map(() => `
          <div class="shop-skeleton" aria-hidden="true">
            <div class="shop-skeleton__img"></div>
            <div class="shop-skeleton__line is-short"></div>
            <div class="shop-skeleton__line is-mid"></div>
            <div class="shop-skeleton__line is-short"></div>
            <div class="shop-skeleton__line is-btn"></div>
          </div>`).join("");
      }
    };
  }

  // One dedicated store per category tab.
  window.stores = {
    perfumes: createStore({
      key: "perfumes",
      category: "perfumes",
      gridId: "perfumes-store-grid",
      toolbarSelector: '.shop-toolbar[data-store="perfumes"]'
    }),
    clothes: createStore({
      key: "clothes",
      category: "clothes",
      gridId: "clothes-store-grid",
      toolbarSelector: '.shop-toolbar[data-store="clothes"]'
    }),
    shoes: createStore({
      key: "shoes",
      category: "shoes",
      gridId: "shoes-store-grid",
      toolbarSelector: '.shop-toolbar[data-store="shoes"]'
    })
  };

  document.addEventListener("DOMContentLoaded", () => {
    Object.values(window.stores).forEach((s) => s.init());
  });
})();
