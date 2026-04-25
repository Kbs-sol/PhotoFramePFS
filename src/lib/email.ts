// PhotoFrameIn - Email Service (Brevo + Resend dual stack)

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  orderId?: string;
  type: string;
}

// Count today's Brevo sends
async function getBrevoCount(env: any): Promise<number> {
  const { getSupabase } = await import('./supabase');
  const sb = getSupabase(env);
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await sb.from('email_log')
    .select('*', { count: 'exact', head: true })
    .eq('service', 'brevo')
    .gte('created_at', `${today}T00:00:00Z`);
  return count || 0;
}

// Send via Brevo (Sendinblue) Transactional API
async function sendBrevo(env: any, params: EmailParams): Promise<boolean> {
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'PhotoFrameIn', email: 'noreply@photoframein.com' },
        to: [{ email: params.to }],
        subject: params.subject,
        htmlContent: params.html
      })
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Send via Resend
async function sendResend(env: any, params: EmailParams): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'PhotoFrameIn <noreply@photoframein.com>',
        to: [params.to],
        subject: params.subject,
        html: params.html
      })
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Log email
async function logEmail(env: any, params: EmailParams, service: string, status: string, error?: string) {
  const { getSupabase } = await import('./supabase');
  const sb = getSupabase(env);
  await sb.from('email_log').insert({
    order_id: params.orderId,
    recipient: params.to,
    type: params.type,
    subject: params.subject,
    service,
    status,
    error_message: error
  });
}

// Main send function with routing logic
export async function sendEmail(env: any, params: EmailParams): Promise<{ success: boolean; service: string }> {
  // Check if it's peak hours (7pm-10pm IST) and a review request
  const now = new Date();
  const istHour = (now.getUTCHours() + 5) % 24 + (now.getUTCMinutes() + 30 >= 60 ? 1 : 0);
  if (istHour >= 19 && istHour < 22 && params.type === 'review_request') {
    // Defer review requests during peak hours
    const { getSupabase } = await import('./supabase');
    const sb = getSupabase(env);
    await sb.from('email_failures').insert({
      order_id: params.orderId, recipient: params.to, type: params.type,
      subject: params.subject, body: params.html, last_error: 'Deferred: peak hours'
    });
    return { success: true, service: 'deferred' };
  }

  const brevoCount = await getBrevoCount(env);

  // Try Brevo first
  if (brevoCount < 270 && env.BREVO_API_KEY) {
    const sent = await sendBrevo(env, params);
    if (sent) {
      await logEmail(env, params, 'brevo', 'sent');
      return { success: true, service: 'brevo' };
    }
  }

  // Fallback to Resend
  if (env.RESEND_API_KEY) {
    const sent = await sendResend(env, params);
    if (sent) {
      await logEmail(env, params, 'resend', 'sent');
      return { success: true, service: 'resend' };
    }
  }

  // Both failed — log failure
  const { getSupabase } = await import('./supabase');
  const sb = getSupabase(env);
  await sb.from('email_failures').insert({
    order_id: params.orderId, recipient: params.to, type: params.type,
    subject: params.subject, body: params.html, last_error: 'Both Brevo and Resend failed'
  });
  await logEmail(env, params, 'none', 'failed', 'Both services failed');

  return { success: false, service: 'none' };
}

// Send owner alert via Resend
export async function sendOwnerAlert(env: any, subject: string, html: string) {
  const ownerEmail = env.OWNER_EMAIL;
  if (!ownerEmail || !env.RESEND_API_KEY) return;

  await sendResend(env, {
    to: ownerEmail, subject: `[PhotoFrameIn] ${subject}`, html, type: 'owner_alert'
  });
}

// Send critical alert to owner + backup email
export async function sendCriticalAlert(env: any, subject: string, html: string) {
  const emails = [env.OWNER_EMAIL, env.ALERT_EMAIL].filter(Boolean);
  for (const email of emails) {
    await sendResend(env, {
      to: email, subject: `[PhotoFrameIn] URGENT: ${subject}`, html, type: 'critical_alert'
    });
  }
}
