"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** No connection: a calm message, never blame. What the student saved is sent when the connection returns. */
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-30 flex items-center gap-2 bg-[#12201D] px-4 py-2 text-sm text-white motion-safe:animate-[sheet-up_.3s_ease-out]"
    >
      <WifiOff className="size-4 flex-none" aria-hidden="true" />
      <span>
        <b>لا يوجد اتصال.</b> ما حفظته لن يضيع، وسنرسله عندما يعود الاتصال.
      </span>
    </div>
  );
}
