import * as React from "react";
import { cn } from "../../lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "tap-target h-10 w-full rounded-xl border border-border bg-background px-3 text-sm ui-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
