import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { SHOP_NAV } from "@/lib/shopNav";

// Tabs stay compact (English segment only); the vertical dropdowns have room
// for the full bilingual label.
const enPart = (label) => label.split(" —")[0];

export default function ShopNav() {
  const [openKey, setOpenKey] = useState(null);
  const navRef = useRef(null);
  const location = useLocation();

  // Close on outside click/touch and on route change. Click-driven (not
  // hover-only) so the dropdown works on touch devices and trackpads too.
  useEffect(() => {
    const onDocClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenKey(null);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
    };
  }, []);
  useEffect(() => { setOpenKey(null); }, [location.pathname]);

  return (
    <nav className="shop-subnav" aria-label="Shop categories" ref={navRef}>
      <div className="store-container">
        <ul className="shop-subnav__list">
          {SHOP_NAV.map((tab) => {
            const isOpen = openKey === tab.key;
            return (
              <li key={tab.key} className={`shop-subnav__item${isOpen ? " is-open" : ""}`}>
                {tab.subs ? (
                  <button
                    type="button"
                    className={`shop-subnav__link${location.pathname.startsWith(tab.path) ? " is-active" : ""}`}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    onClick={() => setOpenKey(isOpen ? null : tab.key)}
                  >
                    {enPart(tab.label)}
                    <svg className="shop-subnav__caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : (
                  <NavLink
                    to={tab.path}
                    className={({ isActive }) => `shop-subnav__link${isActive ? " is-active" : ""}`}
                  >
                    {enPart(tab.label)}
                  </NavLink>
                )}

                {tab.subs && (
                  <div className="shop-subnav__dropdown">
                    <ul className="shop-subnav__dropdown-list">
                      {tab.subs.map((s) => (
                        <li key={s.slug}>
                          <NavLink
                            to={`${tab.path}/${s.slug}`}
                            className="shop-subnav__dropdown-link"
                            onClick={() => setOpenKey(null)}
                          >
                            {s.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
