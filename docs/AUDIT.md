# ChitraFrame / PhotoFramePFS — Code & Product Audit

**Repo:** https://github.com/Kbs-sol/PhotoFramePFS
**Version audited:** v5.3 (commit `6dc804c`, Jun 2 2026)
**Stack:** Hono on Cloudflare Pages Workers · Supabase Postgres · Razorpay · Cloudinary · Resend · Shiprocket
**Source of truth:** `system_literacy.md` v5.3 + README + commit history

Findings are grouped by severity. Each item has the **problem**, the **why it matters**, and the **fix**.

---

## 🔴 Critical — fix before next ₹1 of ad spend

### C1. No server-side cart price validation
- **Problem:** `/api/checkout/create-order` accepts `subtotal`, `shipping`, `discount`, `total` from the client and uses them to create the Razorpay order.
- **Why:** A buyer with DevTools can submit `total: 100` for an XL Premium order. You lose ~₹2,099 per exploit, repeatable.
- **Fix:**
  1. Server reads only `[{ variantId, qty }]` from the client.
  2. Server fetches each variant from Supabase (price, frame_type, in_stock).
  3. Server recomputes `subtotal`, applies `getCartTotals()` rules (shipping ≥₹899 free, COD +₹49, prepaid −₹50), recomputes `total`.
  4. Pass server-computed `total` to Razorpay. Reject if client total differs by >₹1.

### C2. All 11 live products have `is_placeholder: true`
- **Problem:** Cloudinary returns 404 for every PDP hero image.
- **Why:** Live site is effectively un-buyable. Money spent on ads bounces.
- **Fix:** Upload real artwork (see `docs/DESIGNS/` deliverable) and flip the flag. Until then, add an API-layer fallback to `/static/placeholder.webp` so the page at least renders.

### C3. Admin password committed in `system_literacy.md`
- **Problem:** Plaintext owner credential in git history.
- **Why:** Public repo. One Google search away.
- **Fix:**
  1. Rotate the Supabase password right now.
  2. `git filter-repo --replace-text passwords.txt` to scrub history.
  3. Force-push, invalidate forks.
  4. Enable Supabase 2FA on the admin account.
  5. Replace the doc section with `See 1Password / Bitwarden vault entry "ChitraFrame Admin"`.

### C4. `/api/admin/pricing` route is missing → admin Pricing tab 404s
- **Problem:** Frontend admin.js renders a Pricing section, no backend handler exists.
- **Fix:** Either ship the route (`GET/PUT /api/admin/pricing` backed by `system_config` keys) or remove the tab. Don't ship broken admin UI.

### C5. `product_variants_frame_type_check` CHECK constraint is a landmine
- **Problem:** DB only allows `frame_type = 'Direct Frame'`. Actual frame finish lives in the SKU suffix (`-standard`/`-premium`/`-noframe`). Any future seed script that sets `frame_type='Premium'` blows up with no helpful error.
- **Fix (pick one):**
  - **Quick:** rename column to `frame_mount_type`, add `frame_finish` ENUM (`standard|premium|none`) populated from the SKU suffix, drop the CHECK.
  - **Cheap:** just drop the constraint and add a migration note. Document in README + add a runtime warning in the seed script.

---

## 🟠 High

### H1. No rate limiting on `/api/checkout/*` or `/api/reviews`
- **Why:** Spam orders pollute Supabase + Razorpay dashboard, and review-spam attacks PDP credibility.
- **Fix:** Cloudflare Turnstile invisible challenge on checkout. KV-backed token-bucket (10 req/min/IP) on order creation, 3 req/hour/IP on review submission.

### H2. CSP uses `unsafe-inline` because of inline `onclick=`
- **Why:** Biggest XSS surface. If a review/product description ever renders unescaped, you're popped.
- **Fix:** Codemod `app.js` to use event delegation. Add per-request nonce in `pageShell()`. Drop `unsafe-inline`.

### H3. Razorpay reconciliation only via success callback, no server webhook
- **Why:** Customer pays, closes the tab during 3DS, never hits `verify-payment`. You have their money, no order in `processing`. Support nightmare.
- **Fix:** Add `POST /api/webhooks/razorpay` (signature via `RAZORPAY_WEBHOOK_SECRET`). On `payment.captured`, look up the order by `razorpay_order_id` and idempotently mark `processing` + send Resend email. Configure the webhook in Razorpay dashboard.

### H4. Cart lives only in `localStorage`
- **Why:** Logged-in users switching devices lose their cart. Abandoned-cart emails impossible.
- **Fix:** Mirror cart to `carts` table keyed by `user_id` (or `anon_session_id` cookie). Merge on login. Source of truth for abandoned-cart triggers.

### H5. `vite build --minify false` ships ~386 kB of unminified Worker JS
- **Why:** Slower cold start, more CPU per request (you have a 10ms CPU budget on free plan).
- **Fix:** `vite build --minify esbuild`. Should land ~150 kB. Verify locally, redeploy.

### H6. Resend has no retry / DLQ
- **Why:** If Resend 5xx's during `verify-payment`, the order is paid but the customer gets no confirmation. They WhatsApp you angry.
- **Fix:** Wrap in 3× retry with exponential backoff. On final failure, push to a Cloudflare Queue + log to `failed_emails` table for manual recovery.

---

## 🟡 Medium

### M1. Vanilla-JS SPA in one ~5k LOC `app.js`
- Hard to test, no client-side TS, route handlers + DOM rendering interleaved.
- **Fix (incremental):** extract per-route modules (`/routes/pdp.js`, `/routes/checkout.js`, …). Add `tsc --noEmit` to CI with `allowJs` + `checkJs` for gradual typing.

### M2. `checkout_source` + `shiprocket_synced` columns are read but not in schema
- Code silently gets `undefined`. Either add the migration or remove the reads.

### M3. No automated tests
- **Fix:** Playwright e2e for: home → PDP → ATC → cart → checkout (Razorpay test mode) → order-success. Run on every PR via the existing GitHub Action.

### M4. GA4 events fire client-side only
- Ad-blockers eat ~25% of events in India.
- **Fix:** Primary path = `POST /api/analytics/event` (server-side, immune to blockers). GA4 client-side as fallback only.

### M5. `is_placeholder` not gated at API layer
- PDP renders `<img src="">` and Cloudinary 404s reach users.
- **Fix:** In `/api/products/:slug`, when `is_placeholder=true`, swap the image URL for `/static/placeholder.webp` server-side.

### M6. No structured error logging
- 5xx from the Worker dies in the void.
- **Fix:** Cloudflare Logpush → Better Stack (free 1GB/mo) or Axiom. Add `console.error` with `{ requestId, route, userId }` context.

### M7. CSP nonce not implemented (tech debt confirmed in docs)
- Tracked under H2, listed here for completeness.

### M8. No CI build size budget
- A future bundle bloat lands silently.
- **Fix:** Fail the build if `dist/_worker.js` > 250 kB minified.

---

## 🟢 Low / polish

| # | Item | Fix |
|---|------|-----|
| L1 | Shop page `seo_title` still says `PhotoFrameIn` | Admin → Settings → SEO Title |
| L2 | Single fallback OG image | Per-PDP OG via Cloudinary transform `l_text:DM_Serif_Display_60:Title` |
| L3 | Sitemap hardcodes slugs | Generate from Supabase, 1h KV cache |
| L4 | `robots.txt` doesn't disallow `/admin` | Add `Disallow: /admin` |
| L5 | Lighthouse CI runs but no budget enforcement | Set LCP < 2.5s, CLS < 0.1, TBT < 200ms assertions |
| L6 | No a11y test beyond skip-link | `@axe-core/playwright` in e2e, target zero violations on home/PDP/checkout |
| L7 | A4 ₹99 unit-economics unverified | Confirm break-even after print + frame + ship + 2% Razorpay |
| L8 | `vite build --minify false` still in `package.json` (covered in H5) | — |
| L9 | No `Cache-Control` headers on Supabase image proxy responses | `s-maxage=86400, stale-while-revalidate=604800` |
| L10 | `WhatsApp` deeplink hardcoded in multiple places | Centralize via `lib/whatsapp.ts` |

---

## 💰 Conversion / business (not bugs — leverage)

1. **Abandoned-cart email** at T+30min via Resend (KV TTL triggers). Typical lift: 8–12% recovered revenue.
2. **WhatsApp Business Catalog sync** — ~30% of Indian D2C buyers prefer WA over web checkout. Use Meta's product feed XML format off your Supabase `products`.
3. **Photo reviews** — current reviews are text-only. Photo reviews lift PDP conversion 15–25%. Add Cloudinary signed upload widget to the review form.
4. **Bundle pricing** — "Any 3 prints ₹1,999". Cart-level promo, no per-SKU setup. Increases AOV by ~₹400.
5. **Festival landing pages** — Diwali, Karwa Chauth, anniversary, housewarming, Raksha Bandhan. Each = curated 6–8 prints + dedicated meta + Meta ad LP. Cheap SEO wins.
6. **Gift wrap upsell** at +₹99 in checkout. ~15% take-rate based on category norms.
7. **Referral program** — referral code already on `/order-success` per the docs, but no redemption flow exists. Wire ₹100-off-₹500 for referee + ₹100 credit for referrer.
8. **Trust pixel above the fold on PDP** — "Made in India · Ships in 3 days · 7-day returns" tri-icon strip. Cheap, measurable.

---

## Suggested execution order (2-week sprint)

**Week 1 — stop the bleeding**
- Day 1: C3 (rotate password), C2 fallback (M5), L1
- Day 2–3: C1 (server-side cart validation)
- Day 4: C4 + H3 (Razorpay webhook)
- Day 5: H1 (rate limiting) + H5 (minify)

**Week 2 — durability + growth**
- Day 6–7: H4 (server-side cart) + H6 (email retry)
- Day 8: C5 (frame_type fix) + M2 (missing columns)
- Day 9: M3 (Playwright e2e) + M8 (size budget)
- Day 10: Business item #1 (abandoned cart) + #3 (photo reviews)

Polish (L-series) and remaining business items in a follow-up sprint.

---

*Audit prepared for the repo owner. See `docs/DESIGNS/` for the matching framed-print catalog (12 designs, 96 SKUs) that resolves C2.*
