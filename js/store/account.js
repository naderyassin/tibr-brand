/* -------------------------------------------------------------
 * STORE / ACCOUNT.JS — Account dashboard
 * Tab switching, orders (from RB.orders), profile, addresses.
 * Depends on chrome.js (window.RB).
 * ------------------------------------------------------------- */
(function () {
  "use strict";
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  if (!window.RB) return;
  const bi = (ar, en) => `<span data-lang-ar>${ar}</span><span data-lang-en>${en}</span>`;
  const ar = () => RB.lang() === "ar";

  const STATUS = {
    pending:   { ar: "قيد المراجعة", en: "Pending" },
    confirmed: { ar: "مؤكّد", en: "Confirmed" },
    shipped:   { ar: "في الطريق", en: "Shipped" },
    delivered: { ar: "تم التوصيل", en: "Delivered" },
    cancelled: { ar: "ملغي", en: "Cancelled" }
  };

  /* ---- Greeting + profile prefill ---- */
  const email = (function () { try { return localStorage.getItem("robabikia-auth") || ""; } catch (_) { return ""; } })();
  const greet = $("#account-greeting");
  if (greet) greet.innerHTML = email
    ? bi(`مرحبًا، ${email}`, `Welcome, ${email}`)
    : bi("أهلاً بك في حسابك.", "Welcome to your account.");
  if ($("#pf-email")) $("#pf-email").value = email;

  /* ---- Tabs ---- */
  const TABS = ["profile", "orders", "addresses", "wishlist"];
  function activate(tab) {
    if (!TABS.includes(tab)) tab = "profile";
    $$(".dash-nav__item[data-tab]").forEach((b) =>
      b.setAttribute("aria-current", String(b.dataset.tab === tab)));
    $$(".dash-panel").forEach((p) => p.classList.toggle("is-active", p.dataset.panel === tab));
    try { history.replaceState(null, "", "?tab=" + tab); } catch (_) {}
  }
  $$(".dash-nav__item[data-tab]").forEach((b) =>
    b.addEventListener("click", () => activate(b.dataset.tab)));
  activate(new URLSearchParams(location.search).get("tab") || "profile");

  /* ---- Logout ---- */
  $("#logout-btn").addEventListener("click", () => {
    try { localStorage.removeItem("robabikia-auth"); } catch (_) {}
    location.href = "/login";
  });

  /* ---- Profile save ---- */
  $("#profile-form").addEventListener("submit", (e) => {
    e.preventDefault();
    RB.toast(ar() ? "تم حفظ التغييرات" : "Changes saved");
  });

  /* ---- Orders ---- */
  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString(ar() ? "ar-EG" : "en-GB", { year: "numeric", month: "short", day: "numeric" }); }
    catch (_) { return ""; }
  }
  function renderOrders() {
    const list = $("#orders-list");
    const orders = RB.orders.all();
    if (!orders.length) {
      list.innerHTML = `
      <div class="rb-empty">
        <span class="rb-empty__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M6 7h12l-1 13H7L6 7z" stroke-linejoin="round"/><path d="M9 7V5.5a3 3 0 0 1 6 0V7" stroke-linecap="round"/></svg></span>
        <h3 class="rb-empty__title">${bi("لا طلبات بعد", "No orders yet")}</h3>
        <p class="rb-empty__text">${bi("أول طلب يبدأ من هنا.", "Your first order starts here.")}</p>
        <a class="btn btn--primary" href="/shop/perfumes">${bi("تصفّح العطور", "Browse perfumes")}</a>
      </div>`;
      return;
    }
    list.innerHTML = orders.map((o) => {
      const st = STATUS[o.status] || STATUS.pending;
      const lead = o.items[0] || {};
      const count = o.items.reduce((n, x) => n + x.qty, 0);
      return `
      <article class="order-card">
        <img class="order-card__thumb" src="${lead.image || ""}" alt="${ar() ? (lead.ar_name || "") : (lead.en_name || "")}">
        <div>
          <p class="order-card__name">${bi(lead.ar_name || "", lead.en_name || "")}${count > 1 ? bi(` و${RB.arDigits(count - 1)} غير ذلك`, ` and ${count - 1} more`) : ""}</p>
          <p class="order-card__meta">${o.ref} · ${fmtDate(o.date)}</p>
        </div>
        <div class="order-card__side">
          <span class="badge badge--${o.status}">${bi(st.ar, st.en)}</span>
          <span class="order-card__price">${bi(RB.formatPrice(o.total, "ar"), RB.formatPrice(o.total, "en"))}</span>
        </div>
      </article>`;
    }).join("");
  }

  /* ---- Addresses ---- */
  const ADDR_KEY = "robabikia-addresses";
  function readAddr() { try { return JSON.parse(localStorage.getItem(ADDR_KEY)) || seed(); } catch (_) { return seed(); } }
  function seed() {
    const s = [{ id: "a1", label_ar: "المنزل", label_en: "Home", street: ar() ? "شارع المعز، الجمالية، القاهرة" : "Al-Muizz St, Gamaleya, Cairo", phone: "01012345678", default: true }];
    return s;
  }
  function writeAddr(list) { localStorage.setItem(ADDR_KEY, JSON.stringify(list)); }
  function renderAddresses() {
    const list = readAddr();
    const wrap = $("#addresses-list");
    wrap.innerHTML = list.map((a) => `
      <div class="address-card${a.default ? " is-default" : ""}" data-id="${a.id}">
        <div class="address-card__label">
          <span class="address-card__name">${a.label_ar ? bi(a.label_ar, a.label_en || a.label_ar) : (a.label || "")}</span>
          ${a.default ? `<span class="badge badge--shipped">${bi("الافتراضي", "Default")}</span>` : ""}
        </div>
        <p class="address-card__body">${a.street}<br>${a.phone || ""}</p>
        <div style="display:flex; gap: var(--sp-3); margin-block-start: var(--sp-3);">
          ${a.default ? "" : `<button class="auth__link" type="button" data-default style="background:none;border:none;cursor:pointer;font-size:var(--fs-sm)">${bi("اجعله افتراضيًا", "Make default")}</button>`}
          <button class="cart-line__remove" type="button" data-del>${bi("حذف", "Delete")}</button>
        </div>
      </div>`).join("");
  }
  const addrForm = $("#address-form");
  $("#add-address-btn").addEventListener("click", () => { addrForm.hidden = !addrForm.hidden; if (!addrForm.hidden) $("#ad-street").focus(); });
  $("#cancel-address").addEventListener("click", () => { addrForm.hidden = true; });
  addrForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const street = $("#ad-street");
    const ok = street.value.trim().length >= 4;
    street.closest(".field").classList.toggle("is-invalid", !ok);
    if (!ok) { street.focus(); return; }
    const list = readAddr();
    list.push({ id: "a" + Date.now(), label: $("#ad-label").value.trim() || (ar() ? "عنوان" : "Address"), street: street.value.trim(), phone: $("#ad-phone").value.trim(), default: list.length === 0 });
    writeAddr(list);
    addrForm.reset(); addrForm.hidden = true;
    renderAddresses();
    RB.toast(ar() ? "تمت إضافة العنوان" : "Address added");
  });
  $("#addresses-list").addEventListener("click", (e) => {
    const card = e.target.closest(".address-card"); if (!card) return;
    const id = card.dataset.id; let list = readAddr();
    if (e.target.closest("[data-del]")) { list = list.filter((a) => a.id !== id); }
    else if (e.target.closest("[data-default]")) { list.forEach((a) => a.default = a.id === id); }
    else return;
    writeAddr(list); renderAddresses();
  });

  renderOrders();
  renderAddresses();
  document.addEventListener("languageChanged", () => { renderOrders(); renderAddresses(); });
})();
