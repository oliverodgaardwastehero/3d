import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import { Group, MathUtils, Vector3 } from 'three'
import type { ControlName } from '../lib/controls'
import { useGame } from '../lib/store'
import { CHARACTER_RADIUS, resolveCollision } from '../lib/world'
import { Avatar, KICK_DURATION, KICK_IMPACT_DELAY, type AvatarState } from './Avatar'
import { useDepot } from '../lib/depotState'
import { pushNPCsFromPlayer } from '../lib/npcBodies'
import { lerpAngle } from '../lib/math'

const WALK_SPEED = 2.8
const RUN_SPEED = 8.0
const GROUND_Y = 0
const CAMERA_OFFSET = new Vector3(0, 4.5, 7)

type Props = {
  positionRef: React.RefObject<Vector3>
  /** Initial X/Z to spawn at. Defaults to (0, 0). */
  spawn?: [number, number]
  /** Initial facing (radians around Y). Defaults to Math.PI (facing -Z). */
  initialFacing?: number
}

type Action = { state: AvatarState; until: number }

/**
 * 3rd-person walking character. Movement lives here; visuals come from baked
 * GLB animations. Punch locks the avatar into a timer-driven state.
 */
export function Character({ positionRef, spawn = [0, 0], initialFacing = Math.PI }: Props) {
  const groupRef = useRef<Group>(null)
  const wasKickDown = useRef(false)
  const action = useRef<Action | null>(null)
  const facing = useRef(initialFacing)
  // Buffered punch hit: captured on press, fired when the jab lands (on the
  // render clock, not wall time).
  const pendingHit = useRef<{
    x: number
    z: number
    fx: number
    fz: number
    at: number
  } | null>(null)
  const [, getKeys] = useKeyboardControls<ControlName>()
  const { camera } = useThree()

  const [avatarState, setAvatarState] = useState<AvatarState>('idle')

  useEffect(() => {
    if (!groupRef.current) return
    groupRef.current.position.set(spawn[0], GROUND_Y, spawn[1])
    groupRef.current.rotation.y = facing.current
    positionRef.current.copy(groupRef.current.position)
    camera.position.set(spawn[0] + CAMERA_OFFSET.x, CAMERA_OFFSET.y, spawn[1] + CAMERA_OFFSET.z)
    camera.lookAt(spawn[0], 1, spawn[1])
  }, [camera, positionRef, spawn])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return

    const hasStarted = useGame.getState().hasStarted
    const dt = Math.min(delta, 0.05)
    const now = performance.now()

    let isMoving = false
    let isRunning = false

    if (hasStarted) {
      const { forward, backward, left, right, run, kick } = getKeys()
      // Movement is locked while the kick animation is playing so the hit
      // reads as a committed action.
      const movementLocked = action.current?.state === 'kick'
      const moveX = (right ? 1 : 0) - (left ? 1 : 0)
      const moveZ = (backward ? 1 : 0) - (forward ? 1 : 0)
      const len = Math.hypot(moveX, moveZ)
      isMoving = !movementLocked && len > 0
      isRunning = run && isMoving
      const speed = isRunning ? RUN_SPEED : WALK_SPEED

      if (isMoving) {
        const nx = moveX / len
        const nz = moveZ / len
        const tentativeX = group.position.x + nx * speed * dt
        const tentativeZ = group.position.z + nz * speed * dt
        const resolved = resolveCollision(tentativeX, tentativeZ)
        group.position.x = resolved.x
        group.position.z = resolved.z

        const targetFacing = Math.atan2(nx, nz)
        facing.current = lerpAngle(facing.current, targetFacing, 0.18)
        group.rotation.y = facing.current
      }

      const kickPressed = kick && !wasKickDown.current
      // Reject re-press during the short active window so a held / spammed Space
      // doesn't queue extra hits mid-punch; the lock is brief so re-press works
      // again right after the recovery.
      if (kickPressed && action.current?.state !== 'kick') {
        action.current = { state: 'kick', until: now + KICK_DURATION * 1000 }
        pendingHit.current = {
          x: group.position.x,
          z: group.position.z,
          fx: Math.sin(facing.current),
          fz: Math.cos(facing.current),
          at: now + KICK_IMPACT_DELAY * 1000,
        }
      }
      wasKickDown.current = kick

      // Fire the buffered hit when the punch lands. Gated on the live match
      // phase so a punch in flight can't knock a standing NPC after the buzzer.
      if (pendingHit.current && now >= pendingHit.current.at) {
        const h = pendingHit.current
        pendingHit.current = null
        if (useDepot.getState().phase === 'playing') {
          useDepot.getState().registerPunch({ x: h.x, z: h.z, fx: h.fx, fz: h.fz })
        }
      }
    } else {
      wasKickDown.current = false
      pendingHit.current = null
    }

    group.position.y = GROUND_Y
    positionRef.current.copy(group.position)

    pushNPCsFromPlayer(group.position.x, group.position.z, CHARACTER_RADIUS)

    if (action.current && now >= action.current.until) action.current = null
    const next: AvatarState = action.current
      ? action.current.state
      : isRunning
        ? 'running'
        : isMoving
          ? 'walking'
          : 'idle'
    if (next !== avatarState) setAvatarState(next)

    // Camera follow
    const targetCamX = group.position.x + CAMERA_OFFSET.x
    const targetCamY = group.position.y + CAMERA_OFFSET.y
    const targetCamZ = group.position.z + CAMERA_OFFSET.z
    camera.position.x = MathUtils.lerp(camera.position.x, targetCamX, 0.1)
    camera.position.y = MathUtils.lerp(camera.position.y, targetCamY, 0.1)
    camera.position.z = MathUtils.lerp(camera.position.z, targetCamZ, 0.1)
    camera.lookAt(group.position.x, group.position.y + 1, group.position.z)
  })

  return (
    <group ref={groupRef}>
      <Avatar state={avatarState} />
    </group>
  )
}

