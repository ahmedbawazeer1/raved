import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/utils";

type EnProps<T extends ElementType> = {
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

/** English text inside the Arabic (RTL) UI: left-to-right, Inter font. */
export function En<T extends ElementType = "span">({ as, className, ...props }: EnProps<T>) {
  const Tag = as ?? "span";
  return <Tag dir="ltr" lang="en" className={cn("font-en [unicode-bidi:isolate]", className)} {...props} />;
}
