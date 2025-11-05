import type { ReactNode } from 'react';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import Globe from '../Globe';
import { useStore } from '../../../lib/store';
import { CAMPUS_COORDINATES } from '../../../lib/campusCoordinates';
import type { Community } from '../../../lib/communities/types';

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: ReactNode }) => <div data-testid="globe-canvas">{children}</div>,
  useFrame: () => {},
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  Sphere: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Html: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const renderGlobe = () =>
  render(
    <MemoryRouter>
      <Globe />
    </MemoryRouter>
  );

const createCommunity = (code: string, overrides: Partial<Community> = {}): Community => ({
  id: `community-${code.toLowerCase()}`,
  name: `Campus ${code}`,
  slug: code.toLowerCase(),
  shortCode: code,
  description: `Community for ${code}`,
  city: 'City',
  state: 'State',
  country: 'India',
  logoUrl: `/logos/${code}.png`,
  bannerUrl: `/banners/${code}.jpg`,
  guidelinesUrl: `/guidelines/${code}`,
  memberCount: 1000,
  postCount: 150,
  visibility: 'public',
  rules: [],
  tags: [],
  createdAt: Date.now(),
  lastActivityAt: Date.now(),
  isVerified: true,
  ...overrides,
});

describe('Globe component', () => {
  const defaultMatchMedia = window.matchMedia;
  const originalStoreSnapshot = {
    communities: useStore.getState().communities,
    communityActivity: useStore.getState().communityActivity,
    posts: useStore.getState().posts,
  };

  const setViewport = (matches: boolean) => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches,
      media: '(max-width: 768px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  };

  const resetStore = () => {
    act(() => {
      useStore.setState({
        communities: originalStoreSnapshot.communities,
        communityActivity: originalStoreSnapshot.communityActivity,
        posts: originalStoreSnapshot.posts,
      });
    });
  };

  beforeEach(() => {
    setViewport(false);
  });

  afterEach(() => {
    window.matchMedia = defaultMatchMedia;
    resetStore();
  });

  it('renders the 3D globe by default on desktop viewports', () => {
    const campusCodes = Object.keys(CAMPUS_COORDINATES).slice(0, 2);
    const communities = campusCodes.map((code) => createCommunity(code));

    act(() => {
      useStore.setState({
        communities,
        communityActivity: [],
        posts: [],
      });
    });

    renderGlobe();

    expect(screen.getByRole('heading', { name: /connect across campuses/i })).toBeInTheDocument();
    expect(screen.getByTestId('globe-canvas')).toBeInTheDocument();
    expect(screen.queryByTestId('globe-fallback')).not.toBeInTheDocument();
  });

  it('creates markers for every campus with coordinates', () => {
    const campusCodes = Object.keys(CAMPUS_COORDINATES).slice(0, 3);
    const communities = campusCodes.map((code, index) =>
      createCommunity(code, {
        memberCount: 800 + index * 200,
        postCount: 120 + index * 50,
      })
    );

    act(() => {
      useStore.setState({
        communities,
        communityActivity: [],
        posts: [],
      });
    });

    renderGlobe();

    const markerItems = screen.getAllByTestId('globe-marker-item');
    expect(markerItems).toHaveLength(communities.length);
  });

  it('renders the 2D fallback map when the viewport is mobile-sized', () => {
    setViewport(true);

    const campusCodes = Object.keys(CAMPUS_COORDINATES).slice(0, 3);
    const communities = campusCodes.map((code) => createCommunity(code));

    act(() => {
      useStore.setState({
        communities,
        communityActivity: [],
        posts: [],
      });
    });

    renderGlobe();

    expect(screen.getByTestId('globe-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('globe-canvas')).not.toBeInTheDocument();
  });
});
