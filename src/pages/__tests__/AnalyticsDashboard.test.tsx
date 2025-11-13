import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AnalyticsDashboard from '../AnalyticsDashboard';

// Mock the analytics store
vi.mock('../../lib/analytics/analyticsStore', () => ({
  useAnalyticsStore: vi.fn(),
}));

import { useAnalyticsStore } from '../../lib/analytics/analyticsStore';
const mockUseAnalyticsStore = useAnalyticsStore as unknown as ReturnType<typeof vi.fn>;

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  it('should render loading state initially', () => {
    mockUseAnalyticsStore.mockReturnValue({
      getReport: vi.fn(() => null),
      refreshReport: vi.fn(),
      getMAU: vi.fn(() => 0),
      getDAU: vi.fn(() => 0),
      getAvgSessionDuration: vi.fn(() => 0),
      getTimeSeriesData: vi.fn(() => []),
      selectedTimeRange: '30d',
      setTimeRange: vi.fn(),
      trackingEnabled: true,
      optedOut: false,
    });

    renderWithRouter(<AnalyticsDashboard />);
    
    // Check for spinner element
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should show opted out message when opted out', async () => {
    mockUseAnalyticsStore.mockReturnValue({
      getReport: vi.fn(() => null),
      refreshReport: vi.fn(),
      getMAU: vi.fn(() => 0),
      getDAU: vi.fn(() => 0),
      getAvgSessionDuration: vi.fn(() => 0),
      getTimeSeriesData: vi.fn(() => []),
      selectedTimeRange: '30d',
      setTimeRange: vi.fn(),
      trackingEnabled: false,
      optedOut: true,
    });

    renderWithRouter(<AnalyticsDashboard />);
    
    await waitFor(() => {
      // Check for the Shield icon and yellow background (opted out state)
      const yellowDiv = document.querySelector('.bg-yellow-50');
      expect(yellowDiv).toBeInTheDocument();
    });
  });

  it('should render analytics metrics when data is available', async () => {
    const mockReport = {
      metrics: [
        {
          date: '2024-01-01',
          dau: 10,
          sessions: 15,
          totalEvents: 100,
          avgSessionDuration: 300000,
          postsCreated: 20,
          commentsCreated: 30,
          reactionsGiven: 40,
          communitiesJoined: 5,
          encryptionUsage: 10,
          fingerprintProtectionUsage: 8,
          privacyOnboardingCompleted: 3,
          walletConnections: 7,
          rewardsClaimed: 12,
          premiumActivations: 2,
        },
      ],
      features: [
        {
          featureName: 'Encryption',
          totalUsage: 50,
          uniqueUsers: 10,
          firstUsed: Date.now(),
          lastUsed: Date.now(),
          adoptionRate: 50,
        },
      ],
      communityHealth: {
        totalPosts: 100,
        totalComments: 150,
        totalReactions: 200,
        activeCommunities: 5,
        avgPostsPerDay: 10,
        avgCommentsPerPost: 1.5,
        engagementRate: 75,
      },
      totalSessions: 50,
      totalEvents: 500,
      dateRange: {
        start: '2024-01-01',
        end: '2024-01-31',
      },
    };

    mockUseAnalyticsStore.mockReturnValue({
      getReport: vi.fn(() => mockReport),
      refreshReport: vi.fn(),
      getMAU: vi.fn(() => 25),
      getDAU: vi.fn(() => 10),
      getAvgSessionDuration: vi.fn(() => 300000),
      getTimeSeriesData: vi.fn(() => []),
      selectedTimeRange: '30d',
      setTimeRange: vi.fn(),
      trackingEnabled: true,
      optedOut: false,
    });

    renderWithRouter(<AnalyticsDashboard />);
    
    await waitFor(() => {
      // Check for key metrics container
      const metricsGrid = document.querySelector('.grid');
      expect(metricsGrid).toBeInTheDocument();
    });

    // Check for key metrics values
    expect(screen.getByText('25')).toBeInTheDocument(); // MAU
    expect(screen.getByText('10')).toBeInTheDocument(); // DAU
    expect(screen.getByText('50')).toBeInTheDocument(); // Total sessions
  });

  it('should render time range selector', async () => {
    const mockReport = {
      metrics: [],
      features: [],
      communityHealth: {
        totalPosts: 0,
        totalComments: 0,
        totalReactions: 0,
        activeCommunities: 0,
        avgPostsPerDay: 0,
        avgCommentsPerPost: 0,
        engagementRate: 0,
      },
      totalSessions: 0,
      totalEvents: 0,
      dateRange: { start: '', end: '' },
    };

    mockUseAnalyticsStore.mockReturnValue({
      getReport: vi.fn(() => mockReport),
      refreshReport: vi.fn(),
      getMAU: vi.fn(() => 0),
      getDAU: vi.fn(() => 0),
      getAvgSessionDuration: vi.fn(() => 0),
      getTimeSeriesData: vi.fn(() => []),
      selectedTimeRange: '30d',
      setTimeRange: vi.fn(),
      trackingEnabled: true,
      optedOut: false,
    });

    renderWithRouter(<AnalyticsDashboard />);
    
    await waitFor(() => {
      // Check for time range buttons
      const buttons = document.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('should render feature adoption section', async () => {
    const mockReport = {
      metrics: [],
      features: [
        {
          featureName: 'Encryption',
          totalUsage: 50,
          uniqueUsers: 10,
          firstUsed: Date.now(),
          lastUsed: Date.now(),
          adoptionRate: 50,
        },
      ],
      communityHealth: {
        totalPosts: 0,
        totalComments: 0,
        totalReactions: 0,
        activeCommunities: 0,
        avgPostsPerDay: 0,
        avgCommentsPerPost: 0,
        engagementRate: 0,
      },
      totalSessions: 0,
      totalEvents: 0,
      dateRange: { start: '', end: '' },
    };

    mockUseAnalyticsStore.mockReturnValue({
      getReport: vi.fn(() => mockReport),
      refreshReport: vi.fn(),
      getMAU: vi.fn(() => 0),
      getDAU: vi.fn(() => 0),
      getAvgSessionDuration: vi.fn(() => 0),
      getTimeSeriesData: vi.fn(() => []),
      selectedTimeRange: '30d',
      setTimeRange: vi.fn(),
      trackingEnabled: true,
      optedOut: false,
    });

    renderWithRouter(<AnalyticsDashboard />);
    
    await waitFor(() => {
      // Check for feature adoption container
      const sections = document.querySelectorAll('.rounded-lg');
      expect(sections.length).toBeGreaterThan(0);
      
      // Check for Encryption text
      expect(screen.getByText('Encryption')).toBeInTheDocument();
    });
  });

  it('should render privacy notice', async () => {
    const mockReport = {
      metrics: [],
      features: [],
      communityHealth: {
        totalPosts: 0,
        totalComments: 0,
        totalReactions: 0,
        activeCommunities: 0,
        avgPostsPerDay: 0,
        avgCommentsPerPost: 0,
        engagementRate: 0,
      },
      totalSessions: 0,
      totalEvents: 0,
      dateRange: { start: '', end: '' },
    };

    mockUseAnalyticsStore.mockReturnValue({
      getReport: vi.fn(() => mockReport),
      refreshReport: vi.fn(),
      getMAU: vi.fn(() => 0),
      getDAU: vi.fn(() => 0),
      getAvgSessionDuration: vi.fn(() => 0),
      getTimeSeriesData: vi.fn(() => []),
      selectedTimeRange: '30d',
      setTimeRange: vi.fn(),
      trackingEnabled: true,
      optedOut: false,
    });

    renderWithRouter(<AnalyticsDashboard />);
    
    await waitFor(() => {
      // Check for blue privacy notice background
      const blueDiv = document.querySelector('.bg-blue-50');
      expect(blueDiv).toBeInTheDocument();
    });
  });

  it('should format duration correctly', async () => {
    const mockReport = {
      metrics: [],
      features: [],
      communityHealth: {
        totalPosts: 0,
        totalComments: 0,
        totalReactions: 0,
        activeCommunities: 0,
        avgPostsPerDay: 0,
        avgCommentsPerPost: 0,
        engagementRate: 0,
      },
      totalSessions: 0,
      totalEvents: 0,
      dateRange: { start: '', end: '' },
    };

    mockUseAnalyticsStore.mockReturnValue({
      getReport: vi.fn(() => mockReport),
      refreshReport: vi.fn(),
      getMAU: vi.fn(() => 0),
      getDAU: vi.fn(() => 0),
      getAvgSessionDuration: vi.fn(() => 3600000), // 1 hour
      getTimeSeriesData: vi.fn(() => []),
      selectedTimeRange: '30d',
      setTimeRange: vi.fn(),
      trackingEnabled: true,
      optedOut: false,
    });

    renderWithRouter(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/1h 0m/i)).toBeInTheDocument();
    });
  });
});
