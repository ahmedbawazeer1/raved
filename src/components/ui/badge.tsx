import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold",
  {
    variants: {
      tone: {
        primary: "bg-primary-tint text-primary-hover",
        success: "bg-success-tint text-success",
        warning: "bg-warning-tint text-warning",
        destructive: "bg-destructive-tint text-destructive",
        muted: "bg-muted text-subtle",
        ai: "bg-ai-tint text-ai",
        info: "bg-info-tint text-info",
      },
    },
    defaultVariants: { tone: "primary" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
