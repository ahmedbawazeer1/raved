import { transcribeRecording } from "@/app/(student)/student/practice/actions";
import { appRoute } from "@/lib/api/app-route";

/** Speech to text for the mobile app: the recording is forwarded once and never stored. */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => new FormData());
  return appRoute(() => transcribeRecording(form));
}
