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

  // ─── Volume Discount Logic (validated, no NaN/negative, no combo loss) ──
  function getVolumeDiscount(subtotal, itemCount) {
    if (!isFinite(subtotal) || subtotal <= 0) return { discount: 0, label: '' };
    // Safety: discount never exceeds 40% of subtotal (no combo causes a loss)
    const maxDiscount = Math.floor(subtotal * 0.40);
    if (itemCount >= 5) {
      const d = Math.min(maxDiscount, Math.floor(subtotal * 0.20));
      return { discount: Math.max(0, d), label: '🎉 Buy 5+ — 20% OFF Applied!' };
    }
    if (itemCount >= 3) {
      return { discount: Math.min(maxDiscount, 250), label: '🎉 Buy 3 Deal — ₹250 Saved!' };
    }
    if (itemCount >= 2) {
      return { discount: Math.min(maxDiscount, 100), label: '🎉 Buy 2 Deal — ₹100 Saved!' };
    }
    return { discount: 0, label: '' };
  }

  // ─── Volumetric Weight Estimate for shipping display ──────────────────────
  // Frame dimensions (cm): Small=21×30, Medium=30×45, Large=46×61, XL=61×91
  const SIZE_VOL = { Small: { l:24, w:34, h:5 }, Medium: { l:34, w:50, h:6 }, Large: { l:50, w:66, h:7 }, XL: { l:66, w:97, h:8 }, A4: { l:24, w:34, h:5 } };
  function getVolumetricWeight(size) {
    const d = SIZE_VOL[size] || SIZE_VOL.Medium;
    return Math.max(0.5, Math.ceil((d.l * d.w * d.h) / 5000 * 10) / 10); // kg, rounded up to 1dp
  }
  function getCartVolumetricWeight() {
    return state.cart.reduce((sum, i) => {
      const w = getVolumetricWeight(i.size || 'Medium');
      return sum + w * Math.max(1, i.quantity || 1);
    }, 0);
  }

  function getCartTotals() {
    const subtotal = state.cart.reduce((s, i) => {
      const price = Number(i.price);
      const qty = Math.max(1, i.quantity || 1);
      return s + (isFinite(price) && price > 0 ? price * qty : 0);
    }, 0);
    const itemCount = state.cart.reduce((s, i) => s + (i.quantity || 1), 0);
    const { discount, label } = getVolumeDiscount(subtotal, itemCount);
    const freeThreshold = parseInt(state.config.free_shipping_threshold || '899');
    const afterDiscount = subtotal - discount;
    // Volumetric weight influences shipping tier display (backend validates actual)
    const volWeight = getCartVolumetricWeight();
    const baseShipping = afterDiscount >= freeThreshold ? 0 : (volWeight > 2 ? 149 : 99);
    const shipping = Math.max(0, baseShipping);
    const total = Math.max(0, subtotal - discount + shipping);
    return { subtotal, discount, label, shipping, total, itemCount, freeThreshold, volWeight };
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
      else if (path === '/suggest') renderSuggestPage(app);
      else if (path === '/review') renderReviewPage(app);
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
    const annText = escapeHTML(ann.announcement_text || 'Free Delivery on orders above ₹899 | COD Available');
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
          <a href="/" onclick="window.pfi.nav('/'); return false;" class="flex items-center gap-2 group" aria-label="${escapeHTML(state.config.brand_name || 'PhotoFrameIn')} - Home">
            <span class="text-3xl" aria-hidden="true">🖼️</span>
            <div>
              <div class="text-xl font-bold tracking-tighter text-white font-display">${escapeHTML(state.config.brand_name || 'PhotoFrameIn')}</div>
              <div class="text-[9px] uppercase tracking-[0.2em] text-brand-gold -mt-1 font-bold">Photo Frames Online</div>
            </div>
          </a>
          <nav class="hidden md:flex items-center gap-5" aria-label="Main navigation">
            <a href="/category/divine" onclick="window.pfi.nav('/category/divine');return false;" class="nav-link">🕉️ Divine</a>
            <a href="/category/automotive" onclick="window.pfi.nav('/category/automotive');return false;" class="nav-link" style="color:#FF7A1A">🏎️ Automotive</a>
            <a href="/shop" onclick="window.pfi.nav('/shop');return false;" class="nav-link">All Frames</a>
            <a href="/customize" onclick="window.pfi.nav('/customize');return false;" class="nav-link text-brand-gold border-b border-brand-gold pb-0.5">✨ Custom</a>
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
    // Support both whatsapp_link (full URL) and whatsapp_number
    const waRaw = (c.whatsapp_number || '').replace(/\D/g,'');
    const waNumber = /^\d{10,15}$/.test(waRaw) ? waRaw : '917989531818';
    const waLink = /^https?:\/\//.test(c.whatsapp_link || '') ? escapeAttr(c.whatsapp_link) : `https://wa.me/${waNumber}`;

    return `
    <footer class="site-footer mt-20" role="contentinfo">
      <div class="max-w-7xl mx-auto px-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div class="col-span-2 md:col-span-1">
            <div class="flex items-center gap-2 mb-4">
              <span class="text-2xl" aria-hidden="true">🖼️</span>
              <span class="text-lg font-bold text-white font-display uppercase tracking-widest">${escapeHTML(state.config.brand_name || 'PhotoFrameIn')}</span>
            </div>
            <p class="text-gray-400 text-sm mb-5 leading-relaxed">Buy photo frames online — handcrafted in Hyderabad, delivered pan-India with premium protective packaging.</p>
            <div class="flex gap-3" aria-label="Social media links">
              <a href="${instaLink}" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="Instagram"><i class="fab fa-instagram" aria-hidden="true"></i></a>
              <a href="${fbLink}" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="Facebook"><i class="fab fa-facebook-f" aria-hidden="true"></i></a>
              <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="WhatsApp"><i class="fab fa-whatsapp" aria-hidden="true"></i></a>
            </div>
          </div>
          <div>
            <h3 class="footer-heading">Shop</h3>
            <ul class="footer-links" role="list">
              <li><a href="/category/divine" onclick="window.pfi.nav('/category/divine');return false;">🕉️ Divine Art Frames</a></li>
              <li><a href="/category/automotive" onclick="window.pfi.nav('/category/automotive');return false;">🏎️ Automotive Frames</a></li>
              <li><a href="/shop" onclick="window.pfi.nav('/shop');return false;">All Products</a></li>
              <li><a href="/customize" onclick="window.pfi.nav('/customize');return false;">✨ Custom Photo Frame</a></li>
            </ul>
          </div>
          <div>
            <h3 class="footer-heading">Help</h3>
            <ul class="footer-links" role="list">
              <li><a href="/track" onclick="window.pfi.nav('/track');return false;">Track Order</a></li>
              <li><a href="/suggest" onclick="window.pfi.nav('/suggest');return false;">Suggest a Design</a></li>
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
              ${(c.bulk_order_phone1 || c.bulk_order_phone2) ? `<li class="pt-2 border-t border-gray-900"><i class="fas fa-boxes mr-2 text-brand-gold" aria-hidden="true"></i><strong class="text-gray-300 text-xs">Bulk/Corporate:</strong><br><span class="text-xs">${c.bulk_order_phone1 ? escapeHTML(c.bulk_order_phone1) : ''}${c.bulk_order_phone2 ? ' / '+escapeHTML(c.bulk_order_phone2) : ''}</span></li>` : ''}
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
          <p>© ${new Date().getFullYear()} ${escapeHTML(state.config.brand_name || 'PhotoFrameIn')}. All Rights Reserved.</p>
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
    <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="whatsapp-widget" aria-label="Chat on WhatsApp">
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
            <span class="trust-badge green" role="listitem"><i class="fas fa-shipping-fast" aria-hidden="true"></i> Free Delivery ₹899+</span>
            <span class="trust-badge gold" role="listitem"><i class="fas fa-shield-alt" aria-hidden="true"></i> Damage Protected</span>
            <span class="trust-badge" role="listitem"><i class="fas fa-money-bill-wave" aria-hidden="true"></i> COD Available</span>
          </div>

          <!-- Quick Category Spotlights -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
            <div class="spotlight-card" onclick="window.pfi.nav('/category/divine')" role="button" tabindex="0" aria-label="Shop Divine Art frames">
              <div class="text-2xl mb-1" aria-hidden="true">🕉️</div>
              <div class="text-xs font-bold spotlight-label-saffron uppercase tracking-widest">Divine</div>
              <div class="text-[10px] text-gray-400">Ganesha, Shiva &amp; More</div>
            </div>
            <div class="spotlight-card" onclick="window.pfi.nav('/category/automotive')" role="button" tabindex="0" aria-label="Shop Automotive art frames">
              <div class="text-2xl mb-1" aria-hidden="true">🏎️</div>
              <div class="text-xs font-bold spotlight-label-auto uppercase tracking-widest">Automotive</div>
              <div class="text-[10px] text-gray-400">Porsche, Ferrari &amp; More</div>
            </div>
            <div class="spotlight-card" onclick="window.pfi.nav('/category/motivation')" role="button" tabindex="0" aria-label="Shop Motivation frames">
              <div class="text-2xl mb-1" aria-hidden="true">💪</div>
              <div class="text-xs font-bold text-brand-gold uppercase tracking-widest">Motivation</div>
              <div class="text-[10px] text-gray-400">Hustle &amp; Mindset</div>
            </div>
            <div class="spotlight-card" onclick="window.pfi.nav('/customize')" role="button" tabindex="0" aria-label="Create custom photo frame">
              <div class="text-2xl mb-1" aria-hidden="true">✨</div>
              <div class="text-xs font-bold text-white uppercase tracking-widest">Custom</div>
              <div class="text-[10px] text-gray-400">Upload Your Photo</div>
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

      <!-- Bundle / Combo Section -->
      <section class="max-w-7xl mx-auto px-4 py-12" aria-labelledby="bundles-heading">
        <h2 id="bundles-heading" class="section-header text-center"><i class="fas fa-gift text-brand-gold mr-2" aria-hidden="true"></i>Best Value Bundles</h2>
        <div id="bundles-grid" class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <article class="bundle-card divine-themed" onclick="window.pfi.nav('/category/divine')" role="button" tabindex="0" aria-label="Divine Art Bundle">
            <div class="bundle-tag" style="color:var(--saffron,#FF7A1A);text-shadow:0 0 12px rgba(255,122,26,0.4)">🕉️ DIVINE BUNDLE</div>
            <h3 class="bundle-title">Sacred Art Collection Pack</h3>
            <p class="bundle-desc text-gray-400 text-sm">3 divine frames (Ganesha, Shiva, Krishna). Perfect for home mandir, living room or gifting.</p>
            <div class="flex items-center gap-4 mt-4">
              <span class="bundle-price">Buy 3 → Save ₹250</span>
              <span class="badge-express text-xs">🎁 Gift Favourite</span>
            </div>
          </article>
          <article class="bundle-card auto-themed" onclick="window.pfi.nav('/category/automotive')" role="button" tabindex="0" aria-label="Automotive Bundle">
            <div class="bundle-tag auto-red">🏎️ AUTO BUNDLE</div>
            <h3 class="bundle-title">Automotive Dream Pack</h3>
            <p class="bundle-desc text-gray-400 text-sm">2 cinematic Porsche/Ferrari frames. Upgrade any man-cave, office or garage wall.</p>
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
              <div><div class="font-bold text-sm">Premium Packaging</div><div class="text-xs text-gray-400">Corner guards + bubble wrap</div></div>
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

      <!-- Bulk / Corporate Orders Banner -->
      ${(c.bulk_order_phone1 || c.bulk_order_phone2) ? `
      <section class="max-w-7xl mx-auto px-4 pb-4" aria-labelledby="bulk-order-heading">
        <div class="bg-brand-card border border-brand-gold/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 id="bulk-order-heading" class="font-bold text-lg mb-1"><i class="fas fa-boxes text-brand-gold mr-2" aria-hidden="true"></i>Bulk &amp; Corporate Orders</h2>
            <p class="text-sm text-gray-400">Custom framing for offices, events &amp; gifting — special pricing for 10+ units.</p>
          </div>
          <div class="flex flex-wrap gap-3">
            ${c.bulk_order_phone1 ? `<a href="tel:${escapeAttr(c.bulk_order_phone1)}" class="flex items-center gap-2 bg-brand-gold text-black font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-yellow-400 transition" aria-label="Call bulk orders phone 1"><i class="fas fa-phone"></i>${escapeHTML(c.bulk_order_phone1)}</a>` : ''}
            ${c.bulk_order_phone2 ? `<a href="tel:${escapeAttr(c.bulk_order_phone2)}" class="flex items-center gap-2 bg-gray-800 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-gray-700 transition" aria-label="Call bulk orders phone 2"><i class="fas fa-phone"></i>${escapeHTML(c.bulk_order_phone2)}</a>` : ''}
          </div>
        </div>
      </section>` : ''}

      <!-- Instagram Ad Creatives Section for Conversion -->
      <section class="max-w-7xl mx-auto px-4 py-12" aria-labelledby="insta-cta-heading">
        <div class="bg-gradient-to-r from-brand-purple/20 to-brand-card border border-brand-purple/30 rounded-2xl p-8 text-center">
          <h2 id="insta-cta-heading" class="text-2xl font-bold mb-3">Seen Us on Instagram? 📸</h2>
          <p class="text-gray-400 mb-6">Our frames look even better in real life. Premium art — divine or automotive — delivered to your door.</p>
          <div class="flex flex-wrap justify-center gap-3 mb-6">
            <button onclick="window.pfi.nav('/category/divine')" class="btn-buy max-w-xs" aria-label="Shop divine art frames">🕉️ Shop Divine Art</button>
            <button onclick="window.pfi.nav('/category/automotive')" class="btn-cart max-w-xs" aria-label="Shop automotive art frames">🏎️ Shop Automotive</button>
          </div>
          <p class="text-xs text-gray-500">First order? Use code <strong class="text-brand-gold">WELCOME10</strong> for 10% off</p>
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
        const safeBg = /^#[0-9A-Fa-f]{3,8}$/.test(cat.hover_color || '') ? cat.hover_color : '#DAA520';
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
    const safeImg = img?.image_url ? escapeAttr(img.image_url) : `https://placehold.co/400x400/1A1A1A/DAA520?text=${encodeURIComponent(p.name || 'Frame')}`;
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
        <button onclick="window.pfi.loadShopProducts('newest','')" class="filter-btn active" data-filter="all" aria-pressed="true">All Frames</button>
        <button onclick="window.pfi.loadShopProducts('newest','divine')" class="filter-btn" data-filter="divine" aria-pressed="false">🕉️ Divine</button>
        <button onclick="window.pfi.loadShopProducts('newest','automotive')" class="filter-btn" data-filter="automotive" aria-pressed="false">🏎️ Automotive</button>
        <button onclick="window.pfi.loadShopProducts('price_low','')" class="filter-btn" data-filter="budget" aria-pressed="false">Budget ₹499+</button>
        <button onclick="window.pfi.loadShopProducts('popular','')" class="filter-btn" data-filter="popular" aria-pressed="false">🔥 Popular</button>
      </div>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold font-display">Premium Photo Frames Online</h1>
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
      window._selectedFrame = dv?.frame_type || 'Direct Frame';
      window._selectedMountType = 'classic';

      // SECURITY: Escape all user/DB content
      const safeName = escapeHTML(p.name || '');
      const safeDesc = escapeHTML((p.description || '').substring(0, 300));
      const safeMainImg = images[0]?.image_url ? escapeAttr(images[0].image_url) : `https://placehold.co/600x600/1A1A1A/DAA520?text=${encodeURIComponent(p.name||'Frame')}`;
      const frameClass = dv?.frame_type === 'Premium' ? 'has-mount' : 'frame-border-black';
      const frameStyle = '';

      const reviews = (data.reviews || []);
      const avgRating = reviews.length ? (reviews.reduce((s, r) => s + (r.rating||0), 0) / reviews.length).toFixed(1) : null;

      app.innerHTML = renderHeader() + `
      <main id="main-content" class="max-w-6xl mx-auto px-4 py-6">
        <!-- Breadcrumb -->
        <nav class="text-xs text-gray-500 mb-4 flex items-center gap-2" aria-label="Breadcrumb">
          <a href="/" onclick="window.pfi.nav('/');return false;" class="hover:text-brand-gold">Home</a>
          <span aria-hidden="true">›</span>
          <a href="/shop" onclick="window.pfi.nav('/shop');return false;" class="hover:text-brand-gold">Shop</a>
          <span aria-hidden="true">›</span>
          <span class="text-gray-300 truncate max-w-[200px]" aria-current="page">${safeName}</span>
        </nav>

        <!-- ===== HERO: Image + Config — NO sticky on image col ===== -->
        <div class="grid lg:grid-cols-2 gap-8 lg:gap-12">

          <!-- LEFT: Image Gallery (NOT sticky — scrolls naturally) -->
          <div>
            <div class="frame-mockup-container mb-3" role="img" aria-label="${safeName} frame preview">
              <div class="relative inline-block w-full max-w-lg mx-auto">
                <img id="main-image" src="${safeMainImg}" alt="${escapeAttr(p.name)}" class="max-w-full h-auto rounded transition-all duration-500 ${frameClass}" loading="eager">
                <div class="glass-overlay" aria-hidden="true"></div>
              </div>
            </div>
            ${images.length > 1 ? `
            <div class="flex gap-2 overflow-x-auto pb-1 product-gallery-nav" role="list" aria-label="Product images">
              ${images.map((img, i) => `
                <button class="gallery-thumb-btn ${i===0?'active':''}" onclick="window.pfi.setMainImage('${escapeAttr(img.image_url)}', this)" role="listitem" aria-label="View image ${i+1}" aria-pressed="${i===0}">
                  <img src="${escapeAttr(img.image_url)}" alt="${escapeAttr(img.alt_text||p.name)}" class="w-14 h-14 rounded-lg object-cover" loading="lazy" width="56" height="56">
                </button>
              `).join('')}
            </div>` : ''}
<<<<<<< HEAD

            <!-- Shipping Info Widget -->
            <div class="bg-brand-card border border-gray-800 rounded-xl p-4 flex items-center gap-4 mt-4">
              <div class="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-brand-gold flex-shrink-0" aria-hidden="true"><i class="fas fa-shipping-fast"></i></div>
              <div class="text-xs text-gray-400">Delivered in <strong class="text-white">3-5 business days</strong> · <strong class="text-brand-green">Free above ₹899</strong></div>
            </div>
=======
>>>>>>> 65ea1ec31a58a4dda75497e50803c6f95dbc4868
          </div>

          <!-- RIGHT: Config + CTA -->
          <div class="flex flex-col gap-5">

            <!-- BLOCK 1: Name + Price + Rating -->
            <div>
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <span class="badge-express text-xs"><i class="fas fa-check-circle mr-1" aria-hidden="true"></i>In Stock</span>
                ${p.category?.name ? `<span class="text-brand-gold text-xs font-bold uppercase tracking-widest">${escapeHTML(p.category.name)}</span>` : ''}
                ${p.total_orders > 5 ? `<span class="text-[10px] text-gray-500 font-medium"><i class="fas fa-fire text-orange-400 mr-1" aria-hidden="true"></i>${p.total_orders}+ ordered</span>` : ''}
              </div>
              <h1 class="text-2xl md:text-3xl font-bold font-display mb-2 leading-tight">${safeName}</h1>
              ${avgRating ? `
              <div class="flex items-center gap-2 mb-2" aria-label="Rating: ${avgRating} out of 5, ${reviews.length} reviews">
                <span class="stars text-sm" aria-hidden="true">${'★'.repeat(Math.round(Number(avgRating)))}${'☆'.repeat(5-Math.round(Number(avgRating)))}</span>
                <span class="text-xs text-gray-400">${avgRating} · ${reviews.length} verified reviews</span>
              </div>` : ''}
              <div class="flex items-center gap-3 mb-2">
                <div id="current-price" class="text-3xl font-bold text-brand-gold" aria-live="polite">${formatPrice(dv?.price||0)}</div>
                ${dv?.compare_at_price ? `<div id="compare-price" class="text-lg text-gray-500 line-through" aria-label="Was ${formatPrice(dv.compare_at_price)}">${formatPrice(dv.compare_at_price)}</div>
                <span class="bg-brand-green/20 text-brand-green text-xs font-bold px-2 py-1 rounded">SAVE ${Math.round(((dv.compare_at_price-dv.price)/dv.compare_at_price)*100)}%</span>` : '<div id="compare-price"></div>'}
              </div>
              <!-- Dispatch urgency line -->
              <div class="flex items-center gap-2 mt-1 mb-2 text-xs" id="dispatch-urgency">
                <span class="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse inline-block flex-shrink-0" aria-hidden="true"></span>
                <span class="text-gray-400">Order in next <strong class="text-white" id="dispatch-timer">loading...</strong> for <strong class="text-brand-green">Today's Dispatch</strong></span>
              </div>
              <p class="text-gray-400 text-sm leading-relaxed">${safeDesc}</p>
            </div>

            <!-- BLOCK 2: Size Selector -->
            <div>
              <label class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block" id="size-label">1. Choose Size</label>
              <div id="size-selector" class="grid grid-cols-2 md:grid-cols-4 gap-2" role="group" aria-labelledby="size-label">
                ${['Small','Medium','Large','XL'].map(s => {
                  const v = variants.find(v => v.size===s);
                  if (!v) return '';
                  const sizeLabels = { Small: '8×12"', Medium: '12×18"', Large: '18×24"', XL: '24×36"' };
                  return `<button class="size-option ${s===(dv?.size||'Medium')?'active':''}" data-size="${s}" onclick="window.pfi.selectSize('${s}')" aria-pressed="${s===(dv?.size||'Medium')}" aria-label="${s} — ${sizeLabels[s]||s}">
                    <div class="font-bold text-sm">${s}</div>
                    <div class="text-[10px] opacity-70">${sizeLabels[s]||''}</div>
                  </button>`;
                }).join('')}
              </div>
              <button onclick="document.getElementById('size-guide').scrollIntoView({behavior:'smooth'})" class="text-[10px] text-brand-gold mt-1.5 font-bold uppercase tracking-widest hover:underline inline-flex items-center gap-1" aria-label="View size guide">
                <i class="fas fa-ruler-combined" aria-hidden="true"></i>Size Guide ↓
              </button>
            </div>

                    ${badge}
                  </button>`;
                }).join('')}
              </div>
              <div id="premium-mount-info" class="mt-2 p-2.5 bg-black/30 border border-brand-gold/20 rounded-lg text-xs text-gray-400 ${dv?.frame_type==='Premium' ? '' : 'hidden'}">
                <i class="fas fa-check-circle text-brand-gold mr-1"></i><strong class="text-white">Premium White Mount</strong> — pure white archival mat, gallery-ready. <span class="text-brand-gold font-bold">+₹250</span>
              </div>
            </div>

            <!-- BLOCK 3.5: Poster Add-on — shown right after frame selection for max AOV (admin-enabled only) -->
            ${state.config.poster_enabled === 'true' ? `
            <div class="poster-addon-upsell" id="poster-addon-section" role="group" aria-label="Optional poster add-on">
              <div class="poster-addon-header">
                <div class="poster-addon-badge">POPULAR ADD-ON</div>
                <div class="flex items-center justify-between">
                  <div>
                    <div class="font-bold text-sm text-white">🎨 Add a Print-Only Poster</div>
                    <div class="text-xs text-gray-400 mt-0.5">Same high-res art, rolled &amp; shipped separately — no frame</div>
                  </div>
                  <span class="text-brand-gold font-black text-base">+₹${state.config.poster_addon_price || '199'}</span>
                </div>
              </div>
              <label class="flex items-center gap-3 cursor-pointer mt-3 p-2 rounded-lg hover:bg-white/5 transition-colors" for="poster-addon-cb">
                <div class="relative">
                  <input type="checkbox" id="poster-addon-cb" class="sr-only peer" aria-label="Add poster print add-on for ₹${state.config.poster_addon_price || '199'}">
                  <div class="w-5 h-5 border-2 border-gray-600 rounded peer-checked:bg-brand-gold peer-checked:border-brand-gold transition-all flex items-center justify-center">
                    <i class="fas fa-check text-black text-[10px] hidden peer-checked:block"></i>
                  </div>
                </div>
                <span class="text-xs text-gray-300">Yes, add a poster print <span class="text-brand-gold font-bold">(+₹${state.config.poster_addon_price || '199'})</span> — great for gifting!</span>
              </label>
              <p class="text-[10px] text-gray-600 mt-2 pl-1"><i class="fas fa-info-circle mr-1" aria-hidden="true"></i>Rolled in protective tube · Delivered same time as your frame</p>
            </div>` : ''}

            <!-- BLOCK 4: Delivery Check -->
            <div class="flex items-center gap-2">
              <label for="pincode-input" class="sr-only">Check delivery pincode</label>
              <input type="text" id="pincode-input" placeholder="📍 Enter Pincode" maxlength="6" pattern="[1-9][0-9]{5}" class="pincode-input text-sm flex-1" aria-label="Enter delivery pincode" inputmode="numeric">
              <button onclick="window.pfi.checkPincode()" class="btn-gold !py-2 !px-4 !text-xs whitespace-nowrap" aria-label="Check delivery">Check</button>
            </div>
            <div id="pincode-result" class="-mt-3" aria-live="polite"></div>

            <!-- BLOCK 5: CTA BUTTONS — Primary Action -->
            <div class="space-y-2.5 pt-1">
              <button onclick="window.pfi.addToCart()" class="btn-buy py-4 text-base font-bold shadow-xl shadow-red-950/30" aria-label="Add ${safeName} to cart">
                <i class="fas fa-shopping-bag mr-2" aria-hidden="true"></i>Add to Cart
              </button>
              <button onclick="window.pfi.buyNow()" class="btn-cart py-3.5 text-sm" aria-label="Buy ${safeName} now — direct checkout">
                <i class="fas fa-bolt mr-2" aria-hidden="true"></i>Buy Now — Skip to Checkout
              </button>
              <!-- Social proof nudge below CTA -->
              ${p.total_orders > 3 ? `
              <div class="flex items-center justify-center gap-2 text-[10px] text-gray-500 pt-0.5" aria-label="Popularity indicator">
                <i class="fas fa-users text-brand-gold opacity-60" aria-hidden="true"></i>
                <span><strong class="text-gray-400">${p.total_orders}+ people</strong> have this on their wall</span>
              </div>` : ''}
            </div>

            <!-- BLOCK 6: Trust Bar -->
            <div class="grid grid-cols-3 gap-1.5 text-center text-[10px] text-gray-500 pt-1">
              <div class="bg-brand-card border border-gray-800 rounded-lg py-2 px-1">
                <i class="fas fa-shipping-fast text-brand-gold block mb-1 text-sm" aria-hidden="true"></i>
                <span>Free Delivery<br><span class="text-gray-600">above ₹799</span></span>
              </div>
              <div class="bg-brand-card border border-gray-800 rounded-lg py-2 px-1">
                <i class="fas fa-exchange-alt text-brand-gold block mb-1 text-sm" aria-hidden="true"></i>
                <span>Free Replace<br><span class="text-gray-600">if damaged</span></span>
              </div>
              <div class="bg-brand-card border border-gray-800 rounded-lg py-2 px-1">
                <i class="fas fa-shield-check text-brand-gold block mb-1 text-sm" aria-hidden="true"></i>
                <span>4K Verified<br><span class="text-gray-600">print quality</span></span>
              </div>
            </div>

            <!-- BLOCK 7: Verified & Upscaled badge -->
            <div class="flex items-start gap-2 bg-brand-gold/5 border border-brand-gold/20 rounded-xl p-3 text-xs text-gray-300">
              <i class="fas fa-shield-check text-brand-gold mt-0.5 flex-shrink-0" aria-hidden="true"></i>
              <span><strong class="text-brand-gold">Manually Verified &amp; AI-Upscaled:</strong> Every design is reviewed by our team and upscaled to 4K print resolution before dispatch.</span>
            </div>
          </div>
        </div>

        <!-- ===== BELOW THE FOLD — Full width sections ===== -->

        <!-- Buy More Save More (moved above fold for visibility) -->
        <section class="mt-10 pt-8 border-t border-gray-800" aria-labelledby="bundle-heading">
          <h2 id="bundle-heading" class="section-header">🎁 Buy More, Save More</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            ${[
              { qty: 2, label: 'Buy Any 2', save: '₹100 OFF', desc: 'Perfect pair for two rooms', badge: 'Good Deal', active: false },
              { qty: 3, label: 'Buy Any 3', save: '₹250 OFF', desc: 'Most popular bundle choice', badge: 'Best Value ⭐', active: true },
              { qty: 5, label: 'Buy 5+', save: '20% OFF', desc: 'Ideal for office or gifting', badge: 'Bulk Saver', active: false }
            ].map(b => `
            <div class="bundle-volume-card ${b.active?'active':''}" onclick="window.pfi.applyBundle(${b.qty})" role="button" tabindex="0" aria-label="${b.label}, save ${b.save}">
              <div class="text-xl font-bold text-brand-gold">${b.label}</div>
              <div class="text-brand-green font-bold text-sm mt-1">${b.save}</div>
              <div class="text-[10px] text-gray-500 mt-1">${b.desc}</div>
              <div class="mt-3"><span class="text-[10px] ${b.active?'bg-brand-gold text-black':'bg-white/5 text-gray-400'} px-3 py-1 rounded-full font-bold uppercase tracking-widest">${b.badge}</span></div>
            </div>`).join('')}
          </div>
        </section>

<<<<<<< HEAD
        <!-- Bulk / Corporate Orders -->
        <section class="mt-12 pt-12 border-t border-gray-800 text-center" aria-labelledby="corporate-heading">
          <div class="bg-gradient-to-br from-gray-900 to-black border border-brand-gold/20 rounded-2xl p-8 md:p-12 relative overflow-hidden">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(202,138,4,0.05)_0%,transparent_70%)]" aria-hidden="true"></div>
            <div class="relative z-10 max-w-2xl mx-auto">
              <div class="text-brand-gold text-xs font-bold uppercase tracking-widest mb-3">Premium Gifting & Wholesale</div>
              <h2 id="corporate-heading" class="text-3xl md:text-4xl font-bold text-white mb-4">Bulk & Corporate Orders</h2>
              <p class="text-gray-400 text-sm md:text-base leading-relaxed mb-8">Contact us directly for special pricing and priority production for bulk orders.</p>
              <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
                ${state.config.bulk_order_phone1 ? `
                <a href="tel:${escapeAttr(state.config.bulk_order_phone1)}" class="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-gold text-black font-bold px-8 py-4 rounded-xl hover:bg-yellow-400 transition shadow-lg shadow-yellow-900/20">
                  <i class="fas fa-phone"></i> Call ${escapeHTML(state.config.bulk_order_phone1)}
                </a>` : ''}
                ${state.config.bulk_order_phone2 ? `
                <a href="https://wa.me/91${escapeAttr(state.config.bulk_order_phone2.replace(/\D/g,''))}?text=Hi,%20I'm%20interested%20in%20Bulk/Corporate%20orders%20for%20${encodeURIComponent(safeName)}" target="_blank" class="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-green text-white font-bold px-8 py-4 rounded-xl hover:bg-green-600 transition shadow-lg shadow-green-900/20">
                  <i class="fab fa-whatsapp"></i> WhatsApp Quote
                </a>` : ''}
              </div>
              <p class="text-[10px] text-gray-500 mt-6 uppercase tracking-[0.2em]">Priority Production • Custom Branding • Pan-India Delivery</p>
            </div>
          </div>
        </section>

=======
        <!-- Why Buy -->
        <section class="mt-10 pt-8 border-t border-gray-800" aria-labelledby="why-buy-heading">
          <h2 id="why-buy-heading" class="section-header">Why ${escapeHTML(state.config.brand_name || 'PhotoFrameIn')}?</h2>
          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            ${[
              ['fa-print', 'Fine Art Print', '300gsm museum paper, UV-resistant pigment inks. Fade-proof 75+ years.'],
              ['fa-tree', 'Solid Wood Frame', 'Kiln-dried hardwood. No plastic, no MDF, no compromise.'],
              ['fa-shield-alt', 'Glass Protection', 'Anti-glare tempered glass, scratch-resistant.'],
              ['fa-thumbtack', 'Ready to Hang', 'Pre-drilled + mounting hardware included.']
            ].map(([icon, t, d]) => `
            <div class="bg-brand-card border border-gray-800 rounded-xl p-4 text-center">
              <i class="fas ${icon} text-brand-gold text-xl mb-2 block" aria-hidden="true"></i>
              <div class="font-bold text-sm text-white mb-1">${escapeHTML(t)}</div>
              <div class="text-xs text-gray-500 leading-relaxed">${escapeHTML(d)}</div>
            </div>`).join('')}
          </div>
        </section>

        <!-- Size Guide -->
        <section class="mt-10 pt-8 border-t border-gray-800" id="size-guide" aria-labelledby="size-guide-heading">
          <h2 id="size-guide-heading" class="section-header"><i class="fas fa-ruler-horizontal text-brand-gold mr-2" aria-hidden="true"></i>Size Guide</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-gray-400 border-separate border-spacing-0" aria-label="Frame size guide">
              <thead>
                <tr class="text-left">
                  <th class="py-2 px-3 text-gray-500 text-xs font-bold uppercase bg-black/30 rounded-tl-lg">Size</th>
                  <th class="py-2 px-3 text-gray-500 text-xs font-bold uppercase bg-black/30">Inches</th>
                  <th class="py-2 px-3 text-gray-500 text-xs font-bold uppercase bg-black/30">CM</th>
                  <th class="py-2 px-3 text-gray-500 text-xs font-bold uppercase bg-black/30 rounded-tr-lg">Best For</th>
                </tr>
              </thead>
              <tbody>
                ${[
                  ['Small', '8×12"', '20×30 cm', 'Desk, bedside table, shelves'],
                  ['Medium', '12×18"', '30×45 cm', 'Bedroom wall, study, office'],
                  ['Large', '18×24"', '45×60 cm', 'Living room, hallway feature'],
                  ['XL', '24×36"', '60×90 cm', 'Feature wall, gallery display']
                ].map(([s, i, c, b], idx, arr) => `
                <tr class="border-b ${idx < arr.length-1 ? 'border-gray-800' : 'border-transparent'}">
                  <td class="py-3 px-3 font-bold text-white">${s}</td>
                  <td class="py-3 px-3">${i}</td>
                  <td class="py-3 px-3">${c}</td>
                  <td class="py-3 px-3 text-gray-500">${b}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </section>

        <!-- Design Previews -->
        ${images.length > 1 ? `
        <section class="mt-10 pt-8 border-t border-gray-800" aria-labelledby="design-previews-heading">
          <h2 id="design-previews-heading" class="section-header">Design Previews</h2>
          <p class="text-xs text-gray-500 mb-4">Each design is manually reviewed and AI-upscaled to 4K print quality before dispatch.</p>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            ${images.map(img => `
            <button class="relative overflow-hidden rounded-xl border border-gray-800 hover:border-brand-gold transition group" onclick="window.pfi.setMainImage('${escapeAttr(img.image_url)}', document.getElementById('main-image'));window.scrollTo({top:0,behavior:'smooth'})" aria-label="View this design">
              <img src="${escapeAttr(img.image_url)}" alt="${safeName} design preview" class="w-full h-36 object-cover group-hover:scale-105 transition duration-300" loading="lazy">
              <div class="absolute inset-0 bg-brand-gold/0 group-hover:bg-brand-gold/10 transition rounded-xl flex items-center justify-center">
                <span class="opacity-0 group-hover:opacity-100 text-xs font-bold text-white bg-black/60 px-2 py-1 rounded transition">Select ↑</span>
              </div>
            </button>`).join('')}
          </div>
        </section>` : ''}

>>>>>>> 65ea1ec31a58a4dda75497e50803c6f95dbc4868
        <!-- Reviews -->
        ${reviews.length > 0 ? `
        <section class="mt-10 pt-8 border-t border-gray-800" aria-labelledby="reviews-heading">
          <h2 id="reviews-heading" class="section-header">⭐ Customer Reviews (${reviews.length})</h2>
          <div class="grid md:grid-cols-2 gap-4">
            ${reviews.slice(0, 6).map(r => {
              const safeName2 = escapeHTML(r.customer_name || 'Customer');
              const safeTitle = escapeHTML(r.title || '');
              const safeBody = escapeHTML(r.body || '');
              const safeRating = Math.min(5, Math.max(0, Number(r.rating)||0));
              return `
              <article class="bg-brand-card border border-gray-800 rounded-xl p-4" aria-label="Review by ${safeName2}">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <span class="font-bold text-sm text-white">${safeName2}</span>
                    <div class="stars text-xs mt-0.5" aria-label="${safeRating} stars">${'★'.repeat(safeRating)}${'☆'.repeat(5-safeRating)}</div>
                  </div>
                  <span class="text-xs text-gray-600">${new Date(r.created_at).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</span>
                </div>
                ${safeTitle ? `<p class="font-semibold text-sm mb-1">${safeTitle}</p>` : ''}
                ${safeBody ? `<p class="text-sm text-gray-400 leading-relaxed">${safeBody}</p>` : ''}
              </article>`;
            }).join('')}
          </div>
        </section>` : ''}

        <!-- FAQ -->
        <section class="mt-10 pt-8 border-t border-gray-800" aria-labelledby="faq-heading">
          <h2 id="faq-heading" class="section-header">Questions? Answered.</h2>
          <div class="space-y-2">
            ${[
              ['Will it break during delivery?', 'No. Every frame is packed with corner protectors and double-layer bubble wrap. If it arrives damaged — record the unboxing and WhatsApp us for a free replacement within 24 hours.'],
              ['How long does delivery take?', '3–5 business days across India. 1–2 days in Hyderabad metro. You get a tracking link once dispatched.'],
              ['Is COD available?', 'Yes, for orders ₹899–₹1995. ₹49 handling fee applies. We\u2019ll call to confirm your order within 24 hours.'],
              ['What paper and ink is used?', '300gsm museum-grade fine art paper with 12-colour professional pigment inks. UV-resistant and fade-proof for 75+ years.'],
              ['What if I don\u2019t like it?', 'We do not accept returns on custom prints. But if there\u2019s a damage or print error, we replace it free — just WhatsApp us with the unboxing video.'],
              ['Can I upload my own photo?', 'Yes! Use our Custom Frame option — upload your photo, choose size and frame, and we\u2019ll print and deliver it to you.']
            ].map(([q, a]) => `
            <details class="bg-brand-card border border-gray-800 rounded-lg group">
              <summary class="p-4 cursor-pointer font-semibold text-sm hover:text-brand-gold transition list-none flex justify-between items-center">
                <span>${escapeHTML(q)}</span><i class="fas fa-chevron-down text-gray-500 text-xs group-open:rotate-180 transition-transform" aria-hidden="true"></i>
              </summary>
              <div class="px-4 pb-4 text-sm text-gray-400 leading-relaxed border-t border-gray-800 pt-3">${escapeHTML(a)}</div>
            </details>`).join('')}
          </div>
        </section>

        <!-- Urgency -->
        <section class="mt-8" aria-label="Limited stock notice">
          <div class="bg-gradient-to-r from-red-900/30 to-brand-card border border-red-800/50 rounded-xl p-5 text-center">
            <p class="text-base font-bold text-brand-red"><i class="fas fa-fire mr-2" aria-hidden="true"></i>${escapeHTML(state.config.urgency_text || 'Limited Stock — Order Today')}</p>
            <p class="text-xs text-gray-400 mt-1">${escapeHTML(state.config.urgency_subtext || 'Prices may increase soon. Lock in your price now.')}</p>
          </div>
        </section>

        <!-- You May Also Like -->
        ${data.youMayAlsoLike?.length ? `
        <section class="mt-10 pt-8 border-t border-gray-800" aria-labelledby="ymal-heading">
          <h2 id="ymal-heading" class="section-header">You May Also Like</h2>
          <div class="product-grid">${data.youMayAlsoLike.map(yp => renderProductCard(yp)).join('')}</div>
        </section>` : ''}
      </main>` + renderFooter();

      window._currentProduct = p;
      window._currentVariant = dv;
      updateCartBadge();
      trackFunnelEvent('view_product', p.id, null, { name: p.name, slug: p.slug });

      // ── Dispatch countdown timer ──────────────────────────────────────
      (function initDispatchTimer() {
        const el = document.getElementById('dispatch-timer');
        if (!el) return;
        // Cutoff: 5:30 PM IST = 12:00 UTC. If past cutoff, show "tomorrow"
        function update() {
          const now = new Date();
          const istOffsetMs = 5.5 * 3600 * 1000;
          const ist = new Date(now.getTime() + istOffsetMs - (now.getTimezoneOffset() * 60000));
          const cutoffH = 17, cutoffM = 30;
          const cutoffMs = (cutoffH * 3600 + cutoffM * 60) * 1000;
          const nowMs = (ist.getUTCHours() * 3600 + ist.getUTCMinutes() * 60 + ist.getUTCSeconds()) * 1000;
          const remaining = cutoffMs - nowMs;
          if (remaining <= 0) {
            // Past cutoff — rewrite the whole urgency line
            const urgEl = document.getElementById('dispatch-urgency');
            if (urgEl) {
              urgEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block flex-shrink-0" aria-hidden="true"></span>
                <span class="text-gray-400">Next dispatch: <strong class="text-white">Tomorrow morning</strong> — order now to be first in queue</span>`;
            }
          } else {
            const h = Math.floor(remaining / 3600000);
            const m = Math.floor((remaining % 3600000) / 60000);
            const s = Math.floor((remaining % 60000) / 1000);
            el.textContent = h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
          }
        }
        update();
        const t = setInterval(() => { if (!document.getElementById('dispatch-timer')) { clearInterval(t); return; } update(); }, 1000);
      })();

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
                <div class="text-[10px] font-bold text-brand-gold uppercase tracking-widest mb-1">Poster Add-on</div>
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

      <!-- Poster Add-on in Cart -->
      ${state.config.poster_enabled === 'true' && !state.cart.some(i => i.isPosterAddon) ? `
      <div class="poster-addon-upsell mb-8" id="cart-poster-addon" role="group" aria-label="Optional poster print add-on">
        <div class="poster-addon-header">
          <div class="poster-addon-badge">POPULAR ADD-ON</div>
          <div class="flex-1">
            <div class="font-bold text-white text-sm">Add a Poster Print for ₹199</div>
            <div class="text-xs text-gray-400 mt-0.5">High-quality A3 rolled poster — great for gifting or a second display spot</div>
          </div>
          <label class="flex items-center gap-2 cursor-pointer ml-2" for="cart-poster-cb">
            <div class="relative">
              <input type="checkbox" id="cart-poster-cb" class="sr-only peer" aria-label="Add poster print add-on for ₹199" ${state.cart.some(i=>i.isPosterAddon)?'checked':''} onchange="window.pfi.toggleCartPoster(this.checked)">
              <div class="w-11 h-6 bg-gray-700 peer-checked:bg-brand-gold rounded-full transition-colors"></div>
              <div class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
            </div>
            <span class="text-sm font-bold text-brand-gold peer-checked:text-brand-green">+₹199</span>
          </label>
        </div>
      </div>` : state.cart.some(i => i.isPosterAddon) ? `
      <div class="bg-brand-green/10 border border-brand-green/30 rounded-xl p-3 mb-6 flex items-center gap-3">
        <i class="fas fa-check-circle text-brand-green text-lg" aria-hidden="true"></i>
        <div class="flex-1">
          <div class="text-sm font-bold text-brand-green">Poster Print Add-on Added ✓</div>
          <div class="text-xs text-gray-400">A3 rolled poster print included</div>
        </div>
        <button onclick="window.pfi.toggleCartPoster(false)" class="text-xs text-gray-500 hover:text-red-400 transition">Remove</button>
      </div>` : ''}

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
        <div class="flex justify-between text-sm text-gray-400">
          <span>Shipping <span class="text-[10px] text-gray-600">(~${getCartVolumetricWeight().toFixed(1)} kg vol.)</span></span>
          <span class="${shipping===0?'text-brand-green font-bold':''}">${shipping===0?'FREE':formatPrice(shipping)}</span>
        </div>
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
  const CATEGORY_META = {
    divine: {
      title: 'Divine Art Frames',
      subtitle: 'Sacred art for sacred spaces — Ganesha, Shiva, Hanuman, Krishna & Rama',
      emoji: '🕉️',
      color: '#FF7A1A',
      gradient: 'from-orange-950/60 via-brand-card to-brand-card',
      border: 'border-orange-900/40',
      tags: ['Ganesha', 'Shiva', 'Hanuman', 'Krishna', 'Rama'],
      desc: 'Premium framed divine art — perfect for home mandir, living room blessings or gifting.',
      seoTitle: 'Divine Art Frames | Ganesha, Shiva, Hanuman, Krishna, Rama — PhotoFrameIn',
      badge: '🙏 Pooja Room Essential',
      cta: 'Gift a Blessing',
      trustMsg: '📦 Special occasion gift packaging available'
    },
    automotive: {
      title: 'Automotive Art Frames',
      subtitle: 'Cinematic car art — Porsche, Ferrari, hypercars & legends',
      emoji: '🏎️',
      color: '#FF4444',
      gradient: 'from-red-950/60 via-brand-card to-brand-card',
      border: 'border-red-900/40',
      tags: ['Porsche', 'Ferrari', 'Lamborghini', 'Hypercars', 'McLaren'],
      desc: 'High-detail automotive prints for man-caves, offices and garages. Cars that belong on your wall.',
      seoTitle: 'Automotive Art Frames | Porsche, Ferrari, Hypercars — PhotoFrameIn',
      badge: '🏆 Office & Man-Cave Bestseller',
      cta: 'Build Your Gallery Wall',
      trustMsg: '🚀 12-hour dispatch · Premium frames from ₹749'
    },
    motivation: {
      title: 'Motivation & Mindset Frames',
      subtitle: 'Words that fuel your daily drive',
      emoji: '💪',
      color: '#DAA520',
      gradient: 'from-yellow-950/50 via-brand-card to-brand-card',
      border: 'border-yellow-900/30',
      tags: ['Hustle', 'Success', 'Mindset', 'Quotes', 'Minimal'],
      desc: 'Motivational art for study rooms, home offices and gym walls.',
      seoTitle: 'Motivation Frames | Hustle & Mindset Wall Art — PhotoFrameIn',
      badge: '🔥 Study Room Favourite',
      cta: 'Fuel Your Ambition',
      trustMsg: '⚡ Free delivery on orders above ₹899'
    },
    sports: {
      title: 'Sports Art Frames',
      subtitle: 'Iconic moments, legendary athletes — framed forever',
      emoji: '⚽',
      color: '#22C55E',
      gradient: 'from-green-950/50 via-brand-card to-brand-card',
      border: 'border-green-900/30',
      tags: ['Cricket', 'Football', 'F1', 'Basketball', 'Champions'],
      desc: 'Sports wall art for fans, locker rooms and gaming setups.',
      seoTitle: 'Sports Art Frames | Cricket, Football, F1 — PhotoFrameIn',
      badge: '🏅 Fan Room Must-Have',
      cta: 'Celebrate Your Sport',
      trustMsg: '🎁 Perfect birthday gift for sports fans'
    }
  };

  async function renderCategoryPage(app, slug) {
    if (!slug || !/^[a-z0-9\-]{1,80}$/.test(slug)) { navigate('/shop'); return; }
    const meta = CATEGORY_META[slug] || {
      title: escapeHTML(slug.replace(/-/g,' ')) + ' Frames',
      subtitle: 'Handcrafted photo frames — designed for your space',
      emoji: '🖼️',
      color: '#DAA520',
      gradient: 'from-gray-900 via-brand-card to-brand-card',
      border: 'border-gray-800',
      tags: [],
      desc: 'Premium framed art delivered across India.',
      seoTitle: slug + ' Frames — PhotoFrameIn',
      badge: '✅ In Stock',
      cta: 'Shop Now',
      trustMsg: '📦 Free delivery above ₹899'
    };

    // Update page meta
    document.title = meta.seoTitle;

    app.innerHTML = renderHeader() + `
    <main id="main-content">

      <!-- Category Hero -->
      <section class="bg-gradient-to-b ${meta.gradient} border-b ${meta.border} py-12 md:py-16" aria-labelledby="cat-hero-heading">
        <div class="max-w-5xl mx-auto px-4 text-center">
          <div class="inline-flex items-center gap-2 bg-black/30 border border-white/10 rounded-full px-4 py-1.5 mb-4 text-xs font-bold uppercase tracking-widest" style="color:${meta.color}">
            ${meta.badge}
          </div>
          <h1 id="cat-hero-heading" class="text-4xl md:text-5xl font-bold font-display mb-4" style="color:${meta.color}">
            ${meta.emoji} ${meta.title}
          </h1>
          <p class="text-lg text-gray-300 mb-5 max-w-2xl mx-auto">${meta.subtitle}</p>
          <p class="text-sm text-gray-400 mb-7 max-w-xl mx-auto">${meta.desc}</p>

          ${meta.tags.length ? `
          <div class="flex flex-wrap justify-center gap-2 mb-7" role="list" aria-label="${meta.title} styles">
            ${meta.tags.map(t => `<span class="px-3 py-1.5 bg-black/40 border border-white/10 rounded-full text-xs font-bold text-gray-300" role="listitem">${t}</span>`).join('')}
          </div>` : ''}

          <!-- Volume discount CTA for category -->
          <div class="inline-flex flex-wrap items-center justify-center gap-4 bg-black/30 border border-white/10 rounded-2xl px-6 py-3 text-sm">
            <span class="text-gray-400 font-bold uppercase tracking-widest text-xs">Buy More Save More:</span>
            <span class="text-white">2 → <strong class="text-green-400">₹100 OFF</strong></span>
            <span class="text-white">3 → <strong class="text-green-400">₹250 OFF</strong></span>
            <span class="text-white">5+ → <strong class="text-green-400">20% OFF</strong></span>
          </div>
          <p class="text-xs text-gray-500 mt-4">${meta.trustMsg}</p>
        </div>
      </section>

      <!-- Products Grid -->
      <section class="max-w-7xl mx-auto px-4 py-10" aria-labelledby="cat-products-heading">
        <div class="flex items-center justify-between mb-6">
          <h2 id="cat-products-heading" class="text-xl font-bold">${meta.title}</h2>
          <button onclick="window.pfi.nav('/customize')" class="text-brand-gold text-sm font-bold hover:underline" aria-label="Create custom frame">✨ Custom Frame →</button>
        </div>
        <div id="shop-grid" class="product-grid" aria-live="polite">
          ${[1,2,3,4,5,6,7,8].map(() => `<div class="product-card"><div class="skeleton h-64" aria-hidden="true"></div></div>`).join('')}
        </div>
      </section>

      <!-- Cross-sell CTA -->
      <section class="max-w-5xl mx-auto px-4 pb-16">
        <div class="bg-gradient-to-r from-brand-card via-brand-card/80 to-brand-card border border-gray-800 rounded-2xl p-8 text-center">
          <h3 class="text-xl font-bold mb-2">Can't find your perfect design?</h3>
          <p class="text-gray-400 text-sm mb-5">Upload any image — we'll frame it in 12 hours.</p>
          <div class="flex flex-wrap justify-center gap-3">
            <button onclick="window.pfi.nav('/customize')" class="btn-buy max-w-xs" aria-label="Create custom frame">Upload Custom Photo</button>
            <button onclick="window.pfi.nav('/shop')" class="btn-cart max-w-xs" aria-label="Browse all frames">Browse All Frames</button>
          </div>
        </div>
      </section>
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
        grid.innerHTML = `<div class="col-span-full py-20 text-center">
          <div class="text-5xl mb-4">${meta.emoji}</div>
          <p class="text-gray-400 mb-2 text-lg font-bold">Coming Soon!</p>
          <p class="text-gray-500 text-sm mb-6">New ${meta.title} arriving soon. Browse our full collection in the meantime.</p>
          <button onclick="window.pfi.nav('/shop')" class="btn-buy max-w-xs mx-auto">${meta.cta}</button>
        </div>`;
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
            ${subtotal >= parseInt(state.config.cod_min_value||'899') && subtotal <= parseInt(state.config.cod_max_value||'1995') && !state.cart.some(i=>i.is_custom_frame) ? `
            <label class="payment-option" id="cod-label" role="radio">
              <input type="radio" name="payment" value="cod" class="accent-orange-400" aria-label="Cash on delivery">
              <div class="flex-1">
                <div class="font-bold text-white">Cash on Delivery</div>
                <div class="text-xs text-gray-400 mt-0.5">₹${state.config.cod_fee||49} COD fee · Orders ₹${state.config.cod_min_value||899}–₹${state.config.cod_max_value||1995} · WhatsApp confirmation within 24h</div>
              </div>
            </label>` : state.cart.some(i=>i.is_custom_frame) ? `
            <div id="cod-unavailable-msg" class="p-3.5 border border-brand-saffron/30 rounded-xl bg-brand-saffron/5 text-sm">
              <div class="font-bold text-brand-saffron mb-1"><i class="fas fa-exclamation-triangle mr-2" aria-hidden="true"></i>COD not available for Custom Frames</div>
              <div class="text-xs text-gray-400">Custom orders require prepaid payment — already selected above.</div>
            </div>` : `
            <div id="cod-unavailable-msg" class="p-4 border border-brand-gold/25 rounded-xl bg-brand-gold/5">
              <div class="font-bold text-white text-sm mb-1"><i class="fas fa-info-circle text-brand-gold mr-2" aria-hidden="true"></i>COD not available for this order</div>
              <div class="text-xs text-gray-400 mb-3">Cash on Delivery is available for orders between ₹${state.config.cod_min_value||899}–₹${state.config.cod_max_value||1995}.</div>
              <div class="flex items-center gap-3 bg-brand-green/10 border border-brand-green/30 rounded-lg px-3 py-2.5">
                <div class="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center flex-shrink-0">
                  <i class="fas fa-tag text-brand-green text-sm" aria-hidden="true"></i>
                </div>
                <div class="flex-1">
                  <div class="text-xs font-bold text-brand-green">Pay via Prepaid &amp; Get ₹50 Instant Discount</div>
                  <div class="text-[10px] text-gray-400 mt-0.5">UPI · Card · Net Banking — already applied above ✓</div>
                </div>
                <span class="text-brand-green text-sm font-black">–₹50</span>
              </div>
            </div>`}
          </div>
        </fieldset>

        <!-- Coupon Code -->
        <div class="flex gap-2">
          <label for="coupon-input" class="sr-only">Coupon code</label>
          <input type="text" id="coupon-input" placeholder="Coupon Code (e.g. WELCOME10)" class="form-input flex-1" autocapitalize="characters" aria-label="Enter coupon code">
          <button type="button" onclick="window.pfi.applyCoupon()" class="btn-gold !py-3 !px-4 !text-sm whitespace-nowrap" aria-label="Apply coupon code">Apply</button>
        </div>
        <div id="coupon-result" aria-live="polite"></div>

        <!-- Delivery disclaimer -->
        <div class="bg-brand-card border border-gray-800 rounded-xl p-4 text-xs text-gray-400">
          <i class="fas fa-truck mr-1 text-brand-gold" aria-hidden="true"></i>
          <strong class="text-gray-300">Delivery:</strong> 3–5 business days via Shiprocket/DTDC/Delhivery. Delivery timelines are estimates and subject to carrier operations. PhotoFrameIn is not liable for delays caused by the carrier. Tracking link will be shared after dispatch.
        </div>
        <div class="text-center text-xs text-gray-500 px-2 mt-1">
          By placing this order you agree to our <a href="/policy/returns" onclick="window.pfi.nav('/policy/returns');return false;" class="text-gray-400 hover:text-brand-gold underline underline-offset-2">Returns &amp; COD Policy</a> and <a href="/policy/privacy" onclick="window.pfi.nav('/policy/privacy');return false;" class="text-gray-400 hover:text-brand-gold underline underline-offset-2">Privacy Policy</a>.
        </div>

        <button type="submit" id="place-order-btn" class="btn-buy py-5 text-lg" aria-label="Place your order">
          <i class="fas fa-lock mr-2" aria-hidden="true"></i>PAY NOW — ${formatPrice(Math.max(0,displayTotal-50))}
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
            // Replace COD label with a nudge card instead of silently hiding
            codLabel.outerHTML = `
              <div id="cod-unavailable-msg" class="p-4 border border-brand-gold/25 rounded-xl bg-brand-gold/5">
                <div class="font-bold text-white text-sm mb-1"><i class="fas fa-map-marker-alt text-brand-gold mr-2"></i>COD not available for this pincode</div>
                <div class="text-xs text-gray-400 mb-3">Your delivery area doesn't support Cash on Delivery right now.</div>
                <div class="flex items-center gap-3 bg-brand-green/10 border border-brand-green/30 rounded-lg px-3 py-2.5">
                  <div class="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-tag text-brand-green text-sm"></i>
                  </div>
                  <div class="flex-1">
                    <div class="text-xs font-bold text-brand-green">Pay via Prepaid &amp; Get ₹50 Instant Discount</div>
                    <div class="text-[10px] text-gray-400 mt-0.5">UPI · Card · Net Banking — already selected ✓</div>
                  </div>
                  <span class="text-brand-green text-sm font-black">–₹50</span>
                </div>
              </div>`;
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
        const btnLabel = payment === 'cod' ? `<i class="fas fa-lock mr-2"></i>PLACE ORDER — ${formatPrice(Math.max(0,displayTotal))}` : `<i class="fas fa-lock mr-2"></i>PAY NOW — ${formatPrice(Math.max(0,displayTotal-50))}`;
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
          if (btn) { btn.disabled = false; btn.innerHTML = btnLabel; }
          return;
        }
        if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g,''))) {
          toast('Please enter a valid 10-digit Indian mobile number', 'error');
          if (btn) { btn.disabled = false; btn.innerHTML = btnLabel; }
          return;
        }
        if (!/^[1-9]\d{5}$/.test(pincode)) {
          toast('Please enter a valid 6-digit pincode', 'error');
          if (btn) { btn.disabled = false; btn.innerHTML = btnLabel; }
          return;
        }

        const payload = {
          items: state.cart.map(i => ({ variantId: i.variantId, quantity: i.quantity||1, price: i.price, name: i.name, size: i.size, frame: i.frame, image: i.imageUrl || i.image, isPosterAddon: i.isPosterAddon || false })),
          customer: { name, email, phone },
          address: { name, line1: address1, line2: fd.get('address2')||'', city, state: state2, pincode },
          paymentMethod: payment,
          couponCode: window._appliedCoupon || null,
          checkoutSource: 'custom',
          utm_source: localStorage.getItem('utm_source'),
          utm_medium: localStorage.getItem('utm_medium'),
          utm_campaign: localStorage.getItem('utm_campaign')
        };

        try {
          // ── COD: direct order create ─────────────────────────────────────
          if (payment === 'cod') {
            const res = await fetch(`${API}/orders/create`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
            const data = await res.json();
            if (data.success) {
              trackFunnelEvent('purchase', null, data.orderId, { total: data.total, payment_method: 'cod' });
              state.cart = []; saveCart(); updateCartBadge();
              renderSuccess(app, data.orderId, data.total, data.whatsappUrl, true);
            } else {
              throw new Error(data.error || 'Order failed');
            }
            return;
          }

          // ── PREPAID: Razorpay gateway flow ───────────────────────────────
          // Step 1: Create pending order in our DB first
          if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating order...';
          const orderRes = await fetch(`${API}/orders/create`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ ...payload, paymentMethod: 'prepaid', status: 'pending_payment' })
          });
          const orderData = await orderRes.json();
          if (!orderData.success && !orderData.orderId) throw new Error(orderData.error || 'Failed to create order');
          const internalOrderId = orderData.orderId;

          // Step 2: Create Razorpay order
          if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Opening payment...';
          const rzpRes = await fetch(`${API}/checkout/create-razorpay-order`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ orderId: internalOrderId, amount: Math.max(0, displayTotal - 50) })
          });
          const rzpData = await rzpRes.json();
          if (!rzpData.orderId) throw new Error(rzpData.error || 'Payment gateway error');

          // Step 3: Load Razorpay SDK if not already loaded
          await new Promise((resolve, reject) => {
            if (window.Razorpay) { resolve(); return; }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load payment gateway. Check your internet connection.'));
            document.head.appendChild(script);
          });

          // Step 4: Open Razorpay checkout modal
          const razorpay = new window.Razorpay({
            key: rzpData.key,
            amount: rzpData.amount,
            currency: rzpData.currency || 'INR',
            name: state.config.brand_name || 'PhotoFrameIn',
            description: `Order ${internalOrderId}`,
            order_id: rzpData.orderId,
            prefill: { name, email, contact: phone },
            theme: { color: '#DAA520' },
            modal: {
              ondismiss() {
                toast('Payment cancelled. Your order is saved — try again anytime.', 'error');
                if (btn) { btn.disabled = false; btn.innerHTML = btnLabel; }
              }
            },
            handler: async (response) => {
              // Step 5: Verify payment on server
              try {
                if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Verifying payment...'; }
                const verifyRes = await fetch(`${API}/checkout/verify-payment`, {
                  method: 'POST',
                  headers: {'Content-Type':'application/json'},
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    orderId: internalOrderId
                  })
                });
                const verifyData = await verifyRes.json();
                if (verifyData.success) {
                  trackFunnelEvent('purchase', null, internalOrderId, { total: Math.max(0,displayTotal-50), payment_method: 'prepaid', payment_id: response.razorpay_payment_id });
                  state.cart = []; saveCart(); updateCartBadge();
                  renderSuccess(app, internalOrderId, Math.max(0,displayTotal-50), null, false);
                } else {
                  throw new Error(verifyData.error || 'Payment verification failed');
                }
              } catch (verErr) {
                toast('Payment received but verification failed. Please WhatsApp us with payment ID: ' + response.razorpay_payment_id, 'error');
                if (btn) { btn.disabled = false; btn.innerHTML = btnLabel; }
              }
            }
          });
          razorpay.open();

        } catch (err) {
          toast('Error: ' + (err.message || 'Please try again'), 'error');
          if (btn) { btn.disabled = false; btn.innerHTML = btnLabel; }
        }
      });

      // Update button label on payment method change
      $$('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', () => {
          const btn2 = $('#place-order-btn');
          if (!btn2) return;
          if (radio.value === 'cod') {
            btn2.innerHTML = `<i class="fas fa-lock mr-2"></i>PLACE COD ORDER — ${formatPrice(Math.max(0,displayTotal))}`;
          } else {
            btn2.innerHTML = `<i class="fas fa-lock mr-2"></i>PAY NOW — ${formatPrice(Math.max(0,displayTotal-50))}`;
          }
        });
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
        <p class="text-gray-400">Your frame contains glass. Please <strong class="text-white">film your unboxing</strong> for damage protection — claims without video cannot be processed. For disputes: <a href="https://wa.me/918333066370" target="_blank" rel="noopener noreferrer" class="text-brand-gold hover:underline">WhatsApp us</a>.</p>
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
      <p class="text-center text-xs text-gray-600 mt-4">Having trouble? <a href="https://wa.me/918333066370" target="_blank" rel="noopener noreferrer" class="text-brand-gold hover:underline">Contact us on WhatsApp</a></p>
    </main>` + renderFooter();

    updateCartBadge();
    if (orderId) window.pfi.trackOrder();
  }

  // ─── RETURNS PAGE ─────────────────────────────────────────────────────────
  function renderReturnsPage(app) {
    const waNumber = '918333066370';
    const waMsg = encodeURIComponent('Hi, I received a damaged item from PhotoFrameIn. My order ID is: [ORDER_ID]. Please help.');
    const waLink = `https://wa.me/${waNumber}?text=${waMsg}`;
    app.innerHTML = renderHeader() + `
    <main id="main-content" class="max-w-2xl mx-auto px-4 py-12">
      <h1 class="text-2xl font-bold mb-6 font-display"><i class="fas fa-exchange-alt mr-2" aria-hidden="true"></i>Returns &amp; Damage Claims</h1>

      <!-- No Returns Policy -->
      <div class="bg-brand-card border border-red-900/40 rounded-xl p-6 mb-6">
        <h2 class="font-bold text-lg mb-3 text-brand-red"><i class="fas fa-ban mr-2" aria-hidden="true"></i>No Returns Policy</h2>
        <p class="text-gray-300 text-sm leading-relaxed mb-3">All sales are final. We do not accept returns or exchanges for change-of-mind, incorrect size selection, or custom/personalised orders.</p>
        <p class="text-gray-300 text-sm leading-relaxed">Our frames are made to order — each piece is custom-printed and assembled specifically for your order. Please review size guides and descriptions carefully before purchasing.</p>
      </div>

      <!-- Delivery Responsibility -->
      <div class="bg-brand-card border border-yellow-900/40 rounded-xl p-6 mb-6">
        <h2 class="font-bold text-base mb-2 text-yellow-400"><i class="fas fa-truck mr-2" aria-hidden="true"></i>Delivery Responsibility</h2>
        <p class="text-gray-300 text-sm leading-relaxed">Once dispatched, delivery is handled by third-party logistics partners (Shiprocket/DTDC/Delhivery). PhotoFrameIn is not responsible for delays caused by the carrier, incorrect address provided by the customer, or customs/weather events. Estimated delivery: 3–5 business days.</p>
      </div>

      <!-- Damage Claim via WhatsApp -->
      <div class="bg-brand-card border border-green-900/40 rounded-xl p-6 mb-6">
        <h2 class="font-bold text-base mb-3 text-brand-green"><i class="fas fa-box-open mr-2" aria-hidden="true"></i>Received a Damaged Item?</h2>
        <div class="custom-warning mb-4" role="note"><i class="fas fa-video mr-2" aria-hidden="true"></i>Unboxing video is <strong>required</strong> for all damage claims. Claims without an unboxing video cannot be processed.</div>
        <ol class="space-y-2 text-sm text-gray-300 mb-5">
          <li class="flex items-start gap-2"><span class="text-brand-gold font-bold w-5 flex-shrink-0">1.</span>Record an unboxing video clearly showing the package seal and damage.</li>
          <li class="flex items-start gap-2"><span class="text-brand-gold font-bold w-5 flex-shrink-0">2.</span>Upload your video to Google Drive or YouTube.</li>
          <li class="flex items-start gap-2"><span class="text-brand-gold font-bold w-5 flex-shrink-0">3.</span>Contact us on WhatsApp with your Order ID and video link. We respond within 24 hours.</li>
        </ol>
        <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-4 rounded-xl transition" aria-label="Report damage on WhatsApp">
          <i class="fab fa-whatsapp text-xl" aria-hidden="true"></i>Report Damage on WhatsApp
        </a>
      </div>

      <div class="text-sm text-gray-400"><a href="/policy/returns" onclick="window.pfi.nav('/policy/returns');return false;" class="text-brand-gold hover:underline">View full Returns Policy →</a></div>
    </main>` + renderFooter();
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

  function renderReviewPage(app) {
    const params = new URLSearchParams(location.search);
    const prefillOrderId = (params.get('order') || '').replace(/[^a-zA-Z0-9\-]/g, '').slice(0, 30);
    const reviewPhotoEnabled = state.config.review_photo_enabled !== 'false';

    app.innerHTML = renderHeader() + `
    <main id="main-content" class="max-w-xl mx-auto px-4 py-16">
      <div class="text-center mb-8">
        <div class="text-4xl mb-3" aria-hidden="true">⭐</div>
        <h1 class="text-2xl font-bold font-display mb-2">Leave a Review</h1>
        <p class="text-gray-400 text-sm">Share your experience to help other customers — and help us improve!</p>
      </div>
      <div class="bg-brand-card border border-gray-800 rounded-2xl p-8 space-y-5">
        <!-- Order ID verification — required to prevent fake reviews -->
        <div>
          <label for="review-order-id" class="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
            Order ID <span class="text-brand-red text-xs">* Required</span>
          </label>
          <input type="text" id="review-order-id" value="${escapeAttr(prefillOrderId)}" placeholder="e.g. PFI-20260519-001 (from your order confirmation)" class="form-input w-full font-mono" maxlength="40" aria-required="true" autocomplete="off">
          <p class="text-[10px] text-gray-600 mt-1"><i class="fas fa-info-circle mr-1"></i>Your Order ID is in your confirmation email or WhatsApp message. We verify every review to ensure authenticity.</p>
        </div>

        <div>
          <label class="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Rating *</label>
          <div class="flex gap-3" id="star-rating" role="group" aria-label="Rating">
            ${[1,2,3,4,5].map(n => `
            <button type="button" class="text-3xl text-gray-700 hover:text-brand-gold transition star-btn" data-val="${n}" onclick="window.pfi.setReviewStar(${n})" aria-label="${n} star${n>1?'s':''}" aria-pressed="false">★</button>`).join('')}
          </div>
        </div>
        <div>
          <label for="review-name" class="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Your Name *</label>
          <input type="text" id="review-name" placeholder="Name shown publicly" class="form-input w-full" maxlength="100" aria-required="true">
        </div>
        <div>
          <label for="review-title" class="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Review Title <span class="text-gray-600 normal-case">(optional)</span></label>
          <input type="text" id="review-title" placeholder="e.g. Perfect gift, beautiful quality" class="form-input w-full" maxlength="200">
        </div>
        <div>
          <label for="review-body" class="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Your Review <span class="text-gray-600 normal-case">(optional)</span></label>
          <textarea id="review-body" rows="4" placeholder="Tell others about your experience — frame quality, delivery, packaging..." class="form-input w-full resize-none" maxlength="2000"></textarea>
        </div>
        ${reviewPhotoEnabled ? `
        <div>
          <label class="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Add a Photo <span class="text-gray-600 normal-case">(optional)</span></label>
          <div id="review-photo-zone" class="border border-dashed border-gray-700 rounded-xl p-4 text-center cursor-pointer hover:border-brand-gold transition" onclick="document.getElementById('review-photo-input').click()">
            <i class="fas fa-camera text-2xl text-gray-600 mb-1 block" aria-hidden="true"></i>
            <p class="text-xs text-gray-500">Click to upload a photo of your frame (JPG/PNG, max 10MB)</p>
            <div id="review-photo-preview" class="hidden mt-3"><img id="review-photo-img" src="" class="max-h-40 mx-auto rounded-xl border border-gray-700" alt="Review photo preview"></div>
          </div>
          <input type="file" id="review-photo-input" class="hidden" accept="image/jpeg,image/png,image/webp" aria-label="Upload review photo">
        </div>` : ''}
        <button onclick="window.pfi.submitReview()" class="btn-buy w-full py-4">
          <i class="fas fa-paper-plane mr-2" aria-hidden="true"></i>Submit Review
        </button>
        <p class="text-xs text-gray-500 text-center">Reviews with a valid Order ID are prioritised for approval. Typically published within 24 hours.</p>
        <div id="review-result" aria-live="polite"></div>
      </div>
    </main>` + renderFooter();

    // Star interaction
    window._reviewRating = 0;
    updateCartBadge();

    // Photo preview
    const photoInput = document.getElementById('review-photo-input');
    if (photoInput) {
      photoInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { toast('Only JPG/PNG/WEBP supported', 'error'); return; }
        if (file.size > 10485760) { toast('Photo too large. Max 10MB.', 'error'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const preview = document.getElementById('review-photo-preview');
          const img = document.getElementById('review-photo-img');
          if (preview) preview.classList.remove('hidden');
          if (img) img.src = ev.target.result;
          window._reviewPhotoFile = file;
        };
        reader.readAsDataURL(file);
      };
    }
  }

  function renderSuggestPage(app) {
    const params = new URLSearchParams(location.search);
    const prefillOrder = (params.get('order') || '').replace(/[^a-zA-Z0-9\-]/g, '').slice(0, 30);
    app.innerHTML = renderHeader() + `
    <main id="main-content" class="max-w-xl mx-auto px-4 py-16">
      <div class="text-center mb-8">
        <div class="text-4xl mb-3" aria-hidden="true">💡</div>
        <h1 class="text-2xl font-bold font-display mb-2">Suggest a Design</h1>
        <p class="text-gray-400 text-sm">Have an idea for a frame or design? We'd love to hear it! Customer suggestions are prioritised.</p>
      </div>
      <div class="bg-brand-card border border-gray-800 rounded-2xl p-8 space-y-4">
        <div>
          <label for="suggest-order-id" class="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
            Order ID <span class="text-gray-500 normal-case font-normal">(optional — helps us prioritise your suggestion)</span>
          </label>
          <input type="text" id="suggest-order-id" value="${escapeAttr(prefillOrder)}" placeholder="e.g. PFI-20260519-001 (from your confirmation email)" class="form-input w-full font-mono" maxlength="40">
          <p class="text-[10px] text-gray-600 mt-1">Suggestions from verified customers are prioritised for the next collection.</p>
        </div>
        <div>
          <label for="suggest-msg" class="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Your Suggestion *</label>
          <textarea id="suggest-msg" rows="4" placeholder="e.g. A Virat Kohli celebration frame, or a minimalist mountain landscape..." class="form-input w-full resize-none" maxlength="1000" aria-required="true"></textarea>
        </div>
        <div>
          <label for="suggest-name" class="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Your Name <span class="text-gray-600 normal-case">(optional)</span></label>
          <input type="text" id="suggest-name" placeholder="Name" class="form-input w-full" maxlength="100">
        </div>
        <div>
          <label for="suggest-email" class="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Email <span class="text-gray-600 normal-case">(optional — we'll notify you when it's added)</span></label>
          <input type="email" id="suggest-email" placeholder="email@example.com" class="form-input w-full" maxlength="200">
        </div>
        <div>
          <label for="suggest-phone" class="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Phone <span class="text-gray-600 normal-case">(optional)</span></label>
          <input type="tel" id="suggest-phone" placeholder="10-digit mobile" class="form-input w-full" maxlength="15" inputmode="numeric">
        </div>
        <button onclick="window.pfi.submitSuggestion()" class="btn-buy w-full py-4">
          <i class="fas fa-paper-plane mr-2" aria-hidden="true"></i>Send Suggestion
        </button>
        <div id="suggest-result" aria-live="polite"></div>
      </div>
    </main>` + renderFooter();
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
      if (!data.posts?.length) {
        // Static SEO posts shown while DB blog is empty
        const staticPosts = [
          { title: '10 Stunning Ways to Decorate Your Home with Framed Art', slug: '#', excerpt: 'Transform any room with the right frame. From minimalist gallery walls to bold statement pieces — discover our top picks for Indian homes.', category: 'Decor Tips', emoji: '🖼️' },
          { title: 'Best Frame Sizes for Every Room — A Complete Guide', slug: '#', excerpt: 'Not sure which size to pick? Our room-by-room guide helps you choose the perfect frame size for your bedroom, living room, and home office.', category: 'Size Guide', emoji: '📐' },
          { title: 'Why Custom Photo Frames Make the Best Gifts in India', slug: '#', excerpt: 'Birthdays, anniversaries, housewarmings — a personalised photo frame is a gift that lasts forever. Here\'s why your loved ones will adore it.', category: 'Gifting', emoji: '🎁' },
          { title: 'Divine Art for Your Pooja Room — Top Ganesha & Shiva Frames', slug: '#', excerpt: 'Elevate your home mandir with premium framed divine art. Our collection of Ganesha, Shiva, and Hanuman prints are handpicked by devotees.', category: 'Divine Art', emoji: '🕉️' },
          { title: 'How to Build a Gallery Wall on a Budget — India Guide', slug: '#', excerpt: 'A gallery wall doesn\'t have to be expensive. With the right frames and layout, you can create a stunning feature wall for under ₹5,000.', category: 'Decor Tips', emoji: '🏠' },
          { title: 'The Science of Premium Archival Mounting for Photo Frames', slug: '#', excerpt: 'What is a mount mat and why does it matter? Learn how archival white mount boards protect your art and elevate the visual presentation.', category: 'Behind the Scenes', emoji: '🔬' },
        ];
        grid.innerHTML = staticPosts.map(post => `
        <article class="bg-brand-card border border-gray-800 rounded-xl overflow-hidden hover:border-brand-gold transition cursor-pointer" onclick="window.pfi.nav('/shop')" role="button" tabindex="0" aria-label="${escapeHTML(post.title)}">
          <div class="w-full h-40 bg-gray-900 flex items-center justify-center text-5xl" aria-hidden="true">${post.emoji}</div>
          <div class="p-4">
            <p class="text-[10px] text-brand-gold uppercase tracking-widest mb-2">${escapeHTML(post.category)}</p>
            <h2 class="font-bold text-sm mb-2">${escapeHTML(post.title)}</h2>
            <p class="text-xs text-gray-400">${escapeHTML(post.excerpt.slice(0,110))}...</p>
            <span class="text-[10px] text-gray-600 mt-2 block">Coming soon · Follow us on Instagram for updates</span>
          </div>
        </article>`).join('');
        return;
      }
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
    // Dynamic prices from config (fallback to defaults)
    const cfg = state.config || {};
    const prices = {
      Small:   parseInt(cfg.price_small   || '499'),
      Medium:  parseInt(cfg.price_medium  || '799'),
      Large:   parseInt(cfg.price_large   || '1149'),
      XL:      parseInt(cfg.price_xl      || '1749'),
      premium: parseInt(cfg.price_premium_addon || '250')
    };

    app.innerHTML = renderHeader() + `
    <main id="main-content" class="max-w-7xl mx-auto px-4 py-12">
      <div class="text-center mb-10">
        <h1 class="text-3xl md:text-5xl font-bold font-display mb-3">Upload Your Photo</h1>
        <p class="text-gray-400 max-w-xl mx-auto">Transform your digital memories into premium framed art. Professional printing, handcrafted frames, delivered to your door.</p>
      </div>

      <!-- Copyright / Liability Notice -->
      <div class="max-w-3xl mx-auto mb-8 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl flex items-start gap-3" role="note">
        <i class="fas fa-shield-alt text-amber-500 mt-0.5 flex-shrink-0"></i>
        <p class="text-xs text-amber-200/80 leading-relaxed">
          <strong class="text-amber-300">Copyright & Usage Rights:</strong>
          By uploading an image, you confirm that you are the original creator, owner, or have obtained the necessary rights or permissions to reproduce and print this image.
          PhotoFrameIn is not responsible for any copyright or intellectual property violations arising from customer-uploaded images.
          Uploading copyrighted material without permission is prohibited.
        </p>
      </div>

      <div class="grid md:grid-cols-2 gap-10">
        <!-- LEFT: Upload & Visualizer -->
        <div>
          <!-- Upload tabs: File Upload / Image URL -->
          <div class="flex gap-1 mb-3 bg-gray-900 rounded-xl p-1" role="tablist" aria-label="Image upload method">
            <button id="tab-upload" class="flex-1 py-2 rounded-lg text-xs font-bold transition bg-gray-800 text-white" role="tab" aria-selected="true" onclick="window.pfi.switchUploadTab('upload')">
              <i class="fas fa-cloud-upload-alt mr-1"></i>Upload File
            </button>
            <button id="tab-url" class="flex-1 py-2 rounded-lg text-xs font-bold transition text-gray-400 hover:text-white" role="tab" aria-selected="false" onclick="window.pfi.switchUploadTab('url')">
              <i class="fas fa-link mr-1"></i>Paste Image URL
            </button>
          </div>

          <!-- File Upload Zone -->
          <div id="upload-tab-file">
            <div id="upload-zone" class="bg-brand-card border-2 border-dashed border-gray-700 rounded-2xl p-10 text-center cursor-pointer hover:border-brand-gold transition group mb-3" role="button" tabindex="0" aria-label="Upload your photo">
              <div id="preview-container" class="hidden relative mb-4">
                <!-- Visualizer: fixed aspect ratio based on selected frame size -->
                <div id="custom-mockup" class="mx-auto bg-gray-900 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center relative" style="width:100%;max-width:360px;aspect-ratio:2/3">
                  <img id="custom-img-preview" src="" class="w-full h-full shadow-2xl frame-border-black transition-all" alt="Your uploaded photo preview" style="border-width:8px;object-fit:cover">
                  <div class="glass-overlay" aria-hidden="true"></div>
                </div>
                <div id="frame-size-label" class="text-[10px] text-gray-500 text-center mt-2">Showing: 12×18" frame (2:3 ratio)</div>
              </div>
              <div id="upload-prompt">
                <div class="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition" aria-hidden="true">
                  <i class="fas fa-cloud-upload-alt text-2xl text-brand-gold"></i>
                </div>
                <h3 class="text-lg font-bold mb-2">Click to upload your photo</h3>
                <p class="text-sm text-gray-500">JPG, PNG supported · Max 50MB for 4K quality</p>
                <p class="text-xs text-gray-600 mt-1">Image will be cropped to the selected frame ratio</p>
              </div>
              <input type="file" id="file-input" class="hidden" accept="image/jpeg,image/png,image/webp" aria-label="Choose photo file">
            </div>
            <p class="text-[10px] text-gray-500 text-center mb-4">
              <i class="fas fa-info-circle mr-1 text-brand-gold opacity-60"></i>
              Only upload images you own or have rights to use. See copyright notice above.
            </p>
          </div>

          <!-- URL Input Zone -->
          <div id="upload-tab-url" class="hidden mb-4">
            <div class="bg-brand-card border border-gray-700 rounded-2xl p-6">
              <label for="image-url-input" class="text-sm font-bold text-gray-300 block mb-2">
                <i class="fas fa-link mr-1 text-brand-gold"></i>Paste your image URL
              </label>
              <div class="flex gap-2 mb-3">
                <input type="url" id="image-url-input" class="form-input flex-1 font-mono text-xs" placeholder="https://example.com/your-photo.jpg" aria-label="Image URL">
                <button onclick="window.pfi.loadImageFromUrl()" class="btn-gold !py-2 !px-4 !text-xs whitespace-nowrap">Load</button>
              </div>
              <p class="text-[10px] text-gray-500">Supports direct image links (JPG, PNG, WebP). Google Drive / Dropbox public share links also work.</p>
              <p class="text-[10px] text-amber-500 mt-1"><i class="fas fa-exclamation-triangle mr-1"></i>Ensure you own or have rights to use this image.</p>
              <div id="url-preview-container" class="hidden mt-4">
                <div id="url-mockup" class="mx-auto bg-gray-900 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center" style="width:100%;max-width:360px;aspect-ratio:2/3">
                  <img id="url-img-preview" src="" class="w-full h-full frame-border-black" alt="Image preview" style="border-width:8px;object-fit:cover">
                </div>
              </div>
            </div>
          </div>

          <!-- Crop Tool (shown after image selected) -->
          <div id="crop-tool-container" class="hidden mb-4">
            <div class="bg-brand-card border border-brand-gold/40 rounded-2xl p-4">
              <div class="flex items-center justify-between mb-3">
                <h4 class="font-bold text-sm text-brand-gold"><i class="fas fa-crop-alt mr-2"></i>Crop Your Image</h4>
                <div class="flex gap-2">
                  <button onclick="window.pfi.applyCrop()" class="admin-btn admin-btn-primary text-xs">
                    <i class="fas fa-check mr-1"></i>Apply Crop
                  </button>
                  <button onclick="window.pfi.skipCrop()" class="admin-btn admin-btn-ghost text-xs">Skip</button>
                </div>
              </div>
              <p class="text-xs text-gray-400 mb-3">Drag to position. The highlighted area is what will be printed.</p>
              <div class="relative overflow-hidden rounded-xl bg-black" id="crop-wrapper" style="max-height:360px;cursor:crosshair">
                <canvas id="crop-canvas" style="display:block;max-width:100%;max-height:360px;margin:0 auto"></canvas>
                <div id="crop-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none"></div>
              </div>
            </div>
          </div>

          <!-- Quality Promise -->
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

        <!-- RIGHT: Options -->
        <div class="bg-brand-card border border-gray-800 rounded-2xl p-8 space-y-8">
          <div>
            <label class="text-sm font-bold text-gray-400 mb-3 block uppercase tracking-widest" id="custom-size-label">1. Select Frame Size</label>
            <div class="grid grid-cols-2 gap-2" role="group" aria-labelledby="custom-size-label">
              ${[
                {s:'Small (8×12)',p:prices.Small,code:'Small',ratio:'2/3'},
                {s:'Medium (12×18)',p:prices.Medium,code:'Medium',ratio:'2/3'},
                {s:'Large (18×24)',p:prices.Large,code:'Large',ratio:'3/4'},
                {s:'XL (24×36)',p:prices.XL,code:'XL',ratio:'2/3'}
              ].map(opt => `
              <button class="size-option ${opt.code==='Medium'?'active':''}" data-size="${opt.code}" data-ratio="${opt.ratio}" onclick="window.pfi.selectCustomSize('${opt.code}',${opt.p},'${opt.ratio}')" aria-pressed="${opt.code==='Medium'}" aria-label="${opt.s}, ${formatPrice(opt.p)}">
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
                <input type="radio" name="custom_frame" value="Premium" class="accent-brand-gold" aria-label="Premium display with decorative mount">
                <div class="flex-1">
                  <div class="flex justify-between"><strong>Premium (With White Mount)</strong><span class="text-brand-gold text-xs font-bold">+${formatPrice(prices.premium)}</span></div>
                  <p class="text-xs text-gray-500 mt-1">Gallery-style pure white (#FFFFFF) border. Museum presentation.</p>
                </div>
              </label>
            </div>
            <div id="custom-mount-extra" class="mt-3 hidden p-3 bg-black/30 border border-gray-800 rounded-xl text-xs text-gray-400">
              <i class="fas fa-check-circle text-brand-gold mr-1"></i>Premium includes <strong class="text-white">pure white (#FFFFFF) archival mount</strong> — gallery-style white border between frame and photo.
            </div>
          </div>

          <!-- Optional Notes / Requirements -->
          <div>
            <label for="custom-notes" class="text-sm font-bold text-gray-400 mb-2 block uppercase tracking-widest">
              3. Special Requirements <span class="normal-case text-gray-600 font-normal">(Optional)</span>
            </label>
            <textarea id="custom-notes" rows="3" class="form-input w-full text-sm resize-none" placeholder="Any special notes for our team — colour preferences, cropping guidance, positioning, dedication text on mount, etc. (optional)" maxlength="500" aria-label="Special requirements for your custom frame"></textarea>
            <p class="text-[10px] text-gray-600 mt-1">Maximum 500 characters. Our design team reads every note.</p>
          </div>

          <div class="pt-6 border-t border-gray-800">
            <div class="flex justify-between items-center mb-6">
              <div>
                <div class="text-gray-400 text-sm">Total Price</div>
                <div id="custom-total-display" class="text-3xl font-bold text-brand-gold" aria-live="polite">${formatPrice(prices.Medium)}</div>
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

    window._customState = {
      size: 'Medium', frame: 'Standard',
      basePrice: prices.Medium, framePrice: 0,
      imageUrl: null, mountType: 'classic',
      aspectRatio: '2/3', croppedDataUrl: null
    };

    // ── Upload tab switching ──────────────────────────────────────────────
    window.pfi.switchUploadTab = function(tab) {
      $('#upload-tab-file').classList.toggle('hidden', tab !== 'upload');
      $('#upload-tab-url').classList.toggle('hidden', tab !== 'url');
      $('#tab-upload').classList.toggle('bg-gray-800', tab === 'upload');
      $('#tab-upload').classList.toggle('text-white', tab === 'upload');
      $('#tab-upload').classList.toggle('text-gray-400', tab !== 'upload');
      $('#tab-url').classList.toggle('bg-gray-800', tab === 'url');
      $('#tab-url').classList.toggle('text-white', tab === 'url');
      $('#tab-url').classList.toggle('text-gray-400', tab !== 'url');
    };

    // ── Image URL loader ──────────────────────────────────────────────────
    window.pfi.loadImageFromUrl = function() {
      const url = ($('#image-url-input')?.value || '').trim();
      if (!url) { toast('Please enter an image URL', 'error'); return; }
      if (!/^https?:\/\//i.test(url)) { toast('Please enter a valid URL starting with http:// or https://', 'error'); return; }
      const previewContainer = $('#url-preview-container');
      const previewImg = $('#url-img-preview');
      const urlMockup = $('#url-mockup');
      if (!previewImg) return;
      previewImg.onload = () => {
        previewContainer.classList.remove('hidden');
        window._customState.imageUrl = url;
        window._customState.croppedDataUrl = null;
        if (urlMockup) _applyFrameRatioToMockup(urlMockup, window._customState.aspectRatio);
        toast('Image loaded! Select your size and style, then click Create My Frame.');
      };
      previewImg.onerror = () => { toast('Could not load image from that URL. Check the link and try again.', 'error'); };
      previewImg.src = url;
    };

    // ── File upload handler ───────────────────────────────────────────────
    const zone = $('#upload-zone');
    const input = $('#file-input');
    if (zone && input) {
      zone.onclick = (e) => { if (!e.target.closest('input[type=file]')) { e.preventDefault(); input.click(); } };
      zone.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } };
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { toast('Only JPG, PNG, WEBP files are supported', 'error'); return; }
        if (file.size > 52428800) { toast('File too large. Maximum 50MB allowed.', 'error'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          window._customState.rawDataUrl = ev.target.result;
          window._customState.croppedDataUrl = null;
          // Show preview
          const preview = $('#preview-container');
          const prompt = $('#upload-prompt');
          const img = $('#custom-img-preview');
          if (preview) preview.classList.remove('hidden');
          if (prompt) prompt.classList.add('hidden');
          if (img) { img.src = ev.target.result; }
          _applyFrameRatioToMockup($('#custom-mockup'), window._customState.aspectRatio);
          // Show crop tool
          _initCropTool(ev.target.result);
          toast('Photo loaded! Crop it or click Skip — then Add to Cart.');
        };
        reader.readAsDataURL(file);
      };
    }

    // ── Visualizer: apply correct frame aspect ratio to the mockup ───────
    function _applyFrameRatioToMockup(mockupEl, ratio) {
      if (!mockupEl) return;
      mockupEl.style.aspectRatio = ratio || '2/3';
      const lbl = $('#frame-size-label');
      if (lbl) {
        const labels = {'2/3':'2:3 (Portrait — 8×12, 12×18, 24×36)','3/4':'3:4 (Portrait — 18×24)','1/1':'1:1 (Square)','4/3':'4:3 (Landscape)'};
        const sizeName = window._customState?.size || 'Medium';
        lbl.textContent = `Showing: ${sizeName} frame (${labels[ratio] || ratio} ratio)`;
      }
    }

    // ── Crop tool (canvas-based) ──────────────────────────────────────────
    function _initCropTool(dataUrl) {
      const container = $('#crop-tool-container');
      const canvas = $('#crop-canvas');
      if (!container || !canvas) return;
      container.classList.remove('hidden');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        // Scale image to fit canvas max 600px wide
        const maxW = Math.min(600, window.innerWidth - 48);
        const scale = Math.min(1, maxW / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        window._cropState = {
          img, scale,
          canvasW: canvas.width, canvasH: canvas.height,
          imgW: img.width, imgH: img.height,
          // Initial crop box: full image
          cropX: 0, cropY: 0, cropW: canvas.width, cropH: canvas.height,
          dragging: false, dragStartX: 0, dragStartY: 0, dragOffX: 0, dragOffY: 0
        };
        // Set crop box to match target frame aspect ratio
        const ratio = window._customState.aspectRatio || '2/3';
        const [rw, rh] = ratio.split('/').map(Number);
        const targetAR = rw / rh;
        let cw = canvas.width, ch = canvas.height;
        if (cw / ch > targetAR) { cw = ch * targetAR; }
        else { ch = cw / targetAR; }
        window._cropState.cropX = (canvas.width - cw) / 2;
        window._cropState.cropY = (canvas.height - ch) / 2;
        window._cropState.cropW = cw;
        window._cropState.cropH = ch;
        _drawCropCanvas();
        _setupCropDrag(canvas);
      };
      img.src = dataUrl;
    }

    function _drawCropCanvas() {
      const cs = window._cropState;
      if (!cs) return;
      const canvas = $('#crop-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(cs.img, 0, 0, cs.canvasW, cs.canvasH);
      // Darken outside crop
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, cs.canvasW, cs.cropY);
      ctx.fillRect(0, cs.cropY + cs.cropH, cs.canvasW, cs.canvasH - cs.cropY - cs.cropH);
      ctx.fillRect(0, cs.cropY, cs.cropX, cs.cropH);
      ctx.fillRect(cs.cropX + cs.cropW, cs.cropY, cs.canvasW - cs.cropX - cs.cropW, cs.cropH);
      // Crop border
      ctx.strokeStyle = '#DAA520';
      ctx.lineWidth = 2;
      ctx.strokeRect(cs.cropX, cs.cropY, cs.cropW, cs.cropH);
      // Corner handles
      [[cs.cropX,cs.cropY],[cs.cropX+cs.cropW,cs.cropY],[cs.cropX,cs.cropY+cs.cropH],[cs.cropX+cs.cropW,cs.cropY+cs.cropH]].forEach(([x,y]) => {
        ctx.fillStyle = '#DAA520'; ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fill();
      });
    }

    function _setupCropDrag(canvas) {
      const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches?.[0] || e;
        return { x: (touch.clientX - rect.left) * (canvas.width / rect.width), y: (touch.clientY - rect.top) * (canvas.height / rect.height) };
      };
      const startDrag = (e) => {
        e.preventDefault();
        const pos = getPos(e);
        const cs = window._cropState;
        if (!cs) return;
        // Check if inside crop box
        if (pos.x >= cs.cropX && pos.x <= cs.cropX + cs.cropW && pos.y >= cs.cropY && pos.y <= cs.cropY + cs.cropH) {
          cs.dragging = true;
          cs.dragOffX = pos.x - cs.cropX;
          cs.dragOffY = pos.y - cs.cropY;
        }
      };
      const doDrag = (e) => {
        e.preventDefault();
        const cs = window._cropState;
        if (!cs?.dragging) return;
        const pos = getPos(e);
        cs.cropX = Math.max(0, Math.min(cs.canvasW - cs.cropW, pos.x - cs.dragOffX));
        cs.cropY = Math.max(0, Math.min(cs.canvasH - cs.cropH, pos.y - cs.dragOffY));
        _drawCropCanvas();
      };
      const endDrag = () => { if (window._cropState) window._cropState.dragging = false; };
      canvas.addEventListener('mousedown', startDrag);
      canvas.addEventListener('mousemove', doDrag);
      canvas.addEventListener('mouseup', endDrag);
      canvas.addEventListener('touchstart', startDrag, { passive: false });
      canvas.addEventListener('touchmove', doDrag, { passive: false });
      canvas.addEventListener('touchend', endDrag);
    }

    window.pfi.applyCrop = function() {
      const cs = window._cropState;
      if (!cs) return;
      const outCanvas = document.createElement('canvas');
      // Output at full original image resolution
      const scaleBack = 1 / cs.scale;
      outCanvas.width = Math.round(cs.cropW * scaleBack);
      outCanvas.height = Math.round(cs.cropH * scaleBack);
      const ctx = outCanvas.getContext('2d');
      ctx.drawImage(cs.img, Math.round(cs.cropX * scaleBack), Math.round(cs.cropY * scaleBack), outCanvas.width, outCanvas.height, 0, 0, outCanvas.width, outCanvas.height);
      const croppedUrl = outCanvas.toDataURL('image/jpeg', 0.92);
      window._customState.croppedDataUrl = croppedUrl;
      window._customState.imageUrl = croppedUrl;
      // Update preview
      const img = $('#custom-img-preview');
      if (img) img.src = croppedUrl;
      $('#crop-tool-container')?.classList.add('hidden');
      toast('Crop applied! Your frame will use this cropped area.', 'success');
    };

    window.pfi.skipCrop = function() {
      window._customState.croppedDataUrl = null;
      window._customState.imageUrl = window._customState.rawDataUrl || window._customState.imageUrl;
      $('#crop-tool-container')?.classList.add('hidden');
      toast('Crop skipped — using full image.');
    };

    // ── Frame style radio interactions ───────────────────────────────────
    $$('input[name="custom_frame"]').forEach(radio => {
      radio.addEventListener('change', () => {
        $$('.custom-frame-option').forEach(l => l.classList.remove('active'));
        radio.closest('label')?.classList.add('active');
        const extra = radio.value === 'Premium' ? 1 : 0;
        window.pfi.selectCustomFrame(radio.value, prices.premium * extra);
        const mountExtra = $('#custom-mount-extra');
        if (mountExtra) mountExtra.classList.toggle('hidden', radio.value !== 'Premium');
      });
    });

    updateCustomTotal();
    updateCartBadge();
  }

  function updateCustomTotal() {
    const s = window._customState || {};
    const base = Number(s.basePrice) || 799;
    const frame = Number(s.framePrice) || 0;
    // No mount dropdown — premium always uses pure white mount #FFFFFF, no extra charge
    const total = Math.max(0, base + frame);
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
      // If Premium variant not in DB, create virtual variant (Standard + ₹250)
      const p = window._currentProduct;
      if (p) {
        const variants = (p.variants || []).filter(v => v.is_active);
        const found = variants.find(v => v.size === window._selectedSize && v.frame_type === frame);
        if (!found && frame === 'Premium') {
          const stdV = variants.find(v => v.size === window._selectedSize && v.frame_type === 'Standard');
          if (stdV) {
            window._currentVariant = { ...stdV, frame_type: 'Premium', price: stdV.price + 250, id: stdV.id + '_prem' };
          }
        }
      }
      updateVariant();
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
      toast(`<i class='fas fa-check-circle' style='color:#22C55E;margin-right:6px'></i>Added to cart! <a href='/cart' onclick="window.pfi.nav('/cart');return false;" style='color:#DAA520;margin-left:8px;font-weight:bold'>View Cart →</a>`);
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

    toggleCartPoster(add) {
      // Remove any existing poster addon
      state.cart = state.cart.filter(i => !i.isPosterAddon);
      if (add) {
        const posterPrice = parseInt(state.config.poster_price || '199');
        state.cart.push({
          productId: 'poster-addon',
          variantId: 'poster-addon-cart',
          name: 'Poster Print Add-on (A3 Rolled)',
          slug: 'poster-addon',
          size: 'A3',
          frame: 'Rolled',
          price: posterPrice > 0 ? posterPrice : 199,
          sku: 'POSTER-ADDON',
          imageUrl: '',
          quantity: 1,
          isPosterAddon: true
        });
        toast('Poster print add-on added! +₹199', 'success');
      } else {
        toast('Poster add-on removed');
      }
      saveCart(); renderCartPage($('#app'));
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
            ${safeAwb ? `
            <div class="mt-3 space-y-2">
              ${trackUrl ? `<a href="${trackUrl}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center gap-2 bg-brand-gold text-black font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-yellow-400 transition"><i class="fas fa-external-link-alt"></i>Track with ${safeCarrier || 'Carrier'} →</a>` : ''}
              <p class="text-xs text-gray-500 text-center">AWB: ${safeAwb}${safeCarrier ? ' · ' + safeCarrier : ''}</p>
            </div>` : '<p class="text-xs text-gray-500">Tracking link available once dispatched.</p>'}
          </article>`;
        }).join('');
      } catch (e) { result.innerHTML = '<p class="text-red-400 text-sm text-center py-4">Error fetching order. Please try again.</p>'; }
    },

    setReviewStar(val) {
      window._reviewRating = val;
      document.querySelectorAll('.star-btn').forEach((btn, i) => {
        const active = i < val;
        btn.style.color = active ? '#DAA520' : '';
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    },

    async submitReview() {
      const rating = window._reviewRating || 0;
      const name = (document.getElementById('review-name')?.value || '').trim();
      const orderId = (document.getElementById('review-order-id')?.value || '').replace(/[^a-zA-Z0-9\-]/g,'').trim();
      if (!orderId) { toast('Please enter your Order ID to verify your purchase', 'error'); document.getElementById('review-order-id')?.focus(); return; }
      if (!rating) { toast('Please select a star rating', 'error'); return; }
      if (!name) { toast('Please enter your name', 'error'); return; }
      const btn = event.currentTarget;
      const orig = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting...';

      try {
        let photoUrl = null;
        // Upload photo to Cloudinary if provided
        if (window._reviewPhotoFile) {
          btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Uploading photo...';
          try {
            const signRes = await fetch(`${API}/upload/sign?folder=reviews`);
            if (signRes.ok) {
              const signData = await signRes.json();
              if (signData.apiKey && signData.cloudName) {
                const fd = new FormData();
                fd.append('file', window._reviewPhotoFile);
                fd.append('api_key', signData.apiKey);
                fd.append('timestamp', String(signData.timestamp));
                fd.append('signature', signData.signature);
                fd.append('folder', signData.folder || 'reviews');
                const upRes = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signData.cloudName)}/image/upload`, { method: 'POST', body: fd });
                const upData = await upRes.json();
                if (upData.secure_url) photoUrl = upData.secure_url;
              }
            }
          } catch (photoErr) { /* continue without photo */ }
        }

        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting...';
        const res = await fetch(`${API}/reviews`, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({
            productId: null, // order-based review, no specific product
            orderId: orderId || null,
            name,
            rating,
            title: (document.getElementById('review-title')?.value || '').trim().slice(0, 200) || null,
            body: (document.getElementById('review-body')?.value || '').trim().slice(0, 2000) || null,
            photoUrl
          })
        });
        const d = await res.json();
        if (d.success || res.ok) {
          document.getElementById('review-result').innerHTML = '<div class="bg-brand-green/10 border border-brand-green/30 rounded-xl p-4 text-brand-green text-sm font-bold text-center mt-2"><i class="fas fa-check-circle mr-2"></i>Thank you! Your review will be published after approval.</div>';
          btn.innerHTML = '<i class="fas fa-check mr-2"></i>Submitted!';
          window._reviewPhotoFile = null;
        } else { throw new Error(d.error || 'Submission failed'); }
      } catch(e) {
        toast('Error: ' + (e.message || 'Please try again'), 'error');
        btn.disabled = false; btn.innerHTML = orig;
      }
    },

    async submitSuggestion() {
      const msg = ($('#suggest-msg')?.value || '').trim();
      if (!msg) { toast('Please enter your suggestion', 'error'); return; }
      const btn = event.currentTarget;
      const orig = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sending...';
      try {
        const res = await fetch(`${API}/suggestions`, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({
            message: msg.slice(0, 1000),
            order_id: ($('#suggest-order-id')?.value||'').replace(/[^a-zA-Z0-9\-]/g,'').slice(0,40)||null,
            contact_name: ($('#suggest-name')?.value||'').slice(0,100)||null,
            contact_email: ($('#suggest-email')?.value||'').slice(0,200)||null,
            contact_phone: ($('#suggest-phone')?.value||'').replace(/[^\d+\-\s]/g,'').slice(0,20)||null
          })
        });
        const d = await res.json();
        if (d.success || res.ok) {
          $('#suggest-result').innerHTML = '<div class="bg-brand-green/10 border border-brand-green/30 rounded-xl p-4 text-brand-green text-sm font-bold text-center mt-2"><i class="fas fa-check-circle mr-2"></i>Thank you! We\u2019ll review your suggestion.</div>';
          ['suggest-msg','suggest-name','suggest-email','suggest-phone'].forEach(id => { const el = $('#'+id); if(el) el.value=''; });
          btn.innerHTML = '<i class="fas fa-check mr-2"></i>Sent!';
        } else { throw new Error(d.error||'Failed'); }
      } catch(e) {
        toast('Error sending suggestion. Please try again.', 'error');
        btn.disabled = false; btn.innerHTML = orig;
      }
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

    selectCustomSize(size, price, ratio) {
      window._customState.size = size;
      window._customState.basePrice = Math.max(0, Number(price) || 499);
      window._customState.aspectRatio = ratio || '2/3';
      $$('.size-option').forEach(el => {
        el.classList.toggle('active', el.dataset.size === size);
        el.setAttribute('aria-pressed', el.dataset.size === size ? 'true' : 'false');
      });
      // Update visualizer aspect ratio
      const mockup = $('#custom-mockup') || $('#url-mockup');
      if (mockup) {
        mockup.style.aspectRatio = ratio || '2/3';
        const lbl = $('#frame-size-label');
        if (lbl) lbl.textContent = `Showing: ${size} frame (${ratio || '2/3'} ratio)`;
      }
      // Re-init crop tool if image is loaded
      if (window._customState.rawDataUrl) {
        const cs = window._cropState;
        if (cs) {
          const [rw, rh] = (ratio || '2/3').split('/').map(Number);
          const targetAR = rw / rh;
          let cw = cs.canvasW, ch = cs.canvasH;
          if (cw / ch > targetAR) { cw = ch * targetAR; } else { ch = cw / targetAR; }
          cs.cropX = (cs.canvasW - cw) / 2;
          cs.cropY = (cs.canvasH - ch) / 2;
          cs.cropW = cw; cs.cropH = ch;
          if (typeof _drawCropCanvas === 'function') _drawCropCanvas();
          else if (window._drawCropCanvas) window._drawCropCanvas();
        }
      }
      updateCustomTotal();
    },

    selectCustomFrame(frame, price) {
      window._customState.frame = frame;
      window._customState.framePrice = Math.max(0, Number(price) || 0);
      // Premium mount is always included with Premium frame — no extra toggle needed
      const preview = $('#custom-img-preview');
      if (preview) {
        preview.classList.remove('has-mount', 'border-brand-gold', 'border-black', 'frame-border-white', 'frame-border-black');
        preview.style.boxShadow = '';
        if (frame === 'Premium') { preview.classList.add('has-mount'); }
        else { preview.classList.add('frame-border-black'); }
      }
      updateCustomTotal();
    },

    async addCustomToCart() {
      const s = window._customState;
      const notes = ($('#custom-notes')?.value || '').trim().slice(0, 500);

      // Check if image is provided (file upload or URL)
      const fileInput = $('#file-input');
      const file = fileInput?.files?.[0];
      const urlInput = ($('#image-url-input')?.value || '').trim();
      const isUrlMode = !$('#upload-tab-url')?.classList.contains('hidden');
      const hasUrlImage = s.imageUrl && /^https?:\/\//.test(s.imageUrl);
      const hasCroppedImage = !!s.croppedDataUrl;
      const hasFileImage = !!file;

      if (!hasFileImage && !hasUrlImage && !hasCroppedImage) {
        toast('Please upload a photo or paste an image URL first!', 'error'); return;
      }

      const btn = document.querySelector('button[onclick="window.pfi.addCustomToCart()"]') || event?.currentTarget;
      const originalText = btn?.innerHTML || '';
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>Uploading your photo...'; }

      try {
        let imageUrl;

        if (hasCroppedImage || hasFileImage) {
          // Upload file or cropped canvas data to Cloudinary via signed upload
          const signRes = await fetch(`${API}/upload/sign?folder=custom_frames`);
          if (!signRes.ok) {
            const errData = await signRes.json().catch(() => ({}));
            throw new Error(errData.error || `Sign request failed (${signRes.status}). Contact support.`);
          }
          const signData = await signRes.json();
          if (!signData.apiKey || !signData.cloudName) throw new Error('Upload not configured on server. Contact support.');

          if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>Uploading...';
          const formData = new FormData();
          if (hasCroppedImage) {
            // Convert data URL to blob
            const res2 = await fetch(s.croppedDataUrl);
            const blob = await res2.blob();
            formData.append('file', blob, 'custom_frame.jpg');
          } else {
            // Validate file
            if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { throw new Error('Only JPG, PNG, WEBP images are supported.'); }
            if (file.size > 52428800) { throw new Error('File too large. Max 50MB.'); }
            formData.append('file', file);
          }
          formData.append('api_key', signData.apiKey);
          formData.append('timestamp', String(signData.timestamp));
          formData.append('signature', signData.signature);
          formData.append('folder', signData.folder || 'custom_frames');

          if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>Processing...';
          const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signData.cloudName)}/image/upload`, { method: 'POST', body: formData });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok || !uploadData.secure_url) throw new Error(uploadData.error?.message || 'Upload failed. Check file and try again.');
          imageUrl = uploadData.secure_url;
          if (!/^https:\/\/res\.cloudinary\.com\//.test(imageUrl)) throw new Error('Invalid upload response.');

        } else if (hasUrlImage) {
          // Use provided URL directly (user confirmed they own the image)
          imageUrl = s.imageUrl;
        }

        const totalPrice = Math.max(0, (Number(s.basePrice) || 799) + (Number(s.framePrice) || 0));

        state.cart.push({
          productId: 'custom-frame',
          variantId: `custom-${s.size}-${s.frame}-${Date.now()}`,
          name: `Custom Frame (${s.size})`,
          slug: 'custom-photo-frame',
          size: s.size || 'Medium',
          frame: `${s.frame || 'Standard'}${s.frame === 'Premium' ? ' (Pure White Mount)' : ''}`,
          price: totalPrice,
          imageUrl: imageUrl,
          original_filename: file ? file.name.replace(/[^a-zA-Z0-9._\-]/g, '_').slice(0, 100) : 'image_url.jpg',
          customerNotes: notes || null,
          is_custom_frame: true,
          quantity: 1
        });
        saveCart();
        toast('✅ Custom frame added to cart!');
        navigate('/cart');
      } catch (err) {
        console.error('Custom frame upload error:', err);
        toast(err.message || 'Upload failed. Check your internet and try again.', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = originalText; }
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

    // Base price comes from Standard variant for this size; Premium adds ₹250
    const stdVariant = (p.variants || []).find(vv => vv.size === window._selectedSize && vv.frame_type === 'Standard') || v;
    const displayPrice = v.frame_type === 'Premium' ? stdVariant.price + 250 : stdVariant.price;
    const priceEl = $('#current-price');
    const compareEl = $('#compare-price');
    if (priceEl) {
      priceEl.textContent = formatPrice(displayPrice);
      if (window.gsap) gsap.fromTo(priceEl, { y: -8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out', clearProps: 'all' });
    }
    if (compareEl) compareEl.textContent = v.compare_at_price ? formatPrice(v.compare_at_price + (v.frame_type === 'Premium' ? 250 : 0)) : '';

    // Premium mount info visibility
    const mountContainer = $('#premium-mount-info');
    if (mountContainer) mountContainer.classList.toggle('hidden', v.frame_type !== 'Premium');

    // Frame mockup visual update
    const mainImg = $('#main-image');
    if (mainImg) {
      mainImg.classList.remove('frame-border-gold', 'frame-border-black', 'frame-border-white', 'has-mount');
      mainImg.style.boxShadow = '';
      mainImg.style.outline = '';
      if (v.frame_type === 'Premium') {
        mainImg.classList.add('has-mount');
      } else {
        mainImg.classList.add('frame-border-black');
      }
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
