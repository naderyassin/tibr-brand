import { Link } from "react-router-dom";

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.1 14.9l-.3-.2-2.8.8.8-2.7-.2-.3A8 8 0 0 1 12 4zm4.4 10.2c-.2-.1-1.3-.7-1.5-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.1-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.1-.2 0-.4.1-.5l.4-.5c.1-.1.1-.3 0-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.8.8-.8 2 0 3.2a9 9 0 0 0 3.9 3.5c1.3.6 1.9.6 2.6.5.4 0 1.3-.5 1.5-1 .2-.5.2-1 .1-1z" />
  </svg>
);

export default function Footer() {
  return (
    <footer className="store-footer">
      <div className="store-container">
        <div className="store-footer__grid">
          <div className="store-footer__brand">
            <Link className="store-wordmark" to="/">Tibr<span className="dot">.</span></Link>
            <p className="store-footer__tagline">
              Egyptian perfume — joining the heritage of the past to the luxury of the present.
            </p>
          </div>

          <div className="store-footer__col">
            <h4>Shop</h4>
            <ul>
              <li><Link to="/shop/perfumes">Perfumes</Link></li>
              <li><Link to="/account?tab=wishlist">Wishlist</Link></li>
            </ul>
          </div>

          <div className="store-footer__col">
            <h4>Help</h4>
            <ul>
              <li><Link to="/help/ordering">How to order</Link></li>
              <li><Link to="/help/shipping">Shipping &amp; cash on delivery</Link></li>
              <li><Link to="/help/returns">Returns &amp; exchanges</Link></li>
              <li><Link to="/account">My account</Link></li>
            </ul>
          </div>

          <div className="store-footer__col">
            <h4>Contact</h4>
            <a className="store-footer__whatsapp" href="https://wa.me/" target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon />
              Chat on WhatsApp
            </a>
            <p className="store-footer__note">Cash on delivery across every Egyptian governorate.</p>
          </div>
        </div>

        <div className="store-footer__bar">
          <span>© 2026 Tibr. All rights reserved.</span>
          <span>Made in Cairo</span>
        </div>
      </div>
    </footer>
  );
}
