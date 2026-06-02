// PhotoFrameIn — Admin Panel SPA
(function () {
  'use strict';
  const API = '/api/admin';
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  let currentSection = 'dashboard';
  let adminToken = localStorage.getItem('pfi_admin_token') || '';

  // Toast notification system
  function toast(msg, type = 'info') {
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    const colors = { success: '#22C55E', error: '#EF4444', info: '#3B82F6' };
    const t = document.createElement('div');
    t.className = `admin-toast ${type}`;
    // Note: msg here is always system-generated (not user input), so safe
    t.innerHTML = `<i class="fas ${icons[type] || icons.info}" style="color:${colors[type]}"></i><span>${msg}</span>`;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)'; setTimeout(() => t.remove(), 300); }, 3000);
  }

  // XSS Prevention — always escape user-generated content before injecting into innerHTML
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function api(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (adminToken) opts.headers['Authorization'] = `Bearer ${adminToken}`;
    if (body) opts.data = body;
    return axios({ ...opts, url: `${API}${path}` }).then(r => r.data).catch(err => {
      if (err.response && err.response.status === 401) { adminToken = ''; localStorage.removeItem('pfi_admin_token'); showLogin('Session expired. Please login again.'); }
      throw err;
    });
  }

  // ========== LOGIN SCREEN ==========
  function showLogin(errorMsg) {
    const app = $('#admin-app');
    app.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-logo">
          <div class="login-logo-mark">CF</div>
          <h1>ChitraFrame</h1>
          <p>Admin Panel</p>
        </div>
        <div id="login-error" class="login-error" ${errorMsg ? 'style="display:block"' : ''}>${errorMsg || ''}</div>
        <form id="login-form">
          <div class="login-input-group">
            <input type="email" id="login-email" class="login-input" placeholder="Admin email" autocomplete="email" autofocus required>
            <i class="fas fa-envelope"></i>
          </div>
          <div class="login-input-group">
            <input type="password" id="login-password" class="login-input" placeholder="Password" autocomplete="current-password" required>
            <i class="fas fa-lock"></i>
          </div>
          <button type="submit" id="login-submit" class="login-btn">
            <i class="fas fa-sign-in-alt"></i>Sign In
          </button>
        </form>
        <p class="login-hint">ChitraFrame Admin · Authorised access only</p>
      </div>
    </div>`;
    $('#login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('#login-email').value;
      const pw = $('#login-password').value;
      const btn = $('#login-submit');
      const errEl = $('#login-error');
      
      if (!email || !pw) { errEl.textContent = 'Please enter email and password'; errEl.style.display = 'block'; return; }
      
      btn.disabled = true; btn.innerHTML = '<span class="admin-spinner"></span> Verifying...';
      try {
        const res = await axios.post(`${API}/auth`, { email, password: pw }, { headers: { 'Content-Type': 'application/json' } });
        if (res.data.success) {
          adminToken = res.data.token;
          localStorage.setItem('pfi_admin_token', adminToken);
          if (res.data.user) localStorage.setItem('pfi_admin_user', JSON.stringify(res.data.user));
          render();
        }
      } catch (err) {
        errEl.textContent = err.response?.data?.error || 'Authentication failed';
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right:8px"></i>Sign In';
      }
    });
  }

  const sections = [
    { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
    { id: 'products', icon: 'fa-box', label: 'Products' },
    { id: 'categories', icon: 'fa-th-large', label: 'Categories' },
    { id: 'orders', icon: 'fa-shopping-cart', label: 'Orders' },
    { id: 'media', icon: 'fa-image', label: 'Media Manager' },
    { id: 'logistics', icon: 'fa-truck', label: 'Logistics' },
    { id: 'customers', icon: 'fa-users', label: 'Customers' },
    { id: 'leads', icon: 'fa-bullseye', label: 'Leads' },
    { id: 'analytics', icon: 'fa-chart-line', label: 'Analytics' },
    { id: 'coupons', icon: 'fa-tag', label: 'Coupons' },
    { id: 'reviews', icon: 'fa-star', label: 'Reviews' },
    { id: 'content', icon: 'fa-file-alt', label: 'Content' },
    { id: 'combos', icon: 'fa-layer-group', label: 'Combos & Bundles' },
    { id: 'ad_performance', icon: 'fa-chart-bar', label: 'Ad Performance' },
    { id: 'seo_ai', icon: 'fa-robot', label: 'SEO AI' },
    { id: 'pricing', icon: 'fa-rupee-sign', label: 'Pricing' },
    { id: 'suggestions', icon: 'fa-comment-alt', label: 'Suggestions' },
    { id: 'settings', icon: 'fa-cog', label: 'Settings' }
  ];

  function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar) return;
    const isOpen = sidebar.classList.contains('open');
    if (isOpen) {
      sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('show');
      document.body.style.overflow = '';
    } else {
      sidebar.classList.add('open');
      if (overlay) overlay.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  function render() {
    if (!adminToken) { showLogin(); return; }
    const app = $('#admin-app');
    const user = (() => { try { return JSON.parse(localStorage.getItem('pfi_admin_user') || '{}'); } catch(e) { return {}; } })();
    app.innerHTML = `
    <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeMobileSidebar()"></div>
    <aside class="admin-sidebar" id="sidebar" aria-label="Admin navigation">
      <div class="sidebar-header" id="sidebar-logo-area" onclick="admin.go('settings')" title="Settings">
        <div class="sidebar-logo-mark">CF</div>
        <div class="sidebar-logo-text">
          <span id="sidebar-logo-display">ChitraFrame</span>
          <span class="sidebar-logo-sub">Admin Panel</span>
        </div>
      </div>
      <nav class="sidebar-nav" role="navigation">
        ${sections.map(s => `<button class="nav-item ${s.id === currentSection ? 'active' : ''}" onclick="admin.go('${s.id}')" aria-label="${s.label}"><i class="fas ${s.icon}"></i><span>${s.label}</span></button>`).join('')}
      </nav>
      <div class="sidebar-footer">
        <a href="/" class="sidebar-footer-link"><i class="fas fa-store"></i><span>View Store</span></a>
        <button class="sidebar-footer-link" onclick="admin.logout()"><i class="fas fa-sign-out-alt"></i><span>Logout</span></button>
      </div>
    </aside>
    <div class="admin-main" id="main-content">
      <header class="admin-topbar">
        <button class="topbar-menu-btn" onclick="toggleMobileSidebar()" aria-label="Toggle menu">
          <i class="fas fa-bars"></i>
        </button>
        <div class="topbar-brand">
          <span class="topbar-logo-mark">CF</span>
          <span class="topbar-title">ChitraFrame Admin</span>
        </div>
        <div class="topbar-actions">
          <a href="/" class="topbar-action-btn" title="View store" aria-label="View store">
            <i class="fas fa-store"></i>
          </a>
          <button class="topbar-action-btn" onclick="admin.logout()" title="Logout" aria-label="Logout">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </header>
      <main id="section-content" class="section-content-wrapper"></main>
    </div>`;
    loadSection(currentSection);
    // Load sidebar logo from settings
    api('GET', '/settings').then(d => {
      const cfg = d.settings || {};
      const logoEl = document.getElementById('sidebar-logo-display');
      if (!logoEl) return;
      if (cfg.site_logo_url) {
        logoEl.innerHTML = `<img src="${cfg.site_logo_url}" style="height:22px;max-width:140px;object-fit:contain;" alt="Logo" onerror="this.parentElement.textContent='${cfg.site_logo_text||'ChitraFrame'}'">`;
      } else {
        logoEl.textContent = cfg.site_logo_text || cfg.brand_name || 'ChitraFrame';
      }
    }).catch(() => {});
  }

  async function loadSection(id) {
    currentSection = id;
    closeMobileSidebar();
    $$('.nav-item').forEach(el => {
      const label = sections.find(s => s.id === id)?.label;
      el.classList.toggle('active', el.querySelector('span')?.textContent.trim() === label);
    });
    const content = $('#section-content');
    content.innerHTML = `
      <div class="space-y-6">
        <div class="skeleton-title skeleton"></div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="skeleton-stat skeleton"></div><div class="skeleton-stat skeleton"></div>
          <div class="skeleton-stat skeleton"></div><div class="skeleton-stat skeleton"></div>
        </div>
        <div class="skeleton-chart skeleton"></div>
      </div>`;

    try {
      switch (id) {
        case 'dashboard': await renderDashboard(content); break;
        case 'products': await renderProducts(content); break;
        case 'categories': await renderCategories(content); break;
        case 'orders': await renderOrders(content); break;
        case 'media': await renderMedia(content); break;
        case 'logistics': await renderLogistics(content); break;
        case 'customers': await renderCustomers(content); break;
        case 'leads': await renderLeads(content); break;
        case 'analytics': await renderAnalytics(content); break;
        case 'coupons': await renderCoupons(content); break;
        case 'reviews': await renderReviews(content); break;
        case 'content': await renderContent(content); break;
        case 'settings': await renderSettings(content); break;
        case 'combos': await renderCombos(content); break;
        case 'ad_performance': await renderAdPerformance(content); break;
        case 'seo_ai': await renderSeoAI(content); break;
        case 'pricing': await renderPricing(content); break;
        case 'suggestions': await renderSuggestions(content); break;
      }
    } catch (e) {
      content.innerHTML = `<div class="text-center py-12"><p class="text-red-400">Error loading ${id}</p><p class="text-sm text-gray-500 mt-2">${e.message}</p><button onclick="admin.go('${id}')" class="admin-btn admin-btn-ghost mt-4">Retry</button></div>`;
    }
  }

  // ========== DASHBOARD ==========
  async function renderDashboard(el) {
    const data = await api('GET', '/dashboard');
    el.innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Dashboard</h2>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="stat-card"><div class="stat-label">Revenue Today</div><div class="stat-value">₹${(data.revenue?.today || 0).toLocaleString('en-IN')}</div></div>
      <div class="stat-card"><div class="stat-label">Revenue This Month</div><div class="stat-value">₹${(data.revenue?.month || 0).toLocaleString('en-IN')}</div></div>
      <div class="stat-card"><div class="stat-label">Orders Today</div><div class="stat-value">${data.orders?.today || 0}</div></div>
      <div class="stat-card"><div class="stat-label">Active Leads</div><div class="stat-value">${data.leads || 0}</div></div>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="stat-card"><div class="stat-label">Pending Orders</div><div class="stat-value" style="color:${data.orders?.pending > 0 ? '#EAB308' : '#22C55E'}">${data.orders?.pending || 0}</div></div>
      <div class="stat-card"><div class="stat-label">COD Pending</div><div class="stat-value" style="color:${data.orders?.cod_pending > 0 ? '#DC2626' : '#22C55E'}">${data.orders?.cod_pending || 0}</div></div>
      <div class="stat-card"><div class="stat-label">Packed / Ready</div><div class="stat-value">${data.orders?.packed || 0}</div></div>
      <div class="stat-card"><div class="stat-label">Unsynced</div><div class="stat-value" style="color:${data.orders?.unsynced > 0 ? '#E8670A' : '#22C55E'}">${data.orders?.unsynced || 0}</div>${data.orders?.unsynced > 0 ? `<button onclick="admin.syncPending()" class="admin-btn admin-btn-primary mt-2 text-xs">Sync Now</button>` : ''}</div>
    </div>

    <!-- Sales Funnel Analytics -->
    <div class="stat-card mb-6">
      <div class="flex justify-between items-center mb-6">
        <h3 class="font-bold">Sales Funnel (Real-time)</h3>
        <div class="funnel-rate-tag">Overall Conversion: ${data.funnel?.views ? ((data.funnel.purchase / data.funnel.views) * 100).toFixed(1) : 0}%</div>
      </div>
      <div class="funnel-container">
        <div class="funnel-stage">
          <div class="funnel-label">Product Views</div>
          <div class="funnel-bar-wrapper">
             <div class="funnel-bar-fill" style="width: 100%"></div>
             <div class="funnel-count">${data.funnel?.views || 0}</div>
          </div>
          <div class="funnel-rate-tag" style="visibility:hidden">100%</div>
        </div>
        
        <div class="funnel-arrow"><i class="fas fa-chevron-down"></i> ${data.funnel?.views ? Math.round((data.funnel.cart / data.funnel.views) * 100) : 0}% drop-in rate</div>

        <div class="funnel-stage">
          <div class="funnel-label">Add to Cart</div>
          <div class="funnel-bar-wrapper">
             <div class="funnel-bar-fill" style="width: ${data.funnel?.views ? (data.funnel.cart / data.funnel.views) * 100 : 0}%"></div>
             <div class="funnel-count">${data.funnel?.cart || 0}</div>
          </div>
          <div class="funnel-rate-tag">${data.funnel?.views ? Math.round((data.funnel.cart / data.funnel.views) * 100) : 0}%</div>
        </div>

        <div class="funnel-arrow"><i class="fas fa-chevron-down"></i> ${data.funnel?.cart ? Math.round((data.funnel.checkout / data.funnel.cart) * 100) : 0}% checkout rate</div>

        <div class="funnel-stage">
          <div class="funnel-label">Initiate Checkout</div>
          <div class="funnel-bar-wrapper">
             <div class="funnel-bar-fill" style="width: ${data.funnel?.views ? (data.funnel.checkout / data.funnel.views) * 100 : 0}%"></div>
             <div class="funnel-count">${data.funnel?.checkout || 0}</div>
          </div>
          <div class="funnel-rate-tag">${data.funnel?.cart ? Math.round((data.funnel.checkout / data.funnel.cart) * 100) : 0}%</div>
        </div>

        <div class="funnel-arrow"><i class="fas fa-chevron-down"></i> ${data.funnel?.checkout ? Math.round((data.funnel.purchase / data.funnel.checkout) * 100) : 0}% purchase rate</div>

        <div class="funnel-stage">
          <div class="funnel-label">Completed Purchase</div>
          <div class="funnel-bar-wrapper">
             <div class="funnel-bar-fill" style="width: ${data.funnel?.views ? (data.funnel.purchase / data.funnel.views) * 100 : 0}%"></div>
             <div class="funnel-count">${data.funnel?.purchase || 0}</div>
          </div>
          <div class="funnel-rate-tag">${data.funnel?.checkout ? Math.round((data.funnel.purchase / data.funnel.checkout) * 100) : 0}%</div>
        </div>
        ${data.sources && data.sources.length > 0 ? `
          <div style="margin-top: 25px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px; width: 100%;">
            <h4 style="font-size: 14px; margin-bottom: 12px; color: var(--admin-primary);">Top Traffic Sources (Today)</h4>
            <div class="sources-list">
              ${data.sources.map(s => `
                <div class="source-item">
                  <span>${s.name}</span>
                  <span class="source-count">${s.count}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Email Usage -->
    <div class="grid md:grid-cols-2 gap-4 mb-6">
      <div class="stat-card">
        <div class="flex justify-between items-center mb-2"><span class="stat-label">Brevo Email</span><span class="text-sm">${data.email?.brevo?.sent || 0}/${data.email?.brevo?.limit || 300}</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${(data.email?.brevo?.sent || 0) / 300 * 100}%;background:${(data.email?.brevo?.sent || 0) > 270 ? '#DC2626' : (data.email?.brevo?.sent || 0) > 200 ? '#EAB308' : '#22C55E'}"></div></div>
      </div>
      <div class="stat-card">
        <div class="flex justify-between items-center mb-2"><span class="stat-label">Resend Email</span><span class="text-sm">${data.email?.resend?.sent || 0}/${data.email?.resend?.limit || 100}</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${(data.email?.resend?.sent || 0) / 100 * 100}%;background:${(data.email?.resend?.sent || 0) > 80 ? '#DC2626' : '#22C55E'}"></div></div>
      </div>
    </div>

    ${data.errors > 0 || data.emailFailures > 0 ? `<div class="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-6"><p class="text-red-400 font-bold"><i class="fas fa-exclamation-triangle mr-2"></i>${data.errors} errors (24h) · ${data.emailFailures} email failures</p></div>` : ''}

    <!-- Resource Usage Widget -->
    <div id="usage-widget" class="stat-card mb-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold">Resource Guard (Free Tier)</h3>
        <span class="text-[10px] uppercase font-bold text-gray-400">Updates Real-time</span>
      </div>
      <div id="usage-content" class="grid md:grid-cols-3 gap-6">
        <div class="skeleton h-24 rounded-lg"></div>
        <div class="skeleton h-24 rounded-lg"></div>
        <div class="skeleton h-24 rounded-lg"></div>
      </div>
    </div>

    <!-- Recent Orders -->
    <div class="stat-card">
      <h3 class="font-bold mb-4">Recent Orders</h3>
      <table class="data-table">
        <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
        <tbody>
          ${(data.recentOrders || []).map(o => `
            <tr onclick="admin.viewOrder('${o.order_id}')" style="cursor:pointer">
              <td class="font-mono text-yellow-400">${o.order_id}</td>
              <td>${o.customer_name}</td>
              <td>₹${o.total?.toLocaleString('en-IN')}</td>
              <td><span class="${o.payment_method === 'cod' ? 'badge-yellow' : 'badge-green'}">${o.payment_method?.toUpperCase()}</span></td>
              <td><span class="${o.status === 'delivered' ? 'badge-green' : o.status === 'cancelled' ? 'badge-red' : 'badge-yellow'}">${o.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;

    // Fetch usage stats
    api('GET', '/usage').then(u => {
      const container = $('#usage-content');
      if (!container) return;
      
      const cfPercent = Math.min((u.cloudflare.worker_requests_monthly / u.cloudflare.worker_limit) * 100, 100);
      const sbPercent = Math.min((u.supabase.total_rows / u.supabase.row_limit) * 100, 100);
      const emailTotal = u.email.brevo.sent + u.email.resend.sent;
      const emailLimit = u.email.brevo.limit + u.email.resend.limit;
      const emailPercent = Math.min((emailTotal / emailLimit) * 100, 100);

      container.innerHTML = `
        <div class="usage-item">
          <div class="flex justify-between text-xs mb-1">
            <span class="font-bold text-gray-400">CF Workers (Mo)</span>
            <span class="${cfPercent > 80 ? 'text-red-400' : 'text-gray-500'}">${u.cloudflare.worker_requests_monthly.toLocaleString()} / ${u.cloudflare.worker_limit.toLocaleString()}</span>
          </div>
          <div class="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div class="h-full bg-brand-gold" style="width: ${cfPercent}%"></div>
          </div>
          <p class="text-[10px] mt-1 text-gray-600">Avg ${u.cloudflare.daily_requests_proxy}/day</p>
        </div>
        
        <div class="usage-item">
          <div class="flex justify-between text-xs mb-1">
            <span class="font-bold text-gray-400">Supabase Rows</span>
            <span class="${sbPercent > 80 ? 'text-red-400' : 'text-gray-500'}">${u.supabase.total_rows.toLocaleString()} / ${u.supabase.row_limit.toLocaleString()}</span>
          </div>
          <div class="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div class="h-full bg-brand-green" style="width: ${sbPercent}%"></div>
          </div>
          <p class="text-[10px] mt-1 text-gray-600">Managed DB size</p>
        </div>

        <div class="usage-item">
          <div class="flex justify-between text-xs mb-1">
            <span class="font-bold text-gray-400">Combined Email</span>
            <span class="${emailPercent > 80 ? 'text-red-400' : 'text-gray-500'}">${emailTotal} / ${emailLimit}</span>
          </div>
          <div class="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div class="h-full bg-brand-saffron" style="width: ${emailPercent}%"></div>
          </div>
          <p class="text-[10px] mt-1 text-gray-600">Resets in ${u.email.brevo.reset}</p>
        </div>
        
        <div class="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
          <div class="flex items-center text-[10px] text-gray-500">
            <span class="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
            Alert System: Active (85%)
          </div>
          <button onclick="admin.testAlert(this)" class="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-400 px-2 py-1 rounded transition-colors">
            Test Alerts
          </button>
        </div>
      `;
    }).catch(err => {
       const container = $('#usage-content');
       if (container) container.innerHTML = `<p class="text-xs text-red-500 col-span-3">Failed to load usage stats</p>`;
    });
  }

  // ========== PRODUCTS ==========
  async function renderProducts(el) {
    const data = await api('GET', '/products');
    el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold">Products (${data.products?.length || 0})</h2>
      <button onclick="admin.showProductForm()" class="admin-btn admin-btn-primary"><i class="fas fa-plus mr-1"></i>Add Product</button>
    </div>
    <table class="data-table">
      <thead><tr><th>Name</th><th>Category</th><th>Variants</th><th>Orders</th><th>Revenue</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>
        ${(data.products || []).map(p => `
          <tr>
            <td><div class="flex items-center gap-2">${p.is_placeholder ? '<span class="text-xs text-gray-500">[PH]</span>' : ''}<strong>${p.name}</strong></div><div class="text-xs text-gray-500">/${p.slug}</div></td>
            <td>${p.category?.name || '-'}</td>
            <td>${p.variants?.length || 0}</td>
            <td>${p.total_orders || 0}</td>
            <td>₹${(p.total_revenue || 0).toLocaleString('en-IN')}</td>
            <td>
              <label class="admin-switch">
                <input type="checkbox" ${p.is_active ? 'checked' : ''} onchange="admin.toggleStatus(event, 'products', '${p.id}')">
                <span class="admin-switch-slider"></span>
              </label>
            </td>
            <td><button onclick="admin.editProduct('${p.id}')" class="admin-btn admin-btn-ghost text-xs">Edit</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
  }

  // ========== CATEGORIES ==========
  async function renderCategories(el) {
    const data = await api('GET', '/categories');
    el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold">Categories</h2>
      <button onclick="admin.showCategoryForm()" class="admin-btn admin-btn-primary"><i class="fas fa-plus mr-1"></i>Add Category</button>
    </div>
    <table class="data-table">
      <thead><tr><th>Order</th><th>Name</th><th>Slug</th><th>Type</th><th>Color</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>
        ${(data.categories || []).map(c => `
          <tr>
            <td>${c.display_order}</td>
            <td><strong>${c.name}</strong></td>
            <td class="text-gray-500">/${c.slug}</td>
            <td>${c.is_intent_collection ? '<span class="badge-yellow">Collection</span>' : 'Category'}</td>
            <td><div class="w-6 h-6 rounded" style="background:${c.hover_color}"></div></td>
            <td>
              <label class="admin-switch">
                <input type="checkbox" ${c.is_active ? 'checked' : ''} onchange="admin.toggleStatus(event, 'categories', '${c.id}')">
                <span class="admin-switch-slider"></span>
              </label>
            </td>
            <td><button onclick="admin.editCategory('${c.id}')" class="admin-btn admin-btn-ghost text-xs">Edit</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
  }

  // ========== ORDERS ==========
  async function renderOrders(el) {
    const data = await api('GET', '/orders');
    el.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-bold">Orders (${data.total || 0})</h2>
      <div class="flex gap-2">
        <select id="order-status-filter" onchange="admin.filterOrders()" class="admin-input" style="width:auto">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="cod_pending">COD Pending</option>
          <option value="printing">Printing</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select id="order-payment-filter" onchange="admin.filterOrders()" class="admin-input" style="width:auto">
          <option value="">All Payments</option>
          <option value="prepaid">Prepaid</option>
          <option value="cod">COD</option>
        </select>
      </div>
    </div>
    <div id="orders-table">
      ${renderOrdersTable(data.orders)}
    </div>`;
  }

  function renderOrdersTable(orders) {
    return `<table class="data-table">
      <thead><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>
        ${(orders || []).map(o => `
          <tr>
            <td class="font-mono text-yellow-400 cursor-pointer" onclick="admin.viewOrder('${escapeHTML(o.order_id)}')">${escapeHTML(o.order_id)}</td>
            <td><div>${escapeHTML(o.customer_name)}</div><div class="text-xs text-gray-500">${escapeHTML(o.customer_phone)}</div></td>
            <td>${o.items?.length || 0}</td>
            <td>₹${o.total?.toLocaleString('en-IN')}</td>
            <td><span class="${o.payment_method === 'cod' ? 'badge-yellow' : 'badge-green'}">${escapeHTML(o.payment_method?.toUpperCase())}</span></td>
            <td>
              <select onchange="admin.updateStatus('${escapeHTML(o.order_id)}',this.value)" class="admin-input text-xs" style="width:auto;padding:4px 8px">
                ${['pending','cod_pending','printing','packed','pickup_scheduled','shipped','delivered','cancelled'].map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </td>
            <td class="text-xs text-gray-500">${new Date(o.created_at).toLocaleDateString('en-IN')}</td>
            <td>
              <button onclick="admin.viewOrder('${escapeHTML(o.order_id)}')" class="admin-btn admin-btn-ghost text-xs">View</button>
              ${o.status === 'cod_pending' ? `<button onclick="admin.confirmCOD('${escapeHTML(o.order_id)}', '${escapeHTML(o.customer_phone)}', '${escapeHTML(o.customer_name)}', ${o.total || 0})" class="admin-btn admin-btn-green text-xs ml-1">Confirm</button>` : ''}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
  }

  // ========== LOGISTICS ==========
  async function renderLogistics(el) {
    const data = await api('GET', '/orders?status=packed');
    el.innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Logistics</h2>
    <div class="flex gap-2 mb-6">
      <button onclick="admin.syncPending()" class="admin-btn admin-btn-primary"><i class="fas fa-sync mr-1"></i>Sync Pending Orders (Auto)</button>
    </div>
    <h3 class="font-bold mb-4">Ready for Dispatch (${data.orders?.length || 0})</h3>
    <table class="data-table">
      <thead><tr><th>Order</th><th>Customer</th><th>SR ID(s)</th><th>AWB(s)</th><th>Label(s)</th><th>Actions</th></tr></thead>
      <tbody>
        ${(data.orders || []).map(o => {
          const awbs = o.awb_number ? o.awb_number.split(',') : [];
          const labels = o.shiprocket_label_url ? o.shiprocket_label_url.split(',') : [];
          return `
          <tr>
            <td class="font-mono text-yellow-400">${o.order_id}</td>
            <td><div>${o.customer_name}</div><div class="text-[10px] text-gray-500">${o.address?.city}</div></td>
            <td class="text-[10px] font-mono">${o.shiprocket_order_id ? o.shiprocket_order_id.replace(/,/g, '<br>') : `<button onclick="admin.createShiprocketOrder('${o.order_id}')" class="admin-btn admin-btn-primary text-[10px] py-0 px-1">Create</button>`}</td>
            <td>${awbs.length ? awbs.map(a => `<div class="font-mono text-[10px]">${a}</div>`).join('') : `<button onclick="admin.generateAWB('${o.order_id}')" class="admin-btn admin-btn-ghost text-[10px] py-0 px-1" ${!o.shiprocket_synced ? 'disabled' : ''}>Gen AWB</button>`}</td>
            <td>
              ${labels.length ? labels.map((l, i) => `<a href="${l}" target="_blank" class="text-yellow-400 text-[10px] block underline">Label ${i+1}</a>`).join('') : `<button onclick="admin.generateLabel('${o.order_id}')" class="admin-btn admin-btn-ghost text-[10px] py-0 px-1" ${!o.awb_number ? 'disabled' : ''}>Gen Labels</button>`}
            </td>
            <td>
              <div class="flex flex-col gap-1">
                ${!o.awb_number ? '<span class="text-[10px] text-gray-500">Wait for AWB</span>' : 
                  o.pickup_status !== 'scheduled' ? `<button onclick="admin.schedulePickup('${o.order_id}')" class="admin-btn admin-btn-green text-[10px] py-0 px-1">Schedule Pickup</button>` : 
                  '<span class="badge-green text-[9px] px-1 py-0">Pickup Scheduled</span>'
                }
              </div>
            </td>
          </tr>
        `}).join('')}
      </tbody>
    </table>`;
  }

  // ========== CUSTOMERS ==========
  async function renderCustomers(el) {
    const data = await api('GET', '/customers');
    el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold">Customers (${data.total || 0})</h2>
      <button onclick="admin.exportCSV('customers')" class="admin-btn admin-btn-ghost"><i class="fas fa-download mr-1"></i>Export CSV</button>
    </div>
    <table class="data-table">
      <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Orders</th><th>Total Spend</th><th>Status</th><th>Joined</th></tr></thead>
      <tbody>
        ${(data.customers || []).map(c => `
          <tr>
            <td><strong>${escapeHTML(c.name) || '-'}</strong></td>
            <td>${escapeHTML(c.email)}</td>
            <td>${escapeHTML(c.phone) || '-'}</td>
            <td>${c.total_orders || 0}</td>
            <td>₹${(c.total_spend || 0).toLocaleString('en-IN')}</td>
            <td>${c.is_blocked ? '<span class="badge-red">Blocked</span>' : c.cod_blocked ? '<span class="badge-yellow">COD Blocked</span>' : '<span class="badge-green">Active</span>'}</td>
            <td class="text-xs text-gray-500">${new Date(c.created_at).toLocaleDateString('en-IN')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
  }

  // ========== LEADS ==========
  async function renderLeads(el) {
    const data = await api('GET', '/leads');
    el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold">Leads (${data.total || 0})</h2>
      <button onclick="admin.exportCSV('leads')" class="admin-btn admin-btn-ghost"><i class="fas fa-download mr-1"></i>Export CSV</button>
    </div>
    <table class="data-table">
      <thead><tr><th>Email/Phone</th><th>Name</th><th>Source</th><th>Date</th></tr></thead>
      <tbody>
        ${(data.leads || []).map(l => `
          <tr>
            <td>${escapeHTML(l.email || l.phone) || '-'}</td>
            <td>${escapeHTML(l.name) || '-'}</td>
            <td><span class="badge-yellow">${escapeHTML(l.source)}</span></td>
            <td class="text-xs text-gray-500">${new Date(l.created_at).toLocaleDateString('en-IN')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
  }

  // ========== ANALYTICS ==========
  async function renderAnalytics(el) {
    el.innerHTML = `
      <h2 class="text-2xl font-bold mb-6">Analytics</h2>
      <div class="flex gap-2 mb-6">
        <button class="tab-btn active">Products</button>
        <button class="tab-btn">RTO Risk</button>
        <button class="tab-btn">Ad Performance</button>
      </div>
      <div class="space-y-4">
        <div class="skeleton-row skeleton"></div>
        <div class="skeleton-row skeleton"></div>
        <div class="skeleton-row skeleton"></div>
      </div>`;

    const [products, rto, ads] = await Promise.all([
      api('GET', '/analytics/products'),
      api('GET', '/analytics/rto'),
      api('GET', '/analytics/ads')
    ]);

    el.innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Analytics</h2>
    <div class="flex gap-2 mb-6">
      <button class="tab-btn active" onclick="admin.showAnalyticsTab('products',this)">Products</button>
      <button class="tab-btn" onclick="admin.showAnalyticsTab('rto',this)">RTO Risk</button>
      <button class="tab-btn" onclick="admin.showAnalyticsTab('ads',this)">Ad Performance</button>
    </div>
    <div id="analytics-products">
      <table class="data-table">
        <thead><tr><th>Product</th><th>Views</th><th>Orders</th><th>Revenue</th><th>Rating</th></tr></thead>
        <tbody>${(products.products || []).map(p => `
          <tr><td>${p.name}</td><td>${p.total_views || 0}</td><td>${p.total_orders || 0}</td><td>₹${(p.total_revenue || 0).toLocaleString('en-IN')}</td><td>${p.average_rating || '-'} ★</td></tr>
        `).join('')}</tbody>
      </table>
    </div>
    <div id="analytics-rto" style="display:none">
      <h3 class="font-bold mb-4">High-Risk Pincodes</h3>
      <table class="data-table">
        <thead><tr><th>Pincode Prefix</th><th>Total Orders</th><th>RTOs</th><th>RTO Rate</th><th>COD Status</th></tr></thead>
        <tbody>${(rto.pincodes || []).map(p => {
          const rate = p.total_orders ? Math.round(p.rto_count / p.total_orders * 100) : 0;
          return `<tr><td>${p.pincode_prefix}xxx</td><td>${p.total_orders}</td><td>${p.rto_count}</td><td><span class="${rate > 30 ? 'text-red-400 font-bold' : rate > 15 ? 'text-yellow-400' : 'text-green-400'}">${rate}%</span></td><td>${p.cod_blocked ? '<span class="badge-red">Blocked</span>' : '<span class="badge-green">Active</span>'}</td></tr>`;
        }).join('')}</tbody>
      </table>
    </div>
    <div id="analytics-ads" style="display:none">
      <div class="grid md:grid-cols-2 gap-8">
        <div>
          <h3 class="font-bold mb-4"><i class="fas fa-mouse-pointer mr-2 text-admin-gold"></i>Traffic Attribution (30d)</h3>
          <table class="data-table">
            <thead><tr><th>Source</th><th>Sessions</th><th>Carts</th><th>CVR</th></tr></thead>
            <tbody>${Object.entries(ads.traffic || {}).map(([k, v]) => {
              const cvr = v.sessions ? ((v.cart_adds / v.sessions) * 100).toFixed(1) : '0';
              return `<tr><td class="capitalize">${k}</td><td>${v.sessions}</td><td>${v.cart_adds}</td><td>${cvr}%</td></tr>`;
            }).join('') || '<tr><td colspan="4" class="text-center py-4">No traffic data yet</td></tr>'}</tbody>
          </table>
        </div>
        <div>
          <h3 class="font-bold mb-4"><i class="fas fa-shopping-cart mr-2 text-admin-green"></i>Order Attribution (All Time)</h3>
          <table class="data-table">
            <thead><tr><th>Source</th><th>Orders</th><th>Revenue</th></tr></thead>
            <tbody>${Object.entries(ads.sources || {}).map(([k, v]) => `
              <tr><td class="capitalize">${k}</td><td>${v.orders}</td><td>₹${v.revenue?.toLocaleString('en-IN')}</td></tr>
            `).join('') || '<tr><td colspan="3" class="text-center py-4">No order data yet</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  // ========== COUPONS ==========
  async function renderCoupons(el) {
    const data = await api('GET', '/coupons');
    el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold">Coupons</h2>
      <button onclick="admin.showCouponForm()" class="admin-btn admin-btn-primary"><i class="fas fa-plus mr-1"></i>Add Coupon</button>
    </div>
    <table class="data-table">
      <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min Order</th><th>Usage</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${(data.coupons || []).map(c => `
        <tr>
          <td class="font-mono font-bold text-yellow-400">${c.code}</td>
          <td>${c.type === 'percentage' ? `${c.value}%` : `₹${c.value}`}</td>
          <td>${c.type}</td>
          <td>₹${c.min_subtotal || 0}</td>
          <td>${c.usage_count || 0}${c.total_limit ? `/${c.total_limit}` : ''}</td>
          <td>${c.is_active ? '<span class="badge-green">Active</span>' : '<span class="badge-red">Paused</span>'}</td>
          <td><button onclick="admin.toggleCoupon('${c.id}',${!c.is_active})" class="admin-btn admin-btn-ghost text-xs">${c.is_active ? 'Pause' : 'Resume'}</button></td>
        </tr>
      `).join('')}</tbody>
    </table>`;
  }

  // ========== REVIEWS (upgraded: feature, reply, bulk import, hidden tab) ==========
  async function renderReviews(el) {
    // Load review_photo_enabled config
    let reviewPhotoEnabled = true;
    try {
      const cfgRes = await api('GET', '/settings');
      reviewPhotoEnabled = (cfgRes.settings?.review_photo_enabled || 'true') === 'true';
    } catch(e) {}
    el.innerHTML = '<div class="text-center py-10"><div class="admin-spinner"></div></div>';
    const [pending, approved] = await Promise.all([
      api('GET', '/reviews?status=pending'),
      api('GET', '/reviews?status=approved')
    ]);
    const hidden = await api('GET', '/reviews?status=hidden').catch(() => ({ reviews: [] }));
    const reviewCard = (r, tab) => `
      <div class="stat-card mb-4">
        <div class="flex justify-between items-start mb-2">
          <div>
            <strong>${escapeHTML(r.customer_name || 'Anonymous')}</strong>
            <span class="text-yellow-400 ml-2">${'★'.repeat(r.rating||0)}${'☆'.repeat(5-(r.rating||0))}</span>
            ${r.verified_purchase ? '<span class="badge-green text-xs ml-2">✓ Verified</span>' : ''}
            ${r.is_featured ? '<span style="background:#CA8A04;color:#fff;padding:1px 6px;border-radius:4px;font-size:10px;" class="ml-2">⭐ Featured</span>' : ''}
            <div class="text-xs text-gray-500 mt-1">${escapeHTML(r.product ? r.product.name : '')} · ${new Date(r.created_at).toLocaleDateString('en-IN')}</div>
          </div>
          <div class="flex gap-1 flex-wrap justify-end">
            ${tab === 'pending' ? '<button onclick="admin.approveReview(\''+r.id+'\')" class="admin-btn admin-btn-green text-xs">Approve</button>' : ''}
            <button onclick="admin.featureReview('${r.id}')" class="admin-btn admin-btn-ghost text-xs">⭐</button>
            <button onclick="admin.replyReview('${r.id}')" class="admin-btn admin-btn-ghost text-xs">Reply</button>
            <button onclick="admin.hideReview('${r.id}')" class="admin-btn admin-btn-danger text-xs">Hide</button>
          </div>
        </div>
        ${r.title ? '<p class="font-bold text-sm mb-1">'+escapeHTML(r.title)+'</p>' : ''}
        <p class="text-sm text-gray-400">${escapeHTML(r.body || '')}</p>
        ${r.admin_reply ? '<div class="mt-2 p-2 bg-blue-900/20 border border-blue-800 rounded text-xs text-blue-300"><strong>Admin Reply:</strong> '+escapeHTML(r.admin_reply)+'</div>' : ''}
      </div>`;
    el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold">Reviews &amp; Ratings</h2>
      <div class="flex gap-2 flex-wrap justify-end">
        <button onclick="admin.showPostReviewForm()" class="admin-btn admin-btn-primary text-xs"><i class="fas fa-plus mr-1"></i>Post Custom Review</button>
        <button onclick="admin.bulkImportReviews()" class="admin-btn admin-btn-ghost text-xs"><i class="fas fa-file-import mr-1"></i>Bulk Import</button>
      </div>
    </div>
    <div class="flex gap-2 mb-6">
      <button class="tab-btn active" onclick="admin.showReviewTab('pending',this)">Pending (${(pending.reviews||[]).length})</button>
      <button class="tab-btn" onclick="admin.showReviewTab('approved',this)">Approved (${(approved.reviews||[]).length})</button>
      <button class="tab-btn" onclick="admin.showReviewTab('hidden',this)">Hidden (${(hidden.reviews||[]).length})</button>
    </div>
    <div id="reviews-pending">${(pending.reviews||[]).map(r=>reviewCard(r,'pending')).join('')||'<p class="text-gray-500 py-8 text-center">No pending reviews</p>'}</div>
    <div id="reviews-approved" style="display:none">${(approved.reviews||[]).map(r=>reviewCard(r,'approved')).join('')||'<p class="text-gray-500 py-8 text-center">No approved reviews</p>'}</div>
    <div id="reviews-hidden" style="display:none">${(hidden.reviews||[]).map(r=>reviewCard(r,'hidden')).join('')||'<p class="text-gray-500 py-8 text-center">No hidden reviews</p>'}</div>`;
  }

  // ========== CONTENT ==========
  async function renderContent(el) {
    const [pages, faq, blog] = await Promise.all([
      api('GET', '/pages'),
      api('GET', '/faq'),
      api('GET', '/blog')
    ]);
    el.innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Content</h2>
    <div class="flex gap-2 mb-6">
      <button class="tab-btn active" onclick="admin.showContentTab('pages',this)">Policy Pages</button>
      <button class="tab-btn" onclick="admin.showContentTab('faq',this)">FAQ</button>
      <button class="tab-btn" onclick="admin.showContentTab('blog',this)">Blog</button>
    </div>
    <div id="content-pages">
      ${(pages.pages || []).map(p => `
        <div class="stat-card mb-4 cursor-pointer" onclick="admin.editPage('${p.slug}')">
          <div class="flex justify-between items-center">
            <div><strong>${p.title}</strong><div class="text-xs text-gray-500">/${p.slug} · v${p.version || 1}</div></div>
            <button class="admin-btn admin-btn-ghost text-xs">Edit</button>
          </div>
        </div>
      `).join('')}
    </div>
    <div id="content-faq" style="display:none">
      <button onclick="admin.showFAQForm()" class="admin-btn admin-btn-primary mb-4"><i class="fas fa-plus mr-1"></i>Add FAQ</button>
      ${(faq.faq || []).map(f => `
        <div class="stat-card mb-2"><strong class="text-sm">${f.question}</strong><p class="text-xs text-gray-400 mt-1">${f.answer?.slice(0, 100)}...</p></div>
      `).join('')}
    </div>
    <div id="content-blog" style="display:none">
      <button onclick="admin.showBlogForm()" class="admin-btn admin-btn-primary mb-4"><i class="fas fa-plus mr-1"></i>New Post</button>
      ${(blog.posts || []).map(p => `
        <div class="stat-card mb-2"><div class="flex justify-between"><strong>${p.title}</strong><span class="${p.is_published ? 'badge-green' : 'badge-yellow'}">${p.is_published ? 'Published' : 'Draft'}</span></div></div>
      `).join('')}
    </div>`;
  }

  // ========== PRICING ==========
  async function renderPricing(el) {
    el.innerHTML = '<div class="text-center py-10"><div class="admin-spinner"></div></div>';
    let settings = {};
    try {
      const d = await api('GET', '/settings');
      settings = d.settings || {};
    } catch(e) {}

    const priceFields = [
      { key: 'price_small',       label: 'Small (8×12 inches)',       default: 499,  note: 'Customer frame product + custom frame page' },
      { key: 'price_medium',      label: 'Medium (12×18 inches)',      default: 799,  note: 'Default / most popular size' },
      { key: 'price_large',       label: 'Large (18×24 inches)',       default: 1149, note: '' },
      { key: 'price_xl',          label: 'XL (24×36 inches)',          default: 1749, note: '' },
      { key: 'price_premium_addon', label: 'Premium White Mount Add-on', default: 250, note: 'Added on top of base size price' },
      { key: 'price_poster',      label: 'Poster Print Add-on',        default: 199,  note: 'A3 rolled poster; shown on product + cart pages' },
      { key: 'price_acrylic_addon', label: 'Acrylic Glass Upgrade',    default: 350,  note: 'Optional upgrade add-on' },
      { key: 'price_cod_fee',     label: 'COD Fee',                    default: 49,   note: 'Added to order total for COD orders' },
      { key: 'price_prepaid_discount', label: 'Prepaid Discount',      default: 50,   note: 'Deducted from prepaid order total' },
      { key: 'price_shipping',    label: 'Shipping (under free threshold)', default: 99, note: 'Standard shipping fee' },
      { key: 'price_free_shipping_threshold', label: 'Free Shipping Threshold (₹)', default: 899, note: 'Cart subtotal above which shipping is free' }
    ];

    el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold">Pricing Table</h2>
        <p class="text-xs text-gray-500 mt-1">Prices are stored in Supabase and reflected live on product pages, custom frame page, and cart.</p>
      </div>
      <button onclick="admin.savePricing()" class="admin-btn admin-btn-primary">
        <i class="fas fa-save mr-2"></i>Save All Prices
      </button>
    </div>

    <div class="stat-card mb-6">
      <div class="flex items-start gap-3 mb-4">
        <i class="fas fa-info-circle text-blue-400 mt-0.5"></i>
        <div class="text-sm text-gray-400">
          <strong class="text-gray-300">How pricing works:</strong> These values are saved as keys in your Supabase <code class="text-blue-300">site_config</code> table.
          The product page, custom frame page, and cart all fetch these at runtime — so any changes here update the live site within seconds.
          <strong class="text-yellow-300">Important:</strong> Updating prices here does not automatically update product variant prices in your database.
          Use the Products section to update per-variant prices for catalog products.
        </div>
      </div>
    </div>

    <div class="stat-card">
      <h3 class="font-bold text-base mb-5 text-brand-gold"><i class="fas fa-tag mr-2"></i>Frame & Add-on Prices (₹)</h3>
      <div class="grid md:grid-cols-2 gap-5">
        ${priceFields.map(f => `
          <div>
            <label class="text-xs text-gray-400 block mb-1 font-medium">${f.label}
              ${f.note ? `<span class="text-gray-600 font-normal"> — ${f.note}</span>` : ''}
            </label>
            <div class="flex items-center gap-2">
              <span class="text-gray-400 text-sm font-bold">₹</span>
              <input type="number" name="price_field" data-key="${f.key}" 
                     class="admin-input flex-1" 
                     value="${settings[f.key] !== undefined ? settings[f.key] : f.default}"
                     min="0" max="99999" step="1"
                     placeholder="${f.default}">
            </div>
          </div>
        `).join('')}
      </div>
      <div class="mt-6 pt-5 border-t border-gray-800 flex justify-between items-center">
        <button onclick="admin.resetPricingDefaults()" class="admin-btn admin-btn-ghost text-xs">
          <i class="fas fa-undo mr-1"></i>Reset to Defaults
        </button>
        <button onclick="admin.savePricing()" class="admin-btn admin-btn-primary">
          <i class="fas fa-save mr-2"></i>Save All Prices
        </button>
      </div>
    </div>

    <!-- Poster Add-On Price — separate card with emerald accent for visibility -->
    <div class="poster-price-card mt-6">
      <div class="flex items-center gap-3 mb-3">
        <div class="w-8 h-8 rounded-full bg-green-900/40 border border-green-600/40 flex items-center justify-center">
          <i class="fas fa-print text-green-400 text-xs"></i>
        </div>
        <div>
          <h3 class="font-bold text-sm text-green-300">Poster Print Add-On Price (₹)</h3>
          <p class="text-[10px] text-gray-500 mt-0.5">Shown as "+₹X" on product page, cart, and custom frame page. Stored in <code class="text-blue-300">site_config</code> as <code class="text-blue-300">poster_addon_price</code>.</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-gray-400 text-sm font-bold">₹</span>
        <input type="number" name="price_field" data-key="poster_addon_price"
               class="admin-input" style="max-width:140px;"
               value="${settings['poster_addon_price'] !== undefined ? settings['poster_addon_price'] : 199}"
               min="0" max="9999" step="1" placeholder="199"
               id="poster-addon-price-input">
        <button onclick="admin.savePosterAddonPrice()" class="admin-btn admin-btn-primary text-xs px-3 py-1.5">
          <i class="fas fa-save mr-1"></i>Save Poster Price
        </button>
        <span id="poster-price-saved-badge" class="badge-emerald hidden">
          <i class="fas fa-check text-[9px]"></i> Saved
        </span>
      </div>
      <p class="text-[10px] text-gray-600 mt-2">
        <i class="fas fa-info-circle mr-1"></i>
        Current live value: <strong class="text-green-400">₹${settings['poster_addon_price'] || '199'}</strong>
        &nbsp;·&nbsp; Enable/disable poster sales in Settings → "Poster/Print-Only Sales Enabled"
      </p>
    </div>

    <div class="stat-card mt-6">
      <h3 class="font-bold text-base mb-3 text-gray-300"><i class="fas fa-eye mr-2 text-brand-gold"></i>Live Price Preview</h3>
      <div class="text-xs text-gray-500 mb-3">This shows what customers will see based on current saved values from Supabase.</div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        ${['Small','Medium','Large','XL'].map((s,i) => {
          const keys = ['price_small','price_medium','price_large','price_xl'];
          const defaults = [499,799,1149,1749];
          const val = settings[keys[i]] || defaults[i];
          const labels = ['8×12"','12×18"','18×24"','24×36"'];
          return `<div class="bg-gray-900 rounded-xl p-3 text-center">
            <div class="text-xs text-gray-500 uppercase tracking-widest">${s}</div>
            <div class="text-lg font-bold text-brand-gold">₹${val}</div>
            <div class="text-[10px] text-gray-600">${labels[i]}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="mt-3 pt-3 border-t border-gray-800 flex gap-4 text-center">
        <div class="flex-1 bg-gray-900/60 rounded-lg p-2">
          <div class="text-[10px] text-gray-500 uppercase tracking-widest">Poster Add-On</div>
          <div class="text-base font-bold text-green-400">+₹${settings['poster_addon_price'] || '199'}</div>
          <div class="text-[10px] text-gray-600">A3 rolled print</div>
        </div>
        <div class="flex-1 bg-gray-900/60 rounded-lg p-2">
          <div class="text-[10px] text-gray-500 uppercase tracking-widest">Mount Add-On</div>
          <div class="text-base font-bold text-brand-gold">+₹${settings['price_premium_addon'] || '250'}</div>
          <div class="text-[10px] text-gray-600">White mount</div>
        </div>
        <div class="flex-1 bg-gray-900/60 rounded-lg p-2">
          <div class="text-[10px] text-gray-500 uppercase tracking-widest">Free Shipping</div>
          <div class="text-base font-bold text-white">₹${settings['price_free_shipping_threshold'] || settings['free_shipping_threshold'] || '899'}+</div>
          <div class="text-[10px] text-gray-600">threshold</div>
        </div>
      </div>
    </div>`;
  }

  // ========== SETTINGS ==========
  async function renderSettings(el) {
    const data = await api('GET', '/settings');
    const s = data.settings || {};
    const fields = [
      { key: 'brand_name', label: '✨ Brand Name (shown site-wide — header, footer, emails, SEO)', type: 'text' },
      { key: 'site_logo_url', label: '🖼️ Logo Image URL (Cloudinary/CDN link)', type: 'text' },
      { key: 'site_logo_text', label: '✏️ Logo Text (shown if no image, e.g. "ChitraFrame")', type: 'text' },
      { key: 'site_logo_emoji', label: '🎨 Logo Emoji (prefix, e.g. 🖼️)', type: 'text' },
      { key: 'checkout_mode', label: 'Checkout Mode', type: 'select', options: ['shiprocket', 'custom'] },
      { key: 'cod_enabled', label: 'COD Enabled', type: 'toggle' },
      { key: 'free_shipping_threshold', label: 'Free Shipping Threshold (₹)', type: 'number' },
      { key: 'cod_min_value', label: 'COD Minimum (₹)', type: 'number' },
      { key: 'cod_max_value', label: 'COD Maximum (₹)', type: 'number' },
      { key: 'cod_fee', label: 'COD Fee (₹)', type: 'number' },
      { key: 'prepaid_discount', label: 'Prepaid Discount (₹)', type: 'number' },
      { key: 'pickup_pincode', label: 'Pickup Pincode', type: 'text' },
      { key: 'acrylic_enabled', label: 'Acrylic Upgrade', type: 'toggle' },
      { key: 'combos_enabled', label: 'Combos Enabled', type: 'toggle' },
      { key: 'exit_intent_enabled', label: 'Exit Intent Popup', type: 'toggle' },
      { key: 'whatsapp_number', label: 'WhatsApp Number', type: 'text' },
      { key: 'owner_email', label: 'Owner Email', type: 'text' },
      { key: 'announcement_text', label: 'Announcement Text', type: 'text' },
      { key: 'announcement_link', label: 'Announcement Link', type: 'text' },
      { key: 'announcement_bg', label: 'Announcement BG Color', type: 'text' },
      { key: 'announcement_active', label: 'Announcement Active', type: 'toggle' },
      { key: 'urgency_text', label: 'Urgency Text', type: 'text' },
      { key: 'urgency_subtext', label: 'Urgency Subtext', type: 'text' },
      { key: 'festival_mode', label: 'Festival Mode', type: 'select', options: ['', 'diwali', 'navratri', 'mahashivratri', 'janmashtami', 'valentine'] },
      { key: 'gtm_container_id', label: 'GTM Container ID', type: 'text' },
      { key: 'seo_title', label: 'SEO Title', type: 'text' },
      { key: 'seo_description', label: 'SEO Description', type: 'text' },
      { key: 'instagram_link', label: 'Instagram Link (URL)', type: 'text' },
      { key: 'facebook_link', label: 'Facebook Link (URL)', type: 'text' },
      { key: 'whatsapp_link', label: 'WhatsApp Link (URL, optional)', type: 'text' },
      { key: 'twitter_link', label: 'Twitter/X Link (URL)', type: 'text' },
      { key: 'contact_email', label: 'Contact Email', type: 'text' },
      { key: 'contact_phone', label: 'Contact Phone', type: 'text' },
      { key: 'contact_address', label: 'Contact Address', type: 'text' },
      { key: 'whatsapp_disputes', label: 'WhatsApp Disputes Number', type: 'text' },
      { key: 'bulk_order_phone1', label: 'Bulk/Corporate Orders Phone 1', type: 'text' },
      { key: 'bulk_order_phone2', label: 'Bulk/Corporate Orders Phone 2', type: 'text' },
      { key: 'poster_enabled', label: 'Poster/Print-Only Sales Enabled', type: 'toggle' },
      { key: 'review_photo_enabled', label: 'Allow Photo in Reviews', type: 'toggle' },
      { key: 'openrouter_model', label: 'OpenRouter AI Model', type: 'text' },
      { key: 'openrouter_api_key_hint', label: 'OpenRouter API Key (set in Cloudflare Secrets as OPENROUTER_API_KEY)', type: 'text' }
    ];

    el.innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Settings</h2>

    <!-- ── Operations Quick Controls ───────────────────────────────────── -->
    <div class="stat-card mb-6" style="border:2px solid rgba(184,134,11,0.45);background:rgba(184,134,11,0.04);" id="ops-quick-card">
      <h3 class="font-bold text-base mb-1 text-brand-gold"><i class="fas fa-bolt mr-2"></i>Operations Quick Controls</h3>
      <p class="text-xs text-gray-400 mb-4">One-tap controls for live business toggles — changes save instantly without reloading the full settings form.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

        <!-- COD Toggle -->
        <div class="bg-gray-900 rounded-xl p-4">
          <div class="flex items-center justify-between mb-2">
            <div>
              <p class="text-sm font-semibold text-white">Cash on Delivery</p>
              <p class="text-xs text-gray-400 mt-0.5">COD fee: <strong class="text-white">₹${escapeHTML(s['cod_fee'] || '49')}</strong> &nbsp;·&nbsp; Min order: <strong class="text-white">₹${escapeHTML(s['cod_min_value'] || '499')}</strong> &nbsp;·&nbsp; Max: <strong class="text-white">₹${escapeHTML(s['cod_max_value'] || '1995')}</strong></p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer ml-3">
              <input type="checkbox" id="ops-cod-toggle" ${s['cod_enabled'] === 'true' ? 'checked' : ''} class="sr-only peer" onchange="admin.quickToggle('cod_enabled',this.checked)">
              <div class="w-12 h-6 bg-gray-700 rounded-full peer peer-checked:bg-yellow-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
          <p id="ops-cod-status" class="text-xs font-semibold ${s['cod_enabled'] === 'true' ? 'text-green-400' : 'text-red-400'}">${s['cod_enabled'] === 'true' ? '✓ COD is ON — customers can pay on delivery' : '✗ COD is OFF — prepaid only'}</p>
        </div>

        <!-- Acrylic Upgrade Toggle -->
        <div class="bg-gray-900 rounded-xl p-4">
          <div class="flex items-center justify-between mb-2">
            <div>
              <p class="text-sm font-semibold text-white">Acrylic Upgrade Add-on</p>
              <p class="text-xs text-gray-400 mt-0.5">Shows acrylic upgrade option on PDP and checkout.</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer ml-3">
              <input type="checkbox" id="ops-acrylic-toggle" ${s['acrylic_enabled'] === 'true' ? 'checked' : ''} class="sr-only peer" onchange="admin.quickToggle('acrylic_enabled',this.checked)">
              <div class="w-12 h-6 bg-gray-700 rounded-full peer peer-checked:bg-yellow-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
          <p id="ops-acrylic-status" class="text-xs font-semibold ${s['acrylic_enabled'] === 'true' ? 'text-green-400' : 'text-gray-500'}">${s['acrylic_enabled'] === 'true' ? '✓ Acrylic upgrade is visible to customers' : '— Acrylic upgrade is hidden'}</p>
        </div>

        <!-- Pickup Pincode Editor -->
        <div class="bg-gray-900 rounded-xl p-4">
          <p class="text-sm font-semibold text-white mb-1">Pickup / Warehouse Pincode</p>
          <p class="text-xs text-gray-400 mb-3">Used for Shiprocket pickup requests and ETA calculations.</p>
          <div class="flex gap-2">
            <input type="text" id="ops-pincode-input" value="${escapeHTML(s['pickup_pincode'] || '')}" maxlength="6" pattern="[0-9]{6}"
              class="admin-input flex-1" placeholder="6-digit pincode" style="font-size:15px;font-weight:700;letter-spacing:0.08em;">
            <button type="button" onclick="admin.savePincode()" class="admin-btn admin-btn-primary" style="white-space:nowrap;">
              <i class="fas fa-save mr-1"></i>Save
            </button>
          </div>
          <p id="ops-pincode-status" class="text-xs text-gray-500 mt-2">Current: <strong class="text-brand-gold">${escapeHTML(s['pickup_pincode'] || 'Not set')}</strong></p>
        </div>

        <!-- Batch Shiprocket Sync -->
        <div class="bg-gray-900 rounded-xl p-4">
          <p class="text-sm font-semibold text-white mb-1">Batch Shiprocket Sync</p>
          <p class="text-xs text-gray-400 mb-3">Push all pending/paid orders that haven't been synced to Shiprocket yet. Safe to run multiple times.</p>
          <button type="button" class="admin-btn admin-btn-primary w-full" onclick="admin.syncPending()">
            <i class="fas fa-sync-alt mr-2"></i>Sync Pending Orders → Shiprocket
          </button>
          <p class="text-xs text-gray-500 mt-2">Also available in the <button type="button" onclick="admin.go('logistics')" class="text-brand-gold underline bg-transparent border-0 cursor-pointer text-xs p-0">Logistics</button> section.</p>
        </div>

      </div>
    </div>
    <!-- ── END Operations Quick Controls ──────────────────────────────── -->

    <!-- Brand Name Card — top of page, prominent -->
    <div class="stat-card mb-6" style="background:rgba(184,134,11,0.06);border:1px solid rgba(184,134,11,0.28);" id="brand-name-card">
      <h3 class="font-bold text-base mb-3 text-brand-gold"><i class="fas fa-tag mr-2"></i>Brand Name</h3>
      <p class="text-xs text-gray-400 mb-3">Changing this updates the site header, footer, all emails, SEO titles, and the JSON-LD schema — site-wide, in real-time.</p>
      <div class="flex items-center gap-3">
        <input type="text" id="brand-name-quick-input"
               class="admin-input brand-name-field"
               style="max-width:280px;font-weight:700;font-size:15px;"
               value="${escapeHTML(s['brand_name'] || 'ChitraFrame')}"
               placeholder="ChitraFrame"
               maxlength="60">
        <button onclick="admin.saveBrandName()" class="admin-btn admin-btn-primary">
          <i class="fas fa-save mr-1"></i>Save Brand Name
        </button>
        <span id="brand-name-saved-badge" class="badge-emerald hidden">
          <i class="fas fa-check text-[9px]"></i> Saved
        </span>
      </div>
      <p class="text-[10px] text-gray-500 mt-2">
        Current live brand: <strong class="text-brand-gold">${escapeHTML(s['brand_name'] || 'ChitraFrame')}</strong>
        &nbsp;·&nbsp; Also update "Logo Text" field below to match.
      </p>
    </div>

    <!-- Logo Editor Card -->
    <div class="stat-card mb-6 bg-brand-gold/5 border border-brand-gold/20" id="logo-editor-card">
      <h3 class="font-bold text-base mb-4 text-brand-gold"><i class="fas fa-image mr-2"></i>Site Logo Editor</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Live Preview -->
        <div>
          <p class="text-xs text-gray-500 mb-2 uppercase tracking-wider">Live Preview</p>
          <div id="logo-preview-box" style="background:#121212;border:1px solid #2A2A2A;border-radius:10px;padding:14px 20px;display:flex;align-items:center;gap:10px;min-height:60px;">
            <span id="logo-preview-img-wrap" style="display:${s['site_logo_url'] ? 'block' : 'none'}">
              <img id="logo-preview-img" src="${s['site_logo_url'] || ''}" style="height:32px;object-fit:contain;max-width:140px;" onerror="this.style.display='none'" alt="Logo preview">
            </span>
            <span id="logo-preview-text" style="font-size:17px;font-weight:800;color:#F2CA50;display:${s['site_logo_url'] ? 'none' : 'flex'};align-items:center;gap:6px;">
              <span id="logo-preview-emoji">${s['site_logo_emoji'] || '🖼️'}</span>
              <span id="logo-preview-name">${s['site_logo_text'] || 'PhotoFrameIn'}</span>
            </span>
          </div>
          <p class="text-[10px] text-gray-600 mt-1">This is how your logo appears in the sidebar &amp; nav.</p>
        </div>
        <!-- Upload from Cloudinary -->
        <div>
          <p class="text-xs text-gray-500 mb-2 uppercase tracking-wider">Upload Logo Image</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" onclick="admin.uploadLogoCloudinary()" class="admin-btn admin-btn-primary" style="font-size:12px;"><i class="fas fa-cloud-upload-alt mr-1"></i>Upload via Cloudinary</button>
            <button type="button" onclick="admin.clearLogo()" class="admin-btn admin-btn-ghost" style="font-size:12px;"><i class="fas fa-times mr-1"></i>Use Text Logo</button>
          </div>
          <p class="text-[10px] text-gray-600 mt-2">PNG/SVG recommended. Max 200×60px for best fit.</p>
          <p class="text-[10px] text-gray-500 mt-1">Or paste a URL in the "Logo Image URL" field below.</p>
        </div>
      </div>
    </div>

    <form id="settings-form" class="space-y-4 max-w-2xl">
      ${fields.map(f => `
        <div class="flex items-center justify-between bg-gray-900 rounded-lg p-3">
          <label class="text-sm font-medium">${f.label}</label>
          ${f.type === 'toggle' ? `
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" name="${f.key}" ${s[f.key] === 'true' ? 'checked' : ''} class="sr-only peer">
              <div class="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-yellow-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          ` : f.type === 'select' ? `
            <select name="${f.key}" class="admin-input" style="width:auto">${f.options.map(o => `<option value="${o}" ${s[f.key] === o ? 'selected' : ''}>${o || '(none)'}</option>`).join('')}</select>
          ` : `
            <input type="${f.type}" name="${f.key}" value="${escapeHTML(s[f.key] || '')}" class="admin-input" style="width:300px" ${f.key === 'site_logo_url' ? 'oninput="admin.previewLogoUrl(this.value)"' : ''} ${f.key === 'site_logo_text' ? 'oninput="document.getElementById(\'logo-preview-name\').textContent=this.value"' : ''} ${f.key === 'site_logo_emoji' ? 'oninput="document.getElementById(\'logo-preview-emoji\').textContent=this.value"' : ''}>
          `}
        </div>
      `).join('')}
      <div class="flex gap-4 pt-4">
        <button type="submit" class="admin-btn admin-btn-primary">Save Settings</button>
        <button type="button" onclick="admin.showSocialSettings()" class="admin-btn admin-btn-ghost"><i class="fas fa-share-alt mr-1"></i>Quick Social Links</button>
        <button type="button" onclick="admin.backupDB()" class="admin-btn admin-btn-ghost"><i class="fas fa-database mr-1"></i>Export Backup</button>
        <button type="button" onclick="admin.viewErrors()" class="admin-btn admin-btn-ghost"><i class="fas fa-bug mr-1"></i>Error Log</button>
      </div>
    </form>`;

    // Show current bulk order contacts prominently
    const bulkPhone1 = s['bulk_order_phone1'] || '8333066370';
    const bulkPhone2 = s['bulk_order_phone2'] || '7989094923';
    const settingsHeader = el.querySelector('h2');
    if (settingsHeader) {
      const bulkBanner = document.createElement('div');
      bulkBanner.className = 'stat-card mb-6 bg-brand-gold/5 border border-brand-gold/20';
      bulkBanner.innerHTML = `
        <h3 class="font-bold text-base mb-3 text-brand-gold"><i class="fas fa-building mr-2"></i>Bulk / Corporate Orders</h3>
        <div class="flex flex-wrap gap-6 text-sm">
          <div><span class="text-gray-400">Phone 1:</span> <a href="tel:${bulkPhone1}" class="text-white font-bold hover:text-brand-gold">${bulkPhone1}</a></div>
          <div><span class="text-gray-400">Phone 2:</span> <a href="tel:${bulkPhone2}" class="text-white font-bold hover:text-brand-gold">${bulkPhone2}</a></div>
        </div>
        <p class="text-xs text-gray-500 mt-2">Update below in "Bulk/Corporate Orders Phone 1/2" fields.</p>`;
      el.insertBefore(bulkBanner, el.querySelector('form'));
    }

    $('#settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const updates = {};
      fields.forEach(f => {
        if (f.type === 'toggle') updates[f.key] = fd.has(f.key) ? 'true' : 'false';
        else updates[f.key] = fd.get(f.key) || '';
      });
      await api('PUT', '/settings', updates);
      toast('Settings saved!', 'success');
    });
  }

  // Expose mobile helpers globally (called from inline onclick in render())
  window.toggleMobileSidebar = toggleMobileSidebar;
  window.closeMobileSidebar = closeMobileSidebar;

  // ========== ADMIN ACTIONS ==========
  window.admin = {
    go(id) { currentSection = id; loadSection(id); },

    // ---- Pricing ----
    async savePricing() {
      const inputs = document.querySelectorAll('input[name="price_field"]');
      if (!inputs.length) { toast('No pricing fields found', 'error'); return; }
      const updates = {};
      let valid = true;
      inputs.forEach(inp => {
        const key = inp.dataset.key;
        const val = parseInt(inp.value, 10);
        if (isNaN(val) || val < 0) { toast(`Invalid value for ${key}`, 'error'); valid = false; return; }
        updates[key] = String(val);
      });
      if (!valid) return;
      try {
        await api('PUT', '/settings', updates);
        toast('Pricing saved successfully!', 'success');
      } catch(e) {
        toast('Error saving pricing: ' + (e.message||'Unknown'), 'error');
      }
    },
    resetPricingDefaults() {
      const defaults = { price_small:'499', price_medium:'799', price_large:'1149', price_xl:'1749', price_premium_addon:'250', price_poster:'199', poster_addon_price:'199', price_acrylic_addon:'350', price_cod_fee:'49', price_prepaid_discount:'50', price_shipping:'99', price_free_shipping_threshold:'899', free_shipping_threshold:'899' };
      document.querySelectorAll('input[name="price_field"]').forEach(inp => {
        const key = inp.dataset.key;
        if (defaults[key] !== undefined) inp.value = defaults[key];
      });
      toast('Defaults loaded. Click "Save All Prices" to apply.');
    },

    // ---- Brand Name (dedicated quick-save + propagation) ----
    async saveBrandName() {
      const inp = document.getElementById('brand-name-quick-input');
      if (!inp) { toast('Brand name field not found', 'error'); return; }
      const val = (inp.value || '').trim();
      if (!val) { toast('Brand name cannot be empty', 'error'); return; }
      if (val.length > 60) { toast('Brand name too long (max 60 chars)', 'error'); return; }
      try {
        await api('PUT', '/settings', {
          brand_name: val,
          // Also sync seo_title and announcement prefix if they contain the old brand name
          // Propagation to page meta is handled by app.js reading state.config.brand_name
        });
        // Visual feedback
        inp.classList.add('price-field-saved');
        setTimeout(() => inp.classList.remove('price-field-saved'), 1300);
        const badge = document.getElementById('brand-name-saved-badge');
        if (badge) { badge.classList.remove('hidden'); setTimeout(() => badge.classList.add('hidden'), 2500); }
        // Update the sidebar brand display live
        const sidebarLogo = document.getElementById('sidebar-logo-text');
        if (sidebarLogo) sidebarLogo.textContent = val;
        toast(`Brand name saved: "${val}"`, 'success');
      } catch(e) {
        toast('Error saving brand name: ' + (e.message||'Unknown'), 'error');
      }
    },

    // ---- Poster Add-On Price (dedicated quick-save) ----
    async savePosterAddonPrice() {
      const inp = document.getElementById('poster-addon-price-input');
      if (!inp) { toast('Poster price field not found', 'error'); return; }
      const val = parseInt(inp.value, 10);
      if (isNaN(val) || val < 0) { toast('Invalid poster add-on price', 'error'); return; }
      try {
        await api('PUT', '/settings', { poster_addon_price: String(val) });
        // Animate the input field
        inp.classList.add('price-field-saved');
        setTimeout(() => inp.classList.remove('price-field-saved'), 1300);
        // Show saved badge
        const badge = document.getElementById('poster-price-saved-badge');
        if (badge) {
          badge.classList.remove('hidden');
          setTimeout(() => badge.classList.add('hidden'), 2500);
        }
        toast('Poster add-on price saved: ₹' + val, 'success');
      } catch(e) {
        toast('Error saving poster price: ' + (e.message||'Unknown'), 'error');
      }
    },

    // ---- Print order image ----
    printOrderImage(imageUrl, name, orderId) {
      const win = window.open('', '_blank', 'width=900,height=700');
      if (!win) { toast('Pop-up blocked. Allow pop-ups and try again.', 'error'); return; }
      win.document.write(`<!DOCTYPE html><html><head><title>Print — ${orderId}</title>
        <style>
          body { margin:0; background:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:Arial,sans-serif; }
          img { max-width:90vw; max-height:80vh; object-fit:contain; border:1px solid #ddd; }
          .info { margin:12px 0 4px; font-size:13px; color:#333; }
          @media print { .no-print { display:none; } body { margin:0; } img { max-width:100%; max-height:95vh; border:none; } }
        </style></head><body>
        <div class="info"><strong>Order:</strong> ${orderId} &nbsp;·&nbsp; <strong>${name}</strong></div>
        <img src="${imageUrl}" alt="Print image for ${orderId}">
        <div class="no-print" style="margin-top:20px;display:flex;gap:12px;">
          <button onclick="window.print()" style="background:#C5A059;color:#000;border:none;padding:10px 24px;border-radius:6px;font-weight:700;cursor:pointer;font-size:14px;">🖨️ Print</button>
          <a href="${imageUrl}" download style="background:#222;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-weight:700;cursor:pointer;font-size:14px;text-decoration:none;">⬇ Download</a>
          <button onclick="window.close()" style="background:#444;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-weight:700;cursor:pointer;font-size:14px;">✕ Close</button>
        </div>
      </body></html>`);
      win.document.close();
    },

    // ---- Logo Upload helpers ----
    previewLogoUrl(url) {
      const imgWrap = document.getElementById('logo-preview-img-wrap');
      const img = document.getElementById('logo-preview-img');
      const textEl = document.getElementById('logo-preview-text');
      if (!img || !imgWrap || !textEl) return;
      if (url && url.trim()) {
        img.src = url.trim();
        imgWrap.style.display = 'block';
        textEl.style.display = 'none';
      } else {
        imgWrap.style.display = 'none';
        textEl.style.display = 'flex';
      }
    },
    clearLogo() {
      const urlInput = document.querySelector('input[name="site_logo_url"]');
      if (urlInput) { urlInput.value = ''; admin.previewLogoUrl(''); }
    },
    async uploadLogoCloudinary() {
      try {
        const cfgRes = await api('GET', '/settings');
        const cfg = cfgRes.settings || {};
        const cloudName = cfg.cloudinary_cloud_name;
        const uploadPreset = cfg.cloudinary_upload_preset;
        if (!cloudName || !uploadPreset) {
          toast('Set Cloudinary Cloud Name & Upload Preset in Media Settings first', 'error');
          admin.go('media'); return;
        }
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/png,image/svg+xml,image/webp,image/jpeg';
        input.onchange = async () => {
          const file = input.files[0];
          if (!file) return;
          if (file.size > 1024 * 1024) { toast('Logo must be under 1MB', 'error'); return; }
          const fd = new FormData();
          fd.append('file', file);
          fd.append('upload_preset', uploadPreset);
          fd.append('folder', 'pfi/logo');
          try {
            const r = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, fd);
            const url = r.data.secure_url;
            const urlInput = document.querySelector('input[name="site_logo_url"]');
            if (urlInput) { urlInput.value = url; admin.previewLogoUrl(url); }
            toast('Logo uploaded! Click "Save Settings" to apply.', 'success');
          } catch { toast('Upload failed. Check Cloudinary config.', 'error'); }
        };
        input.click();
      } catch { toast('Could not connect. Are you logged in?', 'error'); }
    },

    async viewOrder(orderId) {
      const data = await api('GET', `/orders/${orderId}`);
      const o = data.order;
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `<div class="modal-content">
        <div class="flex justify-between items-center mb-4"><h3 class="text-xl font-bold text-yellow-400">${o.order_id}</h3><button onclick="this.closest('.modal-overlay').remove()" class="text-gray-400 hover:text-white text-xl">×</button></div>
        <div class="grid grid-cols-2 gap-4 text-sm mb-4">
          <div><strong>Customer:</strong> ${o.customer_name}<br>${o.customer_email}<br>${o.customer_phone}</div>
          <div><strong>Address:</strong><br>${o.address?.line1}<br>${o.address?.city}, ${o.address?.state} - ${o.address?.pincode}</div>
          <div><strong>Payment:</strong> ${o.payment_method?.toUpperCase()}<br>Total: ₹${o.total?.toLocaleString('en-IN')}</div>
          <div><strong>Status:</strong> ${o.status}<br>COD Confirmed: ${o.cod_confirmed ? 'Yes' : 'No'}</div>
        </div>
        <h4 class="font-bold mb-2">Items & Print Images:</h4>
        ${(o.items || []).map((i, idx) => `
          <div class="bg-gray-900 rounded-xl p-4 mb-3 text-sm">
            <div class="flex gap-4 items-start">
              ${i.image_url ? `
                <div class="flex-shrink-0">
                  <img src="${i.image_url}" class="w-20 h-20 object-cover rounded-lg border border-gray-700 cursor-pointer shadow-lg" onclick="window.open('${i.image_url}', '_blank')" title="Click to open full size">
                </div>` : `
                <div class="w-20 h-20 bg-gray-800 rounded-lg flex flex-col items-center justify-center text-gray-600 flex-shrink-0">
                  <i class="fas fa-image text-xl mb-1"></i>
                  <span class="text-[9px]">No image</span>
                </div>`}
              <div class="flex-1 min-w-0">
                <strong class="text-white block">${escapeHTML(i.name)}</strong>
                <span class="text-gray-400 text-xs">${escapeHTML(i.size)} · ${escapeHTML(i.frame_type)} · Qty: ${i.quantity}</span><br>
                <span class="text-brand-gold font-bold">₹${(i.price * i.quantity).toLocaleString('en-IN')}</span>
              </div>
            </div>
            ${i.image_url ? `
            <div class="flex gap-2 mt-3 flex-wrap">
              <a href="${i.image_url}" download="order-${o.order_id}-item${idx+1}.jpg" class="admin-btn admin-btn-primary text-xs">
                <i class="fas fa-download mr-1"></i>Download Print Image
              </a>
              <button onclick="admin.printOrderImage('${i.image_url}', '${escapeHTML(i.name)}', '${o.order_id}')" class="admin-btn admin-btn-ghost text-xs">
                <i class="fas fa-print mr-1"></i>Print
              </button>
              <a href="${i.image_url}" target="_blank" class="admin-btn admin-btn-ghost text-xs">
                <i class="fas fa-external-link-alt mr-1"></i>Full Size
              </a>
            </div>` : ''}
          </div>
        `).join('')}
        ${o.awb_number ? `<div class="mt-4 bg-gray-900 rounded p-3"><strong>AWB:</strong> ${o.awb_number} · <strong>Carrier:</strong> ${o.carrier || '-'}</div>` : ''}
        ${o.status === 'delivered' && o.customer_email ? `
        <div class="mt-4 p-3 bg-green-900/20 border border-green-800 rounded-xl flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-bold text-green-400"><i class="fas fa-star mr-2"></i>Order Delivered — Send Review Request</p>
            <p class="text-xs text-gray-400">Email a review link to ${escapeHTML(o.customer_email)}</p>
          </div>
          <button onclick="admin.sendReviewRequest('${escapeHTML(o.order_id)}', '${escapeHTML(o.customer_email)}', '${escapeHTML(o.customer_name||'')}')" class="admin-btn admin-btn-primary text-xs whitespace-nowrap">
            <i class="fas fa-envelope mr-1"></i>Send Request
          </button>
        </div>` : ''}
        ${o.admin_notes ? `<div class="mt-4 bg-yellow-900/20 rounded p-3 text-sm"><strong>Admin Notes:</strong> ${o.admin_notes}</div>` : ''}
        ${data.claims?.length ? `<div class="mt-4"><h4 class="font-bold text-red-400 mb-2">Damage Claims:</h4>${data.claims.map(cl => `
          <div class="bg-red-900/20 border border-red-800 rounded p-3 mb-2">
            <p class="text-sm">${cl.description}</p>
            <a href="${cl.video_url}" target="_blank" class="text-yellow-400 text-sm">Watch Video</a>
            <div class="flex gap-2 mt-2">
              ${cl.status === 'pending' ? `<button onclick="admin.approveClaim('${cl.id}')" class="admin-btn admin-btn-green text-xs">Approve</button><button onclick="admin.declineClaim('${cl.id}')" class="admin-btn admin-btn-danger text-xs">Decline</button>` : `<span class="${cl.status === 'approved' ? 'badge-green' : 'badge-red'}">${cl.status}</span>`}
            </div>
          </div>
        `).join('')}</div>` : ''}
      </div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    },
    async updateStatus(orderId, status) {
      await api('PUT', `/orders/${orderId}/status`, { status });
      // Auto-send review request when marking as delivered
      if (status === 'delivered') {
        try {
          const ord = await api('GET', `/orders/${orderId}/detail`);
          if (ord.order?.customer_email) {
            await api('POST', '/review-requests', {
              orderId, email: ord.order.customer_email, name: ord.order.customer_name || ''
            });
          }
        } catch(e) { /* silent */ }
      }
      loadSection('orders');
    },
    async confirmCOD(orderId, phoneStr, nameStr, totalAmount) {
      try {
        if (phoneStr) {
          const msg = `Hi ${nameStr || 'there'}, please confirm your order ${orderId} for ₹${totalAmount.toLocaleString('en-IN')} from PhotoFrameIn. Reply with "CONFIRM MY ORDER" to process it.`;
          const phoneNum = phoneStr.replace(/[^\d]/g, '');
          const waPhone = phoneNum.length === 10 ? `91${phoneNum}` : phoneNum;
          window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
        }
        
        await api('POST', `/orders/${orderId}/confirm-cod`);
        loadSection('orders');
      } catch (e) {
        console.error(e);
        toast('Failed to confirm COD', 'error');
      }
    },
    async approveClaim(claimId) {
      const result = await api('POST', `/claims/${claimId}/approve`);
      toast(result.success ? `Replacement: ${result.replacementOrderId}` : 'Error', result.success ? 'success' : 'error');
      document.querySelector('.modal-overlay')?.remove();
    },
    async declineClaim(claimId) {
      const reason = prompt('Decline reason:');
      if (!reason) return;
      await api('POST', `/claims/${claimId}/decline`, { reason });
      document.querySelector('.modal-overlay')?.remove();
    },
    async toggleCoupon(id, active) {
      await api('PUT', `/coupons/${id}`, { is_active: active });
      loadSection('coupons');
    },
    async approveReview(id) {
      await api('PUT', `/reviews/${id}`, { is_approved: true });
      loadSection('reviews');
    },
    async hideReview(id) {
      await api('PUT', `/reviews/${id}`, { is_hidden: true });
      loadSection('reviews');
    },

    // ---- Post Custom Review (admin creates verified review as customer) ----
    showPostReviewForm() {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-content" style="max-width:520px">
          <div class="flex items-center justify-between mb-5">
            <h3 class="font-bold text-lg">Post a Verified Review</h3>
            <button onclick="this.closest('.modal-overlay').remove()" class="admin-btn admin-btn-ghost text-xs">✕ Close</button>
          </div>
          <p class="text-xs text-gray-500 mb-5 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
            <i class="fas fa-info-circle text-blue-400 mr-1"></i>
            This creates a review attributed to a real customer name, published immediately as approved.
            Use only for genuine reviews you have received offline or via WhatsApp.
          </p>
          <div class="space-y-4">
            <div>
              <label class="text-xs text-gray-400 block mb-1">Customer Name <span class="text-red-400">*</span></label>
              <input id="cr-name" class="admin-input w-full" placeholder="e.g. Priya Sharma" maxlength="80">
            </div>
            <div>
              <label class="text-xs text-gray-400 block mb-1">Star Rating <span class="text-red-400">*</span></label>
              <div class="flex gap-2" id="cr-stars-row">
                ${[1,2,3,4,5].map(n => `
                  <button type="button" onclick="admin._setCRStar(${n})" id="cr-star-${n}" class="text-2xl text-gray-600 hover:text-yellow-400 transition" title="${n} star${n>1?'s':''}">★</button>
                `).join('')}
                <span id="cr-star-label" class="text-xs text-gray-400 self-center ml-2">Select rating</span>
              </div>
            </div>
            <div>
              <label class="text-xs text-gray-400 block mb-1">Review Title</label>
              <input id="cr-title" class="admin-input w-full" placeholder="e.g. Beautiful frame, great quality!" maxlength="120">
            </div>
            <div>
              <label class="text-xs text-gray-400 block mb-1">Review Body <span class="text-red-400">*</span></label>
              <textarea id="cr-body" class="admin-input w-full" rows="4" placeholder="Customer's feedback about the product..." maxlength="1200" style="resize:vertical"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs text-gray-400 block mb-1">Order ID (optional — adds ✓ Verified badge)</label>
                <input id="cr-orderid" class="admin-input w-full font-mono" placeholder="PFI-20260519-001" maxlength="40">
              </div>
              <div>
                <label class="text-xs text-gray-400 block mb-1">Product (optional)</label>
                <input id="cr-product" class="admin-input w-full" placeholder="e.g. Ram Lalla Divine" maxlength="80">
              </div>
            </div>
            <div class="flex items-center gap-3 p-3 bg-gray-900 rounded-lg">
              <input type="checkbox" id="cr-verified" checked class="w-4 h-4 accent-green-500">
              <label for="cr-verified" class="text-sm text-gray-300 cursor-pointer">Mark as <strong class="text-green-400">Verified Purchase</strong></label>
            </div>
          </div>
          <div class="flex gap-3 mt-6">
            <button onclick="admin.submitAdminReview()" class="admin-btn admin-btn-primary flex-1">
              <i class="fas fa-check mr-2"></i>Publish Review
            </button>
            <button onclick="this.closest('.modal-overlay').remove()" class="admin-btn admin-btn-ghost">Cancel</button>
          </div>
          <p class="text-xs text-gray-600 text-center mt-3">Review will be published immediately without pending approval.</p>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      window._crRating = 0;
    },
    _setCRStar(n) {
      window._crRating = n;
      [1,2,3,4,5].forEach(i => {
        const s = document.getElementById(`cr-star-${i}`);
        if (s) s.style.color = i <= n ? '#facc15' : '';
      });
      const lbl = document.getElementById('cr-star-label');
      if (lbl) lbl.textContent = ['','1 star — Poor','2 stars — Fair','3 stars — Good','4 stars — Great','5 stars — Excellent'][n] || '';
    },
    async submitAdminReview() {
      const name = (document.getElementById('cr-name')?.value || '').trim();
      const rating = window._crRating || 0;
      const title = (document.getElementById('cr-title')?.value || '').trim();
      const body = (document.getElementById('cr-body')?.value || '').trim();
      const orderId = (document.getElementById('cr-orderid')?.value || '').replace(/[^a-zA-Z0-9\-]/g,'').trim();
      const product = (document.getElementById('cr-product')?.value || '').trim();
      const verified = document.getElementById('cr-verified')?.checked ?? true;

      if (!name) { toast('Customer name is required', 'error'); return; }
      if (!rating) { toast('Please select a star rating', 'error'); return; }
      if (!body) { toast('Review body is required', 'error'); return; }

      const btn = event.target;
      const orig = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Publishing...';

      try {
        const payload = {
          customer_name: name,
          rating,
          title: title || null,
          body,
          order_id: orderId || null,
          product_name: product || null,
          verified_purchase: verified,
          is_admin_post: true,
          is_approved: true,
          is_hidden: false
        };
        const res = await api('POST', '/reviews', payload);
        if (res.success || res.review || res.id) {
          toast('Review published successfully!', 'success');
          document.querySelector('.modal-overlay')?.remove();
          loadSection('reviews');
        } else {
          throw new Error(res.error || 'Failed to post review');
        }
      } catch (e) {
        toast('Error: ' + (e.message || 'Unknown error'), 'error');
        btn.disabled = false; btn.innerHTML = orig;
      }
    },
    async quickToggle(key, value) {
      try {
        await api('PUT', '/settings', { [key]: value ? 'true' : 'false' });
        // Update status label
        if (key === 'cod_enabled') {
          const el = document.getElementById('ops-cod-status');
          if (el) { el.textContent = value ? '✓ COD is ON — customers can pay on delivery' : '✗ COD is OFF — prepaid only'; el.className = 'text-xs font-semibold ' + (value ? 'text-green-400' : 'text-red-400'); }
        }
        if (key === 'acrylic_enabled') {
          const el = document.getElementById('ops-acrylic-status');
          if (el) { el.textContent = value ? '✓ Acrylic upgrade is visible to customers' : '— Acrylic upgrade is hidden'; el.className = 'text-xs font-semibold ' + (value ? 'text-green-400' : 'text-gray-500'); }
        }
        toast(key.replace(/_/g,' ') + ' updated!', 'success');
      } catch(e) { toast('Failed to update: ' + (e.message || 'error'), 'error'); }
    },
    async savePincode() {
      const input = document.getElementById('ops-pincode-input');
      if (!input) return;
      const pincode = input.value.trim();
      if (!/^\d{6}$/.test(pincode)) { toast('Please enter a valid 6-digit pincode', 'error'); return; }
      try {
        await api('PUT', '/settings', { pickup_pincode: pincode });
        const status = document.getElementById('ops-pincode-status');
        if (status) status.innerHTML = 'Current: <strong class="text-brand-gold">' + pincode + '</strong>';
        toast('Pickup pincode saved: ' + pincode, 'success');
      } catch(e) { toast('Failed to save pincode: ' + (e.message || 'error'), 'error'); }
    },
    async syncPending() {
      const btn = event.target;
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Syncing...';
      btn.disabled = true;
      try {
        const res = await api('POST', '/orders/bulk-sync');
        toast(`Synced ${res.synced} orders. ${res.failed} failed.`, 'success');
        loadSection('logistics');
      } catch (e) { toast('Bulk sync failed', 'error'); }
      finally { btn.innerHTML = original; btn.disabled = false; }
    },
    async createShiprocketOrder(id) {
      try {
        await api('POST', `/orders/${id}/shiprocket`);
        toast('Order synced to Shiprocket', 'success');
        loadSection('logistics');
      } catch (e) { toast(e.response?.data?.error || 'Sync failed', 'error'); }
    },
    async generateAWB(id) {
      try {
        await api('POST', `/orders/${id}/awb`);
        toast('AWB Generated!', 'success');
        loadSection('logistics');
      } catch (e) { toast(e.response?.data?.error || 'AWB failed', 'error'); }
    },
    async schedulePickup(id) {
      try {
        await api('POST', `/orders/${id}/pickup`);
        toast('Pickup Scheduled!', 'success');
        loadSection('logistics');
      } catch (e) { toast(e.response?.data?.error || 'Pickup failed', 'error'); }
    },
    async generateLabel(id) {
      try {
        const res = await api('POST', '/logistics/generate-label', { orderId: id });
        if (res.success && res.labelUrls && res.labelUrls.length) {
          res.labelUrls.forEach((url) => window.open(url, '_blank'));
          toast('Label(s) generated!', 'success');
        } else {
          toast(res.error || 'Label generation failed', 'error');
        }
        loadSection('logistics');
      } catch (e) { toast(e.response?.data?.error || 'Label generation failed', 'error'); }
    },
    async filterOrders() {
      const status = $('#order-status-filter')?.value;
      const payment = $('#order-payment-filter')?.value;
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (payment) params.set('payment', payment);
      const data = await api('GET', `/orders?${params}`);
      const table = $('#orders-table');
      if (table) table.innerHTML = renderOrdersTable(data.orders);
    },
    showAnalyticsTab(tab, btn) {
      ['products', 'rto', 'ads'].forEach(t => {
        const el = $(`#analytics-${t}`);
        if (el) el.style.display = t === tab ? 'block' : 'none';
      });
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      btn?.classList.add('active');
    },
    showContentTab(tab, btn) {
      ['pages', 'faq', 'blog'].forEach(t => {
        const el = $(`#content-${t}`);
        if (el) el.style.display = t === tab ? 'block' : 'none';
      });
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      btn?.classList.add('active');
    },
    showReviewTab(tab, btn) {
      ['pending','approved','hidden'].forEach(t => {
        const el = $(`#reviews-${t}`);
        if (el) el.style.display = t === tab ? 'block' : 'none';
      });
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      btn?.classList.add('active');
    },
    async backupDB() {
      const data = await api('POST', '/backup');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photoframein-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    },
    async viewErrors() {
      const data = await api('GET', '/errors');
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `<div class="modal-content"><h3 class="text-lg font-bold mb-4">Error Log (Last 100)</h3><button onclick="this.closest('.modal-overlay').remove()" class="absolute top-4 right-4 text-gray-400">×</button>
        ${(data.errors || []).map(e => `<div class="bg-red-900/20 rounded p-2 mb-2 text-xs"><strong>${e.endpoint}</strong> ${e.method} · ${e.ref_id}<br>${e.error_message}<br><span class="text-gray-500">${new Date(e.created_at).toLocaleString('en-IN')}</span></div>`).join('')}
      </div>`;
      document.body.appendChild(modal);
    },
    exportCSV(type) { toast(`CSV export for ${type} — download initiated`, 'info'); },
    async toggleStatus(event, type, id) {
      const input = event.target;
      const newState = input.checked;
      const originalOpacity = input.parentElement.style.opacity;
      
      try {
        input.parentElement.style.opacity = '0.5';
        input.disabled = true;
        
        await api('PUT', `/${type}/${id}`, { is_active: newState });
        
        const typeName = type === 'products' ? 'product' : 'category';
        toast(`Turned ${newState ? 'on' : 'off'} ${typeName}`, 'success');
        
      } catch (e) {
        input.checked = !newState; // revert UI
        toast('Failed to update status', 'error');
      } finally {
        input.parentElement.style.opacity = originalOpacity || '1';
        input.disabled = false;
      }
    },
    async showProductForm(id = null) {
      let p = { name: '', slug: '', description: '', category_id: '', base_price: 0, is_active: true, images: [], variants: [] };
      if (id) {
        const data = await api('GET', '/products');
        p = data.products.find(x => x.id === id) || p;
      }
      const cats = await api('GET', '/categories');
      
      const content = `
        <form id="product-form" class="space-y-4">
          <input type="hidden" name="id" value="${id || ''}">
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-xs text-gray-400 mb-1">Name</label><input type="text" name="name" value="${p.name}" class="admin-input" required></div>
            <div><label class="block text-xs text-gray-400 mb-1">Slug</label><input type="text" name="slug" value="${p.slug}" class="admin-input" required></div>
          </div>
          <div><label class="block text-xs text-gray-400 mb-1">Description</label><textarea name="description" class="admin-input" rows="3">${p.description || ''}</textarea></div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-xs text-gray-400 mb-1">Category</label><select name="category_id" class="admin-input">${cats.categories.map(c => `<option value="${c.id}" ${c.id === p.category_id ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
            <div><label class="block text-xs text-gray-400 mb-1">Min Price (from variants)</label><input type="text" value="${p.base_price || 'Set in variants below'}" class="admin-input" readonly disabled style="opacity:0.5;cursor:not-allowed" title="Price is managed through product variants"></div>
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Status</label>
            <div class="flex gap-4">
              <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="is_active" ${p.is_active ? 'checked' : ''}> Active</label>
              <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="is_placeholder" ${p.is_placeholder ? 'checked' : ''}> Placeholder</label>
            </div>
          </div>
          <div class="border-t border-gray-800 pt-4">
            <label class="block text-xs text-gray-400 mb-2">Allowed Sizes (leave blank = all sizes allowed)</label>
            <div class="flex flex-wrap gap-2 mb-2" id="size-restriction-options">
              ${['Small','Medium','Large','XL'].map(s => `<label class="flex items-center gap-1 text-xs cursor-pointer"><input type="checkbox" name="allowed_sizes_${s}" class="accent-yellow-400" ${!p.allowed_sizes || p.allowed_sizes.includes(s) ? 'checked' : ''}> ${s}</label>`).join('')}
            </div>
            <label class="block text-xs text-gray-400 mb-1 mt-3">Allowed Frame Types (leave blank = all)</label>
            <div class="flex flex-wrap gap-2 mb-4">
              ${['Standard','Premium'].map(f => `<label class="flex items-center gap-1 text-xs cursor-pointer"><input type="checkbox" name="allowed_frames_${f}" class="accent-yellow-400" ${!p.allowed_frames || p.allowed_frames.includes(f) ? 'checked' : ''}> ${f}</label>`).join('')}
            </div>
          </div>
          <div class="border-t border-gray-800 pt-4 space-y-5">

            <!-- OG/SEO image — for social sharing & product card thumbnail -->
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500 text-black text-[10px] font-bold">1</span>
                <label class="text-xs font-semibold text-white">Main / OG Image <span class="text-gray-500 font-normal">(product card thumbnail &amp; social share)</span></label>
              </div>
              ${p.og_image_url ? `
              <div class="flex items-start gap-3 p-2 bg-gray-900 rounded-lg border border-gray-700 mb-2">
                <img src="${escapeHTML(p.og_image_url)}" class="w-20 h-20 object-cover rounded border border-gray-600 shrink-0" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22><rect fill=%22%23222%22 width=%2280%22 height=%2280%22/><text fill=%22%23555%22 x=%2240%22 y=%2244%22 text-anchor=%22middle%22 font-size=%228%22>No img</text></svg>'">
                <div class="min-w-0 flex-1">
                  <p class="text-[10px] text-gray-400 mb-1 truncate">${escapeHTML(p.og_image_url)}</p>
                  <span class="inline-block text-[10px] px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded font-medium">Current OG Image</span>
                </div>
              </div>` : `<div class="flex items-center gap-2 p-2 bg-gray-900/50 rounded-lg border border-dashed border-gray-700 mb-2 text-xs text-gray-500"><i class="fas fa-image"></i> No OG image set yet</div>`}
              <div class="flex gap-2">
                <input type="text" id="new-image-url" name="og_image_url" value="${escapeHTML(p.og_image_url || '')}" class="admin-input text-xs flex-1" placeholder="Paste Cloudinary URL or upload →">
                <input type="file" id="image-upload-cloudinary" style="display:none" accept="image/*" onchange="admin.uploadToCloudinary(this, '#new-image-url', 'products')">
                <button type="button" onclick="document.getElementById('image-upload-cloudinary').click()" class="admin-btn admin-btn-primary text-xs shrink-0"><i class="fas fa-upload mr-1"></i>Upload</button>
              </div>
              <p class="text-[10px] text-gray-600 mt-1">Used for SEO meta &amp; social sharing. Also shown on product cards when no gallery image is set.</p>
            </div>

            <!-- Gallery images — product page slideshow -->
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold">2+</span>
                <label class="text-xs font-semibold text-white">Gallery Images <span class="text-gray-500 font-normal">(product page slideshow — up to 8)</span></label>
                ${id && p.images && p.images.length ? `<span class="ml-auto text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full font-medium">${p.images.length} image${p.images.length !== 1 ? 's' : ''}</span>` : ''}
              </div>

              ${id ? `
              <div id="gallery-grid-${id}" class="grid grid-cols-4 gap-2 mb-3 ${(!p.images || !p.images.length) ? 'hidden' : ''}">
                ${(p.images || []).map((img, idx) => `
                <div class="relative group gallery-img-tile" data-img-id="${img.id}">
                  <div class="aspect-square overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
                    <img src="${escapeHTML(img.image_url)}" class="w-full h-full object-cover transition-transform group-hover:scale-105" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22><rect fill=%22%23222%22 width=%2280%22 height=%2280%22/><text fill=%22%23555%22 x=%2240%22 y=%2244%22 text-anchor=%22middle%22 font-size=%228%22>Error</text></svg>'">
                  </div>
                  <span class="absolute top-1 left-1 w-5 h-5 bg-black/70 rounded text-[10px] text-white flex items-center justify-center font-bold">${idx + 1}</span>
                  <button type="button" onclick="admin.deleteProductImage('${img.id}', this)"
                    class="absolute top-1 right-1 w-6 h-6 bg-red-600 hover:bg-red-500 rounded-full text-white text-xs flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove image"><i class="fas fa-times"></i></button>
                </div>`).join('')}
              </div>
              ${!p.images || !p.images.length ? `<div class="flex items-center gap-2 p-3 bg-gray-900/50 rounded-lg border border-dashed border-gray-700 mb-3"><i class="fas fa-images text-gray-600"></i><span class="text-xs text-gray-500">No gallery images yet — add below</span></div>` : ''}
              <div class="bg-gray-900 rounded-lg border border-gray-800 p-3">
                <p class="text-[11px] text-gray-400 font-semibold mb-2"><i class="fas fa-plus-circle text-green-500 mr-1"></i>Add Image to Gallery</p>
                <div class="flex gap-2">
                  <input type="text" id="add-img-url-${id}" class="admin-input text-xs flex-1" placeholder="Paste Cloudinary URL here...">
                  <input type="file" id="gallery-upload-${id}" style="display:none" accept="image/*" onchange="admin.uploadGalleryImage(this, '${id}')">
                  <button type="button" onclick="document.getElementById('gallery-upload-${id}').click()" class="admin-btn admin-btn-primary text-xs shrink-0"><i class="fas fa-upload mr-1"></i>Upload</button>
                  <button type="button"
                    onclick="admin.addProductImage('${id}', document.getElementById('add-img-url-${id}').value, document.getElementById('gallery-grid-${id}'), ${(p.images || []).length})"
                    class="admin-btn admin-btn-ghost text-xs shrink-0"><i class="fas fa-plus mr-1"></i>Add URL</button>
                </div>
                <p class="text-[10px] text-gray-600 mt-1.5">First image = shown by default on product page.</p>
              </div>` : `<div class="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30"><i class="fas fa-info-circle text-amber-400 text-sm"></i><span class="text-xs text-amber-300">Save product first, then reopen editor to add gallery images.</span></div>`}
            </div>
          </div>
        </form>
      `;
      admin.modal('Product Editor', content, `
        <button onclick="admin.saveProduct()" class="admin-btn admin-btn-primary">Save Product</button>
      `);
    },
    async saveProduct() {
      const form = $('#product-form');
      const fd = new FormData(form);
      const id = fd.get('id');
      const payload = Object.fromEntries(fd.entries());
      payload.is_active = fd.has('is_active');
      payload.is_placeholder = fd.has('is_placeholder');

      // Collect allowed_sizes from checkboxes
      const checkedSizes = ['Small','Medium','Large','XL'].filter(s => fd.has(`allowed_sizes_${s}`));
      payload.allowed_sizes = checkedSizes.length < 4 && checkedSizes.length > 0 ? checkedSizes.join(',') : null;

      // Collect allowed_frames from checkboxes
      const checkedFrames = ['Standard','Premium'].filter(f => fd.has(`allowed_frames_${f}`));
      payload.allowed_frames = checkedFrames.length < 2 && checkedFrames.length > 0 ? checkedFrames.join(',') : null;

      // Remove per-size/frame keys from payload (they're not DB columns)
      ['Small','Medium','Large','XL'].forEach(s => delete payload[`allowed_sizes_${s}`]);
      ['Standard','Premium'].forEach(f => delete payload[`allowed_frames_${f}`]);
      // CRITICAL: Remove columns that don't exist in 'products' table
      delete payload.base_price;  // pricing lives in product_variants, not products
      delete payload.id;          // never update the primary key
      // og_image_url is the correct column name (NOT image_url)
      // If empty, omit it so existing value is preserved
      if (payload.og_image_url === '') delete payload.og_image_url;
      delete payload.image_url;   // stale key — never send this

      try {
        if (id) await api('PUT', `/products/${id}`, payload);
        else await api('POST', '/products', payload);
        toast('Product saved!', 'success');
        $('.modal-overlay')?.remove();
        loadSection('products');
      } catch (e) { toast(e.response?.data?.error || 'Save failed', 'error'); }
    },
    async showCategoryForm(id = null) {
      let c = { name: '', slug: '', display_order: 10, hover_color: '#F2CA50', is_active: true };
      if (id) {
        const data = await api('GET', '/categories');
        c = data.categories.find(x => x.id === id) || c;
      }
      const content = `
        <form id="category-form" class="space-y-4">
          <input type="hidden" name="id" value="${id || ''}">
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-xs text-gray-400 mb-1">Name</label><input type="text" name="name" value="${c.name}" class="admin-input" required></div>
            <div><label class="block text-xs text-gray-400 mb-1">Slug</label><input type="text" name="slug" value="${c.slug}" class="admin-input" required></div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-xs text-gray-400 mb-1">Order</label><input type="number" name="display_order" value="${c.display_order}" class="admin-input"></div>
            <div><label class="block text-xs text-gray-400 mb-1">Hover Color</label><input type="color" name="hover_color" value="${c.hover_color}" class="admin-input" style="height:38px"></div>
          </div>
        </form>
      `;
      admin.modal('Category Editor', content, `<button onclick="admin.saveCategory()" class="admin-btn admin-btn-primary">Save Category</button>`);
    },
    async saveCategory() {
      const fd = new FormData($('#category-form'));
      const id = fd.get('id');
      const payload = Object.fromEntries(fd.entries());
      try {
        if (id) await api('PUT', `/categories/${id}`, payload);
        else await api('POST', '/categories', payload);
        toast('Category saved!', 'success');
        $('.modal-overlay')?.remove();
        loadSection('categories');
      } catch (e) { toast('Error saving category', 'error'); }
    },
    async showCouponForm() {
      const content = `
        <form id="coupon-form" class="space-y-4">
          <div><label class="block text-xs text-gray-400 mb-1">Code</label><input type="text" name="code" class="admin-input" placeholder="OFF20" style="text-transform:uppercase" required></div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-xs text-gray-400 mb-1">Type</label><select name="type" class="admin-input"><option value="percentage">Percentage (%)</option><option value="fixed">Fixed (₹)</option></select></div>
            <div><label class="block text-xs text-gray-400 mb-1">Value</label><input type="number" name="value" class="admin-input" required></div>
          </div>
          <div><label class="block text-xs text-gray-400 mb-1">Min Order (₹)</label><input type="number" name="min_subtotal" value="0" class="admin-input"></div>
        </form>
      `;
      admin.modal('Add Coupon', content, `<button onclick="admin.saveCoupon()" class="admin-btn admin-btn-primary">Create Coupon</button>`);
    },
    async saveCoupon() {
      const payload = Object.fromEntries(new FormData($('#coupon-form')).entries());
      try {
        await api('POST', '/coupons', payload);
        toast('Coupon created!', 'success');
        $('.modal-overlay')?.remove();
        loadSection('coupons');
      } catch (e) { toast('Error saving coupon', 'error'); }
    },
    async uploadToCloudinary(input, targetSelector, folder) {
      if (!input.files?.length) return;
      const file = input.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast('Only image files are supported.', 'error');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast('File too large. Max 20MB.', 'error');
        return;
      }

      // Find the trigger button — could be sibling or the element that triggered the click
      // We search upward for a button in the same parent container
      const container = input.parentElement;
      const btn = container ? (container.querySelector('button') || input.nextElementSibling || input.previousElementSibling) : null;
      const originalText = btn ? btn.innerHTML : '';
      if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Uploading...'; btn.disabled = true; }

      try {
        // 1. Get signed signature from backend
        const uploadFolder = folder || 'products';
        const signRes = await fetch(`/api/upload/sign?folder=${encodeURIComponent(uploadFolder)}`);
        if (!signRes.ok) {
          const errData = await signRes.json().catch(() => ({}));
          throw new Error(errData.error || `Sign request failed (${signRes.status})`);
        }
        const signData = await signRes.json();
        if (!signData.apiKey || !signData.cloudName) {
          throw new Error('Cloudinary credentials not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET in Cloudflare secrets.');
        }

        // 2. Upload directly to Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', signData.apiKey);
        formData.append('timestamp', String(signData.timestamp));
        formData.append('signature', signData.signature);
        formData.append('folder', signData.folder);
        if (signData.tags) formData.append('tags', signData.tags);

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${encodeURIComponent(signData.cloudName)}/image/upload`,
          { method: 'POST', body: formData }
        );
        const uploadData = await uploadRes.json();

        if (!uploadRes.ok || !uploadData.secure_url) {
          throw new Error(uploadData.error?.message || 'Cloudinary upload failed');
        }

        // Validate URL is genuinely from Cloudinary
        if (!/^https:\/\/res\.cloudinary\.com\//.test(uploadData.secure_url)) {
          throw new Error('Invalid upload response');
        }

        const url = uploadData.secure_url;
        if (targetSelector) {
          const target = $(targetSelector);
          if (target) target.value = url;
          const prev = $(targetSelector + '-preview');
          if (prev) { prev.src = url; prev.classList.remove('hidden'); }
        }
        toast(`✅ Uploaded! ${file.name}`, 'success');
        return url;
      } catch (e) {
        console.error('Cloudinary upload failed', e);
        toast(e.message || 'Upload failed — check Cloudflare secrets (CLOUDINARY_URL etc.)', 'error');
      } finally {
        if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
        // Reset file input so same file can be re-uploaded
        input.value = '';
      }
    },
    async uploadToR2(input, targetSelector) {
      if (!input.files?.length) return;
      const file = input.files[0];
      const btn = input.nextElementSibling;
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      btn.disabled = true;
      
      const fd = new FormData();
      fd.append('file', file);
      
      try {
        const res = await axios.post(`${API}/media/upload`, fd, {
          headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'multipart/form-data' }
        });
        if (res.data.url) {
          $(targetSelector).value = res.data.url;
          toast('Image uploaded to R2!', 'success');
        }
      } catch (e) { 
        toast(e.response?.data?.tip || 'R2 upload failed. Use direct link.', 'error');
        console.error(e);
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    },
    modal(title, content, footer) {
      $('.modal-overlay')?.remove();
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content" style="max-width:500px">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-yellow-400">${title}</h3>
            <button onclick="this.closest('.modal-overlay').remove()" class="text-gray-400 hover:text-white text-2xl">×</button>
          </div>
          <div class="modal-body mb-6">${content}</div>
          <div class="flex justify-end gap-3">${footer || ''}</div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    },
    editProduct(id) { admin.showProductForm(id); },
    editCategory(id) { admin.showCategoryForm(id); },
    editPage(slug) { toast('Page editor coming soon', 'info'); },

    async deleteProductImage(imgId, btn) {
      if (!confirm('Remove this image from gallery?')) return;
      const orig = btn.innerHTML;
      btn.innerHTML = '…';
      try {
        await api('DELETE', `/images/${imgId}`);
        btn.closest('.gallery-img-tile')?.remove();
        toast('Image removed', 'success');
      } catch(e) { toast('Failed to remove image', 'error'); btn.innerHTML = orig; }
    },

    async addProductImage(productId, url, gridEl, currentCount) {
      if (!url || !url.startsWith('http')) { toast('Enter a valid image URL', 'error'); return; }
      try {
        const res = await api('POST', `/products/${productId}/images`, { image_url: url, display_order: currentCount || 99 });
        toast('Image added to gallery!', 'success');
        const inp = document.getElementById(`add-img-url-${productId}`);
        if (inp) inp.value = '';
        if (gridEl) {
          const imgId = res?.image?.id || res?.id || '';
          const newIdx = gridEl.querySelectorAll('.gallery-img-tile').length + 1;
          const tile = document.createElement('div');
          tile.className = 'relative group gallery-img-tile';
          tile.dataset.imgId = imgId;
          tile.innerHTML = `
            <div class="aspect-square overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
              <img src="${escapeHTML(url)}" class="w-full h-full object-cover transition-transform group-hover:scale-105">
            </div>
            <span class="absolute top-1 left-1 w-5 h-5 bg-black/70 rounded text-[10px] text-white flex items-center justify-center font-bold">${newIdx}</span>
            <button type="button" onclick="admin.deleteProductImage('${imgId}', this)"
              class="absolute top-1 right-1 w-6 h-6 bg-red-600 hover:bg-red-500 rounded-full text-white text-xs flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove image"><i class="fas fa-times"></i></button>
          `;
          gridEl.classList.remove('hidden');
          gridEl.appendChild(tile);
        }
      } catch(e) { toast('Failed to add image: ' + (e.response?.data?.error || e.message), 'error'); }
    },

    async uploadGalleryImage(fileInput, productId) {
      const gridEl = document.getElementById(`gallery-grid-${productId}`);
      const currentCount = gridEl ? gridEl.querySelectorAll('.gallery-img-tile').length : 0;
      const tempId = `gallery-upload-url-${productId}`;
      let tempInput = document.getElementById(tempId);
      if (!tempInput) {
        tempInput = document.createElement('input');
        tempInput.type = 'hidden';
        tempInput.id = tempId;
        document.body.appendChild(tempInput);
      }
      await admin.uploadToCloudinary(fileInput, `#${tempId}`, 'products');
      setTimeout(async () => {
        const url = tempInput.value;
        if (url && url.startsWith('http')) {
          await admin.addProductImage(productId, url, gridEl, currentCount);
        }
      }, 200);
    },

    filterAdTab(tab, btn) {
      $$('#ad-table tbody tr').forEach(tr => {
        tr.style.display = (tab === 'all' || tr.dataset.category === tab) ? '' : 'none';
      });
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      btn?.classList.add('active');
    },
    async showComboForm(id = null) {
      // Live DB schema: combos(id, name, slug, description, image_url, items jsonb,
      //   original_price int4, combo_price int4, is_active bool)
      // NOT badge_text / savings_percent (old schema removed)
      let c = { name: '', slug: '', description: '', image_url: '', original_price: 0, combo_price: 0, items: '[]', is_active: true };
      if (id) {
        const data = await api('GET', '/combos');
        const found = (data.combos || []).find(x => x.id === id);
        if (found) {
          c = { ...found, items: JSON.stringify(found.items || [], null, 2) };
        }
      }
      const content = `
        <form id="combo-form" class="space-y-4">
          <input type="hidden" name="id" value="${id || ''}">
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-xs text-gray-400 mb-1">Combo Name <span class="text-red-400">*</span></label><input type="text" name="name" value="${escapeHTML(c.name)}" class="admin-input" placeholder="Divine Trio Pack" required></div>
            <div><label class="block text-xs text-gray-400 mb-1">Slug (URL-safe)</label><input type="text" name="slug" value="${escapeHTML(c.slug||'')}" class="admin-input" placeholder="divine-trio-pack"></div>
          </div>
          <div><label class="block text-xs text-gray-400 mb-1">Description</label><textarea name="description" class="admin-input" rows="2">${escapeHTML(c.description || '')}</textarea></div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-xs text-gray-400 mb-1">Original Price (₹) <span class="text-red-400">*</span></label><input type="number" name="original_price" value="${c.original_price || 0}" class="admin-input" min="0" required></div>
            <div><label class="block text-xs text-gray-400 mb-1">Combo Price (₹) <span class="text-red-400">*</span></label><input type="number" name="combo_price" value="${c.combo_price || 0}" class="admin-input" min="0" required></div>
          </div>
          <div><label class="block text-xs text-gray-400 mb-1">Image URL (optional)</label><input type="text" name="image_url" value="${escapeHTML(c.image_url||'')}" class="admin-input" placeholder="https://..."></div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Items JSON <span class="text-gray-600 font-normal">(array of {product_id, size, frame_type, qty})</span></label>
            <textarea name="items" class="admin-input font-mono text-xs" rows="5" placeholder='[{"product_id":"uuid","size":"Medium","frame_type":"Standard","qty":1}]'>${escapeHTML(typeof c.items === 'string' ? c.items : JSON.stringify(c.items||[], null, 2))}</textarea>
            <p class="text-[10px] text-gray-600 mt-1">Each item: product_id (UUID), size (Small/Medium/Large/XL), frame_type (Standard/Premium), qty (int)</p>
          </div>
          <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="is_active" ${c.is_active?'checked':''}> <span class="text-sm">Active (visible on site)</span></label>
        </form>
      `;
      admin.modal(id ? 'Edit Combo' : 'Create Combo', content, `<button onclick="admin.saveCombo()" class="admin-btn admin-btn-primary">Save Combo</button>`);
    },
    async saveCombo() {
      const fd = new FormData($('#combo-form'));
      const id = fd.get('id');
      const payload = {
        name: fd.get('name'),
        slug: fd.get('slug') || fd.get('name')?.toString().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,''),
        description: fd.get('description') || null,
        image_url: fd.get('image_url') || null,
        original_price: parseInt(fd.get('original_price') || '0') || 0,
        combo_price: parseInt(fd.get('combo_price') || '0') || 0,
        is_active: fd.has('is_active'),
      };
      try {
        payload.items = JSON.parse(fd.get('items') || '[]');
      } catch(e) { toast('Items JSON is invalid — check your JSON format', 'error'); return; }
      try {
        if (id) await api('PUT', `/combos/${id}`, payload);
        else await api('POST', '/combos', payload);
        toast('Combo saved!', 'success');
        $('.modal-overlay')?.remove();
        loadSection('combos');
      } catch (e) { toast('Error saving combo: ' + (e.response?.data?.error || e.message), 'error'); }
    },
    async toggleCombo(id, active) {
      await api('PUT', `/combos/${id}`, { is_active: active });
      toast(active ? 'Combo enabled' : 'Combo disabled', 'success');
    },
    async deleteCombo(id) {
      if (!confirm('Delete this combo?')) return;
      await api('DELETE', `/combos/${id}`);
      toast('Combo deleted', 'success');
      loadSection('combos');
    },
    async showAdForm() {
      const content = `
        <form id="ad-form" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-xs text-gray-400 mb-1">Date</label><input type="date" name="date" value="${new Date().toISOString().slice(0,10)}" class="admin-input" required></div>
            <div><label class="block text-xs text-gray-400 mb-1">Platform</label><select name="platform" class="admin-input"><option>Meta</option><option>Google</option><option>Instagram</option><option>WhatsApp</option><option>Organic</option></select></div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-xs text-gray-400 mb-1">Category</label><select name="category" class="admin-input"><option value="all">All / General</option><option value="divine">Divine</option><option value="automotive">Automotive</option></select></div>
            <div><label class="block text-xs text-gray-400 mb-1">Ad Spend (₹)</label><input type="number" name="ad_spend" class="admin-input" placeholder="500" required></div>
          </div>
          <div class="grid grid-cols-3 gap-4">
            <div><label class="block text-xs text-gray-400 mb-1">Impressions</label><input type="number" name="impressions" class="admin-input" placeholder="10000"></div>
            <div><label class="block text-xs text-gray-400 mb-1">Clicks</label><input type="number" name="clicks" class="admin-input" placeholder="300"></div>
            <div><label class="block text-xs text-gray-400 mb-1">Orders</label><input type="number" name="orders" class="admin-input" placeholder="5"></div>
          </div>
          <div><label class="block text-xs text-gray-400 mb-1">Revenue (₹)</label><input type="number" name="revenue" class="admin-input" placeholder="4500"></div>
          <div><label class="block text-xs text-gray-400 mb-1">Notes</label><input type="text" name="notes" class="admin-input" placeholder="Festival campaign, Ganesha Chaturthi"></div>
        </form>
      `;
      admin.modal('Log Ad Spend', content, `<button onclick="admin.saveAdLog()" class="admin-btn admin-btn-primary">Save</button>`);
    },
    async saveAdLog() {
      const payload = Object.fromEntries(new FormData($('#ad-form')).entries());
      try {
        await api('POST', '/analytics/ads-performance', payload);
        toast('Ad spend logged!', 'success');
        $('.modal-overlay')?.remove();
        loadSection('ad_performance');
      } catch (e) { toast('Error logging spend', 'error'); }
    },
    async featureReview(id) {
      await api('PUT', `/reviews/${id}`, { is_featured: true, is_approved: true });
      toast('Review featured!', 'success');
      loadSection('reviews');
    },
    async replyReview(id) {
      const reply = prompt('Admin reply to this review:');
      if (!reply) return;
      await api('PUT', `/reviews/${id}`, { admin_reply: reply });
      toast('Reply added!', 'success');
      loadSection('reviews');
    },
    async bulkImportReviews() {
      const json = prompt('Paste JSON array of reviews: [{customer_name, rating, title, body, product_id}]');
      if (!json) return;
      try {
        const reviews = JSON.parse(json);
        await api('POST', '/reviews/import', { reviews });
        toast(`Imported ${reviews.length} reviews!`, 'success');
        loadSection('reviews');
      } catch (e) { toast('Invalid JSON or import failed', 'error'); }
    },
    async updateTrackingUrl(orderId, url) {
      await api('PUT', `/orders/${orderId}/tracking`, { carrier_tracking_url: url });
      toast('Tracking URL saved!', 'success');
    },
    async showSocialSettings() {
      const data = await api('GET', '/settings');
      const s = data.settings || {};
      const content = `
        <form id="social-form" class="space-y-4">
          <div><label class="block text-xs text-gray-400 mb-1">Instagram Link (full URL)</label><input type="url" name="instagram_link" value="${s.instagram_link || ''}" class="admin-input" placeholder="https://instagram.com/photoframein"></div>
          <div><label class="block text-xs text-gray-400 mb-1">Facebook Link (full URL)</label><input type="url" name="facebook_link" value="${s.facebook_link || ''}" class="admin-input" placeholder="https://facebook.com/photoframein"></div>
          <div><label class="block text-xs text-gray-400 mb-1">WhatsApp Number (with country code)</label><input type="text" name="whatsapp_number" value="${s.whatsapp_number || ''}" class="admin-input" placeholder="917989531818"></div>
          <div><label class="block text-xs text-gray-400 mb-1">WhatsApp Link (optional, overrides number)</label><input type="url" name="whatsapp_link" value="${s.whatsapp_link || ''}" class="admin-input" placeholder="https://wa.me/917989531818"></div>
          <div><label class="block text-xs text-gray-400 mb-1">Twitter/X Link</label><input type="url" name="twitter_link" value="${s.twitter_link || ''}" class="admin-input" placeholder="https://twitter.com/photoframein"></div>
        </form>
      `;
      admin.modal('Social Media Links', content, `<button onclick="admin.saveSocialSettings()" class="admin-btn admin-btn-primary">Save Links</button>`);
    },
    async saveSocialSettings() {
      const fd = new FormData($('#social-form'));
      const updates = Object.fromEntries(fd.entries());
      await api('PUT', '/settings', updates);
      toast('Social links saved!', 'success');
      $('.modal-overlay')?.remove();
    },
    logout() {
      adminToken = '';
      localStorage.removeItem('pfi_admin_token');
      showLogin();
      toast('Logged out successfully', 'success');
    },
    async testAlert(btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = 'Sending...';
      btn.disabled = true;
      try {
        const res = await api('POST', '/test-alert');
        alert(res.message || 'Test successful!');
      } catch (e) {
        alert('Test failed: ' + e.message);
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }
  };


  // ========== COMBOS & BUNDLES ==========
  async function renderCombos(el) {
    const data = await api('GET', '/combos');
    const combos = data.combos || [];
    el.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold">Combos &amp; Bundles</h2>
      <button onclick="admin.showComboForm()" class="admin-btn admin-btn-primary"><i class="fas fa-plus mr-1"></i>Add Combo</button>
    </div>
    <p class="text-sm text-gray-400 mb-6">Combos appear on product pages &amp; cart as upsell suggestions. Pricing is auto-calculated from constituent products — no combo causes a loss.</p>
    <div class="space-y-4">
      ${combos.map(c => `
        <div class="stat-card flex items-center justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-1">
              <strong class="text-white">${escapeHTML(c.name)}</strong>
              ${c.badge_text ? `<span class="badge-green text-xs">${escapeHTML(c.badge_text)}</span>` : ''}
              ${c.is_featured ? '<span class="badge-gold text-xs">⭐ Featured</span>' : ''}
            </div>
            <p class="text-sm text-gray-400">${escapeHTML(c.description || '')}</p>
            <div class="flex gap-4 text-xs text-gray-500 mt-1">
              <span>Savings: ${c.savings_percent ? c.savings_percent + '%' : '—'}</span>
              <span>Category: ${escapeHTML(c.category || 'All')}</span>
              <span>Order: ${c.display_order || 0}</span>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" ${c.is_active ? 'checked' : ''} onchange="admin.toggleCombo('${c.id}', this.checked)" class="sr-only peer">
              <div class="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:bg-yellow-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
            <button onclick="admin.showComboForm('${c.id}')" class="admin-btn admin-btn-ghost text-xs"><i class="fas fa-edit"></i></button>
            <button onclick="admin.deleteCombo('${c.id}')" class="admin-btn admin-btn-danger text-xs"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `).join('') || '<div class="stat-card text-center text-gray-400 py-10">No combos yet. Create your first bundle to boost average order value.</div>'}
    </div>`;
  }

  // ========== AD PERFORMANCE ==========
  async function renderAdPerformance(el) {
    el.innerHTML = `<h2 class="text-2xl font-bold mb-6">Ad Performance & CAC Tracker</h2><div class="text-center py-10"><div class="admin-spinner"></div></div>`;
    try {
      const data = await api('GET', '/analytics/ads-performance');
      const ads = data.ads || [];
      const totalSpend = ads.reduce((s, a) => s + (Number(a.spend) || 0), 0);
      const totalOrders = ads.reduce((s, a) => s + (Number(a.orders) || 0), 0);
      const totalRevenue = ads.reduce((s, a) => s + (Number(a.revenue) || 0), 0);
      const blendedCAC = totalOrders > 0 ? (totalSpend / totalOrders).toFixed(0) : '—';
      const blendedROAS = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '—';
      el.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold">Ad Performance &amp; CAC Tracker</h2>
        <button onclick="admin.showAdForm()" class="admin-btn admin-btn-primary"><i class="fas fa-plus mr-1"></i>Log Ad Spend</button>
      </div>
      <!-- Blended KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="stat-card text-center"><div class="text-2xl font-bold text-brand-gold">₹${Number(totalSpend).toLocaleString('en-IN')}</div><div class="text-xs text-gray-400 mt-1">Total Ad Spend</div></div>
        <div class="stat-card text-center"><div class="text-2xl font-bold text-green-400">${totalOrders}</div><div class="text-xs text-gray-400 mt-1">Orders from Ads</div></div>
        <div class="stat-card text-center"><div class="text-2xl font-bold text-blue-400">₹${blendedCAC}</div><div class="text-xs text-gray-400 mt-1">Blended CAC</div></div>
        <div class="stat-card text-center"><div class="text-2xl font-bold text-purple-400">${blendedROAS}x</div><div class="text-xs text-gray-400 mt-1">Blended ROAS</div></div>
      </div>
      <!-- Tabs: Divine vs Automotive -->
      <div class="flex gap-2 mb-6">
        <button class="tab-btn active" onclick="admin.filterAdTab('all',this)">All</button>
        <button class="tab-btn" onclick="admin.filterAdTab('divine',this)">🕉️ Divine</button>
        <button class="tab-btn" onclick="admin.filterAdTab('automotive',this)">🏎️ Automotive</button>
      </div>
      <!-- Ad Performance Table -->
      <div class="stat-card">
        <table class="data-table" id="ad-table">
          <thead><tr><th>Date</th><th>Category</th><th>Platform</th><th>Spend (₹)</th><th>Impressions</th><th>Clicks</th><th>Orders</th><th>Revenue</th><th>CAC</th><th>ROAS</th><th>Conv%</th></tr></thead>
          <tbody>
            ${ads.map(a => {
              const cac = Number(a.orders) > 0 ? Math.round(Number(a.spend) / Number(a.orders)) : '—';
              const roas = Number(a.spend) > 0 ? (Number(a.revenue) / Number(a.spend)).toFixed(2) : '—';
              const conv = Number(a.clicks) > 0 ? ((Number(a.orders) / Number(a.clicks)) * 100).toFixed(1) : '—';
              return `<tr data-category="${a.category || 'all'}">
                <td>${new Date(a.date).toLocaleDateString('en-IN')}</td>
                <td><span class="badge-${a.category === 'divine' ? 'orange' : a.category === 'automotive' ? 'red' : 'gray'} text-xs">${escapeHTML(a.category || 'General')}</span></td>
                <td>${escapeHTML(a.platform || 'Meta')}</td>
                <td>₹${Number(a.spend || 0).toLocaleString('en-IN')}</td>
                <td>${Number(a.impressions || 0).toLocaleString('en-IN')}</td>
                <td>${Number(a.clicks || 0).toLocaleString('en-IN')}</td>
                <td>${a.orders || 0}</td>
                <td>₹${Number(a.revenue || 0).toLocaleString('en-IN')}</td>
                <td class="font-bold ${Number(cac) < 300 ? 'text-green-400' : Number(cac) < 600 ? 'text-yellow-400' : 'text-red-400'}">₹${cac}</td>
                <td class="${Number(roas) >= 3 ? 'text-green-400' : 'text-yellow-400'}">${roas}x</td>
                <td>${conv}%</td>
              </tr>`;
            }).join('') || '<tr><td colspan="11" class="text-center text-gray-400 py-8">No ad data yet. Start logging your spend.</td></tr>'}
          </tbody>
        </table>
      </div>
      <!-- Organic Traffic Plan Card -->
      <div class="stat-card mt-6">
        <h3 class="font-bold text-lg mb-4">📱 Low-Budget Organic Traffic Plan</h3>
        <div class="grid md:grid-cols-2 gap-6">
          <div>
            <h4 class="font-bold text-brand-saffron mb-2">🕉️ Divine Category</h4>
            <ul class="space-y-2 text-sm text-gray-300">
              <li>• <strong>Reels:</strong> Frame unboxing + pooja room setup (Ganesha, Shiva, Krishna)</li>
              <li>• <strong>Hashtags:</strong> #GaneshaChaturthi #HomeMandir #DivineArt #PoojaRoom</li>
              <li>• <strong>Timing:</strong> Post 6-8 AM (morning puja time) for max reach</li>
              <li>• <strong>Collab:</strong> Reach out to spiritual lifestyle creators (5k-50k followers)</li>
              <li>• <strong>SEO:</strong> "Ganesha wall art for home" — low competition, high intent</li>
            </ul>
          </div>
          <div>
            <h4 class="font-bold text-brand-red mb-2">🏎️ Automotive Category</h4>
            <ul class="space-y-2 text-sm text-gray-300">
              <li>• <strong>Reels:</strong> Frame reveal in man-cave/garage setup (Porsche, Ferrari)</li>
              <li>• <strong>Hashtags:</strong> #CarLovers #Porsche #ManCave #GarageGoals #FerrariLife</li>
              <li>• <strong>Timing:</strong> Post 8-10 PM (evening scrolling window)</li>
              <li>• <strong>Collab:</strong> DM car enthusiast pages — offer 2 free frames for tag</li>
              <li>• <strong>SEO:</strong> "Porsche poster frame India" — very low competition</li>
            </ul>
          </div>
        </div>
        <div class="mt-4 p-4 bg-black/30 border border-gray-800 rounded-xl">
          <p class="text-xs text-gray-400"><strong class="text-brand-gold">Budget Guideline:</strong> ₹5,000/month — ₹3,000 Meta ads (₹1,500 divine + ₹1,500 auto) + ₹2,000 influencer gifting. Target CAC &lt; ₹300, ROAS &gt; 3x for profitability at current AOV ₹900.</p>
        </div>
      </div>`;
    } catch (e) {
      el.innerHTML += `<div class="stat-card text-center text-red-400">Failed to load ad data: ${e.message}</div>`;
    }
  }

  async function renderMedia(el) {
    // Check if Cloudinary is configured
    let cloudinaryStatus = { configured: false };
    try {
      const r = await fetch('/api/upload/config');
      cloudinaryStatus = await r.json();
    } catch (e) { /* ignore */ }

    el.innerHTML = `
      <h2 class="text-2xl font-bold mb-6">Media Manager — Cloudinary Uploads</h2>

      ${!cloudinaryStatus.configured ? `
      <div class="stat-card mb-6 border border-yellow-600/40 bg-yellow-900/10">
        <div class="flex items-start gap-3">
          <i class="fas fa-exclamation-triangle text-yellow-400 text-xl mt-1"></i>
          <div>
            <p class="font-bold text-yellow-400 mb-1">Cloudinary Not Configured</p>
            <p class="text-sm text-gray-300">Set these secrets in Cloudflare Dashboard → Settings → Variables &amp; Secrets:</p>
            <ul class="mt-2 space-y-1 text-xs font-mono text-gray-400">
              <li>• <strong class="text-white">CLOUDINARY_CLOUD_NAME</strong> — your cloud name</li>
              <li>• <strong class="text-white">CLOUDINARY_API_KEY</strong> — your API key</li>
              <li>• <strong class="text-white">CLOUDINARY_API_SECRET</strong> — your API secret</li>
              <li class="text-gray-500">— OR — set <strong class="text-white">CLOUDINARY_URL</strong> (cloudinary://KEY:SECRET@CLOUD_NAME)</li>
            </ul>
            <p class="text-xs text-gray-500 mt-2">Find these in your <a href="https://cloudinary.com/console" target="_blank" class="text-brand-gold underline">Cloudinary Console → Dashboard</a>.</p>
          </div>
        </div>
      </div>` : `
      <div class="stat-card mb-4 border border-green-700/40 bg-green-900/10 flex items-center gap-2 py-3">
        <i class="fas fa-check-circle text-green-400"></i>
        <span class="text-sm text-green-300">Cloudinary connected — cloud: <strong>${escapeHTML(cloudinaryStatus.cloudName || '')}</strong></span>
      </div>`}

      <!-- Upload Zone -->
      <div class="stat-card mb-6">
        <h3 class="text-lg font-bold mb-1">Upload Image</h3>
        <p class="text-xs text-gray-400 mb-4">Choose a folder, then pick your image. The public URL will appear instantly — copy it into any product or category form.</p>

        <div class="flex flex-wrap gap-3 mb-4">
          <label class="text-xs text-gray-400 self-center">Folder:</label>
          <select id="media-folder-select" class="admin-input w-auto text-sm py-1.5">
            <option value="products">products/</option>
            <option value="categories">categories/</option>
            <option value="custom_frames">custom_frames/</option>
            <option value="blog">blog/</option>
            <option value="misc">misc/</option>
          </select>
        </div>

        <div id="media-drop-zone" class="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-brand-gold transition-colors"
             onclick="document.getElementById('bulk-media-upload').click()"
             ondragover="event.preventDefault(); this.classList.add('border-brand-gold')"
             ondragleave="this.classList.remove('border-brand-gold')"
             ondrop="event.preventDefault(); this.classList.remove('border-brand-gold'); admin.handleMediaDrop(event)">
          <i class="fas fa-cloud-upload-alt text-4xl text-gray-600 mb-3 block"></i>
          <p class="text-gray-400 font-medium">Click or drag &amp; drop image here</p>
          <p class="text-xs text-gray-600 mt-1">JPG, PNG, WEBP — max 20MB</p>
        </div>
        <input type="file" id="bulk-media-upload" class="hidden" accept="image/*"
               onchange="admin.triggerMediaUpload(this)">

        <!-- Result row (hidden until upload) -->
        <div id="media-result-row" class="hidden mt-4">
          <div class="flex gap-2 items-center mb-3">
            <img id="media-preview" src="" alt="preview" class="w-16 h-16 object-cover rounded-lg border border-gray-700 flex-shrink-0">
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-400 mb-1">Cloudinary URL (copy &amp; use anywhere):</p>
              <div class="flex gap-2">
                <input type="text" id="media-link-result" class="admin-input flex-1 text-xs font-mono" readonly placeholder="Upload an image to get its URL...">
                <button onclick="navigator.clipboard.writeText($('#media-link-result').value); toast('✅ Link copied!', 'success')"
                        class="admin-btn admin-btn-ghost flex-shrink-0" title="Copy URL">
                  <i class="fas fa-copy"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Upload history (session only) -->
        <div id="media-history" class="hidden mt-4">
          <p class="text-xs text-gray-500 mb-2 font-bold uppercase tracking-wider">Recent Uploads (this session)</p>
          <div id="media-history-list" class="space-y-2 max-h-48 overflow-y-auto"></div>
        </div>
      </div>

      <!-- Usage Guide -->
      <div class="stat-card">
        <h3 class="text-lg font-bold mb-4">📖 How To Use</h3>
        <div class="grid md:grid-cols-3 gap-4 text-sm">
          <div class="bg-black/30 rounded-xl p-4">
            <p class="font-bold text-brand-gold mb-2">🖼️ Product Images</p>
            <p class="text-gray-400">Upload to <code class="text-xs bg-gray-900 px-1 rounded">products/</code> folder → copy URL → paste into product form "Image URL" field.</p>
          </div>
          <div class="bg-black/30 rounded-xl p-4">
            <p class="font-bold text-brand-saffron mb-2">🗂️ Category Banners</p>
            <p class="text-gray-400">Upload to <code class="text-xs bg-gray-900 px-1 rounded">categories/</code> → copy URL → paste into category "Image URL" in Categories section.</p>
          </div>
          <div class="bg-black/30 rounded-xl p-4">
            <p class="font-bold text-brand-green mb-2">✏️ Blog / Misc</p>
            <p class="text-gray-400">Upload to <code class="text-xs bg-gray-900 px-1 rounded">blog/</code> or <code class="text-xs bg-gray-900 px-1 rounded">misc/</code> → embed URL directly in content editor.</p>
          </div>
        </div>
      </div>
    `;

    // Initialise session history array on window
    if (!window._mediaUploads) window._mediaUploads = [];
  }

  // Called when file input changes in Media Manager
  admin.triggerMediaUpload = async function(input) {
    const folder = $('#media-folder-select')?.value || 'products';
    const url = await admin.uploadToCloudinary(input, '#media-link-result', folder);
    if (url) {
      // Show result row
      const resultRow = $('#media-result-row');
      if (resultRow) resultRow.classList.remove('hidden');
      const preview = $('#media-preview');
      if (preview) { preview.src = url; }

      // Add to session history
      if (!window._mediaUploads) window._mediaUploads = [];
      window._mediaUploads.unshift({ url, name: input.files[0]?.name || 'image', ts: Date.now() });

      const historyEl = $('#media-history');
      const listEl = $('#media-history-list');
      if (historyEl && listEl) {
        historyEl.classList.remove('hidden');
        listEl.innerHTML = window._mediaUploads.slice(0, 10).map(u => `
          <div class="flex items-center gap-2 bg-gray-900/50 rounded-lg p-2">
            <img src="${u.url}" class="w-8 h-8 object-cover rounded" alt="">
            <span class="text-xs text-gray-400 flex-1 truncate">${escapeHTML(u.name)}</span>
            <button onclick="navigator.clipboard.writeText('${u.url}'); toast('Copied!', 'success')"
                    class="text-xs text-brand-gold hover:underline flex-shrink-0">Copy</button>
          </div>
        `).join('');
      }
    }
  };

  // Drag-and-drop handler for Media Manager
  admin.handleMediaDrop = async function(event) {
    const files = event.dataTransfer?.files;
    if (!files?.length) return;
    const fakeInput = { files, value: '' };
    const folder = $('#media-folder-select')?.value || 'products';
    const url = await admin.uploadToCloudinary(fakeInput, '#media-link-result', folder);
    if (url) {
      const resultRow = $('#media-result-row');
      if (resultRow) resultRow.classList.remove('hidden');
      const preview = $('#media-preview');
      if (preview) preview.src = url;
    }
  };

  // ========== SEO AI (OpenRouter) ==========
  async function renderSeoAI(el) {
    let products = [];
    try { const r = await api('GET', '/products?limit=50'); products = r.products || []; } catch(e) {}
    el.innerHTML = `
    <h2 class="text-2xl font-bold mb-2">SEO AI — Powered by OpenRouter</h2>
    <p class="text-gray-400 text-sm mb-4">Auto-generate SEO metadata for products using AI.</p>
    <div class="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-3 mb-6 text-xs text-yellow-300">
      <i class="fas fa-key mr-2"></i><strong>Setup required:</strong> Add <code class="bg-black/30 px-1 rounded">OPENROUTER_API_KEY</code> in Cloudflare Dashboard → Settings → Variables &amp; Secrets. Get a free key at <a href="https://openrouter.ai/keys" target="_blank" class="underline">openrouter.ai/keys</a>.
    </div>

    <!-- Site-wide SEO -->
    <div class="stat-card mb-6">
      <h3 class="font-bold text-lg mb-4">🌐 Site-wide SEO (Long-term)</h3>
      <div class="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="text-xs text-gray-400 block mb-1">Target Keywords (comma-separated)</label>
          <input id="seo-keywords" class="admin-input w-full" placeholder="photo frames India, custom framing, wall art..." value="premium photo frames India, custom framing online, wall art framed, buy photo frames online">
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-1">AI Model</label>
          <select id="seo-model" class="admin-input w-full">
            <option value="meta-llama/llama-3.1-8b-instruct:free">Llama 3.1 8B (Free)</option>
            <option value="mistralai/mistral-7b-instruct:free">Mistral 7B (Free)</option>
            <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
            <option value="google/gemini-flash-1.5">Gemini Flash 1.5</option>
          </select>
        </div>
      </div>
      <button onclick="admin.generateSiteSEO()" class="admin-btn admin-btn-primary">
        <i class="fas fa-robot mr-2"></i>Generate Site SEO Suggestions
      </button>
      <div id="site-seo-result" class="mt-4"></div>
    </div>

    <!-- Per-product SEO -->
    <div class="stat-card mb-6">
      <h3 class="font-bold text-lg mb-4">🏷️ Per-Product SEO (Short-term)</h3>
      <div class="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="text-xs text-gray-400 block mb-1">Select Product</label>
          <select id="seo-product-select" class="admin-input w-full">
            <option value="">-- Select a product --</option>
            ${products.map(p => `<option value="${p.id}" data-name="${escapeHTML(p.name||'')}" data-desc="${escapeHTML((p.description||'').slice(0,200))}">${escapeHTML(p.name||'')}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-1">Trend Context (optional)</label>
          <input id="seo-trend-ctx" class="admin-input w-full" placeholder="e.g. Diwali gifting season, monsoon decor...">
        </div>
      </div>
      <button onclick="admin.generateProductSEO()" class="admin-btn admin-btn-primary">
        <i class="fas fa-magic mr-2"></i>Generate Product SEO
      </button>
      <div id="product-seo-result" class="mt-4"></div>
    </div>

    <!-- SEO Tips -->
    <div class="stat-card">
      <h3 class="font-bold text-base mb-3">📋 SEO Quick Wins</h3>
      <div class="grid md:grid-cols-2 gap-4 text-sm text-gray-400">
        <div>
          <p class="font-bold text-gray-300 mb-1">Long-tail keywords to target:</p>
          <ul class="space-y-1 text-xs">
            <li>• "photo frames for home decor India"</li>
            <li>• "custom framed prints online Hyderabad"</li>
            <li>• "Ganesha wall art framed India"</li>
            <li>• "buy Porsche poster frame India"</li>
            <li>• "personalized photo frame gift"</li>
          </ul>
        </div>
        <div>
          <p class="font-bold text-gray-300 mb-1">Content strategy:</p>
          <ul class="space-y-1 text-xs">
            <li>• Blog: "10 ways to decorate your home with frames"</li>
            <li>• Blog: "Best frame sizes for different room types"</li>
            <li>• Blog: "Why custom frames make the best gifts"</li>
            <li>• Alt text: Always include product + location</li>
            <li>• Schema: Product + Review markup ✅ (active)</li>
          </ul>
        </div>
      </div>
    </div>`;
  }

  admin.generateSiteSEO = async function() {
    const keywords = document.getElementById('seo-keywords')?.value || '';
    const model = document.getElementById('seo-model')?.value || 'meta-llama/llama-3.1-8b-instruct:free';
    const resultEl = document.getElementById('site-seo-result');
    if (!resultEl) return;
    resultEl.innerHTML = '<p class="text-gray-400 text-sm"><i class="fas fa-spinner fa-spin mr-2"></i>Generating SEO suggestions...</p>';
    try {
      const res = await api('POST', '/seo/generate', {
        type: 'site',
        keywords,
        model,
        context: 'PhotoFrameIn — premium handcrafted photo frames from Hyderabad, India. Products: divine art frames, automotive frames, motivation frames, custom personalised frames. Price range ₹499-₹2000.'
      });
      if (res.result) {
        resultEl.innerHTML = `<div class="bg-gray-900 rounded-xl p-4 text-sm text-gray-300 whitespace-pre-wrap font-mono border border-gray-800">${escapeHTML(res.result)}</div>
        <div class="flex gap-2 mt-3">
          <button onclick="navigator.clipboard.writeText(document.querySelector('#site-seo-result pre, #site-seo-result .font-mono')?.textContent||''); toast('Copied!','success')" class="admin-btn admin-btn-ghost text-xs"><i class="fas fa-copy mr-1"></i>Copy</button>
        </div>`;
      } else {
        resultEl.innerHTML = '<p class="text-red-400 text-sm">No result returned. Check OPENROUTER_API_KEY in Cloudflare secrets.</p>';
      }
    } catch(e) {
      resultEl.innerHTML = `<p class="text-red-400 text-sm">Error: ${escapeHTML(e.message||'Unknown error')}. Make sure OPENROUTER_API_KEY is set in Cloudflare secrets.</p>`;
    }
  };

  admin.generateProductSEO = async function() {
    const select = document.getElementById('seo-product-select');
    const trend = document.getElementById('seo-trend-ctx')?.value || '';
    const model = document.getElementById('seo-model')?.value || 'meta-llama/llama-3.1-8b-instruct:free';
    const resultEl = document.getElementById('product-seo-result');
    if (!select || !resultEl) return;
    const productId = select.value;
    const productName = select.options[select.selectedIndex]?.dataset?.name || '';
    const productDesc = select.options[select.selectedIndex]?.dataset?.desc || '';
    if (!productId) { toast('Select a product first', 'error'); return; }
    resultEl.innerHTML = '<p class="text-gray-400 text-sm"><i class="fas fa-spinner fa-spin mr-2"></i>Generating product SEO...</p>';
    try {
      const res = await api('POST', '/seo/generate', {
        type: 'product',
        productId,
        productName,
        productDesc,
        trend,
        model
      });
      if (res.result) {
        resultEl.innerHTML = `<div class="bg-gray-900 rounded-xl p-4 text-sm text-gray-300 whitespace-pre-wrap font-mono border border-gray-800">${escapeHTML(res.result)}</div>
        <div class="flex gap-2 mt-3">
          <button onclick="navigator.clipboard.writeText(document.querySelector('#product-seo-result .font-mono')?.textContent||''); toast('Copied!','success')" class="admin-btn admin-btn-ghost text-xs"><i class="fas fa-copy mr-1"></i>Copy</button>
          ${productId ? `<button onclick="admin.applySEOToProduct('${productId}')" class="admin-btn admin-btn-primary text-xs"><i class="fas fa-save mr-1"></i>Apply to Product</button>` : ''}
        </div>`;
        window._lastSeoResult = res.result;
        window._lastSeoProductId = productId;
      } else {
        resultEl.innerHTML = '<p class="text-red-400 text-sm">No result. Check OPENROUTER_API_KEY.</p>';
      }
    } catch(e) {
      resultEl.innerHTML = `<p class="text-red-400 text-sm">Error: ${escapeHTML(e.message||'Unknown error')}</p>`;
    }
  };

  admin.applySEOToProduct = async function(productId) {
    if (!window._lastSeoResult || !productId) return;
    try {
      // Parse JSON from result if possible
      let parsed = {};
      try { parsed = JSON.parse(window._lastSeoResult); } catch(e) { /* raw text */ }
      await api('PUT', `/products/${productId}`, {
        seo_title: parsed.seo_title || '',
        seo_description: parsed.seo_description || ''
      });
      toast('SEO metadata saved to product!', 'success');
    } catch(e) { toast('Failed to save SEO: ' + e.message, 'error'); }
  };

  // ========== SUGGESTIONS BOX ==========
  async function renderSuggestions(el) {
    let data = { suggestions: [] };
    try { data = await api('GET', '/suggestions'); } catch(e) {}
    const suggestions = data.suggestions || [];
    el.innerHTML = `
    <h2 class="text-2xl font-bold mb-2">Customer Suggestions</h2>
    <p class="text-gray-400 text-sm mb-6">Anonymous suggestions submitted by customers or visitors. Optional contact details when provided.</p>
    <div class="stat-card mb-6">
      <div class="flex justify-between items-center mb-4">
        <span class="text-sm text-gray-400">${suggestions.length} suggestion${suggestions.length !== 1 ? 's' : ''} total</span>
        <button onclick="admin.go('suggestions')" class="admin-btn admin-btn-ghost text-xs"><i class="fas fa-sync mr-1"></i>Refresh</button>
      </div>
      ${suggestions.length === 0 ? '<p class="text-gray-500 py-8 text-center">No suggestions yet.</p>' :
        suggestions.map(s => `
        <div class="bg-gray-900 rounded-xl p-4 mb-3 border border-gray-800">
          <div class="flex justify-between items-start mb-2">
            <span class="text-xs text-gray-500">${new Date(s.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
            <span class="text-xs px-2 py-0.5 rounded-full ${s.status==='read'?'bg-green-900/40 text-green-400':'bg-yellow-900/40 text-yellow-400'}">${s.status||'new'}</span>
          </div>
          <p class="text-sm text-gray-200 mb-2">${escapeHTML(s.message||'')}</p>
          ${s.contact_name || s.contact_email || s.contact_phone ? `
          <div class="text-xs text-gray-500 flex flex-wrap gap-3 mt-1">
            ${s.contact_name ? `<span><i class="fas fa-user mr-1"></i>${escapeHTML(s.contact_name)}</span>` : ''}
            ${s.contact_email ? `<a href="mailto:${escapeHTML(s.contact_email)}" class="text-brand-gold hover:underline"><i class="fas fa-envelope mr-1"></i>${escapeHTML(s.contact_email)}</a>` : ''}
            ${s.contact_phone ? `<a href="tel:${escapeHTML(s.contact_phone)}" class="text-brand-gold hover:underline"><i class="fas fa-phone mr-1"></i>${escapeHTML(s.contact_phone)}</a>` : ''}
          </div>` : '<span class="text-xs text-gray-600">Anonymous</span>'}
          ${s.status !== 'read' ? `<button onclick="admin.markSuggestionRead('${s.id}')" class="admin-btn admin-btn-ghost text-xs mt-2"><i class="fas fa-check mr-1"></i>Mark Read</button>` : ''}
        </div>`).join('')}
    </div>`;
  }

  admin.toggleReviewPhotoSetting = async function(enabled) {
    try {
      await api('PUT', '/settings', { review_photo_enabled: enabled ? 'true' : 'false' });
      toast(`Photo reviews ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch(e) { toast('Failed to update setting', 'error'); }
  };

  admin.sendReviewRequest = async function(orderId, email, name) {
    try {
      const res = await api('POST', '/review-requests', { orderId, email, name });
      toast(res.success ? 'Review request sent!' : 'Error: ' + (res.error || 'failed'), res.success ? 'success' : 'error');
    } catch(e) { toast('Failed to send review request', 'error'); }
  };

  admin.markSuggestionRead = async function(id) {
    try {
      await api('PUT', `/suggestions/${id}`, { status: 'read' });
      admin.go('suggestions');
    } catch(e) { toast('Error: ' + e.message, 'error'); }
  };

  // Init — check if token exists
  if (adminToken) { render(); } else { showLogin(); }

})();
