# PhotoFrameIn — E-Commerce Platform

**Premium framed wall art e-commerce** — Hono.js on Cloudflare Pages/Workers + Supabase PostgreSQL.

> **Live Supabase Project**: `lxcustacsvamlrtiqkvi.supabase.co`  
> **Cloudflare Project**: `photoframein` (wrangler.jsonc)  
> **GitHub**: `https://github.com/Kbs-sol/PhotoFramePFS`

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Directory Structure](#directory-structure)
4. [API Reference](#api-reference)
5. [Database Schema](#database-schema)
6. [Environment Variables](#environment-variables)
7. [Deployment](#deployment)
8. [Admin Panel](#admin-panel)
9. [Engineering Notes](#engineering-notes)
10. [Completed Features](#completed-features)
11. [Pending / Next Steps](#pending--next-steps)

---

## Project Overview

PhotoFrameIn (also branded ChitraFrame) sells premium wall art prints in custom frames delivered to customers across India.

### Key Numbers
- **11 products** across 6 categories (Automotive, Spiritual, Sports, Motivational, Wildlife, Anime/JDM)
- **13 variants per product** (4 sizes × 3 frame types + 1 custom frame variant)
- **Shiprocket** integration for logistics (AWB, label, pickup scheduling)
- **Razorpay** for prepaid payments + COD support
- **Brevo + Resend** dual-stack transactional email
- **Cloudinary** CDN for product images (`cloud: dax4yqumu`)

---

## Architecture

```
Browser (Vanilla JS SPA)
    │
    ▼
Cloudflare Pages (Edge CDN)
    │
    ├── static/           ← public/ dir served via hono/cloudflare-workers serveStatic
    │   ├── app.js        ← 3,537-line IIFE SPA (no framework)
    │   ├── admin.js      ← Admin panel SPA
    │   └── styles.css
    │
    └── _worker.js        ← Hono app (compiled via vite + @hono/vite-cloudflare-pages)
        │
        ├── /api/products/*     → src/routes/products.ts
        ├── /api/orders/*       → src/routes/orders.ts
        ├── /api/checkout/*     → src/routes/checkout.ts
        ├── /api/admin/*        → src/routes/admin.ts
        ├── /api/auth/*         → src/routes/auth.ts
        ├── /api/analytics/*    → src/routes/analytics.ts
        ├── /api/upload/*       → src/routes/upload.ts
        └── /api/*              → src/routes/marketing.ts
            │
            ▼
        Supabase PostgreSQL (lxcustacsvamlrtiqkvi.supabase.co)
        31 tables — see schema.sql
```

### Edge Runtime Constraints
- **No filesystem** at runtime — all assets must be in `public/` at build time
- **10ms CPU limit** (Cloudflare free tier) — all heavy work offloaded to Supabase
- **No persistent state** — module-level vars (token cache, counters) exist per-isolate
- **`waitUntil()`** — analytics writes are non-blocking (never delay responses)

---

## Directory Structure

```
webapp/
├── src/
│   ├── index.tsx              # App entry — mounts all routes, CSP headers
│   ├── renderer.tsx           # JSX renderer for Hono
│   ├── routes/
│   │   ├── products.ts        # GET /api/products, /api/products/:slug, /api/categories
│   │   ├── orders.ts          # POST /api/orders, GET /api/orders/track
│   │   ├── checkout.ts        # POST /api/checkout/*, payment verification
│   │   ├── admin.ts           # /api/admin/* (CRUD for all entities)
│   │   ├── auth.ts            # /api/auth/* (magic link, Google OAuth)
│   │   ├── analytics.ts       # /api/analytics/* (funnel events, view tracking)
│   │   ├── upload.ts          # /api/upload (Cloudinary signed upload)
│   │   └── marketing.ts       # /api/promotions, /api/sitemap, /api/llms.txt
│   └── lib/
│       ├── supabase.ts        # Client caching (WeakMap), generateOrderId, logError
│       ├── coupons.ts         # Shared validateCoupon() + incrementCouponUsage()
│       ├── email.ts           # Brevo + Resend dual-stack, module-level counters
│       ├── email-templates.ts # Order confirmation, shipping, review request HTML
│       ├── shipping.ts        # Shiprocket API (token cached 23h)
│       └── alerts.ts          # Resource usage alerting
│
├── public/
│   └── static/
│       ├── app.js             # Customer-facing SPA (vanilla JS IIFE)
│       ├── admin.js           # Admin panel SPA
│       ├── admin.css          # Admin panel styles
│       └── styles.css         # Customer storefront styles
│
├── migrations/
│   ├── 0002_custom_frame_schema.sql   # Legacy (superseded by schema.sql)
│   └── 0003_security_and_perf.sql     # Legacy (superseded by schema.sql)
│
├── schema.sql                 # ← MASTER SCHEMA (single source of truth, 800+ lines)
│                              #   Use this for fresh setups and reference
│
├── wrangler.jsonc             # Cloudflare Pages config
├── vite.config.ts             # Vite + @hono/vite-cloudflare-pages
├── tsconfig.json              # TypeScript config (JSX: react-jsx + hono/jsx)
├── ecosystem.config.cjs       # PM2 dev server config
├── package.json               # Dependencies
└── .dev.vars                  # Local secrets (gitignored)
```

---

## API Reference

### Customer-Facing Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | List all active products with images + variants |
| GET | `/api/products/:slug` | Get single product by slug |
| GET | `/api/categories` | List all active categories |
| GET | `/api/products/category/:slug` | Products in a category |
| GET | `/api/products/search?q=` | Full-text product search |
| GET | `/api/products/related/:slug` | Related/recommended products |
| GET | `/api/config/public` | Public site config `{ config: { key: value } }` |
| GET | `/api/orders/track?order_id=` | Order tracking by order ID or phone |
| POST | `/api/orders` | Create new order (COD or post-payment) |
| POST | `/api/checkout/create-order` | Create Razorpay order |
| POST | `/api/checkout/verify-payment` | Verify Razorpay signature |
| POST | `/api/checkout/apply-coupon` | Validate coupon code |
| GET | `/api/auth/magic-link?email=` | Send magic link email |
| GET | `/api/auth/verify?token=&email=` | Verify magic link token |
| GET | `/api/auth/google` | Google OAuth redirect |
| POST | `/api/analytics/event` | Log funnel event |
| GET | `/api/sitemap.xml` | XML sitemap |
| GET | `/llms.txt` | AI discovery file |

### Admin Routes (require `Authorization: Bearer <token>`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/auth` | Login → returns token |
| GET | `/api/admin/dashboard` | Revenue, orders, funnel stats |
| GET/POST | `/api/admin/products` | List / create products |
| PUT/DELETE | `/api/admin/products/:id` | Update / delete product |
| POST | `/api/admin/products/:id/variants` | Add variant |
| PUT | `/api/admin/variants/:id` | Update variant |
| POST/DELETE | `/api/admin/products/:id/images` | Add / remove product image |
| GET/POST/PUT/DELETE | `/api/admin/categories` | Category CRUD |
| GET | `/api/admin/orders?status=&from=&to=` | List orders with filters |
| GET | `/api/admin/orders/:orderId` | Order detail with emails + claims |
| PUT | `/api/admin/orders/:orderId/status` | Update order status |
| POST | `/api/admin/orders/:orderId/confirm-cod` | Confirm COD order |
| GET | `/api/admin/customers` | Customer list with search |
| GET/POST/PUT | `/api/admin/coupons` | Coupon management |
| GET/PUT | `/api/admin/reviews` | Review moderation |
| GET/POST/PUT | `/api/admin/blog` | Blog post management |
| GET/PUT | `/api/admin/pages/:slug` | Static page content |
| GET/POST/PUT/DELETE | `/api/admin/faq` | FAQ management |
| GET/PUT | `/api/admin/settings` | System config key-value store |
| GET/POST/PUT | `/api/admin/combos` | Bundle/combo management |
| GET | `/api/admin/leads` | Lead list |
| GET | `/api/admin/analytics/products` | Product performance metrics |
| GET | `/api/admin/analytics/ads` | UTM attribution report |
| GET | `/api/admin/analytics/rto` | Pincode RTO risk |
| POST | `/api/admin/logistics/create-shiprocket-order` | Push order to Shiprocket |
| POST | `/api/admin/logistics/generate-awb` | Generate AWB number |
| POST | `/api/admin/logistics/schedule-pickup` | Schedule pickup |
| POST | `/api/admin/logistics/generate-label` | Generate shipping label PDF |
| POST | `/api/admin/logistics/sync-pending` | Batch sync unsynced orders |
| POST | `/api/admin/claims/:id/approve` | Approve damage claim → replacement order |
| POST | `/api/admin/claims/:id/decline` | Decline damage claim |
| GET | `/api/admin/errors` | Application error log |
| POST | `/api/admin/backup` | Export all tables as JSON |
| GET | `/api/admin/usage` | Free-tier resource usage monitor |

---

## Database Schema

**31 tables** in Supabase PostgreSQL. See `schema.sql` for the complete DDL.

### Core Tables

| Table | Purpose |
|-------|---------|
| `products` | Product catalogue (25 cols, SEO, analytics, customization) |
| `product_variants` | Size × Frame combos with pricing + Shiprocket dimensions |
| `product_images` | Cloudinary URLs per product (4 images per product, ordered) |
| `categories` | 6 categories with hover colors and intent-collection flag |
| `orders` | Full order record including Razorpay, Shiprocket, UTM |
| `customers` | Customer profiles (linked to Supabase Auth or guest) |
| `coupons` | Flat/% coupons with usage tracking and expiry |
| `system_config` | Key-value runtime settings (67 keys as of last seed) |

### Analytics Tables

| Table | Purpose |
|-------|---------|
| `sales_funnel_events` | view → cart → checkout → purchase funnel |
| `analytics_events` | General event log |
| `ad_performance` | Ad spend + revenue attribution |
| `view_stats` | Lightweight page view counter |
| `pincode_risk` | RTO risk by pincode prefix |

### Security Tables

| Table | Purpose |
|-------|---------|
| `login_attempts` | Persistent admin brute-force rate limiting |
| `error_log` | Application errors from `logError()` |
| `email_log` | Email delivery audit trail |
| `email_failures` | Failed emails queued for retry |
| `admin_users` | Admin email → role mapping |

---

## Environment Variables

Store in `.dev.vars` locally, Cloudflare Dashboard → Workers → Settings → Variables in production.

```ini
# Required — Supabase
SUPABASE_URL=https://lxcustacsvamlrtiqkvi.supabase.co
SUPABASE_SERVICE_KEY=eyJ...          # Service role JWT (full DB access)
SUPABASE_ANON_KEY=eyJ...             # Anon key (for auth flows)

# Required — Admin
ADMIN_PASSWORD=your-secure-password  # Owner password for static login
ADMIN_TOKEN=your-secure-token        # Bearer token for API calls
OWNER_EMAIL=theframehouse.order@gmail.com

# Required — Payments
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...

# Required — Shipping
SHIPROCKET_EMAIL=your@email.com
SHIPROCKET_PASSWORD=your-password
PICKUP_PINCODE=501504

# Email (at least one required)
BREVO_API_KEY=xkeysib-...            # Up to 300 emails/day free
RESEND_API_KEY=re_...                # Fallback: 100 emails/day free

# Optional
FROM_EMAIL=noreply@photoframein.com
FROM_NAME=PhotoFrameIn
SITE_URL=https://photoframein.com
MAGIC_LINK_SECRET=your-random-secret  # HMAC-SHA256 key for magic links
ALERT_EMAIL=alerts@photoframein.com
COD_ENABLED=true
FREE_SHIPPING_THRESHOLD=899
CLOUDINARY_CLOUD=dax4yqumu
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

---

## Deployment

### Local Development
```bash
# Install dependencies (already done in pre-initialized project)
npm install

# Start dev server
npm run build
pm2 start ecosystem.config.cjs

# Test
curl http://localhost:3000/api/products
```

### Deploy to Cloudflare Pages
```bash
# Authenticate
npx wrangler login

# Build
npm run build

# Deploy
npx wrangler pages deploy dist --project-name photoframein
```

### Database Setup (Fresh Instance)
1. Open Supabase SQL Editor for project `lxcustacsvamlrtiqkvi`
2. Paste and run `schema.sql` (entire file — safe to re-run, all IF NOT EXISTS)
3. Seed product data via admin panel or direct Supabase table editor

---

## Admin Panel

Access at `/admin.html`. Login with owner email + password.

**Features**:
- Dashboard: Revenue, orders, email usage, funnel stats
- Products: Full CRUD, variant management, image management
- Orders: Status updates, Shiprocket sync, COD confirmation
- Logistics: Create SR orders, generate AWB, schedule pickup, generate labels
- Coupons: Create/edit flat or percentage coupons
- Reviews: Moderation (approve/hide)
- Blog: Post management
- FAQ: CRUD
- Settings: Edit any `system_config` key live
- Analytics: Product performance, UTM attribution, RTO risk
- Damage Claims: Approve (auto-creates replacement order) or decline
- Customers: View + block management

---

## Engineering Notes

### Phase 3 Audit — 17 Critical Issues Resolved

| # | Issue | Fix |
|---|-------|-----|
| 1 | `/api/products/:slug` → 503 | Changed to 404 with clean message |
| 2 | `/api/orders/track` → 500 crash | Added `noSupabase` guard → 503 |
| 3 | `calculateShipping` ignores threshold | Returns 0 for prepaid ≥ 899 |
| 4 | Shiprocket +300-500ms per request | Module-level 23h token cache |
| 5 | N+1 variant queries in checkout | Single `.in()` batch query |
| 6 | Coupon logic duplicated | Shared `lib/coupons.ts` utility |
| 7 | Analytics writes block PDP | Moved to `waitUntil()` |
| 8 | Brevo DB query per email | Module-level in-memory counter |
| 9 | IST calculation bug | UTC total minutes + 330 mod 1440 |
| 10 | `error_log` wrong column names | Fixed to `error_message`/`stack_trace` |
| 11 | `free_shipping_threshold: '799'` | Fixed to `'899'` in all 3 files |
| 12 | CSP `unsafe-inline` on scripts | Removed; added `upgrade-insecure-requests` |
| 13 | Insecure magic-link token | HMAC-SHA256 with server secret |
| 14 | Admin rate limit resets on cold start | Dual-layer: in-memory + DB-backed |
| 15 | `getSupabase()` new client per call | WeakMap cache per `env` object |
| 16 | `generateOrderId` race condition | Atomic upsert via RPC |
| 17 | Analytics DB tables missing | Created `0003_security_and_perf.sql` |

### Phase 2 Audit — Live Supabase Integration

| Finding | Resolution |
|---------|------------|
| `/api/admin/config` 404 | Frontend uses `/settings` — no issue |
| Product images returning `[]` | Orphaned image rows deleted; 44 correct rows seeded |
| `admin_users` missing `role` col | Added in `schema.sql` patch; code defaults to `'admin'` |
| `orders` missing `shiprocket_label_url` | Added in `schema.sql` patch; code handles missing col |
| Coupon field names | `max_uses` → `total_limit`, `min_order` → `min_subtotal` |
| `system_config` table empty | Seeded 67 config keys via admin settings endpoint |

### Key Library Decisions

- **Hono.js** — 12KB framework, perfect for Cloudflare Workers edge runtime
- **WeakMap client cache** — Supabase client cached per `env` object (request-scoped, no memory leak)
- **Module-level token cache** — Shiprocket JWT cached 23h per isolate (saves 300-500ms/request)
- **`waitUntil()`** — Analytics writes run after response sent (non-blocking PDP)
- **Shared `lib/coupons.ts`** — Single validation path, no drift between checkout and orders
- **HMAC-SHA256 magic links** — Replaces forgeable `btoa(email:expiry)` pattern

---

## Completed Features

### Customer Storefront
- [x] Product listing with filtering by category
- [x] Product detail page (PDP) with images, variants, add-to-cart
- [x] Shopping cart (localStorage, 20-item limit)
- [x] Checkout flow (address, payment method, coupon)
- [x] Razorpay payment integration (order create + verify)
- [x] COD checkout with delivery estimate
- [x] Order tracking page (`/track?order=PFI...`)
- [x] Order confirmation email (Brevo/Resend)
- [x] Wishlist (localStorage)
- [x] Custom framing wizard (`/customize`)
- [x] Blog listing and post pages
- [x] FAQ page
- [x] Category pages
- [x] Exit intent popup
- [x] Announcement bar (configurable)
- [x] Magic link authentication
- [x] Google OAuth

### Admin Panel
- [x] Dashboard (revenue, orders, funnel)
- [x] Product CRUD + image + variant management
- [x] Order management (status, notes, COD confirm)
- [x] Shiprocket integration (create order, AWB, pickup, label)
- [x] Coupon management
- [x] Review moderation
- [x] Blog + pages + FAQ management
- [x] Settings (all system_config keys editable live)
- [x] Analytics (product stats, UTM attribution, RTO risk)
- [x] Damage claim management (approve → auto replacement order)
- [x] Customer management (view, block)
- [x] Error log viewer
- [x] DB backup export

### Infrastructure
- [x] Cloudflare Pages deployment
- [x] Supabase PostgreSQL with 31 tables
- [x] Row Level Security on all tables
- [x] master `schema.sql` (single source of truth)
- [x] CSP headers (no unsafe-inline on scripts)
- [x] HMAC-SHA256 magic link tokens
- [x] Dual-layer admin rate limiting
- [x] Atomic order ID generation
- [x] Product image seeding (4 images × 11 products = 44 rows)

---

## Pending / Next Steps

### High Priority
- [ ] **Apply `schema.sql` patches to live DB** — Run `ALTER TABLE` section via Supabase SQL Editor to add `admin_users.role` and `orders.shiprocket_label_url`
- [ ] **Razorpay live keys** — Replace `rzp_test_placeholder` with live keys in Cloudflare env vars
- [ ] **Shiprocket real credentials** — Verify `SHIPROCKET_EMAIL`/`PASSWORD` work in production
- [ ] **Real Cloudinary images** — Upload actual product artwork to Cloudinary (`dax4yqumu`) using the paths in `schema.sql` or admin image uploader
- [ ] **Custom domain** — Point `photoframein.com` to Cloudflare Pages

### Medium Priority
- [ ] **Brevo/Resend API keys** — Configure transactional email providers in production
- [ ] **Add product for missing slugs** — Some DESIGN_IMAGES entries in app.js (e.g. `bmw-m4-carbon-dark`, `radha-krishna-watercolor`) have no matching DB products yet
- [ ] **Google OAuth** — Set `GOOGLE_CLIENT_ID`/`SECRET` and configure redirect URIs
- [ ] **Magic link secret** — Generate and set a strong `MAGIC_LINK_SECRET` in production
- [ ] **pg_cron** — Set up `cleanup_login_attempts()` to run hourly via Supabase cron

### Low Priority
- [ ] R2 bucket binding (`MY_BUCKET`) for admin image uploads
- [ ] Webhook for Shiprocket delivery status updates
- [ ] WhatsApp order notifications
- [ ] Review photo upload feature

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Runtime | Cloudflare Workers (V8 isolates) |
| Framework | Hono.js v4.12.9 |
| Build | Vite + @hono/vite-cloudflare-pages |
| Database | Supabase PostgreSQL (free tier) |
| CDN | Cloudflare Pages (automatic) |
| Images | Cloudinary (cloud: dax4yqumu) |
| Payments | Razorpay |
| Shipping | Shiprocket |
| Email | Brevo (300/day) + Resend (100/day) fallback |
| Auth | Supabase Auth + HMAC magic links + Google OAuth |
| Frontend | Vanilla JS IIFE SPA (no framework, ~3,500 lines) |
