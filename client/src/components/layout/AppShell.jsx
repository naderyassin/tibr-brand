import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import HomeHeader from "./HomeHeader";
import MobileDrawer from "./MobileDrawer";
import Footer from "./Footer";
import { ToastProvider } from "@/components/ui/Toast";

export default function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  const showFooter =
    (location.pathname === "/" ||
    location.pathname === "/about" ||
    location.pathname === "/product" ||
    location.pathname.startsWith("/shop")) &&
    location.pathname !== "/shop/signature";

  useEffect(() => {
    // Lenis owns the scroll — window.scrollY can be stale when Lenis is active.
    // We read window.__lenisScrollY which main.jsx keeps in sync via lenis.on("scroll").
    // Fall back to window.scrollY for the first frames before Lenis fires.
    const getScrollY = () =>
      typeof window.__lenisScrollY === "number"
        ? window.__lenisScrollY
        : window.scrollY;

    let anchorY = getScrollY();
    let committed = null; // "hidden" | "visible" | null
    let rafId = null;

    // Must scroll at least this many px in one direction before reacting.
    const DELTA = 8;
    // Always show the header in the top zone.
    const TOP_ZONE = 80;

    const hide = () => {
      if (committed === "hidden") return;
      committed = "hidden";
      document.body.classList.add("header-hidden");
    };

    const show = () => {
      if (committed === "visible") return;
      committed = "visible";
      document.body.classList.remove("header-hidden");
    };

    const tick = () => {
      const scrollY = getScrollY();
      const delta = scrollY - anchorY;

      if (scrollY <= TOP_ZONE) {
        show();
        anchorY = scrollY;
      } else if (delta > DELTA) {
        // Scrolled down past threshold → hide
        hide();
        anchorY = scrollY;
      } else if (delta < -DELTA) {
        // Scrolled up past threshold → show
        show();
        anchorY = scrollY;
      }
      // Inside dead zone → no change, anchor stays put

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      document.body.classList.remove("header-hidden");
    };
  }, []);

  return (
    <ToastProvider>
      <a className="skip-link" href="#main">Skip to content</a>
      {isHome ? (
        <HomeHeader />
      ) : (
        <Header onMenuOpen={() => setDrawerOpen(true)} />
      )}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <main id="main">
        <Outlet />
      </main>
      {showFooter && <Footer />}
    </ToastProvider>
  );
}
