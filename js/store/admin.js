/* -------------------------------------------------------------
 * STORE / ADMIN.JS — Orders + product control panel
 * Admin-only: manage products and order statuses.
 * Depends on chrome.js (window.RB) + session.js (RB.supabase).
 * ------------------------------------------------------------- */
(function () {
  "use strict";

  var $ = function (selector, context) { return (context || document).querySelector(selector); };
  var $$ = function (selector, context) { return Array.from((context || document).querySelectorAll(selector)); };
  if (!window.RB) return;

  var escapeHtml = function (value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  var STATUS = {
    pending:   "Pending",
    confirmed: "Confirmed",
    shipped:   "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled"
  };
  var ORDER = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

  var PRODUCT_CATEGORIES = {
    perfumes: "Perfumes",
    clothing: "Clothing",
    sneakers: "Sneakers"
  };

  var _token = null;
  var _orders = [];
  var _products = [];
  var _filter = "all";
  var _ordersLoadFailed = false;
  var _productsLoadFailed = false;

  var productNewButton = $("#product-new");
  var productTbody = $("#admin-products");
  var productEmpty = $("#admin-products-empty");
  var productTableWrap = $(".admin-product-table-wrap .table-wrap");
  var tableWrap = $(".admin-orders-table-wrap");
  var adminTabs = $$(".admin-tab");
  var adminPanes = $$("[data-admin-pane]");

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
    } catch (_) {
      return "";
    }
  }

  function formatMoney(value) {
    return escapeHtml(RB.formatPrice(value || 0));
  }

  function setActivePane(name) {
    adminTabs.forEach(function (tab) {
      var isActive = tab.dataset.adminTab === name;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });
    adminPanes.forEach(function (pane) {
      pane.classList.toggle("is-active", pane.dataset.adminPane === name);
    });
  }

  function categoryLabel(key) {
    return PRODUCT_CATEGORIES[key] || key || "";
  }

  function productPrice(product) {
    return Number(product.en_price || product.ar_price || product.price || 0);
  }


  // Group line-items by checkout_reference (fall back to row id for legacy single-item orders)
  function groupOrders(rows) {
    var keys = [], map = {};
    rows.forEach(function (r) {
      var k = r.checkout_reference || r.id;
      if (!map[k]) { map[k] = []; keys.push(k); }
      map[k].push(r);
    });
    return keys.map(function (k) { return map[k]; });
  }

  function statusSelect(groupKey, currentStatus) {
    var options = ORDER.map(function (s) {
      return "<option value='" + s + "'" + (s === currentStatus ? " selected" : "") + ">" + STATUS[s] + "</option>";
    }).join("");
    return "<select class='status-select' data-ref='" + escapeHtml(groupKey) + "' aria-label='Change order status'>" + options + "</select>";
  }

  function renderStats() {
    var groups = groupOrders(_orders);
    var total     = groups.length;
    var pending   = groups.filter(function (g) { return g[0].status === "pending";   }).length;
    var delivered = groups.filter(function (g) { return g[0].status === "delivered"; }).length;
    var revenue   = _orders
      .filter(function (r) { return r.status !== "cancelled"; })
      .reduce(function (sum, r) { return sum + (r.unit_price ? r.unit_price * (r.qty || 1) : 0); }, 0);

    var stat = function (val, gold, label) {
      return "<div class='stat'><p class='stat__value" + (gold ? " stat__value--gold" : "") + "'>" + val + "</p>" +
             "<p class='stat__label'>" + label + "</p></div>";
    };
    var stats = $("#admin-stats");
    if (!stats) return;
    stats.innerHTML =
      stat(total,           false, "Total orders") +
      stat(pending,         false, "Pending")      +
      stat(delivered,       false, "Delivered")    +
      stat(formatMoney(revenue), true, "Revenue");
  }

  function renderOrders() {
    var groups = groupOrders(_orders).filter(function (g) {
      return _filter === "all" || g[0].status === _filter;
    });
    var tbody    = $("#admin-rows");
    var emptyWrap = $("#admin-empty");
    var count    = $("#admin-count");

    if (_ordersLoadFailed) {
      if (tbody) tbody.innerHTML = "";
      if (tableWrap) tableWrap.style.display = "none";
      if (count) count.textContent = "Load failed";
      if (emptyWrap) emptyWrap.innerHTML = "<div class='rb-empty'><h3 class='rb-empty__title'>Failed to load orders</h3></div>";
      return;
    }

    if (count) count.textContent = groups.length + " order" + (groups.length !== 1 ? "s" : "");

    if (!groups.length) {
      if (tbody) tbody.innerHTML = "";
      if (tableWrap) tableWrap.style.display = "none";
      if (emptyWrap) emptyWrap.innerHTML =
        "<div class='rb-empty'>" +
        "<span class='rb-empty__icon'><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.3' aria-hidden='true'><circle cx='11' cy='11' r='7'/><path d='M21 21l-4.3-4.3' stroke-linecap='round'/></svg></span>" +
        "<h3 class='rb-empty__title'>No orders with this status</h3></div>";
      return;
    }

    if (tableWrap) tableWrap.style.display = "";
    if (emptyWrap) emptyWrap.innerHTML = "";

    if (tbody) {
      tbody.innerHTML = groups.map(function (items) {
        var first   = items[0];
        var groupKey = first.checkout_reference || first.id;
        var displayRef = first.checkout_reference || String(first.id).slice(0, 8).toUpperCase();
        var total   = items.reduce(function (sum, r) { return sum + (r.unit_price ? r.unit_price * (r.qty || 1) : 0); }, 0);
        // Items cell: first product + "and N more"
        var p0 = items[0].products || {};
        var itemsLabel = escapeHtml(p0.en_name || "");
        if (items.length > 1) itemsLabel += " <span class='admin-more'>+&thinsp;" + (items.length - 1) + " more</span>";
        return "<tr>" +
          "<td class='num'>" + escapeHtml(displayRef) + "</td>" +
          "<td>" + escapeHtml(first.customer_name || "") + "</td>" +
          "<td>" + itemsLabel + "</td>" +
          "<td class='num'>" + formatMoney(total) + "</td>" +
          "<td>" + escapeHtml(fmtDate(first.created_at)) + "</td>" +
          "<td>" + statusSelect(groupKey, first.status) + "</td>" +
          "</tr>";
      }).join("");
    }
  }

  function renderProducts() {
    var tbody = productTbody;
    if (!tbody) return;

    if (_productsLoadFailed) {
      tbody.innerHTML = "";
      if (productTableWrap) productTableWrap.style.display = "none";
      if (productEmpty) {
        productEmpty.innerHTML =
          "<div class='admin-product-empty rb-empty'><h3 class='rb-empty__title'>Failed to load products</h3></div>";
      }
      return;
    }

    if (!Array.isArray(_products) || !_products.length) {
      tbody.innerHTML = "";
      if (productTableWrap) productTableWrap.style.display = "none";
      if (productEmpty) {
        productEmpty.innerHTML =
          "<div class='admin-product-empty rb-empty'>" +
          "<h3 class='rb-empty__title'>No products yet</h3>" +
          "<p class='rb-empty__text'>Start by adding the first product from the New product button.</p>" +
          "</div>";
      }
      return;
    }

    if (productEmpty) productEmpty.innerHTML = "";
    if (productTableWrap) productTableWrap.style.display = "";

    tbody.innerHTML = _products.map(function (product) {
      var category = categoryLabel(product.category);
      var price = formatMoney(productPrice(product));
      var imgSrc = escapeHtml(product.image || "");
      var imgCell = imgSrc
        ? "<td class='ap-thumb-cell'><img class='ap-thumb' src='" + imgSrc + "' alt='' loading='lazy'></td>"
        : "<td class='ap-thumb-cell'><div class='ap-thumb ap-thumb--empty'></div></td>";
      var rawSizes = product.sizes;
      var sizesArr = Array.isArray(rawSizes) ? rawSizes : (typeof rawSizes === "string" && rawSizes ? rawSizes.split(/[,،]/).map(function(s){return s.trim();}) : []);
      var sizesHtml = sizesArr.length
        ? sizesArr.map(function(s){ return "<span class='ap-size-tag'>" + escapeHtml(s) + "</span>"; }).join("")
        : "<span class='ap-muted'>—</span>";
      return "<tr data-product-id='" + escapeHtml(product.id) + "'>" +
        imgCell +
        "<td>" + escapeHtml(category) + "</td>" +
        "<td><div class='admin-product-meta'><span class='admin-product-meta__name'>" + escapeHtml(product.en_name || "") + "</span></div></td>" +
        "<td><div class='ap-sizes'>" + sizesHtml + "</div></td>" +
        "<td>" + price + "</td>" +
        "<td><div class='product-actions'>" +
          "<button class='btn btn--secondary' type='button' data-product-action='edit' data-id='" + escapeHtml(product.id) + "'>Edit</button>" +
          "<button class='btn btn--danger' type='button' data-product-action='delete' data-id='" + escapeHtml(product.id) + "'>Delete</button>" +
        "</div></td>" +
        "</tr>";
    }).join("");
  }

  function renderAll() {
    renderStats();
    renderOrders();
    renderProducts();
  }

  function loadOrders() {
    return fetch("/api/admin/orders", { headers: { Authorization: "Bearer " + _token } })
      .then(function (response) { return response.ok ? response.json() : Promise.reject(response.status); })
      .then(function (body) {
        _ordersLoadFailed = false;
        _orders = body && body.data ? body.data : [];
      })
      .catch(function () {
        _ordersLoadFailed = true;
        var emptyWrap = $("#admin-empty");
        if (tableWrap) tableWrap.style.display = "none";
        if (emptyWrap) {
          emptyWrap.innerHTML =
            "<div class='rb-empty'><h3 class='rb-empty__title'>Failed to load orders</h3></div>";
        }
      });
  }

  function loadProducts() {
    return fetch("/api/admin/products", { headers: { Authorization: "Bearer " + _token } })
      .then(function (response) { return response.ok ? response.json() : Promise.reject(response.status); })
      .then(function (body) {
        _productsLoadFailed = false;
        _products = body && body.data ? body.data : [];
      })
      .catch(function () {
        _productsLoadFailed = true;
        _products = [];
        if (productTbody) productTbody.innerHTML = "";
        if (productEmpty) {
          productEmpty.innerHTML =
            "<div class='admin-product-empty rb-empty'><h3 class='rb-empty__title'>Failed to load products</h3></div>";
        }
      });
  }

  function deleteProduct(productId) {
    if (!productId) return;
    if (!window.confirm("Delete this product?")) return;

    fetch("/api/admin/products/" + encodeURIComponent(productId), {
      method: "DELETE",
      headers: { Authorization: "Bearer " + _token }
    })
      .then(function (response) {
        return response.ok ? response.json() : response.json().then(function (body) {
          throw new Error((body && body.error) || "Delete failed");
        });
      })
      .then(function () {
        RB.toast("Product deleted");
        return loadProducts().then(renderProducts);
      })
      .catch(function (error) {
        RB.toast(error && error.message ? error.message : "Failed to delete product");
      });
  }

  function handleProductAction(event) {
    var actionButton = event.target.closest("[data-product-action]");
    if (!actionButton) return;
    var productId = actionButton.dataset.id;

    if (actionButton.dataset.productAction === "edit") {
      location.href = "/admin/product?id=" + encodeURIComponent(productId);
    } else if (actionButton.dataset.productAction === "delete") {
      deleteProduct(productId);
    }
  }

  // Status filter chips
  $$(".filter-chip[data-status]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      _filter = chip.dataset.status;
      $$(".filter-chip[data-status]").forEach(function (button) {
        button.setAttribute("aria-pressed", String(button === chip));
      });
      renderOrders();
    });
  });

  // Per-group status change — patches every line item that shares the same checkout_reference
  var adminRows = $("#admin-rows");
  if (adminRows) {
    adminRows.addEventListener("change", function (event) {
      var select = event.target.closest(".status-select");
      if (!select) return;
      var ref    = select.dataset.ref;
      var status = select.value;

      // Find all line-item IDs belonging to this group
      var ids = _orders
        .filter(function (o) { return (o.checkout_reference || o.id) === ref; })
        .map(function (o) { return o.id; });

      Promise.all(ids.map(function (id) {
        return fetch("/api/admin/orders/" + encodeURIComponent(id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + _token },
          body: JSON.stringify({ status: status })
        }).then(function (r) { return r.ok ? r.json() : Promise.reject(); });
      }))
        .then(function () {
          // Update local cache
          _orders.forEach(function (o) {
            if ((o.checkout_reference || o.id) === ref) o.status = status;
          });
          renderAll();
          RB.toast("Status updated");
        })
        .catch(function () {
          RB.toast("Failed to update status");
          loadOrders().then(renderOrders);
        });
    });
  }

  if (productNewButton) {
    productNewButton.addEventListener("click", function () {
      location.href = "/admin/product";
    });
  }

  if (productTbody) productTbody.addEventListener("click", handleProductAction);

  adminTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      setActivePane(tab.dataset.adminTab || "orders");
      if (tab.dataset.adminTab === "products") renderProducts();
    });
  });

  function init() {
    if (!RB.requireAuth) {
      location.replace("/login?next=/admin");
      return;
    }

    RB.requireAuth("/admin").then(function (session) {
      if (!session) return;
      _token = session.access_token;

      fetch("/api/profile", { headers: { Authorization: "Bearer " + _token } })
        .then(function (response) { return response.ok ? response.json() : Promise.reject(); })
        .then(function (body) {
          var role = body && body.data && body.data.role;
          if (role !== "admin") {
            document.body.innerHTML =
              "<div style='display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem'>" +
              "<div><h1 style='font-size:1.5rem;margin-bottom:1rem'>Access denied</h1>" +
              "<p>This page is for admins only.</p>" +
              "<a href='/account' style='margin-top:1.5rem;display:inline-block'>Back to account</a></div></div>";
            return;
          }

          var urlTab = new URLSearchParams(window.location.search).get("tab") || "orders";
          Promise.all([loadOrders(), loadProducts()]).then(function () {
            renderAll();
            setActivePane(urlTab);
          });
        })
        .catch(function () {
          location.replace("/login?next=/admin");
        });
    });
  }

  init();
})();
