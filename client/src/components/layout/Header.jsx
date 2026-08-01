import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/stores/cart";
import { useAuth } from "@/stores/auth";
import { useLang, useT } from "@/stores/lang";
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
  { label: "Home", label_ar: "الرئيسية", to: "/" },
  { label: "Shop", label_ar: "المتجر", to: "/shop" },
  { label: "About", label_ar: "من نحن", to: "/about" },
  { label: "Profile", label_ar: "حسابي", to: "/account" },
];

export default function Header({ onMenuOpen }) {
  const [scrolled, setScrolled] = useState(false);
  const items = useCart((s) => s.items);
  const count = items.reduce((n, i) => n + i.qty, 0);
  const token = useAuth((s) => s.token);
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
                <NavLink className="store-nav__link" to={item.to} end={item.to === "/"}>
                  {t(item.label, item.label_ar)}
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
