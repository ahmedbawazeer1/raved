import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static files, images, the service worker and PWA assets.
    "/((?!_next/static|_next/image|serwist|icons|brand|favicon.ico|icon.svg|manifest.webmanifest|~offline|.*\\.(?:png|jpg|jpeg|svg|webp|ico|js|css|txt)$).*)",
  ],
};
