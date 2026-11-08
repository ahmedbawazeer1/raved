/** The Supabase client type both apps pass to shared queries (web: server client, mobile: app client). */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db-types";

export type Db = SupabaseClient<Database>;
