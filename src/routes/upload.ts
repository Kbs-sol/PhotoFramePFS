// PhotoFrameIn - Upload API Routes
import { Hono } from 'hono';
import { Bindings } from '..';

const upload = new Hono<{ Bindings: Bindings }>();

// GET /api/upload/sign — Get a signed upload URL for Cloudinary
upload.get('/sign', async (c) => {
  const cloudinaryUrl = c.env.CLOUDINARY_URL;
  if (!cloudinaryUrl) return c.json({ error: 'Cloudinary not configured' }, 500);

  // Parse URL: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
  const url = new URL(cloudinaryUrl);
  const cloudName = url.hostname;
  const apiKey = url.username;
  const apiSecret = url.password;

  const timestamp = Math.round(new Date().getTime() / 1000);
  const params = {
    timestamp,
    folder: 'custom_orders',
    upload_preset: 'custom_high_res' // Need to ensure this exists or use params only
  };

  // Create signature
  // param1=value1&param2=value2...SECRET
  const signatureString = `folder=${params.folder}&timestamp=${timestamp}${apiSecret}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(signatureString);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return c.json({
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder: params.folder
  });
});

export default upload;
