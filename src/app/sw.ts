/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// docs/OFFLINE.md: never cache admin pages, auth, onboarding (personal data) or AI/API calls.
const neverCache: RuntimeCaching[] = [
  {
    matcher: ({ url, sameOrigin }) =>
      sameOrigin &&
      ["/admin", "/preview/", "/api/", "/auth/", "/apply", "/login", "/signup", "/forgot", "/reset-password", "/placement", "/certificate/", "/student/settings/export"].some((p) =>
        url.pathname.startsWith(p),
      ),
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  // No navigation preload: it bypasses the worker when offline and made the fallback flaky.
  navigationPreload: false,
  runtimeCaching: [...neverCache, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
