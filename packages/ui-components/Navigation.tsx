import React, { ReactNode } from "react";

/**
 * @pulsco/ui-components: Navigation
 *
 * Interface for the props of the Navigation component, typically used for
 * global application navigation, often including a title, logo, and various
 * interactive elements like search bars or user menus.
 */
export interface NavigationProps {
  /**
   * The main title displayed in the navigation bar.
   */
  title: string;
  /**
   * A ReactNode to be rendered as the logo, e.g., an SVG component or an image.
   */
  logo?: ReactNode;
  /**
   * Child elements to be rendered within the navigation, such as SearchBar, Notifications, UserMenu.
   */
  children?: ReactNode;
}

// Placeholder for the actual Navigation component implementation.
// This file primarily serves to define the interface for now.
export const Navigation: React.FC<NavigationProps> = ({ title, logo, children }) => {
  return (
    <nav className="bg-nebula-900 text-tech-white p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {logo && <div className="shrink-0">{logo}</div>}
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-4">{children}</div>
    </nav>
  );
};
