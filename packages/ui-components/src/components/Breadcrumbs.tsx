/**
 * Breadcrumbs Component
 * Navigation breadcrumbs showing the current page location
 */

import React, { HTMLAttributes } from "react";
import clsx from "clsx";

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  current?: boolean;
}

interface BreadcrumbsProps extends HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
}

const Breadcrumbs = React.forwardRef<HTMLElement, BreadcrumbsProps>(
  ({ items, separator = "/", className, ...props }, ref) => {
    return (
      <nav ref={ref} className={clsx("flex items-center gap-2 text-sm", className)} {...props}>
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && <span className="text-nebula-500 mx-1">{separator}</span>}

            {item.current || !item.href ? (
              <span
                className={clsx(
                  "font-medium",
                  item.current ? "text-tech-white" : "text-nebula-500"
                )}
              >
                {item.label}
              </span>
            ) : (
              <button
                onClick={item.onClick}
                className="text-pulse-cyan-500 hover:text-pulse-cyan-400 transition-colors duration-300 cursor-pointer"
              >
                {item.label}
              </button>
            )}
          </div>
        ))}
      </nav>
    );
  }
);

Breadcrumbs.displayName = "Breadcrumbs";

export default Breadcrumbs;
export type { BreadcrumbsProps, BreadcrumbItem };
