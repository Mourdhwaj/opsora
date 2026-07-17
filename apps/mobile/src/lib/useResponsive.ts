import { useWindowDimensions } from 'react-native';

/** Breakpoints matching common phone/tablet sizes */
const BREAKPOINTS = {
  small: 380,   // iPhone SE, small Androids
  medium: 414,  // iPhone 14/15, standard Android
  large: 768,   // Tablets
} as const;

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isSmall = width < BREAKPOINTS.small;
  const isMedium = width >= BREAKPOINTS.small && width < BREAKPOINTS.large;
  const isLarge = width >= BREAKPOINTS.large;
  const isLandscape = width > height;

  /**
   * Scale a value based on screen width relative to a 390px reference.
   * Returns the original value on tablets (>=768px) to avoid over-scaling.
   */
  function scale(size: number): number {
    if (isLarge) return size;
    return Math.round(size * (width / 390));
  }

  return { width, height, isSmall, isMedium, isLarge, isLandscape, scale };
}
