import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { useStore, type StoreState } from '../../../lib/store'
import TributeWall from '../TributeWall'
import MemorialPage from '../../../pages/MemorialPage'
import { computeTributeContentHash } from '../../../lib/memorial/TributeService'

vi.mock('react-hot-toast', () => ({
  default: Object.assign(() => undefined, {
    success: vi.fn(),
    error: vi.fn(),
  }),
}))

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  },
}))

const initialStoreState = useStore.getState()

function makePublishedTribute(input: {
  id: string
  personName: string
  college: string
  message: string
  createdAt: number
  cosignerTimes?: number[]
  publishedAt?: number
}): StoreState['memorialTributes'][number] {
  const contentVersion = 1
  const contentHash = computeTributeContentHash({
    personName: input.personName,
    college: input.college,
    message: input.message,
    contentVersion,
  })

  const cosignerTimes = input.cosignerTimes ?? []

  return {
    id: input.id,
    createdBy: 'Student#1000',
    createdAt: input.createdAt,
    updatedAt: input.publishedAt ?? null,
    personName: input.personName,
    college: input.college,
    message: input.message,
    status: 'published',
    contentVersion,
    contentHash,
    cosignerProofs: cosignerTimes.map((time, idx) => ({
      id: `${input.id}-cosign-${idx}`,
      tributeId: input.id,
      cosignerId: `Student#${idx}`,
      publicKey: 'pk',
      signature: `sig-${idx}`,
      signedAt: time,
      contentHash,
    })),
    moderatorDecision: input.publishedAt
      ? {
          id: `${input.id}-decision`,
          tributeId: input.id,
          moderatorId: 'Moderator#1',
          publicKey: 'pk',
          signature: 'modsig',
          decidedAt: input.publishedAt,
          action: 'approve',
          reason: null,
          contentHash,
        }
      : null,
    candles: [],
    milestoneRewardAwarded: false,
  }
}

beforeEach(() => {
  sessionStorage.clear()

  useStore.setState({
    isModerator: false,
    loadMemorialData: vi.fn<StoreState['loadMemorialData']>(),
    saveToLocalStorage: vi.fn<StoreState['saveToLocalStorage']>(),
  })
})

afterEach(() => {
  useStore.setState(initialStoreState, true)
})

describe('TributeWall and MemorialPage experience', () => {
  it('renders published tributes and redacts contact info', () => {
    useStore.setState({
      memorialTributes: [
        makePublishedTribute({
          id: 't-1',
          personName: 'Alex',
          college: 'North College',
          message: 'Contact alex@example.com for details',
          createdAt: 1000,
        }),
      ],
    })

    render(<TributeWall />)

    expect(screen.getByText('Alex')).toBeInTheDocument()
    expect(screen.getByText('North College')).toBeInTheDocument()
    expect(screen.getByTestId('tribute-message')).toHaveTextContent('[redacted email]')
    expect(screen.getByTestId('tribute-message')).not.toHaveTextContent('alex@example.com')
  })

  it('renders timeline events in chronological order', () => {
    useStore.setState({
      memorialTributes: [
        makePublishedTribute({
          id: 't-2',
          personName: 'Bri',
          college: 'East College',
          message: 'Forever missed',
          createdAt: 1000,
          cosignerTimes: [2000, 3000, 4000],
          publishedAt: 5000,
        }),
      ],
    })

    render(<TributeWall />)

    const tributeCard = screen.getByTestId('tribute-t-2')
    const timelineItems = within(tributeCard).getAllByTestId('timeline-event')

    expect(timelineItems.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Created'),
      expect.stringContaining('Cosign milestone 1/3'),
      expect.stringContaining('Cosign milestone 2/3'),
      expect.stringContaining('Cosign milestone 3/3'),
      expect.stringContaining('Published'),
    ])
  })

  it('filters by honoree name using search', async () => {
    const user = userEvent.setup()

    useStore.setState({
      memorialTributes: [
        makePublishedTribute({
          id: 't-1',
          personName: 'Alice',
          college: 'North College',
          message: 'Tribute A',
          createdAt: 1000,
        }),
        makePublishedTribute({
          id: 't-2',
          personName: 'Charlie',
          college: 'North College',
          message: 'Tribute B',
          createdAt: 1001,
        }),
      ],
    })

    render(<TributeWall />)

    await user.type(screen.getByLabelText(/search tributes/i), 'ali')

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.queryByText('Charlie')).not.toBeInTheDocument()
  })

  it('filters by college selection', async () => {
    const user = userEvent.setup()

    useStore.setState({
      memorialTributes: [
        makePublishedTribute({
          id: 't-1',
          personName: 'Dana',
          college: 'North College',
          message: 'Tribute A',
          createdAt: 1000,
        }),
        makePublishedTribute({
          id: 't-2',
          personName: 'Eli',
          college: 'South College',
          message: 'Tribute B',
          createdAt: 1001,
        }),
      ],
    })

    render(<TributeWall />)

    await user.selectOptions(screen.getByLabelText(/filter tributes by college/i), 'South College')

    expect(screen.getByText('Eli')).toBeInTheDocument()
    expect(screen.queryByText('Dana')).not.toBeInTheDocument()
  })

  it('shows a privacy notice when filters narrow results below 3 tributes', async () => {
    const user = userEvent.setup()

    useStore.setState({
      memorialTributes: [
        makePublishedTribute({ id: 't-1', personName: 'Alpha', college: 'C1', message: 'A', createdAt: 1 }),
        makePublishedTribute({ id: 't-2', personName: 'Bravo', college: 'C1', message: 'B', createdAt: 2 }),
        makePublishedTribute({ id: 't-3', personName: 'Charlie', college: 'C2', message: 'C', createdAt: 3 }),
        makePublishedTribute({ id: 't-4', personName: 'Delta', college: 'C2', message: 'D', createdAt: 4 }),
      ],
    })

    render(<TributeWall />)

    await user.type(screen.getByLabelText(/search tributes/i), 'alpha')

    expect(await screen.findByRole('note')).toHaveTextContent(/privacy notice/i)
  })

  it('shows a rate-limit message when session view limit is exceeded', () => {
    sessionStorage.setItem('safevoice:memorial_wall_views', '15')

    useStore.setState({
      memorialTributes: [
        makePublishedTribute({ id: 't-1', personName: 'Alex', college: 'C1', message: 'Test', createdAt: 1 }),
      ],
    })

    render(<MemorialPage />)

    expect(screen.getByTestId('rate-limit-message')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /tribute wall/i })).not.toBeInTheDocument()
  })

  it('moves focus to the heading for accessibility', async () => {
    useStore.setState({
      memorialTributes: [
        makePublishedTribute({ id: 't-1', personName: 'Alex', college: 'C1', message: 'Test', createdAt: 1 }),
      ],
    })

    render(<MemorialPage />)

    const heading = screen.getByRole('heading', { name: /memorial wall/i })

    await waitFor(() => {
      expect(heading).toHaveFocus()
    })
  })
})
