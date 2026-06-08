/* router.js — Client-Side Hash Router (SPA Page Navigator) */

document.addEventListener("DOMContentLoaded", () => {
  const views = document.querySelectorAll(".spa-view");
  const navLinks = document.querySelectorAll(".nav-link");

  const HOME_SECTIONS = ["#home", "#story", "#order"];

  // Force website to always open on the home landing page upon fresh reload
  if (window.location.hash) {
    const isHomeSub = HOME_SECTIONS.some(sec => window.location.hash.startsWith(sec));
    if (!isHomeSub) {
      window.history.replaceState("", document.title, window.location.pathname + window.location.search);
    }
  }

  const hashToViewId = (hash) => {
    if (!hash || HOME_SECTIONS.some(s => hash.startsWith(s))) return "view-home";
    const map = {
      "#perfumes":       "view-perfumes",
      "#clothes":        "view-clothes",
      "#shoes":          "view-shoes",
      "#cart":           "view-cart",
      "#checkout":       "view-checkout",
      "#order-confirm":  "view-order-confirm",
      "#login":          "view-login",
      "#register":       "view-register",
      "#forgot-password":"view-forgot-password",
      "#account":        "view-account",
      "#admin":          "view-admin",
      "#wishlist":       "view-wishlist",
      "#search":         "view-search",
      "#men":            "view-men",
      "#women":          "view-women",
    };
    return map[hash] || "view-home";
  };

  const navigateTo = async () => {
    const hash = window.location.hash || "#home";
    const isHomeSection = HOME_SECTIONS.some(sec => hash.startsWith(sec));
    const activeViewId = hashToViewId(hash);

    // Auth guard for account/admin pages
    if (hash === "#account" || hash === "#admin") {
      try {
        const { data } = await window.supabaseClient.auth.getSession();
        if (!data?.session) {
          window.location.hash = "#login";
          return;
        }

        if (hash === "#admin") {
          const { data: profile } = await window.apiClient.getProfile();
          if (profile?.role !== "admin") {
            window.location.hash = "#account";
            return;
          }
        }
      } catch (err) {
        console.error("[router] session check failed:", err);
        window.location.hash = "#login";
        return;
      }
    }

    // Toggle view visibility
    const shell3d = document.getElementById("perfume-3d-shell");
    views.forEach(view => {
      const isActive = view.id === activeViewId;
      view.style.display = isActive ? "block" : "none";
      view.classList.toggle("active-view", isActive);
    });

    // Show/hide the 3D shell and initialize the experience on first visit
    if (shell3d) {
      shell3d.style.display = (activeViewId === "view-perfumes") ? "block" : "none";
    }

    // Update nav highlights
    navLinks.forEach(link => {
      link.classList.remove("active");
      const href = link.getAttribute("href");
      if (isHomeSection && href === "#home") link.classList.add("active");
      else if (!isHomeSection && href === hash) link.classList.add("active");
    });

    // Scroll management
    if (isHomeSection) {
      const targetEl = document.getElementById(hash.substring(1));
      if (targetEl) setTimeout(() => targetEl.scrollIntoView({ behavior: "smooth" }), 80);
    } else {
      window.scrollTo(0, 0);
    }

    // Page-specific triggers
    if (hash === "#perfumes") {
      // Init 3D on first visit; on subsequent visits just refresh scroll positions
      setTimeout(() => window.init3DExperience?.(), 50);
      window.stores?.perfumes?.render();
    }
    if (hash === "#clothes") window.stores?.clothes?.render();
    if (hash === "#shoes")   window.stores?.shoes?.render();
    if (hash === "#cart")    window.cart?.renderCartPage();
    if (hash === "#account") window.accountPage?.load();
    if (hash === "#admin")   window.adminPage?.load();
    if (hash === "#wishlist") window.wishlist?.renderPage();
    if (hash === "#search")  { window.searchPage?.focus(); }
    if (hash === "#men")     window.categoryPage?.render("men-products-container",   "male");
    if (hash === "#women")   window.categoryPage?.render("women-products-container", "female");
  };

  window.addEventListener("hashchange", navigateTo);
  navigateTo();
});
