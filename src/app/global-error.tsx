"use client";

/** Last resort when even the root layout fails: plain HTML, no app styles. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F5F7F6", color: "#12201D" }}>
        <main style={{ maxWidth: 460, margin: "15vh auto", padding: 24, textAlign: "center", lineHeight: 1.9 }}>
          <h1 style={{ fontSize: 24 }}>حدث خطأ مؤقت</h1>
          <p style={{ color: "#4B5B57" }}>لم نتمكن من فتح الموقع الآن. حاول مرة أخرى بعد قليل.</p>
          <button
            type="button"
            onClick={reset}
            style={{ minHeight: 44, padding: "0 24px", border: 0, borderRadius: 12, background: "#0E6E5C", color: "#fff", fontSize: 16, fontWeight: 600 }}
          >
            حاول مرة أخرى
          </button>
          {error.digest && <p style={{ fontSize: 12, color: "#4B5B57" }}>رمز الخطأ: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
