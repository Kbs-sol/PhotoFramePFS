// Auth server functions — magic link (Supabase OTP + HMAC fallback) + verify + logout.
// Ported from PhotoFramePFS auth.ts.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function b64url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function b64urlDecode(s: string): string {
  return atob(s.replace(/-/g, "+").replace(/_/g, "/"));
}

async function hmacKey(secret: string, usage: KeyUsage[]) {
  return crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, usage,
  );
}

async function createMagicToken(email: string): Promise<string> {
  const expiry = Date.now() + 3600000;
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ email, expiry })));
  const secret = process.env.MAGIC_LINK_SECRET || process.env.ADMIN_SECRET || "chitraframe-fallback-2024";
  const key = await hmacKey(secret, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${b64url(new Uint8Array(sigBuf))}`;
}

async function verifyMagicToken(token: string, email: string): Promise<boolean> {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return false;
    const secret = process.env.MAGIC_LINK_SECRET || process.env.ADMIN_SECRET || "chitraframe-fallback-2024";
    const key = await hmacKey(secret, ["verify"]);
    const sigBytes = Uint8Array.from(b64urlDecode(sig), (ch) => ch.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));
    if (!valid) return false;
    const decoded = JSON.parse(b64urlDecode(payload));
    if (decoded.email !== email.trim().toLowerCase()) return false;
    if (Date.now() > decoded.expiry) return false;
    return true;
  } catch {
    return false;
  }
}

async function sendMagicLinkEmail(email: string, magicUrl: string): Promise<boolean> {
  const siteName = process.env.SITE_NAME || "ChitraFrame";
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;color:#1c1a17;padding:32px;border:1px solid #eee;border-radius:12px;">
      <h1 style="color:#7a1f1f;margin:0 0 4px;font-size:22px;">${siteName}</h1>
      <p style="color:#888;font-size:12px;margin:0 0 24px;">Framed wall art, made in India</p>
      <h2 style="font-size:18px;">Your sign-in link</h2>
      <p style="color:#555;font-size:14px;line-height:1.6;">Click below to sign in. Expires in 1 hour.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${magicUrl}" style="display:inline-block;background:#7a1f1f;color:#fff;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">Sign in to ${siteName}</a>
      </div>
      <p style="color:#999;font-size:12px;text-align:center;">If you didn't request this, ignore this email.</p>
    </div>`;
  const { sendEmail } = await import("./email.server");
  const res = await sendEmail({ to: email, subject: `Your ${siteName} login link`, html, type: "magic_link" });
  return res.success;
}

const emailInput = z.object({
  email: z.string().email().max(254),
  redirectTo: z.string().url().max(500).optional(),
});

export const magicLinkFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => emailInput.parse(d))
  .handler(async ({ data }) => {
    const cleanEmail = data.email.trim().toLowerCase().slice(0, 254);
    const siteUrl = process.env.SITE_URL || "https://frame-it.pages.dev";
    const redirect = data.redirectTo || `${siteUrl}/auth/callback`;

    const { hasSupabase, getSupabaseAnon } = await import("./supabase.server");
    if (hasSupabase()) {
      try {
        const sb = getSupabaseAnon();
        const { error } = await sb.auth.signInWithOtp({
          email: cleanEmail,
          options: { emailRedirectTo: redirect },
        });
        if (!error) return { ok: true as const, message: "Magic link sent to your email!", via: "supabase" };
      } catch { /* fall back */ }
    }

    const token = await createMagicToken(cleanEmail);
    const magicUrl = `${redirect}?token=${encodeURIComponent(token)}&email=${encodeURIComponent(cleanEmail)}`;
    const sent = await sendMagicLinkEmail(cleanEmail, magicUrl);
    if (sent) return { ok: true as const, message: "Magic link sent!", via: "email" };
    return { ok: false as const, error: "Email service not configured. Set BREVO_API_KEY or RESEND_API_KEY." };
  });

const verifyInput = z.object({
  token: z.string().max(600),
  email: z.string().email().max(254),
});

export const verifyMagicFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => verifyInput.parse(d))
  .handler(async ({ data }) => {
    const { hasSupabase, getSupabaseAnon } = await import("./supabase.server");
    if (hasSupabase()) {
      try {
        const sb = getSupabaseAnon();
        const { data: res, error } = await sb.auth.verifyOtp({
          email: data.email.trim().toLowerCase(),
          token: data.token,
          type: "email",
        });
        if (!error && res?.session) {
          return { ok: true as const, session: res.session, user: res.user };
        }
      } catch { /* fall back */ }
    }
    const valid = await verifyMagicToken(data.token, data.email);
    if (valid) {
      return {
        ok: true as const,
        user: { email: data.email.trim().toLowerCase() },
        session: { access_token: data.token },
      };
    }
    return { ok: false as const, error: "Invalid or expired token" };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const { hasSupabase, getSupabaseAnon } = await import("./supabase.server");
  try {
    if (hasSupabase()) await getSupabaseAnon().auth.signOut();
  } catch { /* ignore */ }
  return { ok: true as const };
});
