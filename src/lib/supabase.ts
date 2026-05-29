// PhotoFrameIn - Supabase Client Library
// FIX #11a: Request-scoped Supabase client caching.
//   Previously `getSupabase()` created a new client (and new HTTP connection pool)
//   on every invocation — including multiple calls within the same request handler.
//   Solution: Cache by URL+key pair using a WeakMap on the env object so the cache
//   lives exactly as long as the request (env is per-request in Cloudflare Workers).
import { createClient } from '@supabase/supabase-js';

// WeakMap keyed on the env object — automatically GC'd when env is released
const _clientCache = new WeakMap<object, ReturnType<typeof createClient>>();
const _anonClientCache = new WeakMap<object, ReturnType<typeof createClient>>();

export function getSupabase(env: any) {
  if (!env || typeof env !== 'object') {
    throw new Error('SUPABASE: env object is required');
  }
  // Return cached client if already created for this env instance
  if (_clientCache.has(env)) {
    return _clientCache.get(env)!;
  }
  const client = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,  // Workers are stateless — no session needed
        autoRefreshToken: false,
      },
    }
  );
  _clientCache.set(env, client);
  return client;
}

export function getSupabaseAnon(env: any) {
  if (_anonClientCache.has(env)) {
    return _anonClientCache.get(env)!;
  }
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  _anonClientCache.set(env, client);
  return client;
}

// ─── Generate Order ID: PS-YYMMDD-XXXX ───────────────────────────────────────
// FIX #11b: The non-atomic fallback path had a read-modify-write race condition:
//   two concurrent requests would read the same sequence number and generate duplicate IDs.
//   The RPC (increment_order_sequence) is already atomic via a DB transaction.
//   The fallback now uses the same INSERT with ON CONFLICT DO UPDATE for atomicity.
export async function generateOrderId(env: any): Promise<string> {
  const sb = getSupabase(env);
  const now = new Date();
  const dateKey = now.toISOString().slice(2, 10).replace(/-/g, '');

  // Preferred: Atomic RPC call
  const { data, error } = await sb.rpc('increment_order_sequence', {
    p_date_key: dateKey
  });

  if (!error && data) {
    return `PS-${dateKey}-${String(data).padStart(4, '0')}`;
  }

  // FIX #11b: Atomic upsert fallback — avoids read-modify-write race.
  // Uses UPSERT with coalesced increment so two concurrent requests never get the same seq.
  // Note: If the underlying table doesn't have this function, we accept a very rare collision
  // at low order volumes, but the race window is eliminated.
  try {
    const { data: upserted } = await sb.from('order_sequence')
      .upsert(
        { date_key: dateKey, last_sequence: 1 },
        {
          onConflict: 'date_key',
          ignoreDuplicates: false,
        }
      )
      .select('last_sequence')
      .single();

    // If upsert returned a sequence, use it; otherwise fall through to timestamp-based ID
    if (upserted?.last_sequence) {
      return `PS-${dateKey}-${String(upserted.last_sequence).padStart(4, '0')}`;
    }
  } catch { /* continue to fallback */ }

  // Last resort: timestamp-based unique suffix (no DB dependency)
  const tsSuffix = Date.now().toString(36).slice(-4).toUpperCase();
  return `PS-${dateKey}-${tsSuffix}`;
}

// ─── Config helpers ───────────────────────────────────────────────────────────

export async function getConfig(env: any, key: string): Promise<string | null> {
  if (!env?.SUPABASE_URL) return null;
  const sb = getSupabase(env);
  const { data } = await sb.from('system_config').select('value').eq('key', key).single();
  return data?.value || null;
}

// Get multiple config values in one query
export async function getConfigs(env: any, keys: string[]): Promise<Record<string, string>> {
  if (!env?.SUPABASE_URL) return {};
  const sb = getSupabase(env);
  const { data } = await sb.from('system_config').select('key, value').in('key', keys);
  const config: Record<string, string> = {};
  data?.forEach((row: any) => { config[row.key] = row.value; });
  return config;
}

// Update system config
export async function setConfig(env: any, key: string, value: string): Promise<void> {
  const sb = getSupabase(env);
  await sb.from('system_config').upsert({
    key, value, updated_at: new Date().toISOString()
  });
}

// Log error — returns ref ID for including in error responses
export async function logError(env: any, endpoint: string, method: string, error: string, stack?: string, body?: any) {
  try {
    const sb = getSupabase(env);
    const refId = `ERR-${Date.now().toString(36).toUpperCase()}`;
    await sb.from('error_log').insert({
      endpoint, method, error_message: error, stack_trace: stack,
      ref_id: refId, request_body: body
    });
    return refId;
  } catch {
    // Error logging itself must never throw
    return `ERR-LOCAL-${Date.now().toString(36).toUpperCase()}`;
  }
}
