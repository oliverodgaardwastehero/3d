/**
 * Interpolate the *shorter* path between two angles in radians. Both inputs
 * are normalised so going from 350° → 10° passes through 360° (not the long
 * way round). t = 0 returns a, t = 1 returns b.
 */
export function lerpAngle(a: number, b: number, t: number) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI
  if (diff < -Math.PI) diff += Math.PI * 2
  return a + diff * t
}
