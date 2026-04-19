import { createClient } from "@supabase/supabase-js";

let supabaseAdminClient: any = null;

function getSupabaseAdmin() {
  if (!supabaseAdminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      throw new Error(
        "Missing Supabase admin credentials. Please set 'NEXT_PUBLIC_SUPABASE_URL' and 'SUPABASE_SERVICE_ROLE_KEY'."
      );
    }

    supabaseAdminClient = createClient(
      url,
      serviceKey
    );
  }
  return supabaseAdminClient;
}

// Export as const for backward compatibility
export const supabaseAdmin: any = new Proxy({}, {
  get: (target, prop) => {
    const client = getSupabaseAdmin();
    const value = client[prop as keyof typeof client];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
