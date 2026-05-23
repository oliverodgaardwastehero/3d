import { useFrame } from '@react-three/fiber'
import type { RefObject } from 'react'
import { useEffect, useRef } from 'react'
import { Group, Vector3 } from 'three'
import { Humanoid, ARM_REST_Z } from '../chapters/Humanoid'
import { SPAWN } from '../../lib/officeLayout'
import { lerpAngle } from '../../lib/math'

const FOLLOW_DIST_MIN = 2.4
const FOLLOW_SLOWDOWN_DIST = 4.0
const FOLLOW_DIST_MAX = 12 // teleport in if the player blinks too far away
const FOLLOW_SPEED = 3.4
const WALK_CYCLE_RATE = 8

type Props = {
  playerRef: RefObject<Vector3>
}

/**
 * Office tour guide. Follows the player at a polite distance and faces them
 * when standing still. Uses the existing Humanoid for visuals.
 */
export function GuideNPC({ playerRef }: Props) {
  const groupRef = useRef<Group>(null)
  const leftArmRef = useRef<Group>(null)
  const rightArmRef = useRef<Group>(null)
  const leftLegRef = useRef<Group>(null)
  const rightLegRef = useRef<Group>(null)
  const walkPhase = useRef(0)
  const facing = useRef(0)

  useEffect(() => {
    if (!groupRef.current) return
    groupRef.current.position.set(SPAWN[0] + 1.6, 0, SPAWN[1] + 0.4)
  }, [])

  useFrame((_, delta) => {
    const g = groupRef.current
    if (!g) return
    const dt = Math.min(delta, 0.05)
    const playerPos = playerRef.current
    if (!playerPos) return

    const dx = playerPos.x - g.position.x
    const dz = playerPos.z - g.position.z
    const dist = Math.hypot(dx, dz)

    let moving = false
    if (dist > FOLLOW_DIST_MAX) {
      // Catch up instantly if the player teleported.
      g.position.set(playerPos.x - 1.5, 0, playerPos.z - 1.5)
    } else if (dist > FOLLOW_DIST_MIN) {
      const nx = dx / dist
      const nz = dz / dist
      // Ease the speed down inside FOLLOW_SLOWDOWN_DIST so the guide drifts
      // to a stop instead of skidding.
      const speedT = Math.min(1, (dist - FOLLOW_DIST_MIN) / (FOLLOW_SLOWDOWN_DIST - FOLLOW_DIST_MIN))
      const step = FOLLOW_SPEED * speedT * dt
      g.position.x += nx * step
      g.position.z += nz * step
      moving = step > 0.001
      if (moving) {
        facing.current = lerpAngle(facing.current, Math.atan2(nx, nz), 0.18)
        g.rotation.y = facing.current
        walkPhase.current += dt * WALK_CYCLE_RATE * Math.min(1, speedT + 0.2)
      }
    } else {
      // Stationary: face the player.
      const targetFace = Math.atan2(dx, dz)
      facing.current = lerpAngle(facing.current, targetFace, 0.08)
      g.rotation.y = facing.current
    }

    const intensity = moving ? 1 : 0
    const swing = Math.sin(walkPhase.current) * 0.8 * intensity
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = -swing
      leftArmRef.current.rotation.z = -ARM_REST_Z
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = swing
      rightArmRef.current.rotation.z = ARM_REST_Z
    }
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing * 0.9
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing * 0.9
  })

  return (
    <group ref={groupRef}>
      <Humanoid
        skinColor="#f0c89e"
        shirtColor="#7c3aed"
        pantsColor="#1f2937"
        hasHair
        hasGlasses
        hairColor="#3a2418"
        leftArmRef={leftArmRef}
        rightArmRef={rightArmRef}
        leftLegRef={leftLegRef}
        rightLegRef={rightLegRef}
      />
    </group>
  )
}

