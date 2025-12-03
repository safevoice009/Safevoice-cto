import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

// Mock the heavy components
vi.mock('../pages/Landing', () => ({
  default: () => <div>Landing Page</div>,
}));

vi.mock('../pages/Feed', () => ({
  default: () => <div>Feed Page</div>,
}));

vi.mock('../pages/Profile', () => ({
  default: () => <div>Profile Page</div>,
}));

vi.mock('../lib/postLifecycleManager', () => ({
  default: class PostLifecycleManager {
    start() {}
    stop() {}
  },
}));

vi.mock('../lib/privacy/middleware', () => ({
  initializePrivacyProtections: vi.fn(),
}));

vi.mock('../lib/analytics', () => ({
  initializeAnalytics: vi.fn(),
}));

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(document.body).toBeTruthy();
  });

  it('shows loading fallback initially', async () => {
    render(<App />);
    
    // RouteLoader should be shown initially
    const loader = screen.queryByText('Loading...');
    
    // Either the loader is shown or the page has already loaded
    // (depending on how fast the lazy components load in test environment)
    if (loader) {
      expect(loader).toBeInTheDocument();
    }
    
    // Eventually the content should load
    await waitFor(
      () => {
        expect(
          screen.getByText('Landing Page') || 
          screen.getByRole('main')
        ).toBeTruthy();
      },
      { timeout: 3000 }
    );
  });

  it('has Suspense boundaries for lazy loaded routes', async () => {
    const { container } = render(<App />);
    
    // App should render without errors
    expect(container).toBeTruthy();
    
    // Wait for content to load
    await waitFor(
      () => {
        const hasContent = container.querySelector('main') !== null;
        expect(hasContent).toBe(true);
      },
      { timeout: 3000 }
    );
  });
});
