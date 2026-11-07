import type { Instrumentation } from "next";

let window = { start: 0, count: 0 };

/** Server errors also go to the admin's error log (same cleaning as browser reports). */
export const onRequestError: Instrumentation.onRequestError = async (error, request) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // At most 50 per server instance every 10 minutes (an error loop must not fill the table).
  const now = Date.now();
  if (now - window.start > 10 * 60 * 1000) window = { start: now, count: 0 };
  if (++window.count > 50) return;
  try {
    const [{ createAdminClient }, { cleanErrorReport }] = await Promise.all([import("@/lib/supabase/admin"), import("@/lib/errors/report")]);
    const err = error as Error & { digest?: string };
    const report = cleanErrorReport({
      message: `${err.name ?? "Error"}: ${err.message ?? String(error)}`.slice(0, 5000),
      digest: err.digest,
      page: request.path,
    });
    await createAdminClient().from("app_errors").insert({ source: "server", message: report.message, digest: report.digest, page: report.page });
  } catch {
    // Logging must never break anything.
  }
};
