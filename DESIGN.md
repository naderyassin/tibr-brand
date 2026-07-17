---
name: "Tibr (تِبْر)"
description: "Egyptian luxury brand — gold-on-black heritage portal landing + a monochrome black-and-white boutique store"
colors:
  # Landing surface — canonical hex (css/base/variables.css)
  landing-bg: "#0D0A07"
  landing-gold: "#C9A84C"
  landing-text: "#EDE0C8"
  landing-text-2: "#C1B5A0"
  landing-burgundy: "#7B2D3E"
  # Store surface — canonical OKLCH (css/store/store.css tokens)
  # Stitch linter warns on OKLCH; values are correct and intentional.
  store-bg: "oklch(0.165 0.006 75)"
  store-bg-raised: "oklch(0.205 0.007 74)"
  store-surface: "oklch(0.225 0.008 72)"
  store-surface-2: "oklch(0.265 0.009 72)"
  store-line: "oklch(0.34 0.010 72)"
  store-line-strong: "oklch(0.44 0.012 72)"
  store-ink: "oklch(0.952 0.008 82)"
  store-ink-2: "oklch(0.808 0.012 80)"
  store-muted: "oklch(0.688 0.013 78)"
  # The store register's accent is monochrome black/ink — gold is NOT used in the
  # store. Gold is retained for the landing surface only (see "The Monochrome Rule").
  store-accent: "oklch(0.10 0 0)"                # near-black — prices, primary actions, active states
  store-accent-bright: "oklch(0.25 0 0)"         # hover
  store-accent-deep: "oklch(0.05 0 0)"           # pressed
  store-accent-ghost: "oklch(0.10 0 0 / 0.06)"   # tint fills
  store-accent-line: "oklch(0.10 0 0)"           # accent hairlines
  store-on-accent: "oklch(0.98 0 0)"             # text on a black fill (white)
  store-danger: "oklch(0.712 0.150 28)"
  store-success: "oklch(0.760 0.105 152)"
typography:
  landing-display-en:
    fontFamily: "'Cinzel Decorative', Georgia, serif"
    fontWeight: 400
    letterSpacing: "0.02em"
    lineHeight: 1.2
  landing-display-ar:
    fontFamily: "'Rakkas', 'Amiri', serif"
    fontWeight: 400
    lineHeight: 1.3
  landing-body:
    fontFamily: "'Cormorant Garamond', Garamond, serif"
    fontSize: "1.1rem"
    fontWeight: 400
    lineHeight: 1.8
  store-display:
    fontFamily: "'Bodoni Moda', 'Reem Kufi', 'Times New Roman', serif"
    fontSize: "clamp(2.5rem, 1.6rem + 4vw, 3.75rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  store-headline:
    fontFamily: "'Bodoni Moda', 'Reem Kufi', 'Times New Roman', serif"
    fontSize: "clamp(2.1rem, 1.4rem + 2.6vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.01em"
  store-body:
    fontFamily: "'Hanken Grotesk', 'Tajawal', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  store-label:
    fontFamily: "'Hanken Grotesk', 'Tajawal', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    letterSpacing: "0.08em"
rounded:
  xs: "2px"
  sm: "4px"
  md: "6px"
  lg: "10px"
spacing:
  1: "0.25rem"
  2: "0.5rem"
  3: "0.75rem"
  4: "1rem"
  5: "1.5rem"
  6: "2rem"
  7: "3rem"
  8: "4rem"
  9: "6rem"
  section: "clamp(2.5rem, 1.5rem + 4vw, 5rem)"
  gutter: "clamp(1.25rem, 0.75rem + 2vw, 2.5rem)"
components:
  button-primary:
    backgroundColor: "{colors.store-accent}"
    textColor: "{colors.store-on-accent}"
    rounded: "{rounded.sm}"
    padding: "0.7rem 1.3rem"
  button-primary-hover:
    backgroundColor: "{colors.store-accent-bright}"
    textColor: "{colors.store-on-accent}"
    rounded: "{rounded.sm}"
    padding: "0.7rem 1.3rem"
  button-primary-active:
    backgroundColor: "{colors.store-accent-deep}"
    textColor: "{colors.store-on-accent}"
    rounded: "{rounded.sm}"
    padding: "0.7rem 1.3rem"
  button-secondary:
    backgroundColor: "{colors.store-surface}"
    textColor: "{colors.store-ink}"
    rounded: "{rounded.sm}"
    padding: "0.7rem 1.3rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.store-ink-2}"
    rounded: "{rounded.sm}"
    padding: "0.7rem 1.3rem"
  input:
    backgroundColor: "{colors.store-surface}"
    textColor: "{colors.store-ink}"
    rounded: "{rounded.sm}"
    padding: "0.7rem 0.9rem"
  filter-chip:
    backgroundColor: "transparent"
    textColor: "{colors.store-ink-2}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
  filter-chip-active:
    backgroundColor: "{colors.store-accent-ghost}"
    textColor: "{colors.store-accent}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
---

# Design System: Tibr (تِبْر)

## 1. Overview

**Creative North Star: "The Keeper of Rare Things"**

Tibr is a brand house with two chambers that share one key. The landing page is a heritage portal: dark, ornate, emotionally charged — the feeling of opening a grandmother's wardrobe and finding a scent that has no name yet refuses to be forgotten. The store layer is a dark boutique: cinematic, spare, every surface receding so the product can breathe. The landing tells you who this is. The store shows you what they've kept.

The two chambers are deliberately different in accent. The landing carries a single vein of hammered brass — the ornamental filigree, the wordmark dot, the primary CTA. The store carries none of it: its accent is monochrome black. The landing gleams; the store stays quiet so the product photography is the only thing lit. Each earns its authority through restraint.

This system explicitly refuses: western luxury minimalism (Didot serifs, cream body backgrounds, Swiss grid restraint — foreign and impersonal for a brand rooted in Cairo's bazaars); generic Arabic e-commerce (Noon/Jumia-style — cluttered, price-forward, soulless); warm-cream editorial body backgrounds (the AI default of 2026); and glassmorphism as a default card treatment (the prior build's failure mode).

**Key Characteristics:**
- Two registers, two accents: the landing is brand (ornate, emotive, gold-on-black); the store is product (product-lit, monochrome — black carries every accent, no gold)
- RTL Arabic-first across both surfaces; English is the courtesy label, never the primary voice
- OKLCH color science in the store; legacy hex on the landing — two eras, one palette intention
- Sharp radii (2–10px ceiling) in the store; the landing is nearly radius-free
- Motion is restrained in the store (state changes + scroll reveals); the landing allows orchestrated first-load choreography
- No modals for auth — every flow is its own full page, a deliberate architecture decision

## 2. Colors: The Two-Chamber Palette

The palette splits by surface **and** by accent: the landing is gold-on-near-black; the store is a monochrome black-and-white product register. The two share the TIBR name, not an accent color.

### Primary

- **Hammered Brass — Landing** (`#C9A84C`): The landing's gold. Imperial, warm, worn. Used on borders, ornamental details, the primary CTA, and the wordmark dot. All jewelry, no filler.
- **Ink Black — Store** (`oklch(0.10 0 0)`): The store's accent. The store register uses **no gold** — black carries prices, primary action buttons, active navigation states, and focus rings, at maximum contrast on the white store background. On a black fill, text is near-white (`oklch(0.98 0 0)`). Never decorative. (Implemented by remapping `--gold → --ink` on `.store-container`, so the landing keeps real gold while the store is monochrome.)

### Secondary

- **Nile Crimson** (`#7B2D3E`): Landing surface only. A deep burgundy appearing in select hover states and decorative borders. Not present in the store layer — it would compete with the gold in the boutique register.

### Neutral

**Landing surface:**
- **Cairo Midnight** (`#0D0A07`): The landing body. Deep Egyptian antique black-brown — not pure black; the warmth makes gold gleam naturally against it.
- **Egyptian Linen** (`#EDE0C8`): Primary text on the landing. Warm off-white: the color of old paper and new silk. Never used in the store.
- **Beige Dim** (`#C1B5A0`): Secondary landing text. Muted linen for supporting copy.

**Store surface:**
- **Ink Chamber** (`oklch(0.165 0.006 75)`): The store's page background. Near-black charcoal with a whisper of warmth at hue 75. Product photography sits without color-casting.
- **Ink Chamber — Raised** (`oklch(0.205 0.007 74)`): Footer, scrolled header, raised structural bands. One step lighter.
- **Graphite Panel** (`oklch(0.225 0.008 72)`): Input backgrounds, summary panels. The primary container surface.
- **Graphite — Elevated** (`oklch(0.265 0.009 72)`): Hover fills, elevated elements. Interactive feedback layer.
- **Hairline** (`oklch(0.34 0.010 72)`): Default border color. Low-key dividers; present but not vocal.
- **Studio Daylight** (`oklch(0.952 0.008 82)`): Primary body text. ~16:1 contrast on Ink Chamber.
- **Warm Silver** (`oklch(0.808 0.012 80)`): Secondary text (~9:1). Secondary labels, descriptions.
- **Graphite Dust** (`oklch(0.688 0.013 78)`): Tertiary / meta text, placeholder text (~5.8:1 — confirmed readable, not the washed-out default). The floor for informational text.

### Named Rules

**The Monochrome Rule (Store).** The store register uses no gold. Black (ink) is its only accent — marking a price, a primary action, an active navigation state, a focus ring — at full contrast on white. Introducing gold, or any second accent, into the store is prohibited.

**The One Gold Rule (Landing).** On the landing, Hammered Brass appears on ≤15% of any screen and marks the same class of things. Gold lives on the landing only; its rarity is its authority.

**The Zero Cream Rule.** Neither surface uses a warm-tinted near-white body background. The store is Ink Chamber dark; the landing is Cairo Midnight dark. Cream, sand, beige, parchment, linen are text colors — never page backgrounds.

**The Floor Rule.** Graphite Dust (`oklch(0.688 0.013 78)`) is the lightest color used for any informational text in the store. Text lighter than this — however "elegant" it reads — fails the 4.5:1 minimum on dark surfaces. Never ship lighter.

## 3. Typography

The two surfaces use distinct typeface systems. They do not share a font.

**Landing Display (Latin):** Cinzel Decorative, Georgia, serif
**Landing Display (Arabic):** Rakkas, Amiri, serif
**Landing Body:** Cormorant Garamond, Garamond, serif

**Store Display:** Bodoni Moda (Latin) → Reem Kufi (Arabic), Times New Roman, serif
**Store Body / UI:** Hanken Grotesk (Latin) → Tajawal (Arabic), system-ui, sans-serif

**Character:** The landing uses all-display serif families to match its ornamental Egyptian-heritage register. The store uses a Bodoni/grotesque pairing: Bodoni Moda brings refined luxury through high stroke contrast; Hanken Grotesk and Tajawal are clean, functional, and Arabic-weight-matched for a bilingual product UI. The two pairs share authority without sharing genes.

### Hierarchy — Store Layer

- **Display** (Bodoni Moda, 600, `clamp(2.5rem → 3.75rem)`, lh 1.1, tracking −0.01em): Category page hero titles only. One per page.
- **Headline** (Bodoni Moda, 600, `clamp(2.1rem → 2.9rem)`, lh 1.08, tracking −0.01em): Product detail titles, page heads, auth page titles.
- **Title** (Bodoni Moda, 600, 1.5rem, lh 1.3): Section headers, summary titles, order card names, form section titles.
- **Body** (Hanken Grotesk / Tajawal, 400, 1rem, lh 1.6): All running text. Line-measure capped at 68ch. RTL body uses zero letter-spacing.
- **Label** (Hanken Grotesk / Tajawal, 500, 0.875rem, tracking 0.08em on LTR only): Footer column heads only. Not repeated above every section.

### Hierarchy — Landing Layer

- **Display** (Cinzel Decorative / Rakkas): Hero headlines, section titles. Ornamental, uppercase-capable in Latin, naturally expressive in Arabic. Locked to the landing; not ported to the store.
- **Body** (Cormorant Garamond, 400, ~1.1rem, lh 1.8): All landing copy. Generous leading on the dark background.

### Named Rules

**The Script Fallback Rule.** Every typeface stack is bilingual by construction: Latin glyphs render in the first family; Arabic glyphs fall through to the script face in the same stack. No JS font-switching is required. Negative letter-spacing is never applied to Arabic type — zero it out with `:root[lang="ar"] { letter-spacing: 0; }`.

**The Bodoni Ceiling Rule.** Store display headings are clamped to a maximum of 3.75rem (60px). Above that, the Bodoni serifs begin to dominate the product. The product is the display element; typography is the frame.

**The Cormorant Embargo.** Cormorant Garamond is the landing's body font. It must not appear in the store layer — it would blur the register boundary. The store uses Bodoni Moda for display and Hanken Grotesk / Tajawal for body. No exceptions.

## 4. Elevation

The store uses tonal layering as the primary depth language: surfaces step upward from Ink Chamber (page) → Ink Chamber Raised (footer, scrolled header) → Graphite Panel (cards, inputs) → Graphite Elevated (hover fills). Shadows are additive and purposeful — they signal state, not resting position.

### Shadow Vocabulary (Store)

- **Hairline** (`0 1px 2px rgba(0,0,0,0.4)`): The default resting elevation for sticky headers and inline elements. Present on scroll; invisible at rest.
- **Lifted** (`0 12px 30px -12px rgba(0,0,0,0.65)`): Product cards on hover, filter panels, the catalog search bar. Signals that something is above the page plane.
- **Cinematic** (`0 28px 60px -20px rgba(0,0,0,0.75)`): Toast notifications, the highest-layer float elements. Maximum elevation in the store system.
- **Focus Ring** (`0 0 0 3px oklch(0.10 0 0 / 0.08)`): The store's focus/active elevation event — a soft ink halo on the search bar when focused and the filter toggle when active. Ink, not gold. Found nowhere else.

### Named Rules

**The Flat-By-Default Rule.** Store components sit flat at rest. Shadows appear only in response to state (scroll, focus, hover) or layer (toast, dropdown). A shadow on a static resting card means the card is performing; performing is the job of the product photography.

**The Spotlight Rule.** Product detail images use a radial-gradient vignette overlay (`radial-gradient(120% 90% at 50% 36%, transparent 55%, oklch(0.1 0.005 75 / 0.45) 100%)`) to draw the eye inward. This is the only decorative overlay in the store. It is structural — it separates subject from frame — not decoration.

## 5. Components

Components are tactile and direct. Every element has a clear affordance. Hover and focus responses feel like physical feedback — the element meets you; you do not hunt for it. No embellishment exists for its own sake.

### Buttons

- **Shape:** 4px radius (`--r-sm`). Exactly sharp enough to read as intentional, not accidental.
- **Size:** 2.75rem (44px) minimum block-size — mobile touch target compliance.
- **Primary (black fill):** In the store `--gold` is remapped to ink, so the primary button is a **black fill with near-white text** (high contrast). On hover: one step lighter. On press: near-black + translateY(1px). Loading state: text transparent, 2px spinning ring in the on-accent color.
- **Secondary (graphite fill):** `--surface` background, `--ink` text, `--line` border. On hover: `--surface-2`, border `--line-strong`.
- **Ghost:** Transparent, `--ink-2` text. On hover: `--surface` fill, `--ink` text. Used for optional or destructive actions that should not compete with the primary button.
- **Focus (all variants):** 2px solid ink outline, 2px offset. Consistent across every interactive element.

### Inputs / Fields

- **Default:** `--surface` background, 1px `--line` border, 4px radius. Placeholder text at `--muted` (5.8:1 — readable, not washed).
- **Hover:** Border advances to `--line-strong`.
- **Focus:** Border advances to `--ink`; 3px ink-tint box-shadow glow (scaled down for inline elements). The focused input announces itself; nothing else changes.
- **Error:** Border and message color switch to `--danger`. Glow switches to `--danger-fill`. Error text appears below the field, never inside it.
- **Selects:** Identical treatment to text inputs; custom chevron icon; padding-end reserves space for the indicator.

### Filter Chips

- **Default:** Transparent fill, `--line` border, `--ink-2` text, 4px radius.
- **Hover (inactive):** `--line-strong` border, `--ink` text. No fill change.
- **Active:** ink-tint fill, `--ink` border, `--ink` text.
- Selection state is communicated through color alone; size and weight are constant. One active dot indicator appears on the filter toggle button when any non-default filter is applied.

### Navigation (Store Header)

- **Desktop:** Sticky, 4.75rem default height, shrinks to 3.75rem on scroll. Transparent background transitions to `--bg-raised` with a hairline shadow when scrolled.
- **Nav links:** `--ink-2` at rest. A gold underline slides in from the inline-start edge on hover and active pages (`inline-size: 0 → 100%`). The underline is the only motion in the nav; there is no bold or weight change.
- **Icon buttons** (search, wishlist, account, cart): 44×44px touch targets, `--ink-2` → `--gold` on hover, +translateY(-2px) lift. `prefers-reduced-motion` removes the lift, preserves the color.
- **Language toggle:** `--gold` text, `--gold-line` border, `--gold-ghost` fill on hover. A deliberate visual signal; bilingual identity is never hidden in a hamburger.
- **Mobile:** Desktop nav hides at 56rem; a hamburger reveals an RTL-native side drawer sliding in from the inline-end edge.

### Product Card (Signature Component)

The catalog's primary merchandising unit. Rules:
- 4:5 aspect-ratio product image with a spot-vignette radial gradient (same as the PDP, no glassmorphism).
- Title in the store display face, collection/meta in `--muted`.
- Price display sits in a dedicated row (`.product-new__price-row`) above the action button, showing the current price in semibold ink and the struck-through comparative price (`.product-new__price-was`) side-by-side if on sale.
- Action button is a stretched pill (`.product-new__action-pill`) that says "Add to cart" with a right arrow. On hover: shifts background to charcoal (`#2c2c2e`), adds a soft gold border tint (`rgba(212,175,55,0.45)`), and slides the arrow right (`translateX(4px)`).
- Wishlist heart reveals on hover; its background is semi-transparent dark (`oklch(0.13 0.005 75 / 0.55)`) — not glass.
- Zero resting shadow. On hover: Hover effect is focused solely on the product image zooming (`transform: scale(1.06)`); the outer card remains completely static (no translateY shift, no border highlight change, no outer shadow lift).
- No outer border at rest. The dark product image against Ink Chamber creates natural separation without a border.

**Best Seller — gold frame.** Products flagged `is_bestseller` receive the `.product-new--bestseller` modifier class. No badge is shown inside the card; the card itself becomes the signal:
- Border: `#d4af37` — Hammered Brass all the way around the card, hardcoded.
- Outer glow: `0 0 0 1px rgba(212,175,55,0.35)` + `0 4px 24px rgba(212,175,55,0.12)` — a soft halo that reads even on white backgrounds.
- Top shimmer line: a 2px `::before` pseudo-element with a `transparent → #d4af37 → #f5df9e → #d4af37 → transparent` gradient, suggesting a lit edge.
- Hover: The gold border frame and glow remain completely static (no glow intensity shift, no scale change) keeping the focus on the product image zoom.

**Discount — gold ghost badge.** Products on sale show a small pill badge (`.product-new__badge--sale`) over the product image. Its style matches the footer newsletter arrow:
- Background: `rgba(255,255,255,0.06)` — near-invisible.
- Border: `1px solid #d4af37`.
- Text: `#d4af37`.
This is a deliberate departure from a solid-fill badge. The ghost treatment keeps the badge legible without competing with the product photography or introducing a solid color block.

### Footer

The store footer renders only on three surfaces: **Home** (`/`), **About** (`/about`), and any **Shop** route (`/shop/*`). It is hidden on Product detail, Cart, Checkout, Blog, Auth, and Account pages — those pages have focused tasks that the footer would interrupt.

**Newsletter form — arrow button.** The submit arrow (`→`) inside the newsletter email field is the single deliberate gold accent in the store footer. Its treatment:
- Background: `rgba(255,255,255,0.06)` — near-invisible; the arrow reads as floating.
- Border: `1px solid #d4af37` — gold hairline; frames the button without a filled-gold slab.
- Arrow color: `#d4af37` — the brand's Hammered Brass, hardcoded to survive the store's `--gold → ink` remap that would otherwise neutralize it.
- Hover: `rgba(212,175,55,0.15)` fill, border and arrow advance to `#f5df9e` (bright gold), +scale(1.05).

**Sanctioned gold uses in the store.** Hammered Brass (`#d4af37`) appears in exactly three places in the store register, all deliberate:
1. **Newsletter arrow button** — brand touchpoint, not a transactional input.
2. **Bestseller card frame** — a permanent border + glow marking editorial curation.
3. **Discount badge** — a ghost pill (transparent fill, gold border, gold text) over the product image.

Do not propagate this treatment to other form buttons, CTAs, navigation elements, or card types. These three are the ceiling, not a precedent.

### Order Summary / Cart

- Summary panels are elevated white sheets with a `--line` border. The total-row price value is rendered in `--ink` at semibold — the most important number on the page, carried by weight and contrast rather than color.
- Cart line items are not wrapped in cards. Items are separated by hairline `--line` rules; the list is the container.

### Status Badges

Inline status indicators with a 2px radius, 0.875rem type, and a leading dot glyph:
- **Shipped:** `--ink` text, ink-tint fill
- **Delivered:** `--success` text, `--success-fill` fill
- **Pending:** `--warning` text, warning-fill
- **Cancelled:** `--danger` text, `--danger-fill` fill
All four are desaturated enough to sit in the dim store room; bright enough to remain legible on dark surfaces.

## 6. Do's and Don'ts

### Do:

- **Do** keep the store nearly monochrome: black (ink) is its primary accent — on prices, primary CTA buttons, active navigation states, and focus rings. Gold (`#d4af37`) appears in exactly three sanctioned locations: the newsletter arrow, bestseller card frames, and the discount badge. Nowhere else.
- **Do** keep the store layer dark. Every new section, page, and panel inherits from `--bg` (Ink Chamber). A light or cream section in the store is a register violation.
- **Do** verify contrast before shipping any new text color. The minimum is 4.5:1 against the nearest background token. Graphite Dust (`oklch(0.688 0.013 78)`) is the absolute floor for informational text.
- **Do** use RTL-aware logical CSS properties (`inset-inline-start`, `padding-block`, `margin-inline-end`, `border-inline-start`) throughout the store. `left` and `right` directional properties are prohibited.
- **Do** zero out `letter-spacing` for Arabic type in both surfaces. Reem Kufi and Tajawal are never negatively tracked.
- **Do** apply `text-wrap: balance` on h1–h3 and `text-wrap: pretty` on prose paragraphs. Tibr sells poetry; orphaned words undercut it.
- **Do** include `@media (prefers-reduced-motion: reduce)` alternatives for every transition: store reveals snap to visible, toast uses opacity-only, button spinner stops.
- **Do** give every interactive element a visible focus ring (2px solid `--ink` in the store, offset 2px). The ring is accessibility; it is not decoration.
- **Do** keep one consistent layout grammar across the perfumes catalog. The product photography is the differentiator; the chrome stays uniform.

### Don't:

- **Don't** use Western luxury minimalism: Didot serifs, cream body backgrounds, Swiss grid restraint. Per PRODUCT.md: "reads as foreign and impersonal for a brand rooted in Cairo's bazaars."
- **Don't** use glassmorphism as a default card treatment. Per PRODUCT.md: "the prior build over-used glass panels as the default card." The new system uses solid graphite surfaces. Glass is never the default.
- **Don't** recreate generic Arabic e-commerce aesthetics (Noon.com / Jumia): cluttered layouts, price-forward hierarchy, utility-over-atmosphere. Per PRODUCT.md: "dark, calm, and product-led, the opposite of a marketplace."
- **Don't** bleed Egyptian ornamental theming (Cinzel Decorative, gold filigree, Cormorant Garamond, arabesque motifs) into the store layer. The landing and store connect through the gold accent and the name alone; not through shared ornament.
- **Don't** touch the landing page's visual identity. Per PRODUCT.md: "Work here is additive only: animation and motion." The Rakkas / Cinzel / Cormorant type, the gold-on-near-black palette, and the ornamental detail are locked.
- **Don't** introduce unsanctioned gold into the store. The three approved gold uses (newsletter arrow, bestseller frame, discount badge) are the ceiling. Any new gold element requires an explicit decision — it is not a pattern to extend freely.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored stripe on cards or list items. Rewrite with full borders, background tints, or nothing.
- **Don't** use gradient text (`background-clip: text` + any gradient). Emphasis is communicated through weight, size, or `--ink` solid color — never a gradient.
- **Don't** repeat small uppercase tracked eyebrow labels above every section heading. The catalog uses one hairline `<hr>` rule beneath the display heading. That is the store's only section-identity device. AI scaffolding eyebrows are prohibited.
- **Don't** use warm cream / paper / parchment / sand body backgrounds in the store. Per PRODUCT.md: "warm-cream / paper light store" is explicitly rejected. The store is dark. Product warmth comes from the photography; the accent is black.
