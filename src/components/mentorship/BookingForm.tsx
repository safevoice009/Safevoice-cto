import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { X, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import type { MentorProfile, DayOfWeek, TimeSlot, MenteeRequest } from '../../lib/mentorship';
import { useMentorshipStore, type BookingSession } from '../../lib/mentorshipStore';
import AvailabilitySchedulePicker from './AvailabilitySchedulePicker';

interface BookingFormProps {
  mentor: MentorProfile;
  mentee: MenteeRequest;
  onClose: () => void;
  onBookingComplete?: (booking: BookingSession) => void;
}

export default function BookingForm({ mentor, mentee, onClose, onBookingComplete }: BookingFormProps) {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'form' | 'success' | 'waitlist'>('form');

  const { addBooking, canBookWithMentor } = useMentorshipStore();
  const menteePastBookings = useMentorshipStore((state) =>
    state.bookings.filter((b) => b.menteeId === mentee.studentId)
  );

  const handleSelectTimeSlot = (day: DayOfWeek, slot: TimeSlot) => {
    setSelectedDay(day);
    setSelectedTimeSlot(slot);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDay || !selectedTimeSlot) {
      toast.error('Please select a date and time');
      return;
    }

    setIsSubmitting(true);

    try {
      const bookingId = crypto.randomUUID();
      const canBook = canBookWithMentor(mentor.id);

      const booking: BookingSession = {
        id: bookingId,
        menteeId: mentee.studentId,
        mentorId: mentor.id,
        requestId: mentee.id,
        dayOfWeek: selectedDay,
        timeSlot: selectedTimeSlot,
        mentorName: mentor.displayName || `Mentor ${mentor.id.slice(0, 8)}`,
        status: canBook ? 'confirmed' : 'waitlist',
        bookedAt: Date.now(),
        notes: notes || undefined,
      };

      addBooking(booking);

      setBookingStatus(canBook ? 'success' : 'waitlist');

      if (canBook) {
        toast.success('Session booked successfully! 🎉');
      } else {
        toast(() => (
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <div>
              <p className="font-medium">Added to waitlist</p>
              <p className="text-sm text-gray-600">You'll be notified if space opens up</p>
            </div>
          </div>
        ));
      }

      if (onBookingComplete) {
        setTimeout(() => onBookingComplete(booking), 1500);
      }
    } catch (error) {
      toast.error('Failed to book session. Please try again.');
      console.error('Booking error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (bookingStatus === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-lg border border-green-200 bg-green-50 p-6 text-center"
      >
        <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-600" />
        <h3 className="mb-2 text-xl font-bold text-green-900">Session Confirmed!</h3>
        <p className="mb-4 text-sm text-green-800">
          Your mentoring session with {mentor.displayName || 'your mentor'} has been confirmed.
        </p>
        <div className="mb-4 space-y-2 rounded-lg bg-white p-3 text-left">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Day:</span>
            <span className="font-medium text-gray-900">{selectedDay}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Time:</span>
            <span className="font-medium text-gray-900">{selectedTimeSlot}</span>
          </div>
          {notes && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Notes:</span>
              <span className="font-medium text-gray-900">{notes}</span>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-full rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 transition-colors"
        >
          Close
        </button>
      </motion.div>
    );
  }

  // Waitlist state
  if (bookingStatus === 'waitlist') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-center"
      >
        <Clock className="mx-auto mb-3 h-12 w-12 text-blue-600" />
        <h3 className="mb-2 text-xl font-bold text-blue-900">Added to Waitlist</h3>
        <p className="mb-4 text-sm text-blue-800">
          The mentor is at capacity. You've been added to the waitlist and will be notified if space opens up.
        </p>
        <div className="mb-4 space-y-2 rounded-lg bg-white p-3 text-left">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Day:</span>
            <span className="font-medium text-gray-900">{selectedDay}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Time:</span>
            <span className="font-medium text-gray-900">{selectedTimeSlot}</span>
          </div>
          {notes && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Notes:</span>
              <span className="font-medium text-gray-900">{notes}</span>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Close
        </button>
      </motion.div>
    );
  }

  // Form state
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-h-[90vh] space-y-4 overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between rounded-lg border-b border-gray-200 pb-4">
        <h2 className="text-lg font-bold text-gray-900">Book a Session</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mentor Info Summary */}
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">Booking with</p>
          <p className="font-bold text-gray-900">{mentor.displayName || `Mentor ${mentor.id.slice(0, 8)}`}</p>
          <p className="text-sm text-gray-600">{mentor.college}</p>
        </div>

        {/* Existing Bookings Info */}
        {menteePastBookings.length > 0 && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-xs font-medium text-blue-900">
              You have {menteePastBookings.length} existing booking{menteePastBookings.length > 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Availability Picker */}
        <AvailabilitySchedulePicker
          mentorAvailability={mentor.availability}
          onSelect={handleSelectTimeSlot}
          selectedDay={selectedDay || undefined}
          selectedTimeSlot={selectedTimeSlot || undefined}
        />

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any specific topics or questions you'd like to discuss?"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
            rows={3}
            maxLength={500}
          />
          <p className="mt-1 text-xs text-gray-500">{notes.length}/500</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !selectedDay || !selectedTimeSlot}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
