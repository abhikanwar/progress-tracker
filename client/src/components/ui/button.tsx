import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "tap-target inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ui-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 disabled:pointer-events-none disabled:opacity-60 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-foreground/95 text-background shadow-[0_12px_24px_-16px_rgba(15,23,42,0.65)] hover:bg-foreground",
        outline: "border border-border bg-background text-foreground hover:bg-muted",
        ghost: "hover:bg-muted",
      },
      size: {
        default: "h-10 px-4 sm:h-11",
        sm: "h-9 px-3 sm:h-10",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const isLoading = props["aria-busy"] === true || props["aria-busy"] === "true";
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size }),
          isLoading && "cursor-wait",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
