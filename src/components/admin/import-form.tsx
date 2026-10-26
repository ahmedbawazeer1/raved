"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, CheckCircle2, FileJson, XCircle } from "lucide-react";
import { Alert, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { En } from "@/components/en";
import { checkOrImportUnit, type ImportState } from "@/app/(admin)/admin/content/actions";

export function ImportForm({ repoFiles }: { repoFiles: string[] }) {
  const [state, action] = useActionState<ImportState, FormData>(checkOrImportUnit, {});
  const [source, setSource] = useState<"repo" | "file">(repoFiles.length > 1 ? "repo" : "file");
  const [fileName, setFileName] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4 rounded-2xl border-2 border-dashed border-input bg-card p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-primary-tint text-primary">
            <FileJson className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-bold">استورد ملف وحدة</p>
            <p className="text-sm text-muted-foreground">
              من مجلد <En>content/</En> في المستودع، أو ملف من جهازك. نتحقق من البنية والقواعد تلقائياً.
            </p>
          </div>
        </div>
        <div className="flex gap-2" role="radiogroup" aria-label="مصدر الملف">
          {(["repo", "file"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={source === s}
              onClick={() => setSource(s)}
              className={`min-h-10 rounded-full px-4 text-sm font-semibold ${source === s ? "bg-primary-tint text-primary-hover" : "bg-muted text-subtle"}`}
            >
              {s === "repo" ? "من المستودع" : "من جهازي"}
            </button>
          ))}
        </div>
        {source === "repo" ? (
          <>
            <label htmlFor="repo_file" className="sr-only">
              ملف من المستودع
            </label>
            <Select id="repo_file" name="repo_file" defaultValue={repoFiles[0]}>
              {repoFiles.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </>
        ) : (
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 self-start rounded-xl border border-input bg-card px-4 text-[15px] font-semibold">
            <input type="file" name="file" accept="application/json,.json" className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
            {fileName || "اختر ملفاً"}
          </label>
        )}
        <div className="flex flex-wrap gap-2.5">
          <SubmitButton name="intent" value="check" variant="secondary" pendingLabel="جارٍ الفحص…">
            افحص فقط
          </SubmitButton>
          <SubmitButton name="intent" value="import" pendingLabel="جارٍ الاستيراد…">
            افحص واستورد
          </SubmitButton>
        </div>
      </form>

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.checked && (
        <section className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5" aria-live="polite">
          {state.code && (
            <p className="text-sm text-muted-foreground">
              <En>
                {state.code} · {state.title}
              </En>{" "}
              · {state.sizeBytes ? `${Math.round(state.sizeBytes / 1024)}KB` : ""}
            </p>
          )}
          <h2 className="text-lg font-bold">نتيجة الفحص</h2>
          {state.ok && (
            <p className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-5 text-success" aria-hidden="true" /> البنية والقواعد سليمة.
            </p>
          )}
          {(state.errors ?? []).map((e, i) => (
            <p key={`e${i}`} className="flex items-start gap-2 text-sm">
              <XCircle className="mt-0.5 size-5 flex-none text-destructive" aria-hidden="true" />
              <span>
                {e.message} <En className="text-xs text-muted-foreground">{e.path}</En>
              </span>
            </p>
          ))}
          {(state.warnings ?? []).map((w, i) => (
            <p key={`w${i}`} className="flex items-start gap-2 text-sm">
              <AlertTriangle className="mt-0.5 size-5 flex-none text-warning" aria-hidden="true" />
              <span>
                {w.message} <En className="text-xs text-muted-foreground">{w.path}</En>
              </span>
            </p>
          ))}
          {!state.ok && (
            <p className="text-[13px] text-muted-foreground">
              لتصحيح خطأ: انسخ رسالة الفحص إلى Claude Code واطلب منه تعديل الملف، ثم استورده من جديد.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
