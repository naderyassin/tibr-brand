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
    var TABS = ["profile", "orders", "wishlist", "addresses"];
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
          date_of_birth: ($("#pf-dob")     ? $("#pf-dob").value            : "")
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
        var rows = (body && body.data) ? body.data : [];
        if (!rows.length) {
          list.innerHTML =
            "<div class='rb-empty'>" +
            "<span class='rb-empty__icon'><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.3' aria-hidden='true'><path d='M6 7h12l-1 13H7L6 7z' stroke-linejoin='round'/><path d='M9 7V5.5a3 3 0 0 1 6 0V7' stroke-linecap='round'/></svg></span>" +
            "<h3 class='rb-empty__title'>No orders yet</h3>" +
            "<p class='rb-empty__text'>Your first order starts here.</p>" +
            "<a class='btn btn--primary' href='/shop/perfumes'>Browse perfumes</a>" +
            "</div>";
          return;
        }

        // Group line-items by checkout_reference (fall back to row id for legacy single-item orders)
        var groupKeys = [];
        var groupMap  = {};
        rows.forEach(function (row) {
          var key = row.checkout_reference || row.id;
          if (!groupMap[key]) { groupMap[key] = []; groupKeys.push(key); }
          groupMap[key].push(row);
        });

        list.innerHTML = groupKeys.map(function (key) {
          var items  = groupMap[key];
          var first  = items[0];
          var status = first.status || "pending";
          var st     = STATUS[status] || STATUS.pending;
          var total  = items.reduce(function (sum, r) {
            return sum + (r.unit_price ? r.unit_price * (r.qty || 1) : 0);
          }, 0);
          var itemCount = items.reduce(function (sum, r) { return sum + (r.qty || 1); }, 0);
          var displayRef = first.checkout_reference || first.id.slice(0, 8).toUpperCase();

          // Up to 3 stacked thumbnails
          var thumbsHtml = items.slice(0, 3).map(function (r) {
            var p = r.products || {};
            return p.image
              ? "<img class='order-card__thumb' src='" + p.image + "' alt=''>"
              : "<div class='order-card__thumb order-card__thumb--empty'></div>";
          }).join("");

          // Expanded item rows
          var itemsHtml = items.map(function (r) {
            var p = r.products || {};
            var itemPrice = r.unit_price ? r.unit_price * (r.qty || 1) : 0;
            var meta = [r.size, (r.qty || 1) > 1 ? "×" + (r.qty || 1) : ""].filter(Boolean).join(" · ");
            return "<div class='order-item'>" +
              (p.image
                ? "<img class='order-item__img' src='" + p.image + "' alt=''>"
                : "<div class='order-item__img order-item__img--empty'></div>") +
              "<div class='order-item__info'>" +
                "<span class='order-item__name'>" + (p.en_name || "") + "</span>" +
                (meta ? "<span class='order-item__meta'>" + meta + "</span>" : "") +
              "</div>" +
              (itemPrice ? "<span class='order-item__price'>" + RB.formatPrice(itemPrice) + "</span>" : "") +
            "</div>";
          }).join("");

          var payLabel = first.payment_method
            ? first.payment_method.replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); })
            : "";

          return "<article class='order-card'>" +
            "<button type='button' class='order-card__head'>" +
              "<div class='order-card__thumbs'>" + thumbsHtml + "</div>" +
              "<div class='order-card__info'>" +
                "<p class='order-card__ref'>" + displayRef + "</p>" +
                "<p class='order-card__meta'>" + itemCount + " item" + (itemCount !== 1 ? "s" : "") + " &middot; " + fmtDate(first.created_at) + "</p>" +
              "</div>" +
              "<div class='order-card__side'>" +
                "<span class='badge badge--" + status + "'>" + st + "</span>" +
                (total ? "<span class='order-card__price'>" + RB.formatPrice(total) + "</span>" : "") +
              "</div>" +
              "<span class='order-card__chevron' aria-hidden='true'><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg></span>" +
            "</button>" +
            "<div class='order-card__items' hidden>" +
              "<div class='order-card__items-inner'>" + itemsHtml + "</div>" +
              (payLabel || first.customer_address
                ? "<div class='order-card__footer'>" +
                    (payLabel ? "<span class='order-card__pay'>" + payLabel + "</span>" : "") +
                    (first.customer_address ? "<span class='order-card__addr'>" + first.customer_address + "</span>" : "") +
                  "</div>"
                : "") +
            "</div>" +
          "</article>";
        }).join("");

        // Wire expand / collapse
        list.querySelectorAll(".order-card__head").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var card   = btn.closest(".order-card");
            var detail = card.querySelector(".order-card__items");
            var open   = !detail.hidden;
            detail.hidden = open;
            card.classList.toggle("is-open", !open);
          });
        });
      })
      .catch(function () {
        list.innerHTML = "<p>Failed to load orders.</p>";
      });
  }

  // ---- Addresses ----
  var _addrLat      = null;
  var _addrLon      = null;
  var _afMap        = null;
  var _afMarker     = null;
  var _editingAddrId = null;

  function govLabel(val) {
    if (!val) return "";
    return val.replace(/-/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function renderAddresses() {
    var list = $("#addr-list");
    if (!list) return;
    list.innerHTML = "<div class='dash-loading'><span>Loading…</span></div>";
    fetch("/api/profile/addresses", { headers: { "Authorization": "Bearer " + _token } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (body) {
        var addrs = (body && body.data) ? body.data : [];
        if (!addrs.length) {
          list.innerHTML = "<p class='addr-empty'>No addresses saved yet — add one to speed up checkout.</p>";
          return;
        }
        list.innerHTML = addrs.map(function (a) {
          var hasMap = a.latitude != null && a.longitude != null;
          var mapHtml = hasMap
            ? "<div class='addr-card__map' data-lat='" + a.latitude + "' data-lon='" + a.longitude + "'></div>"
            : "";
          return "<div class='addr-card" + (a.is_default ? " addr-card--default" : "") + "' data-id='" + a.id + "'>" +
            mapHtml +
            "<div class='addr-card__content'>" +
              "<div class='addr-card__head'>" +
                "<span class='addr-card__label'>" + (a.label || "Address") + "</span>" +
                (a.is_default ? "<span class='addr-badge'>Default</span>" : "") +
              "</div>" +
              "<div class='addr-card__body'>" +
                (a.governorate ? "<div>" + govLabel(a.governorate) + "</div>" : (a.city ? "<div>" + a.city + "</div>" : "")) +
                "<div>" + a.street + "</div>" +
                (a.phone ? "<div class='addr-card__phone'>" + a.phone + "</div>" : "") +
              "</div>" +
              "<div class='addr-card__actions'>" +
                (!a.is_default
                  ? "<button class='btn btn--secondary' style='flex:1' data-action='default' data-id='" + a.id + "'>Set as default</button>"
                  : "<span style='flex:1'></span>") +
                "<button class='btn btn--ghost addr-card__icon-btn' data-action='edit' data-id='" + a.id + "' aria-label='Edit address'>" +
                  "<svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/><path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/></svg>" +
                "</button>" +
                "<button class='btn btn--ghost addr-card__icon-btn addr-card__del' data-action='delete' data-id='" + a.id + "' aria-label='Delete address'>" +
                  "<svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6'/></svg>" +
                "</button>" +
              "</div>" +
            "</div>" +
            "</div>";
        }).join("");
        setTimeout(initCardMaps, 120);

        list.querySelectorAll("[data-action='default']").forEach(function (btn) {
          btn.addEventListener("click", function () { setDefaultAddress(btn.dataset.id); });
        });
        list.querySelectorAll("[data-action='edit']").forEach(function (btn) {
          var id = btn.dataset.id;
          var addr = addrs.find(function (a) { return a.id === id; });
          if (addr) btn.addEventListener("click", function () { openEditAddress(addr); });
        });
        list.querySelectorAll("[data-action='delete']").forEach(function (btn) {
          btn.addEventListener("click", function () { deleteAddress(btn.dataset.id); });
        });
      })
      .catch(function () { list.innerHTML = "<p>Failed to load addresses.</p>"; });
  }

  function setDefaultAddress(id) {
    fetch("/api/profile/addresses/" + id + "/default", {
      method: "PUT",
      headers: { "Authorization": "Bearer " + _token }
    })
      .then(function (r) { if (r.ok) { renderAddresses(); RB.toast("Default address updated"); } })
      .catch(function () { RB.toast("Failed to update default."); });
  }

  function deleteAddress(id) {
    fetch("/api/profile/addresses/" + id, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + _token }
    })
      .then(function (r) { if (r.ok) { renderAddresses(); RB.toast("Address removed"); } })
      .catch(function () { RB.toast("Failed to delete address."); });
  }

  function locateForAddress() {
    if (!navigator.geolocation) { RB.toast("Geolocation not supported."); return; }
    var btn = $("#af-locate-btn");
    if (btn) { btn.disabled = true; btn.classList.add("is-loading"); }
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        placeFormPin(pos.coords.latitude, pos.coords.longitude);
        reverseGeocodeIntoForm(_addrLat, _addrLon);
        initFormMap(_addrLat, _addrLon);
        if (btn) { btn.disabled = false; btn.classList.remove("is-loading"); }
        RB.toast("Location pinned — drag the marker to adjust");
      },
      function (err) {
        if (btn) { btn.disabled = false; btn.classList.remove("is-loading"); }
        RB.toast(err.code === 1 ? "Location access denied." : "Could not get your location.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  function updateGpsPinDisplay(lat, lon) {
    var pin      = $("#af-gps-pin");
    var coordsEl = $("#af-gps-coords");
    var linkEl   = $("#af-gps-link");
    if (pin)      pin.hidden = false;
    if (coordsEl) coordsEl.textContent = lat.toFixed(6) + "°, " + lon.toFixed(6) + "°";
    if (linkEl)   linkEl.href = "https://www.openstreetmap.org/?mlat=" + lat + "&mlon=" + lon + "&zoom=16";
  }

  function reverseGeocodeIntoForm(lat, lon) {
    fetch("https://nominatim.openstreetmap.org/reverse?format=json&lat=" + lat + "&lon=" + lon + "&accept-language=en", {
      headers: { "User-Agent": "Robabikia/1.0 (nadeerysin@gmail.com)" }
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var addr = data.address || {};
        var sr = (addr.state || "").replace(/\s*governorate\s*/gi, "").trim().toLowerCase().replace(/\s+/g, "-");
        var govEl = document.getElementById("af-gov");
        if (govEl && sr) {
          var opts = Array.from(govEl.options);
          var m = opts.find(function (o) { return o.value === sr; }) ||
                  opts.find(function (o) { return o.value && (sr.indexOf(o.value) !== -1 || o.value.indexOf(sr) !== -1); });
          if (m) govEl.value = m.value;
        }
        var stEl = document.getElementById("af-street");
        if (stEl && addr.road) {
          var pts = [addr.road, addr.neighbourhood, addr.suburb].filter(Boolean);
          stEl.value = pts.slice(0, 2).join(", ");
        }
      })
      .catch(function () {});
  }

  function placeFormPin(lat, lon) {
    _addrLat = lat; _addrLon = lon;
    if (_afMarker) {
      _afMarker.setLatLng([lat, lon]);
    } else {
      _afMarker = L.marker([lat, lon], { draggable: true }).addTo(_afMap);
      _afMarker.on("dragend", function (e) {
        var pos = e.target.getLatLng();
        placeFormPin(pos.lat, pos.lng);
        reverseGeocodeIntoForm(pos.lat, pos.lng);
      });
    }
    updateGpsPinDisplay(lat, lon);
  }

  function initFormMap(lat, lon) {
    if (!window.L) return;
    var wrap = $("#af-map-wrap");
    if (wrap) wrap.hidden = false;

    var hasPrecise = lat != null && lon != null;
    var centerLat  = hasPrecise ? lat : 26.8206;
    var centerLon  = hasPrecise ? lon : 30.8025;
    var zoom       = hasPrecise ? 15 : 6;

    if (_afMap) {
      _afMap.setView([centerLat, centerLon], zoom);
      if (hasPrecise) { placeFormPin(lat, lon); } else { if (_afMarker) { _afMap.removeLayer(_afMarker); _afMarker = null; } }
      setTimeout(function () { _afMap.invalidateSize(); }, 60);
      return;
    }

    var el = document.getElementById("af-map");
    if (!el) return;
    _afMap = L.map(el).setView([centerLat, centerLon], zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© <a href='https://openstreetmap.org/copyright'>OpenStreetMap</a>",
      maxZoom: 19
    }).addTo(_afMap);

    if (hasPrecise) placeFormPin(lat, lon);

    _afMap.on("click", function (e) {
      placeFormPin(e.latlng.lat, e.latlng.lng);
      reverseGeocodeIntoForm(e.latlng.lat, e.latlng.lng);
    });
  }

  function initCardMaps() {
    if (!window.L) return;
    document.querySelectorAll(".addr-card__map[data-lat]").forEach(function (el) {
      if (el._lmap) { el._lmap.invalidateSize(); return; }
      var lat = parseFloat(el.dataset.lat);
      var lon = parseFloat(el.dataset.lon);
      if (isNaN(lat) || isNaN(lon)) return;
      var m = L.map(el, {
        center: [lat, lon], zoom: 14,
        zoomControl: false, dragging: false,
        scrollWheelZoom: false, doubleClickZoom: false,
        boxZoom: false, keyboard: false, attributionControl: false
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(m);
      L.marker([lat, lon]).addTo(m);
      el._lmap = m;
    });
  }

  function openEditAddress(a) {
    _editingAddrId = a.id;
    _addrLat = a.latitude  != null ? a.latitude  : null;
    _addrLon = a.longitude != null ? a.longitude : null;

    var wrap    = $("#addr-form-wrap");
    var form    = $("#addr-form");
    var title   = $("#addr-form-title");
    if (!form || !wrap) return;

    form.reset();
    var lbl  = $("#af-label");   if (lbl)  lbl.value  = a.label || "Home";
    var ph   = $("#af-phone");   if (ph)   ph.value   = a.phone || "";
    var gov  = $("#af-gov");     if (gov)  gov.value  = a.governorate || a.city || "";
    var str  = $("#af-street");  if (str)  str.value  = a.street || "";
    var def  = $("#af-default"); if (def)  def.checked = !!a.is_default;

    if (title) title.textContent = "Edit address";

    var pin = $("#af-gps-pin");
    if (_addrLat != null && _addrLon != null) {
      updateGpsPinDisplay(_addrLat, _addrLon);
    } else {
      if (pin) pin.hidden = true;
    }

    // Always show the map — centered on saved pin or all of Egypt if no coords yet
    initFormMap(_addrLat, _addrLon);

    wrap.hidden = false;
    wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetAddressForm() {
    _editingAddrId = null;
    _addrLat = null;
    _addrLon = null;
    var title = $("#addr-form-title");
    var pin   = $("#af-gps-pin");
    var form  = $("#addr-form");
    var wrap  = $("#addr-form-wrap");
    if (title) title.textContent = "New address";
    if (pin)   pin.hidden = true;
    if (form)  form.reset();
    if (wrap)  wrap.hidden = true;
  }

  function setupAddressForm() {
    var wrap   = $("#addr-form-wrap");
    var form   = $("#addr-form");
    var addBtn = $("#add-addr-btn");
    var cancel = $("#af-cancel");
    var locBtn = $("#af-locate-btn");
    if (!form || !wrap) return;

    var addrTabBtn = $("[data-tab='addresses']");
    if (addrTabBtn) addrTabBtn.addEventListener("click", function () { setTimeout(initCardMaps, 120); });

    if (addBtn) addBtn.addEventListener("click", function () {
      resetAddressForm();
      wrap.hidden = false;
      initFormMap(null, null);
      wrap.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    if (cancel) cancel.addEventListener("click", resetAddressForm);
    if (locBtn) locBtn.addEventListener("click", locateForAddress);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var gov    = ($("#af-gov")    ? $("#af-gov").value          : "");
      var street = ($("#af-street") ? $("#af-street").value.trim() : "");
      if (!gov || !street) { RB.toast("Governorate and street are required."); return; }

      var btn = form.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; btn.classList.add("is-loading"); }

      var isEdit  = !!_editingAddrId;
      var fetchUrl = isEdit ? "/api/profile/addresses/" + _editingAddrId : "/api/profile/addresses";
      fetch(fetchUrl, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + _token },
        body: JSON.stringify({
          label:       ($("#af-label")   ? $("#af-label").value.trim() || "Home"  : "Home"),
          phone:       ($("#af-phone")   ? $("#af-phone").value.trim()  || null   : null),
          governorate: gov,
          city:        gov,
          street:      street,
          latitude:    _addrLat,
          longitude:   _addrLon,
          is_default:  ($("#af-default") ? $("#af-default").checked : false)
        })
      })
        .then(function (r) {
          return r.json().then(function (body) {
            if (!r.ok) throw new Error(body.error || ("HTTP " + r.status));
            return body;
          });
        })
        .then(function () {
          resetAddressForm();
          renderAddresses();
          RB.toast(isEdit ? "Address updated" : "Address saved");
          if (btn) { btn.disabled = false; btn.classList.remove("is-loading"); }
        })
        .catch(function (err) {
          RB.toast("Failed to save address: " + (err && err.message ? err.message : "unknown error"));
          if (btn) { btn.disabled = false; btn.classList.remove("is-loading"); }
        });
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
      renderAddresses();
      setupAddressForm();

      var logoutBtn = $("#logout-btn");
      if (logoutBtn) logoutBtn.addEventListener("click", function () { RB.signOut(); });
    });
  }

  init();
})();
