// Server-only Supabase client + config helpers.
// Ported from PhotoFramePFS (Hono/Cloudflare) → TanStack Start server functions.
// Reads config from process.env (populated by Cloudflare Pages env / .env in dev).
// IMPORTANT: never import this from a client component — it is server-only.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;
let _anonClient: SupabaseClient | null = null;

export function hasSupabase(): boolean {
  return Boolean(process.env.SUPABASE_URL);
}

/** Service-role client (server-side privileged). */
export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE: SUPABASE_URL and a key are required");
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

/** Anon client (used for auth flows). */
export function getSupabaseAnon(): SupabaseClient {
  if (_anonClient) return _anonClient;
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_ANON_KEY!;
  _anonClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _anonClient;
}

// ─── Order ID: PS-YYMMDD-XXXX ────────────────────────────────────────────────
export async function generateOrderId(): Promise<string> {
  const sb = getSupabase();
  const now = new Date();
  const dateKey = now.toISOString().slice(2, 10).replace(/-/g, "");

  const { data, error } = await sb.rpc("increment_order_sequence", {
    p_date_key: dateKey,
  });
  if (!error && data) {
    return `PS-${dateKey}-${String(data).padStart(4, "0")}`;
  }

  try {
    const { data: upserted } = await sb
      .from("order_sequence")
      .upsert(
        { date_key: dateKey, last_sequence: 1 },
        { onConflict: "date_key", ignoreDuplicates: false },
      )
      .select("last_sequence")
      .single();
    if (upserted?.last_sequence) {
      return `PS-${dateKey}-${String(upserted.last_sequence).padStart(4, "0")}`;
    }
  } catch {
    /* fall through */
  }

  const tsSuffix = Date.now().toString(36).slice(-4).toUpperCase();
  return `PS-${dateKey}-${tsSuffix}`;
}

// ─── Config helpers ──────────────────────────────────────────────────────────
export async function getConfig(key: string): Promise<string | null> {
  if (!hasSupabase()) return null;
  const sb = getSupabase();
  const { data } = await sb.from("system_config").select("value").eq("key", key).single();
  return (data?.value as string) || null;
}

export async function getConfigs(keys: string[]): Promise<Record<string, string>> {
  if (!hasSupabase()) return {};
  const sb = getSupabase();
  const { data } = await sb.from("system_config").select("key, value").in("key", keys);
  const config: Record<string, string> = {};
  data?.forEach((row: any) => {
    config[row.key] = row.value;
  });
  return config;
}

export async function setConfig(key: string, value: string): Promise<void> {
  const sb = getSupabase();
  await sb.from("system_config").upsert({ key, value, updated_at: new Date().toISOString() });
}

export async function logError(
  endpoint: string,
  method: string,
  error: string,
  stack?: string,
  body?: any,
): Promise<string> {
  try {
    const sb = getSupabase();
    const refId = `ERR-${Date.now().toString(36).toUpperCase()}`;
    await sb.from("error_log").insert({
      endpoint,
      method,
      error_message: error,
      stack_trace: stack,
      ref_id: refId,
      request_body: body,
    });
    return refId;
  } catch {
    return `ERR-LOCAL-${Date.now().toString(36).toUpperCase()}`;
  }
}
