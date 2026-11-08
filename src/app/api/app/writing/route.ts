import { submitWriting } from "@/app/(student)/student/practice/actions";
import { appRoute, jsonBody } from "@/lib/api/app-route";

/** A writing task sent from the mobile app (saved, then evaluated when the AI is available). */
export async function POST(request: Request) {
  const body = await jsonBody(request);
  return appRoute(() => submitWriting(body as Parameters<typeof submitWriting>[0]));
}
