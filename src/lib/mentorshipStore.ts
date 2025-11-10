import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MentorProfile, MenteeRequest, MentorMatch, MatchExplanation } from './mentorship';

export interface BookingSession {
  id: string;
  menteeId: string;
  mentorId: string;
  requestId: string;
  dayOfWeek: string;
  timeSlot: string;
  mentorName: string;
  status: 'pending' | 'confirmed' | 'waitlist' | 'cancelled';
  bookedAt: number;
  scheduledFor?: number; // Timestamp for the session
  notes?: string;
}

export interface MentorshipStoreState {
  bookings: BookingSession[];
  mentors: Record<string, MentorProfile>; // mentorId -> MentorProfile
  menteeRequests: Record<string, MenteeRequest>; // requestId -> MenteeRequest
  matches: Record<string, MentorMatch>; // matchId -> MentorMatch
  selectedMatchId: string | null;
  selectedExplanation: MatchExplanation | null;
  isHydrated: boolean;

  // Mentor management
  addOrUpdateMentor: (mentor: MentorProfile) => void;
  getMentor: (mentorId: string) => MentorProfile | undefined;
  decrementMentorCapacity: (mentorId: string, menteeId: string) => void;
  incrementMentorCapacity: (mentorId: string, menteeId: string) => void;
  getMentorCapacity: (mentorId: string) => number;

  // Mentee request management
  addMenteeRequest: (request: MenteeRequest) => void;
  getMenteeRequest: (requestId: string) => MenteeRequest | undefined;
  updateMenteeRequestStatus: (requestId: string, status: 'pending' | 'matched' | 'expired') => void;

  // Match management
  createMatch: (match: MentorMatch, explanation: MatchExplanation) => void;
  getMatch: (matchId: string) => MentorMatch | undefined;
  setSelectedMatch: (matchId: string | null, explanation: MatchExplanation | null) => void;

  // Booking management
  addBooking: (booking: BookingSession) => void;
  getBookingsForMentee: (menteeId: string) => BookingSession[];
  getBookingsForMentor: (mentorId: string) => BookingSession[];
  updateBookingStatus: (bookingId: string, status: BookingSession['status']) => void;
  cancelBooking: (bookingId: string) => void;

  // Capacity checks
  canBookWithMentor: (mentorId: string) => boolean;

  // Utility
  hydrate: () => void;
  clearAll: () => void;
}

const STORAGE_KEY = 'safevoice:mentorship';

export const useMentorshipStore = create<MentorshipStoreState>()(
  persist(
    (set, get) => ({
      bookings: [],
      mentors: {},
      menteeRequests: {},
      matches: {},
      selectedMatchId: null,
      selectedExplanation: null,
      isHydrated: false,

      addOrUpdateMentor: (mentor: MentorProfile) => {
        set((state) => ({
          mentors: {
            ...state.mentors,
            [mentor.id]: mentor,
          },
        }));
      },

      getMentor: (mentorId: string) => {
        return get().mentors[mentorId];
      },

      decrementMentorCapacity: (mentorId: string, menteeId: string) => {
        const mentor = get().mentors[mentorId];
        if (mentor) {
          const updatedMentees = [...mentor.currentMentees];
          if (!updatedMentees.includes(menteeId)) {
            updatedMentees.push(menteeId);
          }
          set((state) => ({
            mentors: {
              ...state.mentors,
              [mentorId]: {
                ...mentor,
                currentMentees: updatedMentees,
              },
            },
          }));
        }
      },

      incrementMentorCapacity: (mentorId: string, menteeId: string) => {
        const mentor = get().mentors[mentorId];
        if (mentor) {
          const updatedMentees = mentor.currentMentees.filter((id) => id !== menteeId);
          set((state) => ({
            mentors: {
              ...state.mentors,
              [mentorId]: {
                ...mentor,
                currentMentees: updatedMentees,
              },
            },
          }));
        }
      },

      getMentorCapacity: (mentorId: string) => {
        const mentor = get().mentors[mentorId];
        if (!mentor) return 0;
        return mentor.maxMentees - mentor.currentMentees.length;
      },

      addMenteeRequest: (request: MenteeRequest) => {
        set((state) => ({
          menteeRequests: {
            ...state.menteeRequests,
            [request.id]: request,
          },
        }));
      },

      getMenteeRequest: (requestId: string) => {
        return get().menteeRequests[requestId];
      },

      updateMenteeRequestStatus: (requestId: string, status: 'pending' | 'matched' | 'expired') => {
        const request = get().menteeRequests[requestId];
        if (request) {
          set((state) => ({
            menteeRequests: {
              ...state.menteeRequests,
              [requestId]: {
                ...request,
                status,
              },
            },
          }));
        }
      },

      createMatch: (match: MentorMatch) => {
        set((state) => ({
          matches: {
            ...state.matches,
            [match.id]: match,
          },
        }));
      },

      getMatch: (matchId: string) => {
        return get().matches[matchId];
      },

      setSelectedMatch: (matchId: string | null, explanation: MatchExplanation | null) => {
        set({
          selectedMatchId: matchId,
          selectedExplanation: explanation,
        });
      },

      addBooking: (booking: BookingSession) => {
        set((state) => ({
          bookings: [...state.bookings, booking],
        }));
        // Decrement mentor capacity when booking is created
        get().decrementMentorCapacity(booking.mentorId, booking.menteeId);
      },

      getBookingsForMentee: (menteeId: string) => {
        return get().bookings.filter((b) => b.menteeId === menteeId);
      },

      getBookingsForMentor: (mentorId: string) => {
        return get().bookings.filter((b) => b.mentorId === mentorId);
      },

      updateBookingStatus: (bookingId: string, status: BookingSession['status']) => {
        set((state) => ({
          bookings: state.bookings.map((b) => (b.id === bookingId ? { ...b, status } : b)),
        }));
      },

      cancelBooking: (bookingId: string) => {
        const booking = get().bookings.find((b) => b.id === bookingId);
        if (booking) {
          // Increment mentor capacity when booking is cancelled
          get().incrementMentorCapacity(booking.mentorId, booking.menteeId);
          set((state) => ({
            bookings: state.bookings.filter((b) => b.id !== bookingId),
          }));
        }
      },

      canBookWithMentor: (mentorId: string) => {
        return get().getMentorCapacity(mentorId) > 0;
      },

      hydrate: () => {
        set({ isHydrated: true });
      },

      clearAll: () => {
        set({
          bookings: [],
          mentors: {},
          menteeRequests: {},
          matches: {},
          selectedMatchId: null,
          selectedExplanation: null,
        });
      },
    }),
    {
      name: STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        state?.hydrate();
      },
    }
  )
);
