import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ZKProofSettings from '../ZKProofSettings';

vi.mock('react-hot-toast', () => {
  const toastMock = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  });
  return {
    __esModule: true,
    default: toastMock,
  };
});

const mockUseStore = vi.fn();

vi.mock('../../../lib/store', () => ({
  useStore: mockUseStore,
}));

interface MockZKProofState {
  zkProofCommitment: unknown;
  zkProofVerificationBadge: boolean;
  generateZKProofCommitment: ReturnType<typeof vi.fn>;
  verifyZKProofCommitment: ReturnType<typeof vi.fn>;
  revokeZKProofCommitment: ReturnType<typeof vi.fn>;
  clearZKProofCommitment: ReturnType<typeof vi.fn>;
}

describe('ZKProofSettings', () => {
  const mockGenerateZKProofCommitment = vi.fn();
  const mockVerifyZKProofCommitment = vi.fn();
  const mockRevokeZKProofCommitment = vi.fn();
  const mockClearZKProofCommitment = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    const mockState: MockZKProofState = {
      zkProofCommitment: null,
      zkProofVerificationBadge: false,
      generateZKProofCommitment: mockGenerateZKProofCommitment,
      verifyZKProofCommitment: mockVerifyZKProofCommitment,
      revokeZKProofCommitment: mockRevokeZKProofCommitment,
      clearZKProofCommitment: mockClearZKProofCommitment,
    };
    mockUseStore.mockReturnValue(mockState);
  });

  describe('Initial render without commitment', () => {
    it('should render the component with initial state', () => {
      render(<ZKProofSettings />);
      
      expect(screen.getByText('Student Verification')).toBeInTheDocument();
      expect(screen.getByText('Anonymous Verification')).toBeInTheDocument();
      expect(screen.getByText('Generate Verification Proof')).toBeInTheDocument();
    });

    it('should show info message about ZK proofs', () => {
      render(<ZKProofSettings />);
      
      expect(screen.getByText(/Prove your student status without revealing your identity/i)).toBeInTheDocument();
    });

    it('should show generate button when no commitment exists', () => {
      render(<ZKProofSettings />);
      
      const generateButton = screen.getByText('Generate Verification Proof');
      expect(generateButton).toBeInTheDocument();
    });

    it('should show form when generate button is clicked', () => {
      render(<ZKProofSettings />);
      
      const generateButton = screen.getByText('Generate Verification Proof');
      fireEvent.click(generateButton);
      
      expect(screen.getByLabelText('Student ID')).toBeInTheDocument();
      expect(screen.getByLabelText('Institution ID')).toBeInTheDocument();
      expect(screen.getByLabelText('Enrollment Year')).toBeInTheDocument();
    });
  });

  describe('Form interaction', () => {
    it('should allow entering credentials', () => {
      render(<ZKProofSettings />);
      
      fireEvent.click(screen.getByText('Generate Verification Proof'));
      
      const studentIdInput = screen.getByLabelText('Student ID');
      const institutionIdInput = screen.getByLabelText('Institution ID');
      const enrollmentYearInput = screen.getByLabelText('Enrollment Year');
      
      fireEvent.change(studentIdInput, { target: { value: '123456' } });
      fireEvent.change(institutionIdInput, { target: { value: 'MIT' } });
      fireEvent.change(enrollmentYearInput, { target: { value: '2024' } });
      
      expect(studentIdInput).toHaveValue('123456');
      expect(institutionIdInput).toHaveValue('MIT');
      expect(enrollmentYearInput).toHaveValue('2024');
    });

    it('should call generateZKProofCommitment on form submit', async () => {
      mockGenerateZKProofCommitment.mockResolvedValue(true);
      
      render(<ZKProofSettings />);
      
      fireEvent.click(screen.getByText('Generate Verification Proof'));
      
      fireEvent.change(screen.getByLabelText('Student ID'), { target: { value: '123456' } });
      fireEvent.change(screen.getByLabelText('Institution ID'), { target: { value: 'MIT' } });
      fireEvent.change(screen.getByLabelText('Enrollment Year'), { target: { value: '2024' } });
      
      fireEvent.click(screen.getByText('Generate Proof'));
      
      await waitFor(() => {
        expect(mockGenerateZKProofCommitment).toHaveBeenCalledWith('123456', 'MIT', '2024');
      });
    });

    it('should disable button while generating', async () => {
      mockGenerateZKProofCommitment.mockImplementation(() => new Promise(() => {}));
      
      render(<ZKProofSettings />);
      
      fireEvent.click(screen.getByText('Generate Verification Proof'));
      
      fireEvent.change(screen.getByLabelText('Student ID'), { target: { value: '123456' } });
      fireEvent.change(screen.getByLabelText('Institution ID'), { target: { value: 'MIT' } });
      fireEvent.change(screen.getByLabelText('Enrollment Year'), { target: { value: '2024' } });
      
      const submitButton = screen.getByText('Generate Proof');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeInTheDocument();
      });
    });

    it('should hide form on cancel', () => {
      render(<ZKProofSettings />);
      
      fireEvent.click(screen.getByText('Generate Verification Proof'));
      expect(screen.getByLabelText('Student ID')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByLabelText('Student ID')).not.toBeInTheDocument();
    });
  });

  describe('With active commitment', () => {
    beforeEach(() => {
      mockUseStore.mockReturnValue({
        zkProofCommitment: {
          id: 'test-id',
          commitment: 'test-commitment-hash-1234567890abcdef',
          nullifier: 'test-nullifier',
          createdAt: Date.now(),
          isRevoked: false,
          revokedAt: null,
          studentCredentialHash: 'test-hash',
        },
        zkProofVerificationBadge: true,
        generateZKProofCommitment: mockGenerateZKProofCommitment,
        verifyZKProofCommitment: mockVerifyZKProofCommitment,
        revokeZKProofCommitment: mockRevokeZKProofCommitment,
        clearZKProofCommitment: mockClearZKProofCommitment,
      });
    });

    it('should display verified badge', () => {
      render(<ZKProofSettings />);
      
      const verifiedBadges = screen.getAllByText('Verified');
      expect(verifiedBadges.length).toBeGreaterThan(0);
    });

    it('should show commitment details', () => {
      render(<ZKProofSettings />);
      
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Expires')).toBeInTheDocument();
    });

    it('should show re-verify button', () => {
      render(<ZKProofSettings />);
      
      expect(screen.getByText('Re-verify')).toBeInTheDocument();
    });

    it('should show revoke button', () => {
      render(<ZKProofSettings />);
      
      expect(screen.getByText('Revoke')).toBeInTheDocument();
    });

    it('should call verifyZKProofCommitment when re-verify is clicked', async () => {
      mockVerifyZKProofCommitment.mockResolvedValue(true);
      
      render(<ZKProofSettings />);
      
      fireEvent.click(screen.getByText('Re-verify'));
      
      await waitFor(() => {
        expect(mockVerifyZKProofCommitment).toHaveBeenCalled();
      });
    });

    it('should confirm before revoking', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      render(<ZKProofSettings />);
      
      fireEvent.click(screen.getByText('Revoke'));
      
      expect(confirmSpy).toHaveBeenCalled();
      expect(mockRevokeZKProofCommitment).not.toHaveBeenCalled();
    });

    it('should revoke when confirmed', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      render(<ZKProofSettings />);
      
      fireEvent.click(screen.getByText('Revoke'));
      
      expect(confirmSpy).toHaveBeenCalled();
      expect(mockRevokeZKProofCommitment).toHaveBeenCalled();
    });

    it('should show commitment hash in details', () => {
      render(<ZKProofSettings />);
      
      const details = screen.getByText('View Commitment Hash');
      expect(details).toBeInTheDocument();
    });
  });

  describe('With revoked commitment', () => {
    beforeEach(() => {
      mockUseStore.mockReturnValue({
        zkProofCommitment: {
          id: 'test-id',
          commitment: 'test-commitment-hash',
          nullifier: 'test-nullifier',
          createdAt: Date.now() - 1000,
          isRevoked: true,
          revokedAt: Date.now(),
          studentCredentialHash: 'test-hash',
        },
        zkProofVerificationBadge: false,
        generateZKProofCommitment: mockGenerateZKProofCommitment,
        verifyZKProofCommitment: mockVerifyZKProofCommitment,
        revokeZKProofCommitment: mockRevokeZKProofCommitment,
        clearZKProofCommitment: mockClearZKProofCommitment,
      });
    });

    it('should show revoked status', () => {
      render(<ZKProofSettings />);
      
      expect(screen.getByText('Revoked')).toBeInTheDocument();
    });

    it('should not show re-verify button for revoked commitment', () => {
      render(<ZKProofSettings />);
      
      expect(screen.queryByText('Re-verify')).not.toBeInTheDocument();
    });

    it('should show clear data button', () => {
      render(<ZKProofSettings />);
      
      expect(screen.getByText('Clear Data')).toBeInTheDocument();
    });
  });

  describe('Badge toggling', () => {
    it('should show badge when verified', () => {
      mockUseStore.mockReturnValue({
        zkProofCommitment: {
          id: 'test-id',
          commitment: 'test-commitment-hash',
          nullifier: 'test-nullifier',
          createdAt: Date.now(),
          isRevoked: false,
          revokedAt: null,
          studentCredentialHash: 'test-hash',
        },
        zkProofVerificationBadge: true,
        generateZKProofCommitment: mockGenerateZKProofCommitment,
        verifyZKProofCommitment: mockVerifyZKProofCommitment,
        revokeZKProofCommitment: mockRevokeZKProofCommitment,
        clearZKProofCommitment: mockClearZKProofCommitment,
      });
      
      render(<ZKProofSettings />);
      
      const verifiedBadges = screen.getAllByText('Verified');
      expect(verifiedBadges.length).toBeGreaterThan(0);
    });

    it('should not show badge when not verified', () => {
      mockUseStore.mockReturnValue({
        zkProofCommitment: {
          id: 'test-id',
          commitment: 'test-commitment-hash',
          nullifier: 'test-nullifier',
          createdAt: Date.now(),
          isRevoked: false,
          revokedAt: null,
          studentCredentialHash: 'test-hash',
        },
        zkProofVerificationBadge: false,
        generateZKProofCommitment: mockGenerateZKProofCommitment,
        verifyZKProofCommitment: mockVerifyZKProofCommitment,
        revokeZKProofCommitment: mockRevokeZKProofCommitment,
        clearZKProofCommitment: mockClearZKProofCommitment,
      });
      
      render(<ZKProofSettings />);
      
      expect(screen.queryByText('Verified')).not.toBeInTheDocument();
    });
  });
});
