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

**Logo Editor (Settings → Site Logo Editor):**  
Upload logo image via Cloudinary or set text/emoji logo. Supports image URL, upload, or emoji+text fallback.

---

## API Service Setup & Connections

### 1. Supabase (PostgreSQL Database)
- **Signup:** https://supabase.com → New project
- **Get credentials:** Project Settings → API → `URL` and `service_role` key
- **Cloudflare Secrets to set:**
  ```
  SUPABASE_URL = https://xxxx.supabase.co
  SUPABASE_SERVICE_KEY = eyJ...
  ```
- **Run schema:** Copy `supabase/master.sql` → Supabase SQL Editor → Run

### 2. Cloudinary (Image Storage & CDN)
- **Signup:** https://cloudinary.com → Free plan (25GB)
- **Get credentials:** Dashboard → Cloud Name, API Key, API Secret
- **Create unsigned upload preset:** Settings → Upload → Add upload preset → Signing mode: Unsigned → name it `pfi_unsigned`
- **Cloudflare Secrets to set:**
  ```
  CLOUDINARY_CLOUD_NAME = your-cloud-name
  CLOUDINARY_API_KEY = 123456789
  CLOUDINARY_API_SECRET = xxxx
  CLOUDINARY_UPLOAD_PRESET = pfi_unsigned
  ```
- **Admin Settings fields:** `cloudinary_cloud_name`, `cloudinary_upload_preset` (stored in Supabase config table)

### 3. Razorpay (Payment Gateway)
- **Signup:** https://razorpay.com → Create account → Activate
- **Get credentials:** Settings → API Keys → Generate Key ID & Secret
- **Cloudflare Secrets to set:**
  ```
  RAZORPAY_KEY_ID = rzp_live_xxxx
  RAZORPAY_KEY_SECRET = xxxx
  ```
- **Test mode:** Use `rzp_test_xxxx` keys for development
- **Webhook:** Dashboard → Webhooks → Add URL `https://your-domain.pages.dev/api/payments/webhook`

### 4. Google OAuth (Login with Google)
- **Console:** https://console.cloud.google.com → New Project
- **Enable:** APIs & Services → OAuth consent screen → External → Fill details
- **Create credentials:** APIs & Services → Credentials → OAuth 2.0 Client ID → Web application
- **Authorized redirect URIs:** `https://your-domain.pages.dev/api/auth/google/callback`
- **Cloudflare Secrets to set:**
  ```
  GOOGLE_CLIENT_ID = xxxx.apps.googleusercontent.com
  GOOGLE_CLIENT_SECRET = xxxx
  ```

### 5. Shiprocket (Logistics & Shipping)
- **Signup:** https://app.shiprocket.in → Create account
- **Get credentials:** Settings → API → Generate Token
- **Cloudflare Secrets to set:**
  ```
  SHIPROCKET_EMAIL = your@email.com
  SHIPROCKET_PASSWORD = your-password
  ```
- **Pickup location:** Admin → Settings → `pickup_pincode`

### 6. OpenRouter (AI / SEO Content Generation)
- **Signup:** https://openrouter.ai → Create account
- **Get API key:** Keys → Create key
- **Cloudflare Secret to set:**
  ```
  OPENROUTER_API_KEY = sk-or-xxxx
  ```
- **Model config:** Admin → Settings → `openrouter_model` (e.g. `openai/gpt-4o-mini`)

### 7. Microsoft Clarity (Heatmaps & Session Recordings)
- **Signup:** https://clarity.microsoft.com → New project → Web
- **Get ID:** Project Settings → Copy the Clarity Project ID
- **Cloudflare Secret to set:**
  ```
  MICROSOFT_CLARITY_ID = xxxxxxxxxx
  ```

### 8. Google Analytics 4 (GA4)
- **Setup:** https://analytics.google.com → New Property → Web Stream
- **Get Measurement ID:** Admin → Data Streams → your stream → Measurement ID (G-XXXXXXXX)
- **Cloudflare Secret to set:**
  ```
  GA4_MEASUREMENT_ID = G-XXXXXXXXXX
  ```

### 9. Brevo / Resend (Transactional Email)
- **Brevo signup:** https://app.brevo.com → SMTP & API → API Keys
- **OR Resend:** https://resend.com → API Keys → Create
- **Cloudflare Secrets to set:**
  ```
  BREVO_API_KEY = xkeysib-xxxx    (if using Brevo)
  RESEND_API_KEY = re_xxxx        (if using Resend)
  ```

### Setting all Cloudflare Secrets at once
```bash
# Run these from /home/user/webapp after wrangler login
npx wrangler pages secret put SUPABASE_URL --project-name photoframepfs
npx wrangler pages secret put SUPABASE_SERVICE_KEY --project-name photoframepfs
npx wrangler pages secret put CLOUDINARY_CLOUD_NAME --project-name photoframepfs
npx wrangler pages secret put CLOUDINARY_API_KEY --project-name photoframepfs
npx wrangler pages secret put CLOUDINARY_API_SECRET --project-name photoframepfs
npx wrangler pages secret put RAZORPAY_KEY_ID --project-name photoframepfs
npx wrangler pages secret put RAZORPAY_KEY_SECRET --project-name photoframepfs
npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name photoframepfs
npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name photoframepfs
npx wrangler pages secret put SHIPROCKET_EMAIL --project-name photoframepfs
npx wrangler pages secret put SHIPROCKET_PASSWORD --project-name photoframepfs
npx wrangler pages secret put OPENROUTER_API_KEY --project-name photoframepfs
npx wrangler pages secret put MICROSOFT_CLARITY_ID --project-name photoframepfs
npx wrangler pages secret put GA4_MEASUREMENT_ID --project-name photoframepfs
npx wrangler pages secret put ADMIN_PASSWORD --project-name photoframepfs
npx wrangler pages secret put JWT_SECRET --project-name photoframepfs
```

**After setting secrets:** Redeploy `npm run deploy` — all 5 live-site 404 errors will resolve.

---

*Maintained by vijayprasadvvp@gmail.com · v2.3 · Updated 2026-05-19*
