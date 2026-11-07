import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ERROR_FLOOD_LIMIT, cleanErrorReport, errorReportSchema } from "@/lib/errors/report";

/** Receives error reports from the browser (error pages and unexpected script errors). Always answers 204. */
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 8000) return new NextResponse(null, { status: 204 });
    const parsed = errorReportSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return new NextResponse(null, { status: 204 });
    const report = cleanErrorReport(parsed.data);

    const admin = createAdminClient();
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await admin.from("app_errors").select("id", { count: "exact", head: true }).gte("created_at", since);
    if ((count ?? 0) >= ERROR_FLOOD_LIMIT) return new NextResponse(null, { status: 204 });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await admin.from("app_errors").insert({
      source: "client",
      user_id: user?.id ?? null,
      message: report.message,
      digest: report.digest,
      page: report.page,
      user_agent: (request.headers.get("user-agent") ?? "").slice(0, 300) || null,
    });
  } catch {
    // Logging must never break anything.
  }
  return new NextResponse(null, { status: 204 });
}
