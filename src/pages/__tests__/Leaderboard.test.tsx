import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LeaderboardPage from '../Leaderboard';
import type { Post, Comment } from '../../lib/store';

const useStoreMock = vi.fn();

vi.mock('../../lib/store', () => ({
  useStore: () => useStoreMock(),
}));

const defaultReactions = { heart: 0, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 } as const;

let idCounter = 0;
const BASE_TIME = new Date('2024-08-15T12:00:00Z').getTime();
const dayMs = 24 * 60 * 60 * 1000;

const createComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: overrides.id ?? `comment-${idCounter++}`,
  postId: overrides.postId ?? 'post-0',
  parentCommentId: overrides.parentCommentId ?? null,
  studentId: overrides.studentId ?? `Commenter#${idCounter}`,
  content: overrides.content ?? 'Comment content',
  reactions: overrides.reactions ?? { ...defaultReactions },
  replies: overrides.replies ?? [],
  createdAt: overrides.createdAt ?? BASE_TIME,
  isEdited: overrides.isEdited ?? false,
  editedAt: overrides.editedAt ?? null,
  helpfulVotes: overrides.helpfulVotes ?? 0,
  helpfulRewardAwarded: overrides.helpfulRewardAwarded ?? false,
  crisisSupportRewardAwarded: overrides.crisisSupportRewardAwarded ?? false,
  isVerifiedAdvice: overrides.isVerifiedAdvice ?? false,
  verifiedAdviceRewardAwarded: overrides.verifiedAdviceRewardAwarded ?? false,
});

const createPost = (overrides: Partial<Post> = {}): Post => {
  const comments = overrides.comments ?? [];
  return {
    id: overrides.id ?? `post-${idCounter++}`,
    studentId: overrides.studentId ?? `Student#${idCounter}`,
    content: overrides.content ?? 'Post content',
    category: overrides.category,
    reactions: overrides.reactions ?? { ...defaultReactions },
    commentCount: overrides.commentCount ?? comments.length,
    comments,
    createdAt: overrides.createdAt ?? BASE_TIME,
    isEdited: overrides.isEdited ?? false,
    editedAt: overrides.editedAt ?? null,
    isPinned: overrides.isPinned ?? false,
    reportCount: overrides.reportCount ?? 0,
    helpfulCount: overrides.helpfulCount ?? 0,
    expiresAt: overrides.expiresAt ?? null,
    lifetime: overrides.lifetime ?? '24h',
    isEncrypted: overrides.isEncrypted ?? false,
    encryptionMeta: overrides.encryptionMeta ?? null,
    isCrisisFlagged: overrides.isCrisisFlagged,
  };
};

const renderLeaderboard = () =>
  render(
    <BrowserRouter>
      <LeaderboardPage />
    </BrowserRouter>
  );

describe('LeaderboardPage component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
    useStoreMock.mockReset();
    idCounter = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders top ten leaderboard entries with ranks, badges, and current user rank', () => {
    const posts: Post[] = [];
    for (let i = 1; i <= 11; i++) {
      const postCount = Math.max(1, 12 - i);
      for (let j = 0; j < postCount; j++) {
        posts.push(
          createPost({
            id: `post-${i}-${j}`,
            studentId: `Student#${i}`,
            createdAt: BASE_TIME - (i * 1000 + j),
          })
        );
      }
    }

    useStoreMock.mockReturnValue({
      studentId: 'Student#3',
      posts,
    });

    renderLeaderboard();

    expect(screen.getByText('Community Leaderboards')).toBeInTheDocument();
    expect(screen.getAllByText('Points')).toHaveLength(10);
    expect(screen.queryByText('Student#11')).not.toBeInTheDocument();
    expect(screen.getAllByText('Active Voice').length).toBeGreaterThan(0);
    expect(screen.getAllByText('👑 Champion').length).toBeGreaterThan(0);
    expect(screen.getAllByText('🥈 Guardian').length).toBeGreaterThan(0);
    expect(screen.getAllByText('🥉 Hero').length).toBeGreaterThan(0);

    expect(screen.getByText('Your Rank')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getAllByText('Most Posts').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Weekly').length).toBeGreaterThan(0);
  });

  it('updates leaderboard when switching timeframes', () => {
    const posts: Post[] = [
      createPost({ id: 'weekly', studentId: 'WeeklyStar', createdAt: BASE_TIME - dayMs }),
      createPost({ id: 'monthly', studentId: 'MonthlyStar', createdAt: BASE_TIME - 10 * dayMs }),
      createPost({ id: 'all-time', studentId: 'LegacyStar', createdAt: BASE_TIME - 120 * dayMs }),
    ];

    useStoreMock.mockReturnValue({ studentId: 'ObserverUser', posts });

    renderLeaderboard();

    expect(screen.getAllByText('WeeklyStar').length).toBeGreaterThan(0);
    expect(screen.queryByText('MonthlyStar')).not.toBeInTheDocument();
    expect(screen.queryByText('LegacyStar')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Monthly' }));
    expect(screen.getByText('Activity over the past 30 days')).toBeInTheDocument();
    expect(screen.getByText('MonthlyStar')).toBeInTheDocument();
    expect(screen.queryByText('LegacyStar')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All-Time' }));
    expect(screen.getByText('All-time contributions')).toBeInTheDocument();
    expect(screen.getByText('LegacyStar')).toBeInTheDocument();
  });

  it('switches categories and displays relevant leaders', () => {
    const posts: Post[] = [
      createPost({ id: 'post-1', studentId: 'PosterOne', createdAt: BASE_TIME - dayMs }),
      createPost({ id: 'post-2', studentId: 'PosterOne', createdAt: BASE_TIME - 2 * dayMs }),
      createPost({
        id: 'post-3',
        studentId: 'PosterTwo',
        createdAt: BASE_TIME - dayMs,
        comments: [
          createComment({ id: 'comment-helper', postId: 'post-3', studentId: 'HelperHero', helpfulVotes: 7, createdAt: BASE_TIME - dayMs }),
          createComment({
            id: 'comment-engage',
            postId: 'post-3',
            studentId: 'EngageStar',
            helpfulVotes: 1,
            reactions: { heart: 10, fire: 5, clap: 2, sad: 0, angry: 0, laugh: 0 },
            createdAt: BASE_TIME - dayMs,
          }),
        ],
      }),
      createPost({
        id: 'post-4',
        studentId: 'CrisisPoster',
        createdAt: BASE_TIME - dayMs,
        isCrisisFlagged: true,
        comments: [createComment({ id: 'comment-support', postId: 'post-4', studentId: 'SupportChampion', createdAt: BASE_TIME - dayMs })],
      }),
    ];

    useStoreMock.mockReturnValue({ studentId: 'ObserverUser', posts });

    renderLeaderboard();

    expect(screen.getAllByText('PosterOne').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Most Helpful/ }));
    expect(screen.getByText('HelperHero')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Most Engaged/ }));
    expect(screen.getByText('EngageStar')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Most Supportive/ }));
    expect(screen.getByText('SupportChampion')).toBeInTheDocument();
  });

  it('displays personal rank information when user is outside the top ten', () => {
    const posts: Post[] = [];
    for (let i = 1; i <= 11; i++) {
      const postCount = Math.max(1, 12 - i);
      for (let j = 0; j < postCount; j++) {
        posts.push(
          createPost({
            id: `post-${i}-${j}`,
            studentId: `Student#${i}`,
            createdAt: BASE_TIME - (i * 2000 + j),
          })
        );
      }
    }
    posts.push(createPost({ id: 'self-post', studentId: 'Student#Self', createdAt: BASE_TIME - 500 }));

    useStoreMock.mockReturnValue({
      studentId: 'Student#Self',
      posts,
    });

    renderLeaderboard();

    expect(screen.getByText('Your Rank')).toBeInTheDocument();
    expect(screen.getByText('Student#Self')).toBeInTheDocument();
    expect(screen.getByText('#12')).toBeInTheDocument();
    expect(screen.queryByText(/You're in the top 10!/i)).not.toBeInTheDocument();
  });

  it('shows no activity card when user has no rank', () => {
    useStoreMock.mockReturnValue({
      studentId: 'Student#New',
      posts: [],
    });

    renderLeaderboard();

    expect(screen.getByText("You haven't started yet")).toBeInTheDocument();
  });
});
