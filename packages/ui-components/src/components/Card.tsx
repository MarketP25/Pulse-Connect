/**
 * Card Component
 * Reusable card component for content containers
 * Supports different elevation levels and styles
 */

import React, { HTMLAttributes } from "react";
import clsx from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  interactive?: boolean;
  children: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ elevated = false, interactive = false, className, children, ...props }, ref) => {
    const baseStyles =
      "bg-nebula-800 border border-nebula-500 rounded-sm xxs:rounded-md md:rounded-lg p-sm xxs:p-md md:p-lg 3xl:p-2xl transition-all duration-300";

    const elevatedStyles = elevated
      ? "shadow-sm xxs:shadow-md md:shadow-lg 3xl:shadow-xl hover:shadow-md xxs:hover:shadow-lg md:hover:shadow-xl 3xl:hover:shadow-2xl"
      : "shadow-sm hover:shadow-md xxs:shadow-md xxs:hover:shadow-lg md:shadow-lg md:hover:shadow-xl";

    const interactiveStyles = interactive
      ? "cursor-pointer hover:border-pulse-cyan-500 hover:border-opacity-50"
      : "";

    return (
      <div
        ref={ref}
        className={clsx(baseStyles, elevatedStyles, interactiveStyles, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export default Card;
export type { CardProps };
