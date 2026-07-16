import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Server-side Supabase client for server actions and Server Components.
 *
 * Uses the same anon key as the browser, not a service role: Pelli has no
 * accounts, so the server has no privileges the holder of a room code lacks.
 * Keeping it anon means the RLS policies are the single description of access.
 *
 * Created per call — server requests must not share auth/realtime state.
 */
export function createSupabaseServerClient(): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
