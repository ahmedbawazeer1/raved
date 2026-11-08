import { askAssistant } from "@/app/(student)/student/practice/actions";
import { appRoute, jsonBody } from "@/lib/api/app-route";

/** The lesson assistant for the mobile app (same limits and rules as the website). */
export async function POST(request: Request) {
  const body = await jsonBody(request);
  return appRoute(() => askAssistant(body as Parameters<typeof askAssistant>[0]));
}
