/**
 * Badge Component
 * Reusable badge/tag component for labels and status indicators
 */

import React, { HTMLAttributes } from "react";
import clsx from "clsx";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "success" | "warning" | "critical" | "info";
  size?: "sm" | "md";
  children: React.ReactNode;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "primary", size = "md", className, children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center rounded font-semibold";

    const sizeStyles = {
      sm: "px-2 py-1 text-xs",
      md: "px-3 py-1.5 text-sm"
    };

    const variantStyles = {
      primary: "bg-pulse-cyan-500 bg-opacity-20 text-pulse-cyan-400",
      success: "bg-success bg-opacity-20 text-success",
      warning: "bg-warning bg-opacity-20 text-warning",
      critical: "bg-critical bg-opacity-20 text-critical",
      info: "bg-info bg-opacity-20 text-info"
    };

    return (
      <span
        ref={ref}
        className={clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export default Badge;
export type { BadgeProps };
