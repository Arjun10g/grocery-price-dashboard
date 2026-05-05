import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set",
  );
}

// Untyped client — we keep TS lightweight by casting at the
// consumer using the exported types from `lib/database.types.ts`.
// Regenerate full Database types via `supabase gen types
// typescript --linked` if/when the schema settles further.
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});
