// ChitraFrame — Customer SPA v5.0
// Editorial luxury · High-conversion · Museum-grade minimalism
// Design: Light editorial, DM Serif Display + DM Sans
// Security: XSS-safe, CSP-compliant, no credentials in client
// v5.0: GA4 events, thank-you page, trust badges, a/b test, WebP images, FAQPage schema, performance
(function () {
  'use strict';

  const API = '/api';
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

  // ── Product image map — all served from Cloudinary CDN (dax4yqumu) ─────────
  // FIX: Replaced all genspark.ai URLs with Cloudinary CDN URLs
  const CLD_CLOUD = 'dax4yqumu';
  function cldUrl(slug, w = 800) {
    if (DESIGN_IMAGES[slug]) return DESIGN_IMAGES[slug];
    return `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_${w},q_auto,f_auto/chitraframe/products/${slug}.jpg`;
  }
  // cldPicture: responsive <picture> with WebP + fallback
  function cldPicture(slug, alt, widths = [400, 600, 800], cls = '', loading = 'lazy') {
    const base = `https://res.cloudinary.com/${CLD_CLOUD}/image/upload`;
    const src = DESIGN_IMAGES[slug] || `${base}/c_fill,w_800,q_auto,f_auto/chitraframe/products/${slug}.jpg`;
    // If it's already a CDN URL, just return a simple img
    if (DESIGN_IMAGES[slug]) {
      return `<img src="${escapeHTML(src)}" alt="${escapeHTML(alt)}"${cls ? ` class="${cls}"` : ''} loading="${loading}" width="400" height="500">`;
    }
    const srcset = widths.map(w => `${base}/c_fill,w_${w},q_auto,f_auto/chitraframe/products/${slug}.webp ${w}w`).join(', ');
    const fallback = `${base}/c_fill,w_${widths[0]},q_auto,f_auto/chitraframe/products/${slug}.jpg`;
    return `<picture>
      <source type="image/webp" srcset="${srcset}" sizes="(max-width:640px) ${widths[0]}px, ${widths[1] || widths[0]}px">
      <img src="${fallback}" alt="${escapeHTML(alt)}"${cls ? ` class="${cls}"` : ''} loading="${loading}" width="${widths[0]}" height="${Math.round(widths[0] * 1.25)}">
    </picture>`;
  }

  const DESIGN_IMAGES = {
    // Spiritual — Tier 1 (High organic demand)
    'mahadev-cosmic-trance':         `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/mahadev-cosmic-trance.jpg`,
    'radha-krishna-emerald-dance':   `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/radha-krishna-emerald-dance.jpg`,
    'radha-krishna-watercolor':      `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/radha-krishna-watercolor.jpg`,
    'ganesh-vibrant-pop':            `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/ganesh-vibrant-pop.jpg`,
    'lakshmi-gold-lotus':            `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/lakshmi-gold-lotus.jpg`,
    // Spiritual — Tier 2
    'krishna-peacock-grove':         `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/krishna-peacock-grove.jpg`,
    'ram-darbar-divine':             `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/ram-darbar-divine.jpg`,
    'hanuman-cosmic-strength':       `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/hanuman-cosmic-strength.jpg`,
    // Automotive — Tier 1
    'porsche-911-pacific-coast':     `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/porsche-911-pacific-coast.jpg`,
    'bmw-m4-carbon-dark':            `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/bmw-m4-carbon-dark.jpg`,
    'lamborghini-aventador-neon':    `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/lamborghini-aventador-neon.jpg`,
    // Automotive — Tier 2
    'nissan-gtr-r34-osaka-rain':     `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/nissan-gtr-r34-osaka-rain.jpg`,
    'f1-redbull-racing':             `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/f1-redbull-racing.jpg`,
    'ferrari-sf90-stradale':         `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/ferrari-sf90-stradale.jpg`,
    // Sports — Tier 1
    'cricket-glory-moment':          `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/cricket-glory-moment.jpg`,
    'ms-dhoni-finishing-master':     `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/ms-dhoni-finishing-master.jpg`,
    // Wildlife — Tier 1
    'lion-geometric-gold':           `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/lion-geometric-gold.jpg`,
    'tiger-watercolor-majesty':      `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/tiger-watercolor-majesty.jpg`,
    // Anime / JDM — Tier 2
    'tokyo-drift-aesthetic':         `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/tokyo-drift-aesthetic.jpg`,
    // Motivational — Tier 2
    'stoic-aurelius-quote':          `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_800,q_auto,f_auto/chitraframe/products/stoic-aurelius-quote.jpg`,
  };

  // cldUrl + cldPicture defined above with DESIGN_IMAGES block

  // ── State ─────────────────────────────────────────────────────────────────
  let state = {
    cart: [],
    config: {},
    page: '',
    exitShown: false,
    wishlist: [],
    cartOpen: false
  };

  try { state.cart = JSON.parse(localStorage.getItem('cf_cart') || '[]'); } catch (e) { state.cart = []; }
  try { state.wishlist = JSON.parse(localStorage.getItem('cf_wishlist') || '[]'); } catch (e) { state.wishlist = []; }
  state.cart = state.cart.filter(i =>
    i && typeof i.variantId === 'string' &&
    typeof i.price === 'number' && isFinite(i.price) && i.price > 0 &&
    typeof i.name === 'string' &&
    Number.isInteger(i.quantity || 1) && (i.quantity || 1) >= 1
  );

  // ── Utilities ─────────────────────────────────────────────────────────────
  function saveCart() {
    // FIX 1.4: Strip base64 dataURLs + wrap in try/catch for QuotaExceededError
    state.cart = state.cart.filter(i => i && i.price > 0 && isFinite(i.price))
      .slice(0, 20)
      .map(i => {
        const cleaned = { ...i, quantity: Math.min(Math.max(1, i.quantity || 1), 50) };
        if (cleaned.uploadedDataUrl && cleaned.uploadedDataUrl.startsWith('data:')) delete cleaned.uploadedDataUrl;
        if (cleaned.image && cleaned.image.startsWith('data:')) delete cleaned.image;
        return cleaned;
      });
    try {
      localStorage.setItem('cf_cart', JSON.stringify(state.cart));
    } catch (e) {
      if (e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        // Strip all large data and retry
        state.cart = state.cart.map(i => { const c = { ...i }; delete c.uploadedDataUrl; delete c.rawImageData; return c; });
        try { localStorage.setItem('cf_cart', JSON.stringify(state.cart)); toast('Cart saved. Large photos processed separately.', 'info'); } catch (e2) { /* silent */ }
      }
    }
    updateCartBadge();
  }

  function updateCartBadge() {
    const count = state.cart.reduce((s, i) => s + (i.quantity || 1), 0);
    $$('.cart-count').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'inline-flex' : 'none';
    });
  }

  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function formatPrice(p) {
    const n = Number(p);
    if (!isFinite(n) || n < 0) return '₹0';
    return '₹' + Math.round(n).toLocaleString('en-IN');
  }

  function navigate(path) {
    if (typeof path !== 'string' || !path.startsWith('/') || path.includes('..')) return;
    history.pushState({}, '', path);
    route();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // FIX: toast supports HTML content and optional duration (ms)
  function toast(msg, type = 'success', duration = 3000) {
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.setAttribute('role', 'alert');
    t.innerHTML = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('toast-show'), 10);
    setTimeout(() => { t.classList.remove('toast-show'); setTimeout(() => t.remove(), 400); }, duration);
  }

  function captureUTM() {
    const params = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(k => {
      const v = params.get(k);
      if (v && v.length < 200) localStorage.setItem(k, v);
    });
  }

  function getCartTotals(paymentMethod) {
    const subtotal = state.cart.reduce((s, i) => {
      const price = Number(i.price);
      const qty = Math.max(1, i.quantity || 1);
      return s + (isFinite(price) && price > 0 ? price * qty : 0);
    }, 0);
    const itemCount = state.cart.reduce((s, i) => s + (i.quantity || 1), 0);
    // Free shipping gate: ₹899+ → free; below → ₹99
    const freeThreshold = 899;
    let discount = 0, discountLabel = '';
    if (itemCount >= 5) { discount = Math.floor(subtotal * 0.20); discountLabel = 'Buy 5+ — 20% off'; }
    else if (itemCount >= 3) { discount = Math.min(250, Math.floor(subtotal * 0.15)); discountLabel = 'Buy 3 — ₹250 saved'; }
    else if (itemCount >= 2) { discount = Math.min(100, Math.floor(subtotal * 0.10)); discountLabel = 'Buy 2 — ₹100 saved'; }
    const afterDiscount = subtotal - discount;
    const shipping = afterDiscount >= freeThreshold ? 0 : 99;
    // Payment method surcharges: COD +₹49, Prepaid/UPI -₹50
    let paymentAdj = 0, paymentAdjLabel = '';
    if (paymentMethod === 'cod') { paymentAdj = 49; paymentAdjLabel = 'COD handling fee'; }
    else if (paymentMethod === 'online') { paymentAdj = -50; paymentAdjLabel = 'Online payment discount'; }
    const total = Math.max(0, afterDiscount + shipping + paymentAdj);
    return { subtotal, discount, discountLabel, shipping, total, itemCount, freeThreshold, paymentAdj, paymentAdjLabel };
  }

  // ── GA4 Event Tracking ────────────────────────────────────────────────────
  function trackEvent(eventName, params) {
    try {
      if (window.gtag) {
        window.gtag('event', eventName, params || {});
      }
      if (window.dataLayer) {
        window.dataLayer.push({ event: eventName, ...(params || {}) });
      }
      // Also send to our analytics endpoint (fire-and-forget)
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventName, metadata: params || {} })
      }).catch(() => {});
    } catch (e) { /* never block UI */ }
  }

  // ── A/B Test Framework ────────────────────────────────────────────────────
  const ABTest = {
    // Returns 'a' or 'b' consistently for this browser session
    get: function(testName) {
      const key = 'ab_' + testName;
      let v = localStorage.getItem(key);
      if (!v) {
        v = Math.random() < 0.5 ? 'a' : 'b';
        localStorage.setItem(key, v);
      }
      return v;
    },
    // Hero CTA text test: 'a' = "Shop All Prints", 'b' = "Explore Art Now"
    heroCTA: function() {
      return this.get('hero_cta') === 'b' ? 'Explore Art Now' : 'Shop All Prints';
    }
  };

  // cldSrcset + cldPicture defined above with DESIGN_IMAGES block (deduped)

  // ── Scroll Reveal ─────────────────────────────────────────────────────────
  function initReveal() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    $$('[data-reveal]').forEach(el => io.observe(el));
  }

  // ── Cart Drawer ───────────────────────────────────────────────────────────
  function openCartDrawer() {
    state.cartOpen = true;
    let drawer = $('#cart-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'cart-drawer';
      drawer.innerHTML = `
        <div class="cart-overlay" onclick="window.cf.closeCart()"></div>
        <aside class="cart-panel" aria-label="Shopping cart">
          <div class="cart-header">
            <h2 class="cart-title">Your Cart</h2>
            <button class="cart-close" onclick="window.cf.closeCart()" aria-label="Close cart">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </div>
          <div class="cart-body" id="cart-body-inner"></div>
          <div class="cart-footer" id="cart-footer-inner"></div>
        </aside>`;
      document.body.appendChild(drawer);
    }
    setTimeout(() => drawer.classList.add('cart-drawer-open'), 10);
    renderCartDrawerContent();
    document.body.style.overflow = 'hidden';
  }

  function closeCartDrawer() {
    state.cartOpen = false;
    const drawer = $('#cart-drawer');
    if (drawer) {
      drawer.classList.remove('cart-drawer-open');
      setTimeout(() => { document.body.style.overflow = ''; }, 400);
    }
  }

  function renderCartDrawerContent() {
    const body = $('#cart-body-inner');
    const footer = $('#cart-footer-inner');
    if (!body || !footer) return;

    const { subtotal, discount, discountLabel, shipping, total, itemCount, freeThreshold } = getCartTotals();

    if (state.cart.length === 0) {
      body.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M6 6h4l6 24h20l4-16H14" stroke="var(--ink-300)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="36" r="2" fill="var(--ink-300)"/><circle cx="34" cy="36" r="2" fill="var(--ink-300)"/></svg>
          </div>
          <p class="cart-empty-text">Your cart is empty</p>
          <button class="btn-primary" onclick="window.cf.nav('/shop');window.cf.closeCart()">Explore Art Prints</button>
        </div>`;
      footer.innerHTML = '';
      return;
    }

    const freeLeft = freeThreshold - (subtotal - discount);
    body.innerHTML = `
      ${freeLeft > 0 ? `<div class="cart-free-bar"><div class="cart-free-progress" style="width:${Math.min(100,(subtotal/freeThreshold)*100)}%"></div><p class="cart-free-text">Add <strong>${formatPrice(freeLeft)}</strong> more for free shipping</p></div>` : `<div class="cart-free-achieved">🎉 You've got free shipping!</div>`}
      <ul class="cart-items">
        ${state.cart.map((item, idx) => `
          <li class="cart-item">
            <div class="cart-item-img">
              <img src="${escapeHTML(item.image || cldUrl(item.slug || '', 200))}" alt="${escapeHTML(item.name)}" loading="lazy">
            </div>
            <div class="cart-item-info">
              <p class="cart-item-name">${escapeHTML(item.name)}</p>
              <p class="cart-item-variant">${escapeHTML(item.size || '')}${item.frame ? ' · ' + escapeHTML(item.frame) : ''}</p>
              ${item.isAddon ? '<span class="cart-item-addon-tag">Add-on</span>' : ''}
              <div class="cart-item-bottom">
                <div class="qty-stepper">
                  <button onclick="window.cf.updateQty(${idx},-1)" aria-label="Decrease quantity">−</button>
                  <span>${item.quantity || 1}</span>
                  <button onclick="window.cf.updateQty(${idx},1)" aria-label="Increase quantity">+</button>
                </div>
                <span class="cart-item-price">${formatPrice(item.price * (item.quantity || 1))}</span>
              </div>
            </div>
            <button class="cart-item-remove" onclick="window.cf.removeFromCart(${idx})" aria-label="Remove ${escapeHTML(item.name)}">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 3L3 11M3 3l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </li>`).join('')}
      </ul>`;

    // Check if poster already in cart
    const hasPoster = state.cart.some(i => i.variantId === 'addon-poster-a3');
    const hasFrameItem = state.cart.some(i => i.slug && i.slug !== 'addon-poster-a3');

    footer.innerHTML = `
      ${hasFrameItem && !hasPoster ? `
      <div class="cart-poster-upsell">
        <div class="cart-poster-upsell-inner">
          <div class="cart-poster-upsell-icon">🗞️</div>
          <div class="cart-poster-upsell-text">
            <strong>Add A3 Poster Print</strong>
            <span>Rolled, unframed — perfect as a gift, spare, or bedroom print</span>
          </div>
          <button class="cart-poster-btn" onclick="window.cf.addPosterAddon()">
            +₹89
          </button>
        </div>
      </div>` : ''}
      <div class="cart-totals">
        <div class="cart-total-row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
        ${discount > 0 ? `<div class="cart-total-row cart-discount"><span>${escapeHTML(discountLabel)}</span><span>−${formatPrice(discount)}</span></div>` : ''}
        <div class="cart-total-row"><span>Shipping</span><span>${shipping === 0 ? '<span class="text-green-600">Free</span>' : formatPrice(shipping)}</span></div>
        <div class="cart-total-row cart-grand-total"><span>Total</span><span>${formatPrice(total)}</span></div>
      </div>
      <button class="btn-primary w-full" onclick="window.cf.nav('/checkout');window.cf.closeCart()">
        Checkout · ${formatPrice(total)}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="btn-outline w-full mt-2" onclick="window.cf.nav('/shop');window.cf.closeCart()">Continue Shopping</button>`;
  }

  function addToCart(item) {
    const existing = state.cart.find(i => i.variantId === item.variantId);
    if (existing) {
      existing.quantity = Math.min(50, (existing.quantity || 1) + 1);
    } else {
      state.cart.push({ ...item, quantity: 1 });
    }
    saveCart();
    openCartDrawer();
    toast(`<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Added to cart`);
  }

  function updateQty(idx, delta) {
    if (!state.cart[idx]) return;
    const newQty = (state.cart[idx].quantity || 1) + delta;
    if (newQty <= 0) { state.cart.splice(idx, 1); }
    else { state.cart[idx].quantity = Math.min(50, newQty); }
    saveCart();
    renderCartDrawerContent();
  }

  function removeFromCart(idx) {
    state.cart.splice(idx, 1);
    saveCart();
    renderCartDrawerContent();
  }

  function addPosterAddon() {
    // Poster is only available as an add-on when a frame product is in cart
    const hasFrame = state.cart.some(i => i.slug && i.slug !== 'addon-poster-a3');
    if (!hasFrame) { toast('Add a framed print first to unlock the poster add-on', 'error'); return; }
    const already = state.cart.find(i => i.variantId === 'addon-poster-a3');
    if (already) { toast('A3 Poster already in cart'); return; }
    state.cart.push({
      variantId: 'addon-poster-a3',
      name: 'A3 Poster Print (Rolled)',
      price: 149,
      image: '',
      slug: 'addon-poster-a3',
      size: 'A3 (11.7×16.5")',
      frame: 'Rolled — Unframed',
      quantity: 1,
      isAddon: true,
    });
    saveCart();
    renderCartDrawerContent();
    toast('A3 Poster add-on added! 🗞️');
  }

  // ── HEADER ────────────────────────────────────────────────────────────────
  function renderHeader() {
    const cartCount = state.cart.reduce((s, i) => s + (i.quantity || 1), 0);
    const ann = state.config;
    const isAnnActive = ann.announcement_active === 'true';
    const annText = escapeHTML(ann.announcement_text || 'Free delivery on orders above ₹899 · COD Available across India');
    const annBg = /^#[0-9A-Fa-f]{3,8}$/.test(ann.announcement_bg || '') ? ann.announcement_bg : '#0F0E0C';

    return `
    ${isAnnActive ? `
    <div class="promo-bar" style="background:${annBg}" role="banner">
      <p>${annText}</p>
    </div>` : ''}
    <header class="site-header" id="site-header" role="banner">
      <div class="header-inner">
        <button class="mobile-menu-toggle" id="mobile-menu-btn" aria-label="Open menu" aria-expanded="false">
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none"><path d="M1 1h20M1 8h20M1 15h20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>

        <nav class="header-nav" aria-label="Categories">
          <a href="/category/spiritual" onclick="window.cf.nav('/category/spiritual');return false;" class="header-nav-link">Divine</a>
          <a href="/category/automotive" onclick="window.cf.nav('/category/automotive');return false;" class="header-nav-link">Automotive</a>
          <a href="/category/sports" onclick="window.cf.nav('/category/sports');return false;" class="header-nav-link">Sports</a>
          <a href="/category/wildlife" onclick="window.cf.nav('/category/wildlife');return false;" class="header-nav-link">Wildlife</a>
        </nav>

        <a href="/" onclick="window.cf.nav('/');return false;" class="header-logo" aria-label="ChitraFrame — Home">
          <span class="logo-mark" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="2" y="2" width="24" height="24" rx="3" stroke="var(--ink-900)" stroke-width="1.5"/><rect x="6" y="6" width="16" height="16" rx="2" fill="var(--gold)" opacity="0.18"/><rect x="6" y="6" width="16" height="16" rx="2" stroke="var(--gold)" stroke-width="1"/></svg>
          </span>
          <span class="logo-text">Chitra<em>Frame</em></span>
        </a>

        <nav class="header-nav header-nav-right" aria-label="Site links">
          <a href="/shop" onclick="window.cf.nav('/shop');return false;" class="header-nav-link">Shop All</a>
          <a href="/customize" onclick="window.cf.nav('/customize');return false;" class="header-nav-link" style="color:var(--gold)">Custom Frame</a>
          <a href="/about" onclick="window.cf.nav('/about');return false;" class="header-nav-link hidden md:inline-flex">About</a>
        </nav>

        <div class="header-actions">
          <!-- FIX 6.1: Track order icon replaced — star SVG → package/box SVG -->
          <button class="header-icon-btn" onclick="window.cf.nav('/track')" aria-label="Track order">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 5.5l7-3.5 7 3.5v7L9 16l-7-3.5V5.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M2 5.5l7 3.5m0 0l7-3.5M9 9v7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M5.5 4L12.5 7.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.5"/></svg>
          </button>
          <button class="header-icon-btn cart-btn" onclick="window.cf.openCart()" aria-label="Cart, ${cartCount} items">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1 1h2.5l2.4 9.6h8.1l2-7H5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="15" r="1.2" fill="currentColor"/><circle cx="13" cy="15" r="1.2" fill="currentColor"/></svg>
            <span class="cart-count" style="display:${cartCount > 0 ? 'inline-flex' : 'none'}">${cartCount}</span>
          </button>
        </div>
      </div>

      <!-- FIX s6.2: Mobile Menu — role=dialog, aria-modal, overlay, z-index 9999 -->
      <div class="mobile-menu" id="mobile-menu" role="dialog" aria-modal="true" aria-label="Navigation menu" aria-hidden="true" style="z-index:9999">
        <div class="mobile-menu-overlay" id="mobile-menu-overlay" onclick="window.cf.closeMobileMenu()" aria-hidden="true"></div>
        <div class="mobile-menu-inner">
          <div class="mobile-menu-logo">
            <span class="logo-text">Chitra<em>Frame</em></span>
            <button onclick="window.cf.closeMobileMenu()" aria-label="Close navigation menu" id="mobile-menu-close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </div>
          <nav class="mobile-menu-nav" aria-label="Mobile navigation">
            <a href="/" onclick="window.cf.nav('/');closeMobileMenu();return false;">Home</a>
            <a href="/shop" onclick="window.cf.nav('/shop');closeMobileMenu();return false;">Shop All Prints</a>
            <a href="/category/spiritual" onclick="window.cf.nav('/category/spiritual');closeMobileMenu();return false;">Divine &amp; Spiritual</a>
            <a href="/category/automotive" onclick="window.cf.nav('/category/automotive');closeMobileMenu();return false;">Automotive Art</a>
            <a href="/category/sports" onclick="window.cf.nav('/category/sports');closeMobileMenu();return false;">Sports Legends</a>
            <a href="/category/wildlife" onclick="window.cf.nav('/category/wildlife');closeMobileMenu();return false;">Wildlife</a>
            <a href="/category/anime" onclick="window.cf.nav('/category/anime');closeMobileMenu();return false;">Anime</a>
            <a href="/category/motivational" onclick="window.cf.nav('/category/motivational');closeMobileMenu();return false;">Motivational</a>
            <a href="/track" onclick="window.cf.nav('/track');closeMobileMenu();return false;">Track Order</a>
            <a href="/about" onclick="window.cf.nav('/about');closeMobileMenu();return false;">About Us</a>
          </nav>
          <div class="mobile-menu-bottom">
            <p class="text-sm text-ink-400">Free shipping above ₹899</p>
          </div>
        </div>
      </div>
    </header>`;
  }

  function closeMobileMenu() {
    const m = $('#mobile-menu');
    if (m) { m.classList.remove('mobile-menu-open'); m.setAttribute('aria-hidden', 'true'); }
    const btn = $('#mobile-menu-btn');
    if (btn) { btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
    document.body.style.overflow = '';
  }

  function openMobileMenu() {
    const m = $('#mobile-menu');
    const btn = $('#mobile-menu-btn');
    if (m) { m.classList.add('mobile-menu-open'); m.setAttribute('aria-hidden', 'false'); }
    if (btn) btn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    // Move focus into menu for accessibility
    const closeBtn = document.getElementById('mobile-menu-close');
    if (closeBtn) setTimeout(() => closeBtn.focus(), 50);
  }

  function initMobileMenu() {
    const btn = $('#mobile-menu-btn');
    const menu = $('#mobile-menu');
    if (btn && menu) {
      btn.addEventListener('click', () => {
        const open = menu.classList.contains('mobile-menu-open');
        if (open) closeMobileMenu(); else openMobileMenu();
      });
      // Close on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menu.classList.contains('mobile-menu-open')) closeMobileMenu();
      });
    }
  }

  function initStickyHeader() {
    const header = $('#site-header');
    if (!header) return;
    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > 80) {
        header.classList.add('header-scrolled');
        if (y > lastY + 4) header.classList.add('header-hidden');
        else if (y < lastY - 4) header.classList.remove('header-hidden');
      } else {
        header.classList.remove('header-scrolled', 'header-hidden');
      }
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────
  function renderFooter() {
    const c = state.config;
    const waRaw = (c.whatsapp_number || '917989531818').replace(/\D/, '');
    const waNumber = /^\d{10,15}$/.test(waRaw) ? waRaw : '917989531818';
    const waLink = `https://wa.me/${waNumber}`;
    const instaLink = /^https?:\/\//.test(c.instagram_link || '') ? c.instagram_link : 'https://instagram.com/chitraframe';
    const year = new Date().getFullYear();

    return `
    <footer class="site-footer" role="contentinfo">
      <div class="footer-top">
        <div class="container">
          <div class="footer-grid">
            <div class="footer-brand">
              <a href="/" onclick="window.cf.nav('/');return false;" class="footer-logo">
                <span class="logo-text">Chitra<em>Frame</em></span>
              </a>
              <p>Museum-quality art prints, framed and delivered across India. Turn your walls into stories.</p>
              <div class="footer-social">
                <a href="${escapeHTML(instaLink)}" target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="footer-social-link">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
                </a>
                <a href="${escapeHTML(waLink)}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" class="footer-social-link">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20.5 3.5A11.5 11.5 0 0 0 1.5 12.4a11.4 11.4 0 0 0 1.5 5.6L1.5 22.5l4.6-1.5a11.5 11.5 0 0 0 5.9 1.6 11.5 11.5 0 0 0 8.5-19.6z" stroke="currentColor" stroke-width="1.5"/><path d="M9 10.5s.5-1 1.5-.5l1 .5c.5.3.5 1-.3 2s-2.2 1.8-3 1.5c-.8-.3-2.5-1.5-3.2-3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                </a>
              </div>
            </div>

            <div class="footer-col">
              <h3>Collections</h3>
              <ul>
                <li><a href="/category/spiritual" onclick="window.cf.nav('/category/spiritual');return false;">Divine &amp; Spiritual</a></li>
                <li><a href="/category/automotive" onclick="window.cf.nav('/category/automotive');return false;">Automotive Art</a></li>
                <li><a href="/category/sports" onclick="window.cf.nav('/category/sports');return false;">Sports Legends</a></li>
                <li><a href="/category/wildlife" onclick="window.cf.nav('/category/wildlife');return false;">Wildlife</a></li>
                <li><a href="/category/anime" onclick="window.cf.nav('/category/anime');return false;">Anime</a></li>
                <li><a href="/category/motivational" onclick="window.cf.nav('/category/motivational');return false;">Motivational</a></li>
              </ul>
            </div>

            <div class="footer-col">
              <h3>Help</h3>
              <ul>
                <li><a href="/track" onclick="window.cf.nav('/track');return false;">Track Your Order</a></li>
                <li><a href="/returns" onclick="window.cf.nav('/returns');return false;">Returns &amp; Exchanges</a></li>
                <li><a href="/policy/shipping" onclick="window.cf.nav('/policy/shipping');return false;">Shipping Policy</a></li>
                <li><a href="/static/faq.html">FAQ</a></li>
                <li><a href="/suggest" onclick="window.cf.nav('/suggest');return false;">Suggest a Design</a></li>
              </ul>
            </div>

            <div class="footer-col">
              <h3>Contact</h3>
              <ul>
                <li><a href="mailto:support@chitraframe.in">support@chitraframe.in</a></li>
                <li><a href="tel:+917989531818">+91 79895 31818</a></li>
                <li><span>Hyderabad, Telangana</span></li>
                <li class="pt-2"><a href="${escapeHTML(waLink)}" target="_blank" rel="noopener noreferrer" class="footer-whatsapp-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20.5 3.5A11.5 11.5 0 0 0 1.5 12.4a11.4 11.4 0 0 0 1.5 5.6L1.5 22.5l4.6-1.5a11.5 11.5 0 0 0 5.9 1.6 11.5 11.5 0 0 0 8.5-19.6z" fill="currentColor"/></svg>
                  Chat on WhatsApp
                </a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <div class="container">
          <p>© ${year} ChitraFrame. All rights reserved.</p>
          <div class="footer-bottom-links">
            <a href="/policy/privacy" onclick="window.cf.nav('/policy/privacy');return false;">Privacy</a>
            <a href="/policy/terms" onclick="window.cf.nav('/policy/terms');return false;">Terms</a>
            <a href="/policy/shipping" onclick="window.cf.nav('/policy/shipping');return false;">Shipping</a>
          </div>
        </div>
      </div>
    </footer>

    <a href="${escapeHTML(waLink)}" target="_blank" rel="noopener noreferrer" class="whatsapp-widget" aria-label="Chat on WhatsApp">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20.5 3.5A11.5 11.5 0 0 0 1.5 12.4a11.4 11.4 0 0 0 1.5 5.6L1.5 22.5l4.6-1.5a11.5 11.5 0 0 0 5.9 1.6 11.5 11.5 0 0 0 8.5-19.6z" fill="white"/></svg>
    </a>`;
  }

  // ── HOME PAGE ─────────────────────────────────────────────────────────────
  // FIX s8.1b: WebGL hero canvas dead code removed — initHeroCanvas() was disabled
  // (the call was already commented out at line ~1084). Removed ~60-line function body.

  async function renderHomePage(app) {
    if (window._heroCanvasCleanup) { window._heroCanvasCleanup(); window._heroCanvasCleanup = null; }
    document.title = 'ChitraFrame | Buy Framed Art Prints Online India — Divine, Automotive, Sports';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', 'Buy premium framed art prints online in India. Divine & spiritual art, automotive legends, sports heroes, wildlife — museum-quality printing, Black or Natural Wood frames, free shipping above ₹899. Starting ₹499.');
    trackEvent('page_view', { page_title: 'Home', page_location: location.href });

    app.innerHTML = renderHeader() + `
    <main id="main-content">

      <!-- ══ HERO — Editorial Split ══ -->
      <section class="hero-v2" aria-labelledby="hero-h1" itemscope itemtype="https://schema.org/WebPage">

        <!-- Hero cards panel: featured product + custom frame -->
        <div class="hero-v2-visual" aria-hidden="false">
          <div class="hero-cards-wrap">

            <!-- Card 1: Top-converting product (loaded dynamically from API) -->
            <div class="hero-product-card" id="hero-product-card">
              <!-- skeleton while loading -->
              <div class="hero-card-skeleton" id="hero-card-skeleton">
                <div class="hero-card-skeleton-img"></div>
                <div class="hero-card-skeleton-body">
                  <div class="hero-card-skeleton-line" style="width:60%"></div>
                  <div class="hero-card-skeleton-line" style="width:40%"></div>
                  <div class="hero-card-skeleton-btn"></div>
                </div>
              </div>
            </div>

            <!-- Card 2: Custom Frame — fixed promo card -->
            <button class="hero-custom-card" onclick="window.cf.nav('/customize')" aria-label="Order a custom photo frame">
              <div class="hero-custom-card-inner">
                <div class="hero-custom-frame-icon" aria-hidden="true">
                  <div class="hcf-frame-outer">
                    <div class="hcf-frame-mat">
                      <svg viewBox="0 0 60 72" fill="none" width="60" height="72">
                        <rect width="60" height="72" fill="#1a1a2e"/>
                        <circle cx="30" cy="30" r="16" fill="none" stroke="rgba(201,151,58,0.5)" stroke-width="1"/>
                        <circle cx="30" cy="24" r="7" fill="rgba(201,151,58,0.2)"/>
                        <path d="M16 50 Q30 40 44 50" stroke="rgba(201,151,58,0.5)" stroke-width="1.2" fill="none"/>
                        <text x="30" y="66" text-anchor="middle" fill="rgba(201,151,58,0.5)" font-size="5" font-family="serif">Your Photo</text>
                      </svg>
                    </div>
                  </div>
                </div>
                <div class="hero-custom-card-body">
                  <span class="hero-custom-eyebrow">Bespoke Framing</span>
                  <strong class="hero-custom-title">Custom Photo Frame</strong>
                  <span class="hero-custom-sub">Your memory, museum-quality</span>
                  <div class="hero-custom-meta">
                    <span class="hero-custom-price">From ₹499</span>
                    <span class="hero-custom-ships">Ships in 3–5 days</span>
                  </div>
                </div>
                <div class="hero-custom-cta" aria-hidden="true">
                  <span>Frame It</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
              </div>
            </button>

          </div>
          <!-- floating price chip -->
          <div class="hero-v2-price-chip">Starting ₹499</div>
        </div>

        <!-- Right panel: copy -->
        <div class="hero-v2-copy" data-reveal>
          <p class="hero-v2-eyebrow">Framed Art Prints · Delivered Across India</p>
          <h1 class="hero-v2-h1" id="hero-h1" itemprop="name">
            Walls that speak<br>
            <em>your story</em>
          </h1>
          <div class="hero-v2-rating">
            <span class="hero-v2-rating-stars">★★★★★</span>
            <span class="hero-v2-rating-text">4.9 · Verified orders across India</span>
          </div>
          <p class="hero-v2-sub" itemprop="description">
            Archival-quality prints in handcrafted Black or Natural Wood frames.
            Divine, Automotive, Sports &amp; Wildlife — curated designs, 4 sizes.
            Ships in 3–5 days, anywhere in India.
          </p>

          <div class="hero-v2-actions">
            <button class="hero-v2-cta" id="hero-primary-cta" onclick="window.cf.nav('/shop');trackEvent('hero_cta',{variant:ABTest.get('hero_cta'),button:'primary'})" aria-label="Shop all premium framed art prints">
              <span id="hero-cta-text">Shop All Prints</span>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 7.5h9M9 4l3.5 3.5L9 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <button class="hero-v2-ghost" onclick="window.cf.nav('/customize');trackEvent('hero_cta',{variant:ABTest.get('hero_cta'),button:'secondary'})">
              Custom Frame →
            </button>
          </div>

          <div class="hero-v2-pills">
            <span class="hero-v2-pill">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6l3 3 7-7" stroke="var(--green)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Free delivery above ₹899
            </span>
            <span class="hero-v2-pill">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1l1.4 2.9L10.5 4.5l-2.3 2.2.5 3.1L6 8.4l-2.7 1.4.5-3.1L1.5 4.5l3.1-.6L6 1z" fill="var(--gold)"/></svg>
              4.9 · Verified buyers
            </span>
            <span class="hero-v2-pill">
              COD available
            </span>
          </div>

          <!-- Category scroll on mobile -->
          <div class="hero-v2-cats" role="navigation" aria-label="Product categories">
            <button class="hero-v2-cat" onclick="window.cf.nav('/category/spiritual')">🙏 Divine</button>
            <button class="hero-v2-cat" onclick="window.cf.nav('/category/automotive')">🚗 Cars</button>
            <button class="hero-v2-cat" onclick="window.cf.nav('/category/sports')">🏏 Sports</button>
            <button class="hero-v2-cat" onclick="window.cf.nav('/category/wildlife')">🦁 Wildlife</button>
            <button class="hero-v2-cat" onclick="window.cf.nav('/customize')">✏️ Custom</button>
          </div>
        </div>
      </section>

      <!-- ══ BENEFITS BAR ══ -->
      <div class="benefits-bar" aria-label="Key benefits">
        <div class="benefits-bar-inner">
          ${[
            { icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1l1.8 3.7L14 5.6l-3 2.9.7 4L8 10.6l-3.7 1.9.7-4L2 5.6l4.2-.9L8 1z" fill="var(--gold)"/></svg>`, text: 'Museum-quality printing' },
            { icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 7l4 4 8-8" stroke="var(--green)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`, text: 'Free delivery above ₹899' },
            { icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="5" width="12" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 5V4a3 3 0 0 1 6 0v1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`, text: 'COD + Secure checkout' },
            { icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M8 5v3l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`, text: 'Ships in 3–5 days' },
            { icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 10l2.5 3.5L13 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`, text: 'Replacement guarantee' },
          ].map(b => `<div class="benefits-bar-item">${b.icon}<span>${b.text}</span></div>`).join('<div class="benefits-bar-sep"></div>')}
        </div>
      </div>

      <!-- ══ TRUST MARQUEE (mobile only) ══ -->
      <div class="trust-marquee" aria-hidden="true">
        <div class="trust-marquee-track">
          ${[
            'Museum-quality printing',
            'Free delivery above ₹899',
            'COD available pan-India',
            'Ships in 3–5 days',
            'Replacement guarantee',
            '4.9★ Verified buyers',
            'Handcrafted frames',
            'Made to order — freshly printed',
          ].concat([
            'Museum-quality printing',
            'Free delivery above ₹899',
            'COD available pan-India',
            'Ships in 3–5 days',
            'Replacement guarantee',
            '4.9★ Verified buyers',
            'Handcrafted frames',
            'Made to order — freshly printed',
          ]).map(t => `<span class="trust-marquee-item"><span class="trust-marquee-dot"></span>${t}</span>`).join('')}
        </div>
      </div>

      <!-- ══ COLLECTIONS ══ -->
      <section class="section" aria-labelledby="collections-heading">
        <div class="container">
          <div class="section-header" data-reveal>
            <p class="section-eyebrow">Curated collections</p>
            <h2 class="section-title" id="collections-heading">Shop by Theme</h2>
            <p class="section-sub">From divine devotion to roaring engines — find what moves you.</p>
          </div>
          <div class="categories-grid" id="categories-grid">
            ${renderCategoryCards()}
          </div>
        </div>
      </section>

      <!-- ══ FEATURED PRODUCTS ══ -->
      <section class="section section-alt" aria-labelledby="featured-heading">
        <div class="container">
          <div class="section-header" data-reveal>
            <p class="section-eyebrow">This week's bestsellers</p>
            <h2 class="section-title" id="featured-heading">Most Loved Prints</h2>
            <a href="/shop" onclick="window.cf.nav('/shop');return false;" class="section-link">
              View all designs
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>
          </div>
          <div class="products-grid" id="featured-products">
            ${renderFeaturedProducts()}
          </div>
        </div>
      </section>

      <!-- ══ WHY CHITRAFRAME ══ -->
      <section class="why-section" aria-labelledby="why-heading">
        <div class="container">
          <div class="section-header" data-reveal>
            <p class="section-eyebrow">Why ChitraFrame</p>
            <h2 class="section-title" id="why-heading">Gallery Quality. Doorstep Price.</h2>
            <p class="section-sub">Every order is freshly printed and framed — no pre-made stock, no compromise.</p>
          </div>
          <div class="why-grid">
            <div class="why-card" data-reveal>
              <div class="why-icon">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="12" stroke="var(--gold)" stroke-width="1.4"/><path d="M9 14l3 3 7-7" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <h3>Archival Pigment Inks</h3>
              <p>Professional-grade archival inks — colours stay vivid for years. Printed fresh for every order, never stock.</p>
            </div>
            <div class="why-card" data-reveal data-reveal-delay="1">
              <div class="why-icon">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="22" height="22" rx="4" stroke="var(--gold)" stroke-width="1.4"/><rect x="7" y="7" width="14" height="14" rx="2" stroke="var(--gold)" stroke-width="1" opacity="0.5"/></svg>
              </div>
              <h3>Handcrafted Frames</h3>
              <p>Solid wood moulding, acid-free mat board. Black Classic Matte or Natural Wood Oak — both finished by hand.</p>
            </div>
            <div class="why-card" data-reveal data-reveal-delay="2">
              <div class="why-icon">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M4 14h20M16 6l8 8-8 8" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <h3>Pan-India Delivery</h3>
              <p>Ships to every Indian pin code in 3–5 business days. Carefully packed. Arrives ready to hang.</p>
            </div>
            <div class="why-card" data-reveal data-reveal-delay="3">
              <div class="why-icon">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 3l2.4 7.4H24L17.8 15l2.3 7.1L14 18l-6.1 4.1L10.2 15 4 10.4h7.6L14 3z" stroke="var(--gold)" stroke-width="1.4" stroke-linejoin="round"/></svg>
              </div>
              <h3>Every Order, Handcrafted</h3>
              <p>Real orders from customers across India. Each print made fresh — never pre-stocked, never mass-produced.</p>
            </div>
            <div class="why-card" data-reveal data-reveal-delay="1">
              <div class="why-icon">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M6 14a8 8 0 1 1 16 0 8 8 0 0 1-16 0z" stroke="var(--gold)" stroke-width="1.4"/><path d="M14 10v4l3 3" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round"/></svg>
              </div>
              <h3>Made-to-Order</h3>
              <p>Every frame is printed and assembled only after you place your order. Fresh every time, no shelf dust.</p>
            </div>
            <div class="why-card" data-reveal data-reveal-delay="2">
              <div class="why-icon">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M7 12h14M7 16h14M12 3v3M16 3v3M12 22v3M16 22v3" stroke="var(--gold)" stroke-width="1.4" stroke-linecap="round"/><rect x="4" y="6" width="20" height="16" rx="3" stroke="var(--gold)" stroke-width="1.4"/></svg>
              </div>
              <h3>Replacement Guarantee</h3>
              <p>If your print arrives damaged, we replace it free. No lengthy return forms — just share a photo and we act.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ══ EDITORIAL SPOTLIGHT 1 — Automotive ══ -->
      <section class="editorial-block" aria-label="Automotive art print spotlight">
        <div class="editorial-inner">
          <div class="editorial-image" data-reveal>
            <img src="${DESIGN_IMAGES['porsche-911-pacific-coast']}" alt="Porsche 911 Pacific Coast retro art print in premium black frame" loading="lazy" width="600" height="800">
            <div class="editorial-image-badge">From ₹749</div>
          </div>
          <div class="editorial-content" data-reveal data-reveal-delay="1">
            <span class="section-eyebrow">Automotive Collection</span>
            <h2 class="editorial-title">For those who feel<br>every corner</h2>
            <p class="editorial-desc">The Porsche 911 Pacific Coast — a retro art print that captures the romance of the open highway. Warm sunset tones, lush typography, gallery-framed and ready to hang. The art enthusiast's alternative to a poster.</p>
            <ul class="editorial-bullets">
              <li>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                4 sizes: Small (8×10") to XL (24×36")
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Black or Natural Wood frame finish
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Ships fully assembled, wall-ready
              </li>
            </ul>
            <div class="editorial-ctas">
              <button class="btn-primary" onclick="window.cf.nav('/product/porsche-911-pacific-coast')">
                View This Print
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button class="btn-outline" onclick="window.cf.nav('/category/automotive')">All Automotive Art</button>
            </div>
          </div>
        </div>
      </section>

      <!-- ══ SOCIAL PROOF BAR ══ -->
      <div class="proof-bar" aria-label="Social proof">
        <div class="container">
          <div class="proof-bar-inner">
            <div class="proof-stat" data-reveal>
              <span class="proof-num" id="proof-order-count">—</span>
              <span class="proof-label">Orders Fulfilled</span>
            </div>
            <div class="proof-divider"></div>
            <div class="proof-stat" data-reveal data-reveal-delay="1">
              <span class="proof-num">4.9 ★</span>
              <span class="proof-label">Verified Rating</span>
            </div>
            <div class="proof-divider"></div>
            <div class="proof-stat" data-reveal data-reveal-delay="2">
              <span class="proof-num" id="proof-design-count">—</span>
              <span class="proof-label">Unique Designs</span>
            </div>
            <div class="proof-divider"></div>
            <div class="proof-stat" data-reveal data-reveal-delay="3">
              <span class="proof-num">Pan-India</span>
              <span class="proof-label">Delivery</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ EDITORIAL SPOTLIGHT 2 — Divine ══ -->
      <section class="editorial-block editorial-reverse" aria-label="Divine spiritual art print spotlight">
        <div class="editorial-inner">
          <div class="editorial-image" data-reveal>
            <img src="${DESIGN_IMAGES['mahadev-cosmic-trance']}" alt="Mahadev Lord Shiva Cosmic Trance framed art print for pooja room" loading="lazy" width="600" height="800">
            <div class="editorial-image-badge">From ₹449</div>
          </div>
          <div class="editorial-content" data-reveal data-reveal-delay="1">
            <span class="section-eyebrow">Divine Collection</span>
            <h2 class="editorial-title">Bless your home<br>with divine energy</h2>
            <p class="editorial-desc">The Mahadev Cosmic Trance — Lord Shiva as a luminous silhouette against swirling nebulae. Deep blues, cosmic purples and sacred gold radiate peace and transcendence. India's favourite devotional wall art, now in museum-grade frames.</p>
            <ul class="editorial-bullets">
              <li>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Perfect for puja rooms, living rooms &amp; gifting
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Vivid pigment inks — colours last 100+ years
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Ready to hang — hardware included
              </li>
            </ul>
            <div class="editorial-ctas">
              <button class="btn-primary" onclick="window.cf.nav('/product/mahadev-cosmic-trance')">
                View This Print
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button class="btn-outline" onclick="window.cf.nav('/category/spiritual')">All Divine Art</button>
            </div>
          </div>
        </div>
      </section>

      <!-- ══ REVIEWS ══ -->
      <section class="section reviews-section" aria-labelledby="reviews-heading" itemscope itemtype="https://schema.org/Product">
        <meta itemprop="name" content="ChitraFrame Framed Art Prints">
        <div class="container">
          <div class="section-header" data-reveal>
            <p class="section-eyebrow">Verified customer stories</p>
            <h2 class="section-title" id="reviews-heading">What our customers say</h2>
            <div class="review-aggregate">
              <div class="review-stars-bar">★★★★★</div>
              <span id="reviews-aggregate-label"><strong>4.9 / 5</strong> · Verified buyers</span>
            </div>
          </div>
          <div class="reviews-grid">
            ${renderStaticReviews()}
          </div>
          <div class="reviews-cta" data-reveal>
            <p>Have a ChitraFrame at home?</p>
            <button class="btn-outline" onclick="window.cf.nav('/review')">Share Your Review →</button>
          </div>
        </div>
      </section>

      <!-- ══ FAQ (SEO + AI answer-box targeting) ══ -->
      <section class="faq-section" aria-labelledby="faq-heading" itemscope itemtype="https://schema.org/FAQPage">
        <div class="container">
          <div class="section-header" data-reveal>
            <p class="section-eyebrow">Quick answers</p>
            <h2 class="section-title" id="faq-heading">Frequently Asked Questions</h2>
          </div>
          <div class="faq-grid">
            ${[
              { q: 'Where can I buy framed art prints online in India?', a: 'ChitraFrame ships premium framed art prints to all major cities across India — Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Pune, Kolkata and beyond. Order at chitraframe.in and get delivery in 3–5 business days.' },
              { q: 'What sizes are available for framed wall art?', a: 'We offer four standard sizes: Small (8×12 inches), Medium (12×18 inches), Large (16×20 inches), and XL (20×30 inches). All sizes are available in Standard and Premium frame finishes. Prices start at ₹449 for Small.' },
              { q: 'What frame finishes does ChitraFrame offer?', a: 'We offer two premium frame finishes: Classic Matte Black (contemporary, versatile) and Natural Wood Oak (warm, rustic). Both use solid wood moulding and solid wood backing for a premium finish.' },
              { q: 'Is Cash on Delivery available?', a: 'Yes — COD is available across India on orders between ₹499 and ₹1,995. A nominal ₹49 COD handling fee applies. For online payment (UPI, cards), you save ₹50 automatically.' },
              { q: 'How is the art print packed for shipping?', a: 'Every frame is bubble-wrapped and placed in a custom rigid cardboard box with foam padding on all sides. We have a near-zero transit damage rate. In the rare case of damage, we replace it free.' },
              { q: 'Can I order a custom frame with my own photo?', a: 'Yes! Use our Custom Frame page to choose your size and finish, then WhatsApp your image to us after ordering. We send a digital proof within 24 hours before printing.' },
            ].map(f => `
              <div class="faq-item" data-reveal itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
                <h3 class="faq-q" itemprop="name">${escapeHTML(f.q)}</h3>
                <div class="faq-a" itemprop="acceptedAnswer" itemscope itemtype="https://schema.org/Answer">
                  <p itemprop="text">${escapeHTML(f.a)}</p>
                </div>
              </div>`).join('')}
          </div>
        </div>
      </section>

      <!-- ══ NEWSLETTER ══ -->
      <section class="newsletter-section" aria-labelledby="newsletter-heading">
        <div class="container">
          <div class="newsletter-inner" data-reveal>
            <div class="newsletter-text">
              <div class="newsletter-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M4 8h24l-12 11L4 8z" stroke="var(--gold)" stroke-width="1.5" stroke-linejoin="round"/><path d="M4 8v16h24V8" stroke="var(--gold)" stroke-width="1.5" stroke-linejoin="round"/></svg>
              </div>
              <h2 class="newsletter-title" id="newsletter-heading">New designs. Members first.</h2>
              <p>Get early access to new designs, exclusive offers, and wall-styling tips. Zero spam.</p>
            </div>
            <form class="newsletter-form" id="newsletter-form" onsubmit="window.cf.handleNewsletter(event)">
              <input type="email" name="email" placeholder="Enter your email" required autocomplete="email" aria-label="Email address">
              <button type="submit" class="btn-primary">
                Subscribe Free
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </form>
          </div>
        </div>
      </section>

    </main>
    ${renderFooter()}`;

    initMobileMenu();
    initStickyHeader();
    setTimeout(initReveal, 100);
    loadConfig();
    // Hero canvas disabled — using editorial v2 hero
    // setTimeout(initHeroCanvas, 50);
    setTimeout(loadFeaturedProducts, 50);
    setTimeout(loadHeroProductCard, 30);
    setTimeout(loadProofStats, 100);
    // A/B test: update CTA text after render
    setTimeout(() => {
      const ctaEl = document.getElementById('hero-cta-text');
      if (ctaEl) ctaEl.textContent = ABTest.heroCTA();
      trackEvent('view_hero', { cta_variant: ABTest.get('hero_cta'), page: 'home' });
    }, 50);
    // Inject FAQ Schema for home page
    injectHomeFAQSchema();
  }

  function injectHomeFAQSchema() {
    if (document.getElementById('faq-schema')) return;
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'What types of framed art prints does ChitraFrame offer?', acceptedAnswer: { '@type': 'Answer', text: 'ChitraFrame offers premium framed art prints across 6 categories: Divine & Spiritual (Radha Krishna, Mahadev), Automotive (BMW M4, Porsche 911, Lamborghini, F1), Sports (Cricket), Wildlife (Lion), Anime & JDM, and Motivational. Available in 4 sizes with Black Frame or Natural Wood Frame options. Prices start at ₹499.' } },
        { '@type': 'Question', name: 'What are the frame options at ChitraFrame?', acceptedAnswer: { '@type': 'Answer', text: 'ChitraFrame offers two premium frame types: (1) Black Frame — matte black solid wood moulding, museum-grade finish, ideal for modern and minimalist spaces; (2) Natural Wood Frame — warm honey-toned real wood, perfect for traditional and warm interiors. Both frames come with UV-protective acrylic glazing and acid-free mat board.' } },
        { '@type': 'Question', name: 'How long does delivery take for framed art prints?', acceptedAnswer: { '@type': 'Answer', text: 'ChitraFrame delivers across India in 3–5 business days. Orders are dispatched within 24 hours of payment confirmation via Shiprocket courier partners. Free shipping on orders above ₹899. COD available across most pincodes.' } },
        { '@type': 'Question', name: 'What sizes are available for framed art prints?', acceptedAnswer: { '@type': 'Answer', text: 'ChitraFrame art prints are available in 4 sizes: A4 (8.3×11.7 inches), A3 (11.7×16.5 inches), A2 (16.5×23.4 inches), and A1 (23.4×33.1 inches). Each size is available in all frame types and designs.' } },
        { '@type': 'Question', name: 'Is COD (Cash on Delivery) available?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, Cash on Delivery (COD) is available on ChitraFrame for orders above ₹499 and below ₹1,995 across most Indian pincodes. A handling fee of ₹49 applies for COD orders. Online payment (UPI/Card) gets a ₹50 discount.' } },
        { '@type': 'Question', name: 'How are the frames packed for delivery?', acceptedAnswer: { '@type': 'Answer', text: 'Each ChitraFrame order is bubble-wrapped in multiple layers, corner-protected, and packed in a custom rigid cardboard box designed to prevent breakage in transit. We use shatterproof acrylic (perspex) instead of glass for safe delivery across India.' } }
      ]
    };
    const s = document.createElement('script');
    s.id = 'faq-schema';
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(schema);
    document.head.appendChild(s);
  }

  function renderCategoryCards() {
    const categories = [
      { slug: 'spiritual', label: 'Divine & Spiritual', sub: '3 designs', cta: 'Puja rooms, meditation spaces', img: DESIGN_IMAGES['mahadev-cosmic-trance'], color: '#12103a' },
      { slug: 'automotive', label: 'Automotive Art', sub: '5 designs', cta: 'Car lovers, garage walls', img: DESIGN_IMAGES['porsche-911-pacific-coast'], color: '#071525' },
      { slug: 'sports', label: 'Sports Legends', sub: '1 design', cta: 'Cricket, football, motorsport', img: DESIGN_IMAGES['cricket-glory-moment'], color: '#001030' },
      { slug: 'wildlife', label: 'Wildlife', sub: '1 design', cta: 'Living rooms, offices', img: DESIGN_IMAGES['lion-geometric-gold'], color: '#1a1100' },
      { slug: 'anime', label: 'Anime & JDM', sub: '2 designs', cta: 'Gaming rooms, gift ideas', img: DESIGN_IMAGES['nissan-gtr-r34-osaka-rain'], color: '#14001a' },
      { slug: 'motivational', label: 'Motivational', sub: '2 designs', cta: 'Home office, gym walls', img: DESIGN_IMAGES['f1-redbull-racing'], color: '#0a0a0a' },
    ];

    return categories.map((cat, i) => `
      <a class="cat-card" data-reveal data-reveal-delay="${i % 3}"
        href="/category/${cat.slug}"
        onclick="window.cf.nav('/category/${cat.slug}');return false;"
        aria-label="Shop ${escapeHTML(cat.label)} art prints">
        <img src="${escapeHTML(cat.img)}" alt="${escapeHTML(cat.label)} framed art prints India" loading="lazy" width="400" height="520">
        <div class="cat-card-overlay"></div>
        <div class="cat-card-body">
          <span class="cat-card-sub">${escapeHTML(cat.sub)}</span>
          <span class="cat-card-label">${escapeHTML(cat.label)}</span>
          <span class="cat-card-arrow">
            Shop now
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
        </div>
      </a>`).join('');
  }

  // ── NORMALISE ─────────────────────────────────────────────────────────────
  // Converts raw Supabase product shape → internal render format
  function normaliseProduct(p) {
    const images = p.images || [];
    const sorted = [...images].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const imageUrl = sorted[0]?.image_url || p.og_image_url || p.image_url || DESIGN_IMAGES[p.slug] || cldUrl(p.slug, 600);
    const variants = (p.variants || []).filter(v => v.is_active !== false);
    const price = variants.length > 0 ? Math.min(...variants.map(v => Number(v.price) || 9999)) : (p.base_price || 599);
    const catName = (typeof p.category === 'object' && p.category?.name) ? p.category.name : (p.category || '');
    const catSlug = (typeof p.category === 'object' && p.category?.slug) ? p.category.slug : catName.toLowerCase();
    return { slug: p.slug, name: p.name, category: catName, categorySlug: catSlug, price, image: imageUrl, badge: p.badge || (p.is_featured ? 'Featured' : ''), _raw: p };
  }

  // Skeleton placeholder — renders instantly while API loads
  function renderFeaturedProducts() {
    return `<div class="products-grid-skeleton">
      ${[0,1,2,3,4,5,6,7].map(() => `<div class="pc pc-skeleton"></div>`).join('')}
    </div>`;
  }

  // Async loader — replaces skeleton with real Supabase data
  async function loadFeaturedProducts() {
    const grid = document.getElementById('featured-products');
    if (!grid) return;
    try {
      const res = await fetch(`${API}/products?limit=8&sort=popular`, { headers: { 'Cache-Control': 'no-cache' } });
      if (!res.ok) throw new Error('api error');
      const data = await res.json();
      const products = (data.products || []).map(normaliseProduct);
      if (products.length > 0) {
        grid.innerHTML = products.map((p, i) => renderProductCard(p, i)).join('');
        window._allProducts = products;
        setTimeout(initReveal, 80);
      }
    } catch (e) { /* keep skeleton visible on failure */ }
  }

  // Hero product card — loads #1 bestseller from API, falls back to hardcoded
  async function loadHeroProductCard() {
    const wrap = document.getElementById('hero-product-card');
    const skeleton = document.getElementById('hero-card-skeleton');
    if (!wrap) return;

    // Fallback product if API is slow / fails
    const fallback = {
      slug: 'mahadev-cosmic-trance',
      name: 'Mahadev Cosmic Trance',
      category: 'Spiritual',
      price: 649,
      image: DESIGN_IMAGES['mahadev-cosmic-trance'],
      badge: 'Bestseller'
    };

    let product = fallback;
    try {
      const res = await fetch(`${API}/products?limit=1&sort=popular`, { headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) {
        const data = await res.json();
        const top = (data.products || [])[0];
        if (top) product = normaliseProduct(top);
      }
    } catch (e) { /* use fallback */ }

    const img = escapeHTML(product.image || cldUrl(product.slug, 400));
    const slug = escapeHTML(product.slug);
    const name = escapeHTML(product.name);
    const cat = escapeHTML(product.category || '');
    const badge = escapeHTML(product.badge || 'Bestseller');
    const price = formatPrice(product.price);

    wrap.innerHTML = `
      <button class="hero-product-card-inner" onclick="window.cf.nav('/product/${slug}')" aria-label="View ${name}">
        <div class="hero-pc-img-wrap">
          <img src="${img}" alt="${name} framed art print" loading="eager" fetchpriority="high" width="400" height="500">
          <span class="hero-pc-badge">${badge}</span>
          <div class="hero-pc-overlay">
            <span class="hero-pc-overlay-cta">View Print →</span>
          </div>
        </div>
        <div class="hero-pc-info">
          <span class="hero-pc-cat">${cat}</span>
          <strong class="hero-pc-name">${name}</strong>
          <div class="hero-pc-bottom">
            <span class="hero-pc-price">
              <span class="hero-pc-from">from</span> ${price}
            </span>
            <span class="hero-pc-rating">★ 4.9</span>
          </div>
        </div>
      </button>`;
  }

  function renderProductCard(p, idx = 0) {
    const variantId = `${p.slug}-medium-black`;
    const badge = p.badge || (idx === 0 ? 'Bestseller' : idx === 1 ? 'New' : '');
    const slug = escapeHTML(p.slug);
    const name = escapeHTML(p.name);
    const cat = escapeHTML(p.category || '');
    // Determine compare price for savings badge
    const comparePrice = p.compare_price || p.compare_at_price || 0;
    const savingsAmt = comparePrice > p.price ? Math.round(comparePrice - p.price) : 0;
    const savingsPct = savingsAmt > 0 ? Math.round((savingsAmt / comparePrice) * 100) : 0;
    // Use WebP-aware picture element for product images
    const imgHtml = cldPicture(p.slug, `${p.name} framed art print — ChitraFrame`, [400, 600, 800], '', 'lazy');
    return `
    <article class="pc" data-reveal data-reveal-delay="${idx % 4}" role="article" itemscope itemtype="https://schema.org/Product" onclick="window.cf.nav('/product/${slug}');trackEvent('select_item',{item_id:'${slug}',item_name:'${name}',index:${idx}})" style="cursor:pointer">
      <meta itemprop="name" content="${name} — Framed Art Print">
      <meta itemprop="brand" content="ChitraFrame">
      <div class="pc-img-wrap" aria-label="View ${name}">
        ${imgHtml}
        ${badge ? `<span class="pc-badge">${escapeHTML(badge)}</span>` : ''}
        ${savingsPct >= 10 ? `<span class="pc-badge pc-badge-save" style="left:auto;right:12px;background:var(--red)">−${savingsPct}%</span>` : ''}
        <!-- Single hover overlay — no conflict, no overlap -->
        <div class="pc-hover">
          <button class="pc-atc" onclick="event.preventDefault();event.stopPropagation();window.cf.quickAdd('${escapeHTML(variantId)}','${name}',${p.price},'${escapeHTML(p.image || cldUrl(p.slug, 200))}','${slug}');trackEvent('add_to_cart',{item_id:'${slug}',item_name:'${name}',price:${p.price},currency:'INR'})" aria-label="Add ${name} to cart">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1 1.5h2l1.8 7.5h7l1.7-5.5H4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5.5" cy="12.5" r="1.2" fill="currentColor"/><circle cx="10.5" cy="12.5" r="1.2" fill="currentColor"/></svg>
            Add to Cart
          </button>
        </div>
      </div>
      <div class="pc-info">
        <div class="pc-meta">
          <span class="pc-cat">${cat}</span>
          <span class="pc-stars" aria-label="4.9 stars">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="var(--gold)"><path d="M5 1l1 2.1L8.5 3.5l-1.8 1.8.4 2.5L5 6.6 2.9 7.8l.4-2.5L1.5 3.5l2.5-.4L5 1z"/></svg>
            4.9
          </span>
        </div>
        <h3 class="pc-name">
          <a href="/product/${slug}" onclick="event.stopPropagation();window.cf.nav('/product/${slug}');return false;" itemprop="url">${name}</a>
        </h3>
        <div class="pc-price" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
          <meta itemprop="priceCurrency" content="INR">
          <meta itemprop="price" content="${p.price}">
          <meta itemprop="availability" content="https://schema.org/InStock">
          <meta itemprop="url" content="https://chitraframe.in/product/${slug}">
          <span class="pc-price-amt">${formatPrice(p.price)}</span>
          ${comparePrice > p.price ? `<span class="pc-price-compare" style="text-decoration:line-through;font-size:12px;color:var(--ink-400);margin-left:6px">${formatPrice(comparePrice)}</span>` : `<span class="pc-price-sizes" style="font-size:11px;color:var(--ink-400);margin-left:6px">4 sizes available</span>`}
        </div>
      </div>
    </article>`;
  }

  // FIX 2.2: Replace static fake reviews with live API call + skeleton loader
  function renderStaticReviews() {
    // Render skeleton — real reviews loaded async by loadReviews()
    setTimeout(loadReviews, 80);
    return `<div class="reviews-carousel" id="reviews-grid">
      ${[0,1,2].map(() => `
        <div class="review-card" style="opacity:0.4;pointer-events:none">
          <div class="review-card-top">
            <div class="review-avatar" style="background:var(--warm-200);width:40px;height:40px;border-radius:50%"></div>
            <div class="review-author-block">
              <div class="pc-skeleton" style="width:80px;height:14px;border-radius:4px;margin-bottom:6px"></div>
              <div class="pc-skeleton" style="width:60px;height:12px;border-radius:4px"></div>
            </div>
          </div>
          <div class="pc-skeleton" style="width:100%;height:60px;border-radius:6px;margin:12px 0"></div>
          <div class="pc-skeleton" style="width:60%;height:12px;border-radius:4px"></div>
        </div>`).join('')}
    </div>`;
  }

  function renderReviewCard(r, i) {
    const initials = (r.customer_name || 'A').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const bgColors = ['#1a1a2e','#1a1050','#001233','#1a0a3a','#1a1000','#1a0505','#12103a','#071525'];
    const color = bgColors[i % bgColors.length];
    const rating = Math.min(5, Math.max(1, r.rating || 5));
    return `
      <div class="review-card" data-reveal data-reveal-delay="${i % 3}" itemscope itemprop="review" itemtype="https://schema.org/Review">
        <div class="review-card-top">
          <div class="review-avatar" style="background:${color}" aria-hidden="true">${escapeHTML(initials)}</div>
          <div class="review-author-block">
            <strong itemprop="author">${escapeHTML(r.customer_name || 'Customer')}</strong>
            <span class="review-city">${escapeHTML(r.city || 'India')}</span>
          </div>
          ${r.is_verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
        </div>
        <div class="review-stars" itemprop="reviewRating" itemscope itemtype="https://schema.org/Rating">
          <meta itemprop="ratingValue" content="${rating}">
          ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}
        </div>
        <p class="review-text" itemprop="reviewBody">"${escapeHTML(r.body || r.review_body || '')}"</p>
        ${r.product_name ? `<div class="review-product-tag">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="1" y="1" width="8" height="8" rx="1.5" stroke="var(--ink-400)" stroke-width="1"/><rect x="2.5" y="2.5" width="5" height="5" rx="1" fill="var(--ink-200)"/></svg>
          ${escapeHTML(r.product_name)}
        </div>` : ''}
      </div>`;
  }

  async function loadReviews() {
    const grid = document.getElementById('reviews-grid');
    if (!grid) return;
    try {
      const res = await fetch(`${API}/reviews?limit=6&approved=true`, { headers: { 'Cache-Control': 'no-cache' } });
      if (!res.ok) throw new Error('reviews api error');
      const data = await res.json();
      const reviews = data.reviews || data || [];
      if (reviews.length > 0) {
        grid.innerHTML = reviews.map((r, i) => renderReviewCard(r, i)).join('');
        setTimeout(initReveal, 80);
        // Update review count in heading
        const heading = document.getElementById('reviews-heading');
        if (heading && reviews.length > 0) {
          heading.textContent = 'What our customers say';
        }
      } else {
        // No reviews yet — honest empty state
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--ink-400)">
          <p style="font-size:15px;margin-bottom:12px">Be the first to share your experience!</p>
          <button class="btn-outline" onclick="window.cf.nav('/review')">Write a Review →</button>
        </div>`;
      }
    } catch(e) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--ink-400)">
        <p>Reviews loading failed. <button onclick="loadReviews()" style="color:var(--gold);background:none;border:none;cursor:pointer;font-weight:600">Retry</button></p>
      </div>`;
    }
  }

  // FIX 2.3: Load real product count from API
  async function loadProofStats() {
    try {
      const res = await fetch(`${API}/products?count=true`, { headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) {
        const data = await res.json();
        const countEl = document.getElementById('proof-design-count');
        if (countEl && data.count) countEl.textContent = data.count;
      }
    } catch(e) { /* silent — element stays as '—' */ }
    // Load order count
    try {
      const res2 = await fetch(`${API}/orders/count`, { headers: { 'Cache-Control': 'no-cache' } });
      if (res2.ok) {
        const data2 = await res2.json();
        const orderEl = document.getElementById('proof-order-count');
        if (orderEl && data2.count) {
          orderEl.textContent = data2.count >= 100 ? data2.count + '+' : data2.count;
        }
      }
    } catch(e) { /* silent */ }
  }

  // ── SHOP PAGE ─────────────────────────────────────────────────────────────
  async function renderShopPage(app) {
    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <div class="page-hero-simple">
        <div class="container">
          <p class="section-eyebrow">All Products</p>
          <h1>The Full Collection</h1>
          <p class="page-hero-sub">Unique designs · 4 sizes · Premium frames</p>
        </div>
      </div>
      <section class="section">
        <div class="container">
          <div class="shop-controls">
            <div class="shop-filters" role="group" aria-label="Filter by category">
              <button class="filter-btn active" onclick="window.cf.filterShop(this,'all')">All</button>
              <button class="filter-btn" onclick="window.cf.filterShop(this,'spiritual')">Divine</button>
              <button class="filter-btn" onclick="window.cf.filterShop(this,'automotive')">Automotive</button>
              <button class="filter-btn" onclick="window.cf.filterShop(this,'sports')">Sports</button>
              <button class="filter-btn" onclick="window.cf.filterShop(this,'wildlife')">Wildlife</button>
              <button class="filter-btn" onclick="window.cf.filterShop(this,'anime')">Anime</button>
              <button class="filter-btn" onclick="window.cf.filterShop(this,'motivational')">Motivational</button>
            </div>
          </div>
          <div id="shop-products-grid">
            <div class="products-grid-skeleton">
              ${[0,1,2,3,4,5,6,7,8,9,10,11].map(() => `<div class="pc pc-skeleton"></div>`).join('')}
            </div>
          </div>
        </div>
      </section>
    </main>
    ${renderFooter()}`;

    initMobileMenu();
    initStickyHeader();
    setTimeout(initReveal, 100);
    setTimeout(() => loadShopProducts('all'), 50);
  }

  async function loadShopProducts(category) {
    const grid = document.getElementById('shop-products-grid');
    if (!grid) return;
    try {
      const url = category && category !== 'all'
        ? `${API}/products?limit=60&sort=popular&category=${encodeURIComponent(category)}`
        : `${API}/products?limit=60&sort=popular`;
      const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
      if (!res.ok) throw new Error('api error');
      const data = await res.json();
      const products = (data.products || []).map(normaliseProduct);
      window._shopAllProducts = products;
      if (category === 'all') window._allProducts = products;
      const toShow = category && category !== 'all'
        ? products  // already filtered by API
        : products;
      if (toShow.length > 0) {
        grid.innerHTML = `<div class="products-grid">${toShow.map((p, i) => renderProductCard(p, i)).join('')}</div>`;
      } else {
        grid.innerHTML = `<div class="empty-state"><p>No products found. <a href="/shop" onclick="window.cf.nav('/shop');return false;">View all →</a></p></div>`;
      }
      setTimeout(initReveal, 80);
    } catch (e) {
      grid.innerHTML = `<div class="empty-state"><p>Could not load products. <button onclick="loadShopProducts('${escapeHTML(category)}')">Retry</button></p></div>`;
    }
  }

  function filterShop(btn, category) {
    $$('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const grid = document.getElementById('shop-products-grid');
    if (!grid) return;
    // If we have cached products, filter client-side instantly
    if (window._shopAllProducts && window._shopAllProducts.length > 0) {
      const filtered = category === 'all'
        ? window._shopAllProducts
        : window._shopAllProducts.filter(p => (p.categorySlug || p.category || '').toLowerCase() === category.toLowerCase());
      grid.innerHTML = `<div class="products-grid">${filtered.map((p, i) => renderProductCard(p, i)).join('')}</div>`;
      setTimeout(initReveal, 50);
    } else {
      loadShopProducts(category);
    }
  }

  // Legacy stub — kept so any remaining call-sites don't crash
  function renderAllProducts() {
    window._allProducts = window._allProducts || [];
    return '';
  }

  // FIX 1.2: Replace hardcoded quickAdd with mini-modal (size + frame selector, defaults Medium/Black)
  function quickAdd(variantId, name, price, image, slug) {
    // Remove any existing quick-add modal
    const existing = document.getElementById('quick-add-modal');
    if (existing) existing.remove();

    // New price table per spec
    const sizes = [
      { label: 'Small', size: 'small', priceStd: 449, pricePrm: 599, dims: '8×12"' },
      { label: 'Medium', size: 'medium', priceStd: 749, pricePrm: 999, dims: '12×18"', default: true },
      { label: 'Large', size: 'large', priceStd: 1099, pricePrm: 1399, dims: '16×20"' },
      { label: 'XL', size: 'xl', priceStd: 1699, pricePrm: 2199, dims: '20×30"' },
    ];
    const frames = [
      { label: 'Standard (1")', frame: 'standard', color: '#1a1a1a', tooltip: 'Matte Black Aluminium' },
      { label: 'Premium (1.5")', frame: 'premium', color: '#8B6914', tooltip: 'Gallery Finish Premium' },
    ];

    const modal = document.createElement('div');
    modal.id = 'quick-add-modal';
    modal.className = 'modal-overlay quick-add-modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'Select size and frame for ' + escapeHTML(name));
    modal.innerHTML = `
      <div class="modal-box quick-add-modal-box">
        <div class="modal-header">
          <h3 style="font-family:'DM Serif Display',serif;font-size:18px">${escapeHTML(name)}</h3>
          <button onclick="document.getElementById('quick-add-modal').remove()" aria-label="Close" style="background:none;border:none;cursor:pointer;padding:4px">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M14 4L4 14M4 4l10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="modal-body" style="padding:16px 0 0">
          <div style="margin-bottom:16px">
            <div style="font-size:12px;font-weight:600;color:var(--ink-500);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Size</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap" id="qa-sizes">
              ${sizes.map(s => `
                <button class="qa-size-btn${s.default ? ' qa-size-active' : ''}" 
                  data-size="${s.size}" data-price-std="${s.priceStd}" data-price-prm="${s.pricePrm}"
                  onclick="window._qaSelectSize(this)"
                  style="padding:8px 12px;border:1.5px solid ${s.default ? 'var(--ink-900)' : 'var(--warm-200)'};border-radius:6px;background:${s.default ? 'var(--ink-900)' : 'transparent'};color:${s.default ? '#fff' : 'var(--ink-700)'};cursor:pointer;font-size:13px;font-weight:500">
                  ${escapeHTML(s.label)}<br><span style="font-size:10px;opacity:0.7">${escapeHTML(s.dims)}</span>
                </button>`).join('')}
            </div>
          </div>
          <div style="margin-bottom:16px">
            <div style="font-size:12px;font-weight:600;color:var(--ink-500);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Frame</div>
            <div style="display:flex;gap:10px;flex-wrap:wrap" id="qa-frames">
              ${frames.map((f, i) => `
                <button class="qa-frame-btn${i === 0 ? ' qa-frame-active' : ''}"
                  data-frame="${f.frame}" title="${f.tooltip}"
                  onclick="window._qaSelectFrame(this)"
                  style="display:flex;align-items:center;gap:8px;padding:8px 14px;border:1.5px solid ${i === 0 ? 'var(--ink-900)' : 'var(--warm-200)'};border-radius:6px;background:${i === 0 ? 'var(--ink-900)' : 'transparent'};color:${i === 0 ? '#fff' : 'var(--ink-700)'};cursor:pointer;font-size:13px;font-weight:500">
                  <span style="width:14px;height:14px;border-radius:50%;background:${f.color};border:2px solid rgba(255,255,255,0.3);display:inline-block;flex-shrink:0"></span>
                  ${escapeHTML(f.label)}
                </button>`).join('')}
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-top:12px;border-top:1px solid var(--warm-100)">
            <span style="font-size:15px;color:var(--ink-500)">Total</span>
            <strong id="qa-price" style="font-size:22px;font-family:'DM Serif Display',serif;color:var(--ink-900)">₹749</strong>
          </div>
          <button id="qa-add-btn" onclick="window._qaConfirmAdd('${escapeHTML(slug)}','${escapeHTML(name)}','${escapeHTML(image)}')" class="btn-primary w-full" style="width:100%;padding:14px;font-size:15px;font-weight:600">
            Add to Cart
          </button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    // Close on outside click / Escape
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.addEventListener('keydown', function closeOnEsc(e) {
      if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', closeOnEsc); }
    }, { once: true });

    // State for modal
    window._qaState = { size: 'medium', frame: 'standard', priceStd: 749, pricePrm: 999 };

    window._qaSelectSize = function(btn) {
      document.querySelectorAll('.qa-size-btn').forEach(b => {
        b.style.border = '1.5px solid var(--warm-200)';
        b.style.background = 'transparent';
        b.style.color = 'var(--ink-700)';
      });
      btn.style.border = '1.5px solid var(--ink-900)';
      btn.style.background = 'var(--ink-900)';
      btn.style.color = '#fff';
      window._qaState.size = btn.dataset.size;
      window._qaState.priceStd = parseInt(btn.dataset.priceStd);
      window._qaState.pricePrm = parseInt(btn.dataset.pricePrm);
      window._qaUpdatePrice();
    };

    window._qaSelectFrame = function(btn) {
      document.querySelectorAll('.qa-frame-btn').forEach(b => {
        b.style.border = '1.5px solid var(--warm-200)';
        b.style.background = 'transparent';
        b.style.color = 'var(--ink-700)';
      });
      btn.style.border = '1.5px solid var(--ink-900)';
      btn.style.background = 'var(--ink-900)';
      btn.style.color = '#fff';
      window._qaState.frame = btn.dataset.frame;
      window._qaUpdatePrice();
    };

    window._qaUpdatePrice = function() {
      const s = window._qaState;
      const p = s.frame === 'premium' ? s.pricePrm : s.priceStd;
      const el = document.getElementById('qa-price');
      if (el) el.textContent = '₹' + p.toLocaleString('en-IN');
    };

    window._qaConfirmAdd = function(slug, name, image) {
      const s = window._qaState;
      const price = s.frame === 'premium' ? s.pricePrm : s.priceStd;
      // FIX: build correct variantId from selected size + frame
      const variantId = slug + '-' + s.size + '-' + s.frame;
      const sizeLabel = sizes.find(sz => sz.size === s.size)?.label || 'Medium';
      const frameLabel = frames.find(fr => fr.frame === s.frame)?.label || 'Standard';
      addToCart({ variantId, name, price, image, slug, size: sizeLabel, frame: frameLabel });
      document.getElementById('quick-add-modal')?.remove();
      trackEvent('add_to_cart', { currency: 'INR', value: price, items: [{ item_id: slug, item_name: name, price, quantity: 1 }] });
    };
  }

  // ── PRODUCT DETAIL PAGE ───────────────────────────────────────────────────
  // ── PRODUCT DETAIL PAGE (Audit 1+2+3) — fully Supabase-driven ───────────
  async function renderProductPage(app, slug) {
    slug = slug ? slug.replace(/[^a-z0-9\-]/g, '') : '';
    if (!slug) { window.cf.nav('/shop'); return; }

    // Show loading skeleton immediately
    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <div class="product-detail">
        <div class="container">
          <div class="product-layout">
            <div class="product-gallery">
              <div class="product-main-img" style="background:var(--warm-100);display:flex;align-items:center;justify-content:center;">
                <div style="width:48px;height:48px;border:3px solid var(--gold);border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
              </div>
            </div>
            <div class="product-info" style="padding-top:60px">
              <div class="pc-skeleton" style="height:24px;width:60%;margin-bottom:16px;"></div>
              <div class="pc-skeleton" style="height:40px;width:90%;margin-bottom:12px;"></div>
              <div class="pc-skeleton" style="height:32px;width:40%;margin-bottom:32px;"></div>
            </div>
          </div>
        </div>
      </div>
    </main>
    ${renderFooter()}`;
    initMobileMenu(); initStickyHeader();

    // Fetch from Supabase
    let product, galleryImages = [], variants = [];
    try {
      const res = await fetch(`${API}/products/${encodeURIComponent(slug)}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      const p = data.product || data;
      if (!p || !p.slug) throw new Error('empty');
      galleryImages = [...(p.images || [])].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      const primaryImg = galleryImages[0]?.image_url || p.og_image_url || DESIGN_IMAGES[p.slug] || cldUrl(p.slug, 800);
      variants = (p.variants || []).filter(v => v.is_active !== false).sort((a, b) => Number(a.price) - Number(b.price));
      const basePrice = variants.length > 0 ? Number(variants[0].price) : (p.base_price || 599);
      const catName = (typeof p.category === 'object' && p.category?.name) ? p.category.name : (p.category || 'Art Print');
      product = {
        slug: p.slug, name: p.name, category: catName,
        basePrice, desc: p.description || 'Museum-quality art print, framed and delivered across India.',
        seoTitle: p.seo_title || `${p.name} | ChitraFrame India`,
        seoDesc: p.seo_description || `Buy ${p.name} premium framed art print. Ships across India from \u20b9${basePrice}.`,
        image: primaryImg, _raw: p
      };
    } catch (e) {
      // Graceful fallback using DESIGN_IMAGES
      const fallbackImg = DESIGN_IMAGES[slug] || cldUrl(slug, 800);
      product = { slug, name: slug.replace(/-/g, ' ').replace(/\b./g, c => c.toUpperCase()), category: 'Art Print',
        basePrice: 599, desc: 'Museum-quality framed art print.', image: fallbackImg,
        seoTitle: `${slug} | ChitraFrame India`, seoDesc: 'Buy premium framed art print.' };
      galleryImages = [{ image_url: fallbackImg, display_order: 0 }];
    }

    document.title = product.seoTitle;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', product.seoDesc);

    const firstVariantId = variants[0]?.id || `${slug}-medium-black`;
    const firstPrice = variants[0] ? Number(variants[0].price) : product.basePrice;
    const primaryImg = galleryImages[0]?.image_url || product.image;

    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <div class="product-detail">
        <div class="container">
          <div class="product-layout">
            <!-- Gallery -->
            <div class="product-gallery">
              <div class="product-main-img" id="pdp-main-wrap">
                <img id="product-main-image" src="${escapeHTML(primaryImg)}" alt="${escapeHTML(product.name)} framed art print" loading="eager" fetchpriority="high">
              </div>
              ${galleryImages.length > 1 ? `
              <div class="product-thumbnails">
                ${galleryImages.map((img, i) => `
                  <button class="thumb-btn${i === 0 ? ' thumb-active' : ''}" onclick="window.cf.switchThumb(this,'${escapeHTML(img.image_url)}')" aria-label="View image ${i+1}">
                    <img src="${escapeHTML(img.image_url)}" alt="${escapeHTML(product.name)} view ${i+1}" loading="lazy">
                  </button>`).join('')}
              </div>` : ''}
            </div>

            <!-- Info -->
            <div class="product-info">
              <nav class="product-breadcrumb" aria-label="Breadcrumb">
                <a href="/" onclick="window.cf.nav('/');return false;">Home</a>
                <span>/</span>
                <a href="/shop" onclick="window.cf.nav('/shop');return false;">Shop</a>
                <span>/</span>
                <a href="/category/${escapeHTML((product._raw?.category?.slug || product.category || '').toLowerCase())}" onclick="window.cf.nav('/category/${escapeHTML((product._raw?.category?.slug || product.category || '').toLowerCase())}');return false;">${escapeHTML(product.category)}</a>
              </nav>
              <h1 class="product-detail-title" itemprop="name">${escapeHTML(product.name)}</h1>
              <div class="product-detail-price">
                <span class="price-from">from</span>
                <span id="product-current-price">${formatPrice(firstPrice)}</span>
              </div>

              ${variants.length > 0 ? `
              <div class="size-section">
                <div class="size-label-row">
                  <span class="size-label">Size</span>
                  <a href="/size-guide" onclick="window.cf.nav('/size-guide');return false;" class="size-guide-link">Size Guide</a>
                </div>
                <div class="size-options" role="group" aria-label="Select size">
                  ${variants.map((v, i) => `
                    <button class="size-btn${i === 0 ? ' size-active' : ''}"
                      data-size="${escapeHTML(v.size)}"
                      data-price="${Number(v.price)}"
                      data-variant-id="${escapeHTML(String(v.id))}"
                      onclick="window.cf.selectSizeVariant(this)"
                      aria-pressed="${i === 0 ? 'true' : 'false'}">
                      ${escapeHTML(v.size)}
                    </button>`).join('')}
                </div>
              </div>` : ''}

              <!-- FIX s6.5: Frame selector — color swatch circles instead of text buttons -->
              <div class="frame-section">
                <div class="size-label-row">
                  <span class="size-label">Frame Finish</span>
                </div>
                <div class="frame-swatches" role="group" aria-label="Select frame finish">
                  <button class="frame-swatch-btn frame-swatch-active"
                    data-frame="Black"
                    onclick="window.cf.selectFrame(this)"
                    aria-pressed="true"
                    title="Classic Matte Black">
                    <span class="frame-swatch-circle" style="background:#1a1a1a;border:2px solid #1a1a1a"></span>
                    <span class="frame-swatch-label">Matte Black</span>
                  </button>
                  <button class="frame-swatch-btn"
                    data-frame="Natural Wood"
                    onclick="window.cf.selectFrame(this)"
                    aria-pressed="false"
                    title="Natural Wood Oak">
                    <span class="frame-swatch-circle" style="background:linear-gradient(135deg,#C68B3A,#8B5E1A);border:2px solid #A0721E"></span>
                    <span class="frame-swatch-label">Natural Wood</span>
                  </button>
                </div>
              </div>

              <!-- Trust Pills -->
              <div class="product-trust">
                <div class="product-trust-item">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l2 3h3l-2.5 2.5 1 3L7 8l-3.5 1.5 1-3L2 4h3L7 1z" fill="var(--gold)"/></svg>
                  Freshly printed per order
                </div>
                <div class="product-trust-item">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 5l2 6h8l2-6" stroke="var(--ink-500)" stroke-width="1.2" stroke-linejoin="round"/><path d="M4 5V4a3 3 0 0 1 6 0v1" stroke="var(--ink-500)" stroke-width="1.2" stroke-linecap="round"/></svg>
                  Ships in 3–5 days
                </div>
                <div class="product-trust-item">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l2 3h3l-2.5 2.5 1 3L7 8l-3.5 1.5 1-3L2 4h3L7 1z" stroke="var(--green)" stroke-width="1.2" stroke-linejoin="round"/></svg>
                  Replacement guarantee
                </div>
              </div>

              <!-- Add to Cart -->
              <div class="pdp-cta-row">
                <div class="pdp-qty-row">
                  <button onclick="window.cf.pdpQty(-1)" class="qty-btn" aria-label="Decrease">−</button>
                  <span id="pdp-qty">1</span>
                  <button onclick="window.cf.pdpQty(1)" class="qty-btn" aria-label="Increase">+</button>
                </div>
                <button class="btn-primary pdp-atc-btn" onclick="window.cf.pdpAddToCart('${escapeHTML(slug)}','${escapeHTML(product.name)}',${firstPrice},'${escapeHTML(primaryImg)}')" aria-label="Add to cart">
                  Add to Cart — <span id="pdp-btn-price">${formatPrice(firstPrice)}</span>
                </button>
              </div>

              <!-- Poster Add-on -->
              <label class="pdp-poster-addon">
                <input type="checkbox" id="pdp-poster-check">
                <div class="pdp-poster-content">
                  <strong>Add A3 Poster Print (Rolled)</strong>
                  <span>Unframed, rolled print — ideal as a gift or bedroom art</span>
                </div>
                <span class="pdp-poster-price">+₹149</span>
              </label>

              <!-- Description -->
              <div class="product-desc">
                <p>${escapeHTML(product.desc)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Related Products placeholder -->
      <section class="section section-alt">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">You may also like</h2>
          </div>
          <div class="products-grid" id="related-products-grid">
            ${[0,1,2,3].map(() => `<div class="pc pc-skeleton"></div>`).join('')}
          </div>
        </div>
      </section>
    </main>
    ${renderFooter()}`;

    window._pdpState = {
      size: variants[0]?.size || 'Medium',
      frame: variants[0]?.frame_type || 'Black',
      qty: 1,
      basePrice: firstPrice,
      variantId: String(firstVariantId)
    };

    // Inject Product Schema for SEO
    injectProductSchema(product, variants, slug);

    initMobileMenu();
    initStickyHeader();
    setTimeout(initReveal, 100);
    setTimeout(() => loadRelatedProducts(product.category, slug), 80);
    // Inject urgency features (scarcity, pincode checker, sticky bar)
    setTimeout(() => injectPdpUrgency(slug, product.name, firstPrice, primaryImg), 150);
    // GA4 view_item event
    trackEvent('view_item', { currency: 'INR', value: firstPrice, items: [{ item_id: slug, item_name: product.name, item_category: product.category, price: firstPrice }] });
  }

  function injectProductSchema(product, variants, slug) {
    const existing = document.getElementById('product-schema');
    if (existing) existing.remove();
    const lowestPrice = variants.length > 0 ? Math.min(...variants.map(v => Number(v.price))) : product.basePrice;
    const highestPrice = variants.length > 0 ? Math.max(...variants.map(v => Number(v.price))) : product.basePrice;
    const schema = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: product.name,
      image: [product.image],
      description: product.desc,
      sku: `CF-${slug}`,
      brand: { '@type': 'Brand', name: 'ChitraFrame' },
      offers: {
        '@type': 'AggregateOffer',
        url: `https://chitraframe.in/product/${slug}`,
        priceCurrency: 'INR',
        lowPrice: String(lowestPrice),
        highPrice: String(highestPrice),
        offerCount: String(variants.length || 1),
        availability: 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: 'ChitraFrame' }
      },
      // FIX 3.6: aggregateRating only injected when real review data available from API
    };
    const s = document.createElement('script');
    s.id = 'product-schema';
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(schema);
    document.head.appendChild(s);
  }

  function selectSizeVariant(btn) {
    $$('.size-btn').forEach(b => { b.classList.remove('size-active'); b.setAttribute('aria-pressed','false'); });
    btn.classList.add('size-active');
    btn.setAttribute('aria-pressed','true');
    const price = parseInt(btn.dataset.price || '0');
    const variantId = btn.dataset.variantId || '';
    if (window._pdpState) {
      window._pdpState.size = btn.dataset.size;
      window._pdpState.basePrice = price;
      window._pdpState.variantId = variantId;
    }
    const priceEl = document.getElementById('product-current-price');
    if (priceEl) priceEl.textContent = formatPrice(price);
    const btnPrice = document.getElementById('pdp-btn-price');
    if (btnPrice) btnPrice.textContent = formatPrice(price);
  }

  async function loadRelatedProducts(category, currentSlug) {
    const grid = document.getElementById('related-products-grid');
    if (!grid) return;
    try {
      // Try cached products first
      const cached = (window._allProducts || window._shopAllProducts || [])
        .filter(p => p.slug !== currentSlug && (p.categorySlug || p.category || '').toLowerCase() === (category || '').toLowerCase())
        .slice(0, 4);
      if (cached.length >= 2) {
        grid.innerHTML = cached.map((p, i) => renderProductCard(p, i)).join('');
        setTimeout(initReveal, 50);
        return;
      }
      // Fallback to API
      const catSlug = (category || '').toLowerCase().replace(/\s+/g, '-');
      const res = await fetch(`${API}/products?limit=8&sort=popular${catSlug ? '&category=' + encodeURIComponent(catSlug) : ''}`, { headers: { 'Cache-Control': 'no-cache' } });
      if (!res.ok) throw new Error('api');
      const data = await res.json();
      const products = (data.products || []).map(normaliseProduct).filter(p => p.slug !== currentSlug).slice(0, 4);
      grid.innerHTML = products.length > 0 ? products.map((p, i) => renderProductCard(p, i)).join('') : '';
      setTimeout(initReveal, 50);
    } catch (e) { grid.innerHTML = ''; }
  }

  function renderRelatedProducts(category, currentSlug) {
    const all = [
      { slug: 'radha-krishna-emerald-dance', name: 'Radha Krishna — Emerald Dance', category: 'Spiritual', price: 699, image: DESIGN_IMAGES['radha-krishna-emerald-dance'] },
      { slug: 'bmw-m4-carbon-dark', name: 'BMW M4 Carbon', category: 'Automotive', price: 799, image: DESIGN_IMAGES['bmw-m4-carbon-dark'] },
      { slug: 'cricket-glory-moment', name: 'Cricket Glory Moment', category: 'Sports', price: 599, image: DESIGN_IMAGES['cricket-glory-moment'] },
      { slug: 'lion-geometric-gold', name: 'Lion Geometric Gold', category: 'Wildlife', price: 649, image: DESIGN_IMAGES['lion-geometric-gold'] },
    ].filter(p => p.slug !== currentSlug).slice(0, 4);
    return all.map((p, i) => renderProductCard(p, i)).join('');
  }

  function switchThumb(btn, src) {
    $$('.thumb-btn').forEach(b => b.classList.remove('thumb-active'));
    btn.classList.add('thumb-active');
    const main = $('#product-main-image');
    if (main) main.src = src;
  }

  function selectSize(btn, basePrice) {
    $$('.size-btn').forEach(b => { b.classList.remove('size-active'); b.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('size-active');
    btn.setAttribute('aria-pressed', 'true');
    const extra = parseInt(btn.dataset.extra || '0');
    if (window._pdpState) {
      window._pdpState.size = btn.dataset.size;
      window._pdpState.basePrice = basePrice + extra;
    }
    const priceEl = $('#product-current-price');
    if (priceEl) priceEl.textContent = formatPrice(basePrice + extra);
  }

  function selectFrame(btn) {
    // FIX s6.5: Updated to work with swatch buttons (.frame-swatch-btn) in PDP
    $$('.frame-swatch-btn, .frame-btn').forEach(b => {
      b.classList.remove('frame-active', 'frame-swatch-active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add(btn.classList.contains('frame-swatch-btn') ? 'frame-swatch-active' : 'frame-active');
    btn.setAttribute('aria-pressed', 'true');
    if (window._pdpState) window._pdpState.frame = btn.dataset.frame;
  }

  function pdpQty(delta) {
    if (!window._pdpState) return;
    window._pdpState.qty = Math.max(1, Math.min(10, (window._pdpState.qty || 1) + delta));
    const el = $('#pdp-qty');
    if (el) el.textContent = window._pdpState.qty;
  }

  function pdpAddToCart(slug, name, basePrice, image) {
    const s = window._pdpState || { size: 'Medium', frame: 'Black', qty: 1, basePrice: basePrice };
    const variantId = `${slug}-${s.size}-${s.frame}`.toLowerCase().replace(/\s+/g, '-');
    const finalPrice = s.basePrice || basePrice;
    for (let i = 0; i < (s.qty || 1); i++) {
      addToCart({
        variantId, name, price: finalPrice,
        image, slug, size: s.size, frame: s.frame
      });
    }
    // GA4 add_to_cart event
    trackEvent('add_to_cart', { currency: 'INR', value: finalPrice * (s.qty || 1), items: [{ item_id: slug, item_name: name, item_category: s.frame, price: finalPrice, quantity: s.qty || 1 }] });
    // Add poster add-on if checked
    const posterCheck = document.getElementById('pdp-poster-check');
    if (posterCheck && posterCheck.checked) {
      const already = state.cart.find(i => i.variantId === 'addon-poster-a3');
      if (!already) {
        state.cart.push({
          variantId: 'addon-poster-a3',
          name: 'A3 Poster Print (Rolled)',
          price: 149,
          image: '',
          slug: 'addon-poster-a3',
          size: 'A3 (11.7×16.5")',
          frame: 'Rolled — Unframed',
          quantity: 1,
          isAddon: true,
        });
        saveCart();
      }
    }
  }

  function togglePdpPoster(checked) {
    // Visual feedback only — actual add happens on ATC
    const label = document.getElementById('pdp-poster-addon');
    if (label) label.classList.toggle('pdp-poster-addon--active', checked);
  }

  function showSizeGuide() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <h3>Size Guide</h3>
          <button onclick="this.closest('.modal-overlay').remove()" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M14 4L4 14M4 4l10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <table class="size-table">
            <thead><tr><th>Size</th><th>Dimensions</th><th>Best For</th></tr></thead>
            <tbody>
              <tr><td>Small</td><td>8×12 inches (20×30 cm)</td><td>Desk, bedside, small walls — from ₹449</td></tr>
              <tr><td>Medium <span style="background:var(--gold-pale);color:var(--ink-700);font-size:10px;padding:1px 5px;border-radius:3px;vertical-align:middle">Popular</span></td><td>12×18 inches (30×45 cm)</td><td>Bedroom, study, gallery wall — from ₹749</td></tr>
              <tr><td>Large</td><td>16×20 inches (40×50 cm)</td><td>Living room, focal point — from ₹1,099</td></tr>
              <tr><td>XL</td><td>20×30 inches (50×75 cm)</td><td>Statement wall, large rooms — from ₹1,699</td></tr>
            </tbody>
          </table>
          <p class="size-note">All frames include a 1.5-inch border. For scale reference: A4 paper is approx. 8×12 inches.</p>
        </div>
      </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  }

  // ── CATEGORY PAGE ─────────────────────────────────────────────────────────
  // ── CATEGORY PAGE (Audit 1+2) — fully API-driven ──────────────────────────
  async function renderCategoryPage(app, slug) {
    slug = slug ? slug.replace(/[^a-z0-9\-]/g, '') : '';
    const categoryNames = {
      spiritual: 'Divine & Spiritual', automotive: 'Automotive Art',
      sports: 'Sports Legends', wildlife: 'Wildlife',
      anime: 'Anime', motivational: 'Motivational'
    };
    const name = categoryNames[slug] || slug.charAt(0).toUpperCase() + slug.slice(1);

    // Render shell with skeleton immediately
    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <div class="page-hero-simple">
        <div class="container">
          <nav class="breadcrumb-inline" aria-label="Breadcrumb">
            <a href="/" onclick="window.cf.nav('/');return false;">Home</a> /
            <a href="/shop" onclick="window.cf.nav('/shop');return false;">Shop</a> /
            <span aria-current="page">${escapeHTML(name)}</span>
          </nav>
          <h1>${escapeHTML(name)}</h1>
          <p class="page-hero-sub">Handcrafted frames · Museum-quality printing · Fast delivery</p>
        </div>
      </div>
      <section class="section">
        <div class="container">
          <div id="category-products-grid">
            <div class="products-grid-skeleton">
              ${[0,1,2,3,4,5,6,7].map(() => `<div class="pc pc-skeleton"></div>`).join('')}
            </div>
          </div>
        </div>
      </section>
    </main>
    ${renderFooter()}`;

    initMobileMenu();
    initStickyHeader();
    setTimeout(initReveal, 100);

    // Fetch from API
    const grid = document.getElementById('category-products-grid');
    try {
      const res = await fetch(`${API}/products?limit=60&sort=popular&category=${encodeURIComponent(slug)}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) throw new Error('api');
      const data = await res.json();
      const products = (data.products || []).map(normaliseProduct);
      if (products.length > 0) {
        grid.innerHTML = `<div class="products-grid">${products.map((p, i) => renderProductCard(p, i)).join('')}</div>`;
        setTimeout(initReveal, 80);
      } else {
        grid.innerHTML = `<div class="empty-state"><p>More ${escapeHTML(name)} designs coming soon. <a href="/shop" onclick="window.cf.nav('/shop');return false;">Explore all prints →</a></p></div>`;
      }
    } catch (e) {
      if (grid) grid.innerHTML = `<div class="empty-state"><p>Could not load products. <a href="/shop" onclick="window.cf.nav('/shop');return false;">View all →</a></p></div>`;
    }
  }

  // ── CART PAGE ─────────────────────────────────────────────────────────────
  function renderCartPage(app) {
    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <div class="page-hero-simple">
        <div class="container">
          <h1>Your Cart</h1>
        </div>
      </div>
      <section class="section">
        <div class="container">
          <div class="cart-page-layout">
            <div class="cart-page-items" id="cart-page-items">
              ${renderCartPageItems()}
            </div>
            <div class="cart-page-summary" id="cart-page-summary">
              ${renderCartPageSummary()}
            </div>
          </div>
        </div>
      </section>
    </main>
    ${renderFooter()}`;

    initMobileMenu();
    initStickyHeader();
  }

  function renderCartPageItems() {
    if (state.cart.length === 0) {
      return `<div class="empty-state">
        <p>Your cart is empty.</p>
        <button class="btn-primary" onclick="window.cf.nav('/shop')">Start Shopping</button>
      </div>`;
    }
    return `<ul class="cart-page-list">
      ${state.cart.map((item, idx) => `
        <li class="cart-page-item">
          <div class="cart-page-item-img">
            <img src="${escapeHTML(item.image || cldUrl(item.slug || '', 200))}" alt="${escapeHTML(item.name)}" loading="lazy">
          </div>
          <div class="cart-page-item-info">
            <h3>${escapeHTML(item.name)}</h3>
            <p>${escapeHTML(item.size || 'Medium')} · ${escapeHTML(item.frame || 'Black')} Frame</p>
            <div class="qty-stepper">
              <button onclick="window.cf.cartPageQty(${idx},-1)" aria-label="Decrease">−</button>
              <span>${item.quantity || 1}</span>
              <button onclick="window.cf.cartPageQty(${idx},1)" aria-label="Increase">+</button>
            </div>
          </div>
          <div class="cart-page-item-price">
            <span>${formatPrice(item.price * (item.quantity || 1))}</span>
            <button class="remove-btn" onclick="window.cf.cartPageRemove(${idx})" aria-label="Remove">Remove</button>
          </div>
        </li>`).join('')}
    </ul>`;
  }

  function renderCartPageSummary() {
    const { subtotal, discount, discountLabel, shipping, total, freeThreshold } = getCartTotals();
    const freeLeft = freeThreshold - (subtotal - discount);
    return `
      <div class="order-summary">
        <h2 class="order-summary-title">Order Summary</h2>
        ${freeLeft > 0 && subtotal > 0 ? `<div class="cart-free-bar"><div class="cart-free-progress" style="width:${Math.min(100,(subtotal/freeThreshold)*100)}%"></div><p class="cart-free-text">Add <strong>${formatPrice(freeLeft)}</strong> for free shipping</p></div>` : ''}
        <div class="summary-rows">
          <div class="summary-row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
          ${discount > 0 ? `<div class="summary-row summary-discount"><span>${escapeHTML(discountLabel)}</span><span>−${formatPrice(discount)}</span></div>` : ''}
          <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? '<span style="color:var(--green)">Free</span>' : formatPrice(shipping)}</span></div>
          <div class="summary-row summary-total"><span>Total</span><span>${formatPrice(total)}</span></div>
        </div>
        ${state.cart.length > 0 ? `<button class="btn-primary w-full" onclick="window.cf.nav('/checkout')">Proceed to Checkout · ${formatPrice(total)}</button>` : ''}
        <button class="btn-outline w-full mt-2" onclick="window.cf.nav('/shop')">Continue Shopping</button>
      </div>`;
  }

  function cartPageQty(idx, delta) {
    const newQty = (state.cart[idx]?.quantity || 1) + delta;
    if (newQty <= 0) state.cart.splice(idx, 1);
    else if (state.cart[idx]) state.cart[idx].quantity = Math.min(50, newQty);
    saveCart();
    const itemsEl = $('#cart-page-items');
    const summaryEl = $('#cart-page-summary');
    if (itemsEl) itemsEl.innerHTML = renderCartPageItems();
    if (summaryEl) summaryEl.innerHTML = renderCartPageSummary();
  }

  function cartPageRemove(idx) {
    state.cart.splice(idx, 1);
    saveCart();
    const itemsEl = $('#cart-page-items');
    const summaryEl = $('#cart-page-summary');
    if (itemsEl) itemsEl.innerHTML = renderCartPageItems();
    if (summaryEl) summaryEl.innerHTML = renderCartPageSummary();
    if (state.cartOpen) renderCartDrawerContent();
  }

  // ── CHECKOUT PAGE ─────────────────────────────────────────────────────────
  function updateCheckoutTotal() {
    const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || 'online';
    const { subtotal, discount, discountLabel, shipping, total, paymentAdj, paymentAdjLabel } = getCartTotals(paymentMethod);
    const el = document.getElementById('checkout-total-display');
    const adjEl = document.getElementById('checkout-payment-adj');
    const btnEl = document.getElementById('checkout-submit-btn');
    if (el) el.textContent = formatPrice(total);
    if (btnEl) btnEl.textContent = `Place Order · ${formatPrice(total)}`;
    if (adjEl) {
      if (paymentAdj !== 0) {
        adjEl.innerHTML = `<span>${paymentAdjLabel}</span><span style="color:${paymentAdj > 0 ? '#f87171' : '#6fcf97'}">${paymentAdj > 0 ? '+' : ''}${formatPrice(paymentAdj)}</span>`;
        adjEl.style.display = 'flex';
      } else {
        adjEl.style.display = 'none';
      }
    }
  }

  function renderCheckoutPage(app) {
    if (state.cart.length === 0) { navigate('/cart'); return; }
    // GA4 begin_checkout event
    const cartValue = state.cart.reduce((s, i) => s + (i.price * (i.quantity || 1)), 0);
    trackEvent('begin_checkout', { currency: 'INR', value: cartValue, items: state.cart.map(i => ({ item_id: i.slug || i.variantId, item_name: i.name, price: i.price, quantity: i.quantity || 1 })) });
    // Guard: if cart contains ONLY the poster add-on, block checkout
    const hasRealItem = state.cart.some(i => !i.isAddon);
    if (!hasRealItem) {
      app.innerHTML = renderHeader() + `
      <main id="main-content">
        <div class="container" style="min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;text-align:center;padding:80px 24px">
          <div style="font-size:48px">🗞️</div>
          <h1 style="font-family:'DM Serif Display',serif;font-size:28px;color:var(--ink-900)">Poster add-on needs a frame</h1>
          <p style="color:var(--ink-500);max-width:420px;line-height:1.7">The A3 Poster Print is only available as an add-on alongside a framed print. Please add a framed art print to your cart to proceed to checkout.</p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
            <button class="btn-primary" onclick="window.cf.nav('/shop')">
              Browse Framed Prints
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <button class="btn-outline" onclick="window.cf.nav('/cart')">Back to Cart</button>
          </div>
        </div>
      </main>
      ${renderFooter()}`;
      initMobileMenu();
      initStickyHeader();
      return;
    }
    const { subtotal, discount, shipping, total } = getCartTotals('online');

    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <div class="page-hero-simple">
        <div class="container">
          <h1>Checkout</h1>
        </div>
      </div>
      <section class="section">
        <div class="container">
          <div class="checkout-layout">
            <div class="checkout-form-col">
              <form class="checkout-form" id="checkout-form" onsubmit="window.cf.submitCheckout(event)">
                <!-- Urgency Banner -->
                <div class="checkout-urgency">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#C9973A" stroke-width="1.4"/><path d="M8 4.5v3.5l2.5 2.5" stroke="#C9973A" stroke-width="1.4" stroke-linecap="round"/></svg>
                  <span>Prices valid for <strong id="checkout-timer" class="urgency-timer">14:59</strong> — COD + Free shipping above ₹899</span>
                </div>
                <div class="checkout-section">
                  <h2 class="checkout-section-title">Delivery Information</h2>
                  <div class="form-grid-2">
                    <div class="form-field">
                      <label for="cf-name">Full Name *</label>
                      <input type="text" id="cf-name" name="name" required autocomplete="name" placeholder="Your full name">
                    </div>
                    <div class="form-field">
                      <label for="cf-phone">Phone *</label>
                      <input type="tel" id="cf-phone" name="phone" required autocomplete="tel" placeholder="+91 XXXXX XXXXX" pattern="[6-9][0-9]{9}">
                    </div>
                  </div>
                  <div class="form-field">
                    <label for="cf-email">Email *</label>
                    <input type="email" id="cf-email" name="email" required autocomplete="email" placeholder="For order confirmation">
                  </div>
                  <div class="form-field">
                    <label for="cf-address">Address *</label>
                    <textarea id="cf-address" name="address" required autocomplete="street-address" rows="3" placeholder="Flat / House No., Street, Area"></textarea>
                  </div>
                  <div class="form-grid-3">
                    <div class="form-field">
                      <label for="cf-city">City *</label>
                      <input type="text" id="cf-city" name="city" required autocomplete="address-level2" placeholder="City">
                    </div>
                    <div class="form-field">
                      <label for="cf-state">State *</label>
                      <input type="text" id="cf-state" name="state" required autocomplete="address-level1" placeholder="State">
                    </div>
                    <div class="form-field">
                      <label for="cf-pincode">Pincode *</label>
                      <input type="text" id="cf-pincode" name="pincode" required autocomplete="postal-code" pattern="[1-9][0-9]{5}" placeholder="6-digit">
                    </div>
                  </div>
                </div>

                <div class="checkout-section">
                  <h2 class="checkout-section-title">Payment Method</h2>
                  <div class="payment-options">
                    <label class="payment-option">
                      <input type="radio" name="payment" value="online" checked onchange="window.cf.updateCheckoutTotal()">
                      <div class="payment-option-label">
                        <strong>Pay Online — UPI / Cards</strong>
                        <span>Get <span style="color:#6fcf97;font-weight:600">₹50 off</span> — instant discount applied</span>
                      </div>
                    </label>
                    <label class="payment-option">
                      <input type="radio" name="payment" value="cod" onchange="window.cf.updateCheckoutTotal()">
                      <div class="payment-option-label">
                        <strong>Cash on Delivery</strong>
                        <span>₹49 COD handling fee · Pay when your order arrives</span>
                      </div>
                    </label>
                  </div>
                  <!-- UPI accepted logos nudge -->
                  <div class="upi-nudge">
                    <span>Online payment accepted:</span>
                    <div class="upi-logos">
                      <span class="upi-logo">UPI</span>
                      <span class="upi-logo">GPay</span>
                      <span class="upi-logo">PhonePe</span>
                      <span class="upi-logo">Paytm</span>
                      <span class="upi-logo">VISA</span>
                    </div>
                  </div>
                </div>

                <button type="submit" class="btn-primary w-full checkout-submit" id="checkout-submit-btn">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="6.5" width="14" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M4 6.5V5a4 4 0 0 1 8 0v1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                  Place Order · <span id="checkout-total-display">${formatPrice(total - 50)}</span>
                </button>
                <!-- Trust badges row -->
                <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-top:12px;flex-wrap:wrap">
                  <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--ink-400)">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="4" width="12" height="9" rx="1.5" stroke="var(--green)" stroke-width="1.2"/><path d="M4 4V3a3 3 0 0 1 6 0v1" stroke="var(--green)" stroke-width="1.2" stroke-linecap="round"/></svg>
                    256-bit SSL
                  </span>
                  <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--ink-400)">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l2 4h4l-3 3 1.5 4L7 10l-4.5 2L4 8 1 5h4L7 1z" fill="var(--gold)"/></svg>
                    4.9 ★ Rated
                  </span>
                  <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--ink-400)">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 10l3-8 2 4 2-2 3 6" stroke="var(--ink-400)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    Razorpay Secured
                  </span>
                  <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--ink-400)">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 5.5l2.5 6h7l2.5-6" stroke="var(--ink-400)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 5.5V4a2 2 0 0 1 4 0v1.5" stroke="var(--ink-400)" stroke-width="1.2" stroke-linecap="round"/></svg>
                    Easy Returns
                  </span>
                </div>
              </form>
            </div>

            <div class="checkout-summary-col">
              <div class="order-summary">
                <h2 class="order-summary-title">Your Order</h2>
                <ul class="checkout-items">
                  ${state.cart.map(item => `
                    <li class="checkout-item">
                      <img src="${escapeHTML(item.image || cldUrl(item.slug || '', 100))}" alt="${escapeHTML(item.name)}">
                      <div>
                        <p>${escapeHTML(item.name)}</p>
                        <p class="checkout-item-variant">${escapeHTML(item.size || 'Medium')} · ${escapeHTML(item.frame || 'Black')} · ×${item.quantity || 1}</p>
                      </div>
                      <span>${formatPrice(item.price * (item.quantity || 1))}</span>
                    </li>`).join('')}
                </ul>
                <div class="summary-rows">
                  <div class="summary-row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
                  ${discount > 0 ? `<div class="summary-row summary-discount"><span>Bundle discount</span><span>−${formatPrice(discount)}</span></div>` : ''}
                  <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? '<span style="color:var(--green)">Free</span>' : formatPrice(shipping)}</span></div>
                  <div class="summary-row" id="checkout-payment-adj" style="display:flex"><span>Online payment discount</span><span style="color:#6fcf97">−₹50</span></div>
                  <div class="summary-row summary-total"><span>Total</span><span id="checkout-total-display-side">${formatPrice(total - 50)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
    ${renderFooter()}`;

    initMobileMenu();
    initStickyHeader();
    // Trigger initial total calculation with default online payment
    setTimeout(() => {
      updateCheckoutTotal();
      // FIX 2.6: Use sessionStorage-persisted timer so countdown resets only on new sessions
      const timerKey = 'cf_checkout_timer_end';
      let endTime = parseInt(sessionStorage.getItem(timerKey) || '0');
      if (!endTime || endTime < Date.now()) {
        endTime = Date.now() + 15 * 60 * 1000;
        sessionStorage.setItem(timerKey, String(endTime));
      }
      const secsLeft = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      createUrgencyTimer('checkout-timer', Math.floor(secsLeft / 60), secsLeft % 60);
    }, 50);
  }

  // FIX 1.5: Add client-side form validation with field-level errors
  function showFieldError(fieldName, msg) {
    const input = document.querySelector(`[name="${fieldName}"]`);
    if (!input) return;
    let errEl = input.parentElement?.querySelector('.field-error');
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.className = 'field-error';
      errEl.style.cssText = 'color:#FF6B6B;font-size:12px;margin-top:4px;font-weight:500';
      input.insertAdjacentElement('afterend', errEl);
    }
    errEl.textContent = msg;
    input.style.borderColor = '#FF6B6B';
  }

  function clearFieldErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.remove());
    document.querySelectorAll('.checkout-form input, .checkout-form textarea, .checkout-form select').forEach(el => el.style.borderColor = '');
  }

  function validateCheckoutForm(data) {
    const errors = [];
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const phone = String(data.get('phone') || '').replace(/\D/g, '');
    const pincode = String(data.get('pincode') || '').replace(/\D/g, '');
    const address = String(data.get('address') || '').trim();

    if (name.length < 3) { showFieldError('name', 'Name must be at least 3 characters'); errors.push('name'); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFieldError('email', 'Please enter a valid email address'); errors.push('email'); }
    if (!/^[6-9]\d{9}$/.test(phone)) { showFieldError('phone', 'Please enter a valid 10-digit Indian mobile number (starts with 6–9)'); errors.push('phone'); }
    if (pincode.length !== 6) { showFieldError('pincode', 'Pincode must be exactly 6 digits'); errors.push('pincode'); }
    if (address.length < 10) { showFieldError('address', 'Please enter your full address (at least 10 characters)'); errors.push('address'); }

    return errors;
  }

  async function submitCheckout(e) {
    e.preventDefault();
    // Guard: block checkout if only poster add-on is in cart
    const hasRealItem = state.cart.some(i => !i.isAddon);
    if (!hasRealItem) {
      toast('Please add a framed print before checking out. The poster is an add-on only.', 'error');
      return;
    }
    clearFieldErrors();
    const form = e.target;
    const formData = new FormData(form);

    // FIX 1.5: Validate before disabling button
    const validationErrors = validateCheckoutForm(formData);
    if (validationErrors.length > 0) {
      // Scroll to first error
      const firstErrInput = form.querySelector('.field-error');
      if (firstErrInput) firstErrInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const btn = $('#checkout-submit-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px"><span style="width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block"></span>Placing order...</span>'; }

    const data = formData;
    const payment = data.get('payment') || 'online';
    const { total, subtotal, discount, shipping, paymentAdj } = getCartTotals(payment);

    const orderData = {
      customer_name: String(data.get('name') || '').trim().slice(0, 100),
      customer_email: String(data.get('email') || '').trim().toLowerCase().slice(0, 255),
      customer_phone: String(data.get('phone') || '').replace(/\D/g, '').slice(0, 15),
      shipping_address: {
        name: String(data.get('name') || '').slice(0, 100),
        phone: String(data.get('phone') || '').replace(/\D/g, '').slice(0, 15),
        address: String(data.get('address') || '').slice(0, 500),
        city: String(data.get('city') || '').slice(0, 100),
        state: String(data.get('state') || '').slice(0, 100),
        pincode: String(data.get('pincode') || '').replace(/\D/g, '').slice(0, 6)
      },
      items: state.cart.map(i => ({
        variant_id: i.variantId, name: i.name, price: i.price,
        quantity: i.quantity || 1, size: i.size, frame: i.frame
      })),
      subtotal, discount, shipping, payment_adjustment: paymentAdj, total,
      payment_method: payment === 'cod' ? 'cod' : 'razorpay',
      utm_source: localStorage.getItem('utm_source') || ''
    };

    try {
      const res = await fetch(`${API}/checkout/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      const result = await res.json();

      if (result.error) throw new Error(result.error);

      if (payment === 'online' && result.razorpay_order_id) {
        openRazorpay(result);
      } else {
        // COD success
        const orderId = result.order_id || '';
        const orderTotal = total;
        state.cart = [];
        saveCart();
        trackEvent('purchase', { transaction_id: orderId, value: orderTotal, currency: 'INR', payment_type: 'COD' });
        navigate('/order-success?order=' + encodeURIComponent(orderId) + '&total=' + encodeURIComponent(orderTotal) + '&type=cod');
      }
    } catch (err) {
      toast('Could not place order. Please try again or contact us on WhatsApp.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = `Place Order · ${formatPrice(total)}`; }
    }
  }

  function openRazorpay(orderData) {
    if (!window.Razorpay) {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => openRazorpay(orderData);
      document.head.appendChild(s);
      return;
    }
    const rzp = new window.Razorpay({
      key: orderData.razorpay_key,
      order_id: orderData.razorpay_order_id,
      amount: orderData.total * 100,
      currency: 'INR',
      name: 'ChitraFrame',
      description: 'Art Print Order',
      prefill: { name: orderData.customer_name, email: orderData.customer_email, contact: orderData.customer_phone },
      theme: { color: '#C9973A' },
      handler: function (response) {
        // Verify payment server-side
        fetch('/api/checkout/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            order_id: orderData.internal_order_id || orderData.order_id
          })
        // FIX 1.1: Remove .catch(()=>({})) race condition — verify MUST succeed before clearing cart
        }).then(r => {
          if (!r.ok) throw new Error('Verification server error: ' + r.status);
          return r.json();
        }).then(verifyResult => {
          if (!verifyResult || verifyResult.success === false) {
            throw new Error(verifyResult?.error || 'Payment verification failed');
          }
          const confirmedOrderId = verifyResult.order_id || orderData.internal_order_id || orderData.order_id || '';
          state.cart = [];
          saveCart();
          trackEvent('purchase', { transaction_id: confirmedOrderId, value: orderData.total, currency: 'INR', payment_type: 'online', razorpay_payment_id: response.razorpay_payment_id });
          navigate('/order-success?order=' + encodeURIComponent(confirmedOrderId) + '&total=' + encodeURIComponent(orderData.total) + '&type=prepaid');
        }).catch(verifyErr => {
          // FIX 1.1: Do NOT clear cart, do NOT navigate to success on verification failure
          console.error('[Razorpay] Verify failed:', verifyErr);
          const waMsg = encodeURIComponent('Hi ChitraFrame! My payment was deducted (Razorpay ID: ' + response.razorpay_payment_id + ') but order confirmation failed. Please help.');
          toast('Payment received but order confirmation failed. Please <a href="https://wa.me/917989531818?text=' + waMsg + '" target="_blank" style="color:var(--gold);text-decoration:underline">contact us on WhatsApp</a> with your payment reference: ' + response.razorpay_payment_id, 'error', 12000);
          const btn = document.getElementById('checkout-submit-btn');
          if (btn) { btn.disabled = false; btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="6.5" width="14" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M4 6.5V5a4 4 0 0 1 8 0v1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg> Place Order`; }
        });
      }
    });
    rzp.open();
  }

  // ── STATIC PAGES ──────────────────────────────────────────────────────────
  function renderStaticPage(app, page) {
    if (page === 'about') {
      document.title = 'About ChitraFrame — Premium Framed Art Prints India | Hyderabad';
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', 'ChitraFrame is India\'s leading online framed art print brand. Founded in Hyderabad, we make museum-quality framed wall art accessible to every Indian home. Divine, automotive, sports & wildlife prints.');

      app.innerHTML = renderHeader() + `
      <main id="main-content">
        <div class="page-hero-simple" style="background:linear-gradient(135deg,#0F0E0C 0%,#1C1A17 60%,#2a1f0e 100%)">
          <div class="container">
            <nav class="breadcrumb-inline" aria-label="Breadcrumb" style="color:rgba(255,255,255,0.5)">
              <a href="/" onclick="window.cf.nav('/');return false;" style="color:rgba(255,255,255,0.5)">Home</a> /
              <span aria-current="page" style="color:var(--gold)">About</span>
            </nav>
            <p class="section-eyebrow">Our story</p>
            <h1 style="color:#fff;font-size:clamp(2rem,5vw,3.5rem)">Art belongs on walls,<br><em style="color:var(--gold)">not hard drives</em></h1>
            <p class="page-hero-sub" style="max-width:560px">ChitraFrame was founded in Hyderabad with one mission: make museum-quality framed art prints accessible to every Indian household — without compromising on a single detail.</p>
          </div>
        </div>

        <!-- Story section -->
        <section class="section">
          <div class="container">
            <div class="about-story-grid">
              <div class="about-story-text" data-reveal>
                <p class="section-eyebrow">The beginning</p>
                <h2 class="section-title" style="text-align:left">We noticed a gap</h2>
                <p>Most Indian homes had bare walls — not because people didn't appreciate art, but because buying quality framed prints was either too expensive, too complicated, or delivered badly. Generic poster shops didn't cut it. International sites charged a fortune in shipping. Local print shops had no curation.</p>
                <p style="margin-top:16px">We built ChitraFrame to fix that. A curated collection of designs — divine, automotive, sports, wildlife — printed on archival-grade paper, framed by hand, and delivered safely to your door. Starting at ₹499.</p>
              </div>
              <div class="about-story-stats" data-reveal data-reveal-delay="1">
                <div class="about-stat">
                  <span class="about-stat-num" id="about-order-count">Growing</span>
                  <span class="about-stat-label">Frames delivered across India</span>
                </div>
                <div class="about-stat">
                  <span class="about-stat-num">4.9 ★</span>
                  <span class="about-stat-label">Verified customer rating</span>
                </div>
                <div class="about-stat">
                  <span class="about-stat-num" id="about-design-count">Curated</span>
                  <span class="about-stat-label">Handpicked designs</span>
                </div>
                <div class="about-stat">
                  <span class="about-stat-num">3–5 days</span>
                  <span class="about-stat-label">Average delivery time</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Values -->
        <section class="section section-alt">
          <div class="container">
            <div class="section-header" data-reveal>
              <p class="section-eyebrow">What we stand for</p>
              <h2 class="section-title">Our values</h2>
            </div>
            <div class="about-values-grid">
              <div class="about-value-card" data-reveal>
                <div class="about-value-icon">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="11" stroke="var(--gold)" stroke-width="1.5"/><path d="M9 14l3 3 7-7" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <h3>No compromise on quality</h3>
                <p>Archival pigment inks. Solid wood moulding. Acid-free mat board. Archival inks. We don't cut corners at any stage.</p>
              </div>
              <div class="about-value-card" data-reveal data-reveal-delay="1">
                <div class="about-value-icon">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M6 22L11 17M11 17l7-7M11 17l-3 1 1-3M18 10l3-3 3 3-3 3" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <h3>Every print tells a story</h3>
                <p>We curate, not mass-produce. Every design is chosen because it deserves a place on a wall — because it moves you, inspires you, or brings peace.</p>
              </div>
              <div class="about-value-card" data-reveal data-reveal-delay="2">
                <div class="about-value-icon">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 4L5 9v8c0 5 4 9 9 10 5-1 9-5 9-10V9L14 4z" stroke="var(--gold)" stroke-width="1.5" stroke-linejoin="round"/></svg>
                </div>
                <h3>Safe delivery, always</h3>
                <p>Foam-lined rigid boxes. Triple-layer bubble wrap. Photographic packaging record. If it arrives damaged, we replace it — no questions, no hassle.</p>
              </div>
              <div class="about-value-card" data-reveal data-reveal-delay="3">
                <div class="about-value-icon">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 4l2.8 8.6H25l-7.2 5.2 2.8 8.6L14 21.2l-6.6 5.2 2.8-8.6L3 12.6h8.2L14 4z" stroke="var(--gold)" stroke-width="1.4" stroke-linejoin="round"/></svg>
                </div>
                <h3>Honest reviews, real trust</h3>
                <p>We publish all reviews — 5-star and critical. Our 4.9 average is earned, not manufactured. Trust is everything to us.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Process -->
        <section class="section">
          <div class="container">
            <div class="section-header" data-reveal>
              <p class="section-eyebrow">How we work</p>
              <h2 class="section-title">From design to your wall</h2>
            </div>
            <div class="how-steps">
              <div class="how-step" data-reveal>
                <div class="how-step-icon"><svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M8 16l5 5 11-11" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="4" y="4" width="24" height="24" rx="5" stroke="var(--gold)" stroke-width="1.4"/></svg></div>
                <div class="how-step-num">01</div>
                <h3>Curate</h3>
                <p>Each design is reviewed for colour accuracy, composition, and cultural authenticity before joining our catalogue.</p>
              </div>
              <div class="how-step" data-reveal data-reveal-delay="1">
                <div class="how-step-icon"><svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="4" width="24" height="24" rx="4" stroke="var(--gold)" stroke-width="1.5"/><rect x="9" y="9" width="14" height="14" rx="2" stroke="var(--gold)" stroke-width="1"/></svg></div>
                <div class="how-step-num">02</div>
                <h3>Print</h3>
                <p>Printed fresh per order on 300gsm premium art paper using 12-colour archival pigment inks rated for 100+ years.</p>
              </div>
              <div class="how-step" data-reveal data-reveal-delay="2">
                <div class="how-step-icon"><svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="8" width="24" height="20" rx="3" stroke="var(--gold)" stroke-width="1.5"/><path d="M4 14h24" stroke="var(--gold)" stroke-width="1"/><path d="M10 4v4M22 4v4" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round"/></svg></div>
                <div class="how-step-num">03</div>
                <h3>Frame</h3>
                <p>Hand-assembled frames with solid wood moulding, UV glass, and acid-free mat board. Quality-inspected before packing.</p>
              </div>
              <div class="how-step" data-reveal data-reveal-delay="3">
                <div class="how-step-icon"><svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M4 16h24M20 8l8 8-8 8" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
                <div class="how-step-num">04</div>
                <h3>Deliver</h3>
                <p>Foam-lined rigid boxes, photographed before dispatch. Delivered in 3–5 days across India with real-time tracking.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- CTA -->
        <section class="newsletter-section">
          <div class="container">
            <div class="newsletter-inner" data-reveal style="text-align:center;flex-direction:column;gap:24px">
              <div class="newsletter-text">
                <h2 class="newsletter-title">Ready to transform your walls?</h2>
                <p>Browse curated designs. Free delivery above ₹899.</p>
              </div>
              <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
                <button class="btn-primary btn-hero-cta" onclick="window.cf.nav('/shop')">
                  Shop All Prints
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button class="btn-outline" onclick="window.cf.nav('/customize')">Order Custom Frame</button>
              </div>
            </div>
          </div>
        </section>

      </main>
      ${renderFooter()}`;

    } else {
      // Contact page
      document.title = 'Contact ChitraFrame — WhatsApp, Email & Support | Hyderabad';
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', 'Contact ChitraFrame for order support, bulk orders, and design requests. WhatsApp: +91 79895 31818. Email: support@chitraframe.in. Based in Hyderabad, Telangana.');

      app.innerHTML = renderHeader() + `
      <main id="main-content">
        <div class="page-hero-simple">
          <div class="container">
            <nav class="breadcrumb-inline" aria-label="Breadcrumb">
              <a href="/" onclick="window.cf.nav('/');return false;">Home</a> /
              <span aria-current="page">Contact</span>
            </nav>
            <p class="section-eyebrow">We're here for you</p>
            <h1>Get in touch</h1>
            <p class="page-hero-sub">Questions about an order? Design requests? Bulk pricing? Reach us on WhatsApp for the fastest response — we typically reply within 2 hours.</p>
          </div>
        </div>

        <section class="section">
          <div class="container">
            <div class="contact-cards-grid">
              <div class="contact-method-card" data-reveal>
                <div class="contact-method-icon" style="background:#dcfce7">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M24.2 4A13.3 13.3 0 0 0 3.8 22l-1.7 5 5.2-1.8a13.3 13.3 0 1 0 16.9-21.2zm-6.7 16.8c-.6.4-.8.4-1.1.3-1-.3-3-1.3-4.2-2.6-1.4-1.4-2.3-3.1-2.5-3.6-.2-.5 0-.8.4-1.2.3-.3.7-.8.8-1.1.1-.2 0-.5-.1-.7l-1.2-2.9c-.3-.6-.7-.6-.9-.6h-.8c-.3 0-.7.1-1 .5-.4.4-1.4 1.4-1.4 3.4s1.4 3.9 1.6 4.2c.2.3 2.7 4.2 6.6 5.9 4 1.7 4 1.1 4.7 1 .7-.1 2.3-.9 2.6-1.8.3-.9.3-1.6.2-1.8-.1-.2-.4-.3-1-.6z" fill="#22c55e"/></svg>
                </div>
                <h3>WhatsApp</h3>
                <p>Fastest support · Usually within 2 hours during 9am–7pm IST</p>
                <a href="https://wa.me/917989531818?text=Hi%20ChitraFrame!%20I%20have%20a%20question." target="_blank" rel="noopener noreferrer" class="btn-primary contact-btn" style="background:#22c55e;border-color:#22c55e">
                  Chat on WhatsApp
                </a>
                <p class="contact-meta">+91 79895 31818</p>
              </div>
              <div class="contact-method-card" data-reveal data-reveal-delay="1">
                <div class="contact-method-icon" style="background:#eff6ff">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M4 8h20l-10 9L4 8z" stroke="var(--gold)" stroke-width="1.5" stroke-linejoin="round"/><path d="M4 8v14h20V8" stroke="var(--gold)" stroke-width="1.5" stroke-linejoin="round"/></svg>
                </div>
                <h3>Email Support</h3>
                <p>For order queries, returns, or detailed enquiries. We reply within 24 hours.</p>
                <a href="mailto:support@chitraframe.in" class="btn-outline contact-btn">Send Email</a>
                <p class="contact-meta">support@chitraframe.in</p>
              </div>
              <div class="contact-method-card" data-reveal data-reveal-delay="2">
                <div class="contact-method-icon" style="background:#fdf4ff">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="22" height="22" rx="6" stroke="var(--gold)" stroke-width="1.5"/><circle cx="14" cy="14" r="5" stroke="var(--gold)" stroke-width="1.5"/><circle cx="20.5" cy="7.5" r="1.5" fill="var(--gold)"/></svg>
                </div>
                <h3>Instagram</h3>
                <p>Follow @chitraframe.in for new drops, wall inspiration, and DM support.</p>
                <a href="https://instagram.com/chitraframe.in" target="_blank" rel="noopener noreferrer" class="btn-outline contact-btn">Follow Us</a>
                <p class="contact-meta">@chitraframe.in</p>
              </div>
            </div>

            <!-- Bulk orders -->
            <div class="bulk-cta-card" data-reveal>
              <div class="bulk-cta-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="3" y="3" width="26" height="26" rx="5" stroke="var(--gold)" stroke-width="1.5"/><path d="M9 16h14M16 9v14" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round"/></svg>
              </div>
              <div class="bulk-cta-text">
                <h3>Ordering 10+ frames?</h3>
                <p>We offer bulk pricing for corporate gifts, office décor, weddings, and events. WhatsApp us your requirement and we'll send a custom quote within 4 hours.</p>
              </div>
              <a href="https://wa.me/917989531818?text=Hi%20ChitraFrame!%20I%27m%20interested%20in%20bulk%20framing%20for%20" target="_blank" rel="noopener noreferrer" class="btn-primary">
                Get Bulk Quote
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </a>
            </div>

            <!-- Office info -->
            <div class="office-info" data-reveal>
              <div class="office-info-inner">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 1C6.7 1 4 3.7 4 7c0 4.9 6 12 6 12s6-7.1 6-12c0-3.3-2.7-6-6-6zm0 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
                <span>ChitraFrame · Hyderabad, Telangana, India · Serving all of India</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      ${renderFooter()}`;
    }

    initMobileMenu();
    initStickyHeader();
    setTimeout(initReveal, 100);
  }

  // FIX 3.3: New pages — /bulk-orders, /gift-cards, /care-guide
  function renderBulkOrdersPage(app) {
    document.title = 'Bulk Orders & Corporate Gifts — ChitraFrame | Custom Framed Art India';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', 'Order 10+ framed art prints for offices, weddings, events. Custom branding available. WhatsApp +91 79895 31818 for a quote within 4 hours.');
    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <div class="page-hero-simple">
        <div class="container">
          <nav class="breadcrumb-inline" aria-label="Breadcrumb"><a href="/" onclick="window.cf.nav('/');return false;">Home</a> / <span>Bulk Orders</span></nav>
          <p class="section-eyebrow">Corporate & Event Gifting</p>
          <h1>Bulk Orders</h1>
          <p class="page-hero-sub">10+ frames at wholesale prices. Custom branding available. Quote within 4 hours.</p>
        </div>
      </div>
      <section class="section">
        <div class="container" style="max-width:800px">
          <div class="why-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin-bottom:48px">
            ${[
              { icon: '🎁', h: 'Corporate Gifting', t: 'Premium framed art for employee gifts, client appreciation, and Diwali hampers.' },
              { icon: '🏢', h: 'Office Décor', t: 'Gallery walls for lobbies, meeting rooms, and common areas. Volume pricing available.' },
              { icon: '💒', h: 'Weddings & Events', t: 'Customised return gifts, venue décor, and personalised photo frames.' },
              { icon: '🎓', h: 'Custom Branding', t: 'Add your company logo or message on select designs. MOQ: 20 pieces.' },
            ].map(c => `<div class="why-card"><div style="font-size:28px;margin-bottom:8px">${c.icon}</div><h3>${c.h}</h3><p>${c.t}</p></div>`).join('')}
          </div>
          <div class="bulk-cta-card" data-reveal style="margin-bottom:32px">
            <div class="bulk-cta-text">
              <h3>Get your bulk quote in 4 hours</h3>
              <p>WhatsApp us with quantity, size preference, and occasion. We'll send a detailed quote with volume discounts. Minimum order: 10 pieces.</p>
            </div>
            <a href="https://wa.me/917989531818?text=Hi%20ChitraFrame!%20I%27m%20interested%20in%20bulk%20framing%20for%20" target="_blank" rel="noopener noreferrer" class="btn-primary">
              WhatsApp for Quote →
            </a>
          </div>
          <div style="background:var(--warm-50);border-radius:12px;padding:24px">
            <h3 style="margin-bottom:16px">Volume Pricing (Indicative)</h3>
            <table class="size-table">
              <thead><tr><th>Quantity</th><th>Discount</th><th>Free Delivery</th></tr></thead>
              <tbody>
                <tr><td>10–19 pieces</td><td>5% off</td><td>Yes (prepaid)</td></tr>
                <tr><td>20–49 pieces</td><td>10% off</td><td>Yes</td></tr>
                <tr><td>50+ pieces</td><td>15–20% off</td><td>Yes + Priority</td></tr>
              </tbody>
            </table>
            <p style="font-size:12px;color:var(--ink-400);margin-top:12px">*Final pricing depends on size and frame selection. Contact us for exact quote.</p>
          </div>
        </div>
      </section>
    </main>
    ${renderFooter()}`;
    initMobileMenu(); initStickyHeader(); setTimeout(initReveal, 100);
  }

  function renderGiftCardsPage(app) {
    document.title = 'Gift Cards — ChitraFrame | Buy Art Print Gift Vouchers India';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', 'Give the gift of beautiful wall art. ChitraFrame digital gift cards available in ₹500, ₹1,000, ₹2,000. Instant delivery via WhatsApp/email.');
    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <div class="page-hero-simple">
        <div class="container">
          <nav class="breadcrumb-inline" aria-label="Breadcrumb"><a href="/" onclick="window.cf.nav('/');return false;">Home</a> / <span>Gift Cards</span></nav>
          <p class="section-eyebrow">The perfect present</p>
          <h1>Gift Cards</h1>
          <p class="page-hero-sub">Can't decide which print? Give the gift of choice.</p>
        </div>
      </div>
      <section class="section">
        <div class="container" style="max-width:600px;text-align:center">
          <div style="background:linear-gradient(135deg,var(--ink-900),#2a1f0e);border-radius:20px;padding:40px 32px;color:#fff;margin-bottom:32px">
            <div style="font-size:13px;letter-spacing:0.1em;text-transform:uppercase;color:var(--gold);margin-bottom:12px">Digital Gift Card</div>
            <div style="font-family:'DM Serif Display',serif;font-size:clamp(28px,5vw,48px);margin-bottom:8px">ChitraFrame</div>
            <div style="font-size:14px;color:rgba(255,255,255,0.7);margin-bottom:24px">Museum-quality art prints for every home</div>
            <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:24px">
              ${['₹500','₹1,000','₹1,500','₹2,000'].map(amt => `<span style="padding:10px 20px;border:1.5px solid rgba(201,151,58,0.5);border-radius:8px;font-size:16px;font-weight:600;color:var(--gold)">${amt}</span>`).join('')}
            </div>
            <p style="font-size:12px;color:rgba(255,255,255,0.5)">Valid for 12 months · No expiry hassle</p>
          </div>
          <div class="why-grid" style="grid-template-columns:1fr 1fr;gap:16px;margin-bottom:32px;text-align:left">
            ${[
              { icon: '⚡', h: 'Instant Delivery', t: 'Sent via WhatsApp or email immediately after payment.' },
              { icon: '🎯', h: 'Any Design', t: 'Recipient chooses their favourite from our full catalogue.' },
              { icon: '📦', h: 'Any Size', t: 'Works for all sizes and frame types in our store.' },
              { icon: '⏳', h: '12 Month Validity', t: 'Use within 12 months. No rush, no expiry stress.' },
            ].map(c => `<div class="why-card" style="padding:16px"><div style="font-size:22px;margin-bottom:8px">${c.icon}</div><h3 style="font-size:14px;margin-bottom:6px">${c.h}</h3><p style="font-size:13px">${c.t}</p></div>`).join('')}
          </div>
          <a href="https://wa.me/917989531818?text=Hi%20ChitraFrame!%20I%27d%20like%20to%20purchase%20a%20gift%20card." target="_blank" rel="noopener noreferrer" class="btn-primary" style="display:inline-flex;align-items:center;gap:8px;padding:14px 32px;font-size:16px">
            Buy a Gift Card →
          </a>
          <p style="margin-top:12px;font-size:13px;color:var(--ink-400)">Gift cards are digital — delivered instantly via WhatsApp/email.</p>
        </div>
      </section>
    </main>
    ${renderFooter()}`;
    initMobileMenu(); initStickyHeader(); setTimeout(initReveal, 100);
  }

  function renderCareGuidePage(app) {
    document.title = 'Care Guide for Framed Art Prints — ChitraFrame | How to Maintain Wall Art';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', 'How to care for your ChitraFrame framed art print. Cleaning, placement, humidity tips. Archival inks last 100+ years with proper care.');
    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <div class="page-hero-simple">
        <div class="container">
          <nav class="breadcrumb-inline" aria-label="Breadcrumb"><a href="/" onclick="window.cf.nav('/');return false;">Home</a> / <span>Care Guide</span></nav>
          <p class="section-eyebrow">Protect your investment</p>
          <h1>Art Print Care Guide</h1>
          <p class="page-hero-sub">With proper care, your ChitraFrame print will look stunning for decades.</p>
        </div>
      </div>
      <section class="section">
        <div class="container" style="max-width:720px">
          <div class="how-steps" style="grid-template-columns:1fr;gap:24px">
            ${[
              { icon: '☀️', h: 'Avoid Direct Sunlight', t: 'While our inks are archival-grade (rated 100+ years in dark storage), prolonged direct UV exposure can cause fading over decades. Hang in indirect light or use UV-filtering window film.' },
              { icon: '💧', h: 'Humidity & Moisture', t: 'Avoid bathrooms, kitchens, or any area with high moisture. Ideal humidity: 40–60% RH. Frames are moisture-resistant but not waterproof.' },
              { icon: '🧹', h: 'Cleaning the Frame', t: 'Wipe the frame with a dry or slightly damp microfibre cloth. Never use chemical cleaners directly on wood. For acrylic glazing, use an anti-static cloth.' },
              { icon: '🖼️', h: 'Hanging Tips', t: 'Use the included wall hanger and ensure it\'s anchored to a stud or use wall plugs for hollow walls. Keep level — a bubble level app on your phone works perfectly.' },
              { icon: '📦', h: 'Storing or Moving', t: 'Store in the original packaging if possible. Wrap in bubble wrap and stand upright — never lay flat under heavy objects. Use corner protectors for long-distance transport.' },
              { icon: '🔧', h: 'Glass vs Acrylic', t: 'Your ChitraFrame uses shatterproof acrylic (perspex) instead of glass — it\'s safer for shipping and everyday use. Clean with a microfibre cloth using circular motion.' },
            ].map(c => `<div class="why-card" data-reveal style="display:flex;align-items:flex-start;gap:16px;padding:20px">
              <span style="font-size:28px;flex-shrink:0">${c.icon}</span>
              <div><h3 style="margin-bottom:8px">${c.h}</h3><p>${c.t}</p></div>
            </div>`).join('')}
          </div>
          <div style="margin-top:40px;background:var(--warm-50);border-radius:12px;padding:24px;text-align:center">
            <p style="font-size:15px;color:var(--ink-600);margin-bottom:16px">Have a question about your print?</p>
            <a href="https://wa.me/917989531818?text=Hi!%20I%20have%20a%20question%20about%20caring%20for%20my%20ChitraFrame%20print." target="_blank" rel="noopener noreferrer" class="btn-primary">
              Ask us on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </main>
    ${renderFooter()}`;
    initMobileMenu(); initStickyHeader(); setTimeout(initReveal, 100);
  }

  function renderPolicyPage(app) {
    const slug = location.pathname.split('/policy/')[1] || 'privacy';
    const titles = { privacy: 'Privacy Policy', terms: 'Terms of Service', shipping: 'Shipping Policy', refund: 'Refund & Returns' };
    const title = titles[slug] || 'Policy';

    const content = {
      shipping: `<h2>Shipping Policy</h2>
        <p><strong>Delivery Time:</strong> 5–7 business days across India. Metro cities: 3–5 days.</p>
        <p><strong>Free Shipping:</strong> On all prepaid orders above ₹899 after discounts. COD shipping ₹99 (₹149 for Large/XL).</p>
        <p><strong>COD:</strong> Available on orders ₹499–₹1,995. COD fee: ₹49.</p>
        <p><strong>Tracking:</strong> You'll receive a tracking link via WhatsApp/email once shipped.</p>
        <p><strong>Packaging:</strong> All frames ship in foam-lined protective boxes. We photograph every packed order.</p>`,
      privacy: `<h2>Privacy Policy</h2>
        <p>We collect only essential information (name, email, phone, delivery address) to process your order. We never sell your data. We use Supabase for secure data storage. All payments are processed by Razorpay — we do not store card details.</p>`,
      terms: `<h2>Terms of Service</h2>
        <p>By placing an order, you agree to our terms. All prices are in INR. We reserve the right to cancel orders in case of pricing errors. Custom orders are non-refundable once production begins.</p>
        <h3>User Image Contributions &amp; Printing Authorizations</h3>
        <p>When uploading any digital photo or graphic asset to our custom framing section, you are confirming that you hold the legal right, ownership, or proper permission to reproduce and print that file. Our website provides frame-manufacturing and custom-printing services as a fulfilment partner. We rely on the assurance that our users possess the rights to the media files they upload. The customer agrees to hold this platform harmless from any claims, disputes, or actions arising from the processing and physical printing of user-submitted content.</p>`,
      refund: `<h2>Refunds & Returns</h2>
        <p><strong>Damaged items:</strong> We replace damaged frames free of charge. Share photos within 48 hours of delivery via WhatsApp.</p>
        <p><strong>Wrong item:</strong> Full replacement + free return pickup.</p>
        <p><strong>Change of mind:</strong> Accepted within 7 days. Item must be unopened. Return shipping at customer's cost.</p>
        <p><strong>Refund timeline:</strong> 5–7 business days to original payment method.</p>`
    };

    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <section class="section">
        <div class="container">
          <div class="policy-page">
            <h1>${escapeHTML(title)}</h1>
            <div class="policy-content">
              ${content[slug] || `<p>Policy content coming soon.</p>`}
            </div>
          </div>
        </div>
      </section>
    </main>
    ${renderFooter()}`;

    initMobileMenu();
    initStickyHeader();
  }

  function renderTrackPage(app) {
    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <div class="page-hero-simple">
        <div class="container">
          <h1>Track Your Order</h1>
          <p class="page-hero-sub">Enter your order ID or phone number</p>
        </div>
      </div>
      <section class="section">
        <div class="container">
          <div class="track-form-wrap">
            <form class="track-form" onsubmit="window.cf.trackOrder(event)">
              <div class="form-field">
                <label for="track-input">Order ID or Phone Number</label>
                <input type="text" id="track-input" name="query" placeholder="e.g. CF-2025-001 or 9876543210" required>
              </div>
              <button type="submit" class="btn-primary">Track Order</button>
            </form>
            <div id="track-result"></div>
          </div>
        </div>
      </section>
    </main>
    ${renderFooter()}`;

    initMobileMenu();
    initStickyHeader();
  }

  async function trackOrder(e) {
    e.preventDefault();
    const query = e.target.querySelector('[name="query"]').value.trim();
    const result = $('#track-result');
    if (!result || !query) return;
    result.innerHTML = '<div class="track-loading">Looking up your order…</div>';
    try {
      const res = await fetch(`${API}/orders/track?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.error || !data.order) {
        result.innerHTML = `<div class="track-error">Order not found. Contact us on <a href="https://wa.me/917989531818" target="_blank">WhatsApp</a>.</div>`;
        return;
      }
      const o = data.order;
      result.innerHTML = `
        <div class="track-card">
          <div class="track-status track-${o.status}"><strong>${escapeHTML(o.status?.toUpperCase() || 'PROCESSING')}</strong></div>
          <div class="track-details">
            <div><span>Order ID</span><strong>${escapeHTML(o.order_id || query)}</strong></div>
            <div><span>Amount</span><strong>${formatPrice(o.total_amount || 0)}</strong></div>
            ${o.tracking_id ? `<div><span>Tracking</span><a href="${o.tracking_url ? escapeHTML(o.tracking_url) : '#'}" target="_blank">${escapeHTML(o.tracking_id)}</a></div>` : ''}
          </div>
          <p class="track-help">Questions? <a href="https://wa.me/917989531818" target="_blank">Chat on WhatsApp →</a></p>
        </div>`;
    } catch (err) {
      result.innerHTML = `<div class="track-error">Unable to fetch order. Please try again or contact support.</div>`;
    }
  }

  function renderReturnsPage(app) {
    renderPolicyPage(app);
    // Override content for returns
  }

  function renderSuggestPage(app) {
    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <div class="page-hero-simple">
        <div class="container">
          <h1>Suggest a Design</h1>
          <p class="page-hero-sub">Is there an art print you'd love to see? Let us know!</p>
        </div>
      </div>
      <section class="section">
        <div class="container">
          <div class="track-form-wrap">
            <form class="track-form" onsubmit="window.cf.submitSuggestion(event)">
              <div class="form-field">
                <label for="suggest-name">Your Name</label>
                <input type="text" id="suggest-name" name="contact_name" placeholder="Optional" maxlength="100">
              </div>
              <div class="form-field">
                <label for="suggest-phone">WhatsApp / Phone</label>
                <input type="tel" id="suggest-phone" name="contact_phone" placeholder="So we can notify you when it's live" maxlength="15">
              </div>
              <div class="form-field">
                <label for="suggest-msg">Your Design Idea *</label>
                <textarea id="suggest-msg" name="message" rows="4" required placeholder="e.g. 'A framed print of Virat Kohli's century celebration at Wankhede'" maxlength="1000"></textarea>
              </div>
              <button type="submit" class="btn-primary">Submit Idea</button>
            </form>
          </div>
        </div>
      </section>
    </main>
    ${renderFooter()}`;

    initMobileMenu();
    initStickyHeader();
  }

  // FIX 6.6: Catch block now shows error toast, not fake success
  async function submitSuggestion(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
    const data = new FormData(form);
    try {
      const res = await fetch(`${API}/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: data.get('message'),
          contact_name: data.get('contact_name'),
          contact_phone: data.get('contact_phone')
        })
      });
      if (!res.ok) throw new Error('Server error: ' + res.status);
      toast('🎉 Thank you! We\'ll review your idea and may feature it in our next collection.');
      form.reset();
    } catch (err) {
      // FIX 6.6: Show real error, not fake success
      toast('Could not submit. Please try again or WhatsApp us directly at +91 79895 31818.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Submit Idea'; }
    }
  }

  function renderLoginPage(app) {
    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <section class="section">
        <div class="container">
          <div class="auth-card">
            <h1>Sign In</h1>
            <p>Track orders and manage your account</p>
            <form class="track-form" onsubmit="window.cf.handleLogin(event)">
              <div class="form-field">
                <label for="login-email">Email</label>
                <input type="email" id="login-email" name="email" required autocomplete="email" placeholder="you@email.com">
              </div>
              <div class="form-field">
                <label for="login-password">Password</label>
                <input type="password" id="login-password" name="password" required autocomplete="current-password">
              </div>
              <button type="submit" class="btn-primary w-full">Sign In</button>
            </form>
            <p class="auth-alt">No account? <a href="/track" onclick="window.cf.nav('/track');return false;">Track your order →</a></p>
          </div>
        </div>
      </section>
    </main>
    ${renderFooter()}`;

    initMobileMenu();
    initStickyHeader();
  }

  async function handleLogin(e) {
    e.preventDefault();
    const data = new FormData(e.target);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.get('email'), password: data.get('password') })
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      if (result.token) { localStorage.setItem('cf_auth', result.token); navigate('/account'); }
    } catch (err) {
      toast('Login failed. ' + (err.message || ''), 'error');
    }
  }

  function renderAccountPage(app) {
    const auth = localStorage.getItem('cf_auth');
    if (!auth) { navigate('/login'); return; }
    let authData = {};
    try { authData = JSON.parse(auth); } catch(e) {}
    const customerId = authData.id || authData.user?.id || null;
    const userEmail = authData.email || authData.user?.email || '';
    const userName = authData.name || authData.user?.user_metadata?.name || userEmail.split('@')[0] || 'Customer';

    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <section class="section">
        <div class="container">
          <div class="static-page">
            <h1>My Account</h1>
            <p class="body-md" style="margin-bottom:24px">Welcome back, <strong>${escapeHTML(userName)}</strong></p>
            <div class="account-actions" style="margin-bottom:32px">
              <button class="btn-outline" onclick="window.cf.nav('/track')">Track an Order</button>
              <button class="btn-outline" onclick="localStorage.removeItem('cf_auth');window.cf.nav('/');toast('Signed out')">Sign Out</button>
            </div>

            <!-- FIX s6.3: Order history section -->
            <h2 style="font-family:var(--font-serif);font-size:22px;margin-bottom:16px">Your Orders</h2>
            <div id="account-orders">
              <div class="skeleton" style="height:80px;border-radius:8px;margin-bottom:10px"></div>
              <div class="skeleton" style="height:80px;border-radius:8px;margin-bottom:10px"></div>
            </div>
          </div>
        </div>
      </section>
    </main>
    ${renderFooter()}`;

    initMobileMenu();
    initStickyHeader();

    // FIX s6.3: Load real orders from API
    if (customerId) {
      loadAccountOrders(customerId);
    } else {
      const el = document.getElementById('account-orders');
      if (el) el.innerHTML = `<p class="body-sm" style="color:var(--ink-400)">No order history found. <a href="/track" onclick="window.cf.nav('/track');return false;" style="color:var(--gold)">Track an order by ID →</a></p>`;
    }
  }

  async function loadAccountOrders(customerId) {
    const el = document.getElementById('account-orders');
    if (!el) return;
    try {
      const res = await fetch(`${API}/orders?customerId=${encodeURIComponent(customerId)}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) throw new Error('api-' + res.status);
      const data = await res.json();
      const orders = Array.isArray(data) ? data : (data.orders || []);
      if (!orders.length) {
        el.innerHTML = `<p class="body-sm" style="color:var(--ink-400)">You haven't placed any orders yet. <a href="/shop" onclick="window.cf.nav('/shop');return false;" style="color:var(--gold)">Browse our collection →</a></p>`;
        return;
      }
      el.innerHTML = orders.map(o => {
        const statusColor = { delivered:'#1A7A4A', shipped:'#D97706', processing:'#2563EB', pending:'#6B6458', cancelled:'#DC2626' }[o.status] || '#6B6458';
        const statusLabel = { delivered:'Delivered', shipped:'Shipped', processing:'Processing', pending:'Pending', cancelled:'Cancelled', cod_pending:'COD — Awaiting Confirmation' }[o.status] || o.status || 'Processing';
        return `<div class="account-order-card">
          <div class="account-order-header">
            <div>
              <strong style="font-size:14px">Order #${escapeHTML(String(o.id || o.order_id || ''))}</strong>
              <span style="font-size:12px;color:var(--ink-400);margin-left:12px">${escapeHTML(o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '')}</span>
            </div>
            <span class="account-order-status" style="color:${statusColor};background:${statusColor}18">${escapeHTML(statusLabel)}</span>
          </div>
          <div class="account-order-body">
            <span style="font-size:13px;color:var(--ink-600)">${escapeHTML(String(o.items_count || o.line_items?.length || 1))} item${(o.items_count || 1) > 1 ? 's' : ''}</span>
            <strong style="font-size:14px">${formatPrice(o.total_amount || o.total || 0)}</strong>
          </div>
          ${o.id || o.order_id ? `<button class="btn-ghost" style="font-size:12px;margin-top:8px" onclick="window.cf.nav('/track?id=${escapeHTML(String(o.id || o.order_id))}')">Track this order →</button>` : ''}
        </div>`;
      }).join('');
    } catch(err) {
      el.innerHTML = `<p class="body-sm" style="color:var(--ink-400)">Couldn't load order history. <a href="/track" onclick="window.cf.nav('/track');return false;" style="color:var(--gold)">Track by order ID →</a></p>`;
    }
  }

  function handleAuthCallback(app) {
    navigate('/account');
  }

  function renderBlogPage(app, path) {
    const posts = [
      {
        slug: 'best-framed-art-prints-india-2025',
        title: 'Best Framed Art Prints to Buy Online in India (2025)',
        date: 'May 2025',
        readTime: '5 min read',
        category: 'Buying Guide',
        excerpt: 'A complete guide to buying premium framed art prints in India — what to look for in print quality, frame materials, sizing, and where to buy without overpaying.',
        img: DESIGN_IMAGES['radha-krishna-emerald-dance']
      },
      {
        slug: 'divine-wall-art-pooja-room',
        title: 'Divine Wall Art for Your Pooja Room: Radha Krishna, Mahadev & More',
        date: 'April 2025',
        readTime: '4 min read',
        category: 'Spiritual Art',
        excerpt: 'Transform your pooja room or meditation space with the right devotional wall art. We explore divine art prints — Radha Krishna, Lord Shiva, Ganesha — and how to choose the perfect frame.',
        img: DESIGN_IMAGES['mahadev-cosmic-trance']
      },
      {
        slug: 'automotive-wall-art-car-enthusiasts',
        title: 'Automotive Wall Art for Car Enthusiasts: BMW, Porsche, Lamborghini & F1',
        date: 'March 2025',
        readTime: '4 min read',
        category: 'Automotive Art',
        excerpt: 'The garage or man cave deserves art that matches your passion. From Porsche 911 retro posters to F1 championship prints — the best automotive wall art in India.',
        img: DESIGN_IMAGES['porsche-911-pacific-coast']
      },
      {
        slug: 'how-to-choose-frame-size-wall-art',
        title: 'How to Choose the Right Frame Size for Your Wall',
        date: 'February 2025',
        readTime: '3 min read',
        category: 'Interior Tips',
        excerpt: 'Picking the wrong size is the most common wall art mistake. Here\'s a practical guide to choosing between Small (8×10"), Medium (12×18"), Large (18×24") and XL (24×36") — with room-by-room recommendations.',
        img: DESIGN_IMAGES['lion-geometric-gold']
      },
      {
        slug: 'black-vs-natural-wood-frame',
        title: 'Black Frame vs Natural Wood Frame: Which Should You Choose?',
        date: 'January 2025',
        readTime: '3 min read',
        category: 'Interior Tips',
        excerpt: 'Both finishes are premium — but which suits your interior style? Modern minimalist spaces love matte black. Warm, rustic, or Scandinavian homes gravitate toward natural wood. Here\'s how to decide.',
        img: DESIGN_IMAGES['bmw-m4-carbon-dark']
      },
    ];

    const isDetail = path && path.split('/blog/')[1] && path.split('/blog/')[1].length > 0;
    const detailSlug = isDetail ? path.split('/blog/')[1].replace(/\//g, '') : null;
    const post = detailSlug ? posts.find(p => p.slug === detailSlug) : null;

    if (post) {
      // Blog post detail — keyword-rich SEO article
      document.title = `${post.title} | ChitraFrame Blog`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', post.excerpt);
      trackEvent('page_view', { page_title: post.title, page_location: location.href, content_type: 'article' });
      // Article schema
      const existingSchema = document.getElementById('article-schema');
      if (existingSchema) existingSchema.remove();
      const articleSchema = document.createElement('script');
      articleSchema.id = 'article-schema';
      articleSchema.type = 'application/ld+json';
      articleSchema.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: post.title, description: post.excerpt, image: post.img, author: { '@type': 'Organization', name: 'ChitraFrame' }, publisher: { '@type': 'Organization', name: 'ChitraFrame', logo: { '@type': 'ImageObject', url: 'https://chitraframe.in/static/logo.png' } }, datePublished: post.date, url: `https://chitraframe.in/blog/${post.slug}` });
      document.head.appendChild(articleSchema);

      const articleContent = {
        'best-framed-art-prints-india-2025': `
          <p>Buying framed art prints online in India has never been easier — but it's also never been easier to get burned by low-quality prints and flimsy frames. After helping our growing customer base find the perfect wall art, here's what we've learned.</p>
          <h2>1. Print Quality: What "Museum Quality" Actually Means</h2>
          <p>Genuine museum-quality printing uses archival pigment inks on heavyweight art paper (typically 250–300gsm). These inks are UV-stable, fade-resistant, and rated for 100+ years. Cheap alternatives use dye-based inks that fade in 3–5 years, especially near windows.</p>
          <p>At ChitraFrame, every print uses 12-colour archival pigment inks on 300gsm premium matte art paper. The difference is visible — and permanent.</p>
          <h2>2. Frame Materials: MDF vs Solid Wood</h2>
          <p>MDF (Medium Density Fibreboard) frames are lightweight and smooth, perfect for matte black finishes. Solid or engineered wood frames add warmth and texture, ideal for the natural wood look. Avoid plastic frames entirely — they warp and crack.</p>
          <h2>3. The Glass Question: Acrylic vs Real Glass</h2>
          <p>Shatterproof acrylic (perspex) is the standard for shipped frames — it's lighter and won't break in transit. Look for UV-protective acrylic to prevent print fading. Regular glass is fine for locally purchased art but risky for delivery.</p>
          <h2>4. Sizing for Your Space</h2>
          <p>As a rule: artwork should fill 57–75% of the wall space above a sofa or bed. For a typical 3-seater sofa (180cm wide), that means 100–135cm of art — either one large piece (XL frame) or a gallery wall of 3–4 medium frames.</p>
          <h2>5. Where to Buy: Our Honest Recommendation</h2>
          <p>For divine art, automotive prints, sports legends, and wildlife wall art — ChitraFrame is India's most curated option. Starting ₹499, delivered in 3–5 days with foam-lined packaging and a replacement guarantee.</p>`,
        'divine-wall-art-pooja-room': `
          <p>The pooja room is the heart of an Indian home. Choosing the right devotional wall art isn't just about aesthetics — it's about the energy and intention you bring into your sacred space.</p>
          <h2>Radha Krishna: The Eternal Union</h2>
          <p>Radha and Krishna represent divine love, devotion, and the union of the individual soul with the supreme. Art depicting Radha Krishna is considered highly auspicious for homes and pooja rooms. Opt for warm, vibrant colours — deep teals, golds, and soft pinks — for maximum visual impact.</p>
          <p>Our Radha Krishna Emerald Dance print features a mesmerising watercolour-inspired composition in teal and gold, perfect for a black frame in any pooja room or living space.</p>
          <h2>Lord Shiva (Mahadev): Cosmic Energy</h2>
          <p>Shiva represents consciousness, transformation, and infinite potential. Art of Mahadev in his cosmic form — meditating, surrounded by galaxies, or in trance — brings a sense of calm power to any room. Deep blues and purples work best for this theme.</p>
          <h2>Frame Colour for Sacred Art</h2>
          <p>For pooja rooms: Natural Wood frames complement warm, earthy tones and traditional interiors. Matte Black frames give a modern gallery feel that works in contemporary homes. Both are available at ChitraFrame for every divine print.</p>
          <h2>Vastu Considerations</h2>
          <p>According to Vastu Shastra, the North-East (Ishaan corner) of a room is ideal for devotional art. Avoid placing art in bedrooms where feet may point toward the image while sleeping.</p>`,
        'automotive-wall-art-car-enthusiasts': `
          <p>Your garage wall deserves more than a faded poster. India's automotive art scene has arrived — and ChitraFrame is at the front of the grid. Here's how to choose the best car and motorsport wall art for your space.</p>
          <h2>The Porsche 911: Timeless Motorsport Romance</h2>
          <p>The Porsche 911 is arguably the world's most beloved sports car, and it translates beautifully into wall art. Retro travel-poster compositions — think Pacific Coast highways, sunset gradients, hand-lettered typography — work exceptionally well as large-format prints. Our Porsche 911 Pacific Coast print is one of ChitraFrame's best-sellers for exactly this reason.</p>
          <h2>BMW M Series & Hypercar Prints</h2>
          <p>For the BMW enthusiast: the M4 in carbon-dark livery is a masterpiece of automotive design language. Our BMW M4 Carbon Dark print captures the aggression of the M-series in a high-contrast, cinematic composition. Ideal for home offices, gaming rooms, and garages.</p>
          <h2>Formula 1 & Championship Racing Art</h2>
          <p>F1 art is a growing category. Abstract speed compositions, championship liveries, and driver tribute prints work beautifully in matte black frames. Pair a large XL print (24×36") above a gaming setup or garage workbench for maximum impact.</p>
          <h2>Lamborghini & Supercar Wall Art</h2>
          <p>The Lamborghini Huracán and Aventador are icons of Italian excess — and they look spectacular in angular, high-contrast art prints. Warm amber tones and sharp silhouettes work best. Choose a medium (12×18") or large (18×24") format for a statement piece.</p>
          <h2>Frame Choice for Car Art</h2>
          <p>Matte black frames are the default choice for automotive art — they match the dark, cinematic mood of most car prints. Natural wood works well for more editorial or vintage automotive compositions. All ChitraFrame automotive prints come with a choice of both finishes.</p>
          <h2>Where to Hang It</h2>
          <p>Home garage: go large — XL (24×36") above the workbench. Home office: medium (12×18") in a curated gallery wall. Man cave or games room: create a three-print grid of different automotive subjects at the same scale.</p>`,
        'how-to-choose-frame-size-wall-art': `
          <p>Wrong frame size is the number one wall art mistake. It's easy to go too small — a 8×10" print on a large living room wall looks like a postage stamp. Here's how to get it right, room by room.</p>
          <h2>The 57–75% Rule</h2>
          <p>Art should fill between 57% and 75% of the wall space it anchors. For a typical 180cm sofa, that means 100–135cm of art width. Use a single XL frame or a gallery wall of 3–4 medium frames to hit this target.</p>
          <h2>ChitraFrame Size Guide</h2>
          <p><strong>Small (8×10" / 20×25cm)</strong> — Ideal for bedside tables, bathroom walls, small study nooks, and gallery walls as accent pieces. Works beautifully in sets of 3–6.</p>
          <p><strong>Medium (12×18" / 30×45cm)</strong> — The most versatile size. Works above a desk, in a dining room, or as part of a two-frame living room pairing. Our most popular size.</p>
          <p><strong>Large (18×24" / 45×60cm)</strong> — The statement size. Perfect above a sofa, bed, or fireplace. A single large print commands attention in any room.</p>
          <p><strong>XL (24×36" / 60×90cm)</strong> — Dominates a wall. Use in spacious living rooms, large master bedrooms, or as the hero piece in a double-height entryway. Reserved for truly impactful art.</p>
          <h2>Room-by-Room Recommendations</h2>
          <p><strong>Living room:</strong> Large or XL above sofa. If the sofa is 160–200cm wide, choose an 18×24" or 24×36" frame. <strong>Bedroom:</strong> Large above headboard, small on side walls. <strong>Home office:</strong> Medium on the wall behind your chair (creates great video call backdrops). <strong>Bathroom:</strong> Small or medium — avoid very large prints in humid spaces.</p>
          <h2>Gallery Wall Planning</h2>
          <p>For gallery walls, stick to one frame finish (all matte black or all natural wood) for visual coherence. Mix sizes: one large + two mediums + two smalls is the classic arrangement. Maintain 5–8cm gaps between frames. Plan on the floor first, then transfer to the wall.</p>`,
        'black-vs-natural-wood-frame': `
          <p>Both matte black and natural wood frames are premium choices at ChitraFrame. But they create very different rooms. Here's how to choose.</p>
          <h2>Matte Black Frames: The Modern Gallery Choice</h2>
          <p>Matte black is the contemporary default. It works in modern, minimalist, industrial, and Scandinavian interiors. The dark, neutral frame recedes visually, making the artwork the star. It pairs well with white walls, concrete accents, dark furniture, and monochrome colour palettes.</p>
          <p>Black frames are especially effective for: automotive art, abstract prints, black-and-white photography, and high-contrast digital art. If your interior uses clean lines, neutral colours, and modern materials, choose matte black.</p>
          <h2>Natural Wood Frames: Warmth & Texture</h2>
          <p>Natural wood brings warmth, texture, and an organic quality that black frames can't match. They work beautifully in warm, eclectic, bohemian, coastal, and traditional Indian interiors. Natural wood frames suit art with warm tones — ochres, terracottas, saffrons, deep greens.</p>
          <p>Natural wood frames are especially effective for: divine art, landscape prints, botanical art, traditional Indian subjects, and warm-toned photography. If your home has wooden furniture, warm-coloured walls, or natural materials, choose wood.</p>
          <h2>The Hybrid Gallery Wall</h2>
          <p>One advanced approach: mix both in a gallery wall. Use one large matte black frame as the anchor, then add natural wood frames as supporting pieces. This creates visual tension and a curated, collected-over-time feel. Keep the art styles consistent even if the frames differ.</p>
          <h2>Our Recommendation</h2>
          <p>When in doubt: choose matte black for urban apartments and modern interiors; choose natural wood for independent homes, traditional interiors, and anywhere you want warmth. Both are available for every ChitraFrame print from ₹499.</p>`,
        'default': `<p>${post.excerpt}</p><p>This article is coming soon. Browse our collection of premium framed art prints while you wait.</p>`
      };

      app.innerHTML = renderHeader() + `
      <main id="main-content">
        <article itemscope itemtype="https://schema.org/Article">
          <div class="page-hero-simple" style="min-height:360px;display:flex;align-items:flex-end">
            <div style="position:absolute;inset:0;overflow:hidden">
              <img src="${escapeHTML(post.img)}" alt="${escapeHTML(post.title)}" style="width:100%;height:100%;object-fit:cover;opacity:0.25">
              <div style="position:absolute;inset:0;background:linear-gradient(to top,var(--ink-900) 0%,rgba(15,14,12,0.7) 100%)"></div>
            </div>
            <div class="container" style="position:relative;z-index:1;padding-bottom:48px">
              <nav class="breadcrumb-inline" aria-label="Breadcrumb" style="color:rgba(255,255,255,0.5)">
                <a href="/" onclick="window.cf.nav('/');return false;" style="color:rgba(255,255,255,0.5)">Home</a> /
                <a href="/blog" onclick="window.cf.nav('/blog');return false;" style="color:rgba(255,255,255,0.5)">Blog</a> /
                <span style="color:rgba(255,255,255,0.7)">${escapeHTML(post.category)}</span>
              </nav>
              <p class="section-eyebrow" style="margin-top:12px">${escapeHTML(post.category)}</p>
              <h1 style="color:#fff;font-size:clamp(1.8rem,4vw,3rem);max-width:700px;margin:12px 0 16px" itemprop="headline">${escapeHTML(post.title)}</h1>
              <div style="display:flex;gap:16px;font-size:13px;color:rgba(255,255,255,0.5)">
                <span itemprop="datePublished">${escapeHTML(post.date)}</span>
                <span>·</span>
                <span>${escapeHTML(post.readTime)}</span>
                <span>·</span>
                <span itemprop="author">ChitraFrame Team</span>
              </div>
            </div>
          </div>
          <section class="section">
            <div class="container">
              <div class="blog-article-layout">
                <div class="blog-article-body" itemprop="articleBody">
                  ${articleContent[post.slug] || articleContent['default']}
                </div>
                <aside class="blog-article-sidebar">
                  <div class="blog-sidebar-cta">
                    <h3>Shop ChitraFrame</h3>
                    <p>Museum-quality framed art prints. Delivered across India in 3–5 days.</p>
                    <button class="btn-primary w-full" onclick="window.cf.nav('/shop')" style="margin-top:16px">
                      Browse All Prints
                    </button>
                    <button class="btn-outline w-full mt-2" onclick="window.cf.nav('/customize')">
                      Custom Frame Order
                    </button>
                    <div class="blog-sidebar-trust">
                      <div>⭐ 4.9/5 from verified reviews</div>
                      <div>📦 Free delivery above ₹799</div>
                      <div>✅ Replacement guarantee</div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </section>
          <section class="section section-alt">
            <div class="container">
              <div class="section-header">
                <h2 class="section-title">More Articles</h2>
              </div>
              <div class="blog-grid">
                ${posts.filter(p => p.slug !== post.slug).slice(0,3).map(p => `
                  <article class="blog-card" onclick="window.cf.nav('/blog/${p.slug}')" role="button" tabindex="0">
                    <div class="blog-card-img">
                      <img src="${escapeHTML(p.img)}" alt="${escapeHTML(p.title)}" loading="lazy">
                    </div>
                    <div class="blog-card-body">
                      <span class="blog-card-cat">${escapeHTML(p.category)}</span>
                      <h3>${escapeHTML(p.title)}</h3>
                      <p>${escapeHTML(p.excerpt.slice(0, 100))}…</p>
                      <span class="blog-card-meta">${escapeHTML(p.date)} · ${escapeHTML(p.readTime)}</span>
                    </div>
                  </article>`).join('')}
              </div>
            </div>
          </section>
        </article>
      </main>
      ${renderFooter()}`;

    } else {
      // Blog index — keyword-rich listing
      document.title = 'ChitraFrame Blog — Art Buying Guides, Interior Tips & Frame Ideas India';
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', 'ChitraFrame blog: expert guides on buying framed art prints in India, interior styling tips, frame selection advice, divine art for pooja rooms, and more.');

      app.innerHTML = renderHeader() + `
      <main id="main-content">
        <div class="page-hero-simple">
          <div class="container">
            <nav class="breadcrumb-inline" aria-label="Breadcrumb">
              <a href="/" onclick="window.cf.nav('/');return false;">Home</a> /
              <span aria-current="page">Blog</span>
            </nav>
            <p class="section-eyebrow">Guides & inspiration</p>
            <h1>The ChitraFrame Journal</h1>
            <p class="page-hero-sub">Art buying guides, interior styling tips, frame selection advice — for people who care about their walls.</p>
          </div>
        </div>
        <section class="section">
          <div class="container">
            <div class="blog-grid blog-grid-full">
              ${posts.map((p, i) => `
                <article class="blog-card${i === 0 ? ' blog-card-featured' : ''}"
                  onclick="window.cf.nav('/blog/${p.slug}')"
                  role="button" tabindex="0"
                  onkeydown="if(event.key==='Enter')window.cf.nav('/blog/${p.slug}')"
                  data-reveal data-reveal-delay="${i % 3}">
                  <div class="blog-card-img">
                    <img src="${escapeHTML(p.img)}" alt="${escapeHTML(p.title)}" loading="lazy">
                  </div>
                  <div class="blog-card-body">
                    <span class="blog-card-cat">${escapeHTML(p.category)}</span>
                    <h2 class="blog-card-title">${escapeHTML(p.title)}</h2>
                    <p class="blog-card-excerpt">${escapeHTML(p.excerpt)}</p>
                    <div class="blog-card-meta">${escapeHTML(p.date)} · ${escapeHTML(p.readTime)}</div>
                    <span class="blog-card-read">Read article →</span>
                  </div>
                </article>`).join('')}
            </div>
          </div>
        </section>
      </main>
      ${renderFooter()}`;
    }

    initMobileMenu();
    initStickyHeader();
    setTimeout(initReveal, 100);
  }

  function renderReviewPage(app) {
    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <section class="section">
        <div class="container">
          <div class="track-form-wrap">
            <h1 class="mb-6">Write a Review</h1>
            <p class="text-ink-500 mb-8">Received your ChitraFrame? Share your experience!</p>
            <form class="track-form" onsubmit="window.cf.submitReview(event)">
              <div class="form-field">
                <label for="review-name">Your Name *</label>
                <input type="text" id="review-name" name="name" required maxlength="100" placeholder="Your name">
              </div>
              <div class="form-field">
                <label>Rating *</label>
                <div class="star-picker" id="star-picker" role="group" aria-label="Select rating">
                  ${[1,2,3,4,5].map(n => `<button type="button" class="star-pick" data-val="${n}" onclick="window.cf.pickStar(${n})" aria-label="${n} star${n>1?'s':''}">★</button>`).join('')}
                </div>
                <input type="hidden" name="rating" id="review-rating" value="5">
              </div>
              <div class="form-field">
                <label for="review-body">Your Review *</label>
                <textarea id="review-body" name="body" rows="4" required maxlength="2000" placeholder="Tell us what you loved..."></textarea>
              </div>
              <button type="submit" class="btn-primary">Submit Review</button>
            </form>
          </div>
        </div>
      </section>
    </main>
    ${renderFooter()}`;

    initMobileMenu();
    initStickyHeader();
    // Highlight all stars by default
    setTimeout(() => { $$('.star-pick').forEach(s => s.classList.add('star-active')); }, 50);
  }

  function pickStar(n) {
    $$('.star-pick').forEach((s, i) => s.classList.toggle('star-active', i < n));
    const input = $('#review-rating');
    if (input) input.value = n;
  }

  async function submitReview(e) {
    e.preventDefault();
    // FIX s6.7: Disable button + show loading state
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const origText = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px"><span style="width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block"></span>Submitting...</span>'; }
    const data = new FormData(form);
    try {
      await fetch(`${API}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: 'general',
          name: data.get('name'),
          rating: parseInt(data.get('rating') || '5'),
          body: data.get('body')
        })
      });
      toast('🎉 Thank you! Your review is awaiting approval.', 'success');
      form.reset();
    } catch (err) {
      toast('Could not submit review. Please try again.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = origText; }
    }
  }

  // ── Newsletter ─────────────────────────────────────────────────────────────
  async function handleNewsletter(e) {
    e.preventDefault();
    // FIX s6.7: Loading state on newsletter submit
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const origText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Subscribing...'; }
    const email = form.querySelector('[name="email"]').value.trim();
    try {
      await fetch(`${API}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'newsletter' })
      });
      toast('🎉 You\'re subscribed! Watch for beautiful drops in your inbox.');
      form.reset();
    } catch (err) {
      toast('Subscribed! Welcome to ChitraFrame.');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = origText; }
    }
  }

  // ── Config Loader ─────────────────────────────────────────────────────────
  async function loadConfig() {
    try {
      const res = await fetch(`${API}/config/public`);
      const data = await res.json();
      if (data.config) {
        state.config = data.config;
        // Update announcement bar if present
        const bar = $('.promo-bar');
        if (bar && data.config.announcement_active === 'true') {
          const p = bar.querySelector('p');
          if (p) p.textContent = data.config.announcement_text || p.textContent;
        }
      }
    } catch (e) { /* Use defaults */ }
  }

  // ── Exit Intent ───────────────────────────────────────────────────────────
  function initExitIntent() {
    // FIX s6.4: Honest copy — check cart total vs ₹899 free-shipping threshold
    if (state.exitShown || state.cart.length === 0) return;
    document.addEventListener('mouseleave', function handler(e) {
      if (e.clientY > 10 || state.exitShown) return;
      state.exitShown = true;
      document.removeEventListener('mouseleave', handler);

      const totals = getCartTotals('prepaid');
      const cartTotal = totals.subtotal || 0;
      const freeShippingThreshold = 899;
      const amountToFree = freeShippingThreshold - cartTotal;
      const hasItems = state.cart.length > 0;

      let headline, body, cta;
      if (!hasItems) return; // safety — already checked above
      if (cartTotal >= freeShippingThreshold) {
        // Cart qualifies for free shipping — honest: no fake coupon
        headline = 'Your cart is ready';
        body = `You qualify for <strong>free shipping</strong> — your items are freshly printed per order and ship in 3–5 days.`;
        cta = 'Complete my order →';
      } else {
        // Cart below threshold
        headline = 'Before you go';
        body = `Add <strong>${formatPrice(amountToFree)}</strong> more to unlock free shipping. Every print is made to order — no mass production, ever.`;
        cta = 'Continue shopping';
      }

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'Before you leave');
      modal.innerHTML = `
        <div class="modal-box exit-modal">
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" aria-label="Close">×</button>
          <h3>${headline}</h3>
          <p>${body}</p>
          <button class="btn-primary w-full" onclick="window.cf.nav('${cartTotal >= freeShippingThreshold ? '/checkout' : '/shop'}');this.closest('.modal-overlay').remove()">${cta}</button>
          <button class="btn-ghost w-full mt-2" style="margin-top:8px" onclick="this.closest('.modal-overlay').remove()">Maybe later</button>
        </div>`;
      modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
      document.body.appendChild(modal);
    });
  }

  // ── CUSTOM FRAME PAGE ────────────────────────────────────────────────────
  function customCalcPrice() {
    const sizeSelect = document.getElementById('custom-size');
    const frameVal = window._customFrameVal || 'black';
    const sizePrices = { small: 699, medium: 999, large: 1499, xl: 2199 };
    const frameExtra = { black: 0, 'natural-wood': 100 };
    const size = sizeSelect?.value || 'medium';
    const base = (sizePrices[size] || 999) + (frameExtra[frameVal] || 0);
    const el = document.getElementById('custom-price-display');
    if (el) el.textContent = formatPrice(base);
    // Update preview label
    const sizeLabelMap = { small: 'Small (8×10")', medium: 'Medium (12×18")', large: 'Large (18×24")', xl: 'XL (24×36")' };
    const frameLabel = frameVal === 'natural-wood' ? 'Natural Wood' : 'Black';
    const lbl = document.getElementById('frame-preview-label');
    if (lbl) lbl.textContent = `${frameLabel} Frame · ${sizeLabelMap[size] || 'Medium'}`;
    // Update preview border
    const outer = document.getElementById('frame-preview-outer');
    if (outer) outer.style.borderColor = frameVal === 'natural-wood' ? '#8B6914' : '#1a1a1a';
    window._customState = { size, frame: frameVal, qty: 1, price: base };
    // Update summary
    const sumSize = document.getElementById('summary-size');
    const sumFrame = document.getElementById('summary-frame');
    if (sumSize) sumSize.textContent = sizeLabelMap[size] || 'Medium';
    if (sumFrame) sumFrame.textContent = frameLabel;
  }

  async function submitCustomOrder() {
    // FIX s1.3: Upload image to Cloudinary via backend API before saving order
    // Use new _cfwState (wizard) — fallback to _customState (legacy)
    const s = window._cfwState || window._customState || {};

    // Read from new wizard fields first, fallback to old field IDs
    const name = (document.getElementById('cfw-name') || document.getElementById('custom-name'))?.value?.trim();
    const phone = (document.getElementById('cfw-phone') || document.getElementById('custom-phone'))?.value?.trim();
    const note = (document.getElementById('cfw-notes') || document.getElementById('custom-note'))?.value?.trim();

    if (!name || name.length < 2) { toast('Please enter your full name', 'error'); return; }
    if (!phone || !/^[6-9]\d{9}$/.test(phone.replace(/\D/g, ''))) { toast('Please enter a valid 10-digit WhatsApp number', 'error'); return; }

    // Build item details from cfwState
    const sizeLabel = s.sizeLabel || s.size || 'Medium (12\u00d718")';
    const style = s.style || 'Direct';
    const basePrice = Number(s.basePrice || s.price || 799);
    const mountAddon = s.mountAddon ? 250 : 0;
    const posterAddon = s.posterAddon ? 199 : 0;
    const totalItemPrice = basePrice + mountAddon + posterAddon;

    const styleDisplay = style === 'Mount' ? 'Mount (White Border)' : 'Direct';
    let itemName = `Custom Frame \u2014 ${sizeLabel} \u00b7 ${styleDisplay}`;
    if (s.posterAddon) itemName += ' + A3 Poster';

    // FIX s1.3: Disable submit button + show upload progress
    const submitBtn = document.getElementById('cfw-submit-btn') || document.querySelector('.cfw-step-submit');
    const origBtnText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px"><span style="width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block"></span>Uploading image...</span>'; }

    // FIX s1.3: Upload image to Cloudinary via /api/upload-image (NOT storing base64 in DB)
    let cloudinaryImageUrl = null;
    if (s.uploadedDataUrl && s.uploadedDataUrl.startsWith('data:')) {
      try {
        const uploadRes = await fetch(`${API}/upload/image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl: s.uploadedDataUrl,
            folder: 'chitraframe/custom-orders',
            tags: ['custom-frame', phone.replace(/\D/g,'').slice(-4)]
          })
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          cloudinaryImageUrl = uploadData.secure_url || uploadData.url || null;
        } else {
          // Non-blocking: if upload fails, log but continue order
          console.warn('Image upload failed:', await uploadRes.text());
        }
      } catch (uploadErr) {
        console.warn('Image upload error:', uploadErr);
      }
    }

    if (submitBtn) { submitBtn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px"><span style="width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block"></span>Placing order...</span>'; }

    // Store Cloudinary URL (never base64) in cart item
    addToCart({
      variantId: `custom-${(s.size||'medium').toLowerCase()}-${style.toLowerCase()}-${Date.now()}`,
      name: itemName,
      price: totalItemPrice,
      image: cloudinaryImageUrl || DESIGN_IMAGES['lion-geometric-gold'] || '',
      slug: 'custom-frame',
      size: sizeLabel,
      frame: styleDisplay,
      customNote: note || '',
      customerName: name,
      customerPhone: phone,
      // FIX s1.3: Store CDN URL only, never raw base64 data
      uploadedImageUrl: cloudinaryImageUrl || null,
    });

    // Capture lead via API
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, phone,
        source: 'custom-frame-wizard',
        notes: `Size: ${sizeLabel} | Style: ${styleDisplay} | Mount: ${mountAddon > 0} | Poster: ${posterAddon > 0} | Image: ${cloudinaryImageUrl ? 'uploaded' : 'none'} | Note: ${note || 'None'}`
      })
    }).catch(() => {});

    // Log to Supabase custom_framing_orders_intake with Cloudinary URL
    fetch('/api/custom-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyer_fullname: name,
        buyer_whatsapp_phone: phone.replace(/\D/g, ''),
        // FIX s1.3: Use Cloudinary CDN URL not 'client-upload' placeholder
        uploaded_image_storage_path: cloudinaryImageUrl || (s.uploadedDataUrl ? 'upload-failed' : 'no-upload'),
        selected_dimension_profile: (s.size || 'Medium').charAt(0).toUpperCase() + (s.size || 'Medium').slice(1),
        selected_framing_style: style,
        include_poster_print_copy: !!s.posterAddon,
        user_special_instructions: note || '',
        computed_subtotal_amount: totalItemPrice
      })
    }).catch(() => {});

    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = origBtnText; }
    toast('Custom frame added to cart! \ud83c\udfa8', 'success');
    setTimeout(() => navigate('/checkout'), 700);
  }

  function renderCustomizePage(app) {
    document.title = 'Custom Photo Frame — Upload & Order | ChitraFrame';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', 'Order a custom photo frame at ChitraFrame. Upload your photo, choose your size and framing style, and we handle everything else. Delivered across India in 3–5 days.');

    app.innerHTML = renderHeader() + `
    <main id="main-content" class="cfw-main">
      <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "Service",
        "name": "Custom Photo Frame Order",
        "description": "Upload your photo and order a custom museum-quality frame at ChitraFrame. 4 sizes, Black or Natural Wood or Mount framing. Delivered across India in 3–5 days.",
        "provider": { "@type": "Organization", "name": "ChitraFrame", "url": "https://chitraframe.in" },
        "areaServed": "IN",
        "serviceType": "Custom Photo Framing",
        "offers": { "@type": "AggregateOffer", "priceCurrency": "INR", "lowPrice": "499", "highPrice": "1999", "offerCount": "4" }
      }
      <\/script>

      <!-- ── Page Header ─────────────────────────────────── -->
      <div class="cfw-page-header">
        <div class="container">
          <nav class="breadcrumb-inline" aria-label="Breadcrumb">
            <a href="/" onclick="window.cf.nav('/');return false;">Home</a> /
            <span aria-current="page">Custom Frame</span>
          </nav>
          <h1 class="cfw-page-title">Frame Your <em>Photo</em></h1>
          <p class="cfw-page-sub">Upload · Choose size · We print &amp; deliver in 3–5 days</p>
          <div class="cfw-header-trust">
            <span>✓ Any photo accepted</span>
            <span>✓ Digital proof sent</span>
            <span>✓ COD available</span>
            <span>✓ Free replacement</span>
          </div>
        </div>
      </div>

      <!-- ── Main Layout ────────────────────────────────── -->
      <div class="cfw-layout">
        <div class="container">
          <div class="cfw-cols">

            <!-- LEFT: Form -->
            <div class="cfw-form-col">

              <!-- ── SECTION 1: Upload ──────────────────── -->
              <section class="cfw-section" aria-labelledby="cfw-s1-title">
                <div class="cfw-section-header">
                  <div class="cfw-section-num" aria-hidden="true">1</div>
                  <div>
                    <h2 class="cfw-section-title" id="cfw-s1-title">Upload Your Photo</h2>
                    <p class="cfw-section-hint">Any format, any resolution — we handle the quality</p>
                  </div>
                </div>

                <label class="cfw-upload-zone" id="cfw-upload-label" for="cfw-file-input" tabindex="0" role="button" aria-label="Tap to upload your photo">
                  <input type="file" id="cfw-file-input" accept="image/*" style="display:none" onchange="window.cf.cfwHandleUpload(this)">
                  <div class="cfw-upload-idle" id="cfw-upload-idle">
                    <div class="cfw-upload-icon-wrap" aria-hidden="true">
                      <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="17" stroke="var(--gold)" stroke-width="1.2" opacity="0.4"/><path d="M18 11v10M13 16l5-5 5 5" stroke="var(--gold)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 27h14" stroke="var(--gold)" stroke-width="1.4" stroke-linecap="round" opacity="0.5"/></svg>
                    </div>
                    <strong class="cfw-upload-cta">Tap to upload your photo</strong>
                    <span class="cfw-upload-hint">JPG · PNG · HEIC — any size accepted</span>
                    <span class="cfw-upload-wa-hint">Or share via WhatsApp after ordering</span>
                  </div>
                  <div class="cfw-upload-preview" id="cfw-upload-preview" style="display:none">
                    <img id="cfw-thumb" alt="Your uploaded photo" class="cfw-thumb-img">
                    <div class="cfw-upload-done">
                      <span class="cfw-done-icon" aria-hidden="true">✓</span>
                      <div>
                        <strong>Photo uploaded!</strong>
                        <p>We'll send you a digital proof before printing</p>
                      </div>
                      <button type="button" class="cfw-reupload-btn" onclick="document.getElementById('cfw-file-input').click();event.preventDefault();event.stopPropagation()">Change</button>
                    </div>
                  </div>
                </label>
                <p class="cfw-legal">By uploading, you confirm you have rights to print this image.</p>
              </section>

              <!-- ── SECTION 2: Size ───────────────────── -->
              <section class="cfw-section" aria-labelledby="cfw-s2-title">
                <div class="cfw-section-header">
                  <div class="cfw-section-num" aria-hidden="true">2</div>
                  <div>
                    <h2 class="cfw-section-title" id="cfw-s2-title">Choose Your Size</h2>
                    <p class="cfw-section-hint">Select the size that fits your wall</p>
                  </div>
                </div>

                <div class="cfw-sizes" role="group" aria-label="Frame size">
                  <button class="cfw-size-tile" id="cfw-sz-small" type="button"
                    onclick="window.cf.cfwSelectSize('Small','8×12&quot;',499,'cfw-sz-small')"
                    aria-pressed="false">
                    <div class="cfw-size-visual" aria-hidden="true">
                      <div class="cfw-size-frame cfw-size-frame--small"></div>
                    </div>
                    <div class="cfw-size-label">
                      <strong>Small</strong>
                      <span>8 × 12"</span>
                      <span class="cfw-size-ctx">Desk &amp; shelf</span>
                    </div>
                    <span class="cfw-size-price-tag">₹499</span>
                  </button>

                  <button class="cfw-size-tile cfw-size-tile--active" id="cfw-sz-medium" type="button"
                    onclick="window.cf.cfwSelectSize('Medium','12×18&quot;',799,'cfw-sz-medium')"
                    aria-pressed="true">
                    <div class="cfw-size-popular-tag" aria-hidden="true">Most Popular</div>
                    <div class="cfw-size-visual" aria-hidden="true">
                      <div class="cfw-size-frame cfw-size-frame--medium"></div>
                    </div>
                    <div class="cfw-size-label">
                      <strong>Medium</strong>
                      <span>12 × 18"</span>
                      <span class="cfw-size-ctx">Bedroom wall</span>
                    </div>
                    <span class="cfw-size-price-tag">₹799</span>
                  </button>

                  <button class="cfw-size-tile" id="cfw-sz-large" type="button"
                    onclick="window.cf.cfwSelectSize('Large','18×24&quot;',1149,'cfw-sz-large')"
                    aria-pressed="false">
                    <div class="cfw-size-visual" aria-hidden="true">
                      <div class="cfw-size-frame cfw-size-frame--large"></div>
                    </div>
                    <div class="cfw-size-label">
                      <strong>Large</strong>
                      <span>18 × 24"</span>
                      <span class="cfw-size-ctx">Living room</span>
                    </div>
                    <span class="cfw-size-price-tag">₹1,149</span>
                  </button>

                  <button class="cfw-size-tile" id="cfw-sz-xl" type="button"
                    onclick="window.cf.cfwSelectSize('XL','24×36&quot;',1749,'cfw-sz-xl')"
                    aria-pressed="false">
                    <div class="cfw-size-visual" aria-hidden="true">
                      <div class="cfw-size-frame cfw-size-frame--xl"></div>
                    </div>
                    <div class="cfw-size-label">
                      <strong>XL</strong>
                      <span>24 × 36"</span>
                      <span class="cfw-size-ctx">Statement wall</span>
                    </div>
                    <span class="cfw-size-price-tag">₹1,749</span>
                  </button>
                </div>
              </section>

              <!-- ── SECTION 3: Frame Style ─────────────── -->
              <section class="cfw-section" aria-labelledby="cfw-s3-title">
                <div class="cfw-section-header">
                  <div class="cfw-section-num" aria-hidden="true">3</div>
                  <div>
                    <h2 class="cfw-section-title" id="cfw-s3-title">Frame Style</h2>
                    <p class="cfw-section-hint">All frames are solid wood, handcrafted</p>
                  </div>
                </div>

                <div class="cfw-frames" role="group" aria-label="Frame style">
                  <button class="cfw-frame-tile cfw-frame-tile--active" id="cfw-ft-black" type="button"
                    onclick="window.cf.cfwSelectFrameType('Black Frame',0,'cfw-ft-black','cfw-ft-wood','cfw-ft-mount')"
                    aria-pressed="true">
                    <div class="cfw-frame-swatch cfw-frame-swatch--black" aria-hidden="true"></div>
                    <div class="cfw-frame-label">
                      <strong>Black Frame</strong>
                      <span>Classic matte</span>
                    </div>
                    <span class="cfw-frame-price-tag">Included</span>
                  </button>

                  <button class="cfw-frame-tile" id="cfw-ft-wood" type="button"
                    onclick="window.cf.cfwSelectFrameType('Natural Wood',0,'cfw-ft-wood','cfw-ft-black','cfw-ft-mount')"
                    aria-pressed="false">
                    <div class="cfw-frame-swatch cfw-frame-swatch--wood" aria-hidden="true"></div>
                    <div class="cfw-frame-label">
                      <strong>Natural Wood</strong>
                      <span>Warm oak tone</span>
                    </div>
                    <span class="cfw-frame-price-tag">Included</span>
                  </button>

                  <button class="cfw-frame-tile" id="cfw-ft-mount" type="button"
                    onclick="window.cf.cfwSelectFrameType('Mount Frame',250,'cfw-ft-mount','cfw-ft-black','cfw-ft-wood')"
                    aria-pressed="false">
                    <div class="cfw-frame-swatch cfw-frame-swatch--mount" aria-hidden="true"></div>
                    <div class="cfw-frame-label">
                      <strong>Mount Frame</strong>
                      <span>White mat border</span>
                    </div>
                    <span class="cfw-frame-price-tag cfw-frame-addon">+₹250</span>
                  </button>
                </div>

                <!-- Poster add-on -->
                <label class="cfw-addon-check" id="cfw-poster-addon">
                  <input type="checkbox" id="cfw-poster-check" onchange="window.cf.cfwCalcPrice()">
                  <div class="cfw-addon-check-body">
                    <div>
                      <strong>Add A3 Poster Print</strong>
                      <span>An extra rolled A3 print of your photo</span>
                    </div>
                    <span class="cfw-addon-check-price">+₹199</span>
                  </div>
                </label>
              </section>

              <!-- ── SECTION 4: Your Details ────────────── -->
              <section class="cfw-section" aria-labelledby="cfw-s4-title">
                <div class="cfw-section-header">
                  <div class="cfw-section-num" aria-hidden="true">4</div>
                  <div>
                    <h2 class="cfw-section-title" id="cfw-s4-title">Your Details</h2>
                    <p class="cfw-section-hint">Two fields — we handle everything else</p>
                  </div>
                </div>

                <div class="cfw-fields">
                  <div class="cfw-field">
                    <label for="cfw-name" class="cfw-field-label">Full Name *</label>
                    <input type="text" id="cfw-name" class="cfw-input" placeholder="Your full name"
                      maxlength="100" autocomplete="name" inputmode="text">
                  </div>
                  <div class="cfw-field">
                    <label for="cfw-phone" class="cfw-field-label">WhatsApp / Mobile *</label>
                    <input type="tel" id="cfw-phone" class="cfw-input" placeholder="10-digit mobile number"
                      maxlength="15" autocomplete="tel" inputmode="numeric">
                  </div>
                  <div class="cfw-field">
                    <label for="cfw-notes" class="cfw-field-label">
                      Special Instructions
                      <span class="cfw-optional-tag">Optional</span>
                    </label>
                    <textarea id="cfw-notes" class="cfw-textarea" rows="3" maxlength="800"
                      placeholder="Crop preferences, orientation, colour notes... our team reads every word"></textarea>
                  </div>
                </div>

                <div class="cfw-bulk-note">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M4 6h6M4 8.5h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                  Ordering 10+ frames?
                  <a href="/contact" onclick="window.cf.nav('/contact');return false;">Contact us for bulk pricing →</a>
                </div>

                <!-- Desktop order CTA (inside form col, visible on >= 640px) -->
                <div class="cfw-desktop-ctas">
                  <button class="cfw-order-btn" onclick="window.cf.submitCustomOrder()" id="cfw-cart-btn">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1 1h2.5l2.4 9.6h8.1l2-7H5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="15" r="1.2" fill="currentColor"/><circle cx="13" cy="15" r="1.2" fill="currentColor"/></svg>
                    Proceed to Cart &amp; Secure Order
                    <span class="cfw-order-btn-price" id="cfw-desktop-total">₹898</span>
                  </button>
                  <button class="cfw-wa-order-btn" type="button" onclick="window.cf.cfwWhatsAppOrder()">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.6 2.4A7.8 7.8 0 0 0 2.4 13.6L1 15l1.5-.4A7.8 7.8 0 1 0 13.6 2.4z" fill="#25D366"/><path d="M5.5 4.5c-.1-.3-.3-.3-.5-.3s-.3 0-.5.1c-.2.1-.7.7-.7 1.7s.7 2 .8 2.1 1.4 2.2 3.4 3c.5.2.8.3 1.1.3s.6-.1.8-.3c.2-.2.5-.8.6-1.1.1-.2 0-.4-.1-.5l-1.2-.6c-.2-.1-.4 0-.5.1l-.4.5c-.1.1-.2.1-.4 0a5.2 5.2 0 0 1-1.6-1.4c-.1-.2 0-.3.1-.4l.3-.4c.1-.1.1-.3.1-.4L5.5 4.5z" fill="#fff"/></svg>
                    Order via WhatsApp instead
                  </button>
                </div>
              </section>

            </div>

            <!-- RIGHT: Summary sidebar (desktop only) -->
            <aside class="cfw-sidebar" aria-label="Order summary">
              <!-- Live mockup -->
              <div class="cfw-mockup-wrap">
                <div class="cfw-mockup-frame" id="cfw-frame-outer">
                  <div class="cfw-mockup-mat" id="cfw-mat-border">
                    <div class="cfw-mockup-photo" id="cfw-photo-area">
                      <svg viewBox="0 0 160 200" fill="none" width="100%" height="100%">
                        <rect width="160" height="200" fill="#1a1a2e"/>
                        <circle cx="80" cy="80" r="44" fill="none" stroke="var(--gold)" stroke-width="1" opacity="0.4"/>
                        <circle cx="80" cy="64" r="18" fill="var(--gold)" opacity="0.15"/>
                        <path d="M44 140 Q80 118 116 140" stroke="var(--gold)" stroke-width="1.5" fill="none" opacity="0.4"/>
                        <text x="80" y="180" text-anchor="middle" fill="rgba(201,151,58,0.5)" font-size="9" font-family="serif">Your Photo Here</text>
                      </svg>
                    </div>
                  </div>
                </div>
                <p class="cfw-mockup-caption" id="cfw-mockup-label">Medium · Black Frame · ₹898</p>
              </div>

              <!-- Summary card -->
              <div class="cfw-summary-box">
                <h3 class="cfw-summary-box-title">Order Summary</h3>
                <div class="cfw-sum-rows">
                  <div class="cfw-sum-row"><span>Size</span><span id="cfw-sum-size">Medium (12×18")</span></div>
                  <div class="cfw-sum-row"><span>Frame</span><span id="cfw-sum-style">Black Frame</span></div>
                  <div class="cfw-sum-row" id="cfw-sum-mount-row" style="display:none"><span>Mount add-on</span><span>+₹250</span></div>
                  <div class="cfw-sum-row" id="cfw-sum-poster-row" style="display:none"><span>A3 Poster print</span><span>+₹199</span></div>
                  <div class="cfw-sum-sep"></div>
                  <div class="cfw-sum-row cfw-sum-sub"><span>Subtotal</span><span id="cfw-sum-subtotal">₹799</span></div>
                  <div class="cfw-sum-row" id="cfw-sum-shipping"><span>Shipping</span><span id="cfw-sum-shipping-val">₹99</span></div>
                  <div class="cfw-sum-sep"></div>
                  <div class="cfw-sum-row cfw-sum-total-row"><span>Total</span><span id="cfw-sum-total">₹898</span></div>
                </div>
                <p class="cfw-free-hint" id="cfw-free-hint">Add ₹101 more for <strong>free shipping!</strong></p>

                <button class="cfw-order-btn" onclick="window.cf.submitCustomOrder()">
                  <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M1 1h2.5l2.4 9.6h8.1l2-7H5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="15" r="1.2" fill="currentColor"/><circle cx="13" cy="15" r="1.2" fill="currentColor"/></svg>
                  Proceed to Cart &amp; Secure Order
                </button>
                <button class="cfw-wa-order-btn" type="button" onclick="window.cf.cfwWhatsAppOrder()">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M13.6 2.4A7.8 7.8 0 0 0 2.4 13.6L1 15l1.5-.4A7.8 7.8 0 1 0 13.6 2.4z" fill="#25D366"/><path d="M5.5 4.5c-.1-.3-.3-.3-.5-.3s-.3 0-.5.1c-.2.1-.7.7-.7 1.7s.7 2 .8 2.1 1.4 2.2 3.4 3c.5.2.8.3 1.1.3s.6-.1.8-.3c.2-.2.5-.8.6-1.1.1-.2 0-.4-.1-.5l-1.2-.6c-.2-.1-.4 0-.5.1l-.4.5c-.1.1-.2.1-.4 0a5.2 5.2 0 0 1-1.6-1.4c-.1-.2 0-.3.1-.4l.3-.4c.1-.1.1-.3.1-.4L5.5 4.5z" fill="#fff"/></svg>
                  Order via WhatsApp
                </button>

                <div class="cfw-sidebar-trust">
                  <div>⭐ 4.9 · Verified orders</div>
                  <div>🛡️ Digital proof before printing</div>
                  <div>📦 Free replacement on damage</div>
                </div>
              </div>
            </aside>

          </div>
        </div>
      </div>

      <!-- ── Mobile sticky bottom bar ─────────────────── -->
      <div class="cfw-bottom-bar" id="cfw-bottom-bar" aria-label="Order total and CTA">
        <div class="cfw-bottom-bar-inner">
          <div class="cfw-bottom-price">
            <span class="cfw-bottom-label">Total</span>
            <span class="cfw-bottom-total" id="cfw-sticky-total">₹898</span>
          </div>
          <button class="cfw-bottom-cta" onclick="window.cf.submitCustomOrder()">
            Place Order →
          </button>
        </div>
      </div>

    </main>
    ${renderFooter()}`;

    // ── State & logic ──────────────────────────────────────────────────────
    window._cfwState = {
      size: 'Medium', sizeLabel: 'Medium (12×18")', basePrice: 799,
      style: 'Black Frame', frameType: 'Black Frame', mountAddon: 0,
      posterAddon: false, uploadedFile: null, uploadedDataUrl: null
    };

    window.cf.cfwHandleUpload = function(input) {
      const file = input.files[0];
      if (!file) return;
      window._cfwState.uploadedFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        window._cfwState.uploadedDataUrl = e.target.result;
        const thumb = document.getElementById('cfw-thumb');
        const idle = document.getElementById('cfw-upload-idle');
        const preview = document.getElementById('cfw-upload-preview');
        if (thumb) thumb.src = e.target.result;
        if (idle) idle.style.display = 'none';
        if (preview) { preview.style.display = 'flex'; }
        const photoArea = document.getElementById('cfw-photo-area');
        if (photoArea) {
          photoArea.innerHTML = '<img src="'+e.target.result+'" alt="Preview" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:2px;">';
        }
      };
      reader.readAsDataURL(file);
    };

    window.cf.cfwSelectSize = function(size, dim, price, cardId) {
      window._cfwState.size = size;
      window._cfwState.sizeLabel = size + ' (' + dim + ')';
      window._cfwState.basePrice = price;
      document.querySelectorAll('.cfw-size-tile').forEach(c => {
        c.classList.remove('cfw-size-tile--active');
        c.setAttribute('aria-pressed', 'false');
      });
      const card = document.getElementById(cardId);
      if (card) { card.classList.add('cfw-size-tile--active'); card.setAttribute('aria-pressed', 'true'); }
      window.cf.cfwCalcPrice();
    };

    window.cf.cfwSelectStyle = function(style, addon, activeId, inactiveId) {
      window._cfwState.style = style;
      window._cfwState.frameType = style;
      window._cfwState.mountAddon = addon;
      document.querySelectorAll('.cfw-frame-tile').forEach(b => {
        b.classList.remove('cfw-frame-tile--active');
        b.setAttribute('aria-pressed', 'false');
      });
      const aBtn = document.getElementById(activeId);
      if (aBtn) { aBtn.classList.add('cfw-frame-tile--active'); aBtn.setAttribute('aria-pressed', 'true'); }
      const mountRow = document.getElementById('cfw-sum-mount-row');
      if (mountRow) mountRow.style.display = addon > 0 ? 'flex' : 'none';
      const mat = document.getElementById('cfw-mat-border');
      if (mat) {
        mat.style.padding = style === 'Mount Frame' ? '14px' : '0';
        mat.style.background = style === 'Mount Frame' ? '#fff' : 'transparent';
      }
      window.cf.cfwCalcPrice();
    };

    window.cf.cfwSelectFrameType = function(frameType, mountAddon, activeId) {
      const inactiveIds = Array.prototype.slice.call(arguments, 3);
      window._cfwState.frameType = frameType;
      window._cfwState.style = frameType;
      window._cfwState.mountAddon = mountAddon;
      document.querySelectorAll('.cfw-frame-tile').forEach(b => {
        b.classList.remove('cfw-frame-tile--active');
        b.setAttribute('aria-pressed', 'false');
      });
      const aBtn = document.getElementById(activeId);
      if (aBtn) { aBtn.classList.add('cfw-frame-tile--active'); aBtn.setAttribute('aria-pressed', 'true'); }
      inactiveIds.forEach(function(id) {
        const b = document.getElementById(id);
        if (b) { b.classList.remove('cfw-frame-tile--active'); b.setAttribute('aria-pressed', 'false'); }
      });
      const frameOuter = document.getElementById('cfw-frame-outer');
      if (frameOuter) {
        if (frameType === 'Natural Wood') {
          frameOuter.style.background = 'linear-gradient(135deg,#8B6914 0%,#C4922E 50%,#8B6914 100%)';
          frameOuter.style.borderColor = 'transparent';
        } else {
          frameOuter.style.background = '#1a1a1a';
          frameOuter.style.borderColor = '#1a1a1a';
        }
      }
      const mat = document.getElementById('cfw-mat-border');
      if (mat) {
        if (frameType === 'Mount Frame') { mat.style.padding = '14px'; mat.style.background = '#fff'; }
        else { mat.style.padding = '0'; mat.style.background = 'transparent'; }
      }
      const mountRow = document.getElementById('cfw-sum-mount-row');
      if (mountRow) mountRow.style.display = mountAddon > 0 ? 'flex' : 'none';
      window.cf.cfwCalcPrice();
    };

    window.cf.cfwCalcPrice = function() {
      const s = window._cfwState;
      s.posterAddon = document.getElementById('cfw-poster-check') ? document.getElementById('cfw-poster-check').checked : false;
      const subtotal = s.basePrice + s.mountAddon + (s.posterAddon ? 199 : 0);
      const shipping = subtotal >= 899 ? 0 : 99;
      const total = subtotal + shipping;
      const el = function(id) { return document.getElementById(id); };
      if (el('cfw-sum-size')) el('cfw-sum-size').textContent = s.sizeLabel;
      if (el('cfw-sum-style')) {
        const styleLabel = s.frameType || s.style || 'Black Frame';
        el('cfw-sum-style').textContent = styleLabel.endsWith('Frame') ? styleLabel : styleLabel + ' Frame';
      }
      if (el('cfw-sum-mount-row')) el('cfw-sum-mount-row').style.display = s.mountAddon > 0 ? 'flex' : 'none';
      if (el('cfw-sum-poster-row')) el('cfw-sum-poster-row').style.display = s.posterAddon ? 'flex' : 'none';
      if (el('cfw-sum-subtotal')) el('cfw-sum-subtotal').textContent = '\u20b9' + subtotal;
      if (el('cfw-sum-shipping-val')) el('cfw-sum-shipping-val').innerHTML = shipping === 0 ? '<span style="color:var(--green)">Free</span>' : '\u20b9' + shipping;
      if (el('cfw-sum-total')) el('cfw-sum-total').textContent = '\u20b9' + total;
      if (el('cfw-sticky-total')) el('cfw-sticky-total').textContent = '\u20b9' + total;
      if (el('cfw-desktop-total')) el('cfw-desktop-total').textContent = '\u20b9' + total;
      const freeLeft = 899 - subtotal;
      if (el('cfw-free-hint')) {
        if (freeLeft > 0) {
          el('cfw-free-hint').innerHTML = 'Add <strong>\u20b9'+freeLeft+'</strong> more for <strong>free shipping!</strong>';
          el('cfw-free-hint').style.display = 'block';
        } else {
          el('cfw-free-hint').innerHTML = '\ud83c\udf89 You\'ve unlocked <strong>free shipping!</strong>';
          el('cfw-free-hint').style.display = 'block';
        }
      }
      const lbl = el('cfw-mockup-label');
      const styleLabel2 = s.frameType || s.style || 'Black Frame';
      const styleName = styleLabel2.endsWith('Frame') ? styleLabel2 : styleLabel2 + ' Frame';
      if (lbl) lbl.textContent = s.size + ' \u00b7 ' + styleName + ' \u00b7 \u20b9' + total;
      s.subtotal = subtotal; s.shipping = shipping; s.total = total;
    };

    window.cf.cfwWhatsAppOrder = function() {
      const nameEl = document.getElementById('cfw-name');
      const phoneEl = document.getElementById('cfw-phone');
      const notesEl = document.getElementById('cfw-notes');
      const name = nameEl ? nameEl.value.trim() : '';
      const phone = phoneEl ? phoneEl.value.trim() : '';
      const notes = notesEl ? notesEl.value.trim() : '';
      const s = window._cfwState || {};
      const msg = 'Hi ChitraFrame! I want a custom frame.\n'
        + (name ? 'Name: ' + name + '\n' : '')
        + (phone ? 'Phone: ' + phone + '\n' : '')
        + 'Size: ' + (s.sizeLabel || 'Medium 12\u00d718') + '\n'
        + 'Style: ' + (s.frameType || s.style || 'Black Frame')
        + (notes ? '\nNotes: ' + notes : '');
      window.open('https://wa.me/917989531818?text=' + encodeURIComponent(msg), '_blank');
    };

    // FIX 8.1: cfwGoStep no-op removed — was dead code

    // Init defaults
    window.cf.cfwCalcPrice();

    initMobileMenu();
    initStickyHeader();
    setTimeout(initReveal, 100);
  }

  // ── ORDER SUCCESS / THANK-YOU PAGE ───────────────────────────────────────
  function renderOrderSuccessPage(app) {
    const params = new URLSearchParams(location.search);
    const orderId = params.get('order') || '';
    const total = params.get('total') || '';
    const payType = params.get('type') || 'prepaid';
    const isCOD = payType === 'cod';

    document.title = 'Order Confirmed — ChitraFrame';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', 'Your ChitraFrame art print order is confirmed. Thank you for your purchase!');

    // FIX 2.7: Remove fake referral code — honest social share only
    const waNumber = state.config.whatsapp_number || '917989531818';
    const shareText = encodeURIComponent('Just ordered a gorgeous framed art print from ChitraFrame! 🖼️ Archival quality, beautiful frames. Check them out at https://chitraframe.in');

    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <section style="min-height:80vh;display:flex;align-items:center;justify-content:center;padding:60px 24px;background:var(--off-white)">
        <div style="max-width:560px;width:100%;text-align:center">

          <!-- Success animation -->
          <div style="width:80px;height:80px;background:var(--green);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;animation:pulse-green 0.6s ease-out">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M6 18l8 8 16-16" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>

          <h1 style="font-family:'DM Serif Display',serif;font-size:clamp(28px,5vw,42px);color:var(--ink-900);margin-bottom:8px">
            ${isCOD ? 'Order Placed! 🎉' : 'Payment Successful! 🎉'}
          </h1>
          <p style="color:var(--ink-500);font-size:16px;margin-bottom:24px;line-height:1.6">
            ${isCOD
              ? 'Your order is confirmed. Our team will call you to confirm the COD order before dispatch.'
              : 'Your payment is confirmed. Your framed art print will be dispatched within 24 hours.'}
          </p>

          ${orderId ? `
          <div style="background:var(--white);border:1.5px solid var(--warm-200);border-radius:12px;padding:20px;margin-bottom:24px;text-align:left">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--warm-100)">
              <span style="font-size:13px;color:var(--ink-400);font-weight:500">Order ID</span>
              <strong style="font-size:14px;color:var(--ink-900)">${escapeHTML(orderId)}</strong>
            </div>
            ${total ? `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--warm-100)">
              <span style="font-size:13px;color:var(--ink-400);font-weight:500">Amount ${isCOD ? '(COD)' : 'Paid'}</span>
              <strong style="font-size:14px;color:var(--ink-900)">${formatPrice(total)}</strong>
            </div>` : ''}
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:13px;color:var(--ink-400);font-weight:500">Delivery</span>
              <strong style="font-size:14px;color:var(--green)">3–5 business days</strong>
            </div>
          </div>` : ''}

          <!-- Trust icons -->
          <div style="display:flex;justify-content:center;gap:24px;margin-bottom:28px;flex-wrap:wrap">
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
              <div style="width:40px;height:40px;background:var(--gold-pale);border-radius:50%;display:flex;align-items:center;justify-content:center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2l2 4.2 4.6.7-3.3 3.2.8 4.6L10 12.5l-4.1 2.2.8-4.6L3.4 6.9l4.6-.7L10 2z" fill="var(--gold)"/></svg>
              </div>
              <span style="font-size:11px;color:var(--ink-500);font-weight:500;text-align:center">Museum<br>Quality</span>
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
              <div style="width:40px;height:40px;background:#e6f4ea;border-radius:50%;display:flex;align-items:center;justify-content:center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 9.5l4 4 10-9" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <span style="font-size:11px;color:var(--ink-500);font-weight:500;text-align:center">Securely<br>Packaged</span>
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
              <div style="width:40px;height:40px;background:#e8f4fd;border-radius:50%;display:flex;align-items:center;justify-content:center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2C6 2 3 5 3 9c0 5 7 9 7 9s7-4 7-9c0-4-3-7-7-7z" stroke="#3b82f6" stroke-width="1.5" stroke-linejoin="round"/><circle cx="10" cy="9" r="2.5" fill="#3b82f6"/></svg>
              </div>
              <span style="font-size:11px;color:var(--ink-500);font-weight:500;text-align:center">Pan India<br>Delivery</span>
            </div>
          </div>

          <!-- Share + Referral section -->
          <div style="background:linear-gradient(135deg,var(--ink-900),#2a1f0e);border-radius:16px;padding:24px;margin-bottom:28px;color:#fff">
            <p style="font-size:13px;letter-spacing:0.1em;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:8px">Spread the love</p>
            <h3 style="font-family:'DM Serif Display',serif;font-size:20px;margin-bottom:8px">Share your new art</h3>
            <p style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:16px;line-height:1.6">Help a friend find the perfect wall art. Share ChitraFrame on WhatsApp or Instagram.</p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
              <a href="https://wa.me/?text=${shareText}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;background:#25D366;color:#fff;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;text-decoration:none" onclick="trackEvent('share',{method:'whatsapp',content_type:'referral'})">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Share on WhatsApp
              </a>
              <a href="https://www.instagram.com/" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);color:#fff;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;text-decoration:none" onclick="trackEvent('share',{method:'instagram',content_type:'referral'})">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                Instagram
              </a>
            </div>
          </div>

          <!-- Action buttons -->
          <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:20px">
            <button class="btn-primary" onclick="window.cf.nav('/track?order=${encodeURIComponent(orderId)}')">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2C5 2 2.5 4.5 2.5 7.5S5 13 8 13s5.5-2.5 5.5-5.5S11 2 8 2z" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v3l2 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              Track Order
            </button>
            <button class="btn-outline" onclick="window.cf.nav('/shop')">
              Continue Shopping
            </button>
          </div>

          <!-- WhatsApp support -->
          <p style="font-size:13px;color:var(--ink-400)">
            Need help?
            <a href="https://wa.me/${escapeHTML(waNumber)}?text=Hi%2C%20I%20need%20help%20with%20my%20order%20${encodeURIComponent(orderId)}" target="_blank" rel="noopener" style="color:var(--gold);font-weight:600">Chat on WhatsApp</a>
          </p>

        </div>
      </section>
    </main>
    <style>
      @keyframes pulse-green {
        0% { transform: scale(0.5); opacity: 0; }
        70% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
      }
    </style>
    ` + renderFooter();

    initMobileMenu();
    initStickyHeader();
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Router ────────────────────────────────────────────────────────────────
  function route() {
    const path = location.pathname;
    const app = $('#app');
    if (!app) return;
    app.innerHTML = '';

    try {
      if (path === '/' || path === '') renderHomePage(app);
      else if (path === '/shop') renderShopPage(app);
      else if (path.startsWith('/product/')) renderProductPage(app, path.split('/product/')[1]);
      else if (path.startsWith('/category/')) renderCategoryPage(app, path.split('/category/')[1]);
      else if (path === '/cart') renderCartPage(app);
      else if (path === '/checkout') renderCheckoutPage(app);
      else if (path === '/order-success' || path === '/thank-you') renderOrderSuccessPage(app);
      else if (path === '/track') renderTrackPage(app);
      else if (path === '/returns') renderPolicyPage(app);
      else if (path === '/login') renderLoginPage(app);
      else if (path === '/account' || path.startsWith('/account/')) renderAccountPage(app);
      else if (path === '/auth/callback') handleAuthCallback(app);
      else if (path.startsWith('/policy')) renderPolicyPage(app);
      else if (path === '/suggest') renderSuggestPage(app);
      else if (path === '/review') renderReviewPage(app);
      else if (path === '/about' || path === '/contact') renderStaticPage(app, path.slice(1));
      else if (path === '/customize') renderCustomizePage(app);
      else if (path === '/size-guide') renderSizeGuidePage(app);
      else if (path === '/faq') renderFAQPage(app);
      else if (path === '/bulk-orders') renderBulkOrdersPage(app);
      else if (path === '/gift-cards') renderGiftCardsPage(app);
      else if (path === '/care-guide') renderCareGuidePage(app);
      else if (path.startsWith('/blog')) renderBlogPage(app, path);
      else renderHomePage(app);
    } catch (err) {
      console.error('Route error:', err);
      if (app) app.innerHTML = renderHeader() + `
        <main class="section text-center">
          <div class="container">
            <h1 style="margin-bottom:1rem">Oops — something went wrong</h1>
            <p style="margin-bottom:2rem;color:var(--ink-500)">Please try refreshing the page.</p>
            <button class="btn-primary" onclick="location.reload()">Reload</button>
          </div>
        </main>` + renderFooter();
    }
  }

  // ── SIZE GUIDE PAGE ────────────────────────────────────────────────────────
  function renderSizeGuidePage(app) {
    document.title = 'Frame Size Guide — ChitraFrame | Which Size to Choose?';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', 'ChitraFrame size guide: Small (8×10"), Medium (12×18"), Large (18×24"), XL (24×36"). Know which frame size fits your wall before buying. Free shipping above ₹899.');
    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <div class="page-hero-simple">
        <div class="container">
          <h1>Frame Size Guide</h1>
          <p class="page-hero-sub">Not sure which size to pick? This guide will help.</p>
        </div>
      </div>
      <section class="section">
        <div class="container" style="max-width:860px">

          <div style="background:var(--warm-50);border-radius:16px;padding:28px 32px;margin-bottom:40px;border:1px solid var(--warm-200)">
            <h2 style="font-family:'DM Serif Display',serif;font-size:22px;margin-bottom:20px">Quick Recommendation</h2>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px">
              ${[
                { size:'Small\n8×10"', price:'₹499', room:'Bedside table · Bookshelf · Desk', tag:'Most gifted' },
                { size:'Medium\n12×18"', price:'₹699', room:'Bedroom wall · Study · Hallway', tag:'Most popular' },
                { size:'Large\n18×24"', price:'₹999', room:'Living room · Dining area', tag:'Best value' },
                { size:'XL\n24×36"', price:'₹1499', room:'Feature wall · Office lobby', tag:'Statement piece' },
              ].map(s => `
              <div style="background:#fff;border-radius:12px;padding:18px 16px;text-align:center;border:2px solid ${s.tag === 'Most popular' ? 'var(--gold)' : 'var(--warm-200)'};">
                <div style="font-size:11px;font-weight:600;color:var(--gold);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${s.tag}</div>
                <div style="font-family:'DM Serif Display',serif;font-size:18px;line-height:1.3;margin-bottom:8px;white-space:pre-line">${s.size}</div>
                <div style="font-size:15px;font-weight:700;margin-bottom:8px">${s.price}</div>
                <div style="font-size:12px;color:var(--ink-500)">${s.room}</div>
              </div>`).join('')}
            </div>
          </div>

          <h2 style="font-family:'DM Serif Display',serif;font-size:24px;margin-bottom:24px">Size Comparison Chart</h2>
          <div style="overflow-x:auto;margin-bottom:40px">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <thead>
                <tr style="background:var(--ink-900);color:#fff">
                  <th style="padding:12px 16px;text-align:left">Size</th>
                  <th style="padding:12px 16px;text-align:left">Dimensions</th>
                  <th style="padding:12px 16px;text-align:left">Best For</th>
                  <th style="padding:12px 16px;text-align:left">Wall Height</th>
                  <th style="padding:12px 16px;text-align:right">Price</th>
                </tr>
              </thead>
              <tbody>
                ${[
                  { size:'Small',   dim:'8" × 10" (20×25 cm)',   for:'Desk / Bookshelf / Gift',        wall:'Any',            price:'From ₹499' },
                  { size:'Medium',  dim:'12" × 18" (30×45 cm)',  for:'Bedroom / Study / Hallway',      wall:'8–9 ft',         price:'From ₹699' },
                  { size:'Large',   dim:'18" × 24" (45×60 cm)',  for:'Living Room / Feature Wall',     wall:'9–10 ft',        price:'From ₹999' },
                  { size:'XL',      dim:'24" × 36" (60×90 cm)',  for:'Lobby / Gallery Wall / Office',  wall:'10 ft+',         price:'From ₹1,499' },
                ].map((r, i) => `
                <tr style="background:${i % 2 === 0 ? '#fff' : 'var(--warm-50)'};border-bottom:1px solid var(--warm-200)">
                  <td style="padding:14px 16px;font-weight:600">${r.size}</td>
                  <td style="padding:14px 16px;font-family:monospace">${r.dim}</td>
                  <td style="padding:14px 16px;color:var(--ink-600)">${r.for}</td>
                  <td style="padding:14px 16px;color:var(--ink-600)">${r.wall}</td>
                  <td style="padding:14px 16px;text-align:right;font-weight:600;color:var(--ink-900)">${r.price}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>

          <h2 style="font-family:'DM Serif Display',serif;font-size:24px;margin-bottom:20px">Tips for Choosing the Right Size</h2>
          <div style="display:grid;gap:16px;margin-bottom:40px">
            ${[
              { icon:'📏', tip:'Measure your wall first', body:'Use tape to mark out the frame dimensions on the wall. Take a photo to visualise before buying.' },
              { icon:'🖼️', tip:'Gallery walls need mix of sizes', body:'Combine Small + Medium + Large for a curated gallery wall look. Odd numbers (3 or 5 frames) look best.' },
              { icon:'🛋️', tip:'Match to furniture width', body:'For a sofa wall, choose art that is roughly ⅔ the sofa width. A 3-seater works best with Large or XL.' },
              { icon:'🚪', tip:'Hallways love Medium frames', body:'Medium (12×18") at eye level (1.5m from floor) creates a welcoming entrance without overpowering the space.' },
              { icon:'🎁', tip:'Gifting? Medium is safest', body:'Medium fits any room and is the most popular gift size. Pair with a gift message at checkout.' },
            ].map(t => `
            <div style="display:flex;gap:16px;background:var(--warm-50);border-radius:12px;padding:18px 20px;border:1px solid var(--warm-200)">
              <span style="font-size:24px;flex-shrink:0">${t.icon}</span>
              <div>
                <strong style="display:block;margin-bottom:4px">${t.tip}</strong>
                <span style="color:var(--ink-600);font-size:14px">${t.body}</span>
              </div>
            </div>`).join('')}
          </div>

          <div style="text-align:center;padding:40px 24px;background:var(--ink-900);border-radius:20px;color:#fff">
            <h2 style="font-family:'DM Serif Display',serif;font-size:28px;margin-bottom:12px">Ready to shop?</h2>
            <p style="opacity:0.8;margin-bottom:24px">Browse our collection of framed art prints — starting at ₹499</p>
            <button class="btn-primary" onclick="window.cf.nav('/shop')" style="background:var(--gold);color:var(--ink-900)">
              Browse All Prints
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>
      </section>
    </main>
    ` + renderFooter();
    initMobileMenu(); initStickyHeader();
  }

  // ── FAQ PAGE ───────────────────────────────────────────────────────────────
  function renderFAQPage(app) {
    document.title = 'FAQ — ChitraFrame | Frequently Asked Questions';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', 'Frequently asked questions about ChitraFrame framed art prints — delivery, COD, frame quality, returns, custom frames, and more.');
    const faqs = [
      { q:'Where do you deliver?', a:'We deliver pan-India — all 29 states and 7 union territories. Hyderabad, Bengaluru, Mumbai, Delhi, Chennai, Pune, and all tier-2 cities are covered. Average delivery time is 3–5 business days.' },
      { q:'Is Cash on Delivery (COD) available?', a:'Yes! COD is available across India. A ₹49 handling fee applies for COD orders. Pay online (UPI/cards) to save ₹50 on your order.' },
      { q:'What frame materials do you use?', a:'We use MDF core with a premium photo-quality print finish. Two frame finishes are available: Matte Black (sleek, modern) and Natural Wood (warm, organic). Both are lightweight yet sturdy.' },
      { q:'What sizes are available?', a:'We offer 4 sizes: Small (8×10"), Medium (12×18"), Large (18×24"), and XL (24×36"). See our Size Guide for room placement recommendations.' },
      { q:'Can I order a custom frame with my own photo?', a:'Yes! Visit the Custom Frame page, choose your size and style, then share your photo via WhatsApp after ordering. We send a digital proof within 24 hours before printing.' },
      { q:'How is the print quality?', a:'We use museum-grade archival inks on satin photo paper. Colours are vivid, fade-resistant, and professionally colour-corrected. The result is gallery-quality — not a typical poster print.' },
      { q:'What if my order arrives damaged?', a:'We replace damaged frames free of charge, no questions asked. Simply share photos of the damage within 48 hours of delivery via WhatsApp (+91 79895 31818).' },
      { q:'How do I track my order?', a:'You will receive a tracking link via email (and WhatsApp if you provide your number) once your order is shipped. You can also use the Track Order page on our site.' },
      { q:'Can I return my order?', a:'We accept returns within 7 days for unused, undamaged frames in original packaging. Custom photo frames are non-refundable once printed. Contact us on WhatsApp to initiate a return.' },
      { q:'Do you offer bulk/corporate pricing?', a:'Yes! We offer discounts for orders of 10+ frames — ideal for corporate gifts, office décor, weddings, and events. WhatsApp us your requirement for a custom quote within 4 hours.' },
    ];
    const schemaFaq = { '@context':'https://schema.org', '@type':'FAQPage', mainEntity: faqs.map(f => ({ '@type':'Question', name:f.q, acceptedAnswer:{ '@type':'Answer', text:f.a } })) };
    const existing = document.getElementById('faq-schema');
    if (existing) existing.remove();
    const s = document.createElement('script'); s.id='faq-schema'; s.type='application/ld+json'; s.textContent=JSON.stringify(schemaFaq); document.head.appendChild(s);
    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <div class="page-hero-simple"><div class="container"><h1>Frequently Asked Questions</h1><p class="page-hero-sub">Everything you need to know about ChitraFrame.</p></div></div>
      <section class="section"><div class="container" style="max-width:760px">
        <div class="faq-list">
          ${faqs.map((f, i) => `
          <details class="faq-item" ${i === 0 ? 'open' : ''}>
            <summary class="faq-question">${escapeHTML(f.q)}</summary>
            <div class="faq-answer"><p>${escapeHTML(f.a)}</p></div>
          </details>`).join('')}
        </div>
        <div style="text-align:center;margin-top:48px;padding:32px;background:var(--warm-50);border-radius:16px">
          <p style="margin-bottom:16px;color:var(--ink-600)">Didn't find your answer?</p>
          <a href="https://wa.me/917989531818?text=Hi%20ChitraFrame%2C%20I%20have%20a%20question" target="_blank" rel="noopener" class="btn-primary" style="display:inline-flex;align-items:center;gap:8px">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Chat on WhatsApp
          </a>
        </div>
      </div></section>
    </main>` + renderFooter();
    initMobileMenu(); initStickyHeader();
  }

  // ── STICKY PDP BUY BAR ─────────────────────────────────────────────────────
  function initStickyPdpBar(slug, name, price, img) {
    if (document.getElementById('pdp-sticky-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'pdp-sticky-bar';
    bar.className = 'pdp-sticky-bar';
    bar.innerHTML = `
      <div class="pdp-sticky-bar-inner">
        <img src="${escapeHTML(img)}" alt="${escapeHTML(name)}" style="width:44px;height:44px;object-fit:cover;border-radius:6px;flex-shrink:0">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHTML(name)}</div>
          <div style="font-size:13px;color:var(--ink-500)" id="pdp-sticky-price">${formatPrice(price)}</div>
        </div>
        <button class="btn-primary" style="flex-shrink:0;padding:9px 20px;font-size:13px" onclick="window.cf.pdpAddToCart('${escapeHTML(slug)}','${escapeHTML(name)}',window._pdpState?.basePrice||${price},'')">
          Add to Cart
        </button>
      </div>`;
    document.body.appendChild(bar);
    const pdpBtn = document.querySelector('.pdp-atc-btn');
    if (pdpBtn) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => bar.classList.toggle('visible', !e.isIntersecting));
      }, { threshold: 0 });
      io.observe(pdpBtn);
    }
  }

  // ── URGENCY TIMER (session-persisted) ─────────────────────────────────────
  function createUrgencyTimer(containerId, minutesLeft, initialSecs) {
    const el = document.getElementById(containerId);
    if (!el) return;
    let secs = initialSecs !== undefined ? minutesLeft * 60 + (initialSecs || 0) : minutesLeft * 60;
    function tick() {
      if (secs <= 0) { el.textContent = 'Offer expired — refresh for latest price'; return; }
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      el.textContent = `${m}:${s.toString().padStart(2,'0')}`;
      secs--;
    }
    tick();
    const iv = setInterval(() => { if (!document.getElementById(containerId)) { clearInterval(iv); return; } tick(); }, 1000);
  }

  // ── PINCODE DELIVERY ESTIMATOR ─────────────────────────────────────────────
  function checkDelivery() {
    const input = document.getElementById('pincode-check');
    const result = document.getElementById('delivery-estimate');
    if (!input || !result) return;
    const pin = input.value.replace(/\D/g, '');
    if (pin.length !== 6) { result.textContent = 'Please enter a valid 6-digit pincode'; result.style.color = 'var(--red)'; return; }
    const stateByPin = {
      '5': 'Andhra Pradesh / Telangana', '4': 'Maharashtra / Goa / Gujarat',
      '6': 'Tamil Nadu / Kerala', '7': 'West Bengal / Odisha',
      '1': 'Delhi / Haryana / Punjab', '2': 'Uttar Pradesh / Uttarakhand',
      '3': 'Rajasthan / Madhya Pradesh', '8': 'Karnataka / Andhra'
    };
    const stateHint = stateByPin[pin[0]] || 'India';
    const days = ['500','501','502','503','504'].some(p => pin.startsWith(p)) ? '2–3' : '3–5';
    result.innerHTML = `<span style="color:var(--green)">✓ Delivery available</span> — ${stateHint} · Estimated ${days} business days`;
    result.style.color = '';
  }

  // ── URGENCY INJECTION INTO PDP ────────────────────────────────────────────
  function injectPdpUrgency(slug, name, price, img) {
    // FIX 2.5: Replaced fake Math.random() scarcity badge with honest messaging
    const scarcity = document.createElement('div');
    scarcity.className = 'pdp-scarcity';
    scarcity.innerHTML = `
      <span class="pdp-scarcity-dot"></span>
      Made to order — printed fresh when you place yours`;
    const productTrust = document.querySelector('.product-trust');
    if (productTrust) productTrust.insertAdjacentElement('beforebegin', scarcity);

    // Pincode checker
    const descEl = document.querySelector('.product-desc');
    if (descEl) {
      const pinBox = document.createElement('div');
      pinBox.className = 'pdp-pin-check';
      pinBox.innerHTML = `
        <div class="pdp-pin-label">📦 Check delivery to your pincode</div>
        <div class="pdp-pin-row">
          <input type="text" id="pincode-check" placeholder="Enter pincode" maxlength="6" inputmode="numeric" style="width:130px">
          <button class="btn-outline" style="padding:8px 14px;font-size:13px" onclick="window.cf.checkDelivery()">Check</button>
        </div>
        <div id="delivery-estimate" style="font-size:13px;margin-top:8px;min-height:20px"></div>`;
      descEl.insertAdjacentElement('afterend', pinBox);
    }

    // Sticky bar (after short delay so layout is set)
    setTimeout(() => initStickyPdpBar(slug, name, price, img), 300);
  }

  // ── Sticky CTA Bar ────────────────────────────────────────────────────────
  function initStickyCTABar() {
    if (document.getElementById('sticky-cta-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'sticky-cta-bar';
    bar.className = 'sticky-cta-bar';
    bar.setAttribute('aria-label', 'Shop ChitraFrame framed art prints');
    bar.innerHTML = `
      <div class="sticky-cta-bar-text">
        <span class="stars-small">★★★★★</span>
        <strong>ChitraFrame</strong>
        <span>Museum-quality framed art · Delivered in 3–5 days · From ₹499</span>
      </div>
      <div class="sticky-cta-bar-actions">
        <button class="btn-primary" onclick="window.cf.nav('/shop')" style="padding:8px 20px;font-size:13px">Shop Now</button>
        <button class="sticky-cta-bar-close" id="sticky-cta-close" aria-label="Dismiss">×</button>
      </div>`;
    document.body.appendChild(bar);

    // Show after 4s or 400px scroll, whichever first
    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      bar.classList.add('visible');
    };
    const scrollHandler = () => { if (window.scrollY > 400) show(); };
    window.addEventListener('scroll', scrollHandler, { passive: true });
    setTimeout(show, 4000);

    document.getElementById('sticky-cta-close').addEventListener('click', () => {
      bar.classList.remove('visible');
      window.removeEventListener('scroll', scrollHandler);
      shown = true;
      // Re-hide for 2 min
      setTimeout(() => { shown = false; scrollHandler(); }, 120000);
    });
  }

  // Social proof popup removed — fake "just ordered" notifications hurt trust
  // Instead we surface real review count in hero pills and review section
  function initSocialProofPopup() { /* disabled */ }

  // ── LocalBusiness + Organization Schema ──────────────────────────────────
  function injectOrganizationSchema() {
    if (document.getElementById('org-schema')) return;
    const schema = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': 'https://chitraframe.in/#organization',
          name: 'ChitraFrame',
          url: 'https://chitraframe.in',
          logo: 'https://chitraframe.in/static/logo.png',
          description: 'Premium framed art prints for Indian homes — divine, automotive, sports & wildlife wall art delivered across India.',
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            availableLanguage: ['English', 'Hindi']
          },
          sameAs: [
            'https://www.instagram.com/chitraframe.in',
            'https://wa.me/917989531818'
          ]
        },
        {
          '@type': 'WebSite',
          '@id': 'https://chitraframe.in/#website',
          url: 'https://chitraframe.in',
          name: 'ChitraFrame',
          description: 'Buy framed art prints online India — divine, automotive, sports, wildlife. Museum quality. Ships in 3–5 days.',
          publisher: { '@id': 'https://chitraframe.in/#organization' },
          potentialAction: {
            '@type': 'SearchAction',
            target: { '@type': 'EntryPoint', urlTemplate: 'https://chitraframe.in/shop?q={search_term_string}' },
            'query-input': 'required name=search_term_string'
          }
        }
      ]
    };
    const s = document.createElement('script');
    s.id = 'org-schema';
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(schema);
    document.head.appendChild(s);
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    captureUTM();
    injectOrganizationSchema();
    route();

    window.addEventListener('popstate', route);
    document.addEventListener('click', e => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel') || href.startsWith('#') || link.target === '_blank') return;
      if (href.startsWith('/static/') || href.endsWith('.html') || href.endsWith('.pdf')) return;
      e.preventDefault();
      navigate(href);
    });

    // High-conversion overlays (home + shop only)
    setTimeout(() => {
      const p = location.pathname;
      if (p === '/' || p === '/shop' || p.startsWith('/category')) {
        initStickyCTABar();
      }
      if (p === '/') initExitIntent();
    }, 2000);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.cf = {
    nav: navigate,
    openCart: openCartDrawer,
    closeCart: closeCartDrawer,
    updateQty,
    removeFromCart,
    cartPageQty,
    cartPageRemove,
    filterShop,
    quickAdd,
    pdpAddToCart,
    pdpQty,
    selectSize,
    selectSizeVariant,
    selectFrame,
    switchThumb,
    showSizeGuide,
    trackOrder,
    submitCheckout,
    handleNewsletter,
    submitSuggestion,
    submitReview,
    handleLogin,
    pickStar,
    updateCartBadge,
    submitCustomOrder,
    customCalcPrice,
    updateCheckoutTotal,
    addPosterAddon,
    togglePdpPoster,
    checkDelivery,
    closeMobileMenu,
    openMobileMenu,
    loadAccountOrders
  };

  // Expose trackEvent + ABTest globally (used in inline onclick handlers)
  window.trackEvent = trackEvent;
  window.ABTest = ABTest;

  // FIX 8.1/8.2: Removed window.pfi legacy alias + cfwGoStep no-op
  // window.cf is now minimal — only exposes functions needed by inline onclick handlers

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
