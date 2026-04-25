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

  // ========== REVIEWS ==========
  async function renderReviews(el) {
    const data = await api('GET', '/reviews?status=pending');
    const approved = await api('GET', '/reviews?status=approved');
    el.innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Reviews</h2>
    <div class="flex gap-2 mb-6">
      <button class="tab-btn active" onclick="admin.showReviewTab('pending',this)">Pending (${data.reviews?.length || 0})</button>
      <button class="tab-btn" onclick="admin.showReviewTab('approved',this)">Approved (${approved.reviews?.length || 0})</button>
    </div>
    <div id="reviews-content">
      ${(data.reviews || []).map(r => `
        <div class="stat-card mb-4">
          <div class="flex justify-between items-start mb-2">
            <div>
              <strong>${escapeHTML(r.customer_name)}</strong> <span class="text-yellow-400">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
              <div class="text-xs text-gray-500">${escapeHTML(r.product?.name) || ''} · ${new Date(r.created_at).toLocaleDateString('en-IN')}</div>
            </div>
            <div class="flex gap-2">
              <button onclick="admin.approveReview('${r.id}')" class="admin-btn admin-btn-green text-xs">Approve</button>
              <button onclick="admin.hideReview('${r.id}')" class="admin-btn admin-btn-danger text-xs">Hide</button>
            </div>
          </div>
          ${r.title ? `<p class="font-bold text-sm">${escapeHTML(r.title)}</p>` : ''}
          <p class="text-sm text-gray-400">${escapeHTML(r.body) || ''}</p>
        </div>
      `).join('') || '<p class="text-gray-500">No pending reviews</p>'}
    </div>`;
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
      { key: 'instagram_link', label: 'Instagram Link', type: 'text' },
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
    async uploadToCloudinary(input, targetSelector) {
      if (!input.files?.length) return;
      const file = input.files[0];
      const btn = input.previousElementSibling || input.nextElementSibling;
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      btn.disabled = true;
      
      try {
        // 1. Get signed signature from backend
        const { data: signData } = await axios.get('/api/upload/sign', {
          params: { folder: 'products' }
        });
        
        // 2. Upload to Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', signData.apiKey);
        formData.append('timestamp', signData.timestamp);
        formData.append('signature', signData.signature);
        formData.append('folder', signData.folder);
        
        const res = await axios.post(
          `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
          formData
        );
        
        if (res.data.secure_url) {
          const url = res.data.secure_url;
          if (targetSelector) {
            $(targetSelector).value = url;
            // Also update preview if it exists
            const prev = $(targetSelector + '-preview');
            if (prev) prev.src = url;
          }
          toast('Cloudinary upload success!', 'success');
          return url;
        }
      } catch (e) {
        console.error('Cloudinary upload failed', e);
        toast('Upload failed. Check console.', 'error');
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
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

  async function renderMedia(el) {
    el.innerHTML = `
      <h2 class="text-2xl font-bold mb-6">Media Manager (Cloudinary)</h2>
      <div class="stat-card mb-6">
        <p class="text-sm text-gray-400 mb-4">Upload images here to get direct links for products, category banners, or blog posts.</p>
        <div class="flex gap-4 items-center">
          <input type="file" id="bulk-media-upload" class="hidden" onchange="admin.uploadToCloudinary(this, '#media-link-result')">
          <button onclick="$('#bulk-media-upload').click()" class="admin-btn admin-btn-primary">
            <i class="fas fa-upload mr-2"></i>Upload to Cloudinary
          </button>
          <input type="text" id="media-link-result" class="admin-input flex-1" readonly placeholder="Uploaded link will appear here...">
          <button onclick="navigator.clipboard.writeText($('#media-link-result').value); toast('Link copied!')" class="admin-btn admin-btn-ghost">
            <i class="fas fa-copy"></i>
          </button>
        </div>
        <p class="text-xs text-silver-dim mt-4"><i class="fas fa-info-circle mr-1"></i> High-resolution originals should be uploaded here first to get the URL for the product variants.</p>
      </div>

      <div class="stat-card">
        <h3 class="text-lg font-bold mb-4">Usage Guide</h3>
        <ul class="space-y-3 text-sm text-gray-400">
          <li><strong class="text-white">Products:</strong> Use the generated link in the "Images" section when adding/editing products.</li>
          <li><strong class="text-white">Banners:</strong> Use links for category or collection banners in the Categories section.</li>
          <li><strong class="text-white">Blog:</strong> Embed these links directly in your blog post content.</li>
        </ul>
      </div>
    `;
  }

  // Init — check if token exists
  if (adminToken) { render(); } else { showLogin(); }

})();
