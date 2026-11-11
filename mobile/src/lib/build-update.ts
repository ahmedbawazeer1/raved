import Constants from "expo-constants";
import { useEffect, useState } from "react";

/** Where every build is published (the "android" release): the APK and the number of the latest build. */
export const APK_URL = "https://github.com/ahmedbawazeer1/raved/releases/download/android/raved.apk";
const LATEST_URL = "https://github.com/ahmedbawazeer1/raved/releases/download/android/build.txt";

/** This installed build (CI's run number + 100). */
export const BUILD_CODE = Number((Constants.expoConfig?.extra as { buildCode?: number } | undefined)?.buildCode ?? 0);

/** True when a newer build than the installed one has been published. Offline or unknown → false. */
export function useNewerBuild(): boolean {
  const [newer, setNewer] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch(`${LATEST_URL}?t=${Date.now()}`)
      .then((r) => (r.ok ? r.text() : ""))
      .then((t) => {
        const latest = Number(t.trim());
        if (alive && BUILD_CODE > 0 && Number.isFinite(latest) && latest > BUILD_CODE) setNewer(true);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return newer;
}
