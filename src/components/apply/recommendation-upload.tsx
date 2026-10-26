"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { formatBytes, prepareRecommendationFile } from "@/lib/apply/compress";
import { attachRecommendation } from "@/app/(auth)/apply/actions";

export interface UploadedFile {
  name: string;
  size: number;
}

type Phase = "idle" | "preparing" | "uploading" | "done" | "error";

async function uploadWithRetry(path: string, blob: Blob, contentType: string, tries = 3): Promise<string | null> {
  const supabase = createClient();
  let lastError = "";
  for (let attempt = 1; attempt <= tries; attempt++) {
    const { error } = await supabase.storage.from("recommendations").upload(path, blob, { contentType, upsert: false });
    if (!error) return null;
    lastError = error.message;
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
  return lastError || "upload_failed";
}

export function RecommendationUpload({
  userId,
  initial,
  error,
  disabled,
}: {
  userId: string;
  initial: UploadedFile | null;
  error?: string;
  disabled?: boolean;
}) {
  const [file, setFile] = useState<UploadedFile | null>(initial);
  const [phase, setPhase] = useState<Phase>(initial ? "done" : "idle");
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(selected: File) {
    setMessage(null);
    setPhase("preparing");
    const prepared = await prepareRecommendationFile(selected);
    if (!prepared.ok) {
      setPhase(file ? "done" : "error");
      setMessage(prepared.error);
      return;
    }
    setPhase("uploading");
    const path = `${userId}/recommendation-${Date.now()}.${prepared.file.extension}`;
    const uploadError = await uploadWithRetry(path, prepared.file.blob, prepared.file.type);
    if (uploadError) {
      setPhase(file ? "done" : "error");
      setMessage(navigator.onLine ? "تعذر رفع الملف. حاول مرة أخرى." : "لا يوجد اتصال. ارفع الملف عند عودة الإنترنت.");
      return;
    }
    const attached = await attachRecommendation({ path, name: prepared.file.name, size: prepared.file.blob.size });
    if (!attached.ok) {
      setPhase(file ? "done" : "error");
      setMessage(attached.error ?? "تعذر حفظ الملف.");
      return;
    }
    if (attached.previousPath && attached.previousPath !== path) {
      // Best effort: remove the replaced file so it does not linger in storage.
      void createClient().storage.from("recommendations").remove([attached.previousPath]);
    }
    setFile({ name: prepared.file.name, size: prepared.file.blob.size });
    setPhase("done");
  }

  const busy = phase === "preparing" || phase === "uploading";
  const ext = file?.name.split(".").pop()?.toUpperCase() ?? "";

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold" id="rec-label">
        توصية من أحد معلميك <span className="text-destructive">*</span>
      </p>
      <p className="text-[13px] leading-relaxed text-muted-foreground" id="rec-hint">
        رسالة قصيرة من معلم في مدرستك تقول إنك جاد في التعلم. تكفي صورة واضحة بالهاتف لورقة موقّعة، أو ملف PDF. الحد 2MB،
        ولا يراها إلا فريق الإدارة.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        aria-labelledby="rec-label"
        aria-describedby="rec-hint"
        disabled={disabled || busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void handleFile(f);
        }}
      />

      {file && !busy ? (
        <div className="flex items-center gap-3 rounded-xl border border-input bg-card px-3.5 py-3">
          <span className="flex size-[42px] flex-none items-center justify-center rounded-[10px] bg-success-tint font-en text-[11px] font-bold text-success">
            {ext || "FILE"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(file.size)} · تم الرفع</p>
          </div>
          <Button type="button" variant="secondary" size="sm" className="min-h-9" disabled={disabled} onClick={() => inputRef.current?.click()}>
            تغيير
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="min-h-13 w-full border-dashed"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {phase === "preparing" ? "جارٍ تصغير الصورة…" : phase === "uploading" ? "جارٍ الرفع…" : "صوّر التوصية أو اختر ملفاً"}
        </Button>
      )}

      {(message || error) && (
        <p role="alert" className="text-[13px] font-medium text-destructive">
          {message ?? error}
        </p>
      )}
      <Link href="/apply/recommendation-template" target="_blank" className="text-[13px]">
        نموذج توصية جاهز يمكن أن تطبعه لمعلمك
      </Link>
    </div>
  );
}
