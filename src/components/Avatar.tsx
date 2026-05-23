import { useGLTF, useAnimations } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { Group, LoopOnce, LoopRepeat, Mesh } from 'three'

const URL = '/models/waste-hero.glb'

const ANIM_BY_STATE = {
  idle: 'All_Night_Dance',
  walking: 'Walking',
  running: 'Running',
  kick: 'Lunge_Spin_Kick',
} as const

// Per-state playback speed multipliers. >1 plays faster.
const TIME_SCALE_BY_STATE: Partial<Record<AvatarState, number>> = {
  kick: 1.8,
}

// Source clip durations in seconds at 1× speed.
const CLIP_DURATION = {
  kick: 1.63,
} as const

export const KICK_DURATION = CLIP_DURATION.kick / (TIME_SCALE_BY_STATE.kick ?? 1)
/**
 * Real-time seconds from kick keypress to the contact moment in the
 * animation. Used by Character to delay the NPC hit signal so the knockback
 * fires when the kick actually visually lands, not at the start of the wind-up.
 */
export const KICK_IMPACT_DELAY = 0.22

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
      }
    })

    // Mixamo clips bake the lunge / spin's root-bone translation into the
    // animation — when we play it the visible mesh slides forward, then snaps
    // back to the group's position at clip end. Strip every position track so
    // the kick plays in place. Non-root bones don't have position tracks in
    // Mixamo skeletons, so this is safe.
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
