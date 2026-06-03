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
// Local-first mirror, persisted per-browser. lib/leaderboard.ts wraps these
// with the shared /api/scores (Upstash) calls and falls back here when the API
// isn't reachable.

const TOP_KEY = 'depot:topScores:v1'
const NAME_KEY = 'depot:playerName:v1'
const TOP_LIMIT = 5

/**
 * Max characters for a leaderboard name. Single switch point — `api/scores.ts`
 * mirrors this literal (keep them in sync). Set to 3 for arcade-style initials.
 */
export const MAX_NAME_LEN = 12

export type ScoreEntry = { score: number; at: number; name?: string }

/**
 * Normalise a display name: uppercase, A–Z/0–9/space only, collapsed + capped,
 * `ANON` if empty. Used client-side for UX; the server re-applies the same
 * rules authoritatively (never trust the client).
 */
export function sanitizeName(raw?: string): string {
  const cleaned = String(raw ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LEN)
  return cleaned || 'ANON'
}

/** Last name the player entered, to prefill the entry field. '' if unset. */
export function loadPlayerName(): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function savePlayerName(name: string): void {
  try {
    window.localStorage.setItem(NAME_KEY, sanitizeName(name))
  } catch {
    // ignore storage errors
  }
}

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

/** Record a finished match into the local mirror; returns the new top list. */
export function recordScore(
  score: number,
  name?: string,
  limit = TOP_LIMIT,
): ScoreEntry[] {
  if (!Number.isFinite(score)) return loadTopScores(limit)
  const entry: ScoreEntry = { score, at: Date.now(), name: sanitizeName(name) }
  const next = [...readList(), entry]
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .slice(0, limit)
  try {
    window.localStorage.setItem(TOP_KEY, JSON.stringify(next))
  } catch {
    // ignore storage errors
  }
  return next
}
