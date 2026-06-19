import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useCart } from "@/stores/cart";
import { useLang } from "@/stores/lang";

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);
const HeartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
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
const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <circle cx="12" cy="12" r="8.2" /><path d="M3.8 12h16.4M12 3.8c2.2 2.3 3.4 5.2 3.4 8.2s-1.2 5.9-3.4 8.2c-2.2-2.3-3.4-5.2-3.4-8.2s1.2-5.9 3.4-8.2z" />
  </svg>
);

export default function Header({ onMenuOpen }) {
  const [scrolled, setScrolled] = useState(false);
  const items = useCart((s) => s.items);
  const count = items.reduce((n, i) => n + i.qty, 0);
  const { lang, toggle } = useLang();

  useEffect(() => {
    // Force English (LTR) layout over any cached Arabic state
    if (lang === "ar") {
      toggle();
    }
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lang, toggle]);

  return (
    <header className={`store-header${scrolled ? " is-scrolled" : ""}`} id="store-header" dir="ltr">

      <div className="store-container store-header__inner">
        <Link className="store-wordmark" to="/" aria-label="Tibr">
          Tibr<span className="dot">.</span>
        </Link>

        <nav className="store-nav" aria-label="Categories">
          <ul className="store-nav__list">
            {[
              { to: "/", label: "Home" },
              { to: "/shop/perfumes", label: "Shop" },
              { to: "/about", label: "About" },
              { to: "/account", label: "Profile" },
            ].map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  className={({ isActive }) =>
                    `store-nav__link${isActive ? "" : ""}`
                  }
                  to={to}
                  aria-current={({ isActive }) => (isActive ? "page" : undefined)}
                >
                  {({ isActive }) => (
                    <span aria-current={isActive ? "page" : undefined}>{label}</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="store-utils">
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
