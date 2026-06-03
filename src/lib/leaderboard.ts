// Leaderboard data access for the title screen.
//
// Talks to the shared /api/scores endpoint (Upstash Redis sorted set) and
// transparently falls back to the per-browser localStorage mirror when the
// API isn't reachable — e.g. `npm run dev` (Vite only, no functions) or if the
// Upstash env vars aren't configured yet. That keeps the feature working in
// every environment with no code changes.

import { loadTopScores, recordScore, type ScoreEntry } from './highScore'

const ENDPOINT = '/api/scores'

type ApiResponse = { scores?: { score: number }[] }

function toEntries(data: ApiResponse, limit: number): ScoreEntry[] {
  return (data.scores ?? []).slice(0, limit).map((s) => ({ score: s.score, at: 0 }))
}

/** Top scores, highest first. Shared board when available, else local mirror. */
export async function fetchTopScores(limit = 5): Promise<ScoreEntry[]> {
  try {
    const res = await fetch(ENDPOINT, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return toEntries(await res.json(), limit)
  } catch {
    return loadTopScores(limit)
  }
}

/** Record a finished match: mirror locally, then submit to the shared board. */
export async function submitScore(score: number, limit = 5): Promise<ScoreEntry[]> {
  recordScore(score, limit) // offline-capable local mirror
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ score }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return toEntries(await res.json(), limit)
  } catch {
    return loadTopScores(limit)
  }
}
