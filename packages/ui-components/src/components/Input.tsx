/**
 * Input Component
 * Reusable input field component with validation and error states
 */

import React, { InputHTMLAttributes } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helpText, icon, className, ...props }, ref) => {
    const baseStyles =
      "w-full bg-nebula-900 border rounded-md px-4 py-2.5 text-body text-tech-white placeholder-nebula-500 transition-all duration-300";

    const borderStyles = error
      ? "border-critical focus:border-critical focus:ring-2 focus:ring-critical focus:ring-opacity-20"
      : "border-nebula-500 focus:border-pulse-cyan-500 focus:ring-2 focus:ring-pulse-cyan-500 focus:ring-opacity-20";

    const focusStyles = "focus:outline-none";

    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-tech-white mb-2">{label}</label>}

        <div className="relative">
          {icon && <div className="absolute left-3 top-1/2 transform -translate-y-1/2">{icon}</div>}
          <input
            ref={ref}
            className={clsx(baseStyles, borderStyles, focusStyles, icon && "pl-10", className)}
            {...props}
          />
        </div>

        {error && <p className="mt-2 text-sm text-critical">{error}</p>}

        {helpText && !error && <p className="mt-2 text-sm text-nebula-500">{helpText}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
export type { InputProps };
