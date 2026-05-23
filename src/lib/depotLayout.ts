// Layout + tuning for the recycling-depot minigame.
// Orientation: long east-west axis so NPCs walk left→right past the camera,
// revealing the coloured item they carry in profile.

import { addBoxCollider, clearColliders } from './world'

export type WasteType = 'cardboard' | 'plastic' | 'glass' | 'metal' | 'organic'

export type BinDef = {
  id: WasteType
  label: string
  /** Center on the floor. */
  pos: [number, number]
  /** Lid/ring colour — also colours the matching waste item. */
  color: string
}

// Yard ~20 × 14. Wider depth (Z) gives the bin row room to breathe so labels
// are readable at game-camera distance.
export const YARD = {
  halfX: 10,
  halfZ: 7,
} as const

export const BINS: BinDef[] = [
  { id: 'cardboard', label: 'CARDBOARD', pos: [8, -5.6], color: '#a07a4a' },
  { id: 'plastic',   label: 'PLASTIC',   pos: [8, -2.8], color: '#f0d040' },
  { id: 'glass',     label: 'GLASS',     pos: [8,  0],   color: '#5fc0d0' },
  { id: 'metal',     label: 'METAL',     pos: [8,  2.8], color: '#9ca3af' },
  { id: 'organic',   label: 'ORGANIC',   pos: [8,  5.6], color: '#5fa860' },
]

export function binById(id: WasteType): BinDef {
  return BINS.find((b) => b.id === id)!
}

export const GATE_HALF_WIDTH = 1.6
export const FENCE_HEIGHT = 1.4
export const FENCE_THICKNESS = 0.22

/**
 * Player spawns right in front of the bins, facing west, so they're already
 * guarding the line when NPCs enter from the gate to the left.
 */
export const DEPOT_SPAWN: [number, number] = [5, 0]
export const DEPOT_INITIAL_FACING = -Math.PI / 2 // face -X (west)

/** NPCs enter through the west gate. */
export const NPC_SPAWN_POINTS: [number, number][] = [
  [-8, -0.6],
  [-8, 0],
  [-8, 0.6],
]

export const GAME = {
  MATCH_DURATION: 60,
  MAX_NPCS_ALIVE: 5,
  /** Spawn interval at match start (relaxed) → match end (frantic). */
  SPAWN_INTERVAL_START_MIN: 2.0,
  SPAWN_INTERVAL_START_MAX: 3.2,
  SPAWN_INTERVAL_END_MIN: 0.55,
  SPAWN_INTERVAL_END_MAX: 1.1,
  NPC_WALK_SPEED: 2.0,
  NPC_LEAVE_SPEED: 3.2,
  NPC_DEPOSIT_TIME: 1.4,
  PUNCH_RADIUS: 2.8,
  PUNCH_CONE_DOT: 0.2,
  BIN_REACH: 1.0,
  /** NPCs are removed once they walk back past this X going west (out the gate). */
  LEAVE_DESPAWN_X: -11,
  WRONG_BIN_RATIO: 0.55,
} as const

// Bin body is 1.1 × 1.2 × 0.9 (W,H,D); these are the AABB half-extents used
// for player collision so you can lean against / bump the bins.
export const BIN_HALF_W = 0.55
export const BIN_HALF_D = 0.45

/** Register fence walls + gate stubs + bins on the shared collider list. */
export function registerDepotColliders() {
  clearColliders()
  const { halfX, halfZ } = YARD
  const t = FENCE_THICKNESS / 2 + 0.05

  // North fence (full)
  addBoxCollider(0, -halfZ, halfX + t, t)
  // South fence (full)
  addBoxCollider(0, halfZ, halfX + t, t)
  // East fence (full)
  addBoxCollider(halfX, 0, t, halfZ + t)
  // West fence — two segments with a gate gap centered at z = 0
  const segLen = (halfZ - GATE_HALF_WIDTH) / 2
  const segCenterOffset = halfZ - segLen
  addBoxCollider(-halfX, -segCenterOffset, t, segLen + t)
  addBoxCollider(-halfX, segCenterOffset, t, segLen + t)

  // Bins — player can lean against these but NPCs pass through (their AI
  // operates on position directly without going through resolveCollision).
  for (const b of BINS) {
    addBoxCollider(b.pos[0], b.pos[1], BIN_HALF_W, BIN_HALF_D)
  }
}
