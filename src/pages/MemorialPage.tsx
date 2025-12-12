import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import ModeratorPanel from '../components/memorial/ModeratorPanel'
import TributeWall from '../components/memorial/TributeWall'
import CreateTributeModal from '../components/memorial/CreateTributeModal'
import { useStore } from '../lib/store'
import { useSessionRateLimiter } from '../hooks/useSessionRateLimiter'

export default function MemorialPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const loadMemorialData = useStore((state) => state.loadMemorialData)
  const isModerator = useStore((state) => state.isModerator)

  const headingRef = useRef<HTMLHeadingElement>(null)

  const rateLimit = useSessionRateLimiter({
    key: 'safevoice:memorial_wall_views',
    limit: 15,
  })

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  useEffect(() => {
    if (rateLimit.isLimited) {
      return
    }

    loadMemorialData()
  }, [loadMemorialData, rateLimit.isLimited])

  return (
    <section className="min-h-screen px-4 py-8 max-w-6xl mx-auto space-y-6" aria-label="Memorial page">
      <header className="glass p-6 space-y-4">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-3xl font-bold text-white"
        >
          Memorial Wall
        </h1>
        <p className="text-gray-300 max-w-3xl">
          A space to honor those we have lost. Published tributes show a verified timeline of creation, cosigners, and moderation.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-lg"
            aria-label="Create tribute"
          >
            <Plus className="w-5 h-5" />
            Create Tribute
          </button>
        </div>
      </header>

      {rateLimit.isLimited ? (
        <div className="glass p-6 text-gray-200" role="alert" data-testid="rate-limit-message">
          Rate limit reached. Please avoid refreshing the memorial wall repeatedly in this session.
        </div>
      ) : (
        <div className="space-y-6">
          {isModerator && <ModeratorPanel />}
          <TributeWall />
        </div>
      )}

      <CreateTributeModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </section>
  )
}
