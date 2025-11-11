import { useEffect, useRef } from 'react';

interface FocusTrapOptions {
  restoreFocus?: boolean;
  initialFocus?: HTMLElement | null;
}

export function useFocusTrap(isActive: boolean = true, options: FocusTrapOptions = {}) {
   const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Get all focusable elements within the container
    const getFocusableElements = (): HTMLElement[] => {
      if (!containerRef.current) return [];
      
      const focusableSelectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'textarea:not([disabled])',
        'select:not([disabled])',
        'a[href]',
        'area[href]',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]',
        'summary',
        'iframe',
        'object',
        'embed'
      ];

      return Array.from(
        containerRef.current.querySelectorAll(focusableSelectors.join(', '))
      ).filter(element => {
        // Filter out elements that are not visible or are disabled
        const el = element as HTMLElement;
        return (
          el.offsetParent !== null &&
          !el.hasAttribute('disabled') &&
          !el.hasAttribute('aria-hidden')
        );
      }) as HTMLElement[];
    };

    // Set initial focus
    const setInitialFocus = () => {
      if (options.initialFocus && options.initialFocus.focus) {
        options.initialFocus.focus();
        return;
      }

      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    };

    // Handle tab key navigation
    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab (going backwards)
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab (going forwards)
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Handle escape key
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Let the component handle escape logic
        // We just restore focus here
        if (options.restoreFocus && previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      }
    };

    // Set up event listeners
    setInitialFocus();
    document.addEventListener('keydown', handleTabKey);
    document.addEventListener('keydown', handleEscapeKey);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleTabKey);
      document.removeEventListener('keydown', handleEscapeKey);

      // Restore focus to the previously focused element
      if (options.restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive, options]);

  return containerRef;
}

export default useFocusTrap;