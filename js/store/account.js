/* -------------------------------------------------------------
 * STORE / ACCOUNT.JS — Account dashboard
 * Auth-guarded. Loads profile + orders from real API.
 * Depends on chrome.js (window.RB) + session.js (RB.supabase).
 * ------------------------------------------------------------- */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.from((c || document).querySelectorAll(s)); };
  if (!window.RB) return;

  var STATUS = {
    pending:   "Pending",
    confirmed: "Confirmed",
    shipped:   "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled"
  };

  var _token = null;

  // ---- Tabs ----
  function setupTabs() {
    var TABS = ["profile", "orders", "wishlist"];
    function activate(tab) {
      if (TABS.indexOf(tab) === -1) tab = "profile";
      $$(".dash-nav__item[data-tab]").forEach(function (b) {
        b.setAttribute("aria-current", String(b.dataset.tab === tab));
      });
      $$(".dash-panel").forEach(function (p) {
        p.classList.toggle("is-active", p.dataset.panel === tab);
      });
      try { history.replaceState(null, "", "?tab=" + tab); } catch (_) {}
    }
    $$(".dash-nav__item[data-tab]").forEach(function (b) {
      b.addEventListener("click", function () { activate(b.dataset.tab); });
    });
    activate(new URLSearchParams(location.search).get("tab") || "profile");
  }

  // ---- Profile ----
  function loadProfile() {
    fetch("/api/profile", { headers: { "Authorization": "Bearer " + _token } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (body) {
        if (!body || !body.data) return;
        var d = body.data;
        if (d.full_name    && $("#pf-name"))    $("#pf-name").value    = d.full_name;
        if (d.phone_number && $("#pf-phone"))   $("#pf-phone").value   = d.phone_number;
        if (d.gender       && $("#pf-gender"))  $("#pf-gender").value  = d.gender;
        if (d.date_of_birth && $("#pf-dob"))    $("#pf-dob").value     = d.date_of_birth;
        if (d.address      && $("#pf-address")) $("#pf-address").value = d.address;
        if (d.role === "admin") {
          var adminTab = $("#admin-tab");
          if (adminTab) adminTab.hidden = false;
        }
      })
      .catch(function () {});
  }

  function setupProfileForm() {
    var form = $("#profile-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; btn.classList.add("is-loading"); }
      fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + _token },
        body: JSON.stringify({
          full_name:     ($("#pf-name")    ? $("#pf-name").value.trim()    : ""),
          phone_number:  ($("#pf-phone")   ? $("#pf-phone").value.trim()   : ""),
          gender:        ($("#pf-gender")  ? $("#pf-gender").value         : ""),
          date_of_birth: ($("#pf-dob")     ? $("#pf-dob").value            : ""),
          address:       ($("#pf-address") ? $("#pf-address").value.trim() : "")
        })
      })
        .then(function (r) {
          RB.toast(r.ok ? "Changes saved" : "Error saving changes");
        })
        .catch(function () { RB.toast("Error saving changes"); })
        .finally(function () { if (btn) { btn.disabled = false; btn.classList.remove("is-loading"); } });
    });
  }

  // ---- Orders ----
  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" }); }
    catch (_) { return ""; }
  }

  function renderOrders() {
    var list = $("#orders-list");
    if (!list) return;
    list.innerHTML = "<div class='dash-loading'><span>Loading…</span></div>";
    fetch("/api/orders", { headers: { "Authorization": "Bearer " + _token } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (body) {
        var orders = (body && body.data) ? body.data : [];
        if (!orders.length) {
          list.innerHTML =
            "<div class='rb-empty'>" +
            "<span class='rb-empty__icon'><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.3' aria-hidden='true'><path d='M6 7h12l-1 13H7L6 7z' stroke-linejoin='round'/><path d='M9 7V5.5a3 3 0 0 1 6 0V7' stroke-linecap='round'/></svg></span>" +
            "<h3 class='rb-empty__title'>No orders yet</h3>" +
            "<p class='rb-empty__text'>Your first order starts here.</p>" +
            "<a class='btn btn--primary' href='/shop/perfumes'>Browse perfumes</a>" +
            "</div>";
          return;
        }
        list.innerHTML = orders.map(function (o) {
          var st = STATUS[o.status] || STATUS.pending;
          var product = o.products || {};
          var price = o.order_total != null ? o.order_total : (o.unit_price ? o.unit_price * (o.qty || 1) : 0);
          var ref = o.checkout_reference || o.id.slice(0, 8);
          return "<article class='order-card'>" +
            (product.image ? "<img class='order-card__thumb' src='" + product.image + "' alt='" + (product.en_name || "") + "'>" : "") +
            "<div>" +
              "<p class='order-card__name'>" + (product.en_name || "") + "</p>" +
              "<p class='order-card__meta'>" + ref + " · " + fmtDate(o.created_at) + "</p>" +
            "</div>" +
            "<div class='order-card__side'>" +
              "<span class='badge badge--" + o.status + "'>" + st + "</span>" +
              (price ? "<span class='order-card__price'>" + RB.formatPrice(price) + "</span>" : "") +
            "</div>" +
            "</article>";
        }).join("");
      })
      .catch(function () {
        list.innerHTML = "<p>Failed to load orders.</p>";
      });
  }

  // ---- Change Password Modal ----
  var _pwTrigger = null;

  function openPwModal() {
    var modal = $("#pw-modal");
    if (!modal) return;
    modal.classList.remove("is-closing");
    modal.classList.add("is-open");
    setTimeout(function () {
      var f = $("#pw-current");
      if (f) f.focus();
    }, 60);
  }

  function closePwModal() {
    var modal = $("#pw-modal");
    if (!modal || !modal.classList.contains("is-open")) return;
    modal.classList.add("is-closing");
    setTimeout(function () {
      modal.classList.remove("is-open", "is-closing");
      if (_pwTrigger) _pwTrigger.focus();
    }, 300);
  }

  function setupPasswordForm() {
    var modal     = $("#pw-modal");
    var form      = $("#password-form");
    var trigger   = $("#change-pw-btn");
    var closeBtn  = $("#pw-modal-close");
    if (!modal || !form) return;

    _pwTrigger = trigger;

    if (trigger) trigger.addEventListener("click", openPwModal);

    if (closeBtn) closeBtn.addEventListener("click", closePwModal);

    modal.addEventListener("click", function (e) {
      if (e.target === modal) closePwModal();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal.classList.contains("is-open")) closePwModal();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var currentPw = $("#pw-current");
      var newPw     = $("#pw-new");
      var confirmPw = $("#pw-confirm");

      var ok = true;
      currentPw.closest(".field").classList.remove("is-invalid");
      newPw.closest(".field").classList.remove("is-invalid");
      confirmPw.closest(".field").classList.remove("is-invalid");

      if (!currentPw.value) { currentPw.closest(".field").classList.add("is-invalid"); ok = false; }
      if (newPw.value.length < 8) { newPw.closest(".field").classList.add("is-invalid"); ok = false; }
      if (confirmPw.value !== newPw.value) { confirmPw.closest(".field").classList.add("is-invalid"); ok = false; }
      if (!ok) return;

      var btn = form.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; btn.classList.add("is-loading"); }

      var email = ($("#pf-email") ? $("#pf-email").value : "");

      RB.supabase.auth.signInWithPassword({ email: email, password: currentPw.value })
        .then(function (res) {
          if (res.error) {
            currentPw.closest(".field").classList.add("is-invalid");
            if (btn) { btn.disabled = false; btn.classList.remove("is-loading"); }
            return;
          }
          return RB.supabase.auth.updateUser({ password: newPw.value })
            .then(function (upd) {
              if (btn) { btn.disabled = false; btn.classList.remove("is-loading"); }
              if (upd.error) {
                RB.toast("Error changing password");
              } else {
                form.reset();
                closePwModal();
                RB.toast("Password changed successfully");
              }
            });
        })
        .catch(function () {
          RB.toast("Error changing password");
          if (btn) { btn.disabled = false; btn.classList.remove("is-loading"); }
        });
    });
  }

  // ---- Init (auth-guarded) ----
  function init() {
    if (!RB.requireAuth) {
      // session.js not loaded — redirect to login
      location.replace("/login?next=" + encodeURIComponent(location.pathname + location.search));
      return;
    }
    RB.requireAuth().then(function (session) {
      if (!session) return; // already redirected
      _token = session.access_token;
      var email = (session.user && session.user.email) || "";

      var greet = $("#account-greeting");
      if (greet) greet.textContent = email ? "Welcome, " + email : "Welcome to your account.";
      if ($("#pf-email")) $("#pf-email").value = email;

      setupTabs();
      loadProfile();
      setupProfileForm();
      setupPasswordForm();
      renderOrders();

      var logoutBtn = $("#logout-btn");
      if (logoutBtn) logoutBtn.addEventListener("click", function () { RB.signOut(); });
    });
  }

  init();
})();
