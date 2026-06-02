// PhotoFrameIn - Upload API Routes
// Handles signed Cloudinary uploads for both admin (products/media) and customer (custom frames)
import { Hono } from 'hono';
import { Bindings } from '..';

const upload = new Hono<{ Bindings: Bindings }>();

// ─── Helper: build sorted param string for Cloudinary signature ──────────────
// Cloudinary signature = SHA-1( sorted_params_string + api_secret )
// Params must be sorted alphabetically, joined as key=value&key=value
async function buildCloudinarySignature(
  params: Record<string, string | number>,
  apiSecret: string
): Promise<string> {
  // Sort keys alphabetically, exclude api_key and resource_type and file
  const sorted = Object.keys(params)
    .filter(k => !['api_key', 'resource_type', 'file'].includes(k))
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');

  const signatureString = sorted + apiSecret;
  const encoder = new TextEncoder();
  const data = encoder.encode(signatureString);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Parse Cloudinary credentials from env ───────────────────────────────────
function getCloudinaryCredentials(env: Bindings): {
  cloudName: string; apiKey: string; apiSecret: string;
} | null {
  // Prefer individual keys; fall back to CLOUDINARY_URL
  let cloudName = env.CLOUDINARY_CLOUD_NAME || '';
  let apiKey = env.CLOUDINARY_API_KEY || '';
  let apiSecret = env.CLOUDINARY_API_SECRET || '';

  if (!cloudName && env.CLOUDINARY_URL) {
    // Parse cloudinary://API_KEY:API_SECRET@CLOUD_NAME
    try {
      const url = new URL(env.CLOUDINARY_URL);
      cloudName = url.hostname;
      apiKey = url.username;
      apiSecret = decodeURIComponent(url.password);
    } catch {
      return null;
    }
  }

  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

// ─── GET /api/upload/sign ────────────────────────────────────────────────────
// Returns a signed payload for direct browser-to-Cloudinary upload.
// Query params:
//   folder  — target folder (default: 'products')
//   tags    — optional comma-separated tags
upload.get('/sign', async (c) => {
  const creds = getCloudinaryCredentials(c.env);
  if (!creds) {
    return c.json({
      error: 'Cloudinary not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET as Cloudflare secrets.'
    }, 500);
  }

  const folder = c.req.query('folder') || 'products';
  const tags = c.req.query('tags') || '';
  const timestamp = Math.round(Date.now() / 1000);

  // Build the params object — MUST match exactly what the frontend will send
  const params: Record<string, string | number> = {
    folder,
    timestamp,
  };
  if (tags) params.tags = tags;

  const signature = await buildCloudinarySignature(params, creds.apiSecret);

  return c.json({
    signature,
    timestamp,
    apiKey: creds.apiKey,
    cloudName: creds.cloudName,
    folder,
    ...(tags ? { tags } : {}),
  });
});

// ─── GET /api/upload/config ──────────────────────────────────────────────────
// Returns just the cloudName and apiKey for frontend usage (no secret)
upload.get('/config', async (c) => {
  const creds = getCloudinaryCredentials(c.env);
  if (!creds) return c.json({ configured: false }, 200);
  return c.json({ configured: true, cloudName: creds.cloudName, apiKey: creds.apiKey });
});

// ─── POST /api/upload/image ───────────────────────────────────────────────────
// FIX s1.3: Server-side base64 → Cloudinary upload for custom frame orders.
// Body: { dataUrl: "data:image/jpeg;base64,...", folder?: string, tags?: string[] }
// Returns: { secure_url, public_id, url }
upload.post('/image', async (c) => {
  const creds = getCloudinaryCredentials(c.env);
  if (!creds) {
    return c.json({ error: 'Cloudinary not configured on server.' }, 500);
  }

  let body: { dataUrl?: string; folder?: string; tags?: string[] };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { dataUrl, folder = 'chitraframe/custom-orders', tags = [] } = body;
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return c.json({ error: 'dataUrl must be a valid base64 data URL' }, 400);
  }

  // Enforce max size: ~5MB base64 (~3.75MB decoded)
  if (dataUrl.length > 7 * 1024 * 1024) {
    return c.json({ error: 'Image too large. Maximum 5MB.' }, 413);
  }

  const timestamp = Math.round(Date.now() / 1000);
  const params: Record<string, string | number> = { folder, timestamp };
  if (tags.length) params.tags = tags.join(',');

  const signature = await buildCloudinarySignature(params, creds.apiSecret);

  // Build multipart form for Cloudinary Upload API
  const formData = new FormData();
  formData.append('file', dataUrl);
  formData.append('folder', folder);
  formData.append('timestamp', String(timestamp));
  formData.append('api_key', creds.apiKey);
  formData.append('signature', signature);
  if (tags.length) formData.append('tags', tags.join(','));

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${creds.cloudName}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    console.error('[upload/image] Cloudinary error:', errText);
    return c.json({ error: 'Cloudinary upload failed', detail: errText }, 502);
  }

  const result = await uploadRes.json() as {
    secure_url: string; public_id: string; url: string;
    [key: string]: unknown;
  };

  return c.json({
    secure_url: result.secure_url,
    public_id: result.public_id,
    url: result.url,
  });
});

export default upload;
