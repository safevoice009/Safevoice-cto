import { beforeEach } from 'vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LeaderboardPage from '../Leaderboard';
import type { Post } from '../../lib/store';

// Mock useStore
const mockUseStore = vi.fn();
vi.mock('../../lib/store', () => ({
  useStore: () => mockUseStore(),
}));

const createMockPost = (overrides: Partial<Post> = {}): Post => ({
  id: `post-${Math.random()}`,
  studentId: 'Student#1000',
  content: 'Test post',
  category: 'general',
  reactions: { heart: 0, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
  commentCount: 0,
  comments: [],
  createdAt: Date.now(),
  isEdited: false,
  editedAt: null,
  isPinned: false,
  reportCount: 0,
  helpfulCount: 0,
  expiresAt: null,
  lifetime: '24h',
  isEncrypted: false,
  encryptionMeta: null,
  ...overrides,
});

describe('Leaderboard Page', () => {
  const mockStoreDefaults = {
    studentId: 'Student#1000',
    posts: [],
  };

  beforeEach(() => {
    mockUseStore.mockReturnValue(mockStoreDefaults);
  });

  it('should render leaderboard page with title', () => {
    render(
      <BrowserRouter>
        <LeaderboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Community Leaderboards')).toBeInTheDocument();
  });

  it('should render all timeframe tabs', () => {
    render(
      <BrowserRouter>
        <LeaderboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('All-Time')).toBeInTheDocument();
  });

  it('should render all category tabs', () => {
    render(
      <BrowserRouter>
        <LeaderboardPage />
      </BrowserRouter>
    );

    expect(screen.getAllByRole('button', { name: /Most Posts/ })).not.toHaveLength(0);
    expect(screen.getAllByRole('button', { name: /Most Helpful/ })).not.toHaveLength(0);
    expect(screen.getAllByRole('button', { name: /Most Engaged/ })).not.toHaveLength(0);
    expect(screen.getAllByRole('button', { name: /Most Supportive/ })).not.toHaveLength(0);
  });

  it('should switch between timeframes when clicked', () => {
    render(
      <BrowserRouter>
        <LeaderboardPage />
      </BrowserRouter>
    );

    const weeklyButton = screen.getByText('Weekly');
    const monthlyButton = screen.getByText('Monthly');

    expect(weeklyButton).toHaveClass('bg-primary');

    fireEvent.click(monthlyButton);

    expect(monthlyButton).toHaveClass('bg-primary');
  });

  it('should switch between categories when clicked', () => {
    render(
      <BrowserRouter>
        <LeaderboardPage />
      </BrowserRouter>
    );

    const helpfulButtons = screen.getAllByRole('button', { name: /Most Helpful/ });
    
    fireEvent.click(helpfulButtons[0]);

    // Category should be reflected in the section header
    const headers = screen.getAllByText('Most Helpful');
    expect(headers.length).toBeGreaterThan(1); // Button and header
  });

  it('should display empty state when no data available', () => {
    mockUseStore.mockReturnValue({
      studentId: 'Student#1000',
      posts: [],
    });

    render(
      <BrowserRouter>
        <LeaderboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Not enough activity yet')).toBeInTheDocument();
  });

  it('should display leaderboard entries when data is available', () => {
    const posts: Post[] = [
      createMockPost({ studentId: 'Student#1001' }),
      createMockPost({ studentId: 'Student#1001' }),
      createMockPost({ studentId: 'Student#1002' }),
    ];

    mockUseStore.mockReturnValue({
      studentId: 'Student#1000',
      posts,
    });

    render(
      <BrowserRouter>
        <LeaderboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Student#1001')).toBeInTheDocument();
    expect(screen.getByText('Student#1002')).toBeInTheDocument();
  });

  it('should display rank badges for top 3', () => {
    const posts: Post[] = [
      createMockPost({ studentId: 'Student#1001' }),
      createMockPost({ studentId: 'Student#1001' }),
      createMockPost({ studentId: 'Student#1001' }),
      createMockPost({ studentId: 'Student#1002' }),
      createMockPost({ studentId: 'Student#1002' }),
      createMockPost({ studentId: 'Student#1003' }),
    ];

    mockUseStore.mockReturnValue({
      studentId: 'Student#1000',
      posts,
    });

    render(
      <BrowserRouter>
        <LeaderboardPage />
      </BrowserRouter>
    );

    // Check that rank numbers are displayed
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });

  it('should display rank titles', () => {
    const posts: Post[] = [
      createMockPost({ studentId: 'Student#1001' }),
      createMockPost({ studentId: 'Student#1002' }),
    ];

    mockUseStore.mockReturnValue({
      studentId: 'Student#1000',
      posts,
    });

    render(
      <BrowserRouter>
        <LeaderboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText('👑 Champion')).toBeInTheDocument();
    expect(screen.getByText('🥈 Guardian')).toBeInTheDocument();
  });

  it('shows "Your Rank" card with top 10 badge when user is in top 10', () => {
    const posts: Post[] = [
      createMockPost({ studentId: 'Student#1000' }),
      createMockPost({ studentId: 'Student#1001' }),
    ];

    mockUseStore.mockReturnValue({
      studentId: 'Student#1000',
      posts,
    });

    render(
      <BrowserRouter>
        <LeaderboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Your Rank')).toBeInTheDocument();
    expect(screen.getByText(/you're in the top 10/i)).toBeInTheDocument();
  });

  it('should display "Your Rank" card when user is outside top 10', () => {
    // Create 12 users with different post counts
    const posts: Post[] = [];
    for (let i = 1; i <= 11; i++) {
      for (let j = 0; j < 12 - i; j++) {
        posts.push(createMockPost({ studentId: `Student#${2000 + i}` }));
      }
    }
    // Add one post for current user (will be ranked lower)
    posts.push(createMockPost({ studentId: 'Student#1000' }));

    mockUseStore.mockReturnValue({
      studentId: 'Student#1000',
      posts,
    });

    render(
      <BrowserRouter>
        <LeaderboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Your Rank')).toBeInTheDocument();
  });

  it('should display scores correctly', () => {
    const posts: Post[] = [
      createMockPost({ studentId: 'Student#1001' }),
      createMockPost({ studentId: 'Student#1001' }),
      createMockPost({ studentId: 'Student#1001' }),
    ];

    mockUseStore.mockReturnValue({
      studentId: 'Student#1000',
      posts,
    });

    render(
      <BrowserRouter>
        <LeaderboardPage />
      </BrowserRouter>
    );

    // Should show 3 posts
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should update when switching to helpful category', () => {
    const comment1 = {
      id: 'comment-1',
      postId: 'post-1',
      parentCommentId: null,
      studentId: 'Student#1001',
      content: 'Helpful comment',
      reactions: { heart: 0, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
      replies: [],
      createdAt: Date.now(),
      isEdited: false,
      editedAt: null,
      helpfulVotes: 10,
      helpfulRewardAwarded: false,
      crisisSupportRewardAwarded: false,
      isVerifiedAdvice: false,
      verifiedAdviceRewardAwarded: false,
    };

    const posts: Post[] = [
      createMockPost({
        studentId: 'Student#1000',
        comments: [comment1],
        commentCount: 1,
      }),
    ];

    mockUseStore.mockReturnValue({
      studentId: 'Student#1000',
      posts,
    });

    render(
      <BrowserRouter>
        <LeaderboardPage />
      </BrowserRouter>
    );

    const helpfulButton = screen.getByText('Most Helpful');
    fireEvent.click(helpfulButton);

    // Should show user with helpful votes
    expect(screen.getByText('Student#1001')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });
});
