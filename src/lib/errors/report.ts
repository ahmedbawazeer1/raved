/**
 * The free error log (BUILD_PROMPTS phase 7). A report is cleaned before it is stored: no
 * personal data (the message is redacted), the page is a path only, everything is cut short.
 * Unit tested.
 */
import { z } from "zod";
import { redact } from "@/lib/ai/redact";

export const errorReportSchema = z.object({
  message: z.string().min(1).max(5000),
  digest: z.string().max(200).optional(),
  page: z.string().max(2000).optional(),
});
export type ErrorReport = z.infer<typeof errorReportSchema>;

export interface CleanErrorReport {
  message: string;
  digest: string | null;
  page: string | null;
}

/** Path only: no origin, query string or hash (they can carry tokens or codes). Long ids become ":id". */
export function cleanPage(page: string | undefined): string | null {
  if (!page) return null;
  let path = page;
  try {
    path = new URL(page, "https://raved.local").pathname;
  } catch {
    return null;
  }
  path = path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id").slice(0, 200);
  return path.startsWith("/") ? path : null;
}

export function cleanErrorReport(input: ErrorReport): CleanErrorReport {
  const message = redact(input.message.replace(/\s+/g, " ").trim()).slice(0, 500) || "خطأ بلا وصف";
  const digest = input.digest?.replace(/[^\w-]/g, "").slice(0, 100) || null;
  return { message, digest, page: cleanPage(input.page) };
}

/** More than this many reports in ten minutes means a loop or abuse: the rest are dropped. */
export const ERROR_FLOOD_LIMIT = 200;
