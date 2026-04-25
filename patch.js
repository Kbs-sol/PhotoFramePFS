const fs = require('fs');
const filepath = 'c:\\Users\\venka\\Documents\\VIIJAY\\Project-Repo\\photoframein-v1.0-complete\\photoframepfs\\src\\index.tsx';
let code = fs.readFileSync(filepath, 'utf8');

const errorHandlers = \
app.notFound((c) => {
  return c.html(\\\<!DOCTYPE html><html><head><title>404 - Not Found</title><link href="/static/styles.css" rel="stylesheet"></head><body style="background:#050505;color:#E5E5E5;text-align:center;padding-top:100px;font-family:Inter,sans-serif"><h1>404</h1><p>Page Not Found</p><a href="/" style="color:#C5A059;text-decoration:none">Return Home</a></body></html>\\\, 404);
});

app.onError(async (err, c) => {
  console.error('[Global Error]', err);
  const refId = 'ERR-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  try {
    if (c.env && c.env.SUPABASE_URL) {
      const { getSupabase } = require('./lib/supabase');
      const sb = getSupabase(c.env);
      await sb.from('error_log').insert({
        endpoint: c.req.path,
        method: c.req.method,
        error_message: err.message || String(err),
        ref_id: refId
      });
    }
  } catch (logErr) {
    console.error('Failed to log error to DB', logErr);
  }
  return c.html(\\\<!DOCTYPE html><html><head><title>500 - System Error</title><link href="/static/styles.css" rel="stylesheet"></head><body style="background:#050505;color:#E5E5E5;text-align:center;padding-top:100px;font-family:Inter,sans-serif"><h1>500 System Error</h1><p>System Error</p><p style="font-size:12px;color:#666">Ref: \</p></body></html>\\\, 500);
});
\;

code = code.replace(/app\\.use\\('\\/api\\/\\*', cors\\(\\)\\);\\r?\\n/, "app.use('/api/*', cors());\\n" + errorHandlers);

const oldColor1 = "bg: '#0D0D0D', card: '#1A1A1A', gold: '#FFD700'";
const newColor1 = "bg: '#050505', card: '#121212', gold: '#C5A059'";
code = code.replaceAll(oldColor1, newColor1);

const headInsert = '<link href="/static/styles.css" rel="stylesheet">';
const newHeadInsert = '<link href="/static/styles.css" rel="stylesheet">\\n  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>\\n  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>';
code = code.replace(headInsert, newHeadInsert);

fs.writeFileSync(filepath, code);
console.log('index.tsx patched successfully');