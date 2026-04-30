# PhotoFrameIn — System Literacy Guide
**For AI Assistants, Developers & Future Maintainers**
**Admin Contact:** vijayprasadvvp@gmail.com | Version: 3.0 | Updated: 2026-04-26

---

## 1. Project Overview

PhotoFrameIn is a **direct-to-consumer premium photo frame e-commerce** built on Cloudflare Pages + Workers. The business sells handcrafted photo frames online, targeting two primary verticals:

| Vertical | Categories | Keywords |
|----------|-----------|---------|
| 🕉️ Divine Art | Ganesha, Shiva, Hanuman, Krishna, Rama | Home mandir, pooja room, gifting |
| 🏎️ Automotive Art | Porsche, Ferrari, hypercars, McLaren | Man-cave, garage, office |

**AOV (Average Order Value):** ~₹900 | **Target CAC:** <₹300 | **Target ROAS:** >3x

---

## 2. Tech Stack

```
Frontend:   Vanilla JS SPA (app.js, ~2100 lines) — NO React/Vue/Angular
Backend:    Hono.js on Cloudflare Workers (TypeScript)
Database:   Supabase (PostgreSQL) with Row-Level Security
Storage:    Cloudflare R2 + Cloudinary (images)
Email:      Brevo (300/day free) → Resend (100/day fallback) → Supabase Auth (magic link)
Payments:   Cashfree (prepaid) + COD (WhatsApp confirmation)
Shipping:   Shiprocket integration (AWB, label, pickup)
Auth:       Supabase Magic Link + Google OAuth (customers) | Admin: env-var based JWT
Analytics:  GTM/GA4 + custom funnel events table
CDN:        Cloudflare (global edge, 200+ cities)
```

---

## 3. Repository Structure

```
/home/user/webapp/
├── src/
│   ├── index.tsx              # Hono app entry point — all routes registered here
│   ├── routes/
│   │   ├── admin.ts           # Admin CRUD API (1359 lines) — ALL admin operations
│   │   ├── analytics.ts       # Funnel event tracking
│   │   ├── auth.ts            # Magic link + Google OAuth + Brevo/Resend fallback
│   │   ├── checkout.ts        # Pincode validation, shipping estimate, order creation
│   │   ├── orders.ts          # Order tracking, damage claims, COD confirm
│   │   ├── products.ts        # Product listing, search, reviews
│   │   └── upload.ts          # Cloudinary signed upload
│   └── lib/
│       ├── supabase.ts        # DB client factory
│       ├── email.ts           # Brevo + Resend send functions
│       ├── shipping.ts        # Shiprocket + pincode validation
│       └── alerts.ts          # Owner alert emails
├── public/static/
│   ├── app.js                 # Customer SPA (~2150 lines) — all pages rendered here
│   ├── admin.js               # Admin SPA (~1700 lines) — admin panel UI
│   ├── styles.css             # Production CSS (dark luxury theme)
│   └── admin.css              # Admin panel CSS
├── supabase/
│   ├── schema.sql             # Complete DB schema (tables, RLS, indexes, RPCs)
│   ├── seed.sql               # All system_config defaults + seed categories
│   └── updates_v2.sql         # v2 additions (combos, reviews fields, ad_performance)
├── wrangler.jsonc             # Cloudflare Pages config
├── vite.config.ts             # Build config
├── ecosystem.config.cjs       # PM2 config (sandbox dev server)
└── SYSTEM_LITERACY.md         # This file
```

---

## 4. Database Schema (Key Tables)

### Core Commerce
| Table | Purpose |
|-------|---------|
| `products` | Products with SEO, flags, rating stats |
| `product_variants` | Size (Small/Medium/Large/XL/A4) × Frame (Poster/Standard/Premium) × price/stock |
| `product_images` | Multi-image per product, display_order |
| `categories` | slug, hover_color, is_intent_collection |
| `orders` | Full order lifecycle — UTM, payment, shiprocket, AWB, status |
| `customers` | Auth-linked, total_orders, total_spend |
| `combos` | Bundle/combo definitions for upsell |

### Support Tables
| Table | Purpose |
|-------|---------|
| `reviews` | Customer reviews with admin_reply, is_featured, verified_purchase |
| `coupons` | Discount codes with type/value/usage tracking |
| `system_config` | Key-value config store (ALL site settings live here) |
| `ad_performance` | Ad spend logging — platform, category, CAC, ROAS |
| `sales_funnel_events` | page_view → add_to_cart → checkout → purchase |
| `email_log` | All outbound emails (Brevo/Resend) with status |
| `error_log` | Runtime errors with endpoint context |
| `leads` | Exit intent + newsletter captures |
| `blog_posts` | Blog CMS |
| `faq` | FAQ entries |
| `page_versions` | Editable policy pages |

### Key RPC Functions
```sql
increment_order_sequence(date_key TEXT) → BIGINT  -- Generates PS-YYMMDD-NNNN IDs
increment_customer_stats(cust_id UUID, amount NUMERIC)  -- Updates customer totals
```

---

## 5. system_config — Complete Key Reference

All site behaviour is controlled via `system_config` table. Admin can edit via Settings panel.

### Checkout & Payment
| Key | Default | Description |
|-----|---------|-------------|
| `checkout_mode` | `shiprocket` | `shiprocket` or `custom` |
| `cod_enabled` | `true` | Enable Cash on Delivery |
| `cod_min_value` | `499` | Minimum order for COD (₹) |
| `cod_max_value` | `1995` | Maximum order for COD (₹) |
| `cod_fee` | `49` | COD handling fee (₹) |
| `prepaid_discount` | `50` | Prepaid discount at checkout (₹) |
| `free_shipping_threshold` | `899` | Free shipping above this (₹) |
| `acrylic_enabled` | `true` | Show acrylic upgrade option |
| `combos_enabled` | `true` | Show combo/bundle upsells |

### Social & Contact
| Key | Description |
|-----|-------------|
| `instagram_link` | Full Instagram URL |
| `facebook_link` | Full Facebook URL |
| `whatsapp_number` | Phone with country code (e.g. `917989531818`) |
| `whatsapp_link` | Override WhatsApp URL (optional, overrides number) |
| `twitter_link` | Twitter/X URL |
| `contact_email` | Support email |
| `contact_phone` | Phone display |

### Announcement Bar
| Key | Description |
|-----|-------------|
| `announcement_text` | Banner text |
| `announcement_link` | Banner CTA link |
| `announcement_bg` | HEX color (e.g. `#CC0000`) |
| `announcement_active` | `true`/`false` |

### SEO
| Key | Description |
|-----|-------------|
| `seo_title` | Global site title |
| `seo_description` | Global meta description |
| `gtm_container_id` | GTM ID (GTM-XXXXXX) |

---

## 6. Admin Panel — Feature Guide

**URL:** `/admin` | **Login:** Email + Password (Supabase or super-admin env var)

### Admin Authentication (No Supabase Required)
```bash
# .dev.vars or Cloudflare Secrets:
ADMIN_PASSWORD=your-secure-password
ADMIN_TOKEN=your-jwt-token          # Used for Bearer auth
ALERT_EMAIL=vijayprasadvvp@gmail.com
OWNER_EMAIL=vijayprasadvvp@gmail.com
```
Super-admin bypass uses `ADMIN_PASSWORD` → returns `ADMIN_TOKEN`. No Supabase required for admin login.

### Sections
| Section | Capabilities |
|---------|-------------|
| **Dashboard** | Revenue today/month, orders, funnel metrics, email quotas |
| **Products** | Full CRUD, image upload, variant management |
| **Categories** | Full CRUD, color picker, display order |
| **Orders** | Filter by status/payment, ship, COD confirm, damage claims |
| **Media** | Cloudinary upload → get link for products/banners |
| **Logistics** | Shiprocket: create order, AWB, label, pickup, sync |
| **Customers** | List, block, view order history |
| **Leads** | Exit intent + newsletter signups |
| **Analytics** | Product metrics, RTO pincodes, traffic attribution |
| **Coupons** | Create/pause/resume coupon codes |
| **Reviews** | Pending → approve/feature/reply, bulk JSON import |
| **Combos** | Bundle management, savings %, category filter |
| **Ad Performance** | CAC/ROAS tracker by platform & category (divine/auto) |
| **Content** | Policy pages, FAQ, blog posts |
| **Settings** | All system_config keys, social links, WhatsApp |

---

## 7. Frame Types & Product Visualizer

### Frame Types
| Type | Code | Description | Visual |
|------|------|-------------|--------|
| No Frame Print | `Poster` | Paper print only, no frame | White border |
| Standard Frame | `Standard` | Direct print in black frame | Dark frame border |
| Premium w/ Mount | `Premium` | Pure white archival mount + frame | White mount + dark frame |

### Mount Visualizer (CSS)
```css
/* .has-mount class on <img> shows the white gallery mat */
.has-mount {
  border-width: 40px;           /* White mount width */
  border-color: #FFFFFF;         /* ALWAYS pure white — do not change */
  outline: 8px solid #1A1A1A;   /* Dark outer frame ring */
}
```

**Critical:** Mount is ALWAYS pure white (#FFFFFF). There is NO mount type dropdown for customers — it was removed. The Premium option always uses archival pure white mount.

**Premium pricing:** Base price includes ₹250 premium surcharge vs Standard. Size button prices show variant prices directly — no extra add-on shown.

---

## 8. Shipping & Volumetric Weight

### Frame Dimensions (for volumetric weight)
| Size | Dims (cm) | Vol. Weight (kg) |
|------|-----------|-----------------|
| Small (8×12") | 24×34×5 | ~0.8 kg |
| Medium (12×18") | 34×50×6 | ~2.0 kg |
| Large (18×24") | 50×66×7 | ~4.6 kg |
| XL (24×36") | 66×97×8 | ~10.2 kg |

Formula: `(L × W × H) / 5000` kg

### Shipping Rates (Backend)
| Condition | Rate |
|-----------|------|
| Prepaid above ₹899 | FREE |
| Standard prepaid | ₹79–₹99 |
| COD Small/Medium | ₹99 |
| COD Large/XL | ₹149 |
| Remote areas | ₹149+ |

---

## 9. Email System

**Priority chain:** Supabase Auth → Brevo → Resend → Log failure

```typescript
// env vars required:
BREVO_API_KEY        // 300 free emails/day
RESEND_API_KEY       // 100 free emails/day fallback
SUPABASE_URL         // For magic link (OTP) generation
```

**Magic link flow:**
1. Supabase generates OTP magic link
2. Custom email sent via Brevo (branded HTML)
3. If Brevo fails → Resend
4. If both fail → logged to `email_failures` table
5. User redirected to `/auth/callback?token_hash=...`

---

## 10. Order ID Format

```
PS-YYMMDD-NNNN
Example: PS-260426-0001
```
Generated by `increment_order_sequence()` RPC — atomic, gap-free.

---

## 11. Order Status Flow

```
pending → confirmed → processing → packed → shipped → delivered
                                          ↓
                              cancelled (admin action)
                              cod_pending (COD orders waiting WhatsApp confirm)
                              pickup_scheduled → ready_to_ship
```

---

## 12. Security Model

| Layer | Implementation |
|-------|---------------|
| XSS prevention | `escapeHTML()` on ALL user/DB data before innerHTML |
| SQL injection | Supabase parameterized queries only |
| CSRF | Stateless JWT Bearer tokens |
| Admin brute force | Rate limiter (10 attempts / 15 min / IP) |
| Timing attacks | `safeCompare()` for password verification |
| File uploads | Type validation + 50MB limit + Cloudinary URL validation |
| CSP | No inline scripts from user input |
| Admin bypass | Env-var super-admin (timing-safe compare) |

---

## 13. Conversion Rate Optimization (CRO)

### Active Features
- Volume discounts: 2 items → ₹100 off, 3 → ₹250 off, 5+ → 20% off (no combo causes a loss)
- Exit intent popup: code EXIT10 (10% off)
- Prepaid discount: ₹50 off at checkout
- Urgency text: configurable via admin
- Trust badges: 12-hour dispatch, 5-layer packaging, damage protection
- Cart upsell widget (API: `/api/products/upsell`)

### Removed (per conversion audit)
- ❌ "Wall Art" from navigation (replaced with Divine + Automotive)
- ❌ Mount type dropdown on product page (mount is always pure white)
- ❌ Negative messaging ("not available", "out of stock" shown inline)
- ❌ Dive Art category renamed → shown only if products exist

---

## 14. Environment Variables Reference

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...

# Admin Auth (Supabase-free)
ADMIN_PASSWORD=your-secure-password
ADMIN_TOKEN=your-jwt-token
ALERT_EMAIL=vijayprasadvvp@gmail.com
OWNER_EMAIL=vijayprasadvvp@gmail.com

# Payments
CASHFREE_APP_ID=...
CASHFREE_SECRET_KEY=...
CASHFREE_ENV=PROD  # or TEST

# Logistics
SHIPROCKET_EMAIL=...
SHIPROCKET_PASSWORD=...

# Email
BREVO_API_KEY=...
RESEND_API_KEY=...

# Storage
R2_PUBLIC_URL=https://r2.photoframein.com
MY_BUCKET=<R2 binding>
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# KV binding
KV=<KV namespace binding>
```

---

## 15. Free-Tier Capacity (1000 Customers)

| Resource | Free Limit | Estimated Usage | Safety |
|----------|-----------|----------------|--------|
| Cloudflare Workers | 100k req/day | ~500 req/day active | ✅ |
| Supabase rows | 500k | ~50k (orders + products) | ✅ |
| Supabase auth users | 50k | ~1000 customers | ✅ |
| Brevo emails | 300/day | ~50/day (orders + leads) | ✅ |
| Resend emails | 100/day | Fallback only | ✅ |
| Cloudinary | 25GB bandwidth | ~2GB/month | ✅ |
| Cloudflare R2 | 10GB + 10M ops | ~500MB | ✅ |

**Status indicator:** Dashboard shows live usage bars for Cloudflare, Supabase rows, and email quotas.

---

## 16. AI Assistant Rules

When an AI assistant works on this codebase:

1. **NEVER hardcode secrets** — all keys via env vars
2. **ALWAYS escape HTML** — use `escapeHTML()` before innerHTML injection
3. **Mount is ALWAYS pure white** (#FFFFFF) — never change `has-mount` background
4. **No combo causes a loss** — discount capped at 40% of subtotal
5. **Admin contact:** vijayprasadvvp@gmail.com — always include in error alert routes
6. **Supabase-free admin login** — env-var `ADMIN_PASSWORD` + `ADMIN_TOKEN` is the bypass
7. **Volume discounts are immutable** — 2→₹100, 3→₹250, 5+→20% (these are brand promises)
8. **Divine ≠ Dive** — category slug is `divine`, NOT `dive`
9. **Size prices = variant prices** — Premium adds ₹250 to the variant price, size buttons show final price
10. **File structure** — all business logic in `src/routes/`, all UI in `public/static/`

---

## 17. Adding New Features Checklist

- [ ] Backend route → `src/routes/admin.ts` or appropriate route file
- [ ] Frontend UI → `public/static/admin.js` (admin) or `public/static/app.js` (customer)
- [ ] Database → append ALTER/CREATE to `supabase/master.sql` (**single source of truth**)
- [ ] Config key → add `INSERT INTO system_config` block in `supabase/master.sql`
- [ ] Secrets → add to `.dev.vars` AND Cloudflare Pages secrets + document in `wrangler.jsonc` comments
- [ ] Document → update this SYSTEM_LITERACY.md

### Supabase SQL File Convention
```
supabase/
└── master.sql   ← THE ONLY FILE — run once, idempotent, contains everything:
                    schema • indexes • RLS policies • RPC functions •
                    system_config seed • categories • products • combos • FAQ • pages
```
All previous files (schema.sql, unified.sql, seed.sql, updates_v2.sql, etc.) have been
merged into master.sql and deleted. When you need a schema change, append it to master.sql.

---

## 18. Market-Entry Business Strategy

**Objective:** Reach ₹1L/month revenue within 90 days with a budget of ₹15,000.

### Target Segments & Positioning

| Segment | Buyer Persona | Hook | Price Point |
|---------|--------------|------|-------------|
| 🕉️ Divine | Hindu homeowner (25-50F), Hyderabad + Tier-2 | "Make your pooja room premium" | ₹799–₹1,195 |
| 🏎️ Automotive | Young man (18-32M), car enthusiast | "Your dream car on your wall" | ₹899–₹1,495 |
| 🎁 Gifting | Anyone buying for birthdays/weddings | "Personalised gift under ₹999" | ₹699–₹999 |

### 90-Day Execution Plan

#### Phase 1 — Foundation (Days 1–15) · Budget: ₹0
- [ ] Upload 6 product images to Cloudinary via Media Manager (2 divine, 2 auto, 2 motivation)
- [ ] Set live config in Supabase: `owner_email`, `whatsapp_number`, `announcement_text`
- [ ] Create 3 Instagram Reels: unboxing + pooja room reveal, Porsche frame reveal, custom frame surprise
- [ ] Post to 5 relevant Facebook groups (Hyderabad home decor, car lovers India)
- [ ] Enable Google Business Profile listing (free local SEO)

#### Phase 2 — Paid Acquisition (Days 16–45) · Budget: ₹8,000
- [ ] Meta Ads: ₹100/day — 2 ad sets
  - Divine: "Ganesha wall art for home" → product page — optimize for Add to Cart
  - Automotive: "Porsche poster frame India" → product page — optimize for Purchase
- [ ] Target: CAC < ₹300, ROAS > 3x (₹900 AOV means ₹300 CAC = 33% acquisition cost)
- [ ] A/B test 2 creatives per ad set (static image vs Reel)
- [ ] Track via UTM + `sales_funnel_events` table in Supabase
- [ ] Kill any ad set with CTR < 1% or CAC > ₹500 within 7 days

#### Phase 3 — Scale & Retention (Days 46–90) · Budget: ₹7,000
- [ ] Influencer gifting: 3–5 micro-creators (10k–100k followers) in divine/auto niches
  - Offer: 2 free frames in exchange for a tagged Reel (no paid fee)
  - Cost: ~₹1,500 in product COGS
- [ ] WhatsApp broadcast to all COD-confirmed buyers (repeat purchase offer: 10% discount)
- [ ] Launch "Starter Desk Setup" combo via Meta retargeting (warm audience)
- [ ] SEO: publish 2 blog posts (`/blog`) — "Best Ganesha wall art for pooja rooms 2026"
- [ ] Email drip: 3-email post-purchase flow via Brevo (delivery → review request → repeat offer)

### Unit Economics at Scale

```
AOV:              ₹900
COGS (frames):    ₹220  (24%)
Shipping cost:    ₹80   (9%)
Payment gateway:  ₹27   (3%)
Packaging:        ₹30   (3%)
--------------------------
Gross Margin:     ₹543  (60%)

Target CAC:       ₹250  (Meta ads at ROAS 3.6x)
Contribution/order: ₹293

Break-even orders/month:  52  (fixed overhead ~₹15,000)
₹1L/month revenue target: 112 orders (~3.7/day)
```

### Key Conversion Levers (already built)
| Lever | Implementation | Expected Lift |
|-------|---------------|---------------|
| Exit-intent lead capture | `leads` table + Brevo email | +5% recoveries |
| COD availability | `cod_enabled=true`, ₹49 fee | +20% order rate |
| Urgency bar | `urgency_text` config key | +8% CVR |
| Volume discount | 2→₹100, 3→₹250 | +15% AOV |
| Free shipping threshold | `free_shipping_threshold=899` | +12% AOV |
| WhatsApp COD confirm | `whatsapp_number` config | -40% RTO |
| Custom frame upsell | `/customize` page | +₹250 avg premium |

### Risk Management
- **High RTO risk** → mandate WhatsApp confirmation before dispatch; block repeat-RTO pincodes via `pincode_risk` table
- **Low CAC margin** → never run ads below 2.5x ROAS; log weekly in `ad_performance` table
- **Cashflow** → prefer prepaid (Razorpay) with 3% discount incentive (`prepaid_discount` config)
- **Negative review spike** → unboxing video policy + `damage_claims` table for replacements

---

*Last updated: 2026-04-30 | Maintained by: vijayprasadvvp@gmail.com*
