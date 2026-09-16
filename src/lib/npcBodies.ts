import type { Vector3 } from 'three'

/**
 * Lightweight registry of moving NPC "soft bodies". The player can walk into
 * them — they get pushed out of the way rather than blocking the player — and
 * in FPS mode hit-scan shots are tested against the same bodies.
 *
 * The Character pushes any overlapping NPC outward each frame; the NPC's AI
 * can then re-target on the next frame (so a determined NPC will keep trying
 * to walk to its bin, but the player can shove them aside in transit).
 */
export type HitOutcome = 'good' | 'bad'
/** Which part of the walker a shot connected with. Headshots score more. */
export type HitZone = 'head' | 'body'

/**
 * Hitbox model matching the chibi Humanoid at scale 1 (origin at the feet):
 * a body cylinder up to the shoulders plus a head sphere on top. Head sphere =
 * the Humanoid's head (r 0.34 @ y 1.6) padded a touch for the hair cap.
 */
export const HITBOX = {
  BODY_TOP: 1.4,
  HEAD_Y: 1.6,
  HEAD_R: 0.36,
} as const

export type NPCBody = {
  /** Mutable position ref — written directly by this module on collision. */
  position: Vector3
  /** Footprint radius (shove + body-cylinder hit test), in metres. */
  radius: number
  /** Uniform body scale (0.9–1.12); the hitbox model is multiplied by it. */
  scale: number
  /** When false, the body is skipped (e.g. while dying / leaving). */
  active: () => boolean
  /**
   * FPS mode: the body was shot. `dirX/dirZ` is the horizontal direction the
   * shot was travelling (for knockback). Returns whether that was the right
   * call (`good` = wrong-bin walker stopped, `bad` = good citizen shot).
   */
  onHit?: (dirX: number, dirZ: number, zone: HitZone) => HitOutcome
}

const BODIES: NPCBody[] = []

export function registerNPCBody(body: NPCBody): () => void {
  BODIES.push(body)
  return () => {
    const i = BODIES.indexOf(body)
    if (i >= 0) BODIES.splice(i, 1)
  }
}

/**
 * Push NPCs out of the player's footprint. Player position is unchanged —
 * NPCs absorb the displacement so the player "shoves" them aside.
 */
export function pushNPCsFromPlayer(
  playerX: number,
  playerZ: number,
  playerRadius: number,
) {
  for (const b of BODIES) {
    if (!b.active()) continue
    const dx = b.position.x - playerX
    const dz = b.position.z - playerZ
    const dist = Math.hypot(dx, dz)
    const minDist = playerRadius + b.radius
    if (dist >= minDist) continue
    if (dist < 0.0001) {
      // Identical position — pick an arbitrary direction.
      b.position.x += minDist
      continue
    }
    const overlap = minDist - dist
    const nx = dx / dist
    const nz = dz / dist
    b.position.x += nx * overlap
    b.position.z += nz * overlap
  }
}

export function clearNPCBodies() {
  BODIES.length = 0
}

export type NPCRayHit = {
  body: NPCBody
  /** Ray parameter (= metres along a unit direction). */
  distance: number
  zone: HitZone
}

/**
 * Ray (unit `dir`) vs. a vertical capped cylinder of radius `r` and height `h`
 * whose base centre is at (cx, cy, cz). Returns the ray parameter or -1.
 */
function rayCylinder(
  origin: Vector3,
  dir: Vector3,
  cx: number,
  cy: number,
  cz: number,
  r: number,
  h: number,
): number {
  const ox = origin.x - cx
  const oy = origin.y - cy
  const oz = origin.z - cz

  // Side wall, in the XZ plane.
  const a = dir.x * dir.x + dir.z * dir.z
  if (a < 1e-8) return -1 // looking straight up/down — ignore
  const bq = 2 * (ox * dir.x + oz * dir.z)
  const c = ox * ox + oz * oz - r * r
  const disc = bq * bq - 4 * a * c
  if (disc < 0) return -1
  const t = (-bq - Math.sqrt(disc)) / (2 * a) // nearer wall
  const yWall = oy + dir.y * t
  if (t >= 0 && yWall >= 0 && yWall <= h) return t

  // Missed the wall inside the height band — try the top cap.
  if (dir.y === 0) return -1
  const tc = (h - oy) / dir.y
  if (tc < 0) return -1
  const px = ox + dir.x * tc
  const pz = oz + dir.z * tc
  return px * px + pz * pz <= r * r ? tc : -1
}

/** Ray (unit `dir`) vs. a sphere. Returns the nearer ray parameter ≥ 0, or -1. */
function raySphere(
  origin: Vector3,
  dir: Vector3,
  cx: number,
  cy: number,
  cz: number,
  r: number,
): number {
  const ox = origin.x - cx
  const oy = origin.y - cy
  const oz = origin.z - cz
  const bq = 2 * (ox * dir.x + oy * dir.y + oz * dir.z)
  const c = ox * ox + oy * oy + oz * oz - r * r
  const disc = bq * bq - 4 * c
  if (disc < 0) return -1
  const sq = Math.sqrt(disc)
  const t0 = (-bq - sq) / 2
  if (t0 >= 0) return t0
  const t1 = (-bq + sq) / 2
  return t1 >= 0 ? t1 : -1
}

/**
 * Hit-scan: find the nearest active NPC body part along a ray. Each walker is
 * a body cylinder (footprint radius × BODY_TOP) with a head sphere on top, both
 * scaled by the walker's body scale. `dir` must be normalised. Analytic — no
 * three.js Raycaster / mesh traversal, so it's cheap enough to run every frame
 * for the crosshair hover highlight.
 */
export function raycastNPCBodies(
  origin: Vector3,
  dir: Vector3,
  maxDist = 60,
  radiusPad = 0,
): NPCRayHit | null {
  let best: NPCRayHit | null = null

  for (const b of BODIES) {
    if (!b.active()) continue
    const s = b.scale
    const { x, y, z } = b.position

    const tBody = rayCylinder(origin, dir, x, y, z, b.radius + radiusPad, HITBOX.BODY_TOP * s)
    const tHead = raySphere(
      origin,
      dir,
      x,
      y + HITBOX.HEAD_Y * s,
      z,
      HITBOX.HEAD_R * s + radiusPad,
    )

    // Nearest part of this walker wins (neck/shoulder overlap goes to whichever
    // surface the ray reaches first).
    let t = -1
    let zone: HitZone = 'body'
    if (tBody >= 0) t = tBody
    if (tHead >= 0 && (t < 0 || tHead < t)) {
      t = tHead
      zone = 'head'
    }
    if (t < 0 || t > maxDist) continue
    if (!best || t < best.distance) best = { body: b, distance: t, zone }
  }

  return best
}
