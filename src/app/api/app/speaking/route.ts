import { evaluateSpeaking } from "@/app/(student)/student/practice/actions";
import { appRoute, jsonBody } from "@/lib/api/app-route";

/** Evaluates a speaking task from its transcript (the audio itself is never sent here or stored). */
export async function POST(request: Request) {
  const body = await jsonBody(request);
  return appRoute(() => evaluateSpeaking(body as Parameters<typeof evaluateSpeaking>[0]));
}
