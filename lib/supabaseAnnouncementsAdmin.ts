import { createClient } from "@supabase/supabase-js";

let supabaseAnnouncementsAdminClient: any = null;

/**
 * Admin Supabase client specifically for Announcements feature
 * Uses separate Supabase project credentials with service role key
 */
function getSupabaseAnnouncementsAdmin() {
  if (!supabaseAnnouncementsAdminClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_APP_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_ANNOUNCEMENTS_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase Announcements Admin credentials. Please set:");
      console.error("- NEXT_PUBLIC_APP_SUPABASE_URL");
      console.error(
        "- SUPABASE_ANNOUNCEMENTS_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY)"
      );
      return null;
    }

    supabaseAnnouncementsAdminClient = createClient(supabaseUrl, serviceRoleKey);
  }
  return supabaseAnnouncementsAdminClient;
}

// Export as const for backward compatibility
export const supabaseAnnouncementsAdmin: any = new Proxy({}, {
  get: (target, prop) => {
    const client = getSupabaseAnnouncementsAdmin();
    if (!client) return undefined;
    return client[prop];
  },
});
