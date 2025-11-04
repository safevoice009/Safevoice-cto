import { useMemo, useState } from 'react';
import { CalendarPlus, MapPin, Users } from 'lucide-react';
import { useStore } from '../../lib/store';

const formatEventDate = (value: string): string => {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
};

const startOfToday = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
};

export default function CommunityEvents() {
  const studentId = useStore((state) => state.studentId);
  const events = useStore((state) => state.communityEvents);
  const addCommunityEvent = useStore((state) => state.addCommunityEvent);
  const toggleEventRsvp = useStore((state) => state.toggleEventRsvp);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const upcomingEvents = useMemo(() => {
    const today = startOfToday();
    return events
      .filter((event) => {
        const eventTime = Date.parse(event.date);
        return Number.isNaN(eventTime) ? true : eventTime >= today;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const success = addCommunityEvent(title, date, location, description);
    if (success) {
      setTitle('');
      setDate('');
      setLocation('');
      setDescription('');
      setShowForm(false);
    }
  };

  const handleToggleRsvp = (eventId: string) => {
    toggleEventRsvp(eventId);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-white/5 bg-gradient-to-b from-slate-900/70 to-slate-900/40 p-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Community Events</h2>
          <p className="text-sm text-gray-400">Organise or join offline meetups with peers.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-expanded={showForm}
        >
          <CalendarPlus className="h-4 w-4" aria-hidden />
          Organize meetup
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-white/5 bg-white/5 p-4">
          <div>
            <label htmlFor="event-title" className="block text-sm font-medium text-white">
              Event title
            </label>
            <input
              id="event-title"
              name="event-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Peer support coffee hour"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="event-date" className="block text-sm font-medium text-white">
                Date
              </label>
              <input
                id="event-date"
                name="event-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label htmlFor="event-location" className="block text-sm font-medium text-white">
                Location
              </label>
              <input
                id="event-location"
                name="event-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Wellness Center Room 202"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="event-description" className="block text-sm font-medium text-white">
              Description
            </label>
            <textarea
              id="event-description"
              name="event-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Share what attendees can expect, who should join, or any supplies to bring."
              required
            />
          </div>

          <div className="text-xs italic text-gray-400">Map integration coming soon.</div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Save event
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {upcomingEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/30 p-6 text-sm text-gray-400">
            No upcoming events yet. Be the first to organise a gathering!
          </div>
        ) : (
          upcomingEvents.map((event) => {
            const isAttending = event.rsvps.includes(studentId);
            return (
              <article
                key={event.id}
                className="space-y-3 rounded-xl border border-white/5 bg-white/5 p-4"
              >
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{event.title}</h3>
                    <p className="text-xs text-gray-400">Hosted by {event.createdBy}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-300">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
                      <CalendarPlus className="h-3 w-3" aria-hidden />
                      {formatEventDate(event.date)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
                      <MapPin className="h-3 w-3" aria-hidden />
                      {event.location}
                    </span>
                  </div>
                </header>

                <p className="text-sm text-gray-200">{event.description}</p>

                <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-300">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" aria-hidden />
                    {event.rsvps.length} going
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleRsvp(event.id)}
                    aria-pressed={isAttending}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                      isAttending
                        ? 'border border-primary/50 bg-primary/20 text-primary hover:bg-primary/10'
                        : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    {isAttending ? 'Cancel RSVP' : 'RSVP'}
                  </button>
                </footer>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
