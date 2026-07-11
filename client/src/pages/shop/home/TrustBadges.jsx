// Every claim here is already stated elsewhere on the site (Footer.jsx) —
// no new promises are invented for this badge row.
const BADGES = [
  {
    title: "FREE SHIPPING",
    text: "Free shipping on all order above 3000",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M3 10h18M8 10V4M16 10V4" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
        <path d="M17 16H7" />
        <path d="M5 18H2v-4h1" />
        <path d="M19 18h3v-4h-1" />
      </svg>
    ),
  },
  {
    title: "PAYMENT SECURE",
    text: "We ensure your data is fully protected.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
        <rect x="13" y="14" width="8" height="6" rx="1" fill="var(--bg)" stroke="currentColor" />
        <path d="M15 14v-2a2 2 0 1 1 4 0v2" />
      </svg>
    ),
  },
  {
    title: "14 DAYS RETURN",
    text: "Simply return it within 14 days",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
        <rect x="4" y="4" width="16" height="12" rx="2" />
        <path d="M4 9h16M12 4v5" />
        <circle cx="16" cy="17" r="5" fill="var(--bg)" stroke="currentColor" />
        <path d="M16 15v2l1.5 1.5" />
      </svg>
    ),
  },
  {
    title: "ORIGINAL 100%",
    text: "All products are guaranteed authentic.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
        <rect x="4" y="4" width="16" height="14" rx="2" />
        <path d="M4 9h16M12 4v5" />
        <circle cx="12" cy="15" r="4.5" fill="var(--bg)" stroke="currentColor" />
        <path d="M12 12.5l.8 1.8 2 .3-1.4 1.4.3 2-1.7-.9-1.7.9.3-2-1.4-1.4 2-.3z" />
      </svg>
    ),
  },
];

export default function TrustBadges() {
  return (
    <section className="trust-badges" aria-label="Why shop with us">
      {BADGES.map((b) => (
        <div className="trust-badge" key={b.title}>
          <span className="trust-badge__icon" aria-hidden="true">{b.icon}</span>
          <span className="trust-badge__title">{b.title}</span>
          <span className="trust-badge__text">{b.text}</span>
        </div>
      ))}
    </section>
  );
}
