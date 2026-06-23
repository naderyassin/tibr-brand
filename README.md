# TIBR — تبر

A luxury Egyptian fragrance brand. Perfumes-only store, dark-boutique design.

## Architecture

### Store (`/shop/*`, `/product`, `/cart`, `/checkout`, `/account`, `/admin`) — React SPA
Dark-boutique store built in React, served from `dist/client/` (Vite build). Charcoal/ink surfaces, cinematic product photography, single desaturated-gold accent.

**Stack:** Vite + React 19 + React Router 7 (BrowserRouter) + Zustand + TanStack Query + Framer Motion  
**Backend:** Express + Supabase (auth, products, orders, profiles)  
**CSS:** shared design system in `css/store/`; client imports from there — do not duplicate styles in `client/`

## Project Structure

```
css/
  store/                # Shared store design system (tokens, components)
client/                 # React SPA (store)
  src/
    App.jsx             # Routes
    main.jsx            # Providers (QueryClient, Router)
    components/
      layout/           # AppShell, Header, Footer, MobileDrawer
      catalog/          # ProductCard
      ui/               # Toast
    pages/              # Product, Cart, Checkout, Login, Signup, Account, Admin
    pages/shop/         # Category catalog pages
    stores/             # Zustand: cart, auth, lang
    lib/
      api.js            # Fetch wrapper + typed endpoint helpers
      supabase.js       # Supabase client
server.js               # Express — redirects / to /shop/perfumes, proxies /api, serves dist/client for store routes
```

## Routes

| Path | Page |
|------|------|
| `/` | → redirects to `/shop/perfumes` |
| `/shop/perfumes` | Perfumes catalog |
| `/product?id=` | Product detail |
| `/cart` | Cart |
| `/checkout` | Checkout |
| `/login` | Login |
| `/signup` | Sign up |
| `/account?tab=` | Account (orders, addresses, wishlist) |
| `/admin` | Admin dashboard |
| `/admin/product` | Admin product editor |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/products` | Product catalog |
| GET | `/api/products/:id` | Single product |
| GET | `/api/profile` | Authenticated user profile |
| GET | `/api/orders` | User orders |
| POST | `/api/orders` | Create order |
| POST | `/api/products` | Admin — create product |
| PATCH | `/api/products/:id` | Admin — update product |
| DELETE | `/api/products/:id` | Admin — delete product |

## Local Development

```bash
cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_ANON_KEY
npm install
npm run dev:all
```

- Express API + store (production): [http://localhost:3000](http://localhost:3000)
- Vite dev server (store, with `/api` proxy): [http://localhost:5173](http://localhost:5173)

## Building the Store

```bash
npm run client:build
```

Outputs to `dist/client/`. The Express server serves this build for all store routes. If `dist/client/` is missing, store routes return 404 until a build is run.

## Notes

- Bilingual (AR/EN): lang store drives `<html lang/dir>`; AR is the default.
- Auth is dedicated full pages (no modals).
- Cart persists client-side via Zustand.
- WhatsApp contact link in the store footer uses a placeholder number.
