import { Hono } from 'hono';
import { Bindings } from '..';
import { getSupabase } from '../lib/supabase';

const analytics = new Hono<{ Bindings: Bindings }>();

analytics.post('/funnel', async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { event_type, product_id, order_id, metadata } = await c.req.json();
    
    // Get UTMs and Session from headers/cookies if available (optional for now)
    
    const { error } = await supabase
      .from('sales_funnel_events')
      .insert({
        event_type,
        product_id: product_id || null,
        order_id: order_id || null,
        utm_source: metadata?.utm_source || null,
        utm_medium: metadata?.utm_medium || null,
        utm_campaign: metadata?.utm_campaign || null,
        metadata: metadata || {},
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Analytics Error:', error.message);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default analytics;
