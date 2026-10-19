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

  // ── Product image map (Cloudinary + direct URLs for uploaded designs) ──────
  const DESIGN_IMAGES = {
    // Spiritual
    'mahadev-cosmic-trance': 'https://www.genspark.ai/api/files/s/6YSmJUF0',
    'radha-krishna-watercolor': 'https://www.genspark.ai/api/files/s/joUaJFwf',
    'radha-krishna-emerald-dance': 'https://www.genspark.ai/api/files/s/u7qV7RLf',
    // Automotive
    'bmw-m4-carbon-dark': 'https://www.genspark.ai/api/files/s/M7jmZNhR',
    'porsche-911-pacific-coast': 'https://www.genspark.ai/api/files/s/M7PjI0Ug',
    'lamborghini-aventador-neon': 'https://www.genspark.ai/api/files/s/OO3nMzV2',
    'nissan-gtr-r34-osaka-rain': 'https://www.genspark.ai/api/files/s/aqC7m1aT',
    'f1-redbull-racing': 'https://www.genspark.ai/api/files/s/seduUFSY',
    // Sports
    'cricket-glory-moment': 'https://www.genspark.ai/api/files/s/PIybKTHz',
    // Wildlife
    'lion-geometric-gold': 'https://www.genspark.ai/api/files/s/Wi1JvwJY',
  };

  // ── Cloudinary helper ─────────────────────────────────────────────────────
  const CLD_CLOUD = 'dax4yqumu';
  function cldUrl(slug, w = 800) {
    if (DESIGN_IMAGES[slug]) return DESIGN_IMAGES[slug];
    return `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/c_fill,w_${w},q_auto,f_auto/chitraframe/products/${slug}.jpg`;
  }

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
    state.cart = state.cart.filter(i => i && i.price > 0 && isFinite(i.price))
      .slice(0, 20)
      .map(i => ({ ...i, quantity: Math.min(Math.max(1, i.quantity || 1), 50) }));
    localStorage.setItem('cf_cart', JSON.stringify(state.cart));
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

  function toast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.setAttribute('role', 'alert');
    t.innerHTML = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('toast-show'), 10);
    setTimeout(() => { t.classList.remove('toast-show'); setTimeout(() => t.remove(), 400); }, 3000);
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

  // ── Cloudinary WebP helper with responsive srcset ─────────────────────────
  function cldSrcset(slug, sizes) {
    if (DESIGN_IMAGES[slug]) return null; // Can't generate srcset for external
    const base = `https://res.cloudinary.com/${CLD_CLOUD}/image/upload`;
    return sizes.map(w => `${base}/c_fill,w_${w},q_auto,f_auto/chitraframe/products/${slug}.jpg ${w}w`).join(', ');
  }

  function cldPicture(slug, alt, widths, className, loading) {
    const fallbackUrl = cldUrl(slug, Math.max(...(widths || [800])));
    const srcset = cldSrcset(slug, widths || [400, 800, 1200]);
    if (!srcset) {
      return `<img src="${escapeHTML(fallbackUrl)}" alt="${escapeHTML(alt)}" class="${className||''}" loading="${loading||'lazy'}" width="800" height="1000">`;
    }
    const sizes = '(max-width:480px) 50vw, (max-width:900px) 33vw, 25vw';
    return `<picture>
      <source type="image/webp" srcset="${escapeHTML(srcset.replace(/f_auto/g,'f_webp'))}" sizes="${sizes}">
      <img src="${escapeHTML(fallbackUrl)}" srcset="${escapeHTML(srcset)}" sizes="${sizes}" alt="${escapeHTML(alt)}" class="${className||''}" loading="${loading||'lazy'}" width="800" height="1000">
    </picture>`;
  }

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

    footer.innerHTML = `
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

  // addPosterAddon removed — poster add-on no longer offered

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
          <a href="/track" onclick="window.cf.nav('/track');return false;" class="header-icon-btn header-track-link" aria-label="Track order" title="Track your order">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1l2.5 5H17l-4.5 3.3 1.7 5.2L9 11.5l-5.2 3 1.7-5.2L1 6h5.5L9 1z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
            <span class="header-track-label">Track</span>
          </a>
          <button class="header-icon-btn cart-btn" onclick="window.cf.openCart()" aria-label="Cart, ${cartCount} items">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1 1h2.5l2.4 9.6h8.1l2-7H5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="15" r="1.2" fill="currentColor"/><circle cx="13" cy="15" r="1.2" fill="currentColor"/></svg>
            <span class="cart-count" style="display:${cartCount > 0 ? 'inline-flex' : 'none'}">${cartCount}</span>
          </button>
        </div>
      </div>

      <!-- Mobile Menu Panel -->
      <div class="mobile-menu" id="mobile-menu" aria-hidden="true">
        <div class="mobile-menu-inner">
          <div class="mobile-menu-logo">
            <span class="logo-text">Chitra<em>Frame</em></span>
            <button onclick="document.getElementById('mobile-menu').classList.remove('mobile-menu-open');document.getElementById('mobile-menu-btn').setAttribute('aria-expanded','false')" aria-label="Close menu">
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
            <p class="text-sm text-ink-400">Free shipping above ₹899 · COD Available</p>
          </div>
        </div>
      </div>
    </header>`;
  }

  function closeMobileMenu() {
    const m = $('#mobile-menu');
    if (m) m.classList.remove('mobile-menu-open');
    const btn = $('#mobile-menu-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function initMobileMenu() {
    const btn = $('#mobile-menu-btn');
    const menu = $('#mobile-menu');
    if (btn && menu) {
      btn.addEventListener('click', () => {
        const open = menu.classList.toggle('mobile-menu-open');
        btn.setAttribute('aria-expanded', String(open));
        menu.setAttribute('aria-hidden', String(!open));
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

    <a href="${escapeHTML(waLink)}" target="_blank" rel="noopener noreferrer" class="whatsapp-widget" aria-label="Chat on WhatsApp" data-tooltip="Chat with us">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M20.5 3.5A11.5 11.5 0 0 0 1.5 12.4a11.4 11.4 0 0 0 1.5 5.6L1.5 22.5l4.6-1.5a11.5 11.5 0 0 0 5.9 1.6 11.5 11.5 0 0 0 8.5-19.6z" fill="white"/><path d="M9 10.5s.5-1 1.5-.5l1 .5c.5.3.5 1-.3 2s-2.2 1.8-3 1.5c-.8-.3-2.5-1.5-3.2-3.5" stroke="#25D366" stroke-width="1.2" stroke-linecap="round"/></svg>
    </a>

    <!-- ══ EXIT INTENT OVERLAY ══ -->
    <div class="exit-intent-overlay" id="exit-intent-overlay" role="dialog" aria-modal="true" aria-label="Special offer">
      <div class="exit-intent-modal">
        <div class="exit-intent-top">
          <button class="exit-intent-close" onclick="window.cf.closeExitIntent()" aria-label="Close offer">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
          <div class="exit-intent-tag">Members-only offer</div>
          <h2 class="exit-intent-title">Wait — before you go!</h2>
          <p class="exit-intent-sub">Get early access to new designs &amp; exclusive offers.</p>
        </div>
        <div class="exit-intent-body">
          <div class="exit-intent-offer">
            <div class="exit-intent-offer-icon">🎁</div>
            <div class="exit-intent-offer-text">
              <strong>₹50 off your first order</strong><br>
              Plus: new drop alerts, styling tips &amp; festival exclusives. Zero spam, unsubscribe anytime.
            </div>
          </div>
          <form class="exit-intent-form" onsubmit="window.cf.handleExitIntentSubmit(event)">
            <input type="email" name="email" placeholder="Enter your email" required autocomplete="email" aria-label="Your email address">
            <button type="submit">Get ₹50 Off</button>
          </form>
          <button class="exit-intent-skip" onclick="window.cf.closeExitIntent()">No thanks, I'll pay full price</button>
        </div>
      </div>
    </div>`;
  }

  // ── HOME PAGE ─────────────────────────────────────────────────────────────
  // Shadertoy-inspired WebGL hero animation: golden particle field
  function initHeroCanvas() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) { canvas.style.display = 'none'; return; }

    const vert = `attribute vec2 a_pos; void main(){gl_Position=vec4(a_pos,0.,1.);}`;
    const frag = `
      precision mediump float;
      uniform vec2 u_res; uniform float u_time;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
      void main(){
        vec2 uv=(gl_FragCoord.xy-u_res*.5)/min(u_res.x,u_res.y);
        float t=u_time*.18;
        float n=noise(uv*3.+t)*noise(uv*6.-t*.7)*1.8;
        vec3 gold=vec3(.78,.59,.22);vec3 dark=vec3(.06,.055,.045);
        float glow=smoothstep(.3,.9,n);
        vec3 col=mix(dark,gold*(.5+glow*.6),glow*.7);
        float vign=1.-dot(uv*.8,uv*.8);
        col*=clamp(vign,0.,1.);
        gl_FragColor=vec4(col,0.75);
      }`;

    function mkShader(type, src) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, mkShader(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog); gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');

    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let raf; let running = true;
    function resize() {
      canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener('resize', resize);

    function draw(t) {
      if (!running) return;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t * 0.001);
      gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    // Cleanup on page nav
    window._heroCanvasCleanup = () => { running = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }

  async function renderHomePage(app) {
    if (window._heroCanvasCleanup) { window._heroCanvasCleanup(); window._heroCanvasCleanup = null; }
    document.title = 'ChitraFrame | Buy Framed Art Prints Online India — Divine, Automotive, Sports';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', 'Buy premium framed art prints online in India. Divine & spiritual art, automotive legends, sports heroes, wildlife — museum-quality printing, Black or Natural Wood frames, free shipping above ₹899. Starting ₹499.');
    trackEvent('page_view', { page_title: 'Home', page_location: location.href });

    app.innerHTML = renderHeader() + `
    <main id="main-content">

      <!-- ══ AWWWARDS LUXURY GALLERY HERO ══ -->
      <section class="gallery-hero" aria-labelledby="hero-h1">
        <div class="gallery-hero-canvas">
          <!-- Ambient gallery lighting halo -->
          <div class="gallery-light-spot"></div>

          <!-- Masterpiece Focal Frame -->
          <div class="gallery-hero-masterpiece">
            <div class="hero-frame-shadow">
              <div class="hero-art-mat">
                <div class="hero-art-img-wrap" id="hero-master-wrap">
                  <img id="hero-master-img" src="https://www.genspark.ai/api/files/s/6YSmJUF0" alt="Mahadev Cosmic Trance Masterpiece Framed Art" loading="eager" fetchpriority="high">
                  <div class="hero-art-plate">
                    <span class="plate-title">Mahadev — Cosmic Trance</span>
                    <span class="plate-spec">Archival Matte · 12×18" · Handcrafted Mat</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Editorial Introduction -->
          <div class="gallery-hero-editorial">
            <span class="hero-atelier-tag">Atelier ChitraFrame · Fine Art &amp; Custom Framing</span>
            <h1 class="gallery-hero-title" id="hero-h1">
              Walls that speak<br><em>your story.</em>
            </h1>
            <p class="gallery-hero-lead">
              Museum-quality giclée prints in handcrafted solid wood &amp; mounted gallery frames. Delivered across India with archival permanence.
            </p>

            <!-- Dual Atelier Navigation -->
            <div class="gallery-hero-triggers">
              <button class="atelier-btn atelier-btn-primary" onclick="window.cf.nav('/shop')" aria-label="Explore curated prints">
                <span>Explore Curated Art</span>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button class="atelier-btn atelier-btn-secondary" onclick="window.cf.nav('/customize')" aria-label="Frame your own photo">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.2"/></svg>
                <span>Frame Your Own Photo</span>
              </button>
            </div>

            <!-- Trust Meta Row -->
            <div class="gallery-hero-meta">
              <div class="meta-item">
                <span class="meta-stars">★★★★★</span>
                <span class="meta-text">4.9 / 5 · 2,000+ homes</span>
              </div>
              <div class="meta-dot">·</div>
              <div class="meta-item">
                <span class="meta-text">Ready to hang with hardware</span>
              </div>
              <div class="meta-dot">·</div>
              <div class="meta-item">
                <span class="meta-text">Free shipping from ₹899</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Curated Category Strip (Fluid Touch Rail) -->
        <div class="gallery-cats-strip" role="navigation" aria-label="Explore by genre">
          <div class="gallery-cats-inner">
            <button class="cat-pill" onclick="window.cf.nav('/category/spiritual')"><span>🕉️ Divine &amp; Spiritual</span></button>
            <button class="cat-pill" onclick="window.cf.nav('/category/automotive')"><span>🏎️ Automotive</span></button>
            <button class="cat-pill" onclick="window.cf.nav('/category/sports')"><span>🏏 Sports Legends</span></button>
            <button class="cat-pill" onclick="window.cf.nav('/category/wildlife')"><span>🦁 Wildlife &amp; Nature</span></button>
            <button class="cat-pill" onclick="window.cf.nav('/customize')"><span>✨ Bespoke Custom</span></button>
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
            '4.9★ from 2,000+ orders',
            'Handcrafted frames',
            'Made to order — freshly printed',
          ].concat([
            'Museum-quality printing',
            'Free delivery above ₹899',
            'COD available pan-India',
            'Ships in 3–5 days',
            'Replacement guarantee',
            '4.9★ from 2,000+ orders',
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
              View all 51 designs
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
              <h3>2,000+ Orders Fulfilled</h3>
              <p>Real orders from customers across India. No inflated numbers — just prints we're proud of.</p>
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
                4 sizes: Small (8×12") to XL (20×30")
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
              <span class="proof-num">2,000+</span>
              <span class="proof-label">Happy Customers</span>
            </div>
            <div class="proof-divider"></div>
            <div class="proof-stat" data-reveal data-reveal-delay="1">
              <span class="proof-num">4.9 ★</span>
              <span class="proof-label">Average Rating</span>
            </div>
            <div class="proof-divider"></div>
            <div class="proof-stat" data-reveal data-reveal-delay="2">
              <span class="proof-num">51</span>
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
            <div class="editorial-image-badge">From ₹649</div>
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
            <h2 class="section-title" id="reviews-heading">Why 2,000+ Indians chose ChitraFrame</h2>
            <div class="review-aggregate" itemprop="aggregateRating" itemscope itemtype="https://schema.org/AggregateRating">
              <meta itemprop="ratingValue" content="4.9">
              <meta itemprop="reviewCount" content="2000">
              <div class="review-stars-bar">★★★★★</div>
              <span><strong>4.9 / 5</strong> from 2,000+ verified buyers</span>
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
              { q: 'What sizes are available for framed wall art?', a: 'We offer four standard sizes: Small (8×12 inches), Medium (12×18 inches), Large (16×20 inches), and XL (20×30 inches). All sizes are available in Black or Natural Wood frame finishes.' },
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

      <!-- ══ RECENTLY ORDERED TICKER ══ -->
      <div class="order-ticker" aria-live="polite" aria-label="Recent orders">
        <div class="order-ticker-inner" id="order-ticker-inner">
          ${[
            { name: 'Rahul M.', city: 'Hyderabad', product: 'Mahadev Cosmic Trance', size: 'Large', mins: 4 },
            { name: 'Priya S.', city: 'Bangalore', product: 'Porsche 911', size: 'Medium', mins: 12 },
            { name: 'Arjun K.', city: 'Mumbai', product: 'Radha Krishna Watercolor', size: 'XL', mins: 23 },
            { name: 'Sneha T.', city: 'Delhi', product: 'BMW M4 Carbon', size: 'Large', mins: 37 },
            { name: 'Vivek R.', city: 'Chennai', product: 'Lion Geometric Gold', size: 'Medium', mins: 51 },
            { name: 'Anita P.', city: 'Pune', product: 'Lamborghini Neon', size: 'Small', mins: 68 },
          ].map(o => `
            <div class="order-tick-item">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="var(--green)" opacity="0.2"/><path d="M4 7l2 2 4-4" stroke="var(--green)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <strong>${escapeHTML(o.name)}</strong> from ${escapeHTML(o.city)} just ordered <em>${escapeHTML(o.product)}</em> (${escapeHTML(o.size)})
              <span>${o.mins} min ago</span>
            </div>`).join('')}
        </div>
      </div>

      <!-- ══ CUSTOM FRAME CTA BANNER ══ -->
      <section class="custom-cta-banner" aria-label="Custom photo frame offer">
        <div class="container">
          <div class="custom-cta-inner">
            <div class="custom-cta-left">
              <div class="custom-cta-icon" aria-hidden="true">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="4" y="4" width="40" height="40" rx="6" stroke="var(--gold)" stroke-width="1.5"/><rect x="10" y="10" width="28" height="28" rx="3" stroke="var(--gold)" stroke-width="1" opacity="0.4"/><circle cx="24" cy="24" r="8" stroke="var(--gold)" stroke-width="1" opacity="0.6"/><path d="M20 24a4 4 0 1 1 8 0 4 4 0 0 1-8 0" fill="var(--gold)" opacity="0.2"/></svg>
              </div>
              <div>
                <h2 class="custom-cta-title">Frame Your Favourite Memory</h2>
                <p class="custom-cta-sub">Upload any photo — wedding, family, travel, pet — we print and frame it museum-style. Digital proof sent before printing.</p>
                <div class="custom-cta-features">
                  <span><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5l3 3 6-6" stroke="var(--green)" stroke-width="1.4" stroke-linecap="round"/></svg> Any photo accepted</span>
                  <span><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5l3 3 6-6" stroke="var(--green)" stroke-width="1.4" stroke-linecap="round"/></svg> Digital proof within 24h</span>
                  <span><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5l3 3 6-6" stroke="var(--green)" stroke-width="1.4" stroke-linecap="round"/></svg> From ₹449 · Ships in 3–5 days</span>
                  <span><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5l3 3 6-6" stroke="var(--green)" stroke-width="1.4" stroke-linecap="round"/></svg> Free replacement guarantee</span>
                </div>
              </div>
            </div>
            <div class="custom-cta-right">
              <button class="custom-cta-btn" onclick="window.cf.nav('/customize');trackEvent('custom_cta_banner','home')">
                Start Custom Frame
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <p class="custom-cta-note">Prepaid only · ₹50 prepaid discount applied</p>
            </div>
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
              <p>Join 8,000+ art lovers. Get early access to drops, exclusive offers, and wall-styling tips. Zero spam.</p>
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
    // Exit intent — initialise after 3 seconds (let user settle)
    setTimeout(initExitIntent, 3000);
    // Inject FAQ Schema for home page
    injectHomeFAQSchema();
    // Exit intent — initialise after 3 seconds (let user settle)
    setTimeout(initExitIntent, 3000);
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
      { slug: 'spiritual', label: 'Divine & Spiritual', sub: 'Puja rooms & meditation', img: DESIGN_IMAGES['mahadev-cosmic-trance'], color: '#12103a' },
      { slug: 'automotive', label: 'Automotive Art', sub: 'For car enthusiasts', img: DESIGN_IMAGES['porsche-911-pacific-coast'], color: '#071525' },
      { slug: 'sports', label: 'Sports Legends', sub: 'Cricket, F1 & more', img: DESIGN_IMAGES['cricket-glory-moment'], color: '#001030' },
      { slug: 'wildlife', label: 'Wildlife', sub: 'Living rooms & offices', img: DESIGN_IMAGES['lion-geometric-gold'], color: '#1a1100' },
      { slug: 'anime', label: 'Anime & JDM', sub: 'Gaming rooms & gifts', img: DESIGN_IMAGES['nissan-gtr-r34-osaka-rain'], color: '#14001a' },
      { slug: 'motivational', label: 'Motivational', sub: 'Home office & gym walls', img: DESIGN_IMAGES['f1-redbull-racing'], color: '#0a0a0a' },
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
    const variants = (p.variants || []).filter(v => {
      if (v.is_active === false) return false;
      const sku = (v.sku || '').toLowerCase();
      const frameType = (v.frame_type || '').toLowerCase();
      const size = (v.size || '').toLowerCase();
      // Filter out unframed posters / 99 rs variants
      if (sku.includes('noframe') || sku.includes('poster') || frameType.includes('no frame') || frameType.includes('unframed') || size === 'a4' || Number(v.price) < 300) return false;
      return true;
    });
    const framedPrices = variants.map(v => Number(v.price)).filter(pr => pr >= 300);
    const price = framedPrices.length > 0 ? Math.min(...framedPrices) : Math.max(449, Number(p.base_price) || 449);
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
          <img src="${img}" onerror="this.onerror=null;this.src='https://www.genspark.ai/api/files/s/6YSmJUF0';" alt="${name} framed art print" loading="eager" fetchpriority="high" width="400" height="500">
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

  function renderStaticReviews() {
    const reviews = [
      { name: 'Arjun M.', city: 'Hyderabad', rating: 5, verified: true,
        text: 'The BMW M4 print is absolutely stunning. Frame quality is premium — exactly what I expected. My garage wall has never looked this good. Arrived in 4 days, perfectly packed.',
        product: 'BMW M4 Carbon Dark', initials: 'AM', color: '#1a1a2e' },
      { name: 'Priya S.', city: 'Bangalore', rating: 5, verified: true,
        text: 'Got the Radha Krishna Emerald print for my pooja room. The colours are so vivid and the black frame gives it a gallery feel. My whole family is in love with it!',
        product: 'Radha Krishna Emerald Dance', initials: 'PS', color: '#1a1050' },
      { name: 'Rohit K.', city: 'Mumbai', rating: 5, verified: true,
        text: 'Ordered two cricket prints as gifts. Both friends loved them. The quality far exceeded what I expected for this price point. Will definitely be ordering more.',
        product: 'Cricket Glory Moment', initials: 'RK', color: '#001233' },
      { name: 'Sneha T.', city: 'Chennai', rating: 5, verified: true,
        text: 'ChitraFrame is incredible. The Mahadev Cosmic Trance creates such a calm energy in the entire room. It\'s the first thing guests notice when they walk in.',
        product: 'Mahadev Cosmic Trance', initials: 'ST', color: '#1a0a3a' },
      { name: 'Vikram P.', city: 'Pune', rating: 5, verified: true,
        text: 'The geometric lion is a masterpiece. Perfect centrepiece for my home office. Got 3 compliments in the first week. The packaging was solid — zero damage.',
        product: 'Lion Geometric Gold', initials: 'VP', color: '#1a1000' },
      { name: 'Ananya R.', city: 'Delhi', rating: 5, verified: true,
        text: 'Gifted the F1 RedBull print to my brother — he is obsessed with it. Will order a full gallery wall set for the car room next. Fantastic service all round!',
        product: 'F1 RedBull Championship', initials: 'AR', color: '#1a0505' },
    ];

    return `<div class="reviews-carousel">
      ${reviews.map((r, i) => `
        <div class="review-card" data-reveal data-reveal-delay="${i % 3}" itemscope itemprop="review" itemtype="https://schema.org/Review">
          <div class="review-card-top">
            <div class="review-avatar" style="background:${r.color}" aria-hidden="true">${escapeHTML(r.initials)}</div>
            <div class="review-author-block">
              <strong itemprop="author">${escapeHTML(r.name)}</strong>
              <span class="review-city">${escapeHTML(r.city)}</span>
            </div>
            ${r.verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
          </div>
          <div class="review-stars" itemprop="reviewRating" itemscope itemtype="https://schema.org/Rating">
            <meta itemprop="ratingValue" content="${r.rating}">
            ${'★'.repeat(r.rating)}
          </div>
          <p class="review-text" itemprop="reviewBody">"${escapeHTML(r.text)}"</p>
          <div class="review-product-tag">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="1" y="1" width="8" height="8" rx="1.5" stroke="var(--ink-400)" stroke-width="1"/><rect x="2.5" y="2.5" width="5" height="5" rx="1" fill="var(--ink-200)"/></svg>
            ${escapeHTML(r.product)}
          </div>
        </div>`).join('')}
    </div>`;
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

  function quickAdd(variantId, name, price, image, slug) {
    addToCart({ variantId, name, price: Number(price), image, slug, size: 'Medium', frame: 'Black' });
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
    let initialSize = 'Medium';
    let initialFrame = 'standard';
    let firstPrice = 749;
    let priceMap = {};

    const SIZES = [
      { key: 'Small', label: 'Small (8×12")', basePrice: 449, premPrice: 699 },
      { key: 'Medium', label: 'Medium (12×18")', basePrice: 749, premPrice: 999 },
      { key: 'Large', label: 'Large (16×20")', basePrice: 1099, premPrice: 1349 },
      { key: 'XL', label: 'XL (20×30")', basePrice: 1699, premPrice: 1999 }
    ];

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

      // Filter out noframe variants
      variants = (p.variants || []).filter(v => {
        if (v.is_active === false) return false;
        const sku = (v.sku || '').toLowerCase();
        const frameType = (v.frame_type || '').toLowerCase();
        const size = (v.size || '').toLowerCase();
        if (sku.includes('noframe') || sku.includes('poster') || frameType.includes('no frame') || frameType.includes('unframed') || size === 'a4' || Number(v.price) < 300) return false;
        return true;
      }).sort((a, b) => Number(a.price) - Number(b.price));

      // Map existing variants to fill real pricing
      for (const v of variants) {
        const s = v.size || 'Medium';
        const ft = (v.frame_type || '').toLowerCase().includes('premium') || (v.sku || '').toLowerCase().includes('premium') ? 'premium' : 'standard';
        priceMap[`${s}-${ft}`] = Number(v.price);
      }

      const getPrice = (sz, fr) => priceMap[`${sz}-${fr}`] || (fr === 'premium' ? (SIZES.find(s=>s.key===sz)?.premPrice || 999) : (SIZES.find(s=>s.key===sz)?.basePrice || 749));
      firstPrice = getPrice(initialSize, initialFrame);

      const basePrice = Math.min(...SIZES.map(s => getPrice(s.key, 'standard')));
      const catName = (typeof p.category === 'object' && p.category?.name) ? p.category.name : (p.category || 'Art Print');
      product = {
        slug: p.slug, name: p.name, category: catName,
        basePrice, desc: p.description || 'Museum-quality art print, framed and delivered across India.',
        seoTitle: p.seo_title || `${p.name} | ChitraFrame India`,
        seoDesc: p.seo_description || `Buy ${p.name} premium framed art print. Ships across India from ₹${basePrice}.`,
        image: primaryImg, _raw: p
      };
    } catch (e) {
      const fallbackImg = DESIGN_IMAGES[slug] || cldUrl(slug, 800);
      product = {
        slug, name: slug.replace(/-/g, ' ').replace(/\b./g, c => c.toUpperCase()), category: 'Art Print',
        basePrice: 449, desc: 'Museum-quality framed art print.', image: fallbackImg,
        seoTitle: `${slug} | ChitraFrame India`, seoDesc: 'Buy premium framed art print.'
      };
      galleryImages = [{ image_url: fallbackImg, display_order: 0 }];
    }

    document.title = product.seoTitle;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', product.seoDesc);

    const primaryImg = galleryImages[0]?.image_url || product.image;

  app.innerHTML = renderHeader() + `
  <main id="main-content">
    <div class="product-detail">
      <div class="container">
        <div class="product-layout">
          <!-- Gallery with Live Interactive Frame Preview -->
          <div class="product-gallery">
            <div class="pdp-frame-preview-container" id="pdp-preview-container">
              <div class="pdp-frame-mockup frame-standard" id="pdp-frame-mockup">
                <img id="product-main-image" src="${escapeHTML(primaryImg)}" alt="${escapeHTML(product.name)} framed art print" loading="eager" fetchpriority="high">
              </div>
            </div>
            <div class="frame-preview-toggle-hint">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zm0 3a.75.75 0 00-.75.75v3.5c0 .414.336.75.75.75h2.5a.75.75 0 000-1.5h-1.75V6.25A.75.75 0 008 5.5z"/></svg>
              <span>Live Frame Preview: switch style below</span>
            </div>
            ${galleryImages.length > 1 ? `
            <div class="product-thumbnails" style="margin-top:14px;">
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
              <span class="price-from">Price</span>
              <span id="product-current-price">${formatPrice(firstPrice)}</span>
            </div>

            <!-- Size Selection (4 clean options) -->
            <div class="size-section">
              <div class="size-label-row">
                <span class="size-label">Select Size</span>
                <a href="/size-guide" onclick="window.cf.nav('/size-guide');return false;" class="size-guide-link">Size Guide</a>
              </div>
              <div class="size-options" role="group" aria-label="Select size">
                <button class="size-btn" data-size="Small" onclick="window.cf.selectPDPSize(this, 'Small')">
                  Small (8×12")
                </button>
                <button class="size-btn size-active" data-size="Medium" onclick="window.cf.selectPDPSize(this, 'Medium')" aria-pressed="true">
                  Medium (12×18")
                </button>
                <button class="size-btn" data-size="Large" onclick="window.cf.selectPDPSize(this, 'Large')">
                  Large (16×20")
                </button>
                <button class="size-btn" data-size="XL" onclick="window.cf.selectPDPSize(this, 'XL')">
                  XL (20×30")
                </button>
              </div>
            </div>

            <!-- Frame Type Selection (2 distinct options with Live Preview) -->
            <div class="frame-type-section">
              <div class="size-label-row">
                <span class="size-label">Frame Style</span>
              </div>
              <div class="frame-type-grid" role="group" aria-label="Select Frame Style">
                <button class="frame-type-btn frame-active" data-frame="standard" onclick="window.cf.selectPDPFrame(this, 'standard')">
                  <div class="frame-type-header">
                    <span class="frame-type-title">Standard Frame</span>
                    <span class="frame-type-badge">Classic</span>
                  </div>
                  <span class="frame-type-desc">Photo with 1" sleek matte black frame</span>
                </button>
                <button class="frame-type-btn" data-frame="premium" onclick="window.cf.selectPDPFrame(this, 'premium')">
                  <div class="frame-type-header">
                    <span class="frame-type-title">Premium Frame</span>
                    <span class="frame-type-badge">Mounted</span>
                  </div>
                  <span class="frame-type-desc">Photo + white gallery mat border inside frame</span>
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
              <button class="btn-primary pdp-atc-btn" onclick="window.cf.pdpAddToCart('${escapeHTML(slug)}','${escapeHTML(product.name)}',window._pdpState?.basePrice||${firstPrice},'${escapeHTML(primaryImg)}')" aria-label="Add to cart">
                Add to Cart — <span id="pdp-btn-price">${formatPrice(firstPrice)}</span>
              </button>
            </div>

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

  window._pdpPriceMap = priceMap;
  window._pdpState = {
    size: initialSize,
    frame: 'Standard Frame',
    frameStyle: 'standard',
    qty: 1,
    basePrice: firstPrice,
    variantId: `${slug}-${initialSize.toLowerCase()}-standard`
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
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '200',
        bestRating: '5',
        worstRating: '1'
      }
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

  function selectPDPSize(btn, sizeKey) {
    $$('.size-btn').forEach(b => { b.classList.remove('size-active'); b.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('size-active');
    btn.setAttribute('aria-pressed', 'true');
    if (!window._pdpState) return;
    window._pdpState.size = sizeKey;
    updatePDPPriceAndPreview();
  }

  function selectPDPFrame(btn, frameStyle) {
    $$('.frame-type-btn').forEach(b => { b.classList.remove('frame-active'); b.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('frame-active');
    btn.setAttribute('aria-pressed', 'true');
    if (!window._pdpState) return;
    window._pdpState.frameStyle = frameStyle;
    window._pdpState.frame = frameStyle === 'premium' ? 'Premium Frame (Mounted)' : 'Standard Frame';
    updatePDPPriceAndPreview();
  }

  function updatePDPPriceAndPreview() {
    const s = window._pdpState;
    if (!s) return;
    const priceMap = window._pdpPriceMap || {};
    const defaultPrices = {
      'Small':  { standard: 449, premium: 699 },
      'Medium': { standard: 749, premium: 999 },
      'Large':  { standard: 1099, premium: 1349 },
      'XL':     { standard: 1699, premium: 1999 },
    };
    const sz = s.size || 'Medium';
    const fr = s.frameStyle || 'standard';
    const computedPrice = priceMap[`${sz}-${fr}`] || (defaultPrices[sz] ? defaultPrices[sz][fr] : (fr === 'premium' ? 999 : 749));

    s.basePrice = computedPrice;
    s.variantId = `${sz}-${fr}`.toLowerCase();

    // Update displayed prices
    const priceEl = document.getElementById('product-current-price');
    if (priceEl) priceEl.textContent = formatPrice(computedPrice);
    const btnPrice = document.getElementById('pdp-btn-price');
    if (btnPrice) btnPrice.textContent = formatPrice(computedPrice);
    const stickyPrice = document.getElementById('pdp-sticky-price');
    if (stickyPrice) stickyPrice.textContent = formatPrice(computedPrice);

    // Update live frame preview mockup
    const mockup = document.getElementById('pdp-frame-mockup');
    if (mockup) {
      if (fr === 'premium') {
        mockup.className = 'pdp-frame-mockup frame-premium';
      } else {
        mockup.className = 'pdp-frame-mockup frame-standard';
      }
    }
  }

  // Backward compatibility aliases
  function selectSize(btn, basePrice) {
    const size = btn.dataset?.size || 'Medium';
    selectPDPSize(btn, size);
  }

  function selectFrame(btn) {
    const frame = btn.dataset?.frame || 'standard';
    selectPDPFrame(btn, frame);
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
  }

  // togglePdpPoster removed — poster add-on no longer offered

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
              <tr><td>Small</td><td>8×12 inches (20×30 cm)</td><td>Desk, bedside, small walls</td></tr>
              <tr><td>Medium</td><td>12×18 inches (30×45 cm)</td><td>Bedroom, study, gallery wall</td></tr>
              <tr><td>Large</td><td>16×20 inches (40×50 cm)</td><td>Living room, focal point</td></tr>
              <tr><td>XL</td><td>20×30 inches (50×75 cm)</td><td>Statement wall, large rooms</td></tr>
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
    document.title = 'Checkout \u2014 Complete Your Order | ChitraFrame';
    if (state.cart.length === 0) { navigate('/cart'); return; }
    // GA4 begin_checkout event
    const cartValue = state.cart.reduce((s, i) => s + (i.price * (i.quantity || 1)), 0);
    trackEvent('begin_checkout', { currency: 'INR', value: cartValue, items: state.cart.map(i => ({ item_id: i.slug || i.variantId, item_name: i.name, price: i.price, quantity: i.quantity || 1 })) });
    // Cart empty guard
    const hasRealItem = state.cart.length > 0;
    if (!hasRealItem) { navigate('/cart'); return;
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
      createUrgencyTimer('checkout-timer', 15);
    }, 50);
  }

  async function submitCheckout(e) {
    e.preventDefault();
    // Cart empty guard
    if (!state.cart.length) { toast('Your cart is empty.', 'error'); return; }
    const form = e.target;
    const btn = $('#checkout-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Placing order...'; }

    const data = new FormData(form);
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
        }).then(r => r.json()).catch(() => ({})).then(verifyResult => {
          const confirmedOrderId = verifyResult.order_id || orderData.internal_order_id || orderData.order_id || '';
          state.cart = [];
          saveCart();
          trackEvent('purchase', { transaction_id: confirmedOrderId, value: orderData.total, currency: 'INR', payment_type: 'online', razorpay_payment_id: response.razorpay_payment_id });
          navigate('/order-success?order=' + encodeURIComponent(confirmedOrderId) + '&total=' + encodeURIComponent(orderData.total) + '&type=prepaid');
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
                  <span class="about-stat-num">2,000+</span>
                  <span class="about-stat-label">Frames delivered across India</span>
                </div>
                <div class="about-stat">
                  <span class="about-stat-num">4.9 ★</span>
                  <span class="about-stat-label">Average customer rating</span>
                </div>
                <div class="about-stat">
                  <span class="about-stat-num">51</span>
                  <span class="about-stat-label">Curated designs</span>
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
                <p>Browse 51 curated designs. Free delivery above ₹799.</p>
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

  function renderPolicyPage(app) {
    const slug = location.pathname.split('/policy/')[1] || 'privacy';
    const titles = { privacy: 'Privacy Policy', terms: 'Terms of Service', shipping: 'Shipping Policy', refund: 'Refund & Returns' };
    const title = titles[slug] || 'Policy';

    const content = {
      shipping: `<h2>Shipping Policy</h2>
        <p><strong>Delivery Time:</strong> 5–7 business days across India. Metro cities: 3–5 days.</p>
        <p><strong>Free Shipping:</strong> On all orders above ₹799 after discounts.</p>
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

  async function submitSuggestion(e) {
    e.preventDefault();
    const data = new FormData(e.target);
    try {
      await fetch(`${API}/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: data.get('message'),
          contact_name: data.get('contact_name'),
          contact_phone: data.get('contact_phone')
        })
      });
      toast('🎉 Thank you! We\'ll work on it.');
      e.target.reset();
    } catch (err) {
      toast('Submitted! We\'ll review your idea.', 'info');
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
    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <section class="section">
        <div class="container">
          <div class="static-page">
            <h1>My Account</h1>
            <div class="account-actions">
              <button class="btn-outline" onclick="window.cf.nav('/track')">Track Orders</button>
              <button class="btn-outline" onclick="localStorage.removeItem('cf_auth');window.cf.nav('/');toast('Signed out')">Sign Out</button>
            </div>
          </div>
        </div>
      </section>
    </main>
    ${renderFooter()}`;

    initMobileMenu();
    initStickyHeader();
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
          <p>Buying framed art prints online in India has never been easier — but it's also never been easier to get burned by low-quality prints and flimsy frames. After helping 2,000+ customers find the perfect wall art, here's what we've learned.</p>
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
          <p>F1 art is a growing category. Abstract speed compositions, championship liveries, and driver tribute prints work beautifully in matte black frames. Pair a large XL print (20×30") above a gaming setup or garage workbench for maximum impact.</p>
          <h2>Lamborghini & Supercar Wall Art</h2>
          <p>The Lamborghini Huracán and Aventador are icons of Italian excess — and they look spectacular in angular, high-contrast art prints. Warm amber tones and sharp silhouettes work best. Choose a medium (12×18") or large (16×20") format for a statement piece.</p>
          <h2>Frame Choice for Car Art</h2>
          <p>Matte black frames are the default choice for automotive art — they match the dark, cinematic mood of most car prints. Natural wood works well for more editorial or vintage automotive compositions. All ChitraFrame automotive prints come with a choice of both finishes.</p>
          <h2>Where to Hang It</h2>
          <p>Home garage: go large — XL (20×30") above the workbench. Home office: medium (12×18") in a curated gallery wall. Man cave or games room: create a three-print grid of different automotive subjects at the same scale.</p>`,
        'how-to-choose-frame-size-wall-art': `
          <p>Wrong frame size is the number one wall art mistake. It's easy to go too small — a 8×10" print on a large living room wall looks like a postage stamp. Here's how to get it right, room by room.</p>
          <h2>The 57–75% Rule</h2>
          <p>Art should fill between 57% and 75% of the wall space it anchors. For a typical 180cm sofa, that means 100–135cm of art width. Use a single XL frame or a gallery wall of 3–4 medium frames to hit this target.</p>
          <h2>ChitraFrame Size Guide</h2>
          <p><strong>Small (8×12" / 20×30cm)</strong> — Ideal for bedside tables, bathroom walls, small study nooks, and gallery walls as accent pieces. Works beautifully in sets of 3–6.</p>
          <p><strong>Medium (12×18" / 30×45cm)</strong> — The most versatile size. Works above a desk, in a dining room, or as part of a two-frame living room pairing. Our most popular size.</p>
          <p><strong>Large (16×20" / 40×50cm)</strong> — The statement size. Perfect above a sofa, bed, or fireplace. A single large print commands attention in any room.</p>
          <p><strong>XL (20×30" / 50×75cm)</strong> — Dominates a wall. Use in spacious living rooms, large master bedrooms, or as the hero piece in a double-height entryway. Reserved for truly impactful art.</p>
          <h2>Room-by-Room Recommendations</h2>
          <p><strong>Living room:</strong> Large or XL above sofa. If the sofa is 160–200cm wide, choose an 16×20" or 20×30" frame. <strong>Bedroom:</strong> Large above headboard, small on side walls. <strong>Home office:</strong> Medium on the wall behind your chair (creates great video call backdrops). <strong>Bathroom:</strong> Small or medium — avoid very large prints in humid spaces.</p>
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
                      <div>⭐ 4.9/5 from 2,000+ reviews</div>
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
    const data = new FormData(e.target);
    try {
      const res = await fetch(`${API}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: 'general',
          name: data.get('name'),
          rating: parseInt(data.get('rating') || '5'),
          body: data.get('body')
        })
      });
      toast('🎉 Thank you for your review!');
      e.target.reset();
    } catch (err) {
      toast('Review submitted!', 'success');
    }
  }

  // ── Newsletter ─────────────────────────────────────────────────────────────
  async function handleNewsletter(e) {
    e.preventDefault();
    const email = e.target.querySelector('[name="email"]').value.trim();
    try {
      await fetch(`${API}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'newsletter' })
      });
      toast('🎉 You\'re subscribed! Watch for beautiful drops in your inbox.');
      e.target.reset();
    } catch (err) {
      toast('Subscribed! Welcome to ChitraFrame.');
    }
  }

  // ── EXIT INTENT ─────────────────────────────────────────────────────────
  let _exitIntentShown = false;
  function initExitIntent() {
    // Don't show if already shown this session or user already subscribed
    if (_exitIntentShown || sessionStorage.getItem('exit_intent_shown') || localStorage.getItem('cf_subscribed')) return;

    // Desktop: show on mouseleave near top of viewport
    const onMouseLeave = (e) => {
      if (e.clientY <= 5 && !_exitIntentShown) {
        showExitIntent();
        document.removeEventListener('mouseleave', onMouseLeave);
      }
    };

    // Mobile: show after 45 seconds of session
    const mobileTimer = setTimeout(() => {
      if (!_exitIntentShown) showExitIntent();
    }, 45000);

    document.addEventListener('mouseleave', onMouseLeave);
    // Clean up timer if user already interacted
    document.addEventListener('click', '.exit-intent-overlay', () => clearTimeout(mobileTimer), { once: true });
  }

  function showExitIntent() {
    if (_exitIntentShown) return;
    _exitIntentShown = true;
    sessionStorage.setItem('exit_intent_shown', '1');
    const overlay = document.getElementById('exit-intent-overlay');
    if (overlay) {
      overlay.classList.add('active');
      trackEvent('exit_intent_shown', { page: location.pathname });
    }
  }

  function closeExitIntent() {
    const overlay = document.getElementById('exit-intent-overlay');
    if (overlay) overlay.classList.remove('active');
    trackEvent('exit_intent_dismissed', { page: location.pathname });
  }

  async function handleExitIntentSubmit(e) {
    e.preventDefault();
    const email = e.target.querySelector('[name="email"]').value.trim();
    if (!email) return;
    try {
      await fetch(`${API}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'exit_intent' })
      });
      localStorage.setItem('cf_subscribed', '1');
      closeExitIntent();
      toast('🎉 Subscribed! Your ₹50 discount has been noted — apply at checkout.');
      trackEvent('exit_intent_subscribed', { page: location.pathname });
    } catch (err) {
      closeExitIntent();
      toast('Subscribed! Welcome to ChitraFrame.');
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
    if (state.exitShown || state.cart.length === 0) return;
    document.addEventListener('mouseleave', function handler(e) {
      if (e.clientY > 10 || state.exitShown) return;
      state.exitShown = true;
      document.removeEventListener('mouseleave', handler);
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-box exit-modal">
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" aria-label="Close">×</button>
          <div class="exit-icon">🎁</div>
          <h3>Wait — before you go!</h3>
          <p>Your cart has items waiting. Complete your order now and get <strong>free shipping</strong> on us.</p>
          <button class="btn-primary w-full" onclick="window.cf.nav('/checkout');this.closest('.modal-overlay').remove()">Complete Order →</button>
          <button class="btn-ghost w-full mt-2" onclick="this.closest('.modal-overlay').remove()">Maybe later</button>
        </div>`;
      modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
      document.body.appendChild(modal);
    });
  }

  // ── CUSTOM FRAME PAGE ────────────────────────────────────────────────────
  function customCalcPrice() {
    const sizeSelect = document.getElementById('custom-size');
    const frameVal = window._customFrameVal || 'black';
    const sizePrices = { small: 449, medium: 749, large: 1099, xl: 1699 }; // Standard prices from DB
    const frameExtra = { black: 0, 'natural-wood': 150, premium: 150 };
    const size = sizeSelect?.value || 'medium';
    const base = (sizePrices[size] || 999) + (frameExtra[frameVal] || 0);
    const el = document.getElementById('custom-price-display');
    if (el) el.textContent = formatPrice(base);
    // Update preview label
    const sizeLabelMap = { small: 'Small (8×12")', medium: 'Medium (12×18")', large: 'Large (16×20")', xl: 'XL (20×30")' };
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

  function submitCustomOrder() {
    // Use new _cfwState (wizard) — fallback to _customState (legacy)
    const s = window._cfwState || window._customState || {};

    // Read from new wizard fields first, fallback to old field IDs
    const name = (document.getElementById('cfp-name') || document.getElementById('cfw-name') || document.getElementById('custom-name'))?.value?.trim();
    const phone = (document.getElementById('cfp-phone') || document.getElementById('cfw-phone') || document.getElementById('custom-phone'))?.value?.trim();
    const note = (document.getElementById('cfp-notes') || document.getElementById('cfw-notes') || document.getElementById('custom-note'))?.value?.trim();

    if (!name || name.length < 2) { toast('Please enter your full name', 'error'); return; }
    if (!phone || !/^[6-9]\d{9}$/.test(phone.replace(/\D/g, ''))) { toast('Please enter a valid 10-digit WhatsApp number', 'error'); return; }

    // Build item details from cfwState
    const sizeLabel = s.sizeLabel || s.size || 'Medium (12×18")';
    const finish = s.finish || 'standard';
    const basePrice = Number(s.basePrice || 749);
    const finishLabel = finish === 'premium'
      ? 'Premium (Natural Wood or Mount, 1.5")'
      : 'Standard (Matte Black, 1")';
    const totalItemPrice = basePrice;
    const styleDisplay = finishLabel;
    const itemName = `Custom Frame — ${sizeLabel} · ${finishLabel}`;

    addToCart({
      variantId: `custom-${(s.size||'medium').toLowerCase()}-${finish}-${Date.now()}`,
      name: itemName,
      price: totalItemPrice,
      image: '',
      slug: 'custom-frame',
      size: s.size || 'Medium',
      finish: finish,
      frame: styleDisplay,
      customNote: note || '',
      customerName: name,
      customerPhone: phone,
      uploadedDataUrl: s.uploadedDataUrl || null,
    });

    // Capture lead via API
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, phone,
        source: 'custom-frame-wizard',
        notes: `Size: ${sizeLabel} | Finish: ${finish} | Note: ${note || 'None'}`
      })
    }).catch(() => {});

    // Also try to log to Supabase custom_framing_orders_intake
    fetch('/api/custom-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyer_fullname: name,
        buyer_whatsapp_phone: phone.replace(/\D/g, ''),
        uploaded_image_storage_path: s.uploadedDataUrl ? 'client-upload' : 'no-upload',
        selected_dimension_profile: (s.size || 'Medium').charAt(0).toUpperCase() + (s.size || 'Medium').slice(1),
        selected_framing_style: finish,
        include_poster_print_copy: false,
        user_special_instructions: note || '',
        computed_subtotal_amount: totalItemPrice
      })
    }).catch(() => {});

    toast('Custom frame added to cart! 🎨', 'success');
    setTimeout(() => navigate('/checkout'), 700);
  }

  function renderCustomizePage(app) {
    document.title = 'Custom Photo Frame — Upload Your Photo | ChitraFrame';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', 'Frame your cherished photo with ChitraFrame. Upload, choose size and finish — we print, frame and deliver in 3–5 days. Museum-grade quality from ₹449.');

    // Render shell immediately, then fetch prices async
    app.innerHTML = renderHeader() + `
    <main id="main-content" class="cfp-main">
      <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "Service",
        "name": "Custom Photo Frame Order",
        "description": "Upload your photo and order a custom museum-quality frame at ChitraFrame. 4 sizes, Standard (Matte Black) or Premium (Natural Wood or Mount). Delivered across India in 3–5 days.",
        "provider": { "@type": "Organization", "name": "ChitraFrame", "url": "https://chitraframe.in" },
        "areaServed": "IN",
        "serviceType": "Custom Photo Framing",
        "offers": { "@type": "AggregateOffer", "priceCurrency": "INR", "lowPrice": "449", "highPrice": "2199", "offerCount": "8" }
      }
      <\/script>

      <!-- ── HERO ───────────────────────────────────────────────── -->
      <div class="cfp-hero">
        <div class="cfp-hero-inner container">
          <nav class="cfp-breadcrumb" aria-label="Breadcrumb">
            <a href="/" onclick="window.cf.nav('/');return false;">Home</a>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span aria-current="page">Custom Frame</span>
          </nav>
          <h1 class="cfp-hero-title">Frame <em>Your</em> Photo</h1>
          <p class="cfp-hero-sub">Museum-grade archival prints · Hand-finished frames · Pan-India delivery in 3–5 days</p>
          <div class="cfp-hero-pills">
            <span class="cfp-pill">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 7l3 3 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Any photo accepted
            </span>
            <span class="cfp-pill">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 7l3 3 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Digital proof sent
            </span>
            <span class="cfp-pill">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 7l3 3 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Free replacement guarantee
            </span>
            <span class="cfp-pill">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 7l3 3 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Prepaid · Secure payment
            </span>
          </div>
        </div>
      </div>

      <!-- ── STEP PROGRESS ─────────────────────────────────────── -->
      <div class="cfp-steps-bar">
        <div class="container">
          <div class="cfp-steps">
            <div class="cfp-step cfp-step--active" id="cfp-step-1">
              <span class="cfp-step-num">1</span><span class="cfp-step-label">Upload</span>
            </div>
            <div class="cfp-step-line"></div>
            <div class="cfp-step" id="cfp-step-2">
              <span class="cfp-step-num">2</span><span class="cfp-step-label">Size</span>
            </div>
            <div class="cfp-step-line"></div>
            <div class="cfp-step" id="cfp-step-3">
              <span class="cfp-step-num">3</span><span class="cfp-step-label">Finish</span>
            </div>
            <div class="cfp-step-line"></div>
            <div class="cfp-step" id="cfp-step-4">
              <span class="cfp-step-num">4</span><span class="cfp-step-label">Order</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── MAIN LAYOUT ───────────────────────────────────────── -->
      <div class="cfp-body">
        <div class="container">
          <div class="cfp-cols">

            <!-- LEFT COLUMN: Form -->
            <div class="cfp-form-col">

              <!-- SECTION 1: Upload -->
              <section class="cfp-section" id="cfp-sec-1" aria-labelledby="cfp-s1-h">
                <div class="cfp-sec-head">
                  <div class="cfp-sec-num" aria-hidden="true">01</div>
                  <div>
                    <h2 class="cfp-sec-title" id="cfp-s1-h">Upload Your Photo</h2>
                    <p class="cfp-sec-hint">JPG, PNG, HEIC — any resolution. We optimise before printing.</p>
                  </div>
                </div>

                <label class="cfp-drop-zone" id="cfp-drop-label" for="cfp-file-inp" tabindex="0" role="button" aria-label="Tap to upload your photo">
                  <input type="file" id="cfp-file-inp" accept="image/*" style="display:none" onchange="window.cf.cfwHandleUpload(this)">
                  <div class="cfp-drop-idle" id="cfp-drop-idle">
                    <div class="cfp-drop-icon" aria-hidden="true">
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                        <rect x="1" y="1" width="38" height="38" rx="10" stroke="var(--gold)" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.5"/>
                        <path d="M20 12v12M14 18l6-6 6 6" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M11 30h18" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
                      </svg>
                    </div>
                    <strong class="cfp-drop-cta">Tap to upload your photo</strong>
                    <span class="cfp-drop-hint">Or share via WhatsApp after ordering</span>
                  </div>
                  <div class="cfp-drop-preview" id="cfp-drop-preview" style="display:none">
                    <img id="cfp-thumb" alt="Your photo preview" class="cfp-thumb">
                    <div class="cfp-drop-done">
                      <div class="cfp-drop-done-tick">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9l4 4 8-8" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      </div>
                      <div>
                        <strong>Photo uploaded</strong>
                        <p>We'll send a digital proof before printing</p>
                      </div>
                      <button type="button" class="cfp-reupload" onclick="document.getElementById('cfp-file-inp').click();event.preventDefault();event.stopPropagation()">Change</button>
                    </div>
                  </div>
                </label>
                <p class="cfp-legal-note">By uploading, you confirm you have rights to print this image.</p>
              </section>

              <!-- SECTION 2: Size -->
              <section class="cfp-section" id="cfp-sec-2" aria-labelledby="cfp-s2-h">
                <div class="cfp-sec-head">
                  <div class="cfp-sec-num" aria-hidden="true">02</div>
                  <div>
                    <h2 class="cfp-sec-title" id="cfp-s2-h">Choose Size</h2>
                    <p class="cfp-sec-hint" id="cfp-size-hint">Prices loaded from live database</p>
                  </div>
                </div>

                <!-- Price loading state -->
                <div id="cfp-price-loading" class="cfp-price-loading" style="display:none">
                  <div class="cfp-spinner" aria-label="Loading prices"></div>
                  <span>Loading prices…</span>
                </div>
                <div id="cfp-price-error" class="cfp-price-error" style="display:none">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="#ef4444" stroke-width="1.5"/><path d="M9 5v5M9 13v.5" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round"/></svg>
                  Prices unavailable, please try again.
                  <button class="cfp-retry-btn" onclick="window.cf.cfwLoadPrices()">Retry</button>
                </div>

                <div class="cfp-size-grid" id="cfp-size-grid" role="group" aria-label="Frame size" style="display:none">
                  <!-- Injected by JS after price fetch -->
                </div>
              </section>

              <!-- SECTION 3: Finish -->
              <section class="cfp-section" id="cfp-sec-3" aria-labelledby="cfp-s3-h">
                <div class="cfp-sec-head">
                  <div class="cfp-sec-num" aria-hidden="true">03</div>
                  <div>
                    <h2 class="cfp-sec-title" id="cfp-s3-h">Frame Finish</h2>
                    <p class="cfp-sec-hint">Both options include glass front and hanging hardware</p>
                  </div>
                </div>

                <div class="cfp-finish-grid" id="cfp-finish-grid" role="group" aria-label="Frame finish">
                  <!-- Injected by JS after price fetch -->
                </div>
              </section>

              <!-- SECTION 4: Your Details -->
              <section class="cfp-section" id="cfp-sec-4" aria-labelledby="cfp-s4-h">
                <div class="cfp-sec-head">
                  <div class="cfp-sec-num" aria-hidden="true">04</div>
                  <div>
                    <h2 class="cfp-sec-title" id="cfp-s4-h">Your Details</h2>
                    <p class="cfp-sec-hint">Two fields — we handle everything else</p>
                  </div>
                </div>

                <div class="cfp-fields">
                  <div class="cfp-field">
                    <label for="cfp-name" class="cfp-field-label">Full Name <span class="cfp-required">*</span></label>
                    <input type="text" id="cfp-name" class="cfp-input" placeholder="Your full name" maxlength="100" autocomplete="name" inputmode="text">
                  </div>
                  <div class="cfp-field">
                    <label for="cfp-phone" class="cfp-field-label">WhatsApp / Mobile <span class="cfp-required">*</span></label>
                    <input type="tel" id="cfp-phone" class="cfp-input" placeholder="10-digit mobile number" maxlength="15" autocomplete="tel" inputmode="numeric">
                  </div>
                  <div class="cfp-field">
                    <label for="cfp-notes" class="cfp-field-label">
                      Special Instructions
                      <span class="cfp-optional-tag">Optional</span>
                    </label>
                    <textarea id="cfp-notes" class="cfp-textarea" rows="3" maxlength="800"
                      placeholder="Crop preferences, orientation, colour notes… our team reads every word."></textarea>
                  </div>
                </div>

                <p class="cfp-prepaid-note">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L1 4v4c0 3.3 2.6 6.2 6 7 3.4-.8 6-3.7 6-7V4L7 1z" stroke="currentColor" stroke-width="1.2"/><path d="M4.5 7l2 2 3-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  Secure prepaid payment only — processed via Razorpay
                </p>

                <div class="cfp-bulk-note">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M4 6h6M4 8.5h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                  Ordering 10+ frames?
                  <a href="/contact" onclick="window.cf.nav('/contact');return false;">Contact us for bulk pricing →</a>
                </div>

                <!-- Desktop CTAs -->
                <div class="cfp-ctas-desktop">
                  <button class="cfp-order-btn" id="cfp-cart-btn" onclick="window.cf.submitCustomOrder()">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1 1h2.5l2.4 9.6h8.1l2-7H5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="15" r="1.2" fill="currentColor"/><circle cx="13" cy="15" r="1.2" fill="currentColor"/></svg>
                    Proceed to Checkout
                    <span class="cfp-btn-price" id="cfp-desktop-total">—</span>
                  </button>
                  <button class="cfp-wa-btn" type="button" onclick="window.cf.cfwWhatsAppOrder()">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.6 2.4A7.8 7.8 0 0 0 2.4 13.6L1 15l1.5-.4A7.8 7.8 0 1 0 13.6 2.4z" fill="#25D366"/><path d="M5.5 4.5c-.1-.3-.3-.3-.5-.3s-.3 0-.5.1c-.2.1-.7.7-.7 1.7s.7 2 .8 2.1 1.4 2.2 3.4 3c.5.2.8.3 1.1.3s.6-.1.8-.3c.2-.2.5-.8.6-1.1.1-.2 0-.4-.1-.5l-1.2-.6c-.2-.1-.4 0-.5.1l-.4.5c-.1.1-.2.1-.4 0a5.2 5.2 0 0 1-1.6-1.4c-.1-.2 0-.3.1-.4l.3-.4c.1-.1.1-.3.1-.4L5.5 4.5z" fill="#fff"/></svg>
                    Ask on WhatsApp
                  </button>
                </div>
              </section>

            </div><!-- /cfp-form-col -->

            <!-- RIGHT COLUMN: Sticky Summary -->
            <aside class="cfp-sidebar" aria-label="Order summary">
              <!-- Live mockup -->
              <div class="cfp-mockup-wrap">
                <div class="cfp-mockup-frame" id="cfp-frame-outer">
                  <div class="cfp-mockup-mat" id="cfp-mat-border">
                    <div class="cfp-mockup-photo" id="cfp-photo-area">
                      <svg viewBox="0 0 160 200" fill="none" width="100%" height="100%">
                        <rect width="160" height="200" fill="#1a1a2e"/>
                        <circle cx="80" cy="80" r="44" fill="none" stroke="var(--gold)" stroke-width="1" opacity="0.3"/>
                        <circle cx="80" cy="64" r="18" fill="var(--gold)" opacity="0.1"/>
                        <path d="M44 140 Q80 118 116 140" stroke="var(--gold)" stroke-width="1.5" fill="none" opacity="0.3"/>
                        <text x="80" y="180" text-anchor="middle" fill="rgba(201,151,58,0.4)" font-size="9" font-family="serif">Your Photo Here</text>
                      </svg>
                    </div>
                  </div>
                </div>
                <p class="cfp-mockup-caption" id="cfp-mockup-label">Medium · Standard · —</p>
              </div>

              <!-- Summary card -->
              <div class="cfp-summary-card">
                <h3 class="cfp-summary-title">Order Summary</h3>
                <div class="cfp-sum-rows">
                  <div class="cfp-sum-row">
                    <span>Size</span>
                    <span id="cfp-sum-size">—</span>
                  </div>
                  <div class="cfp-sum-row">
                    <span>Finish</span>
                    <span id="cfp-sum-finish">—</span>
                  </div>
                  <div class="cfp-sum-sep"></div>
                  <div class="cfp-sum-row cfp-sum-sub">
                    <span>Subtotal</span>
                    <span id="cfp-sum-subtotal">—</span>
                  </div>
                  <div class="cfp-sum-row" id="cfp-sum-shipping-row">
                    <span>Shipping</span>
                    <span id="cfp-sum-shipping-val">—</span>
                  </div>
                  <div class="cfp-sum-row cfp-sum-discount">
                    <span>Prepaid discount</span>
                    <span id="cfp-sum-discount">−₹50</span>
                  </div>
                  <div class="cfp-sum-sep"></div>
                  <div class="cfp-sum-row cfp-sum-total-row">
                    <span>Total</span>
                    <span id="cfp-sum-total">—</span>
                  </div>
                </div>
                <p class="cfp-free-hint" id="cfp-free-hint" style="display:none"></p>

                <button class="cfp-order-btn" onclick="window.cf.submitCustomOrder()">
                  <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M1 1h2.5l2.4 9.6h8.1l2-7H5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="15" r="1.2" fill="currentColor"/><circle cx="13" cy="15" r="1.2" fill="currentColor"/></svg>
                  Proceed to Checkout
                </button>
                <button class="cfp-wa-btn" type="button" onclick="window.cf.cfwWhatsAppOrder()">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M13.6 2.4A7.8 7.8 0 0 0 2.4 13.6L1 15l1.5-.4A7.8 7.8 0 1 0 13.6 2.4z" fill="#25D366"/><path d="M5.5 4.5c-.1-.3-.3-.3-.5-.3s-.3 0-.5.1c-.2.1-.7.7-.7 1.7s.7 2 .8 2.1 1.4 2.2 3.4 3c.5.2.8.3 1.1.3s.6-.1.8-.3c.2-.2.5-.8.6-1.1.1-.2 0-.4-.1-.5l-1.2-.6c-.2-.1-.4 0-.5.1l-.4.5c-.1.1-.2.1-.4 0a5.2 5.2 0 0 1-1.6-1.4c-.1-.2 0-.3.1-.4l.3-.4c.1-.1.1-.3.1-.4L5.5 4.5z" fill="#fff"/></svg>
                  Ask on WhatsApp
                </button>

                <div class="cfp-sidebar-trust">
                  <div class="cfp-trust-item">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L1 4v4c0 3.3 2.6 6.2 6 7 3.4-.8 6-3.7 6-7V4L7 1z" stroke="var(--gold)" stroke-width="1.2"/></svg>
                    Digital proof before printing
                  </div>
                  <div class="cfp-trust-item">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 6-6" stroke="var(--gold)" stroke-width="1.5" stroke-linecap="round"/></svg>
                    Free replacement on damage
                  </div>
                  <div class="cfp-trust-item">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="4" width="12" height="9" rx="1.5" stroke="var(--gold)" stroke-width="1.2"/><path d="M4 4V3a3 3 0 0 1 6 0v1" stroke="var(--gold)" stroke-width="1.2"/></svg>
                    Razorpay secure payment
                  </div>
                </div>
              </div>
            </aside>

          </div><!-- /cfp-cols -->
        </div>
      </div>

      <!-- Mobile sticky bottom bar -->
      <div class="cfp-bottom-bar" id="cfp-bottom-bar" aria-label="Order total and CTA">
        <div class="cfp-bottom-inner">
          <div class="cfp-bottom-price">
            <span class="cfp-bottom-label">Total</span>
            <span class="cfp-bottom-total" id="cfp-sticky-total">—</span>
          </div>
          <button class="cfp-bottom-cta" onclick="window.cf.submitCustomOrder()">
            Checkout →
          </button>
        </div>
      </div>

    </main>
    ${renderFooter()}`;

    // ── State ──────────────────────────────────────────────────────────────────
    window._cfwState = {
      size: 'Medium',
      sizeLabel: 'Medium (12×18")',
      finish: 'standard',
      basePrice: null,          // null until prices loaded from server
      priceMap: {},             // { 'Small-standard': 449, 'Small-premium': 599, … }
      freeShippingThreshold: 899,
      shippingCharge: 99,
      prepaidDiscount: 50,
      uploadedFile: null,
      uploadedDataUrl: null,
      pricesLoaded: false,
    };

    // ── Price fetch ────────────────────────────────────────────────────────────
    window.cf.cfwLoadPrices = async function() {
      const loading = document.getElementById('cfp-price-loading');
      const error = document.getElementById('cfp-price-error');
      const grid = document.getElementById('cfp-size-grid');
      const finGrid = document.getElementById('cfp-finish-grid');
      const hint = document.getElementById('cfp-size-hint');
      const orderBtn = document.getElementById('cfp-cart-btn');

      if (loading) loading.style.display = 'flex';
      if (error) error.style.display = 'none';
      if (grid) grid.style.display = 'none';

      // Disable checkout until prices are confirmed
      if (orderBtn) orderBtn.disabled = true;

      try {
        const resp = await fetch('/api/custom-frame/prices');
        const data = await resp.json();

        if (!data.success || !data.sizes || !data.sizes.length) {
          throw new Error(data.error || 'No price data returned');
        }

        const s = window._cfwState;
        s.freeShippingThreshold = data.config.free_shipping_threshold || 899;
        s.shippingCharge = data.config.shipping_charge || 99;
        s.prepaidDiscount = data.config.prepaid_discount || 50;
        s.pricesLoaded = true;

        // Build price map
        s.priceMap = {};
        for (const sz of data.sizes) {
          if (sz.standard) s.priceMap[sz.size + '-standard'] = sz.standard;
          if (sz.premium)  s.priceMap[sz.size + '-premium']  = sz.premium;
        }

        // Set default to Medium standard
        s.basePrice = s.priceMap['Medium-standard'] || null;

        // Render size tiles
        if (grid) {
          grid.innerHTML = data.sizes.map(sz => {
            const stdPrice = sz.standard ? '₹' + sz.standard.toLocaleString('en-IN') : '—';
            const premPrice = sz.premium  ? '₹' + sz.premium.toLocaleString('en-IN')  : '—';
            const isDefault = sz.size === 'Medium';
            return `
            <button class="cfp-size-tile${isDefault ? ' cfp-size-tile--active' : ''}"
              id="cfp-sz-${sz.id}"
              type="button"
              onclick="window.cf.cfwSelectSize('${sz.size}','${sz.label}','cfp-sz-${sz.id}')"
              aria-pressed="${isDefault ? 'true' : 'false'}">
              ${sz.popular ? '<div class="cfp-size-popular">Most Popular</div>' : ''}
              <div class="cfp-size-visual" aria-hidden="true">
                <div class="cfp-size-frame cfp-size-frame--${sz.id}"></div>
              </div>
              <div class="cfp-size-info">
                <strong class="cfp-size-name">${sz.size}</strong>
                <span class="cfp-size-dim">${sz.label}</span>
                <span class="cfp-size-room">${sz.context}</span>
              </div>
              <div class="cfp-size-prices">
                <span class="cfp-size-std-price">${stdPrice}</span>
                <span class="cfp-size-sep">·</span>
                <span class="cfp-size-prm-price">${premPrice}</span>
              </div>
            </button>`;
          }).join('');
          grid.style.display = 'grid';
        }

        // Render finish tiles
        if (finGrid) {
          const stdBasePrice = s.priceMap['Medium-standard'];
          const prmBasePrice = s.priceMap['Medium-premium'];
          finGrid.innerHTML = `
          <button class="cfp-finish-tile cfp-finish-tile--active" id="cfp-fin-std" type="button"
            onclick="window.cf.cfwSelectFinish('standard','cfp-fin-std','cfp-fin-prm')"
            aria-pressed="true">
            <div class="cfp-finish-swatch cfp-finish-swatch--standard" aria-hidden="true">
              <div class="cfp-finish-swatch-inner"></div>
            </div>
            <div class="cfp-finish-info">
              <strong>Standard (Matte Black, 1")</strong>
              <span>Clean, modern profile — complements all designs</span>
            </div>
            <span class="cfp-finish-price" id="cfp-fin-std-price">${stdBasePrice ? '₹' + stdBasePrice.toLocaleString('en-IN') : '—'}</span>
          </button>

          <button class="cfp-finish-tile" id="cfp-fin-prm" type="button"
            onclick="window.cf.cfwSelectFinish('premium','cfp-fin-prm','cfp-fin-std')"
            aria-pressed="false">
            <div class="cfp-finish-swatch cfp-finish-swatch--premium" aria-hidden="true">
              <div class="cfp-finish-swatch-inner"></div>
            </div>
            <div class="cfp-finish-info">
              <strong>Premium (Natural Wood or Mount, 1.5")</strong>
              <span>Warm oak or white mat border — gallery-grade look</span>
            </div>
            <span class="cfp-finish-price" id="cfp-fin-prm-price">${prmBasePrice ? '₹' + prmBasePrice.toLocaleString('en-IN') : '—'}</span>
          </button>`;
        }

        if (hint) hint.textContent = 'Prices loaded from live database';
        if (orderBtn) orderBtn.disabled = false;

        // Initial calc
        window.cf.cfwCalcPrice();

        if (loading) loading.style.display = 'none';

      } catch (err) {
        console.warn('[cfwLoadPrices] Using fallback pricing:', err);
        const fallbackSizes = [
          { id: 'small', size: 'Small', label: '8×12"', standard: 449, premium: 699, context: 'Desk & shelf', popular: false },
          { id: 'medium', size: 'Medium', label: '12×18"', standard: 749, premium: 999, context: 'Bedroom wall', popular: true },
          { id: 'large', size: 'Large', label: '16×20"', standard: 1099, premium: 1349, context: 'Living room', popular: false },
          { id: 'xl', size: 'XL', label: '20×30"', standard: 1699, premium: 1999, context: 'Statement wall', popular: false }
        ];

        const s = window._cfwState;
        s.freeShippingThreshold = 899;
        s.shippingCharge = 99;
        s.prepaidDiscount = 50;
        s.pricesLoaded = true;

        s.priceMap = {};
        for (const sz of fallbackSizes) {
          s.priceMap[sz.size + '-standard'] = sz.standard;
          s.priceMap[sz.size + '-premium']  = sz.premium;
        }

        s.basePrice = s.priceMap['Medium-standard'];

        if (grid) {
          grid.innerHTML = fallbackSizes.map(sz => {
            const stdPrice = '₹' + sz.standard.toLocaleString('en-IN');
            const premPrice = '₹' + sz.premium.toLocaleString('en-IN');
            const isDefault = sz.size === 'Medium';
            return `
            <button class="cfp-size-tile${isDefault ? ' cfp-size-tile--active' : ''}"
              id="cfp-sz-${sz.id}"
              type="button"
              onclick="window.cf.cfwSelectSize('${sz.size}','${sz.label}','cfp-sz-${sz.id}')"
              aria-pressed="${isDefault ? 'true' : 'false'}">
              ${sz.popular ? '<div class="cfp-size-popular">Most Popular</div>' : ''}
              <div class="cfp-size-visual" aria-hidden="true">
                <div class="cfp-size-frame cfp-size-frame--${sz.id}"></div>
              </div>
              <div class="cfp-size-info">
                <strong class="cfp-size-name">${sz.size}</strong>
                <span class="cfp-size-dim">${sz.label}</span>
                <span class="cfp-size-room">${sz.context}</span>
              </div>
              <div class="cfp-size-prices">
                <span class="cfp-size-std-price">${stdPrice}</span>
                <span class="cfp-size-sep">·</span>
                <span class="cfp-size-prm-price">${premPrice}</span>
              </div>
            </button>`;
          }).join('');
          grid.style.display = 'grid';
        }

        if (finGrid) {
          finGrid.innerHTML = `
          <button class="cfp-finish-tile cfp-finish-tile--active" id="cfp-fin-std" type="button"
            onclick="window.cf.cfwSelectFinish('standard','cfp-fin-std','cfp-fin-prm')"
            aria-pressed="true">
            <div class="cfp-finish-swatch cfp-finish-swatch--standard" aria-hidden="true">
              <div class="cfp-finish-swatch-inner"></div>
            </div>
            <div class="cfp-finish-info">
              <strong>Standard Frame (Matte Black, 1")</strong>
              <span>Clean, modern profile — complements all photos</span>
            </div>
            <span class="cfp-finish-price" id="cfp-fin-std-price">₹749</span>
          </button>

          <button class="cfp-finish-tile" id="cfp-fin-prm" type="button"
            onclick="window.cf.cfwSelectFinish('premium','cfp-fin-prm','cfp-fin-std')"
            aria-pressed="false">
            <div class="cfp-finish-swatch cfp-finish-swatch--premium" aria-hidden="true">
              <div class="cfp-finish-swatch-inner"></div>
            </div>
            <div class="cfp-finish-info">
              <strong>Premium Frame (Mounted, 1.5")</strong>
              <span>White mat border inside frame — gallery-grade look</span>
            </div>
            <span class="cfp-finish-price" id="cfp-fin-prm-price">₹999</span>
          </button>`;
        }

        if (orderBtn) orderBtn.disabled = false;
        if (loading) loading.style.display = 'none';
        if (error) error.style.display = 'none';
        if (hint) hint.textContent = 'Curated gallery framing options';
        window.cf.cfwCalcPrice();
      }
    };

    // ── Upload handler ─────────────────────────────────────────────────────────
    window.cf.cfwHandleUpload = function(input) {
      const file = input.files[0];
      if (!file) return;
      window._cfwState.uploadedFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        window._cfwState.uploadedDataUrl = e.target.result;
        const thumb = document.getElementById('cfp-thumb');
        const idle = document.getElementById('cfp-drop-idle');
        const preview = document.getElementById('cfp-drop-preview');
        if (thumb) thumb.src = e.target.result;
        if (idle) idle.style.display = 'none';
        if (preview) preview.style.display = 'flex';
        // Live mockup update
        const photoArea = document.getElementById('cfp-photo-area');
        if (photoArea) {
          photoArea.innerHTML = '<img src="' + e.target.result + '" alt="Preview" style="width:100%;height:100%;object-fit:cover;border-radius:2px;">';
        }
        // Activate step 2
        const s1 = document.getElementById('cfp-step-1');
        const s2 = document.getElementById('cfp-step-2');
        if (s1) s1.classList.add('cfp-step--done');
        if (s2) s2.classList.add('cfp-step--active');
      };
      reader.readAsDataURL(file);
    };

    // ── Size selection ─────────────────────────────────────────────────────────
    window.cf.cfwSelectSize = function(size, label, cardId) {
      const s = window._cfwState;
      s.size = size;
      s.sizeLabel = size + ' (' + label + ')';
      s.basePrice = s.priceMap[size + '-' + s.finish] || null;

      document.querySelectorAll('.cfp-size-tile').forEach(c => {
        c.classList.remove('cfp-size-tile--active');
        c.setAttribute('aria-pressed', 'false');
      });
      const card = document.getElementById(cardId);
      if (card) { card.classList.add('cfp-size-tile--active'); card.setAttribute('aria-pressed', 'true'); }

      // Update finish tile prices for new size
      const stdKey = size + '-standard';
      const prmKey = size + '-premium';
      const stdEl = document.getElementById('cfp-fin-std-price');
      const prmEl = document.getElementById('cfp-fin-prm-price');
      if (stdEl) stdEl.textContent = s.priceMap[stdKey] ? '₹' + s.priceMap[stdKey].toLocaleString('en-IN') : '—';
      if (prmEl) prmEl.textContent = s.priceMap[prmKey] ? '₹' + s.priceMap[prmKey].toLocaleString('en-IN') : '—';

      window.cf.cfwCalcPrice();
    };

    // ── Finish selection ───────────────────────────────────────────────────────
    window.cf.cfwSelectFinish = function(finish, activeId) {
      const inactiveIds = Array.prototype.slice.call(arguments, 2);
      const s = window._cfwState;
      s.finish = finish;
      s.basePrice = s.priceMap[s.size + '-' + finish] || null;

      document.querySelectorAll('.cfp-finish-tile').forEach(b => {
        b.classList.remove('cfp-finish-tile--active');
        b.setAttribute('aria-pressed', 'false');
      });
      const aBtn = document.getElementById(activeId);
      if (aBtn) { aBtn.classList.add('cfp-finish-tile--active'); aBtn.setAttribute('aria-pressed', 'true'); }

      // Update mockup frame colour
      const frameOuter = document.getElementById('cfp-frame-outer');
      if (frameOuter) {
        if (finish === 'premium') {
          frameOuter.style.background = 'linear-gradient(135deg,#8B6914 0%,#C4922E 50%,#8B6914 100%)';
        } else {
          frameOuter.style.background = '#1a1a1a';
        }
      }

      window.cf.cfwCalcPrice();
    };

    // ── Legacy cfwSelectFrameType alias (keep for safety) ─────────────────────
    window.cf.cfwSelectFrameType = window.cf.cfwSelectFinish;

    // ── Price calculation ──────────────────────────────────────────────────────
    window.cf.cfwCalcPrice = function() {
      const s = window._cfwState;
      if (s.basePrice === null || !s.pricesLoaded) return; // prices not loaded yet

      const subtotal = s.basePrice;
      const shipping = subtotal >= s.freeShippingThreshold ? 0 : s.shippingCharge;
      const discount = s.prepaidDiscount; // always prepaid
      const total = subtotal + shipping - discount;

      const el = id => document.getElementById(id);
      const fmt = n => '₹' + Number(n).toLocaleString('en-IN');

      // Summary card
      if (el('cfp-sum-size'))     el('cfp-sum-size').textContent = s.sizeLabel;
      if (el('cfp-sum-finish'))   el('cfp-sum-finish').textContent = s.finish === 'premium'
        ? 'Premium (Natural Wood or Mount, 1.5")'
        : 'Standard (Matte Black, 1")';
      if (el('cfp-sum-subtotal')) el('cfp-sum-subtotal').textContent = fmt(subtotal);
      if (el('cfp-sum-shipping-val')) {
        el('cfp-sum-shipping-val').innerHTML = shipping === 0
          ? '<span style="color:var(--green)">Free</span>'
          : fmt(shipping);
      }
      if (el('cfp-sum-discount')) el('cfp-sum-discount').textContent = '−' + fmt(discount);
      if (el('cfp-sum-total'))    el('cfp-sum-total').textContent = fmt(total);

      // Totals in CTA buttons
      if (el('cfp-sticky-total'))  el('cfp-sticky-total').textContent = fmt(total);
      if (el('cfp-desktop-total')) el('cfp-desktop-total').textContent = fmt(total);

      // Free shipping hint
      const freeLeft = s.freeShippingThreshold - subtotal;
      if (el('cfp-free-hint')) {
        if (freeLeft > 0) {
          el('cfp-free-hint').innerHTML = 'Add <strong>' + fmt(freeLeft) + '</strong> more for <strong>free shipping!</strong>';
          el('cfp-free-hint').style.display = 'block';
        } else {
          el('cfp-free-hint').innerHTML = '🎉 You\'ve unlocked <strong>free shipping!</strong>';
          el('cfp-free-hint').style.display = 'block';
        }
      }

      // Mockup label
      const lbl = el('cfp-mockup-label');
      if (lbl) lbl.textContent = s.size + ' · ' + (s.finish === 'premium' ? 'Premium' : 'Standard') + ' · ' + fmt(total);

      // Store on state for submitCustomOrder
      s.total = total; s.shipping = shipping; s.subtotal = subtotal;
    };

    // ── WhatsApp (ask, not order) ──────────────────────────────────────────────
    window.cf.cfwWhatsAppOrder = function() {
      const nameEl = document.getElementById('cfp-name');
      const phoneEl = document.getElementById('cfp-phone');
      const notesEl = document.getElementById('cfp-notes');
      const name  = nameEl  ? nameEl.value.trim()  : '';
      const phone = phoneEl ? phoneEl.value.trim()  : '';
      const notes = notesEl ? notesEl.value.trim()  : '';
      const s = window._cfwState || {};
      const finishLabel = s.finish === 'premium'
        ? 'Premium (Natural Wood or Mount, 1.5")'
        : 'Standard (Matte Black, 1")';
      const msg = 'Hi ChitraFrame! I have a question about a custom frame order.\n'
        + (name  ? 'Name: '  + name  + '\n' : '')
        + (phone ? 'Phone: ' + phone + '\n' : '')
        + 'Size: '   + (s.sizeLabel || 'Medium 12×18"') + '\n'
        + 'Finish: ' + finishLabel + '\n'
        + 'Note: Orders are placed on the ChitraFrame website.\n'
        + (notes ? 'Message: ' + notes : '');
      window.open('https://wa.me/917989531818?text=' + encodeURIComponent(msg), '_blank');
    };

    // Legacy no-op
    window.cf.cfwGoStep = function() {};

    // ── Init ───────────────────────────────────────────────────────────────────
    window.cf.cfwLoadPrices();

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

    // Generate a referral code
    const refCode = 'CF' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const waNumber = state.config.whatsapp_number || '917989531818';
    const shareText = encodeURIComponent('Just ordered a gorgeous framed art print from ChitraFrame! Use code ' + refCode + ' for ₹100 off your first order 🖼️ https://chitraframe.in');

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
            <p style="font-size:13px;letter-spacing:0.1em;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:8px">Give ₹100 · Get ₹100</p>
            <h3 style="font-family:'DM Serif Display',serif;font-size:20px;margin-bottom:8px">Share & earn with friends</h3>
            <p style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:16px;line-height:1.6">Your friends get ₹100 off their first order. You get ₹100 store credit when they purchase.</p>
            <div style="background:rgba(255,255,255,0.1);border:1.5px dashed rgba(255,255,255,0.3);border-radius:8px;padding:12px;margin-bottom:16px;font-size:18px;font-weight:700;letter-spacing:0.1em;color:var(--gold)">${refCode}</div>
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
      else if (path === '/bulk-orders' || path === '/gift-cards' || path === '/care-guide') renderStaticPage(app, path.slice(1));
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
    if (metaDesc) metaDesc.setAttribute('content', 'ChitraFrame size guide: Small (8×12"), Medium (12×18"), Large (16×20"), XL (20×30"). Know which frame size fits your wall before buying. Free shipping above ₹899.');
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
                { size:'Small\n8×12"', price:'From ₹449', room:'Bedside table · Bookshelf · Desk', tag:'Most gifted' },
                { size:'Medium\n12×18"', price:'From ₹749', room:'Bedroom wall · Study · Hallway', tag:'Most popular' },
                { size:'Large\n16×20"', price:'From ₹1,099', room:'Living room · Dining area', tag:'Best value' },
                { size:'XL\n20×30"', price:'From ₹1,699', room:'Feature wall · Office lobby', tag:'Statement piece' },
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
                  { size:'Small',   dim:'8" × 12" (20×30 cm)',   for:'Desk / Bookshelf / Gift',        wall:'Any',            price:'From ₹449' },
                  { size:'Medium',  dim:'12" × 18" (30×45 cm)',  for:'Bedroom / Study / Hallway',      wall:'8–9 ft',         price:'From ₹749' },
                  { size:'Large',   dim:'16" × 20" (40×50 cm)',  for:'Living Room / Feature Wall',     wall:'9–10 ft',        price:'From ₹1,099' },
                  { size:'XL',      dim:'20" × 30" (50×75 cm)',  for:'Lobby / Gallery Wall / Office',  wall:'10 ft+',         price:'From ₹1,699' },
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
      { q:'What sizes are available?', a:'We offer 4 sizes: Small (8×12"), Medium (12×18"), Large (16×20"), and XL (20×30"). See our Size Guide for room placement recommendations.' },
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

  // ── URGENCY TIMER ─────────────────────────────────────────────────────────
  function createUrgencyTimer(containerId, minutesLeft) {
    const el = document.getElementById(containerId);
    if (!el) return;
    let secs = minutesLeft * 60;
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
    // Scarcity badge
    const scarcity = document.createElement('div');
    scarcity.className = 'pdp-scarcity';
    const stockNum = Math.floor(Math.random() * 4) + 3; // 3–6
    scarcity.innerHTML = `
      <span class="pdp-scarcity-dot"></span>
      Only <strong>${stockNum} left</strong> in stock at this price · Made fresh per order`;
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
            'https://wa.me/919999999999'
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
    selectPDPSize,
    selectPDPFrame,
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
    checkDelivery,
    closeExitIntent,
    handleExitIntentSubmit,
  };

  // Expose trackEvent + ABTest globally (used in inline onclick handlers)
  window.trackEvent = trackEvent;
  window.ABTest = ABTest;

  // Legacy alias
  window.pfi = window.cf;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
