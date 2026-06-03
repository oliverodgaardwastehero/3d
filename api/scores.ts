import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

/**
 * Leaderboard API for "Defend the Waste Fractions".
 *
 *   GET  /api/scores   -> { scores: [{ score }, ...] }   top 5, highest first
 *   POST /api/scores   { score }  -> same shape, with the new score included
 *
 * Backed by a single Redis sorted set. ZADD is atomic, so concurrent
 * submissions never clobber each other (the whole reason this isn't a Blob).
 * ZRANGE ... REV gives the ranked top N in one O(log n + k) call.
 *
 * Needs UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (Redis.fromEnv()).
 * Add an Upstash Redis store from the Vercel dashboard and they're injected.
 */
const redis = Redis.fromEnv()

const KEY = 'depot:leaderboard'
const DISPLAY = 5 // rows returned to the client
const KEEP = 100 // cap stored entries so the set stays bounded

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'POST') {
      const score = Math.trunc(Number((req.body ?? {}).score))
      if (!Number.isFinite(score) || score < -100_000 || score > 100_000) {
        return res.status(400).json({ error: 'invalid score' })
      }
      // Sorted-set members must be unique, so tag each submission.
      const member = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      await redis.zadd(KEY, { score, member })
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
    const scores: { score: number }[] = []
    for (let i = 1; i < flat.length; i += 2) scores.push({ score: Number(flat[i]) })

    res.setHeader('cache-control', 'no-store')
    return res.status(200).json({ scores })
  } catch {
    return res.status(500).json({ error: 'leaderboard unavailable' })
  }
}
