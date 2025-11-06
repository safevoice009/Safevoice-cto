import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import PostCard from '../PostCard';
import { useStore } from '../../../lib/store';
import type { StoreState } from '../../../lib/store';
import type { Post } from '../../../lib/store';
import { getIPFSGatewayUrl, verifyIPFSContent } from '../../../lib/ipfs';

vi.mock('react-hot-toast', () => ({
  default: Object.assign(() => undefined, {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../../../lib/ipfs', () => ({
  getIPFSGatewayUrl: (cid: string) => `https://ipfs.io/ipfs/${cid}`,
  verifyIPFSContent: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    article: ({ children, ...props }: HTMLAttributes<HTMLElement>) => <article {...props}>{children}</article>,
    button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../ReactionBar', () => ({
  default: () => <div>ReactionBar Mock</div>,
}));

vi.mock('../CommentSection', () => ({
  default: () => <div>CommentSection Mock</div>,
}));

vi.mock('../ReportModal', () => ({
  default: () => <div>ReportModal Mock</div>,
}));

vi.mock('../ShareMenu', () => ({
  default: () => <div>ShareMenu Mock</div>,
}));

vi.mock('../ConfirmModal', () => ({
  default: () => <div>ConfirmModal Mock</div>,
}));

vi.mock('../TipModal', () => ({
  default: () => <div>TipModal Mock</div>,
}));

vi.mock('../../wallet/RankChip', () => ({
  default: () => <div>RankChip Mock</div>,
}));

const verifyIPFSMock = verifyIPFSContent as MockedFunction<
  (cid: string, originalContent: string) => Promise<boolean>
>;

const initialStoreState = useStore.getState();

const toggleBookmarkMock = vi.fn<StoreState['toggleBookmark']>();
const incrementHelpfulMock = vi.fn<StoreState['incrementHelpful']>();
const updatePostMock = vi.fn<StoreState['updatePost']>();
const deletePostMock = vi.fn<StoreState['deletePost']>();
const getEncryptionKeyMock = vi.fn<StoreState['getEncryptionKey']>();
const addEncryptionKeyMock = vi.fn<StoreState['addEncryptionKey']>();
const setShowCrisisModalMock = vi.fn<StoreState['setShowCrisisModal']>();
const setPendingPostMock = vi.fn<StoreState['setPendingPost']>();
const pinPostMock = vi.fn<StoreState['pinPost']>();
const highlightPostMock = vi.fn<StoreState['highlightPost']>();
const extendPostLifetimeMock = vi.fn<StoreState['extendPostLifetime']>();
const boostToCampusesMock = vi.fn<StoreState['boostToCampuses']>();
const pinCommunityPostMock = vi.fn<StoreState['pinCommunityPost']>();
const unpinCommunityPostMock = vi.fn<StoreState['unpinCommunityPost']>();
const deleteCommunityPostMock = vi.fn<StoreState['deleteCommunityPost']>();
const banCommunityMemberMock = vi.fn<StoreState['banCommunityMember']>();
const warnCommunityMemberMock = vi.fn<StoreState['warnCommunityMember']>();
const addReactionMock = vi.fn<StoreState['addReaction']>();

beforeEach(() => {
  toggleBookmarkMock.mockReset();
  incrementHelpfulMock.mockReset();
  updatePostMock.mockReset();
  deletePostMock.mockReset();
  getEncryptionKeyMock.mockReset();
  getEncryptionKeyMock.mockReturnValue(undefined);
  addEncryptionKeyMock.mockReset();
  setShowCrisisModalMock.mockReset();
  setPendingPostMock.mockReset();
  pinPostMock.mockReset();
  highlightPostMock.mockReset();
  extendPostLifetimeMock.mockReset();
  boostToCampusesMock.mockReset();
  pinCommunityPostMock.mockReset();
  unpinCommunityPostMock.mockReset();
  deleteCommunityPostMock.mockReset();
  banCommunityMemberMock.mockReset();
  warnCommunityMemberMock.mockReset();
  addReactionMock.mockReset();

  useStore.setState({
    studentId: 'Student#5678',
    toggleBookmark: toggleBookmarkMock,
    bookmarkedPosts: [],
    incrementHelpful: incrementHelpfulMock,
    updatePost: updatePostMock,
    deletePost: deletePostMock,
    getEncryptionKey: getEncryptionKeyMock,
    addEncryptionKey: addEncryptionKeyMock,
    setShowCrisisModal: setShowCrisisModalMock,
    setPendingPost: setPendingPostMock,
    pinPost: pinPostMock,
    highlightPost: highlightPostMock,
    extendPostLifetime: extendPostLifetimeMock,
    boostToCampuses: boostToCampusesMock,
    isModerator: false,
    pinCommunityPost: pinCommunityPostMock,
    unpinCommunityPost: unpinCommunityPostMock,
    deleteCommunityPost: deleteCommunityPostMock,
    banCommunityMember: banCommunityMemberMock,
    warnCommunityMember: warnCommunityMemberMock,
    communities: [] as StoreState['communities'],
    communityChannels: [] as StoreState['communityChannels'],
    addReaction: addReactionMock,
  });

  verifyIPFSMock.mockReset();
  verifyIPFSMock.mockResolvedValue(true);
});

afterEach(() => {
  useStore.setState(initialStoreState, true);
});

describe('PostCard IPFS Integration', () => {
  const mockPost: Post = {
    id: 'test-post-1',
    studentId: 'Student#1234',
    content: 'This is a test post stored on IPFS',
    category: 'Mental Health',
    reactions: { heart: 5, fire: 2, clap: 3, sad: 0, angry: 0, laugh: 1 },
    commentCount: 2,
    comments: [],
    createdAt: Date.now(),
    isEdited: false,
    editedAt: null,
    isPinned: false,
    reportCount: 0,
    helpfulCount: 3,
    expiresAt: Date.now() + 86_400_000,
    lifetime: '24h',
    isEncrypted: false,
    encryptionMeta: null,
    ipfsCid: 'QmTest123456',
  };

  it('renders the IPFS CID when available', () => {
    render(<PostCard post={mockPost} />);

    expect(screen.getByText(/CID: QmTest123456/i)).toBeInTheDocument();
  });

  it('shows the decentralized storage badge', () => {
    render(<PostCard post={mockPost} />);

    expect(screen.getByText(/Decentralized storage/i)).toBeInTheDocument();
  });

  it('renders the gateway link with the correct URL', () => {
    render(<PostCard post={mockPost} />);

    const link = screen.getByRole('link', { name: /Open/i });
    expect(link).toHaveAttribute('href', getIPFSGatewayUrl('QmTest123456'));
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('displays the verify button', () => {
    render(<PostCard post={mockPost} />);

    expect(screen.getByRole('button', { name: /Verify/i })).toBeInTheDocument();
  });

  it('hides IPFS metadata when no CID is present', () => {
    const postWithoutCid: Post = { ...mockPost, ipfsCid: null };
    render(<PostCard post={postWithoutCid} />);

    expect(screen.queryByText(/CID:/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Verify/i })).not.toBeInTheDocument();
  });

  it('shows a verifying state while IPFS content is being checked', async () => {
    const user = userEvent.setup();
    let resolveVerification: ((value: boolean) => void) | undefined;
    verifyIPFSMock.mockImplementation(
      () => new Promise<boolean>((resolve) => {
        resolveVerification = resolve;
      })
    );

    render(<PostCard post={mockPost} />);

    const verifyButton = screen.getByRole('button', { name: /Verify/i });
    await user.click(verifyButton);

    await waitFor(() => {
      expect(screen.getByText(/Verifying/i)).toBeInTheDocument();
    });

    resolveVerification?.(true);
  });

  it('indicates verification success when IPFS content matches', async () => {
    const user = userEvent.setup();
    verifyIPFSMock.mockResolvedValue(true);

    render(<PostCard post={mockPost} />);

    const verifyButton = screen.getByRole('button', { name: /Verify/i });
    await user.click(verifyButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Verified/i })).toBeInTheDocument();
    });
  });
});
