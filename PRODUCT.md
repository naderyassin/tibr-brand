# Product

## Register

brand

> **This project has two surfaces with two registers.** See **Surfaces & Registers** below. The bare value above is the project default (the public landing page is the brand's front door). Per-task, pick the register from the surface in focus: the landing is `brand`, the store/app layer is `product`.

## Surfaces & Registers

TIBR is one brand house with two distinct experiences. They share a name and an audience, not a treatment.

- **Landing page (`view-home`) — register: `brand`.** The existing Egyptian-heritage design is the brand's emotional portal and stays as-is. Work here is additive only: layer in animation and motion choreography. Do not restyle, re-token, or re-theme the landing. Its identity (Rakkas / Cinzel / Cormorant, gold-on-near-black, ornament, intro curtain, scroll-driven 3D) is locked and preserved.
- **Store / app layer (everything else) — register: `product`.** A complete e-commerce application: the perfumes catalog, product detail, cart, checkout, order confirmation, search, wishlist, account dashboard, admin control panel, and dedicated full-page login / sign-up / forgot-password. This layer is a **ground-up redesign on a brand-new premium design system** (see **Store Design System** below). All Egyptian-theme-derived styling is removed and replaced here. No modals for auth: every flow is its own full page.

The two surfaces must still read as one house. The through-line is a single refined gold accent and the TIBR name, not shared ornament or shared type.

## Users

Arabic-speaking Egyptian consumers — primarily aged 20–45 — who have a nostalgic connection to old Cairo, Egyptian street culture, and classic family aesthetics. They browse on mobile, respond to warm emotional storytelling, and value authenticity over generic luxury. They want to feel proud of choosing something distinctly Egyptian rather than a pale imitation of western brands.

Secondary audience: diaspora Egyptians and Arabic-speaking customers across the Middle East who feel the pull of cultural heritage.

The store layer serves this same audience mid-task: browsing a catalog, comparing products, managing a cart, signing in, and placing a cash-on-delivery order. Here they need clarity, speed, and confidence, not storytelling.

## Product Purpose

TIBR is a luxury Egyptian perfume brand. Every product is positioned as a handcrafted story, not just a purchase.

The landing experience should feel like opening your grandmother's wardrobe: rich scents, textured fabrics, and the weight of real things. The store experience should feel like walking into a dark, spotlit boutique: the product is the only thing lit, everything around it recedes. Orders are fulfilled across all Egyptian governorates with cash-on-delivery. WhatsApp is the primary human touchpoint.

Success looks like: a visitor landing directly in a store that feels considered, organized, and unmistakably high-end.

## Brand Personality

الأصالة، الحنين، الفخامة — Authenticity, Nostalgia, Luxury.

Voice: warm, poetic, proud. Arabic-first. The brand speaks in the Egyptian dialect used in the story section — intimate and direct, not formal or stiff. English is a secondary label, never the primary voice.

Emotional goals: evoke cultural pride, create a sense of belonging to something genuine, inspire quiet confidence. In the store layer the poetry recedes and the confidence stays: fewer words, more product, no clutter.

## Store Design System

The new premium system for the entire store/app layer. Direction is committed; treat these as constraints, not suggestions.

- **Aesthetic lane:** dark boutique. Charcoal / ink surfaces, raised graphite for elevated panels, cinematic spotlit product photography. Reference mood: Tom Ford, Byredo, Net-a-Porter's dark moments. Not Egyptian, not ornamental, not warm-cream, not navy-and-gold cliché.
- **Accent:** a single refined, desaturated gold, carried over from the brand as the through-line so the store still reads as TIBR. Used with restraint to mark what matters (price, primary action, active state), never as decoration. One accent only.
- **Typography:** the store gets its own fresh type system, distinct from the landing's Rakkas / Cinzel / Cormorant. Pick fonts by voice (refined, organized, modern luxury retail), avoid the reflex-reject families, and avoid Cormorant Garamond specifically (already flagged on the landing). Arabic-first, so the Arabic face carries equal weight to the Latin face.
- **Language / direction:** Arabic-first RTL by default with the bilingual EN toggle preserved, matching the landing and the audience.
- **No modals for auth:** login, sign-up, and forgot-password are dedicated full pages.

## Architecture

The store layer moves from the current hash-based SPA (single `index.html` with `.spa-view` sections + `router.js`) to **real multi-page**: separate routes / HTML entries with real URLs, a working browser back button, and proper SEO. This is a deliberate change from the current SPA; `server.js` routing and the build change accordingly. The landing page is unaffected by the registers split but participates in the new routing as the `/` entry.

## Anti-references

- **Western luxury minimalism (for the landing):** Cream backgrounds, Didot serifs, Swiss grid restraint. Reads as foreign and impersonal for a brand rooted in Cairo's bazaars.
- **Generic Arabic e-commerce:** Noon.com / Jumia-style utility — cluttered, price-forward, functional but soulless. The store is dark, calm, and product-led, the opposite of a marketplace.
- **Warm-cream / paper light store:** the AI-default warm near-white body is explicitly rejected for the store. The store is dark boutique, not editorial-light.
- **Glassmorphism everywhere:** the prior build over-used glass panels as the default card. The new system uses solid graphite surfaces; glass is rare and purposeful if used at all.

## Design Principles

1. **Two worlds, one house:** the landing is a heritage portal; the store is a dark boutique. They connect through the gold accent and the name, not through shared ornament. Don't bleed Egyptian theming into the store, and don't modernize the landing.
2. **The product is the only thing lit:** in the store, surfaces recede and product photography carries the visual weight. Spotlight, don't decorate.
3. **Gold earns its place:** the accent marks what matters (price, primary action, active state). Restraint keeps its authority. This holds in both worlds.
4. **Arabic leads:** RTL is the default experience across both surfaces. English exists as a courtesy, not a primary voice.
5. **Organized over expressive (store):** the store's job is clarity and confidence across three categories. Unified grammar, predictable layout, no per-category reinvention.

## Accessibility & Inclusion

WCAG AA baseline: 4.5:1 text contrast ratio (critical on dark surfaces — verify gold and muted text against charcoal, don't ship low-contrast "elegant" gray), keyboard navigation for primary flows including the full-page auth, visible focus states on the dark theme, screen reader support for interactive elements, and meaningful alt text on product images. Reduced-motion alternatives for all store and landing animation.
