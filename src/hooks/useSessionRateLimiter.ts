import { useEffect, useMemo, useState } from 'react'

interface SessionRateLimiterOptions {
  key: string
  limit: number
}

interface SessionRateLimiterState {
  count: number
  limit: number
  isLimited: boolean
}

export function useSessionRateLimiter(options: SessionRateLimiterOptions): SessionRateLimiterState {
  const { key, limit } = options

  const initial = useMemo(() => {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return { count: 0, limit, isLimited: false }
    }

    const raw = sessionStorage.getItem(key)
    const parsed = raw ? Number.parseInt(raw, 10) : 0
    const count = Number.isFinite(parsed) ? parsed : 0
    const next = count + 1

    sessionStorage.setItem(key, String(next))

    return {
      count: next,
      limit,
      isLimited: next > limit,
    }
  }, [key, limit])

  const [state, setState] = useState<SessionRateLimiterState>(initial)

  useEffect(() => {
    setState(initial)
  }, [initial])

  return state
}
