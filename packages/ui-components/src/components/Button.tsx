/**
 * Button Component
 * Reusable button component with multiple variants based on PULSCO branding
 * Supports primary, secondary, tertiary, ghost, danger, and success variants
 */

import React, { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  isFullWidth?: boolean;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      isFullWidth = false,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95";

    const sizeStyles = {
      sm: "px-2 xxs:px-3 py-1 xxs:py-1.5 text-xs xxs:text-sm min-h-8 xxs:min-h-9",
      md: "px-4 xxs:px-6 py-2 xxs:py-2.5 text-sm xxs:text-base min-h-9 xxs:min-h-11",
      lg: "px-6 xxs:px-8 py-3 xxs:py-3.5 text-base xxs:text-lg min-h-11 xxs:min-h-12"
    };

    const variantStyles = {
      primary:
        "bg-pulse-cyan-500 text-orbit-blue-600 hover:bg-pulse-cyan-400 active:bg-pulse-cyan-600 shadow-md hover:shadow-lg",
      secondary:
        "border-2 border-pulse-cyan-500 text-pulse-cyan-500 hover:bg-pulse-cyan-500 hover:bg-opacity-10 hover:border-opacity-80",
      tertiary: "bg-nebula-800 text-tech-white hover:bg-nebula-700 border border-nebula-500",
      ghost: "text-tech-white hover:bg-nebula-800 bg-transparent border border-transparent",
      danger:
        "bg-critical text-white hover:bg-opacity-90 active:bg-opacity-100 shadow-md hover:shadow-lg",
      success:
        "bg-success text-white hover:bg-opacity-90 active:bg-opacity-100 shadow-md hover:shadow-lg"
    };

    return (
      <button
        ref={ref}
        className={clsx(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          isFullWidth && "w-full",
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
export type { ButtonProps };
