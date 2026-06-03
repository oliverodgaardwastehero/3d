import { useGLTF, useAnimations } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { Group, LoopOnce, LoopRepeat, Mesh, MeshStandardMaterial } from 'three'

const URL = '/models/waste-hero.glb'

// Animation is driven entirely by baked GLB clips.
//
// HEADS UP: the clip NAMES in this GLB are mislabeled relative to their actual
// motion (verified by foot-motion analysis), so each state points at the clip
// whose CONTENT matches — not its name:
//   'Walking'           → actually an IDLE  (feet planted, ~3.7s loop)
//   'Step_in_High_Kick' → actually the WALK cycle
//   'Idle_10'           → actually the RUN  (high foot-lift + long stride)
//   'Running'           → actually the high KICK (one foot lifts way up)
// If you re-export the model with corrected clip names, update this map to match.
const ANIM_BY_STATE = {
  idle: 'Walking',
  walking: 'Step_in_High_Kick',
  running: 'Idle_10',
  kick: 'Running',
} as const

// Per-state playback speed multipliers. >1 plays faster.
const TIME_SCALE_BY_STATE: Partial<Record<AvatarState, number>> = {
  kick: 1.5,
}

// Source clip durations in seconds at 1× speed (for the kick / one-shot states).
const CLIP_DURATION = {
  kick: 1.3,
} as const

// Fraction of the kick clip at which the foot reaches the strike (measured).
const KICK_CONTACT_FRACTION = 0.417

export const KICK_DURATION = CLIP_DURATION.kick / (TIME_SCALE_BY_STATE.kick ?? 1)
/**
 * Real-time seconds from kick keypress to the contact moment in the animation.
 * Character delays the NPC hit signal by this so the knockback fires when the
 * strike visually lands, not on the wind-up. Derived from the clip's contact
 * fraction — retune CLIP_DURATION / TIME_SCALE / KICK_CONTACT_FRACTION together
 * when you swap in a new punch clip.
 */
export const KICK_IMPACT_DELAY =
  (CLIP_DURATION.kick * KICK_CONTACT_FRACTION) / (TIME_SCALE_BY_STATE.kick ?? 1)

export type AvatarState = keyof typeof ANIM_BY_STATE

const MODEL_SCALE = 1.2
const FADE_SECONDS = 0.18
const ONE_SHOT_STATES: ReadonlySet<AvatarState> = new Set(['kick'])

type Props = {
  state: AvatarState
  bobRef?: RefObject<Group | null>
}

export function Avatar({ state, bobRef }: Props) {
  const { scene, animations } = useGLTF(URL)
  const innerRef = useRef<Group>(null)
  const { actions } = useAnimations(animations, innerRef)

  useEffect(() => {
    scene.traverse((o) => {
      if ((o as Mesh).isMesh) {
        const m = o as Mesh
        m.castShadow = true
        m.receiveShadow = false
        const mat = m.material as MeshStandardMaterial
        if (mat && 'envMapIntensity' in mat) mat.envMapIntensity = 0.6
      }
    })

    // Mixamo clips bake the root-bone translation into the animation — strip
    // every position track so clips play in place (no forward slide / snap-back).
    // Non-root bones don't have position tracks in Mixamo skeletons, so this is
    // safe and also applies to any newly baked clips.
    for (const clip of animations) {
      clip.tracks = clip.tracks.filter((t) => !t.name.endsWith('.position'))
    }
  }, [scene, animations])

  useEffect(() => {
    const name = ANIM_BY_STATE[state]
    const action = actions[name]
    if (!action) return
    const oneShot = ONE_SHOT_STATES.has(state)
    action.reset()
    action.timeScale = TIME_SCALE_BY_STATE[state] ?? 1
    if (oneShot) {
      action.setLoop(LoopOnce, 1)
      action.clampWhenFinished = true
    } else {
      action.setLoop(LoopRepeat, Infinity)
      action.clampWhenFinished = false
    }
    action.fadeIn(FADE_SECONDS).play()
    return () => {
      action.fadeOut(FADE_SECONDS)
    }
  }, [state, actions])

  return (
    <group ref={bobRef}>
      <group ref={innerRef} scale={MODEL_SCALE}>
        <primitive object={scene} />
      </group>
    </group>
  )
}

useGLTF.preload(URL)
