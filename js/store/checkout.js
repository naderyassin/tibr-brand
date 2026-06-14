/* -------------------------------------------------------------
 * STORE / CHECKOUT.JS — Checkout page
 * Auth-guarded. Posts cart to /api/checkout.
 * Depends on chrome.js (window.RB) + session.js (RB.supabase).
 * ------------------------------------------------------------- */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  if (!window.RB) return;

  // Normalize Arabic-Indic digits to Latin so pasted phone numbers still validate.
  var toLatinDigits = function (s) { return String(s).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x0660; }); };

  var form       = $("#checkout-form");
  var emptyEl    = $("#checkout-empty");
  var successEl  = $("#checkout-success");
  var summaryEl  = $("#checkout-summary");
  var _token     = null;

  function showState() {
    var has = RB.cart.items().length > 0;
    if (emptyEl)   emptyEl.hidden  =  has;
    if (form)      form.hidden     = !has;
  }

  function renderSummary() {
    if (!summaryEl) return;
    var items    = RB.cart.items();
    var subtotal = RB.cart.subtotal();
    var count    = RB.cart.count();
    summaryEl.innerHTML =
      "<h2 class='summary__title'>Order summary</h2>" +
      items.map(function (it) {
        return "<div class='summary__row'>" +
          "<span>" + (it.en_name || it.ar_name || "") + (it.size ? " · " + it.size : "") +
          " ×" + it.qty + "</span>" +
          "<span class='val'>" + RB.formatPrice(it.price * it.qty) + "</span>" +
          "</div>";
      }).join("") +
      "<div class='summary__row'><span>Items</span><span class='val'>" + count + "</span></div>" +
      "<div class='summary__row summary__row--total'><span>Total</span><span class='val'>" +
        RB.formatPrice(subtotal) + "</span></div>" +
      "<button class='btn btn--primary btn--block btn--lg' type='submit' id='place-order' style='margin-block-start:var(--sp-5)'>" +
        "Place order</button>" +
      "<p class='summary__note'>" +
        "By placing the order you agree to be contacted over WhatsApp to confirm delivery." +
      "</p>";
  }

  function setInvalid(field, invalid) {
    var wrap = field.closest(".field");
    if (wrap) wrap.classList.toggle("is-invalid", invalid);
    field.setAttribute("aria-invalid", invalid ? "true" : "false");
  }

  function validate() {
    var firstInvalid = null;
    var name = $("#co-name"), phone = $("#co-phone"), gov = $("#co-gov"), street = $("#co-street");
    var checks = [
      [name,   name.value.trim().length >= 2],
      [phone,  /^01[0125]\d{8}$/.test(toLatinDigits(phone.value).replace(/\s/g, ""))],
      [gov,    gov.value !== ""],
      [street, street.value.trim().length >= 4]
    ];
    checks.forEach(function (pair) {
      setInvalid(pair[0], !pair[1]);
      if (!pair[1] && !firstInvalid) firstInvalid = pair[0];
    });
    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  ["co-name", "co-phone", "co-gov", "co-street"].forEach(function (id) {
    var el = $("#" + id);
    if (!el) return;
    el.addEventListener("input",  function () { setInvalid(el, false); });
    if (el.tagName === "SELECT") el.addEventListener("change", function () { setInvalid(el, false); });
  });

  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) return;

    var btn = $("#place-order");
    if (btn) { btn.classList.add("is-loading"); btn.disabled = true; }

    var gov    = $("#co-gov").value;
    var city   = ($("#co-city") ? $("#co-city").value.trim() : "");
    var street = $("#co-street").value.trim();
    var fullAddress = [gov, city, street].filter(Boolean).join(", ");

    var payload = {
      items: RB.cart.items().map(function (it) { return { productId: it.id, size: it.size || null, qty: it.qty }; }),
      customer_name:    $("#co-name").value.trim(),
      customer_phone:   toLatinDigits($("#co-phone").value).replace(/\s/g, ""),
      customer_address: fullAddress,
      payment_method:   (form.payment ? form.payment.value : "cash_on_delivery")
    };

    fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + _token },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body }; }); })
      .then(function (result) {
        if (!result.ok) {
          var errMsg = (result.body && result.body.error) || "An error occurred.";
          RB.toast(errMsg);
          if (btn) { btn.classList.remove("is-loading"); btn.disabled = false; }
          return;
        }
        var ref = (result.body.data && result.body.data.checkout_reference) ||
                  ("RB-" + Math.random().toString(36).slice(2, 8).toUpperCase());
        RB.cart.clear();
        if (form)      form.hidden      = true;
        if (successEl) successEl.hidden = false;
        var refEl = $("#success-ref");
        if (refEl) refEl.textContent = ref;
        window.scrollTo({ top: 0, behavior: RB.reduced ? "auto" : "smooth" });
      })
      .catch(function () {
        RB.toast("Connection error.");
        if (btn) { btn.classList.remove("is-loading"); btn.disabled = false; }
      });
  });

  // ---- Init (auth-guarded) ----
  function init() {
    if (!RB.requireAuth) {
      location.replace("/login?next=/checkout");
      return;
    }
    RB.requireAuth("/checkout").then(function (session) {
      if (!session) return; // redirected
      _token = session.access_token;
      showState();
      renderSummary();
    });
  }

  init();
})();
