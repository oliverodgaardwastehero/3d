// Lightweight rigid-body physics for "knockable" props (boxes, crates, etc.).
// Each knockable owns its world-space position, velocity, quaternion and
// angular velocity. The Character calls applyPushFromAgent() each frame to
// transfer impulse on contact; KnockableBox components call stepKnockable()
// to integrate motion under gravity, friction, and ground/wall collisions.

import { Quaternion, Vector3 } from 'three'
import { resolveCollision } from './world'

export type Knockable = {
  position: Vector3 // world-space center of the box
  velocity: Vector3
  quaternion: Quaternion
  angularVelocity: Vector3 // body-space (we treat axes as world for simplicity)
  halfX: number
  halfY: number
  halfZ: number
}

const KNOCKABLES: Knockable[] = []

// Knockables rest on the chapter platform / invisible ground.
const GROUND_Y = 0.18
const GRAVITY = -16
const RESTITUTION = 0.18
const LINEAR_FRICTION = 6
const ANGULAR_FRICTION = 3.5
const SLEEP_THRESHOLD = 0.06

export function registerKnockable(k: Knockable) {
  KNOCKABLES.push(k)
  return () => {
    const idx = KNOCKABLES.indexOf(k)
    if (idx >= 0) KNOCKABLES.splice(idx, 1)
  }
}

const _r = new Vector3()
const _u = new Vector3()
const _f = new Vector3()
const _axis = new Vector3()
const _spin = new Quaternion()
const _push = new Vector3()

function worldHalfExtents(k: Knockable, out: { x: number; y: number; z: number }) {
  // Body axes in world space.
  _r.set(1, 0, 0).applyQuaternion(k.quaternion)
  _u.set(0, 1, 0).applyQuaternion(k.quaternion)
  _f.set(0, 0, 1).applyQuaternion(k.quaternion)
  out.x = Math.abs(_r.x) * k.halfX + Math.abs(_u.x) * k.halfY + Math.abs(_f.x) * k.halfZ
  out.y = Math.abs(_r.y) * k.halfX + Math.abs(_u.y) * k.halfY + Math.abs(_f.y) * k.halfZ
  out.z = Math.abs(_r.z) * k.halfX + Math.abs(_u.z) * k.halfY + Math.abs(_f.z) * k.halfZ
}

const _ext = { x: 0, y: 0, z: 0 }

export function stepKnockable(k: Knockable, dt: number) {
  // Integrate linear motion.
  k.velocity.y += GRAVITY * dt
  k.position.x += k.velocity.x * dt
  k.position.y += k.velocity.y * dt
  k.position.z += k.velocity.z * dt

  // Integrate angular motion via quaternion exponential map.
  const angSpeed = k.angularVelocity.length()
  if (angSpeed > 1e-5) {
    _axis.copy(k.angularVelocity).multiplyScalar(1 / angSpeed)
    _spin.setFromAxisAngle(_axis, angSpeed * dt)
    k.quaternion.premultiply(_spin).normalize()
  }

  // Wall collisions in XZ — share static colliders with the player.
  worldHalfExtents(k, _ext)
  const resolved = resolveCollision(k.position.x, k.position.z, _ext.x, _ext.z)
  if (resolved.x !== k.position.x) {
    k.position.x = resolved.x
    k.velocity.x *= -0.2
    k.angularVelocity.multiplyScalar(0.7)
  }
  if (resolved.z !== k.position.z) {
    k.position.z = resolved.z
    k.velocity.z *= -0.2
    k.angularVelocity.multiplyScalar(0.7)
  }

  // Ground contact — center-Y must clear the world-space half-height.
  worldHalfExtents(k, _ext)
  const minY = GROUND_Y + _ext.y
  if (k.position.y <= minY) {
    k.position.y = minY
    if (k.velocity.y < 0) k.velocity.y = -k.velocity.y * RESTITUTION
    if (Math.abs(k.velocity.y) < 0.4) k.velocity.y = 0

    const linF = Math.exp(-LINEAR_FRICTION * dt)
    k.velocity.x *= linF
    k.velocity.z *= linF
    k.angularVelocity.multiplyScalar(Math.exp(-ANGULAR_FRICTION * dt))

    if (
      Math.hypot(k.velocity.x, k.velocity.y, k.velocity.z) < SLEEP_THRESHOLD &&
      k.angularVelocity.length() < SLEEP_THRESHOLD
    ) {
      k.velocity.set(0, 0, 0)
      k.angularVelocity.set(0, 0, 0)
    }
  }
}

/**
 * Apply impulse to every knockable the agent is currently overlapping.
 * Walking nudges; running launches and tumbles.
 */
export function applyPushFromAgent(
  agentPos: Vector3,
  agentVel: Vector3,
  agentRadius: number,
  running: boolean,
) {
  const speed = Math.hypot(agentVel.x, agentVel.z)

  for (const k of KNOCKABLES) {
    worldHalfExtents(k, _ext)
    const dx = agentPos.x - k.position.x
    const dz = agentPos.z - k.position.z
    const overlapX = _ext.x + agentRadius - Math.abs(dx)
    const overlapZ = _ext.z + agentRadius - Math.abs(dz)
    if (overlapX <= 0 || overlapZ <= 0) continue

    // Vertical reach: the agent's torso extends from feet to ~1.7m. Skip boxes
    // that are airborne above shoulder height or already lying tiny on the floor.
    const boxBottom = k.position.y - _ext.y
    if (boxBottom > 1.7) continue

    // Push direction: prefer agent's current motion; otherwise shove outward.
    if (speed > 0.05) {
      _push.set(agentVel.x / speed, 0, agentVel.z / speed)
    } else {
      _push.set(-Math.sign(dx) || 0, 0, -Math.sign(dz) || 0)
      const len = Math.hypot(_push.x, _push.z) || 1
      _push.x /= len
      _push.z /= len
    }

    // Linear impulse — strength scales with player speed; running adds punch.
    const launch = (running ? 1.6 : 0.7) * Math.max(speed, running ? 5 : 2.5)
    k.velocity.x = _push.x * launch + k.velocity.x * 0.2
    k.velocity.z = _push.z * launch + k.velocity.z * 0.2
    if (k.velocity.y < (running ? 2.4 : 0.8)) {
      k.velocity.y = running ? 2.4 : 0.8
    }

    // Angular impulse — tumble around the horizontal axis perpendicular to the
    // push so the box rolls forward in the direction it was hit.
    const torque = running ? 9 : 3.5
    k.angularVelocity.x += _push.z * torque
    k.angularVelocity.z += -_push.x * torque
    k.angularVelocity.y += (Math.random() - 0.5) * (running ? 1.4 : 0.4)

    // Resolve overlap by moving the BOX out of the agent (don't snag the player).
    if (overlapX < overlapZ) {
      k.position.x -= Math.sign(dx) * overlapX
    } else {
      k.position.z -= Math.sign(dz) * overlapZ
    }
  }
}
