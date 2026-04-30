# PhotoFrameIn

> Dark-luxury D2C e-commerce for premium photo frames & custom wall art — India.

**Stack:** Hono.js + Cloudflare Pages/Workers · Supabase (PostgreSQL) · Cloudinary · Razorpay · Shiprocket · Brevo/Resend

---

## Live URLs
| Environment | URL |
|-------------|-----|
| Production | https://photoframein.pages.dev _(deploy via wrangler)_ |
| Admin Panel | `/admin/dashboard` |
| Sitemap | `/sitemap.xml` |

---

## Project Structure

```
webapp/
├── src/
│   ├── index.tsx              # Hono app — routes, CSP, SEO shell
│   ├── routes/
│   │   ├── admin.ts           # Full admin CRUD API
│   │   ├── analytics.ts       # Funnel event tracking
│   │   ├── auth.ts            # Magic link + Google OAuth
│   │   ├── checkout.ts        # Pincode, shipping, order creation
│   │   ├── orders.ts          # Order tracking, damage claims
│   │   ├── products.ts        # Product listing, reviews
│   │   └── upload.ts          # Cloudinary signed upload
│   └── lib/
│       ├── supabase.ts        # DB client + config helpers
│       ├── email.ts           # Brevo → Resend fallback
│       ├── email-templates.ts # Transactional email HTML
│       ├── alerts.ts          # Owner alert emails
│       └── shipping.ts        # Shiprocket helpers
├── public/static/
│   ├── app.js                 # Customer-facing SPA (~2100 lines)
│   ├── admin.js               # Admin panel SPA (~1700 lines)
│   ├── styles.css             # Customer styles
│   └── admin.css              # Admin styles
├── supabase/
│   └── master.sql             # Single DB script — run once in Supabase SQL Editor
├── .env.example               # All required env var keys (copy → .dev.vars)
├── wrangler.jsonc             # Cloudflare config + full secrets reference
├── SYSTEM_LITERACY.md         # Full developer/AI guide
└── ecosystem.config.cjs       # PM2 config for local dev
```

---

## Quick Start

### 1. Install
```bash
npm install
```

### 2. Configure secrets
```bash
cp .env.example .dev.vars
# Fill in: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY,
#          RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET,
#          ADMIN_TOKEN, ADMIN_PASSWORD,
#          CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
```

### 3. Set up database
```
Open Supabase Dashboard → SQL Editor → paste supabase/master.sql → Run
```

### 4. Run locally
```bash
npm run build
pm2 start ecosystem.config.cjs
# → http://localhost:3000
```

---

## Deploy to Cloudflare Pages

```bash
# Set all secrets first (see wrangler.jsonc for full list)
wrangler pages secret put SUPABASE_URL --project-name photoframein
# ... repeat for all secrets

# Deploy
npm run deploy
```

---

## Key Features

| Feature | Implementation |
|---------|---------------|
| 🛒 Cart & Checkout | Razorpay prepaid + COD (WhatsApp confirmation) |
| 📦 Shipping | Shiprocket integration — AWB, label, pickup |
| 🖼️ Custom Frames | Cloudinary direct upload from browser |
| 📊 Admin Panel | Full CRUD — products, orders, combos, analytics |
| 📈 Ad Tracking | `ad_performance` table — spend, CAC, ROAS by category |
| 🔒 Security | JWT admin auth, RLS on all tables, XSS-safe escaping |
| 📧 Email | Brevo (300/day) → Resend fallback, order + lead flows |
| 📱 SEO | Dynamic meta, sitemap.xml, JSON-LD schemas |

---

## Environment Variables

See `.env.example` for the full list with descriptions.  
See `wrangler.jsonc` comments for the Cloudflare secrets reference.

> **Never commit `.dev.vars`** — it is gitignored.

---

## Database

`supabase/master.sql` is the **single source of truth**.  
It is idempotent — safe to re-run. Contains:
- 29 tables (products, orders, reviews, combos, leads, ad_performance, …)
- All indexes, RLS policies, RPC functions
- Seed data (categories, combos, FAQ, default pages)

---

## Admin Panel

Access: `/admin/dashboard`  
Login: `ADMIN_PASSWORD` env var (set as Cloudflare secret)

Sections: Dashboard · Products · Categories · Orders · Media · Logistics · Customers · Leads · Analytics · Coupons · Reviews · Content · Combos & Bundles · Ad Performance · Settings

---

*Maintained by vijayprasadvvp@gmail.com · v2.2 · Updated 2026-04-30*
