/* -------------------------------------------------------------
 * STORE / CHROME.JS — Shared store shell + RB API
 * Loaded on every store page. Injects header/drawer/footer/toast
 * when absent, runs the language system, persists the cart, and
 * exposes window.RB for page scripts.
 * ------------------------------------------------------------- */
(function () {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const arDigits = (n) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

  /* ============================ ICONS ============================ */
  const I = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5" stroke-linecap="round"/></svg>',
    heart:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 20.3c-.4-.3-5.9-4-8-7.6C2.2 9.8 3.2 6.2 6.3 6.2c1.8 0 3 1.1 3.7 2.2.7-1.1 1.9-2.2 3.7-2.2 3.1 0 4.1 3.6 2.3 6.5-2.1 3.6-7.6 7.3-8 7.6z" stroke-linejoin="round"/></svg>',
    user:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" stroke-linecap="round"/></svg>',
    bag:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6.6 8h10.8l.7 11.4a1.1 1.1 0 0 1-1.1 1.1H7a1.1 1.1 0 0 1-1.1-1.1z" stroke-linejoin="round"/><path d="M9.2 8.5V7a2.8 2.8 0 0 1 5.6 0v1.5" stroke-linecap="round"/></svg>',
    menu:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10" stroke-linecap="round"/></svg>',
    globe:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="8.2"/><path d="M3.8 12h16.4M12 3.8c2.2 2.3 3.4 5.2 3.4 8.2s-1.2 5.9-3.4 8.2c-2.2-2.3-3.4-5.2-3.4-8.2s1.2-5.9 3.4-8.2z"/></svg>',
    close:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>',
    check:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.1 14.9l-.3-.2-2.8.8.8-2.7-.2-.3A8 8 0 0 1 12 4zm4.4 10.2c-.2-.1-1.3-.7-1.5-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.1-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.1-.2 0-.4.1-.5l.4-.5c.1-.1.1-.3 0-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.8.8-.8 2 0 3.2a9 9 0 0 0 3.9 3.5c1.3.6 1.9.6 2.6.5.4 0 1.3-.5 1.5-1 .2-.5.2-1 .1-1z"/></svg>'
  };
  const bi = (ar, en) => `<span data-lang-ar>${ar}</span><span data-lang-en>${en}</span>`;
  const wordmark = () => `<span data-lang-ar>تِبْر</span><span data-lang-en>Tibr<span class="dot">.</span></span>`;

  /* ============================ CART STORE ============================ */
  const CART_KEY = "tibr-cart";
  const ORDERS_KEY = "tibr-orders";
  const readJSON = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) || fallback; } catch (_) { return fallback; } };

  const cart = {
    items() { return readJSON(CART_KEY, []); },
    _save(items) { localStorage.setItem(CART_KEY, JSON.stringify(items)); document.dispatchEvent(new CustomEvent("cartChanged")); },
    add(item) {
      const items = cart.items();
      const found = items.find((x) => x.id === item.id && x.size === item.size);
      if (found) found.qty += item.qty || 1;
      else items.push(Object.assign({ qty: 1 }, item));
      cart._save(items);
    },
    setQty(id, size, qty) {
      const items = cart.items();
      const it = items.find((x) => x.id === id && x.size === size);
      if (!it) return;
      it.qty = Math.max(1, qty);
      cart._save(items);
    },
    remove(id, size) { cart._save(cart.items().filter((x) => !(x.id === id && x.size === size))); },
    clear() { cart._save([]); },
    count() { return cart.items().reduce((n, x) => n + x.qty, 0); },
    subtotal() { return cart.items().reduce((n, x) => n + x.price * x.qty, 0); }
  };

  const orders = {
    all() { return readJSON(ORDERS_KEY, []); },
    add(order) { const o = orders.all(); o.unshift(order); localStorage.setItem(ORDERS_KEY, JSON.stringify(o)); },
    setStatus(ref, status) {
      const o = orders.all();
      const found = o.find((x) => x.ref === ref);
      if (found) { found.status = status; localStorage.setItem(ORDERS_KEY, JSON.stringify(o)); }
    }
  };

  function formatPrice(n, lang) {
    lang = lang || RB.lang();
    return lang === "ar" ? `${arDigits(n)} ج.م` : `${n} EGP`;
  }

  /* ============================ CHROME INJECTION ============================ */
  function buildHeader(activeNav) {
    const link = (href, ar, en, key) =>
      `<li><a class="store-nav__link"${key === activeNav ? ' aria-current="page"' : ""} href="${href}">${bi(ar, en)}</a></li>`;
    return `
    <header class="store-header" id="store-header">
      <div class="store-container store-header__inner">
        <a class="store-wordmark" href="/" aria-label="تِبْر">${wordmark()}</a>
        <nav class="store-nav" aria-label="التصنيفات">
          <ul class="store-nav__list">
            ${link("/shop/perfumes", "العطور", "Perfumes", "perfumes")}
            ${link("/shop/clothing", "الملابس", "Clothing", "clothing")}
            ${link("/shop/sneakers", "الأحذية", "Sneakers", "sneakers")}
          </ul>
        </nav>
        <div class="store-utils">
          <button class="store-iconbtn store-util-extra" type="button" data-ar-label="بحث" data-en-label="Search" aria-label="بحث">${I.search}</button>
          <a class="store-iconbtn store-util-extra" href="/account?tab=wishlist" data-ar-label="المفضلة" data-en-label="Wishlist" aria-label="المفضلة">${I.heart}</a>
          <a class="store-iconbtn store-util-extra" href="/account" data-ar-label="حسابي" data-en-label="Account" aria-label="حسابي">${I.user}</a>
          <a class="store-iconbtn" href="/cart" id="cart-btn" data-ar-label="سلة التسوق" data-en-label="Cart" aria-label="سلة التسوق">
            ${I.bag}<span class="store-cart-count" id="cart-count" aria-hidden="true">0</span>
          </a>
          <button class="store-lang" id="lang-switch" type="button" aria-label="Switch language">${I.globe}<span class="lang-text">EN</span></button>
          <button class="store-burger" id="burger" type="button" aria-expanded="false" aria-controls="drawer" data-ar-label="القائمة" data-en-label="Menu" aria-label="القائمة">${I.menu}</button>
        </div>
      </div>
    </header>`;
  }

  function buildDrawer(activeNav) {
    const link = (href, ar, en, key) =>
      `<a class="store-drawer__link"${key === activeNav ? ' aria-current="page"' : ""} href="${href}">${bi(ar, en)}</a>`;
    return `
    <div class="store-scrim" id="scrim" hidden></div>
    <aside class="store-drawer" id="drawer" aria-label="القائمة" aria-hidden="true" hidden>
      <div class="store-drawer__head">
        <span class="store-wordmark">${wordmark()}</span>
        <button class="store-iconbtn" id="drawer-close" type="button" data-ar-label="إغلاق" data-en-label="Close" aria-label="إغلاق">${I.close}</button>
      </div>
      <nav class="store-drawer__nav" aria-label="التصنيفات">
        ${link("/shop/perfumes", "العطور", "Perfumes", "perfumes")}
        ${link("/shop/clothing", "الملابس", "Clothing", "clothing")}
        ${link("/shop/sneakers", "الأحذية", "Sneakers", "sneakers")}
        ${link("/account?tab=wishlist", "المفضلة", "Wishlist")}
        ${link("/account", "حسابي", "Account")}
      </nav>
      <div class="store-drawer__foot">
        <a class="store-footer__whatsapp" href="https://wa.me/" target="_blank" rel="noopener">${I.whatsapp}${bi("تواصل عبر واتساب", "Chat on WhatsApp")}</a>
      </div>
    </aside>`;
  }

  function buildFooter() {
    const fcol = (h, links) =>
      `<div class="store-footer__col"><h4>${h}</h4><ul>${links}</ul></div>`;
    const fl = (href, ar, en) => `<li><a href="${href}">${bi(ar, en)}</a></li>`;
    return `
    <footer class="store-footer">
      <div class="store-container">
        <div class="store-footer__grid">
          <div class="store-footer__brand">
            <span class="store-wordmark">${wordmark()}</span>
            <p class="store-footer__tagline">${bi("عطور وأزياء وأحذية مصرية فاخرة، تجمع تراث الماضي بفخامة الحاضر.", "Egyptian perfume, clothing, and footwear, joining the heritage of the past to the luxury of the present.")}</p>
          </div>
          ${fcol(bi("تسوّق", "Shop"),
            fl("/shop/perfumes", "العطور", "Perfumes") + fl("/shop/clothing", "الملابس", "Clothing") + fl("/shop/sneakers", "الأحذية", "Sneakers") + fl("/account?tab=wishlist", "المفضلة", "Wishlist"))}
          ${fcol(bi("المساعدة", "Help"),
            fl("/help/ordering", "كيف أطلب", "How to order") + fl("/help/shipping", "الشحن والدفع عند الاستلام", "Shipping &amp; cash on delivery") + fl("/help/returns", "الإرجاع والاستبدال", "Returns &amp; exchanges") + fl("/account", "حسابي", "My account"))}
          <div class="store-footer__col">
            <h4>${bi("تواصل", "Contact")}</h4>
            <a class="store-footer__whatsapp" href="https://wa.me/" target="_blank" rel="noopener">${I.whatsapp}${bi("تواصل عبر واتساب", "Chat on WhatsApp")}</a>
            <p class="store-footer__note">${bi("الدفع عند الاستلام في كل محافظات مصر.", "Cash on delivery across every Egyptian governorate.")}</p>
          </div>
        </div>
        <div class="store-footer__bar">
          ${bi("© ٢٠٢٦ تِبْر. كل الحقوق محفوظة.", "© 2026 Tibr. All rights reserved.")}
          <span>${bi("صُنع في القاهرة", "Made in Cairo")}</span>
        </div>
      </div>
    </footer>`;
  }

  function buildToast() {
    return `
    <div class="store-toast" id="toast" role="status" aria-live="polite">
      <span class="store-toast__icon">${I.check}</span>
      <span class="store-toast__msg" id="toast-msg"></span>
    </div>`;
  }

  function injectChrome() {
    const activeNav = document.body.dataset.nav || "";
    if (!$(".store-header")) {
      const markup = buildHeader(activeNav) + buildDrawer(activeNav);
      const skip = $(".skip-link");
      // Keep the skip link as the first focusable element.
      if (skip) skip.insertAdjacentHTML("afterend", markup);
      else document.body.insertAdjacentHTML("afterbegin", markup);
    }
    if (!$(".store-footer")) {
      document.body.insertAdjacentHTML("beforeend", buildFooter());
    }
    if (!$("#toast")) {
      document.body.insertAdjacentHTML("beforeend", buildToast());
    }
  }

  /* ============================ LANGUAGE ============================ */
  const LANG_KEY = "tibr-lang";
  let currentLang = localStorage.getItem(LANG_KEY) || document.documentElement.lang || "ar";

  function applyLang(lang) {
    const root = document.documentElement;
    root.setAttribute("lang", lang);
    root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");

    const tAr = document.body.dataset.titleAr, tEn = document.body.dataset.titleEn;
    if (tAr && tEn) document.title = lang === "ar" ? tAr : tEn;

    $$("[data-ar-label]").forEach((el) => el.setAttribute("aria-label", el.getAttribute(`data-${lang}-label`)));
    $$("[data-ar-alt]").forEach((el) => el.setAttribute("alt", el.getAttribute(`data-${lang}-alt`)));
    $$("[data-ar-ph]").forEach((el) => el.setAttribute("placeholder", el.getAttribute(`data-${lang}-ph`)));
    $$("select[data-ar]").forEach((sel) => {
      let labels; try { labels = JSON.parse(sel.getAttribute(`data-${lang}`)); } catch (_) { return; }
      Array.from(sel.options).forEach((o, i) => { if (labels[i] != null) o.textContent = labels[i]; });
    });

    const langText = $(".lang-text");
    if (langText) langText.textContent = lang === "ar" ? "EN" : "العربية";

    document.dispatchEvent(new CustomEvent("languageChanged", { detail: { lang } }));
  }

  function toggleLang() {
    currentLang = currentLang === "ar" ? "en" : "ar";
    localStorage.setItem(LANG_KEY, currentLang);
    document.body.classList.add("no-transitions");
    applyLang(currentLang);
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove("no-transitions")));
  }

  /* ============================ TOAST + CART BADGE ============================ */
  let toastTimer = null;
  function toast(html) {
    const el = $("#toast"), msg = $("#toast-msg");
    if (!el || !msg) return;
    msg.innerHTML = html;
    el.classList.add("is-open");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-open"), 2800);
  }
  function syncCartBadge() {
    const el = $("#cart-count");
    if (!el) return;
    const n = cart.count();
    el.textContent = currentLang === "ar" ? arDigits(n) : String(n);
    el.classList.toggle("is-active", n > 0);
    el.setAttribute("aria-hidden", n > 0 ? "false" : "true");
  }
  function addToCart(item) {
    cart.add(item);
    const name = currentLang === "ar" ? item.ar_name : item.en_name;
    toast(currentLang === "ar" ? `أُضيف <strong>${name}</strong> إلى السلة` : `Added <strong>${name}</strong> to cart`);
  }

  /* ============================ HEADER CONDENSE ============================ */
  function wireHeader() {
    const header = $("#store-header");
    if (!header) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => { header.classList.toggle("is-scrolled", window.scrollY > 8); ticking = false; });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ============================ DRAWER ============================ */
  function wireDrawer() {
    const drawer = $("#drawer"), scrim = $("#scrim"), burger = $("#burger"), closeBtn = $("#drawer-close");
    if (!drawer || !burger) return;
    const focusables = () => $$('a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])', drawer)
      .filter((el) => el.offsetParent !== null);
    function open() {
      drawer.hidden = false; scrim.hidden = false;
      requestAnimationFrame(() => { drawer.classList.add("is-open"); scrim.classList.add("is-open"); });
      drawer.setAttribute("aria-hidden", "false");
      burger.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      const f = focusables(); if (f[0]) f[0].focus();
    }
    function close() {
      drawer.classList.remove("is-open"); scrim.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      burger.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      const finish = () => { drawer.hidden = true; scrim.hidden = true; };
      reduced ? finish() : setTimeout(finish, 400);
      burger.focus();
    }
    burger.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    scrim.addEventListener("click", close);
    drawer.addEventListener("keydown", (e) => {
      if (e.key === "Escape") return close();
      if (e.key !== "Tab") return;
      const f = focusables(); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    const desktop = window.matchMedia("(min-width: 56.0625rem)");
    (desktop.addEventListener ? desktop.addEventListener.bind(desktop, "change") : desktop.addListener.bind(desktop))(
      (e) => { if ((e.matches ?? desktop.matches) && !drawer.hidden) close(); });
  }

  /* ============================ WISHLIST (generic) ============================ */
  function wireWishlist() {
    $$(".product__wish, .pdp__wish, [data-wish]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        btn.setAttribute("aria-pressed", String(btn.getAttribute("aria-pressed") !== "true"));
      });
    });
  }

  /* ============================ INIT ============================ */
  injectChrome();
  applyLang(currentLang);
  const langBtn = $("#lang-switch");
  if (langBtn) langBtn.addEventListener("click", toggleLang);
  wireHeader();
  wireDrawer();
  wireWishlist();
  syncCartBadge();
  document.addEventListener("cartChanged", syncCartBadge);
  document.addEventListener("languageChanged", syncCartBadge);

  /* ============================ PUBLIC API ============================ */
  window.RB = {
    lang: () => currentLang,
    cart, orders, toast, addToCart, formatPrice, arDigits,
    reduced
  };
})();
