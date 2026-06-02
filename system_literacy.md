# ChitraFrame — System Literacy Document
> **Version:** 5.2 — June 2026  
> **Purpose:** Comprehensive reference for code architecture, business logic, infrastructure, and operational knowledge. Written for any developer, AI agent, or operator picking up this codebase cold.

---

## Table of Contents
1. [Business Overview](#1-business-overview)
2. [Live URLs & Access](#2-live-urls--access)
3. [Technology Stack](#3-technology-stack)
4. [Repository Structure](#4-repository-structure)
5. [Backend — Hono Edge Workers](#5-backend--hono-edge-workers)
6. [Frontend — Vanilla JS SPA](#6-frontend--vanilla-js-spa)
7. [Database — Supabase PostgreSQL](#7-database--supabase-postgresql)
8. [Third-Party Services](#8-third-party-services)
9. [Cloudflare Configuration](#9-cloudflare-configuration)
10. [Payment Flow](#10-payment-flow)
11. [Order Lifecycle](#11-order-lifecycle)
12. [Pricing & Business Rules](#12-pricing--business-rules)
13. [Admin Panel](#13-admin-panel)
14. [Deployment & CI/CD](#14-deployment--cicd)
15. [Environment Variables](#15-environment-variables)
16. [Known Issues & Technical Debt](#16-known-issues--technical-debt)
17. [Pending Features (Part B)](#17-pending-features-part-b)
18. [Audit History](#18-audit-history)

---

## 1. Business Overview

**ChitraFrame** is an Indian D2C framed art print store. Customers browse a curated catalogue of 20 designed prints across 6 categories, choose size + frame finish, and order. All prints are made-to-order (no inventory) — printed, framed, and shipped from a single fulfilment point.

| Attribute | Value |
|-----------|-------|
| Business model | D2C, made-to-order |
| Fulfilment | Print + frame on demand, ship pan-India |
| Categories | Spiritual, Automotive, Sports, Wildlife, Anime/JDM, Motivational |
| SKU count | ~20 designs × 4 sizes × 2 frames = ~160 variants |
| Target | Tier 2–3 India gifting + home decor |
| Revenue model | Direct product sales, no subscription |
| COD | Planned (min ₹499, max ₹1,995, ₹49 fee) |
| Owner contact | vijayprasadvvp@gmail.com / WhatsApp: 917989531818 |

---

## 2. Live URLs & Access

| Environment | URL |
|-------------|-----|
| **Production (customer)** | https://photoframepfs.pages.dev/ |
| **Production (admin)** | https://photoframepfs.pages.dev/admin |
| **Admin login** | Email: `vijayprasadvvp@gmail.com` / Password: `Photoframe7989!` |
| **GitHub repo** | https://github.com/Kbs-sol/PhotoFramePFS |
| **Branch** | `main` |
| **Cloudflare Pages project** | `photoframepfs` |

---

## 3. Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Edge runtime** | Cloudflare Pages/Workers | No Node.js APIs at runtime |
| **Backend framework** | Hono v4.12.9 | `src/index.tsx` — 1,140 lines |
| **Frontend** | Vanilla JS IIFE SPA | `public/static/app.js` — 4,300+ lines |
| **Admin frontend** | Vanilla JS | `public/static/admin.js` |
| **Database** | Supabase PostgreSQL | 31 tables, Row Level Security |
| **Image CDN** | Cloudinary (`dax4yqumu`) | `c_fill,w_N,q_auto,f_auto` transforms |
| **Payments** | Razorpay | Two-step: create-order → verify |
| **Shipping** | Shiprocket (primary) | Widget + serviceability API |
| **Serviceability** | India Post API | `api.postalpincode.in/pincode/{pin}` |
| **Email** | Resend | Transactional emails |
| **Analytics** | GA4 + Microsoft Clarity | GTM-based |
| **Build** | Vite 6 + `@hono/vite-build` | Outputs `dist/_worker.js` (~386kB) |
| **CSS** | Custom design system | `public/static/styles.css` (8,400+ lines) |

---

## 4. Repository Structure

```
/home/user/webapp/
├── src/
│   ├── index.tsx              # Main Hono app + pageShell + all inline API routes (1140 lines)
│   └── routes/
│       ├── admin.ts           # Admin API — products, orders, reviews, config, stats
│       ├── analytics.ts       # Analytics endpoints
│       ├── auth.ts            # Customer auth (Supabase magic link / OAuth)
│       ├── checkout.ts        # Checkout — create order, Razorpay, COD flow
│       ├── marketing.ts       # Leads, newsletter, suggestions, referrals
│       ├── orders.ts          # Order management, status updates, tracking
│       ├── products.ts        # Product catalogue, variants, gallery, reviews
│       └── upload.ts          # Cloudinary signed upload (sign, config, image)
├── public/
│   └── static/
│       ├── app.js             # Customer SPA (4300+ lines vanilla JS IIFE)
│       ├── admin.js           # Admin panel JS
│       ├── styles.css         # Customer design system (8400+ lines)
│       └── admin.css          # Admin styles
├── migrations/                # Supabase SQL migration files
├── schema.sql                 # Full DB schema reference
├── dist/                      # Build output (git-ignored)
├── package.json
├── vite.config.ts             # @hono/vite-build/cloudflare-pages plugin
├── wrangler.jsonc             # Cloudflare Pages config
├── tsconfig.json
├── .dev.vars                  # Local secrets (never committed)
├── README.md
└── system_literacy.md         # This document
```

---

## 5. Backend — Hono Edge Workers

### Entry Point: `src/index.tsx`

**Key sections:**

```
Lines 1–50    — Bindings type (all env vars typed)
Lines 51–160  — App init, middleware, route mounting
Lines 161–560 — Inline API routes (config, products, reviews, leads, etc.)
Lines 560–660 — pageShell() function — the HTML template
Lines 660–850 — customerRoutes[] loop + SSR meta injection
Lines 850–end — Admin shell route + health check
```

**Route mounting (lines 150–160):**
```typescript
app.route('/api/admin',    adminRoutes);
app.route('/api/auth',     authRoutes);
app.route('/api/checkout', checkoutRoutes);
app.route('/api/orders',   orderRoutes);
app.route('/api/products', productRoutes);
app.route('/api/upload',   uploadRoutes);
app.route('/api/marketing',marketingRoutes);
app.route('/api/analytics',analyticsRoutes);
```

**Static files:**
```typescript
app.use('/static/*', serveStatic({ root: './public' }))
```
> Uses `hono/cloudflare-workers` serveStatic — NOT `@hono/node-server`

**CSP header** (line 81):
- Allows: `self`, Supabase WS, Razorpay, Cloudinary, GTM, GA4, Clarity, India Post API
- `'unsafe-inline'` required (inline onclick handlers — known tech debt)
- GSAP and FontAwesome CDNs removed (v5.2)

**pageShell()** (line ~560):
- Injects `<title>`, `<meta description>`, OG tags, canonical URL, JSON-LD
- Includes GTM head/body snippets
- Serves Google Fonts (DM Serif Display + DM Sans)
- Single `<script src="/static/app.js" defer>` tag
- Default OG image: `https://res.cloudinary.com/dax4yqumu/image/upload/c_fill,w_1200,h_630,q_auto,f_auto/chitraframe/og-default.jpg`

**Sitemap** (`/sitemap.xml`):
- Static product slugs with real `lastmod` dates (not `new Date()`)
- 14 product entries + standard pages

### Key API Routes (inline in index.tsx)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/config/public` | GET | System config from Supabase `system_config` table |
| `/api/products` | GET | Product listing with pagination, category filter |
| `/api/products/:slug` | GET | Single product + variants + gallery |
| `/api/reviews` | GET | Approved reviews (limit, product filter) |
| `/api/reviews` | POST | Submit review — rate-limited by `CF-Connecting-IP` |
| `/api/leads` | POST | Newsletter / lead capture |
| `/api/custom-orders` | POST | Custom frame intake |
| `/api/suggestions` | POST | Customer suggestion form |
| `/api/upload/sign` | GET | Signed Cloudinary upload params |
| `/api/upload/config` | GET | Cloudinary cloud name (no secret) |
| `/api/upload/image` | POST | Server-side base64 → Cloudinary upload |
| `/api/checkout/*` | * | Order creation, Razorpay, COD |
| `/api/orders/*` | * | Order management, status |
| `/api/admin/*` | * | Admin operations |

---

## 6. Frontend — Vanilla JS SPA

### Architecture

`public/static/app.js` is a single **IIFE** (Immediately Invoked Function Expression) — no bundler, no imports, no modules. All logic lives inside `(function() { 'use strict'; ... })()`.

**Why IIFE?** Cloudflare Pages serves it as a plain static file. No build step for the frontend.

### Global State

```javascript
let state = {
  cart: [],        // Array of cart items (persisted to localStorage)
  config: {},      // Loaded from /api/config/public
  page: '',        // Current route path
  exitShown: false,// Exit intent already shown
  wishlist: [],    // Wishlist slugs (localStorage)
  cartOpen: false  // Cart drawer open state
};
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `navigate(path)` | Client-side routing — updates `history.pushState`, renders page |
| `renderHeader()` | Returns header HTML string (cart count, nav, mobile menu) |
| `renderFooter()` | Returns footer HTML string |
| `renderHomePage(app)` | Homepage: hero, categories, products, reviews |
| `renderProductPage(app, slug)` | PDP: gallery, size selector, frame swatches, ATC |
| `renderShopPage(app)` | All products grid with filter |
| `renderCheckoutPage(app)` | Multi-field checkout form |
| `submitCheckout(e)` | Validates form → creates order → Razorpay/COD |
| `openRazorpay(orderData)` | Loads Razorpay widget → verify payment → clear cart |
| `renderAccountPage(app)` | Account page with order history |
| `loadAccountOrders(id)` | Fetches `/api/orders?customerId={id}` |
| `quickAdd(variantId,...)` | Mini-modal size+frame selector for grid ATC |
| `submitCustomOrder()` | Async: upload image → add to cart → checkout |
| `initExitIntent()` | Mouseleave trigger → honest cart total copy |
| `getCartTotals(method)` | Calculates subtotal, shipping, discount, COD fee |
| `saveCart()` | localStorage with QuotaExceeded fallback |
| `loadReviews()` | Fetches live reviews from API |
| `loadProofStats()` | Fetches product count from `/api/products?count=true` |
| `validateCheckoutForm(data)` | Client-side field validation |
| `toast(msg, type, ms)` | Toast notification (success/error/info) |
| `escapeHTML(s)` | XSS sanitization — used everywhere |
| `formatPrice(n)` | `₹${n.toLocaleString('en-IN')}` |

### Routing

```javascript
// All routes are handled by navigate():
'/'                     → renderHomePage
'/shop'                 → renderShopPage
'/product/:slug'        → renderProductPage
'/category/:slug'       → renderCategoryPage
'/cart'                 → renderCartPage
'/checkout'             → renderCheckoutPage
'/customize'            → renderCustomizePage
'/order-success'        → renderOrderSuccessPage
'/track'                → renderTrackPage
'/bulk-orders'          → renderBulkOrdersPage
'/gift-cards'           → renderGiftCardsPage
'/care-guide'           → renderCareGuidePage
'/blog'                 → renderBlogPage
'/about', '/contact',
'/policy', '/faq', etc. → respective render functions
```

### Image Strategy

```javascript
const CLD_CLOUD = 'dax4yqumu';
const DESIGN_IMAGES = {
  'mahadev-cosmic-trance': 'https://res.cloudinary.com/dax4yqumu/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/mahadev-cosmic-trance.jpg',
  // ... 20 entries
};
function cldUrl(slug, w = 800) { ... }    // Returns Cloudinary URL for slug
function cldPicture(slug, alt, ...) { ... } // Returns <picture> element with WebP + fallback
```

### Pricing (current v5.1 — see Part B for planned v5.2)

```javascript
const SIZES = [
  { label: 'Small',  desc: '8×12"',  prices: { standard: 499, premium: 649 } },
  { label: 'Medium', desc: '12×18"', prices: { standard: 749, premium: 999 }, default: true },
  { label: 'Large',  desc: '16×20"', prices: { standard: 1099, premium: 1399 } },
  { label: 'XL',     desc: '20×30"', prices: { standard: 1699, premium: 2199 } },
];
// Free shipping: ₹899+
// COD fee: ₹49
// Prepaid discount: -₹50
// Poster add-on: ₹149
```

### Cart Persistence

```javascript
// Save — with QuotaExceededError recovery
try {
  localStorage.setItem('cf_cart', JSON.stringify(state.cart));
} catch(e) {
  if (e.name === 'QuotaExceededError') {
    // Strip large data (base64 images) and retry
    const stripped = state.cart.map(i => { const c = {...i}; delete c.uploadedDataUrl; return c; });
    localStorage.setItem('cf_cart', JSON.stringify(stripped));
  }
}
```

### A/B Testing

```javascript
const ABTest = {
  get(key) { /* 50/50 split stored in localStorage */ },
  set(key, variant) { ... }
};
// Active test: 'ab_hero_cta' → 'shop-now' vs 'explore-collection'
```

---

## 7. Database — Supabase PostgreSQL

**Project URL:** stored in `SUPABASE_URL` env var  
**Access:** `SUPABASE_ANON_KEY` (public read) + `SUPABASE_SERVICE_KEY` (admin write)

### Key Tables

| Table | Purpose |
|-------|---------|
| `products` | Product catalogue (id, slug, name, category_id, price, description) |
| `product_variants` | Size × frame combos (product_id, size, frame_type, price, sku) |
| `product_gallery_images` | Product image gallery (product_id, image_url, sort_order) |
| `categories` | Product categories (id, slug, name, description) |
| `orders` | Customer orders (id, status, customer_*, shipping_address, total, payment_method) |
| `order_items` | Line items per order (order_id, variant_id, name, price, quantity, size, frame) |
| `customers` | Customer accounts (id, email, name, phone, created_at) |
| `reviews` | Product reviews (id, product_id, name, rating, body, is_approved, ip_address) |
| `system_config` | Key-value config store (key, value) |
| `leads` | Newsletter/contact leads (email, phone, source, created_at) |
| `custom_framing_orders_intake` | Custom frame order intake |
| `blog_posts` | Blog content (slug, title, body, published_at) |
| `collections` | Curated product collections |

### Row Level Security

RLS is enabled on all tables. The backend uses `SUPABASE_SERVICE_KEY` to bypass RLS for all write operations. Read operations may use `SUPABASE_ANON_KEY` where appropriate.

### `system_config` Keys (important)

| Key | Purpose |
|-----|---------|
| `announcement_text` | Promo bar text |
| `announcement_active` | `'true'`/`'false'` |
| `free_shipping_threshold` | Override (default: 899) |
| `cod_enabled` | COD toggle (planned) |
| `acrylic_upgrade_enabled` | Acrylic frame upsell toggle (planned) |
| `pickup_pincode` | Owner pickup postcode for shipping calc (planned) |

---

## 8. Third-Party Services

### Razorpay (Payments)
- **Keys:** `RAZORPAY_KEY_ID` (public, sent to frontend) + `RAZORPAY_KEY_SECRET` (server-side HMAC)
- **Flow:**
  1. `POST /api/checkout/create-order` → Razorpay creates order, returns `razorpay_order_id`
  2. Frontend opens Razorpay SDK widget
  3. On success: `POST /api/checkout/verify-payment` with `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature`
  4. Server verifies HMAC-SHA256 signature. **Only on success**: cart cleared, success page shown.
- **Race condition fix (v5.2):** `.catch(()=>({}))` removed — verification failures now throw properly, cart is NOT cleared, WhatsApp fallback shown.

### Cloudinary (Image CDN)
- **Cloud name:** `dax4yqumu`
- **Credentials:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- **Usage:**
  - All product images: `https://res.cloudinary.com/dax4yqumu/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/{slug}.jpg`
  - Custom frame uploads: `/api/upload/image` → Cloudinary → CDN URL stored
  - Signed uploads: `/api/upload/sign` returns timestamp + SHA-1 signature

### Supabase
- **URL:** `SUPABASE_URL`
- **Anon key:** `SUPABASE_ANON_KEY` (safe to expose — RLS enforced)
- **Service key:** `SUPABASE_SERVICE_KEY` (NEVER expose — bypasses RLS)

### Shiprocket
- **Credentials:** `SHIPROCKET_EMAIL` + `SHIPROCKET_PASSWORD`
- **Auth:** Token-based (JWT, refreshes on 401)
- **Primary use:** Shipping widget embed + serviceability check
- **Fallback:** India Post API for pincode validation

### India Post API
- `https://api.postalpincode.in/pincode/{pincode}` — free, no auth
- Used in `checkDelivery()` function in app.js
- Returns city + state for pincode, verifies deliverability

### Resend (Email)
- **Key:** `RESEND_API_KEY`
- **Use:** Order confirmation emails to customer + notification to owner

### Google Analytics 4 + GTM
- **IDs:** `GA4_MEASUREMENT_ID` + `GTM_CONTAINER_ID`
- **Events tracked:** `page_view`, `add_to_cart`, `purchase`, `begin_checkout`

### Microsoft Clarity
- **ID:** `MICROSOFT_CLARITY_ID`
- **Use:** Heatmaps + session recordings

---

## 9. Cloudflare Configuration

**`wrangler.jsonc`:**
```jsonc
{
  "name": "photoframepfs",
  "compatibility_date": "2024-01-01",
  "pages_build_output_dir": "./dist",
  "compatibility_flags": ["nodejs_compat"]
}
```

**Build output:** `dist/_worker.js` (~386kB unminified)

**Static assets:** Cloudflare Pages automatically serves `public/static/` at `/static/`

**Cache headers:**
- `app.js`: `no-cache, no-store, must-revalidate` (ensures updates deploy immediately)
- `styles.css`, `admin.js`: default Cloudflare caching (version-bump to bust)

**CSP nonce:** Not yet implemented (tech debt — `unsafe-inline` used)

**Runtime limits (free plan):**
- 10ms CPU time per request
- 10MB Worker size limit
- No persistent file system

---

## 10. Payment Flow

### Online (Razorpay)
```
Customer fills checkout form
  → validateCheckoutForm() client-side
  → POST /api/checkout/create-order
      → Supabase: INSERT order (status='pending')
      → Razorpay: create order
      → Returns: { razorpayOrderId, amount, key, orderId }
  → Razorpay SDK opens payment modal
  → Customer pays
  → handler.success({ razorpay_payment_id, razorpay_order_id, razorpay_signature })
  → POST /api/checkout/verify-payment
      → HMAC-SHA256 verification (RAZORPAY_KEY_SECRET)
      → If valid: Supabase UPDATE order status='processing'
                  Resend: confirmation email
                  Returns: { success: true, orderId }
      → If invalid: Returns { success: false, error: '...' }
  → Client checks verifyResult.success === true
  → Only then: cart cleared, navigate('/order-success')
  → On verify failure: show error toast + WhatsApp fallback link
```

### COD (Planned — Part B)
```
Customer selects COD at checkout
  → COD policy check: total ≥ ₹499, total ≤ ₹1,995
  → POST /api/checkout/create-order (payment_method='cod')
      → Supabase: INSERT order (status='cod_pending')
      → WhatsApp pre-filled message sent to customer
      → Resend: email to owner
  → Customer confirms via WhatsApp
  → Admin marks confirmed → status='processing'
```

---

## 11. Order Lifecycle

| Status | Meaning |
|--------|---------|
| `pending` | Order created, payment not yet verified |
| `cod_pending` | COD order awaiting WhatsApp confirmation |
| `processing` | Payment verified / COD confirmed, being printed |
| `shipped` | Dispatched with tracking number |
| `delivered` | Delivered to customer |
| `cancelled` | Cancelled by customer or admin |
| `refund_initiated` | Refund in progress |

**Order fields:**
- `customer_name`, `customer_email`, `customer_phone`
- `shipping_address` (JSONB: name, phone, address, city, state, pincode)
- `items` (JSONB array of line items)
- `subtotal`, `discount`, `shipping`, `payment_adjustment`, `total`
- `payment_method`: `razorpay` | `cod`
- `razorpay_order_id`, `razorpay_payment_id`
- `tracking_number`, `tracking_url`
- `utm_source` (marketing attribution)
- `checkout_source` (planned: `shiprocket_widget` | `hono_fallback`)
- `shiprocket_synced` (planned: boolean)

---

## 12. Pricing & Business Rules

### Current Pricing (v5.1)

| Size | Dimensions | Standard Frame | Premium Frame |
|------|-----------|---------------|---------------|
| Small | 8×12" | ₹499 | ₹649 |
| Medium *(default)* | 12×18" | ₹749 | ₹999 |
| Large | 16×20" | ₹1,099 | ₹1,399 |
| XL | 20×30" | ₹1,699 | ₹2,199 |

**Frame types:**
- **Standard (1"):** Classic Matte Black aluminium
- **Premium (1.5"):** Gallery finish, Black or Natural Wood

**Shipping:**
- Free above ₹899 subtotal
- ₹49 flat below threshold (standard delivery)

**COD:**
- +₹49 COD handling fee
- Min order: ₹499
- Max order: ₹1,995 (planned enforcement)

**Prepaid discount:** −₹50 (planned UPI incentive)

**Add-ons:**
- A3 Poster Print (rolled, unframed): +₹149
- A4 Loss leader: ₹99 (hidden — upsell only, not on main pages)

### Free Shipping Threshold
- `freeThreshold = 899` in `getCartTotals()`
- Shown in mobile menu bottom bar
- Progress bar shown in cart drawer

---

## 13. Admin Panel

**URL:** `/admin` (served from separate `adminShell` in `src/index.tsx`)

**Auth:** Email + password via Supabase. Only `vijayprasadvvp@gmail.com` has admin access.

**Admin JS:** `public/static/admin.js` — uses FontAwesome icons (legitimately)

**Key admin features (via `/api/admin/*`):**
- Order management (list, filter by status, update status, add tracking)
- Product management (create, edit, publish/unpublish, manage variants + gallery)
- Review management (approve, reject, delete)
- Config management (system_config key-value pairs)
- Analytics overview (orders count, revenue, recent activity)
- Lead/newsletter list

**Planned admin features (Part B):**
- COD toggle (`cod_enabled` config key)
- Acrylic upgrade toggle
- PICKUP_PINCODE setting
- Batch Shiprocket sync button

---

## 14. Deployment & CI/CD

### Build
```bash
npm run build
# → vite build --minify false
# → dist/_worker.js (~386kB)
```

### Production Deploy
```bash
npm run deploy
# → npm run build && wrangler pages deploy dist --project-name photoframepfs
```

### GitHub Actions (`.github/workflows/deploy.yml`)
- Triggers on push to `main`
- Runs `npm install && npm run build`
- Deploys to Cloudflare Pages using `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets

### Secrets Required in GitHub Actions
| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages deploy permission |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

### Wrangler Secrets (production)
Set via: `npx wrangler secret put SECRET_NAME`
All secrets listed in [Section 15](#15-environment-variables).

---

## 15. Environment Variables

Set via `wrangler secret put` for production. Use `.dev.vars` for local dev (never commit).

```ini
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Razorpay
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...

# Shiprocket
SHIPROCKET_EMAIL=...
SHIPROCKET_PASSWORD=...

# Resend
RESEND_API_KEY=re_...

# Cloudinary (use CLOUDINARY_URL OR individual keys)
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@dax4yqumu
# OR:
CLOUDINARY_CLOUD_NAME=dax4yqumu
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Analytics (optional — gracefully absent)
GTM_CONTAINER_ID=GTM-XXXXXXX
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
MICROSOFT_CLARITY_ID=xxxxxxxxxx

# Business config
WHATSAPP_NUMBER=917989531818
```

---

## 16. Known Issues & Technical Debt

| Issue | Severity | Status |
|-------|----------|--------|
| CSP `unsafe-inline` required (inline onclick handlers) | Medium | Planned fix (nonce) |
| Admin password in system_literacy.md | ⚠️ | Rotate after reading |
| No server-side cart validation (prices could be manipulated) | High | Planned |
| `checkout_source` + `shiprocket_synced` fields not yet in schema | Medium | Part B |
| Part B pricing table not yet live (UI still shows old prices) | Medium | Part B |
| COD enforcement not yet implemented | Medium | Part B |
| No rate limiting on checkout (could create spam orders) | Medium | Planned |
| WebGL hero canvas dead code removed (v5.2) | ✅ Done | — |
| FontAwesome removed from customer pages (v5.2) | ✅ Done | — |
| GSAP removed from customer pages (v5.2) | ✅ Done | — |

---

## 17. Pending Features (Part B)

These are planned business requirements not yet implemented:

### Pricing Architecture
- [ ] Update size/price table in PDP + quickAdd modal to: Small ₹449/₹599, Medium ₹749/₹999 (default), Large ₹1,099/₹1,399, XL ₹1,699/₹2,199
- [ ] A4 ₹99 loss leader (hidden — only as upsell in cart/checkout)

### COD Policy
- [ ] Minimum order ₹499, maximum ₹1,995
- [ ] ₹49 COD handling fee enforced in `getCartTotals()`
- [ ] 40% COD volume cap (admin configurable)
- [ ] COD WhatsApp confirmation flow (pre-filled message to customer)
- [ ] Resend email to owner on new COD order
- [ ] `cod_pending` status + admin confirmation UI

### Checkout Architecture
- [ ] Shiprocket widget as primary checkout
- [ ] Hono fallback checkout (current implementation) as secondary
- [ ] `checkout_source` field: `'shiprocket_widget'` | `'hono_fallback'`
- [ ] `shiprocket_synced` boolean field in orders
- [ ] Add both fields to `schema.sql` + order creation code

### Serviceability
- [ ] Pincode serviceability check: India Post API first, Shiprocket if unavailable
- [ ] Show estimated delivery date based on pincode

### Shipping Calculation
- [ ] Volumetric weight table by size
- [ ] Graduated shipping rates (currently flat ₹49 below ₹899)

### PDP Redesign (8-section)
- [ ] Full 8-section PDP with red `#CC0000` BUY NOW button
- [ ] Sticky ATC bar on mobile

### Admin Controls
- [ ] COD toggle (`cod_enabled` → `system_config`)
- [ ] Acrylic upgrade toggle
- [ ] `PICKUP_PINCODE` setting (for shipping calculation)
- [ ] Batch Shiprocket sync button

### Schema Changes Required
```sql
-- orders table additions
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_source TEXT DEFAULT 'hono_fallback';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_synced BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_confirmed_at TIMESTAMPTZ;

-- reviews table (already done in v5.2)
-- ALTER TABLE reviews ADD COLUMN IF NOT EXISTS ip_address TEXT;
```

---

## 18. Audit History

| Version | Date | Changes |
|---------|------|---------|
| **v5.0** | Mar 2025 | Initial launch: GA4, A/B test, WebP images, FAQ schema |
| **v5.1** | May 2025 | Size guide, sticky PDP bar, urgency timer, pincode checker, cache headers |
| **v5.2** | Jun 2026 | **Full audit (40+ fixes):** |
| | | • s1.1: Razorpay race condition fixed |
| | | • s1.2: quickAdd mini-modal (size+frame) |
| | | • s1.3: Custom order Cloudinary upload |
| | | • s1.4: saveCart QuotaExceededError recovery |
| | | • s1.5: Checkout form validation |
| | | • s2.x: All fake data removed (reviews, stats, referral, scarcity) |
| | | • s3.x: Pricing fixes, 3 new pages, WhatsApp number fixed |
| | | • s4.x: GSAP + FontAwesome removed (-1.2MB), no-cache app.js |
| | | • s5.x: Sitemap real dates, OG image fallback |
| | | • s6.x: Mobile menu a11y, account orders, exit intent, frame swatches, loading states |
| | | • s7.x: Grain texture, hover states, typography, mobile layout, WCAG |
| | | • s8.x: WebGL removed, IP-based review rate limiting |

---

*Last updated: June 2026 — ChitraFrame v5.2*
