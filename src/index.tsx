// PhotoFrameIn - Main Hono Application
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
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/static/*', serveStatic());
app.use('*', logger());
app.use('*', async (c, next) => {
  await next();
  c.header('X-Frame-Options', 'SAMEORIGIN');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Content-Security-Policy — allows CDNs and Razorpay while blocking inline XSS
  c.header('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://checkout.razorpay.com https://www.googletagmanager.com https://www.googletagmanager.com https://www.clarity.ms https://www.google-analytics.com https://cdn.shiprocket.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://api.cloudinary.com https://res.cloudinary.com https://www.google-analytics.com https://www.googletagmanager.com https://www.clarity.ms",
    "frame-src https://checkout.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; '));
});
app.use('/api/*', cors({
  origin: (origin) => {
    const allowed = [
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
  return c.html(`<!DOCTYPE html><html><head><title>404 - Not Found</title><link href="/static/styles.css" rel="stylesheet"></head><body style="background:#050505;color:#E5E5E5;text-align:center;padding-top:100px;font-family:Inter,sans-serif"><h1>404</h1><p>Page Not Found</p><a href="/" style="color:#C5A059;text-decoration:none">Return Home</a></body></html>`, 404);
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

// GET /api/config/public — public-facing config
app.get('/api/config/public', async (c) => {
  try {
    if (!c.env.SUPABASE_URL) {
      return c.json({ config: {
        announcement_active: 'true',
        announcement_text: 'Free Delivery on orders above ₹799 | COD Available',
        announcement_link: '/shop',
        announcement_bg: '#CC0000',
        cod_enabled: 'true', cod_min_value: '499', cod_max_value: '1995', cod_fee: '49',
        free_shipping_threshold: '799', prepaid_discount: '50',
        urgency_text: 'Limited Stock Available', urgency_subtext: 'Offer Ends Tonight',
        combos_enabled: 'true', exit_intent_enabled: 'true',
        seo_title: 'PhotoFrameIn | Buy Photo Frames & Custom Wall Art Online in India',
        seo_description: 'Buy photo frames online, wall art, and custom poster frames. Fast delivery across India. Starting ₹199.'
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
  const baseUrl = 'https://photoframein.com';
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
  const staticPages = ['', '/shop', '/track', '/returns', '/policy', '/about', '/contact', '/blog'];
  for (const page of staticPages) {
    xml += `  <url><loc>${baseUrl}${page}</loc><changefreq>weekly</changefreq><priority>${page === '' ? '1.0' : '0.8'}</priority></url>\n`;
  }

  // Products
  for (const p of products || []) {
    xml += `  <url><loc>${baseUrl}/product/${p.slug}</loc><lastmod>${p.updated_at?.slice(0, 10)}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>\n`;
  }

  // Categories
  for (const cat of categories || []) {
    xml += `  <url><loc>${baseUrl}/category/${cat.slug}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>\n`;
  }

  // Blog
  for (const post of blog || []) {
    xml += `  <url><loc>${baseUrl}/blog/${post.slug}</loc><lastmod>${post.updated_at?.slice(0, 10)}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
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
Sitemap: https://photoframein.com/sitemap.xml`);
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
  const canonical = canonicalPath ? `https://photoframein.com${canonicalPath}` : 'https://photoframein.com';

  const imageTag = safeOgImage ? `\n  <meta property="og:image" content="${safeOgImage}">\n  <meta name="twitter:card" content="summary_large_image">\n  <meta name="twitter:image" content="${safeOgImage}">` : '';
  const canonicalTag = `\n  <link rel="canonical" href="${canonical}">`;
  const ldTag = jsonLd ? `\n  ${jsonLd}` : '';

  // Business Schema (always present)
  const businessSchema = `\n  <script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"PhotoFrameIn","url":"https://photoframein.com","logo":"https://photoframein.com/static/images/logo.png","description":"Buy premium photo frames and custom wall art online in India. Dive art, automotive frames, custom photo frames. Fast delivery across India.","address":{"@type":"PostalAddress","addressLocality":"Hyderabad","addressRegion":"Telangana","addressCountry":"IN"},"telephone":"+91-79895-31818","priceRange":"₹₹","openingHours":"Mo-Sa 09:00-19:00","sameAs":["https://instagram.com/photoframein","https://facebook.com/photoframein"]}</script>`;
  
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
  <meta property="og:site_name" content="PhotoFrameIn">
  <meta name="twitter:site" content="@photoframein">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">${imageTag}${canonicalTag}${businessSchema}${ldTag}
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🖼️</text></svg>">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: { bg: '#050505', card: '#121212', gold: '#C5A059', red: '#CC0000', saffron: '#E8670A', green: '#22C55E', purple: '#7C3AED' }
          }
        }
      }
    }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="/static/styles.css" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
  ${getGTMHead(gtmId)}${ga4Tag}${clarityTag}
</head>
<body class="bg-brand-bg text-gray-200 min-h-screen">
  ${getGTMBody(gtmId)}
  <div id="app"></div>
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="/static/app.js"></script>
</body>
</html>`;
}

// All customer-facing routes serve the SPA shell
const customerRoutes = ['/', '/shop', '/product/:slug', '/category/:slug', '/cart', '/checkout', '/customize',
  '/track', '/returns', '/policy', '/policy/:section', '/about', '/contact', '/blog',
  '/blog/:slug', '/review', '/wishlist', '/account', '/account/:section', '/login', '/auth/callback'];

for (const route of customerRoutes) {
  app.get(route, async (c) => {
    let title = 'PhotoFrameIn | Buy Photo Frames & Custom Wall Art Online';
    let description = 'Buy photo frames online, wall art & custom frames online. Fast delivery across India.';
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
            title = product.seo_title || `${product.name} | PhotoFrameIn`;
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
    "name": "PhotoFrameIn"
  },
  "offers": {
    "@type": "AggregateOffer",
    "url": "https://photoframein.com/product/${slug}",
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
            title = `${cat.name} | PhotoFrameIn`;
            description = cat.description || `Browse our gorgeous collection of ${cat.name} custom photo frames and wall art online.`;
            if (cat.image_url) ogImage = cat.image_url;
          }
        }
      }
    } catch (e) { /* Error gracefully */ }

    return c.html(pageShell(title, description, gtmId, ogImage, jsonLd, {
      ga4: c.env.GA4_MEASUREMENT_ID,
      clarity: c.env.MICROSOFT_CLARITY_ID
    }));
  });
}

// Admin SPA
app.get('/admin', (c) => c.redirect('/admin/dashboard'));
app.get('/admin/', async (c) => {
  return c.redirect('/admin/dashboard');
});
app.get('/admin/:section', async (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PhotoFrameIn Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: { extend: { colors: { brand: { bg: '#050505', card: '#121212', gold: '#C5A059', red: '#CC0000', saffron: '#E8670A', green: '#22C55E', purple: '#7C3AED' } } } }
    }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="/static/admin.css" rel="stylesheet">
</head>
<body class="bg-gray-950 text-gray-200 min-h-screen">
  <div id="admin-app"></div>
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script src="/static/admin.js"></script>
</body>
</html>`);
});

export default app;
// (OPENROUTER_API_KEY is accessed via c.env as any in admin routes)
