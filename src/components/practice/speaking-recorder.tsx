"use client";

import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square } from "lucide-react";
import { Alert } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { evaluateSpeaking, transcribeRecording } from "@/app/(student)/student/practice/actions";

/** Minimal Web Speech API types (not in every TypeScript DOM lib). */
interface RecognitionResultList {
  length: number;
  [index: number]: { isFinal: boolean; 0: { transcript: string } };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: RecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Phase = "task" | "prep" | "recording" | "review";

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/**
 * Speaking task: preparation timer, then recording. Speech becomes text in the browser
 * (Web Speech API) or, if the browser can't, through Whisper on the server. Audio is held
 * in memory only until it is transcribed, then dropped; nothing is saved.
 */
export function SpeakingRecorder({
  lessonId,
  prepSeconds,
  maxSeconds,
  remaining,
}: {
  lessonId: string;
  prepSeconds: number;
  maxSeconds: number;
  remaining: number;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("task");
  const [seconds, setSeconds] = useState(0);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [method, setMethod] = useState<"browser" | "whisper">("browser");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const recognition = useRef<Recognition | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const recording = useRef(false);

  const clock = useRef(0);
  function resetClock() {
    clock.current = 0;
    setSeconds(0);
  }
  const onTick = useEffectEvent(() => {
    clock.current += 1;
    setSeconds(clock.current);
    if (phase === "prep" && clock.current >= prepSeconds) void startRecording();
    if (phase === "recording" && clock.current >= maxSeconds) stopRecording();
  });
  // One clock for both the preparation countdown and the recording.
  useEffect(() => {
    if (phase !== "prep" && phase !== "recording") return;
    const t = setInterval(onTick, 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(
    () => () => {
      recording.current = false;
      recognition.current?.abort();
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  function startPrep() {
    setError(null);
    resetClock();
    setPhase(prepSeconds > 0 ? "prep" : "recording");
    if (prepSeconds <= 0) void startRecording();
  }

  async function startRecording() {
    setError(null);
    setFinalText("");
    setInterim("");
    resetClock();
    setPhase("recording");
    recording.current = true;

    const Ctor = recognitionCtor();
    if (Ctor) {
      setMethod("browser");
      const r = new Ctor();
      r.lang = "en-US";
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        let done = "";
        let live = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) done += `${e.results[i][0].transcript} `;
          else live += e.results[i][0].transcript;
        }
        if (done) setFinalText((t) => `${t}${done}`);
        setInterim(live);
      };
      // Mobile browsers stop after a pause: keep listening until the student presses stop.
      r.onend = () => {
        if (recording.current) {
          try {
            r.start();
          } catch {
            /* already started */
          }
        }
      };
      r.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          recording.current = false;
          setError("اسمح للموقع باستخدام الميكروفون من إعدادات المتصفح، ثم حاول مرة أخرى.");
          setPhase("task");
        }
      };
      recognition.current = r;
      r.start();
      return;
    }

    // Fallback: record in memory and send once to Whisper.
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      recording.current = false;
      setError("متصفحك لا يدعم التسجيل. جرّب متصفح Chrome.");
      setPhase("task");
      return;
    }
    try {
      setMethod("whisper");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.start();
      recorder.current = rec;
    } catch {
      recording.current = false;
      setError("اسمح للموقع باستخدام الميكروفون من إعدادات المتصفح، ثم حاول مرة أخرى.");
      setPhase("task");
    }
  }

  function stopRecording() {
    if (!recording.current) return;
    recording.current = false;
    setPhase("review");
    if (recognition.current) {
      recognition.current.stop();
      recognition.current = null;
      return;
    }
    const rec = recorder.current;
    if (!rec) return;
    rec.onstop = () => {
      rec.stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
      chunks.current = [];
      recorder.current = null;
      startTransition(async () => {
        const form = new FormData();
        form.append("audio", blob, "speech.webm");
        const res = await transcribeRecording(form).catch(() => ({ error: "لا يوجد اتصال. سجّل مرة أخرى عند عودة الاتصال." }));
        if ("text" in res && res.text) setFinalText(res.text);
        else setError(res.error ?? "تعذر تحويل الكلام إلى نص.");
      });
    };
    rec.stop();
  }

  function send() {
    setError(null);
    const transcript = `${finalText} ${interim}`.trim();
    startTransition(async () => {
      const res = await evaluateSpeaking({ lessonId, transcript, durationSec: seconds, transcription: method }).catch(() => ({
        error: "لا يوجد اتصال. التقييم يحتاج إنترنت، حاول عند عودة الاتصال.",
      }));
      if ("id" in res && res.id) router.push(`/student/practice/speaking/result/${res.id}`);
      else setError(res.error ?? "حدث خطأ.");
    });
  }

  const transcript = `${finalText}${interim}`.trim();
  return (
    <div className="flex flex-col gap-3">
      {phase === "task" && (
        <>
          <Button size="lg" onClick={startPrep} disabled={remaining <= 0}>
            <Mic className="size-5" aria-hidden="true" />
            {prepSeconds > 0 ? `ابدأ (${prepSeconds} ثانية للتحضير)` : "ابدأ التسجيل"}
          </Button>
          {remaining <= 0 && <p className="text-sm text-muted-foreground">وصلت إلى حدك اليومي للمحادثة. تستطيع المحاولة غداً.</p>}
        </>
      )}

      {phase === "prep" && (
        <Card className="flex flex-col items-center gap-2 p-5 text-center">
          <p className="text-sm text-muted-foreground">وقت التحضير: فكّر فيما ستقوله</p>
          <En as="p" className="text-4xl font-bold text-primary" aria-live="polite">
            {mmss(Math.max(0, prepSeconds - seconds))}
          </En>
          <Button variant="secondary" onClick={() => void startRecording()}>
            جاهز، ابدأ التسجيل الآن
          </Button>
        </Card>
      )}

      {phase === "recording" && (
        <Card className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-semibold text-destructive">
              <span className="size-2.5 animate-pulse rounded-full bg-destructive" aria-hidden="true" />
              جارٍ التسجيل
            </p>
            <En className="font-semibold">
              {mmss(seconds)} / {mmss(maxSeconds)}
            </En>
          </div>
          {method === "browser" ? (
            <En as="p" className="min-h-16 text-[15px] leading-relaxed text-subtle">
              {transcript || "…"}
            </En>
          ) : (
            <p className="text-sm text-muted-foreground">تكلّم الآن. سنحوّل كلامك إلى نص بعد الانتهاء.</p>
          )}
          <Button variant="destructive" size="lg" onClick={stopRecording}>
            <Square className="size-4" aria-hidden="true" />
            انتهيت
          </Button>
        </Card>
      )}

      {phase === "review" && (
        <Card className="flex flex-col gap-3 p-5">
          <p className="text-sm text-muted-foreground">
            ما قلته · {seconds} ثانية · لم نحفظ الصوت
          </p>
          <En as="p" className="text-[15px] leading-relaxed">
            {busy && !transcript ? "جارٍ تحويل الكلام إلى نص…" : transcript || "لم نسمع كلاماً."}
          </En>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" disabled={busy} onClick={startPrep}>
              سجّل مجدداً
            </Button>
            <Button className="flex-[2]" disabled={busy || !transcript} onClick={send}>
              {busy ? "جارٍ التقييم…" : "قيّم كلامي"}
            </Button>
          </div>
        </Card>
      )}

      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
