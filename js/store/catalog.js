/* -------------------------------------------------------------
 * STORE / CATALOG.JS — Category listing behaviour (perfumes)
 * Filters, sort, skeleton loading, empty state, reveal, add-to-cart.
 * Depends on chrome.js (window.RB).
 * ------------------------------------------------------------- */
(function () {
  "use strict";
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduced = window.RB ? RB.reduced : false;

  const grid = $("#product-grid");
  const skeletonGrid = $("#skeleton-grid");
  const emptyEl = $("#catalog-empty");
  const products = $$("[data-product]");
  const countNodes = $$("#catalog-count [data-count]");
  if (!grid) return;

  const state = { gender: "all", collection: "all", search: "" };
  let loadingTimer = null;

  const matches = (p) => {
    const q = state.search.trim().toLowerCase();
    const nameMatch = !q ||
      (p.dataset.enName || "").toLowerCase().includes(q);
    return nameMatch &&
      (state.gender === "all" || p.dataset.gender === state.gender) &&
      (state.collection === "all" || p.dataset.collection === state.collection);
  };

  function buildSkeletons(n) {
    if (!skeletonGrid) return;
    skeletonGrid.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const card = document.createElement("div");
      card.className = "skeleton-card";
      card.innerHTML =
        '<div class="skeleton skeleton-card__media"></div>' +
        '<div class="skeleton-card__body">' +
          '<div class="skeleton skeleton-line skeleton-line--sm"></div>' +
          '<div class="skeleton skeleton-line skeleton-line--lg"></div>' +
          '<div class="skeleton skeleton-line skeleton-line--md"></div>' +
          '<div class="skeleton skeleton-line skeleton-line--price"></div>' +
        '</div>';
      skeletonGrid.appendChild(card);
    }
  }

  function render() {
    const visible = products.filter(matches);
    products.forEach((p) => { p.hidden = !matches(p); });
    const n = visible.length;
    countNodes.forEach((node) => { node.textContent = String(n); });
    const isEmpty = n === 0;
    if (emptyEl) emptyEl.classList.toggle("is-shown", isEmpty);
    grid.style.display = isEmpty ? "none" : "";
  }

  function applyFilters(withLoading) {
    grid.setAttribute("aria-busy", "true");
    const run = () => {
      render();
      grid.setAttribute("aria-busy", "false");
      if (skeletonGrid) skeletonGrid.hidden = true;
    };
    if (withLoading && !reduced && skeletonGrid) {
      buildSkeletons(Math.max(1, Math.min(3, products.filter(matches).length || 3)));
      skeletonGrid.hidden = false;
      grid.style.display = "none";
      if (emptyEl) emptyEl.classList.remove("is-shown");
      clearTimeout(loadingTimer);
      loadingTimer = setTimeout(run, 460);
    } else {
      run();
    }
  }

  $$(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const group = chip.dataset.filter;
      state[group] = chip.dataset.value;
      $$(`.filter-chip[data-filter="${group}"]`).forEach((c) =>
        c.setAttribute("aria-pressed", String(c === chip)));
      applyFilters(true);
    });
  });

  const sortSelect = $("#sort-select");
  function applySort() {
    if (!sortSelect) return;
    const mode = sortSelect.value;
    products.slice().sort((a, b) => {
      if (mode === "price-asc")  return +a.dataset.price - +b.dataset.price;
      if (mode === "price-desc") return +b.dataset.price - +a.dataset.price;
      return +b.dataset.order - +a.dataset.order;
    }).forEach((p, i) => { p.style.order = String(i); });
  }
  if (sortSelect) sortSelect.addEventListener("change", () => { applySort(); applyFilters(true); });

  const searchInput = $("#catalog-search");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      state.search = searchInput.value;
      applyFilters(false);
    });
  }

  const resetBtn = $("#reset-filters");
  if (resetBtn) resetBtn.addEventListener("click", () => {
    state.gender = "all"; state.collection = "all"; state.search = "";
    if (searchInput) searchInput.value = "";
    $$(".filter-chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === "all")));
    applyFilters(true);
  });

  // Advanced-filter disclosure: close the attached panel on outside click / Escape
  const advFilter = $(".catalog-filter__disclosure");
  if (advFilter) {
    document.addEventListener("click", (e) => {
      if (advFilter.open && !advFilter.contains(e.target)) advFilter.open = false;
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && advFilter.open) {
        advFilter.open = false;
        const toggle = advFilter.querySelector(".catalog-filter__toggle");
        if (toggle) toggle.focus();
      }
    });
  }

  // Add to cart (reads the product article)
  $$("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const art = btn.closest("[data-product]");
      if (!art || !window.RB) return;
      const img = art.querySelector(".product__img");
      const sizeChip = art.querySelector(".product__size");
      const size = (sizeChip ? sizeChip.textContent : (art.dataset.defaultSize || "")).trim();
      RB.addToCart({
        id: art.dataset.id,
        en_name: art.dataset.enName,
        price: +art.dataset.price,
        image: img ? img.getAttribute("src") : "",
        size
      });
    });
  });

  // Reveal (enhances an already-visible default)
  if (!reduced && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js-reveal");
    const els = $$("[data-reveal]");
    els.forEach((el, i) => { el.style.transitionDelay = `${Math.min(i, 6) * 70}ms`; });
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-visible"); obs.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach((el) => io.observe(el));
  }

  applySort();
  render();
})();
