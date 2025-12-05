import { createContext, useContext } from 'react';

export type LayoutBreakpoint = 'mobile' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

export interface LayoutContextValue {
  breakpoint: LayoutBreakpoint;
  orientation: Orientation;
  width: number;
  height: number;
}

export const ResponsiveLayoutContext = createContext<LayoutContextValue>({
  breakpoint: 'mobile',
  orientation: 'portrait',
  width: 320,
  height: 640,
});

export function useResponsiveLayoutContext() {
  return useContext(ResponsiveLayoutContext);
}
