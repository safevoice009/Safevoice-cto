import { createContext, useEffect, useLayoutEffect, useState, type ReactNode, type HTMLAttributes } from 'react';

export type LayoutBreakpoint = 'mobile' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

interface ResponsiveLayoutProps {
  header?: ReactNode;
  footer?: ReactNode;
  bottomNavigation?: ReactNode;
  children: ReactNode;
  className?: string;
  mainProps?: HTMLAttributes<HTMLElement>;
}

interface LayoutContextValue {
  breakpoint: LayoutBreakpoint;
  orientation: Orientation;
  width: number;
  height: number;
}

const ResponsiveLayoutContext = createContext<LayoutContextValue>({
  breakpoint: 'mobile',
  orientation: 'portrait',
  width: 320,
  height: 640,
});

function computeBreakpoint(width: number): LayoutBreakpoint {
  if (width >= 1024) return 'desktop';
  if (width >= 768) return 'tablet';
  return 'mobile';
}

function computeOrientation(width: number, height: number): Orientation {
  return width >= height ? 'landscape' : 'portrait';
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function ResponsiveLayout({
  header,
  footer,
  bottomNavigation,
  children,
  className,
  mainProps,
}: ResponsiveLayoutProps) {
  const [{ breakpoint, orientation, width, height }, setLayout] = useState<LayoutContextValue>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 320,
    height: typeof window !== 'undefined' ? window.innerHeight : 640,
    breakpoint: typeof window !== 'undefined' ? computeBreakpoint(window.innerWidth) : 'mobile',
    orientation:
      typeof window !== 'undefined'
        ? computeOrientation(window.innerWidth, window.innerHeight)
        : 'portrait',
  }));

  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      const nextWidth = window.innerWidth;
      const nextHeight = window.innerHeight;
      const nextBreakpoint = computeBreakpoint(nextWidth);
      const nextOrientation = computeOrientation(nextWidth, nextHeight);

      setLayout({
        width: nextWidth,
        height: nextHeight,
        breakpoint: nextBreakpoint,
        orientation: nextOrientation,
      });

      const root = document.documentElement;
      root.setAttribute('data-layout-breakpoint', nextBreakpoint);
      root.setAttribute('data-orientation', nextOrientation);
    };

    update();

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  const containerClassName = ['layout-shell', className].filter(Boolean).join(' ');
  const { className: mainClassOverride, ...restMainProps } = mainProps ?? {};
  const mainClassName = ['layout-main', mainClassOverride].filter(Boolean).join(' ');

  return (
    <ResponsiveLayoutContext.Provider value={{ breakpoint, orientation, width, height }}>
      <div className={containerClassName} data-layout-breakpoint={breakpoint} data-orientation={orientation}>
        {header}
        <div className="safe-area-layout" {...restMainProps}>
          <div className={mainClassName}>{children}</div>
        </div>
        {footer}
        {bottomNavigation}
      </div>
    </ResponsiveLayoutContext.Provider>
  );
}
