// PhotoFrameIn - Product API Routes
import { Hono } from 'hono';
import { Bindings } from '..';
import { getSupabase } from '../lib/supabase';

const products = new Hono<{ Bindings: Bindings }>();

// Guard: check if Supabase is configured
function noSupabase(c: any) { return !c.env?.SUPABASE_URL; }

// GET /api/products — list all active products
products.get('/', async (c) => {
  if (noSupabase(c)) return c.json({ products: [], total: 0 });
  try {
  const sb = getSupabase(c.env);
  const category = c.req.query('category');
  const search = c.req.query('search');
  const sort = c.req.query('sort') || 'created_at';
  const limit = parseInt(c.req.query('limit') || '24');
  const offset = parseInt(c.req.query('offset') || '0');

  let query = sb.from('products')
    .select(`*, category:categories(name, slug, hover_color), images:product_images(id, image_url, alt_text, display_order), variants:product_variants(id, size, frame_type, price, compare_at_price, sku, stock_count, is_active)`)
    .eq('is_active', true)
    .eq('is_hidden', false);

  if (category) {
    const { data: cat } = await sb.from('categories').select('id').eq('slug', category).single();
    if (cat) query = query.eq('category_id', cat.id);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,tags.cs.{${search}}`);
  }

  switch (sort) {
    case 'price_low': break; // Will sort client-side
    case 'price_high': break;
    case 'popular': query = query.order('total_orders', { ascending: false }); break;
    case 'revenue': query = query.order('total_revenue', { ascending: false }); break;
    case 'newest': query = query.order('created_at', { ascending: false }); break;
    default: query = query.order('created_at', { ascending: false });
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) return c.json({ error: error.message }, 500);
  // Audit 5: short-lived cache for list pages — fresh enough for shop/category grids
  c.header('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
  return c.json({ products: data || [], total: count || data?.length || 0 });
  } catch (e: any) { return c.json({ products: [], total: 0 }); }
});

// GET /api/products/bestsellers
products.get('/bestsellers', async (c) => {
  if (noSupabase(c)) return c.json({ products: [] });
  try {
  const sb = getSupabase(c.env);
  const { data } = await sb.from('products')
    .select(`*, images:product_images(image_url, alt_text, display_order), variants:product_variants(id, size, frame_type, price, compare_at_price, is_active)`)
    .eq('is_active', true)
    .eq('is_hidden', false)
    .order('total_revenue', { ascending: false })
    .limit(6);
  return c.json({ products: data || [] });
  } catch (e: any) { return c.json({ products: [] }); }
});

// GET /api/products/upsell — Returns a Rs.99 A4 print for cart upsell
products.get('/upsell', async (c) => {
  if (noSupabase(c)) return c.json({ upsell: null });
  try {
    const sb = getSupabase(c.env);
    // Find a product that has an A4 No Frame (₹99) variant Active
    // DB check constraint only allows "Direct Frame" for frame_type — discriminate by SKU suffix (-noframe)
    const { data: variants } = await sb.from('product_variants')
      .select('id, size, frame_type, price, compare_at_price, is_active, product:products(id, name, slug, images:product_images(image_url))')
      .eq('size', 'A4')
      .like('sku', '%-a4-noframe')
      .eq('price', 99)
      .eq('is_active', true)
      .limit(1);
    
    if (variants && variants.length > 0) {
      const v = variants[0];
      const p = v.product as any;
      if (p && p.images?.length > 0) {
        return c.json({ 
          upsell: {
            variantId: v.id,
            productId: p.id,
            name: p.name,
            slug: p.slug,
            size: v.size,
            frame: v.frame_type,
            price: v.price,
            compare_price: v.compare_at_price,
            image: p.images[0].image_url
          }
        });
      }
    }
    return c.json({ upsell: null });
  } catch (e: any) { return c.json({ upsell: null }); }
});

// GET /api/products/:slug
// FIX #1: Return 404 (not 503) when Supabase is not configured — client gets a proper "not found"
// FIX #2: Move analytics writes to waitUntil so they never block the product response
products.get('/:slug', async (c) => {
  // FIX: When Supabase is not configured, return a clean 404 rather than 503
  if (noSupabase(c)) return c.json({ error: 'Product not found' }, 404);
  try {
  const slug = c.req.param('slug');
  const utm_source = c.req.query('utm_source');
  const utm_medium = c.req.query('utm_medium');
  const utm_campaign = c.req.query('utm_campaign');
  
  const sb = getSupabase(c.env);

  const { data: product, error } = await sb.from('products')
    .select(`*, category:categories(name, slug, hover_color), images:product_images(id, image_url, alt_text, display_order), variants:product_variants(id, size, frame_type, price, compare_at_price, sku, stock_count, is_active)`)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !product) return c.json({ error: 'Product not found' }, 404);

  // FIX #2: Move all analytics writes to waitUntil — they MUST NOT block the product response
  // This shaves 20-40ms off every PDP load by firing-and-forgetting both DB writes
  c.executionCtx.waitUntil((async () => {
    try {
      // 1. Increment total views (non-atomic is fine for analytics counters)
      await sb.from('products')
        .update({ total_views: (product.total_views || 0) + 1 })
        .eq('id', product.id);

      // 2. Log Funnel Event (View) with UTMs
      await sb.from('sales_funnel_events').insert({
        event_type: 'view',
        product_id: product.id,
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        metadata: {
          user_agent: c.req.header('user-agent'),
          ip_hash: c.req.header('cf-connecting-ip')
        }
      });
    } catch (analyticsErr) {
      // Analytics failure must never surface to the user
      console.error('Analytics write failed for', slug, analyticsErr);
    }
  })());

  // Get reviews
  const { data: reviews } = await sb.from('reviews')
    .select('*')
    .eq('product_id', product.id)
    .eq('is_approved', true)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get frequently bought together
  let fbt: any[] = [];
  if (product.frequently_bought_together?.length) {
    const { data } = await sb.from('products')
      .select(`id, name, slug, images:product_images(image_url, display_order), variants:product_variants(size, frame_type, price, compare_at_price)`)
      .in('id', product.frequently_bought_together)
      .eq('is_active', true)
      .limit(3);
    fbt = data || [];
  }

  // Get "you may also like"
  let ymal: any[] = [];
  if (product.you_may_also_like?.length) {
    const { data } = await sb.from('products')
      .select(`id, name, slug, images:product_images(image_url, display_order), variants:product_variants(size, frame_type, price, compare_at_price)`)
      .in('id', product.you_may_also_like)
      .eq('is_active', true)
      .limit(6);
    ymal = data || [];
  } else {
    // Auto from same category
    const { data } = await sb.from('products')
      .select(`id, name, slug, images:product_images(image_url, display_order), variants:product_variants(size, frame_type, price, compare_at_price)`)
      .eq('category_id', product.category_id)
      .eq('is_active', true)
      .neq('id', product.id)
      .limit(6);
    ymal = data || [];
  }

  // Filter variants by allowed sizes/frames if restrictions set on product
  if (product && product.variants) {
    const allowedSizes = product.allowed_sizes ? product.allowed_sizes.split(',').map((s: string) => s.trim()) : null;
    const allowedFrames = product.allowed_frames ? product.allowed_frames.split(',').map((s: string) => s.trim()) : null;
    if (allowedSizes || allowedFrames) {
      product.variants = product.variants.filter((v: any) => {
        const sizeOk = !allowedSizes || allowedSizes.includes(v.size);
        const frameOk = !allowedFrames || allowedFrames.includes(v.frame_type);
        return sizeOk && frameOk;
      });
    }
  }

  // Audit 5: force no-cache so updated Supabase images always reach the browser
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  c.header('Pragma', 'no-cache');
  return c.json({ product, reviews: reviews || [], frequentlyBoughtTogether: fbt, youMayAlsoLike: ymal });
  } catch (e: any) { return c.json({ error: 'Product not found' }, 404); }
});

export default products;

// ─── Public review submit with photo (customer-facing) ────────────────────────
// Photo upload is optional and controlled by review_photo_enabled config
