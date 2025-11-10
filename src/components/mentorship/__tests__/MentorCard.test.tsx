import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MentorCard from '../MentorCard';
import type { MentorProfile } from '../../../lib/mentorship';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

const mockMentor: MentorProfile = {
  id: 'mentor_001',
  studentId: 'student_001',
  displayName: 'Priya S.',
  college: 'IIT Delhi',
  topics: ['anxiety', 'academic_pressure', 'stress_management'],
  availability: {
    monday: ['evening', 'late_night'],
    wednesday: ['evening'],
    friday: ['afternoon', 'evening'],
  },
  karma: 500,
  streak: 5,
  totalSessions: 12,
  rating: 4.5,
  bio: 'Computer Science senior with experience in peer counseling.',
  createdAt: Date.now(),
  lastActiveAt: Date.now(),
  isActive: true,
  maxMentees: 5,
  currentMentees: ['mentee_001', 'mentee_002'],
};

describe('MentorCard', () => {
  it('renders mentor information correctly', () => {
    render(<MentorCard mentor={mockMentor} />);

    expect(screen.getByText('Priya S.')).toBeInTheDocument();
    expect(screen.getByText('IIT Delhi')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText(/Computer Science senior/)).toBeInTheDocument();
  });

  it('displays topics', () => {
    render(<MentorCard mentor={mockMentor} />);

    expect(screen.getByText('Anxiety')).toBeInTheDocument();
    expect(screen.getByText('Academic Pressure')).toBeInTheDocument();
    expect(screen.getByText('Stress Management')).toBeInTheDocument();
  });

  it('displays mentor stats correctly', () => {
    render(<MentorCard mentor={mockMentor} />);

    expect(screen.getByText('3 days')).toBeInTheDocument();
    expect(screen.getByText('2/5 mentees')).toBeInTheDocument();
    expect(screen.getByText('12 sessions')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const mockOnClick = vi.fn();
    render(<MentorCard mentor={mockMentor} onClick={mockOnClick} />);

    const card = screen.getByText('Priya S.').closest('div')?.parentElement;
    if (card) {
      fireEvent.click(card);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    }
  });

  it('shows remaining topics count when more than 3', () => {
    const mentorWithManyTopics: MentorProfile = {
      ...mockMentor,
      topics: ['anxiety', 'depression', 'stress_management', 'academic_pressure', 'relationships'],
    };

    render(<MentorCard mentor={mentorWithManyTopics} />);

    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('displays anonymous mentor when displayName is not provided', () => {
    const anonymousMentor: MentorProfile = {
      ...mockMentor,
      displayName: undefined,
    };

    render(<MentorCard mentor={anonymousMentor} />);

    expect(screen.getByText('Anonymous Mentor')).toBeInTheDocument();
  });

  it('formats topics with proper capitalization', () => {
    render(<MentorCard mentor={mockMentor} />);

    expect(screen.getByText('Academic Pressure')).toBeInTheDocument();
    expect(screen.getByText('Stress Management')).toBeInTheDocument();
  });
});
