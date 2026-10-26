import * as React from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "w-full min-h-12 rounded-xl border border-input bg-card px-3.5 text-[15px] text-foreground placeholder:text-[#7A8A86] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:border-primary aria-invalid:border-destructive disabled:opacity-60";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputClass, "appearance-auto", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "py-3 leading-relaxed", className)} {...props} />;
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-semibold", className)} {...props} />;
}

/** Label + control + hint + error, with ids wired for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  optional,
  children,
  className,
}: {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  optional?: boolean;
  children: React.ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string }>;
  className?: string;
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="font-normal text-muted-foreground"> (اختياري)</span>}
      </Label>
      {React.cloneElement(children, { id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint && (
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-[13px] font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Large radio card (design: .opt). */
export function RadioOption({
  name,
  value,
  checked,
  onChange,
  children,
  aside,
  disabled,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange?: (value: string) => void;
  children: React.ReactNode;
  aside?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "relative flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5 text-[15px] font-medium",
        checked ? "border-2 border-primary bg-primary-tint" : "border-input",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange?.(value)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "size-5 flex-none rounded-full border-2 border-[#9AA8A4] peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/40",
          checked && "border-[6px] border-primary",
        )}
      />
      <span className="flex-1">{children}</span>
      {aside}
    </label>
  );
}

export function FieldsetLegend({ children, error }: { children: React.ReactNode; error?: string }) {
  return (
    <>
      <legend className="mb-2.5 text-sm font-semibold">{children}</legend>
      {error && <p className="-mt-1 mb-2 text-[13px] font-medium text-destructive">{error}</p>}
    </>
  );
}

export function Checkbox({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" className={cn("mt-1 size-5 flex-none accent-primary", className)} {...props} />;
}

export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: "success" | "error" | "info" | "warning";
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    success: "bg-success-tint text-[#05603A]",
    error: "bg-destructive-tint text-destructive",
    info: "bg-info-tint text-info",
    warning: "bg-warning-tint text-[#5C3D00]",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl p-3.5 text-sm leading-relaxed", tones[tone], className)}>
      {children}
    </div>
  );
}

/** Toggle switch (design: .sw) backed by a real checkbox. */
export function Switch({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn("flex min-h-11 cursor-pointer items-center gap-3", className)}>
      <input type="checkbox" role="switch" className="peer sr-only" {...props} />
      <span
        aria-hidden="true"
        className="relative h-[26px] w-11 flex-none rounded-full bg-input transition-colors after:absolute after:start-[3px] after:top-[3px] after:size-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:start-[21px] peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/40"
      />
      <span className="text-[15px]">{label}</span>
    </label>
  );
}
