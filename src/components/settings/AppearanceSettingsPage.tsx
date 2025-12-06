import React, { useEffect, useState } from 'react';
import AppearanceSettings from './AppearanceSettings';
import { useCustomizationStore } from '../../lib/customizationStore';
import { useThemeSystemStore } from '../../lib/themeSystemStore';

// Skeleton component for loading state
function AppearanceSettingsSkeleton() {
  return (
    <div className="spacing-stack-xl pb-16 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 animate-pulse">
      <header className="spacing-stack-sm">
        <div className="h-8 bg-gray-200 rounded w-64 mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-full max-w-3xl mb-4"></div>
        <div className="space-x-3">
          <div className="h-10 bg-gray-200 rounded w-48 inline-block"></div>
          <div className="h-10 bg-gray-200 rounded w-48 inline-block"></div>
        </div>
      </header>

      {/* Tab navigation skeleton */}
      <div className="flex border-b border-gray-200 mb-6">
        <div className="h-10 bg-gray-200 rounded w-32 mr-4"></div>
        <div className="h-10 bg-gray-200 rounded w-40"></div>
      </div>

      {/* Content sections skeleton */}
      <div className="space-y-8">
        {/* Theme section skeleton */}
        <section className="space-y-6">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="h-5 bg-gray-200 rounded w-24 mb-3"></div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="h-5 bg-gray-200 rounded w-32 mb-3"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </section>

        {/* Typography section skeleton */}
        <section className="space-y-6">
          <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="h-5 bg-gray-200 rounded w-28 mb-3"></div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="h-5 bg-gray-200 rounded w-24 mb-3"></div>
              <div className="h-12 bg-gray-200 rounded mb-3"></div>
              <div className="h-12 bg-gray-200 rounded mb-3"></div>
              <div className="h-5 bg-gray-200 rounded w-20 mb-3"></div>
              <div className="space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded w-16 inline-block"></div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Layout section skeleton */}
        <section className="space-y-6">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="h-5 bg-gray-200 rounded w-20 mb-3"></div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="h-5 bg-gray-200 rounded w-32 mb-3"></div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// Error boundary for appearance settings
class AppearanceSettingsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AppearanceSettings error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="spacing-stack-xl pb-16 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <header className="spacing-stack-sm">
            <h1 className="typography-hero text-danger">Something went wrong</h1>
            <p className="typography-body text-text-muted">
              We encountered an error loading the appearance settings. Please try refreshing the page.
            </p>
            <button 
              type="button" 
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="cursor-pointer typography-caption text-danger">Error details</summary>
                <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </header>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function AppearanceSettingsPage() {
  const [isReady, setIsReady] = useState(false);
  const customizationStore = useCustomizationStore();
  const themeSystemStore = useThemeSystemStore();

  useEffect(() => {
    // Initialize both stores
    customizationStore.hydrate();
    themeSystemStore.hydrate();
  }, [customizationStore, themeSystemStore]);

  useEffect(() => {
    // Check if both stores are hydrated
    const checkHydration = () => {
      if (customizationStore.isHydrated && themeSystemStore.isHydrated) {
        setIsReady(true);
      }
    };

    checkHydration();

    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (!isReady) {
        console.warn('Appearance settings timeout - forcing render');
        setIsReady(true);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [customizationStore.isHydrated, themeSystemStore.isHydrated, isReady]);

  if (!isReady) {
    return <AppearanceSettingsSkeleton />;
  }

  return (
    <AppearanceSettingsErrorBoundary>
      <AppearanceSettings />
    </AppearanceSettingsErrorBoundary>
  );
}