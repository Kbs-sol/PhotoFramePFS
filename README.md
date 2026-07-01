# ChitraFrame (frame-it)

Museum-grade, made-to-order framed wall art store for India — devotional, sports and
automotive prints. Built on the **TanStack** stack so it stays fully editable inside the
[Lovable](https://lovable.dev) dashboard, while the entire backend runs as **TanStack
server functions** deployed to **Cloudflare Workers**.

This repo is the result of merging two codebases:

- **`photoframepfs`** — the original Cloudflare / Hono backend (payments, shipping, email,
  coupons, orders). All of its business logic was ported to TanStack `createServerFn`
  server functions.
- **`photoframe-pro-plan`** — the Lovable TanStack frontend (shadcn/ui, Radix, Tailwind v4).
  This is the base of the project; the Hono logic was folded into it.

## Project Overview
- **Name**: ChitraFrame (`frame-it`)
- **Goal**: A fully functional, Lovable-editable e-commerce storefront optimised for a
  100%-free-tier stack.
- **Features**: Product catalogue + configurator (size / frame / finish / qty with live
  pricing), cart, pincode deliverability, live shipping estimates, coupons, Razorpay
  (prepaid) + Cash-on-Delivery checkout, order persistence, email notifications, order
  tracking.

## Tech Stack
- **Framework**: TanStack Start + TanStack Router + TanStack Query (SSR React)
- **UI**: shadcn/ui (new-york), Radix UI, Tailwind CSS v4, lucide-react, sonner
- **Forms/validation**: react-hook-form + zod
- **Build**: Vite via `@lovable.dev/vite-tanstack-config` → Nitro `cloudflare-module`
- **Deploy**: Cloudflare Workers (static assets bound as `ASSETS`), auto-deployed from Git
- **Backend**: TanStack server functions (`createServerFn`) — no separate API server

## Free-tier Integrations
| Concern            | Service                    | Env vars |
|--------------------|----------------------------|----------|
| Auth + Database    | Supabase                   | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` |
| Payments           | Razorpay                   | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| Delivery estimates | Shiprocket API             | `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `SHIPROCKET_PICKUP_LOCATION`, `PICKUP_PINCODE` |
| Pincode check      | India Post (free)          | none (public `api.postalpincode.in`) |
| Email              | Brevo (primary) + Resend   | `BREVO_API_KEY`, `RESEND_API_KEY`, `FROM_EMAIL`, `FROM_NAME`, `OWNER_EMAIL` |
| Hosting / Deploy   | Cloudflare + GitHub        | — |

See **`.env.example`** for the full list. The app degrades gracefully: with no Supabase
configured it falls back to a static local catalogue and returns a WhatsApp order link
instead of persisting orders.

## Functional Entry Points (routes & server functions)

### Pages
- `/` — Home (hero, category grids, how-it-works)
- `/product/$slug` — Product configurator + deliverability check
- `/checkout` — Cart-driven checkout (prepaid via Razorpay, or COD)
- `/track?order=<ORDER_ID>` — Order tracking

### Server functions (`src/lib/*.functions.ts`)
- `listProductsFn` (GET) / `getProductFn` (GET) — catalogue (Supabase → static fallback)
- `validatePincodeFn` (GET) — India Post + Shiprocket serviceability
- `estimateShippingFn` (POST) — live shipping tier estimate
- `createRazorpayOrderFn` (POST) — server-recomputed amount → Razorpay order
- `verifyPaymentFn` (POST) — HMAC-SHA256 signature verify (Web Crypto)
- `applyCouponFn` (POST) — coupon validation
- `createOrderFn` (POST) — persist order, send emails, Shiprocket sync
- `trackOrderFn` (GET) — fetch order status
- `magicLinkFn` / `verifyMagicFn` / `logoutFn` — Supabase OTP auth (with signed-token fallback)

## Data Architecture
- **Data models**: `products`/`variants`, `orders`, `coupons`, `config`, `error_log`
  (Supabase Postgres). Order IDs are `PS-YYMMDD-XXXX` via an atomic sequence RPC.
- **Storage services**: Supabase (relational + auth). No in-memory/file persistence.
- **Client state**: cart persisted to `localStorage` (`chitraframe.cart.v1`) via React Context.
- **Data flow**: Browser → TanStack server functions (run on the Worker) → Supabase /
  Razorpay / Shiprocket / Brevo APIs.

## User Guide
1. Browse categories on the home page and open a product.
2. Pick size / frame / finish / quantity — price updates live. Enter a pincode to check
   deliverability and shipping.
3. Add to cart (or Buy now) → open the cart drawer → **Proceed to checkout**.
4. Fill in delivery details, apply a coupon if any, choose **Pay online** (Razorpay) or
   **Cash on Delivery**, and place the order.
5. Track the order anytime at `/track?order=<your order id>`.

## Local Development
```bash
npm install
npm run dev        # Vite dev server (Lovable-compatible)
npm run build      # Nitro cloudflare-module build → .output/
```
Local Worker preview note: the sandbox's wrangler runtime may not support a future
compatibility date. The production Cloudflare build is unaffected.

## Deployment
- **Platform**: Cloudflare Workers (Git-connected auto-deploy)
- **Build command**: `npm run build`  •  **Output**: `.output/`
- **Production URL**: https://frame-it.pages.dev
- **Node**: 22+ (see `.nvmrc` / `engines`)
- **Status**: ✅ Deploying from `frame-it` main branch
- **Secrets**: set the env vars from `.env.example` in the Cloudflare project settings.

## Not Yet Implemented / Next Steps
- Admin dashboard for products/orders (currently managed in Supabase directly)
- User account area (auth functions exist; UI pages pending)
- Product image upload pipeline (uses bundled asset images today)
- Automated tests
