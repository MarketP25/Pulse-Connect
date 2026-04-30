/**
 * PULSCO Design System - UI Components
 *
 * This file serves as the primary entry point for the @pulsco/ui-components package.
 * It exports all atomic, molecular, and organism-level components used across
 * the ecosystem portals.
 */

// Layout & Containers
export { Card } from "./Card";

// Form Elements
export { Input } from "./Input"; // Assuming Input.tsx exists
export { Button } from "./Button"; // New Button component

// Data Display & Feedback
export { Badge } from "./Badge"; // Assuming Badge.tsx exists
export { Breadcrumbs } from "./Breadcrumbs"; // Assuming Breadcrumbs.tsx exists

// Navigation
export { Navigation } from "./Navigation"; // New Navigation component

// Hooks & Utilities (Re-exporting from source core)
export * from "./src/index";
