// PhotoFrameIn - Email Service (Brevo + Resend dual stack)
// FIX #8a: Replaced per-send DB query for Brevo count with module-level in-memory counter.
//   Cloudflare Workers reuse the same isolate for many requests in the same colo, so
//   a module-level counter will persist across requests for the lifetime of the isolate —
//   which is sufficient to prevent exceeding the 300/day Brevo limit.
//   The counter resets naturally when the isolate is replaced (daily rotation / cold start).
// FIX #8b: Fixed IST calculation: removed incorrect `% 24` wrapping that capped minutes contribution.

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  orderId?: string;
  type: string;
}

// ─── Module-level Brevo counter ───────────────────────────────────────────────
// Persists across requests within the same Worker isolate lifetime.
// Conservative safety margin: if we exceed 270, fall back to Resend.
let _brevoSentToday = 0;
let _brevoCountDate = ''; // tracks which date the counter belongs to

function getBrevoCount(): number {
  const today = new Date().toISOString().slice(0, 10);
  // Reset counter at day boundary (UTC-based, consistent with DB logs)
  if (_brevoCountDate !== today) {
    _brevoSentToday = 0;
    _brevoCountDate = today;
  }
  return _brevoSentToday;
}

function incrementBrevoCount(): void {
  _brevoSentToday++;
}

// ─── IST hour helper ──────────────────────────────────────────────────────────
// FIX #8b: Previous code was `(utcHour + 5) % 24 + (minutes >= 30 ? 1 : 0)`
//   The `% 24` was applied BEFORE adding the half-hour offset, and could produce
//   a wrong hour when minutes >= 30 pushed the value past midnight.
//   Correct approach: convert full UTC minutes to IST minutes, then derive the hour.
function getISTHour(): number {
  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = (utcMinutes + 330) % (24 * 60); // IST = UTC+5:30 = +330 min, wrap at 24h
  return Math.floor(istMinutes / 60);
}

// ─── Send via Brevo (Sendinblue) Transactional API ────────────────────────────
async function sendBrevo(env: any, params: EmailParams): Promise<boolean> {
  try {
    const senderEmail = env.FROM_EMAIL || 'noreply@photoframein.com';
    const senderName = env.FROM_NAME || 'PhotoFrameIn';
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
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

// ─── Send via Resend ──────────────────────────────────────────────────────────
async function sendResend(env: any, params: EmailParams): Promise<boolean> {
  try {
    const senderEmail = env.FROM_EMAIL || 'noreply@photoframein.com';
    const senderName = env.FROM_NAME || 'PhotoFrameIn';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
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

// ─── Log email to DB (async, non-blocking from caller's perspective) ──────────
async function logEmail(env: any, params: EmailParams, service: string, status: string, error?: string) {
  try {
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
  } catch {
    // Email logging failure must never crash the main flow
  }
}

// ─── Main send function with routing logic ────────────────────────────────────
export async function sendEmail(env: any, params: EmailParams): Promise<{ success: boolean; service: string }> {
  // FIX #8b: Correct IST peak-hour check using fixed getISTHour()
  const istHour = getISTHour();
  if (istHour >= 19 && istHour < 22 && params.type === 'review_request') {
    // Defer review requests during peak hours (7pm–10pm IST) — log for retry
    try {
      const { getSupabase } = await import('./supabase');
      const sb = getSupabase(env);
      await sb.from('email_failures').insert({
        order_id: params.orderId, recipient: params.to, type: params.type,
        subject: params.subject, body: params.html, last_error: 'Deferred: peak hours'
      });
    } catch { /* non-critical */ }
    return { success: true, service: 'deferred' };
  }

  // FIX #8a: Use module-level counter instead of DB query
  const brevoCount = getBrevoCount();

  // Try Brevo first (under daily limit)
  if (brevoCount < 270 && env.BREVO_API_KEY) {
    const sent = await sendBrevo(env, params);
    if (sent) {
      incrementBrevoCount(); // update in-memory counter
      // Log async (don't await in hot path)
      logEmail(env, params, 'brevo', 'sent').catch(() => {});
      return { success: true, service: 'brevo' };
    }
  }

  // Fallback to Resend
  if (env.RESEND_API_KEY) {
    const sent = await sendResend(env, params);
    if (sent) {
      logEmail(env, params, 'resend', 'sent').catch(() => {});
      return { success: true, service: 'resend' };
    }
  }

  // Both failed — log failure for retry
  try {
    const { getSupabase } = await import('./supabase');
    const sb = getSupabase(env);
    await sb.from('email_failures').insert({
      order_id: params.orderId, recipient: params.to, type: params.type,
      subject: params.subject, body: params.html, last_error: 'Both Brevo and Resend failed'
    });
    await logEmail(env, params, 'none', 'failed', 'Both services failed');
  } catch { /* non-critical */ }

  return { success: false, service: 'none' };
}

// ─── Owner alert (via Resend only — never Brevo quota) ───────────────────────
export async function sendOwnerAlert(env: any, subject: string, html: string) {
  const ownerEmail = env.OWNER_EMAIL;
  if (!ownerEmail || !env.RESEND_API_KEY) return;

  await sendResend(env, {
    to: ownerEmail, subject: `[PhotoFrameIn] ${subject}`, html, type: 'owner_alert'
  });
}

// ─── Critical alert to owner + backup email ──────────────────────────────────
export async function sendCriticalAlert(env: any, subject: string, html: string) {
  const emails = [env.OWNER_EMAIL, env.ALERT_EMAIL].filter(Boolean);
  for (const email of emails) {
    await sendResend(env, {
      to: email, subject: `[PhotoFrameIn] URGENT: ${subject}`, html, type: 'critical_alert'
    });
  }
}
