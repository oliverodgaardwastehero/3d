import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Group, MathUtils, Vector3 } from 'three'
import { binById, GAME, type WasteType } from '../../lib/depotLayout'
import { useDepot } from '../../lib/depotState'
import { registerNPCBody } from '../../lib/npcBodies'
import { Humanoid, ARM_REST_Z } from '../chapters/Humanoid'
import { lerpAngle } from '../../lib/math'
import { WasteItem } from './WasteItem'

const NPC_BODY_RADIUS = 0.5
const FALL_DURATION = 0.55 // seconds for the tip-over animation
const KNOCKBACK_DISTANCE = 2.0 // meters the body slides while falling

export type WasteNPCInit = {
  id: number
  startX: number
  startZ: number
  wasteType: WasteType
  /** Which bin this NPC is walking toward — may differ from wasteType.matching. */
  targetBinId: WasteType
  skinColor: string
  shirtColor: string
  pantsColor: string
  /** Body scale jitter (0.9 – 1.1) so the crowd feels varied. */
  scale: number
  /** Starting walk-cycle phase so all NPCs aren't lockstep. */
  walkPhaseOffset: number
}

type Props = WasteNPCInit & {
  onRemove: (id: number) => void
  /** Fired once when the NPC stops counting as a live spawn slot. */
  onFall?: (id: number) => void
}

type Phase = 'approaching' | 'depositing' | 'leaving' | 'falling' | 'fallen'

export function WasteNPC({
  id,
  startX,
  startZ,
  wasteType,
  targetBinId,
  skinColor,
  shirtColor,
  pantsColor,
  scale,
  walkPhaseOffset,
  onRemove,
  onFall,
}: Props) {
  const groupRef = useRef<Group>(null)
  const pitchRef = useRef<Group>(null)
  const itemRef = useRef<Group>(null)
  const leftArmRef = useRef<Group>(null)
  const rightArmRef = useRef<Group>(null)
  const leftLegRef = useRef<Group>(null)
  const rightLegRef = useRef<Group>(null)

  const phase = useRef<Phase>('approaching')
  const phaseT = useRef(0)
  const walkPhase = useRef(walkPhaseOffset)
  const facing = useRef(Math.PI / 2)

  const leaveDir = useRef(new Vector3(0, 0, 0))
  // Knockback state, set on hit and consumed during the falling phase.
  const knockDirX = useRef(0)
  const knockDirZ = useRef(0)
  const knockSlideProgress = useRef(0)

  useEffect(() => {
    const g = groupRef.current
    if (!g) return
    g.position.set(startX, 0, startZ)
    g.rotation.y = Math.PI / 2 // face +X (east) toward bins
    g.scale.setScalar(scale)
    facing.current = Math.PI / 2
  }, [startX, startZ, scale])

  // Register a soft body so the player can shove this NPC aside. Skips
  // corpses (falling / fallen) so other NPCs walk through them freely.
  useEffect(() => {
    const g = groupRef.current
    if (!g) return
    return registerNPCBody({
      position: g.position,
      radius: NPC_BODY_RADIUS,
      active: () =>
        phase.current !== 'falling' && phase.current !== 'fallen',
    })
  }, [])

  // React to punch pulses.
  useEffect(() => {
    const unsub = useDepot.subscribe((state, prev) => {
      if (state.punchPulse === prev.punchPulse) return
      if (phase.current === 'falling' || phase.current === 'fallen') return
      const g = groupRef.current
      const punch = state.lastPunch
      if (!g || !punch) return

      const dx = g.position.x - punch.x
      const dz = g.position.z - punch.z
      const dist = Math.hypot(dx, dz)
      if (dist > GAME.PUNCH_RADIUS) return
      const toX = dx / Math.max(0.0001, dist)
      const toZ = dz / Math.max(0.0001, dist)
      const dot = toX * punch.fx + toZ * punch.fz
      if (dot < GAME.PUNCH_CONE_DOT) return

      phase.current = 'falling'
      phaseT.current = 0

      // Knockback direction = vector from player to NPC (away from the hit).
      knockDirX.current = toX
      knockDirZ.current = toZ
      knockSlideProgress.current = 0

      // Rotate the body to face the knockback direction so the pitch-forward
      // fall sends the head outward in the same direction as the slide.
      const knockFacing = Math.atan2(toX, toZ)
      facing.current = knockFacing
      g.rotation.y = knockFacing

      onFall?.(id)
      if (targetBinId !== wasteType) {
        useDepot.getState().registerWrongStop()
      } else {
        useDepot.getState().registerRightStop()
      }
    })
    return unsub
  }, [id, onFall, targetBinId, wasteType])

  useFrame((_, delta) => {
    const g = groupRef.current
    if (!g) return
    const dt = Math.min(delta, 0.05)
    phaseT.current += dt

    const target = binById(targetBinId)

    if (phase.current === 'approaching') {
      const dx = target.pos[0] - g.position.x
      const dz = target.pos[1] - g.position.z
      const d = Math.hypot(dx, dz)
      if (d <= GAME.BIN_REACH) {
        phase.current = 'depositing'
        phaseT.current = 0
      } else {
        const nx = dx / d
        const nz = dz / d
        const step = GAME.NPC_WALK_SPEED * dt
        g.position.x += nx * step
        g.position.z += nz * step
        facing.current = lerpAngle(facing.current, Math.atan2(nx, nz), 0.15)
        g.rotation.y = facing.current
        walkPhase.current += dt * 8
      }
    } else if (phase.current === 'depositing') {
      const t = MathUtils.clamp(phaseT.current / GAME.NPC_DEPOSIT_TIME, 0, 1)
      if (itemRef.current) {
        itemRef.current.position.y = MathUtils.lerp(0.92, 0.6, t)
        itemRef.current.position.z = MathUtils.lerp(0.42, 0.05, t)
        const s = MathUtils.lerp(1, 0.55, t)
        itemRef.current.scale.set(s, s, s)
      }
      if (phaseT.current >= GAME.NPC_DEPOSIT_TIME) {
        if (targetBinId !== wasteType) {
          useDepot.getState().registerWrongDeposit(targetBinId)
        } else {
          useDepot.getState().registerCorrectDeposit(targetBinId)
        }
        // Turn around and head back west out the gate.
        leaveDir.current.set(-1, 0, 0)
        phase.current = 'leaving'
        phaseT.current = 0
      }
    } else if (phase.current === 'leaving') {
      const step = GAME.NPC_LEAVE_SPEED * dt
      g.position.x += leaveDir.current.x * step
      g.position.z += leaveDir.current.z * step
      facing.current = lerpAngle(
        facing.current,
        Math.atan2(leaveDir.current.x, leaveDir.current.z),
        0.15,
      )
      g.rotation.y = facing.current
      walkPhase.current += dt * 8
      if (g.position.x < GAME.LEAVE_DESPAWN_X) onRemove(id)
    } else if (phase.current === 'falling') {
      // Tip forward (head dives in the direction the NPC was facing) over
      // FALL_DURATION seconds. Smoothstep makes the start slow, then snaps
      // toward the ground.
      const t = MathUtils.clamp(phaseT.current / FALL_DURATION, 0, 1)
      const eased = t * t * (3 - 2 * t)
      if (pitchRef.current) {
        pitchRef.current.rotation.x = (eased * Math.PI) / 2
      }
      // Knockback slide: ease-out cubic from 0 to KNOCKBACK_DISTANCE over the
      // fall window. Applied as a per-frame delta so we never overshoot.
      const slideEased = 1 - Math.pow(1 - t, 3)
      const targetSlide = KNOCKBACK_DISTANCE * slideEased
      const deltaSlide = targetSlide - knockSlideProgress.current
      knockSlideProgress.current = targetSlide
      g.position.x += knockDirX.current * deltaSlide
      g.position.z += knockDirZ.current * deltaSlide
      if (t >= 1) {
        phase.current = 'fallen'
      }
    }
    // 'fallen' is intentionally a no-op — body stays where it dropped.

    // Item visibility: shown only while carrying / depositing.
    if (itemRef.current) {
      itemRef.current.visible =
        phase.current === 'approaching' || phase.current === 'depositing'
    }

    // Limb animation. Three regimes:
    //   - approaching / depositing: arms locked in a "holding" pose around
    //     the carried item; legs still walk during approach.
    //   - leaving: no item; arms + legs swing in step.
    //   - falling / fallen: frozen.
    if (phase.current !== 'falling' && phase.current !== 'fallen') {
      const holdingItem =
        phase.current === 'approaching' || phase.current === 'depositing'
      const legsSwinging =
        phase.current === 'approaching' || phase.current === 'leaving'
      const swing = Math.sin(walkPhase.current) * 0.8

      if (holdingItem) {
        // Forward + inward cradle. NEGATIVE rotation.x tilts the arm toward
        // local +Z (the Humanoid's actual front). Then a small inward Z tilt
        // brings hands together: left needs +Z (it's at -X shoulder),
        // right needs -Z.
        if (leftArmRef.current) {
          leftArmRef.current.rotation.x = -1.2
          leftArmRef.current.rotation.z = 0.55
        }
        if (rightArmRef.current) {
          rightArmRef.current.rotation.x = -1.2
          rightArmRef.current.rotation.z = -0.55
        }
      } else {
        // Free arms swing opposite to legs while walking out.
        const armSwing = legsSwinging ? swing : 0
        if (leftArmRef.current) {
          leftArmRef.current.rotation.x = -armSwing
          leftArmRef.current.rotation.z = -ARM_REST_Z
        }
        if (rightArmRef.current) {
          rightArmRef.current.rotation.x = armSwing
          rightArmRef.current.rotation.z = ARM_REST_Z
        }
      }

      const legSwing = legsSwinging ? swing : 0
      if (leftLegRef.current) leftLegRef.current.rotation.x = legSwing * 0.9
      if (rightLegRef.current) rightLegRef.current.rotation.x = -legSwing * 0.9
    }
  })

  return (
    <group ref={groupRef}>
      <group ref={pitchRef}>
        <Humanoid
          skinColor={skinColor}
          shirtColor={shirtColor}
          pantsColor={pantsColor}
          leftArmRef={leftArmRef}
          rightArmRef={rightArmRef}
          leftLegRef={leftLegRef}
          rightLegRef={rightLegRef}
        />
        <group ref={itemRef} position={[0, 0.92, 0.42]}>
          <WasteItem type={wasteType} />
        </group>
      </group>
    </group>
  )
}

