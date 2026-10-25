import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createSerwistRoute } from "@serwist/turbopack";

// Changes on every deploy so the offline page is re-cached.
const revision =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  (spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() || randomUUID());

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: true,
});
