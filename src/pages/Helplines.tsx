import { useEffect, useMemo, useState } from 'react';
import { Search, Bookmark, BookmarkCheck, AlertCircle, XCircle, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { helplines, type Helpline } from '../lib/helplines';
import EmergencyBanner from '../components/helplines/EmergencyBanner';
import HelplineCard from '../components/helplines/HelplineCard';
import { useStore } from '../lib/store';

const categories = ['All', 'Suicide Prevention', 'Mental Health', 'Emotional Support', 'Counselling'];

const allLanguages = Array.from(
  new Set(helplines.flatMap((helpline) => helpline.languages))
);

const languageOptions = ['All', ...allLanguages];

export default function HelplinesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [languageFilter, setLanguageFilter] = useState<string>('All');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | '24_7' | 'open_now'>('all');
  const savedHelplines = useStore((state) => state.savedHelplines);
  const toggleSaveHelpline = useStore((state) => state.toggleSaveHelpline);
  const sponsorHelpline = useStore((state) => state.sponsorHelpline);
  const voiceBalance = useStore((state) => state.voiceBalance);

  useEffect(() => {
    document.title = 'Crisis Helplines | SafeVoice';
  }, []);

  const handleSponsor = () => {
    sponsorHelpline(100);
  };

  const handleShare = async (helpline: Helpline) => {
    const text = `${helpline.name} (${helpline.category})\nPhone: ${helpline.number}\n${helpline.description}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Helpline saved to clipboard');
    } catch {
      toast.error('Unable to copy. Please copy manually.');
    }
  };

  const filteredHelplines = useMemo(() => {
    const now = new Date();

    const matchesAvailability = (helpline: Helpline) => {
      if (availabilityFilter === 'all') return true;
      if (availabilityFilter === '24_7') return helpline.hours.toLowerCase().includes('24/7');

      if (availabilityFilter === 'open_now') {
        // Simple heuristic: hours contain start-end times
        const hours = helpline.hours.toLowerCase();
        if (hours.includes('24/7')) return true;
        if (hours.includes('closed')) return false;
        const match = hours.match(/(\d{1,2})\s*(am|pm)\s*-\s*(\d{1,2})\s*(am|pm)/);
        if (match) {
          const [, startHourStr, startPeriod, endHourStr, endPeriod] = match;
          const to24Hour = (hour: number, period: string) => {
            if (period === 'am') return hour % 12;
            return hour % 12 + 12;
          };
          const startHour = to24Hour(parseInt(startHourStr, 10), startPeriod);
          const endHour = to24Hour(parseInt(endHourStr, 10), endPeriod);
          const currentHour = now.getHours();
          if (startHour < endHour) {
            return currentHour >= startHour && currentHour < endHour;
          }
          return currentHour >= startHour || currentHour < endHour;
        }
        return true;
      }

      return true;
    };

    return helplines.filter((helpline) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        query.length === 0 ||
        helpline.name.toLowerCase().includes(query) ||
        helpline.category.toLowerCase().includes(query) ||
        helpline.description.toLowerCase().includes(query) ||
        helpline.languages.some((lang) => lang.toLowerCase().includes(query));

      const matchesCategory = categoryFilter === 'All' || helpline.category === categoryFilter;
      const matchesLanguage = languageFilter === 'All' || helpline.languages.includes(languageFilter);

      return matchesSearch && matchesCategory && matchesLanguage && matchesAvailability(helpline);
    });
  }, [searchQuery, categoryFilter, languageFilter, availabilityFilter]);

  return (
    <div className="relative min-h-screen bg-background">
      <EmergencyBanner />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-10">
        <header className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Crisis Support Helplines</h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            You are not alone. These organizations offer confidential, compassionate support for
            anyone experiencing distress, anxiety, or thoughts of self-harm.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleSponsor}
              disabled={voiceBalance < 100}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold shadow-lg shadow-rose-500/30 hover:from-rose-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Heart className="w-4 h-4" />
              <span>Sponsor a Helpline (100 VOICE)</span>
            </button>
            <span className="text-xs text-gray-400">
              Your balance: <span className="text-primary font-semibold">{voiceBalance.toFixed(1)} VOICE</span>
            </span>
          </div>
        </header>

        <section className="glass p-6 rounded-2xl border border-white/10 space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search helplines by name, category, or language..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-surface border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="bg-surface border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              >
                {languageOptions.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>

              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value as typeof availabilityFilter)}
                className="bg-surface border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              >
                <option value="all">All hours</option>
                <option value="24_7">24/7 only</option>
                <option value="open_now">Open now</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {savedHelplines.length > 0 ? (
              savedHelplines.map((id) => {
                const helpline = helplines.find((h) => h.id === id);
                if (!helpline) return null;
                return (
                  <span
                    key={helpline.id}
                    className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs flex items-center space-x-2"
                  >
                    <BookmarkCheck className="w-4 h-4" />
                    <span>{helpline.name}</span>
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-gray-500 flex items-center space-x-2">
                <Bookmark className="w-4 h-4" />
                <span>Your saved helplines will appear here</span>
              </span>
            )}
          </div>
        </section>

        <section>
          {filteredHelplines.length === 0 ? (
            <div className="glass p-8 rounded-2xl border border-white/10 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-gray-400 mx-auto" />
              <h3 className="text-lg font-semibold text-white">No helplines match your search.</h3>
              <p className="text-gray-400 text-sm">Try adjusting your filters or search terms.</p>
              <button
                className="inline-flex items-center space-x-2 text-sm text-gray-400 hover:text-gray-300"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('All');
                  setLanguageFilter('All');
                  setAvailabilityFilter('all');
                }}
              >
                <XCircle className="w-4 h-4" />
                <span>Reset filters</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {filteredHelplines.map((helpline) => (
                <HelplineCard
                  key={helpline.id}
                  helpline={helpline}
                  isSaved={savedHelplines.includes(helpline.id)}
                  onSave={() => toggleSaveHelpline(helpline.id)}
                  onShare={() => handleShare(helpline)}
                />
              ))}
            </div>
          )}
        </section>

        <footer className="glass p-6 rounded-2xl border border-white/10">
          <p className="text-sm text-gray-300 text-center">
            SafeVoice provides these helplines for emergency support. We are not affiliated with
            these organizations. If you are in immediate danger, please call emergency services
            (100/112) or visit the nearest hospital.
          </p>
        </footer>
      </div>
    </div>
  );
}
