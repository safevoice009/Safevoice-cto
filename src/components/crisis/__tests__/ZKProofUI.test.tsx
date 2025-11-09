import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../lib/store';
import ZKProofPrompt from '../ZKProofPrompt';
import ZKProofStatusBadge from '../ZKProofStatusBadge';

// Mock the store
vi.mock('../../../lib/store', () => ({
  useStore: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockStore = {
  zkProofs: {},
  prepareZKProof: vi.fn(),
  submitZKProof: vi.fn(),
  verifyZKProof: vi.fn(),
  clearZKProof: vi.fn(),
};

const renderWithI18n = (component: React.ReactElement) => {
  return render(component);
};

describe('ZKProofPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue(mockStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders with initial state', () => {
    renderWithI18n(
      <ZKProofPrompt
        requestId="test-req-1"
        witness="test-witness"
      />
    );

    expect(screen.getByText('Privacy Protection')).toBeInTheDocument();
    expect(screen.getByText('Generating cryptographic proof to protect your identity')).toBeInTheDocument();
  });

  it('shows loading state when generating proof', async () => {
    mockStore.prepareZKProof.mockResolvedValue({
      success: true,
      artifacts: { proof: 'test-proof', publicParams: { commitment: 'test', challenge: 'test', curve: 'bls12-381' } }
    });
    mockStore.submitZKProof.mockResolvedValue();
    mockStore.verifyZKProof.mockResolvedValue({ success: true, verified: true });

    renderWithI18n(
      <ZKProofPrompt
        requestId="test-req-1"
        witness="test-witness"
      />
    );

    await waitFor(() => {
      expect(mockStore.prepareZKProof).toHaveBeenCalledWith('test-req-1', 'test-witness');
    });
  });

  it('shows retry button on failure', async () => {
    mockStore.zkProofs = {
      'test-req-1': {
        status: 'failed',
        error: 'Test error',
        timestamp: Date.now(),
      }
    };

    renderWithI18n(
      <ZKProofPrompt
        requestId="test-req-1"
        witness="test-witness"
      />
    );

    expect(screen.getByText('Retry')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('calls retry when retry button is clicked', async () => {
    mockStore.zkProofs = {
      'test-req-1': {
        status: 'failed',
        error: 'Test error',
        timestamp: Date.now(),
      }
    };
    mockStore.prepareZKProof.mockResolvedValue({
      success: true,
      artifacts: { proof: 'test-proof', publicParams: { commitment: 'test', challenge: 'test', curve: 'bls12-381' } }
    });
    mockStore.submitZKProof.mockResolvedValue();
    mockStore.verifyZKProof.mockResolvedValue({ success: true, verified: true });

    renderWithI18n(
      <ZKProofPrompt
        requestId="test-req-1"
        witness="test-witness"
      />
    );

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockStore.clearZKProof).toHaveBeenCalledWith('test-req-1');
      expect(mockStore.prepareZKProof).toHaveBeenCalledWith('test-req-1', 'test-witness');
    });
  });

  it('shows verified state on success', async () => {
    mockStore.zkProofs = {
      'test-req-1': {
        status: 'verified',
        timestamp: Date.now(),
        artifacts: { proof: 'test-proof', publicParams: { commitment: 'test', challenge: 'test', curve: 'bls12-381' } }
      }
    };

    renderWithI18n(
      <ZKProofPrompt
        requestId="test-req-1"
        witness="test-witness"
      />
    );

    expect(screen.getByText('Verified & Protected')).toBeInTheDocument();
    expect(screen.getByText('Your identity is cryptographically verified and protected')).toBeInTheDocument();
  });

  it('calls onProofComplete callback', async () => {
    const onProofComplete = vi.fn();
    mockStore.prepareZKProof.mockResolvedValue({
      success: true,
      artifacts: { proof: 'test-proof', publicParams: { commitment: 'test', challenge: 'test', curve: 'bls12-381' } }
    });
    mockStore.submitZKProof.mockResolvedValue();
    mockStore.verifyZKProof.mockResolvedValue({ success: true, verified: true });

    renderWithI18n(
      <ZKProofPrompt
        requestId="test-req-1"
        witness="test-witness"
        onProofComplete={onProofComplete}
      />
    );

    await waitFor(() => {
      expect(onProofComplete).toHaveBeenCalledWith(true);
    });
  });
});

describe('ZKProofStatusBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders with default state', () => {
    renderWithI18n(
      <ZKProofStatusBadge />
    );

    expect(screen.getByText('Not Started')).toBeInTheDocument();
  });

  it('renders pending state', () => {
    renderWithI18n(
      <ZKProofStatusBadge
        zkProofState={{
          status: 'pending',
          timestamp: Date.now(),
        }}
      />
    );

    expect(screen.getByText('Generating Proof')).toBeInTheDocument();
  });

  it('renders success state', () => {
    renderWithI18n(
      <ZKProofStatusBadge
        zkProofState={{
          status: 'success',
          timestamp: Date.now(),
          artifacts: { proof: 'test-proof', publicParams: { commitment: 'test', challenge: 'test', curve: 'bls12-381' } }
        }}
      />
    );

    expect(screen.getByText('Proof Generated')).toBeInTheDocument();
  });

  it('renders verified state', () => {
    renderWithI18n(
      <ZKProofStatusBadge
        zkProofState={{
          status: 'verified',
          timestamp: Date.now(),
          artifacts: { proof: 'test-proof', publicParams: { commitment: 'test', challenge: 'test', curve: 'bls12-381' } }
        }}
      />
    );

    expect(screen.getByText('Verified & Protected')).toBeInTheDocument();
  });

  it('renders failed state', () => {
    renderWithI18n(
      <ZKProofStatusBadge
        zkProofState={{
          status: 'failed',
          error: 'Test error',
          timestamp: Date.now(),
        }}
      />
    );

    expect(screen.getByText('Generation Failed')).toBeInTheDocument();
  });

  it('renders verification failed state', () => {
    renderWithI18n(
      <ZKProofStatusBadge
        zkProofState={{
          status: 'verification_failed',
          timestamp: Date.now(),
        }}
      />
    );

    expect(screen.getByText('Verification Failed')).toBeInTheDocument();
  });

  it('hides label when showLabel is false', () => {
    renderWithI18n(
      <ZKProofStatusBadge
        showLabel={false}
        zkProofState={{
          status: 'verified',
          timestamp: Date.now(),
        }}
      />
    );

    expect(screen.queryByText('Verified & Protected')).not.toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    const { rerender } = renderWithI18n(
      <ZKProofStatusBadge
        size="sm"
        zkProofState={{
          status: 'verified',
          timestamp: Date.now(),
        }}
      />
    );

    expect(screen.getByRole('generic')).toHaveClass('px-2', 'py-1', 'text-xs');

    rerender(
      <I18nextProvider i18n={testI18n}>
        <ZKProofStatusBadge
          size="lg"
          zkProofState={{
            status: 'verified',
            timestamp: Date.now(),
          }}
        />
      </I18nextProvider>
    );

    expect(screen.getByRole('generic')).toHaveClass('px-4', 'py-2', 'text-base');
  });

  it('applies custom className', () => {
    renderWithI18n(
      <ZKProofStatusBadge
        className="custom-class"
        zkProofState={{
          status: 'verified',
          timestamp: Date.now(),
        }}
      />
    );

    expect(screen.getByRole('generic')).toHaveClass('custom-class');
  });
});