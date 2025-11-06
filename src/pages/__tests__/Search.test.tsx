import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SearchPage from '../Search';
import type { Post, Comment } from '../../lib/store';
import type { SearchResult } from '../../lib/search/searchEngine';

const useStoreMock = vi.fn();
const searchMock = vi.fn();

vi.mock('../../lib/store', () => ({
  useStore: () => useStoreMock(),
}));

vi.mock('../../lib/search/searchEngine', () => ({
  search: (...args: unknown[]) => searchMock(...args),
}));

const defaultReactions: Post['reactions'] = {
  heart: 0,
  fire: 0,
  clap: 0,
  sad: 0,
  angry: 0,
  laugh: 0,
};

const createPost = (overrides: Partial<Post> = {}): Post => {
  const comments = overrides.comments ?? [];

  return {
    id: overrides.id ?? `post-${Math.random().toString(36).slice(2, 10)}`,
    studentId: overrides.studentId ?? 'student-123',
    content: overrides.content ?? 'Sample post content',
    category: overrides.category,
    reactions: overrides.reactions ?? { ...defaultReactions },
    commentCount: overrides.commentCount ?? comments.length,
    comments: comments as Comment[],
    createdAt: overrides.createdAt ?? Date.now(),
    isEdited: overrides.isEdited ?? false,
    editedAt: overrides.editedAt ?? null,
    isPinned: overrides.isPinned ?? false,
    reportCount: overrides.reportCount ?? 0,
    helpfulCount: overrides.helpfulCount ?? 0,
    expiresAt: overrides.expiresAt ?? null,
    lifetime: overrides.lifetime ?? 'never',
    isEncrypted: overrides.isEncrypted ?? false,
    encryptionMeta: overrides.encryptionMeta ?? null,
    imageUrl: overrides.imageUrl,
    warningShown: overrides.warningShown,
    reports: overrides.reports,
    contentBlurred: overrides.contentBlurred,
    blurReason: overrides.blurReason,
    moderationStatus: overrides.moderationStatus,
    hiddenReason: overrides.hiddenReason,
    moderationIssues: overrides.moderationIssues,
    needsReview: overrides.needsReview,
    isCrisisFlagged: overrides.isCrisisFlagged,
    crisisLevel: overrides.crisisLevel,
    supportOffered: overrides.supportOffered,
    flaggedAt: overrides.flaggedAt,
    flaggedForSupport: overrides.flaggedForSupport,
    pinnedAt: overrides.pinnedAt,
    isHighlighted: overrides.isHighlighted,
    highlightedAt: overrides.highlightedAt,
    highlightedUntil: overrides.highlightedUntil,
    extendedLifetimeHours: overrides.extendedLifetimeHours,
    crossCampusBoostedAt: overrides.crossCampusBoostedAt,
    crossCampusUntil: overrides.crossCampusUntil,
    crossCampusBoosts: overrides.crossCampusBoosts,
    isCommunityPinned: overrides.isCommunityPinned,
    communityPinnedAt: overrides.communityPinnedAt,
    communityPinnedBy: overrides.communityPinnedBy,
    communityId: overrides.communityId,
    channelId: overrides.channelId,
    visibility: overrides.visibility,
    isAnonymous: overrides.isAnonymous,
    archived: overrides.archived,
    archivedAt: overrides.archivedAt,
  };
};

const renderSearchPage = () =>
  render(
    <BrowserRouter>
      <SearchPage />
    </BrowserRouter>
  );

describe('SearchPage', () => {
  let storeState: { posts: Post[]; studentId: string; communities: { id: string; shortCode: string; name?: string }[] };

  beforeEach(() => {
    storeState = {
      posts: [],
      studentId: 'student-123',
      communities: [],
    };
    useStoreMock.mockImplementation(() => storeState);
    searchMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial state with instructions', () => {
    renderSearchPage();

    expect(screen.getByText('Start searching')).toBeInTheDocument();
    expect(screen.getByText('Enter keywords to search through posts and comments')).toBeInTheDocument();
  });

  it('performs search after debounce and displays results', async () => {
    const post = createPost({
      id: 'post-123',
      studentId: 'student-456',
      content: 'Anxiety support resources',
      category: 'mental-health',
      visibility: 'public',
    });

    const searchResults: SearchResult[] = [
      {
        id: 'post-post-123',
        type: 'post',
        post,
        score: 2.5,
        highlights: {
          content: 'Anxiety support resources',
          matches: [{ start: 0, end: 7 }],
        },
        metadata: {
          category: 'mental-health',
          securityLevel: 'public',
          communityId: null,
          isEncrypted: false,
          visibility: 'public',
        },
      },
    ];

    storeState.posts = [post];
    searchMock.mockResolvedValue(searchResults);

    renderSearchPage();

    const input = screen.getByRole('textbox', { name: 'Search query' });
    
    fireEvent.change(input, { target: { value: 'anxiety' } });

    await waitFor(() => {
      expect(searchMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('student-456')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Score: 2.50')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getAllByText((_content, element) => {
        return element?.textContent === 'Found 1 result';
      })[0]).toBeInTheDocument();
    });
  });

  it('shows encrypted placeholder for encrypted results', async () => {
    const encryptedPost = createPost({
      id: 'post-encrypted',
      studentId: 'student-789',
      isEncrypted: true,
    });

    const encryptedResult: SearchResult = {
      id: 'post-post-encrypted',
      type: 'post',
      post: encryptedPost,
      score: 1.2,
      highlights: {
        content: '[Encrypted content - decrypt to view]',
        matches: [],
      },
      metadata: {
        category: 'personal',
        securityLevel: 'encrypted',
        communityId: null,
        isEncrypted: true,
        visibility: 'public',
      },
    };

    storeState.posts = [encryptedPost];
    searchMock.mockResolvedValue([encryptedResult]);

    renderSearchPage();

    const input = screen.getByRole('textbox', { name: 'Search query' });
    
    fireEvent.change(input, { target: { value: 'secret' } });

    await waitFor(() => {
      expect(searchMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Encrypted content - view post to decrypt')).toBeInTheDocument();
    });
  });

  it('renders highlighted matches within results', async () => {
    const post = createPost({
      id: 'post-highlight',
      studentId: 'student-999',
    });

    const highlightedResult: SearchResult = {
      id: 'post-post-highlight',
      type: 'post',
      post,
      score: 3.1,
      highlights: {
        content: 'Anxiety support community',
        matches: [{ start: 0, end: 7 }],
      },
      metadata: {
        category: 'community',
        securityLevel: 'public',
        communityId: null,
        isEncrypted: false,
        visibility: 'public',
      },
    };

    storeState.posts = [post];
    searchMock.mockResolvedValue([highlightedResult]);

    renderSearchPage();

    const input = screen.getByRole('textbox', { name: 'Search query' });
    
    fireEvent.change(input, { target: { value: 'anxiety' } });

    await waitFor(() => {
      expect(searchMock).toHaveBeenCalled();
    });

    const highlightMark = await screen.findByText('Anxiety', { selector: 'mark' });
    expect(highlightMark).toBeInTheDocument();
  });
});
