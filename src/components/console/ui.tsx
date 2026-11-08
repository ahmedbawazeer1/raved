import Link from "next/link";
import { ArrowLeft, Minus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Building blocks of the console pages (cards, icon tiles, numbers). One status colour language everywhere:
 * green = done/healthy, gold = waits for you, purple = the agent, red = a problem, blue = information. */

export type Tone = "green" | "gold" | "ai" | "red" | "blue" | "ok" | "off";
export const TONE: Record<Tone, string> = {
  green: "bg-primary-tint text-primary",
  gold: "bg-warning-tint text-warning",
  ai: "bg-ai-tint text-ai",
  red: "bg-destructive-tint text-destructive",
  blue: "bg-info-tint text-info",
  ok: "bg-success-tint text-success",
  off: "bg-muted text-muted-foreground",
};

export function IconTile({ icon: Icon, tone, size = "md" }: { icon: LucideIcon; tone: Tone; size?: "sm" | "md" | "lg" }) {
  const box = size === "sm" ? "size-8 rounded-lg" : size === "lg" ? "size-12 rounded-2xl" : "size-10 rounded-xl";
  const ico = size === "sm" ? "size-4" : size === "lg" ? "size-6" : "size-5";
  return (
    <span className={cn("flex flex-none items-center justify-center", box, TONE[tone])}>
      <Icon className={ico} aria-hidden="true" />
    </span>
  );
}

export function Panel({
  title,
  icon: Icon,
  action,
  className,
  children,
}: {
  title?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-[18px] border border-border bg-card p-4 shadow-[0_1px_2px_rgba(18,32,29,.05),0_6px_18px_-8px_rgba(18,32,29,.12)] md:p-[18px]",
        className,
      )}
    >
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && (
            <h2 className="flex items-center gap-2 text-base font-bold">
              {Icon && <Icon className="size-[18px]" aria-hidden="true" />}
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHead({
  title,
  sub,
  crumbs,
  children,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  crumbs?: { label: string; href: string }[];
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {crumbs && (
          <nav aria-label="مسار التنقل" className="mb-1 flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
            {crumbs.map((c) => (
              <span key={c.href} className="flex items-center gap-1.5">
                <Link href={c.href} className="font-semibold">
                  {c.label}
                </Link>
                <span aria-hidden="true">‹</span>
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-[22px] leading-tight font-bold md:text-2xl">{title}</h1>
        {sub && <p className="mt-1 text-muted-foreground">{sub}</p>}
      </div>
      {children}
    </header>
  );
}

export function Kpi({
  label,
  value,
  icon,
  tone,
  delta,
  href,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  delta?: { text: string; dir: "up" | "down" | "flat" };
  href?: string;
}) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-muted-foreground">{label}</span>
        {icon && tone && <IconTile icon={icon} tone={tone} size="sm" />}
      </span>
      <span className="font-en text-[26px] leading-tight font-bold md:text-[28px]">{value}</span>
      {delta && (
        <span
          className={cn(
            "flex items-center gap-1 text-[13px] font-semibold",
            delta.dir === "up" ? "text-success" : delta.dir === "down" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {delta.dir === "up" ? (
            <TrendingUp className="size-4" aria-hidden="true" />
          ) : delta.dir === "down" ? (
            <TrendingDown className="size-4" aria-hidden="true" />
          ) : (
            <Minus className="size-4" aria-hidden="true" />
          )}
          {delta.text}
        </span>
      )}
    </>
  );
  const cls = "flex min-w-0 flex-col gap-1 rounded-[18px] border border-border bg-card p-4 text-foreground no-underline shadow-[0_1px_2px_rgba(18,32,29,.05)]";
  return href ? (
    <Link href={href} className={cn(cls, "hover:border-primary hover:text-foreground")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function ActionRow({
  href,
  icon,
  tone,
  title,
  detail,
  cta,
  urgent,
}: {
  href: string;
  icon: LucideIcon;
  tone: Tone;
  title: React.ReactNode;
  detail?: React.ReactNode;
  cta: string;
  urgent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "grid grid-cols-[44px_1fr] items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-foreground no-underline shadow-[0_1px_2px_rgba(18,32,29,.05)] hover:border-primary hover:text-foreground sm:grid-cols-[44px_1fr_auto]",
        urgent && "border-s-4 border-s-accent",
      )}
    >
      <IconTile icon={icon} tone={tone} />
      <span className="min-w-0">
        <b className="block">{title}</b>
        {detail && <span className="block text-[13px] text-muted-foreground">{detail}</span>}
      </span>
      <span className="col-start-2 flex items-center gap-1 text-sm font-bold text-primary sm:col-start-auto">
        {cta}
        <ArrowLeft className="size-4" aria-hidden="true" />
      </span>
    </Link>
  );
}

export function Empty({ icon, tone = "off", title, children }: { icon: LucideIcon; tone?: Tone; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <IconTile icon={icon} tone={tone} size="lg" />
      <b>{title}</b>
      {children && <div className="max-w-md text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

/** "+12 عن الأسبوع الماضي" from two numbers. */
export function deltaOf(now: number, before: number, unit: string): { text: string; dir: "up" | "down" | "flat" } {
  const d = now - before;
  if (d === 0) return { text: `كما ${unit}`, dir: "flat" };
  return { text: `${d > 0 ? "+" : "−"}${Math.abs(d)} عن ${unit}`, dir: d > 0 ? "up" : "down" };
}
