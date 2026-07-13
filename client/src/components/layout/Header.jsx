import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/stores/cart";
import { useAuth } from "@/stores/auth";
import { getProfile } from "@/lib/api";

const BagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 8V6a4 4 0 0 1 8 0v2" /><rect width="16" height="14" x="4" y="8" rx="2" />
  </svg>
);
const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" />
  </svg>
);
const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const NAVIGATION = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/shop" },
  { label: "About", to: "/about" },
  { label: "Profile", to: "/account" },
];

export default function Header({ onMenuOpen }) {
  const [scrolled, setScrolled] = useState(false);
  const items = useCart((s) => s.items);
  const count = items.reduce((n, i) => n + i.qty, 0);
  const token = useAuth((s) => s.token);
  const { data: profileData } = useQuery({
    queryKey: ["profile", token],
    queryFn: () => getProfile(token),
    enabled: !!token,
  });
  const isAdmin = profileData?.data?.role === "admin";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`store-header${scrolled ? " is-scrolled" : ""}`} id="store-header">
      <div className="store-container store-header__inner">
        <Link className="store-wordmark" to="/" aria-label="TIBR">
          TIBR<span className="dot">.</span>
        </Link>

        <nav className="store-nav" aria-label="Categories">
          <ul className="store-nav__list">
            {NAVIGATION.map((item) => (
              <li key={item.label} className="store-nav__item group">
                <NavLink
                  className={({ isActive }) => `store-nav__link${isActive ? "" : ""}`}
                  to={item.to}
                  aria-current={({ isActive }) => (isActive ? "page" : undefined)}
                >
                  {({ isActive }) => (
                    <span aria-current={isActive ? "page" : undefined}>{item.label}</span>
                  )}
                </NavLink>
                {item.subItems && (
                  <div className="store-nav__dropdown">
                    <ul className="store-nav__dropdown-list">
                      {item.subItems.map((subItem) => (
                        <li key={subItem.label}>
                          <Link className="store-nav__dropdown-link" to={subItem.to}>
                            {subItem.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="store-utils">
          {isAdmin && (
            <Link className="store-iconbtn" to="/admin" aria-label="Control Panel">
              <SettingsIcon />
            </Link>
          )}
          <Link className="store-iconbtn" to="/cart" aria-label="Cart">
            <BagIcon />
            <span className={`store-cart-count${count > 0 ? " is-active" : ""}`} aria-hidden="true">
              {count}
            </span>
          </Link>
          <button
            className="store-burger"
            id="burger"
            type="button"
            aria-expanded="false"
            aria-controls="drawer"
            aria-label="Menu"
            onClick={onMenuOpen}
          >
            <MenuIcon />
          </button>
        </div>
      </div>
    </header>
  );
}
