import { askRoleplay } from "@/app/(student)/student/practice/actions";
import { appRoute, jsonBody } from "@/lib/api/app-route";

/** Role-play with the unit's Hadrami character, for the mobile app. */
export async function POST(request: Request) {
  const body = await jsonBody(request);
  return appRoute(() => askRoleplay(body as Parameters<typeof askRoleplay>[0]));
}
