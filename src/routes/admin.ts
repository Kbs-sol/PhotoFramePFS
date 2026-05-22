// PhotoFrameIn - Admin API Routes
import { Hono } from 'hono';
import { Bindings } from '..';
import { getSupabase, getConfig, setConfig, getConfigs } from '../lib/supabase';
import { sendEmail, sendOwnerAlert } from '../lib/email';
import { shippedEmail, reviewRequestEmail } from '../lib/email-templates';
import { createShiprocketOrder, generateAWB, schedulePickup } from '../lib/shipping';

const admin = new Hono<{ Bindings: Bindings }>();

// ─── In-memory brute-force rate limiter (resets on worker restart) ───────────
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 }); // 15-min window
    return true; // allowed
  }
  if (record.count >= 10) return false; // blocked
  record.count++;
  return true;
}

// ─── Timing-safe string comparison to prevent timing attacks ─────────────────
async function safeCompare(a: string, b: string): Promise<boolean> {
  if (!a || !b) return false;
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

// Login endpoint — must be BEFORE the auth middleware
admin.post('/auth', async (c) => {
  try {
    const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';

    // Rate limiting: max 10 attempts per IP per 15 minutes
    if (!checkRateLimit(clientIp)) {
      return c.json({ error: 'Too many login attempts. Try again in 15 minutes.' }, 429);
    }

    const body = await c.req.json();
    const { email, password } = body;
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return c.json({ error: 'Email and password required' }, 400);
    }
    // Sanitize inputs
    const cleanEmail = email.trim().toLowerCase().slice(0, 255);
    const cleanPassword = password.slice(0, 128);

    // CRITICAL FIX: Sandbox/localhost bypass is REMOVED for production safety.
    // The ADMIN_PASSWORD bypass now ONLY works for owner email on ANY host.
    // This prevents the .sandbox.novita.ai bypass from being exploited in prod.

    // 1. Check for SuperAdmin Static-Token Bypass (owner emails only)
    const isGlobalPassword = c.env.ADMIN_PASSWORD &&
      (await safeCompare(cleanPassword, c.env.ADMIN_PASSWORD));
    const isOwnerEmail = cleanEmail === (c.env.ALERT_EMAIL || '').toLowerCase() ||
                         cleanEmail === (c.env.OWNER_EMAIL || '').toLowerCase();

    if (isGlobalPassword && isOwnerEmail) {
      return c.json({ 
        success: true, 
        token: c.env.ADMIN_TOKEN, 
        user: { email: cleanEmail, role: 'superadmin' }
      });
    }

    // 2. Standard Auth Flow: Authenticate with Supabase Auth (Managerial Roles)
    const sb = getSupabase(c.env);
    const { data: authData, error: authError } = await sb.auth.signInWithPassword({ email, password });

    if (authError || !authData.user || !authData.session) {
      return c.json({ error: authError?.message || 'Authentication failed' }, 401);
    }

    // Upsert admin_users table (ensure user exists and is up to date)
    await sb.from('admin_users').upsert({
      email: authData.user.email,
      role: 'admin' // Default role for new sign-ins
    }, { onConflict: 'email' });

    // 3. Verify authorization in admin_users table
    const { data: adminUser, error: adminError } = await sb
      .from('admin_users')
      .select('role')
      .eq('email', authData.user.email)
      .single();

    if (adminError || !adminUser) {
      await sb.auth.signOut();
      return c.json({ success: false, error: 'Access denied. You are not an admin.' }, 403);
    }

    // 4. Return successful response with Supabase JWT
    return c.json({ 
      success: true, 
      token: authData.session.access_token,
      user: {
        email: authData.user.email,
        role: adminUser.role
      }
    });
    // End of modified block
  } catch (e: any) {
    return c.json({ success: false, error: e.message || 'Auth failed' }, 500);
  }
});


// Admin auth middleware — verifies Supabase session and admin role
admin.use('/*', async (c, next) => {
  // Skip auth check for the /auth endpoint itself
  if (c.req.path.endsWith('/auth') && c.req.method === 'POST') return next();

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing token' }, 401);
  }

  const token = authHeader.split(' ')[1];

  // 1. Check for Static SuperAdmin Token Bypass
  if (c.env.ADMIN_TOKEN && token === c.env.ADMIN_TOKEN) {
    (c as any).set('user', { email: 'superadmin@photoframein.com', role: 'superadmin' });
    return next();
  }

  // 2. Standard Supabase Session Verification
  const sb = getSupabase(c.env);
  const { data: { user }, error } = await sb.auth.getUser(token);

  if (error || !user) {
    return c.json({ error: 'Unauthorized: Invalid session' }, 401);
  }

  // 3. Verify role in database
  const { data: adminUser } = await sb
    .from('admin_users')
    .select('role')
    .eq('email', user.email)
    .single();

  if (!adminUser) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  (c as any).set('user', { ...user, role: adminUser.role });
  return next();
});

// ==========================================
// DASHBOARD
// ==========================================
admin.get('/dashboard', async (c) => {
  if (!c.env.SUPABASE_URL) {
    return c.json({
      revenue: { today: 0, month: 0 },
      orders: { today: 0, pending: 0, cod_pending: 0, packed: 0, unsynced: 0 },
      email: { brevo: { sent: 0, limit: 300 }, resend: { sent: 0, limit: 100 } },
      recentOrders: [],
      leads: 0,
      errors: 0,
      emailFailures: 0,
      _notice: 'Supabase not configured. Connect your database to see live data.'
    });
  }
  try {
  const sb = getSupabase(c.env);
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  // Revenue today
  const { data: todayOrders } = await sb.from('orders')
    .select('total, payment_method, status')
    .gte('created_at', `${today}T00:00:00Z`)
    .not('status', 'eq', 'cancelled');

  const todayRevenue = todayOrders?.reduce((sum: number, o: any) => sum + (o.total || 0), 0) || 0;
  const todayCount = todayOrders?.length || 0;

  // Revenue this month
  const { data: monthOrders } = await sb.from('orders')
    .select('total')
    .gte('created_at', `${thisMonth}-01T00:00:00Z`)
    .not('status', 'eq', 'cancelled');
  const monthRevenue = monthOrders?.reduce((sum: number, o: any) => sum + (o.total || 0), 0) || 0;

  // Pending orders
  const { count: pendingCount } = await sb.from('orders')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'printing']);

  const { count: codPendingCount } = await sb.from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'cod_pending');

  const { count: packedCount } = await sb.from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'packed');

  // Unsynced orders
  const { count: unsyncedCount } = await sb.from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('shiprocket_synced', false)
    .not('status', 'in', '(cancelled,cod_pending)');

  // Email counts today
  const { count: brevoCount } = await sb.from('email_log')
    .select('*', { count: 'exact', head: true })
    .eq('service', 'brevo')
    .gte('created_at', `${today}T00:00:00Z`);

  const { count: resendCount } = await sb.from('email_log')
    .select('*', { count: 'exact', head: true })
    .eq('service', 'resend')
    .gte('created_at', `${today}T00:00:00Z`);

  // Last 5 orders
  const { data: recentOrders } = await sb.from('orders')
    .select('order_id, customer_name, total, payment_method, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  // Leads count
  const { count: leadsCount } = await sb.from('leads')
    .select('*', { count: 'exact', head: true });

  // Error count (last 24h)
  const { count: errorCount } = await sb.from('error_log')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 86400000).toISOString());

  // Email failures
  const { count: emailFailures } = await sb.from('email_failures')
    .select('*', { count: 'exact', head: true })
    .eq('resolved', false);

  // Sales Funnel Today
  const { data: funnelData } = await sb.from('sales_funnel_events')
    .select('event_type, utm_source')
    .gte('created_at', `${today}T00:00:00Z`);

  // Aggregate Top Sources
  const sourcesMap: Record<string, number> = {};
  funnelData?.forEach((e: any) => {
    if (e.utm_source) {
      sourcesMap[e.utm_source] = (sourcesMap[e.utm_source] || 0) + 1;
    }
  });

  const sources = Object.entries(sourcesMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const funnel = {
    views: funnelData?.filter((e: any) => e.event_type === 'page_view').length || 0,
    cart: funnelData?.filter((e: any) => e.event_type === 'add_to_cart').length || 0,
    checkout: funnelData?.filter((e: any) => e.event_type === 'initiate_checkout').length || 0,
    purchase: funnelData?.filter((e: any) => e.event_type === 'purchase').length || 0
  };

  return c.json({
    revenue: { today: todayRevenue, month: monthRevenue },
    orders: {
      today: todayCount,
      pending: pendingCount || 0,
      cod_pending: codPendingCount || 0,
      packed: packedCount || 0,
      unsynced: unsyncedCount || 0
    },
    funnel,
    sources,
    email: {
      brevo: { sent: brevoCount || 0, limit: 300 },
      resend: { sent: resendCount || 0, limit: 100 }
    },
    recentOrders: recentOrders || [],
    leads: leadsCount || 0,
    errors: errorCount || 0,
    emailFailures: emailFailures || 0
  });
  } catch (e: any) {
    return c.json({
      revenue: { today: 0, month: 0 },
      orders: { today: 0, pending: 0, cod_pending: 0, packed: 0, unsynced: 0 },
      email: { brevo: { sent: 0, limit: 300 }, resend: { sent: 0, limit: 100 } },
      recentOrders: [],
      leads: 0,
      errors: 0,
      emailFailures: 0,
      _error: e.message
    });
  }
});

// ==========================================
// PRODUCTS CRUD
// ==========================================
admin.get('/products', async (c) => {
  const sb = getSupabase(c.env);
  const { data } = await sb.from('products')
      .select(`*, category:categories(name, slug), images, variants:product_variants(*)`)
    .order('created_at', { ascending: false });
  return c.json({ products: data || [] });
});

admin.post('/products', async (c) => {
  const body = await c.req.json();
  const sb = getSupabase(c.env);
  const { data, error } = await sb.from('products').insert(body).select().single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ product: data });
});

admin.put('/products/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const sb = getSupabase(c.env);
  body.updated_at = new Date().toISOString();
  // Sanitise allowed_sizes / allowed_frames — must be null or comma-string of known values
  const validSizes = ['Small', 'Medium', 'Large', 'XL'];
  const validFrames = ['Standard', 'Premium'];
  if ('allowed_sizes' in body) {
    if (body.allowed_sizes === null || body.allowed_sizes === 'null' || body.allowed_sizes === '') {
      body.allowed_sizes = null;
    } else {
      const parts = String(body.allowed_sizes).split(',').map((s: string) => s.trim()).filter((s: string) => validSizes.includes(s));
      body.allowed_sizes = parts.length ? parts.join(',') : null;
    }
  }
  if ('allowed_frames' in body) {
    if (body.allowed_frames === null || body.allowed_frames === 'null' || body.allowed_frames === '') {
      body.allowed_frames = null;
    } else {
      const parts = String(body.allowed_frames).split(',').map((s: string) => s.trim()).filter((s: string) => validFrames.includes(s));
      body.allowed_frames = parts.length ? parts.join(',') : null;
    }
  }
  const { data, error } = await sb.from('products').update(body).eq('id', id).select().single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ product: data });
});

admin.delete('/products/:id', async (c) => {
  const id = c.req.param('id');
  const sb = getSupabase(c.env);
  await sb.from('products').delete().eq('id', id);
  return c.json({ success: true });
});

// Product variants
admin.post('/products/:id/variants', async (c) => {
  const productId = c.req.param('id');
  const body = await c.req.json();
  const sb = getSupabase(c.env);
  const { data, error } = await sb.from('product_variants').insert({ ...body, product_id: productId }).select().single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ variant: data });
});

admin.put('/variants/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const sb = getSupabase(c.env);
  const { data, error } = await sb.from('product_variants').update(body).eq('id', id).select().single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ variant: data });
});

// Product images
// New endpoint: POST /products/:id/batch-images – uploads, optimizes, stores URLs, max 6 images
admin.post('/products/:id/batch-images', async (c) => {
  const sb = getSupabase(c.env);
  const productId = c.req.param('id');

  // Verify product exists
  const { data: product, error: prodError } = await sb.from('products').select('id').eq('id', productId).single();
  if (prodError || !product) return c.json({ error: 'Product not found' }, 404);

  // Parse multipart form data
  const formData = await c.req.formData();
  const files = formData.getAll('files') as File[];
  if (!files.length) return c.json({ error: 'No files uploaded' }, 400);

  // Enforce max 6 images per product (new batch replaces old ones)
  if (files.length > 6) return c.json({ error: 'Maximum 6 images allowed per product' }, 400);

  // Delete existing images for this product
  await sb.from('product_images').delete().eq('product_id', productId);

  // Configure Cloudinary
  const cloudinaryUrl = c.env.CLOUDINARY_URL;
  if (!cloudinaryUrl) return c.json({ error: 'Cloudinary not configured' }, 500);
  const match = cloudinaryUrl.match(/^cloudinary:\/\/(.+?):(.+?)@(.+)$/);
  if (!match) return c.json({ error: 'Invalid CLOUDINARY_URL format' }, 500);
  const [, apiKey, apiSecret, cloudName] = match;
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  const results: { filename: string; url: string }[] = [];

  for (const [index, file] of files.entries()) {
    // Optimize image using Sharp (convert to WebP, quality 80)
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const optimizedBuffer = await (await import('sharp')).default(inputBuffer)
      .rotate()
      .resize({ width: 2000, withoutEnlargement: true })
      .toFormat('webp', { quality: 80 })
      .toBuffer();

    // Upload to Cloudinary via stream
    const uploaded = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({ resource_type: 'image', folder: 'product_images' }, (error: any, result: any) => {
        if (error) reject(error);
        else resolve(result);
      });
      uploadStream.end(optimizedBuffer);
    });

    const url = uploaded.secure_url;
    results.push({ filename: file.name, url });

    // Insert record into product_images table
    await sb.from('product_images').insert({
      product_id: productId,
      image_url: url,
      alt_text: file.name,
      display_order: index + 1
    });
  }

  return c.json({ uploaded: results });
});


// ==========================================
// CATEGORIES CRUD
// ==========================================
admin.get('/categories', async (c) => {
  const sb = getSupabase(c.env);
  const { data } = await sb.from('categories')
    .select('*')
    .order('display_order', { ascending: true });
  return c.json({ categories: data || [] });
});

admin.post('/categories', async (c) => {
  const body = await c.req.json();
  const sb = getSupabase(c.env);
  const { data, error } = await sb.from('categories').insert(body).select().single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ category: data });
});

admin.put('/categories/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const sb = getSupabase(c.env);
  const { data, error } = await sb.from('categories').update(body).eq('id', id).select().single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ category: data });
});

admin.delete('/categories/:id', async (c) => {
  const id = c.req.param('id');
  const sb = getSupabase(c.env);
  await sb.from('categories').delete().eq('id', id);
  return c.json({ success: true });
});

// ==========================================
// ORDERS MANAGEMENT
// ==========================================
admin.get('/orders', async (c) => {
  const sb = getSupabase(c.env);
  const status = c.req.query('status');
  const payment = c.req.query('payment');
  const dateFrom = c.req.query('from');
  const dateTo = c.req.query('to');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  let query = sb.from('orders').select('*', { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (payment) query = query.eq('payment_method', payment);
  if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00Z`);
  if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59Z`);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return c.json({ orders: data || [], total: count || 0 });
});

admin.get('/orders/:orderId', async (c) => {
  const orderId = c.req.param('orderId');
  const sb = getSupabase(c.env);

  const { data: order } = await sb.from('orders').select('*').eq('order_id', orderId).single();
  if (!order) return c.json({ error: 'Not found' }, 404);

  // Get damage claims
  const { data: claims } = await sb.from('damage_claims').select('*').eq('order_id', orderId);

  // Get email log
  const { data: emails } = await sb.from('email_log').select('*').eq('order_id', orderId).order('created_at', { ascending: false });

  return c.json({ order, claims: claims || [], emails: emails || [] });
});

admin.put('/orders/:orderId/status', async (c) => {
  const orderId = c.req.param('orderId');
  const { status, notes } = await c.req.json();
  const sb = getSupabase(c.env);

  const update: any = { status, updated_at: new Date().toISOString() };
  if (notes) update.admin_notes = notes;
  if (status === 'cod_pending') update.cod_confirmed = false;

  const { data, error } = await sb.from('orders').update(update).eq('order_id', orderId).select().single();
  if (error) return c.json({ error: error.message }, 400);

  // If shipped, send email
  if (status === 'shipped' && data?.customer_email && data?.awb_number) {
    const trackUrl = `https://photoframein.com/track?order=${orderId}`;
    await sendEmail(c.env, {
      to: data.customer_email,
      subject: `Your Order Has Shipped! | ${orderId}`,
      html: shippedEmail(data, trackUrl),
      orderId,
      type: 'shipped'
    });
  }

  return c.json({ success: true, order: data });
});

// Confirm COD
admin.post('/orders/:orderId/confirm-cod', async (c) => {
  const orderId = c.req.param('orderId');
  const sb = getSupabase(c.env);

  const { data, error } = await sb.from('orders').update({
    status: 'pending',
    cod_confirmed: true,
    updated_at: new Date().toISOString()
  }).eq('order_id', orderId).eq('status', 'cod_pending').select().single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ success: true, order: data });
});

// ==========================================
// LOGISTICS
// ==========================================
// --- LOGISTICS CONSOLIDATED ---

// Create Shiprocket Order(s) manually
admin.post('/logistics/create-shiprocket-order', async (c) => {
  const { orderId } = await c.req.json();
  const sb = getSupabase(c.env);
  const { data: order } = await sb.from('orders').select('*').eq('order_id', orderId).single();
  if (!order) return c.json({ error: 'Order not found' }, 404);

  const { createShiprocketOrder } = await import('../lib/shipping');
  const result = await createShiprocketOrder(c.env, order);
  
  if (result.success && result.shiprocketOrderIds) {
    await sb.from('orders').update({
      shiprocket_synced: true,
      shiprocket_order_id: result.shiprocketOrderIds.join(','),
      updated_at: new Date().toISOString()
    }).eq('order_id', orderId);
  }

  return c.json(result);
});

// Generate AWB(s) for an order
admin.post('/logistics/generate-awb', async (c) => {
  const { orderId } = await c.req.json();
  const sb = getSupabase(c.env);
  const { data: order } = await sb.from('orders').select('shiprocket_order_id').eq('order_id', orderId).single();
  
  if (!order?.shiprocket_order_id) return c.json({ error: 'Shiprocket order not created yet' }, 400);

  const srIds = order.shiprocket_order_id.split(',');
  const awbs: string[] = [];
  const couriers: string[] = [];
  const { generateAWB } = await import('../lib/shipping');

  for (const srId of srIds) {
    const res = await generateAWB(c.env, srId.trim());
    if (res.success && res.awb) {
      awbs.push(res.awb);
      if (res.courier) couriers.push(res.courier);
    } else {
      return c.json({ success: false, error: `Failed for ${srId}: ${res.error}` }, 400);
    }
  }

  await sb.from('orders').update({
    awb_number: awbs.join(','),
    carrier: couriers.join(','),
    updated_at: new Date().toISOString()
  }).eq('order_id', orderId);

  return c.json({ success: true, awb: awbs.join(','), courier: couriers.join(',') });
});

// Schedule Pickup(s)
admin.post('/logistics/schedule-pickup', async (c) => {
  const { orderId } = await c.req.json();
  const sb = getSupabase(c.env);
  const { data: order } = await sb.from('orders').select('shiprocket_order_id').eq('order_id', orderId).single();
  
  if (!order?.shiprocket_order_id) return c.json({ error: 'Shiprocket order not created' }, 400);

  const srIds = order.shiprocket_order_id.split(',');
  const { schedulePickup } = await import('../lib/shipping');

  for (const srId of srIds) {
    const res = await schedulePickup(c.env, srId.trim());
    if (!res.success) return c.json({ success: false, error: `Failed for ${srId}: ${res.error}` }, 400);
  }

  await sb.from('orders').update({
    pickup_status: 'scheduled',
    status: 'pickup_scheduled',
    updated_at: new Date().toISOString()
  }).eq('order_id', orderId);

  return c.json({ success: true });
});

// Sync all pending orders to Shiprocket
admin.post('/logistics/sync-pending', async (c) => {
  const sb = getSupabase(c.env);
  const { data: orders } = await sb.from('orders')
    .select('*')
    .eq('shiprocket_synced', false)
    .not('status', 'in', '(cancelled,cod_pending)')
    .limit(20);

  const results: any[] = [];
  for (const order of orders || []) {
    const result = await createShiprocketOrder(c.env, order);
    if (result.success && result.shiprocketOrderIds) {
      await sb.from('orders').update({
        shiprocket_synced: true,
        shiprocket_order_id: result.shiprocketOrderIds.join(','),
        updated_at: new Date().toISOString()
      }).eq('order_id', order.order_id);
    }
    results.push({ orderId: order.order_id, ...result });
  }

  return c.json({ synced: results.filter(r => r.success).length, total: results.length, results });
});

// 🚀 NEW: Generate Shipping Label(s)
admin.post('/logistics/generate-label', async (c) => {
  const { orderId } = await c.req.json();
  const sb = getSupabase(c.env);
  const { data: order } = await sb.from('orders').select('*').eq('order_id', orderId).single();
  
  if (!order || !order.shiprocket_order_id) {
    return c.json({ success: false, error: 'Order not synced' }, 404);
  }

  const srIds = order.shiprocket_order_id.split(',');
  const { generateLabel } = await import('../lib/shipping');
  const labels: string[] = [];

  for (const srId of srIds) {
    const result = await generateLabel(c.env, srId.trim());
    if (result.success && result.labelUrl) {
      labels.push(result.labelUrl);
    }
  }

  if (labels.length > 0) {
    await sb.from('orders').update({
      shiprocket_label_url: labels.join(','),
      updated_at: new Date().toISOString()
    }).eq('order_id', orderId);
    return c.json({ success: true, labelUrls: labels });
  }

  return c.json({ success: false, error: 'Failed to generate labels' }, 400);
});

// ==========================================
// CUSTOMERS
// ==========================================
admin.get('/customers', async (c) => {
  const sb = getSupabase(c.env);
  const search = c.req.query('search');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  let query = sb.from('customers').select('*', { count: 'exact' });
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);

  const { data, count } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  return c.json({ customers: data || [], total: count || 0 });
});

admin.put('/customers/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const sb = getSupabase(c.env);
  const { data } = await sb.from('customers').update(body).eq('id', id).select().single();
  return c.json({ customer: data });
});

// ==========================================
// LEADS
// ==========================================
admin.get('/leads', async (c) => {
  const sb = getSupabase(c.env);
  const source = c.req.query('source');
  let query = sb.from('leads').select('*', { count: 'exact' });
  if (source) query = query.eq('source', source);
  const { data, count } = await query.order('created_at', { ascending: false });
  return c.json({ leads: data || [], total: count || 0 });
});

// ==========================================
// ANALYTICS
// ==========================================
admin.get('/analytics/products', async (c) => {
  if (!c.env.SUPABASE_URL) return c.json({ products: [] });
  const sb = getSupabase(c.env);
  const { data } = await sb.from('products')
    .select('id, name, slug, total_views, total_orders, total_revenue, average_rating, review_count')
    .order('total_revenue', { ascending: false });
  return c.json({ products: data || [] });
});

admin.get('/analytics/rto', async (c) => {
  if (!c.env.SUPABASE_URL) return c.json({ pincodes: [] });
  const sb = getSupabase(c.env);
  const { data } = await sb.from('pincode_risk')
    .select('*')
    .order('rto_count', { ascending: false })
    .limit(50);
  return c.json({ pincodes: data || [] });
});

admin.get('/analytics/ads', async (c) => {
  if (!c.env.SUPABASE_URL) return c.json({ sources: {}, traffic: {} });
  const sb = getSupabase(c.env);
  
  // 1. Order Attribution (Completed Revenue)
  const { data: orders } = await sb.from('orders')
    .select('utm_source, total')
    .not('utm_source', 'is', null);

  const sources: Record<string, { orders: number; revenue: number }> = {};
  for (const order of orders || []) {
    const key = order.utm_source || 'direct';
    if (!sources[key]) sources[key] = { orders: 0, revenue: 0 };
    sources[key].orders++;
    sources[key].revenue += order.total || 0;
  }

  // 2. Traffic Attribution (Recent Sessions - Last 30 Days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: funnel } = await sb.from('sales_funnel_events')
    .select('utm_source, event_type')
    .gte('created_at', thirtyDaysAgo)
    .not('utm_source', 'is', null);

  const traffic: Record<string, { sessions: number; cart_adds: number }> = {};
  for (const event of funnel || []) {
    const key = event.utm_source || 'direct';
    if (!traffic[key]) traffic[key] = { sessions: 0, cart_adds: 0 };
    
    if (event.event_type === 'view_product' || event.event_type === 'view_home') {
      traffic[key].sessions++;
    } else if (event.event_type === 'add_to_cart') {
      traffic[key].cart_adds++;
    }
  }

  return c.json({ sources, traffic });
});

// ==========================================
// COUPONS
// ==========================================
admin.get('/coupons', async (c) => {
  if (!c.env.SUPABASE_URL) return c.json({ coupons: [] });
  const sb = getSupabase(c.env);
  const { data } = await sb.from('coupons').select('*').order('created_at', { ascending: false });
  return c.json({ coupons: data || [] });
});

admin.post('/coupons', async (c) => {
  const body = await c.req.json();
  const sb = getSupabase(c.env);
  body.code = body.code?.toUpperCase();
  const { data, error } = await sb.from('coupons').insert(body).select().single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ coupon: data });
});

admin.put('/coupons/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const sb = getSupabase(c.env);
  const { data } = await sb.from('coupons').update(body).eq('id', id).select().single();
  return c.json({ coupon: data });
});

// ==========================================
// REVIEWS
// ==========================================
admin.get('/reviews', async (c) => {
  if (!c.env.SUPABASE_URL) return c.json({ reviews: [] });
  const sb = getSupabase(c.env);
  const status = c.req.query('status'); // pending, approved, hidden
  let query = sb.from('reviews').select('*, product:products(name, slug)');
  if (status === 'pending') query = query.eq('is_approved', false).eq('is_hidden', false);
  if (status === 'approved') query = query.eq('is_approved', true);
  if (status === 'hidden') query = query.eq('is_hidden', true);
  const { data } = await query.order('created_at', { ascending: false });
  return c.json({ reviews: data || [] });
});

admin.put('/reviews/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const sb = getSupabase(c.env);
  const { data } = await sb.from('reviews').update(body).eq('id', id).select().single();
  return c.json({ review: data });
});

// ==========================================
// CONTENT (Blog, Pages, FAQ)
// ==========================================
admin.get('/blog', async (c) => {
  if (!c.env.SUPABASE_URL) return c.json({ posts: [] });
  const sb = getSupabase(c.env);
  const { data } = await sb.from('blog_posts').select('*').order('created_at', { ascending: false });
  return c.json({ posts: data || [] });
});

admin.post('/blog', async (c) => {
  const body = await c.req.json();
  const sb = getSupabase(c.env);
  const { data, error } = await sb.from('blog_posts').insert(body).select().single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ post: data });
});

admin.put('/blog/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const sb = getSupabase(c.env);
  body.updated_at = new Date().toISOString();
  const { data } = await sb.from('blog_posts').update(body).eq('id', id).select().single();
  return c.json({ post: data });
});

admin.get('/pages', async (c) => {
  if (!c.env.SUPABASE_URL) return c.json({ pages: [] });
  const sb = getSupabase(c.env);
  const { data } = await sb.from('pages').select('*').order('slug');
  return c.json({ pages: data || [] });
});

admin.put('/pages/:slug', async (c) => {
  const slug = c.req.param('slug');
  const body = await c.req.json();
  const sb = getSupabase(c.env);

  // Save version history
  const { data: current } = await sb.from('pages').select('id, content, version').eq('slug', slug).single();
  if (current) {
    await sb.from('page_versions').insert({
      page_id: current.id, content: current.content, version: current.version
    });
    body.version = (current.version || 1) + 1;
  }

  body.updated_at = new Date().toISOString();
  const { data } = await sb.from('pages').update(body).eq('slug', slug).select().single();
  return c.json({ page: data });
});

admin.get('/faq', async (c) => {
  if (!c.env.SUPABASE_URL) return c.json({ faq: [] });
  const sb = getSupabase(c.env);
  const { data } = await sb.from('faq').select('*').order('display_order');
  return c.json({ faq: data || [] });
});

admin.post('/faq', async (c) => {
  const body = await c.req.json();
  const sb = getSupabase(c.env);
  const { data } = await sb.from('faq').insert(body).select().single();
  return c.json({ faq: data });
});

admin.put('/faq/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const sb = getSupabase(c.env);
  const { data } = await sb.from('faq').update(body).eq('id', id).select().single();
  return c.json({ faq: data });
});

admin.delete('/faq/:id', async (c) => {
  const id = c.req.param('id');
  const sb = getSupabase(c.env);
  await sb.from('faq').delete().eq('id', id);
  return c.json({ success: true });
});

// ==========================================
// SETTINGS
// ==========================================
admin.get('/settings', async (c) => {
  if (!c.env.SUPABASE_URL) return c.json({ settings: {} });
  const sb = getSupabase(c.env);
  const { data } = await sb.from('system_config').select('*').order('key');
  const config: Record<string, string> = {};
  data?.forEach((row: any) => { config[row.key] = row.value; });
  return c.json({ settings: config });
});

admin.put('/settings', async (c) => {
  const body = await c.req.json();
  const sb = getSupabase(c.env);

  for (const [key, value] of Object.entries(body)) {
    await sb.from('system_config').upsert({
      key, value: String(value), updated_at: new Date().toISOString()
    });
  }

  return c.json({ success: true });
});

// ==========================================
// DAMAGE CLAIMS
// ==========================================
admin.post('/claims/:id/approve', async (c) => {
  const claimId = c.req.param('id');
  const sb = getSupabase(c.env);

  const { data: claim } = await sb.from('damage_claims').select('*').eq('id', claimId).single();
  if (!claim) return c.json({ error: 'Claim not found' }, 404);

  const { data: originalOrder } = await sb.from('orders').select('*').eq('order_id', claim.order_id).single();
  if (!originalOrder) return c.json({ error: 'Original order not found' }, 404);

  // Create replacement order
  const { generateOrderId } = await import('../lib/supabase');
  const replacementId = await generateOrderId(c.env);

  await sb.from('orders').insert({
    order_id: replacementId,
    customer_id: originalOrder.customer_id,
    customer_name: originalOrder.customer_name,
    customer_phone: originalOrder.customer_phone,
    customer_email: originalOrder.customer_email,
    address: originalOrder.address,
    items: originalOrder.items,
    subtotal: 0, shipping_charge: 0, total: 0,
    payment_method: 'prepaid',
    is_replacement: true,
    linked_order_id: claim.order_id,
    status: 'pending',
    admin_notes: `Replacement for ${claim.order_id} (damage claim)`
  });

  // Update claim & original order
  await sb.from('damage_claims').update({
    status: 'approved',
    replacement_order_id: replacementId,
    updated_at: new Date().toISOString()
  }).eq('id', claimId);

  await sb.from('orders').update({
    status: 'damage_replaced',
    updated_at: new Date().toISOString()
  }).eq('order_id', claim.order_id);

  // Email customer
  await sendEmail(c.env, {
    to: originalOrder.customer_email,
    subject: `Replacement Being Prepared | ${replacementId}`,
    html: `<div style="font-family:Arial;max-width:600px;margin:0 auto;background:#0D0D0D;color:#E5E5E5;padding:24px;">
      <h2 style="color:#22C55E;">Your Replacement Is On Its Way!</h2>
      <p>We've approved your damage claim for order ${claim.order_id}.</p>
      <p>Replacement Order: <strong>${replacementId}</strong></p>
      <p>We'll prepare and ship your replacement as soon as possible.</p>
    </div>`,
    orderId: replacementId,
    type: 'replacement_approved'
  });

  return c.json({ success: true, replacementOrderId: replacementId });
});

admin.post('/claims/:id/decline', async (c) => {
  const claimId = c.req.param('id');
  const { reason } = await c.req.json();
  const sb = getSupabase(c.env);

  const { data: claim } = await sb.from('damage_claims').select('*').eq('id', claimId).single();
  if (!claim) return c.json({ error: 'Claim not found' }, 404);

  await sb.from('damage_claims').update({
    status: 'declined',
    admin_notes: reason || 'Claim declined',
    updated_at: new Date().toISOString()
  }).eq('id', claimId);

  // Get order for email
  const { data: order } = await sb.from('orders').select('customer_email').eq('order_id', claim.order_id).single();
  if (order) {
    await sendEmail(c.env, {
      to: order.customer_email,
      subject: `Damage Claim Update | ${claim.order_id}`,
      html: `<div style="font-family:Arial;max-width:600px;margin:0 auto;background:#0D0D0D;color:#E5E5E5;padding:24px;">
        <h2 style="color:#CC0000;">Claim Update</h2>
        <p>Your damage claim for order ${claim.order_id} could not be approved.</p>
        <p>Reason: ${reason || 'Does not meet replacement criteria'}</p>
        <p><a href="https://photoframein.com/policy#returns" style="color:#FFD700;">View our Returns Policy</a></p>
      </div>`,
      orderId: claim.order_id,
      type: 'claim_declined'
    });
  }

  return c.json({ success: true });
});

// ==========================================
// COMBOS
// ==========================================
admin.get('/combos', async (c) => {
  if (!c.env.SUPABASE_URL) return c.json({ combos: [] });
  const sb = getSupabase(c.env);
  const { data } = await sb.from('combos').select('*').order('created_at', { ascending: false });
  return c.json({ combos: data || [] });
});

admin.post('/combos', async (c) => {
  const body = await c.req.json();
  const sb = getSupabase(c.env);
  const { data, error } = await sb.from('combos').insert(body).select().single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ combo: data });
});

admin.put('/combos/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const sb = getSupabase(c.env);
  const { data } = await sb.from('combos').update(body).eq('id', id).select().single();
  return c.json({ combo: data });
});

// ==========================================
// MEDIA / R2
// ==========================================
admin.post('/media/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'] as File;

    if (!file) {
      return c.json({ error: 'No file uploaded' }, 400);
    }

    if (!c.env.MY_BUCKET) {
      // Local development fallback/message
      return c.json({ 
        error: 'R2 bucket not bound. Use wrangler pages dev --r2 MY_BUCKET',
        tip: 'For now, you can just paste direct image URLs in the forms.'
      }, 500);
    }

    const name = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const contentType = file.type || 'application/octet-stream';
    
    await c.env.MY_BUCKET.put(name, file, {
      httpMetadata: { contentType },
      customMetadata: { originalName: file.name }
    });

    // Construct public URL
    // Default format: https://pub-<bucket-id>.r2.dev/<key>
    // Since we don't know the exact domain, we'll return the key too.
    const baseUrl = c.env.R2_PUBLIC_URL || `https://${c.env.R2_BUCKET_NAME}.r2.cloudflarestorage.com`;
    const url = `${baseUrl}/${name}`;

    return c.json({ success: true, url, key: name });
  } catch (e: any) {
    return c.json({ error: 'Upload failed', details: e.message }, 500);
  }
});

// ==========================================
// ERROR LOG
// ==========================================
admin.get('/errors', async (c) => {
  if (!c.env.SUPABASE_URL) return c.json({ errors: [] });
  const sb = getSupabase(c.env);
  const { data } = await sb.from('error_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  return c.json({ errors: data || [] });
});

// ==========================================
// DATABASE BACKUP
// ==========================================
admin.post('/backup', async (c) => {
  const sb = getSupabase(c.env);

  // Export all tables as JSON
  const tables = ['orders', 'products', 'product_variants', 'product_images', 'categories',
    'customers', 'customer_addresses', 'leads', 'coupons', 'reviews', 'blog_posts',
    'pages', 'faq', 'combos', 'system_config', 'damage_claims', 'email_log'];

  const backup: Record<string, any> = { timestamp: new Date().toISOString() };
  for (const table of tables) {
    const { data } = await sb.from(table).select('*');
    backup[table] = data || [];
  }

  return c.json(backup);
});

// ==========================================
// USAGE MONITORING (Free Tier Tracking)
// ==========================================
admin.get('/usage', async (c) => {
  if (!c.env.SUPABASE_URL) return c.json({ error: 'DB not connected' }, 500);
  try {
    const sb = getSupabase(c.env);
    const { getConfigs } = await import('../lib/supabase');
    const { checkResourceUsageAndAlert } = await import('../lib/alerts');
    
    // Proactively check for alerts in the background
    c.executionCtx.waitUntil(checkResourceUsageAndAlert(c.env));

    const config = await getConfigs(c.env, [
      'worker_monthly_limit', 'supabase_row_limit', 
      'brevo_daily_limit', 'resend_daily_limit'
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const firstOfMonth = `${today.slice(0, 7)}-01T00:00:00Z`;

    // 1. Worker Requests (Proxy via Funnel Events)
    const { count: monthlyRequests } = await sb.from('sales_funnel_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', firstOfMonth);

    // 2. Supabase Storage (Estimated by row counts)
    const { count: productCount } = await sb.from('products').select('*', { count: 'exact', head: true });
    const { count: imageCount } = await sb.from('product_images').select('*', { count: 'exact', head: true });
    const { count: orderCount } = await sb.from('orders').select('*', { count: 'exact', head: true });
    
    // 3. Email Usage Today
    const { count: brevoToday } = await sb.from('email_log')
      .select('*', { count: 'exact', head: true })
      .eq('service', 'brevo')
      .gte('created_at', `${today}T00:00:00Z`);

    const { count: resendToday } = await sb.from('email_log')
      .select('*', { count: 'exact', head: true })
      .eq('service', 'resend')
      .gte('created_at', `${today}T00:00:00Z`);

    return c.json({
      cloudflare: {
        worker_requests_monthly: monthlyRequests || 0,
        worker_limit: parseInt(config.worker_monthly_limit || '3000000'),
        daily_requests_proxy: monthlyRequests ? Math.round(monthlyRequests / new Date().getDate()) : 0,
        daily_limit: Math.round(parseInt(config.worker_monthly_limit || '3000000') / 30)
      },
      supabase: {
        total_rows: (productCount || 0) + (imageCount || 0) + (orderCount || 0),
        row_limit: parseInt(config.supabase_row_limit || '50000'),
        db_size_estimated: 'Managed by Supabase'
      },
      email: {
        brevo: { sent: brevoToday || 0, limit: parseInt(config.brevo_daily_limit || '300'), reset: 'Daily' },
        resend: { sent: resendToday || 0, limit: parseInt(config.resend_daily_limit || '100'), reset: 'Daily' }
      },
      last_updated: new Date().toISOString()
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// POST /api/admin/test-alert
admin.post('/test-alert', async (c) => {
  try {
    const { checkResourceUsageAndAlert } = await import('../lib/alerts');
    const { sendOwnerAlert } = await import('../lib/email');
    
    // Send a test email immediately
    await sendOwnerAlert(c.env, 'Alert System Test', `
      <h2>🔔 Alert System Test Successful</h2>
      <p>This is a manual test of your PhotoFrameIn Resource Alert System.</p>
      <p>The system is currently configured to alert you at <strong>85%</strong> usage.</p>
      <p>Sent at: ${new Date().toLocaleString()}</p>
    `);
    
    return c.json({ success: true, message: 'Test alert sent to your email.' });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// --- End of Logistics ---

// routes continue below

// ==========================================
// COMBOS – FULL CRUD + TOGGLE
// ==========================================
admin.delete('/combos/:id', async (c) => {
  const id = c.req.param('id');
  const sb = getSupabase(c.env);
  await sb.from('combos').delete().eq('id', id);
  return c.json({ success: true });
});

admin.patch('/combos/:id/toggle', async (c) => {
  const id = c.req.param('id');
  const sb = getSupabase(c.env);
  const { data: cur } = await sb.from('combos').select('is_active').eq('id', id).single();
  const { data } = await sb.from('combos').update({ is_active: !cur?.is_active, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  return c.json({ combo: data });
});

// ==========================================
// REVIEWS – APPROVE / HIDE / FEATURE / REPLY
// ==========================================
admin.post('/reviews/:id/approve', async (c) => {
  const id = c.req.param('id');
  const sb = getSupabase(c.env);
  const { data } = await sb.from('reviews').update({ is_approved: true, is_hidden: false, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  // Update product average rating
  if (data?.product_id) {
    const { data: prodReviews } = await sb.from('reviews').select('rating').eq('product_id', data.product_id).eq('is_approved', true);
    if (prodReviews && prodReviews.length > 0) {
      const avg = prodReviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / prodReviews.length;
      await sb.from('products').update({ average_rating: avg.toFixed(1), review_count: prodReviews.length, updated_at: new Date().toISOString() }).eq('id', data.product_id);
    }
  }
  return c.json({ success: true, review: data });
});

admin.post('/reviews/:id/hide', async (c) => {
  const id = c.req.param('id');
  const sb = getSupabase(c.env);
  const { data } = await sb.from('reviews').update({ is_hidden: true, is_approved: false, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  return c.json({ success: true, review: data });
});

admin.post('/reviews/:id/feature', async (c) => {
  const id = c.req.param('id');
  const sb = getSupabase(c.env);
  const { data: cur } = await sb.from('reviews').select('is_featured').eq('id', id).single();
  const { data } = await sb.from('reviews').update({ is_featured: !cur?.is_featured, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  return c.json({ success: true, review: data });
});

admin.post('/reviews/:id/reply', async (c) => {
  const id = c.req.param('id');
  const { reply } = await c.req.json();
  const sb = getSupabase(c.env);
  const { data } = await sb.from('reviews').update({ admin_reply: reply || null, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  return c.json({ success: true, review: data });
});

// Bulk import reviews (from Google/Instagram)
admin.post('/reviews/import', async (c) => {
  const { reviews } = await c.req.json();
  if (!Array.isArray(reviews)) return c.json({ error: 'reviews array required' }, 400);
  const sb = getSupabase(c.env);
  const rows = reviews.map((r: any) => ({
    product_id: r.product_id,
    customer_name: r.name || r.customer_name || 'Anonymous',
    rating: Math.min(5, Math.max(1, parseInt(r.rating) || 5)),
    title: r.title || '',
    body: r.body || r.review || '',
    is_approved: true,
    verified_purchase: r.verified_purchase || false,
    source: r.source || 'imported',
    created_at: r.created_at || new Date().toISOString()
  }));
  const { data, error } = await sb.from('reviews').insert(rows).select();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ success: true, imported: data?.length || 0 });
});

// ==========================================
// AD PERFORMANCE TRACKING
// ==========================================
admin.get('/analytics/ads-performance', async (c) => {
  if (!c.env.SUPABASE_URL) return c.json({ records: [] });
  const sb = getSupabase(c.env);
  const days = parseInt(c.req.query('days') || '30');
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const { data } = await sb.from('ad_performance').select('*').gte('date', since).order('date', { ascending: false });
  
  // Compute totals
  const totals = (data || []).reduce((acc: any, row: any) => {
    acc.spend += row.ad_spend || 0;
    acc.orders += row.orders || 0;
    acc.revenue += row.revenue || 0;
    acc.clicks += row.clicks || 0;
    return acc;
  }, { spend: 0, orders: 0, revenue: 0, clicks: 0 });
  totals.cac = totals.orders > 0 ? Math.round(totals.spend / totals.orders) : 0;
  totals.roas = totals.spend > 0 ? (totals.revenue / totals.spend).toFixed(2) : '0';
  
  return c.json({ records: data || [], totals });
});

admin.post('/analytics/ads-performance', async (c) => {
  const body = await c.req.json();
  const sb = getSupabase(c.env);
  const { data, error } = await sb.from('ad_performance').upsert(body, { onConflict: 'date,platform,campaign' }).select().single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ record: data });
});

// ==========================================
// ORDER TRACKING URL REDIRECT
// ==========================================
admin.put('/orders/:orderId/tracking', async (c) => {
  const orderId = c.req.param('orderId');
  const { carrier, awb, carrier_tracking_url } = await c.req.json();
  const sb = getSupabase(c.env);
  const update: any = { updated_at: new Date().toISOString() };
  if (carrier) update.carrier = carrier;
  if (awb) update.awb_number = awb;
  if (carrier_tracking_url) update.carrier_tracking_url = carrier_tracking_url;
  const { data, error } = await sb.from('orders').update(update).eq('order_id', orderId).select().single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ success: true, order: data });
});

// ==========================================
// ADMIN USERS MANAGEMENT
// ==========================================
admin.get('/admin-users', async (c) => {
  if (!c.env.SUPABASE_URL) return c.json({ users: [] });
  const sb = getSupabase(c.env);
  const { data } = await sb.from('admin_users').select('*').order('created_at');
  return c.json({ users: data || [] });
});

admin.post('/admin-users', async (c) => {
  const { email, role } = await c.req.json();
  if (!email || !role) return c.json({ error: 'email and role required' }, 400);
  const sb = getSupabase(c.env);
  const { data, error } = await sb.from('admin_users').insert({ email: email.toLowerCase().trim(), role }).select().single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ user: data });
});

admin.delete('/admin-users/:id', async (c) => {
  const id = c.req.param('id');
  const sb = getSupabase(c.env);
  await sb.from('admin_users').delete().eq('id', id);
  return c.json({ success: true });
});

// ==========================================
// EMAIL FAILURES MANAGEMENT
// ==========================================
admin.get('/email-failures', async (c) => {
  if (!c.env.SUPABASE_URL) return c.json({ failures: [] });
  const sb = getSupabase(c.env);
  const { data } = await sb.from('email_failures').select('*').eq('resolved', false).order('created_at', { ascending: false }).limit(50);
  return c.json({ failures: data || [] });
});

admin.post('/email-failures/:id/resolve', async (c) => {
  const id = c.req.param('id');
  const sb = getSupabase(c.env);
  await sb.from('email_failures').update({ resolved: true }).eq('id', id);
  return c.json({ success: true });
});

// Retry failed email
admin.post('/email-failures/:id/retry', async (c) => {
  const id = c.req.param('id');
  const sb = getSupabase(c.env);
  const { data: failure } = await sb.from('email_failures').select('*').eq('id', id).single();
  if (!failure) return c.json({ error: 'Not found' }, 404);
  // Re-fetch order and send
  const { data: order } = await sb.from('orders').select('*').eq('order_id', failure.order_id).single();
  if (!order) return c.json({ error: 'Order not found' }, 404);
  const { sendEmail } = await import('../lib/email');
  const sent = await sendEmail(c.env, {
    to: order.customer_email,
    subject: failure.subject || `Order Update | ${failure.order_id}`,
    html: `<p>Order ${failure.order_id} update. Please contact support if you need help.</p>`,
    orderId: failure.order_id,
    type: 'retry'
  });
  if (sent) {
    await sb.from('email_failures').update({ resolved: true }).eq('id', id);
    return c.json({ success: true });
  }
  return c.json({ success: false, error: 'Retry failed again' }, 500);
});


// ─── SEO AI — OpenRouter Integration ────────────────────────────────────────
admin.post('/seo/generate', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const { type, keywords, context, productName, productDesc, trend, model } = body;

  const apiKey = c.env.OPENROUTER_API_KEY;
  if (!apiKey) return c.json({ error: 'OPENROUTER_API_KEY not configured in Cloudflare secrets' }, 503);

  const selectedModel = (model || 'meta-llama/llama-3.1-8b-instruct:free').slice(0, 100);

  let prompt = '';
  if (type === 'site') {
    prompt = `You are an SEO expert for an Indian e-commerce store selling premium photo frames.
Store: PhotoFrameIn (photoframein.com) — handcrafted frames from Hyderabad, India.
Target keywords: ${(keywords || '').slice(0, 300)}
${context ? `Context: ${context.slice(0, 500)}` : ''}

Generate:
1. SEO Title (max 60 chars) for the homepage
2. SEO Meta Description (max 155 chars) for the homepage
3. 5 long-tail keyword phrases to target in blog posts
4. 3 blog post title ideas with high purchase-intent keywords

Return as JSON: {"seo_title":"...","seo_description":"...","keywords":["..."],"blog_titles":["..."]}`;
  } else {
    prompt = `You are an SEO expert for an Indian photo frames e-commerce store.
Product: ${(productName || '').slice(0, 100)}
Description: ${(productDesc || '').slice(0, 300)}
${trend ? `Seasonal/trend context: ${trend.slice(0, 200)}` : ''}

Generate:
1. SEO Title (max 60 chars) — include product name + "frame" + India if possible
2. SEO Meta Description (max 155 chars) — include key benefits, CTA
3. 3 search keywords this product should rank for

Return as JSON: {"seo_title":"...","seo_description":"...","keywords":["..."]}`;
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://photoframein.com',
        'X-Title': 'PhotoFrameIn SEO AI'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7
      })
    });
    const data: any = await res.json();
    if (data.error) return c.json({ error: data.error.message || 'OpenRouter error' }, 502);
    const result = data.choices?.[0]?.message?.content || '';
    return c.json({ result });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to call OpenRouter' }, 502);
  }
});

// ─── Suggestions ──────────────────────────────────────────────────────────────
admin.get('/suggestions', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  const sb = getSupabase(c.env);
  const { data } = await sb.from('suggestions').select('*').order('created_at', { ascending: false }).limit(100);
  return c.json({ suggestions: data || [] });
});

admin.put('/suggestions/:id', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id').replace(/[^a-zA-Z0-9\-]/g, '').slice(0, 40);
  const body = await c.req.json();
  const sb = getSupabase(c.env);
  await sb.from('suggestions').update({ status: body.status || 'read' }).eq('id', id);
  return c.json({ success: true });
});

// ─── Review Requests (after delivery) ────────────────────────────────────────
admin.post('/review-requests', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  const { orderId, email, name } = await c.req.json();
  if (!orderId || !email) return c.json({ error: 'orderId and email required' }, 400);
  const sb = getSupabase(c.env);
  // Prevent duplicate requests
  const { data: existing } = await sb.from('review_requests')
    .select('id').eq('order_id', orderId).single();
  if (existing) return c.json({ success: true, note: 'already_sent' });
  await sb.from('review_requests').insert({
    order_id: orderId, customer_email: email, customer_name: name || null
  });
  // Send review request email
  try {
    const { data: order } = await sb.from('orders').select('*').eq('order_id', orderId).single();
    if (order) {
      const reviewUrl = `https://photoframein.com/review?order=${orderId}`;
      const html = reviewRequestEmail ? reviewRequestEmail({ ...order, reviewUrl }) : `<p>Hi ${name || 'there'},<br>How was your PhotoFrameIn order (${orderId})? Leave a review: <a href="${reviewUrl}">${reviewUrl}</a></p>`;
      await sendEmail(c.env, {
        to: email, subject: `How was your order? Leave a review | ${orderId}`,
        html, orderId, type: 'review_request'
      });
    }
  } catch (e) { /* non-fatal */ }
  return c.json({ success: true });
});

admin.get('/review-requests', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  const sb = getSupabase(c.env);
  const { data } = await sb.from('review_requests').select('*').order('sent_at', { ascending: false }).limit(100);
  return c.json({ requests: data || [] });
});

// ─── Order Detail (for review-request trigger) ────────────────────────────────
admin.get('/orders/:orderId/detail', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  const orderId = c.req.param('orderId');
  const sb = getSupabase(c.env);
  const { data: order } = await sb.from('orders').select('*').eq('order_id', orderId).single();
  if (!order) return c.json({ error: 'Not found' }, 404);
  return c.json({ order });
});

// ─── Public Review Submit (customer-facing) ───────────────────────────────────

export default admin;
