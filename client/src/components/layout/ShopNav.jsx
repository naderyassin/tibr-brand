import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { SHOP_NAV } from "@/lib/shopNav";

// Tabs stay compact (English segment only); the vertical dropdowns have room
// for the bilingual label.
const enPart = (label) => label.split(" —")[0];

export default function ShopNav() {
  const [openKey, setOpenKey] = useState(null);
  const [activeGroupIndex, setActiveGroupIndex] = useState(null);
  const navRef = useRef(null);
  const location = useLocation();

  // Close on outside click/touch and on route change. Click-driven (not
  // hover-only) so the dropdown works on touch devices and trackpads too.
  useEffect(() => {
    const onDocClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenKey(null);
        setActiveGroupIndex(null);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
    };
  }, []);

  useEffect(() => {
    setOpenKey(null);
    setActiveGroupIndex(null);
  }, [location.pathname]);

  const handleTabClick = (tabKey) => {
    if (openKey === tabKey) {
      setOpenKey(null);
      setActiveGroupIndex(null);
    } else {
      setOpenKey(tabKey);
      setActiveGroupIndex(null);
    }
  };

  return (
    <nav className="shop-subnav" aria-label="Shop categories" ref={navRef}>
      <div className="store-container">
        <ul className="shop-subnav__list">
          {SHOP_NAV.map((tab) => {
            const isOpen = openKey === tab.key;
            return (
              <li 
                key={tab.key} 
                className={`shop-subnav__item${isOpen ? " is-open" : ""}`}
                onMouseEnter={() => {
                  setOpenKey(tab.key);
                }}
                onMouseLeave={() => {
                  setOpenKey(null);
                  setActiveGroupIndex(null);
                }}
              >
                {tab.groups ? (() => {
                  const isRouteActive = location.pathname.startsWith(tab.path.split("?")[0]);
                  const shouldShowActive = isRouteActive;
                  return (
                  <button
                    type="button"
                    className={`shop-subnav__link${shouldShowActive ? " is-active" : ""}`}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    // Still keep click for touch devices, but prevent it from toggling off if already hovered
                    onClick={() => {
                      if (openKey !== tab.key) {
                        setOpenKey(tab.key);
                        setActiveGroupIndex(null);
                      }
                    }}
                  >
                    {enPart(tab.label)}
                    <svg className="shop-subnav__caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  );
                })() : (
                  <NavLink
                    to={tab.path}
                    className={({ isActive }) => `shop-subnav__link${isActive ? " is-active" : ""}`}
                  >
                    {enPart(tab.label)}
                  </NavLink>
                )}

                {/* Each dropdown entry is a filter link, not a route of its own. */}
                {tab.groups && (
                  <div className={`shop-subnav__dropdown${tab.groups.length > 1 ? " shop-subnav__dropdown--drilldown" : ""}`}>
                    {tab.groups.length > 1 ? (
                      /* Multi-group Flyout layout */
                      <div className="shop-subnav__flyout" onMouseLeave={() => setActiveGroupIndex(null)}>
                        <ul className="shop-subnav__flyout-list">
                          {tab.groups.map((group, index) => {
                            const groupEn = group.title.split(" — ")[0];
                            const isActive = activeGroupIndex === index;
                            return (
                              <li key={group.title} onMouseEnter={() => setActiveGroupIndex(index)}>
                                <button
                                  type="button"
                                  className={`shop-subnav__flyout-trigger ${isActive ? "is-active" : ""}`}
                                >
                                  <span className="shop-subnav__trigger-text">
                                    <span className="shop-subnav__trigger-en">{groupEn}</span>
                                  </span>
                                  <svg className="shop-subnav__trigger-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                        
                        <div className={`shop-subnav__flyout-sub ${activeGroupIndex !== null ? 'is-visible' : ''}`}>
                          {activeGroupIndex !== null && (
                            <ul className="shop-subnav__drilldown-sublist">
                              {tab.groups[activeGroupIndex].items.map((s) => {
                                const sEn = s.label.split(" — ")[0];
                                return (
                                  <li key={s.path}>
                                    <NavLink
                                      to={s.path}
                                      className="shop-subnav__drilldown-link"
                                      onClick={() => {
                                        setOpenKey(null);
                                        setActiveGroupIndex(null);
                                      }}
                                    >
                                      <span className="shop-subnav__link-en">{sEn}</span>
                                    </NavLink>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Single-group simple layout */
                      <div className="shop-subnav__simple-list-wrap">
                        {tab.groups.map((group) => (
                          <ul className="shop-subnav__simple-list" key={group.title}>
                            {group.items.map((s) => {
                              const sEn = s.label.split(" — ")[0];
                              return (
                                <li key={s.path}>
                                  <NavLink
                                    to={s.path}
                                    className="shop-subnav__simple-link"
                                    onClick={() => {
                                      setOpenKey(null);
                                      setActiveGroupIndex(null);
                                    }}
                                  >
                                    <span className="shop-subnav__simple-en">{sEn}</span>
                                  </NavLink>
                                </li>
                              );
                            })}
                          </ul>
                        ))}
                      </div>
                    )}
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
