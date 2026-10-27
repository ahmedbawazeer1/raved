import { NextResponse, type NextRequest } from "next/server";
import { listStudents, parseStudentFilters, STUDENT_STATUS_AR } from "@/lib/admin/students";
import { getSessionContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { gradeLabel } from "@/lib/yemen";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  // Quote, and neutralise spreadsheet formulas.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

/** CSV of the filtered students, without phone numbers. Admins only. */
export async function GET(request: NextRequest) {
  const ctx = await getSessionContext();
  if (ctx?.profile?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const filters = parseStudentFilters(Object.fromEntries(request.nextUrl.searchParams));
  const [students, { data: governorates }] = await Promise.all([
    listStudents(filters, 5000),
    (await createClient()).from("governorates").select("code, name_ar"),
  ]);
  const gov = new Map((governorates ?? []).map((g) => [g.code, g.name_ar]));
  const lines = [
    ["الاسم", "البريد", "المحافظة", "الصف", "المستوى", "الحالة", "تاريخ الانضمام"].map(cell).join(","),
    ...students.map((s) =>
      [s.full_name, s.email, (s.governorate && gov.get(s.governorate)) || "", gradeLabel(s.grade), s.level ?? "", STUDENT_STATUS_AR[s.status] ?? s.status, s.created_at.slice(0, 10)]
        .map(cell)
        .join(","),
    ),
  ];
  // BOM so Excel opens Arabic correctly.
  return new NextResponse(`﻿${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="raved-students.csv"',
      "Cache-Control": "no-store",
    },
  });
}
