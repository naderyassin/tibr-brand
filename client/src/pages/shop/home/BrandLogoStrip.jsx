import { Link } from "react-router-dom";

// Real brands TIBR carries. No logo image assets yet — styled wordmarks for
// now; drop a `logo` (image path) into any entry below to swap in a real
// logo with no other code changes.
const BRANDS = [
  { name: "Giorgio Armani", logo: "/brands/armani.png" },
  { name: "BOSS", logo: "/brands/boss.png" },
  { name: "Burberry", logo: "/brands/burberry.png" },
  { name: "Dior", logo: "/brands/dior.png" },
  { name: "Gucci", logo: "/brands/gucci.png" },
  { name: "Tom Ford", logo: "/brands/tomford.png" },
];

export default function BrandLogoStrip() {
  return (
    <section className="brand-strip-container" aria-label="Brands we carry">
      <h2 className="brand-strip__header">Famous brands</h2>
      <div className="brand-strip">
        {BRANDS.map((b) => (
          <Link
            key={b.name}
            to={`/shop/brands/${encodeURIComponent(b.name)}`}
            className="brand-strip__card"
          >
            {b.logo ? (
              <img src={b.logo} alt={b.name} className="brand-strip__logo" />
            ) : (
              <span className="brand-strip__wordmark">{b.name}</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
