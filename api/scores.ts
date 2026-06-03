import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

/**
 * Leaderboard API for "Defend the Waste Fractions".
 *
 *   GET  /api/scores         -> { scores: [{ name, score }, ...] }  top 5
 *   POST /api/scores { score, name } -> same shape, with the new score included
 *
 * Backed by a single Redis sorted set. ZADD is atomic, so concurrent
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

const KEY = 'depot:leaderboard'
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'POST') {
      const body = req.body ?? {}
      const score = Math.trunc(Number(body.score))
      if (!Number.isFinite(score) || score < -100_000 || score > 100_000) {
        return res.status(400).json({ error: 'invalid score' })
      }
      // Members must be unique, so tag each submission with a random id. The
      // display name is packed after a `|` (which a sanitized name can't hold).
      const name = sanitizeName(body.name)
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      await redis.zadd(KEY, { score, member: `${id}|${name}` })
      // Drop everything below the top KEEP highest scores.
      await redis.zremrangebyrank(KEY, 0, -(KEEP + 1))
    } else if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET, POST')
      return res.status(405).json({ error: 'method not allowed' })
    }

    const flat = (await redis.zrange(KEY, 0, DISPLAY - 1, {
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
    return res.status(200).json({ scores })
  } catch {
    return res.status(500).json({ error: 'leaderboard unavailable' })
  }
}
