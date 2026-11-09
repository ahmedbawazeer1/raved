import Link from "next/link";
import { signInWithGoogle } from "@/app/(auth)/actions";
import { DEFAULT_AVATAR } from "@shared/art/avatar";
import { Avatar } from "@/components/art/avatar";
import { Rafed } from "@/components/art/rafed";

const GIRL = { ...DEFAULT_AVATAR, face: "oval" as const, skin: "#E9BC96", hair: "hijab" as const, hairColor: "#7A52D6", top: "#F5A524" };

/** Layout for login / signup / password pages (design: Login, LoginM). */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-card md:flex-row">
      <div className="relative flex h-48 flex-none items-end justify-between overflow-hidden rounded-b-[32px] bg-[radial-gradient(120%_90%_at_85%_0%,#18A383_0%,#0E6E5C_45%,#08392F_100%)] px-6 md:hidden">
        <Waves />
        <Rafed stage={3} mood="happy" move="wave" moveKey="hi" size={74} className="relative" />
        <Link href="/" aria-label="رفد — الرئيسية" className="relative mb-auto pt-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
          <img src="/brand/raved-logo-green-white.svg" alt="شعار رفد" width={85} height={100} className="h-20 w-auto" />
        </Link>
        <Avatar config={GIRL} size={56} className="relative" />
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
        className="relative hidden flex-1 flex-col justify-center gap-6 overflow-hidden bg-[radial-gradient(120%_90%_at_85%_0%,#18A383_0%,#0E6E5C_45%,#08392F_100%)] px-14 text-white md:flex"
      >
        <Waves />
        <div className="absolute end-10 bottom-6 flex items-end gap-3">
          <Avatar config={GIRL} size={90} />
          <Rafed stage={3} mood="happy" move="wave" moveKey="hi" size={130} />
          <Avatar config={DEFAULT_AVATAR} size={90} />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
        <img src="/brand/raved-logo-green-white.svg" alt="" width={100} height={118} className="relative h-28 w-auto self-start" />
        <p className="relative max-w-md text-3xl leading-normal font-bold">كل درس تكمله اليوم خطوة نحو مهارة تبقى معك.</p>
        <ul className="relative flex flex-wrap gap-2 text-sm">
          {["رحلة النهر", "ألعاب وتحديات", "رافد يكبر معك", "مجاني بالكامل"].map((t) => (
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
        className="inline-flex min-h-13 w-full items-center justify-center gap-2.5 rounded-xl border-2 border-input bg-card px-4 text-[15px] font-bold text-foreground shadow-[0_4px_0_var(--color-input)] hover:bg-background active:translate-y-1 active:shadow-none"
      >
        <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
          <path
            fill="#FFC107"
            d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
          />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
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

/** Soft sand dunes at the bottom of the green panels. */
function Waves() {
  return (
    <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full" aria-hidden="true">
      <path d="M0 70 Q100 30 200 62 T400 50 V120 H0Z" fill="#6CCBF2" opacity=".2" />
      <path d="M0 95 Q120 60 240 90 T400 80 V120 H0Z" fill="#6CCBF2" opacity=".32" />
    </svg>
  );
}
