import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BiometricRegistration } from '../BiometricRegistration';
import { useStudentVerificationStore } from '../../../lib/identity/studentVerificationState';
import { toast } from 'react-hot-toast';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      if (key === 'verification.biometric.progress' && options?.count !== undefined) {
        return `${options.count}/3 devices registered`;
      }
      if (key === 'verification.biometric.currentDevice') return 'Current Device';
      return key;
    },
  }),
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../lib/identity/studentVerificationState');

describe('BiometricRegistration', () => {
  const mockSubmitBiometricCommitment = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default store mock
    (useStudentVerificationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentRecord: {
        biometricCommitments: [],
        walletAddress: '0x123',
      },
      submitBiometricCommitment: mockSubmitBiometricCommitment,
      errors: [],
    });
  });

  it('renders correctly with default state', () => {
    render(<BiometricRegistration />);
    
    expect(screen.getByText('verification.biometric.title')).toBeInTheDocument();
    expect(screen.getByText('verification.biometric.description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Current Device')).toBeInTheDocument();
    expect(screen.getByText('verification.biometric.registerButton')).toBeInTheDocument();
    expect(screen.getByText('0/3 devices registered')).toBeInTheDocument();
  });

  it('updates progress text based on commitment count', () => {
    (useStudentVerificationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentRecord: {
        biometricCommitments: [{ id: '1' }, { id: '2' }],
        walletAddress: '0x123',
      },
      submitBiometricCommitment: mockSubmitBiometricCommitment,
      errors: [],
    });

    render(<BiometricRegistration />);
    expect(screen.getByText('2/3 devices registered')).toBeInTheDocument();
  });

  it('calls submitBiometricCommitment when register button is clicked', async () => {
    render(<BiometricRegistration />);
    
    const input = screen.getByDisplayValue('Current Device');
    fireEvent.change(input, { target: { value: 'My iPhone' } });
    
    const button = screen.getByText('verification.biometric.registerButton');
    fireEvent.click(button);
    
    expect(mockSubmitBiometricCommitment).toHaveBeenCalledWith('My iPhone');
    
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('verification.biometric.success');
    });
  });

  it('shows error toast when registration fails', async () => {
    mockSubmitBiometricCommitment.mockRejectedValue(new Error('Failed'));
    
    render(<BiometricRegistration />);
    
    const button = screen.getByText('verification.biometric.registerButton');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('verification.biometric.error');
    });
  });

  it('disables registration when limit is reached (3/3)', () => {
    (useStudentVerificationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentRecord: {
        biometricCommitments: [{ id: '1' }, { id: '2' }, { id: '3' }],
        walletAddress: '0x123',
      },
      submitBiometricCommitment: mockSubmitBiometricCommitment,
      errors: [],
    });

    render(<BiometricRegistration />);
    
    expect(screen.getByText('3/3 devices registered')).toBeInTheDocument();
    
    const limitMessages = screen.getAllByText('verification.biometric.limitReached');
    expect(limitMessages).toHaveLength(2); // One in alert, one in button
    
    expect(screen.getByText('verification.biometric.limitError')).toBeInTheDocument();
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByDisplayValue('Current Device')).toBeDisabled();
  });

  it('displays store errors if any', () => {
    (useStudentVerificationStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentRecord: {
        biometricCommitments: [],
        walletAddress: '0x123',
      },
      submitBiometricCommitment: mockSubmitBiometricCommitment,
      errors: ['Some store error'],
    });

    render(<BiometricRegistration />);
    
    expect(screen.getByText('Some store error')).toBeInTheDocument();
  });

  it('handles loading state correctly', async () => {
    // Make the promise hang to test loading state
    mockSubmitBiometricCommitment.mockImplementation(() => new Promise(() => {}));
    
    render(<BiometricRegistration />);
    
    const button = screen.getByText('verification.biometric.registerButton');
    fireEvent.click(button);
    
    expect(screen.getByText('verification.biometric.registering')).toBeInTheDocument();
    expect(button).toBeDisabled();
    expect(screen.getByDisplayValue('Current Device')).toBeDisabled();
  });
});
