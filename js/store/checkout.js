/* -------------------------------------------------------------
 * STORE / CHECKOUT.JS — Checkout page
 * Summary from cart, inline validation, place order -> success.
 * Demo order is stored locally (RB.orders) for the account page.
 * Depends on chrome.js (window.RB).
 * ------------------------------------------------------------- */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  if (!window.RB) return;
  const bi = (ar, en) => `<span data-lang-ar>${ar}</span><span data-lang-en>${en}</span>`;
  const ar = () => RB.lang() === "ar";

  const toLatinDigits = (s) => String(s).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  const form = $("#checkout-form");
  const emptyEl = $("#checkout-empty");
  const successEl = $("#checkout-success");
  const summaryEl = $("#checkout-summary");

  function showState() {
    const has = RB.cart.items().length > 0;
    emptyEl.hidden = has;
    form.hidden = !has;
  }

  function renderSummary() {
    const items = RB.cart.items();
    const subtotal = RB.cart.subtotal();
    const count = RB.cart.count();
    summaryEl.innerHTML = `
      <h2 class="summary__title">${bi("ملخص الطلب", "Order summary")}</h2>
      ${items.map((it) => `
        <div class="summary__row">
          <span>${bi(it.ar_name, it.en_name)}${it.size ? " · " + it.size : ""} ×${ar() ? RB.arDigits(it.qty) : it.qty}</span>
          <span class="val">${bi(RB.formatPrice(it.price * it.qty, "ar"), RB.formatPrice(it.price * it.qty, "en"))}</span>
        </div>`).join("")}
      <div class="summary__row"><span>${bi("عدد القطع", "Items")}</span><span class="val">${ar() ? RB.arDigits(count) : count}</span></div>
      <div class="summary__row summary__row--total"><span>${bi("الإجمالي", "Total")}</span><span class="val">${bi(RB.formatPrice(subtotal, "ar"), RB.formatPrice(subtotal, "en"))}</span></div>
      <button class="btn btn--primary btn--block btn--lg" type="submit" id="place-order" style="margin-block-start: var(--sp-5);">${bi("تأكيد الطلب", "Place order")}</button>
      <p class="summary__note">${bi("بالضغط على تأكيد الطلب أنت توافق على التواصل عبر واتساب لتأكيد التوصيل.", "By placing the order you agree to be contacted over WhatsApp to confirm delivery.")}</p>`;
  }

  function setInvalid(field, invalid) {
    const wrap = field.closest(".field");
    if (wrap) wrap.classList.toggle("is-invalid", invalid);
    field.setAttribute("aria-invalid", invalid ? "true" : "false");
  }

  function validate() {
    let firstInvalid = null;
    const name = $("#co-name"), phone = $("#co-phone"), gov = $("#co-gov"), street = $("#co-street");

    const checks = [
      [name, name.value.trim().length >= 2],
      [phone, /^01[0125]\d{8}$/.test(toLatinDigits(phone.value).replace(/\s/g, ""))],
      [gov, gov.value !== ""],
      [street, street.value.trim().length >= 4]
    ];
    checks.forEach(([field, ok]) => {
      setInvalid(field, !ok);
      if (!ok && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  // Clear a field's error as the user corrects it
  ["co-name", "co-phone", "co-gov", "co-street"].forEach((id) => {
    const el = $("#" + id);
    if (el) el.addEventListener("input", () => setInvalid(el, false));
    if (el && el.tagName === "SELECT") el.addEventListener("change", () => setInvalid(el, false));
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate()) return;

    const btn = $("#place-order");
    btn.classList.add("is-loading");
    btn.disabled = true;

    setTimeout(() => {
      const ref = "RB-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      const items = RB.cart.items();
      RB.orders.add({
        ref,
        date: new Date().toISOString(),
        status: "pending",
        payment: form.payment.value,
        total: RB.cart.subtotal(),
        customer: {
          name: $("#co-name").value.trim(),
          phone: $("#co-phone").value.trim(),
          governorate: $("#co-gov").value,
          city: $("#co-city").value.trim(),
          street: $("#co-street").value.trim()
        },
        items: items.map((it) => ({ id: it.id, ar_name: it.ar_name, en_name: it.en_name, size: it.size, qty: it.qty, price: it.price, image: it.image }))
      });
      RB.cart.clear();

      form.hidden = true;
      successEl.hidden = false;
      $("#success-ref").textContent = ref;
      window.scrollTo({ top: 0, behavior: RB.reduced ? "auto" : "smooth" });
    }, 700);
  });

  document.addEventListener("languageChanged", () => { if (!form.hidden) renderSummary(); });

  showState();
  renderSummary();
})();
