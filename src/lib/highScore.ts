// Tiny localStorage helper for the depot best-score record.

const STORAGE_KEY = 'depot:bestScore:v1'

export function loadBestScore(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw == null) return null
    const n = Number.parseInt(raw, 10)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

/** Save the score if it beats the existing best. Returns the new best. */
export function maybeSaveBestScore(score: number): number {
  const current = loadBestScore()
  if (current != null && score <= current) return current
  try {
    window.localStorage.setItem(STORAGE_KEY, String(score))
  } catch {
    // ignore storage errors (private mode, full quota, etc.)
  }
  return score
}

// ── Leaderboard (top scores) ────────────────────────────────────────────
// Local-first, persisted per-browser. To make this a shared leaderboard on
// Vercel, swap these two functions for `fetch('/api/scores')` calls backed by
// a serverless route + Upstash Redis sorted set (ZADD / ZREVRANGE) or Postgres.
// Keep the same ScoreEntry[] shape and the UI needs no changes — just make the
// callers await them.

const TOP_KEY = 'depot:topScores:v1'
const TOP_LIMIT = 5

export type ScoreEntry = { score: number; at: number }

function readList(): ScoreEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TOP_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((e): e is ScoreEntry => e && Number.isFinite(e.score))
  } catch {
    return []
  }
}

/** The top scores, highest first. */
export function loadTopScores(limit = TOP_LIMIT): ScoreEntry[] {
  return readList()
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .slice(0, limit)
}

/** Record a finished match into the leaderboard; returns the new top list. */
export function recordScore(score: number, limit = TOP_LIMIT): ScoreEntry[] {
  if (!Number.isFinite(score)) return loadTopScores(limit)
  const next = [...readList(), { score, at: Date.now() }]
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .slice(0, limit)
  try {
    window.localStorage.setItem(TOP_KEY, JSON.stringify(next))
  } catch {
    // ignore storage errors
  }
  return next
}
