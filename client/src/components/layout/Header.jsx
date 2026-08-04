import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/stores/cart";
import { useAuth } from "@/stores/auth";
import { useAuthModal } from "@/stores/authModal";
import { useLang, useT } from "@/stores/lang";
import { getProfile } from "@/lib/api";

const BagIcon = () => (
  <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
    <g transform="translate(1.4 1.4) scale(2.81 2.81)">
      <path d="M 75.927 56.703 H 43.784 c -1.539 0 -2.897 -1.005 -3.347 -2.477 L 30.199 20.754 h -8.58 c -1.933 0 -3.5 -1.567 -3.5 -3.5 s 1.567 -3.5 3.5 -3.5 h 11.169 c 1.539 0 2.897 1.005 3.347 2.476 l 10.239 33.473 h 27.227 l 7.633 -18.164 H 54.06 c -1.933 0 -3.5 -1.567 -3.5 -3.5 s 1.567 -3.5 3.5 -3.5 H 86.5 c 1.172 0 2.267 0.587 2.915 1.563 c 0.648 0.977 0.766 2.213 0.312 3.293 L 79.153 54.559 C 78.607 55.858 77.336 56.703 75.927 56.703 z" />
      <circle cx="41.455" cy="67.935" r="4.815" />
      <circle cx="77.195" cy="67.935" r="4.815" />
      <path d="M 25.434 56.703 H 8.687 c -1.933 0 -3.5 -1.567 -3.5 -3.5 s 1.567 -3.5 3.5 -3.5 h 16.747 c 1.933 0 3.5 1.567 3.5 3.5 S 27.367 56.703 25.434 56.703 z" />
      <path d="M 20.247 42.18 H 3.5 c -1.933 0 -3.5 -1.567 -3.5 -3.5 s 1.567 -3.5 3.5 -3.5 h 16.747 c 1.933 0 3.5 1.567 3.5 3.5 S 22.18 42.18 20.247 42.18 z" />
    </g>
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
const SignOutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const NAVIGATION = [
  { label: "Home", label_ar: "الرئيسية", to: "/" },
  { label: "Shop", label_ar: "المتجر", to: "/shop" },
  { label: "About", label_ar: "من نحن", to: "/about" },
  { label: "Profile", label_ar: "حسابي", to: "/account", auth: true },
];

export default function Header({ onMenuOpen }) {
  const [scrolled, setScrolled] = useState(false);
  const items = useCart((s) => s.items);
  const count = items.reduce((n, i) => n + i.qty, 0);
  const token = useAuth((s) => s.token);
  const signOut = useAuth((s) => s.signOut);
  const openLogin = useAuthModal((s) => s.openLogin);
  const t = useT();
  const lang = useLang((s) => s.lang);
  const toggleLang = useLang((s) => s.toggle);
  const { data: profileData } = useQuery({
    queryKey: ["profile", token],
    queryFn: () => getProfile(token),
    enabled: !!token,
  });
  const role = profileData?.data?.role;
  const isAdmin = role === "admin" || role === "super_admin";

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

        <nav className="store-nav" aria-label={t("Categories", "الأقسام")}>
          <ul className="store-nav__list">
            {NAVIGATION.map((item) => (
              <li key={item.label} className="store-nav__item group">
                {item.auth && !token ? (
                  <button type="button" className="store-nav__link" onClick={openLogin}>
                    {t(item.label, item.label_ar)}
                  </button>
                ) : (
                  <NavLink className="store-nav__link" to={item.to} end={item.to === "/"}>
                    {t(item.label, item.label_ar)}
                  </NavLink>
                )}
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
          <button
            className="store-iconbtn store-lang-toggle"
            type="button"
            onClick={toggleLang}
            aria-label={t("Switch to Arabic", "التبديل إلى الإنجليزية")}
          >
            {lang === "ar" ? "EN" : "AR"}
          </button>
          {isAdmin && (
            <Link className="store-iconbtn" to="/admin" aria-label={t("Control Panel", "لوحة التحكم")}>
              <SettingsIcon />
            </Link>
          )}
          {token && (
            <button
              className="store-iconbtn"
              type="button"
              onClick={signOut}
              aria-label={t("Sign out", "تسجيل الخروج")}
            >
              <SignOutIcon />
            </button>
          )}
          <Link className="store-iconbtn" to="/cart" aria-label={t("Cart", "السلة")}>
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
            aria-label={t("Menu", "القائمة")}
            onClick={onMenuOpen}
          >
            <MenuIcon />
          </button>
        </div>
      </div>
    </header>
  );
}
