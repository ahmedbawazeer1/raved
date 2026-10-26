import { RECOMMENDATION_MAX_BYTES, RECOMMENDATION_TYPES } from "./options";

/** Target size for compressed photos: well under the 2MB limit to save the student's data. */
const TARGET_BYTES = 800 * 1024;

export interface PreparedFile {
  blob: Blob;
  name: string;
  type: string;
  extension: string;
}

export type PrepareResult = { ok: true; file: PreparedFile } | { ok: false; error: string };

export function validateRecommendationFile(file: { type: string; size: number }): string | null {
  if (!(RECOMMENDATION_TYPES as readonly string[]).includes(file.type) && !file.type.startsWith("image/")) {
    return "اختر صورة (JPG أو PNG) أو ملف PDF.";
  }
  if (file.type === "application/pdf" && file.size > RECOMMENDATION_MAX_BYTES) {
    return "ملف PDF أكبر من 2MB. صوّر الورقة بالهاتف بدلاً منه.";
  }
  return null;
}

/** Resizes and re-encodes a photo as JPEG in the browser until it is small enough. */
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const attempts: [number, number][] = [
    [1600, 0.8],
    [1400, 0.7],
    [1200, 0.6],
    [1000, 0.55],
  ];
  let best: Blob | null = null;
  for (const [maxSide, quality] of attempts) {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob) best = blob;
    if (blob && blob.size <= TARGET_BYTES) break;
  }
  bitmap.close();
  if (!best) throw new Error("compress_failed");
  return best;
}

export async function prepareRecommendationFile(file: File): Promise<PrepareResult> {
  const invalid = validateRecommendationFile(file);
  if (invalid) return { ok: false, error: invalid };

  if (file.type === "application/pdf") {
    return { ok: true, file: { blob: file, name: file.name, type: file.type, extension: "pdf" } };
  }

  try {
    const blob = await compressImage(file);
    if (blob.size > RECOMMENDATION_MAX_BYTES) return { ok: false, error: "الصورة كبيرة جداً حتى بعد الضغط. صوّرها من مسافة أقرب." };
    const base = file.name.replace(/\.[^.]+$/, "") || "recommendation";
    return { ok: true, file: { blob, name: `${base}.jpg`, type: "image/jpeg", extension: "jpg" } };
  } catch {
    // Some old browsers cannot decode the photo; upload as-is if small enough.
    if (file.size <= RECOMMENDATION_MAX_BYTES) {
      const ext = file.type.split("/")[1] ?? "jpg";
      return { ok: true, file: { blob: file, name: file.name, type: file.type, extension: ext } };
    }
    return { ok: false, error: "تعذر تجهيز الصورة. جرّب صورة أخرى أو ملف PDF." };
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
