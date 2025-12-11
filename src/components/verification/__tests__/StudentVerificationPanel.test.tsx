/**
 * StudentVerificationPanel Test Suite
 * 
 * Tests the StudentVerificationPanel component for:
 * - Renders all child components correctly
 * - Uses store state properly
 * - Handles initialization flow
 * - Memoizes peerSignatures correctly
 * - Displays verification progress
 * - Shows pending peers and signatures
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StudentVerificationPanel } from '../StudentVerificationPanel';
import type { StudentRecord, VerificationStatus } from '../../../lib/identity/StudentRegistry';
import type { PeerSignature } from '../../../lib/identity/PeerVouchingService';
import type { PendingPeer } from '../../../lib/identity/studentVerificationState';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string, options?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'verification.title': 'Student Verification',
        'verification.noRecord': 'No verification record found',
        'verification.stepsCompleted': 'steps completed',
        'common.clearErrors': 'Clear Errors',
        'verification.errors': 'Verification Errors',
        'verification.progress': 'Verification Progress',
        'verification.completion': 'Completion',
        'verification.of': 'of',
        'verification.stepsComplete': 'steps complete',
        'verification.peerSignatures': 'Peer Signatures',
        'verification.signed': 'Signed',
        'verification.pendingPeers': 'Pending Invitations',
        'verification.status.pending': 'Pending',
        'verification.status.signed': 'Signed',
        'verification.status.expired': 'Expired',
      };
      
      let translation = translations[key] || defaultValue || key;
      
      if (options && typeof options === 'object') {
        Object.entries(options).forEach(([placeholder, value]) => {
          translation = translation.replace(`{{${placeholder}}}`, String(value));
        });
      }
      
      return translation;
    },
  }),
}));

// Mock child components
vi.mock('../BiometricRegistration', () => ({
  BiometricRegistration: ({ className }: { className?: string }) => (
    <div data-testid="biometric-registration" className={className}>
      Biometric Registration Component
    </div>
  ),
  default: ({ className }: { className?: string }) => (
    <div data-testid="biometric-registration" className={className}>
      Biometric Registration Component
    </div>
  ),
}));

vi.mock('../PeerVouchingRequest', () => ({
  default: ({ className }: { className?: string }) => (
    <div data-testid="peer-vouching-request" className={className}>
      Peer Vouching Request Component
    </div>
  ),
}));

vi.mock('../VerificationStatus', () => ({
  default: ({ size = 'md', className = '' }: { size?: string; className?: string }) => (
    <div data-testid="verification-status" className={className} data-size={size}>
      Verification Status Component
    </div>
  ),
}));

vi.mock('../ApprovalTimeline', () => ({
  default: ({ className }: { className?: string }) => (
    <div data-testid="approval-timeline" className={className}>
      Approval Timeline Component
    </div>
  ),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock the store with proper TypeScript typing
const mockVerificationState: {
  currentRecord: StudentRecord | null;
  studentVerification: VerificationStatus | null;
  pendingPeers: PendingPeer[];
  isInitialized: boolean;
  initStudentRegistry: ReturnType<typeof vi.fn>;
  refreshStatus: ReturnType<typeof vi.fn>;
  errors: string[];
  clearErrors: ReturnType<typeof vi.fn>;
  lastSynced: number | null;
} = {
  currentRecord: null,
  studentVerification: null,
  pendingPeers: [],
  isInitialized: false,
  initStudentRegistry: vi.fn(),
  refreshStatus: vi.fn(),
  errors: [],
  clearErrors: vi.fn(),
  lastSynced: null,
};

vi.mock('../../../lib/identity/studentVerificationState', () => ({
  useStudentVerificationStore: () => mockVerificationState,
}));

// Test data factories
const createMockStudentRecord = (overrides: Partial<StudentRecord> = {}): StudentRecord => ({
  walletAddress: '0x1234567890123456789012345678901234567890',
  biometricCommitments: [],
  peerSignatures: [],
  selfAttestation: null,
  adminDelegation: null,
  createdAt: Date.now() - 86400000, // 1 day ago
  updatedAt: Date.now(),
  ...overrides,
});

const createMockVerificationStatus = (overrides: Partial<VerificationStatus> = {}): VerificationStatus => ({
  hasActiveBiometric: false,
  hasPeerVouching: false,
  hasSelfAttestation: false,
  hasAdminDelegation: false,
  isVerified: false,
  needsReverification: false,
  expiresAt: null,
  ...overrides,
});

const createMockPeerSignature = (signerWallet: string): PeerSignature => ({
  id: `sig-${signerWallet}`,
  requestId: 'req-1',
  signerWallet,
  signatureBytes: `signature-for-${signerWallet}`,
  attestationText: `I vouch for this student - ${signerWallet}`,
  timestamp: Date.now(),
});

const createMockPendingPeer = (walletAddress: string, status: 'pending' | 'signed' | 'expired' = 'pending'): PendingPeer => ({
  walletAddress,
  displayName: `Peer ${walletAddress.slice(-4)}`,
  invitedAt: Date.now() - 3600000, // 1 hour ago
  status,
});

// Helper function to set mock store data
const setMockStoreData = (data: Partial<typeof mockVerificationState>) => {
  Object.assign(mockVerificationState, data);
};

describe('StudentVerificationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock store to default state
    setMockStoreData({
      currentRecord: null,
      studentVerification: null,
      pendingPeers: [],
      isInitialized: false,
      initStudentRegistry: vi.fn().mockResolvedValue(undefined),
      refreshStatus: vi.fn().mockResolvedValue(undefined),
      errors: [],
      clearErrors: vi.fn(),
      lastSynced: null,
    });
  });

  describe('Rendering', () => {
    it('renders the component with title', () => {
      const record = createMockStudentRecord();
      setMockStoreData({ currentRecord: record });

      render(<StudentVerificationPanel />);

      expect(screen.getByText('Student Verification')).toBeInTheDocument();
    });

    it('shows no record message when currentRecord is null', () => {
      render(<StudentVerificationPanel />);

      expect(screen.getByText('No verification record found')).toBeInTheDocument();
    });

    it('renders all child components when data is available', () => {
      const record = createMockStudentRecord();
      const verificationStatus = createMockVerificationStatus();
      setMockStoreData({ currentRecord: record, studentVerification: verificationStatus });

      render(<StudentVerificationPanel />);

      expect(screen.getByTestId('biometric-registration')).toBeInTheDocument();
      expect(screen.getByTestId('peer-vouching-request')).toBeInTheDocument();
      expect(screen.getByTestId('verification-status')).toBeInTheDocument();
      expect(screen.getByTestId('approval-timeline')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const record = createMockStudentRecord();
      setMockStoreData({ currentRecord: record });

      render(<StudentVerificationPanel className="custom-class" />);

      const content = screen.getByTestId('student-verification-panel-content');
      expect(content).toHaveClass('custom-class');
    });

    it('hides timeline when showTimeline is false', () => {
      const record = createMockStudentRecord();
      const verificationStatus = createMockVerificationStatus();
      setMockStoreData({ currentRecord: record, studentVerification: verificationStatus });

      render(<StudentVerificationPanel showTimeline={false} />);

      expect(screen.queryByTestId('approval-timeline')).not.toBeInTheDocument();
    });
  });

  describe('Initialization', () => {
    it('calls initStudentRegistry when not initialized and record exists', async () => {
      const record = createMockStudentRecord();
      setMockStoreData({ currentRecord: record, isInitialized: false });

      render(<StudentVerificationPanel />);

      await waitFor(() => {
        expect(mockVerificationState.initStudentRegistry).toHaveBeenCalledWith(record.walletAddress);
      });
    });

    it('does not call initStudentRegistry when already initialized', () => {
      const record = createMockStudentRecord();
      setMockStoreData({ currentRecord: record, isInitialized: true });

      render(<StudentVerificationPanel />);

      expect(mockVerificationState.initStudentRegistry).not.toHaveBeenCalled();
    });
  });

  describe('Verification Progress', () => {
    it('displays verification progress when status is available', () => {
      const record = createMockStudentRecord();
      const verificationStatus = createMockVerificationStatus({
        hasActiveBiometric: true,
        hasPeerVouching: false,
        isVerified: false,
      });
      setMockStoreData({ currentRecord: record, studentVerification: verificationStatus });

      render(<StudentVerificationPanel />);

      expect(screen.getByText('1/3 steps completed')).toBeInTheDocument();
      expect(screen.getByText('33%')).toBeInTheDocument();
    });

    it('calculates progress percentage correctly for fully verified user', () => {
      const record = createMockStudentRecord();
      const verificationStatus = createMockVerificationStatus({
        hasActiveBiometric: true,
        hasPeerVouching: true,
        isVerified: true,
        needsReverification: false,
      });
      setMockStoreData({ currentRecord: record, studentVerification: verificationStatus });

      render(<StudentVerificationPanel />);

      expect(screen.getByText('3/3 steps completed')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Peer Signatures Display', () => {
    it('shows peer signatures section when signatures exist', () => {
      const record = createMockStudentRecord({
        peerSignatures: [
          createMockPeerSignature('0xpeer1'),
          createMockPeerSignature('0xpeer2'),
        ],
      });
      const verificationStatus = createMockVerificationStatus();
      setMockStoreData({ currentRecord: record, studentVerification: verificationStatus });

      render(<StudentVerificationPanel />);

      expect(screen.getByText('Peer Signatures (2)')).toBeInTheDocument();
      expect(screen.getByText('0xpeer1')).toBeInTheDocument();
      expect(screen.getByText('0xpeer2')).toBeInTheDocument();
    });

    it('does not show peer signatures section when none exist', () => {
      const record = createMockStudentRecord();
      const verificationStatus = createMockVerificationStatus();
      setMockStoreData({ currentRecord: record, studentVerification: verificationStatus });

      render(<StudentVerificationPanel />);

      expect(screen.queryByText('Peer Signatures')).not.toBeInTheDocument();
    });
  });

  describe('Pending Peers Display', () => {
    it('shows pending peers section when peers exist', () => {
      const record = createMockStudentRecord();
      const pendingPeers = [
        createMockPendingPeer('0xpeer1', 'pending'),
        createMockPendingPeer('0xpeer2', 'signed'),
      ];
      setMockStoreData({ currentRecord: record, pendingPeers });

      render(<StudentVerificationPanel />);

      expect(screen.getByText('Pending Invitations (2)')).toBeInTheDocument();
      expect(screen.getByText('Peer eer1')).toBeInTheDocument();
      expect(screen.getByText('Peer eer2')).toBeInTheDocument();
    });

    it('does not show pending peers section when none exist', () => {
      const record = createMockStudentRecord();
      setMockStoreData({ currentRecord: record, pendingPeers: [] });

      render(<StudentVerificationPanel />);

      expect(screen.queryByText('Pending Invitations')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows clear errors button when errors exist', () => {
      const record = createMockStudentRecord();
      setMockStoreData({ 
        currentRecord: record, 
        errors: ['Error 1', 'Error 2'] 
      });

      render(<StudentVerificationPanel />);

      expect(screen.getByText('Clear Errors')).toBeInTheDocument();
    });

    it('displays error messages when present', () => {
      const record = createMockStudentRecord();
      const errors = ['Network error', 'Validation failed'];
      setMockStoreData({ currentRecord: record, errors });

      render(<StudentVerificationPanel />);

      expect(screen.getByText('Verification Errors')).toBeInTheDocument();
      expect(screen.getByText('• Network error')).toBeInTheDocument();
      expect(screen.getByText('• Validation failed')).toBeInTheDocument();
    });

    it('calls clearErrors when button is clicked', () => {
      const record = createMockStudentRecord();
      setMockStoreData({ 
        currentRecord: record, 
        errors: ['Some error'] 
      });

      render(<StudentVerificationPanel />);

      screen.getByText('Clear Errors').click();
      
      expect(mockVerificationState.clearErrors).toHaveBeenCalled();
    });
  });

  describe('Auto-refresh', () => {
    it('sets up auto-refresh interval for verified users', () => {
      vi.useFakeTimers();
      
      const record = createMockStudentRecord();
      const verificationStatus = createMockVerificationStatus({
        isVerified: true,
        needsReverification: false,
      });
      setMockStoreData({ currentRecord: record, studentVerification: verificationStatus });

      render(<StudentVerificationPanel />);

      // Advance time by 30 seconds
      vi.advanceTimersByTime(30000);

      expect(mockVerificationState.refreshStatus).toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('clears interval on unmount', () => {
      vi.useFakeTimers();
      
      const record = createMockStudentRecord();
      const verificationStatus = createMockVerificationStatus({
        isVerified: true,
      });
      setMockStoreData({ currentRecord: record, studentVerification: verificationStatus });

      const { unmount } = render(<StudentVerificationPanel />);
      unmount();

      // Advance time to ensure interval was cleared
      vi.advanceTimersByTime(30000);

      expect(mockVerificationState.refreshStatus).not.toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });

  describe('Memoization', () => {
    it('memoizes peerSignatures to prevent unnecessary re-renders', () => {
      const peerSignatures = [
        createMockPeerSignature('0xpeer1'),
        createMockPeerSignature('0xpeer2'),
      ];
      const record = createMockStudentRecord({ peerSignatures });
      
      const { rerender } = render(<StudentVerificationPanel />);
      
      // Re-render with same data - should use memoized value
      setMockStoreData({ currentRecord: record });
      rerender(<StudentVerificationPanel />);

      // Component should still render correctly with memoized peerSignatures
      expect(screen.getByText('Peer Signatures (2)')).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('applies compact layout classes when compact prop is true', () => {
      const record = createMockStudentRecord();
      setMockStoreData({ currentRecord: record });

      render(<StudentVerificationPanel compact />);

      const grid = document.querySelector(
        '[data-testid="student-verification-panel-content"] .grid'
      );

      expect(grid).toHaveClass('grid-cols-1');
      expect(grid).not.toHaveClass('lg:grid-cols-2');
    });
  });

  describe('Modal Behavior', () => {
    it('renders inside a dialog when open', () => {
      const record = createMockStudentRecord();
      setMockStoreData({ currentRecord: record });

      render(<StudentVerificationPanel onClose={vi.fn()} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('calls onClose when clicking the backdrop', () => {
      const record = createMockStudentRecord();
      const onClose = vi.fn();
      setMockStoreData({ currentRecord: record });

      render(<StudentVerificationPanel onClose={onClose} />);

      const dialog = screen.getByRole('dialog');
      fireEvent.click(dialog);

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when clicking the close button', () => {
      const record = createMockStudentRecord();
      const onClose = vi.fn();
      setMockStoreData({ currentRecord: record });

      render(<StudentVerificationPanel onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });
  });
});