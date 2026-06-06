# Robabikia Perfumes

Landing page for **روبابيكيا للعطور**, a luxury perfume brand concept inspired by Egyptian nostalgia, warm storytelling, and modern premium branding.

## What’s Included

- Intro curtain animation with a skip action
- RTL Arabic-first hero section
- Featured scents area populated by JavaScript
- Brand story section with parallax-style background treatment
- Simple ordering steps and footer contact area
- Custom visuals, CSS split by section, and lightweight vanilla JS interactions

## Project Structure

- `index.html` - main single-page experience
- `css/` - styling, variables, animations, and section-specific layout files
- `js/` - intro, gallery, products, and scroll behavior
- `assets/images/` - hero and product imagery
- `robabikia_plan.md` - original design and implementation notes

## Run Locally

This project now includes:

- A static frontend served by Express
- A backend API for products, orders, and profile/admin checks
- Supabase as the database and auth provider

1. Create an environment file:

```bash
cp .env.example .env
```

2. Fill in these values in `.env`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

If your project already uses Vite-style names, the backend also accepts:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

3. Install dependencies and start the app:

```bash
npm install
npm run dev
```

The app runs on [http://localhost:3000](http://localhost:3000).

## API Endpoints

- `GET /api/health` - health check
- `GET /api/products` - public product catalog
- `GET /api/profile` - authenticated user profile
- `POST /api/orders` - create an order for the logged-in user
- `POST /api/products` - admin-only product creation

## Notes

- The WhatsApp contact link in `index.html` currently uses a placeholder phone number.
- Frontend auth still uses Supabase in the browser for login/session management.
- Product, profile, and order data access now goes through the backend API.
- Fonts are loaded from Google Fonts.
- The site is designed for Arabic RTL layout.
