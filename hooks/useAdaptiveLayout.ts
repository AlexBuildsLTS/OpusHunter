/**
 * hooks/useAdaptiveLayout.ts
 * OpusHunter — Breakpoint Detection Hook.
 * Detects mobile/tablet/desktop widths to drive adaptive layout.
 */

import { useWindowDimensions } from "react-native";
import { BREAKPOINTS } from "../lib/navConfig";

export function useAdaptiveLayout() {
  const { width } = useWindowDimensions();

  const isMobile = width <= BREAKPOINTS.mobile;
  const isTablet = width > BREAKPOINTS.mobile && width <= BREAKPOINTS.tablet;
  const isDesktop = width > BREAKPOINTS.tablet;

  return { isMobile, isTablet, isDesktop, width };
}
