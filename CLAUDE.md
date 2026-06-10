# Robabikia — Project Context

## Design Context

**This project has TWO surfaces with TWO registers.** See PRODUCT.md for the full brief.

### Landing page (`view-home`) — register: `brand` — KEEP AS-IS
- The existing Egyptian-heritage design is locked. Work here is **additive only**: animation and motion.
- Do not restyle, re-token, or re-theme the landing.
- Identity: Rakkas (Arabic display) + Cinzel Decorative (English display) + Cormorant Garamond / Amiri (body), gold-on-near-black, intro curtain, scroll-driven 3D.

### Store / app layer (everything else) — register: `product` — FULL REDESIGN
- Ground-up **new premium design system**; all Egyptian-theme styling is removed and replaced here.
- **Aesthetic:** dark boutique — charcoal/ink surfaces, raised graphite panels, spotlit cinematic product photography (Tom Ford / Byredo / Net-a-Porter dark mood).
- **Accent:** a single refined, desaturated gold as the through-line (keeps the store reading as Robabikia). One accent only, used with restraint.
- **Type:** fresh system distinct from the landing. Avoid reflex-reject families and Cormorant Garamond. Arabic-first.
- **No modals for auth:** login, sign-up, forgot-password are dedicated full pages.
- **Architecture decision:** move the store off the current hash SPA to **real multi-page** (separate routes/URLs, working back button, SEO). Changes `server.js` routing.

### Store implementation (built)
The dark-boutique system is implemented as real multi-page, separate from the landing's Egyptian CSS/JS.
- **CSS** (`css/store/`): `tokens.css` (OKLCH dark ramp, type, sharp radii, motion, z-index) → `base.css` (reset, RTL logical props, a11y) → `chrome.css` (header/drawer/footer) → `components.css` (buttons, forms+validation, stepper, badges, table, summary, order-card, toast, reveal) → `pages.css` (pdp, cart, checkout, auth, dashboard, admin) → `catalog.css` (perfumes listing only).
- **JS** (`js/store/`): `chrome.js` is shared on every page — injects header/drawer/footer/toast when absent, runs the language system, persists a localStorage cart, exposes `window.RB` ({lang, cart, orders, toast, addToCart, formatPrice, arDigits}). Per-page: `catalog.js`, `product.js`, `cart.js`, `checkout.js`, `auth.js`, `account.js`, `admin.js`.
- **Pages/routes** (Express static, extensionless): `/shop/perfumes`, `/product?id=`, `/cart`, `/checkout`, `/login`, `/signup`, `/account?tab=`, `/admin`. Files at root (`product.html`, `cart.html`, …) except the listing under `shop/`.
- **Bilingual pattern:** `<span data-lang-ar>`/`<span data-lang-en>` swapped by CSS via `:root[lang]`; attributes (alt/aria/placeholder) via `data-ar-*`/`data-en-*` applied in `chrome.js`. Old landing uses the global `translations.js` dict; the store is self-contained.
- **Demo data:** real perfume catalog (3 products with real photography). Cart/orders/addresses/admin use localStorage so flows are demonstrable; backend wiring (Supabase/`server.js` API) is not yet connected to these pages.
- **Still to do:** clothing/sneakers category pages need real product photography; connect forms to the Supabase API; the SPA→multipage migration of the old `index.html` views.

### Landing cleanup (index.html)
The old SPA was stripped down to the landing + the 3D experience:
- **Kept:** intro curtain, `#perfume-3d-shell` + `view-perfumes` (its `#scroll-container` drives the 3D timeline) + `router.js` + `js/ui/3d-experience.js` — **the 3D experience is preserved untouched and dormant (not linked from nav)**, to be re-integrated later. Also kept: `view-home` (hero/story/how-to-order), footer, and scripts `translations.js`, `lang.js`, `router.js`, `intro.js`, `scroll.js`, `gallery.js`.
- **Removed from index.html:** all other SPA views (clothes, shoes, login, register, forgot, account, admin, wishlist, search, men, women, cart, checkout, order-confirm), the old cart drawer + product/auth/order/admin modals, and the old feature scripts (auth, orders, cart, checkout, wishlist, account, admin, search, reviews, products, shop, cinematic-ad, api-client, supabase-client, utils).
- **Nav (storytelling, zero commerce):** Home (`#home`), Our Story (`#story`), and a single **Shop Now** button → `/shop/perfumes`. The hero CTA "Discover our collection" also enters at `/shop/perfumes`. No cart/account icons, no WhatsApp CTA (footer WhatsApp order card removed too). Language toggle kept.
- **Dead code pruned:** old feature JS deleted (`js/features/*` removed entirely; `js/core/{api-client,supabase-client,utils}.js`; `js/ui/{products,shop,cinematic-ad}.js`) and unused view CSS deleted (`cinematic-ad/cart/checkout/auth/account/search.css`).
- **Kept despite looking "old" (entangled with the 3D, do not remove):** `css/components/products.css` (defines the 3D shell classes: `.experience-3d`, `.scroll-container`, `.scene-text`, `.loader-screen`), `css/components/shop.css` (styles the 3D's catalog reveal inside `view-perfumes`), `css/layout/utils.css` (`.glass-panel`, `.no-transitions` used by the landing). Remaining landing JS: `translations.js`, `lang.js`, `router.js`, `intro.js`, `scroll.js`, `gallery.js`, `3d-experience.js`.

### Shared
- **Users:** Arabic-speaking Egyptian consumers (20–45), mobile-first. RTL (`dir="rtl"`, `lang="ar"`) default, EN toggle on both surfaces.
- **Brand soul:** الأصالة والحنين والفخامة — Authenticity, Nostalgia, Luxury.
- **Anti-references:** Western luxury minimalism (Didot/cream/Swiss); generic Arabic e-commerce (Noon/Jumia); warm-cream light store; glassmorphism-everywhere.
- **Current stack:** single `index.html` SPA + `js/ui/router.js` (hash routing), CSS in `css/`, served by Express. Supabase backend. **The store redesign migrates this to multi-page.**
- **Live mode:** configured at `.impeccable/live/config.json`. **DESIGN.md:** not yet generated (run `/impeccable document` for the landing; the store system gets documented once it's built).
