import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Daily (Vercel Cron): deletes teacher recommendation files 90 days after the admin's decision (APP-04).
 * Vercel sends "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set.
 * Without CRON_SECRET the job still only removes files that are already due, so calling it is harmless.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: due, error } = await supabase
    .from("applications")
    .select("id, recommendation_path")
    .in("status", ["approved", "rejected"])
    .lt("reviewed_at", cutoff)
    .is("recommendation_deleted_at", null)
    .not("recommendation_path", "is", null)
    .limit(200);
  if (error) return NextResponse.json({ error: "query_failed" }, { status: 500 });
  if (!due || due.length === 0) return NextResponse.json({ deleted: 0 });

  const { error: removeError } = await supabase.storage
    .from("recommendations")
    .remove(due.map((a) => a.recommendation_path!));
  if (removeError) return NextResponse.json({ error: "remove_failed" }, { status: 500 });

  await supabase
    .from("applications")
    .update({ recommendation_deleted_at: new Date().toISOString() })
    .in("id", due.map((a) => a.id));

  return NextResponse.json({ deleted: due.length });
}
