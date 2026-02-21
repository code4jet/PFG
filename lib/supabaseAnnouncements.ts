import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client specifically for Announcements feature
 * Uses separate Supabase project credentials
 */
export function getAnnouncementsSupabaseClient() {
  if (typeof window === "undefined") return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_APP_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_D_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase Announcements credentials. Please set:");
    console.error("- NEXT_PUBLIC_APP_SUPABASE_URL");
    console.error("- NEXT_PUBLIC_SUPABASE_ANON_D_KEY");
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}
