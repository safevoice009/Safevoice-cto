import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMentorProfile, createMenteeRequest } from '../../../lib/mentorship';
import { useMentorshipStore } from '../../../lib/mentorshipStore';
import BookingForm from '../BookingForm';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    promise: vi.fn(),
    default: vi.fn(() => () => null),
  },
}));

describe('BookingForm', () => {
  const mentor = createMentorProfile(
    'student1',
    'MIT',
    ['anxiety', 'academic_pressure'],
    {
      monday: ['morning', 'afternoon'],
      wednesday: ['evening'],
      friday: ['morning'],
    }
  );
  mentor.displayName = 'Sarah Chen';
  mentor.maxMentees = 5;
  mentor.currentMentees = [];

  const mentee = createMenteeRequest(
    'mentee1',
    'MIT',
    ['anxiety'],
    {
      monday: ['morning', 'afternoon'],
      wednesday: ['evening'],
    }
  );

  beforeEach(() => {
    useMentorshipStore.getState().clearAll();
    useMentorshipStore.getState().addOrUpdateMentor(mentor);
  });

  it('should render booking form with header', () => {
    const onClose = vi.fn();

    render(<BookingForm mentor={mentor} mentee={mentee} onClose={onClose} />);

    expect(screen.getByText('Book a Session')).toBeInTheDocument();
    expect(screen.getByText('Booking with')).toBeInTheDocument();
    expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
  });

  it('should display availability schedule picker', () => {
    const onClose = vi.fn();

    render(<BookingForm mentor={mentor} mentee={mentee} onClose={onClose} />);

    expect(screen.getByText('Select Available Time Slot')).toBeInTheDocument();
    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('Wednesday')).toBeInTheDocument();
    expect(screen.getByText('Friday')).toBeInTheDocument();
  });

  it('should allow selection of time slots', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<BookingForm mentor={mentor} mentee={mentee} onClose={onClose} />);

    const mondayButton = screen.getByRole('button', { name: /Monday/ });
    await user.click(mondayButton);

    await waitFor(() => {
      expect(screen.getByText('Available slots on monday')).toBeInTheDocument();
    });
  });

  it('should display notes textarea', () => {
    const onClose = vi.fn();

    render(<BookingForm mentor={mentor} mentee={mentee} onClose={onClose} />);

    const notesInput = screen.getByPlaceholderText(/Any specific topics/);
    expect(notesInput).toBeInTheDocument();
  });

  it('should track character count for notes', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<BookingForm mentor={mentor} mentee={mentee} onClose={onClose} />);

    const notesInput = screen.getByPlaceholderText(/Any specific topics/);
    await user.type(notesInput, 'Test notes');

    expect(screen.getByText('10/500')).toBeInTheDocument();
  });

  it('should disable confirm button when no time slot is selected', () => {
    const onClose = vi.fn();

    render(<BookingForm mentor={mentor} mentee={mentee} onClose={onClose} />);

    const confirmButton = screen.getByRole('button', { name: /Confirm Booking/ });
    expect(confirmButton).toBeDisabled();
  });

  it('should enable confirm button when time slot is selected', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<BookingForm mentor={mentor} mentee={mentee} onClose={onClose} />);

    const mondayButton = screen.getByRole('button', { name: /Monday/ });
    await user.click(mondayButton);

    await waitFor(() => {
      expect(screen.getByText('Available slots on monday')).toBeInTheDocument();
    });

    const morningButton = screen.getByRole('button', { name: /🌅 Morning/ });
    await user.click(morningButton);

    const confirmButton = screen.getByRole('button', { name: /Confirm Booking/ });
    expect(confirmButton).not.toBeDisabled();
  });

  it('should call onClose when cancel button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<BookingForm mentor={mentor} mentee={mentee} onClose={onClose} />);

    const cancelButton = screen.getByRole('button', { name: /Cancel/ });
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when X button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<BookingForm mentor={mentor} mentee={mentee} onClose={onClose} />);

    const closeButton = screen.getByLabelText('Close');
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should add booking to store on successful submission', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<BookingForm mentor={mentor} mentee={mentee} onClose={onClose} />);

    const mondayButton = screen.getByRole('button', { name: /Monday/ });
    await user.click(mondayButton);

    await waitFor(() => {
      expect(screen.getByText('Available slots on monday')).toBeInTheDocument();
    });

    const morningButton = screen.getByRole('button', { name: /🌅 Morning/ });
    await user.click(morningButton);

    const confirmButton = screen.getByRole('button', { name: /Confirm Booking/ });
    await user.click(confirmButton);

    await waitFor(() => {
      const bookings = useMentorshipStore.getState().getBookingsForMentee(mentee.studentId);
      expect(bookings.length).toBeGreaterThan(0);
    });
  });

  it('should decrement mentor capacity on successful booking', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    const initialCapacity = useMentorshipStore.getState().getMentorCapacity(mentor.id);

    render(<BookingForm mentor={mentor} mentee={mentee} onClose={onClose} />);

    const mondayButton = screen.getByRole('button', { name: /Monday/ });
    await user.click(mondayButton);

    await waitFor(() => {
      expect(screen.getByText('Available slots on monday')).toBeInTheDocument();
    });

    const morningButton = screen.getByRole('button', { name: /🌅 Morning/ });
    await user.click(morningButton);

    const confirmButton = screen.getByRole('button', { name: /Confirm Booking/ });
    await user.click(confirmButton);

    await waitFor(() => {
      const newCapacity = useMentorshipStore.getState().getMentorCapacity(mentor.id);
      expect(newCapacity).toBeLessThan(initialCapacity);
    });
  });

  it('should show success message when booking is confirmed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<BookingForm mentor={mentor} mentee={mentee} onClose={onClose} />);

    const mondayButton = screen.getByRole('button', { name: /Monday/ });
    await user.click(mondayButton);

    await waitFor(() => {
      expect(screen.getByText('Available slots on monday')).toBeInTheDocument();
    });

    const morningButton = screen.getByRole('button', { name: /🌅 Morning/ });
    await user.click(morningButton);

    const confirmButton = screen.getByRole('button', { name: /Confirm Booking/ });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Session Confirmed!')).toBeInTheDocument();
    });
  });

  it('should show waitlist message when mentor is at capacity', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    // Set mentor to capacity
    mentor.maxMentees = 1;
    mentor.currentMentees = ['existing_mentee'];

    render(<BookingForm mentor={mentor} mentee={mentee} onClose={onClose} />);

    const mondayButton = screen.getByRole('button', { name: /Monday/ });
    await user.click(mondayButton);

    await waitFor(() => {
      expect(screen.getByText('Available slots on monday')).toBeInTheDocument();
    });

    const morningButton = screen.getByRole('button', { name: /🌅 Morning/ });
    await user.click(morningButton);

    const confirmButton = screen.getByRole('button', { name: /Confirm Booking/ });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Added to Waitlist')).toBeInTheDocument();
    });
  });

  it('should include notes in the booking', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<BookingForm mentor={mentor} mentee={mentee} onClose={onClose} />);

    const notesInput = screen.getByPlaceholderText(/Any specific topics/);
    await user.type(notesInput, 'Want to discuss exam anxiety');

    const mondayButton = screen.getByRole('button', { name: /Monday/ });
    await user.click(mondayButton);

    await waitFor(() => {
      expect(screen.getByText('Available slots on monday')).toBeInTheDocument();
    });

    const morningButton = screen.getByRole('button', { name: /🌅 Morning/ });
    await user.click(morningButton);

    const confirmButton = screen.getByRole('button', { name: /Confirm Booking/ });
    await user.click(confirmButton);

    await waitFor(() => {
      const bookings = useMentorshipStore.getState().getBookingsForMentee(mentee.studentId);
      expect(bookings[0].notes).toBe('Want to discuss exam anxiety');
    });
  });

  it('should call onBookingComplete callback when booking is successful', async () => {
    const onClose = vi.fn();
    const onBookingComplete = vi.fn();
    const user = userEvent.setup();

    render(
      <BookingForm
        mentor={mentor}
        mentee={mentee}
        onClose={onClose}
        onBookingComplete={onBookingComplete}
      />
    );

    const mondayButton = screen.getByRole('button', { name: /Monday/ });
    await user.click(mondayButton);

    await waitFor(() => {
      expect(screen.getByText('Available slots on monday')).toBeInTheDocument();
    });

    const morningButton = screen.getByRole('button', { name: /🌅 Morning/ });
    await user.click(morningButton);

    const confirmButton = screen.getByRole('button', { name: /Confirm Booking/ });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(onBookingComplete).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});
