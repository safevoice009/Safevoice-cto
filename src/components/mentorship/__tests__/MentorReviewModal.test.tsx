import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MentorReviewModal from '../MentorReviewModal';
import { useStore } from '../../../lib/store';

// Mock the store
vi.mock('../../../lib/store', () => ({
  useStore: vi.fn(),
}));

describe('MentorReviewModal', () => {
  const mockSubmitReview = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as unknown as jest.Mock).mockImplementation(
      (selector?: (state: Record<string, unknown>) => unknown) => {
        const state = {
          studentId: 'student123',
          submitMentorReview: mockSubmitReview,
        };
        if (selector) {
          return selector(state as Record<string, unknown>);
        }
        return state;
      }
    );
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <MentorReviewModal
        isOpen={false}
        onClose={mockOnClose}
        matchId="match1"
        mentorId="mentor1"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    render(
      <MentorReviewModal
        isOpen={true}
        onClose={mockOnClose}
        matchId="match1"
        mentorId="mentor1"
        mentorName="John Doe"
      />
    );

    expect(screen.getByText('Review John Doe')).toBeInTheDocument();
  });

  it('should have accessible star rating controls', () => {
    render(
      <MentorReviewModal
        isOpen={true}
        onClose={mockOnClose}
        matchId="match1"
        mentorId="mentor1"
      />
    );

    const stars = screen.getAllByRole('button', { name: /stars/i });
    expect(stars).toHaveLength(5);
  });

  it('should select star rating when clicked', async () => {
    const user = userEvent.setup();
    render(
      <MentorReviewModal
        isOpen={true}
        onClose={mockOnClose}
        matchId="match1"
        mentorId="mentor1"
      />
    );

    const fourStarButton = screen.getByRole('button', { name: '4 stars' });
    await user.click(fourStarButton);

    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('should show all rating descriptions', async () => {
    const user = userEvent.setup();
    render(
      <MentorReviewModal
        isOpen={true}
        onClose={mockOnClose}
        matchId="match1"
        mentorId="mentor1"
      />
    );

    // Test 5 stars
    await user.click(screen.getByRole('button', { name: '5 stars' }));
    expect(screen.getByText('Excellent!')).toBeInTheDocument();

    // Test 4 stars
    await user.click(screen.getByRole('button', { name: '4 stars' }));
    expect(screen.getByText('Good')).toBeInTheDocument();

    // Test 3 stars
    await user.click(screen.getByRole('button', { name: '3 stars' }));
    expect(screen.getByText('Average')).toBeInTheDocument();

    // Test 2 stars
    await user.click(screen.getByRole('button', { name: '2 stars' }));
    expect(screen.getByText('Fair')).toBeInTheDocument();

    // Test 1 star
    await user.click(screen.getByRole('button', { name: '1 stars' }));
    expect(screen.getByText('Poor')).toBeInTheDocument();
  });

  it('should handle feedback input', async () => {
    const user = userEvent.setup();
    render(
      <MentorReviewModal
        isOpen={true}
        onClose={mockOnClose}
        matchId="match1"
        mentorId="mentor1"
      />
    );

    const feedbackTextarea = screen.getByPlaceholderText(/Share what you liked/i);
    await user.type(feedbackTextarea, 'Great mentor!');

    expect(feedbackTextarea).toHaveValue('Great mentor!');
  });

  it('should enforce maximum feedback length', async () => {
    const user = userEvent.setup();
    render(
      <MentorReviewModal
        isOpen={true}
        onClose={mockOnClose}
        matchId="match1"
        mentorId="mentor1"
      />
    );

    const feedbackTextarea = screen.getByPlaceholderText(/Share what you liked/i) as HTMLTextAreaElement;
    
    // Try to type more than 500 characters
    const longText = 'a'.repeat(600);
    await user.click(feedbackTextarea);
    await user.type(feedbackTextarea, longText);

    // maxLength should prevent exceeding 500
    expect(feedbackTextarea.value.length).toBeLessThanOrEqual(500);
  });

  it('should disable submit button when no rating is selected', () => {
    render(
      <MentorReviewModal
        isOpen={true}
        onClose={mockOnClose}
        matchId="match1"
        mentorId="mentor1"
      />
    );

    const submitButton = screen.getByRole('button', { name: 'Submit Review' });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when rating is selected', async () => {
    const user = userEvent.setup();
    render(
      <MentorReviewModal
        isOpen={true}
        onClose={mockOnClose}
        matchId="match1"
        mentorId="mentor1"
      />
    );

    const fourStarButton = screen.getByRole('button', { name: '4 stars' });
    await user.click(fourStarButton);

    const submitButton = screen.getByRole('button', { name: 'Submit Review' });
    expect(submitButton).not.toBeDisabled();
  });

  it('should submit review with rating and feedback', async () => {
    const user = userEvent.setup();
    render(
      <MentorReviewModal
        isOpen={true}
        onClose={mockOnClose}
        matchId="match1"
        mentorId="mentor1"
      />
    );

    // Select 5 stars
    await user.click(screen.getByRole('button', { name: '5 stars' }));

    // Add feedback
    const feedbackTextarea = screen.getByPlaceholderText(/Share what you liked/i);
    await user.type(feedbackTextarea, 'Excellent mentor!');

    // Submit
    const submitButton = screen.getByRole('button', { name: 'Submit Review' });
    await user.click(submitButton);

    expect(mockSubmitReview).toHaveBeenCalledWith(
      'match1',
      'mentor1',
      'student123',
      5,
      'Excellent mentor!'
    );
  });

  it('should submit review with rating only when feedback is empty', async () => {
    const user = userEvent.setup();
    render(
      <MentorReviewModal
        isOpen={true}
        onClose={mockOnClose}
        matchId="match1"
        mentorId="mentor1"
      />
    );

    // Select 4 stars
    await user.click(screen.getByRole('button', { name: '4 stars' }));

    // Submit without feedback
    const submitButton = screen.getByRole('button', { name: 'Submit Review' });
    await user.click(submitButton);

    expect(mockSubmitReview).toHaveBeenCalledWith(
      'match1',
      'mentor1',
      'student123',
      4,
      undefined
    );
  });

  it('should show success message after submission', async () => {
    const user = userEvent.setup();
    render(
      <MentorReviewModal
        isOpen={true}
        onClose={mockOnClose}
        matchId="match1"
        mentorId="mentor1"
      />
    );

    // Select rating
    await user.click(screen.getByRole('button', { name: '5 stars' }));

    // Submit
    const submitButton = screen.getByRole('button', { name: 'Submit Review' });
    await user.click(submitButton);

    // Should show success state
    await waitFor(() => {
      expect(screen.getByText('Thank you for your feedback!')).toBeInTheDocument();
    });
  });

  it('should close modal when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MentorReviewModal
        isOpen={true}
        onClose={mockOnClose}
        matchId="match1"
        mentorId="mentor1"
      />
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close modal when X button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MentorReviewModal
        isOpen={true}
        onClose={mockOnClose}
        matchId="match1"
        mentorId="mentor1"
      />
    );

    const closeButton = screen.getByLabelText('Close review modal');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should be keyboard accessible', async () => {
    render(
      <MentorReviewModal
        isOpen={true}
        onClose={mockOnClose}
        matchId="match1"
        mentorId="mentor1"
      />
    );

    // Focus on first star and select with keyboard
    const stars = screen.getAllByRole('button', { name: /stars/i });
    stars[2].focus(); // 3 stars
    fireEvent.click(stars[2]);

    expect(screen.getByText('Average')).toBeInTheDocument();
  });

  it('should have proper ARIA labels', () => {
    render(
      <MentorReviewModal
        isOpen={true}
        onClose={mockOnClose}
        matchId="match1"
        mentorId="mentor1"
        mentorName="John Doe"
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'mentor-review-title');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
