import type { Vector3 } from 'three'

/**
 * Lightweight registry of moving NPC "soft bodies". The player can walk into
 * them — they get pushed out of the way rather than blocking the player.
 *
 * The Character pushes any overlapping NPC outward each frame; the NPC's AI
 * can then re-target on the next frame (so a determined NPC will keep trying
 * to walk to its bin, but the player can shove them aside in transit).
 */
type NPCBody = {
  /** Mutable position ref — written directly by this module on collision. */
  position: Vector3
  radius: number
  /** When false, the body is skipped (e.g. while dying / leaving). */
  active: () => boolean
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
