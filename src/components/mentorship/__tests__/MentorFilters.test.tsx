import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MentorFilters from '../MentorFilters';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('MentorFilters', () => {
  it('renders all filter sections', () => {
    const mockOnFilterChange = vi.fn();
    render(<MentorFilters onFilterChange={mockOnFilterChange} />);

    expect(screen.getByText('Filter Mentors')).toBeInTheDocument();
    expect(screen.getByLabelText('Search mentors by college')).toBeInTheDocument();
    expect(screen.getByLabelText(/Minimum rating filter/i)).toBeInTheDocument();
  });

  it('calls onFilterChange when college search changes', () => {
    const mockOnFilterChange = vi.fn();
    render(<MentorFilters onFilterChange={mockOnFilterChange} />);

    const collegeInput = screen.getByLabelText('Search mentors by college');
    fireEvent.change(collegeInput, { target: { value: 'IIT' } });

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      topics: [],
      college: 'IIT',
      minRating: 0,
      availability: [],
    });
  });

  it('calls onFilterChange when rating changes', () => {
    const mockOnFilterChange = vi.fn();
    render(<MentorFilters onFilterChange={mockOnFilterChange} />);

    const ratingSlider = screen.getByLabelText(/Minimum rating filter/i);
    fireEvent.change(ratingSlider, { target: { value: '4' } });

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      topics: [],
      college: '',
      minRating: 4,
      availability: [],
    });
  });

  it('calls onFilterChange when a topic is selected', () => {
    const mockOnFilterChange = vi.fn();
    render(<MentorFilters onFilterChange={mockOnFilterChange} />);

    const anxietyButton = screen.getByRole('button', { name: /Filter by Anxiety/i });
    fireEvent.click(anxietyButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      topics: ['anxiety'],
      college: '',
      minRating: 0,
      availability: [],
    });
  });

  it('calls onFilterChange when a day is selected', () => {
    const mockOnFilterChange = vi.fn();
    render(<MentorFilters onFilterChange={mockOnFilterChange} />);

    const mondayButton = screen.getByRole('button', { name: /Filter by Monday/i });
    fireEvent.click(mondayButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      topics: [],
      college: '',
      minRating: 0,
      availability: ['monday'],
    });
  });

  it('clears all filters when Clear all is clicked', () => {
    const mockOnFilterChange = vi.fn();
    render(<MentorFilters onFilterChange={mockOnFilterChange} />);

    const anxietyButton = screen.getByRole('button', { name: /Filter by Anxiety/i });
    fireEvent.click(anxietyButton);

    const clearButton = screen.getByRole('button', { name: 'Clear all filters' });
    fireEvent.click(clearButton);

    expect(mockOnFilterChange).toHaveBeenLastCalledWith({
      topics: [],
      college: '',
      minRating: 0,
      availability: [],
    });
  });

  it('shows active filter count', () => {
    const mockOnFilterChange = vi.fn();
    render(<MentorFilters onFilterChange={mockOnFilterChange} />);

    const anxietyButton = screen.getByRole('button', { name: /Filter by Anxiety/i });
    fireEvent.click(anxietyButton);

    const collegeInput = screen.getByLabelText('Search mentors by college');
    fireEvent.change(collegeInput, { target: { value: 'IIT' } });

    expect(screen.getByText('2 active')).toBeInTheDocument();
  });

  it('toggles topic selection', () => {
    const mockOnFilterChange = vi.fn();
    render(<MentorFilters onFilterChange={mockOnFilterChange} />);

    const anxietyButton = screen.getByRole('button', { name: /Filter by Anxiety/i });
    
    fireEvent.click(anxietyButton);
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ topics: ['anxiety'] })
    );

    fireEvent.click(anxietyButton);
    expect(mockOnFilterChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ topics: [] })
    );
  });
});
