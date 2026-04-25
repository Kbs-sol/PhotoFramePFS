// PhotoFrameIn - Supabase Client Library
import { createClient } from '@supabase/supabase-js';

export function getSupabase(env: any) {
  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY
  );
}

export function getSupabaseAnon(env: any) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}

// Generate Order ID: PS-YYMMDD-XXXX
export async function generateOrderId(env: any): Promise<string> {
  const sb = getSupabase(env);
  const now = new Date();
  const dateKey = now.toISOString().slice(2, 10).replace(/-/g, '');

  // Atomic increment
  const { data, error } = await sb.rpc('increment_order_sequence', {
    p_date_key: dateKey
  });

  // Fallback if RPC not available
  if (error) {
    const { data: existing } = await sb.from('order_sequence')
      .select('last_sequence').eq('date_key', dateKey).single();

    let seq = 1;
    if (existing) {
      seq = existing.last_sequence + 1;
      await sb.from('order_sequence').update({ last_sequence: seq }).eq('date_key', dateKey);
    } else {
      await sb.from('order_sequence').insert({ date_key: dateKey, last_sequence: 1 });
    }
    return `PS-${dateKey}-${String(seq).padStart(4, '0')}`;
  }

  return `PS-${dateKey}-${String(data).padStart(4, '0')}`;
}

// Get system config value
export async function getConfig(env: any, key: string): Promise<string | null> {
  const sb = getSupabase(env);
  const { data } = await sb.from('system_config').select('value').eq('key', key).single();
  return data?.value || null;
}

// Get multiple config values
export async function getConfigs(env: any, keys: string[]): Promise<Record<string, string>> {
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

// Log error
export async function logError(env: any, endpoint: string, method: string, error: string, stack?: string, body?: any) {
  const sb = getSupabase(env);
  const refId = `ERR-${Date.now().toString(36).toUpperCase()}`;
  await sb.from('error_log').insert({
    endpoint, method, error_message: error, stack_trace: stack,
    ref_id: refId, request_body: body
  });
  return refId;
}
