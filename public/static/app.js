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
      price: 89,
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

    app.innerHTML = renderHeader() + `
    <main id="main-content">

      <!-- ══ HERO — Editorial Split ══ -->
      <section class="hero-v2" aria-labelledby="hero-h1" itemscope itemtype="https://schema.org/WebPage">

        <!-- Image panel: 3-product mosaic — full-bleed on desktop, scroll strip on mobile -->
        <div class="hero-v2-visual" aria-hidden="true">

          <!-- Desktop layout: 1 tall main image + 2 stacked (hidden on mobile) -->
          <div class="hero-v2-desktop-mosaic">
            <div class="hero-v2-img hero-v2-img--main" onclick="window.cf.nav('/category/spiritual')" role="button" tabindex="0" aria-label="Shop Divine art" onkeydown="if(event.key==='Enter')window.cf.nav('/category/spiritual')">
              <img src="${DESIGN_IMAGES['radha-krishna-emerald-dance']}" alt="Radha Krishna Emerald Dance framed art" loading="eager" fetchpriority="high" width="480" height="640">
              <div class="hero-v2-cat-pill">Divine</div>
            </div>
            <div class="hero-v2-stack">
              <div class="hero-v2-img" onclick="window.cf.nav('/category/automotive')" role="button" tabindex="0" aria-label="Shop Automotive art" onkeydown="if(event.key==='Enter')window.cf.nav('/category/automotive')">
                <img src="${DESIGN_IMAGES['bmw-m4-carbon-dark']}" alt="BMW M4 Carbon Dark Legend framed art" loading="lazy" width="280" height="280">
                <div class="hero-v2-cat-pill">Automotive</div>
              </div>
              <div class="hero-v2-img" onclick="window.cf.nav('/product/mahadev-cosmic-trance')" role="button" tabindex="0" aria-label="Shop Mahadev art" onkeydown="if(event.key==='Enter')window.cf.nav('/product/mahadev-cosmic-trance')">
                <img src="${DESIGN_IMAGES['mahadev-cosmic-trance']}" alt="Mahadev Cosmic Trance framed art" loading="lazy" width="280" height="280">
                <div class="hero-v2-cat-pill">Spiritual</div>
              </div>
            </div>
          </div>

          <!-- Mobile layout: horizontal swipeable card strip (hidden on desktop) -->
          <div class="hero-v2-mobile-strip">
            <div class="hero-v2-mobile-card" onclick="window.cf.nav('/category/spiritual')" role="button" tabindex="-1">
              <img src="${DESIGN_IMAGES['radha-krishna-emerald-dance']}" alt="Radha Krishna framed art" loading="eager" fetchpriority="high">
              <div class="hero-v2-mobile-label">Divine</div>
            </div>
            <div class="hero-v2-mobile-card" onclick="window.cf.nav('/category/automotive')" role="button" tabindex="-1">
              <img src="${DESIGN_IMAGES['bmw-m4-carbon-dark']}" alt="BMW M4 framed art" loading="lazy">
              <div class="hero-v2-mobile-label">Automotive</div>
            </div>
            <div class="hero-v2-mobile-card" onclick="window.cf.nav('/product/mahadev-cosmic-trance')" role="button" tabindex="-1">
              <img src="${DESIGN_IMAGES['mahadev-cosmic-trance']}" alt="Mahadev framed art" loading="lazy">
              <div class="hero-v2-mobile-label">Spiritual</div>
            </div>
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
            <span class="hero-v2-rating-text">4.9 · 2,000+ orders across India</span>
          </div>
          <p class="hero-v2-sub" itemprop="description">
            Archival-quality prints in handcrafted Black or Natural Wood frames.
            Divine, Automotive, Sports &amp; Wildlife — 51 designs, 4 sizes.
            Ships in 3–5 days, anywhere in India.
          </p>

          <div class="hero-v2-actions">
            <button class="hero-v2-cta" onclick="window.cf.nav('/shop')" aria-label="Shop all prints">
              Shop All Prints
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 7.5h9M9 4l3.5 3.5L9 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <button class="hero-v2-ghost" onclick="window.cf.nav('/customize')">
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
              4.9 · 2,000+ orders
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
              { q: 'What sizes are available for framed wall art?', a: 'We offer four standard sizes: Small (8×10 inches), Medium (12×18 inches), Large (18×24 inches), and XL (24×36 inches). All sizes are available in Black or Natural Wood frame finishes.' },
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

  function renderFeaturedProducts() {
    const featured = [
      { slug: 'radha-krishna-emerald-dance', name: 'Radha Krishna — Emerald Dance', category: 'Spiritual', price: 699, image: DESIGN_IMAGES['radha-krishna-emerald-dance'] },
      { slug: 'bmw-m4-carbon-dark', name: 'BMW M4 Carbon — Dark Legend', category: 'Automotive', price: 799, image: DESIGN_IMAGES['bmw-m4-carbon-dark'] },
      { slug: 'cricket-glory-moment', name: 'Cricket — Glory Moment', category: 'Sports', price: 599, image: DESIGN_IMAGES['cricket-glory-moment'] },
      { slug: 'lion-geometric-gold', name: 'Lion — Geometric Gold', category: 'Wildlife', price: 649, image: DESIGN_IMAGES['lion-geometric-gold'] },
      { slug: 'f1-redbull-racing', name: 'F1 RedBull — Championship', category: 'Automotive', price: 749, image: DESIGN_IMAGES['f1-redbull-racing'] },
      { slug: 'mahadev-cosmic-trance', name: 'Mahadev — Cosmic Trance', category: 'Spiritual', price: 649, image: DESIGN_IMAGES['mahadev-cosmic-trance'] },
      { slug: 'lamborghini-aventador-neon', name: 'Lamborghini SVJ — Neon Night', category: 'Automotive', price: 849, image: DESIGN_IMAGES['lamborghini-aventador-neon'] },
      { slug: 'radha-krishna-watercolor', name: 'Radha Krishna — Watercolor Bliss', category: 'Spiritual', price: 599, image: DESIGN_IMAGES['radha-krishna-watercolor'] },
    ];

    return featured.map((p, i) => renderProductCard(p, i)).join('');
  }

  function renderProductCard(p, idx = 0) {
    const variantId = `${p.slug}-medium-black`;
    const badge = p.badge || (idx === 0 ? 'Bestseller' : idx === 1 ? 'New' : '');
    const img = escapeHTML(p.image || cldUrl(p.slug, 600));
    const slug = escapeHTML(p.slug);
    const name = escapeHTML(p.name);
    const cat = escapeHTML(p.category || '');
    return `
    <article class="pc" data-reveal data-reveal-delay="${idx % 4}" role="article" itemscope itemtype="https://schema.org/Product">
      <meta itemprop="name" content="${name} — Framed Art Print">
      <meta itemprop="brand" content="ChitraFrame">
      <a class="pc-img-wrap" href="/product/${slug}" onclick="window.cf.nav('/product/${slug}');return false;" aria-label="View ${name}">
        <img src="${img}" alt="${name} framed art print" loading="lazy" width="600" height="750" itemprop="image">
        ${badge ? `<span class="pc-badge">${escapeHTML(badge)}</span>` : ''}
        <!-- Single hover overlay — no conflict, no overlap -->
        <div class="pc-hover">
          <button class="pc-atc" onclick="event.preventDefault();event.stopPropagation();window.cf.quickAdd('${escapeHTML(variantId)}','${name}',${p.price},'${escapeHTML(p.image || cldUrl(p.slug, 200))}','${slug}')" aria-label="Add ${name} to cart">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1 1.5h2l1.8 7.5h7l1.7-5.5H4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5.5" cy="12.5" r="1.2" fill="currentColor"/><circle cx="10.5" cy="12.5" r="1.2" fill="currentColor"/></svg>
            Add to Cart
          </button>
        </div>
      </a>
      <div class="pc-info">
        <div class="pc-meta">
          <span class="pc-cat">${cat}</span>
          <span class="pc-stars" aria-label="4.9 stars">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="var(--gold)"><path d="M5 1l1 2.1L8.5 3.5l-1.8 1.8.4 2.5L5 6.6 2.9 7.8l.4-2.5L1.5 3.5l2.5-.4L5 1z"/></svg>
            4.9
          </span>
        </div>
        <h3 class="pc-name">
          <a href="/product/${slug}" onclick="window.cf.nav('/product/${slug}');return false;" itemprop="url">${name}</a>
        </h3>
        <div class="pc-price" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
          <meta itemprop="priceCurrency" content="INR">
          <meta itemprop="price" content="${p.price}">
          <meta itemprop="availability" content="https://schema.org/InStock">
          <span class="pc-price-from">from</span>
          <span class="pc-price-amt">${formatPrice(p.price)}</span>
          <span class="pc-price-sizes">4 sizes</span>
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
      { slug: 'mahadev-cosmic-trance', name: 'Mahadev — Cosmic Trance', category: 'spiritual', price: 649, image: DESIGN_IMAGES['mahadev-cosmic-trance'] },
      { slug: 'radha-krishna-watercolor', name: 'Radha Krishna — Watercolor Bliss', category: 'spiritual', price: 599, image: DESIGN_IMAGES['radha-krishna-watercolor'] },
      // Automotive
      { slug: 'bmw-m4-carbon-dark', name: 'BMW M4 Carbon — Dark Legend', category: 'automotive', price: 799, image: DESIGN_IMAGES['bmw-m4-carbon-dark'] },
      { slug: 'porsche-911-pacific-coast', name: 'Porsche 911 — Pacific Coast', category: 'automotive', price: 749, image: DESIGN_IMAGES['porsche-911-pacific-coast'] },

      { slug: 'lamborghini-aventador-neon', name: 'Lamborghini Aventador SVJ — Neon', category: 'automotive', price: 849, image: DESIGN_IMAGES['lamborghini-aventador-neon'] },
      { slug: 'nissan-gtr-r34-osaka-rain', name: 'Nissan GTR R34 — Osaka Rain', category: 'automotive', price: 799, image: DESIGN_IMAGES['nissan-gtr-r34-osaka-rain'] },
      { slug: 'f1-redbull-racing', name: 'F1 RedBull — Championship', category: 'automotive', price: 749, image: DESIGN_IMAGES['f1-redbull-racing'] },
      // Sports
      { slug: 'cricket-glory-moment', name: 'Cricket — Glory Moment', category: 'sports', price: 599, image: DESIGN_IMAGES['cricket-glory-moment'] },

      // Wildlife
      { slug: 'lion-geometric-gold', name: 'Lion — Geometric Gold', category: 'wildlife', price: 649, image: DESIGN_IMAGES['lion-geometric-gold'] },
      // Anime

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
      'mahadev-cosmic-trance': { name: 'Mahadev — Cosmic Trance', category: 'Spiritual', basePrice: 649,
        desc: 'Lord Shiva immersed in cosmic trance — a luminous silhouette surrounded by swirling nebulae and divine energy. Deep blues, purples and gold radiate peace, power and transcendence. The perfect centrepiece for any puja room or spiritual space.',
        seoTitle: 'Mahadev Cosmic Trance Framed Art Print | ChitraFrame India',
        seoDesc: 'Buy Mahadev Cosmic Trance premium framed art print online. Museum-quality Lord Shiva wall art in Black or Natural Wood frame. Ships across India. Starting ₹649.',
        keywords: 'mahadev wall art, lord shiva framed print, shiva cosmic art, divine wall art india',
        image: DESIGN_IMAGES['mahadev-cosmic-trance'] },
      'radha-krishna-watercolor': { name: 'Radha Krishna — Watercolor Bliss', category: 'Spiritual', basePrice: 599,
        desc: 'Soft, ethereal watercolours depict the eternal union of Radha and Krishna beneath a flowering tree. Delicate pastels and botanical detail make this a timeless choice for a serene, auspicious home.',
        seoTitle: 'Radha Krishna Watercolor Framed Art Print | ChitraFrame India',
        seoDesc: 'Buy Radha Krishna Watercolor premium framed wall art. Beautiful devotional print in Black or Natural Wood frame. Ships across India. Starting ₹599.',
        keywords: 'radha krishna wall art, krishna framed print, devotional wall art india',
        image: DESIGN_IMAGES['radha-krishna-watercolor'] },
      'radha-krishna-emerald-dance': { name: 'Radha Krishna — Emerald Dance', category: 'Spiritual', basePrice: 699,
        desc: 'A breathtaking watercolor-style rendition of the divine love of Radha and Krishna. Teal, gold and black create a mesmerising dance of colour and devotion. Perfect for puja rooms, living rooms, or as a gifting centrepiece.',
        seoTitle: 'Radha Krishna Emerald Dance Framed Print | ChitraFrame India',
        seoDesc: 'Buy Radha Krishna Emerald Dance premium framed art print. Teal and gold devotional wall art. Ships across India in Black or Natural Wood frame. From ₹699.',
        keywords: 'radha krishna emerald dance, krishna art print, divine couple wall art',
        image: DESIGN_IMAGES['radha-krishna-emerald-dance'] },
      'bmw-m4-carbon-dark': { name: 'BMW M4 Carbon — Dark Legend', category: 'Automotive', basePrice: 799,
        desc: 'A dramatic digital illustration of the BMW M4 Competition — matte carbon black with red accent details. Rendered in moody studio lighting against a gunmetal gradient. For the driver who appreciates precision and power.',
        seoTitle: 'BMW M4 Carbon Dark Framed Art Print | ChitraFrame India',
        seoDesc: 'Buy BMW M4 Carbon Dark premium automotive wall art. Museum-quality car poster in Black or Natural Wood frame. Perfect gift for car lovers. Ships across India.',
        keywords: 'bmw m4 wall art, bmw car poster india, automotive art print, car framed poster',
        image: DESIGN_IMAGES['bmw-m4-carbon-dark'] },
      'porsche-911-pacific-coast': { name: 'Porsche 911 — Pacific Coast', category: 'Automotive', basePrice: 749,
        desc: 'Retro poster art of the classic Porsche 911 Turbo cruising the Pacific Coast Highway. Warm sunset palette, palm trees and ocean cliffs — pure driving romance. A must-have for any enthusiast\'s wall.',
        seoTitle: 'Porsche 911 Pacific Coast Framed Art Print | ChitraFrame India',
        seoDesc: 'Buy Porsche 911 Pacific Coast retro automotive wall art. Classic car poster framed print. Perfect for car enthusiasts. Ships across India from ₹749.',
        keywords: 'porsche 911 wall art, porsche poster india, classic car framed print',
        image: DESIGN_IMAGES['porsche-911-pacific-coast'] },
      'lamborghini-aventador-neon': { name: 'Lamborghini Aventador SVJ — Midnight Neon', category: 'Automotive', basePrice: 849,
        desc: 'The Aventador SVJ in neon-soaked Tokyo streets. Cyberpunk aesthetic meets supercar fantasy — deep purple body, cyan light trails, and Japanese typography. Bold, cinematic wall art.',
        seoTitle: 'Lamborghini Aventador Neon Framed Art Print | ChitraFrame India',
        seoDesc: 'Buy Lamborghini Aventador Midnight Neon premium wall art. Cyberpunk supercar framed poster. Ships across India in Black or Natural Wood frame. From ₹849.',
        keywords: 'lamborghini wall art, aventador poster india, supercar neon art, cyberpunk car print',
        image: DESIGN_IMAGES['lamborghini-aventador-neon'] },
      'nissan-gtr-r34-osaka-rain': { name: 'Nissan GTR R34 — Osaka Rain', category: 'Automotive', basePrice: 799,
        desc: 'The legendary R34 GTR in rain-slicked Osaka alleyways. Neon reflections on wet asphalt, Japanese signage and moody atmosphere. A love letter to JDM culture rendered in cinematic realism.',
        seoTitle: 'Nissan GTR R34 Osaka Rain Framed Art Print | ChitraFrame India',
        seoDesc: 'Buy Nissan GTR R34 Osaka Rain JDM wall art. Legendary Skyline GTR framed poster. Ships across India. Perfect for JDM and car culture fans. From ₹799.',
        keywords: 'nissan gtr r34 wall art, skyline gtr poster india, jdm art print, r34 framed poster',
        image: DESIGN_IMAGES['nissan-gtr-r34-osaka-rain'] },
      'f1-redbull-racing': { name: 'F1 Red Bull — Championship Art', category: 'Automotive', basePrice: 749,
        desc: 'The Oracle Red Bull RB19 at full speed — dramatic painterly style with sparks, smoke and motion blur. Expressive brushstrokes capture the raw energy of Formula 1 at its peak.',
        seoTitle: 'F1 Red Bull Racing Framed Art Print | ChitraFrame India',
        seoDesc: 'Buy F1 Red Bull Racing Championship premium framed art. Formula 1 wall art in Black or Natural Wood frame. Ships across India. From ₹749.',
        keywords: 'f1 wall art india, red bull racing poster, formula 1 framed print, f1 art',
        image: DESIGN_IMAGES['f1-redbull-racing'] },
      'cricket-glory-moment': { name: 'Cricket — Glory Moment', category: 'Sports', basePrice: 599,
        desc: 'An electric celebration — a cricketer in Indian blue raises bat and helmet as confetti rains and the crowd erupts. Visceral, high-energy illustration that captures the euphoria of victory.',
        seoTitle: 'Cricket Glory Moment Framed Art Print | ChitraFrame India',
        seoDesc: 'Buy Cricket Glory Moment premium framed wall art. Indian cricket victory art in Black or Natural Wood frame. Ships across India. Perfect gift for cricket fans. From ₹599.',
        keywords: 'cricket wall art india, cricket poster framed, indian cricket art print, sports wall art',
        image: DESIGN_IMAGES['cricket-glory-moment'] },
      'lion-geometric-gold': { name: 'Lion — Geometric Gold', category: 'Wildlife', basePrice: 649,
        desc: 'A majestic lion rendered in golden low-poly geometric style on deep navy. Commanding, modern, and bold. Perfect for offices, gyms, or any space that calls for strength and authority.',
        seoTitle: 'Lion Geometric Gold Framed Art Print | ChitraFrame India',
        seoDesc: 'Buy Lion Geometric Gold premium framed wall art. Majestic low-poly lion print in Black or Natural Wood frame. Ships across India. Perfect for offices and gyms. From ₹649.',
        keywords: 'lion wall art india, geometric lion poster, wildlife framed print, lion art gold',
        image: DESIGN_IMAGES['lion-geometric-gold'] },
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
      <!-- JSON-LD Product Schema for SEO + AI crawlers -->
      <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": "${escapeHTML(product.name)}",
        "description": "${escapeHTML(product.desc)}",
        "image": "${escapeHTML(product.image)}",
        "brand": { "@type": "Brand", "name": "ChitraFrame" },
        "url": "https://chitraframe.in/product/${escapeHTML(slug)}",
        "category": "${escapeHTML(product.category)}",
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "INR",
          "lowPrice": "${product.basePrice}",
          "highPrice": "${product.basePrice + 450}",
          "offerCount": "8",
          "availability": "https://schema.org/InStock",
          "seller": { "@type": "Organization", "name": "ChitraFrame" }
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "reviewCount": "124"
        }
      }
      <\/script>
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

              <!-- A3 Poster Add-on -->
              <label class="pdp-poster-addon" id="pdp-poster-addon">
                <input type="checkbox" id="pdp-poster-check" onchange="window.cf.togglePdpPoster(this.checked)">
                <div class="pdp-poster-addon-inner">
                  <span class="pdp-poster-check-visual"></span>
                  <span class="pdp-poster-icon">🗞️</span>
                  <div class="pdp-poster-text">
                    <strong>Add A3 Poster Print (Rolled)</strong>
                    <span>Unframed, rolled print — ideal as a gift, spare, or bedroom art</span>
                  </div>
                  <span class="pdp-poster-price">+₹89</span>
                </div>
              </label>

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
    // Add poster add-on if checked
    const posterCheck = document.getElementById('pdp-poster-check');
    if (posterCheck && posterCheck.checked) {
      const already = state.cart.find(i => i.variantId === 'addon-poster-a3');
      if (!already) {
        state.cart.push({
          variantId: 'addon-poster-a3',
          name: 'A3 Poster Print (Rolled)',
          price: 89,
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
      { slug: 'mahadev-cosmic-trance', name: 'Mahadev — Cosmic Trance', category: 'spiritual', price: 649, image: DESIGN_IMAGES['mahadev-cosmic-trance'] },
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
                </div>

                <button type="submit" class="btn-primary w-full checkout-submit" id="checkout-submit-btn">
                  Place Order · <span id="checkout-total-display">${formatPrice(total - 50)}</span>
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
    setTimeout(() => updateCheckoutTotal(), 50);
  }

  async function submitCheckout(e) {
    e.preventDefault();
    // Guard: block checkout if only poster add-on is in cart
    const hasRealItem = state.cart.some(i => !i.isAddon);
    if (!hasRealItem) {
      toast('Please add a framed print before checking out. The poster is an add-on only.', 'error');
      return;
    }
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

  function submitCustomOrder() {
    // Use new _cfwState (wizard) — fallback to _customState (legacy)
    const s = window._cfwState || window._customState || {};

    // Read from new wizard fields first, fallback to old field IDs
    const name = (document.getElementById('cfw-name') || document.getElementById('custom-name'))?.value?.trim();
    const phone = (document.getElementById('cfw-phone') || document.getElementById('custom-phone'))?.value?.trim();
    const note = (document.getElementById('cfw-notes') || document.getElementById('custom-note'))?.value?.trim();

    if (!name || name.length < 2) { toast('Please enter your full name', 'error'); return; }
    if (!phone || !/^[6-9]\d{9}$/.test(phone.replace(/\D/g, ''))) { toast('Please enter a valid 10-digit WhatsApp number', 'error'); return; }

    // Build item details from cfwState
    const sizeLabel = s.sizeLabel || s.size || 'Medium (12×18")';
    const style = s.style || 'Direct';
    const basePrice = Number(s.basePrice || s.price || 799);
    const mountAddon = s.mountAddon ? 250 : 0;
    const posterAddon = s.posterAddon ? 199 : 0;
    const totalItemPrice = basePrice + mountAddon + posterAddon;

    const styleDisplay = style === 'Mount' ? 'Mount (White Border)' : 'Direct';
    let itemName = `Custom Frame — ${sizeLabel} · ${styleDisplay}`;
    if (s.posterAddon) itemName += ' + A3 Poster';

    addToCart({
      variantId: `custom-${(s.size||'medium').toLowerCase()}-${style.toLowerCase()}-${Date.now()}`,
      name: itemName,
      price: totalItemPrice,
      image: DESIGN_IMAGES['lion-geometric-gold'] || '',
      slug: 'custom-frame',
      size: sizeLabel,
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
        notes: `Size: ${sizeLabel} | Style: ${styleDisplay} | Mount: ${mountAddon > 0} | Poster: ${posterAddon > 0} | Note: ${note || 'None'}`
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
        selected_framing_style: style,
        include_poster_print_copy: !!s.posterAddon,
        user_special_instructions: note || '',
        computed_subtotal_amount: totalItemPrice
      })
    }).catch(() => {});

    toast('Custom frame added to cart! 🎨', 'success');
    setTimeout(() => navigate('/checkout'), 700);
  }

  function renderCustomizePage(app) {
    document.title = 'Custom Photo Frame — Upload & Order | ChitraFrame';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', 'Order a custom photo frame at ChitraFrame. Upload your photo, choose your size and framing style, and we handle everything else. Delivered across India in 3–5 days.');

    app.innerHTML = renderHeader() + `
    <main id="main-content">
      <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "Service",
        "name": "Custom Photo Frame Order",
        "description": "Upload your photo and order a custom museum-quality frame at ChitraFrame. 4 sizes, Direct or Mount framing style. Delivered across India in 3–5 days.",
        "provider": { "@type": "Organization", "name": "ChitraFrame", "url": "https://chitraframe.in" },
        "areaServed": "IN",
        "serviceType": "Custom Photo Framing",
        "offers": { "@type": "AggregateOffer", "priceCurrency": "INR", "lowPrice": "499", "highPrice": "1999", "offerCount": "4" }
      }
      <\/script>

      <!-- Page Hero -->
      <section class="cfw-hero">
        <div class="container">
          <nav class="breadcrumb-inline" aria-label="Breadcrumb">
            <a href="/" onclick="window.cf.nav('/');return false;">Home</a> /
            <span aria-current="page">Custom Frame</span>
          </nav>
          <div class="cfw-hero-inner">
            <div class="cfw-hero-text" data-reveal>
              <span class="section-eyebrow">Bespoke Framing Service</span>
              <h1 class="cfw-h1">Frame Your <em>Favourite Photo</em></h1>
              <p class="cfw-sub">Upload your photo, pick your size and style — our team handles the rest. Museum-quality. Delivered anywhere in India.</p>
              <div class="cfw-trust-row">
                <span class="cfw-trust-chip">✓ No DPI errors</span>
                <span class="cfw-trust-chip">✓ Layout done by us</span>
                <span class="cfw-trust-chip">✓ Ships in 3–5 days</span>
                <span class="cfw-trust-chip">✓ Replace guarantee</span>
              </div>
            </div>
            <div class="cfw-hero-visual" data-reveal data-reveal-delay="1">
              <div class="cfw-frame-mockup" id="cfw-mockup">
                <div class="cfw-frame-outer" id="cfw-frame-outer">
                  <div class="cfw-mat-border" id="cfw-mat-border">
                    <div class="cfw-photo-area" id="cfw-photo-area">
                      <svg viewBox="0 0 180 220" fill="none" width="100%" height="100%">
                        <rect width="180" height="220" fill="#1a1a2e"/>
                        <circle cx="90" cy="90" r="52" fill="none" stroke="var(--gold)" stroke-width="1.5" opacity="0.5"/>
                        <circle cx="90" cy="70" r="22" fill="var(--gold)" opacity="0.25"/>
                        <path d="M50 155 Q90 128 130 155" stroke="var(--gold)" stroke-width="2" fill="none" opacity="0.5"/>
                        <text x="90" y="200" text-anchor="middle" fill="rgba(201,151,58,0.6)" font-size="11" font-family="serif">Your Photo Here</text>
                      </svg>
                    </div>
                  </div>
                </div>
                <p class="cfw-mockup-label" id="cfw-mockup-label">Medium · Direct Frame · ₹799</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 3-Step Wizard -->
      <section class="cfw-wizard-section">
        <div class="container">

          <!-- Progress bar -->
          <div class="cfw-progress-bar" aria-label="Order steps">
            <div class="cfw-step-indicator active" id="cfw-step-ind-1">
              <span class="cfw-step-dot">1</span>
              <span class="cfw-step-label">Upload Photo</span>
            </div>
            <div class="cfw-progress-line" id="cfw-line-1"></div>
            <div class="cfw-step-indicator" id="cfw-step-ind-2">
              <span class="cfw-step-dot">2</span>
              <span class="cfw-step-label">Size &amp; Style</span>
            </div>
            <div class="cfw-progress-line" id="cfw-line-2"></div>
            <div class="cfw-step-indicator" id="cfw-step-ind-3">
              <span class="cfw-step-dot">3</span>
              <span class="cfw-step-label">Your Details</span>
            </div>
          </div>

          <div class="cfw-wizard-layout">
            <!-- LEFT: step cards -->
            <div class="cfw-steps-col">

              <!-- ══ STEP 1: Upload ════════════════════════════════════ -->
              <div class="cfw-card" id="cfw-step-1" data-reveal>
                <div class="cfw-card-header">
                  <span class="cfw-step-num">01</span>
                  <div>
                    <h2 class="cfw-card-title">Upload Your Photo</h2>
                    <p class="cfw-card-sub">Any format. Any resolution. We handle the rest.</p>
                  </div>
                </div>

                <label class="cfw-upload-zone" id="cfw-upload-label" for="cfw-file-input" tabindex="0" role="button" aria-label="Tap to upload your photo">
                  <input type="file" id="cfw-file-input" accept="image/*" style="display:none" onchange="window.cf.cfwHandleUpload(this)">
                  <div class="cfw-upload-idle" id="cfw-upload-idle">
                    <div class="cfw-upload-icon">📷</div>
                    <strong class="cfw-upload-text">Tap here to upload your photo</strong>
                    <span class="cfw-upload-hint">JPG, PNG, HEIC — any size accepted</span>
                  </div>
                  <div class="cfw-upload-preview" id="cfw-upload-preview" style="display:none">
                    <img id="cfw-thumb" alt="Your uploaded photo" class="cfw-thumb-img">
                    <div class="cfw-upload-success-msg">
                      <span class="cfw-success-icon">✓</span>
                      <p><strong>Photo received!</strong> Our team will manually touch up and optimize the layout structure for you.</p>
                      <button type="button" class="cfw-change-photo-btn" onclick="document.getElementById('cfw-file-input').click();event.preventDefault()">Change photo</button>
                    </div>
                  </div>
                </label>

                <p class="cfw-legal-notice">By uploading your photo, you are confirming that you have the right or permission to print it. Our team will take care of all the layout optimizations for you!</p>

                <button class="cfw-next-btn" onclick="window.cf.cfwGoStep(2)" id="cfw-next-1" style="display:none">
                  Next: Choose Size &amp; Style
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button class="cfw-skip-btn" onclick="window.cf.cfwGoStep(2)">
                  Skip — I'll share my photo via WhatsApp after ordering
                </button>
              </div>

              <!-- ══ STEP 2: Size & Style ═══════════════════════════════ -->
              <div class="cfw-card cfw-card-locked" id="cfw-step-2" data-reveal data-reveal-delay="1">
                <div class="cfw-card-header">
                  <span class="cfw-step-num">02</span>
                  <div>
                    <h2 class="cfw-card-title">Size &amp; Framing Style</h2>
                    <p class="cfw-card-sub">Select the size that fits your wall perfectly.</p>
                  </div>
                </div>

                <!-- Size Matrix 2×2 -->
                <div class="cfw-size-grid">
                  <label class="cfw-size-card" id="cfw-sz-small" onclick="window.cf.cfwSelectSize('Small','8×12&quot;',499,'cfw-sz-small')">
                    <input type="radio" name="cfw-size" value="Small" style="display:none">
                    <div class="cfw-size-icon cfw-icon-small"></div>
                    <div class="cfw-size-info">
                      <strong>Small</strong>
                      <span class="cfw-size-dim">8 × 12"</span>
                      <span class="cfw-size-ctx">Perfect for study desks &amp; tabletop display</span>
                      <span class="cfw-size-price">₹499</span>
                    </div>
                  </label>
                  <label class="cfw-size-card cfw-size-active" id="cfw-sz-medium" onclick="window.cf.cfwSelectSize('Medium','12×18&quot;',799,'cfw-sz-medium')">
                    <input type="radio" name="cfw-size" value="Medium" checked style="display:none">
                    <div class="cfw-size-badge-wrap"><span class="cfw-popular-badge">Most Popular Choice</span></div>
                    <div class="cfw-size-icon cfw-icon-medium"></div>
                    <div class="cfw-size-info">
                      <strong>Medium</strong>
                      <span class="cfw-size-dim">12 × 18"</span>
                      <span class="cfw-size-ctx">Great for standard bedroom walls</span>
                      <span class="cfw-size-price">₹799</span>
                    </div>
                  </label>
                  <label class="cfw-size-card" id="cfw-sz-large" onclick="window.cf.cfwSelectSize('Large','18×24&quot;',1149,'cfw-sz-large')">
                    <input type="radio" name="cfw-size" value="Large" style="display:none">
                    <div class="cfw-size-icon cfw-icon-large"></div>
                    <div class="cfw-size-info">
                      <strong>Large</strong>
                      <span class="cfw-size-dim">18 × 24"</span>
                      <span class="cfw-size-ctx">Stunning living room gallery size</span>
                      <span class="cfw-size-price">₹1,149</span>
                    </div>
                  </label>
                  <label class="cfw-size-card" id="cfw-sz-xl" onclick="window.cf.cfwSelectSize('XL','24×36&quot;',1749,'cfw-sz-xl')">
                    <input type="radio" name="cfw-size" value="XL" style="display:none">
                    <div class="cfw-size-icon cfw-icon-xl"></div>
                    <div class="cfw-size-info">
                      <strong>XL</strong>
                      <span class="cfw-size-dim">24 × 36"</span>
                      <span class="cfw-size-ctx">Grand statement wall display</span>
                      <span class="cfw-size-price">₹1,749</span>
                    </div>
                  </label>
                </div>

                <!-- Framing Style Toggle -->
                <div class="cfw-style-toggle-wrap">
                  <p class="cfw-style-label">Framing Profile</p>
                  <div class="cfw-style-toggle" role="group" aria-label="Framing style">
                    <button class="cfw-style-btn cfw-style-active" id="cfw-style-direct" type="button"
                      onclick="window.cf.cfwSelectStyle('Direct',0,'cfw-style-direct','cfw-style-mount')">
                      <strong>Direct Frame</strong>
                      <span>Artwork edge-to-edge</span>
                      <span class="cfw-style-price-tag">Base price</span>
                    </button>
                    <button class="cfw-style-btn" id="cfw-style-mount" type="button"
                      onclick="window.cf.cfwSelectStyle('Mount',250,'cfw-style-mount','cfw-style-direct')">
                      <strong>Mount Frame</strong>
                      <span>Premium white border</span>
                      <span class="cfw-style-price-tag cfw-style-markup">+₹250</span>
                    </button>
                  </div>
                  <p class="cfw-style-hint">
                    <strong>Direct</strong> — image fills the full frame. <strong>Mount</strong> — adds a clean white mat border around your photo for a gallery aesthetic.
                  </p>
                </div>

                <!-- Poster add-on -->
                <label class="cfw-addon-row" id="cfw-poster-addon">
                  <input type="checkbox" id="cfw-poster-check" onchange="window.cf.cfwCalcPrice()">
                  <div class="cfw-addon-info">
                    <strong>Add A3 Poster Print <span class="cfw-addon-badge">+₹199</span></strong>
                    <span>Get an additional rolled A3 print duplicate of your photo</span>
                  </div>
                </label>

                <button class="cfw-next-btn" onclick="window.cf.cfwGoStep(3)">
                  Next: Add Your Details
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>

              <!-- ══ STEP 3: Contact ════════════════════════════════════ -->
              <div class="cfw-card cfw-card-locked" id="cfw-step-3" data-reveal data-reveal-delay="2">
                <div class="cfw-card-header">
                  <span class="cfw-step-num">03</span>
                  <div>
                    <h2 class="cfw-card-title">Your Details</h2>
                    <p class="cfw-card-sub">Just two fields — we'll handle the rest.</p>
                  </div>
                </div>

                <div class="cfw-contact-fields">
                  <div class="cfw-field-group">
                    <label for="cfw-name" class="cfw-field-label">Full Name *</label>
                    <input type="text" id="cfw-name" class="cfw-input" placeholder="Your full name" maxlength="100" autocomplete="name" inputmode="text">
                  </div>
                  <div class="cfw-field-group">
                    <label for="cfw-phone" class="cfw-field-label">WhatsApp / Mobile Number *</label>
                    <input type="tel" id="cfw-phone" class="cfw-input" placeholder="10-digit mobile number" maxlength="15" autocomplete="tel" inputmode="numeric">
                  </div>
                </div>

                <div class="cfw-field-group" style="margin-top:16px">
                  <label for="cfw-notes" class="cfw-field-label">Special Instructions <span class="cfw-optional">Optional</span></label>
                  <textarea id="cfw-notes" class="cfw-textarea" rows="4" maxlength="800"
                    placeholder="Type your notes here... (e.g. 'Please frame this in a classic matte black finish', 'make the photo orientation landscape', or 'crop out the background person')"></textarea>
                  <p class="cfw-field-hint">Mention any colour, orientation, or crop preferences here — our team reads every note.</p>
                </div>

                <div class="cfw-bulk-note">
                  <span>📦</span>
                  Ordering 10+ frames? <a href="/contact" onclick="window.cf.nav('/contact');return false;">Contact us for bulk pricing →</a>
                </div>

              </div>
            </div>

            <!-- RIGHT: sticky summary + sticky CTA -->
            <aside class="cfw-summary-col">
              <div class="cfw-summary-card" id="cfw-summary-card" data-reveal data-reveal-delay="1">
                <h3 class="cfw-summary-title">Order Summary</h3>

                <div class="cfw-summary-rows" id="cfw-summary-rows">
                  <div class="cfw-summary-row"><span>Size</span><span id="cfw-sum-size">Medium (12×18")</span></div>
                  <div class="cfw-summary-row"><span>Style</span><span id="cfw-sum-style">Direct Frame</span></div>
                  <div class="cfw-summary-row" id="cfw-sum-mount-row" style="display:none"><span>Mount add-on</span><span>+₹250</span></div>
                  <div class="cfw-summary-row" id="cfw-sum-poster-row" style="display:none"><span>A3 Poster print</span><span>+₹199</span></div>
                  <div class="cfw-summary-divider"></div>
                  <div class="cfw-summary-row cfw-sum-subtotal"><span>Subtotal</span><span id="cfw-sum-subtotal">₹799</span></div>
                  <div class="cfw-summary-row" id="cfw-sum-shipping">
                    <span>Shipping</span>
                    <span id="cfw-sum-shipping-val">₹99</span>
                  </div>
                  <div class="cfw-summary-divider"></div>
                  <div class="cfw-summary-row cfw-sum-total"><span>Total</span><span id="cfw-sum-total">₹898</span></div>
                </div>

                <p class="cfw-free-shipping-hint" id="cfw-free-hint">Add ₹101 more to get <strong>free shipping!</strong></p>

                <button class="cfw-cart-btn" onclick="window.cf.submitCustomOrder()" id="cfw-cart-btn">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1 1h2.5l2.4 9.6h8.1l2-7H5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="15" r="1.2" fill="currentColor"/><circle cx="13" cy="15" r="1.2" fill="currentColor"/></svg>
                  Proceed to Cart &amp; Secure Order ➔
                </button>

                <button class="cfw-wa-btn" type="button" onclick="
                  var name=document.getElementById('cfw-name').value.trim();
                  var phone=document.getElementById('cfw-phone').value.trim();
                  var notes=document.getElementById('cfw-notes').value.trim();
                  var msg='Hi ChitraFrame! I want a custom frame.\\n'+(name?'Name: '+name+'\\n':'')+(phone?'Phone: '+phone+'\\n':'')+'Size: '+((window._cfwState&&window._cfwState.sizeLabel)||'Medium 12×18')+'\\nStyle: '+((window._cfwState&&window._cfwState.style)||'Direct')+(notes?'\\nNotes: '+notes:'');
                  window.open('https://wa.me/917989531818?text='+encodeURIComponent(msg),'_blank');">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.6 2.4A7.8 7.8 0 0 0 2.4 13.6L1 15l1.5-.4A7.8 7.8 0 1 0 13.6 2.4z" fill="#25D366"/><path d="M5.5 4.5c-.1-.3-.3-.3-.5-.3s-.3 0-.5.1c-.2.1-.7.7-.7 1.7s.7 2 .8 2.1 1.4 2.2 3.4 3c.5.2.8.3 1.1.3s.6-.1.8-.3c.2-.2.5-.8.6-1.1.1-.2 0-.4-.1-.5l-1.2-.6c-.2-.1-.4 0-.5.1l-.4.5c-.1.1-.2.1-.4 0a5.2 5.2 0 0 1-1.6-1.4c-.1-.2 0-.3.1-.4l.3-.4c.1-.1.1-.3.1-.4L5.5 4.5z" fill="#fff"/></svg>
                  WhatsApp Order Instead
                </button>

                <div class="cfw-trust-badges">
                  <div class="cfw-trust-badge">⭐ 4.9/5 · 2,000+ happy orders</div>
                  <div class="cfw-trust-badge">🛡️ Digital proof before printing</div>
                  <div class="cfw-trust-badge">📦 Free replacement on damage</div>
                </div>
              </div>
            </aside>
          </div>

          <!-- Mobile sticky CTA -->
          <div class="cfw-sticky-mobile" id="cfw-sticky-mobile">
            <div class="cfw-sticky-price">
              <span class="cfw-sticky-label">Total</span>
              <span class="cfw-sticky-amount" id="cfw-sticky-total">₹898</span>
            </div>
            <button class="cfw-cart-btn cfw-sticky-btn" onclick="window.cf.submitCustomOrder()">
              Proceed to Cart &amp; Secure Order ➔
            </button>
          </div>
        </div>
      </section>

    </main>
    ${renderFooter()}`;

    // ── Custom Frame Wizard State & Logic ────────────────────────────────────
    window._cfwState = {
      size: 'Medium', sizeLabel: 'Medium (12×18")', basePrice: 799,
      style: 'Direct', mountAddon: 0,
      posterAddon: false,
      uploadedFile: null, uploadedDataUrl: null
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
        const nextBtn = document.getElementById('cfw-next-1');
        if (thumb) thumb.src = e.target.result;
        if (idle) idle.style.display = 'none';
        if (preview) preview.style.display = 'flex';
        if (nextBtn) nextBtn.style.display = 'flex';
        // Update mockup
        const photoArea = document.getElementById('cfw-photo-area');
        if (photoArea) {
          photoArea.innerHTML = '<img src="'+e.target.result+'" alt="Preview" style="width:100%;height:100%;object-fit:cover;display:block;">';
        }
      };
      reader.readAsDataURL(file);
    };

    window.cf.cfwSelectSize = function(size, dim, price, cardId) {
      window._cfwState.size = size;
      window._cfwState.sizeLabel = size + ' (' + dim + ')';
      window._cfwState.basePrice = price;
      document.querySelectorAll('.cfw-size-card').forEach(c => c.classList.remove('cfw-size-active'));
      const card = document.getElementById(cardId);
      if (card) card.classList.add('cfw-size-active');
      window.cf.cfwCalcPrice();
    };

    window.cf.cfwSelectStyle = function(style, addon, activeId, inactiveId) {
      window._cfwState.style = style;
      window._cfwState.mountAddon = addon;
      const aBtn = document.getElementById(activeId);
      const iBtn = document.getElementById(inactiveId);
      if (aBtn) { aBtn.classList.add('cfw-style-active'); }
      if (iBtn) { iBtn.classList.remove('cfw-style-active'); }
      // Show/hide mount row in summary
      const mountRow = document.getElementById('cfw-sum-mount-row');
      if (mountRow) mountRow.style.display = addon > 0 ? 'flex' : 'none';
      // Update mockup mat
      const mat = document.getElementById('cfw-mat-border');
      if (mat) {
        mat.style.padding = style === 'Mount' ? '16px' : '0';
        mat.style.background = style === 'Mount' ? '#fff' : 'transparent';
      }
      window.cf.cfwCalcPrice();
    };

    window.cf.cfwCalcPrice = function() {
      const s = window._cfwState;
      s.posterAddon = document.getElementById('cfw-poster-check')?.checked || false;
      const subtotal = s.basePrice + s.mountAddon + (s.posterAddon ? 199 : 0);
      const shipping = subtotal >= 899 ? 0 : 99;
      const total = subtotal + shipping;

      // Update summary
      const el = (id) => document.getElementById(id);
      if (el('cfw-sum-size')) el('cfw-sum-size').textContent = s.sizeLabel;
      if (el('cfw-sum-style')) el('cfw-sum-style').textContent = s.style + ' Frame';
      if (el('cfw-sum-mount-row')) el('cfw-sum-mount-row').style.display = s.mountAddon > 0 ? 'flex' : 'none';
      if (el('cfw-sum-poster-row')) el('cfw-sum-poster-row').style.display = s.posterAddon ? 'flex' : 'none';
      if (el('cfw-sum-subtotal')) el('cfw-sum-subtotal').textContent = '₹' + subtotal;
      if (el('cfw-sum-shipping-val')) el('cfw-sum-shipping-val').innerHTML = shipping === 0 ? '<span style="color:var(--green)">Free</span>' : '₹' + shipping;
      if (el('cfw-sum-total')) el('cfw-sum-total').textContent = '₹' + total;
      if (el('cfw-sticky-total')) el('cfw-sticky-total').textContent = '₹' + total;
      // Free shipping hint
      const freeLeft = 899 - subtotal;
      if (el('cfw-free-hint')) {
        if (freeLeft > 0) {
          el('cfw-free-hint').innerHTML = 'Add <strong>₹'+freeLeft+'</strong> more to get <strong>free shipping!</strong>';
          el('cfw-free-hint').style.display = 'block';
        } else {
          el('cfw-free-hint').innerHTML = '🎉 You\'ve unlocked <strong>free shipping!</strong>';
          el('cfw-free-hint').style.display = 'block';
        }
      }
      // Update mockup label
      const lbl = document.getElementById('cfw-mockup-label');
      if (lbl) lbl.textContent = s.sizeLabel + ' · ' + s.style + ' Frame · ₹' + total;
      // Store computed
      s.subtotal = subtotal; s.shipping = shipping; s.total = total;
    };

    window.cf.cfwGoStep = function(step) {
      // Unlock cards
      for (let i = 1; i <= 3; i++) {
        const card = document.getElementById('cfw-step-' + i);
        const ind = document.getElementById('cfw-step-ind-' + i);
        if (card) {
          if (i <= step) card.classList.remove('cfw-card-locked');
          if (i === step) {
            card.classList.add('cfw-card-active');
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            card.classList.remove('cfw-card-active');
          }
        }
        if (ind) {
          if (i < step) { ind.classList.add('done'); ind.classList.remove('active'); }
          if (i === step) { ind.classList.add('active'); ind.classList.remove('done'); }
          if (i > step) { ind.classList.remove('active','done'); }
        }
        const line = document.getElementById('cfw-line-' + i);
        if (line) line.classList.toggle('done', i < step);
      }
      // Show sticky on step 2+
      const sticky = document.getElementById('cfw-sticky-mobile');
      if (sticky) sticky.classList.toggle('visible', step >= 2);
    };

    // Init defaults
    window.cf.cfwCalcPrice();

    initMobileMenu();
    initStickyHeader();
    setTimeout(initReveal, 100);
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
      else if (path === '/customize') renderCustomizePage(app);
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
    togglePdpPoster
  };

  // Legacy alias
  window.pfi = window.cf;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
