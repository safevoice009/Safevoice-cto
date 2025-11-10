import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import FingerprintControls from '../FingerprintControls';
import { useFingerprintStore } from '../../../lib/fingerprintStore';

// Mock the fingerprint store
vi.mock('../../../lib/fingerprintStore', () => ({
  useFingerprintStore: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

// Mock react-i18next
vi.mock('react-i18next', async () => {
  const actual = await vi.importActual('react-i18next');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, fallback?: string) => fallback || key,
    }),
  };
});

// Create test i18n instance
const testI18n = {
  language: 'en',
  t: (key: string, fallback?: string) => fallback || key,
  changeLanguage: () => Promise.resolve(),
  on: () => {},
  off: () => {},
};

const renderWithI18n = (component: React.ReactElement) => {
  return render(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <I18nextProvider i18n={testI18n as any}>
      {component}
    </I18nextProvider>
  );
};

describe('FingerprintControls', () => {
  const mockStore = {
    currentSnapshot: null,
    detectionEnabled: true,
    mitigationEnabled: false,
    lastRotation: null,
    getRiskLevel: vi.fn(() => 'low'),
    getRiskScore: vi.fn(() => 0.3),
    getDetectionStatus: vi.fn(() => 'idle'),
    isHighRisk: vi.fn(() => false),
    getMatchedTrackers: vi.fn(() => []),
    collectFingerprint: vi.fn(),
    rotateSalt: vi.fn(),
    toggleDetection: vi.fn(),
    toggleMitigation: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useFingerprintStore as any).mockReturnValue(mockStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the component with title and description', () => {
    renderWithI18n(<FingerprintControls />);

    expect(screen.getByText('Browser Fingerprint Protection')).toBeInTheDocument();
    expect(screen.getByText(/Monitor and protect against browser fingerprinting/)).toBeInTheDocument();
  });

  it('displays risk level and score when fingerprint is collected', () => {
    const collectedMockStore = {
      ...mockStore,
      currentSnapshot: {
        id: 'test-snapshot',
        timestamp: Date.now(),
        signals: [
          { id: 'canvas', value: 'test', timestamp: Date.now(), riskScore: 0.9, isStable: true },
          { id: 'webgl', value: 'test', timestamp: Date.now(), riskScore: 0.8, isStable: true },
        ],
        riskScore: 0.85,
        salt: 'test-salt',
        isHighRisk: true,
        matchedTrackers: ['canvas', 'webgl'],
      },
      getRiskScore: vi.fn(() => 0.85),
      getDetectionStatus: vi.fn(() => 'collected'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useFingerprintStore as any).mockReturnValue(collectedMockStore);

    renderWithI18n(<FingerprintControls />);

    expect(screen.getByText('Risk Score:')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Signals Detected:')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows matched trackers alert when high-risk signals detected', () => {
    const highRiskMockStore = {
      ...mockStore,
      currentSnapshot: {
        id: 'test-snapshot',
        timestamp: Date.now(),
        signals: [],
        riskScore: 0.85,
        salt: 'test-salt',
        isHighRisk: true,
        matchedTrackers: ['canvas', 'webgl'],
      },
      getRiskLevel: vi.fn(() => 'high'),
      getRiskScore: vi.fn(() => 0.85),
      isHighRisk: vi.fn(() => true),
      getMatchedTrackers: vi.fn(() => ['canvas', 'webgl']),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useFingerprintStore as any).mockReturnValue(highRiskMockStore);

    renderWithI18n(<FingerprintControls />);

    expect(screen.getByText('High-Risk Tracking Signals Detected')).toBeInTheDocument();
    expect(screen.getByText('• canvas')).toBeInTheDocument();
    expect(screen.getByText('• webgl')).toBeInTheDocument();
  });

  it('toggles detection when switch is clicked', () => {
    renderWithI18n(<FingerprintControls />);

    const detectionSwitch = screen.getAllByRole('switch')[0];
    fireEvent.click(detectionSwitch);

    expect(mockStore.toggleDetection).toHaveBeenCalledTimes(1);
  });

  it('toggles mitigation when switch is clicked', () => {
    renderWithI18n(<FingerprintControls />);

    const mitigationSwitch = screen.getAllByRole('switch')[1];
    fireEvent.click(mitigationSwitch);

    expect(mockStore.toggleMitigation).toHaveBeenCalledTimes(1);
  });

  it('rotates salt when button is clicked', () => {
    renderWithI18n(<FingerprintControls />);

    const rotateButton = screen.getByText('Rotate Now');
    fireEvent.click(rotateButton);

    expect(mockStore.rotateSalt).toHaveBeenCalledWith('User initiated rotation');
  });

  it('refreshes detection when button is clicked', () => {
    renderWithI18n(<FingerprintControls />);

    // Clear the initial mount call
    vi.clearAllMocks();

    const refreshButton = screen.getByText('Refresh Detection');
    fireEvent.click(refreshButton);

    expect(mockStore.collectFingerprint).toHaveBeenCalledTimes(1);
  });

  it('calls collectFingerprint on mount if detection is enabled and status is idle', async () => {
    renderWithI18n(<FingerprintControls />);

    await waitFor(() => {
      expect(mockStore.collectFingerprint).toHaveBeenCalled();
    });
  });

  it('does not call collectFingerprint on mount if detection is disabled', async () => {
    const disabledMockStore = {
      ...mockStore,
      detectionEnabled: false,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useFingerprintStore as any).mockReturnValue(disabledMockStore);

    renderWithI18n(<FingerprintControls />);

    await waitFor(() => {
      expect(mockStore.collectFingerprint).not.toHaveBeenCalled();
    });
  });

  it('displays mitigation active indicator when mitigation is enabled and high risk', () => {
    const activeMitigationStore = {
      ...mockStore,
      mitigationEnabled: true,
      isHighRisk: vi.fn(() => true),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useFingerprintStore as any).mockReturnValue(activeMitigationStore);

    renderWithI18n(<FingerprintControls />);

    expect(screen.getByText('Mitigation active')).toBeInTheDocument();
  });

  it('renders with proper ARIA labels', () => {
    renderWithI18n(<FingerprintControls />);

    expect(screen.getByLabelText('Toggle fingerprint detection')).toBeInTheDocument();
    expect(screen.getByLabelText('Toggle auto-mitigation')).toBeInTheDocument();
    expect(screen.getByLabelText('Rotate salt')).toBeInTheDocument();
    expect(screen.getByLabelText('Refresh detection')).toBeInTheDocument();
  });

  it('formats timestamp correctly for last rotation', () => {
    const timestamp = Date.now();
    const mockWithRotation = {
      ...mockStore,
      lastRotation: {
        previousSalt: 'old-salt',
        newSalt: 'new-salt',
        timestamp,
        reason: 'Test rotation',
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useFingerprintStore as any).mockReturnValue(mockWithRotation);

    renderWithI18n(<FingerprintControls />);

    const dateStr = new Date(timestamp).toLocaleString();
    expect(screen.getByText(`Last rotated: ${dateStr}`)).toBeInTheDocument();
  });

  it('displays "Never" when last rotation is null', () => {
    renderWithI18n(<FingerprintControls />);

    expect(screen.getByText('Last rotated: Never')).toBeInTheDocument();
  });

  it('renders risk level badge with correct styling for high risk', () => {
    const highRiskMockStore = {
      ...mockStore,
      getRiskLevel: vi.fn(() => 'high'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useFingerprintStore as any).mockReturnValue(highRiskMockStore);

    const { container } = renderWithI18n(<FingerprintControls />);

    const banner = container.querySelector('.bg-red-500\\/10');
    expect(banner).toBeInTheDocument();
  });

  it('renders risk level badge with correct styling for medium risk', () => {
    const mediumRiskMockStore = {
      ...mockStore,
      getRiskLevel: vi.fn(() => 'medium'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useFingerprintStore as any).mockReturnValue(mediumRiskMockStore);

    const { container } = renderWithI18n(<FingerprintControls />);

    const banner = container.querySelector('.bg-yellow-500\\/10');
    expect(banner).toBeInTheDocument();
  });

  it('renders risk level badge with correct styling for low risk', () => {
    const { container } = renderWithI18n(<FingerprintControls />);

    const banner = container.querySelector('.bg-green-500\\/10');
    expect(banner).toBeInTheDocument();
  });
});
