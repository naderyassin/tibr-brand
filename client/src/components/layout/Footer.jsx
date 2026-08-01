import { Link } from "react-router-dom";
import { SHOP_NAV } from "@/lib/shopNav";
import { useT } from "@/stores/lang";

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H7.5v-3H10V9.69c0-2.47 1.47-3.83 3.72-3.83 1.08 0 2.21.19 2.21.19v2.43h-1.25c-1.23 0-1.61.76-1.61 1.54V12h2.74l-.44 3h-2.3v6.8c4.56-.93 8-4.96 8-9.8z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-5.2-1.74 2.89 2.89 0 0 1 2.31-1.41V9.07a6.34 6.34 0 0 0-5.38 2.44 6.35 6.35 0 1 0 10.63 4.54V9.6a8.16 8.16 0 0 0 4.86 1.59V7.73a4.83 4.83 0 0 1-3-.04z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.1 14.9l-.3-.2-2.8.8.8-2.7-.2-.3A8 8 0 0 1 12 4zm4.4 10.2c-.2-.1-1.3-.7-1.5-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.1-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.1-.2 0-.4.1-.5l.4-.5c.1-.1.1-.3 0-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.8.8-.8 2 0 3.2a9 9 0 0 0 3.9 3.5c1.3.6 1.9.6 2.6.5.4 0 1.3-.5 1.5-1 .2-.5.2-1 .1-1z" />
  </svg>
);

const SOCIAL_LINKS = [
  {
    name: "Facebook",
    url: "https://www.facebook.com/Yperfumes.eg",
    icon: FacebookIcon,
    className: "store-footer__social-link--facebook",
  },
  {
    name: "Instagram",
    url: "https://www.instagram.com/amry.aseen",
    icon: InstagramIcon,
    className: "store-footer__social-link--instagram",
  },
  {
    name: "TikTok",
    url: "https://www.tiktok.com/@amr.yaseen8?_r=1&_t=ZS-98J9OVwaNVM",
    icon: TikTokIcon,
    className: "store-footer__social-link--tiktok",
  },
  {
    name: "WhatsApp",
    url: "https://wa.me/message/7IF766RWOGXAA1",
    icon: WhatsAppIcon,
    className: "store-footer__social-link--whatsapp",
  },
];

export default function Footer() {
  const t = useT();
  return (
    <footer className="store-footer">
      <div className="store-container">
        <div className="store-footer__grid">
          <div className="store-footer__brand">
            <Link className="store-wordmark" to="/">Tibr<span className="dot">.</span></Link>
            <p className="store-footer__tagline">
              {t(
                "Egyptian perfume — joining the heritage of the past to the luxury of the present.",
                "عطر مصري — يجمع بين أصالة الماضي وفخامة الحاضر."
              )}
            </p>
            <div className="store-footer__socials">
              <a className="store-footer__whatsapp-pill" href="https://wa.me/message/7IF766RWOGXAA1" target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon />
                <span>{t("WhatsApp Support", "الدعم عبر واتساب")}</span>
              </a>
              <div className="store-footer__social-icons">
                {SOCIAL_LINKS.map(({ name, url, icon: Icon, className }) => (
                  <a
                    key={name}
                    className={`store-footer__social-link ${className}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={name}
                    title={name}
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="store-footer__col">
            <h4>{t("Shop", "المتجر")}</h4>
            <ul>
              {SHOP_NAV.map((tab) => (
                <li key={tab.key}><Link to={tab.path}>{t(tab.label, tab.label_ar)}</Link></li>
              ))}
              <li><Link to="/account?tab=wishlist">{t("Wishlist", "المفضلة")}</Link></li>
            </ul>
          </div>

          <div className="store-footer__col">
            <h4>{t("Help & Care", "المساعدة والرعاية")}</h4>
            <ul>
              <li><Link to="/help/ordering">{t("How to order", "طريقة الطلب")}</Link></li>
              <li><Link to="/help/shipping">{t("Shipping & cash on delivery", "الشحن والدفع عند الاستلام")}</Link></li>
              <li><Link to="/help/returns">{t("Returns & exchanges", "الإرجاع والاستبدال")}</Link></li>
              <li><Link to="/account">{t("My account", "حسابي")}</Link></li>
            </ul>
          </div>

          <div className="store-footer__col store-footer__newsletter">
            <h4>{t("Join Tibr", "انضم إلى تِبر")}</h4>
            <p className="store-footer__newsletter-desc">
              {t(
                "Subscribe to receive scent stories, collection releases, and private offers.",
                "اشترك لتصلك قصص العطور وإطلاقات المجموعات والعروض الخاصة."
              )}
            </p>
            <form className="store-footer__newsletter-form" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder={t("Your email address", "بريدك الإلكتروني")}
                className="store-footer__newsletter-input"
                required
              />
              <button type="submit" className="store-footer__newsletter-btn" aria-label={t("Subscribe", "اشتراك")}>
                →
              </button>
            </form>
            <p className="store-footer__note">{t("Cash on delivery across every governorate in Egypt.", "الدفع عند الاستلام في جميع محافظات مصر.")}</p>
          </div>
        </div>

        <div className="store-footer__bar">
          <span>{t("© 2026 Tibr. All rights reserved.", "© 2026 تِبر. جميع الحقوق محفوظة.")}</span>
          <span>{t("Crafted in Cairo, Egypt", "صُنع في القاهرة، مصر")}</span>
        </div>
      </div>
    </footer>
  );
}
