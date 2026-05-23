// Open-world collision helpers. Each diorama can register AABB colliders so the
// 3rd-person character can't walk through walls. The list is built at module
// load by collecting per-chapter colliders.

import { CHAPTER_POSITION } from './chapters'

// Wider than the old capsule because the new humanoid has stub arms sticking out.
export const CHARACTER_RADIUS = 0.55

type AABB = {
  cx: number
  cz: number
  halfW: number
  halfD: number
}

const COLLIDERS: AABB[] = []

/**
 * Garage diorama colliders. Defined in garage-local coords (relative to the
 * Chapter 1 position) so moving the diorama only requires editing
 * CHAPTER_POSITION. The garage opens toward +Z; the player walks in from there.
 */
function buildGarageColliders() {
  const [gx, gz] = CHAPTER_POSITION.ch1 // (0, -28)
  const halfW = 5.5
  const halfD = 4.0
  const wallThickness = 0.4

  // Each entry is a footprint AABB in garage-local space.
  const local = [
    // ── Architecture ────────────────────────────────────────────
    // Back wall
    { rx: 0, rz: -halfD - wallThickness / 2, hw: halfW + wallThickness / 2, hd: wallThickness / 2 },
    // Left wall
    { rx: -halfW - wallThickness / 2, rz: 0, hw: wallThickness / 2, hd: halfD },
    // Right wall
    { rx: halfW + wallThickness / 2, rz: 0, hw: wallThickness / 2, hd: halfD },

    // ── Furniture ───────────────────────────────────────────────
    // Workbench (along the back wall)
    { rx: 0, rz: -halfD + 0.6, hw: 4.0, hd: 0.5 },
    // Stool + seated Woz (one combined footprint, since Woz is wider than the stool)
    { rx: -1.0, rz: -halfD + 1.6, hw: 0.45, hd: 0.45 },

    // ── Standing characters ─────────────────────────────────────
    // Jobs (chibi body footprint)
    { rx: 1.4, rz: -halfD + 2.4, hw: 0.4, hd: 0.35 },

    // ── Props ───────────────────────────────────────────────────
    // (APPLE I box stack is now a knockable rigid body — see KnockableBox)
    // Info plinth out front
    { rx: 0, rz: halfD + 1.4, hw: 0.7, hd: 0.2 },
  ]

  for (const c of local) {
    COLLIDERS.push({ cx: gx + c.rx, cz: gz + c.rz, halfW: c.hw, halfD: c.hd })
  }
}

// Garage colliders are inactive while the office tour is the active scene.
// Office walls are registered dynamically via addBoxCollider().
void buildGarageColliders

export function clearColliders() {
  COLLIDERS.length = 0
}

export function addBoxCollider(cx: number, cz: number, halfW: number, halfD: number) {
  COLLIDERS.push({ cx, cz, halfW, halfD })
}

/**
 * Push (x, z) outside any registered collider footprint, accounting for the
 * caller's footprint. Minimum-translation-vector resolution. The agent can be a
 * point (use defaults) or any rigid body with explicit half-extents.
 */
export function resolveCollision(
  x: number,
  z: number,
  halfX: number = CHARACTER_RADIUS,
  halfZ: number = CHARACTER_RADIUS,
): { x: number; z: number } {
  let nx = x
  let nz = z
  for (const c of COLLIDERS) {
    const halfW = c.halfW + halfX
    const halfD = c.halfD + halfZ
    const dx = nx - c.cx
    const dz = nz - c.cz
    if (Math.abs(dx) < halfW && Math.abs(dz) < halfD) {
      const overX = halfW - Math.abs(dx)
      const overZ = halfD - Math.abs(dz)
      if (overX < overZ) {
        nx += Math.sign(dx || 1) * overX
      } else {
        nz += Math.sign(dz || 1) * overZ
      }
    }
  }
  return { x: nx, z: nz }
}
