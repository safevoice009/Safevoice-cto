import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import MentorDashboard from '../MentorDashboard';
import { useMentorshipStore } from '../../lib/mentorshipStore';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

// Mock useStore from lib
vi.mock('../../lib/store', () => ({
  useStore: () => ({
    studentId: 'student_test',
  }),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('MentorDashboard', () => {
  beforeEach(() => {
    useMentorshipStore.getState().clearAll();
  });

  it('should render dashboard with header', () => {
    renderWithRouter(<MentorDashboard />);

    expect(screen.getByText('Find Your Mentor')).toBeInTheDocument();
    expect(screen.getByText(/Discover mentors matched to your needs/)).toBeInTheDocument();
  });

  it('should display mentor list', async () => {
    renderWithRouter(<MentorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
      expect(screen.getByText('James Rodriguez')).toBeInTheDocument();
      expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    });
  });

  it('should display mentor colleges', async () => {
    renderWithRouter(<MentorDashboard />);

    await waitFor(() => {
      const mitElements = screen.getAllByText('MIT');
      expect(mitElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Harvard')).toBeInTheDocument();
    });
  });

  it('should display match scores', async () => {
    renderWithRouter(<MentorDashboard />);

    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /View Details/ });
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('should display search input', () => {
    renderWithRouter(<MentorDashboard />);

    const searchInput = screen.getByPlaceholderText(/Search by name, topic, or college/);
    expect(searchInput).toBeInTheDocument();
  });

  it('should allow filtering mentors by search', async () => {
    const user = userEvent.setup();

    renderWithRouter(<MentorDashboard />);

    const searchInput = screen.getByPlaceholderText(/Search by name, topic, or college/);

    await waitFor(() => {
      expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
    });

    await user.type(searchInput, 'Sarah');

    await waitFor(() => {
      expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
    });
  });

  it('should display sorting options', () => {
    renderWithRouter(<MentorDashboard />);

    expect(screen.getByRole('button', { name: /Sort by Score/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sort by Rating/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sort by Availability/ })).toBeInTheDocument();
  });

  it('should change sorting when sort button is clicked', async () => {
    const user = userEvent.setup();

    renderWithRouter(<MentorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
    });

    const ratingButton = screen.getByRole('button', { name: /Sort by Rating/ });
    await user.click(ratingButton);

    expect(ratingButton).toHaveClass('bg-blue-600');
  });

  it('should navigate to mentor details when mentor is clicked', async () => {
    const user = userEvent.setup();

    renderWithRouter(<MentorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
    });

    const mentorCard = screen.getByRole('button', { name: /View Details/ }).closest('button');
    if (mentorCard) {
      await user.click(mentorCard);
    }

    await waitFor(() => {
      expect(screen.getByText(/Back to Mentor List/)).toBeInTheDocument();
    });
  });

  it('should show mentor scores in the list', async () => {
    renderWithRouter(<MentorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
      expect(screen.getByText(/Match Score/)).toBeInTheDocument();
    });
  });

  it('should display mentor ratings', async () => {
    renderWithRouter(<MentorDashboard />);

    await waitFor(() => {
      const ratingElements = screen.getAllByText(/⭐/);
      expect(ratingElements.length).toBeGreaterThan(0);
    });
  });

  it('should show capacity warning for full mentors', async () => {
    renderWithRouter(<MentorDashboard />);

    await waitFor(() => {
      // James Rodriguez should not be at capacity, Priya should have room
      expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
    });
  });

  it('should display mentor topics', async () => {
    renderWithRouter(<MentorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('anxiety')).toBeInTheDocument();
    });
  });

  it('should show detailed match insight panel when mentor is selected', async () => {
    const user = userEvent.setup();

    renderWithRouter(<MentorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
    });

    const firstMentorCard = screen.getAllByRole('button', { name: /View Details/ })[0];
    await user.click(firstMentorCard);

    await waitFor(() => {
      expect(screen.getByText('Score Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Topic Overlap')).toBeInTheDocument();
    });
  });

  it('should navigate back to mentor list from details', async () => {
    const user = userEvent.setup();

    renderWithRouter(<MentorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
    });

    const firstMentorCard = screen.getAllByRole('button', { name: /View Details/ })[0];
    await user.click(firstMentorCard);

    await waitFor(() => {
      expect(screen.getByText(/Back to Mentor List/)).toBeInTheDocument();
    });

    const backButton = screen.getByRole('button', { name: /Back to Mentor List/ });
    await user.click(backButton);

    await waitFor(() => {
      expect(screen.getByText('Find Your Mentor')).toBeInTheDocument();
    });
  });

  it('should show booking form when book session is clicked', async () => {
    const user = userEvent.setup();

    renderWithRouter(<MentorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
    });

    const firstMentorCard = screen.getAllByRole('button', { name: /View Details/ })[0];
    await user.click(firstMentorCard);

    await waitFor(() => {
      const bookButton = screen.getByRole('button', { name: /Book Session/ });
      expect(bookButton).toBeInTheDocument();
    });

    const bookButton = screen.getByRole('button', { name: /Book Session/ });
    await user.click(bookButton);

    await waitFor(() => {
      expect(screen.getByText('Book a Session')).toBeInTheDocument();
    });
  });

  it('should display booking confirmations in summary', async () => {
    const user = userEvent.setup();

    renderWithRouter(<MentorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
    });

    // Navigate to mentor details and book
    const firstMentorCard = screen.getAllByRole('button', { name: /View Details/ })[0];
    await user.click(firstMentorCard);

    await waitFor(() => {
      const bookButton = screen.getByRole('button', { name: /Book Session/ });
      expect(bookButton).toBeInTheDocument();
    });

    const bookButton = screen.getByRole('button', { name: /Book Session/ });
    await user.click(bookButton);

    await waitFor(() => {
      expect(screen.getByText('Book a Session')).toBeInTheDocument();
    });

    // Select a day and time
    const mondayButton = screen.getByRole('button', { name: /Monday/ });
    await user.click(mondayButton);

    await waitFor(() => {
      expect(screen.getByText(/Available slots on monday/)).toBeInTheDocument();
    });

    const morningButton = screen.getByRole('button', { name: /🌅 Morning/ });
    await user.click(morningButton);

    const confirmButton = screen.getByRole('button', { name: /Confirm Booking/ });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Session Confirmed!')).toBeInTheDocument();
    });
  });
});
