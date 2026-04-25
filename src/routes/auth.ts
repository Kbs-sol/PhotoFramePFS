import { Hono } from 'hono';
import { Bindings } from '..';
import { getSupabase } from '../lib/supabase';

const auth = new Hono<{ Bindings: Bindings }>();

// POST /api/auth/magic-link
auth.post('/magic-link', async (c) => {
  const { email, redirectTo } = await c.req.json();
  const sb = getSupabase(c.env);
  
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo || 'https://photoframein.com/auth/callback'
    }
  });

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ success: true, message: 'Magic link sent!' });
});

// GET /api/auth/google
auth.get('/google', async (c) => {
  const sb = getSupabase(c.env);
  const redirectTo = c.req.query('redirectTo') || 'https://photoframein.com/auth/callback';
  
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  });

  if (error) return c.json({ error: error.message }, 400);
  return c.redirect(data.url);
});

export default auth;
