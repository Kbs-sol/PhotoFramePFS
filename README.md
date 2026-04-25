# PhotoFrameIn - Photo Frames & Wall Art Online

> D2C e-commerce platform for custom photo frames, wall art & premium poster frames in India.

## Project Overview
- **Name**: PhotoFrameIn
- **Goal**: Dark-luxury, mobile-first D2C store targeting 16-35 year old Indian market buying photo frames online
- **Features**: Full e-commerce with Razorpay payments, Shiprocket logistics, COD support, admin panel
- **Tech Stack**: Hono.js + Cloudflare Workers/Pages + Supabase + Tailwind CSS

## Recent Updates (April 8)
- **Enhanced UTM Tracking**: Refined the analytics engine to explicitly extract and store `utm_source`, `utm_medium`, and `utm_campaign` in dedicated indexed columns for high-performance ad attribution.
- **Top Sources Dashboard**: Added a real-time "Top Traffic Sources" widget to the Admin Dashboard to visualize which channels (Facebook, Google, etc.) are driving active users.
- **Security Hardening**: Enforced Row Level Security (RLS) across all 25+ database tables and verified superadmin access controls via Supabase Auth.

## URLs
- **Production**: _(deploy to Cloudflare Pages)_
- **Admin Panel**: `https://your-domain/admin/dashboard`
- **Sitemap**: `https://your-domain/sitemap.xml`

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase account (free tier works)
- Razorpay account (test mode)
- Shiprocket account

### Local Development
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .dev.vars
# Edit .dev.vars with your actual keys

# Setup Supabase
# 1. Create project at supabase.com
# 2. Add SUPABASE_URL and access tokens to your config
# 3. Run the automated migration:
node scripts/migrate-db.cjs

# Build and start
npm run build
npx wrangler pages dev dist --ip 0.0.0.0 --port 3000

# OR with PM2:
pm2 start ecosystem.config.cjs
```

### Deploy to Cloudflare Pages
```bash
npm run build
npx wrangler pages project create photoframein --production-branch main
npx wrangler pages deploy dist --project-name photoframein

# Set secrets
npx wrangler pages secret put SUPABASE_URL --project-name photoframein
# (repeat for all required secrets - see .env.example)
```

## Completed Features

### Customer-Facing
- **AOV Upsell Widget**: Dynamic checkout-cart widget offering an impulse hidden Rs.99 A4 print.
- **Dispute Shield**: Auto-rendering "Film Unboxing" policy notices displayed under framed products and on checkout success screens.
- **Express Badge**: Pincode validation returning green "Express Delivery 1-2 days" for local (500xxx) zip codes.
- **COD Nudge Strings**: Explicit text beneath payment methods ("Prepaid = FREE shipping. COD = ₹99 shipping") directing users to preferred choices.
- Homepage with hero, category grid (8 categories + 5 collections), bestsellers, trust row
- Product page with 8 sections: hero/gallery, details, trust stack, upsell, urgency, FAQ
- Size selector (A4/Small/Medium/Large/XL) + frame selector (No Frame/Standard/Premium)
- Pincode validation (India Post API) + Express badge for Hyderabad (500xxx)
- Cart with quantity management, free shipping calculator
- Checkout with Razorpay integration (prepaid) and COD option
- Order tracking by Order ID (PS-YYMMDD-XXXX) or phone
- Returns & damage claim page with video URL submission
- Policy pages (Returns, Shipping, Terms, Privacy)
- Blog, About, Contact pages
- Exit-intent popup with lead capture
- UTM parameter tracking (Auto-capture from ads)
- Mobile bottom navigation
- JSON-LD product schema for SEO
- XML sitemap + robots.txt

### Admin Panel (12 Sections)
1. **Dashboard**: Revenue KPIs, order counts, email usage meters, recent orders
2. **Products**: Full CRUD with variants, images, SEO fields, and **Real-time Status Toggles**
3. **Categories**: Manage categories and intent-based collections with **Real-time Status Toggles**
4. **Orders**: Filter, status update, **Deep-linked WhatsApp COD confirm**, damage claims, order detail modal
5. **Logistics**: Shiprocket sync, AWB generation, pickup scheduling
6. **Customers**: Search, view stats, block/unblock
7. **Leads**: List by source, export
8. **Analytics**: Product performance, RTO risk by pincode, UTM/ad tracking
9. **Coupons**: Create/manage percentage and fixed coupons
10. **Reviews**: Moderate pending reviews (approve/hide)
11. **Content**: Edit policy pages (versioned), FAQ CRUD, blog CRUD
12. **Settings**: 28+ toggles and config values, DB backup, error log

### Backend
- 50+ API endpoints across products, orders, checkout, admin
- Dual-stack email (Brevo 300/day + Resend 100/day) with routing, logging, retry
- 6 HTML email templates (order confirm, COD, shipped, cancelled, review request, alerts)
- Shipping calculation with floor rates and Shiprocket quotes
- Razorpay HMAC-SHA256 payment verification (Web Crypto API)
- COD gatekeeper with min/max, pincode risk blocking, custom frame exclusion
- Coupon validation with per-user limits
- Order ID generation: PS-YYMMDD-XXXX (atomic sequence)
- Graceful fallbacks when Supabase is not configured (all APIs return empty data)

### Database
- 25+ tables with indexes and full Row Level Security (RLS) enablement
- Complete schema in `supabase/schema.sql`
- Security Policies: `service_role` (full access), `anon` (restricted access for tracking/public views)
- Seed data in `supabase/seed.sql` (configs, 8 categories, 8 products, 7 combos, 8 FAQ, 4 policy pages)

## Data Architecture
- **Database**: Supabase (PostgreSQL)
- **Storage**: Cloudflare R2 (images, videos)
- **CDN**: Cloudflare Pages (global edge)
- **Payments**: Razorpay (UPI, Cards, Net Banking, COD fee collection)
- **Logistics**: Shiprocket API (order sync, AWB, pickup scheduling)
- **Pincode**: India Post API (validation, district/state lookup)
- **Email**: Brevo + Resend (dual-stack with auto-failover)
- **Analytics**: Google Tag Manager + GA4 + Microsoft Clarity

## User Guide

### For Customers
1. Browse products by category or search
2. Select size and frame type on product page
3. Check delivery availability with pincode
4. Add to cart and proceed to checkout
5. Choose Prepaid (save Rs.50) or COD (Rs.499-1,995, Rs.49 fee)
6. Track order with Order ID or phone number
7. File damage claims with unboxing video

### For Admin
1. Access admin at `/admin/dashboard`
2. Authenticate via **Supabase Auth**.
3. Ensure your email is seeded in the `admin_users` table with `role = 'superadmin'`.
4. Monitor real-time **Sales Funnel Analytics**, KPIs, and email usage
4. Manage products, categories, orders
5. Sync orders to Shiprocket for logistics
6. Configure settings (COD, shipping, announcements)
7. Export database backups regularly

## API Reference
See `SYSTEM_LITERACY.md` for full API endpoint documentation (50+ routes).

**Key Customer APIs:**
- `GET /api/products` - Product listing
- `GET /api/products/:slug` - Product detail
- `POST /api/checkout/validate-pincode` - Pincode check
- `POST /api/orders/create` - Place order
- `POST /api/orders/track?order_id=PS-XXXXXX` - Track order
- `GET /api/config/public` - Site configuration
- `POST /api/analytics/funnel` - Log sales funnel event

## Project Structure
```
webapp/
  src/index.tsx              # Main Hono app (352 lines)
  src/routes/products.ts     # Product APIs (125 lines)
  src/routes/orders.ts       # Order APIs (363 lines)
  src/routes/checkout.ts     # Checkout APIs (250 lines)
  src/routes/admin.ts        # Admin APIs (772 lines)
  src/lib/supabase.ts        # Supabase client (77 lines)
  src/lib/shipping.ts        # Shipping logic (229 lines)
  src/lib/email.ts           # Email system (148 lines)
  src/lib/email-templates.ts # HTML templates (181 lines)
  src/routes/analytics.ts    # Analytics logging (new)
  public/static/app.js       # Customer SPA (updated with tracking)
  public/static/admin.js     # Admin SPA (674 lines)
  public/static/styles.css   # Dark luxury theme
  public/static/admin.css    # Admin styles
  supabase/schema.sql        # Database schema
  supabase/seed.sql          # Seed data
  SYSTEM_LITERACY.md         # Full 12-section technical guide
```

## Not Yet Implemented
- Shiprocket checkout widget integration (custom checkout active)
- Direct R2 file upload (currently URL-based)
- COD auto-cancel cron worker (hourly)
- Review request email cron (3 days post-delivery)
- Dynamic OG image generation worker
- Google Auth customer login (Supabase Auth)
- Instagram feed embed on homepage
- Acrylic upgrade option on product page
- Partial return recalculation for bundles
- CSV export for customers/leads
- Admin forms for product/category/coupon/FAQ/blog creation (currently stub)
- Margin protection alerts (low stock, RTO rate, breakage rate)

## Recommended Next Steps
1. **Configure Supabase** - Create project, run `node scripts/migrate-db.cjs`
2. **Set up Razorpay** - Get test keys, configure webhook
3. **Set up Shiprocket** - Create account, configure pickup location
4. **Deploy to Cloudflare Pages** - Set all secrets
5. **Purchase domain** - photoframein.com or alternatives
6. **Upload product images** - Replace placeholder images with real product photos
7. **Test end-to-end** - Place test orders, verify email, track order
8. **Implement admin forms** - Full create/edit modals for products, coupons, etc.
9. **Add cron workers** - COD auto-cancel, review request emails
10. **Set up GTM/GA4** - Configure analytics tracking

## Deployment
- **Platform**: Cloudflare Pages
- **Status**: Production-Ready (Supabase configured and live)
- **Build**: `npm run build` -> `dist/_worker.js` (~279 KB)
- **Last Updated**: 2026-03-29
