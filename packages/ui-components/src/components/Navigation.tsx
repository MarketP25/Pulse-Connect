/**
 * Navigation Component
 * Top navigation bar with logo, search, notifications, and user menu
 * Responsive with mobile menu support
 */

import React, { HTMLAttributes, useState } from "react";
import clsx from "clsx";
import { Menu, X } from "lucide-react";

interface NavigationProps extends HTMLAttributes<HTMLElement> {
  logo?: React.ReactNode;
  title?: string;
  children?: React.ReactNode;
  sticky?: boolean;
  variant?: "light" | "dark";
  environment?: "production" | "staging" | "sandbox" | "development";
  onMobileMenuToggle?: (open: boolean) => void;
}

const Navigation = React.forwardRef<HTMLElement, NavigationProps>(
  (
    {
      logo,
      title,
      children,
      sticky = true,
      variant = "dark",
      environment = "development",
      onMobileMenuToggle,
      className,
      ...props
    },
    ref
  ) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => {
      const newState = !mobileMenuOpen;
      setMobileMenuOpen(newState);
      onMobileMenuToggle?.(newState);
    };

    const baseStyles =
      "flex items-center justify-between w-full px-3 xxs:px-4 xs:px-6 py-3 xs:py-4 border-b transition-all duration-300";

    const stickyStyles = sticky ? "sticky top-0 z-50" : "";

    const variantStyles = {
      light: "bg-cosmic-slate border-nebula-500",
      dark: "bg-nebula-900 border-nebula-500"
    };

    return (
      <>
        <nav
          ref={ref}
          className={clsx(baseStyles, stickyStyles, variantStyles[variant], className)}
          {...props}
        >
          {/* Environment Protocol Indicator */}
          {environment !== "production" && (
            <div
              className={clsx(
                "absolute top-0 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[10px] font-bold uppercase rounded-b-md z-[60]",
                environment === "sandbox"
                  ? "bg-pulse-cyan-accent text-orbit-blue-primary"
                  : "bg-warning text-orbit-blue-primary"
              )}
            >
              {environment} MODE
            </div>
          )}
          <div className="flex items-center gap-2 xs:gap-4 sm:gap-6 flex-shrink-0">
            {logo && <div className="flex-shrink-0 w-8 h-8 xs:w-10 xs:h-10">{logo}</div>}
            {title && (
              <h1 className="text-sm xxs:text-base xs:text-lg sm:text-h4 font-bold text-tech-white hidden xs:block">
                {title}
              </h1>
            )}
          </div>

          {/* Desktop children */}
          {children && <div className="hidden sm:flex items-center gap-2 xs:gap-4">{children}</div>}

          {/* Mobile menu toggle */}
          <button
            onClick={toggleMobileMenu}
            className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-md hover:bg-nebula-800 transition-colors"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X size={20} className="text-tech-white" />
            ) : (
              <Menu size={20} className="text-tech-white" />
            )}
          </button>
        </nav>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden px-3 xs:px-6 py-3 xs:py-4 bg-nebula-800 border-b border-nebula-500">
            {children && <div className="flex flex-col gap-2">{children}</div>}
          </div>
        )}
      </>
    );
  }
);

Navigation.displayName = "Navigation";

export default Navigation;
export type { NavigationProps };
