/* -------------------------------------------------------------
 * STORE / CHECKOUT.JS — Checkout page
 * Auth-guarded. Posts cart to /api/checkout.
 * Depends on chrome.js (window.RB) + session.js (RB.supabase).
 * ------------------------------------------------------------- */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  if (!window.RB) return;

  var toLatinDigits = function (s) { return String(s).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x0660; }); };

  var form          = $("#checkout-form");
  var successEl     = $("#checkout-success");
  var summaryEl     = $("#checkout-summary");
  var _token        = null;
  var _profile      = null;
  var _addresses    = [];
  var _selectedAddr = null;

  function showState() {
    if (form) form.hidden = false;
  }

  /* ── Auto-fill name + phone from profile ── */
  function autoFillContact() {
    if (!_profile) return;
    var nameEl  = $("#co-name");
    var phoneEl = $("#co-phone");
    if (nameEl  && _profile.full_name    && !nameEl.value)  { nameEl.value  = _profile.full_name;    setInvalid(nameEl,  false); }
    if (phoneEl && _profile.phone_number && !phoneEl.value) { phoneEl.value = _profile.phone_number; setInvalid(phoneEl, false); }
  }

  /* ── Address picker ── */
  function selectAddress(id) {
    var addr = _addresses.find(function (a) { return a.id === id; });
    if (!addr) return;
    _selectedAddr = addr;
    var picker = $("#co-addr-picker");
    if (picker) {
      picker.querySelectorAll(".co-addr-card").forEach(function (card) {
        var sel = card.dataset.id === id;
        card.classList.toggle("is-selected", sel);
        card.setAttribute("aria-checked", sel ? "true" : "false");
      });
    }
    var addrField = $("#co-addr-field");
    if (addrField) addrField.classList.remove("is-invalid");
  }

  function renderAddressPicker() {
    var picker = $("#co-addr-picker");
    if (!picker) return;

    if (_addresses.length === 0) {
      picker.innerHTML =
        "<p class='co-addr-empty'>No saved addresses. " +
        "<a href='/account?tab=addresses'>Add one in your account →</a></p>";
      return;
    }

    picker.innerHTML = _addresses.map(function (a) {
      var govText = a.governorate || a.city || "";
      return "<button type='button' class='co-addr-card' role='radio' aria-checked='false' data-id='" + a.id + "'>" +
        "<span class='co-addr-card__check' aria-hidden='true'>" +
          "<svg viewBox='0 0 12 12' fill='none' stroke='currentColor' stroke-width='2.2'><path d='M2 6.5l2.5 2.5 5-5' stroke-linecap='round' stroke-linejoin='round'/></svg>" +
        "</span>" +
        "<span class='co-addr-card__body'>" +
          "<span class='co-addr-card__top'>" +
            "<span class='co-addr-card__label'>" + (a.label || "Address") + "</span>" +
            (a.is_default ? "<span class='co-addr-card__badge'>Default</span>" : "") +
          "</span>" +
          (govText ? "<span class='co-addr-card__gov'>" + govText + "</span>" : "") +
          "<span class='co-addr-card__street'>" + (a.street || "") + "</span>" +
          (a.phone ? "<span class='co-addr-card__phone'>" + a.phone + "</span>" : "") +
        "</span>" +
      "</button>";
    }).join("");

    picker.addEventListener("click", function (e) {
      var card = e.target.closest(".co-addr-card");
      if (!card) return;
      selectAddress(card.dataset.id);
    });

    var def = _addresses.find(function (a) { return a.is_default; }) || _addresses[0];
    if (def) selectAddress(def.id);
  }

  function loadAddresses() {
    var picker = $("#co-addr-picker");
    if (picker) picker.innerHTML = "<p class='co-addr-empty' style='opacity:.5'>Loading addresses…</p>";
    fetch("/api/profile/addresses", { headers: { Authorization: "Bearer " + _token } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (body) {
        _addresses = (body && body.data) || [];
        renderAddressPicker();
      })
      .catch(function () {
        var p = $("#co-addr-picker");
        if (p) p.innerHTML = "<p class='co-addr-empty'>Could not load addresses. <a href='/account?tab=addresses'>Go to account →</a></p>";
      });
  }

  /* ── Order summary ── */
  function renderSummary() {
    if (!summaryEl) return;
    var items    = RB.cart.items();
    var subtotal = RB.cart.subtotal();
    var itemsHtml = items.map(function (it) {
      var imgHtml = it.image
        ? "<img class='summary__item-img' src='" + it.image + "' alt='' loading='lazy'>"
        : "<div class='summary__item-img summary__item-img--empty'></div>";
      var meta = [it.size, it.qty > 1 ? "×" + it.qty : ""].filter(Boolean).join(" · ");
      return "<div class='summary__item'>" +
        imgHtml +
        "<div class='summary__item-info'>" +
          "<span class='summary__item-name'>" + (it.en_name || it.ar_name || "") + "</span>" +
          (meta ? "<span class='summary__item-meta'>" + meta + "</span>" : "") +
        "</div>" +
        "<span class='summary__item-price'>" + RB.formatPrice(it.price * it.qty) + "</span>" +
        "</div>";
    }).join("");
    summaryEl.innerHTML =
      "<h2 class='summary__title'>Order summary</h2>" +
      "<div class='summary__items'>" + itemsHtml + "</div>" +
      "<div class='summary__divider'></div>" +
      "<div class='summary__row'><span>Subtotal</span><span class='val'>" + RB.formatPrice(subtotal) + "</span></div>" +
      "<div class='summary__row'><span>Delivery</span><span class='val summary__free'>Free</span></div>" +
      "<div class='summary__row summary__row--total'><span>Total</span><span class='val'>" + RB.formatPrice(subtotal) + "</span></div>" +
      "<button class='btn btn--primary btn--block btn--lg' type='submit' id='place-order' style='margin-block-start:var(--sp-5)'>Place order</button>" +
      "<p class='summary__note'>By placing the order you agree to be contacted over WhatsApp to confirm delivery.</p>";
  }

  /* ── Validation ── */
  function setInvalid(field, invalid) {
    var wrap = field.closest(".field");
    if (wrap) wrap.classList.toggle("is-invalid", invalid);
    field.setAttribute("aria-invalid", invalid ? "true" : "false");
  }

  function validate() {
    var firstInvalid = null;
    var name  = $("#co-name");
    var phone = $("#co-phone");

    var checks = [
      [name,  name  && name.value.trim().length >= 2],
      [phone, phone && /^01[0125]\d{8}$/.test(toLatinDigits(phone.value).replace(/\s/g, ""))]
    ];
    checks.forEach(function (pair) {
      if (!pair[0]) return;
      setInvalid(pair[0], !pair[1]);
      if (!pair[1] && !firstInvalid) firstInvalid = pair[0];
    });

    var addrField = $("#co-addr-field");
    if (!_selectedAddr) {
      if (_addresses.length === 0) {
        RB.toast("Please add a delivery address in your account first.");
        return false;
      }
      if (addrField) addrField.classList.add("is-invalid");
      if (!firstInvalid) firstInvalid = addrField;
    }

    if (firstInvalid && firstInvalid.focus) firstInvalid.focus();
    return !firstInvalid;
  }

  ["co-name", "co-phone"].forEach(function (id) {
    var el = $("#" + id);
    if (!el) return;
    el.addEventListener("input", function () { setInvalid(el, false); });
  });

  /* ── Form submit ── */
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) return;

    var btn = $("#place-order");
    if (btn) { btn.classList.add("is-loading"); btn.disabled = true; }

    var gov        = _selectedAddr ? (_selectedAddr.governorate || _selectedAddr.city || "") : "";
    var city       = _selectedAddr ? (_selectedAddr.city || "") : "";
    var street     = _selectedAddr ? (_selectedAddr.street || "") : "";
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

  /* ── Init (auth-guarded) ── */
  function init() {
    if (!RB.requireAuth) {
      location.replace("/login?next=/checkout");
      return;
    }
    RB.requireAuth("/checkout").then(function (session) {
      if (!session) return;
      _token = session.access_token;
      showState();
      renderSummary();
      fetch("/api/profile", { headers: { Authorization: "Bearer " + _token } })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (body) { _profile = (body && body.data) || null; autoFillContact(); })
        .catch(function () { _profile = null; });
      loadAddresses();
    });
  }

  init();
})();
