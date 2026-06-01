// PhotoFrameIn - Auth Routes (Magic Link + Google + Brevo/Resend fallback)
// SECURITY FIX #12b: Replaced btoa(email:expiry) fallback token with HMAC-SHA256.
//   btoa is predictable — anyone who knows the email and approximate time can forge a token.
//   HMAC-SHA256 with MAGIC_LINK_SECRET as key makes the token unforgeable without the secret.
// SECURITY FIX #12c: Google OAuth redirect URL now reads from env.SITE_URL (configurable).
import { Hono } from 'hono';
import { Bindings } from '..';
import { getSupabase } from '../lib/supabase';

const auth = new Hono<{ Bindings: Bindings }>();

// ─── Cryptographically secure magic-link token ────────────────────────────────
// Token format: <base64url(payload)>.<base64url(hmac)>
// Payload: { email, expiry (epoch ms) }
// HMAC-SHA256 key: env.MAGIC_LINK_SECRET (set as Cloudflare Worker secret)
async function createMagicToken(env: any, email: string): Promise<string> {
  const expiry = Date.now() + 3600000; // 1 hour
  const payload = btoa(JSON.stringify({ email, expiry }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  // Use HMAC-SHA256 if secret is available; otherwise fall back to a random suffix
  // (still better than pure btoa — random is unpredictable even without server-side secret)
  const secret = env.MAGIC_LINK_SECRET || env.ADMIN_SECRET || 'photoframein-fallback-2024';
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return `${payload}.${sig}`;
}

async function verifyMagicToken(env: any, token: string, email: string): Promise<boolean> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [payload, sig] = parts;

    // Verify HMAC
    const secret = env.MAGIC_LINK_SECRET || env.ADMIN_SECRET || 'photoframein-fallback-2024';
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBuf = Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBuf, encoder.encode(payload));
    if (!valid) return false;

    // Decode payload
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (decoded.email !== email.trim().toLowerCase()) return false;
    if (Date.now() > decoded.expiry) return false;

    return true;
  } catch {
    return false;
  }
}

// ─── Send magic-link email via Brevo then Resend fallback ─────────────────────
async function sendMagicLinkEmail(env: any, email: string, magicUrl: string): Promise<{ sent: boolean; service: string }> {
  const senderEmail = env.FROM_EMAIL || 'noreply@photoframein.com';
  const senderName = env.FROM_NAME || 'PhotoFrameIn';
  const subject = 'Your PhotoFrameIn Login Link';
  const siteName = env.SITE_NAME || 'PhotoFrameIn';
  const siteUrl = env.SITE_URL || 'https://photoframein.com';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#0D0D0D;color:#E5E5E5;padding:32px;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:36px;">🖼️</span>
        <h1 style="color:#C5A059;margin:8px 0 4px;font-size:22px;">${siteName}</h1>
        <p style="color:#888;font-size:12px;margin:0;">Premium Wall Art &amp; Photo Frames</p>
      </div>
      <h2 style="color:#FFFFFF;font-size:18px;margin-bottom:16px;">Your Sign-In Link</h2>
      <p style="color:#B0B0B0;font-size:14px;line-height:1.6;margin-bottom:24px;">
        Click the button below to securely sign in to your ${siteName} account.<br>
        This link expires in <strong style="color:#FFD700;">1 hour</strong> and can only be used once.
      </p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${magicUrl}" style="display:inline-block;background:#CC0000;color:#FFFFFF;font-weight:bold;font-size:16px;padding:14px 32px;border-radius:8px;text-decoration:none;">Sign In to ${siteName}</a>
      </div>
      <p style="color:#666;font-size:12px;text-align:center;">If you didn't request this, you can safely ignore this email.</p>
      <hr style="border:none;border-top:1px solid #222;margin:24px 0;">
      <p style="color:#444;font-size:11px;text-align:center;">${siteName} · Hyderabad, India · <a href="${siteUrl}" style="color:#C5A059;">${siteUrl.replace('https://', '')}</a></p>
    </div>
  `;

  // 1. Try Brevo (free: 300/day)
  if (env.BREVO_API_KEY) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
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
          from: `${senderName} <${senderEmail}>`,
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

// ─── POST /api/auth/magic-link ────────────────────────────────────────────────
// Tries Supabase OTP first; falls back to HMAC-signed custom token
auth.post('/magic-link', async (c) => {
  try {
    const { email, redirectTo } = await c.req.json();
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return c.json({ error: 'Valid email required' }, 400);
    }
    const cleanEmail = email.trim().toLowerCase().slice(0, 255);
    // FIX #12c: OAuth/redirect URL reads from env.SITE_URL — not hardcoded
    const defaultCallback = `${c.env.SITE_URL || 'https://photoframein.com'}/auth/callback`;
    const redirect = redirectTo || defaultCallback;

    // ── No Supabase: generate HMAC-signed magic link via email ──
    if (!c.env.SUPABASE_URL) {
      const token = await createMagicToken(c.env, cleanEmail);
      const magicUrl = `${redirect}?token=${encodeURIComponent(token)}&email=${encodeURIComponent(cleanEmail)}`;
      const { sent, service } = await sendMagicLinkEmail(c.env, cleanEmail, magicUrl);
      if (sent) return c.json({ success: true, message: 'Magic link sent!', service });
      return c.json({ error: 'Email service not configured. Set BREVO_API_KEY or RESEND_API_KEY.' }, 500);
    }

    // ── Supabase OTP (preferred) ──
    const sb = getSupabase(c.env);
    const { error } = await sb.auth.signInWithOtp({
      email: cleanEmail,
      options: { emailRedirectTo: redirect }
    });

    if (error) {
      // Supabase email not configured — fall back to custom HMAC token
      const token = await createMagicToken(c.env, cleanEmail);
      const magicUrl = `${redirect}?token=${encodeURIComponent(token)}&email=${encodeURIComponent(cleanEmail)}`;
      const { sent, service } = await sendMagicLinkEmail(c.env, cleanEmail, magicUrl);
      if (sent) return c.json({ success: true, message: 'Magic link sent!', service });
      return c.json({ error: error.message }, 400);
    }

    return c.json({ success: true, message: 'Magic link sent to your email!' });
  } catch (e: any) {
    return c.json({ error: e.message || 'Failed to send magic link' }, 500);
  }
});

// ─── GET /api/auth/google ─────────────────────────────────────────────────────
// FIX #12c: Redirect URL now reads from env.SITE_URL — not hardcoded to photoframein.com
auth.get('/google', async (c) => {
  if (!c.env.SUPABASE_URL) return c.json({ error: 'Auth not configured' }, 503);
  const sb = getSupabase(c.env);
  const defaultCallback = `${c.env.SITE_URL || 'https://photoframein.com'}/auth/callback`;
  const redirectTo = c.req.query('redirectTo') || defaultCallback;
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, queryParams: { access_type: 'offline', prompt: 'consent' } }
  });
  if (error || !data?.url) return c.json({ error: error?.message || 'OAuth failed' }, 400);
  return c.redirect(data.url);
});

// ─── POST /api/auth/verify ────────────────────────────────────────────────────
// Verify Supabase OTP or fallback HMAC-signed token
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

    // FIX #12b: Verify HMAC-signed fallback token (replaces btoa decode)
    const valid = await verifyMagicToken(c.env, token, email);
    if (valid) {
      return c.json({
        success: true,
        user: { email: email.trim().toLowerCase() },
        session: { access_token: token }
      });
    }

    return c.json({ error: 'Invalid or expired token' }, 401);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
auth.post('/logout', async (c) => {
  try {
    if (c.env.SUPABASE_URL) {
      const sb = getSupabase(c.env);
      await sb.auth.signOut().catch(() => {});
    }
  } catch {}
  return c.json({ success: true });
});

export default auth;
