import { useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Group, MathUtils, Mesh, Vector3 } from 'three'
import { Billboard, Text } from '@react-three/drei'
import { binById, BINS, GAME, type WasteType } from '../../lib/depotLayout'
import { useDepot } from '../../lib/depotState'
import { registerNPCBody, type HitOutcome, type HitZone } from '../../lib/npcBodies'
import { Humanoid, ARM_REST_Z } from '../chapters/Humanoid'
import { lerpAngle } from '../../lib/math'
import { WasteItem } from './WasteItem'

const NPC_BODY_RADIUS = 0.5
const FALL_DURATION = 0.55 // seconds for the tip-over animation
const KNOCKBACK_DISTANCE = 2.0 // meters the body slides while falling

// Floating ✓ / ✗ (or the headshot bonus) shown over a stopped NPC.
const FB_DURATION = 1.0 // seconds
const FB_START_Y = 2.0
const FB_END_Y = 3.3
const FB_GOOD_COLOR = '#34d399' // stopped a wrong-bin NPC (good stop)
const FB_HEAD_COLOR = '#fcd34d' // ...with a headshot (bonus points)
const FB_BAD_COLOR = '#f87171' // stopped a right-bin NPC (mistake)

type PunchFeedback = { kind: HitOutcome; zone: HitZone }

const fmtPoints = (n: number) => (Number.isInteger(n) ? `+${n}` : `+${n.toFixed(1)}`)

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
  hairColor: string
  hasHair: boolean
  hasGlasses: boolean
  /** Torso/shoulder width multiplier for body-type variety. */
  girth: number
  /** Body scale jitter (0.9 – 1.1) so the crowd feels varied. */
  scale: number
  /** Starting walk-cycle phase so all NPCs aren't lockstep. */
  walkPhaseOffset: number
  /**
   * Seconds into the approach at which this NPC swerves to a different bin,
   * or null to never swerve. ~10% of NPCs are flagged at spawn.
   */
  switchTargetAt: number | null
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
  hairColor,
  hasHair,
  hasGlasses,
  girth,
  scale,
  walkPhaseOffset,
  switchTargetAt,
  onRemove,
  onFall,
}: Props) {
  const groupRef = useRef<Group>(null)
  const pitchRef = useRef<Group>(null)
  const bobRef = useRef<Group>(null)
  const itemRef = useRef<Group>(null)
  const leftArmRef = useRef<Group>(null)
  const rightArmRef = useRef<Group>(null)
  const leftLegRef = useRef<Group>(null)
  const rightLegRef = useRef<Group>(null)
  // Spawn scale-in progress (0 → 1) and a one-shot guard for disabling corpse
  // shadow casting once the body has settled.
  const spawnT = useRef(0)
  const shadowsOff = useRef(false)

  // Floating ✓/✗ feedback shown when this NPC is punched / shot.
  const [punchFb, setPunchFb] = useState<PunchFeedback | null>(null)
  const fbGroupRef = useRef<Group>(null)
  const fbTextRef = useRef<Mesh>(null)
  const fbStart = useRef(0)

  const phase = useRef<Phase>('approaching')
  const phaseT = useRef(0)
  const walkPhase = useRef(walkPhaseOffset)
  const facing = useRef(Math.PI / 2)
  // The bin this NPC is currently walking toward. Mutable so a swerving NPC can
  // repick mid-approach; all movement + scoring read this, not the initial prop.
  const targetBinRef = useRef<WasteType>(targetBinId)
  const switchedRef = useRef(false)

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
    g.scale.setScalar(scale * 0.6) // grows to full in the frame loop (spawn pop-in fix)
    facing.current = Math.PI / 2
  }, [startX, startZ, scale])

  /**
   * Knock this walker down. Shared by both ways of stopping them — the
   * 3rd-person kick (cone test on punch pulses) and the FPS blaster (hit-scan
   * via the body registry). `toX/toZ` is the horizontal direction the body is
   * thrown; `zone` is what was hit (a headshot on a wrong-bin walker scores
   * the bonus). Books the score and returns whether the stop was the right call.
   */
  const knockDown = useCallback(
    (toX: number, toZ: number, zone: HitZone = 'body'): HitOutcome => {
      const g = groupRef.current
      phase.current = 'falling'
      phaseT.current = 0

      // Knockback direction (away from the hit).
      knockDirX.current = toX
      knockDirZ.current = toZ
      knockSlideProgress.current = 0

      // Rotate the body to face the knockback direction so the pitch-forward
      // fall sends the head outward in the same direction as the slide.
      const knockFacing = Math.atan2(toX, toZ)
      facing.current = knockFacing
      if (g) g.rotation.y = knockFacing

      onFall?.(id)
      // Wrong-bin NPC → stopping them is the correct play (✓, +1). Right-bin
      // NPC → you stopped a good citizen (✗, -1). Reads the *current* target so
      // a swerved NPC scores by where they're actually headed now.
      const good = targetBinRef.current !== wasteType
      if (good) {
        useDepot
          .getState()
          .registerWrongStop(zone === 'head' ? GAME.POINTS_HEADSHOT : GAME.POINTS_STOP)
      } else {
        useDepot.getState().registerRightStop()
      }
      fbStart.current = performance.now()
      setPunchFb({ kind: good ? 'good' : 'bad', zone })
      return good ? 'good' : 'bad'
    },
    [id, onFall, wasteType],
  )

  // Register a soft body so the player can shove this NPC aside, and so FPS
  // shots can find it (body cylinder + head sphere, see lib/npcBodies HITBOX).
  // Skips corpses (falling / fallen) so other NPCs walk through them freely
  // and shots pass over them.
  useEffect(() => {
    const g = groupRef.current
    if (!g) return
    return registerNPCBody({
      position: g.position,
      radius: NPC_BODY_RADIUS,
      scale,
      active: () =>
        phase.current !== 'falling' && phase.current !== 'fallen',
      onHit: knockDown,
    })
  }, [knockDown, scale])

  // React to punch pulses (3rd-person kick mode).
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

      knockDown(toX, toZ)
    })
    return unsub
  }, [knockDown])

  useFrame((_, delta) => {
    const g = groupRef.current
    if (!g) return
    // FPS mode freezes the yard while the pointer isn't locked.
    if (useDepot.getState().paused) return
    const dt = Math.min(delta, 0.05)
    phaseT.current += dt

    // Spawn scale-in so NPCs grow in at the gate instead of popping to full size.
    if (spawnT.current < 1) {
      spawnT.current = Math.min(1, spawnT.current + dt / 0.35)
      const e = spawnT.current * spawnT.current * (3 - 2 * spawnT.current)
      g.scale.setScalar(scale * (0.6 + 0.4 * e))
    }

    if (phase.current === 'approaching') {
      // ~10% of NPCs change their mind once, mid-approach, and head for a
      // different bin. The facing-lerp below turns the body smoothly, so it
      // reads as a deliberate swerve rather than a snap.
      if (
        !switchedRef.current &&
        switchTargetAt != null &&
        phaseT.current >= switchTargetAt
      ) {
        switchedRef.current = true
        const others = BINS.filter((b) => b.id !== targetBinRef.current)
        targetBinRef.current = others[Math.floor(Math.random() * others.length)].id
      }
      const target = binById(targetBinRef.current)
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
        const finalBin = targetBinRef.current
        if (finalBin !== wasteType) {
          useDepot.getState().registerWrongDeposit(finalBin)
        } else {
          useDepot.getState().registerCorrectDeposit(finalBin)
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
      // Limbs flail as the body tips so it reads as a knockdown, not a plank.
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = 1.5 * eased
        leftArmRef.current.rotation.z = -ARM_REST_Z - 0.5 * eased
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = 1.2 * eased
        rightArmRef.current.rotation.z = ARM_REST_Z + 0.6 * eased
      }
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0.8 * eased
      if (rightLegRef.current) rightLegRef.current.rotation.x = -0.5 * eased
      // Cancel the walk bob so the corpse lies flat.
      if (bobRef.current) {
        bobRef.current.position.y = 0
        bobRef.current.rotation.y = 0
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
        // A grounded corpse contributes nothing useful to the shadow pass —
        // drop its shadow casters (~half its render cost) for the rest of the match.
        if (!shadowsOff.current) {
          shadowsOff.current = true
          g.traverse((o) => {
            const m = o as Mesh
            if (m.isMesh) m.castShadow = false
          })
        }
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

      // Footfall bounce + torso counter-twist so the walk doesn't glide flat.
      if (bobRef.current) {
        if (legsSwinging) {
          bobRef.current.position.y = Math.abs(Math.sin(walkPhase.current * 2)) * 0.04
          bobRef.current.rotation.y = Math.sin(walkPhase.current) * 0.06
        } else {
          bobRef.current.position.y = 0
          bobRef.current.rotation.y = 0
        }
      }
    }

    // Floating ✓/✗ over a punched NPC: rise + fade.
    if (fbStart.current > 0 && fbGroupRef.current) {
      const ft = MathUtils.clamp(
        (performance.now() - fbStart.current) / (FB_DURATION * 1000),
        0,
        1,
      )
      const eased = 1 - Math.pow(1 - ft, 3)
      fbGroupRef.current.visible = ft < 1
      fbGroupRef.current.position.y = MathUtils.lerp(FB_START_Y, FB_END_Y, eased)
      const mat = fbTextRef.current?.material as { opacity?: number } | undefined
      if (mat) mat.opacity = ft < 0.12 ? ft / 0.12 : 1 - (ft - 0.12) / 0.88
      if (ft >= 1) fbStart.current = 0
    }
  })

  return (
    <group ref={groupRef}>
      <group ref={pitchRef}>
        <Humanoid
          skinColor={skinColor}
          shirtColor={shirtColor}
          pantsColor={pantsColor}
          hairColor={hairColor}
          hasHair={hasHair}
          hasGlasses={hasGlasses}
          girth={girth}
          outline
          bobRef={bobRef}
          leftArmRef={leftArmRef}
          rightArmRef={rightArmRef}
          leftLegRef={leftLegRef}
          rightLegRef={rightLegRef}
        />
        <group ref={itemRef} position={[0, 0.92, 0.42]}>
          <WasteItem type={wasteType} />
        </group>
      </group>

      {/* Floating ✓ / ✗ shown once when this NPC is stopped — a good headshot
          shows its bonus instead. Sits above the body (outside pitchRef so it
          stays upright while the corpse tips + slides). */}
      {punchFb && (
        <group ref={fbGroupRef} position={[0, FB_START_Y, 0]}>
          <Billboard>
            <Text
              ref={fbTextRef}
              fontSize={punchFb.kind === 'good' && punchFb.zone === 'head' ? 0.7 : 1.0}
              color={
                punchFb.kind === 'bad'
                  ? FB_BAD_COLOR
                  : punchFb.zone === 'head'
                    ? FB_HEAD_COLOR
                    : FB_GOOD_COLOR
              }
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.07}
              outlineColor="#0a0a0a"
              material-transparent
              material-toneMapped={false}
            >
              {punchFb.kind === 'bad'
                ? '✗'
                : punchFb.zone === 'head'
                  ? fmtPoints(GAME.POINTS_HEADSHOT)
                  : '✓'}
            </Text>
          </Billboard>
        </group>
      )}
    </group>
  )
}

