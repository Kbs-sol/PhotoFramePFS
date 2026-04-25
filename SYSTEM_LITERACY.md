# SYSTEM_LITERACY.md - PhotoFrameIn Complete Technical Guide

> **Last Updated**: 2026-03-29
> **Version**: 1.1
> **Author**: System Builder
> **Status**: Production-Ready (Supabase configured and live)

## Recent System Updates (April 8)
1. **Security & RLS Enforcement**: Enabled Row Level Security (RLS) on all 25+ database tables. Implemented Role-Based Access Control (RBAC) ensuring only authorized admins with the `superadmin` role can access management endpoints.
2. **Sales Funnel Analytics**: Introduced a custom backend analytics engine (`/api/analytics/funnel`) that tracks real-time customer intent. Refined as of April 8 to explicitly store `utm_source`, `utm_medium`, and `utm_campaign` for ad attribution.
3. **Admin Dashboard KPIs**: Enhanced the primary dashboard with a live conversion funnel and a **Top Traffic Sources** widget to monitor marketing effectiveness in real-time.
4. **Auth Migration**: Finalized the transition of the admin panel to **Supabase Auth**, improving credential security and session management.

---

## Table of Contents

1. [Business Model & Product Catalog](#1-business-model--product-catalog)
2. [Technical Architecture](#2-technical-architecture)
3. [Order Lifecycle & ID Format](#3-order-lifecycle--id-format)
4. [Pricing, Margins & Loss-Leader Rules](#4-pricing-margins--loss-leader-rules)
5. [COD Gatekeeper Policy](#5-cod-gatekeeper-policy)
6. [Checkout Flow (Shiprocket + Custom Fallback)](#6-checkout-flow-shiprocket--custom-fallback)
7. [Shipping & Serviceability Logic](#7-shipping--serviceability-logic)
8. [Returns, Damage Claims & Refunds](#8-returns-damage-claims--refunds)
9. [Email Routing System](#9-email-routing-system)
10. [Admin Panel Sections](#10-admin-panel-sections)
11. [Database Schema & Supabase Config](#11-database-schema--supabase-config)
12. [Environment Variables & Deployment](#12-environment-variables--deployment)

---

## 1. Business Model & Product Catalog

### Overview
PhotoFrameIn is a **D2C e-commerce store** selling custom photo frames, poster frames, and beautiful wall art to the Indian market (target: 16-35 year olds). The site operates on a **dark-luxury, mobile-first** design allowing users to buy photo frames online natively.

### Product Categories (5 primary + collections)
| Category | Slug | Hover Color | Description |
|---|---|---|---|
| Divine | `divine` | #7C3AED (purple) | Sacred art, deity art, spiritual decor |
| Automotive | `automotive` | #E8670A (saffron) | Supercars, JDM, racing |
| Motivation | `motivation` | #FFD700 (gold) | Quotes, hustle, workspace art |
| Sports | `sports` | #22C55E (green) | Cricket, football, iconic moments |
| Custom Frames | `custom-frames` | #CC0000 (red) | Upload-your-photo framing service |

### Intent-Based Collections
- Gifts Under Rs.999
- Bedroom Aesthetic
- Study/Work Setup
- Couple/Romantic
- Festival Collection (toggleable via `festival_mode` config)

### Size & Frame Matrix
Each product has up to **13 variants** (size x frame_type combinations):

| Size | Dimensions (cm) | Box (LxBxH cm) | Vol. Weight (kg) |
|---|---|---|---|
| A4 | 21 x 29.7 | 35 x 25 x 0.5 | 0.10 |
| Small | 27 x 20.3 | 38 x 30 x 5 | 1.14 |
| Medium | 40.6 x 30.5 | 50 x 38 x 7 | 2.66 |
| Large | 50.8 x 40.6 | 55 x 42 x 8 | 3.70 |
| XL | 61 x 45.7 | 80 x 55 x 10 | 8.80 |

**Frame Types**: No Frame, Standard (wooden + glass), Premium (gallery-grade)

### Combo Bundles
| Bundle | Contents | Original | Combo Price |
|---|---|---|---|
| Starter Desk | 3x A4, No Frame | Rs.297 | Rs.249 |
| Bedroom Aesthetic | 5x Small, Standard | Rs.2,245 | Rs.599 |
| Full Wall Pack | 10x Medium, No Frame | Rs.2,990 | Rs.999 |
| Premium Gift | 1x Medium, Premium + Gift Wrap | Rs.1,499 | Rs.1,199 |
| Midnight Drive | 5x Small, Standard (Auto) | Rs.2,245 | Rs.699 |
| Divine Energy | 5x Small, Standard (Divine) | Rs.2,245 | Rs.799 |
| Focus Mode | 5x Small, Standard (Motivation) | Rs.2,245 | Rs.599 |

---

## 2. Technical Architecture

### Stack
```
Frontend:  Hono.js (SPA shell) + Vanilla JS (app.js) + Tailwind CSS (CDN)
Backend:   Hono.js on Cloudflare Workers/Pages
Database:  Supabase (PostgreSQL + Auth + RLS)
Storage:   Cloudflare R2 (image/video uploads)
Payment:   Razorpay (UPI, Cards, Net Banking)
Shipping:  Shiprocket API + India Post API (pincode validation)
Email:     Brevo (300/day) + Resend (100/day) dual-stack
Analytics: Google Tag Manager + GA4 + Microsoft Clarity
```

### File Structure
```
webapp/
  src/
    index.tsx          - Main Hono app, all routes, SPA shells
    routes/
      products.ts      - Product listing, detail, bestsellers
      orders.ts        - Order creation, cancellation, tracking, damage claims
      checkout.ts      - Pincode validation, shipping estimate, Razorpay, coupons, COD check
      analytics.ts     - Funnel event logging engine (new)
      admin.ts         - Full admin CRUD (12 sections, 50+ endpoints, revised stats)
    lib/
      supabase.ts      - Supabase client, config helpers, order ID generation, error logging
      shipping.ts      - Size dimensions, shipping floors, Shiprocket API, India Post API
      email.ts         - Dual-stack email (Brevo + Resend), routing, logging, failures
      email-templates.ts - HTML email templates (6 types)
  public/
    static/
      app.js           - Customer SPA (918 lines)
      admin.js         - Admin SPA (674 lines)
      styles.css       - Dark luxury theme CSS
      admin.css        - Admin panel CSS
    _routes.json       - Cloudflare Pages routing
  supabase/
    schema.sql         - Complete database schema (23 tables, RLS policies, indexes)
    seed.sql           - Default config, sample products, categories, combos, FAQ
  ecosystem.config.cjs - PM2 process manager config
  wrangler.jsonc       - Cloudflare Workers config
  .env.example         - Environment variables template
```

### Design System
| Token | Value | Usage |
|---|---|---|
| Background | #0D0D0D | Page background |
| Card | #1A1A1A | Card/panel backgrounds |
| Gold | #FFD700 | Headings, prices, primary accent |
| Red | #CC0000 | BUY NOW buttons, urgency |
| Saffron | #E8670A | Add to Cart, secondary CTA |
| Green | #22C55E | Success, badges, shipping |
| Purple | #7C3AED | Divine category, premium badge |

---

## 3. Order Lifecycle & ID Format

### Order ID Format
```
PS-YYMMDD-XXXX
```
- `PS` = PhotoStore prefix
- `YYMMDD` = Date (e.g., 260328 for 2026-03-28)
- `XXXX` = Daily sequence, zero-padded (0001, 0002, ...)

Generated atomically via `increment_order_sequence` RPC in Supabase with fallback to manual increment.

### Order Status Flow
```
                      Prepaid Payment Success
                            |
                     [pending] -----> [printing] -----> [packed]
                            |                              |
                            |                    [pickup_scheduled]
                            |                              |
                            |                        [shipped]
                            |                              |
                            |                       [delivered]
                            |                         /        \
                            |               [damage_replaced]   (completed)
                            |
                     [cod_pending] --- (24h no confirm) --> [cancelled]
                            |
                     (WhatsApp confirm)
                            |
                     [pending] -----> (same as above)
```

### Shiprocket Integration
- **Shiprocket Order IDs** are separate from internal PS-XXXXXX IDs
- Orders sync to Shiprocket via admin button ("Sync Pending") or per-order
- Fields: `shiprocket_synced`, `shiprocket_order_id`, `awb_number`, `carrier`

---

## 4. Pricing, Margins & Loss-Leader Rules

### Pricing Table (Default Variants)
| Size | No Frame | Standard | Premium |
|---|---|---|---|
| A4 | Rs.99 | - | - |
| Small | Rs.199 | Rs.449 | Rs.599 |
| Medium | Rs.299 | Rs.749 | Rs.999 |
| Large | Rs.399 | Rs.1,099 | Rs.1,399 |
| XL | Rs.499 | Rs.1,699 | Rs.2,199 |

### Margin Rules
- **Minimum markup**: 3x cost (e.g., Rs.250 cost -> Rs.749+ sell price)
- **No sale if margin < 2.5x** (protected in admin settings)
- All prices include `compare_at_price` for crossed-out display

### A4 Loss Leader (Rs.99) & Cart Upsell
- Cost ~Rs.30, sold at Rs.99 = low margin but customer acquisition
- **Rules**: Hidden from main listings; available via direct product page
- **Upsell Widget**: Dynamically injected into the Cart (`/api/products/upsell`) for any order containing other items to automatically drive impulse add-ons before checkout.
- **Product Visibility**: Items marked with `is_hidden = true` (like the A4 Mini Print upsell) are excluded from the main shop grid and category pages but remain accessible via the cart upsell or direct link.
- A4 OOS threshold: Auto-disable if A4 orders exceed 10% of daily volume
- Config key: `a4_oos_threshold`

---

## 5. COD Gatekeeper Policy

### Rules
| Rule | Value | Config Key |
|---|---|---|
| COD Minimum | Rs.499 | `cod_min_value` |
| COD Maximum | Rs.1,995 | `cod_max_value` |
| COD Fee | Rs.49 (non-refundable) | `cod_fee` |
| Volume Cap | 40% of daily orders | (tracked via analytics) |
| Custom Frames | Prepaid ONLY | `is_custom_frame` on product |
| Confirmation | WhatsApp within 24 hours | `whatsapp_number` |
| Auto-Cancel | Hourly cron for unconfirmed COD > 24h | Scheduled worker |

### COD Flow
1. Customer selects COD at checkout (Behavioral Nudge: "Prepaid = FREE shipping. COD = ₹99 shipping" encourages prepaid conversion).
2. System validates: min/max amount, not custom frame, pincode not blocked
3. Order created with status `cod_pending`
4. Email sent with WhatsApp confirmation CTA
5. Admin clicks **Confirm** in dashboard: auto-opens a deep-linked `wa.me/` window with the customer's exact order details pre-filled, while simultaneously shifting DB status to `pending`.
6. If no confirmation in 24h -> auto-cancelled by cron

### Pincode Risk System
- Table: `pincode_risk` (prefix-based, e.g., "500" for Hyderabad)
- Tracks: `total_orders`, `rto_count`, `cod_blocked`
- If `cod_blocked = true`, COD is denied for that prefix
- Admin can block/unblock from Analytics > RTO Risk tab

---

## 6. Checkout Flow (Shiprocket + Custom Fallback)

### Primary: Shiprocket Checkout Widget
- Config: `checkout_mode = 'shiprocket'`
- Embeds Shiprocket's checkout widget for address + payment
- Handles all logistics automatically

### Fallback: Custom Hono Checkout
- Used when: Shiprocket fails, prepaid-only items, custom frames
- Config: `checkout_mode = 'custom'`
- Flow: Customer form -> Razorpay payment -> Order creation -> Email
- Route: `POST /api/orders/create`

### Razorpay Integration
- **Create Order**: `POST /api/checkout/create-razorpay-order`
  - Converts to paise (amount * 100)
  - Returns `orderId`, `amount`, `currency`, `key`
- **Verify Payment**: `POST /api/checkout/verify-payment`
  - HMAC-SHA256 verification using Web Crypto API
  - Compares `razorpay_order_id|razorpay_payment_id` signature

### Sync Pending Orders
Admin button: "Sync Pending Orders" -> creates Shiprocket orders for all `shiprocket_synced = false` orders (excludes cancelled and cod_pending).

---

## 7. Shipping & Serviceability Logic

### Serviceability Check Flow
```
1. Client: Pincode regex validation (/^[1-9][0-9]{5}$/)
2. Server: India Post API (https://api.postalpincode.in/pincode/{pin})
   -> Returns district, state, validity
3. Server: Shiprocket Serviceability API (only on COD selection)
   -> Returns courier, charge, COD availability, ETD
4. Express badge: if pincode starts with "500" (Hyderabad)
```

### Shipping Charge Calculation
```
Rule: charge >= max(Shiprocket quoted amount, floor rate)
```

**Floor Rate Table**:
| Condition | Floor Rate |
|---|---|
| Prepaid, cart >= Rs.799 | Rs.0 (FREE) |
| Prepaid, cart < Rs.799 | Rs.79 |
| A4 only (any method) | Rs.79 |
| COD, Small/Medium | Rs.99 |
| COD, Large/XL | Rs.149 |

**Display**: Single combined shipping line (no breakdown of components).

### Express Delivery
- Hyderabad pincodes (500xxx): "Express Delivery in Hyderabad · 1-2 days"
- Rest of India: "3-5 business days"
- Express badge shown on product page and checkout

---

## 8. Returns, Damage Claims & Refunds

### Damage Claim Flow
1. Customer visits `/returns` page
2. Submits: Order ID, email, reason, description, **video URL** (mandatory)
3. System validates order exists and is `delivered`
4. Creates `damage_claims` record with `status: 'pending'`
5. Owner receives email alert with video link and Approve/Decline buttons
6. **Approve**: Creates replacement order (Rs.0, `is_replacement = true`), emails customer
7. **Decline**: Sends reason email, links to Returns Policy

### Video Upload
- Videos uploaded to Cloudflare R2 bucket (`photoframein-uploads`)
- Currently accepts URL-based submissions (Google Drive, YouTube)
- Future: Direct R2 upload from frontend

### Cancellation Rules
| Condition | Allowed? |
|---|---|
| Within 24h, status = pending/cod_pending/printing | Yes |
| After 24h | No |
| Custom frame orders | Never |
| After dispatch (shipped/delivered) | No (damage claim instead) |

### Refund Logic
- **Prepaid, not dispatched**: Razorpay refund = total - 2% gateway fee
- **COD, not dispatched**: No charge collected, order cancelled
- **Damaged with video**: Free replacement, no refund needed
- Refund timeline: 5-7 business days to original payment method

---

## 9. Email Routing System

### Dual-Stack Architecture
```
Primary:   Brevo (Sendinblue) - 300 emails/day free tier
Fallback:  Resend - 100 emails/day free tier
Total:     400 emails/day capacity
```

### Routing Logic
```
1. Check Brevo daily count (< 270 = safe buffer)
2. If Brevo available -> send via Brevo
3. If Brevo fails or limit reached -> fallback to Resend
4. If both fail -> log to email_failures table for retry
5. Review requests deferred during peak hours (7-10 PM IST)
6. Owner alerts always via Resend (separate from customer emails)
```

### Email Types
| Type | Trigger | Template |
|---|---|---|
| `order_confirmation` | Payment success | Items, total, address, track CTA |
| `cod_confirmation` | COD order placed | 24h warning, WhatsApp CTA |
| `shipped` | Status -> shipped | AWB, carrier, track CTA |
| `cancellation` | Order cancelled | Refund amount, timeline |
| `review_request` | 3 days after delivery | Rs.100 off incentive |
| `owner_alert` | New order, damage claim | Order summary, action buttons |
| `critical_alert` | System errors | Sent to OWNER_EMAIL + ALERT_EMAIL |
| `replacement_approved` | Damage claim approved | Replacement order ID |
| `claim_declined` | Damage claim declined | Reason, policy link |

### Email Logging
- Every email logged to `email_log` table (recipient, type, service, status)
- Failed emails logged to `email_failures` with `retry_count`
- Admin dashboard shows Brevo/Resend usage meters (progress bars)

---

## 10. Admin Panel Sections

The admin panel is a single-page application at `/admin/dashboard` with 12 sections:

### 10.1 Dashboard
- KPIs: Revenue today/month, orders today, leads count
- Status cards: Pending, COD Pending, Packed, Unsynced
- Email usage meters (Brevo 300/day, Resend 100/day)
- Error/failure alerts
- Recent 5 orders table
- **Logistics Status**: Summary of ready-for-dispatch packages

### 10.2 Admin Security (Supabase Auth)
- The admin dashboard is protected via **Supabase Auth**.
- Access is restricted to emails present in the `admin_users` table with a valid `role` (e.g., `superadmin`).
- Role Level Security (RLS) is active on every table to prevent unauthorized data access via the `anon` key.
- Primary Admin Email should be initialized via `seed_admin.sql` or direct SQL update.

### 10.3 Products CRUD
- List all products with category, variants count, orders, revenue, status
- Real-time active/inactive status toggle switch
- Create/Edit product (name, slug, description, SEO, tags, category)
- Manage variants (size, frame_type, price, compare_at_price, SKU, stock)
- Manage images (URL, alt text, display order)
- Frequently Bought Together and You May Also Like links

### 10.3 Categories
- List all categories and intent-based collections
- CRUD with: name, slug, description, image, hover_color, display_order
- Real-time active/inactive toggle switch

### 10.4 Orders Management
- Filterable by status and payment method
- Inline status dropdown (instant update)
- Order detail modal: customer info, items, address, AWB, admin notes
- COD confirm button (Deep-links to WhatsApp Confirmation message AND auto-updates status)
- Damage claims viewer with video link and approve/decline

### 10.5 Logistics
- "Sync Pending Orders" button (batch Shiprocket sync) – Finds all packed/paid orders not yet in Shiprocket.
- Ready-for-dispatch table with individual controls:
  - **Create Shiprocket Order**: Manual sync for a specific order.
  - **Generate AWB**: 1-click AWB generation once order is synced.
  - **Schedule Pickup**: 1-click pickup scheduling once AWB is generated.

### 10.6 Customers
- Searchable customer list with name, email, phone
- Total orders, total spend, status (Active/Blocked/COD Blocked)
- CSV export

### 10.7 Leads
- All captured leads (exit intent, newsletter, notify OOS, WhatsApp CTA)
- Filter by source
- CSV export

### 10.8 Analytics (3 tabs)
- **Products**: Views, orders, revenue, rating per product
- **RTO Risk**: Pincode prefixes, RTO rate, COD block status
- **Ad Performance**: Revenue by UTM source (utm_source, utm_medium, utm_campaign)

### 10.9 Coupons
- List with code, type (% or fixed), value, min order, usage count, status
- Create/Toggle active/paused

### 10.10 Reviews
- Pending tab: Approve or Hide reviews
- Approved tab: All published reviews
- Shows product name, rating, customer name, date

### 10.11 Content (3 tabs)
- **Policy Pages**: Returns, Terms, Shipping, Privacy (versioned editing)
- **FAQ**: CRUD with display order
- **Blog**: Create/edit posts with publish toggle

### 10.12 Settings
All toggles and config values:
- Checkout mode (shiprocket/custom)
- COD enabled, min/max/fee
- Free shipping threshold
- Prepaid discount
- Pickup pincode
- Acrylic/Combos/Exit Intent toggles
- WhatsApp number
- Announcement bar (text, link, color, active)
- Urgency messaging
- Festival mode
- GTM Container ID
- SEO title/description
- Social links, contact info
- **Database backup** (exports all tables as JSON)
- **Error log viewer** (last 100 errors)

---

## 11. Database Schema & Supabase Config

### Tables (25 total)
| Table | Purpose | Key Fields |
|---|---|---|
| `system_config` | Key-value settings | key, value, description |
| `categories` | Product categories | slug, hover_color, is_intent_collection |
| `products` | Product catalog | slug, category_id, seo_*, total_orders/views/revenue, is_hidden |
| `product_images` | Gallery images | image_url, alt_text, display_order |
| `product_variants` | Size/frame combos | size, frame_type, price, sku, stock_count |
| `admin_users` | Authorized admins | email, created_at |
| `customers` | Registered customers | email, phone, total_orders, cod_blocked |
| `customer_addresses` | Saved addresses | customer_id, label, pincode |
| `wishlists` | Customer wishlists | customer_id, product_id |
| `order_sequence` | Daily order counter | date_key, last_sequence |
| `orders` | All orders | order_id (PS-*), items JSON, status, payment_method |
| `damage_claims` | Damage/return claims | order_id, video_url, status, replacement_order_id |
| `email_log` | All sent emails | recipient, type, service, status |
| `email_failures` | Failed email queue | retry_count, resolved |
| `leads` | Captured leads | email/phone, source |
| `coupons` | Discount codes | code, type, value, min_subtotal, usage_count |
| `coupon_usage` | Per-user tracking | coupon_id, customer_id |
| `reviews` | Product reviews | rating, is_approved, is_featured |
| `blog_posts` | Blog articles | slug, content, is_published |
| `pages` | Static pages | slug (returns, terms, shipping, privacy) |
| `page_versions` | Page edit history | page_id, content, version |
| `faq` | FAQ entries | question, answer, display_order |
| `analytics_events` | Legacy event tracking | event_type, product_id, utm_* |
| `sales_funnel_events` | New funnel tracking | event_type, product_id, utm_source, utm_medium, utm_campaign, metadata |
| `activity_logs` | Admin action audit | admin_id, action, metadata |
| `error_log` | Error tracking | endpoint, error_message, ref_id |
| `combos` | Bundle offers | items JSON, original_price, combo_price |
| `pincode_risk` | RTO tracking | pincode_prefix, rto_count, cod_blocked |

### Row Level Security (RLS)
- **Status**: Enabled on ALL tables as of April 7.
- Customers: Can only see own profile, addresses, orders, wishlist.
- Products/Categories/Reviews/Blog/Pages/FAQ/Combos: Public read via `anon` key.
- Analytics: `anon` key is permitted for `INSERT` on `sales_funnel_events` to allow frontend tracking.
- Admin operations use `SUPABASE_SERVICE_KEY` (bypassing RLS) for full management control.

### Required Supabase RPC Function
```sql
CREATE OR REPLACE FUNCTION increment_order_sequence(p_date_key TEXT)
RETURNS INTEGER AS $$
DECLARE
  new_seq INTEGER;
BEGIN
  INSERT INTO order_sequence (date_key, last_sequence)
  VALUES (p_date_key, 1)
  ON CONFLICT (date_key) DO UPDATE SET last_sequence = order_sequence.last_sequence + 1
  RETURNING last_sequence INTO new_seq;
  RETURN new_seq;
END;
$$ LANGUAGE plpgsql;
```

### Required Supabase RPC Function (Customer Stats)
```sql
CREATE OR REPLACE FUNCTION increment_customer_stats(p_customer_id UUID, p_order_total INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE customers SET
    total_orders = total_orders + 1,
    total_spend = total_spend + p_order_total,
    updated_at = NOW()
  WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 12. Environment Variables & Deployment

### Environment Variables (Full List)
```env
# Supabase (REQUIRED)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Razorpay (REQUIRED for payments)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxx

# Shiprocket (REQUIRED for logistics)
SHIPROCKET_EMAIL=your@email.com
SHIPROCKET_PASSWORD=your-password

# Email - Brevo (REQUIRED)
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxx

# Email - Resend (REQUIRED)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx

# Owner (REQUIRED)
OWNER_EMAIL=you@example.com
ALERT_EMAIL=backup@example.com

# Cloudflare R2 (for uploads)
R2_ACCOUNT_ID=
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_BUCKET_NAME=photoframein-uploads

# Admin Panel
ADMIN_PASSWORD=change-this-to-a-secure-password

# Google OAuth (via Supabase)
GOOGLE_CLIENT_ID=your-google-client-id

# WhatsApp
WHATSAPP_NUMBER=91XXXXXXXXXX

# Analytics
GTM_CONTAINER_ID=GTM-XXXXXXX
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
MICROSOFT_CLARITY_ID=xxxxxxxxxx

# Store Config (overridden by system_config table)
CHECKOUT_MODE=shiprocket
COD_ENABLED=true
COD_MAX_VALUE=1995
COD_MIN_VALUE=499
COD_FEE=49
FREE_SHIPPING_THRESHOLD=799
PICKUP_PINCODE=501504
ACRYLIC_ENABLED=true
COMBOS_ENABLED=true
A4_OOS_THRESHOLD=10
```

### Deployment Steps

#### 1. Supabase Setup
```bash
# Create Supabase project at supabase.com
# Run schema.sql in SQL Editor
# Run seed.sql for defaults
# Create RPC functions (see Section 11)
# Note: SUPABASE_URL and keys from project settings
```

#### 2. Cloudflare Pages Deployment
```bash
npm run build
npx wrangler pages project create photoframein --production-branch main
npx wrangler pages deploy dist --project-name photoframein
```

#### 3. Set Secrets
```bash
npx wrangler pages secret put SUPABASE_URL --project-name photoframein
npx wrangler pages secret put SUPABASE_ANON_KEY --project-name photoframein
npx wrangler pages secret put SUPABASE_SERVICE_KEY --project-name photoframein
npx wrangler pages secret put RAZORPAY_KEY_ID --project-name photoframein
npx wrangler pages secret put RAZORPAY_KEY_SECRET --project-name photoframein
npx wrangler pages secret put SHIPROCKET_EMAIL --project-name photoframein
npx wrangler pages secret put SHIPROCKET_PASSWORD --project-name photoframein
npx wrangler pages secret put BREVO_API_KEY --project-name photoframein
npx wrangler pages secret put RESEND_API_KEY --project-name photoframein
npx wrangler pages secret put OWNER_EMAIL --project-name photoframein
npx wrangler pages secret put ADMIN_PASSWORD --project-name photoframein
npx wrangler pages secret put WHATSAPP_NUMBER --project-name photoframein
```

#### 4. Domain Setup (when purchased)
```bash
npx wrangler pages domain add photoframein.com --project-name photoframein
# Or via Cloudflare Dashboard > Pages > Custom Domains
```

### Local Development
```bash
# Copy .env.example to .dev.vars
cp .env.example .dev.vars
# Edit .dev.vars with your actual keys

# Build
npm run build

# Start local server
npx wrangler pages dev dist --ip 0.0.0.0 --port 3000
# OR via PM2:
pm2 start ecosystem.config.cjs
```

### API Endpoint Reference (Quick)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/products` | List products (with ?category, ?search, ?sort) |
| GET | `/api/products/bestsellers` | Top 6 by revenue |
| GET | `/api/products/:slug` | Full product detail + reviews + FBT + YMAL |
| GET | `/api/categories` | Categories + collections |
| GET | `/api/combos` | Active bundles |
| GET | `/api/faq` | Active FAQ entries |
| GET | `/api/pages/:slug` | Static page content |
| GET | `/api/reviews/:productId` | Approved reviews |
| POST | `/api/reviews` | Submit review |
| POST | `/api/leads` | Capture lead |
| GET | `/api/config/public` | Public site config |
| GET | `/api/blog` | Published posts |
| GET | `/api/blog/:slug` | Single post |
| POST | `/api/checkout/validate-pincode` | India Post validation |
| POST | `/api/checkout/shipping-estimate` | Shipping quote |
| POST | `/api/checkout/create-razorpay-order` | Razorpay order |
| POST | `/api/checkout/verify-payment` | HMAC verification |
| POST | `/api/checkout/apply-coupon` | Validate coupon |
| POST | `/api/checkout/cod-check` | COD availability |
| POST | `/api/orders/create` | Place order |
| POST | `/api/orders/cancel` | Cancel order |
| GET | `/api/orders/track` | Track by order_id or phone |
| POST | `/api/orders/claims/damage` | Submit damage claim |
| GET | `/api/admin/dashboard` | Dashboard KPIs |
| GET/POST/PUT/DELETE | `/api/admin/products` | Products CRUD |
| GET/POST/PUT/DELETE | `/api/admin/categories` | Categories CRUD |
| GET/PUT | `/api/admin/orders` | Order management |
| POST | `/api/admin/logistics/*` | Shiprocket operations |
| GET/PUT | `/api/admin/customers` | Customer management |
| GET | `/api/admin/leads` | Lead list |
| GET | `/api/admin/analytics/*` | Analytics endpoints |
| GET/POST/PUT | `/api/admin/coupons` | Coupon management |
| GET/PUT | `/api/admin/reviews` | Review moderation |
| GET/POST/PUT | `/api/admin/blog` | Blog CRUD |
| GET/PUT | `/api/admin/pages` | Page editor |
| GET/POST/PUT/DELETE | `/api/admin/faq` | FAQ CRUD |
| GET/PUT | `/api/admin/settings` | System config |
| POST | `/api/admin/backup` | Database export |
| GET | `/api/admin/errors` | Error log |
| POST | `/api/admin/claims/:id/approve` | Approve damage claim |
| POST | `/api/admin/claims/:id/decline` | Decline damage claim |
| POST | `/api/analytics/funnel` | Log sales funnel event |
| GET | `/sitemap.xml` | XML sitemap |
| GET | `/robots.txt` | Robots file |

---

## Appendix: Domain Recommendation

### Primary Recommendation
- **photoframein.com** - Best for brand (.com + memorable)
- **photoframein.in** - India-specific, if .com unavailable

### Alternatives Checked
| Domain | Status |
|---|---|
| photoframein.com | Check availability |
| framewala.in | Appears registered |
| frameit.in | Registered (business) |
| framezone.in | Registered |
| posterframes.in | Available (likely) |
| myphotoframe.in | Check availability |

### Budget
Target: Under $1,000/year for 3-year plan. Most .in domains are Rs.500-800/year.

---

## 13. Service Setup Guides

### 13.1 Razorpay Setup (Payments)
1.  **Account**: Create an account at [razorpay.com](https://razorpay.com).
2.  **API Keys**: Go to Settings > API Keys. Generate `Key ID` and `Key Secret`.
3.  **Environment Variables**: Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to your `.env` or Cloudflare secrets.
4.  **Webhook Setup (Optional but Recommended)**:
    - URL: `https://your-domain.com/api/checkout/verify-payment` (if using webhook-based verification).
    - Secret: Define a secret and add it to `RAZORPAY_WEBHOOK_SECRET`.
    - Events: `payment.authorized`, `payment.failed`.

### 13.2 Shiprocket Setup (Logistics)
1.  **Account**: Create an account at [shiprocket.in](https://shiprocket.in).
2.  **API Credentials**:
    - Go to Settings > API > Configure.
    - Create a new API User (email/password).
    - Add these to `SHIPROCKET_EMAIL` and `SHIPROCKET_PASSWORD`.
3.  **Channel Integration**:
    - If using the Shiprocket Checkout widget, go to Channels > Add New Channel > Custom.
    - Copy the `Channel ID` and add it to your config if required by the SDK.
4.  **Pickup Address**:
    - Go to Settings > Pickup Addresses. Create an address.
    - Ensure `PICKUP_PINCODE` in your config matches this address exactly.
5.  **KYC**: Ensure KYC is completed in Shiprocket to enable automated AWB generation and pickup scheduling.

---

*This is a living document. Update as decisions are made and features evolve.*

