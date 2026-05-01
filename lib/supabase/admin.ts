import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

let _admin: SupabaseClient<Database> | null = null;

export function adminSupabase(): SupabaseClient<Database> {
  if (_admin) return _admin;
  _admin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return _admin;
}
