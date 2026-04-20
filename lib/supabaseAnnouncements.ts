import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseClientPromise: SupabaseClient | null = null;

/**
 * Supabase client specifically for Announcements feature
 * Uses separate Supabase project credentials
 */
export function getAnnouncementsSupabaseClient() {
  if (typeof window === "undefined") return null;

  if (supabaseClientPromise) return supabaseClientPromise;

  // Uses unified Supabase project env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase Announcements credentials. Please set:");
    console.error("- NEXT_PUBLIC_SUPABASE_URL");
    console.error("- NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return null;
  }

  supabaseClientPromise = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClientPromise;
}
