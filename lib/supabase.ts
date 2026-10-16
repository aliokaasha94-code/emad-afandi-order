import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    configured:
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

export function supabaseBrowser(): SupabaseClient | null {
  const { url, anonKey, configured } = getSupabaseEnv();
  if (!configured) return null;
  if (browserClient) return browserClient;
  browserClient = createClient(url, anonKey);
  return browserClient;
}

export function supabaseServer(): SupabaseClient | null {
  const { url, anonKey, serviceKey, configured } = getSupabaseEnv();
  if (!configured) return null;
  // Prefer service role on server when available (webhooks, issue).
  return createClient(url, serviceKey || anonKey, {
    auth: { persistSession: false },
  });
}
