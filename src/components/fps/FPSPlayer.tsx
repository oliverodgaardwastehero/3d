import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, useKeyboardControls } from '@react-three/drei'
import { useEffect, useRef, type RefObject } from 'react'
import {
  Group,
  MathUtils,
  MeshBasicMaterial,
  Vector3,
  type PerspectiveCamera as PerspectiveCameraImpl,
} from 'three'
import type { ControlName } from '../../lib/controls'
import { useGame } from '../../lib/store'
import { useDepot } from '../../lib/depotState'
import { exitPointerLock, useFps } from '../../lib/fpsState'
import { fpsInput, resetFpsInput } from '../../lib/fpsInput'
import { FPS } from '../../lib/fpsConfig'
import { createGunFx } from '../../lib/gunFx'
import { CHARACTER_RADIUS, resolveCollision } from '../../lib/world'
import { pushNPCsFromPlayer, raycastNPCBodies } from '../../lib/npcBodies'
import { playEmpty, playHit, playReload, playShot } from '../../lib/sfx'
import { Gun, Tracer } from './Gun'

type Props = {
  /** Shared with the world so NPC logic can read where the player is. */
  positionRef: RefObject<Vector3>
}

const GROUND_Y = 0
const TRACER_LIFE = 0.09
// three's camera looks down -Z at yaw 0, so a look direction (dx, dz) is yaw = atan2(-dx, -dz).
const INITIAL_YAW = Math.atan2(-FPS.LOOK_DIR[0], -FPS.LOOK_DIR[1])

// Scratch vectors (module-level to avoid per-frame allocation).
const _fwd = new Vector3()
const _muzzle = new Vector3()
const _end = new Vector3()

/**
 * First-person player for the blaster mode. Owns its own camera (made the
 * default while mounted, so the 3rd-person camera comes back untouched when
 * you return to the menu): mouse look under pointer lock or drag-to-aim on
 * touch, WASD / virtual-stick movement relative to the view, head-bob.
 * Handles the hit-scan shooting (ammo, reload, cooldown) and carries the gun
 * as a child of the camera so it's always framed the same. Movement reuses
 * the same collision + NPC-shove helpers as the 3rd-person Character so the
 * yard feels identical.
 *
 * All input arrives through the shared `fpsInput` channel (mouse handlers
 * here, touch controls in the DOM HUD) and is drained once per frame.
 *
 * In pointer mode the match is paused (depotState.paused) while the lock is
 * lost, so the clock and walkers wait for the player to click back in.
 */
export function FPSPlayer({ positionRef }: Props) {
  const gl = useThree((s) => s.gl)
  const camRef = useRef<PerspectiveCameraImpl>(null)
  const muzzleRef = useRef<Group>(null)
  const tracerRef = useRef<Group>(null)
  const tracerMatRef = useRef<MeshBasicMaterial>(null)
  const fxRef = useRef(createGunFx())
  const [, getKeys] = useKeyboardControls<ControlName>()

  // Simulation state — mutable refs, never React state (changes every frame).
  const pos = useRef(new Vector3(FPS.SPAWN[0], GROUND_Y, FPS.SPAWN[1]))
  const yaw = useRef(INITIAL_YAW)
  const pitch = useRef(0)
  const wasReloadDown = useRef(false)
  const lastShotAt = useRef(-Infinity)
  const ammo = useRef(FPS.MAG_SIZE)
  const reloading = useRef(false)
  const reloadEndsAt = useRef(0)
  const tracer = useRef({ t: 0, from: new Vector3(), to: new Vector3() })

  // ── Pointer lock + mouse input ────────────────────────────────────────────
  useEffect(() => {
    const el = gl.domElement
    useFps.getState().setCanvas(el)
    positionRef.current.copy(pos.current)
    resetFpsInput()

    // Pointer mode can't aim without the lock → the yard waits. Touch mode never pauses.
    const syncPause = () => {
      const { inputMode, locked } = useFps.getState()
      useDepot.getState().setPaused(inputMode === 'pointer' && !locked)
    }
    const syncLock = () => {
      useFps.getState().setLocked(document.pointerLockElement === el)
      syncPause()
    }
    const onMove = (e: MouseEvent) => {
      const s = useFps.getState()
      if (s.inputMode !== 'pointer' || !s.locked) return
      fpsInput.lookDX += e.movementX
      fpsInput.lookDY += e.movementY
    }
    const onDown = (e: MouseEvent) => {
      const s = useFps.getState()
      if (e.button !== 0 || s.inputMode !== 'pointer' || !s.locked) return
      fpsInput.fire = true
    }
    const onLockError = () => {
      useFps.getState().setLocked(false)
      syncPause()
    }
    // `[` / `]` nudge the look sensitivity without leaving the game (the pause
    // card and title screen have the slider for bigger changes).
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'BracketLeft' && e.code !== 'BracketRight') return
      const s = useFps.getState()
      if (s.inputMode === 'pointer' && !s.locked) return
      e.preventDefault()
      const step = e.code === 'BracketRight' ? FPS.SENS_KEY_STEP : -FPS.SENS_KEY_STEP
      s.setSensitivity(s.sensitivity + step)
    }

    document.addEventListener('pointerlockchange', syncLock)
    document.addEventListener('pointerlockerror', onLockError)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    const unsubMode = useFps.subscribe((s, prev) => {
      if (s.inputMode !== prev.inputMode) syncPause()
    })
    syncLock() // Start may already have locked the pointer before we mounted.

    return () => {
      document.removeEventListener('pointerlockchange', syncLock)
      document.removeEventListener('pointerlockerror', onLockError)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      unsubMode()
      // Only release the mouse when FPS mode is really over. In development,
      // StrictMode replays this effect once on mount; letting go of the lock
      // there would throw away the one we grabbed on the Start click.
      if (useGame.getState().gameMode !== 'fps') {
        exitPointerLock()
        const s = useFps.getState()
        s.setLocked(false)
        s.setCanvas(null)
        s.resetMatch()
        resetFpsInput()
        useDepot.getState().setPaused(false)
      }
    }
  }, [gl, positionRef])

  // ── Match lifecycle: fresh cell each match, release the mouse at the buzzer ─
  useEffect(() => {
    const resetLoadout = () => {
      ammo.current = FPS.MAG_SIZE
      reloading.current = false
      fxRef.current.reloading = false
      fxRef.current.reload = 0
      useFps.getState().resetMatch()
    }
    if (useDepot.getState().phase === 'playing') resetLoadout()
    return useDepot.subscribe((s, prev) => {
      if (s.phase === prev.phase) return
      if (s.phase === 'playing') resetLoadout()
      // The game-over card needs a real cursor (name entry, buttons).
      if (s.phase === 'over') exitPointerLock()
    })
  }, [])

  const startReload = (now: number) => {
    if (reloading.current || ammo.current === FPS.MAG_SIZE) return
    reloading.current = true
    reloadEndsAt.current = now + FPS.RELOAD_TIME
    fxRef.current.reloading = true
    fxRef.current.reload = 0
    useFps.getState().setReloading(true)
    playReload(FPS.RELOAD_TIME)
  }

  // Runs before the default-priority subscribers (gun, NPCs) so the camera is
  // final for this frame before anything reads it.
  useFrame((_, delta) => {
    const cam = camRef.current
    if (!cam) return
    const dt = Math.min(delta, 0.05)
    const now = performance.now() / 1000
    const f = fxRef.current

    const { phase, paused } = useDepot.getState()
    const { locked, inputMode, sensitivity } = useFps.getState()
    // Touch mode aims by dragging, so it never needs the lock.
    const aiming = inputMode === 'touch' || locked
    const live = useGame.getState().hasStarted && aiming && phase === 'playing' && !paused

    // ── Look ────────────────────────────────────────────────────────────────
    const sens = FPS.MOUSE_SENS * sensitivity
    const lookDX = aiming ? fpsInput.lookDX : 0
    const lookDY = aiming ? fpsInput.lookDY : 0
    fpsInput.lookDX = 0
    fpsInput.lookDY = 0
    yaw.current -= lookDX * sens
    pitch.current = MathUtils.clamp(
      pitch.current - lookDY * sens,
      -FPS.PITCH_LIMIT,
      FPS.PITCH_LIMIT,
    )
    // Smoothed angular velocity feeds the gun's look-lag.
    const smooth = 1 - Math.exp(-dt * 14)
    f.lookLagY = MathUtils.lerp(f.lookLagY, (lookDX * sens) / dt, smooth)
    f.lookLagX = MathUtils.lerp(f.lookLagX, (lookDY * sens) / dt, smooth)

    // ── Move (view-relative; keys + virtual stick) ──────────────────────────
    let speed = 0
    if (live) {
      const keys = getKeys()
      const mx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + fpsInput.moveX
      const mz = (keys.backward ? 1 : 0) - (keys.forward ? 1 : 0) + fpsInput.moveZ
      const len = Math.hypot(mx, mz)
      if (len > 0.08) {
        // Stick magnitude scales the speed; keys always give a full step.
        speed = (keys.run ? FPS.RUN_SPEED : FPS.WALK_SPEED) * Math.min(1, len)
        const y = yaw.current
        const fwdX = -Math.sin(y)
        const fwdZ = -Math.cos(y)
        const rightX = Math.cos(y)
        const rightZ = -Math.sin(y)
        const dx = (fwdX * -mz + rightX * mx) / len
        const dz = (fwdZ * -mz + rightZ * mx) / len
        const p = pos.current
        const resolved = resolveCollision(p.x + dx * speed * dt, p.z + dz * speed * dt)
        p.set(resolved.x, GROUND_Y, resolved.z)
      }

      const reloadPressed = (keys.reload && !wasReloadDown.current) || fpsInput.reload
      wasReloadDown.current = keys.reload
      fpsInput.reload = false
      if (reloadPressed) startReload(now)
    } else {
      wasReloadDown.current = false
      fpsInput.fire = false
      fpsInput.reload = false
    }
    pushNPCsFromPlayer(pos.current.x, pos.current.z, CHARACTER_RADIUS)
    positionRef.current.copy(pos.current)

    // ── Head-bob ────────────────────────────────────────────────────────────
    f.moveBlend = MathUtils.lerp(f.moveBlend, speed > 0 ? 1 : 0, 1 - Math.exp(-dt * 10))
    if (speed > 0) f.bobPhase += dt * speed * FPS.BOB_FREQ
    const bobY = Math.abs(Math.sin(f.bobPhase)) * FPS.BOB_AMP * f.moveBlend

    // ── Camera (the gun is a child, so it comes along) ──────────────────────
    cam.position.set(pos.current.x, FPS.EYE_HEIGHT + bobY, pos.current.z)
    cam.rotation.set(pitch.current, yaw.current, 0)
    cam.updateMatrixWorld()

    // ── Aim: what's under the crosshair ─────────────────────────────────────
    cam.getWorldDirection(_fwd)
    const target = live
      ? raycastNPCBodies(cam.position, _fwd, FPS.RANGE, FPS.HIT_RADIUS_PAD)
      : null
    useFps.getState().setHover(target !== null)

    // ── Reload progress ─────────────────────────────────────────────────────
    if (reloading.current) {
      f.reload = MathUtils.clamp(1 - (reloadEndsAt.current - now) / FPS.RELOAD_TIME, 0, 1)
      if (now >= reloadEndsAt.current) {
        reloading.current = false
        ammo.current = FPS.MAG_SIZE
        f.reloading = false
        f.reload = 0
        useFps.getState().setReloading(false)
        useFps.getState().setAmmo(ammo.current)
      }
    }

    // ── Fire ────────────────────────────────────────────────────────────────
    if (fpsInput.fire) {
      fpsInput.fire = false
      if (live && !reloading.current && now - lastShotAt.current >= FPS.FIRE_COOLDOWN) {
        if (ammo.current <= 0) {
          playEmpty()
          startReload(now)
        } else {
          ammo.current -= 1
          lastShotAt.current = now
          f.recoil = 1
          f.flash = 1
          f.flashScale = 0.8 + Math.random() * 0.5
          f.flashRoll = Math.random() * Math.PI * 2
          playShot()

          let outcome: 'good' | 'bad' | null = null
          if (target) {
            const h = Math.hypot(_fwd.x, _fwd.z) || 1
            outcome = target.body.onHit?.(_fwd.x / h, _fwd.z / h, target.zone) ?? null
          }
          useDepot.getState().registerShot(target !== null, target?.zone === 'head')
          if (outcome && target) {
            useFps.getState().registerHit(outcome, target.zone)
            playHit(outcome === 'good', target.zone === 'head')
          }

          // Bolt tracer from the barrel to the impact point (or out to range).
          if (muzzleRef.current) muzzleRef.current.getWorldPosition(_muzzle)
          else _muzzle.copy(cam.position)
          _end.copy(_fwd).multiplyScalar(target ? target.distance : FPS.RANGE).add(cam.position)
          tracer.current.from.copy(_muzzle)
          tracer.current.to.copy(_end)
          tracer.current.t = 1

          useFps.getState().setAmmo(ammo.current)
          if (ammo.current === 0) startReload(now)
        }
      }
    }

    // ── Tracer ──────────────────────────────────────────────────────────────
    const tr = tracerRef.current
    if (tr) {
      const t = tracer.current
      if (t.t > 0) {
        t.t = Math.max(0, t.t - dt / TRACER_LIFE)
        tr.visible = true
        tr.position.copy(t.from)
        tr.lookAt(t.to)
        tr.scale.set(1, 1, Math.max(0.01, t.from.distanceTo(t.to)))
        if (tracerMatRef.current) tracerMatRef.current.opacity = t.t * 0.9
      } else {
        tr.visible = false
      }
    }
  }, -1)

  return (
    <>
      {/* makeDefault swaps this in as the render camera while mounted and
          restores the previous (3rd-person) camera on unmount. A tighter near
          plane than the default keeps the gun from clipping. */}
      <PerspectiveCamera
        ref={camRef}
        makeDefault
        fov={FPS.FOV}
        near={0.05}
        far={200}
        position={[FPS.SPAWN[0], FPS.EYE_HEIGHT, FPS.SPAWN[1]]}
        rotation={[0, INITIAL_YAW, 0]}
        rotation-order="YXZ"
      >
        <Gun fxRef={fxRef} muzzleRef={muzzleRef} />
      </PerspectiveCamera>
      <Tracer groupRef={tracerRef} matRef={tracerMatRef} />
    </>
  )
}
