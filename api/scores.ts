import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

/**
 * Leaderboard API for "Defend the Waste Fractions".
 *
 *   GET  /api/scores?board=depot           -> { scores: [{ name, score }, ...] }  top 5
 *   POST /api/scores?board=depot { score, name } -> same shape, with the new score included
 *
 * `board` selects which leaderboard: `depot` (the classic kick game — also the
 * default when omitted, so old clients keep working) or `fps` (the
 * first-person blaster mode). Each board is its own Redis sorted set, so the
 * two modes' scores never mix. POST also accepts `board` in the JSON body.
 *
 * Backed by one Redis sorted set per board. ZADD is atomic, so concurrent
 * submissions never clobber each other (the whole reason this isn't a Blob).
 * ZRANGE ... REV gives the ranked top N in one O(log n + k) call.
 *
 * Reads the REST URL + token from the environment. Vercel's Upstash/KV
 * Marketplace integration injects them as KV_REST_API_URL / KV_REST_API_TOKEN;
 * a hand-added Upstash store uses UPSTASH_REDIS_REST_URL / _TOKEN. Accept both.
 */
const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? '',
  token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
})

/** Board id -> Redis key. `depot` keeps its pre-boards key so history survives. */
const BOARD_KEYS = {
  depot: 'depot:leaderboard',
  fps: 'fps:leaderboard',
} as const
type BoardId = keyof typeof BOARD_KEYS

const DISPLAY = 5 // rows returned to the client
const KEEP = 100 // cap stored entries so the set stays bounded
const MAX_NAME_LEN = 12 // keep in sync with src/lib/highScore.ts

/** Authoritative name normalisation (mirror of the client sanitizeName). The
 *  A–Z/0–9/space charset guarantees a name can never contain the `|` delimiter
 *  used to pack it into the sorted-set member. */
function sanitizeName(raw: unknown): string {
  const cleaned = String(raw ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LEN)
  return cleaned || 'ANON'
}

/** Resolve the board from `?board=` (or the POST body); default `depot`. */
function resolveBoard(req: VercelRequest): BoardId | null {
  const q = req.query?.board
  const fromQuery = Array.isArray(q) ? q[0] : q
  const fromBody =
    req.method === 'POST' && req.body && typeof req.body === 'object'
      ? (req.body as { board?: unknown }).board
      : undefined
  const raw = fromQuery ?? fromBody ?? 'depot'
  return typeof raw === 'string' && raw in BOARD_KEYS ? (raw as BoardId) : null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const board = resolveBoard(req)
    if (!board) return res.status(400).json({ error: 'invalid board' })
    const key = BOARD_KEYS[board]

    if (req.method === 'POST') {
      const body = req.body ?? {}
      const raw = Number(body.score)
      if (!Number.isFinite(raw) || raw < -100_000 || raw > 100_000) {
        return res.status(400).json({ error: 'invalid score' })
      }
      // FPS headshots score 1.5, so keep one decimal (sorted-set scores are doubles).
      const score = Math.round(raw * 10) / 10
      // Members must be unique, so tag each submission with a random id. The
      // display name is packed after a `|` (which a sanitized name can't hold).
      const name = sanitizeName(body.name)
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      await redis.zadd(key, { score, member: `${id}|${name}` })
      // Drop everything below the top KEEP highest scores.
      await redis.zremrangebyrank(key, 0, -(KEEP + 1))
    } else if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET, POST')
      return res.status(405).json({ error: 'method not allowed' })
    }

    const flat = (await redis.zrange(key, 0, DISPLAY - 1, {
      rev: true,
      withScores: true,
    })) as (string | number)[]

    // withScores returns a flat [member, score, member, score, ...] array.
    const scores: { name: string; score: number }[] = []
    for (let i = 0; i < flat.length; i += 2) {
      const member = String(flat[i])
      const bar = member.indexOf('|')
      // Legacy members written before the name change have no `|`.
      const name = bar === -1 ? 'ANON' : member.slice(bar + 1) || 'ANON'
      scores.push({ name, score: Number(flat[i + 1]) })
    }

    res.setHeader('cache-control', 'no-store')
    return res.status(200).json({ board, scores })
  } catch {
    return res.status(500).json({ error: 'leaderboard unavailable' })
  }
}
