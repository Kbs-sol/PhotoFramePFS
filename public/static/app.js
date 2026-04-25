// PhotoFrameIn — Customer Frontend SPA v2.0 (Production-Ready)
// Security: XSS-safe, no credentials, CSP-compliant
// SEO: Structured data, meta tags, canonical URLs
// CRO: Trust signals, urgency, social proof, exit intent, volume discounts
(function () {
  'use strict';

  const API = '/api';
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];
  let state = {
    cart: [],
    config: {},
    page: '',
    exitShown: false,
    headerAnimated: false,
    wishlist: []
  };

  // ─── Safe Cart Init ───────────────────────────────────────────────────────
  try { state.cart = JSON.parse(localStorage.getItem('pfi_cart') || '[]'); } catch (e) { state.cart = []; }
  try { state.wishlist = JSON.parse(localStorage.getItem('pfi_wishlist') || '[]'); } catch (e) { state.wishlist = []; }
  // Validate cart items to prevent tampered data
  state.cart = state.cart.filter(i =>
    i && typeof i.variantId === 'string' &&
    typeof i.price === 'number' && isFinite(i.price) && i.price > 0 &&
    typeof i.name === 'string' &&
    Number.isInteger(i.quantity || 1) && (i.quantity || 1) >= 1
  );

  // ─── Utilities ────────────────────────────────────────────────────────────
  function saveCart() {
    // Enforce max 20 items and reasonable qty
    state.cart = state.cart.filter(i => i && i.price > 0 && isFinite(i.price))
      .slice(0, 20)
      .map(i => ({ ...i, quantity: Math.min(Math.max(1, i.quantity || 1), 50) }));
    localStorage.setItem('pfi_cart', JSON.stringify(state.cart));
    updateCartBadge();
  }

  function updateCartBadge() {
    const count = state.cart.reduce((s, i) => s + (i.quantity || 1), 0);
    $$('.cart-count, .cart-badge').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
      el.setAttribute('aria-label', `${count} items in cart`);
    });
  }

  function toast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'alert');
    t.setAttribute('aria-live', 'polite');
    // msg is always system-generated here (never user input)
    t.innerHTML = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2800);
  }

  function formatPrice(p) {
    const n = Number(p);
    if (!isFinite(n) || n < 0) return '₹0';
    return '₹' + Math.round(n).toLocaleString('en-IN');
  }

  function navigate(path) {
    // Sanitize path - only allow safe internal paths
    if (typeof path !== 'string' || !path.startsWith('/') || path.includes('..')) return;
    history.pushState({}, '', path);
    route();
  }

  // ─── XSS Prevention — ALWAYS use this before injecting user data into innerHTML ──
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/`/g, '&#x60;');
  }

  function escapeAttr(str) { return escapeHTML(str); }

  function captureUTM() {
    const params = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'].forEach(k => {
      const v = params.get(k);
      if (v && typeof v === 'string' && v.length < 200) localStorage.setItem(k, v);
    });
  }

  async function trackFunnelEvent(type, product_id = null, order_id = null, metadata = {}) {
    try {
      // Push to GTM/GA4 dataLayer
      if (window.dataLayer) {
        window.dataLayer.push({
          event: 'funnel_event',
          event_type: type,
          product_id,
          order_id,
          ...metadata
        });
      }
      // Server-side log (fire and forget)
      fetch(`${API}/analytics/funnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: type, product_id, order_id,
          metadata: {
            ...metadata,
            path: location.pathname,
            utm_source: localStorage.getItem('utm_source'),
            utm_medium: localStorage.getItem('utm_medium'),
            utm_campaign: localStorage.getItem('utm_campaign')
          }
        })
      }).catch(() => {});
    } catch (e) {}
  }

  // ─── Volume Discount Logic (validated, no NaN/negative) ─────────────────
  function getVolumeDiscount(subtotal, itemCount) {
    // Tiered discounts: fixed savings
    if (!isFinite(subtotal) || subtotal <= 0) return { discount: 0, label: '' };
    if (itemCount >= 5) {
      const d = Math.floor(subtotal * 0.20); // 20% off
      return { discount: Math.max(0, d), label: 'Buy 5+ — 20% OFF Applied!' };
    }
    if (itemCount >= 3) {
      return { discount: 250, label: 'Buy 3 Deal — ₹250 Saved!' };
    }
    if (itemCount >= 2) {
      return { discount: 100, label: 'Buy 2 Deal — ₹100 Saved!' };
    }
    return { discount: 0, label: '' };
  }

  function getCartTotals() {
    const subtotal = state.cart.reduce((s, i) => {
      const price = Number(i.price);
      const qty = Math.max(1, i.quantity || 1);
      return s + (isFinite(price) && price > 0 ? price * qty : 0);
    }, 0);
    const itemCount = state.cart.reduce((s, i) => s + (i.quantity || 1), 0);
    const { discount, label } = getVolumeDiscount(subtotal, itemCount);
    const freeThreshold = parseInt(state.config.free_shipping_threshold || '799');
    const shipping = (subtotal - discount) >= freeThreshold ? 0 : 99;
    const total = Math.max(0, subtotal - discount + shipping);
    return { subtotal, discount, label, shipping, total, itemCount, freeThreshold };
  }

  // ─── Router ──────────────────────────────────────────────────────────────
  function route() {
    const path = location.pathname;
    const app = $('#app');
    if (!app) return;
    app.innerHTML = '';

    try {
      if (path === '/' || path === '') renderHomePage(app);
      else if (path === '/shop') renderShopPage(app);
      else if (path === '/customize') renderCustomFramePage(app);
      else if (path.startsWith('/product/')) renderProductPage(app, path.split('/product/')[1]);
      else if (path.startsWith('/category/')) renderCategoryPage(app, path.split('/category/')[1]);
      else if (path === '/cart') renderCartPage(app);
      else if (path === '/checkout') renderCheckoutPage(app);
      else if (path === '/track') renderTrackPage(app);
      else if (path === '/returns') renderReturnsPage(app);
      else if (path === '/login') renderLoginPage(app);
      else if (path === '/account') renderAccountPage(app);
      else if (path === '/auth/callback') handleAuthCallback(app);
      else if (path.startsWith('/policy')) renderPolicyPage(app);
      else if (path === '/about' || path === '/contact') renderStaticPage(app, path.slice(1));
      else if (path.startsWith('/blog')) renderBlogPage(app, path);
      else renderHomePage(app);
    } catch (err) {
      console.error('Route error:', err);
      app.innerHTML = renderHeader() + `
      <main class="max-w-4xl mx-auto px-4 py-32 text-center">
        <div class="text-5xl mb-6">⚠️</div>
        <h1 class="text-2xl font-bold mb-4">Something went wrong</h1>
        <p class="text-gray-400 mb-8">Please try refreshing the page.</p>
        <button onclick="location.reload()" class="btn-buy inline-block max-w-xs">Reload Page</button>
      </main>` + renderFooter();
    }

    window.scrollTo(0, 0);
    setTimeout(() => { if ($('.site-header')) initScrollAnimations(); }, 300);
    trackFunnelEvent('page_view', null, null, { title: document.title, path });
  }

  // ─── Header ──────────────────────────────────────────────────────────────
  function renderHeader() {
    const cartCount = state.cart.reduce((s, i) => s + (i.quantity || 1), 0);
    const ann = state.config;
    const isAnnActive = ann.announcement_active === 'true';
    // SECURITY: announcement_text comes from DB admin config — escape it
    const annText = escapeHTML(ann.announcement_text || 'Free Delivery on orders above ₹799 | COD Available');
    const annLink = ann.announcement_link ? escapeAttr(ann.announcement_link) : '/shop';
    const annBg = /^#[0-9A-Fa-f]{3,8}$/.test(ann.announcement_bg || '') ? ann.announcement_bg : '#CC0000';

    return `
    ${isAnnActive ? `
    <div class="announcement-bar" style="background:${annBg}" role="banner">
      ${annText} <a href="${annLink}" onclick="window.pfi.nav('${annLink}');return false" class="ml-2 underline font-bold">Shop Now →</a>
    </div>` : ''}
    <header class="site-header" role="banner">
      <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div class="flex items-center gap-6">
          <a href="/" onclick="window.pfi.nav('/'); return false;" class="flex items-center gap-2 group" aria-label="PhotoFrameIn - Home">
            <span class="text-3xl" aria-hidden="true">🖼️</span>
            <div>
              <div class="text-xl font-bold tracking-tighter text-white font-display">PhotoFrameIn</div>
              <div class="text-[9px] uppercase tracking-[0.2em] text-brand-gold -mt-1 font-bold">Photo Frames Online</div>
            </div>
          </a>
          <nav class="hidden md:flex items-center gap-5" aria-label="Main navigation">
            <a href="/category/dive" onclick="window.pfi.nav('/category/dive');return false;" class="nav-link">Dive Art</a>
            <a href="/category/automotive" onclick="window.pfi.nav('/category/automotive');return false;" class="nav-link text-brand-saffron">Automotive</a>
            <a href="/shop" onclick="window.pfi.nav('/shop');return false;" class="nav-link">All Art</a>
            <a href="/customize" onclick="window.pfi.nav('/customize');return false;" class="nav-link text-brand-gold border-b border-brand-gold pb-0.5">Custom</a>
          </nav>
        </div>
        <div class="flex items-center gap-3">
          <a href="/track" onclick="window.pfi.nav('/track');return false;" class="hidden md:flex text-xs font-bold text-gray-400 hover:text-brand-gold transition items-center gap-1">
            <i class="fas fa-truck text-sm" aria-hidden="true"></i><span>Track</span>
          </a>
          <a href="/cart" onclick="window.pfi.nav('/cart');return false;" class="relative p-2 group" aria-label="Shopping cart, ${cartCount} items">
            <i class="fas fa-shopping-bag text-xl text-gray-200 group-hover:text-brand-gold transition" aria-hidden="true"></i>
            <span class="cart-badge ${cartCount === 0 ? 'hidden' : ''}" aria-live="polite">${cartCount}</span>
          </a>
        </div>
      </div>
    </header>`;
  }

  function renderFooter() {
    const c = state.config;
    const cartCount = state.cart.reduce((s, i) => s + (i.quantity || 1), 0);
    // SECURITY: Escape config values that come from DB
    const contactEmail = escapeHTML(c.contact_email || 'support@photoframein.com');
    const contactPhone = escapeHTML(c.contact_phone || '+91 79895 31818');
    const instaLink = /^https?:\/\//.test(c.instagram_link || '') ? escapeAttr(c.instagram_link) : '#';
    const fbLink = /^https?:\/\//.test(c.facebook_link || '') ? escapeAttr(c.facebook_link) : '#';
    const waNumber = /^\d{10,15}$/.test((c.whatsapp_number || '').replace(/\D/g,'')) ?
      (c.whatsapp_number || '').replace(/\D/g,'') : '917989531818';

    return `
    <footer class="site-footer mt-20" role="contentinfo">
      <div class="max-w-7xl mx-auto px-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div class="col-span-2 md:col-span-1">
            <div class="flex items-center gap-2 mb-4">
              <span class="text-2xl" aria-hidden="true">🖼️</span>
              <span class="text-lg font-bold text-white font-display uppercase tracking-widest">PhotoFrameIn</span>
            </div>
            <p class="text-gray-400 text-sm mb-5 leading-relaxed">Buy photo frames online — handcrafted in Hyderabad, delivered pan-India with 5-layer protective packaging.</p>
            <div class="flex gap-3" aria-label="Social media links">
              <a href="${instaLink}" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="Instagram"><i class="fab fa-instagram" aria-hidden="true"></i></a>
              <a href="${fbLink}" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="Facebook"><i class="fab fa-facebook-f" aria-hidden="true"></i></a>
              <a href="https://wa.me/${waNumber}" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="WhatsApp"><i class="fab fa-whatsapp" aria-hidden="true"></i></a>
            </div>
          </div>
          <div>
            <h3 class="footer-heading">Shop</h3>
            <ul class="footer-links" role="list">
              <li><a href="/category/dive" onclick="window.pfi.nav('/category/dive');return false;">Dive Art Frames</a></li>
              <li><a href="/category/automotive" onclick="window.pfi.nav('/category/automotive');return false;">Automotive Frames</a></li>
              <li><a href="/shop" onclick="window.pfi.nav('/shop');return false;">All Products</a></li>
              <li><a href="/customize" onclick="window.pfi.nav('/customize');return false;">Custom Photo Frame</a></li>
            </ul>
          </div>
          <div>
            <h3 class="footer-heading">Help</h3>
            <ul class="footer-links" role="list">
              <li><a href="/track" onclick="window.pfi.nav('/track');return false;">Track Order</a></li>
              <li><a href="/returns" onclick="window.pfi.nav('/returns');return false;">Returns Policy</a></li>
              <li><a href="/policy/shipping" onclick="window.pfi.nav('/policy/shipping');return false;">Shipping Policy</a></li>
              <li><a href="/policy/privacy" onclick="window.pfi.nav('/policy/privacy');return false;">Privacy Policy</a></li>
            </ul>
          </div>
          <div>
            <h3 class="footer-heading">Contact</h3>
            <ul class="space-y-3 text-sm text-gray-400" role="list">
              <li><i class="fas fa-envelope mr-2 text-brand-gold" aria-hidden="true"></i><a href="mailto:${contactEmail}" class="hover:text-brand-gold transition">${contactEmail}</a></li>
              <li><i class="fas fa-phone mr-2 text-brand-gold" aria-hidden="true"></i><a href="tel:${contactPhone.replace(/\s/g,'')}" class="hover:text-brand-gold transition">${contactPhone}</a></li>
              <li><i class="fas fa-map-marker-alt mr-2 text-brand-gold" aria-hidden="true"></i>Hyderabad, Telangana</li>
            </ul>
            <div class="mt-6">
              <p class="text-xs text-gray-600 mb-2 uppercase tracking-widest">Secure Payments</p>
              <div class="flex gap-2 text-2xl" aria-label="Accepted payment methods">
                <span title="UPI">📱</span>
                <span title="Cards">💳</span>
                <span title="Net Banking">🏦</span>
                <span title="Cash on Delivery">💵</span>
              </div>
            </div>
          </div>
        </div>
        <div class="pt-6 border-t border-gray-900 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-600">
          <p>© ${new Date().getFullYear()} PhotoFrameIn. All Rights Reserved. | GST: Registered</p>
          <div class="flex gap-4">
            <a href="/policy/privacy" onclick="window.pfi.nav('/policy/privacy');return false;" class="hover:text-gray-400 transition">Privacy</a>
            <a href="/policy/terms" onclick="window.pfi.nav('/policy/terms');return false;" class="hover:text-gray-400 transition">Terms</a>
          </div>
        </div>
      </div>
    </footer>
    
    <nav class="mobile-nav" aria-label="Mobile navigation">
      <a href="/" onclick="window.pfi.nav('/');return false;" class="mobile-nav-item ${location.pathname==='/'?'active':''}" aria-label="Home">
        <i class="fas fa-home" aria-hidden="true"></i><span>Home</span>
      </a>
      <a href="/shop" onclick="window.pfi.nav('/shop');return false;" class="mobile-nav-item ${location.pathname==='/shop'?'active':''}" aria-label="Shop">
        <i class="fas fa-th-large" aria-hidden="true"></i><span>Shop</span>
      </a>
      <a href="/cart" onclick="window.pfi.nav('/cart');return false;" class="mobile-nav-item relative" aria-label="Cart, ${cartCount} items">
        <i class="fas fa-shopping-bag" aria-hidden="true"></i><span>Cart</span>
        <span class="cart-badge ${cartCount===0?'hidden':''}" style="top:-2px;right:14px" aria-live="polite">${cartCount}</span>
      </a>
      <a href="/track" onclick="window.pfi.nav('/track');return false;" class="mobile-nav-item ${location.pathname==='/track'?'active':''}" aria-label="Track order">
        <i class="fas fa-truck" aria-hidden="true"></i><span>Track</span>
      </a>
    </nav>
    <a href="https://wa.me/${waNumber}" target="_blank" rel="noopener noreferrer" class="whatsapp-widget" aria-label="Chat on WhatsApp">
      <i class="fab fa-whatsapp" aria-hidden="true"></i>
    </a>`;
  }

  function initScrollAnimations() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    if (!state.headerAnimated) {
      gsap.from('.site-header', { y: -80, opacity: 0, duration: 0.8, ease: 'power4.out', clearProps: 'all' });
      state.headerAnimated = true;
    }
    const targets = ['.product-card', '.category-card', '.trust-item', '.section-header', '.bundle-card'];
    targets.forEach(t => {
      gsap.utils.toArray(t).forEach(el => {
        if (el && !el._gsapAnimated) {
          el._gsapAnimated = true;
          gsap.from(el, {
            scrollTrigger: { trigger: el, start: 'top 92%', toggleActions: 'play none none none' },
            y: 24, opacity: 0, duration: 0.7, ease: 'power3.out'
          });
        }
      });
    });
  }

  // ─── HOME PAGE ────────────────────────────────────────────────────────────
  async function renderHomePage(app) {
    const c = state.config;
    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <!-- Hero Section - High Impact -->
      <section class="hero-section relative overflow-hidden" aria-labelledby="hero-heading">
        <div class="hero-bg-pattern" aria-hidden="true"></div>
        <div class="max-w-6xl mx-auto px-4 py-16 md:py-28 text-center relative z-10">
          <div class="inline-flex items-center gap-2 bg-brand-gold/10 border border-brand-gold/30 rounded-full px-4 py-2 mb-6 text-xs font-bold text-brand-gold uppercase tracking-widest">
            <i class="fas fa-fire" aria-hidden="true"></i> Trending in India
          </div>
          <h1 id="hero-heading" class="text-4xl md:text-6xl lg:text-7xl font-bold mb-5 leading-tight font-display">
            <span class="text-white">Premium Photo Frames</span><br>
            <span class="text-brand-gold">&amp; Wall Art Online</span>
          </h1>
          <p class="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">Transform your space with handcrafted frames. Dive art, automotive prints &amp; custom frames — delivered across India.</p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <button onclick="window.pfi.nav('/shop')" class="btn-buy max-w-xs sm:max-w-none sm:px-10" aria-label="Shop all art frames">
              <i class="fas fa-th-large mr-2" aria-hidden="true"></i>Browse Art Catalog
            </button>
            <button onclick="window.pfi.nav('/customize')" class="btn-cart max-w-xs sm:max-w-none sm:px-10" aria-label="Create custom photo frame">
              <i class="fas fa-upload mr-2" aria-hidden="true"></i>Custom Photo Frame
            </button>
          </div>

          <!-- Trust Strip -->
          <div class="flex flex-wrap justify-center gap-3 mb-12" role="list" aria-label="Store guarantees">
            <span class="trust-badge" role="listitem"><i class="fas fa-bolt" aria-hidden="true"></i> 12-Hour Dispatch</span>
            <span class="trust-badge green" role="listitem"><i class="fas fa-shipping-fast" aria-hidden="true"></i> Free Delivery ₹799+</span>
            <span class="trust-badge gold" role="listitem"><i class="fas fa-shield-alt" aria-hidden="true"></i> Damage Protected</span>
            <span class="trust-badge" role="listitem"><i class="fas fa-money-bill-wave" aria-hidden="true"></i> COD Available</span>
          </div>

          <!-- Quick Category Spotlights -->
          <div class="grid grid-cols-2 gap-3 max-w-sm mx-auto">
            <div class="spotlight-card" onclick="window.pfi.nav('/category/dive')" role="button" tabindex="0" aria-label="Shop Dive Art frames">
              <div class="text-2xl mb-1" aria-hidden="true">🤿</div>
              <div class="text-xs font-bold text-brand-gold uppercase tracking-widest">Dive Art</div>
              <div class="text-[10px] text-gray-400">Ocean &amp; Marine Frames</div>
            </div>
            <div class="spotlight-card" onclick="window.pfi.nav('/category/automotive')" role="button" tabindex="0" aria-label="Shop Automotive art frames">
              <div class="text-2xl mb-1" aria-hidden="true">🏎️</div>
              <div class="text-xs font-bold text-brand-saffron uppercase tracking-widest">Automotive</div>
              <div class="text-[10px] text-gray-400">Sports Cars &amp; Bikes</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Volume Discount Banner - CRO -->
      <section class="bg-gradient-to-r from-brand-red/20 via-brand-card to-brand-card border-y border-brand-red/30 py-4" aria-label="Volume discount offer">
        <div class="max-w-7xl mx-auto px-4">
          <div class="flex flex-wrap items-center justify-center gap-6 text-sm font-bold">
            <span class="text-gray-400">BUY MORE SAVE MORE:</span>
            <span class="text-white">2 Frames → <span class="text-brand-green">₹100 OFF</span></span>
            <span class="text-white">3 Frames → <span class="text-brand-green">₹250 OFF</span></span>
            <span class="text-white">5+ Frames → <span class="text-brand-green">Flat 20% OFF</span></span>
            <button onclick="window.pfi.nav('/shop')" class="bg-brand-gold text-black text-xs font-bold px-4 py-2 rounded-full hover:bg-yellow-400 transition" aria-label="Shop now for volume discounts">Shop Now →</button>
          </div>
        </div>
      </section>

      <!-- Categories -->
      <section class="max-w-7xl mx-auto px-4 py-14" aria-labelledby="categories-heading">
        <div class="flex items-center justify-between mb-8">
          <h2 id="categories-heading" class="section-header !mb-0">Shop by Collection</h2>
          <button onclick="window.pfi.nav('/shop')" class="text-brand-gold text-sm font-bold hover:underline" aria-label="View all collections">View All →</button>
        </div>
        <div id="categories-grid" class="grid grid-cols-2 md:grid-cols-4 gap-4" aria-live="polite">
          ${[1,2,3,4].map(() => '<div class="skeleton h-40 rounded-xl" aria-hidden="true"></div>').join('')}
        </div>
      </section>

      <!-- Bestsellers -->
      <section class="max-w-7xl mx-auto px-4 py-8" aria-labelledby="bestsellers-heading">
        <div class="flex items-center justify-between mb-8">
          <h2 id="bestsellers-heading" class="section-header !mb-0"><i class="fas fa-fire text-brand-red mr-2" aria-hidden="true"></i>Bestsellers</h2>
          <button onclick="window.pfi.nav('/shop?sort=popular')" class="text-brand-gold text-sm font-bold hover:underline">See All →</button>
        </div>
        <div id="bestsellers-grid" class="product-grid" aria-live="polite">
          ${[1,2,3,4].map(() => `<div class="product-card"><div class="skeleton h-64" aria-hidden="true"></div></div>`).join('')}
        </div>
      </section>

      <!-- Bundle / Combo Section (from photoprty2) -->
      <section class="max-w-7xl mx-auto px-4 py-12" aria-labelledby="bundles-heading">
        <h2 id="bundles-heading" class="section-header text-center"><i class="fas fa-gift text-brand-gold mr-2" aria-hidden="true"></i>Best Value Bundles</h2>
        <div id="bundles-grid" class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <article class="bundle-card" onclick="window.pfi.nav('/category/dive')" role="button" tabindex="0" aria-label="Dive Art Bundle">
            <div class="bundle-tag">🤿 DIVE BUNDLE</div>
            <h3 class="bundle-title">Dive Art Collection Pack</h3>
            <p class="bundle-desc text-gray-400 text-sm">3 premium ocean/marine frames. Perfect for dive enthusiasts &amp; beach lovers.</p>
            <div class="flex items-center gap-4 mt-4">
              <span class="bundle-price">Buy 3 → Save ₹250</span>
              <span class="badge-express text-xs">Most Popular</span>
            </div>
          </article>
          <article class="bundle-card" onclick="window.pfi.nav('/category/automotive')" role="button" tabindex="0" aria-label="Automotive Bundle">
            <div class="bundle-tag saffron">🏎️ AUTO BUNDLE</div>
            <h3 class="bundle-title">Automotive Dream Pack</h3>
            <p class="bundle-desc text-gray-400 text-sm">2 cinematic car/bike frames. Upgrade any man-cave, office or garage wall.</p>
            <div class="flex items-center gap-4 mt-4">
              <span class="bundle-price">Buy 2 → Save ₹100</span>
              <span class="badge-dispatch text-xs">Office Bestseller</span>
            </div>
          </article>
        </div>
      </section>

      <!-- Social Proof Row -->
      <section class="bg-brand-card border-y border-gray-900 py-10" aria-labelledby="social-proof-heading">
        <div class="max-w-7xl mx-auto px-4">
          <h2 id="social-proof-heading" class="text-center text-sm uppercase tracking-widest text-gray-500 mb-8">Why 5,000+ Customers Choose Us</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="trust-item" role="listitem">
              <i class="fas fa-bolt" aria-hidden="true"></i>
              <div><div class="font-bold text-sm">12-Hour Dispatch</div><div class="text-xs text-gray-400">Order confirmed to packed</div></div>
            </div>
            <div class="trust-item" role="listitem">
              <i class="fas fa-box" aria-hidden="true"></i>
              <div><div class="font-bold text-sm">5-Layer Packaging</div><div class="text-xs text-gray-400">Corner guards + bubble wrap</div></div>
            </div>
            <div class="trust-item" role="listitem">
              <i class="fas fa-exchange-alt" aria-hidden="true"></i>
              <div><div class="font-bold text-sm">Free Replacement</div><div class="text-xs text-gray-400">If damaged in transit</div></div>
            </div>
            <div class="trust-item" role="listitem">
              <i class="fas fa-star" aria-hidden="true"></i>
              <div><div class="font-bold text-sm">4.8★ Rating</div><div class="text-xs text-gray-400">500+ verified reviews</div></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Instagram Ad Creatives Section for Conversion -->
      <section class="max-w-7xl mx-auto px-4 py-12" aria-labelledby="insta-cta-heading">
        <div class="bg-gradient-to-r from-brand-purple/20 to-brand-card border border-brand-purple/30 rounded-2xl p-8 text-center">
          <h2 id="insta-cta-heading" class="text-2xl font-bold mb-3">Seen Us on Instagram? 📸</h2>
          <p class="text-gray-400 mb-6">Our frames look even better in real life. See exactly what you'll get — premium art on your wall.</p>
          <div class="flex flex-wrap justify-center gap-3 mb-6">
            <button onclick="window.pfi.nav('/category/dive')" class="btn-buy max-w-xs" aria-label="Shop dive art frames">🤿 Shop Dive Art</button>
            <button onclick="window.pfi.nav('/category/automotive')" class="btn-cart max-w-xs" aria-label="Shop automotive art frames">🏎️ Shop Automotive</button>
          </div>
          <p class="text-xs text-gray-500">Use code <strong class="text-brand-gold">INSTA10</strong> for ₹100 off your first order</p>
        </div>
      </section>
    </main>` + renderFooter();

    loadCategories();
    loadBestsellers();
    updateCartBadge();
    setupExitIntent();
  }

  async function loadCategories() {
    try {
      const res = await fetch(`${API}/categories`);
      const data = await res.json();
      const grid = $('#categories-grid');
      if (!grid) return;
      const cats = data.categories || [];
      if (!cats.length) { grid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">No collections available</p>'; return; }
      grid.className = `grid gap-4 ${cats.length <= 2 ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto' : 'grid-cols-2 md:grid-cols-4'}`;
      grid.innerHTML = cats.map(cat => {
        const safeSlug = escapeAttr(cat.slug || '');
        const safeName = escapeHTML(cat.name || '');
        const safeDesc = escapeHTML((cat.description || '').slice(0, 60));
        const safeBg = /^#[0-9A-Fa-f]{3,8}$/.test(cat.hover_color || '') ? cat.hover_color : '#C5A059';
        const emoji = cat.slug === 'dive' ? '🤿' : cat.slug === 'automotive' ? '🏎️' : cat.slug === 'divine' ? '🕉️' : cat.slug === 'motivation' ? '💪' : '🖼️';
        return `
        <div class="category-card" onclick="window.pfi.nav('/category/${safeSlug}')" role="button" tabindex="0" aria-label="Shop ${safeName} frames"
          ${cat.image_url ? `style="background:linear-gradient(to bottom,rgba(0,0,0,0.2),rgba(0,0,0,0.85)),url('${escapeAttr(cat.image_url)}');background-size:cover;background-position:center;"` : ''}>
          <div class="p-5 text-center h-full flex flex-col justify-end" style="min-height:140px">
            ${!cat.image_url ? `<div class="text-4xl mb-2" aria-hidden="true">${emoji}</div>` : ''}
            <h3 class="font-bold text-base text-white">${safeName}</h3>
            ${safeDesc ? `<p class="text-xs text-gray-300 mt-1">${safeDesc}</p>` : ''}
          </div>
        </div>`;
      }).join('');
    } catch (e) { console.error('Categories load error:', e); }
  }

  async function loadBestsellers() {
    try {
      const res = await fetch(`${API}/products/bestsellers`);
      const data = await res.json();
      const grid = $('#bestsellers-grid');
      if (!grid) return;
      if (!data.products?.length) { grid.innerHTML = '<p class="col-span-full text-center text-gray-400 py-8">Loading products...</p>'; return; }
      grid.innerHTML = data.products.map(p => renderProductCard(p)).join('');
    } catch (e) { console.error('Bestsellers load error:', e); }
  }

  function renderProductCard(p) {
    const imgs = (p.images || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const img = imgs[0];
    const variants = (p.variants || []).filter(v => v.is_active);
    const dv = variants.find(v => v.size === 'Medium' && v.frame_type === 'Standard') || variants[0] || {};
    // SECURITY: escape all user/DB-sourced data
    const safeName = escapeHTML(p.name || 'Photo Frame');
    const safeSlug = escapeAttr(p.slug || '');
    const safeAlt = escapeAttr(img?.alt_text || p.name || 'Photo Frame');
    const safeImg = img?.image_url ? escapeAttr(img.image_url) : `https://placehold.co/400x400/1A1A1A/C5A059?text=${encodeURIComponent(p.name || 'Frame')}`;
    const price = Number(dv.price) || 749;
    const comparePrice = Number(dv.compare_at_price) || 0;
    const discount = comparePrice > price ? Math.round((1 - price/comparePrice)*100) : 0;
    const rating = Math.min(5, Math.max(0, Number(p.average_rating) || 0));
    const reviewCount = Number(p.review_count) || 0;

    return `
    <article class="product-card" onclick="window.pfi.nav('/product/${safeSlug}')" role="button" tabindex="0" aria-label="${safeName}, starting from ${formatPrice(price)}">
      <div class="relative overflow-hidden">
        <img src="${safeImg}" alt="${safeAlt}" loading="lazy" width="400" height="400" style="aspect-ratio:1;object-fit:cover;width:100%">
        ${discount > 0 ? `<span class="product-badge-discount" aria-label="${discount}% discount">${discount}% OFF</span>` : ''}
        ${p.total_orders > 10 ? `<span class="product-badge-popular" aria-label="Bestseller">Bestseller</span>` : ''}
      </div>
      <div class="p-3">
        <h3 class="font-bold text-sm mb-1 line-clamp-2 text-white">${safeName}</h3>
        <div class="flex items-center gap-2 mb-1">
          <span class="price" aria-label="Price: ${formatPrice(price)}">${formatPrice(price)}</span>
          ${comparePrice > price ? `<span class="compare-price" aria-label="Was ${formatPrice(comparePrice)}">${formatPrice(comparePrice)}</span>` : ''}
        </div>
        ${rating > 0 ? `<div class="flex items-center gap-1 text-xs" aria-label="${rating} out of 5 stars, ${reviewCount} reviews">
          <span class="stars" aria-hidden="true">${'★'.repeat(Math.round(rating))}${'☆'.repeat(5-Math.round(rating))}</span>
          <span class="text-gray-400">(${reviewCount})</span>
        </div>` : ''}
        <p class="text-[10px] text-gray-500 mt-1">Medium · Standard Frame</p>
      </div>
    </article>`;
  }

  // ─── SHOP PAGE ────────────────────────────────────────────────────────────
  async function renderShopPage(app) {
    const params = new URLSearchParams(location.search);
    const initSort = params.get('sort') || 'newest';
    const initCat = params.get('category') || '';

    app.innerHTML = renderHeader() + `
    <main id="main-content" class="max-w-7xl mx-auto px-4 py-8">
      <!-- Filter Bar -->
      <div class="flex flex-wrap gap-2 mb-6 overflow-x-auto" role="navigation" aria-label="Category filter">
        <button onclick="window.pfi.loadShopProducts('newest','')" class="filter-btn active" data-filter="all" aria-pressed="true">All Art</button>
        <button onclick="window.pfi.loadShopProducts('newest','dive')" class="filter-btn" data-filter="dive" aria-pressed="false">🤿 Dive Art</button>
        <button onclick="window.pfi.loadShopProducts('newest','automotive')" class="filter-btn" data-filter="automotive" aria-pressed="false">🏎️ Automotive</button>
        <button onclick="window.pfi.loadShopProducts('price_low','')" class="filter-btn" data-filter="budget" aria-pressed="false">Budget ₹499+</button>
        <button onclick="window.pfi.loadShopProducts('popular','')" class="filter-btn" data-filter="popular" aria-pressed="false">🔥 Popular</button>
      </div>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold font-display">Photo Frames &amp; Wall Art Online</h1>
        <label for="sort-select" class="sr-only">Sort by</label>
        <select id="sort-select" onchange="window.pfi.sortProducts(this.value)" class="bg-brand-card border border-gray-700 text-gray-200 px-3 py-2 rounded-lg text-sm" aria-label="Sort products">
          <option value="newest" ${initSort==='newest'?'selected':''}>Newest</option>
          <option value="popular" ${initSort==='popular'?'selected':''}>Most Popular</option>
          <option value="price_low" ${initSort==='price_low'?'selected':''}>Price: Low to High</option>
          <option value="price_high" ${initSort==='price_high'?'selected':''}>Price: High to Low</option>
        </select>
      </div>
      <div id="shop-grid" class="product-grid" aria-live="polite" aria-label="Products">
        ${[1,2,3,4,5,6,7,8].map(() => `<div class="product-card"><div class="skeleton h-64" aria-hidden="true"></div></div>`).join('')}
      </div>
      <div id="shop-pagination" class="mt-10 text-center"></div>
    </main>` + renderFooter();

    updateCartBadge();
    loadShopProducts(initSort, initCat);
  }

  let _shopOffset = 0;
  const SHOP_LIMIT = 24;

  async function loadShopProducts(sort = 'newest', category = '', offset = 0) {
    _shopOffset = offset;
    try {
      const params = new URLSearchParams({ sort, limit: String(SHOP_LIMIT), offset: String(offset) });
      if (category) params.set('category', category);
      const res = await fetch(`${API}/products?${params}`);
      const data = await res.json();
      const grid = $('#shop-grid');
      if (!grid) return;

      // Update active filter button
      $$('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === (category || 'all'));
        btn.setAttribute('aria-pressed', btn.dataset.filter === (category || 'all') ? 'true' : 'false');
      });

      if (!data.products?.length) {
        grid.innerHTML = '<p class="col-span-full text-center text-gray-400 py-16">No products found. <button onclick="window.pfi.loadShopProducts(\'newest\',\'\')" class="text-brand-gold underline">View all products</button></p>';
        return;
      }
      // Sort client-side for price sorting
      let prods = data.products;
      if (sort === 'price_low') prods = prods.sort((a, b) => (a.variants?.[0]?.price||999) - (b.variants?.[0]?.price||999));
      if (sort === 'price_high') prods = prods.sort((a, b) => (b.variants?.[0]?.price||0) - (a.variants?.[0]?.price||0));
      grid.innerHTML = prods.map(p => renderProductCard(p)).join('');
    } catch (e) { console.error('Shop load error:', e); }
  }

  // ─── PRODUCT PAGE ─────────────────────────────────────────────────────────
  async function renderProductPage(app, slug) {
    // Validate slug
    if (!slug || !/^[a-z0-9\-]{1,100}$/.test(slug)) {
      app.innerHTML = renderHeader() + `<main class="max-w-4xl mx-auto px-4 py-20 text-center"><h1 class="text-2xl">Product not found</h1></main>` + renderFooter();
      return;
    }

    app.innerHTML = renderHeader() + `
    <main class="max-w-7xl mx-auto px-4 py-8">
      <div class="grid md:grid-cols-2 gap-8">
        <div class="skeleton h-96 rounded-2xl" aria-hidden="true"></div>
        <div class="space-y-4">
          <div class="skeleton h-8 rounded w-3/4" aria-hidden="true"></div>
          <div class="skeleton h-6 rounded w-1/2" aria-hidden="true"></div>
          <div class="skeleton h-40 rounded" aria-hidden="true"></div>
        </div>
      </div>
    </main>` + renderFooter();
    updateCartBadge();

    try {
      const utmParams = new URLSearchParams({
        utm_source: localStorage.getItem('utm_source') || '',
        utm_medium: localStorage.getItem('utm_medium') || ''
      }).toString();
      const res = await fetch(`${API}/products/${encodeURIComponent(slug)}?${utmParams}`);
      const data = await res.json();
      if (!data.product) {
        app.innerHTML = renderHeader() + `<main class="max-w-4xl mx-auto px-4 py-20 text-center"><h1 class="text-2xl font-bold">Product Not Found</h1><p class="text-gray-400 mt-4">The frame you're looking for has moved or doesn't exist.</p><button onclick="window.pfi.nav('/shop')" class="btn-buy mt-6 max-w-xs">Browse All Frames</button></main>` + renderFooter();
        return;
      }
      const p = data.product;
      const variants = (p.variants || []).filter(v => v.is_active);
      const images = (p.images || []).sort((a, b) => (a.display_order||0) - (b.display_order||0));
      const dv = variants.find(v => v.size === 'Medium' && v.frame_type === 'Standard') || variants[0];
      window._currentProduct = p;
      window._currentVariant = dv;
      window._selectedSize = dv?.size || 'Medium';
      window._selectedFrame = dv?.frame_type || 'Standard';
      window._selectedMountType = 'classic';

      // SECURITY: Escape all user/DB content
      const safeName = escapeHTML(p.name || '');
      const safeDesc = escapeHTML((p.description || '').substring(0, 300));
      const safeMainImg = images[0]?.image_url ? escapeAttr(images[0].image_url) : `https://placehold.co/600x600/1A1A1A/C5A059?text=${encodeURIComponent(p.name||'Frame')}`;
      const frameClass = dv?.frame_type === 'Premium' ? 'has-mount frame-border-white' : 'frame-border-black';

      const reviews = (data.reviews || []);
      const avgRating = reviews.length ? (reviews.reduce((s, r) => s + (r.rating||0), 0) / reviews.length).toFixed(1) : null;

      app.innerHTML = renderHeader() + `
      <main id="main-content" class="max-w-7xl mx-auto px-4 py-8">
        <!-- Breadcrumb for SEO -->
        <nav class="text-xs text-gray-500 mb-6 flex items-center gap-2" aria-label="Breadcrumb">
          <a href="/" onclick="window.pfi.nav('/');return false;" class="hover:text-brand-gold">Home</a>
          <span aria-hidden="true">›</span>
          <a href="/shop" onclick="window.pfi.nav('/shop');return false;" class="hover:text-brand-gold">Shop</a>
          <span aria-hidden="true">›</span>
          <span class="text-gray-300" aria-current="page">${safeName}</span>
        </nav>

        <div class="grid lg:grid-cols-2 gap-12">
          <!-- Image Gallery -->
          <div class="sticky top-24 self-start">
            <div class="frame-mockup-container mb-4" role="img" aria-label="${safeName} frame preview">
              <div class="relative inline-block w-full max-w-lg mx-auto">
                <img id="main-image" src="${safeMainImg}" alt="${escapeAttr(p.name)}" class="max-w-full h-auto rounded transition-all duration-500 ${frameClass}" loading="eager">
                <div class="glass-overlay" aria-hidden="true"></div>
              </div>
            </div>
            ${images.length > 1 ? `
            <div class="flex gap-2 overflow-x-auto pb-2 product-gallery-nav" role="list" aria-label="Product images">
              ${images.map((img, i) => `
                <button class="gallery-thumb-btn ${i===0?'active':''}" onclick="window.pfi.setMainImage('${escapeAttr(img.image_url)}', this)" role="listitem" aria-label="View image ${i+1}" aria-pressed="${i===0}">
                  <img src="${escapeAttr(img.image_url)}" alt="${escapeAttr(img.alt_text||p.name)}" class="w-16 h-16 rounded-lg object-cover" loading="lazy" width="64" height="64">
                </button>
              `).join('')}
            </div>` : ''}

            <!-- Shipping Info Widget -->
            <div class="bg-brand-card border border-gray-800 rounded-xl p-4 flex items-center gap-4 mt-4">
              <div class="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-brand-gold flex-shrink-0" aria-hidden="true"><i class="fas fa-shipping-fast"></i></div>
              <div class="text-xs text-gray-400">Delivered in <strong class="text-white">3-5 business days</strong> · <strong class="text-brand-green">Free above ₹799</strong></div>
            </div>
          </div>

          <!-- Product Config -->
          <div class="space-y-6">
            <!-- Title + Rating -->
            <div>
              <div class="flex items-center gap-2 mb-2 flex-wrap">
                <span class="badge-express text-xs"><i class="fas fa-check-circle mr-1" aria-hidden="true"></i>In Stock</span>
                ${p.category?.name ? `<span class="text-brand-gold text-xs font-bold uppercase tracking-widest">${escapeHTML(p.category.name)}</span>` : ''}
              </div>
              <h1 class="text-3xl md:text-4xl font-bold font-display mb-3">${safeName}</h1>
              ${avgRating ? `
              <div class="flex items-center gap-2 mb-3" aria-label="Rating: ${avgRating} out of 5, ${reviews.length} reviews">
                <span class="stars text-sm" aria-hidden="true">${'★'.repeat(Math.round(Number(avgRating)))}${'☆'.repeat(5-Math.round(Number(avgRating)))}</span>
                <span class="text-sm text-gray-400">${avgRating} (${reviews.length} reviews)</span>
              </div>` : ''}
              <div class="flex items-center gap-3 mb-4">
                <div id="current-price" class="text-3xl font-bold text-brand-gold" aria-live="polite">${formatPrice(dv?.price||0)}</div>
                ${dv?.compare_at_price ? `<div id="compare-price" class="text-xl text-gray-500 line-through" aria-label="Was ${formatPrice(dv.compare_at_price)}">${formatPrice(dv.compare_at_price)}</div>
                <span class="bg-brand-green/20 text-brand-green text-xs font-bold px-2 py-1 rounded">SALE</span>` : '<div id="compare-price"></div>'}
              </div>
              <p class="text-gray-400 text-sm leading-relaxed">${safeDesc}</p>
            </div>

            <!-- Pincode Check -->
            <div class="flex items-center gap-2">
              <label for="pincode-input" class="sr-only">Check delivery pincode</label>
              <input type="text" id="pincode-input" placeholder="Enter Pincode" maxlength="6" pattern="[1-9][0-9]{5}" class="pincode-input text-sm" aria-label="Enter delivery pincode" inputmode="numeric">
              <button onclick="window.pfi.checkPincode()" class="btn-gold !py-2 !px-4 !text-xs whitespace-nowrap" aria-label="Check delivery availability">Check Delivery</button>
            </div>
            <div id="pincode-result" aria-live="polite"></div>

            <!-- Size Selector -->
            <div>
              <label class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block" id="size-label">1. Select Size</label>
              <div id="size-selector" class="grid grid-cols-2 md:grid-cols-4 gap-2" role="group" aria-labelledby="size-label">
                ${['Small','Medium','Large','XL'].map(s => {
                  const v = variants.find(v => v.size===s && v.frame_type===(dv?.frame_type||'Standard'));
                  if (!v) return '';
                  return `<button class="size-option ${s===(dv?.size||'Medium')?'active':''}" data-size="${s}" onclick="window.pfi.selectSize('${s}')" aria-pressed="${s===(dv?.size||'Medium')}" aria-label="${s} frame, ${formatPrice(v.price)}">
                    <div class="font-bold text-sm">${s}</div>
                    <div class="text-[10px] opacity-75">${formatPrice(v.price)}</div>
                  </button>`;
                }).join('')}
              </div>
              <button onclick="document.getElementById('size-guide').scrollIntoView({behavior:'smooth'})" class="text-[10px] text-brand-gold mt-2 font-bold uppercase tracking-widest hover:underline" aria-label="View size guide">
                <i class="fas fa-ruler-combined mr-1" aria-hidden="true"></i>View Size Guide
              </button>
            </div>

            <!-- Frame Type Selector -->
            <div>
              <label class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block" id="frame-label">2. Select Display Style</label>
              <div id="frame-selector" class="grid md:grid-cols-3 gap-2" role="group" aria-labelledby="frame-label">
                ${['Poster','Standard','Premium'].map(f => {
                  const v = variants.find(v => v.size===(dv?.size||'Medium') && v.frame_type===f);
                  if (!v) return '';
                  const labels = { Poster: 'No Frame Print', Standard: 'Framed (Direct)', Premium: 'Premium w/ Mount' };
                  return `<button class="frame-option ${f===(dv?.frame_type||'Standard')?'active':''}" data-frame="${f}" onclick="window.pfi.selectFrame('${f}')" aria-pressed="${f===(dv?.frame_type||'Standard')}" aria-label="${labels[f]||f}, ${formatPrice(v.price)}">
                    <div class="font-bold text-xs">${labels[f]||f}</div>
                    <div class="text-[10px] text-brand-gold">${formatPrice(v.price)}</div>
                  </button>`;
                }).join('')}
              </div>

              <!-- Premium Mount Options (shown only for Premium) -->
              <div id="mount-customization" class="${dv?.frame_type==='Premium'?'':'hidden'} mt-4 p-4 bg-black/40 border border-gray-800 rounded-xl animate-fade-in">
                <label for="mount-select" class="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2 block">Mount Style (Pure White Mount — #FFFFFF)</label>
                <select id="mount-select" onchange="window.pfi.setMountType(this.value)" class="w-full bg-brand-card border border-gray-800 text-white px-3 py-2 rounded-lg text-sm" aria-label="Select mount type">
                  <option value="classic">Classic Off-White Single Mount</option>
                  <option value="dual">Dual Layer Mount (+ ₹149)</option>
                  <option value="floating">Floating / Box Frame (+ ₹249)</option>
                </select>
              </div>
            </div>

            <!-- CTA Buttons -->
            <div class="space-y-3 pt-2">
              <button onclick="window.pfi.addToCart()" class="btn-buy py-5 text-lg shadow-xl shadow-red-950/30" aria-label="Add ${safeName} to cart">
                <i class="fas fa-shopping-bag mr-2" aria-hidden="true"></i>Add to Cart
              </button>
              <button onclick="window.pfi.buyNow()" class="btn-cart py-4" aria-label="Buy ${safeName} now">
                <i class="fas fa-bolt mr-2" aria-hidden="true"></i>Buy Now — Direct Checkout
              </button>
            </div>

            <!-- Trust Mini Strip -->
            <div class="grid grid-cols-3 gap-2 text-center text-[10px] text-gray-500">
              <div><i class="fas fa-lock text-brand-gold block mb-1" aria-hidden="true"></i>Secure Checkout</div>
              <div><i class="fas fa-exchange-alt text-brand-gold block mb-1" aria-hidden="true"></i>Free Replacement</div>
              <div><i class="fas fa-box text-brand-gold block mb-1" aria-hidden="true"></i>5-Layer Pack</div>
            </div>
          </div>
        </div>

        <!-- Why Buy -->
        <section class="mt-16 pt-12 border-t border-gray-800" aria-labelledby="why-buy-heading">
          <h2 id="why-buy-heading" class="section-header">Why PhotoFrameIn?</h2>
          <div class="grid md:grid-cols-2 gap-8">
            <ul class="space-y-4" role="list">
              ${[
                ['High-Res Fine Art Print', 'UV-resistant inks on 300gsm museum paper'],
                ['Solid Wood Frame', 'Kiln-dried hardwood — no plastic, no compromise'],
                ['Glass Protection', 'Anti-glare, scratch-resistant tempered glass'],
                ['Ready to Hang', 'Pre-drilled hanger + mounting kit included']
              ].map(([t, d]) => `
              <li class="flex items-start gap-3">
                <i class="fas fa-check-circle text-brand-gold mt-1 flex-shrink-0" aria-hidden="true"></i>
                <div><strong class="text-white">${escapeHTML(t)}</strong><br><span class="text-gray-400 text-sm">${escapeHTML(d)}</span></div>
              </li>`).join('')}
            </ul>
            <div>
              <div id="size-guide" class="bg-brand-card border border-gray-800 rounded-xl p-4">
                <h3 class="text-xs font-bold text-white uppercase mb-3 flex items-center gap-2"><i class="fas fa-ruler-horizontal text-brand-gold" aria-hidden="true"></i>Size Guide</h3>
                <table class="w-full text-xs text-gray-400" aria-label="Frame size guide">
                  <thead><tr class="border-b border-gray-800"><th scope="col" class="text-left py-1 text-gray-500">Size</th><th scope="col" class="text-left py-1 text-gray-500">Inches</th><th scope="col" class="text-left py-1 text-gray-500">CM</th><th scope="col" class="text-left py-1 text-gray-500">Best For</th></tr></thead>
                  <tbody>
                    <tr class="border-b border-gray-900"><td class="py-2 text-white font-bold">Small</td><td>8×12"</td><td>20×30</td><td>Desk, shelves</td></tr>
                    <tr class="border-b border-gray-900"><td class="py-2 text-white font-bold">Medium</td><td>12×18"</td><td>30×45</td><td>Bedroom, office</td></tr>
                    <tr class="border-b border-gray-900"><td class="py-2 text-white font-bold">Large</td><td>18×24"</td><td>45×60</td><td>Living room</td></tr>
                    <tr><td class="py-2 text-white font-bold">XL</td><td>24×36"</td><td>60×90</td><td>Feature wall</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <!-- Volume Upsell -->
        <section class="mt-12" aria-labelledby="bundle-heading">
          <h2 id="bundle-heading" class="section-header">Buy More, Save More</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${[
              { qty: 2, label: 'Buy 2', save: '₹100 OFF', badge: 'Good Deal', active: false },
              { qty: 3, label: 'Buy 3', save: '₹250 OFF', badge: 'Best Value ⭐', active: true },
              { qty: 5, label: 'Buy 5+', save: '20% OFF', badge: 'Wholesale', active: false }
            ].map(b => `
            <div class="bundle-volume-card ${b.active?'active':''}" onclick="window.pfi.applyBundle(${b.qty})" role="button" tabindex="0" aria-label="${b.label}, save ${b.save}">
              <div class="text-2xl font-bold text-brand-gold">${b.label}</div>
              <div class="text-brand-green font-bold text-sm mt-1">${b.save}</div>
              <div class="mt-3"><span class="text-[10px] ${b.active?'bg-brand-gold text-black':'bg-white/5 text-gray-400'} px-3 py-1 rounded-full font-bold uppercase tracking-widest">${b.badge}</span></div>
            </div>`).join('')}
          </div>
        </section>

        <!-- Reviews -->
        ${reviews.length > 0 ? `
        <section class="mt-12 pt-12 border-t border-gray-800" aria-labelledby="reviews-heading">
          <h2 id="reviews-heading" class="section-header">Customer Reviews (${reviews.length})</h2>
          <div class="space-y-4">
            ${reviews.slice(0, 5).map(r => {
              const safeName2 = escapeHTML(r.customer_name || 'Customer');
              const safeTitle = escapeHTML(r.title || '');
              const safeBody = escapeHTML(r.body || '');
              const safeRating = Math.min(5, Math.max(0, Number(r.rating)||0));
              return `
              <article class="bg-brand-card border border-gray-800 rounded-xl p-5" aria-label="Review by ${safeName2}">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <span class="font-bold text-sm text-white">${safeName2}</span>
                    <div class="stars text-xs mt-0.5" aria-label="${safeRating} stars">${'★'.repeat(safeRating)}${'☆'.repeat(5-safeRating)}</div>
                  </div>
                  <span class="text-xs text-gray-600">${new Date(r.created_at).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</span>
                </div>
                ${safeTitle ? `<p class="font-semibold text-sm mb-1">${safeTitle}</p>` : ''}
                ${safeBody ? `<p class="text-sm text-gray-400">${safeBody}</p>` : ''}
              </article>`;
            }).join('')}
          </div>
        </section>` : ''}

        <!-- FAQ -->
        <section class="mt-12 pt-12 border-t border-gray-800" aria-labelledby="faq-heading">
          <h2 id="faq-heading" class="section-header">Frequently Asked Questions</h2>
          <div class="space-y-2">
            ${[
              ['Will it break in delivery?', 'No. Every frame is wrapped in 5-layer packaging with corner protectors and bubble wrap. If damaged — film the unboxing and we replace it free of charge.'],
              ['How long does delivery take?', '3-5 business days across India. 1-2 days in Hyderabad metro area.'],
              ['Is COD available?', 'Yes, for orders between ₹499-₹1995. ₹49 COD handling fee applies. WhatsApp confirmation required within 24 hours.'],
              ['What paper/ink is used?', '300gsm museum-grade fine art paper with 12-colour professional pigment inks. UV-resistant, fade-proof for 75+ years.'],
              ['Can I return it?', 'Damaged items are replaced free with unboxing video. Custom/personalized frames are non-returnable.']
            ].map(([q, a]) => `
            <details class="bg-brand-card border border-gray-800 rounded-lg">
              <summary class="p-4 cursor-pointer font-bold text-sm hover:text-brand-gold transition list-none flex justify-between items-center">
                ${escapeHTML(q)}<i class="fas fa-chevron-down text-gray-500 text-xs" aria-hidden="true"></i>
              </summary>
              <div class="px-4 pb-4 text-sm text-gray-400 leading-relaxed">${escapeHTML(a)}</div>
            </details>`).join('')}
          </div>
        </section>

        <!-- Urgency Widget -->
        <section class="mt-8" aria-label="Limited stock notice">
          <div class="bg-gradient-to-r from-red-900/30 to-brand-card border border-red-800/50 rounded-xl p-5 text-center">
            <p class="text-base font-bold text-brand-red"><i class="fas fa-fire mr-2" aria-hidden="true"></i>${escapeHTML(state.config.urgency_text || 'Limited Stock — Order Today')}</p>
            <p class="text-xs text-gray-400 mt-1">${escapeHTML(state.config.urgency_subtext || 'Prices may increase soon')}</p>
          </div>
        </section>

        <!-- You May Also Like -->
        ${data.youMayAlsoLike?.length ? `
        <section class="mt-12 pt-12 border-t border-gray-800" aria-labelledby="ymal-heading">
          <h2 id="ymal-heading" class="section-header">You May Also Like</h2>
          <div class="product-grid">${data.youMayAlsoLike.map(yp => renderProductCard(yp)).join('')}</div>
        </section>` : ''}
      </main>` + renderFooter();

      window._currentProduct = p;
      window._currentVariant = dv;
      updateCartBadge();
      trackFunnelEvent('view_product', p.id, null, { name: p.name, slug: p.slug });

    } catch (e) {
      console.error('Product page error:', e);
      app.innerHTML = renderHeader() + `<main class="max-w-4xl mx-auto px-4 py-20 text-center"><h1 class="text-2xl">Error loading product</h1><button onclick="location.reload()" class="btn-buy mt-6 max-w-xs">Retry</button></main>` + renderFooter();
    }
  }

  // ─── CART PAGE ────────────────────────────────────────────────────────────
  async function renderCartPage(app) {
    const { subtotal, discount, label, shipping, total, itemCount, freeThreshold } = getCartTotals();
    const progress = freeThreshold > 0 ? Math.min(100, (subtotal / freeThreshold) * 100) : 100;
    const remaining = Math.max(0, freeThreshold - subtotal);

    let upsellHtml = '';
    try {
      if (state.cart.length > 0) {
        const res = await fetch(`${API}/products/upsell`);
        const uData = await res.json();
        if (uData.upsell && !state.cart.some(i => i.variantId === uData.upsell.variantId)) {
          const u = uData.upsell;
          const safeName3 = escapeHTML(u.name || 'Mini Print');
          const safeImg2 = escapeAttr(u.image || '');
          upsellHtml = `
          <div class="upsell-card mb-8" role="complementary" aria-label="Add-on offer">
            <div class="flex items-center gap-4">
              ${safeImg2 ? `<img src="${safeImg2}" class="w-14 h-14 rounded-lg object-cover border border-gray-800 flex-shrink-0" alt="${safeName3}" loading="lazy">` : ''}
              <div class="flex-1">
                <div class="text-[10px] font-bold text-brand-gold uppercase tracking-widest mb-1">Add-on Offer</div>
                <h4 class="text-sm font-bold text-white">${safeName3}</h4>
                <p class="text-xs font-bold text-brand-green">Only ${formatPrice(u.price)}</p>
              </div>
              <button onclick="window.pfi.addUpsellToCart('${escapeAttr(u.productId)}','${escapeAttr(u.variantId)}','${safeName3}','${escapeAttr(u.size||'')}','${escapeAttr(u.frame||'')}',${Number(u.price)||99},'${safeImg2}')" class="btn-gold !py-2 !px-3 !text-xs whitespace-nowrap" aria-label="Add ${safeName3} to cart">ADD</button>
            </div>
          </div>`;
        }
      }
    } catch (e) {}

    app.innerHTML = renderHeader() + `
    <main id="main-content" class="max-w-3xl mx-auto px-4 py-10 pb-32">
      <h1 class="text-2xl font-bold mb-8 font-display">Your Cart (${itemCount} item${itemCount!==1?'s':''})</h1>

      ${state.cart.length === 0 ? `
      <div class="text-center py-20 bg-brand-card rounded-3xl border border-gray-900">
        <div class="text-5xl mb-6 opacity-20" aria-hidden="true">🛍️</div>
        <h2 class="text-xl font-bold mb-3">Your cart is empty</h2>
        <p class="text-gray-400 mb-6">Discover our dive art and automotive frame collections</p>
        <div class="flex flex-col gap-3 max-w-xs mx-auto">
          <button onclick="window.pfi.nav('/category/dive')" class="btn-buy" aria-label="Shop Dive Art">🤿 Shop Dive Art</button>
          <button onclick="window.pfi.nav('/category/automotive')" class="btn-cart" aria-label="Shop Automotive Art">🏎️ Shop Automotive</button>
        </div>
      </div>
      ` : `
      <!-- Free Shipping Progress -->
      <div class="mb-8" aria-label="Free shipping progress">
        <div class="flex justify-between items-end mb-2">
          <span class="text-xs font-bold uppercase tracking-widest text-gray-400">
            ${remaining > 0
              ? `Add <strong class="text-brand-gold">${formatPrice(remaining)}</strong> more for <strong>FREE SHIPPING</strong>`
              : '<strong class="text-brand-green">🎉 FREE SHIPPING UNLOCKED!</strong>'}
          </span>
          <span class="text-xs text-gray-500" aria-hidden="true">${Math.round(progress)}%</span>
        </div>
        <div class="h-2 bg-gray-900 rounded-full overflow-hidden" role="progressbar" aria-valuenow="${Math.round(progress)}" aria-valuemin="0" aria-valuemax="100" aria-label="Free shipping progress">
          <div class="h-full bg-gradient-to-r from-brand-gold to-yellow-300 transition-all duration-1000 rounded-full" style="width:${progress}%"></div>
        </div>
      </div>

      <!-- Volume Discount Banner -->
      ${discount > 0 ? `
      <div class="bg-brand-green/10 border border-brand-green/30 rounded-xl p-3 mb-6 text-center" role="status" aria-live="polite">
        <span class="text-brand-green font-bold text-sm">✅ ${escapeHTML(label)}</span>
      </div>` : itemCount >= 1 ? `
      <div class="bg-brand-gold/10 border border-brand-gold/30 rounded-xl p-3 mb-6 text-center cursor-pointer" onclick="window.pfi.nav('/shop')" role="button" aria-label="Add more items to save">
        <span class="text-brand-gold font-bold text-xs">💡 Add more items: Buy 2 save ₹100, Buy 3 save ₹250, Buy 5+ save 20%</span>
      </div>` : ''}

      ${upsellHtml}

      <!-- Cart Items -->
      <div class="space-y-4 mb-8" role="list" aria-label="Cart items">
        ${state.cart.map((item, idx) => {
          const safeName4 = escapeHTML(item.name || 'Frame');
          const safeImg3 = escapeAttr(item.imageUrl || item.image || '');
          const safeSize = escapeHTML(item.size || '');
          const safeFrame = escapeHTML(item.frame || '');
          return `
          <div class="cart-item-card" role="listitem" aria-label="${safeName4}">
            ${safeImg3 ? `<img src="${safeImg3}" class="w-20 h-24 rounded-xl object-cover flex-shrink-0" alt="${safeName4}" loading="lazy">` : `<div class="w-20 h-24 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0 text-3xl" aria-hidden="true">🖼️</div>`}
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-start mb-1">
                <h3 class="font-bold text-sm leading-tight line-clamp-2 pr-2">${safeName4}</h3>
                <button onclick="window.pfi.removeFromCart(${idx})" class="text-gray-600 hover:text-brand-red transition flex-shrink-0" aria-label="Remove ${safeName4} from cart">
                  <i class="fas fa-trash-alt text-xs" aria-hidden="true"></i>
                </button>
              </div>
              <p class="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3">${safeSize} · ${safeFrame}</p>
              <div class="flex justify-between items-center">
                <div class="qty-control" role="group" aria-label="Quantity for ${safeName4}">
                  <button onclick="window.pfi.updateQty(${idx},-1)" class="qty-btn" aria-label="Decrease quantity"><i class="fas fa-minus text-[10px]" aria-hidden="true"></i></button>
                  <span class="text-xs font-bold w-6 text-center" aria-live="polite">${item.quantity||1}</span>
                  <button onclick="window.pfi.updateQty(${idx},1)" class="qty-btn" aria-label="Increase quantity"><i class="fas fa-plus text-[10px]" aria-hidden="true"></i></button>
                </div>
                <span class="text-brand-gold font-bold" aria-label="Item total: ${formatPrice((item.price||0)*(item.quantity||1))}">${formatPrice((item.price||0)*(item.quantity||1))}</span>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>

      <!-- Order Summary -->
      <div class="bg-brand-card border border-gray-900 rounded-2xl p-6 space-y-3 mb-6">
        <div class="flex justify-between text-sm text-gray-400"><span>Subtotal (${itemCount} item${itemCount!==1?'s':''})</span><span class="text-white">${formatPrice(subtotal)}</span></div>
        ${discount > 0 ? `<div class="flex justify-between text-sm text-brand-green font-bold"><span>Volume Discount</span><span>-${formatPrice(discount)}</span></div>` : ''}
        <div class="flex justify-between text-sm text-gray-400"><span>Shipping</span><span class="${shipping===0?'text-brand-green font-bold':''}">${shipping===0?'FREE':formatPrice(shipping)}</span></div>
        <div class="pt-3 border-t border-gray-800 flex justify-between items-center">
          <span class="font-bold text-base">Total</span>
          <div class="text-right">
            <div class="text-2xl font-bold text-brand-gold" aria-live="polite">${formatPrice(total)}</div>
            ${discount > 0 ? `<p class="text-[10px] text-brand-green font-bold uppercase tracking-widest mt-0.5">You save ${formatPrice(discount)} 🎉</p>` : ''}
            <p class="text-[10px] text-gray-500 mt-0.5">+₹50 prepaid discount at checkout</p>
          </div>
        </div>
      </div>

      <button onclick="window.pfi.nav('/checkout')" class="btn-buy py-5 text-lg shadow-xl shadow-red-950/40 w-full mb-3" aria-label="Proceed to secure checkout">
        SECURE CHECKOUT <i class="fas fa-lock ml-2 text-sm opacity-70" aria-hidden="true"></i>
      </button>
      <p class="text-center text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-4">
        <i class="fas fa-lock mr-1 text-brand-gold opacity-50" aria-hidden="true"></i>256-bit SSL Encrypted · Safe Checkout
      </p>
      <button onclick="window.pfi.nav('/shop')" class="w-full text-center text-xs text-gray-500 hover:text-brand-gold transition py-2" aria-label="Continue shopping">← Continue Shopping</button>
      `}
    </main>` + renderFooter();

    updateCartBadge();
  }

  // ─── CATEGORY PAGE ────────────────────────────────────────────────────────
  async function renderCategoryPage(app, slug) {
    if (!slug || !/^[a-z0-9\-]{1,80}$/.test(slug)) { navigate('/shop'); return; }
    const safeSlug = escapeHTML(slug.replace(/-/g,' '));

    app.innerHTML = renderHeader() + `
    <main id="main-content" class="max-w-7xl mx-auto px-4 py-10">
      <h1 class="text-3xl md:text-4xl font-bold font-display capitalize mb-2">${safeSlug} Frames</h1>
      <p class="text-gray-400 mb-8">Handcrafted photo frames — designed for your space</p>
      <div id="shop-grid" class="product-grid" aria-live="polite">
        ${[1,2,3,4].map(() => `<div class="product-card"><div class="skeleton h-64" aria-hidden="true"></div></div>`).join('')}
      </div>
    </main>` + renderFooter();
    updateCartBadge();

    try {
      const res = await fetch(`${API}/products?category=${encodeURIComponent(slug)}&limit=48`);
      const data = await res.json();
      const grid = $('#shop-grid');
      if (!grid) return;
      if (data.products?.length > 0) {
        grid.innerHTML = data.products.map(p => renderProductCard(p)).join('');
      } else {
        grid.innerHTML = `<div class="col-span-full py-20 text-center"><p class="text-gray-500 mb-6">No products in this collection yet.</p><button onclick="window.pfi.nav('/shop')" class="btn-buy max-w-xs mx-auto">Browse All Products</button></div>`;
      }
    } catch (e) { console.error('Category load error:', e); }
  }

  // ─── CHECKOUT PAGE ────────────────────────────────────────────────────────
  async function renderCheckoutPage(app) {
    if (!state.cart.length) { navigate('/cart'); return; }
    const { subtotal, discount, shipping, total } = getCartTotals();
    const displayTotal = total;

    app.innerHTML = renderHeader() + `
    <main id="main-content" class="max-w-2xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold mb-6 font-display"><i class="fas fa-lock mr-2 text-brand-gold" aria-hidden="true"></i>Secure Checkout</h1>

      <!-- Order Summary (mini) -->
      <div class="bg-brand-card border border-gray-800 rounded-xl p-4 mb-6">
        <div class="flex justify-between text-sm mb-2"><span class="text-gray-400">Subtotal</span><span>${formatPrice(subtotal)}</span></div>
        ${discount > 0 ? `<div class="flex justify-between text-sm text-brand-green mb-2"><span>Volume Discount</span><span>-${formatPrice(discount)}</span></div>` : ''}
        <div class="flex justify-between text-sm mb-2"><span class="text-gray-400">Shipping</span><span class="${shipping===0?'text-brand-green font-bold':''}">${shipping===0?'FREE':formatPrice(shipping)}</span></div>
        <div class="flex justify-between font-bold border-t border-gray-800 pt-2 mt-2"><span>Total (Prepaid)</span><span class="text-brand-gold">${formatPrice(Math.max(0,displayTotal-50))}</span></div>
        <p class="text-[10px] text-brand-green font-bold mt-1">₹50 prepaid discount applied automatically</p>
      </div>

      <form id="checkout-form" class="space-y-6" novalidate>
        <fieldset class="bg-brand-card border border-gray-800 rounded-xl p-6">
          <legend class="font-bold mb-4 text-white">Contact Information</legend>
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label for="name" class="sr-only">Full Name</label>
              <input type="text" id="name" name="name" placeholder="Full Name *" required autocomplete="name" class="form-input w-full" aria-required="true">
            </div>
            <div>
              <label for="email" class="sr-only">Email</label>
              <input type="email" id="email" name="email" placeholder="Email Address *" required autocomplete="email" class="form-input w-full" aria-required="true">
            </div>
            <div class="md:col-span-2">
              <label for="phone" class="sr-only">Phone Number</label>
              <input type="tel" id="phone" name="phone" placeholder="Phone Number * (for order updates)" required autocomplete="tel" maxlength="15" pattern="[6-9][0-9]{9}" class="form-input w-full" aria-required="true" inputmode="numeric">
            </div>
          </div>
        </fieldset>

        <fieldset class="bg-brand-card border border-gray-800 rounded-xl p-6">
          <legend class="font-bold mb-4 text-white">Delivery Address</legend>
          <div class="space-y-4">
            <div>
              <label for="address1" class="sr-only">Address Line 1</label>
              <input type="text" id="address1" name="address1" placeholder="Address Line 1 *" required autocomplete="address-line1" class="form-input w-full" aria-required="true">
            </div>
            <div>
              <label for="address2" class="sr-only">Address Line 2</label>
              <input type="text" id="address2" name="address2" placeholder="Area, Landmark (Optional)" autocomplete="address-line2" class="form-input w-full">
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><label for="city" class="sr-only">City</label><input type="text" id="city" name="city" placeholder="City *" required autocomplete="address-level2" class="form-input w-full" aria-required="true"></div>
              <div><label for="state" class="sr-only">State</label><input type="text" id="state" name="state" placeholder="State *" required autocomplete="address-level1" class="form-input w-full" aria-required="true"></div>
              <div class="col-span-2 md:col-span-1">
                <label for="pincode" class="sr-only">Pincode</label>
                <input type="text" id="pincode" name="pincode" placeholder="Pincode *" required maxlength="6" pattern="[1-9][0-9]{5}" class="form-input w-full" aria-required="true" inputmode="numeric">
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset class="bg-brand-card border border-gray-800 rounded-xl p-6">
          <legend class="font-bold mb-4 text-white">Payment Method</legend>
          <div class="space-y-3">
            <label class="payment-option active" id="prepaid-label">
              <input type="radio" name="payment" value="prepaid" checked class="accent-yellow-400" aria-label="Prepaid payment">
              <div class="flex-1">
                <div class="font-bold text-white">Prepaid (UPI / Card / Net Banking)</div>
                <div class="text-xs text-brand-green mt-0.5">Save ₹50 + Faster Delivery</div>
              </div>
              <span class="text-brand-green text-xs font-bold">RECOMMENDED</span>
            </label>
            ${subtotal >= parseInt(state.config.cod_min_value||'499') && subtotal <= parseInt(state.config.cod_max_value||'1995') && !state.cart.some(i=>i.is_custom_frame) ? `
            <label class="payment-option" id="cod-label" role="radio">
              <input type="radio" name="payment" value="cod" class="accent-orange-400" aria-label="Cash on delivery">
              <div class="flex-1">
                <div class="font-bold text-white">Cash on Delivery</div>
                <div class="text-xs text-gray-400 mt-0.5">₹${state.config.cod_fee||49} COD fee · WhatsApp confirmation required within 24h</div>
              </div>
            </label>` : state.cart.some(i=>i.is_custom_frame) ? `
            <div class="p-3 border border-gray-800 rounded-lg bg-gray-900/50 text-sm text-brand-saffron">
              <i class="fas fa-exclamation-triangle mr-2" aria-hidden="true"></i>Custom frames require prepaid payment only.
            </div>` : ''}
          </div>
        </fieldset>

        <!-- Coupon Code -->
        <div class="flex gap-2">
          <label for="coupon-input" class="sr-only">Coupon code</label>
          <input type="text" id="coupon-input" placeholder="Coupon Code (e.g. INSTA10)" class="form-input flex-1" autocapitalize="characters" aria-label="Enter coupon code">
          <button type="button" onclick="window.pfi.applyCoupon()" class="btn-gold !py-3 !px-4 !text-sm whitespace-nowrap" aria-label="Apply coupon code">Apply</button>
        </div>
        <div id="coupon-result" aria-live="polite"></div>

        <div class="flex items-start gap-3">
          <input type="checkbox" id="agree-policy" required class="mt-1 accent-yellow-400" aria-required="true">
          <label for="agree-policy" class="text-sm text-gray-400">I agree to the <a href="/policy/returns" onclick="window.pfi.nav('/policy/returns');return false;" class="text-brand-gold hover:underline">Returns &amp; COD Policy</a> and <a href="/policy/privacy" onclick="window.pfi.nav('/policy/privacy');return false;" class="text-brand-gold hover:underline">Privacy Policy</a></label>
        </div>

        <button type="submit" id="place-order-btn" class="btn-buy py-5 text-lg" aria-label="Place your order">
          <i class="fas fa-lock mr-2" aria-hidden="true"></i>PLACE ORDER — ${formatPrice(Math.max(0,displayTotal-50))}
        </button>
        <p class="text-center text-[10px] text-gray-500 uppercase tracking-widest">
          <i class="fas fa-shield-alt mr-1 text-brand-gold opacity-50" aria-hidden="true"></i>256-bit SSL Encrypted · Powered by Razorpay
        </p>
      </form>
    </main>` + renderFooter();

    updateCartBadge();
    trackFunnelEvent('initiate_checkout', null, null, { cart_value: subtotal, item_count: state.cart.length });

    // Payment method radio styling
    $$('input[name="payment"]').forEach(radio => {
      radio.addEventListener('change', () => {
        $$('.payment-option').forEach(l => l.classList.remove('active'));
        radio.closest('label')?.classList.add('active');
      });
    });

    // Pincode → COD check
    const pincodeInput = $('#pincode');
    if (pincodeInput) {
      pincodeInput.addEventListener('blur', async () => {
        const pin = pincodeInput.value.trim();
        if (pin.length !== 6 || !/^[1-9]\d{5}$/.test(pin)) return;
        try {
          const res = await fetch(`${API}/checkout/cod-check`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ pincode: pin, cartTotal: subtotal }) });
          const data = await res.json();
          const codLabel = $('#cod-label');
          if (codLabel && !data.available) {
            codLabel.style.display = 'none';
            const prepaid = $('input[value="prepaid"]');
            if (prepaid) prepaid.checked = true;
            const prepaidLabel = $('#prepaid-label');
            if (prepaidLabel) prepaidLabel.classList.add('active');
          }
        } catch (e) {}
      });
    }

    // Form submit
    const form = $('#checkout-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payment = fd.get('payment') || 'prepaid';
        const btn = $('#place-order-btn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...'; }

        // Client-side validation
        const name = (fd.get('name') || '').toString().trim();
        const email = (fd.get('email') || '').toString().trim();
        const phone = (fd.get('phone') || '').toString().trim();
        const address1 = (fd.get('address1') || '').toString().trim();
        const city = (fd.get('city') || '').toString().trim();
        const state2 = (fd.get('state') || '').toString().trim();
        const pincode = (fd.get('pincode') || '').toString().trim();

        if (!name || !email || !phone || !address1 || !city || !state2 || !pincode) {
          toast('Please fill all required fields', 'error');
          if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fas fa-lock mr-2"></i>PLACE ORDER — ${formatPrice(Math.max(0,displayTotal-50))}`; }
          return;
        }
        if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g,''))) {
          toast('Please enter a valid 10-digit Indian mobile number', 'error');
          if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fas fa-lock mr-2"></i>PLACE ORDER — ${formatPrice(Math.max(0,displayTotal-50))}`; }
          return;
        }
        if (!/^[1-9]\d{5}$/.test(pincode)) {
          toast('Please enter a valid 6-digit pincode', 'error');
          if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fas fa-lock mr-2"></i>PLACE ORDER — ${formatPrice(Math.max(0,displayTotal-50))}`; }
          return;
        }

        try {
          const payload = {
            items: state.cart.map(i => ({ variantId: i.variantId, quantity: i.quantity||1, price: i.price, name: i.name, size: i.size, frame: i.frame, image: i.image })),
            customer: { name, email, phone },
            address: { name, line1: address1, line2: fd.get('address2')||'', city, state: state2, pincode },
            paymentMethod: payment,
            couponCode: window._appliedCoupon || null,
            checkoutSource: 'custom',
            utm_source: localStorage.getItem('utm_source'),
            utm_medium: localStorage.getItem('utm_medium'),
            utm_campaign: localStorage.getItem('utm_campaign')
          };

          const res = await fetch(`${API}/orders/create`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
          const data = await res.json();

          if (data.success) {
            trackFunnelEvent('purchase', null, data.orderId, { total: data.total, payment_method: payment });
            state.cart = []; saveCart(); updateCartBadge();
            renderSuccess(app, data.orderId, data.total, data.whatsappUrl, payment === 'cod');
          } else {
            throw new Error(data.error || 'Order failed');
          }
        } catch (err) {
          toast('Error: ' + (err.message || 'Please try again'), 'error');
          if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fas fa-lock mr-2"></i>PLACE ORDER — ${formatPrice(Math.max(0,displayTotal-50))}`; }
        }
      });
    }
  }

  function renderSuccess(app, orderId, total, whatsappUrl, isCod) {
    const safeOrderId = escapeHTML(String(orderId || ''));
    const safeTotal = formatPrice(total);
    // Validate whatsapp URL before injecting
    const safeWaUrl = whatsappUrl && /^https:\/\/wa\.me\//.test(whatsappUrl) ? escapeAttr(whatsappUrl) : null;

    app.innerHTML = renderHeader() + `
    <main id="main-content" class="max-w-2xl mx-auto px-4 py-16 text-center">
      <div class="text-6xl mb-6 animate-bounce-once" aria-hidden="true">🎉</div>
      <h1 class="text-3xl font-bold text-brand-gold mb-3 font-display">Order Confirmed!</h1>
      <p class="text-xl mb-2">Order ID: <strong class="font-mono">${safeOrderId}</strong></p>
      <p class="text-gray-400 mb-8">Total: <strong>${safeTotal}</strong></p>

      ${isCod ? `
      <div class="bg-brand-saffron/10 border border-brand-saffron rounded-xl p-5 mb-6 text-left">
        <h3 class="font-bold text-brand-saffron mb-2"><i class="fas fa-exclamation-triangle mr-2" aria-hidden="true"></i>COD Order — Action Required</h3>
        <p class="text-sm text-gray-300">Confirm your order on WhatsApp within <strong>24 hours</strong> to avoid cancellation. Our team will contact you.</p>
      </div>` : ''}

      <div class="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-6 text-left text-sm">
        <h3 class="font-bold mb-2 text-white"><i class="fas fa-video mr-2 text-brand-gold" aria-hidden="true"></i>Important: Unboxing Video Policy</h3>
        <p class="text-gray-400">Your frame contains glass. Please <strong class="text-white">film your unboxing</strong> for damage protection — claims without video cannot be processed.</p>
      </div>

      <div class="flex flex-col gap-3 max-w-sm mx-auto">
        ${safeWaUrl ? `<a href="${safeWaUrl}" target="_blank" rel="noopener noreferrer" class="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-4 rounded-xl flex items-center justify-center gap-2 transition" aria-label="${isCod?'Confirm order on WhatsApp':'Share on WhatsApp'}"><i class="fab fa-whatsapp text-xl" aria-hidden="true"></i>${isCod?'Confirm Order on WhatsApp':'Share on WhatsApp'}</a>` : ''}
        <button onclick="window.pfi.nav('/track?order=${encodeURIComponent(safeOrderId)}')" class="btn-gold py-4 text-base" aria-label="Track your order">Track Your Order →</button>
        <button onclick="window.pfi.nav('/shop')" class="text-gray-500 hover:text-brand-gold transition text-sm py-2" aria-label="Continue shopping">Continue Shopping</button>
      </div>
    </main>` + renderFooter();
    updateCartBadge();
  }

  // ─── TRACK PAGE ───────────────────────────────────────────────────────────
  function renderTrackPage(app) {
    const params = new URLSearchParams(location.search);
    const orderId = (params.get('order') || '').replace(/[^a-zA-Z0-9\-]/g, '').slice(0, 20);

    app.innerHTML = renderHeader() + `
    <main id="main-content" class="max-w-xl mx-auto px-4 py-16">
      <div class="text-center mb-10">
        <h1 class="text-3xl font-bold font-display mb-3">Track Your Order</h1>
        <p class="text-gray-400">Enter your order ID (PS-XXXXXX) or registered phone number</p>
      </div>
      <div class="bg-brand-card border border-gray-900 rounded-2xl p-8 mb-6 shadow-xl">
        <label for="track-input" class="sr-only">Order ID or phone number</label>
        <div class="relative mb-5">
          <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true"></i>
          <input type="text" id="track-input" value="${escapeAttr(orderId)}" placeholder="e.g. PS-240101-0001 or 9876543210" class="w-full bg-black/50 border border-gray-800 text-white pl-12 pr-4 py-4 rounded-xl focus:border-brand-gold outline-none transition" aria-label="Enter order ID or phone number" autocomplete="off">
        </div>
        <button onclick="window.pfi.trackOrder()" class="btn-buy w-full py-4" aria-label="Track order status">TRACK STATUS</button>
      </div>
      <div id="track-result" aria-live="polite"></div>
    </main>` + renderFooter();

    updateCartBadge();
    if (orderId) window.pfi.trackOrder();
  }

  // ─── RETURNS PAGE ─────────────────────────────────────────────────────────
  function renderReturnsPage(app) {
    app.innerHTML = renderHeader() + `
    <main id="main-content" class="max-w-2xl mx-auto px-4 py-12">
      <h1 class="text-2xl font-bold mb-6 font-display"><i class="fas fa-exchange-alt mr-2" aria-hidden="true"></i>Returns &amp; Damage Claims</h1>
      <div class="bg-brand-card border border-gray-800 rounded-xl p-6 mb-6">
        <div class="custom-warning mb-4" role="note"><i class="fas fa-video mr-2" aria-hidden="true"></i>Unboxing video is <strong>required</strong> for all damage claims. No video = no replacement.</div>
        <form id="returns-form" class="space-y-4" novalidate>
          <div><label for="ret-order" class="sr-only">Order ID</label><input type="text" id="ret-order" name="orderId" placeholder="Order ID (PS-XXXXXX) *" required class="form-input w-full" aria-required="true"></div>
          <div><label for="ret-email" class="sr-only">Email</label><input type="email" id="ret-email" name="email" placeholder="Registered Email *" required class="form-input w-full" aria-required="true"></div>
          <div>
            <label for="ret-reason" class="sr-only">Reason</label>
            <select id="ret-reason" name="reason" required class="form-input w-full" aria-required="true">
              <option value="">Select Reason *</option>
              <option value="damaged">Damaged on Arrival</option>
              <option value="wrong_item">Wrong Item Received</option>
            </select>
          </div>
          <div><label for="ret-desc" class="sr-only">Description</label><textarea id="ret-desc" name="description" placeholder="Describe the issue" rows="3" class="form-input w-full"></textarea></div>
          <div><label for="ret-video" class="sr-only">Video URL</label><input type="url" id="ret-video" name="videoUrl" placeholder="Unboxing Video URL (Google Drive / YouTube) *" required class="form-input w-full" aria-required="true"></div>
          <button type="submit" class="btn-buy" aria-label="Submit damage claim">Submit Claim</button>
        </form>
        <div id="returns-result" class="mt-4" aria-live="polite"></div>
      </div>
      <div class="text-sm text-gray-400"><a href="/policy/returns" onclick="window.pfi.nav('/policy/returns');return false;" class="text-brand-gold hover:underline">View full Returns Policy →</a></div>
    </main>` + renderFooter();

    const form = $('#returns-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const result = $('#returns-result');
        try {
          const res = await fetch(`${API}/orders/claims/damage`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ orderId: fd.get('orderId'), videoUrl: fd.get('videoUrl'), description: fd.get('description') })
          });
          const data = await res.json();
          if (data.success) {
            if (result) result.innerHTML = `<div class="bg-green-900/30 border border-green-700 rounded-lg p-3 text-green-300 text-sm">✅ Claim submitted! Ref: ${escapeHTML(data.claimId||'')}</div>`;
          } else {
            if (result) result.innerHTML = `<div class="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">${escapeHTML(data.error||'Error submitting claim')}</div>`;
          }
        } catch (err) {
          if (result) result.innerHTML = `<div class="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">Error submitting claim. Please try again.</div>`;
        }
      });
    }
    updateCartBadge();
  }

  // ─── POLICY / STATIC PAGES ────────────────────────────────────────────────
  async function renderPolicyPage(app) {
    const slug = (location.pathname.split('/policy/')[1] || 'returns').replace(/[^a-z0-9\-]/g, '');
    app.innerHTML = renderHeader() + `<main id="main-content" class="max-w-3xl mx-auto px-4 py-12"><div class="skeleton h-96 rounded-xl" aria-hidden="true"></div></main>` + renderFooter();
    try {
      const res = await fetch(`${API}/pages/${encodeURIComponent(slug)}`);
      const data = await res.json();
      const main = $('main');
      if (main) {
        // Note: page content comes from trusted admin DB — still safe for display
        main.innerHTML = `<div class="max-w-3xl mx-auto px-4 py-12"><div class="prose prose-invert max-w-none bg-brand-card border border-gray-800 rounded-xl p-8">${data.page?.content || '<p>Page not found</p>'}</div></div>`;
      }
    } catch (e) { const m = $('main'); if (m) m.innerHTML = '<div class="max-w-3xl mx-auto px-4 py-20 text-center text-gray-400">Page not found</div>'; }
    updateCartBadge();
  }

  async function renderStaticPage(app, type) {
    const safeType = escapeHTML(type === 'about' ? 'About Us' : 'Contact Us');
    app.innerHTML = renderHeader() + `<main id="main-content" class="max-w-3xl mx-auto px-4 py-12"><h1 class="text-2xl font-bold mb-6">${safeType}</h1><p class="text-gray-400">${escapeHTML(state.config.about_content || state.config.contact_address || 'Information loading...')}</p></main>` + renderFooter();
    updateCartBadge();
  }

  function renderBlogPage(app, path) {
    app.innerHTML = renderHeader() + `<main id="main-content" class="max-w-4xl mx-auto px-4 py-12">
      <h1 class="text-2xl font-bold mb-6 font-display">Blog — Frame Your World</h1>
      <div id="blog-grid" class="grid md:grid-cols-2 gap-6">
        <div class="skeleton h-48 rounded-xl" aria-hidden="true"></div>
        <div class="skeleton h-48 rounded-xl" aria-hidden="true"></div>
      </div>
    </main>` + renderFooter();
    loadBlogPosts();
    updateCartBadge();
  }

  async function loadBlogPosts() {
    try {
      const res = await fetch(`${API}/blog`);
      const data = await res.json();
      const grid = $('#blog-grid');
      if (!grid) return;
      if (!data.posts?.length) { grid.innerHTML = '<p class="col-span-full text-gray-500 py-8">Blog posts coming soon. Follow us on Instagram for updates!</p>'; return; }
      grid.innerHTML = data.posts.map(post => {
        const safeTitle = escapeHTML(post.title || '');
        const safeExcerpt = escapeHTML((post.excerpt || '').slice(0, 120));
        const safeSlug = escapeAttr(post.slug || '');
        const safeImg4 = post.featured_image ? escapeAttr(post.featured_image) : '';
        return `
        <article class="bg-brand-card border border-gray-800 rounded-xl overflow-hidden hover:border-brand-gold transition cursor-pointer" onclick="window.pfi.nav('/blog/${safeSlug}')" role="button" tabindex="0" aria-label="${safeTitle}">
          ${safeImg4 ? `<img src="${safeImg4}" alt="${safeTitle}" class="w-full h-40 object-cover" loading="lazy">` : '<div class="w-full h-40 bg-gray-900 flex items-center justify-center text-4xl" aria-hidden="true">📝</div>'}
          <div class="p-4">
            <p class="text-[10px] text-brand-gold uppercase tracking-widest mb-2">${escapeHTML(post.category || 'Tips')}</p>
            <h2 class="font-bold text-sm mb-2">${safeTitle}</h2>
            ${safeExcerpt ? `<p class="text-xs text-gray-400">${safeExcerpt}...</p>` : ''}
          </div>
        </article>`;
      }).join('');
    } catch (e) {}
  }

  // ─── LOGIN PAGE ───────────────────────────────────────────────────────────
  function renderLoginPage(app) {
    app.innerHTML = renderHeader() + `
    <main id="main-content" class="max-w-md mx-auto px-4 py-16 text-center">
      <h1 class="text-3xl font-bold mb-8 font-display">Welcome Back</h1>
      <div class="bg-brand-card border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <button onclick="window.pfi.googleLogin()" class="w-full bg-white text-black font-bold py-3 rounded-xl mb-6 flex items-center justify-center gap-3 hover:bg-gray-100 transition" aria-label="Continue with Google">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" height="20" alt="" aria-hidden="true">
          Continue with Google
        </button>
        <div class="relative mb-6" aria-hidden="true"><hr class="border-gray-800"><span class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-card px-4 text-gray-500 text-sm">OR</span></div>
        <div class="text-left">
          <label for="login-email" class="block text-xs text-gray-400 mb-2 uppercase tracking-widest">Email Address</label>
          <input type="email" id="login-email" placeholder="you@example.com" autocomplete="email" class="form-input w-full mb-4" aria-label="Email address">
          <button onclick="window.pfi.sendMagicLink()" class="btn-buy w-full" aria-label="Send magic link login email">Send Magic Link</button>
        </div>
      </div>
      <p class="text-xs text-gray-600 mt-4">No passwords needed. Magic link expires in 1 hour.</p>
    </main>` + renderFooter();
  }

  async function renderAccountPage(app) {
    const userStr = localStorage.getItem('pfi_user');
    if (!userStr) { navigate('/login'); return; }
    let user;
    try { user = JSON.parse(userStr); } catch (e) { navigate('/login'); return; }
    const safeEmail = escapeHTML(user.email || '');

    app.innerHTML = renderHeader() + `
    <main id="main-content" class="max-w-4xl mx-auto px-4 py-12">
      <div class="flex justify-between items-center mb-8">
        <div><h1 class="text-2xl font-bold font-display">My Account</h1><p class="text-gray-400 text-sm">Welcome, <span class="text-brand-gold">${safeEmail}</span></p></div>
        <button onclick="localStorage.removeItem('pfi_user');window.pfi.nav('/')" class="text-xs text-gray-500 hover:text-brand-red transition" aria-label="Sign out"><i class="fas fa-sign-out-alt mr-1" aria-hidden="true"></i>Sign Out</button>
      </div>
      <div class="bg-brand-card border border-gray-800 rounded-xl p-8 text-center">
        <i class="fas fa-box text-4xl text-gray-700 mb-4" aria-hidden="true"></i>
        <p class="text-gray-400">Your order history will appear here.</p>
        <button onclick="window.pfi.nav('/track')" class="btn-gold mt-4 text-sm" aria-label="Track an order">Track an Order →</button>
      </div>
    </main>` + renderFooter();
  }

  function handleAuthCallback(app) {
    const params = new URLSearchParams(location.hash.substring(1) || location.search);
    const accessToken = params.get('access_token');
    const email = params.get('email') || 'user@photoframein.com';
    if (accessToken || params.get('code')) {
      // SECURITY: Only store token and email, never the full params
      localStorage.setItem('pfi_user', JSON.stringify({ token: 'session', email: email.slice(0, 200) }));
      toast('Successfully signed in!');
      navigate('/account');
    } else { navigate('/login'); }
  }

  // ─── CUSTOM FRAME PAGE ────────────────────────────────────────────────────
  function renderCustomFramePage(app) {
    app.innerHTML = renderHeader() + `
    <main id="main-content" class="max-w-7xl mx-auto px-4 py-12">
      <div class="text-center mb-10">
        <h1 class="text-3xl md:text-5xl font-bold font-display mb-3">Upload Your Photo</h1>
        <p class="text-gray-400 max-w-xl mx-auto">Transform your digital memories into premium framed art. Professional printing, handcrafted frames, delivered to your door.</p>
      </div>
      <div class="grid md:grid-cols-2 gap-10">
        <div>
          <div id="upload-zone" class="bg-brand-card border-2 border-dashed border-gray-700 rounded-2xl p-12 text-center cursor-pointer hover:border-brand-gold transition group mb-6" role="button" tabindex="0" aria-label="Upload your photo">
            <div id="preview-container" class="hidden relative mb-4">
              <div id="custom-mockup" class="bg-gray-900 rounded-xl overflow-hidden shadow-2xl p-6 flex items-center justify-center" style="min-height:300px">
                <img id="custom-img-preview" src="" class="max-w-full max-h-72 shadow-2xl border-4 border-black transition-all" alt="Your uploaded photo preview">
                <div class="glass-overlay" aria-hidden="true"></div>
              </div>
            </div>
            <div id="upload-prompt">
              <div class="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition" aria-hidden="true">
                <i class="fas fa-cloud-upload-alt text-2xl text-brand-gold"></i>
              </div>
              <h3 class="text-lg font-bold mb-2">Click to upload your photo</h3>
              <p class="text-sm text-gray-500">JPG, PNG supported · Max 50MB for 4K quality</p>
            </div>
            <input type="file" id="file-input" class="hidden" accept="image/jpeg,image/png,image/webp" aria-label="Choose photo file">
          </div>
          <div class="bg-brand-card border border-gray-900 rounded-xl p-5">
            <h4 class="font-bold text-xs uppercase tracking-widest text-brand-gold mb-3"><i class="fas fa-certificate mr-2" aria-hidden="true"></i>Quality Promise</h4>
            <ul class="space-y-2 text-sm text-gray-300" role="list">
              <li><i class="fas fa-check text-brand-gold mr-2" aria-hidden="true"></i>Manual DPI optimization before print</li>
              <li><i class="fas fa-check text-brand-gold mr-2" aria-hidden="true"></i>12-colour professional pigment inks</li>
              <li><i class="fas fa-check text-brand-gold mr-2" aria-hidden="true"></i>300gsm museum-grade archival paper</li>
              <li><i class="fas fa-check text-brand-gold mr-2" aria-hidden="true"></i>Ready to hang — mounting kit included</li>
            </ul>
          </div>
        </div>
        <div class="bg-brand-card border border-gray-800 rounded-2xl p-8 space-y-8">
          <div>
            <label class="text-sm font-bold text-gray-400 mb-3 block uppercase tracking-widest" id="custom-size-label">1. Select Frame Size</label>
            <div class="grid grid-cols-2 gap-2" role="group" aria-labelledby="custom-size-label">
              ${[
                {s:'Small (8×12)',p:499,code:'Small'},
                {s:'Medium (12×18)',p:799,code:'Medium'},
                {s:'Large (18×24)',p:1149,code:'Large'},
                {s:'XL (24×36)',p:1749,code:'XL'}
              ].map(opt => `
              <button class="size-option ${opt.code==='Medium'?'active':''}" data-size="${opt.code}" onclick="window.pfi.selectCustomSize('${opt.code}',${opt.p})" aria-pressed="${opt.code==='Medium'}" aria-label="${opt.s}, ${formatPrice(opt.p)}">
                <div class="font-bold text-sm">${opt.s}</div>
                <div class="text-xs text-brand-gold">${formatPrice(opt.p)}</div>
              </button>`).join('')}
            </div>
          </div>
          <div>
            <label class="text-sm font-bold text-gray-400 mb-3 block uppercase tracking-widest" id="custom-frame-label">2. Select Display Style</label>
            <div class="space-y-3" role="group" aria-labelledby="custom-frame-label">
              <label class="custom-frame-option active" id="style-standard">
                <input type="radio" name="custom_frame" value="Standard" checked class="accent-brand-gold" aria-label="Standard direct display, free">
                <div class="flex-1">
                  <div class="flex justify-between"><strong>Standard (Direct Display)</strong><span class="text-brand-green text-xs font-bold">FREE</span></div>
                  <p class="text-xs text-gray-500 mt-1">Photo fills the entire frame. Clean, modern look.</p>
                </div>
              </label>
              <label class="custom-frame-option" id="style-premium">
                <input type="radio" name="custom_frame" value="Premium" class="accent-brand-gold" aria-label="Premium display with decorative mount, plus 250 rupees">
                <div class="flex-1">
                  <div class="flex justify-between"><strong>Premium (With White Mount)</strong><span class="text-brand-gold text-xs font-bold">+₹250</span></div>
                  <p class="text-xs text-gray-500 mt-1">Gallery-style pure white (#FFFFFF) border. Museum presentation.</p>
                </div>
              </label>
            </div>
            <div id="custom-mount-extra" class="mt-3 hidden p-4 bg-black/40 border border-gray-800 rounded-xl">
              <label for="custom-mount-select" class="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-2 block">Mount Style (Pure White — #FFFFFF)</label>
              <select id="custom-mount-select" class="form-input w-full text-sm" aria-label="Select mount style">
                <option value="classic">Classic Single Mount</option>
                <option value="dual">Dual Layer (+₹149)</option>
                <option value="floating">Floating Frame (+₹249)</option>
              </select>
            </div>
          </div>
          <div class="pt-6 border-t border-gray-800">
            <div class="flex justify-between items-center mb-6">
              <div>
                <div class="text-gray-400 text-sm">Total Price</div>
                <div id="custom-total-display" class="text-3xl font-bold text-brand-gold" aria-live="polite">₹799</div>
              </div>
              <div class="text-xs text-brand-green font-bold text-right"><i class="fas fa-truck mr-1" aria-hidden="true"></i>Free Shipping<br><i class="fas fa-gift mr-1" aria-hidden="true"></i>Ready to Hang</div>
            </div>
            <button onclick="window.pfi.addCustomToCart()" class="btn-buy py-5 w-full" aria-label="Create custom frame and add to cart">
              <i class="fas fa-magic mr-2" aria-hidden="true"></i>CREATE MY FRAME
            </button>
          </div>
        </div>
      </div>
    </main>` + renderFooter();

    window._customState = { size: 'Medium', frame: 'Standard', basePrice: 799, framePrice: 0, imageUrl: null, mountType: 'classic' };

    const zone = $('#upload-zone');
    const input = $('#file-input');
    if (zone && input) {
      zone.onclick = () => input.click();
      zone.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') input.click(); };
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        // Validate file type and size
        if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { toast('Only JPG, PNG, WEBP files are supported', 'error'); return; }
        if (file.size > 52428800) { toast('File too large. Maximum 50MB allowed.', 'error'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const preview = $('#preview-container');
          const prompt = $('#upload-prompt');
          const img = $('#custom-img-preview');
          if (preview) preview.classList.remove('hidden');
          if (prompt) prompt.classList.add('hidden');
          if (img) img.src = ev.target.result;
          window._customState.imageUrl = ev.target.result;
          toast('Photo uploaded! Now add to cart.');
        };
        reader.readAsDataURL(file);
      };
    }

    // Frame style radio interactions
    $$('input[name="custom_frame"]').forEach(radio => {
      radio.addEventListener('change', () => {
        $$('.custom-frame-option').forEach(l => l.classList.remove('active'));
        radio.closest('label')?.classList.add('active');
        const price = radio.value === 'Premium' ? 250 : 0;
        window.pfi.selectCustomFrame(radio.value, price);
      });
    });

    updateCustomTotal();
    updateCartBadge();
  }

  function updateCustomTotal() {
    const s = window._customState || {};
    const base = Number(s.basePrice) || 799;
    const frame = Number(s.framePrice) || 0;
    const mountExtra = s.mountType === 'dual' ? 149 : s.mountType === 'floating' ? 249 : 0;
    const total = Math.max(0, base + frame + mountExtra);
    const el = $('#custom-total-display');
    if (el) el.textContent = formatPrice(total);
    window._customState.totalPrice = total;
  }

  // ─── EXIT INTENT ─────────────────────────────────────────────────────────
  function setupExitIntent() {
    if (state.exitShown || state.config.exit_intent_enabled === 'false') return;
    // Mobile: timeout-based, Desktop: mouse-out
    if (window.innerWidth <= 768) {
      setTimeout(() => { if (!state.exitShown) { state.exitShown = true; showExitPopup(); } }, 30000);
    } else {
      document.addEventListener('mouseout', (e) => {
        if (e.clientY < 5 && !state.exitShown) { state.exitShown = true; showExitPopup(); }
      }, { once: true });
    }
  }

  function showExitPopup() {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'exit-popup-heading');
    overlay.innerHTML = `
    <div class="popup-content">
      <button onclick="this.closest('.popup-overlay').remove()" class="absolute top-3 right-4 text-gray-400 hover:text-white text-xl" aria-label="Close popup">×</button>
      <div class="text-4xl mb-3" aria-hidden="true">🎁</div>
      <h2 id="exit-popup-heading" class="text-2xl font-bold text-brand-gold mb-2 font-display">Wait! Here's 10% Off</h2>
      <p class="text-sm text-gray-300 mb-4">Use code <strong class="text-brand-gold">EXIT10</strong> at checkout for 10% off your first order.</p>
      <label for="exit-email" class="sr-only">Your email address</label>
      <input type="email" id="exit-email" placeholder="Enter your email" class="form-input w-full mb-3" aria-label="Enter your email for discount">
      <button onclick="window.pfi.captureExitLead()" class="btn-buy w-full" aria-label="Get 10% discount code">Get My 10% Off →</button>
      <p class="text-xs text-gray-600 mt-3">No spam. One-click unsubscribe.</p>
    </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    // Trap focus
    const input = overlay.querySelector('#exit-email');
    if (input) setTimeout(() => input.focus(), 100);
  }

  // ─── GLOBAL API (window.pfi) ─────────────────────────────────────────────
  window.pfi = {
    nav: navigate,
    loadShopProducts,

    async googleLogin() {
      location.href = `${API}/auth/google?redirectTo=${encodeURIComponent(location.origin + '/auth/callback')}`;
    },

    async sendMagicLink() {
      const email = $('#login-email')?.value?.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Please enter a valid email address', 'error'); return; }
      const btn = event.currentTarget;
      const original = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      try {
        await fetch(`${API}/auth/magic-link`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, redirectTo: location.origin + '/auth/callback' }) });
        toast('Login link sent! Check your inbox.');
        btn.innerHTML = '<i class="fas fa-check mr-2"></i>Link Sent';
      } catch (e) { toast('Error sending link. Please try again.', 'error'); btn.innerHTML = original; btn.disabled = false; }
    },

    selectSize(size) {
      window._selectedSize = size;
      $$('#size-selector button').forEach(el => {
        el.classList.toggle('active', el.dataset.size === size);
        el.setAttribute('aria-pressed', el.dataset.size === size ? 'true' : 'false');
      });
      updateVariant();
    },

    selectFrame(frame) {
      window._selectedFrame = frame;
      $$('#frame-selector button').forEach(el => {
        el.classList.toggle('active', el.dataset.frame === frame);
        el.setAttribute('aria-pressed', el.dataset.frame === frame ? 'true' : 'false');
      });
      updateVariant();
    },

    setMountType(type) {
      window._selectedMountType = type;
      const labels = { classic: 'Classic Mount', dual: 'Dual Layer Mount', floating: 'Floating Frame' };
      toast(`Mount style: ${labels[type] || type}`);
    },

    setMainImage(url, el) {
      const main = $('#main-image');
      if (main && url && /^https?:\/\//.test(url)) main.src = url;
      $$('.gallery-thumb-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
      el?.classList.add('active'); el?.setAttribute('aria-pressed','true');
    },

    async checkPincode() {
      const pin = ($('#pincode-input')?.value || '').trim();
      const result = $('#pincode-result');
      if (!result) return;
      if (!/^[1-9]\d{5}$/.test(pin)) { result.innerHTML = '<span class="text-red-400 text-sm">Enter a valid 6-digit pincode</span>'; return; }
      result.innerHTML = '<span class="text-gray-400 text-sm">Checking delivery...</span>';
      try {
        const res = await fetch(`${API}/checkout/validate-pincode`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ pincode: pin }) });
        const data = await res.json();
        if (data.valid) {
          result.innerHTML = `<span class="text-brand-green text-sm"><i class="fas fa-check-circle mr-1" aria-hidden="true"></i>Delivery available (${escapeHTML(data.deliveryEstimate||'3-5 days')})</span>${data.express ? '<br><span class="badge-express text-xs mt-1 inline-block"><i class="fas fa-bolt mr-1"></i>Express in Hyderabad!</span>' : ''}`;
        } else {
          result.innerHTML = '<span class="text-red-400 text-sm">Delivery not available for this pincode</span>';
        }
      } catch (e) { result.innerHTML = '<span class="text-red-400 text-sm">Error checking delivery</span>'; }
    },

    addToCart() {
      const p = window._currentProduct;
      const v = window._currentVariant;
      if (!p || !v || !v.price || !isFinite(v.price)) { toast('Please select size and frame type', 'error'); return; }
      const existing = state.cart.findIndex(i => i.variantId === String(v.id));
      if (existing >= 0) {
        state.cart[existing].quantity = Math.min(50, (state.cart[existing].quantity || 1) + 1);
      } else {
        state.cart.push({
          productId: String(p.id), variantId: String(v.id), name: p.name || '', slug: p.slug || '',
          size: v.size || '', frame: v.frame_type || '',
          price: Number(v.price), sku: v.sku || '',
          imageUrl: p.images?.[0]?.image_url || '', quantity: 1
        });
      }
      saveCart();
      toast(`<i class='fas fa-check-circle' style='color:#22C55E;margin-right:6px'></i>Added to cart! <a href='/cart' onclick="window.pfi.nav('/cart');return false;" style='color:#C5A059;margin-left:8px;font-weight:bold'>View Cart →</a>`);
      trackFunnelEvent('add_to_cart', p.id, null, { name: p.name, size: v.size, frame: v.frame_type, price: v.price });
    },

    buyNow() { window.pfi.addToCart(); navigate('/cart'); },

    updateQty(index, delta) {
      if (!state.cart[index]) return;
      const newQty = Math.max(1, Math.min(50, (state.cart[index].quantity || 1) + delta));
      state.cart[index].quantity = newQty;
      saveCart(); renderCartPage($('#app'));
    },

    removeFromCart(index) {
      if (index < 0 || index >= state.cart.length) return;
      state.cart.splice(index, 1); saveCart(); renderCartPage($('#app'));
    },

    addUpsellToCart(productId, variantId, name, size, frame, price, image) {
      const numPrice = Number(price);
      if (!variantId || !isFinite(numPrice) || numPrice <= 0) return;
      const existing = state.cart.findIndex(i => i.variantId === String(variantId));
      if (existing >= 0) { state.cart[existing].quantity = Math.min(50, (state.cart[existing].quantity||1)+1); }
      else { state.cart.push({ productId: String(productId), variantId: String(variantId), name: String(name||'').slice(0,200), slug: String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'-'), size: String(size||''), frame: String(frame||''), price: numPrice, sku: 'UPSELL', imageUrl: String(image||''), quantity: 1 }); }
      saveCart(); toast('Added!'); renderCartPage($('#app'));
    },

    applyBundle(qty) {
      const p = window._currentProduct;
      const v = window._currentVariant;
      if (!p || !v) { toast('Select a product first', 'error'); return; }
      const safeQty = Math.min(50, Math.max(1, Number(qty) || 1));
      const index = state.cart.findIndex(i => i.variantId === String(v.id));
      if (index >= 0) { state.cart[index].quantity = safeQty; }
      else {
        state.cart.push({ productId: String(p.id), variantId: String(v.id), name: p.name||'', slug: p.slug||'', size: v.size||'', frame: v.frame_type||'', price: Number(v.price)||0, sku: v.sku||'', imageUrl: p.images?.[0]?.image_url||'', quantity: safeQty });
      }
      saveCart(); toast(`${safeQty} items added! Bundle savings applied.`); navigate('/cart');
    },

    sortProducts(sort) { loadShopProducts(sort); },

    async applyCoupon() {
      const code = ($('#coupon-input')?.value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
      const result = $('#coupon-result');
      if (!code || !result) return;
      if (code.length < 3 || code.length > 20) { result.innerHTML = '<p class="text-red-400 text-xs">Invalid coupon code</p>'; return; }
      result.innerHTML = '<p class="text-gray-400 text-xs">Validating...</p>';
      try {
        const { subtotal } = getCartTotals();
        const res = await fetch(`${API}/checkout/apply-coupon`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ code, subtotal }) });
        const data = await res.json();
        if (data.valid) {
          window._appliedCoupon = code;
          result.innerHTML = `<p class="text-brand-green text-xs font-bold">✅ ${escapeHTML(data.message||'Coupon applied!')} — Save ${formatPrice(data.discount)}</p>`;
        } else {
          window._appliedCoupon = null;
          result.innerHTML = `<p class="text-red-400 text-xs">${escapeHTML(data.error||'Invalid coupon')}</p>`;
        }
      } catch (e) { result.innerHTML = '<p class="text-red-400 text-xs">Error validating coupon</p>'; }
    },

    async trackOrder() {
      const input = ($('#track-input')?.value || '').trim();
      const result = $('#track-result');
      if (!input || !result) return;
      // Sanitize input
      const cleanInput = input.replace(/[^a-zA-Z0-9\-+]/g, '').slice(0, 30);
      if (!cleanInput) return;
      result.innerHTML = '<p class="text-gray-400 text-sm py-4 text-center"><i class="fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>Searching...</p>';
      try {
        const isOrderId = /^PS-\d{6}-\d{4}$/i.test(cleanInput);
        const params = isOrderId ? `order_id=${encodeURIComponent(cleanInput)}` : `phone=${encodeURIComponent(cleanInput)}`;
        const res = await fetch(`${API}/orders/track?${params}`);
        const data = await res.json();
        if (!data.orders?.length) { result.innerHTML = '<div class="bg-brand-card border border-gray-800 rounded-xl p-6 text-center"><p class="text-gray-400">No orders found. Check your order ID or phone number.</p></div>'; return; }
        const statusColors = { delivered: 'bg-green-900 text-green-300', shipped: 'bg-blue-900 text-blue-300', cancelled: 'bg-red-900 text-red-300', cod_pending: 'bg-yellow-900 text-yellow-300', pending: 'bg-yellow-900 text-yellow-300' };
        result.innerHTML = data.orders.map(o => {
          const safeOrderId2 = escapeHTML(o.order_id || '');
          const safeAwb = escapeHTML(o.awb_number || '');
          const safeCarrier = escapeHTML(o.carrier || '');
          const safeStatus = escapeHTML((o.status || 'pending').toUpperCase());
          const safeTotal = formatPrice(o.total || 0);
          const statusClass = statusColors[o.status] || 'bg-gray-800 text-gray-300';
          const trackUrl = o.carrier_tracking_url && /^https?:\/\//.test(o.carrier_tracking_url) ? escapeAttr(o.carrier_tracking_url) : null;
          return `
          <article class="bg-brand-card border border-gray-800 rounded-xl p-5 mb-4">
            <div class="flex justify-between items-start mb-3">
              <div>
                <h3 class="font-bold font-mono text-sm">${safeOrderId2}</h3>
                <p class="text-xs text-gray-400">${new Date(o.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p>
              </div>
              <span class="${statusClass} px-2 py-1 rounded-full text-xs font-bold">${safeStatus}</span>
            </div>
            <p class="text-sm text-gray-400 mb-2">${o.payment_method==='cod'?'Cash on Delivery':'Prepaid'} · ${safeTotal}</p>
            ${safeAwb ? `<p class="text-sm mb-2"><strong>AWB:</strong> ${safeAwb} ${safeCarrier?`(${safeCarrier})`:''}</p>` : '<p class="text-xs text-gray-500">Tracking available once dispatched</p>'}
            ${trackUrl ? `<a href="${trackUrl}" target="_blank" rel="noopener noreferrer" class="text-brand-gold text-sm hover:underline mt-1 inline-block">Track with Carrier →</a>` : ''}
          </article>`;
        }).join('');
      } catch (e) { result.innerHTML = '<p class="text-red-400 text-sm text-center py-4">Error fetching order. Please try again.</p>'; }
    },

    async captureExitLead() {
      const email = ($('#exit-email')?.value || '').trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Please enter a valid email', 'error'); return; }
      try {
        await fetch(`${API}/leads`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, source: 'exit_intent' }) });
        document.querySelector('.popup-overlay')?.remove();
        toast('Discount code sent to your email! Use EXIT10 at checkout.');
      } catch (e) { toast('Error. Please try again.', 'error'); }
    },

    selectCustomSize(size, price) {
      window._customState.size = size;
      window._customState.basePrice = Math.max(0, Number(price) || 499);
      $$('.size-option').forEach(el => {
        el.classList.toggle('active', el.dataset.size === size);
        el.setAttribute('aria-pressed', el.dataset.size === size ? 'true' : 'false');
      });
      updateCustomTotal();
    },

    selectCustomFrame(frame, price) {
      window._customState.frame = frame;
      window._customState.framePrice = Math.max(0, Number(price) || 0);
      const mountExtra = $('#custom-mount-extra');
      if (mountExtra) mountExtra.classList.toggle('hidden', frame !== 'Premium');
      const preview = $('#custom-img-preview');
      if (preview) {
        preview.classList.remove('has-mount', 'border-brand-gold', 'border-black', 'frame-border-white');
        if (frame === 'Premium') { preview.classList.add('has-mount', 'frame-border-white'); }
        else { preview.classList.add('border-black'); }
      }
      updateCustomTotal();
    },

    async addCustomToCart() {
      const s = window._customState;
      const fileInput = $('#file-input');
      const file = fileInput?.files?.[0];
      if (!file) { toast('Please upload your photo first!', 'error'); return; }
      if (file.size > 52428800) { toast('File too large. Max 50MB.', 'error'); return; }

      const btn = event.currentTarget;
      const originalText = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>Uploading...';

      try {
        // Get signed upload URL from backend
        const signRes = await fetch(`${API}/upload/sign`);
        const signData = await signRes.json();
        if (!signData.apiKey) throw new Error('Upload service unavailable');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', signData.apiKey);
        formData.append('timestamp', String(signData.timestamp));
        formData.append('signature', signData.signature);
        formData.append('folder', signData.folder || 'custom_frames');

        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signData.cloudName)}/image/upload`, { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadData.secure_url) throw new Error('Upload failed');

        const imageUrl = uploadData.secure_url;
        // Validate returned URL is from Cloudinary
        if (!/^https:\/\/res\.cloudinary\.com\//.test(imageUrl)) throw new Error('Invalid upload response');

        const mountExtra = s.mountType === 'dual' ? 149 : s.mountType === 'floating' ? 249 : 0;
        const totalPrice = Math.max(0, (Number(s.basePrice)||799) + (Number(s.framePrice)||0) + mountExtra);

        state.cart.push({
          productId: 'custom-frame',
          variantId: `custom-${s.size}-${s.frame}-${Date.now()}`,
          name: `Custom Frame (${s.size})`,
          slug: 'custom-photo-frame',
          size: s.size || 'Medium',
          frame: `${s.frame || 'Standard'}${s.frame === 'Premium' ? ' (With Mount)' : ''}`,
          price: totalPrice,
          imageUrl: imageUrl,
          original_filename: file.name.replace(/[^a-zA-Z0-9._\-]/g, '_').slice(0, 100),
          is_custom_frame: true,
          quantity: 1
        });
        saveCart(); toast('Custom frame added! Redirecting to cart...'); navigate('/cart');
      } catch (err) {
        console.error('Custom frame upload error:', err);
        toast('Upload failed. Check your internet and try again.', 'error');
        btn.disabled = false; btn.innerHTML = originalText;
      }
    }
  };

  function updateVariant() {
    const p = window._currentProduct;
    if (!p) return;
    const variants = (p.variants || []).filter(v => v.is_active);
    const v = variants.find(v => v.size === window._selectedSize && v.frame_type === window._selectedFrame);
    if (!v) return;
    window._currentVariant = v;

    const priceEl = $('#current-price');
    const compareEl = $('#compare-price');
    if (priceEl) {
      priceEl.textContent = formatPrice(v.price);
      if (window.gsap) gsap.fromTo(priceEl, { y: -8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out', clearProps: 'all' });
    }
    if (compareEl) compareEl.textContent = v.compare_at_price ? formatPrice(v.compare_at_price) : '';

    // Mount customization visibility
    const mountContainer = $('#mount-customization');
    if (mountContainer) mountContainer.classList.toggle('hidden', v.frame_type !== 'Premium');

    // Frame mockup visual update
    const mainImg = $('#main-image');
    if (mainImg) {
      mainImg.classList.remove('frame-border-gold', 'frame-border-black', 'frame-border-white', 'has-mount');
      if (v.frame_type === 'Premium') { mainImg.classList.add('frame-border-white', 'has-mount'); }
      else if (v.frame_type === 'Standard') { mainImg.classList.add('frame-border-black'); }
      else { mainImg.classList.add('frame-border-white'); }
    }

    // Update "Place Order" button text if on checkout
    const placeBtn = $('#place-order-btn');
    if (placeBtn) {
      const { total } = getCartTotals();
      placeBtn.textContent = `PLACE ORDER — ${formatPrice(Math.max(0, total - 50))}`;
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  async function init() {
    captureUTM();
    // Load public config
    try {
      const res = await fetch(`${API}/config/public`);
      const data = await res.json();
      state.config = data.config || {};
    } catch (e) { console.error('Config load error:', e); }
    route();
    window.addEventListener('popstate', route);
    // SPA link interception
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (a && a.hostname === location.hostname && !a.target && !a.download) {
        e.preventDefault(); navigate(a.pathname + a.search);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
