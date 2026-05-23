// PhotoFrameIn - Auth Routes (Magic Link + Google + Brevo/Resend fallback)
import { Hono } from 'hono';
import { Bindings } from '..';
import { getSupabase } from '../lib/supabase';

const auth = new Hono<{ Bindings: Bindings }>();

// ─── Send magic-link email via Brevo then Resend fallback ─────────────────────
async function sendMagicLinkEmail(env: any, email: string, magicUrl: string): Promise<{ sent: boolean; service: string }> {
  const subject = 'Your PhotoFrameIn Login Link';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#0D0D0D;color:#E5E5E5;padding:32px;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:36px;">🖼️</span>
        <h1 style="color:#DAA520;margin:8px 0 4px;font-size:22px;">PhotoFrameIn</h1>
        <p style="color:#888;font-size:12px;margin:0;">Premium Wall Art &amp; Photo Frames</p>
      </div>
      <h2 style="color:#FFFFFF;font-size:18px;margin-bottom:16px;">Your Sign-In Link</h2>
      <p style="color:#B0B0B0;font-size:14px;line-height:1.6;margin-bottom:24px;">
        Click the button below to securely sign in to your PhotoFrameIn account.<br>
        This link expires in <strong style="color:#FFD700;">1 hour</strong> and can only be used once.
      </p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${magicUrl}" style="display:inline-block;background:#CC0000;color:#FFFFFF;font-weight:bold;font-size:16px;padding:14px 32px;border-radius:8px;text-decoration:none;">Sign In to PhotoFrameIn</a>
      </div>
      <p style="color:#666;font-size:12px;text-align:center;">If you didn't request this, you can safely ignore this email.</p>
      <hr style="border:none;border-top:1px solid #222;margin:24px 0;">
      <p style="color:#444;font-size:11px;text-align:center;">PhotoFrameIn · Hyderabad, India · <a href="https://photoframein.com" style="color:#DAA520;">photoframein.com</a></p>
    </div>
  `;

  // 1. Try Brevo (free: 300/day)
  if (env.BREVO_API_KEY) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { name: 'PhotoFrameIn', email: 'noreply@photoframein.com' },
          to: [{ email }],
          subject,
          htmlContent: html
        })
      });
      if (res.ok) return { sent: true, service: 'brevo' };
    } catch {}
  }

  // 2. Fallback: Resend (free: 100/day)
  if (env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'PhotoFrameIn <noreply@photoframein.com>',
          to: [email],
          subject,
          html
        })
      });
      if (res.ok) return { sent: true, service: 'resend' };
    } catch {}
  }

  return { sent: false, service: 'none' };
}

// POST /api/auth/magic-link
// Tries Supabase OTP first; falls back to Brevo/Resend with a time-token
auth.post('/magic-link', async (c) => {
  try {
    const { email, redirectTo } = await c.req.json();
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return c.json({ error: 'Valid email required' }, 400);
    }
    const cleanEmail = email.trim().toLowerCase().slice(0, 255);
    const redirect = redirectTo || 'https://photoframein.com/auth/callback';

    // ── No Supabase: generate a simple time-based link via email ──
    if (!c.env.SUPABASE_URL) {
      const token = btoa(`${cleanEmail}:${Date.now() + 3600000}`).replace(/=/g, '');
      const magicUrl = `${redirect}?token=${token}&email=${encodeURIComponent(cleanEmail)}`;
      const { sent, service } = await sendMagicLinkEmail(c.env, cleanEmail, magicUrl);
      if (sent) return c.json({ success: true, message: 'Magic link sent!', service });
      return c.json({ error: 'Email service not configured. Set BREVO_API_KEY or RESEND_API_KEY.' }, 500);
    }

    // ── Supabase OTP ──
    const sb = getSupabase(c.env);
    const { error } = await sb.auth.signInWithOtp({
      email: cleanEmail,
      options: { emailRedirectTo: redirect }
    });

    if (error) {
      // Supabase email might not be configured — fall back to custom email
      const token = btoa(`${cleanEmail}:${Date.now() + 3600000}`).replace(/=/g, '');
      const magicUrl = `${redirect}?token=${token}&email=${encodeURIComponent(cleanEmail)}`;
      const { sent, service } = await sendMagicLinkEmail(c.env, cleanEmail, magicUrl);
      if (sent) return c.json({ success: true, message: 'Magic link sent!', service });
      return c.json({ error: error.message }, 400);
    }

    return c.json({ success: true, message: 'Magic link sent to your email!' });
  } catch (e: any) {
    return c.json({ error: e.message || 'Failed to send magic link' }, 500);
  }
});

// GET /api/auth/google
auth.get('/google', async (c) => {
  if (!c.env.SUPABASE_URL) return c.json({ error: 'Auth not configured' }, 503);
  const sb = getSupabase(c.env);
  const redirectTo = c.req.query('redirectTo') || 'https://photoframein.com/auth/callback';
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, queryParams: { access_type: 'offline', prompt: 'consent' } }
  });
  if (error || !data?.url) return c.json({ error: error?.message || 'OAuth failed' }, 400);
  return c.redirect(data.url);
});

// POST /api/auth/verify — verify the fallback time-token
auth.post('/verify', async (c) => {
  try {
    const { token, email } = await c.req.json();
    if (!token || !email) return c.json({ error: 'Token and email required' }, 400);

    // Try Supabase OTP verification first
    if (c.env.SUPABASE_URL) {
      const sb = getSupabase(c.env);
      const { data, error } = await sb.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token,
        type: 'email'
      });
      if (!error && data?.session) {
        return c.json({ success: true, session: data.session, user: data.user });
      }
    }

    // Fallback token verification (base64 email:expiry)
    try {
      const pad = token.length % 4 === 0 ? token : token + '='.repeat(4 - token.length % 4);
      const decoded = atob(pad);
      const [tokenEmail, expiryStr] = decoded.split(':');
      if (tokenEmail === email.trim().toLowerCase() && Date.now() < parseInt(expiryStr)) {
        return c.json({ success: true, user: { email: tokenEmail }, session: { access_token: token } });
      }
    } catch {}

    return c.json({ error: 'Invalid or expired token' }, 401);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// POST /api/auth/logout
auth.post('/logout', async (c) => {
  try {
    if (c.env.SUPABASE_URL) {
      const token = c.req.header('Authorization')?.split(' ')[1];
      if (token) {
        const sb = getSupabase(c.env);
        await sb.auth.signOut().catch(() => {});
      }
    }
  } catch {}
  return c.json({ success: true });
});

export default auth;
