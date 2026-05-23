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
