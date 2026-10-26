import Link from "next/link";
import { signInWithGoogle } from "@/app/(auth)/actions";

/** Layout for login / signup / password pages (design: Login, LoginM). */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-card md:flex-row">
      <div className="flex h-44 flex-none items-center justify-center rounded-b-[32px] bg-primary md:hidden">
        <Link href="/" aria-label="رفد — الرئيسية">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
          <img src="/brand/raved-logo-green-white.svg" alt="شعار رفد" width={85} height={100} className="h-24 w-auto" />
        </Link>
      </div>
      <main className="flex flex-1 items-start justify-center px-5 py-8 md:items-center md:px-10">
        <div className="flex w-full max-w-[420px] flex-col gap-6">
          <Link href="/" aria-label="رفد — الرئيسية" className="hidden self-start md:block">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
            <img src="/brand/raved-logo-green.svg" alt="شعار رفد" width={48} height={56} className="h-14 w-auto" />
          </Link>
          {children}
        </div>
      </main>
      <aside
        aria-label="عن رفد"
        className="hidden flex-1 flex-col justify-center gap-6 bg-primary px-14 text-white md:flex"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
        <img src="/brand/raved-logo-green-white.svg" alt="" width={100} height={118} className="h-28 w-auto self-start" />
        <p className="max-w-md text-3xl leading-normal font-bold">كل درس تكمله اليوم خطوة نحو مهارة تبقى معك.</p>
        <ul className="flex flex-wrap gap-2 text-sm">
          {["مسارات منظمة", "يعمل بلا إنترنت", "مجاني بالكامل"].map((t) => (
            <li key={t} className="rounded-full bg-white/15 px-3 py-1.5">
              {t}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

export function GoogleButton({ next }: { next?: string }) {
  return (
    <form action={signInWithGoogle}>
      {next && <input type="hidden" name="next" value={next} />}
      <button
        type="submit"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-input bg-card px-4 text-[15px] font-semibold text-foreground hover:bg-background"
      >
        <span className="font-en font-bold text-info" aria-hidden="true">
          G
        </span>
        المتابعة بحساب Google
      </button>
    </form>
  );
}

export function OrDivider({ label = "أو بالبريد" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {label}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
