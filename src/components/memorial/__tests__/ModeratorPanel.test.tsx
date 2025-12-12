import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import type { StoreState } from '../../../lib/store'
import { useStore } from '../../../lib/store'
import ModeratorPanel from '../ModeratorPanel'
import { computeTributeContentHash } from '../../../lib/memorial/TributeService'

vi.mock('react-hot-toast', () => ({
  default: Object.assign(() => undefined, {
    success: vi.fn(),
    error: vi.fn(),
  }),
}))

const initialStoreState = useStore.getState()

function makePendingTribute(overrides: Partial<StoreState['memorialTributes'][number]> = {}) {
  const base = {
    id: 't-1',
    createdBy: 'Student#1000',
    createdAt: 1000,
    updatedAt: null,
    personName: 'Jordan Doe',
    college: 'Example College',
    message: 'Remembered with love.',
    status: 'pending_moderation' as const,
    contentVersion: 1,
    contentHash: '',
    cosignerProofs: [],
    moderatorDecision: null,
    candles: [],
    milestoneRewardAwarded: false,
  }

  const contentHash = computeTributeContentHash({
    personName: overrides.personName ?? base.personName,
    college: (overrides.college ?? base.college) as string | null,
    message: overrides.message ?? base.message,
    contentVersion: overrides.contentVersion ?? base.contentVersion,
  })

  const withHash = { ...base, ...overrides, contentHash }

  return {
    ...withHash,
    cosignerProofs:
      overrides.cosignerProofs ??
      [0, 1, 2].map((idx) => ({
        id: `sig-${idx}`,
        tributeId: withHash.id,
        cosignerId: `Student#20${idx}`,
        publicKey: 'pk',
        signature: `signature-${idx}`,
        signedAt: 2000 + idx,
        contentHash,
      })),
  }
}

beforeEach(() => {
  sessionStorage.clear()

  useStore.setState({
    studentId: 'Moderator#1',
    isModerator: true,
    memorialTributes: [makePendingTribute()],
    recordModeratorAction: vi.fn<StoreState['recordModeratorAction']>(),
    saveToLocalStorage: vi.fn<StoreState['saveToLocalStorage']>(),
  })
})

afterEach(() => {
  useStore.setState(initialStoreState, true)
})

describe('Memorial ModeratorPanel', () => {
  it('approves a tribute and logs the action', async () => {
    const user = userEvent.setup()
    render(<ModeratorPanel />)

    const approveButton = screen.getByRole('button', { name: /approve tribute/i })
    await user.click(approveButton)

    await waitFor(() => {
      expect(useStore.getState().memorialTributes[0]?.status).toBe('published')
    })

    expect(useStore.getState().recordModeratorAction).toHaveBeenCalledWith(
      'approve_tribute',
      't-1',
      expect.objectContaining({ cosignerCount: 3 })
    )
  })

  it('rejects a tribute and logs the action', async () => {
    const user = userEvent.setup()
    render(<ModeratorPanel />)

    const reasonInput = screen.getByLabelText(/rejection reason/i)
    await user.type(reasonInput, 'Needs clarification')

    const rejectButton = screen.getByRole('button', { name: /reject tribute/i })
    await user.click(rejectButton)

    await waitFor(() => {
      expect(useStore.getState().memorialTributes[0]?.status).toBe('rejected')
    })

    expect(useStore.getState().recordModeratorAction).toHaveBeenCalledWith(
      'reject_tribute',
      't-1',
      expect.objectContaining({ reason: 'Needs clarification' })
    )
  })

  it('edit workflow resets cosigner votes and moves tribute back to draft', async () => {
    const user = userEvent.setup()
    render(<ModeratorPanel />)

    const editButton = screen.getByRole('button', { name: /edit tribute/i })
    await user.click(editButton)

    const messageField = screen.getByLabelText(/tribute message/i)
    await user.clear(messageField)
    await user.type(messageField, 'Updated tribute message')

    await user.click(screen.getByRole('button', { name: /save edits/i }))

    await waitFor(() => {
      expect(useStore.getState().memorialTributes[0]?.status).toBe('draft')
    })

    expect(useStore.getState().memorialTributes[0]?.cosignerProofs).toHaveLength(0)
    expect(screen.getByTestId('no-pending-tributes')).toBeInTheDocument()
  })

  it('blocks edits containing profanity before resetting votes', async () => {
    const user = userEvent.setup()
    const tribute = makePendingTribute({ message: 'Initial message' })

    useStore.setState({ memorialTributes: [tribute] })

    render(<ModeratorPanel />)

    await user.click(screen.getByRole('button', { name: /edit tribute/i }))

    const messageField = screen.getByLabelText(/tribute message/i)
    await user.clear(messageField)
    await user.type(messageField, 'fuck this')

    await user.click(screen.getByRole('button', { name: /save edits/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/remove profanity/i)

    const updated = useStore.getState().memorialTributes[0]
    expect(updated?.status).toBe('pending_moderation')
    expect(updated?.cosignerProofs).toHaveLength(3)
  })

  it('records moderator actions when approving via keyboard', async () => {
    const user = userEvent.setup()
    render(<ModeratorPanel />)

    const approveButton = screen.getByRole('button', { name: /approve tribute/i })
    approveButton.focus()
    expect(approveButton).toHaveFocus()

    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(useStore.getState().recordModeratorAction).toHaveBeenCalledWith(
        'approve_tribute',
        't-1',
        expect.any(Object)
      )
    })
  })

  it('supports tabbing to action controls for keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<ModeratorPanel />)

    // Focus the rejection reason input, then tab to the Approve button.
    const reasonInput = screen.getByLabelText(/rejection reason/i)
    reasonInput.focus()
    await user.tab()

    const approveButton = screen.getByRole('button', { name: /approve tribute/i })
    expect(approveButton).toHaveFocus()
  })
})
