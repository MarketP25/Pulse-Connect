import React from "react";
import clsx from "clsx";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "ghost"
  | "danger"
  | "success"
  | "emergency"
  | "founder";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  isFullWidth?: boolean;
}

/**
 * Button Component
 * Optimized for planetary-scale UI with MARP-governed states and Tier 4 Founder variants.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", isLoading, isFullWidth, children, ...props },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pulse-cyan-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base"
    };

    const variantStyles = {
      primary: "bg-pulse-cyan-accent text-orbit-blue-primary hover:shadow-glow-cyan",
      secondary:
        "border border-pulse-cyan-accent text-pulse-cyan-accent hover:bg-pulse-cyan-accent/10",
      tertiary: "bg-cosmic-slate text-tech-white hover:bg-grid-silver",
      ghost: "text-tech-white hover:bg-white/5",
      danger: "bg-critical text-tech-white hover:bg-red-600",
      success: "bg-success text-tech-white hover:bg-emerald-600",
      // Emergency state: Pulsing deep red background with critical accent borders
      emergency:
        "bg-[var(--color-emergency-freeze)] text-tech-white border border-[var(--color-critical)] animate-pulse shadow-[0_0_20px_rgba(127,29,29,0.5)] font-bold uppercase",
      // Founder Variant: Tier 4 authority signature using gold tokens and signature colors
      founder:
        "bg-[var(--color-founder-gold)] text-[var(--color-founder-signature)] border-2 border-[var(--color-founder-signature)] font-black italic tracking-tighter shadow-glow-cyan hover:scale-105"
    };

    return (
      <button
        ref={ref}
        className={clsx(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          isFullWidth && "w-full",
          isLoading && "cursor-wait opacity-80",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </div>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
