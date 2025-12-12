import { useMemo, useState } from 'react'
import { useStore, type MemorialTribute } from '../../lib/store'
import { sanitizeContent } from '../../lib/utils'
import { redactContactInfo } from '../../lib/privacy/redactContactInfo'

function sanitizeForDisplay(value: string): string {
  return redactContactInfo(sanitizeContent(value))
}

function getTimelineEvents(tribute: MemorialTribute): Array<{ label: string; timestamp: number }> {
  const events: Array<{ label: string; timestamp: number }> = [
    { label: 'Created', timestamp: tribute.createdAt },
  ]

  const validCosigners = tribute.cosignerProofs
    .filter((proof) => proof.contentHash === tribute.contentHash)
    .slice()
    .sort((a, b) => a.signedAt - b.signedAt)

  validCosigners.slice(0, 3).forEach((proof, index) => {
    events.push({
      label: `Cosign milestone ${index + 1}/3`,
      timestamp: proof.signedAt,
    })
  })

  if (tribute.status === 'published') {
    const publishedAt = tribute.moderatorDecision?.decidedAt ?? tribute.updatedAt ?? tribute.createdAt
    events.push({ label: 'Published', timestamp: publishedAt })
  }

  return events.sort((a, b) => a.timestamp - b.timestamp)
}

export default function TributeWall() {
  const memorialTributes = useStore((state) => state.memorialTributes)

  const [query, setQuery] = useState('')
  const [selectedCollege, setSelectedCollege] = useState('')

  const publishedTributes = useMemo(
    () => memorialTributes.filter((tribute) => tribute.status === 'published'),
    [memorialTributes]
  )

  const colleges = useMemo(() => {
    const unique = new Set<string>()
    publishedTributes.forEach((tribute) => {
      if (tribute.college) {
        unique.add(tribute.college)
      }
    })
    return Array.from(unique).sort((a, b) => a.localeCompare(b))
  }, [publishedTributes])

  const filteredTributes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return publishedTributes.filter((tribute) => {
      const matchesQuery =
        normalizedQuery.length === 0 || tribute.personName.toLowerCase().includes(normalizedQuery)

      const matchesCollege =
        selectedCollege.trim().length === 0 || tribute.college === selectedCollege

      return matchesQuery && matchesCollege
    })
  }, [publishedTributes, query, selectedCollege])

  const filtersActive = query.trim().length > 0 || selectedCollege.trim().length > 0
  const showPrivacyNotice = filtersActive && filteredTributes.length > 0 && filteredTributes.length < 3

  return (
    <section className="space-y-6" aria-label="Tribute wall">
      <div className="glass p-4 space-y-4">
        <h2 className="text-xl font-semibold text-white">Tribute Wall</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="tribute-search" className="block text-sm font-medium text-gray-300">
              Search by honoree name
            </label>
            <input
              id="tribute-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-surface border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
              aria-label="Search tributes"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="tribute-college" className="block text-sm font-medium text-gray-300">
              Filter by college
            </label>
            <select
              id="tribute-college"
              value={selectedCollege}
              onChange={(e) => setSelectedCollege(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary transition-colors"
              aria-label="Filter tributes by college"
            >
              <option value="">All colleges</option>
              {colleges.map((college) => (
                <option key={college} value={college}>
                  {sanitizeForDisplay(college)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {showPrivacyNotice && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-200" role="note">
            Privacy notice: Your filters narrow results to fewer than 3 tributes. Consider broadening filters to protect privacy.
          </div>
        )}
      </div>

      {filteredTributes.length === 0 ? (
        <div className="glass p-8 text-center text-gray-300" data-testid="no-tributes">
          No published tributes match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="tribute-results">
          {filteredTributes.map((tribute) => {
            const sanitizedName = sanitizeForDisplay(tribute.personName)
            const sanitizedCollege = tribute.college ? sanitizeForDisplay(tribute.college) : null
            const sanitizedMessage = sanitizeForDisplay(tribute.message)
            const timeline = getTimelineEvents(tribute)

            return (
              <article
                key={tribute.id}
                className="glass p-6 space-y-4"
                data-testid={`tribute-${tribute.id}`}
              >
                <header className="space-y-1">
                  <h3 className="text-lg font-semibold text-white">{sanitizedName}</h3>
                  {sanitizedCollege && (
                    <p className="text-xs text-gray-400">{sanitizedCollege}</p>
                  )}
                </header>

                <p className="text-sm text-gray-200 leading-relaxed" data-testid="tribute-message">
                  {sanitizedMessage}
                </p>

                <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Timeline</p>
                  <ol className="space-y-1" aria-label="Tribute timeline">
                    {timeline.map((event) => (
                      <li key={`${event.label}-${event.timestamp}`} data-testid="timeline-event" className="text-xs text-gray-300">
                        <span className="font-medium">{event.label}</span>
                        <span className="text-gray-500"> • {new Date(event.timestamp).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
