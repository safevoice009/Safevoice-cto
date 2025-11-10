import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import MentorDashboardPage from '../MentorDashboardPage';
import { useStore } from '../../lib/store';
import type { MentorProfile, MentorshipTopic } from '../../lib/mentorship';

vi.mock('../../lib/store', () => ({
  useStore: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockMentors: MentorProfile[] = [
  {
    id: 'mentor_001',
    studentId: 'student_001',
    displayName: 'Priya S.',
    college: 'IIT Delhi',
    topics: ['anxiety', 'academic_pressure'],
    availability: { monday: ['evening'] },
    karma: 500,
    streak: 5,
    totalSessions: 12,
    rating: 4.5,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    isActive: true,
    maxMentees: 5,
    currentMentees: [],
  },
  {
    id: 'mentor_002',
    studentId: 'student_002',
    displayName: 'Rahul M.',
    college: 'IIT Bombay',
    topics: ['depression', 'loneliness'],
    availability: { tuesday: ['morning'] },
    karma: 300,
    streak: 3,
    totalSessions: 8,
    rating: 4.2,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    isActive: true,
    maxMentees: 5,
    currentMentees: [],
  },
];

describe('MentorDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
      const state = {
        mentorProfiles: mockMentors,
        getFilteredMentors: (filters: {
          topics?: MentorshipTopic[];
          college?: string;
          minRating?: number;
          availability?: string[];
        }) => {
          return mockMentors.filter((mentor) => {
            if (filters.topics && filters.topics.length > 0) {
              const hasTopicMatch = filters.topics.some((topic) => mentor.topics.includes(topic));
              if (!hasTopicMatch) return false;
            }
            if (filters.college) {
              const collegeMatch = mentor.college.toLowerCase().includes(filters.college.toLowerCase());
              if (!collegeMatch) return false;
            }
            if (filters.minRating !== undefined && mentor.rating < filters.minRating) {
              return false;
            }
            return true;
          });
        },
        loadMentorshipData: vi.fn(),
      };
      
      return selector(state);
    });
  });

  it('renders the mentor dashboard page', () => {
    render(
      <BrowserRouter>
        <MentorDashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Mentor Discovery')).toBeInTheDocument();
    expect(screen.getByText(/Connect with peer mentors/)).toBeInTheDocument();
  });

  it('displays mentor cards', () => {
    render(
      <BrowserRouter>
        <MentorDashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Priya S.')).toBeInTheDocument();
    expect(screen.getByText('Rahul M.')).toBeInTheDocument();
  });

  it('displays mentor stats', () => {
    render(
      <BrowserRouter>
        <MentorDashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Available Mentors')).toBeInTheDocument();
    expect(screen.getByText('Average Rating')).toBeInTheDocument();
    expect(screen.getByText('Total Sessions')).toBeInTheDocument();
  });

  it('filters mentors by college', async () => {
    render(
      <BrowserRouter>
        <MentorDashboardPage />
      </BrowserRouter>
    );

    const collegeInput = screen.getByLabelText('Search mentors by college');
    fireEvent.change(collegeInput, { target: { value: 'IIT Delhi' } });

    await waitFor(() => {
      expect(screen.getByText('Priya S.')).toBeInTheDocument();
      expect(screen.queryByText('Rahul M.')).not.toBeInTheDocument();
    });
  });

  it('filters mentors by topic', async () => {
    render(
      <BrowserRouter>
        <MentorDashboardPage />
      </BrowserRouter>
    );

    const anxietyButton = screen.getByRole('button', { name: /Filter by Anxiety/i });
    fireEvent.click(anxietyButton);

    await waitFor(() => {
      expect(screen.getByText('Priya S.')).toBeInTheDocument();
      expect(screen.queryByText('Rahul M.')).not.toBeInTheDocument();
    });
  });

  it('shows no mentors message when filters match nothing', async () => {
    render(
      <BrowserRouter>
        <MentorDashboardPage />
      </BrowserRouter>
    );

    const collegeInput = screen.getByLabelText('Search mentors by college');
    fireEvent.change(collegeInput, { target: { value: 'NonexistentCollege' } });

    await waitFor(() => {
      expect(screen.getByText('No mentors found')).toBeInTheDocument();
      expect(screen.getByText(/Try adjusting your filters/)).toBeInTheDocument();
    });
  });

  it('calls loadMentorshipData on mount', () => {
    const mockLoadMentorshipData = vi.fn();
    
    (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
      const state = {
        mentorProfiles: mockMentors,
        getFilteredMentors: vi.fn(() => mockMentors),
        loadMentorshipData: mockLoadMentorshipData,
      };
      
      return selector(state);
    });

    render(
      <BrowserRouter>
        <MentorDashboardPage />
      </BrowserRouter>
    );

    expect(mockLoadMentorshipData).toHaveBeenCalledTimes(1);
  });

  it('displays mentor count correctly', () => {
    render(
      <BrowserRouter>
        <MentorDashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/All Mentors.*\(2\)/)).toBeInTheDocument();
  });

  it('updates mentor count when filters are applied', async () => {
    render(
      <BrowserRouter>
        <MentorDashboardPage />
      </BrowserRouter>
    );

    const anxietyButton = screen.getByRole('button', { name: /Filter by Anxiety/i });
    fireEvent.click(anxietyButton);

    await waitFor(() => {
      expect(screen.getByText(/Filtered Mentors.*\(1\)/)).toBeInTheDocument();
    });
  });
});
