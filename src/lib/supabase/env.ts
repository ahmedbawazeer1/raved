import { z } from "zod";

const publicSchema = z.object({
  url: z.url({ message: "NEXT_PUBLIC_SUPABASE_URL is missing or not a URL" }),
  publishableKey: z.string().min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) is missing"),
});

export type SupabasePublicEnv = z.infer<typeof publicSchema>;

/**
 * Public Supabase settings (safe for the browser).
 * Values are read lazily so the app still builds before env vars are set in Vercel.
 * NEXT_PUBLIC_* must be written out in full so Next.js can inline them in the browser bundle.
 */
export function getSupabasePublicEnv(): SupabasePublicEnv {
  const parsed = publicSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    // The Supabase ↔ Vercel integration may set the legacy ANON_KEY name instead.
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    throw new Error(`Supabase is not configured: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
  }
  return parsed.data;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}
