import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../../i18n/config'
import StudentVerificationPanel from '../StudentVerificationPanel'

const mockStoreState = {
  anonymousWalletAddress: '0x1234abcd',
  trustedContacts: [
    { name: 'Avery', email: 'avery@example.com' },
    { name: 'Jordan', phone: '+1-555-0100' },
  ],
}

const baseStatus = {
  hasActiveBiometric: false,
  hasPeerVouching: false,
  hasSelfAttestation: false,
  hasAdminDelegation: false,
  isVerified: false,
  needsReverification: false,
  expiresAt: null,
}

const baseRecord = {
  walletAddress: '0x1234abcd',
  biometricCommitments: [],
  peerSignatures: [],
  selfAttestation: null,
  adminDelegation: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

const mockActions = {
  submitBiometricCommitment: vi.fn().mockResolvedValue(undefined),
  requestPeerVouching: vi.fn().mockResolvedValue('req-1'),
  submitSelfAttestation: vi.fn().mockResolvedValue(undefined),
  refreshStatus: vi.fn().mockResolvedValue(undefined),
}

let mockVerificationState: any

vi.mock('../../../lib/store', () => ({
  useStore: (selector: (state: typeof mockStoreState) => unknown) => selector(mockStoreState),
}))

vi.mock('../../../lib/identity/studentVerificationState', () => ({
  useStudentVerificationStore: (selector: (state: typeof mockVerificationState) => unknown) => selector(mockVerificationState),
}))

const renderComponent = () => {
  return render(<StudentVerificationPanel />)
}

beforeEach(async () => {
  await i18n.changeLanguage('en')
  mockVerificationState = {
    studentVerification: { ...baseStatus },
    currentRecord: { ...baseRecord },
    pendingPeers: [],
    isInitialized: true,
    ...mockActions,
  }
  Object.values(mockActions).forEach((fn) => fn.mockClear())
})

describe('StudentVerificationPanel', () => {
  it('renders wallet address from store', () => {
    renderComponent()
    expect(screen.getByText(mockStoreState.anonymousWalletAddress)).toBeInTheDocument()
  })

  it('shows biometric status and commitments', () => {
    mockVerificationState.studentVerification = { ...baseStatus, hasActiveBiometric: true }
    mockVerificationState.currentRecord = {
      ...baseRecord,
      biometricCommitments: [
        {
          id: 'commit-1',
          walletAddress: baseRecord.walletAddress,
          saltedHash: 'abcdef1234567890',
          deviceLabel: 'Campus Laptop',
          createdAt: Date.now(),
        },
      ],
    }

    renderComponent()

    expect(screen.getByText('Biometric commitment stored')).toBeInTheDocument()
    expect(screen.getByText('Campus Laptop')).toBeInTheDocument()
  })

  it('requests peer vouches with entered addresses', async () => {
    const user = userEvent.setup()
    renderComponent()

    const textarea = screen.getByPlaceholderText('Peer wallet addresses (one per line)')
    await user.type(textarea, '0xaaa\n0xbbb')
    await user.click(screen.getByRole('button', { name: /Request peer vouches/i }))

    expect(mockActions.requestPeerVouching).toHaveBeenCalledWith(['0xaaa', '0xbbb'])
  })

  it('shows 2-of-3 signature progress', () => {
    mockVerificationState.pendingPeers = [
      { walletAddress: '0xaaa', invitedAt: Date.now(), status: 'pending' },
      { walletAddress: '0xbbb', invitedAt: Date.now(), status: 'pending' },
      { walletAddress: '0xccc', invitedAt: Date.now(), status: 'pending' },
    ]
    mockVerificationState.currentRecord = {
      ...baseRecord,
      peerSignatures: [
        { id: 'sig-1', requestId: 'req', signerWallet: '0xaaa', signatureBytes: '111', attestationText: 'ok', timestamp: Date.now() },
        { id: 'sig-2', requestId: 'req', signerWallet: '0xbbb', signatureBytes: '222', attestationText: 'ok', timestamp: Date.now() },
      ],
    }

    renderComponent()

    expect(screen.getByText('2 / 3 approvals')).toBeInTheDocument()
  })

  it('shows attestation countdown and reverify reminder', () => {
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000
    mockVerificationState.studentVerification = {
      ...baseStatus,
      hasSelfAttestation: true,
      needsReverification: true,
      expiresAt: Date.now() + fiveDaysMs,
    }

    renderComponent()

    expect(screen.getByText(/5 days remaining/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reverify now/i })).toBeInTheDocument()
  })

  it('does not render email or sms inputs', () => {
    const { container } = renderComponent()
    expect(container.querySelector('input[type="email"]')).toBeNull()
    expect(container.querySelector('input[type="tel"]')).toBeNull()
  })
})
