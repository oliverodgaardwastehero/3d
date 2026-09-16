// Tiny localStorage helpers for the per-board best-score record and the
// per-browser mirror of the shared top-5 leaderboard.
//
// Every playable mode has its OWN board so scores never mix: the classic
// 3rd-person kick game is `depot`, the first-person blaster game is `fps`
// (shooting from range is far easier than kicking, so the two aren't
// comparable). Storage keys are prefixed with the board id; the `depot` keys
// are byte-for-byte what they were before boards existed, so existing players
// keep their records.

export type BoardId = 'depot' | 'fps'

export const BOARDS: readonly BoardId[] = ['depot', 'fps']

/** Short tab label for each board (title-screen leaderboard). */
export const BOARD_LABEL: Record<BoardId, string> = {
  depot: 'Kick',
  fps: 'FPS',
}

const bestKey = (board: BoardId) => `${board}:bestScore:v1`
const topKey = (board: BoardId) => `${board}:topScores:v1`
// The player's name is the same person on every board — one shared key.
const NAME_KEY = 'depot:playerName:v1'
const TOP_LIMIT = 5

export function isBoardId(v: unknown): v is BoardId {
  return v === 'depot' || v === 'fps'
}

/**
 * Display a score: always signed; integers plain, otherwise one decimal
 * (FPS headshots score 1.5, so totals can end in .5).
 */
export function fmtScore(n: number): string {
  const abs = Math.abs(n)
  const body = Number.isInteger(abs) ? String(abs) : abs.toFixed(1)
  return n < 0 ? `-${body}` : `+${body}`
}

export function loadBestScore(board: BoardId): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(bestKey(board))
    if (raw == null) return null
    const n = Number.parseFloat(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

/** Save the score if it beats the existing best on that board. Returns the new best. */
export function maybeSaveBestScore(board: BoardId, score: number): number {
  const current = loadBestScore(board)
  if (current != null && score <= current) return current
  try {
    window.localStorage.setItem(bestKey(board), String(score))
  } catch {
    // ignore storage errors (private mode, full quota, etc.)
  }
  return score
}

// ── Leaderboard (top scores) ────────────────────────────────────────────
// Local-first mirror, persisted per-browser and per-board. lib/leaderboard.ts
// wraps these with the shared /api/scores (Upstash) calls and falls back here
// when the API isn't reachable.

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

function readList(board: BoardId): ScoreEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(topKey(board)) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((e): e is ScoreEntry => e && Number.isFinite(e.score))
  } catch {
    return []
  }
}

/** The top scores on a board, highest first. */
export function loadTopScores(board: BoardId, limit = TOP_LIMIT): ScoreEntry[] {
  return readList(board)
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .slice(0, limit)
}

/** Record a finished match into the board's local mirror; returns the new top list. */
export function recordScore(
  board: BoardId,
  score: number,
  name?: string,
  limit = TOP_LIMIT,
): ScoreEntry[] {
  if (!Number.isFinite(score)) return loadTopScores(board, limit)
  const entry: ScoreEntry = { score, at: Date.now(), name: sanitizeName(name) }
  const next = [...readList(board), entry]
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .slice(0, limit)
  try {
    window.localStorage.setItem(topKey(board), JSON.stringify(next))
  } catch {
    // ignore storage errors
  }
  return next
}
