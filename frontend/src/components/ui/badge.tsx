import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "secondary" | "outline" | "morning" | "afternoon" | "evening";
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variants: Record<string, string> = {
    default: "border-transparent bg-primary text-primary-foreground",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    outline: "text-foreground",
    morning: "border-transparent bg-amber-100 text-amber-800",
    afternoon: "border-transparent bg-sky-100 text-sky-800",
    evening: "border-transparent bg-indigo-100 text-indigo-800",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Badge };
