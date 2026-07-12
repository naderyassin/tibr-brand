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
              <li key={tab.key} className={`shop-subnav__item${isOpen ? " is-open" : ""}`}>
                {tab.groups ? (
                  <button
                    type="button"
                    className={`shop-subnav__link${location.pathname.startsWith(tab.path.split("?")[0]) ? " is-active" : ""}`}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    onClick={() => handleTabClick(tab.key)}
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

                {/* Each dropdown entry is a filter link, not a route of its own. */}
                {tab.groups && (
                  <div className={`shop-subnav__dropdown${tab.groups.length > 1 ? " shop-subnav__dropdown--drilldown" : ""}`}>
                    {tab.groups.length > 1 ? (
                      /* Multi-group Drilldown layout */
                      <div className="shop-subnav__drilldown">
                        {activeGroupIndex === null ? (
                          /* View 1: Main Category Groups */
                          <ul className="shop-subnav__drilldown-list">
                            {tab.groups.map((group, index) => {
                              const [groupEn, groupAr] = group.title.split(" — ");
                              return (
                                <li key={group.title}>
                                  <button
                                    type="button"
                                    className="shop-subnav__drilldown-trigger"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveGroupIndex(index);
                                    }}
                                  >
                                    <span className="shop-subnav__trigger-text">
                                      <span className="shop-subnav__trigger-en">{groupEn}</span>
                                      {groupAr && <span className="shop-subnav__trigger-ar"> — {groupAr}</span>}
                                    </span>
                                    <svg className="shop-subnav__trigger-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          /* View 2: Sub-items for Selected Group */
                          <div className="shop-subnav__drilldown-sub">
                            {/* Back Header */}
                            <button
                              type="button"
                              className="shop-subnav__drilldown-back"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveGroupIndex(null);
                              }}
                            >
                              <svg className="shop-subnav__back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                                <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <span className="shop-subnav__back-text">
                                <span className="shop-subnav__back-en">{tab.groups[activeGroupIndex].title.split(" — ")[0]}</span>
                                {tab.groups[activeGroupIndex].title.split(" — ")[1] && (
                                  <span className="shop-subnav__back-ar"> — {tab.groups[activeGroupIndex].title.split(" — ")[1]}</span>
                                )}
                              </span>
                            </button>

                            {/* List of links */}
                            <ul className="shop-subnav__drilldown-sublist">
                              {tab.groups[activeGroupIndex].items.map((s) => {
                                const [sEn, sAr] = s.label.split(" — ");
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
                                      {sAr && <span className="shop-subnav__link-ar"> — {sAr}</span>}
                                    </NavLink>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Single-group simple layout */
                      <div className="shop-subnav__simple-list-wrap">
                        {tab.groups.map((group) => (
                          <ul className="shop-subnav__simple-list" key={group.title}>
                            {group.items.map((s) => {
                              const [sEn, sAr] = s.label.split(" — ");
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
                                    {sAr && <span className="shop-subnav__simple-ar"> — {sAr}</span>}
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
