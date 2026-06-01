// PhotoFrameIn - Resource Alert Engine
import { getSupabase, getConfigs } from './supabase';
import { sendCriticalAlert } from './email';

export async function checkResourceUsageAndAlert(env: any) {
  const sb = getSupabase(env);
  
  // 1. Fetch Configs
  const config = await getConfigs(env, [
    'worker_monthly_limit', 'supabase_row_limit', 
    'brevo_daily_limit', 'resend_daily_limit',
    'alert_threshold_percentage', 'alert_cooldown_hours'
  ]);

  const thresholdPct = parseInt(config.alert_threshold_percentage || '85');
  const cooldownHours = parseInt(config.alert_cooldown_hours || '24');
  
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = `${today.slice(0, 7)}-01T00:00:00Z`;

  // 2. Gather Stats (Same logic as Admin Usage API)
  const { count: monthlyRequests } = await sb.from('sales_funnel_events').select('*', { count: 'exact', head: true }).gte('created_at', firstOfMonth);
  const { count: productCount } = await sb.from('products').select('*', { count: 'exact', head: true });
  const { count: imageCount } = await sb.from('product_images').select('*', { count: 'exact', head: true });
  const { count: orderCount } = await sb.from('orders').select('*', { count: 'exact', head: true });
  const { count: brevoToday } = await sb.from('email_log').select('*', { count: 'exact', head: true }).eq('service', 'brevo').gte('created_at', `${today}T00:00:00Z`);

  const resources = [
    { 
      type: 'workers', 
      usage: monthlyRequests || 0, 
      limit: parseInt(config.worker_monthly_limit || '3000000'),
      label: 'Cloudflare Worker Requests (Monthly)'
    },
    { 
      type: 'supabase', 
      usage: (productCount || 0) + (imageCount || 0) + (orderCount || 0), 
      limit: parseInt(config.supabase_row_limit || '50000'),
      label: 'Supabase Database Rows'
    },
    { 
      type: 'email_brevo', 
      usage: brevoToday || 0, 
      limit: parseInt(config.brevo_daily_limit || '300'),
      label: 'Brevo Daily Emails'
    }
  ];

  const alertsToTrigger = [];

  for (const res of resources) {
    const pct = (res.usage / res.limit) * 100;
    if (pct >= thresholdPct) {
      // Check Cooldown
      const { data: lastAlert } = await sb.from('system_alerts')
        .select('notified_at')
        .eq('resource_type', res.type)
        .order('notified_at', { ascending: false })
        .limit(1)
        .single();

      const hoursSinceLast = lastAlert 
        ? (Date.now() - new Date(lastAlert.notified_at).getTime()) / (1000 * 60 * 60)
        : 999;

      if (hoursSinceLast >= cooldownHours) {
        alertsToTrigger.push({ ...res, currentPct: Math.round(pct) });
      }
    }
  }

  // 3. Send Alert if needed
  if (alertsToTrigger.length > 0) {
    const alertBody = `
      <h2>⚠️ Resource Usage Alert</h2>
      <p>The following free-tier resources have exceeded your target threshold of ${thresholdPct}%:</p>
      <ul>
        ${alertsToTrigger.map(a => `
          <li><strong>${a.label}</strong>: ${a.currentPct}% usage (${a.usage.toLocaleString()} / ${a.limit.toLocaleString()})</li>
        `).join('')}
      </ul>
      <p>Please check your dashboard for details or consider upgrading your plans if this usage continues.</p>
      <hr/>
      <p><small>Next alert for these resources will be sent in ${cooldownHours} hours if usage remains high.</small></p>
    `;

    await sendCriticalAlert(env, 'Resource Usage Alert', alertBody);

    // Log alerts to DB
    for (const a of alertsToTrigger) {
      await sb.from('system_alerts').insert({
        resource_type: a.type,
        usage_percentage: a.currentPct,
        metadata: { current_usage: a.usage, limit: a.limit }
      });
    }

    return { alerted: true, count: alertsToTrigger.length };
  }

  return { alerted: false };
}
