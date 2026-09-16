// Leaderboard data access for the title screen + game-over card.
//
// Talks to the shared /api/scores endpoint (Upstash Redis sorted set — one set
// per board, so kick and FPS scores never mix) and transparently falls back to
// the per-browser localStorage mirror when the API isn't reachable — e.g.
// `npm run dev` (Vite only, no functions) or if the Upstash env vars aren't
// configured yet. That keeps the feature working in every environment with no
// code changes.

import {
  loadTopScores,
  recordScore,
  type BoardId,
  type ScoreEntry,
} from './highScore'

const ENDPOINT = '/api/scores'

type ApiResponse = { scores?: { name?: string; score: number }[] }

function toEntries(data: ApiResponse, limit: number): ScoreEntry[] {
  return (data.scores ?? [])
    .slice(0, limit)
    .map((s) => ({ score: s.score, at: 0, name: s.name }))
}

/** Top scores on a board, highest first. Shared board when available, else local mirror. */
export async function fetchTopScores(board: BoardId, limit = 5): Promise<ScoreEntry[]> {
  try {
    const res = await fetch(`${ENDPOINT}?board=${board}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return toEntries(await res.json(), limit)
  } catch {
    return loadTopScores(board, limit)
  }
}

/** Record a finished match on a board: mirror locally, then submit to the shared board. */
export async function submitScore(
  board: BoardId,
  score: number,
  name?: string,
  limit = 5,
): Promise<ScoreEntry[]> {
  recordScore(board, score, name, limit) // offline-capable local mirror
  try {
    const res = await fetch(`${ENDPOINT}?board=${board}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ score, name, board }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return toEntries(await res.json(), limit)
  } catch {
    return loadTopScores(board, limit)
  }
}
