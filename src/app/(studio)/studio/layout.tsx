import type { Metadata } from "next";
import { StudioNav } from "@/components/studio/studio-nav";
import { requireStaff } from "@/lib/auth/session";

/** Per-user, never prerendered. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { default: "استوديو المحتوى", template: "%s · استوديو رفد" }, robots: { index: false } };

/** «استوديو المحتوى»: where the factory's maps, templates and units are reviewed (admin + teachers). */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin } = await requireStaff();
  const initial = profile.full_name.trim().charAt(0) || "م";
  const roleLabel = isAdmin ? "مدير المنصة" : "معلم";

  return (
    <div className="flex min-h-dvh flex-col bg-background md:flex-row">
      <aside aria-label="قائمة الاستوديو" className="hidden w-[260px] flex-none flex-col gap-6 bg-foreground px-3.5 py-5 md:flex">
        <div className="flex items-center gap-2.5 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
          <img src="/brand/raved-logo-green-white.svg" alt="شعار رفد" width={41} height={48} className="h-12 w-auto" />
          <span className="rounded-full bg-[#1C2E2A] px-2.5 py-1 text-xs font-semibold text-accent">استوديو المحتوى</span>
        </div>
        <StudioNav isAdmin={isAdmin} variant="sidebar" />
        <div className="mt-auto flex items-center gap-2.5 rounded-xl bg-[#1C2E2A] p-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary font-bold text-white">{initial}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{profile.full_name || roleLabel}</p>
            <p className="text-xs text-[#C9D4D1]">{roleLabel}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="min-h-9 rounded-lg px-2 text-xs text-[#C9D4D1] hover:text-white">
              خروج
            </button>
          </form>
        </div>
      </aside>

      <header className="bg-foreground md:hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
            <img src="/brand/raved-logo-green-white.svg" alt="شعار رفد" width={30} height={36} className="h-9 w-auto" />
            <span className="rounded-full bg-[#1C2E2A] px-2.5 py-1 text-xs font-semibold text-accent">استوديو المحتوى</span>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="min-h-11 px-2 text-sm text-[#C9D4D1]">
              خروج
            </button>
          </form>
        </div>
        <StudioNav isAdmin={isAdmin} variant="bar" />
      </header>

      <main className="min-w-0 flex-1 px-4 pt-5 pb-14 md:px-8 md:pt-7">{children}</main>
    </div>
  );
}
