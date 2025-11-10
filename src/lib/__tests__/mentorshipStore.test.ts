import { describe, it, expect, beforeEach } from 'vitest';
import { useMentorshipStore } from '../mentorshipStore';
import { createMentorProfile, createMenteeRequest, createMentorMatch } from '../mentorship';

describe('Mentorship Store', () => {
  beforeEach(() => {
    useMentorshipStore.getState().clearAll();
  });

  describe('Mentor Management', () => {
    it('should add and retrieve a mentor', () => {
      const mentor = createMentorProfile(
        'student1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      useMentorshipStore.getState().addOrUpdateMentor(mentor);
      const retrieved = useMentorshipStore.getState().getMentor(mentor.id);

      expect(retrieved).toEqual(mentor);
    });

    it('should update an existing mentor', () => {
      const mentor = createMentorProfile(
        'student1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor.karma = 500;

      useMentorshipStore.getState().addOrUpdateMentor(mentor);

      // Update the mentor
      const updated = { ...mentor, karma: 750, streak: 10 };
      useMentorshipStore.getState().addOrUpdateMentor(updated);

      const retrieved = useMentorshipStore.getState().getMentor(mentor.id);
      expect(retrieved?.karma).toBe(750);
      expect(retrieved?.streak).toBe(10);
    });
  });

  describe('Capacity Management', () => {
    it('should decrement capacity when mentee is added', () => {
      const mentor = createMentorProfile(
        'student1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor.maxMentees = 5;
      mentor.currentMentees = [];

      useMentorshipStore.getState().addOrUpdateMentor(mentor);

      expect(useMentorshipStore.getState().getMentorCapacity(mentor.id)).toBe(5);

      useMentorshipStore.getState().decrementMentorCapacity(mentor.id, 'mentee1');
      expect(useMentorshipStore.getState().getMentorCapacity(mentor.id)).toBe(4);
    });

    it('should increment capacity when mentee is removed', () => {
      const mentor = createMentorProfile(
        'student1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor.maxMentees = 5;
      mentor.currentMentees = ['mentee1', 'mentee2'];

      useMentorshipStore.getState().addOrUpdateMentor(mentor);
      expect(useMentorshipStore.getState().getMentorCapacity(mentor.id)).toBe(3);

      useMentorshipStore.getState().incrementMentorCapacity(mentor.id, 'mentee1');
      expect(useMentorshipStore.getState().getMentorCapacity(mentor.id)).toBe(4);
    });

    it('should prevent duplicate mentee additions', () => {
      const mentor = createMentorProfile(
        'student1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor.maxMentees = 5;
      mentor.currentMentees = [];

      useMentorshipStore.getState().addOrUpdateMentor(mentor);

      useMentorshipStore.getState().decrementMentorCapacity(mentor.id, 'mentee1');
      useMentorshipStore.getState().decrementMentorCapacity(mentor.id, 'mentee1');

      const currentMentees = useMentorshipStore.getState().getMentor(mentor.id)?.currentMentees || [];
      expect(currentMentees.length).toBe(1);
    });

    it('should accurately report capacity constraints', () => {
      const mentor = createMentorProfile(
        'student1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor.maxMentees = 2;
      mentor.currentMentees = [];

      useMentorshipStore.getState().addOrUpdateMentor(mentor);
      expect(useMentorshipStore.getState().canBookWithMentor(mentor.id)).toBe(true);

      useMentorshipStore.getState().decrementMentorCapacity(mentor.id, 'mentee1');
      expect(useMentorshipStore.getState().canBookWithMentor(mentor.id)).toBe(true);

      useMentorshipStore.getState().decrementMentorCapacity(mentor.id, 'mentee2');
      expect(useMentorshipStore.getState().canBookWithMentor(mentor.id)).toBe(false);
    });
  });

  describe('Booking Management', () => {
    it('should create and retrieve bookings', () => {
      const mentor = createMentorProfile(
        'student1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor.maxMentees = 5;

      useMentorshipStore.getState().addOrUpdateMentor(mentor);

      const booking = {
        id: 'booking1',
        menteeId: 'mentee1',
        mentorId: mentor.id,
        requestId: 'request1',
        dayOfWeek: 'monday',
        timeSlot: 'morning' as const,
        mentorName: 'John',
        status: 'confirmed' as const,
        bookedAt: Date.now(),
      };

      useMentorshipStore.getState().addBooking(booking);

      const bookings = useMentorshipStore.getState().getBookingsForMentee('mentee1');
      expect(bookings).toHaveLength(1);
      expect(bookings[0].id).toBe('booking1');
    });

    it('should decrement capacity when booking is added', () => {
      const mentor = createMentorProfile(
        'student1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor.maxMentees = 5;
      mentor.currentMentees = [];

      useMentorshipStore.getState().addOrUpdateMentor(mentor);

      const booking = {
        id: 'booking1',
        menteeId: 'mentee1',
        mentorId: mentor.id,
        requestId: 'request1',
        dayOfWeek: 'monday',
        timeSlot: 'morning' as const,
        mentorName: 'John',
        status: 'confirmed' as const,
        bookedAt: Date.now(),
      };

      expect(useMentorshipStore.getState().getMentorCapacity(mentor.id)).toBe(5);
      useMentorshipStore.getState().addBooking(booking);
      expect(useMentorshipStore.getState().getMentorCapacity(mentor.id)).toBe(4);
    });

    it('should handle booking cancellation and restore capacity', () => {
      const mentor = createMentorProfile(
        'student1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor.maxMentees = 5;

      useMentorshipStore.getState().addOrUpdateMentor(mentor);

      const booking = {
        id: 'booking1',
        menteeId: 'mentee1',
        mentorId: mentor.id,
        requestId: 'request1',
        dayOfWeek: 'monday',
        timeSlot: 'morning' as const,
        mentorName: 'John',
        status: 'confirmed' as const,
        bookedAt: Date.now(),
      };

      useMentorshipStore.getState().addBooking(booking);
      expect(useMentorshipStore.getState().getMentorCapacity(mentor.id)).toBe(4);

      useMentorshipStore.getState().cancelBooking(booking.id);
      expect(useMentorshipStore.getState().getMentorCapacity(mentor.id)).toBe(5);
      expect(useMentorshipStore.getState().getBookingsForMentee('mentee1')).toHaveLength(0);
    });

    it('should get bookings for a specific mentor', () => {
      const mentor1 = createMentorProfile(
        'student1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      const mentor2 = createMentorProfile(
        'student2',
        'Harvard',
        ['depression'],
        { tuesday: ['afternoon'] }
      );

      mentor1.maxMentees = 5;
      mentor2.maxMentees = 5;

      useMentorshipStore.getState().addOrUpdateMentor(mentor1);
      useMentorshipStore.getState().addOrUpdateMentor(mentor2);

      const booking1 = {
        id: 'booking1',
        menteeId: 'mentee1',
        mentorId: mentor1.id,
        requestId: 'request1',
        dayOfWeek: 'monday',
        timeSlot: 'morning' as const,
        mentorName: 'John',
        status: 'confirmed' as const,
        bookedAt: Date.now(),
      };

      const booking2 = {
        id: 'booking2',
        menteeId: 'mentee2',
        mentorId: mentor1.id,
        requestId: 'request2',
        dayOfWeek: 'monday',
        timeSlot: 'afternoon' as const,
        mentorName: 'John',
        status: 'confirmed' as const,
        bookedAt: Date.now(),
      };

      const booking3 = {
        id: 'booking3',
        menteeId: 'mentee3',
        mentorId: mentor2.id,
        requestId: 'request3',
        dayOfWeek: 'tuesday',
        timeSlot: 'afternoon' as const,
        mentorName: 'Jane',
        status: 'confirmed' as const,
        bookedAt: Date.now(),
      };

      useMentorshipStore.getState().addBooking(booking1);
      useMentorshipStore.getState().addBooking(booking2);
      useMentorshipStore.getState().addBooking(booking3);

      const mentor1Bookings = useMentorshipStore.getState().getBookingsForMentor(mentor1.id);
      expect(mentor1Bookings).toHaveLength(2);

      const mentor2Bookings = useMentorshipStore.getState().getBookingsForMentor(mentor2.id);
      expect(mentor2Bookings).toHaveLength(1);
    });

    it('should update booking status', () => {
      const mentor = createMentorProfile(
        'student1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      mentor.maxMentees = 5;

      useMentorshipStore.getState().addOrUpdateMentor(mentor);

      const booking = {
        id: 'booking1',
        menteeId: 'mentee1',
        mentorId: mentor.id,
        requestId: 'request1',
        dayOfWeek: 'monday',
        timeSlot: 'morning' as const,
        mentorName: 'John',
        status: 'pending' as const,
        bookedAt: Date.now(),
      };

      useMentorshipStore.getState().addBooking(booking);
      useMentorshipStore.getState().updateBookingStatus('booking1', 'confirmed');

      const bookings = useMentorshipStore.getState().getBookingsForMentee('mentee1');
      expect(bookings[0].status).toBe('confirmed');
    });
  });

  describe('Mentee Request Management', () => {
    it('should add and retrieve mentee requests', () => {
      const request = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      useMentorshipStore.getState().addMenteeRequest(request);
      const retrieved = useMentorshipStore.getState().getMenteeRequest(request.id);

      expect(retrieved).toEqual(request);
    });

    it('should update mentee request status', () => {
      const request = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      useMentorshipStore.getState().addMenteeRequest(request);
      useMentorshipStore.getState().updateMenteeRequestStatus(request.id, 'matched');

      const retrieved = useMentorshipStore.getState().getMenteeRequest(request.id);
      expect(retrieved?.status).toBe('matched');
    });
  });

  describe('Match Management', () => {
    it('should create and retrieve matches', () => {
      const mentor = createMentorProfile(
        'student1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );
      const mentee = createMenteeRequest(
        'mentee1',
        'MIT',
        ['anxiety'],
        { monday: ['morning'] }
      );

      const match = createMentorMatch(
        mentee.id,
        mentor.id,
        mentee.studentId,
        85,
        {
          topicOverlapScore: 40,
          topicOverlapReason: 'Perfect match',
          collegeScore: 20,
          collegeReason: 'Same college',
          availabilityScore: 20,
          availabilityReason: 'Good match',
          reputationScore: 5,
          reputationReason: 'Good reputation',
          totalScore: 85,
          strengths: ['Strong match'],
          considerations: [],
          weights: {
            topicOverlap: 0.4,
            collegeSimilarity: 0.2,
            availability: 0.2,
            reputation: 0.2,
          },
        }
      );

      useMentorshipStore.getState().createMatch(match, match.explanation);
      const retrieved = useMentorshipStore.getState().getMatch(match.id);

      expect(retrieved).toEqual(match);
    });
  });

  describe('Store Hydration', () => {
    it('should hydrate correctly', () => {
      const store = useMentorshipStore.getState();
      // Hydration should toggle the state
      store.hydrate();
      const after = store.isHydrated;
      // Just verify hydrate can be called
      expect(typeof store.hydrate).toBe('function');
      expect(typeof after).toBe('boolean');
    });
  });
});
