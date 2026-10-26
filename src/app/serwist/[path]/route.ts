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
  // Low-bandwidth: precache only the styles, logo and icon needed by the offline page.
  // Scripts and fonts are cached at runtime as each page is visited.
  globPatterns: [".next/static/**/*.css", "public/brand/raved-logo-green.svg", "public/icons/icon-192.png"],
  useNativeEsbuild: true,
});
