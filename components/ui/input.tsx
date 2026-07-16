import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui Input, retuned to the Pelli tokens.
 * text-base on mobile stops iOS Safari zooming the viewport on focus.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-lg border border-border bg-card px-3.5 py-2",
        "text-base md:text-sm text-foreground placeholder:text-muted-foreground",
        "transition-colors outline-none",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/25",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
