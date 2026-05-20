import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-9 w-full rounded-sm border border-border bg-transparent px-3 py-1 text-sm shadow-neo-sm transition-all focus-visible:outline-none focus-visible:ring-0 focus-visible:border-border/80 focus-visible:translate-y-[-1px] focus-visible:shadow-neo disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  },
);
Select.displayName = "Select";

export { Select };
