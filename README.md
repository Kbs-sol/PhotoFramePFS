# ChitraFrame — Premium Framed Art Prints D2C Store

**Live:** https://photoframepfs.pages.dev/ | **Admin:** https://photoframepfs.pages.dev/admin  
**Stack:** Hono v4 · Cloudflare Pages · Supabase · Razorpay · Cloudinary · Vanilla JS SPA  
**Version:** 5.2 (June 2026)

---

## Completed Features

- **Product catalogue** — 20 designs × 4 sizes × 2 frame finishes (~160 variants)
- **SPA routing** — 25+ routes, client-side navigation, SSR meta per route
- **Razorpay checkout** — create-order → verify-payment (race condition fixed v5.2)
- **COD placeholder** — UI flow present, policy enforcement in Part B
- **Custom frame wizard** — 4-step upload → size → frame → checkout; Cloudinary upload (v5.2)
- **Cart** — localStorage persistence, QuotaExceeded recovery, poster add-on
- **Client-side validation** — name, email, phone, pincode, address
- **Account page** — order history from `/api/orders?customerId={id}` (v5.2)
- **Reviews** — live from API (approved only), rate-limited by IP
- **Blog** — 5 SEO articles with full body content
- **3 new pages** — `/bulk-orders`, `/gift-cards`, `/care-guide`
- **Admin panel** — orders, products, reviews, config, analytics
- **Sitemap + OG images** — real lastmod dates, Cloudinary fallback OG
- **Performance** — GSAP + FontAwesome removed (−1.2MB), app.js no-cache

## API Endpoints Summary

| Path | Method | Purpose |
|------|--------|---------|
| `/api/products` | GET | Product listing |
| `/api/products/:slug` | GET | Single product + variants |
| `/api/reviews` | GET/POST | Reviews (IP rate-limited) |
| `/api/checkout/create-order` | POST | Create Razorpay/COD order |
| `/api/checkout/verify-payment` | POST | Verify Razorpay HMAC |
| `/api/orders` | GET | Orders (customerId filter) |
| `/api/upload/image` | POST | base64 → Cloudinary CDN |
| `/api/upload/sign` | GET | Signed upload params |
| `/api/leads` | POST | Newsletter/lead capture |
| `/api/config/public` | GET | System config |
| `/api/admin/*` | * | Admin operations |

## Data Architecture

- **Database:** Supabase PostgreSQL — 31 tables, RLS enabled
- **Images:** Cloudinary CDN (`dax4yqumu`) — `c_fill,w_N,q_auto,f_auto`
- **Cart:** `localStorage` (`cf_cart`) — IIFE SPA state
- **Config:** `system_config` table (key-value pairs)
- **Auth:** Supabase magic link / admin email+password

## Pricing

| Size | Standard | Premium |
|------|----------|---------|
| Small (8×12") | ₹499 | ₹649 |
| Medium (12×18") | ₹749 | ₹999 |
| Large (16×20") | ₹1,099 | ₹1,399 |
| XL (20×30") | ₹1,699 | ₹2,199 |

Free shipping ≥ ₹899 · COD +₹49 · Poster add-on +₹149

## Development

```bash
npm install
npm run build          # vite build → dist/_worker.js
npm run dev:sandbox    # wrangler pages dev dist --port 3000
npm run deploy         # build + wrangler pages deploy
```

**Local secrets** → `.dev.vars` (never commit):
```ini
SUPABASE_URL=...   SUPABASE_ANON_KEY=...   SUPABASE_SERVICE_KEY=...
RAZORPAY_KEY_ID=...   RAZORPAY_KEY_SECRET=...
CLOUDINARY_URL=cloudinary://KEY:SECRET@dax4yqumu
RESEND_API_KEY=...   WHATSAPP_NUMBER=917989531818
```

## Pending (Part B)

- COD policy enforcement (min ₹499, max ₹1,995, WhatsApp confirmation)
- Shiprocket primary checkout + serviceability check
- `checkout_source` + `shiprocket_synced` schema fields
- New 8-section PDP with red #CC0000 BUY NOW
- Admin: COD toggle, acrylic upgrade, PICKUP_PINCODE, batch sync
- A4 ₹99 hidden loss leader (cart upsell only)

See `system_literacy.md` for full technical reference.

## Deployment

- **Platform:** Cloudflare Pages
- **Status:** ✅ Active
- **Build:** `dist/_worker.js` ~386kB (unminified)
- **CI/CD:** GitHub Actions → `.github/workflows/deploy.yml`
- **Last updated:** June 2026
