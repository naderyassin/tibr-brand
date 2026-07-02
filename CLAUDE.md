# TIBR — Project Context

## Design Context

**This project has TWO surfaces with TWO registers.** See PRODUCT.md for the full brief.

### Landing page (`view-home`) — register: `brand`
- Hero section (`ScrollSequence` scroll-scrubbed frame sequence in `Collection.jsx`) is locked — work there is **additive only**: animation and motion, no restyling.
- Everything below the hero (Philosophy, Marquee, Collections, Heritage timeline) is open to redesign — as of the Framer Motion redesign, it keeps the gold-on-near-black Egyptian-heritage identity but layout/motion can evolve freely.
- Identity: Rakkas (Arabic display) + Cinzel Decorative (English display) + Cormorant Garamond / Amiri (body), gold-on-near-black.

### Store / app layer (everything else) — register: `product` — FULL REDESIGN
- Ground-up **new premium design system**; all Egyptian-theme styling is removed and replaced here.
- **Aesthetic:** dark boutique — charcoal/ink surfaces, raised graphite panels, spotlit cinematic product photography (Tom Ford / Byredo / Net-a-Porter dark mood).
- **Accent:** a single refined, desaturated gold as the through-line (keeps the store reading as TIBR). One accent only, used with restraint.
- **Type:** fresh system distinct from the landing. Avoid reflex-reject families and Cormorant Garamond. Arabic-first.
- **No modals for auth:** login, sign-up, forgot-password are dedicated full pages.
- **Architecture decision:** move the store off the current hash SPA to **real multi-page** (separate routes/URLs, working back button, SEO). Changes `server.js` routing.

### Store implementation (built) — React SPA
The dark-boutique store is a **React app** (`client/`), separate from the landing's vanilla Egyptian CSS/JS. Migrated from the original vanilla multi-page implementation; the old `pages/`, `shop/`, and `js/store/` directories were deleted in the cutover.
- **Stack:** Vite + React 19 + React Router 7 (`BrowserRouter`) + Zustand (cart/auth/lang stores in `client/src/stores/`) + TanStack Query + Framer Motion.
- **CSS:** still the shared design system in `css/store/` — `client/src/styles/index.css` is just `@import "../../../css/store/store.css"`. Do not duplicate store styles in the client; edit `css/store/`.
- **Structure** (`client/src/`): `App.jsx` (routes), `main.jsx` (providers), `components/layout/` (AppShell, Header, Footer, MobileDrawer), `components/catalog/ProductCard`, `components/ui/Toast`, `pages/` (Product, Cart, Checkout, Login, Signup, Account, Admin, AdminProduct + `pages/shop/` catalog), `lib/api.js` (fetch wrapper + typed endpoint helpers), `lib/supabase.js`.
- **Routes** (React Router): `/shop/perfumes`, `/product?id=`, `/cart`, `/checkout`, `/login`, `/signup`, `/account?tab=`, `/admin`, `/admin/product`, `/wishlist` (→ account tab).
- **Backend:** wired to the real `server.js`/Supabase API via `lib/api.js` (products, profile, addresses, orders, checkout, admin). Cart persists client-side via the Zustand store.
- **Bilingual pattern:** the lang store (`client/src/stores/lang.js`) drives `<html lang/dir>`; components render AR/EN inline.
- **Dev:** `npm run dev:all` (Express on :3000 + Vite on :5173, which proxies `/api` and `/assets` to Express). **Build:** `npm run client:build` → `dist/client/`; `server.js` serves that build for store routes. If `dist/client` is missing, store routes are unavailable until a build is run.

### Shared
- **Users:** Arabic-speaking Egyptian consumers (20–45), mobile-first. RTL (`dir="rtl"`, `lang="ar"`) default, EN toggle on both surfaces.
- **Brand soul:** الأصالة والحنين والفخامة — Authenticity, Nostalgia, Luxury.
- **Anti-references:** Western luxury minimalism (Didot/cream/Swiss); generic Arabic e-commerce (Noon/Jumia); warm-cream light store; glassmorphism-everywhere.
- **Current stack:** React store SPA (`client/`, built to `dist/client/`), served by Express. `/` redirects to `/shop/perfumes`. Supabase backend.
- **Live mode:** configured at `.impeccable/live/config.json`.
