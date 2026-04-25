import { Hono } from 'hono';
import { Bindings } from '..';
import { getSupabase } from '../lib/supabase';

const analytics = new Hono<{ Bindings: Bindings }>();

analytics.post('/funnel', async (c) => {
  // CRITICAL: Always return 200 for analytics — never crash the frontend
  try {
    if (!c.env?.SUPABASE_URL) return c.json({ success: true }); // Silently skip if DB not configured

    const body = await c.req.json().catch(() => ({}));
    const { event_type, product_id, order_id, metadata } = body;

    // Validate event_type to prevent junk data
    const validEvents = ['page_view', 'view_product', 'add_to_cart', 'initiate_checkout', 'purchase', 'view_home'];
    if (!event_type || !validEvents.includes(event_type)) {
      return c.json({ success: true }); // Silently ignore invalid events
    }

    const supabase = getSupabase(c.env);
    await supabase.from('sales_funnel_events').insert({
      event_type,
      product_id: product_id || null,
      order_id: order_id || null,
      utm_source: typeof metadata?.utm_source === 'string' ? metadata.utm_source.slice(0, 100) : null,
      utm_medium: typeof metadata?.utm_medium === 'string' ? metadata.utm_medium.slice(0, 100) : null,
      utm_campaign: typeof metadata?.utm_campaign === 'string' ? metadata.utm_campaign.slice(0, 200) : null,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    });

    return c.json({ success: true });
  } catch (error: any) {
    // NEVER return 500 for analytics — silent fail is correct
    console.error('Analytics Error (non-critical):', error.message);
    return c.json({ success: true });
  }
});

export default analytics;
