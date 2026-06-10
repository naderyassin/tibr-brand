/* -------------------------------------------------------------
 * STORE / ADMIN.JS — Orders control panel
 * Status filter, per-row status change, live stats.
 * Demo dataset is seeded locally (robabikia-admin-orders).
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
  const ORDER = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

  const KEY = "robabikia-admin-orders";
  const daysAgo = (d) => new Date(Date.now() - d * 864e5).toISOString();
  function seed() {
    return [
      { ref: "RB-A1001", name_ar: "منى حسن", name_en: "Mona Hassan", items_ar: "وردة الأناقة ×١", items_en: "Rose Elegance ×1", total: 350, date: daysAgo(0), status: "pending" },
      { ref: "RB-A1002", name_ar: "أحمد سمير", name_en: "Ahmed Samir", items_ar: "سر العود ×٢", items_en: "Oud Mystery ×2", total: 900, date: daysAgo(1), status: "confirmed" },
      { ref: "RB-A1003", name_ar: "ليلى مصطفى", name_en: "Layla Mostafa", items_ar: "ذاكرة الفل ×١", items_en: "Jasmine Memories ×1", total: 375, date: daysAgo(2), status: "shipped" },
      { ref: "RB-A1004", name_ar: "كريم عادل", name_en: "Karim Adel", items_ar: "سر العود ×١، وردة الأناقة ×١", items_en: "Oud Mystery ×1, Rose Elegance ×1", total: 800, date: daysAgo(4), status: "delivered" },
      { ref: "RB-A1005", name_ar: "سارة فؤاد", name_en: "Sara Fouad", items_ar: "ذاكرة الفل ×١", items_en: "Jasmine Memories ×1", total: 375, date: daysAgo(6), status: "cancelled" }
    ];
  }
  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || seed(); } catch (_) { return seed(); } }
  function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

  let orders = read();
  write(orders);
  let filter = "all";

  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString(ar() ? "ar-EG" : "en-GB", { month: "short", day: "numeric" }); }
    catch (_) { return ""; }
  }

  function renderStats() {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "pending").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const revenue = orders.filter((o) => o.status !== "cancelled").reduce((n, o) => n + o.total, 0);
    const stat = (val, gold, labAr, labEn) =>
      `<div class="stat"><p class="stat__value${gold ? " stat__value--gold" : ""}">${val}</p><p class="stat__label">${bi(labAr, labEn)}</p></div>`;
    $("#admin-stats").innerHTML =
      stat(ar() ? RB.arDigits(total) : total, false, "إجمالي الطلبات", "Total orders") +
      stat(ar() ? RB.arDigits(pending) : pending, false, "قيد المراجعة", "Pending") +
      stat(ar() ? RB.arDigits(delivered) : delivered, false, "تم التوصيل", "Delivered") +
      stat(bi(RB.formatPrice(revenue, "ar"), RB.formatPrice(revenue, "en")), true, "الإيرادات", "Revenue");
  }

  function statusSelect(o) {
    const opts = ORDER.map((s) =>
      `<option value="${s}"${s === o.status ? " selected" : ""}>${ar() ? STATUS[s].ar : STATUS[s].en}</option>`).join("");
    return `<select class="status-select" data-ref="${o.ref}" aria-label="${ar() ? "تغيير حالة الطلب" : "Change order status"}">${opts}</select>`;
  }

  function renderRows() {
    const rows = orders.filter((o) => filter === "all" || o.status === filter);
    const tbody = $("#admin-rows");
    const emptyWrap = $("#admin-empty");
    const tableWrap = $(".table-wrap");

    $("#admin-count").innerHTML = bi(`${RB.arDigits(rows.length)} طلب`, `${rows.length} orders`);

    if (!rows.length) {
      tbody.innerHTML = "";
      tableWrap.style.display = "none";
      emptyWrap.innerHTML = `
      <div class="rb-empty">
        <span class="rb-empty__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3" stroke-linecap="round"/></svg></span>
        <h3 class="rb-empty__title">${bi("لا طلبات بهذه الحالة", "No orders with this status")}</h3>
      </div>`;
      return;
    }
    tableWrap.style.display = "";
    emptyWrap.innerHTML = "";
    tbody.innerHTML = rows.map((o) => `
      <tr>
        <td class="num">${o.ref}</td>
        <td>${bi(o.name_ar, o.name_en)}</td>
        <td>${bi(o.items_ar, o.items_en)}</td>
        <td class="num">${bi(RB.formatPrice(o.total, "ar"), RB.formatPrice(o.total, "en"))}</td>
        <td>${fmtDate(o.date)}</td>
        <td>${statusSelect(o)}</td>
      </tr>`).join("");
  }

  function renderAll() { renderStats(); renderRows(); }

  // Status filter chips
  $$(".filter-chip[data-status]").forEach((chip) =>
    chip.addEventListener("click", () => {
      filter = chip.dataset.status;
      $$(".filter-chip[data-status]").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      renderRows();
    }));

  // Per-row status change
  $("#admin-rows").addEventListener("change", (e) => {
    const sel = e.target.closest(".status-select");
    if (!sel) return;
    const o = orders.find((x) => x.ref === sel.dataset.ref);
    if (!o) return;
    o.status = sel.value;
    write(orders);
    renderAll();
    RB.toast(ar() ? `تم تحديث حالة ${o.ref}` : `Updated ${o.ref}`);
  });

  document.addEventListener("languageChanged", renderAll);
  renderAll();
})();
