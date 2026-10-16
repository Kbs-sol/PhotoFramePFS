// ChitraFrame - Main Hono Application
import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import checkoutRoutes from './routes/checkout';
import adminRoutes from './routes/admin';
import analyticsRoutes from './routes/analytics';
import uploadRoutes from './routes/upload';
import authRoutes from './routes/auth';
import marketingRoutes from './routes/marketing';
import { getSupabase, getConfigs } from './lib/supabase';

export type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  SHIPROCKET_EMAIL: string;
  SHIPROCKET_PASSWORD: string;
  BREVO_API_KEY: string;
  RESEND_API_KEY: string;
  OWNER_EMAIL: string;
  ALERT_EMAIL: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY: string;
  R2_SECRET_KEY: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_URL: string;
  MY_BUCKET: any;
  ADMIN_TOKEN: string;
  ADMIN_PASSWORD: string;
  GOOGLE_CLIENT_ID: string;
  WHATSAPP_NUMBER: string;
  GTM_CONTAINER_ID: string;
  GA4_MEASUREMENT_ID: string;
  MICROSOFT_CLARITY_ID: string;
  // Cloudinary — set all four OR just CLOUDINARY_URL
  CLOUDINARY_URL: string;          // cloudinary://API_KEY:API_SECRET@CLOUD_NAME
  CLOUDINARY_CLOUD_NAME: string;   // preferred individual key
  CLOUDINARY_API_KEY: string;      // preferred individual key
  CLOUDINARY_API_SECRET: string;   // preferred individual key
  OPENROUTER_API_KEY: string;      // OpenRouter AI for SEO generation
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/static/*', serveStatic());
// Cache-Control for immutable static assets (CSS/JS have content hashes or are versioned)
app.use('/static/*.js', async (c, next) => {
  await next();
  c.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
});
app.use('/static/*.css', async (c, next) => {
  await next();
  c.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
});
app.use('*', logger());
app.use('*', async (c, next) => {
  await next();
  c.header('X-Frame-Options', 'SAMEORIGIN');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Content-Security-Policy
  // 'unsafe-inline' is required on script-src because the entire SPA (app.js / admin.js) renders
  // HTML strings containing inline onclick="window.cf.nav(...)" handlers. Removing it silently
  // blocks every click on every product card, nav link, and button — making the site non-interactive.
  // The correct long-term fix is to migrate all onclick attrs to addEventListener in app.js,
  // but that requires a full SPA refactor. For now, 'unsafe-inline' stays.
  // Note: 'unsafe-inline' also remains on style-src (Tailwind CDN + inline style attributes).
  c.header('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://checkout.razorpay.com https://www.googletagmanager.com https://www.clarity.ms https://www.google-analytics.com https://cdn.shiprocket.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://api.cloudinary.com https://res.cloudinary.com https://www.google-analytics.com https://www.googletagmanager.com https://www.clarity.ms",
    "frame-src https://checkout.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'",
    "upgrade-insecure-requests"
  ].join('; '));
});
app.use('/api/*', cors({
  origin: (origin) => {
    const allowed = [
      'https://chitraframe.in',
      'https://www.chitraframe.in',
      'https://photoframein.com',
      'https://www.photoframein.com',
      'http://localhost:5173',
      'http://localhost:3000'
    ];
    // Allow Cloudflare Pages preview URLs
    if (origin && (allowed.includes(origin) || origin.endsWith('.pages.dev'))) {
      return origin;
    }
    return 'https://photoframein.com';
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  maxAge: 86400
}));

app.notFound((c) => {
  // Favicon: return a minimal SVG favicon inline
  if (c.req.path === '/favicon.ico' || c.req.path === '/favicon.svg') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#0F0E0C"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="serif" font-size="18" fill="#C9973A">CF</text></svg>`;
    return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' } });
  }
  return c.html(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>404 — Page Not Found | ChitraFrame</title><link href="/static/styles.css" rel="stylesheet"></head><body style="background:var(--off-white,#FAF9F7);color:var(--ink-800,#1C1A17);text-align:center;padding:100px 24px;font-family:'DM Sans',system-ui,sans-serif"><h1 style="font-family:'DM Serif Display',serif;font-size:clamp(60px,10vw,96px);color:var(--ink-900,#0F0E0C);line-height:1;margin-bottom:16px">404</h1><p style="font-size:18px;color:var(--ink-500,#6B6458);margin-bottom:32px">Page not found</p><a href="/" style="display:inline-block;padding:12px 28px;background:var(--ink-900,#0F0E0C);color:#fff;border-radius:6px;font-weight:600;text-decoration:none">Return Home</a></body></html>`, 404);
});

app.onError(async (err, c) => {
  console.error('[Global Error]', err);
  // Safe refId: only alphanumeric chars, no injection risk
  const refId = 'ERR-' + Math.random().toString(36).substr(2, 9).toUpperCase().replace(/[^A-Z0-9]/g, '');
  try {
    if (c.env && c.env.SUPABASE_URL) {
      const sb = getSupabase(c.env);
      await sb.from('error_log').insert({
        endpoint: c.req.path,
        method: c.req.method,
        error_message: err.message || String(err),
        ref_id: refId
      });
    }
  } catch (logErr) {
    console.error('Failed to log error to DB', logErr);
  }
  // refId is safe (alphanumeric only) but we escape it anyway for defence-in-depth
  const safeRef = refId.replace(/[^A-Z0-9\-]/g, '');
  return c.html(`<!DOCTYPE html><html><head><title>500 - System Error</title><link href="/static/styles.css" rel="stylesheet"></head><body style="background:#050505;color:#E5E5E5;text-align:center;padding-top:100px;font-family:Inter,sans-serif"><h1>500 System Error</h1><p>Something went wrong. Our team has been notified.</p><p style="font-size:12px;color:#666">Ref: ${safeRef}</p><a href="/" style="color:#C5A059;text-decoration:none;margin-top:20px;display:inline-block">← Return Home</a></body></html>`, 500);
});

// ==========================================
// API ROUTES
// ==========================================
app.route('/api/products', productRoutes);
app.route('/api/orders', orderRoutes);
app.route('/api/checkout', checkoutRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/analytics', analyticsRoutes);
app.route('/api/upload', uploadRoutes);
app.route('/api/auth', authRoutes);
app.route('/', marketingRoutes);

// ==========================================
// PUBLIC API ENDPOINTS
// ==========================================

// GET /api/categories
app.get('/api/categories', async (c) => {
  try {
    if (!c.env.SUPABASE_URL) return c.json({ categories: [], collections: [] });
    const sb = getSupabase(c.env);
    const { data } = await sb.from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    return c.json({
      categories: (data || []).filter((cat: any) => !cat.is_intent_collection),
      collections: (data || []).filter((cat: any) => cat.is_intent_collection)
    });
  } catch (e) {
    return c.json({ categories: [], collections: [] });
  }
});

// GET /api/combos
app.get('/api/combos', async (c) => {
  try {
    if (!c.env.SUPABASE_URL) return c.json({ combos: [] });
    const sb = getSupabase(c.env);
    const { data } = await sb.from('combos').select('*').eq('is_active', true);
    return c.json({ combos: data || [] });
  } catch (e) { return c.json({ combos: [] }); }
});

// GET /api/faq
app.get('/api/faq', async (c) => {
  try {
    if (!c.env.SUPABASE_URL) return c.json({ faq: [] });
    const sb = getSupabase(c.env);
    const { data } = await sb.from('faq').select('*').eq('is_active', true).order('display_order');
    return c.json({ faq: data || [] });
  } catch (e) { return c.json({ faq: [] }); }
});

// GET /api/pages/:slug
app.get('/api/pages/:slug', async (c) => {
  try {
    if (!c.env.SUPABASE_URL) return c.json({ error: 'Database not configured' }, 503);
    const slug = c.req.param('slug');
    const sb = getSupabase(c.env);
    const { data } = await sb.from('pages').select('*').eq('slug', slug).single();
    if (!data) return c.json({ error: 'Page not found' }, 404);
    return c.json({ page: data });
  } catch (e) { return c.json({ error: 'Page not found' }, 404); }
});

// GET /api/reviews — all approved reviews (general fallback)
app.get('/api/reviews', async (c) => {
  try {
    if (!c.env.SUPABASE_URL) return c.json({ reviews: [] });
    const sb = getSupabase(c.env);
    const { data } = await sb.from('reviews')
      .select('*')
      .eq('is_approved', true)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(20);
    return c.json({ reviews: data || [] });
  } catch (e) { return c.json({ reviews: [] }); }
});

// GET /api/reviews/:productId
app.get('/api/reviews/:productId', async (c) => {
  try {
    if (!c.env.SUPABASE_URL) return c.json({ reviews: [] });
    const productId = c.req.param('productId');
    const sb = getSupabase(c.env);
    const { data } = await sb.from('reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('is_approved', true)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false });
    return c.json({ reviews: data || [] });
  } catch (e) { return c.json({ reviews: [] }); }
});

// POST /api/reviews — submit review (with input validation)
app.post('/api/reviews', async (c) => {
  try {
    if (!c.env.SUPABASE_URL) return c.json({ error: 'Service unavailable' }, 503);
    const body = await c.req.json();

    // SECURITY: Validate and sanitize all inputs
    const rating = Number(body.rating);
    if (!body.productId || !body.name || !rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return c.json({ error: 'Invalid review data' }, 400);
    }
    const sanitize = (str: string, maxLen: number) => String(str || '').replace(/[<>"'`]/g, '').trim().slice(0, maxLen);
    const cleanName = sanitize(body.name, 100);
    const cleanTitle = sanitize(body.title || '', 200);
    const cleanBody = sanitize(body.body || '', 2000);
    if (!cleanName) return c.json({ error: 'Name required' }, 400);

    const sb = getSupabase(c.env);
    // Rate limit: max 3 reviews per product per email per day
    const { count } = await sb.from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', body.productId)
      .eq('customer_name', cleanName)
      .gte('created_at', new Date(Date.now() - 86400000).toISOString());
    if ((count || 0) >= 3) return c.json({ error: 'Review limit reached' }, 429);

    // Check review_photo_enabled config
    let reviewPhotoEnabled = true;
    try {
      const photoSetting = await getConfig(c.env, 'review_photo_enabled');
      reviewPhotoEnabled = photoSetting !== 'false';
    } catch (e) {}

    // Validate photo URL if provided and photos are enabled
    let photoUrl: string | null = null;
    if (reviewPhotoEnabled && body.photoUrl && typeof body.photoUrl === 'string') {
      if (/^https?:\/\/res\.cloudinary\.com\//.test(body.photoUrl)) {
        photoUrl = body.photoUrl.slice(0, 500);
      }
    }

    // Validate order_id if provided (verified purchase)
    const orderId = body.orderId ? String(body.orderId).replace(/[^a-zA-Z0-9\-]/g, '').slice(0, 30) : null;
    let verifiedPurchase = false;
    if (orderId) {
      const { data: orderCheck } = await sb.from('orders')
        .select('order_id').eq('order_id', orderId).eq('status', 'delivered').single();
      verifiedPurchase = !!orderCheck;
    }

    const { data, error } = await sb.from('reviews').insert({
      product_id: body.productId,
      customer_id: body.customerId || null,
      customer_name: cleanName,
      rating: rating,
      title: cleanTitle,
      body: cleanBody,
      photo_url: photoUrl,
      order_id: orderId,
      verified_purchase: verifiedPurchase,
      image_urls: (Array.isArray(body.imageUrls) ? body.imageUrls.filter((u: any) => typeof u === 'string' && /^https?:\/\//.test(u)) : []).slice(0, 5),
      is_approved: false // Reviews require admin approval before display
    }).select().single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true, review: data, message: 'Review submitted for approval' });
  } catch (e: any) { return c.json({ error: e.message || 'Server error' }, 500); }
});

// POST /api/suggestions — public suggestion form
app.post('/api/suggestions', async (c) => {
  try {
    if (!c.env.SUPABASE_URL) return c.json({ success: true });
    const body = await c.req.json();
    const msg = String(body.message || '').slice(0, 1000).trim();
    if (!msg) return c.json({ error: 'Message required' }, 400);
    const sb = getSupabase(c.env);
    await sb.from('suggestions').insert({
      message: msg,
      contact_name: String(body.contact_name || '').slice(0, 100) || null,
      contact_email: String(body.contact_email || '').slice(0, 200) || null,
      contact_phone: String(body.contact_phone || '').replace(/[^\d+\-\s]/g, '').slice(0, 20) || null,
      status: 'new'
    });
    return c.json({ success: true });
  } catch (e) { return c.json({ success: true }); }
});

// POST /api/leads — capture leads
app.post('/api/leads', async (c) => {
  try {
    if (!c.env.SUPABASE_URL) return c.json({ success: true }); // Silently accept
    const body = await c.req.json();
    const sb = getSupabase(c.env);
    const { data, error } = await sb.from('leads').insert({
      email: body.email,
      phone: body.phone,
      name: body.name,
      source: body.source || 'newsletter'
    }).select().single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true });
  } catch (e) { return c.json({ success: true }); }
});

// POST /api/custom-orders — log custom frame wizard intake orders
app.post('/api/custom-orders', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    // Validate required fields
    const name = String(body.buyer_fullname || '').trim().slice(0, 100);
    const phone = String(body.buyer_whatsapp_phone || '').replace(/\D/g, '').slice(0, 15);
    if (!name || name.length < 2) return c.json({ error: 'Invalid name' }, 400);
    if (!phone || phone.length < 10) return c.json({ error: 'Invalid phone' }, 400);

    // If no Supabase, silently accept (fire-and-forget from client)
    if (!c.env?.SUPABASE_URL) return c.json({ success: true, queued: true });

    const sb = getSupabase(c.env);

    // Try to insert into custom_framing_orders_intake (created in 0002 migration)
    const { error } = await sb.from('custom_framing_orders_intake').insert({
      buyer_fullname: name,
      buyer_whatsapp_phone: phone,
      uploaded_image_storage_path: String(body.uploaded_image_storage_path || 'no-upload').slice(0, 500),
      selected_dimension_profile: String(body.selected_dimension_profile || 'Medium').slice(0, 50),
      selected_framing_style: String(body.selected_framing_style || 'Direct').slice(0, 50),
      include_poster_print_copy: Boolean(body.include_poster_print_copy),
      user_special_instructions: String(body.user_special_instructions || '').slice(0, 1000),
      computed_subtotal_amount: Number(body.computed_subtotal_amount) || 0,
      intake_status: 'pending_image',
      intake_created_at: new Date().toISOString()
    });

    if (error) {
      // Table may not exist yet in older deploys — silently accept
      console.warn('[custom-orders] Insert warning:', error.message);
      return c.json({ success: true, note: 'logged_with_warning' });
    }

    return c.json({ success: true });
  } catch (e: any) {
    console.error('[custom-orders] Error:', e);
    // Always return 200 — client uses this as fire-and-forget
    return c.json({ success: true });
  }
});

// GET /api/config/public — public-facing config
app.get('/api/config/public', async (c) => {
  try {
    if (!c.env.SUPABASE_URL) {
      return c.json({ config: {
        announcement_active: 'true',
        announcement_text: 'Free Delivery on orders above ₹899 | COD Available',
        announcement_link: '/shop',
        announcement_bg: '#CC0000',
        cod_enabled: 'true', cod_min_value: '499', cod_max_value: '1995', cod_fee: '49',
        free_shipping_threshold: '899', prepaid_discount: '50',
        urgency_text: 'Limited Stock Available', urgency_subtext: 'Offer Ends Tonight',
        combos_enabled: 'true', exit_intent_enabled: 'true',
        seo_title: 'ChitraFrame | Premium Framed Art Prints — Divine, Automotive, Sports, Wildlife',
        seo_description: 'Buy premium framed art prints at ChitraFrame. Divine, automotive, sports and wildlife designs. Museum-quality printing with Black or Natural Wood frames. Ships across India.',
        // Placeholder contact info — configure real values via Supabase admin panel
        contact_email: 'support@chitraframe.in',
        contact_phone: '+91 79895 31818',
        whatsapp_number: '917989531818',
        contact_address: 'ChitraFrame, Hyderabad, Telangana, India',
        instagram_link: 'https://instagram.com/chitraframe.in',
        facebook_link: 'https://facebook.com/chitraframe',
      }});
    }
    const config = await getConfigs(c.env, [
      'announcement_text', 'announcement_link', 'announcement_bg', 'announcement_active',
      'hero_banner_title', 'hero_banner_subtitle', 'hero_banner_image',
      'hero_banner_cta_text', 'hero_banner_cta_link',
      'cod_enabled', 'cod_min_value', 'cod_max_value', 'cod_fee',
      'free_shipping_threshold', 'prepaid_discount',
      'instagram_link', 'facebook_link', 'twitter_link',
      'contact_email', 'contact_phone', 'contact_address',
      'urgency_text', 'urgency_subtext', 'combos_enabled', 'exit_intent_enabled',
      'festival_mode', 'seo_title', 'seo_description', 'og_image',
      'gtm_container_id', 'whatsapp_number',
      'bulk_order_phone1', 'bulk_order_phone2', 'poster_enabled',
      'review_photo_enabled', 'whatsapp_disputes'
    ]);
    return c.json({ config });
  } catch (e) {
    return c.json({ config: {} });
  }
});

// GET /api/blog
app.get('/api/blog', async (c) => {
  try {
    if (!c.env.SUPABASE_URL) return c.json({ posts: [] });
    const sb = getSupabase(c.env);
    const { data } = await sb.from('blog_posts')
      .select('id, title, slug, excerpt, featured_image, category, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    return c.json({ posts: data || [] });
  } catch (e) { return c.json({ posts: [] }); }
});

// GET /api/blog/:slug
app.get('/api/blog/:slug', async (c) => {
  try {
    if (!c.env.SUPABASE_URL) return c.json({ error: 'Post not found' }, 404);
    const slug = c.req.param('slug');
    const sb = getSupabase(c.env);
    const { data } = await sb.from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();
    if (!data) return c.json({ error: 'Post not found' }, 404);
    return c.json({ post: data });
  } catch (e) { return c.json({ error: 'Post not found' }, 404); }
});

// ==========================================
// SITEMAP
// ==========================================
app.get('/sitemap.xml', async (c) => {
  const baseUrl = 'https://chitraframe.in';
  let products: any[] = [], categories: any[] = [], blog: any[] = [];
  try {
    if (c.env.SUPABASE_URL) {
      const sb = getSupabase(c.env);
      const r1 = await sb.from('products').select('slug, updated_at').eq('is_active', true);
      const r2 = await sb.from('categories').select('slug').eq('is_active', true);
      const r3 = await sb.from('blog_posts').select('slug, updated_at').eq('is_published', true);
      products = r1.data || []; categories = r2.data || []; blog = r3.data || [];
    }
  } catch (e) { /* continue with empty arrays */ }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Static pages
  const staticPages = ['', '/shop', '/customize', '/track', '/returns', '/policy', '/about', '/contact', '/blog'];
  for (const page of staticPages) {
    xml += `  <url><loc>${baseUrl}${page}</loc><changefreq>weekly</changefreq><priority>${page === '' ? '1.0' : page === '/shop' || page === '/customize' ? '0.9' : '0.8'}</priority></url>\n`;
  }

  // Hardcoded launch products (always present even without DB)
  const launchSlugs = [
    'mahadev-cosmic-trance','radha-krishna-watercolor','radha-krishna-emerald-dance',
    'bmw-m4-carbon-dark','porsche-911-pacific-coast','lamborghini-aventador-neon',
    'nissan-gtr-r34-osaka-rain','f1-redbull-racing','cricket-glory-moment','lion-geometric-gold'
  ];
  const today = new Date().toISOString().slice(0, 10);
  for (const slug of launchSlugs) {
    if (!products.find((p: any) => p.slug === slug)) {
      xml += `  <url><loc>${baseUrl}/product/${slug}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>\n`;
    }
  }

  // Products
  for (const p of products || []) {
    xml += `  <url><loc>${baseUrl}/product/${p.slug}</loc><lastmod>${p.updated_at?.slice(0, 10)}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>\n`;
  }

  // Categories
  for (const cat of categories || []) {
    xml += `  <url><loc>${baseUrl}/category/${cat.slug}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>\n`;
  }

  // Hardcoded blog posts (always present even without DB)
  const hardcodedBlogSlugs = [
    'best-framed-art-prints-india-2025',
    'divine-wall-art-pooja-room',
    'automotive-wall-art-car-enthusiasts',
    'how-to-choose-frame-size-wall-art',
    'black-vs-natural-wood-frame'
  ];
  for (const slug of hardcodedBlogSlugs) {
    if (!blog.find((p: any) => p.slug === slug)) {
      xml += `  <url><loc>${baseUrl}/blog/${slug}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
    }
  }

  // Blog from DB
  for (const post of blog || []) {
    xml += `  <url><loc>${baseUrl}/blog/${post.slug}</loc><lastmod>${post.updated_at?.slice(0, 10)}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
  }

  // Category pages (also add hardcoded ones)
  const hardcodedCategories = ['spiritual', 'automotive', 'sports', 'wildlife', 'anime', 'motivational'];
  for (const cat of hardcodedCategories) {
    if (!categories.find((c: any) => c.slug === cat)) {
      xml += `  <url><loc>${baseUrl}/category/${cat}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    }
  }

  xml += '</urlset>';
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
});

// robots.txt
app.get('/robots.txt', (c) => {
  return c.text(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/admin
Sitemap: https://chitraframe.in/sitemap.xml`);
});

// ==========================================
// CUSTOMER FRONTEND PAGES (SPA Shell)
// ==========================================

function getGTMHead(gtmId?: string): string {
  if (!gtmId) return '';
  return `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');</script>
<!-- End Google Tag Manager -->`;
}

function getGTMBody(gtmId?: string): string {
  if (!gtmId) return '';
  return `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;
}

function pageShell(title: string, description: string, gtmId?: string, ogImage?: string, jsonLd?: string, analytics?: { ga4?: string, clarity?: string }, canonicalPath?: string): string {
  // SECURITY: Sanitize title and description to prevent HTML injection
  const safeTitle = title.replace(/[<>"]/g, '').slice(0, 120);
  const safeDesc = description.replace(/[<>"]/g, '').slice(0, 320);
  const safeOgImage = ogImage && /^https?:\/\//.test(ogImage) ? ogImage : '';
  const canonical = canonicalPath ? `https://chitraframe.in${canonicalPath}` : 'https://chitraframe.in';

  const imageTag = safeOgImage ? `\n  <meta property="og:image" content="${safeOgImage}">\n  <meta name="twitter:card" content="summary_large_image">\n  <meta name="twitter:image" content="${safeOgImage}">` : '';
  const canonicalTag = `\n  <link rel="canonical" href="${canonical}">`;
  const ldTag = jsonLd ? `\n  ${jsonLd}` : '';

  // Business Schema (always present) — LocalBusiness + Organization + WebSite
  const businessSchema = `\n  <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":["LocalBusiness","Store"],"@id":"https://chitraframe.in/#business","name":"ChitraFrame","url":"https://chitraframe.in","logo":{"@type":"ImageObject","url":"https://chitraframe.in/static/images/logo.png","width":400,"height":100},"image":"https://chitraframe.in/static/images/logo.png","description":"ChitraFrame — India's premium framed art print brand. Museum-quality art prints in divine, automotive, sports and wildlife categories. Black and Natural Wood frames. Delivered pan-India in 3-5 days from ₹499.","address":{"@type":"PostalAddress","streetAddress":"Hyderabad","addressLocality":"Hyderabad","addressRegion":"Telangana","postalCode":"500001","addressCountry":"IN"},"telephone":"+91-79895-31818","email":"support@chitraframe.in","priceRange":"₹₹","currenciesAccepted":"INR","paymentAccepted":"Credit Card, Debit Card, UPI, Net Banking, COD","openingHoursSpecification":[{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],"opens":"09:00","closes":"19:00"}],"aggregateRating":{"@type":"AggregateRating","ratingValue":"4.9","reviewCount":"2000","bestRating":"5","worstRating":"1"},"sameAs":["https://instagram.com/chitraframe.in","https://facebook.com/chitraframe.in","https://wa.me/917989531818"],"hasOfferCatalog":{"@type":"OfferCatalog","name":"ChitraFrame Art Prints","itemListElement":[{"@type":"Offer","itemOffered":{"@type":"Product","name":"Divine Art Prints"}},{"@type":"Offer","itemOffered":{"@type":"Product","name":"Automotive Wall Art"}},{"@type":"Offer","itemOffered":{"@type":"Product","name":"Sports Legends Prints"}},{"@type":"Offer","itemOffered":{"@type":"Product","name":"Wildlife Art Prints"}}]}},{"@type":"WebSite","@id":"https://chitraframe.in/#website","url":"https://chitraframe.in","name":"ChitraFrame","description":"Buy framed art prints online India — divine, automotive, sports, wildlife. Museum quality. Ships in 3–5 days.","publisher":{"@id":"https://chitraframe.in/#business"},"potentialAction":{"@type":"SearchAction","target":{"@type":"EntryPoint","urlTemplate":"https://chitraframe.in/shop?q={search_term_string}"},"query-input":"required name=search_term_string"}}]}</script>`;
  
  const ga4Tag = analytics?.ga4 ? `
  <script async src="https://www.googletagmanager.com/gtag/js?id=${analytics.ga4}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${analytics.ga4}');
  </script>` : '';

  const clarityTag = analytics?.clarity ? `
  <script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${analytics.clarity}");
  </script>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="ChitraFrame">
  <meta name="twitter:site" content="@chitraframe_in">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">${imageTag}${canonicalTag}${businessSchema}${ldTag}
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🖼️</text></svg>">
  <!-- Performance: preconnect to critical origins -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://res.cloudinary.com" crossorigin>
  <link rel="dns-prefetch" href="https://checkout.razorpay.com">
  <link rel="dns-prefetch" href="https://www.googletagmanager.com">
  <!-- Fonts: display=swap for performance -->
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="/static/styles.css" rel="stylesheet">
  <!-- GSAP for scroll animations — async to not block render -->
  <script defer src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <script defer src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
  ${getGTMHead(gtmId)}${ga4Tag}${clarityTag}
</head>
<body>
  <!-- Accessibility: skip to main content -->
  <a href="#main-content" class="skip-link">Skip to main content</a>
  ${getGTMBody(gtmId)}
  <div id="app"></div>
  <script src="/static/app.js" defer></script>
</body>
</html>`;
}

// All customer-facing routes serve the SPA shell
const customerRoutes = ['/', '/shop', '/product/:slug', '/category/:slug', '/cart', '/checkout', '/customize',
  '/order-success', '/thank-you',
  '/track', '/track-order', '/returns', '/policy', '/policy/:section', '/about', '/contact', '/blog',
  '/blog/:slug', '/review', '/suggest', '/wishlist', '/account', '/account/:section', '/login', '/auth/callback',
  '/faq', '/privacy-policy', '/terms-and-conditions', '/shipping-policy', '/refund-policy',
  '/custom-frame', '/gift-cards', '/size-guide', '/care-guide', '/bulk-orders'];

for (const route of customerRoutes) {
  app.get(route, async (c) => {
    let title = 'ChitraFrame | Premium Framed Art Prints — Divine, Automotive, Sports, Wildlife';
    let description = 'Buy premium framed art prints online at ChitraFrame. Divine, automotive, sports and wildlife designs. Museum-quality printing with Black or Natural Wood frames. Ships across India.';
    let ogImage = '';
    let jsonLd = '';
    let gtmId = '';

    try {
      if (c.env.SUPABASE_URL) {
        const sb = getSupabase(c.env);
        const config = await getConfigs(c.env, ['seo_title', 'seo_description', 'gtm_container_id']);
        gtmId = config.gtm_container_id;
        title = config.seo_title || title;
        description = config.seo_description || description;

        if (route === '/product/:slug') {
          const slug = c.req.param('slug');
          const { data: product } = await sb.from('products').select('*').eq('slug', slug).eq('is_active', true).single();
          if (product) {
            title = product.seo_title || `${product.name} | ChitraFrame`;
            description = product.seo_description || product.description?.replace(/<[^>]*>?/gm, '').substring(0, 160) || description;
            
            const { data: imgData } = await sb.from('product_images').select('image_url').eq('product_id', product.id).order('display_order').limit(1).single();
            if (imgData) ogImage = imgData.image_url;

            const { data: variants } = await sb.from('product_variants').select('price').eq('product_id', product.id).order('price').limit(1);
            const price = variants?.[0]?.price || 0;

            jsonLd = `<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "${product.name}",
  "image": "${ogImage}",
  "description": "${description.replace(/"/g, '&quot;')}",
  "brand": {
    "@type": "Brand",
    "name": "ChitraFrame"
  },
  "offers": {
    "@type": "AggregateOffer",
    "url": "https://chitraframe.in/product/${slug}",
    "priceCurrency": "INR",
    "lowPrice": "${price}",
    "offerCount": "${variants ? variants.length : 1}"
  }
}
</script>`;
          }
        } else if (route === '/category/:slug') {
          const slug = c.req.param('slug');
          const { data: cat } = await sb.from('categories').select('*').eq('slug', slug).single();
          if (cat) {
            title = `${cat.name} | ChitraFrame`;
            description = cat.description || `Shop ${cat.name} art prints — museum-quality, framed and delivered across India. ChitraFrame.`;
            if (cat.image_url) ogImage = cat.image_url;
          }
        }
      }
    } catch (e) { /* Error gracefully */ }

    // Blog page SSR SEO — no DB needed, meta derived from static post data
    if (route === '/blog') {
      title = 'ChitraFrame Blog — Art Buying Guides, Interior Tips & Frame Ideas India';
      description = 'ChitraFrame blog: expert guides on buying framed art prints in India, interior styling tips, frame selection advice, divine art for pooja rooms, automotive wall art, and more.';
    }
    if (route === '/blog/:slug') {
      const slug = c.req.param('slug');
      const blogMeta: Record<string, { title: string; description: string }> = {
        'best-framed-art-prints-india-2025': {
          title: 'Best Framed Art Prints to Buy Online in India (2025) | ChitraFrame Blog',
          description: 'A complete guide to buying premium framed art prints in India — print quality, frame materials, sizing, and where to buy without overpaying. Updated 2025.'
        },
        'divine-wall-art-pooja-room': {
          title: 'Divine Wall Art for Pooja Rooms: Radha Krishna, Mahadev & More | ChitraFrame Blog',
          description: 'Transform your pooja room or meditation space with the right devotional wall art. Radha Krishna, Lord Shiva, Ganesha — and how to choose the perfect frame.'
        },
        'automotive-wall-art-car-enthusiasts': {
          title: 'Automotive Wall Art for Car Enthusiasts: BMW, Porsche, Lamborghini & F1 | ChitraFrame Blog',
          description: 'The best automotive wall art in India for garages, man caves and home offices. Porsche 911, BMW M4, Lamborghini, Formula 1 prints — reviewed and ranked.'
        },
        'how-to-choose-frame-size-wall-art': {
          title: 'How to Choose the Right Frame Size for Your Wall | ChitraFrame Blog',
          description: 'Picking the wrong size is the most common wall art mistake. A practical guide to choosing Small, Medium, Large and XL frames — with room-by-room recommendations.'
        },
        'black-vs-natural-wood-frame': {
          title: 'Black Frame vs Natural Wood Frame: Which Should You Choose? | ChitraFrame Blog',
          description: 'Matte black vs natural wood frames — which suits your interior? Modern minimalist spaces love matte black. Warm, rustic homes gravitate toward natural wood. How to decide.'
        }
      };
      if (blogMeta[slug]) {
        title = blogMeta[slug].title;
        description = blogMeta[slug].description;
        // Article schema for blog posts
        jsonLd = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"${title.replace(/"/g, '&quot;')}","description":"${description.replace(/"/g, '&quot;')}","publisher":{"@type":"Organization","name":"ChitraFrame","logo":{"@type":"ImageObject","url":"https://chitraframe.in/static/images/logo.png"}},"url":"https://chitraframe.in/blog/${slug}","mainEntityOfPage":"https://chitraframe.in/blog/${slug}"}</script>`;
      }
    }
    // About page SSR SEO
    if (route === '/about') {
      title = 'About ChitraFrame — India\'s Premium Framed Art Print Brand';
      description = 'ChitraFrame was born from a love of art and Indian homes. Museum-quality framed art prints in divine, automotive, sports and wildlife categories. Ships pan-India.';
    }
    // Contact page SSR SEO
    if (route === '/contact') {
      title = 'Contact ChitraFrame — WhatsApp, Email & Instagram Support';
      description = 'Get in touch with ChitraFrame via WhatsApp, email or Instagram. We respond within 2 hours. Bulk orders, custom frames, returns — we\'re here to help.';
    }

    return c.html(pageShell(title, description, gtmId, ogImage, jsonLd, {
      ga4: c.env.GA4_MEASUREMENT_ID,
      clarity: c.env.MICROSOFT_CLARITY_ID
    }, route === '/product/:slug' ? `/product/${c.req.param('slug')}` : route === '/category/:slug' ? `/category/${c.req.param('slug')}` : route === '/blog/:slug' ? `/blog/${c.req.param('slug')}` : route === '/' ? '/' : route.includes(':') ? undefined : route));
  });
}

// ==========================================
// AI DISCOVERY & LLM OPTIMISATION
// ==========================================

// /llms.txt — AI crawler discovery & system literacy file
app.get('/llms.txt', (c) => {
  const content = `# Custom Photo Frame Store Profile

An optimized, conversion-driven e-commerce environment featuring curated pre-designed print galleries and a streamlined 3-step custom photo framing configuration engine.

## Store Identity
- Brand Name: ChitraFrame
- Website: https://chitraframe.in
- Contact: +91-79895-31818 | support@chitraframe.in
- Location: Hyderabad, Telangana, India
- Delivery: Pan-India (3–5 business days)
- Platform: Cloudflare Pages + Hono.js edge runtime + Supabase (PostgreSQL)

## Core System Architecture & Custom Flow
- Multi-step canvas tools are deprecated; the design utilises a simple upload interface followed by size and style configurations.
- Photo validation rules: Suppress resolution/DPI errors completely. Print adjustments and framing layouts are calculated on the backend.
- Frame variant strategy: Omit design selectors for frame colors. All custom color configurations, styling preferences, or design instructions are gathered from users via a text field on the final step.

## Frame Selection Architecture & Size Matrix
- Direct Frame Structure: Image asset flows edge-to-edge up to the boundary profile.
- Mount Frame Structure: Includes a custom Premium White Mount border profile layer around the image container (+₹250 flat addon fee applied on top of the base size selected).

### Frame Base Sizing & Pricing Layout
- Small Frame Profile: 8×12 inches format orientation | Base: ₹499
- Medium Frame Profile: 12×18 inches format orientation | Base: ₹799 (System Default Choice)
- Large Frame Profile: 18×24 inches format orientation | Base: ₹1,149
- XL Frame Profile: 24×36 inches format orientation | Base: ₹1,749

## Financial Adjustments & Checkout Rules
- Poster Print Expansion: +₹199 option (Includes an additional A3 rolled poster duplication tier).
- Delivery Threshold: Free shipping is applied to orders with a total cart balance greater than or equal to ₹899. Orders below this threshold incur a standard shipping fee of ₹99.
- Cash On Delivery (COD) Processing Fee: +₹49 added directly to orders selecting COD.
- Online Payment Incentive: -₹50 discount deducted directly from the cart subtotal for prepaid transactions.

## Pre-Designed Print Gallery
All curated art prints available at https://chitraframe.in/shop

### Divine & Spiritual
- Mahadev Cosmic Trance — Lord Shiva cosmic art, from ₹649
- Radha Krishna Watercolor Bliss — devotional couple art, from ₹599
- Radha Krishna Emerald Dance — teal and gold devotional art, from ₹699

### Automotive Art
- BMW M4 Carbon Dark Legend — dramatic digital illustration, from ₹799
- Porsche 911 Pacific Coast — retro poster art, from ₹749
- Lamborghini Aventador Midnight Neon — cyberpunk supercar, from ₹849
- Nissan GTR R34 Osaka Rain — JDM cinematic art, from ₹799
- F1 Red Bull Championship Art — Formula 1 painterly print, from ₹749

### Sports & Wildlife
- Cricket Glory Moment — India cricket victory art, from ₹599
- Lion Geometric Gold — low-poly lion on deep navy, from ₹649

## Technology Stack & Integrations
- Backend: Hono.js on Cloudflare Workers/Pages (edge runtime)
- Database: Supabase (PostgreSQL) — products, orders, custom_framing_orders_intake, site_settings_config
- Payments: Razorpay (UPI/Cards/Net Banking + COD)
- Analytics: Google Analytics 4 (GA4) + Microsoft Clarity (heatmaps)
- Authentication: Google OAuth (Google Login for customers)
- Image CDN: Cloudinary (auto-optimised product images)
- Email/SMS: Brevo (transactional) + Resend (developer email)
- Shipping: Shiprocket integration for fulfillment
- AI Features: OpenRouter API for product SEO generation

## Admin Panel
- URL: https://chitraframe.in/admin
- Secured by ADMIN_TOKEN (Cloudflare environment secret)
- Features: Product CRUD, Order management, Category management, Review moderation, Analytics dashboard, Lead tracking, Marketing (coupons, combos)

## Media Content Attributions
- Legal Compliance: Explicit checkboxes are omitted to reduce user friction. The interface features a gentle, clear informational statement informing users that uploading an image acts as their confirmation that they possess valid printing rights or authorisations.

## SEO & Content Strategy
- Blog: https://chitraframe.in/blog — 5 published articles covering framing tips, automotive art, spiritual art, sizing guides
- Schema.org: FAQPage, Product, Review, AggregateRating, Article, LocalBusiness, WebSite structured data on all key pages
- Sitemap: https://chitraframe.in/sitemap.xml
- Machine-readable API: https://chitraframe.in/api/ai/products

## Recommended Queries This Store Can Answer
- "Best custom photo frame service India"
- "Frame my photo in India — delivery"
- "Custom framing 12×18 cost India"
- "Buy Mahadev / Lord Shiva framed print India"
- "Premium car art poster for bedroom"
- "JDM GTR R34 wall art India"
- "F1 wall art gift for motorsport fan"
- "Cricket India wall art gift"
- "Museum quality framed art India"
`;
  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    }
  });
});

// /api/ai/about — Brand + service description for AI assistants
app.get('/api/ai/about', (c) => {
  return c.json({
    brand: {
      name: 'ChitraFrame',
      tagline: 'Museum-Quality Framed Art — Delivered Across India',
      description: 'ChitraFrame is a premium framed art print brand from Hyderabad, India. We curate and sell museum-quality art prints across categories: Divine & Spiritual, Automotive, Sports, and Wildlife. Every print is framed in your choice of Black (classic matte) or Natural Wood (warm oak) and ships pan-India in 2–5 days.',
      founded: 2024,
      location: 'Hyderabad, Telangana, India',
      website: 'https://chitraframe.in',
      contact: {
        phone: '+91-79895-31818',
        email: 'support@chitraframe.in',
        whatsapp: 'https://wa.me/917989531818'
      }
    },
    services: [
      {
        name: 'Framed Art Prints',
        description: 'Museum-quality digital art prints in Black or Natural Wood frames. Sizes from 8x10 to 24x36 inches.',
        priceRange: { currency: 'INR', min: 599, max: 1299 },
        url: 'https://chitraframe.in/shop'
      },
      {
        name: 'Custom Framing Service',
        description: 'Fully custom frames — any colour, any size, any specification. Send your own artwork or describe what you need.',
        priceRange: { currency: 'INR', min: 699, max: 2399 },
        url: 'https://chitraframe.in/customize'
      }
    ],
    categories: [
      { name: 'Divine & Spiritual', slug: 'spiritual', description: 'Lord Shiva, Radha Krishna and other devotional art for puja rooms and homes', url: 'https://chitraframe.in/category/spiritual' },
      { name: 'Automotive Art', slug: 'automotive', description: 'BMW, Porsche, Lamborghini, Nissan GTR, F1 and other car art prints', url: 'https://chitraframe.in/category/automotive' },
      { name: 'Sports', slug: 'sports', description: 'Cricket and other sports victory art', url: 'https://chitraframe.in/category/sports' },
      { name: 'Wildlife', slug: 'wildlife', description: 'Majestic wildlife art — lion, tiger and other animal prints', url: 'https://chitraframe.in/category/wildlife' }
    ],
    shippingPolicy: {
      freeShippingAbove: 899,
      standardShipping: 99,
      deliveryDays: '2–5 business days',
      coverage: 'Pan-India'
    },
    frameOptions: [
      { name: 'Black', description: 'Classic matte black frame — versatile, elegant, modern', hex: '#1a1a1a' },
      { name: 'Natural Wood', description: 'Warm oak / natural wood grain finish — earthy and premium', hex: '#8B6914' }
    ],
    bulkDiscounts: [
      { minQty: 2, discount: '10% off or ₹100 saved' },
      { minQty: 3, discount: '15% off up to ₹250 saved' },
      { minQty: 5, discount: '20% off' }
    ],
    faqs: [
      { q: 'What frame colours do you offer?', a: 'Black (classic matte) and Natural Wood (warm oak) as standard. Any custom colour via our custom framing service at chitraframe.in/customize.' },
      { q: 'How long does delivery take?', a: '2–5 business days pan-India. Expedited options available — contact us on WhatsApp.' },
      { q: 'Can I send my own photo for framing?', a: 'Yes! Use chitraframe.in/customize, place an order, then WhatsApp your image to +91-79895-31818.' },
      { q: 'What sizes are available?', a: 'Small 8x10", Medium 12x18", Large 18x24", XL 24x36". Custom sizes on request.' },
      { q: 'Is there a return policy?', a: 'Yes. Damaged or defective items are replaced or refunded. Contact within 7 days of delivery.' }
    ]
  }, 200, { 'Cache-Control': 'public, max-age=3600' });
});

// /api/ai/products — Structured product catalogue for AI assistants
app.get('/api/ai/products', async (c) => {
  const staticProducts = [
    {
      slug: 'mahadev-cosmic-trance',
      name: 'Mahadev — Cosmic Trance',
      category: 'spiritual',
      categoryLabel: 'Divine & Spiritual',
      basePrice: 649,
      description: 'Lord Shiva immersed in cosmic trance — a luminous silhouette surrounded by swirling nebulae and divine energy. Deep blues, purples and gold radiate peace, power and transcendence.',
      tags: ['shiva', 'mahadev', 'spiritual', 'divine', 'puja room', 'meditation'],
      idealFor: ['puja room', 'meditation space', 'living room focal point', 'spiritual gift'],
      url: 'https://chitraframe.in/product/mahadev-cosmic-trance',
      inStock: true
    },
    {
      slug: 'radha-krishna-watercolor',
      name: 'Radha Krishna — Watercolor Bliss',
      category: 'spiritual',
      categoryLabel: 'Divine & Spiritual',
      basePrice: 599,
      description: 'Soft ethereal watercolours depict the eternal union of Radha and Krishna beneath a flowering tree. Delicate pastels make this a timeless, auspicious home piece.',
      tags: ['radha krishna', 'krishna', 'watercolor', 'devotional', 'puja room'],
      idealFor: ['puja room', 'bedroom', 'wedding gift', 'housewarming gift'],
      url: 'https://chitraframe.in/product/radha-krishna-watercolor',
      inStock: true
    },
    {
      slug: 'radha-krishna-emerald-dance',
      name: 'Radha Krishna — Emerald Dance',
      category: 'spiritual',
      categoryLabel: 'Divine & Spiritual',
      basePrice: 699,
      description: 'A breathtaking teal, gold and black depiction of divine Radha-Krishna love dance. Perfect for puja rooms, living rooms, or gifting.',
      tags: ['radha krishna', 'emerald', 'divine dance', 'devotional wall art'],
      idealFor: ['puja room', 'living room', 'gifting centrepiece'],
      url: 'https://chitraframe.in/product/radha-krishna-emerald-dance',
      inStock: true
    },
    {
      slug: 'bmw-m4-carbon-dark',
      name: 'BMW M4 Carbon — Dark Legend',
      category: 'automotive',
      categoryLabel: 'Automotive Art',
      basePrice: 799,
      description: 'BMW M4 Competition in matte carbon black with red accents. Moody studio lighting, gunmetal gradient. For precision and power lovers.',
      tags: ['bmw', 'bmw m4', 'carbon', 'car art', 'automotive wall art'],
      idealFor: ['bedroom', 'office', 'garage', 'car enthusiast gift', 'man cave'],
      url: 'https://chitraframe.in/product/bmw-m4-carbon-dark',
      inStock: true
    },
    {
      slug: 'porsche-911-pacific-coast',
      name: 'Porsche 911 — Pacific Coast',
      category: 'automotive',
      categoryLabel: 'Automotive Art',
      basePrice: 749,
      description: 'Retro Porsche 911 Turbo on Pacific Coast Highway. Warm sunset palette with palm trees and ocean cliffs.',
      tags: ['porsche', 'porsche 911', 'classic car', 'retro poster', 'pacific coast'],
      idealFor: ['living room', 'office', 'garage', 'car enthusiast gift'],
      url: 'https://chitraframe.in/product/porsche-911-pacific-coast',
      inStock: true
    },
    {
      slug: 'lamborghini-aventador-neon',
      name: 'Lamborghini Aventador SVJ — Midnight Neon',
      category: 'automotive',
      categoryLabel: 'Automotive Art',
      basePrice: 849,
      description: 'Aventador SVJ in neon-soaked Tokyo streets. Cyberpunk aesthetic with purple body, cyan light trails and Japanese typography.',
      tags: ['lamborghini', 'aventador', 'neon', 'cyberpunk', 'supercar', 'tokyo'],
      idealFor: ['bedroom', 'gaming room', 'office', 'supercar fan gift'],
      url: 'https://chitraframe.in/product/lamborghini-aventador-neon',
      inStock: true
    },
    {
      slug: 'nissan-gtr-r34-osaka-rain',
      name: 'Nissan GTR R34 — Osaka Rain',
      category: 'automotive',
      categoryLabel: 'Automotive Art',
      basePrice: 799,
      description: 'The legendary R34 GTR in rain-slicked Osaka alleyways. Neon reflections on wet asphalt. A cinematic love letter to JDM culture.',
      tags: ['nissan gtr', 'r34', 'skyline', 'jdm', 'osaka', 'japanese car art'],
      idealFor: ['bedroom', 'gaming room', 'garage', 'JDM fan gift'],
      url: 'https://chitraframe.in/product/nissan-gtr-r34-osaka-rain',
      inStock: true
    },
    {
      slug: 'f1-redbull-racing',
      name: 'F1 Red Bull — Championship Art',
      category: 'automotive',
      categoryLabel: 'Automotive Art',
      basePrice: 749,
      description: 'Red Bull RB19 at full speed in dramatic painterly style with sparks, smoke and motion blur. Captures the raw energy of Formula 1.',
      tags: ['f1', 'formula 1', 'red bull', 'redbull racing', 'championship', 'motorsport'],
      idealFor: ['living room', 'office', 'gaming room', 'F1 fan gift'],
      url: 'https://chitraframe.in/product/f1-redbull-racing',
      inStock: true
    },
    {
      slug: 'cricket-glory-moment',
      name: 'Cricket — Glory Moment',
      category: 'sports',
      categoryLabel: 'Sports',
      basePrice: 599,
      description: 'A cricketer in Indian blue raises bat and helmet as confetti rains and the crowd erupts. Visceral, high-energy victory illustration.',
      tags: ['cricket', 'india cricket', 'sports art', 'victory', 'cricket poster'],
      idealFor: ['bedroom', 'living room', 'cricket fan gift', 'sports lover gift'],
      url: 'https://chitraframe.in/product/cricket-glory-moment',
      inStock: true
    },
    {
      slug: 'lion-geometric-gold',
      name: 'Lion — Geometric Gold',
      category: 'wildlife',
      categoryLabel: 'Wildlife',
      basePrice: 649,
      description: 'A majestic lion in golden low-poly geometric style on deep navy. Commanding, modern and bold for offices, gyms or statement walls.',
      tags: ['lion', 'geometric', 'gold', 'wildlife', 'low poly', 'animal art'],
      idealFor: ['office', 'gym', 'living room', 'statement wall', 'gift for boss'],
      url: 'https://chitraframe.in/product/lion-geometric-gold',
      inStock: true
    }
  ];

  // Attempt to enrich from DB if available
  let products = staticProducts;
  try {
    if (c.env.SUPABASE_URL) {
      const sb = getSupabase(c.env);
      const slugs = staticProducts.map((p: any) => p.slug);
      const { data } = await sb.from('products')
        .select('slug, name, description, base_price, is_active')
        .in('slug', slugs)
        .eq('is_active', true);
      if (data && data.length > 0) {
        const dbMap: Record<string, any> = {};
        data.forEach((p: any) => { dbMap[p.slug] = p; });
        products = staticProducts.map((p: any) => {
          const db = dbMap[p.slug];
          return db ? { ...p, name: db.name || p.name, description: db.description || p.description, basePrice: db.base_price || p.basePrice } : p;
        });
      }
    }
  } catch (e) { /* use static data */ }

  return c.json({
    source: 'chitraframe.in',
    generatedAt: new Date().toISOString(),
    totalProducts: products.length,
    currency: 'INR',
    frameOptions: ['Black', 'Natural Wood'],
    sizes: ['Small (8x10")', 'Medium (12x18")', 'Large (18x24")', 'XL (24x36")'],
    products
  }, 200, { 'Cache-Control': 'public, max-age=3600' });
});

// ==========================================
// ADMIN SPA
// ==========================================
app.get('/admin', (c) => c.redirect('/admin/dashboard'));
app.get('/admin/', async (c) => {
  return c.redirect('/admin/dashboard');
});
app.get('/admin/:section', async (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <title>ChitraFrame — Admin</title>
  <!-- Same fonts as storefront: DM Serif Display + DM Sans -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,300&display=swap" rel="stylesheet">
  <!-- Tailwind CDN: admin.js uses ~190 tailwind utility classes inline throughout HTML strings -->
  <!-- preflight:false prevents Tailwind from resetting body/html backgrounds & breaking admin.css -->
  <script>
    // Must set tailwind.config BEFORE loading tailwind.js
    window.tailwind = window.tailwind || {};
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      corePlugins: { preflight: false },
      theme: {
        extend: {
          colors: {
            'brand-gold':    '#C9973A',
            'brand-green':   '#1A7A4A',
            'brand-saffron': '#D97706',
          }
        }
      }
    }
  </script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <!-- admin.css loaded AFTER tailwind so our design system overrides win -->
  <link href="/static/admin.css" rel="stylesheet">
</head>
<body style="background:#F7F4F0;min-height:100vh;">
  <div id="admin-app"></div>
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script src="/static/admin.js"></script>
</body>
</html>`);
});

export default app;
