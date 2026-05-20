import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link";
  size?: "sm" | "default" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-sm text-sm font-sans font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-border active:translate-y-[1px] active:shadow-none hover:shadow-neo-sm shadow-neo",
          {
            "bg-primary text-primary-foreground hover:bg-primary/95": variant === "default",
            "bg-secondary text-secondary-foreground hover:bg-secondary/95": variant === "secondary",
            "bg-background hover:bg-accent/10 hover:text-accent-foreground": variant === "outline",
            "border-transparent hover:bg-accent/10 hover:text-accent-foreground active:translate-y-0 shadow-none hover:shadow-none": variant === "ghost",
            "border-transparent text-primary underline-offset-4 hover:underline active:translate-y-0 shadow-none hover:shadow-none": variant === "link",
            "bg-destructive text-destructive-foreground hover:bg-destructive/95": variant === "destructive",
            "h-9 px-4 py-2": size === "default",
            "h-7 px-3 text-xs": size === "sm",
            "h-11 px-8 text-base": size === "lg",
            "h-9 w-9": size === "icon",
          },
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
