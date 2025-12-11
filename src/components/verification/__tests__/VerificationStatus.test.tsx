import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import VerificationStatus from '../VerificationStatus';
import { useStudentVerificationStore } from '../../../lib/identity/studentVerificationState';
import type { VerificationStatus as VerificationStatusType, StudentRecord } from '../../../lib/identity/StudentRegistry';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { date?: string }) => {
      const translations: Record<string, string> = {
        'verification.wallet': 'Wallet',
        'verification.status.verified': 'Verified',
        'verification.status.expired': 'Expired',
        'verification.status.pending': 'Pending Verification',
        'verification.status.reverify': 'Re-verification Required',
        'verification.message.verified': 'Your student identity is verified and active.',
        'verification.message.expired': 'Your verification has expired. Please complete the verification process again.',
        'verification.message.pending': 'Complete biometric, peer vouching, and self-attestation to verify your identity.',
        'verification.message.reverify': `Your verification expires on ${options?.date}. Please re-verify soon.`,
        'verification.message.reverifySoon': 'Your verification will expire soon. Please re-verify.',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
    span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { children?: React.ReactNode }) => (
      <span className={className} {...props}>
        {children}
      </span>
    ),
    p: ({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement> & { children?: React.ReactNode }) => (
      <p className={className} {...props}>
        {children}
      </p>
    ),
  },
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Shield: () => <svg data-testid="shield-icon" />,
  CheckCircle: () => <svg data-testid="check-circle-icon" />,
  AlertCircle: () => <svg data-testid="alert-circle-icon" />,
  Clock: () => <svg data-testid="clock-icon" />,
  Wallet: () => <svg data-testid="wallet-icon" />,
}));

// Mock the store
vi.mock('../../../lib/identity/studentVerificationState', () => ({
  useStudentVerificationStore: vi.fn(),
}));

const mockWalletAddress = '0x1234567890abcdef1234567890abcdef12345678';

describe('VerificationStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders wallet address and pending state when verification data is missing', () => {
    const mockStore = {
      studentVerification: null,
      currentRecord: {
        walletAddress: mockWalletAddress,
      } as StudentRecord,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useStudentVerificationStore).mockReturnValue(mockStore as any);

    render(<VerificationStatus />);

    // Check wallet display
    expect(screen.getByText(/Wallet:/)).toBeInTheDocument();
    expect(screen.getByText(/0x1234...5678/)).toBeInTheDocument();

    // Check pending status
    expect(screen.getByText('Pending Verification')).toBeInTheDocument();
    expect(screen.getByTestId('shield-icon')).toBeInTheDocument();

    // Check pending message
    expect(
      screen.getByText('Complete biometric, peer vouching, and self-attestation to verify your identity.')
    ).toBeInTheDocument();
  });

  it('shows verified badge when isVerified is true', () => {
    const mockStore = {
      studentVerification: {
        isVerified: true,
        expiresAt: Date.now() + 1000000000, // Future date
        needsReverification: false,
        hasActiveBiometric: true,
        hasPeerVouching: true,
        hasSelfAttestation: true,
        hasAdminDelegation: false,
      } as VerificationStatusType,
      currentRecord: {
        walletAddress: mockWalletAddress,
      } as StudentRecord,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useStudentVerificationStore).mockReturnValue(mockStore as any);

    render(<VerificationStatus />);

    // Check verified status
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();

    // Verified status has no message
    expect(screen.queryByText(/Your student identity is verified/)).not.toBeInTheDocument();
  });

  it('shows expired badge when expiresAt < now', () => {
    const mockStore = {
      studentVerification: {
        isVerified: false,
        expiresAt: Date.now() - 1000000, // Past date
        needsReverification: false,
        hasActiveBiometric: false,
        hasPeerVouching: false,
        hasSelfAttestation: false,
        hasAdminDelegation: false,
      } as VerificationStatusType,
      currentRecord: {
        walletAddress: mockWalletAddress,
      } as StudentRecord,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useStudentVerificationStore).mockReturnValue(mockStore as any);

    render(<VerificationStatus />);

    // Check expired status
    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();

    // Check expired message
    expect(
      screen.getByText('Your verification has expired. Please complete the verification process again.')
    ).toBeInTheDocument();
  });

  it('displays re-verify date when needsReverification is true', () => {
    const futureDate = Date.now() + 10 * 24 * 60 * 60 * 1000; // 10 days from now
    const mockStore = {
      studentVerification: {
        isVerified: true,
        expiresAt: futureDate,
        needsReverification: true,
        hasActiveBiometric: true,
        hasPeerVouching: true,
        hasSelfAttestation: true,
        hasAdminDelegation: false,
      } as VerificationStatusType,
      currentRecord: {
        walletAddress: mockWalletAddress,
      } as StudentRecord,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useStudentVerificationStore).mockReturnValue(mockStore as any);

    render(<VerificationStatus />);

    // Check reverify status
    expect(screen.getByText('Re-verification Required')).toBeInTheDocument();
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();

    // Check reverify message includes date
    const expectedDate = new Date(futureDate).toLocaleDateString();
    expect(screen.getByText(new RegExp(`Your verification expires on ${expectedDate}`))).toBeInTheDocument();
  });

  it('hides wallet address when showWallet is false', () => {
    const mockStore = {
      studentVerification: null,
      currentRecord: {
        walletAddress: mockWalletAddress,
      } as StudentRecord,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useStudentVerificationStore).mockReturnValue(mockStore as any);

    render(<VerificationStatus showWallet={false} />);

    // Wallet should not be rendered
    expect(screen.queryByText(/Wallet:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/0x1234...5678/)).not.toBeInTheDocument();

    // But status should still render
    expect(screen.getByText('Pending Verification')).toBeInTheDocument();
  });

  it('handles null currentRecord gracefully', () => {
    const mockStore = {
      studentVerification: null,
      currentRecord: null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useStudentVerificationStore).mockReturnValue(mockStore as any);

    render(<VerificationStatus />);

    // Should render pending status with no wallet
    expect(screen.queryByText(/Wallet:/)).not.toBeInTheDocument();
    expect(screen.getByText('Pending Verification')).toBeInTheDocument();
  });

  it('applies custom className props', () => {
    const mockStore = {
      studentVerification: null,
      currentRecord: {
        walletAddress: mockWalletAddress,
      } as StudentRecord,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useStudentVerificationStore).mockReturnValue(mockStore as any);

    const { container } = render(
      <VerificationStatus
        className="custom-container"
        badgeClassName="custom-badge"
        walletClassName="custom-wallet"
        messageClassName="custom-message"
      />
    );

    // Check if custom classes are applied
    expect(container.querySelector('.custom-container')).toBeInTheDocument();
    expect(container.querySelector('.custom-badge')).toBeInTheDocument();
    expect(container.querySelector('.custom-wallet')).toBeInTheDocument();
    expect(container.querySelector('.custom-message')).toBeInTheDocument();
  });

  it('respects size prop for styling', () => {
    const mockStore = {
      studentVerification: null,
      currentRecord: {
        walletAddress: mockWalletAddress,
      } as StudentRecord,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useStudentVerificationStore).mockReturnValue(mockStore as any);

    const { rerender, container } = render(<VerificationStatus size="sm" />);

    // Small size should have text-xs
    expect(container.querySelector('.text-xs')).toBeInTheDocument();

    rerender(<VerificationStatus size="lg" />);

    // Large size should have text-base
    expect(container.querySelector('.text-base')).toBeInTheDocument();
  });

  it('shows reverify message without date when expiresAt is null but needsReverification is true', () => {
    const mockStore = {
      studentVerification: {
        isVerified: true,
        expiresAt: null,
        needsReverification: true,
        hasActiveBiometric: true,
        hasPeerVouching: true,
        hasSelfAttestation: true,
        hasAdminDelegation: false,
      } as VerificationStatusType,
      currentRecord: {
        walletAddress: mockWalletAddress,
      } as StudentRecord,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useStudentVerificationStore).mockReturnValue(mockStore as any);

    render(<VerificationStatus />);

    // Should show generic reverify message
    expect(screen.getByText('Your verification will expire soon. Please re-verify.')).toBeInTheDocument();
  });
});
