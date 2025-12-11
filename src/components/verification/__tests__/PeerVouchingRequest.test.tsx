import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PeerVouchingRequest from '../PeerVouchingRequest';
import { useStudentVerificationStore } from '../../../lib/identity/studentVerificationState';
import toast from 'react-hot-toast';

// Mock store
vi.mock('../../../lib/identity/studentVerificationState');

// Mock translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: (key: string, options?: any) => {
      if (key === 'verification.peerVouching.peerLabel') return `Peer ${options.index} Wallet Address`;
      if (key === 'verification.peerVouching.waitingApproval') return `Waiting for: ${options.count}/2 approvals`;
      return key;
    },
  }),
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PeerVouchingRequest', () => {
  const mockRequestPeerVouching = vi.fn();
  
  const defaultStoreState = {
    requestPeerVouching: mockRequestPeerVouching,
    pendingPeers: [],
    currentRecord: {
      walletAddress: '0xUser',
      peerSignatures: [],
    },
    errors: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStudentVerificationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(defaultStoreState);
  });

  it('renders correctly', () => {
    render(<PeerVouchingRequest />);
    
    expect(screen.getByText('verification.peerVouching.title')).toBeInTheDocument();
    expect(screen.getByText('verification.peerVouching.requestButton')).toBeInTheDocument();
    // Inputs
    expect(screen.getByText('Peer 1 Wallet Address')).toBeInTheDocument();
    expect(screen.getByText('Peer 2 Wallet Address')).toBeInTheDocument();
    expect(screen.getByText('Peer 3 Wallet Address')).toBeInTheDocument();
  });

  it('validates unique peer addresses', async () => {
    render(<PeerVouchingRequest />);
    
    const inputs = screen.getAllByPlaceholderText('0x...');
    
    // Fill duplicates
    fireEvent.change(inputs[0], { target: { value: '0x123' } });
    fireEvent.change(inputs[1], { target: { value: '0x123' } });
    fireEvent.change(inputs[2], { target: { value: '0x456' } });
    
    const button = screen.getByText('verification.peerVouching.requestButton');
    fireEvent.click(button);
    
    expect(screen.getByText('verification.peerVouching.errorDuplicate')).toBeInTheDocument();
    expect(mockRequestPeerVouching).not.toHaveBeenCalled();
  });

  it('validates self-referencing address', async () => {
    render(<PeerVouchingRequest />);
    
    const inputs = screen.getAllByPlaceholderText('0x...');
    
    // Fill self address
    fireEvent.change(inputs[0], { target: { value: '0xUser' } }); // Matches mock currentRecord
    fireEvent.change(inputs[1], { target: { value: '0x123' } });
    fireEvent.change(inputs[2], { target: { value: '0x456' } });
    
    const button = screen.getByText('verification.peerVouching.requestButton');
    fireEvent.click(button);
    
    expect(screen.getByText('verification.peerVouching.errorSelf')).toBeInTheDocument();
    expect(mockRequestPeerVouching).not.toHaveBeenCalled();
  });

  it('submits valid request', async () => {
    mockRequestPeerVouching.mockResolvedValue('req-123');
    render(<PeerVouchingRequest />);
    
    const inputs = screen.getAllByPlaceholderText('0x...');
    
    fireEvent.change(inputs[0], { target: { value: '0xABC' } });
    fireEvent.change(inputs[1], { target: { value: '0xDEF' } });
    fireEvent.change(inputs[2], { target: { value: '0xGHI' } });
    
    const button = screen.getByText('verification.peerVouching.requestButton');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockRequestPeerVouching).toHaveBeenCalledWith(['0xABC', '0xDEF', '0xGHI']);
    });
    
    // Should reset inputs
    expect(inputs[0]).toHaveValue('');
  });

  it('displays pending peers', () => {
    (useStudentVerificationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultStoreState,
      pendingPeers: [
        { walletAddress: '0xPeer1', status: 'pending' },
        { walletAddress: '0xPeer2', status: 'signed' },
      ],
    });

    render(<PeerVouchingRequest />);
    
    expect(screen.getByText('verification.peerVouching.pendingPeers')).toBeInTheDocument();
    expect(screen.getByText('0xPeer1')).toBeInTheDocument();
    expect(screen.getByText('0xPeer2')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('signed')).toBeInTheDocument();
  });

  it('updates progress based on signatures', () => {
    // 1 signature
    (useStudentVerificationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultStoreState,
      currentRecord: {
        walletAddress: '0xUser',
        peerSignatures: [{ signerWallet: '0xSigner1' }],
      },
    });

    const { rerender } = render(<PeerVouchingRequest />);
    expect(screen.getByText('Waiting for: 1/2 approvals')).toBeInTheDocument();
    
    // 2 signatures (complete)
    (useStudentVerificationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...defaultStoreState,
        currentRecord: {
          walletAddress: '0xUser',
          peerSignatures: [{ signerWallet: '0xSigner1' }, { signerWallet: '0xSigner2' }],
        },
    });

    rerender(<PeerVouchingRequest />);
    expect(screen.getByText('verification.status.verified')).toBeInTheDocument();
    // Form should be hidden
    expect(screen.queryByText('verification.peerVouching.requestButton')).not.toBeInTheDocument();
  });

  it('handles submission error', async () => {
    mockRequestPeerVouching.mockRejectedValue(new Error('Failed'));
    render(<PeerVouchingRequest />);
    
    const inputs = screen.getAllByPlaceholderText('0x...');
    fireEvent.change(inputs[0], { target: { value: '0xABC' } });
    fireEvent.change(inputs[1], { target: { value: '0xDEF' } });
    fireEvent.change(inputs[2], { target: { value: '0xGHI' } });
    
    const button = screen.getByText('verification.peerVouching.requestButton');
    fireEvent.click(button);
    
    await waitFor(() => {
        // Accept either the key (if mock works) or the actual string (if mock is bypassed)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const callArgs = (toast.error as any).mock.calls[0];
        const errorMsg = callArgs ? callArgs[0] : '';
        expect(errorMsg === 'verification.peerVouching.error' || errorMsg === 'Failed to send request').toBe(true);
    });
  });
});
