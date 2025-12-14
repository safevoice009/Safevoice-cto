import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ModeratorPanel from '../ModeratorPanel';
import type { MemorialTribute, TributeStatus } from '../../../lib/store';

// Mock framer-motion to avoid animation issues in tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObject = any;

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: AnyObject) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: AnyObject) => <div>{children}</div>,
}));

// Mock the store
const mockUseStore = vi.fn();
vi.mock('../../../lib/store', () => ({
  useStore: mockUseStore,
}));

// eslint-disable @typescript-eslint/no-explicit-any
describe('ModeratorPanel', () => {
  const mockReport = {
    id: 'report-1',
    postId: 'post-1',
    commentId: undefined,
    reportType: 'Inappropriate Content',
    description: 'This post is inappropriate',
    reporterId: 'User#1',
    reportedAt: Date.now(),
    status: 'pending' as const,
    reviewedBy: undefined,
    reviewedAt: undefined,
  };

  const mockTribute: MemorialTribute = {
    id: 'tribute-1',
    createdBy: 'Student#1',
    createdAt: Date.now() - 10000,
    personName: 'John Doe',
    message: 'A tribute to a beloved soul who touched our lives',
    candles: [],
    milestoneRewardAwarded: false,
    status: 'pending_review' as TributeStatus,
    cosigners: [
      {
        peerId: 'Student#2',
        signature: 'sig1',
        signedAt: Date.now() - 8000,
        publicKey: 'key2',
      },
      {
        peerId: 'Student#3',
        signature: 'sig2',
        signedAt: Date.now() - 7000,
        publicKey: 'key3',
      },
      {
        peerId: 'Student#4',
        signature: 'sig3',
        signedAt: Date.now() - 6000,
        publicKey: 'key4',
      },
    ],
    auditTrail: [
      {
        action: 'draft_created',
        timestamp: Date.now() - 10000,
        actor: 'Student#1',
      },
      {
        action: 'cosigner_added',
        timestamp: Date.now() - 8000,
        actor: 'Student#2',
        metadata: { totalCosigners: 1 },
      },
      {
        action: 'cosigner_added',
        timestamp: Date.now() - 7000,
        actor: 'Student#3',
        metadata: { totalCosigners: 2 },
      },
      {
        action: 'cosigner_added',
        timestamp: Date.now() - 6000,
        actor: 'Student#4',
        metadata: { totalCosigners: 3 },
      },
      {
        action: 'finalized',
        timestamp: Date.now() - 5000,
        actor: 'Student#1',
        metadata: { cosignerCount: 3 },
      },
    ],
    honoreeHash: 'hash123',
    expiresAt: Date.now() + 86400000,
    dateOfRemembrance: '2024-01-15',
  };

  const mockTributeWithoutConsensus: MemorialTribute = {
    ...mockTribute,
    id: 'tribute-2',
    cosigners: [
      {
        peerId: 'Student#2',
        signature: 'sig1',
        signedAt: Date.now() - 8000,
        publicKey: 'key2',
      },
    ],
  };

  const mockPublishedTribute: MemorialTribute = {
    ...mockTribute,
    id: 'tribute-3',
    status: 'published',
    moderatorDecision: {
      moderatorId: 'Moderator#1',
      decision: 'approved',
      reason: 'Legitimate tribute',
      timestamp: Date.now() - 2000,
    },
  };

  const mockRejectedTribute: MemorialTribute = {
    ...mockTribute,
    id: 'tribute-4',
    status: 'rejected',
    moderatorDecision: {
      moderatorId: 'Moderator#2',
      decision: 'rejected',
      reason: 'Insufficient information',
      timestamp: Date.now() - 1000,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render nothing if user is not a moderator', () => {
    mockUseStore.mockReturnValue({
      isModerator: false,
    } as AnyObject);

    const { container } = render(<ModeratorPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('should render the moderator panel header with pending counts', () => {
    mockUseStore.mockReturnValue({
      isModerator: true,
      reports: [mockReport],
      memorialTributes: [mockTribute],
      studentId: 'Moderator#1',
      reviewReport: vi.fn(),
      publishTribute: vi.fn(),
      rejectTribute: vi.fn(),
      posts: [],
    } as AnyObject);

    render(<ModeratorPanel />);

    expect(screen.getByText(/Moderator Panel/i)).toBeInTheDocument();
    expect(screen.getByText(/1 Report/i)).toBeInTheDocument();
    expect(screen.getByText(/1 Tribute/i)).toBeInTheDocument();
  });

  it('should display reports tab by default', () => {
    mockUseStore.mockReturnValue({
      isModerator: true,
      reports: [mockReport],
      memorialTributes: [],
      studentId: 'Moderator#1',
      reviewReport: vi.fn(),
      publishTribute: vi.fn(),
      rejectTribute: vi.fn(),
      posts: [],
    } as AnyObject);

    render(<ModeratorPanel />);

    expect(screen.getByText(/Inappropriate Content/i)).toBeInTheDocument();
    expect(screen.getByText(/User#1/i)).toBeInTheDocument();
  });

  it('should switch to tributes tab and display pending tributes', async () => {
    mockUseStore.mockReturnValue({
      isModerator: true,
      reports: [mockReport],
      memorialTributes: [mockTribute],
      studentId: 'Moderator#1',
      reviewReport: vi.fn(),
      publishTribute: vi.fn(),
      rejectTribute: vi.fn(),
      posts: [],
    } as AnyObject);

    render(<ModeratorPanel />);

    const tributesTab = screen.getByText(/Pending Tributes/i);
    fireEvent.click(tributesTab);

    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      expect(screen.getByText(/Consensus Ready/i)).toBeInTheDocument();
    });
  });

  it('should display tribute with consensus met (3/3 cosigners)', async () => {
    mockUseStore.mockReturnValue({
      isModerator: true,
      reports: [],
      memorialTributes: [mockTribute],
      studentId: 'Moderator#1',
      reviewReport: vi.fn(),
      publishTribute: vi.fn(),
      rejectTribute: vi.fn(),
      posts: [],
    } as AnyObject);

    render(<ModeratorPanel />);

    fireEvent.click(screen.getByText(/Pending Tributes/i));

    await waitFor(() => {
      expect(screen.getByText(/3\/3/)).toBeInTheDocument();
      expect(screen.getByText(/Consensus Ready/i)).toBeInTheDocument();
    });
  });

  it('should display tribute without consensus (1/3 cosigners)', async () => {
    mockUseStore.mockReturnValue({
      isModerator: true,
      reports: [],
      memorialTributes: [mockTributeWithoutConsensus],
      studentId: 'Moderator#1',
      reviewReport: vi.fn(),
      publishTribute: vi.fn(),
      rejectTribute: vi.fn(),
      posts: [],
    } as AnyObject);

    render(<ModeratorPanel />);

    fireEvent.click(screen.getByText(/Pending Tributes/i));

    await waitFor(() => {
      expect(screen.getByText(/1\/3/)).toBeInTheDocument();
      expect(screen.getByText(/Awaiting Consensus/i)).toBeInTheDocument();
    });
  });

  it('should display tribute creator and timestamp', async () => {
    mockUseStore.mockReturnValue({
      isModerator: true,
      reports: [],
      memorialTributes: [mockTribute],
      studentId: 'Moderator#1',
      reviewReport: vi.fn(),
      publishTribute: vi.fn(),
      rejectTribute: vi.fn(),
      posts: [],
    } as AnyObject);

    render(<ModeratorPanel />);

    fireEvent.click(screen.getByText(/Pending Tributes/i));

    await waitFor(() => {
      expect(screen.getByText(/Created by Student#1/i)).toBeInTheDocument();
    });
  });

  it('should display all cosigners with timestamps', async () => {
    mockUseStore.mockReturnValue({
      isModerator: true,
      reports: [],
      memorialTributes: [mockTribute],
      studentId: 'Moderator#1',
      reviewReport: vi.fn(),
      publishTribute: vi.fn(),
      rejectTribute: vi.fn(),
      posts: [],
    } as AnyObject);

    render(<ModeratorPanel />);

    fireEvent.click(screen.getByText(/Pending Tributes/i));

    await waitFor(() => {
      expect(screen.getByText(/Student#2/i)).toBeInTheDocument();
      expect(screen.getByText(/Student#3/i)).toBeInTheDocument();
      expect(screen.getByText(/Student#4/i)).toBeInTheDocument();
    });
  });

  it('should display tribute message', async () => {
    mockUseStore.mockReturnValue({
      isModerator: true,
      reports: [],
      memorialTributes: [mockTribute],
      studentId: 'Moderator#1',
      reviewReport: vi.fn(),
      publishTribute: vi.fn(),
      rejectTribute: vi.fn(),
      posts: [],
    } as AnyObject);

    render(<ModeratorPanel />);

    fireEvent.click(screen.getByText(/Pending Tributes/i));

    await waitFor(() => {
      expect(
        screen.getByText(/A tribute to a beloved soul who touched our lives/i)
      ).toBeInTheDocument();
    });
  });

  it('should display audit trail entries', async () => {
    mockUseStore.mockReturnValue({
      isModerator: true,
      reports: [],
      memorialTributes: [mockTribute],
      studentId: 'Moderator#1',
      reviewReport: vi.fn(),
      publishTribute: vi.fn(),
      rejectTribute: vi.fn(),
      posts: [],
    } as AnyObject);

    render(<ModeratorPanel />);

    fireEvent.click(screen.getByText(/Pending Tributes/i));

    await waitFor(() => {
      expect(screen.getByText(/Audit Trail/i)).toBeInTheDocument();
    });
  });

  it('should disable approve button when consensus not met', async () => {
    mockUseStore.mockReturnValue({
      isModerator: true,
      reports: [],
      memorialTributes: [mockTributeWithoutConsensus],
      studentId: 'Moderator#1',
      reviewReport: vi.fn(),
      publishTribute: vi.fn(),
      rejectTribute: vi.fn(),
      posts: [],
    } as AnyObject);

    render(<ModeratorPanel />);

    fireEvent.click(screen.getByText(/Pending Tributes/i));

    await waitFor(() => {
      const approveButtons = screen.getAllByText(/Approve/i);
      expect(approveButtons[0]).toBeDisabled();
    });
  });

  it('should enable approve button when consensus is met', async () => {
    mockUseStore.mockReturnValue({
      isModerator: true,
      reports: [],
      memorialTributes: [mockTribute],
      studentId: 'Moderator#1',
      reviewReport: vi.fn(),
      publishTribute: vi.fn(),
      rejectTribute: vi.fn(),
      posts: [],
    } as AnyObject);

    render(<ModeratorPanel />);

    fireEvent.click(screen.getByText(/Pending Tributes/i));

    await waitFor(() => {
      const approveButtons = screen.getAllByText(/Approve/i);
      expect(approveButtons[0]).not.toBeDisabled();
    });
  });

  it('should call publishTribute when approve button is clicked', async () => {
    const mockPublishTribute = vi.fn();
    mockUseStore.mockReturnValue({
      isModerator: true,
      reports: [],
      memorialTributes: [mockTribute],
      studentId: 'Moderator#1',
      reviewReport: vi.fn(),
      publishTribute: mockPublishTribute,
      rejectTribute: vi.fn(),
      posts: [],
    } as AnyObject);

    render(<ModeratorPanel />);

    fireEvent.click(screen.getByText(/Pending Tributes/i));

    await waitFor(() => {
      const approveButtons = screen.getAllByText(/Approve/i);
      fireEvent.click(approveButtons[0]);
    });

    await waitFor(() => {
      expect(mockPublishTribute).toHaveBeenCalledWith('tribute-1', 'Moderator#1', undefined);
    });
  });

  it('should show reject form when reject button is clicked', async () => {
    mockUseStore.mockReturnValue({
      isModerator: true,
      reports: [],
      memorialTributes: [mockTribute],
      studentId: 'Moderator#1',
      reviewReport: vi.fn(),
      publishTribute: vi.fn(),
      rejectTribute: vi.fn(),
      posts: [],
    } as AnyObject);

    render(<ModeratorPanel />);

    fireEvent.click(screen.getByText(/Pending Tributes/i));

    await waitFor(() => {
      const rejectButtons = screen.getAllByText(/Reject/i);
      fireEvent.click(rejectButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Enter reason for rejection/i)).toBeInTheDocument();
    });
  });

  it('should call rejectTribute with reason when confirmed', async () => {
    const mockRejectTribute = vi.fn();
    mockUseStore.mockReturnValue({
      isModerator: true,
      reports: [],
      memorialTributes: [mockTribute],
      studentId: 'Moderator#1',
      reviewReport: vi.fn(),
      publishTribute: vi.fn(),
      rejectTribute: mockRejectTribute,
      posts: [],
    } as AnyObject);

    render(<ModeratorPanel />);

    fireEvent.click(screen.getByText(/Pending Tributes/i));

    await waitFor(() => {
      const rejectButtons = screen.getAllByText(/Reject/i);
      fireEvent.click(rejectButtons[0]);
    });

    await waitFor(() => {
      const reasonInput = screen.getByPlaceholderText(/Enter reason for rejection/i);
      fireEvent.change(reasonInput, { target: { value: 'Insufficient information' } });
    });

    await waitFor(() => {
      const confirmButtons = screen.getAllByText(/Confirm Rejection/i);
      fireEvent.click(confirmButtons[0]);
    });

    await waitFor(() => {
      expect(mockRejectTribute).toHaveBeenCalledWith('tribute-1', 'Moderator#1', 'Insufficient information');
    });
  });

  it('should display published tributes in reviewed tab', async () => {
    mockUseStore.mockReturnValue({
      isModerator: true,
      reports: [],
      memorialTributes: [mockPublishedTribute],
      studentId: 'Moderator#1',
      reviewReport: vi.fn(),
      publishTribute: vi.fn(),
      rejectTribute: vi.fn(),
      posts: [],
    } as AnyObject);

    render(<ModeratorPanel />);

    fireEvent.click(screen.getByText(/Pending Tributes/i));
    await waitFor(() => fireEvent.click(screen.getByText(/Reviewed.*0/)));

    await waitFor(() => {
      expect(screen.getByText(/Published/i)).toBeInTheDocument();
      expect(screen.getByText(/Moderator#1/i)).toBeInTheDocument();
    });
  });

  it('should display rejected tributes with reason', async () => {
    mockUseStore.mockReturnValue({
      isModerator: true,
      reports: [],
      memorialTributes: [mockRejectedTribute],
      studentId: 'Moderator#1',
      reviewReport: vi.fn(),
      publishTribute: vi.fn(),
      rejectTribute: vi.fn(),
      posts: [],
    } as AnyObject);

    render(<ModeratorPanel />);

    fireEvent.click(screen.getByText(/Pending Tributes/i));
    await waitFor(() => fireEvent.click(screen.getByText(/Reviewed.*0/)));

    await waitFor(() => {
      expect(screen.getByText(/Rejected/i)).toBeInTheDocument();
      expect(screen.getByText(/Insufficient information/i)).toBeInTheDocument();
    });
  });

  it('should show empty state for no pending reports', () => {
    mockUseStore.mockReturnValue({
      isModerator: true,
      reports: [],
      memorialTributes: [],
      studentId: 'Moderator#1',
      reviewReport: vi.fn(),
      publishTribute: vi.fn(),
      rejectTribute: vi.fn(),
      posts: [],
    } as AnyObject);

    render(<ModeratorPanel />);

    expect(screen.getByText(/No pending reports/i)).toBeInTheDocument();
  });

  it('should show empty state for no pending tributes', () => {
    mockUseStore.mockReturnValue({
      isModerator: true,
      reports: [],
      memorialTributes: [],
      studentId: 'Moderator#1',
      reviewReport: vi.fn(),
      publishTribute: vi.fn(),
      rejectTribute: vi.fn(),
      posts: [],
    } as AnyObject);

    render(<ModeratorPanel />);

    fireEvent.click(screen.getByText(/Pending Tributes/i));

    expect(screen.getByText(/No pending tributes/i)).toBeInTheDocument();
  });

  it('should cancel reject form without submitting', async () => {
    const mockRejectTribute = vi.fn();
    mockUseStore.mockReturnValue({
      isModerator: true,
      reports: [],
      memorialTributes: [mockTribute],
      studentId: 'Moderator#1',
      reviewReport: vi.fn(),
      publishTribute: vi.fn(),
      rejectTribute: mockRejectTribute,
      posts: [],
    } as AnyObject);

    render(<ModeratorPanel />);

    fireEvent.click(screen.getByText(/Pending Tributes/i));

    await waitFor(() => {
      const rejectButtons = screen.getAllByText(/Reject/i);
      fireEvent.click(rejectButtons[0]);
    });

    await waitFor(() => {
      const cancelButtons = screen.getAllByText(/Cancel/i);
      fireEvent.click(cancelButtons[0]);
    });

    expect(mockRejectTribute).not.toHaveBeenCalled();
  });
});
