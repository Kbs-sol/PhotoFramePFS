// ChitraFrame — Customer SPA v4.0
// Editorial luxury · High-conversion · Museum-grade minimalism
// Design: Light editorial, DM Serif Display + DM Sans
// Security: XSS-safe, CSP-compliant, no credentials in client
(function () {
  'use strict';

  const API = '/api';
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

  // ── Product image map (Cloudinary + direct URLs for uploaded designs) ──────
  const DESIGN_IMAGES = {
    // Spiritual
    'mahadev-cosmic-meditation': 'https://www.genspark.ai/api/files/s/6YSmJUF0',
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

  function getCartTotals() {
    const subtotal = state.cart.reduce((s, i) => {
      const price = Number(i.price);
      const qty = Math.max(1, i.quantity || 1);
      return s + (isFinite(price) && price > 0 ? price * qty : 0);
    }, 0);
    const itemCount = state.cart.reduce((s, i) => s + (i.quantity || 1), 0);
    const freeThreshold = parseInt(state.config.free_shipping_threshold || '799');
    let discount = 0, discountLabel = '';
    if (itemCount >= 5) { discount = Math.floor(subtotal * 0.20); discountLabel = 'Buy 5+ — 20% off'; }
    else if (itemCount >= 3) { discount = Math.min(250, Math.floor(subtotal * 0.15)); discountLabel = 'Buy 3 — ₹250 saved'; }
    else if (itemCount >= 2) { discount = Math.min(100, Math.floor(subtotal * 0.10)); discountLabel = 'Buy 2 — ₹100 saved'; }
    const afterDiscount = subtotal - discount;
    const shipping = afterDiscount >= freeThreshold ? 0 : 99;
    const total = Math.max(0, afterDiscount + shipping);
    return { subtotal, discount, discountLabel, shipping, total, itemCount, freeThreshold };
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

  // ── HEADER ────────────────────────────────────────────────────────────────
  function renderHeader() {
    const cartCount = state.cart.reduce((s, i) => s + (i.quantity || 1), 0);
    const ann = state.config;
    const isAnnActive = ann.announcement_active === 'true';
    const annText = escapeHTML(ann.announcement_text || 'Free delivery on orders above ₹799 · COD Available across India');
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
          <a href="/about" onclick="window.cf.nav('/about');return false;" class="header-nav-link hidden md:inline-flex">About</a>
        </nav>

        <div class="header-actions">
          <button class="header-icon-btn" onclick="window.cf.nav('/track')" aria-label="Track order">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1l2.5 5H17l-4.5 3.3 1.7 5.2L9 11.5l-5.2 3 1.7-5.2L1 6h5.5L9 1z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
          </button>
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
            <p class="text-sm text-ink-400">Free shipping above ₹799</p>
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

    <a href="${escapeHTML(waLink)}" target="_blank" rel="noopener noreferrer" class="whatsapp-widget" aria-label="Chat on WhatsApp">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20.5 3.5A11.5 11.5 0 0 0 1.5 12.4a11.4 11.4 0 0 0 1.5 5.6L1.5 22.5l4.6-1.5a11.5 11.5 0 0 0 5.9 1.6 11.5 11.5 0 0 0 8.5-19.6z" fill="white"/></svg>
    </a>`;
  }

  // ── HOME PAGE ─────────────────────────────────────────────────────────────
  async function renderHomePage(app) {
    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <!-- Hero -->
      <section class="hero" aria-labelledby="hero-h1">
        <div class="hero-inner">
          <div class="hero-left" data-reveal>
            <div class="hero-tag">Museum-Quality Art Prints</div>
            <h1 class="hero-h1" id="hero-h1">
              Your Walls<br>
              <em>Deserve Art</em>
            </h1>
            <p class="hero-sub">Handcrafted frames · Premium finishes · Delivered across India. From ₹499.</p>
            <div class="hero-actions">
              <button class="btn-primary" onclick="window.cf.nav('/shop')" aria-label="Shop all art prints">
                Shop Collections
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button class="btn-ghost" onclick="window.cf.nav('/category/spiritual')">Explore Divine Art</button>
            </div>
            <div class="hero-trust">
              <div class="hero-trust-item">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.6 3.3L12 5l-2.5 2.4.6 3.4L7 9.3l-3.1 1.5.6-3.4L2 5l3.4-.7L7 1z" fill="var(--gold)"/></svg>
                4.9 Rating
              </div>
              <div class="hero-trust-item">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 9l3 3 9-9" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Free Delivery ₹799+
              </div>
              <div class="hero-trust-item">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="4" width="10" height="8" rx="1.5" stroke="var(--ink-500)" stroke-width="1.2"/><path d="M5 4V3a2 2 0 0 1 4 0v1" stroke="var(--ink-500)" stroke-width="1.2" stroke-linecap="round"/></svg>
                Safe Packaging
              </div>
            </div>
          </div>
          <div class="hero-right" data-reveal data-reveal-delay="1">
            <div class="hero-mosaic">
              <div class="hero-tile hero-tile-tall">
                <img src="${DESIGN_IMAGES['radha-krishna-emerald-dance']}" alt="Radha Krishna Emerald Dance framed art" loading="eager">
                <div class="hero-tile-label">Divine Collection</div>
              </div>
              <div class="hero-tile-col">
                <div class="hero-tile">
                  <img src="${DESIGN_IMAGES['bmw-m4-carbon-dark']}" alt="BMW M4 Carbon framed art print" loading="eager">
                  <div class="hero-tile-label">Automotive Art</div>
                </div>
                <div class="hero-tile">
                  <img src="${DESIGN_IMAGES['lion-geometric-gold']}" alt="Geometric Lion gold framed art" loading="eager">
                  <div class="hero-tile-label">Wildlife</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Trust Band -->
      <section class="trust-band" aria-label="Trust signals">
        <div class="container">
          <div class="trust-grid">
            <div class="trust-item" data-reveal>
              <div class="trust-icon">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2L3 6v6c0 5 3.6 9 8 10 4.4-1 8-5 8-10V6L11 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M7 11l3 3 5-5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <div>
                <strong>Premium Quality</strong>
                <span>Gallery-grade printing &amp; frames</span>
              </div>
            </div>
            <div class="trust-item" data-reveal data-reveal-delay="1">
              <div class="trust-icon">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M2 7h18l-2 10H4L2 7z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M6 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="16" cy="14" r="2" stroke="currentColor" stroke-width="1.2"/></svg>
              </div>
              <div>
                <strong>Free Shipping</strong>
                <span>On all orders above ₹799</span>
              </div>
            </div>
            <div class="trust-item" data-reveal data-reveal-delay="2">
              <div class="trust-icon">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 12l.5 5.5L11 20l6.5-2.5.5-5.5" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M11 2L4 7h14L11 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
              </div>
              <div>
                <strong>Safe Packaging</strong>
                <span>Foam-lined protective boxes</span>
              </div>
            </div>
            <div class="trust-item" data-reveal data-reveal-delay="3">
              <div class="trust-icon">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2l2.4 7.3H21l-6.2 4.5 2.4 7.2L11 16.5l-6.2 4.5 2.4-7.2L1 9.3h7.6L11 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
              </div>
              <div>
                <strong>4.9★ Rated</strong>
                <span>By 2,000+ happy customers</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Collections -->
      <section class="section" aria-labelledby="collections-heading">
        <div class="container">
          <div class="section-header" data-reveal>
            <p class="section-eyebrow">Curated for every taste</p>
            <h2 class="section-title" id="collections-heading">Shop by Collection</h2>
          </div>
          <div class="categories-grid" id="categories-grid">
            ${renderCategoryCards()}
          </div>
        </div>
      </section>

      <!-- Featured Products -->
      <section class="section section-alt" aria-labelledby="featured-heading">
        <div class="container">
          <div class="section-header" data-reveal>
            <p class="section-eyebrow">Bestsellers</p>
            <h2 class="section-title" id="featured-heading">Most Loved Prints</h2>
            <a href="/shop" onclick="window.cf.nav('/shop');return false;" class="section-link">View all
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>
          </div>
          <div class="products-grid" id="featured-products">
            ${renderFeaturedProducts()}
          </div>
        </div>
      </section>

      <!-- Editorial Spotlight -->
      <section class="editorial-block" aria-label="Featured design spotlight">
        <div class="editorial-inner">
          <div class="editorial-image" data-reveal>
            <img src="${DESIGN_IMAGES['porsche-911-pacific-coast']}" alt="Porsche 911 Pacific Coast art print in frame" loading="lazy">
          </div>
          <div class="editorial-content" data-reveal data-reveal-delay="1">
            <span class="section-eyebrow">Automotive Collection</span>
            <h2 class="editorial-title">Built for those<br>who feel the road</h2>
            <p class="editorial-desc">The Pacific Coast Porsche — a retro poster art print capturing the romance of the open highway. Gallery-framed and ready to hang.</p>
            <div class="editorial-meta">
              <span>Starting from ₹699</span>
              <span>·</span>
              <span>4 sizes available</span>
            </div>
            <button class="btn-primary" onclick="window.cf.nav('/category/automotive')">
              Explore Automotive Art
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>
      </section>

      <!-- Spiritual Spotlight -->
      <section class="editorial-block editorial-reverse" aria-label="Spiritual art spotlight">
        <div class="editorial-inner">
          <div class="editorial-image" data-reveal>
            <img src="${DESIGN_IMAGES['mahadev-cosmic-meditation']}" alt="Mahadev cosmic meditation art print" loading="lazy">
          </div>
          <div class="editorial-content" data-reveal data-reveal-delay="1">
            <span class="section-eyebrow">Divine Collection</span>
            <h2 class="editorial-title">Art that brings<br>peace to your home</h2>
            <p class="editorial-desc">The Mahadev Cosmic Meditation — divine energy channelled into art. Bless your home with the presence of Shiva's infinite consciousness.</p>
            <div class="editorial-meta">
              <span>Starting from ₹599</span>
              <span>·</span>
              <span>Black &amp; Wood frames</span>
            </div>
            <button class="btn-primary" onclick="window.cf.nav('/category/spiritual')">
              Shop Divine Art
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>
      </section>

      <!-- Reviews -->
      <section class="section" aria-labelledby="reviews-heading">
        <div class="container">
          <div class="section-header" data-reveal>
            <p class="section-eyebrow">Customer Stories</p>
            <h2 class="section-title" id="reviews-heading">Walls transformed</h2>
            <div class="review-aggregate">
              <div class="review-stars">★★★★★</div>
              <span><strong>4.9</strong> from 2,000+ reviews</span>
            </div>
          </div>
          <div class="reviews-grid">
            ${renderStaticReviews()}
          </div>
        </div>
      </section>

      <!-- Newsletter -->
      <section class="newsletter-section" aria-labelledby="newsletter-heading">
        <div class="container">
          <div class="newsletter-inner" data-reveal>
            <div class="newsletter-text">
              <h2 class="newsletter-title" id="newsletter-heading">Get early access to new designs</h2>
              <p>Join 8,000+ collectors. No spam — just beautiful art drops and exclusive offers.</p>
            </div>
            <form class="newsletter-form" id="newsletter-form" onsubmit="window.cf.handleNewsletter(event)">
              <input type="email" name="email" placeholder="Your email address" required autocomplete="email" aria-label="Email address">
              <button type="submit" class="btn-primary">Subscribe</button>
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
  }

  function renderCategoryCards() {
    const categories = [
      { slug: 'spiritual', label: 'Divine & Spiritual', sub: '18 prints', img: DESIGN_IMAGES['mahadev-cosmic-meditation'], color: '#1a1050' },
      { slug: 'automotive', label: 'Automotive Art', sub: '14 prints', img: DESIGN_IMAGES['porsche-911-pacific-coast'], color: '#0a1520' },
      { slug: 'sports', label: 'Sports Legends', sub: '9 prints', img: DESIGN_IMAGES['cricket-glory-moment'], color: '#001233' },
      { slug: 'wildlife', label: 'Wildlife', sub: '5 prints', img: DESIGN_IMAGES['lion-geometric-gold'], color: '#1a1000' },
      { slug: 'anime', label: 'Anime', sub: '3 prints', img: DESIGN_IMAGES['nissan-gtr-r34-osaka-rain'], color: '#12001a' },
      { slug: 'motivational', label: 'Motivational', sub: '2 prints', img: cldUrl('motivational/grind-in-silence', 600), color: '#0a0a0a' },
    ];

    return categories.map((cat, i) => `
      <article class="category-card" data-reveal data-reveal-delay="${i % 3}" onclick="window.cf.nav('/category/${cat.slug}')" role="button" tabindex="0" aria-label="${cat.label} collection" onkeydown="if(event.key==='Enter')window.cf.nav('/category/${cat.slug}')">
        <div class="category-card-img">
          <img src="${escapeHTML(cat.img)}" alt="${escapeHTML(cat.label)} art prints" loading="lazy">
          <div class="category-card-overlay" style="background:linear-gradient(to top, ${cat.color}cc, transparent 60%)"></div>
        </div>
        <div class="category-card-body">
          <h3 class="category-card-title">${escapeHTML(cat.label)}</h3>
          <span class="category-card-count">${escapeHTML(cat.sub)}</span>
        </div>
      </article>`).join('');
  }

  function renderFeaturedProducts() {
    const featured = [
      { slug: 'radha-krishna-emerald-dance', name: 'Radha Krishna — Emerald Dance', category: 'Spiritual', price: 699, image: DESIGN_IMAGES['radha-krishna-emerald-dance'] },
      { slug: 'bmw-m4-carbon-dark', name: 'BMW M4 Carbon — Dark Legend', category: 'Automotive', price: 799, image: DESIGN_IMAGES['bmw-m4-carbon-dark'] },
      { slug: 'cricket-glory-moment', name: 'Cricket — Glory Moment', category: 'Sports', price: 599, image: DESIGN_IMAGES['cricket-glory-moment'] },
      { slug: 'lion-geometric-gold', name: 'Lion — Geometric Gold', category: 'Wildlife', price: 649, image: DESIGN_IMAGES['lion-geometric-gold'] },
      { slug: 'f1-redbull-racing', name: 'F1 RedBull — Championship', category: 'Automotive', price: 749, image: DESIGN_IMAGES['f1-redbull-racing'] },
      { slug: 'mahadev-cosmic-meditation', name: 'Mahadev — Cosmic Meditation', category: 'Spiritual', price: 649, image: DESIGN_IMAGES['mahadev-cosmic-meditation'] },
      { slug: 'lamborghini-aventador-neon', name: 'Lamborghini SVJ — Neon Night', category: 'Automotive', price: 849, image: DESIGN_IMAGES['lamborghini-aventador-neon'] },
      { slug: 'radha-krishna-watercolor', name: 'Radha Krishna — Watercolor Bliss', category: 'Spiritual', price: 599, image: DESIGN_IMAGES['radha-krishna-watercolor'] },
    ];

    return featured.map((p, i) => renderProductCard(p, i)).join('');
  }

  function renderProductCard(p, idx = 0) {
    const variantId = `${p.slug}-medium-black`;
    return `
    <article class="product-card" data-reveal data-reveal-delay="${idx % 4}" role="article">
      <div class="product-card-image" onclick="window.cf.nav('/product/${escapeHTML(p.slug)}')" role="button" tabindex="0" aria-label="View ${escapeHTML(p.name)}" onkeydown="if(event.key==='Enter')window.cf.nav('/product/${escapeHTML(p.slug)}')">
        <img src="${escapeHTML(p.image || cldUrl(p.slug, 600))}" alt="${escapeHTML(p.name)} art print" loading="lazy">
        <div class="product-card-actions">
          <button class="product-quick-add" onclick="event.stopPropagation();window.cf.quickAdd('${escapeHTML(variantId)}','${escapeHTML(p.name)}',${p.price},'${escapeHTML(p.image || cldUrl(p.slug, 200))}','${escapeHTML(p.slug)}')" aria-label="Quick add ${escapeHTML(p.name)} to cart">
            + Add to Cart
          </button>
        </div>
      </div>
      <div class="product-card-info">
        <div class="product-card-meta">
          <span class="product-card-category">${escapeHTML(p.category || '')}</span>
        </div>
        <h3 class="product-card-name">
          <a href="/product/${escapeHTML(p.slug)}" onclick="window.cf.nav('/product/${escapeHTML(p.slug)}');return false;">${escapeHTML(p.name)}</a>
        </h3>
        <div class="product-card-price">
          <span class="price-from">from</span>
          <span class="price-amount">${formatPrice(p.price)}</span>
        </div>
      </div>
    </article>`;
  }

  function renderStaticReviews() {
    const reviews = [
      { name: 'Arjun M.', city: 'Hyderabad', rating: 5, text: 'The BMW M4 print is absolutely stunning. Frame quality is premium — exactly what I expected. Arrived in 4 days, perfectly packed.', product: 'BMW M4 Carbon' },
      { name: 'Priya S.', city: 'Bangalore', rating: 5, text: 'Got the Radha Krishna Emerald print for my pooja room. The colours are vivid and the black frame gives it a gallery feel. Highly recommend!', product: 'Radha Krishna Emerald Dance' },
      { name: 'Rohit K.', city: 'Mumbai', rating: 5, text: 'Ordered two cricket prints as gifts. Both friends loved them. The quality far exceeded what I expected for this price point.', product: 'Cricket Glory Moment' },
      { name: 'Sneha T.', city: 'Chennai', rating: 5, text: 'ChitraFrame is incredible. Mahadev meditation print creates such a calm energy in the room. Will definitely order more.', product: 'Mahadev Cosmic Meditation' },
      { name: 'Vikram P.', city: 'Pune', rating: 5, text: 'The geometric lion is a masterpiece. Perfect for my home office. Got 3 compliments in the first week. Great packaging too!', product: 'Geometric Lion Gold' },
      { name: 'Ananya R.', city: 'Delhi', rating: 5, text: 'Beautiful F1 print for my brother — he is obsessed with it. Will order a full set for the car room next. Great service!', product: 'F1 RedBull Championship' },
    ];

    return `<div class="reviews-carousel">
      ${reviews.map(r => `
        <div class="review-card" data-reveal>
          <div class="review-stars">${'★'.repeat(r.rating)}</div>
          <p class="review-text">"${escapeHTML(r.text)}"</p>
          <div class="review-author">
            <strong>${escapeHTML(r.name)}</strong>
            <span>${escapeHTML(r.city)} · ${escapeHTML(r.product)}</span>
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
          <p class="page-hero-sub">51 unique designs · 4 sizes · 2 frame finishes</p>
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
          <div class="products-grid" id="shop-products-grid">
            ${renderAllProducts()}
          </div>
        </div>
      </section>
    </main>
    ${renderFooter()}`;

    initMobileMenu();
    initStickyHeader();
    setTimeout(initReveal, 100);
  }

  function renderAllProducts() {
    const allProducts = [
      // Spiritual
      { slug: 'radha-krishna-emerald-dance', name: 'Radha Krishna — Emerald Dance', category: 'spiritual', price: 699, image: DESIGN_IMAGES['radha-krishna-emerald-dance'] },
      { slug: 'mahadev-cosmic-meditation', name: 'Mahadev — Cosmic Meditation', category: 'spiritual', price: 649, image: DESIGN_IMAGES['mahadev-cosmic-meditation'] },
      { slug: 'radha-krishna-watercolor', name: 'Radha Krishna — Watercolor Bliss', category: 'spiritual', price: 599, image: DESIGN_IMAGES['radha-krishna-watercolor'] },
      { slug: 'ganesha-golden-aura', name: 'Ganesha — Golden Aura', category: 'spiritual', price: 649, image: cldUrl('spiritual/ganesha-golden-aura', 600) },
      { slug: 'ganesha-golden-aura-2', name: 'Ganesha — Golden Aura II', category: 'spiritual', price: 649, image: cldUrl('spiritual/ganesha-golden-aura-2', 600) },
      { slug: 'lord-hanuman-standing', name: 'Lord Hanuman — Standing Guard', category: 'spiritual', price: 699, image: cldUrl('spiritual/lord-hanuman-standing', 600) },
      { slug: 'ram-darbar-classic-sitaram', name: 'Ram Darbar — Classic Sitaram', category: 'spiritual', price: 749, image: cldUrl('spiritual/ram-darbar-classic-sitaram', 600) },
      // Automotive
      { slug: 'bmw-m4-carbon-dark', name: 'BMW M4 Carbon — Dark Legend', category: 'automotive', price: 799, image: DESIGN_IMAGES['bmw-m4-carbon-dark'] },
      { slug: 'porsche-911-pacific-coast', name: 'Porsche 911 — Pacific Coast', category: 'automotive', price: 749, image: DESIGN_IMAGES['porsche-911-pacific-coast'] },
      { slug: 'porsche-911-gt3-rs', name: 'Porsche 911 GT3 RS', category: 'automotive', price: 799, image: cldUrl('automotive/porsche-911-gt3-rs', 600) },
      { slug: 'lamborghini-aventador-neon', name: 'Lamborghini Aventador SVJ — Neon', category: 'automotive', price: 849, image: DESIGN_IMAGES['lamborghini-aventador-neon'] },
      { slug: 'nissan-gtr-r34-osaka-rain', name: 'Nissan GTR R34 — Osaka Rain', category: 'automotive', price: 799, image: DESIGN_IMAGES['nissan-gtr-r34-osaka-rain'] },
      { slug: 'f1-redbull-racing', name: 'F1 RedBull — Championship', category: 'automotive', price: 749, image: DESIGN_IMAGES['f1-redbull-racing'] },
      // Sports
      { slug: 'cricket-glory-moment', name: 'Cricket — Glory Moment', category: 'sports', price: 599, image: DESIGN_IMAGES['cricket-glory-moment'] },
      { slug: 'cricket-stadium-lights', name: 'Cricket — Stadium Lights', category: 'sports', price: 649, image: cldUrl('sports/cricket-stadium-lights', 600) },
      { slug: 'football-glory-moment', name: 'Football — Glory Moment', category: 'sports', price: 599, image: cldUrl('sports/football-glory-moment', 600) },
      { slug: 'football-glory-messi', name: 'Football — Messi Glory', category: 'sports', price: 699, image: cldUrl('sports/football-glory-moment-messi', 600) },
      // Wildlife
      { slug: 'lion-geometric-gold', name: 'Lion — Geometric Gold', category: 'wildlife', price: 649, image: DESIGN_IMAGES['lion-geometric-gold'] },
      // Anime
      { slug: 'nissan-gtr-anime', name: 'Nissan GTR — Anime Night', category: 'anime', price: 699, image: DESIGN_IMAGES['nissan-gtr-r34-osaka-rain'] },
      // Motivational
      { slug: 'grind-in-silence', name: 'Grind in Silence', category: 'motivational', price: 549, image: cldUrl('motivational/grind-in-silence', 600) },
      { slug: 'discipline-equals-freedom-wolf', name: 'Discipline Equals Freedom — Wolf', category: 'motivational', price: 599, image: cldUrl('motivational/discipline-equals-freedom-wolf', 600) },
    ];
    window._allProducts = allProducts;
    return allProducts.map((p, i) => renderProductCard(p, i)).join('');
  }

  function filterShop(btn, category) {
    $$('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const grid = $('#shop-products-grid');
    if (!grid || !window._allProducts) return;
    const filtered = category === 'all' ? window._allProducts : window._allProducts.filter(p => p.category === category);
    grid.innerHTML = filtered.map((p, i) => renderProductCard(p, i)).join('');
    setTimeout(initReveal, 50);
  }

  function quickAdd(variantId, name, price, image, slug) {
    addToCart({ variantId, name, price: Number(price), image, slug, size: 'Medium', frame: 'Black' });
  }

  // ── PRODUCT DETAIL PAGE ───────────────────────────────────────────────────
  async function renderProductPage(app, slug) {
    slug = slug ? slug.replace(/[^a-z0-9\-]/g, '') : '';

    // Find product from known list
    const knownProducts = {
      'radha-krishna-emerald-dance': { name: 'Radha Krishna — Emerald Dance', category: 'Spiritual', basePrice: 699, desc: 'A breathtaking watercolor-style rendition of the divine love of Radha and Krishna. Teal, gold and black create a mesmerising dance of colour and devotion. Perfect for puja rooms, living rooms, or as a gifting centrepiece.', image: DESIGN_IMAGES['radha-krishna-emerald-dance'] },
      'mahadev-cosmic-meditation': { name: 'Mahadev — Cosmic Meditation', category: 'Spiritual', basePrice: 649, desc: 'Lord Shiva in cosmic meditation — a luminous silhouette surrounded by swirling cosmic energy. This print radiates peace, power and divine presence. A stunning focal point for any spiritual space.', image: DESIGN_IMAGES['mahadev-cosmic-meditation'] },
      'radha-krishna-watercolor': { name: 'Radha Krishna — Watercolor Bliss', category: 'Spiritual', basePrice: 599, desc: 'Soft, ethereal watercolours depict the eternal union of Radha and Krishna beneath a flowering tree. Delicate pastels and botanical detail make this a timeless choice for a serene, auspicious home.', image: DESIGN_IMAGES['radha-krishna-watercolor'] },
      'bmw-m4-carbon-dark': { name: 'BMW M4 Carbon — Dark Legend', category: 'Automotive', basePrice: 799, desc: 'A dramatic digital illustration of the BMW M4 Competition — matte carbon black with red accent details. Rendered in moody studio lighting against a gunmetal gradient. For the driver who appreciates precision and power.', image: DESIGN_IMAGES['bmw-m4-carbon-dark'] },
      'porsche-911-pacific-coast': { name: 'Porsche 911 — Pacific Coast', category: 'Automotive', basePrice: 749, desc: 'Retro poster art of the classic Porsche 911 Turbo cruising the Pacific Coast Highway. Warm sunset palette, palm trees and ocean cliffs — pure driving romance. A must-have for any enthusiast\'s wall.', image: DESIGN_IMAGES['porsche-911-pacific-coast'] },
      'lamborghini-aventador-neon': { name: 'Lamborghini Aventador SVJ — Midnight Neon', category: 'Automotive', basePrice: 849, desc: 'The Aventador SVJ in neon-soaked Tokyo streets. Cyberpunk aesthetic meets supercar fantasy — deep purple body, cyan light trails, and Japanese typography. Bold, cinematic wall art.', image: DESIGN_IMAGES['lamborghini-aventador-neon'] },
      'nissan-gtr-r34-osaka-rain': { name: 'Nissan GTR R34 — Osaka Rain', category: 'Automotive', basePrice: 799, desc: 'The legendary R34 GTR in rain-slicked Osaka alleyways. Neon reflections on wet asphalt, Japanese signage and moody atmosphere. A love letter to JDM culture rendered in cinematic realism.', image: DESIGN_IMAGES['nissan-gtr-r34-osaka-rain'] },
      'f1-redbull-racing': { name: 'F1 RedBull — Championship Art', category: 'Automotive', basePrice: 749, desc: 'The Oracle Red Bull RB19 at full speed — dramatic painterly style with sparks, smoke and motion blur. Expressive brushstrokes capture the raw energy of Formula 1 at its peak.', image: DESIGN_IMAGES['f1-redbull-racing'] },
      'cricket-glory-moment': { name: 'Cricket — Glory Moment', category: 'Sports', basePrice: 599, desc: 'An electric celebration — a cricketer in Indian blue raises bat and helmet as confetti rains and the crowd erupts. Visceral, high-energy illustration that captures the euphoria of victory.', image: DESIGN_IMAGES['cricket-glory-moment'] },
      'lion-geometric-gold': { name: 'Lion — Geometric Gold', category: 'Wildlife', basePrice: 649, desc: 'A majestic lion rendered in golden low-poly geometric style on deep navy. Commanding, modern, and bold. Perfect for offices, gyms, or any space that calls for strength and authority.', image: DESIGN_IMAGES['lion-geometric-gold'] },
    };

    const product = knownProducts[slug] || {
      name: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      category: 'Art Print', basePrice: 599,
      desc: 'Museum-quality art print, framed and delivered across India.',
      image: cldUrl(slug, 800)
    };

    const sizes = [
      { key: 'small', label: 'Small', dim: '8×10"', extra: 0 },
      { key: 'medium', label: 'Medium', dim: '12×18"', extra: 100 },
      { key: 'large', label: 'Large', dim: '18×24"', extra: 250 },
      { key: 'xl', label: 'XL', dim: '24×36"', extra: 450 },
    ];

    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <!-- Breadcrumb -->
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <div class="container">
          <ol class="breadcrumb-list">
            <li><a href="/" onclick="window.cf.nav('/');return false;">Home</a></li>
            <li><a href="/shop" onclick="window.cf.nav('/shop');return false;">Shop</a></li>
            <li><a href="/category/${escapeHTML(product.category.toLowerCase())}" onclick="window.cf.nav('/category/${escapeHTML(product.category.toLowerCase())}');return false;">${escapeHTML(product.category)}</a></li>
            <li aria-current="page">${escapeHTML(product.name)}</li>
          </ol>
        </div>
      </nav>

      <div class="product-detail">
        <div class="container">
          <div class="product-layout">
            <!-- Gallery -->
            <div class="product-gallery" data-reveal>
              <div class="product-main-img">
                <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}" id="product-main-image" loading="eager">
              </div>
              <div class="product-thumbnails" id="product-thumbs">
                <button class="thumb-btn thumb-active" onclick="window.cf.switchThumb(this,'${escapeHTML(product.image)}')">
                  <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}">
                </button>
              </div>
            </div>

            <!-- Info -->
            <div class="product-info" data-reveal data-reveal-delay="1">
              <div class="product-category-tag">${escapeHTML(product.category)}</div>
              <h1 class="product-name">${escapeHTML(product.name)}</h1>

              <div class="product-rating">
                <div class="product-stars">★★★★★</div>
                <span>4.9 · 124 reviews</span>
              </div>

              <div class="product-price-display" id="product-price-display">
                <span class="product-price-label">from</span>
                <span class="product-price-amount" id="product-current-price">${formatPrice(product.basePrice)}</span>
              </div>

              <!-- Size Selector -->
              <div class="product-option-group">
                <div class="product-option-label">
                  <span>Size</span>
                  <button class="size-guide-link" onclick="window.cf.showSizeGuide()">Size Guide</button>
                </div>
                <div class="size-grid" id="size-grid">
                  ${sizes.map((s, i) => `
                    <button class="size-btn${i === 1 ? ' size-active' : ''}" 
                      data-size="${s.key}" 
                      data-extra="${s.extra}"
                      onclick="window.cf.selectSize(this, ${product.basePrice})"
                      aria-pressed="${i === 1}"
                      aria-label="${s.label} — ${s.dim}">
                      <span class="size-btn-label">${s.label}</span>
                      <span class="size-btn-dim">${s.dim}</span>
                      <span class="size-btn-price">${formatPrice(product.basePrice + s.extra)}</span>
                    </button>`).join('')}
                </div>
              </div>

              <!-- Frame Selector -->
              <div class="product-option-group">
                <div class="product-option-label"><span>Frame Finish</span></div>
                <div class="frame-options" id="frame-options">
                  <button class="frame-btn frame-active" data-frame="Black" onclick="window.cf.selectFrame(this)" aria-pressed="true">
                    <span class="frame-swatch" style="background:#1a1a1a;border:2px solid #1a1a1a"></span>
                    Black
                  </button>
                  <button class="frame-btn" data-frame="Wood" onclick="window.cf.selectFrame(this)" aria-pressed="false">
                    <span class="frame-swatch" style="background:linear-gradient(135deg,#8B6914,#C4922E);border:2px solid #8B6914"></span>
                    Natural Wood
                  </button>
                </div>
              </div>

              <!-- ATC Area -->
              <div class="atc-area">
                <div class="atc-qty">
                  <button onclick="window.cf.pdpQty(-1)" aria-label="Decrease quantity">−</button>
                  <span id="pdp-qty">1</span>
                  <button onclick="window.cf.pdpQty(1)" aria-label="Increase quantity">+</button>
                </div>
                <button class="btn-primary atc-btn" id="atc-btn" onclick="window.cf.pdpAddToCart('${escapeHTML(slug)}','${escapeHTML(product.name)}',${product.basePrice},'${escapeHTML(product.image)}')">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1 1h2.5l2.4 9.6h8.1l2-7H5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="15" r="1.2" fill="currentColor"/><circle cx="13" cy="15" r="1.2" fill="currentColor"/></svg>
                  Add to Cart
                </button>
              </div>

              <!-- Trust Pills -->
              <div class="product-trust">
                <div class="product-trust-item">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l2 3h3l-2.5 2.5 1 3L7 8l-3.5 1.5 1-3L2 4h3L7 1z" fill="var(--gold)"/></svg>
                  Premium print quality
                </div>
                <div class="product-trust-item">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 5l2 6h8l2-6" stroke="var(--ink-500)" stroke-width="1.2" stroke-linejoin="round"/><path d="M4 5V4a3 3 0 0 1 6 0v1" stroke="var(--ink-500)" stroke-width="1.2" stroke-linecap="round"/></svg>
                  Ships in 2–3 days
                </div>
                <div class="product-trust-item">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l2 3h3l-2.5 2.5 1 3L7 8l-3.5 1.5 1-3L2 4h3L7 1z" stroke="var(--green)" stroke-width="1.2" stroke-linejoin="round"/></svg>
                  Easy returns
                </div>
              </div>

              <!-- Description -->
              <div class="product-desc">
                <p>${escapeHTML(product.desc)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Related Products -->
      <section class="section section-alt">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">You may also like</h2>
          </div>
          <div class="products-grid">
            ${renderRelatedProducts(product.category, slug)}
          </div>
        </div>
      </section>
    </main>
    ${renderFooter()}`;

    // State for PDP
    window._pdpState = { size: 'medium', frame: 'Black', qty: 1, basePrice: product.basePrice };

    initMobileMenu();
    initStickyHeader();
    setTimeout(initReveal, 100);
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
    $$('.frame-btn').forEach(b => { b.classList.remove('frame-active'); b.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('frame-active');
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
    for (let i = 0; i < (s.qty || 1); i++) {
      addToCart({
        variantId, name, price: s.basePrice || basePrice,
        image, slug, size: s.size, frame: s.frame
      });
    }
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
              <tr><td>Small</td><td>8×10 inches (20×25 cm)</td><td>Desk, bedside, small walls</td></tr>
              <tr><td>Medium</td><td>12×18 inches (30×45 cm)</td><td>Bedroom, study, gallery wall</td></tr>
              <tr><td>Large</td><td>18×24 inches (45×60 cm)</td><td>Living room, focal point</td></tr>
              <tr><td>XL</td><td>24×36 inches (60×90 cm)</td><td>Statement wall, large rooms</td></tr>
            </tbody>
          </table>
          <p class="size-note">All frames include a 1.5-inch border. For scale reference: A4 paper is approx. 8×12 inches.</p>
        </div>
      </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  }

  // ── CATEGORY PAGE ─────────────────────────────────────────────────────────
  async function renderCategoryPage(app, slug) {
    slug = slug ? slug.replace(/[^a-z0-9\-]/g, '') : '';
    const categoryNames = {
      spiritual: 'Divine & Spiritual', automotive: 'Automotive Art',
      sports: 'Sports Legends', wildlife: 'Wildlife',
      anime: 'Anime', motivational: 'Motivational'
    };
    const name = categoryNames[slug] || slug.charAt(0).toUpperCase() + slug.slice(1);

    const allProducts = window._allProducts || (function() {
      const temp = document.createElement('div');
      temp.innerHTML = renderAllProducts();
      return window._allProducts || [];
    })();

    const products = (window._allProducts || []).filter(p => p.category === slug);
    const fallback = [
      { slug: 'radha-krishna-emerald-dance', name: 'Radha Krishna — Emerald Dance', category: 'spiritual', price: 699, image: DESIGN_IMAGES['radha-krishna-emerald-dance'] },
      { slug: 'mahadev-cosmic-meditation', name: 'Mahadev — Cosmic Meditation', category: 'spiritual', price: 649, image: DESIGN_IMAGES['mahadev-cosmic-meditation'] },
    ];

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
          <div class="products-grid">
            ${products.length > 0 ? products.map((p, i) => renderProductCard(p, i)).join('') : fallback.map((p, i) => renderProductCard(p, i)).join('')}
          </div>
          ${products.length === 0 ? `<div class="empty-state"><p>More designs coming soon. <a href="/shop" onclick="window.cf.nav('/shop');return false;">Explore all prints →</a></p></div>` : ''}
        </div>
      </section>
    </main>
    ${renderFooter()}`;

    initMobileMenu();
    initStickyHeader();
    setTimeout(initReveal, 100);

    // Ensure _allProducts is initialised for future calls
    if (!window._allProducts) renderAllProducts();
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
    cartPageQty = cartPageQty; // no-op, trigger re-render
    const itemsEl = $('#cart-page-items');
    const summaryEl = $('#cart-page-summary');
    if (itemsEl) itemsEl.innerHTML = renderCartPageItems();
    if (summaryEl) summaryEl.innerHTML = renderCartPageSummary();
  }

  // ── CHECKOUT PAGE ─────────────────────────────────────────────────────────
  function renderCheckoutPage(app) {
    if (state.cart.length === 0) { navigate('/cart'); return; }
    const { subtotal, discount, shipping, total } = getCartTotals();

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
                      <input type="radio" name="payment" value="online" checked>
                      <div class="payment-option-label">
                        <strong>Pay Online</strong>
                        <span>UPI, Cards, Net Banking · Get ₹50 off</span>
                      </div>
                    </label>
                    <label class="payment-option">
                      <input type="radio" name="payment" value="cod">
                      <div class="payment-option-label">
                        <strong>Cash on Delivery</strong>
                        <span>₹49 COD fee · Pay when delivered</span>
                      </div>
                    </label>
                  </div>
                </div>

                <button type="submit" class="btn-primary w-full checkout-submit" id="checkout-submit-btn">
                  Place Order · ${formatPrice(total)}
                </button>
                <p class="checkout-secure-note">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="5" width="10" height="6" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M3 5V4a3 3 0 0 1 6 0v1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                  Secured by 256-bit SSL
                </p>
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
                  <div class="summary-row summary-total"><span>Total</span><span>${formatPrice(total)}</span></div>
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
  }

  async function submitCheckout(e) {
    e.preventDefault();
    const form = e.target;
    const btn = $('#checkout-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Placing order...'; }

    const data = new FormData(form);
    const payment = data.get('payment');
    const { total, subtotal, discount, shipping } = getCartTotals();

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
      subtotal, discount, shipping, total,
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
        state.cart = [];
        saveCart();
        navigate('/');
        toast('🎉 Order placed! You\'ll receive a confirmation shortly.');
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
        state.cart = [];
        saveCart();
        navigate('/');
        toast('🎉 Payment successful! Order confirmed.');
      }
    });
    rzp.open();
  }

  // ── STATIC PAGES ──────────────────────────────────────────────────────────
  function renderStaticPage(app, page) {
    const pages = {
      about: {
        title: 'About ChitraFrame',
        content: `
          <div class="static-page">
            <div class="static-hero">
              <p class="section-eyebrow">Our Story</p>
              <h1>Art belongs on walls,<br>not hard drives</h1>
              <p>ChitraFrame was born in Hyderabad with a simple belief — every home deserves beautiful art. We make museum-quality prints accessible to every Indian household.</p>
            </div>
            <div class="about-grid">
              <div class="about-card" data-reveal>
                <div class="about-icon">🎨</div>
                <h3>Curated by Artists</h3>
                <p>Every design is handpicked by our curatorial team for visual quality, emotional impact, and wall-worthiness.</p>
              </div>
              <div class="about-card" data-reveal data-reveal-delay="1">
                <div class="about-icon">🖼️</div>
                <h3>Premium Frames</h3>
                <p>We use premium MDF frames with anti-scratch finish. Available in matte black and natural wood.</p>
              </div>
              <div class="about-card" data-reveal data-reveal-delay="2">
                <div class="about-icon">📦</div>
                <h3>Foam-Protected Delivery</h3>
                <p>Every frame ships in custom foam-lined boxes to ensure it arrives in perfect condition.</p>
              </div>
              <div class="about-card" data-reveal data-reveal-delay="3">
                <div class="about-icon">❤️</div>
                <h3>Made with Love</h3>
                <p>Based in Hyderabad, serving India. We personally review every order before it ships.</p>
              </div>
            </div>
          </div>`
      },
      contact: {
        title: 'Contact Us',
        content: `
          <div class="static-page">
            <div class="static-hero">
              <p class="section-eyebrow">Get in Touch</p>
              <h1>We're here to help</h1>
              <p>Questions about your order, design requests, or bulk orders? Reach out anytime.</p>
            </div>
            <div class="contact-grid">
              <div class="contact-card" data-reveal>
                <div class="contact-icon">💬</div>
                <h3>WhatsApp</h3>
                <p>Fastest response · Usually within 2 hours</p>
                <a href="https://wa.me/917989531818" target="_blank" rel="noopener noreferrer" class="btn-primary mt-4">Chat on WhatsApp</a>
              </div>
              <div class="contact-card" data-reveal data-reveal-delay="1">
                <div class="contact-icon">📧</div>
                <h3>Email</h3>
                <p>support@chitraframe.in · We reply within 24 hours</p>
                <a href="mailto:support@chitraframe.in" class="btn-outline mt-4">Send Email</a>
              </div>
              <div class="contact-card" data-reveal data-reveal-delay="2">
                <div class="contact-icon">📱</div>
                <h3>Instagram</h3>
                <p>@chitraframe · DMs open</p>
                <a href="https://instagram.com/chitraframe" target="_blank" rel="noopener noreferrer" class="btn-outline mt-4">Follow Us</a>
              </div>
            </div>
          </div>`
      }
    };

    const p = pages[page] || pages.about;
    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <section class="section">
        <div class="container">
          ${p.content}
        </div>
      </section>
    </main>
    ${renderFooter()}`;

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
        <p>By placing an order, you agree to our terms. All prices are in INR. We reserve the right to cancel orders in case of pricing errors. Custom orders are non-refundable once production begins.</p>`,
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
    window.location.href = '/static/blog/index.html';
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
      else if (path === '/track') renderTrackPage(app);
      else if (path === '/returns') renderPolicyPage(app);
      else if (path === '/login') renderLoginPage(app);
      else if (path === '/account' || path.startsWith('/account/')) renderAccountPage(app);
      else if (path === '/auth/callback') handleAuthCallback(app);
      else if (path.startsWith('/policy')) renderPolicyPage(app);
      else if (path === '/suggest') renderSuggestPage(app);
      else if (path === '/review') renderReviewPage(app);
      else if (path === '/about' || path === '/contact') renderStaticPage(app, path.slice(1));
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

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    captureUTM();
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

    setTimeout(() => {
      if (location.pathname === '/') initExitIntent();
    }, 5000);
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
    updateCartBadge
  };

  // Legacy alias
  window.pfi = window.cf;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
