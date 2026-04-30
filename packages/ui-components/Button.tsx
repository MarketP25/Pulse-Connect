import React, { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * @pulsco/ui-components: Button
 *
 * A versatile button component that supports various visual styles, sizes,
 * and loading states, adhering to the PULSCO design system.
 */

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * The visual style of the button.
   * @default 'primary'
   */
  variant?: "primary" | "secondary" | "tertiary" | "ghost" | "danger" | "success";
  /**
   * The size of the button.
   * @default 'md'
   */
  size?: "sm" | "md" | "lg";
  /**
   * If true, the button will show a loading spinner and be disabled.
   */
  isLoading?: boolean;
  /**
   * The content of the button.
   */
  children: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  children,
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    "font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200";

  const variantStyles = {
    primary:
      "bg-stellar-purple-600 text-tech-white hover:bg-stellar-purple-500 focus:ring-stellar-purple-500",
    secondary: "bg-grid-silver/10 text-grid-silver hover:bg-grid-silver/20 focus:ring-grid-silver",
    tertiary: "text-stellar-purple-400 hover:text-stellar-purple-300 focus:ring-stellar-purple-500",
    ghost: "text-tech-white hover:bg-tech-white/10 focus:ring-tech-white",
    // Assuming standard red/green for danger/success as they are common patterns.
    // These colors are not explicitly in tailwind.config.js but are standard Tailwind defaults.
    danger: "bg-red-600 text-tech-white hover:bg-red-500 focus:ring-red-500",
    success: "bg-green-600 text-tech-white hover:bg-green-500 focus:ring-green-500"
  };

  const sizeStyles = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-5 py-3 text-lg"
  };

  const loadingStyles = isLoading ? "opacity-70 cursor-not-allowed" : "";
  const disabledStyles = disabled ? "opacity-50 cursor-not-allowed" : "";

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${loadingStyles} ${disabledStyles} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
            ...
          </svg>{" "}
          {/* Placeholder for spinner */}
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
};
