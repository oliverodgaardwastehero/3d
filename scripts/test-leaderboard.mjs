/**
 * Live connectivity + query test for the leaderboard, against the real Upstash
 * store. Writes to a throwaway key and deletes it, so it never pollutes the
 * real board. Run with the Upstash creds loaded from .env.local:
 *
 *   node --env-file=.env.local scripts/test-leaderboard.mjs
 */
import { Redis } from '@upstash/redis'

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN

if (!url || !token) {
  console.error('Missing KV_REST_API_URL / KV_REST_API_TOKEN in .env.local')
  process.exit(1)
}

const redis = new Redis({ url, token })
const KEY = 'depot:leaderboard:selftest'

try {
  await redis.del(KEY)
  for (const score of [42, 17, 88, 5, 63, 31]) {
    await redis.zadd(KEY, { score, member: `t-${score}-${Math.random().toString(36).slice(2, 7)}` })
  }
  await redis.zremrangebyrank(KEY, 0, -101)
  const flat = await redis.zrange(KEY, 0, 4, { rev: true, withScores: true })
  const top = []
  for (let i = 1; i < flat.length; i += 2) top.push(Number(flat[i]))
  await redis.del(KEY)

  const ok = JSON.stringify(top) === JSON.stringify([88, 63, 42, 31, 17])
  console.log('✅ Connected to Upstash. Top 5 (expect 88,63,42,31,17):', top)
  console.log(ok ? '✅ Leaderboard query logic correct.' : '⚠️  Unexpected order — check zrange.')
  process.exit(ok ? 0 : 2)
} catch (e) {
  console.error('❌ Upstash request failed:', e?.message ?? e)
  process.exit(1)
}
