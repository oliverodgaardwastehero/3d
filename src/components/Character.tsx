import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import { Group, MathUtils, Vector3 } from 'three'
import type { ControlName } from '../lib/controls'
import { useGame } from '../lib/store'
import { CHARACTER_RADIUS, resolveCollision } from '../lib/world'
import { WORLD_HALF_EXTENT } from '../lib/chapters'
import { applyPushFromAgent } from '../lib/knockables'
import { Humanoid, ARM_REST_Z } from './chapters/Humanoid'
import { WasteHeroBadge } from './WasteHeroBadge'

const WALK_SPEED = 4.5
const RUN_SPEED = 8.0
const JUMP_SPEED = 6
const DOUBLE_JUMP_SPEED = 5.5
const MAX_JUMPS = 2
const GRAVITY = -20
const GROUND_Y = 0
const CAMERA_OFFSET = new Vector3(0, 4.5, 7)

// Animation tuning
const RUN_CYCLE_SPEED = 9 // radians/sec at full run
const RUN_ARM_SWING = 0.95
const RUN_LEG_SWING = 0.85
const RUN_BOB_AMPLITUDE = 0.07
const RUN_LEAN = 0.12
const JUMP_ARM_RAISE = 0.55
const JUMP_LEG_TUCK = 0.55

type Props = {
  positionRef: React.RefObject<Vector3>
}

/**
 * 3rd-person walking character with procedural run/jump animations. Limb
 * rotations are written each frame to refs that the Humanoid component exposes.
 */
export function Character({ positionRef }: Props) {
  const groupRef = useRef<Group>(null)
  const velocityY = useRef(0)
  const grounded = useRef(true)
  const jumpsUsed = useRef(0)
  const wasJumpDown = useRef(false)
  const facing = useRef(Math.PI) // start facing -Z
  const lastPos = useRef(new Vector3())
  const agentVel = useRef(new Vector3())
  const [, getKeys] = useKeyboardControls<ControlName>()
  const { camera } = useThree()

  // Animation refs — Humanoid wires these into its limb groups
  const bobRef = useRef<Group>(null)
  const leftArmRef = useRef<Group>(null)
  const rightArmRef = useRef<Group>(null)
  const leftLegRef = useRef<Group>(null)
  const rightLegRef = useRef<Group>(null)

  // Animation state
  const runPhase = useRef(0)
  const runIntensity = useRef(0) // lerps 0 (idle) → 1 (full run)
  const airIntensity = useRef(0) // lerps 0 (grounded) → 1 (airborne)

  useEffect(() => {
    if (!groupRef.current) return
    groupRef.current.position.set(0, GROUND_Y, 0)
    groupRef.current.rotation.y = facing.current
    positionRef.current.copy(groupRef.current.position)
    lastPos.current.copy(groupRef.current.position)
    camera.position.set(0, CAMERA_OFFSET.y, CAMERA_OFFSET.z)
    camera.lookAt(0, 1, 0)
  }, [camera, positionRef])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return

    const hasStarted = useGame.getState().hasStarted
    const dt = Math.min(delta, 0.05)

    let isMoving = false
    let isRunning = false

    if (hasStarted) {
      const { forward, backward, left, right, jump, run } = getKeys()
      const moveX = (right ? 1 : 0) - (left ? 1 : 0)
      const moveZ = (backward ? 1 : 0) - (forward ? 1 : 0)
      const len = Math.hypot(moveX, moveZ)
      isMoving = len > 0
      isRunning = run && isMoving
      const speed = isRunning ? RUN_SPEED : WALK_SPEED

      if (isMoving) {
        const nx = moveX / len
        const nz = moveZ / len
        const tentativeX = group.position.x + nx * speed * dt
        const tentativeZ = group.position.z + nz * speed * dt
        const resolved = resolveCollision(tentativeX, tentativeZ)
        group.position.x = clamp(resolved.x, -WORLD_HALF_EXTENT + 1, WORLD_HALF_EXTENT - 1)
        group.position.z = clamp(resolved.z, -WORLD_HALF_EXTENT + 1, WORLD_HALF_EXTENT - 1)

        const targetFacing = Math.atan2(nx, nz)
        facing.current = lerpAngle(facing.current, targetFacing, 0.18)
        group.rotation.y = facing.current
      }

      // Edge-detect jump: a fresh press triggers ground-jump or air-jump.
      const jumpPressed = jump && !wasJumpDown.current
      if (jumpPressed) {
        if (grounded.current) {
          velocityY.current = JUMP_SPEED
          grounded.current = false
          jumpsUsed.current = 1
        } else if (jumpsUsed.current < MAX_JUMPS) {
          velocityY.current = DOUBLE_JUMP_SPEED
          jumpsUsed.current += 1
        }
      }
      wasJumpDown.current = jump
    } else {
      wasJumpDown.current = false
    }

    // Gravity always
    velocityY.current += GRAVITY * dt
    group.position.y += velocityY.current * dt
    if (group.position.y <= GROUND_Y) {
      group.position.y = GROUND_Y
      velocityY.current = 0
      grounded.current = true
      jumpsUsed.current = 0
    }

    positionRef.current.copy(group.position)

    // Push any knockable props the agent is overlapping. Velocity is measured
    // from this frame's actual displacement so it reflects collision-resolved
    // motion and isn't fooled by held keys against a wall.
    const invDt = dt > 0 ? 1 / dt : 0
    agentVel.current.set(
      (group.position.x - lastPos.current.x) * invDt,
      0,
      (group.position.z - lastPos.current.z) * invDt,
    )
    applyPushFromAgent(group.position, agentVel.current, CHARACTER_RADIUS, isRunning)
    lastPos.current.copy(group.position)

    // ─── Procedural animation ──────────────────────────────────────────
    const isAirborne = !grounded.current
    // Run only counts when on the ground; air takes priority
    const targetRun = isMoving && !isAirborne ? 1 : 0
    const targetAir = isAirborne ? 1 : 0

    runIntensity.current = MathUtils.lerp(runIntensity.current, targetRun, 1 - Math.exp(-12 * dt))
    airIntensity.current = MathUtils.lerp(airIntensity.current, targetAir, 1 - Math.exp(-18 * dt))

    // Advance run phase only while actually moving on the ground
    if (runIntensity.current > 0.01) {
      const cycleScale = isRunning ? 1.5 : 1
      runPhase.current += dt * RUN_CYCLE_SPEED * runIntensity.current * cycleScale
    } else {
      runPhase.current = 0
    }

    const swing = Math.sin(runPhase.current)
    const armSwing = swing * RUN_ARM_SWING * runIntensity.current
    const legSwing = swing * RUN_LEG_SWING * runIntensity.current

    // Limbs: arms and legs swing in opposite phase (left arm swings forward
    // when right leg does)
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = -armSwing + JUMP_ARM_RAISE * airIntensity.current
      // Tuck arms in slightly while running so they don't flap out
      leftArmRef.current.rotation.z = MathUtils.lerp(
        -ARM_REST_Z,
        -ARM_REST_Z * 0.4,
        runIntensity.current,
      )
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = armSwing + JUMP_ARM_RAISE * airIntensity.current
      rightArmRef.current.rotation.z = MathUtils.lerp(
        ARM_REST_Z,
        ARM_REST_Z * 0.4,
        runIntensity.current,
      )
    }
    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = legSwing + JUMP_LEG_TUCK * airIntensity.current
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = -legSwing + JUMP_LEG_TUCK * airIntensity.current
    }

    // Body bob (twice per stride) + slight forward lean while running
    if (bobRef.current) {
      const bobY = Math.abs(Math.sin(runPhase.current)) * RUN_BOB_AMPLITUDE * runIntensity.current
      bobRef.current.position.y = bobY
      bobRef.current.rotation.x = -RUN_LEAN * runIntensity.current
    }

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
      <Humanoid
        skinColor="#f5d6b8"
        shirtColor="#0c1c3a"
        pantsColor="#3f3f46"
        shoeColor="#1a1a1f"
        chestBadge={<WasteHeroBadge />}
        bobRef={bobRef}
        leftArmRef={leftArmRef}
        rightArmRef={rightArmRef}
        leftLegRef={leftLegRef}
        rightLegRef={rightLegRef}
      />
    </group>
  )
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function lerpAngle(a: number, b: number, t: number) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI
  if (diff < -Math.PI) diff += Math.PI * 2
  return a + diff * t
}
