import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Search, ArrowLeft } from 'lucide-react';
import type { MentorProfile, MenteeRequest, MatchExplanation } from '../lib/mentorship';
import { findBestMentorMatch, createMenteeRequest } from '../lib/mentorship';
import { useMentorshipStore, type BookingSession } from '../lib/mentorshipStore';
import { useStore } from '../lib/store';
import MatchInsightPanel from '../components/mentorship/MatchInsightPanel';
import BookingForm from '../components/mentorship/BookingForm';

interface MentorWithMatch {
  mentor: MentorProfile;
  match: {
    score: number;
    explanation: MatchExplanation;
  };
}

export default function MentorDashboard() {
  useTranslation();
  const { studentId } = useStore();
  const { addOrUpdateMentor, addMenteeRequest } = useMentorshipStore();

  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'rating' | 'availability'>('score');
  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [myRequest, setMyRequest] = useState<MenteeRequest | null>(null);
  const [mentorMatches, setMentorMatches] = useState<Map<string, MentorWithMatch>>(new Map());
  const [userBookings, setUserBookings] = useState<BookingSession[]>([]);

  // Initialize demo mentors and mentee request
  useEffect(() => {
    // Create sample mentee request if not already created
    const demoRequest = createMenteeRequest(
      studentId,
      'MIT',
      ['anxiety', 'academic_pressure', 'stress_management'],
      {
        monday: ['morning', 'afternoon'],
        wednesday: ['evening'],
        friday: ['morning'],
      },
      'high',
      'Looking for guidance on stress management during exams'
    );
    setMyRequest(demoRequest);
    addMenteeRequest(demoRequest);

    // Create sample mentors
    const demoMentors: MentorProfile[] = [
      {
        id: 'mentor_001',
        studentId: 'student_001',
        displayName: 'Sarah Chen',
        college: 'MIT',
        topics: ['anxiety', 'academic_pressure', 'stress_management'],
        availability: {
          monday: ['morning', 'afternoon'],
          wednesday: ['evening'],
          thursday: ['afternoon'],
          friday: ['morning'],
        },
        karma: 750,
        streak: 12,
        totalSessions: 24,
        rating: 4.8,
        bio: 'Experienced in helping students manage academic stress and anxiety. I use evidence-based techniques.',
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
        lastActiveAt: Date.now() - 2 * 60 * 60 * 1000,
        isActive: true,
        maxMentees: 5,
        currentMentees: ['mentee_002'],
      },
      {
        id: 'mentor_002',
        studentId: 'student_002',
        displayName: 'James Rodriguez',
        college: 'Harvard',
        topics: ['academic_pressure', 'time_management', 'self_esteem'],
        availability: {
          monday: ['evening'],
          tuesday: ['morning', 'afternoon'],
          thursday: ['morning'],
          saturday: ['afternoon'],
        },
        karma: 620,
        streak: 8,
        totalSessions: 18,
        rating: 4.6,
        bio: 'Passionate about helping mentees develop effective time management skills.',
        createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
        lastActiveAt: Date.now() - 1 * 60 * 60 * 1000,
        isActive: true,
        maxMentees: 4,
        currentMentees: ['mentee_001', 'mentee_003'],
      },
      {
        id: 'mentor_003',
        studentId: 'student_003',
        displayName: 'Priya Sharma',
        college: 'MIT',
        topics: ['anxiety', 'depression', 'relationships', 'stress_management'],
        availability: {
          tuesday: ['evening'],
          wednesday: ['afternoon'],
          thursday: ['morning', 'evening'],
          sunday: ['morning'],
        },
        karma: 850,
        streak: 18,
        totalSessions: 35,
        rating: 4.9,
        bio: 'Specialized in anxiety and depression support. Trained in cognitive behavioral techniques.',
        createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
        lastActiveAt: Date.now() - 30 * 60 * 1000,
        isActive: true,
        maxMentees: 5,
        currentMentees: [],
      },
    ];

    // Add mentors to store and calculate matches
    demoMentors.forEach((mentor) => {
      addOrUpdateMentor(mentor);
    });

    setMentors(demoMentors);

    // Calculate matches for all mentors
    const matches = new Map<string, MentorWithMatch>();
    demoMentors.forEach((mentor) => {
      const result = findBestMentorMatch(demoRequest, [mentor]);
      if (result) {
        matches.set(mentor.id, {
          mentor: result.mentor,
          match: {
            score: result.score,
            explanation: result.explanation,
          },
        });
      }
    });
    setMentorMatches(matches);
  }, [studentId, addOrUpdateMentor, addMenteeRequest]);

  // Load user bookings
  useEffect(() => {
    const bookingsForUser = useMentorshipStore.getState().getBookingsForMentee(studentId);
    setUserBookings(bookingsForUser);
  }, [studentId]);

  // Filter and sort mentors
  const filteredAndSortedMentors = mentors
    .filter(
      (mentor) =>
        mentor.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mentor.topics.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        mentor.college.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'score') {
        const scoreA = mentorMatches.get(a.id)?.match.score || 0;
        const scoreB = mentorMatches.get(b.id)?.match.score || 0;
        return scoreB - scoreA;
      } else if (sortBy === 'rating') {
        return b.rating - a.rating;
      } else {
        const availabilityA = Object.values(a.availability).flat().length;
        const availabilityB = Object.values(b.availability).flat().length;
        return availabilityB - availabilityA;
      }
    });

  const selectedMentorMatch =
    selectedMentorId && mentorMatches.get(selectedMentorId)
      ? mentorMatches.get(selectedMentorId)!
      : null;

  const handleBooking = (booking: BookingSession) => {
    setUserBookings((prev) => [...prev, booking]);
    setShowBookingForm(false);
    setSelectedMentorId(null);
  };

  if (selectedMentorMatch && showBookingForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-6">
        <div className="mx-auto max-w-3xl">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setShowBookingForm(false)}
            className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Match Insights
          </motion.button>

          <BookingForm
            mentor={selectedMentorMatch.mentor}
            mentee={myRequest!}
            onClose={() => setShowBookingForm(false)}
            onBookingComplete={handleBooking}
          />
        </div>
      </div>
    );
  }

  if (selectedMentorMatch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-6">
        <div className="mx-auto max-w-3xl">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setSelectedMentorId(null)}
            className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Mentor List
          </motion.button>

          <MatchInsightPanel
            mentor={selectedMentorMatch.mentor}
            explanation={selectedMentorMatch.match.explanation}
            onBookClick={() => setShowBookingForm(true)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Find Your Mentor</h1>
          <p className="text-lg text-gray-600">
            Discover mentors matched to your needs and book sessions at your convenience
          </p>
        </motion.div>

        {/* Current Bookings Summary */}
        {userBookings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4"
          >
            <p className="font-medium text-green-900">
              ✅ You have {userBookings.length} confirmed booking{userBookings.length > 1 ? 's' : ''}
            </p>
            <div className="mt-2 space-y-1">
              {userBookings.map((booking) => (
                <p key={booking.id} className="text-sm text-green-800">
                  • {booking.mentorName} - {booking.dayOfWeek} {booking.timeSlot} ({booking.status})
                </p>
              ))}
            </div>
          </motion.div>
        )}

        {/* Search and Sort Controls */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 space-y-4 rounded-lg bg-white p-4 shadow-sm"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, topic, or college..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(['score', 'rating', 'availability'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setSortBy(option)}
                className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                  sortBy === option
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Sort by {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Mentors Grid */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredAndSortedMentors.map((mentor, idx) => {
              const matchData = mentorMatches.get(mentor.id);
              if (!matchData) return null;

              const canBook = mentor.currentMentees.length < mentor.maxMentees;
              const scorePercentage = Math.round(matchData.match.score);

              return (
                <motion.button
                  key={mentor.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setSelectedMentorId(mentor.id)}
                  className="w-full text-left"
                >
                  <div className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-lg transition-shadow hover:border-blue-400">
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {mentor.displayName || `Mentor ${mentor.id.slice(0, 8)}`}
                          </h3>
                          {!canBook && (
                            <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                              At Capacity
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{mentor.college}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {mentor.topics.slice(0, 3).map((topic) => (
                            <span
                              key={topic}
                              className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800"
                            >
                              {topic.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {mentor.topics.length > 3 && (
                            <span className="inline-block rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-800">
                              +{mentor.topics.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{scorePercentage}</div>
                          <div className="text-xs font-medium text-gray-600">Match Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">⭐ {mentor.rating.toFixed(1)}</div>
                          <div className="text-xs font-medium text-gray-600">{mentor.karma} karma</div>
                        </div>
                        <div className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition-colors">
                          View Details
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredAndSortedMentors.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border border-gray-200 bg-white p-8 text-center"
          >
            <p className="text-gray-600">No mentors found matching your search criteria.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
