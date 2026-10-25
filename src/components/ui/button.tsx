import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-[18px] text-[15px] font-semibold leading-none no-underline transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground",
        accent: "bg-accent text-accent-foreground hover:bg-accent-hover hover:text-accent-foreground",
        secondary: "border border-input bg-card text-foreground hover:bg-background hover:text-foreground",
        destructive: "border border-[#F4C7C3] bg-card text-destructive hover:bg-destructive-tint hover:text-destructive",
      },
      size: {
        default: "",
        lg: "min-h-13 px-7 text-[17px]",
        sm: "px-3.5 text-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
