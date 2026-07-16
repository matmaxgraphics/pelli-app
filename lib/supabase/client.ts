import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Browser Supabase client, created once. Feature 3 subscribes to Realtime on
 * this same instance, so it must be a singleton — a second client would open a
 * second websocket.
 *
 * The anon key is public by design (it is shipped to the browser); RLS in
 * supabase/schema.sql is what actually governs access.
 */
let client: SupabaseClient | undefined;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: false },
    });
  }
  return client;
}
