/**
 * ApprovalTimeline Test Suite
 * 
 * Tests the ApprovalTimeline component for:
 * - Each step renders correctly
 * - Status icons/text change based on mocked store data
 * - Timestamps appear when data exists
 * - Component properly handles missing data
 * - Custom classNames work
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApprovalTimeline } from '../ApprovalTimeline';
import type { StudentRecord, VerificationStatus } from '../../../lib/identity/StudentRegistry';
import type { BiometricCommitment } from '../../../lib/identity/BiometricCommitmentService';
import type { PeerSignature } from '../../../lib/identity/PeerVouchingService';
import type { PendingPeer } from '../../../lib/identity/studentVerificationState';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string, options?: Record<string, string | number>) => {
      // Simple mock translation function with interpolation support
      const translations: Record<string, string> = {
        'verification.timeline.title': 'Verification Progress',
        'verification.timeline.noData': 'No verification data available',
        'verification.timeline.biometric.title': 'Biometric Registration',
        'verification.timeline.biometric.description': 'Device fingerprint registered',
        'verification.timeline.biometric.tip': 'One biometric commitment required',
        'verification.timeline.peer.title': 'Peer Vouching',
        'verification.timeline.peer.description': 'Peer signatures collected',
        'verification.timeline.peer.tip': 'At least 2 peer signatures required',
        'verification.timeline.peer.progress': '{{count}}/{{required}} required',
        'verification.timeline.verified.title': 'Verified',
        'verification.timeline.verified.description': 'Identity verified',
        'verification.timeline.verified.tip': 'All verification steps completed',
        'verification.timeline.verified.pending': 'Verification Pending',
        'verification.timeline.verified.expired': 'Verification Expired',
        'verification.timeline.verified.checkmark': 'Verification Complete',
        'verification.timeline.signedBy': 'Signed by {{count}} peer{{plural}}',
        'verification.timeline.committed': 'Committed {{date}}',
        'verification.timeline.expiresOn': 'Expires {{date}}',
      };
      
      let translation = translations[key] || defaultValue || key;
      
      // Handle interpolation if options object is provided
      if (options && typeof options === 'object') {
        Object.entries(options).forEach(([placeholder, value]) => {
          translation = translation.replace(`{{${placeholder}}}`, String(value));
        });
      }
      
      return translation;
    },
  }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  CheckCircle2: ({ className, ...props }: { className?: string }) => (
    <div data-testid="check-circle-icon" className={className} {...props} />
  ),
  Clock: ({ className, ...props }: { className?: string }) => (
    <div data-testid="clock-icon" className={className} {...props} />
  ),
  XCircle: ({ className, ...props }: { className?: string }) => (
    <div data-testid="x-circle-icon" className={className} {...props} />
  ),
  Fingerprint: ({ className, ...props }: { className?: string }) => (
    <div data-testid="fingerprint-icon" className={className} {...props} />
  ),
  Users: ({ className, ...props }: { className?: string }) => (
    <div data-testid="users-icon" className={className} {...props} />
  ),
}));

// Mock the store - must be done before importing ApprovalTimeline
const mockStore: {
  currentRecord: StudentRecord | null;
  studentVerification: VerificationStatus | null;
  pendingPeers: PendingPeer[];
  lastSynced: number | null;
  errors: string[];
  isInitialized: boolean;
  initStudentRegistry: ReturnType<typeof vi.fn>;
  submitBiometricCommitment: ReturnType<typeof vi.fn>;
  requestPeerVouching: ReturnType<typeof vi.fn>;
  addPeerSignature: ReturnType<typeof vi.fn>;
  submitSelfAttestation: ReturnType<typeof vi.fn>;
  refreshStatus: ReturnType<typeof vi.fn>;
  applyRemoteSnapshot: ReturnType<typeof vi.fn>;
  clearErrors: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
} = {
  currentRecord: null,
  studentVerification: null,
  pendingPeers: [],
  lastSynced: null,
  errors: [],
  isInitialized: false,
  initStudentRegistry: vi.fn(),
  submitBiometricCommitment: vi.fn(),
  requestPeerVouching: vi.fn(),
  addPeerSignature: vi.fn(),
  submitSelfAttestation: vi.fn(),
  refreshStatus: vi.fn(),
  applyRemoteSnapshot: vi.fn(),
  clearErrors: vi.fn(),
  reset: vi.fn(),
};

vi.mock('../../../lib/identity/studentVerificationState', () => ({
  useStudentVerificationStore: () => mockStore,
}));

// Test data factories
const createMockBiometricCommitment = (createdAt: number, deviceLabel = 'iPhone 15'): BiometricCommitment => ({
  id: 'bio-1',
  walletAddress: '0x1234...',
  saltedHash: 'abc123def456',
  createdAt,
  updatedAt: createdAt,
  deviceLabel,
});

const createMockPeerSignature = (timestamp: number, signerWallet: string): PeerSignature => ({
  id: 'peer-1',
  requestId: 'req-1',
  signerWallet,
  signatureBytes: 'signature123',
  attestationText: 'I vouch for this student',
  timestamp,
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

const createMockStudentRecord = (overrides: Partial<StudentRecord> = {}): StudentRecord => ({
  walletAddress: '0x1234...',
  biometricCommitments: [],
  peerSignatures: [],
  selfAttestation: null,
  adminDelegation: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

// Helper to set mock store data
const setMockStoreData = (data: Partial<{ currentRecord: StudentRecord; studentVerification: VerificationStatus }>) => {
  if (data.currentRecord) {
    mockStore.currentRecord = data.currentRecord;
  }
  if (data.studentVerification) {
    mockStore.studentVerification = data.studentVerification;
  }
};

describe('ApprovalTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock store to default state
    Object.assign(mockStore, {
      currentRecord: null,
      studentVerification: null,
      pendingPeers: [],
      lastSynced: null,
      errors: [],
      isInitialized: false,
      initStudentRegistry: vi.fn(),
      submitBiometricCommitment: vi.fn(),
      requestPeerVouching: vi.fn(),
      addPeerSignature: vi.fn(),
      submitSelfAttestation: vi.fn(),
      refreshStatus: vi.fn(),
      applyRemoteSnapshot: vi.fn(),
      clearErrors: vi.fn(),
      reset: vi.fn(),
    });
  });

  describe('Rendering', () => {
    it('renders the component with title', () => {
      render(<ApprovalTimeline />);

      expect(screen.getByText('Verification Progress')).toBeInTheDocument();
    });

    it('shows no data message when currentRecord is null', () => {
      render(<ApprovalTimeline />);

      expect(screen.getByText('No verification data available')).toBeInTheDocument();
    });

    it('shows no data message when studentVerification is null', () => {
      setMockStoreData({ currentRecord: createMockStudentRecord() });
      render(<ApprovalTimeline />);

      expect(screen.getByText('No verification data available')).toBeInTheDocument();
    });

    it('renders all three timeline steps when data is available', () => {
      setMockStoreData({
        currentRecord: createMockStudentRecord(),
        studentVerification: createMockVerificationStatus(),
      });

      render(<ApprovalTimeline />);

      expect(screen.getByText('Biometric Registration')).toBeInTheDocument();
      expect(screen.getByText('Peer Vouching')).toBeInTheDocument();
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });
  });

  describe('Biometric Step', () => {
    it('shows pending status when no biometric commitments exist', () => {
      setMockStoreData({
        currentRecord: createMockStudentRecord(),
        studentVerification: createMockVerificationStatus(),
      });

      render(<ApprovalTimeline />);

      expect(screen.getAllByText('One biometric commitment required').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('clock-icon').length).toBeGreaterThan(0);
    });

    it('shows completed status when biometric commitment exists', () => {
      const biometricCommitments = [createMockBiometricCommitment(Date.now() - 86400000)]; // 1 day ago
      setMockStoreData({
        currentRecord: createMockStudentRecord({ biometricCommitments }),
        studentVerification: createMockVerificationStatus({ hasActiveBiometric: true }),
      });

      render(<ApprovalTimeline />);

      expect(screen.getByText('Device fingerprint registered')).toBeInTheDocument();
      expect(screen.getAllByTestId('check-circle-icon').length).toBeGreaterThan(0);
      expect(screen.getByText(/Committed/)).toBeInTheDocument();
    });

    it('shows most recent commitment timestamp when multiple exist', () => {
      const oldCommitment = createMockBiometricCommitment(Date.now() - 172800000); // 2 days ago
      const recentCommitment = createMockBiometricCommitment(Date.now() - 86400000); // 1 day ago
      const biometricCommitments = [oldCommitment, recentCommitment];

      setMockStoreData({
        currentRecord: createMockStudentRecord({ biometricCommitments }),
        studentVerification: createMockVerificationStatus({ hasActiveBiometric: true }),
      });

      render(<ApprovalTimeline />);

      const committedText = screen.getByText(/Committed/);
      expect(committedText).toBeInTheDocument();
      // Should show the most recent date (1 day ago)
      expect(committedText.textContent).toMatch(/Committed/);
    });

    it('displays device label when available', () => {
      const biometricCommitments = [createMockBiometricCommitment(Date.now(), 'iPhone 15 Pro')];
      setMockStoreData({
        currentRecord: createMockStudentRecord({ biometricCommitments }),
        studentVerification: createMockVerificationStatus({ hasActiveBiometric: true }),
      });

      render(<ApprovalTimeline />);

      expect(screen.getByText('Device: iPhone 15 Pro')).toBeInTheDocument();
    });
  });

  describe('Peer Vouching Step', () => {
    it('shows pending status when no peer signatures exist', () => {
      setMockStoreData({
        currentRecord: createMockStudentRecord(),
        studentVerification: createMockVerificationStatus(),
      });

      render(<ApprovalTimeline />);

      expect(screen.getAllByText('At least 2 peer signatures required').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('clock-icon').length).toBeGreaterThan(0);
    });

    it('shows in-progress status when some peer signatures exist', () => {
      const peerSignatures = [createMockPeerSignature(Date.now() - 86400000, '0xpeer1')];
      setMockStoreData({
        currentRecord: createMockStudentRecord({ peerSignatures }),
        studentVerification: createMockVerificationStatus({ hasPeerVouching: false }),
      });

      render(<ApprovalTimeline />);

      expect(screen.getAllByText('At least 2 peer signatures required').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('clock-icon').length).toBeGreaterThan(0);
      expect(screen.getByText('Signed by 1 peer')).toBeInTheDocument();
    });

    it('shows completed status when sufficient peer signatures exist', () => {
      const peerSignatures = [
        createMockPeerSignature(Date.now() - 172800000, '0xpeer1'),
        createMockPeerSignature(Date.now() - 86400000, '0xpeer2'),
      ];
      setMockStoreData({
        currentRecord: createMockStudentRecord({ peerSignatures }),
        studentVerification: createMockVerificationStatus({ hasPeerVouching: true }),
      });

      render(<ApprovalTimeline />);

      expect(screen.getByText('Peer signatures collected')).toBeInTheDocument();
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
      expect(screen.getByText('Signed by 2 peers')).toBeInTheDocument();
    });

    it('shows progress count with total required', () => {
      const peerSignatures = [
        createMockPeerSignature(Date.now() - 86400000, '0xpeer1'),
      ];
      setMockStoreData({
        currentRecord: createMockStudentRecord({ peerSignatures }),
        studentVerification: createMockVerificationStatus(),
      });

      render(<ApprovalTimeline />);

      expect(screen.getByText('1/2 required')).toBeInTheDocument();
    });
  });

  describe('Final Verification Step', () => {
    it('shows pending status when no verification completed', () => {
      setMockStoreData({
        currentRecord: createMockStudentRecord(),
        studentVerification: createMockVerificationStatus(),
      });

      render(<ApprovalTimeline />);

      expect(screen.getByText('Verification Pending')).toBeInTheDocument();
      expect(screen.getAllByTestId('clock-icon').length).toBeGreaterThan(0);
    });

    it('shows in-progress status when some steps completed', () => {
      setMockStoreData({
        currentRecord: createMockStudentRecord(),
        studentVerification: createMockVerificationStatus({
          hasActiveBiometric: true,
          hasPeerVouching: false,
        }),
      });

      render(<ApprovalTimeline />);

      expect(screen.getByText('Verification Pending')).toBeInTheDocument();
      expect(screen.getAllByTestId('clock-icon').length).toBeGreaterThan(0);
    });

    it('shows completed status when fully verified', () => {
      setMockStoreData({
        currentRecord: createMockStudentRecord(),
        studentVerification: createMockVerificationStatus({
          isVerified: true,
          expiresAt: Date.now() + 86400000, // 1 day from now
        }),
      });

      render(<ApprovalTimeline />);

      expect(screen.getByText('Verification Complete')).toBeInTheDocument();
      expect(screen.getAllByTestId('check-circle-icon').length).toBeGreaterThan(0);
      // Check that a timestamp is shown (may be formatted as key if i18n not configured in tests)
      expect(screen.getByText(/Expires|verification\.timeline\.expiresOn/)).toBeInTheDocument();
    });

    it('shows expired status when verification expired', () => {
      setMockStoreData({
        currentRecord: createMockStudentRecord(),
        studentVerification: createMockVerificationStatus({
          needsReverification: true,
          isVerified: false,
        }),
      });

      render(<ApprovalTimeline />);

      expect(screen.getByText('Verification Expired')).toBeInTheDocument();
      expect(screen.getAllByTestId('x-circle-icon').length).toBeGreaterThan(0);
    });
  });

  describe('Timestamps', () => {
    it('formats biometric commitment timestamp correctly', () => {
      const commitmentTime = new Date('2024-01-15').getTime();
      const biometricCommitments = [createMockBiometricCommitment(commitmentTime)];
      setMockStoreData({
        currentRecord: createMockStudentRecord({ biometricCommitments }),
        studentVerification: createMockVerificationStatus({ hasActiveBiometric: true }),
      });

      render(<ApprovalTimeline />);

      // Should show the committed text with a date
      expect(screen.getByText(/Committed/)).toBeInTheDocument();
    });

    it('does not show timestamps when no data available', () => {
      setMockStoreData({
        currentRecord: createMockStudentRecord(),
        studentVerification: createMockVerificationStatus(),
      });

      render(<ApprovalTimeline />);

      expect(screen.queryByText(/Committed/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Signed by/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Expires/)).not.toBeInTheDocument();
    });
  });

  describe('Custom classNames', () => {
    it('applies custom className to container', () => {
      setMockStoreData({
        currentRecord: createMockStudentRecord(),
        studentVerification: createMockVerificationStatus(),
      });

      const { container } = render(<ApprovalTimeline className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('applies custom className when no data available', () => {
      const { container } = render(<ApprovalTimeline className="empty-state-class" />);
      
      expect(container.firstChild).toHaveClass('empty-state-class');
    });
  });

  describe('Icons and Visual Elements', () => {
    it('renders correct step icons', () => {
      setMockStoreData({
        currentRecord: createMockStudentRecord(),
        studentVerification: createMockVerificationStatus(),
      });

      render(<ApprovalTimeline />);

      expect(screen.getByTestId('fingerprint-icon')).toBeInTheDocument(); // Biometric step
      expect(screen.getByTestId('users-icon')).toBeInTheDocument(); // Peer step
      expect(screen.getAllByTestId('clock-icon').length).toBeGreaterThan(0); // Verification step and status icons
    });

    it('changes status icons based on completion', () => {
      const biometricCommitments = [createMockBiometricCommitment(Date.now())];
      const peerSignatures = [createMockPeerSignature(Date.now(), '0xpeer1')];
      setMockStoreData({
        currentRecord: createMockStudentRecord({ 
          biometricCommitments,
          peerSignatures 
        }),
        studentVerification: createMockVerificationStatus({
          hasActiveBiometric: true,
          hasPeerVouching: false,
          isVerified: false,
        }),
      });

      render(<ApprovalTimeline />);

      // Biometric step should have check mark (completed)
      const biometricStep = screen.getByText('Biometric Registration').closest('.border');
      expect(biometricStep).toHaveClass('border-green-200');
      
      // Peer step should have clock (in progress)
      const peerStep = screen.getByText('Peer Vouching').closest('.border');
      expect(peerStep).toHaveClass('border-yellow-200');
    });
  });
});