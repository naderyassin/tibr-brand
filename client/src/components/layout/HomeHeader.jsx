import { Link } from "react-router-dom";

export default function HomeHeader() {
  return (
    <header className="store-header home-header" id="store-header">
      <div className="store-container home-header__inner">
        <Link className="store-wordmark" to="/" aria-label="TIBR">
          TIBR<span className="dot">.</span>
        </Link>
        <Link className="home-header__shop-btn" to="/shop">
          SHOP
        </Link>
      </div>
    </header>
  );
}

