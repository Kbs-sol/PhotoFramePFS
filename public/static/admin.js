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
          <span class="icon">🖼️</span>
          <h1>PhotoFrameIn</h1>
          <p>Admin Panel</p>
        </div>
        <div id="login-error" class="login-error" ${errorMsg ? 'style="display:block"' : ''}>${errorMsg || ''}</div>
        <form id="login-form">
          <div class="login-input-group">
            <input type="email" id="login-email" class="login-input" placeholder="Admin Email" autocomplete="email" autofocus required>
            <i class="fas fa-envelope"></i>
          </div>
          <div class="login-input-group mt-4">
            <input type="password" id="login-password" class="login-input" placeholder="Password" autocomplete="current-password" required>
            <i class="fas fa-lock"></i>
          </div>
          <button type="submit" id="login-submit" class="login-btn mt-6"><i class="fas fa-sign-in-alt" style="margin-right:8px"></i>Sign In</button>
        </form>
        <p style="text-align:center;margin-top:20px;font-size:12px;color:#5A5A5A">Secure access · Protected by Supabase Auth</p>
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
    { id: 'settings', icon: 'fa-cog', label: 'Settings' }
  ];

  function render() {
    if (!adminToken) { showLogin(); return; }
    const app = $('#admin-app');
    app.innerHTML = `
    <div class="admin-sidebar" id="sidebar">
      <div class="sidebar-header">
        <h1>🖼️ PhotoFrameIn</h1>
        <p>Admin Panel</p>
      </div>
      <nav class="sidebar-nav">
        ${sections.map(s => `<div class="nav-item ${s.id === currentSection ? 'active' : ''}" onclick="admin.go('${s.id}')"><i class="fas ${s.icon}" style="width:18px;text-align:center"></i><span>${s.label}</span></div>`).join('')}
      </nav>
      <div class="sidebar-footer">
        <a href="/"><i class="fas fa-store"></i> Back to Store</a>
        <button onclick="admin.logout()"><i class="fas fa-sign-out-alt"></i> Logout</button>
      </div>
    </div>
    <div class="admin-main" id="main-content">
      <div class="admin-topbar">
        <button onclick="document.getElementById('sidebar').classList.toggle('open')" style="background:none;border:none;color:#8B8B8B;cursor:pointer"><i class="fas fa-bars text-xl"></i></button>
        <h2 style="font-weight:700;color:var(--admin-gold,#F2CA50)">Admin</h2>
        <button onclick="admin.logout()" style="background:none;border:none;color:#8B8B8B;cursor:pointer;font-size:12px"><i class="fas fa-sign-out-alt"></i></button>
      </div>
      <div id="section-content"></div>
    </div>`;
    loadSection(currentSection);
  }

  async function loadSection(id) {
    currentSection = id;
    $$('.nav-item').forEach(el => el.classList.toggle('active', el.textContent.trim() === sections.find(s => s.id === id)?.label));
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
      <button onclick="admin.bulkImportReviews()" class="admin-btn admin-btn-ghost text-xs"><i class="fas fa-file-import mr-1"></i>Bulk Import</button>
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

  // ========== SETTINGS ==========
  async function renderSettings(el) {
    const data = await api('GET', '/settings');
    const s = data.settings || {};
    const fields = [
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
      { key: 'contact_address', label: 'Contact Address', type: 'text' }
    ];

    el.innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Settings</h2>
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
            <input type="${f.type}" name="${f.key}" value="${s[f.key] || ''}" class="admin-input" style="width:300px">
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

  // ========== ADMIN ACTIONS ==========
  window.admin = {
    go(id) { currentSection = id; loadSection(id); document.getElementById('sidebar')?.classList.remove('open'); },
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
        <h4 class="font-bold mb-2">Items:</h4>
        ${(o.items || []).map(i => `
          <div class="bg-gray-900 rounded p-3 mb-2 text-sm flex gap-4 items-center">
            ${i.image_url ? `<img src="${i.image_url}" class="w-16 h-16 object-cover rounded border border-gray-700 cursor-pointer" onclick="window.open('${i.image_url}', '_blank')">` : '<div class="w-16 h-16 bg-gray-800 rounded flex items-center justify-center text-gray-600"><i class="fas fa-image"></i></div>'}
            <div class="flex-1">
              <strong class="text-white">${escapeHTML(i.name)}</strong><br>
              <span class="text-gray-400">${escapeHTML(i.size)} · ${escapeHTML(i.frame_type)} · Qty: ${i.quantity}</span><br>
              <span class="text-brand-gold font-bold">₹${(i.price * i.quantity).toLocaleString('en-IN')}</span>
            </div>
            ${i.image_url ? `<a href="${i.image_url}" target="_blank" class="admin-btn admin-btn-ghost text-[10px]"><i class="fas fa-download mr-1"></i>High-Res</a>` : ''}
          </div>
        `).join('')}
        ${o.awb_number ? `<div class="mt-4 bg-gray-900 rounded p-3"><strong>AWB:</strong> ${o.awb_number} · <strong>Carrier:</strong> ${o.carrier || '-'}</div>` : ''}
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
    async syncPending() {
      const result = await api('POST', '/logistics/sync-pending');
      toast(`Synced ${result.synced}/${result.total} orders`, 'success');
      loadSection(currentSection);
    },
    async createShiprocketOrder(orderId) {
      const result = await api('POST', '/logistics/create-shiprocket-order', { orderId });
      toast(result.success ? 'Shiprocket order created!' : `Error: ${result.error}`, result.success ? 'success' : 'error');
      loadSection('logistics');
    },
    async generateAWB(orderId) {
      const result = await api('POST', '/logistics/generate-awb', { orderId });
      toast(result.success ? `AWB: ${result.awb}` : `Error: ${result.error}`, result.success ? 'success' : 'error');
      loadSection('logistics');
    },
    async generateLabel(orderId) {
      const result = await api('POST', '/logistics/generate-label', { orderId });
      toast(result.success ? 'Labels generated!' : `Error: ${result.error}`, result.success ? 'success' : 'error');
      loadSection('logistics');
    },
    async schedulePickup(orderId) {
      const result = await api('POST', '/logistics/schedule-pickup', { orderId });
      toast(result.success ? 'Pickup scheduled!' : `Error: ${result.error}`, result.success ? 'success' : 'error');
      loadSection('logistics');
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
            <div><label class="block text-xs text-gray-400 mb-1">Base Price</label><input type="number" name="base_price" value="${p.base_price}" class="admin-input"></div>
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Status</label>
            <div class="flex gap-4">
              <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="is_active" ${p.is_active ? 'checked' : ''}> Active</label>
              <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="is_placeholder" ${p.is_placeholder ? 'checked' : ''}> Placeholder</label>
            </div>
          </div>
          <div class="border-t border-gray-800 pt-4">
            <label class="block text-xs text-gray-400 mb-2">Image URL (Cloudinary Preferred)</label>
            <div class="flex gap-2">
              <input type="text" id="new-image-url" name="image_url" value="${p.image_url || ''}" class="admin-input" placeholder="Paste URL or upload -->">
              <input type="file" id="image-upload-cloudinary" style="display:none" onchange="admin.uploadToCloudinary(this, '#new-image-url')">
              <button type="button" onclick="$('#image-upload-cloudinary').click()" class="admin-btn admin-btn-primary"><i class="fas fa-upload"></i></button>
            </div>
            <p class="text-[10px] text-gray-500 mt-1">Recommended: Use Cloudinary for automated sizing and optimization.</p>
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

    filterAdTab(tab, btn) {
      $$('#ad-table tbody tr').forEach(tr => {
        tr.style.display = (tab === 'all' || tr.dataset.category === tab) ? '' : 'none';
      });
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      btn?.classList.add('active');
    },
    async showComboForm(id = null) {
      let c = { name: '', description: '', badge_text: '', savings_percent: '', category: 'all', display_order: 10, is_featured: false };
      if (id) {
        const data = await api('GET', '/combos');
        c = (data.combos || []).find(x => x.id === id) || c;
      }
      const content = `
        <form id="combo-form" class="space-y-4">
          <input type="hidden" name="id" value="${id || ''}">
          <div><label class="block text-xs text-gray-400 mb-1">Combo Name</label><input type="text" name="name" value="${c.name}" class="admin-input" placeholder="Divine Trio Pack" required></div>
          <div><label class="block text-xs text-gray-400 mb-1">Description</label><textarea name="description" class="admin-input" rows="2">${c.description || ''}</textarea></div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-xs text-gray-400 mb-1">Badge Text</label><input type="text" name="badge_text" value="${c.badge_text || ''}" class="admin-input" placeholder="Best Value"></div>
            <div><label class="block text-xs text-gray-400 mb-1">Savings %</label><input type="number" name="savings_percent" value="${c.savings_percent || ''}" class="admin-input" placeholder="10"></div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-xs text-gray-400 mb-1">Category Filter</label><select name="category" class="admin-input"><option value="all" ${c.category==='all'?'selected':''}>All Categories</option><option value="divine" ${c.category==='divine'?'selected':''}>Divine</option><option value="automotive" ${c.category==='automotive'?'selected':''}>Automotive</option></select></div>
            <div><label class="block text-xs text-gray-400 mb-1">Display Order</label><input type="number" name="display_order" value="${c.display_order || 10}" class="admin-input"></div>
          </div>
          <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="is_featured" ${c.is_featured?'checked':''}> <span class="text-sm">Featured (shown prominently)</span></label>
        </form>
      `;
      admin.modal(id ? 'Edit Combo' : 'Create Combo', content, `<button onclick="admin.saveCombo()" class="admin-btn admin-btn-primary">Save Combo</button>`);
    },
    async saveCombo() {
      const fd = new FormData($('#combo-form'));
      const id = fd.get('id');
      const payload = Object.fromEntries(fd.entries());
      payload.is_featured = fd.has('is_featured');
      try {
        if (id) await api('PUT', `/combos/${id}`, payload);
        else await api('POST', '/combos', payload);
        toast('Combo saved!', 'success');
        $('.modal-overlay')?.remove();
        loadSection('combos');
      } catch (e) { toast('Error saving combo', 'error'); }
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
            <div><label class="block text-xs text-gray-400 mb-1">Spend (₹)</label><input type="number" name="spend" class="admin-input" placeholder="500" required></div>
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
        await api('POST', '/reviews/bulk-import', { reviews });
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
             onclick="$('#bulk-media-upload').click()"
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

  // Init — check if token exists
  if (adminToken) { render(); } else { showLogin(); }

})();
