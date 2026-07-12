# TIBR — Catalog Data Model: Handoff

**Read `docs/DATA-MODEL.md` first — it is the design. This file is the state.**
Last updated: 2026-07-13. Branch: `feat/catalog-data-model` (5 commits, not merged, not pushed).

---

## The one rule

**The live Supabase schema is the source of truth. NOT `supabase/migrations/`, NOT the frontend.**

Every migration from `20260704` to `20260712` was written but **never applied**. Columns like
`brand`, `perfume_type`, `listing_type`, `fragrance_category`, `sample_type`, `product_category`,
`gender`, `season`, `is_egyptian_brand` **do not exist in the database** — only in dead migration
files and (formerly) in frontend code. A migration written against them will fail on execution.

Before writing any SQL, **probe the real schema**:

```bash
node -e "
const {readFileSync}=require('fs');
for(const l of readFileSync('.env','utf8').split('\n')){const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)process.env[m[1]]=m[2].trim();}
const {Client}=require('pg');
const c=new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
c.connect().then(()=>c.query(\"select table_name, column_name from information_schema.columns where table_schema='public' order by 1,2\"))
 .then(r=>{for(const x of r.rows) console.log(x.table_name+'.'+x.column_name); return c.end();});
"
```

---

## How to run a migration

`.env` has `DATABASE_URL` (Supabase session pooler, eu-west-1). **The Supabase CLI is NOT linked and
`supabase db push` would be dangerous** — the remote has no migration history, so push would try to
replay every file from `init_schema` forward against a live database.

Use the runner (recreate it if missing — see `git log` for its contents, or write a 40-line `pg`
script that wraps the file in `BEGIN … ROLLBACK`):

```bash
node scripts/run-migration.cjs supabase/migrations/<file>.sql            # DRY RUN (rollback)
node scripts/run-migration.cjs supabase/migrations/<file>.sql --commit   # apply
```

Every migration ends with a PASS/FAIL block. **Always dry-run first, read the grid, then commit.**

---

## What is DONE (applied to the live DB + committed)

| Migration | What |
|---|---|
| `20260713000000_catalog_entities` | `brands`, `notes` (726 seeded), `product_notes`, `original_perfumes`, `collections`, `product_collections`, `product_variants`. RLS on all 7. |
| `20260713010000_products_taxonomy` | 15 axis columns on `products` (line, audience, classification, brand_id, original_perfume_id, families[], seasons[], slug, status…), CHECKs, GIN indexes, `product_families_effective` view. |
| `20260713020000_merchandising_flags` | `is_bestseller`, `is_spotlight`. |
| `20260713030000_orders_line_items` | `order_items` (points at a VARIANT, with snapshots). `orders` gains subtotal/total/discount_amount. **Additive — legacy per-line columns left in place.** |

Application code, all committed and verified:
- **Admin product form** rebuilt around the real axes + a variants editor. Creates products.
- **Storefront** nav + filters are now saved queries over the taxonomy (`/api/products?audience=men&family=oud`, `/api/facets`).
- **Checkout** prices from the variant, writes one order + line items, decrements variant stock, refuses to oversell.

Tests (run them; they hit the live DB and clean up after themselves):
```bash
node scripts/test-product-graph.cjs                                   # 27/27 — admin write path
TEST_EMAIL=nadeerysin@gmail.com TEST_PASSWORD=... node scripts/test-checkout.cjs   # 15/15 — checkout
```

---

## NEXT — do these in order

### 1. The pricing pass (Nader, in the admin UI) — BLOCKS step 3
The variant backfill copied **one price and one stock count onto every size**, because the old schema
never stored them per-size. That data does not exist and cannot be recovered.

There are **11 variants across 3 products**. Open `/admin/product?id=1|2|3` and set the real price and
stock for each size. Until this is done, per-size pricing is fiction.

| product | sizes |
|---|---|
| 1 Si Passione (Armani) | 25 / 50 / 100 / 200 ml — all currently 10000, stock 3 each |
| 2 Sauvage EDP (Dior) | 25 / 50 / 100 / 200 ml — all currently 9000, stock 3 each |
| 3 Scandal (JPG) | 50 / 100 / 150 ml — all currently 6000, stock 6 each |

### 2. Place ONE real order through the storefront — BLOCKS step 3
Add to cart → checkout → confirm it appears in `/admin/orders` with the right size and price.
This is the gate on step 4b below.

### 3. `20260713040000_orders_drop_legacy_columns.sql` — DESTRUCTIVE, run last
Already written and staged. It deletes the redundant sibling `orders` rows and drops
`product_id, size, qty, unit_price, order_total`. It **self-aborts** if `order_items` is missing or
any order would be left with no lines. Run **only after** #2 proves the new checkout works.
Export `orders` first.

### 4. Step 5 — retire the legacy product columns
Drop `category`, `sizes`, `quantity`, `ar_price`, `en_price`, `image` from `products`. **First**
remove the "legacy bridge" in `server.js` (`sanitizeProductPayload` still mirrors variant data into
those columns on every write, so the old storefront keeps working). Grep for `ar_price` and `image`
before dropping — `parsePrice`, `normalizeProduct` and a few components still read them as fallbacks.

### 5. The originals registry
Nader has a list of original perfume names to load into `original_perfumes` (brand, audience, year,
families). Each becomes a target for `line='inspired'` products. `POST /api/admin/originals` exists,
and the admin form can create them inline.

---

## Known gaps (deliberate, documented, not bugs to rediscover)

- **`discounts` table does not exist.** The whole Shopify-parity discounts feature (admin panel, commit `b42cf3e`) has no table behind it. Its migration was never applied. Out of scope; decide separately. Do it **after** step 4b, since discount targeting should reference `order_items`.
- **Migration history is diverged.** The remote has no `supabase_migrations` history. Reconciling it (`supabase migration repair --status applied …`, file by file) is its own task, and must happen before the CLI is ever usable here.
- **Nothing is transactional.** `saveProductGraph` and `saveOrder` write across tables without a transaction (supabase-js has none). A mid-write failure leaves a partial state; every step is idempotent, so re-saving repairs it. Concurrent checkouts can oversell. The honest fix for both is a Postgres function.
- **Dead CSS files.** `css/store/{admin,catalog,components,pages}.css` are imported by **nothing**. `css/store/store.css` is the only stylesheet the client loads. Editing the others does nothing.
- **`client/src/lib/notesCatalog.js`** holds 726 notes and is the seed source for the `notes` table (`node scripts/seed-notes.mjs --commit`, idempotent).

---

## Security

The database password and the admin account password were both pasted into a chat transcript.
**Rotate both** (Supabase → Settings → Database → Reset database password; and change the account
password). `.env` is gitignored.
