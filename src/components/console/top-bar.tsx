"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { BadgeCheck, Bell, BellOff, Bot, Bug, Flag, Inbox, LogOut, Map as MapIcon, Search, VideoOff, X, type LucideIcon } from "lucide-react";
import type { ConsoleNotice, NoticeIcon } from "@/lib/console/notices";
import { consoleSearch, type SearchHit } from "@/lib/console/search";
import { cn } from "@/lib/utils";

const ICON: Record<NoticeIcon, LucideIcon> = { review: BadgeCheck, map: MapIcon, inbox: Inbox, flag: Flag, bug: Bug, video: VideoOff, bot: Bot };
const TONE: Record<ConsoleNotice["tone"], string> = {
  gold: "bg-warning-tint text-warning",
  red: "bg-destructive-tint text-destructive",
  blue: "bg-info-tint text-info",
  ai: "bg-ai-tint text-ai",
};

type Page = { label: string; href: string };

/** Escape closes, Tab stays inside the box. */
function useDialogKeys(open: boolean, box: React.RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key !== "Tab" || !box.current) return;
      const f = [...box.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),input")].filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0]!;
      const last = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, box, close]);
}

function Notifications({ notices }: { notices: ConsoleNotice[] }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    btn.current?.focus();
  }, []);
  useDialogKeys(open, box, close);
  useEffect(() => {
    if (open) box.current?.querySelector<HTMLElement>("a,button")?.focus();
  }, [open]);
  return (
    <div className="relative">
      <button
        ref={btn}
        type="button"
        aria-label={notices.length ? `الإشعارات (${notices.length})` : "الإشعارات"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"
      >
        <Bell className="size-5" aria-hidden="true" />
        {notices.length > 0 && <span className="absolute top-2 end-2.5 size-2.5 rounded-full border-2 border-card bg-destructive" />}
      </button>
      {open && (
        <>
          <button type="button" aria-label="إغلاق" tabIndex={-1} className="fixed inset-0 z-40 cursor-default bg-black/30 md:bg-transparent" onClick={close} />
          <div
            ref={box}
            role="dialog"
            aria-label="الإشعارات"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[75vh] overflow-y-auto rounded-t-[22px] border border-border bg-card p-2 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-2xl md:absolute md:inset-x-auto md:end-0 md:top-12 md:bottom-auto md:w-[380px] md:rounded-2xl md:pb-2"
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <b className="flex items-center gap-2">
                <Bell className="size-4" aria-hidden="true" /> الإشعارات
              </b>
              <button type="button" onClick={close} aria-label="إغلاق" className="flex size-10 items-center justify-center rounded-lg text-muted-foreground">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            {notices.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <BellOff className="size-6" aria-hidden="true" />
                </span>
                <b>لا شيء ينتظرك</b>
                <p className="text-sm text-muted-foreground">يصلك هنا كل ما يحتاج قرارك.</p>
              </div>
            ) : (
              notices.map((n) => {
                const Icon = ICON[n.icon];
                return (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="grid grid-cols-[38px_1fr] items-center gap-3 rounded-xl p-2.5 text-foreground no-underline hover:bg-muted hover:text-foreground"
                  >
                    <span className={cn("flex size-[38px] items-center justify-center rounded-xl", TONE[n.tone])}>
                      <Icon className="size-[18px]" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <b className="block text-sm">{n.title}</b>
                      <span className="block truncate text-[13px] text-muted-foreground">{n.detail}</span>
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Mounted only while open, so every opening starts empty. */
function SearchPalette({ pages, onClose }: { pages: Page[]; onClose: () => void }) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [pending, start] = useTransition();
  useDialogKeys(true, box, onClose);
  useEffect(() => input.current?.focus(), []);
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) return;
    const id = setTimeout(() => start(async () => setHits(await consoleSearch(t))), 250);
    return () => clearTimeout(id);
  }, [q]);

  const t = q.trim();
  const found = t.length >= 2 ? hits : [];
  const pageHits = pages.filter((p) => !t || p.label.includes(t)).map((p) => ({ group: "صفحات", label: p.label, detail: "", href: p.href }));
  const all = [...pageHits, ...found];
  const groups = [...new Set(all.map((h) => h.group))];
  const go = (href: string) => {
    onClose();
    router.push(href);
  };
  const onListKey = (e: React.KeyboardEvent) => {
    const items = [...(box.current?.querySelectorAll<HTMLElement>("[data-hit]") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[Math.min(i + 1, items.length - 1)]?.focus();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (i <= 0) input.current?.focus();
      else items[i - 1]?.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-4 pt-4 md:pt-[70px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label="البحث"
        className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-card shadow-2xl"
        onKeyDown={onListKey}
      >
        <div className="flex items-center gap-2 border-b border-border px-3.5">
          <Search className="size-5 text-muted-foreground" aria-hidden="true" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && all[0]) go(all[0].href);
            }}
            placeholder="اكتب اسم طالب أو رمز وحدة أو صفحة…"
            aria-label="بحث"
            className="min-h-14 flex-1 bg-transparent text-base outline-none"
          />
          <button type="button" onClick={onClose} className="min-h-10 rounded-lg px-3 text-sm text-muted-foreground">
            إغلاق
          </button>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-1.5" aria-live="polite">
          {groups.map((g) => (
            <div key={g}>
              <p className="px-2.5 pt-2 pb-1 text-xs font-semibold text-muted-foreground">{g}</p>
              {all
                .filter((h) => h.group === g)
                .map((h) => (
                  <button
                    key={h.href + h.label}
                    type="button"
                    data-hit
                    onClick={() => go(h.href)}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2.5 text-start hover:bg-muted focus:bg-muted focus:outline-none"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{h.label}</span>
                      {h.detail && <span className="block truncate text-[13px] text-muted-foreground">{h.detail}</span>}
                    </span>
                  </button>
                ))}
            </div>
          ))}
          {all.length === 0 && !pending && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">لا نتائج لـ «{t}». جرّب رمز وحدة مثل A1-04 أو اسم طالب.</p>
          )}
          {pending && <p className="px-3 py-2 text-center text-xs text-muted-foreground">يبحث…</p>}
        </div>
      </div>
    </div>
  );
}

export function TopBar({ name, roleLabel, notices, pages }: { name: string; roleLabel: string; notices: ConsoleNotice[]; pages: Page[] }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const searchBtn = useRef<HTMLButtonElement>(null);
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    searchBtn.current?.focus();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const initial = name.trim().charAt(0) || "م";

  return (
    <header className="sticky top-0 z-20 flex items-center gap-2.5 border-b border-border bg-card px-4 py-2.5 md:px-6">
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
      <img src="/brand/raved-logo-green.svg" alt="رفد" width={30} height={36} className="h-9 w-auto md:hidden" />
      <button
        ref={searchBtn}
        type="button"
        onClick={() => setSearchOpen(true)}
        className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-muted px-3 text-start text-muted-foreground md:max-w-[460px]"
      >
        <Search className="size-[18px] flex-none" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-sm">ابحث عن طالب أو وحدة…</span>
        <kbd className="hidden flex-none rounded-md border border-border bg-card px-1.5 font-en text-xs md:inline">Ctrl K</kbd>
      </button>
      <div className="ms-auto flex items-center gap-2">
        <Notifications notices={notices} />
        <div className="relative">
          <button
            type="button"
            aria-expanded={menu}
            aria-label="الحساب"
            onClick={() => setMenu((v) => !v)}
            className="flex min-h-11 items-center gap-2 rounded-xl px-1"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary-tint font-bold text-primary">{initial}</span>
            <span className="hidden text-start leading-tight md:block">
              <b className="block text-sm">{name}</b>
              <span className="text-xs text-muted-foreground">{roleLabel}</span>
            </span>
          </button>
          {menu && (
            <>
              <button type="button" tabIndex={-1} aria-label="إغلاق" className="fixed inset-0 z-40 cursor-default" onClick={() => setMenu(false)} />
              <div role="menu" className="absolute end-0 top-12 z-50 w-56 rounded-2xl border border-border bg-card p-1.5 shadow-xl">
                <p className="px-3 py-2 text-sm">
                  <b className="block">{name}</b>
                  <span className="text-xs text-muted-foreground">{roleLabel}</span>
                </p>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    role="menuitem"
                    className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-start text-destructive hover:bg-destructive-tint"
                  >
                    <LogOut className="size-4" aria-hidden="true" /> تسجيل الخروج
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
      {searchOpen && <SearchPalette pages={pages} onClose={closeSearch} />}
    </header>
  );
}
