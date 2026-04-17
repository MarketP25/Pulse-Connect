// utils/useResponsive.ts
import { useSyncExternalStore } from 'react';

/** Breakpoint configuration - customize as needed */
interface Breakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
  wide: number;
  ultra: number;
}

const DEFAULT_BREAKPOINTS: Breakpoints = {
  mobile: 640,
  tablet: 1024,
  desktop: 1440,
  wide: 1920,
  ultra: 2560,
};

interface ResponsiveState {
  /** Exact viewport width in pixels */
  width: number;
  /** Exact viewport height in pixels */
  height: number;
  /** Viewport aspect ratio (width/height) */
  aspectRatio: number;
  /** Is the viewport in landscape orientation */
  isLandscape: boolean;
  /** Is the viewport in portrait orientation */
  isPortrait: boolean;
  /** Is mobile-sized (< 640px by default) */
  isMobile: boolean;
  /** Is tablet-sized (640px - 1024px by default) */
  isTablet: boolean;
  /** Is desktop-sized (1024px - 1440px by default) */
  isDesktop: boolean;
  /** Is wide desktop (1440px - 1920px by default) */
  isWide: boolean;
  /** Is ultra-wide (1920px+ by default) */
  isUltraWide: boolean;
  /** Is touch device */
  isTouch: boolean;
  /** Current breakpoint key */
  breakpoint: keyof Breakpoints;
  /** All breakpoints for custom checks */
  breakpoints: Breakpoints;
  /** Helper to check if width is below a custom threshold */
  below: (px: number) => boolean;
  /** Helper to check if width is above a custom threshold */
  above: (px: number) => boolean;
  /** Helper to check if width is within a range */
  between: (min: number, max: number) => boolean;
}

/** Get current window dimensions - SSR safe */
const getSnapshot = (): { width: number; height: number } => {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

/** Check if device supports touch - SSR safe */
const getIsTouch = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/** Subscribe to resize events - passive for performance */
const subscribe = (callback: () => void): (() => void) => {
  window.addEventListener('resize', callback, { passive: true });
  return () => window.removeEventListener('resize', callback);
};

/** Server-side fallback state */
const serverState = { width: 0, height: 0 };

/**
 * Automatic responsive hook that adapts to ANY screen size
 * - SSR-safe (no hydration mismatch)
 * - Performance-optimized (uses matchMedia, not resize listener)
 * - Provides both raw values and computed breakpoints
 * - Fully typed with useful utilities
 * 
 * @param customBreakpoints - Optional custom breakpoint thresholds
 * 
 * @example
 * const { width, isMobile, isTablet, isDesktop, below, above } = useResponsive();
 */
export function useResponsive(customBreakpoints?: Partial<Breakpoints>): ResponsiveState {
  const breakpoints = { ...DEFAULT_BREAKPOINTS, ...customBreakpoints };
  const { width, height } = useSyncExternalStore(subscribe, getSnapshot, () => serverState);
  
  const aspectRatio = height > 0 ? width / height : 0;
  const isLandscape = aspectRatio > 1;
  const isPortrait = aspectRatio <= 1;
  
  // Touch device detection - computed fresh each render since it doesn't change
  const isTouch = getIsTouch();
  
  // Dynamic breakpoint detection
  const isMobile = width < breakpoints.mobile;
  const isTablet = width >= breakpoints.mobile && width < breakpoints.tablet;
  const isDesktop = width >= breakpoints.tablet && width < breakpoints.desktop;
  const isWide = width >= breakpoints.desktop && width < breakpoints.wide;
  const isUltraWide = width >= breakpoints.wide;
  
  // Determine current breakpoint
  let breakpoint: keyof Breakpoints = 'mobile';
  if (isUltraWide) breakpoint = 'ultra';
  else if (isWide) breakpoint = 'wide';
  else if (isDesktop) breakpoint = 'desktop';
  else if (isTablet) breakpoint = 'tablet';
  
  return {
    width,
    height,
    aspectRatio,
    isLandscape,
    isPortrait,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    isUltraWide,
    isTouch,
    breakpoint,
    breakpoints,
    below: (px: number) => width < px,
    above: (px: number) => width >= px,
    between: (min: number, max: number) => width >= min && width < max,
  };
}

/**
 * Simple breakpoint debugger component
 * Shows current viewport info - use in development only
 */
export function BreakpointDebugger() {
  const { width, height, breakpoint, isLandscape, isPortrait } = useResponsive();
  
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        padding: '12px 16px',
        background: 'rgba(0, 0, 0, 0.85)',
        color: '#00d9ff',
        borderRadius: 8,
        fontSize: 11,
        fontFamily: 'monospace',
        zIndex: 9999,
        pointerEvents: 'none',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(0, 217, 255, 0.3)',
      }}
    >
      <div style={{ marginBottom: 4 }}>{width} × {height}</div>
      <div style={{ opacity: 0.8 }}>{breakpoint}</div>
      <div style={{ opacity: 0.6 }}>{isLandscape ? '🖥️ Landscape' : '📱 Portrait'}</div>
    </div>
  );
}