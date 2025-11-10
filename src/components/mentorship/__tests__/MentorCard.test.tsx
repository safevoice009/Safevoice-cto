import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MentorCard from '../MentorCard';
import { useStore } from '../../../lib/store';
import type { MentorProfile } from '../../../lib/mentorship';
import { createMentorProfile } from '../../../lib/mentorship';

// Mock the store
vi.mock('../../../lib/store', () => ({
  useStore: vi.fn(),
}));

describe('MentorCard', () => {
  const mockMentor: MentorProfile = createMentorProfile(
    'student1',
    'MIT',
    ['anxiety', 'depression'],
    { monday: ['morning', 'afternoon'], friday: ['evening'] },
    'John Doe',
    'Experienced mentor in mental health support'
  );

  const mockGetReviewSummary = vi.fn(() => ({
    mentorId: mockMentor.id,
    averageRating: 4.5,
    totalReviews: 3,
    recentReviews: [
      {
        id: '1',
        matchId: 'match1',
        mentorId: mockMentor.id,
        menteeId: 'mentee1',
        rating: 5,
        feedback: 'Excellent mentor!',
        submittedAt: Date.now(),
      },
    ],
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as unknown as jest.Mock).mockImplementation(
      (selector: (state: Record<string, unknown>) => unknown) => {
        const state = {
          getMentorReviewSummary: mockGetReviewSummary,
        };
        if (selector) {
          return selector(state as Record<string, unknown>);
        }
        return state;
      }
    );
  });

  it('should render mentor name and college', () => {
    render(
      <MentorCard mentor={mockMentor} />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('MIT')).toBeInTheDocument();
  });

  it('should display mentor rating', () => {
    render(
      <MentorCard mentor={mockMentor} />
    );

    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('should display mentor bio', () => {
    render(
      <MentorCard mentor={mockMentor} />
    );

    expect(screen.getByText('Experienced mentor in mental health support')).toBeInTheDocument();
  });

  it('should display first 3 topics', () => {
    render(
      <MentorCard mentor={mockMentor} />
    );

    expect(screen.getByText('anxiety')).toBeInTheDocument();
    expect(screen.getByText('depression')).toBeInTheDocument();
  });

  it('should show +N more indicator when more than 3 topics', () => {
    const mentorWithManyTopics = createMentorProfile(
      'student1',
      'MIT',
      ['anxiety', 'depression', 'stress_management', 'academic_pressure', 'relationships'],
      { monday: ['morning'] }
    );

    render(
      <MentorCard mentor={mentorWithManyTopics} />
    );

    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('should display karma', () => {
    render(
      <MentorCard mentor={mockMentor} />
    );

    expect(screen.getByText(`Karma: ${mockMentor.karma}`)).toBeInTheDocument();
  });

  it('should display review count', () => {
    render(
      <MentorCard mentor={mockMentor} />
    );

    expect(screen.getByText('3 reviews')).toBeInTheDocument();
  });

  it('should display latest review', () => {
    render(
      <MentorCard mentor={mockMentor} />
    );

    expect(screen.getByText('"Excellent mentor!"')).toBeInTheDocument();
  });

  it('should show review button when match is completed', () => {
    render(
      <MentorCard
        mentor={mockMentor}
        matchId="match1"
        isMatchCompleted={true}
      />
    );

    expect(screen.getByRole('button', { name: 'Leave Review' })).toBeInTheDocument();
  });

  it('should not show review button when match is not completed', () => {
    render(
      <MentorCard
        mentor={mockMentor}
        matchId="match1"
        isMatchCompleted={false}
      />
    );

    expect(screen.queryByRole('button', { name: 'Leave Review' })).not.toBeInTheDocument();
  });

  it('should open review modal when button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MentorCard
        mentor={mockMentor}
        matchId="match1"
        isMatchCompleted={true}
      />
    );

    const reviewButton = screen.getByRole('button', { name: 'Leave Review' });
    await user.click(reviewButton);

    // Modal should be open with the mentor's name
    expect(screen.getByText(`Review ${mockMentor.displayName}`)).toBeInTheDocument();
  });

  it('should call onReviewClick callback when review button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnReviewClick = vi.fn();

    render(
      <MentorCard
        mentor={mockMentor}
        matchId="match1"
        isMatchCompleted={true}
        onReviewClick={mockOnReviewClick}
      />
    );

    const reviewButton = screen.getByRole('button', { name: 'Leave Review' });
    await user.click(reviewButton);

    expect(mockOnReviewClick).toHaveBeenCalled();
  });

  it('should handle mentor without bio gracefully', () => {
    const mentorNoBio = createMentorProfile(
      'student1',
      'MIT',
      ['anxiety'],
      { monday: ['morning'] }
    );

    const { container } = render(
      <MentorCard mentor={mentorNoBio} />
    );

    // Should not throw and render successfully - check for mentor name
    expect(screen.getByText('Mentor')).toBeInTheDocument();
    expect(container).toBeTruthy();
  });

  it('should handle mentor without recent reviews', () => {
    mockGetReviewSummary.mockReturnValue({
      mentorId: mockMentor.id,
      averageRating: 0,
      totalReviews: 0,
      recentReviews: [],
    });

    render(
      <MentorCard mentor={mockMentor} />
    );

    expect(screen.getByText('0 reviews')).toBeInTheDocument();
    expect(screen.queryByText(/^"/)).not.toBeInTheDocument(); // No quoted review text
  });

  it('should use defaultName when mentor has no display name', () => {
    const mentorNoName = createMentorProfile(
      'student1',
      'MIT',
      ['anxiety'],
      { monday: ['morning'] }
    );
    mentorNoName.displayName = undefined;

    render(
      <MentorCard mentor={mentorNoName} />
    );

    expect(screen.getByText('Mentor')).toBeInTheDocument();
  });

  it('should display star ratings correctly', () => {
    const { container } = render(
      <MentorCard mentor={mockMentor} />
    );

    // Check for star SVG elements
    const stars = container.querySelectorAll('svg[class*="lucide-star"]');
    // Should have star icons for rating display
    expect(stars.length).toBeGreaterThan(0);
  });

  it('should update review summary when review is submitted', () => {
    const { rerender } = render(
      <MentorCard mentor={mockMentor} />
    );

    // Update mock to return new review
    mockGetReviewSummary.mockReturnValue({
      mentorId: mockMentor.id,
      averageRating: 4.67,
      totalReviews: 4,
      recentReviews: [
        {
          id: '2',
          matchId: 'match2',
          mentorId: mockMentor.id,
          menteeId: 'mentee2',
          rating: 5,
          feedback: 'Outstanding!',
          submittedAt: Date.now(),
        },
      ],
    });

    rerender(
      <MentorCard mentor={mockMentor} />
    );

    expect(screen.getByText('4 reviews')).toBeInTheDocument();
    expect(screen.getByText('"Outstanding!"')).toBeInTheDocument();
  });
});
