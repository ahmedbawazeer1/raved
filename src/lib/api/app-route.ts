import "server-only";
import { NextResponse } from "next/server";

/**
 * Wraps a student action for the mobile app (Authorization: Bearer <token>, see bearerToken()). The
 * actions are the same ones the website calls, so limits, redaction and logging stay in one place.
 * A redirect from the session check (signed out, not accepted) becomes a 401.
 */
export async function appRoute<T>(run: () => Promise<T>): Promise<NextResponse> {
  try {
    return NextResponse.json(await run());
  } catch (e) {
    const digest = (e as { digest?: unknown })?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json({ error: "سجّل الدخول من جديد." }, { status: 401 });
    }
    return NextResponse.json({ error: "حدث خطأ. حاول مرة أخرى." }, { status: 500 });
  }
}

export async function jsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
