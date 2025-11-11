import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { HTMLAttributes } from 'react';
import RecorderPrivacyGate from '../RecorderPrivacyGate';
import { useRecorderPrivacyStore } from '../../../lib/recorderPrivacyStore';
import { useFingerprintStore } from '../../../lib/fingerprintStore';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../../lib/privacy/middleware', () => ({
  getPrivacyStatus: () => ({
    webrtcProtected: true,
    cookiesBlocked: true,
    httpsEnforced: true,
    allowedDomains: ['localhost'],
    allowedStorageKeys: [],
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('RecorderPrivacyGate', () => {
  beforeEach(() => {
    useRecorderPrivacyStore.setState({
      currentDecision: null,
      sessionId: 'test-session',
      decisionHistory: [],
      rememberChoices: false,
      autoAllowLowRisk: true,
    });

    useFingerprintStore.setState({
      currentSnapshot: null,
      detectionEnabled: false,
      mitigationEnabled: false,
      currentSalt: 'test-salt',
      lastRotation: null,
      rotationHistory: [],
      activeMitigationPlan: null,
      lastCollectionTimestamp: null,
      autoRotateInterval: 86400000,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <RecorderPrivacyGate
        isOpen={false}
        onApproved={vi.fn()}
      />
    );

    expect(container.firstChild?.childNodes.length).toBe(0);
  });

  it('displays loading state initially', async () => {
    render(
      <RecorderPrivacyGate
        isOpen={true}
        onApproved={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  it('displays privacy check UI with checklist items', async () => {
    render(
      <RecorderPrivacyGate
        isOpen={true}
        onApproved={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/privacy check/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/data handling transparency/i)).toBeInTheDocument();
    expect(screen.getByText(/anonymization & privacy/i)).toBeInTheDocument();
    expect(screen.getByText(/browser fingerprint protection/i)).toBeInTheDocument();
  });

  it('shows privacy status information', async () => {
    render(
      <RecorderPrivacyGate
        isOpen={true}
        onApproved={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/your privacy status/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/webrtc ip leak protection/i)).toBeInTheDocument();
    expect(screen.getByText(/cookies blocked/i)).toBeInTheDocument();
  });

  it('displays crisis mode title when isCrisisMode is true', async () => {
    render(
      <RecorderPrivacyGate
        isOpen={true}
        onApproved={vi.fn()}
        isCrisisMode={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/we take extra care with your sensitive information/i)).toBeInTheDocument();
    });
  });

  it('allows acknowledging data handling', async () => {
    const user = userEvent.setup();
    render(
      <RecorderPrivacyGate
        isOpen={true}
        onApproved={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/data handling transparency/i)).toBeInTheDocument();
    });

    const dataHandlingButton = screen.getByText(/data handling transparency/i).closest('button');
    await user.click(dataHandlingButton!);

    const state = useRecorderPrivacyStore.getState();
    expect(state.currentDecision?.checks.dataHandlingAcknowledged).toBe(true);
  });

  it('allows acknowledging anonymization', async () => {
    const user = userEvent.setup();
    render(
      <RecorderPrivacyGate
        isOpen={true}
        onApproved={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/anonymization & privacy/i)).toBeInTheDocument();
    });

    const anonButton = screen.getByText(/anonymization & privacy/i).closest('button');
    await user.click(anonButton!);

    const state = useRecorderPrivacyStore.getState();
    expect(state.currentDecision?.checks.anonymizationAcknowledged).toBe(true);
  });

  it('disables approve button until all checks are complete', async () => {
    const user = userEvent.setup();
    const onApproved = vi.fn();

    render(
      <RecorderPrivacyGate
        isOpen={true}
        onApproved={onApproved}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/data handling transparency/i)).toBeInTheDocument();
    });

    // Try to approve without completing checks
    const approveButton = screen.getByText(/continue to recording/i);
    expect(approveButton).toBeDisabled();

    // Acknowledge both checks
    const dataHandlingButton = screen.getByText(/data handling transparency/i).closest('button');
    await user.click(dataHandlingButton!);

    const anonButton = screen.getByText(/anonymization & privacy/i).closest('button');
    await user.click(anonButton!);

    // Now approve button should be enabled
    await waitFor(() => {
      expect(approveButton).not.toBeDisabled();
    });
  });

  it('calls onApproved callback when all checks are complete and approve is clicked', async () => {
    const user = userEvent.setup();
    const onApproved = vi.fn();

    render(
      <RecorderPrivacyGate
        isOpen={true}
        onApproved={onApproved}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/data handling transparency/i)).toBeInTheDocument();
    });

    // Complete all checks
    const dataHandlingButton = screen.getByText(/data handling transparency/i).closest('button');
    await user.click(dataHandlingButton!);

    const anonButton = screen.getByText(/anonymization & privacy/i).closest('button');
    await user.click(anonButton!);

    // Click approve
    const approveButton = screen.getByText(/continue to recording/i);
    await user.click(approveButton);

    await waitFor(() => {
      expect(onApproved).toHaveBeenCalled();
    });
  });

  it('calls onDismissed callback when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onDismissed = vi.fn();

    render(
      <RecorderPrivacyGate
        isOpen={true}
        onApproved={vi.fn()}
        onDismissed={onDismissed}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/privacy check/i)).toBeInTheDocument();
    });

    const cancelButton = screen.getByText(/cancel/i);
    await user.click(cancelButton);

    expect(onDismissed).toHaveBeenCalled();
  });

  it('displays fingerprint risk level when available', async () => {
    useFingerprintStore.setState({
      currentSnapshot: {
        id: 'snapshot-1',
        timestamp: Date.now(),
        signals: [],
        riskScore: 0.7,
        salt: 'test-salt',
        isHighRisk: true,
        matchedTrackers: ['canvas-fingerprint'],
      },
    });

    render(
      <RecorderPrivacyGate
        isOpen={true}
        onApproved={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/fingerprint risk.*high/i)).toBeInTheDocument();
    });
  });

  it('shows warning when fingerprint risk is high', async () => {
    useFingerprintStore.setState({
      currentSnapshot: {
        id: 'snapshot-1',
        timestamp: Date.now(),
        signals: [],
        riskScore: 0.8,
        salt: 'test-salt',
        isHighRisk: true,
        matchedTrackers: ['canvas', 'webgl'],
      },
    });

    render(
      <RecorderPrivacyGate
        isOpen={true}
        onApproved={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/multiple tracking signals detected/i)).toBeInTheDocument();
    });
  });

  it('displays continue to crisis support button when in crisis mode', async () => {
    const user = userEvent.setup();
    const onApproved = vi.fn();

    render(
      <RecorderPrivacyGate
        isOpen={true}
        onApproved={onApproved}
        isCrisisMode={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/continue to crisis support/i)).toBeInTheDocument();
    });

    // Complete checks
    const dataHandlingButton = screen.getByText(/data handling transparency/i).closest('button');
    await user.click(dataHandlingButton!);

    const anonButton = screen.getByText(/anonymization & privacy/i).closest('button');
    await user.click(anonButton!);

    // Approve
    const approveButton = screen.getByText(/continue to crisis support/i);
    await user.click(approveButton);

    expect(onApproved).toHaveBeenCalled();
  });

  it('prevents approval with blocked reasons', async () => {
    const onApproved = vi.fn();
    const recordBlockedReason = useRecorderPrivacyStore.getState().recordBlockedReason;

    render(
      <RecorderPrivacyGate
        isOpen={true}
        onApproved={onApproved}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/privacy check/i)).toBeInTheDocument();
    });

    // Record a blocked reason
    recordBlockedReason('VPN detected');

    const approveButton = screen.getByText(/continue to recording/i);
    expect(approveButton).toBeDisabled();
  });
});
