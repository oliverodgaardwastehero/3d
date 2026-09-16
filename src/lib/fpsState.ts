import { create } from 'zustand'
import { FPS } from './fpsConfig'
import type { HitOutcome, HitZone } from './npcBodies'

/**
 * How the player aims. `pointer` = desktop mouse under pointer lock (the match
 * pauses while the lock is lost). `touch` = drag-to-aim + on-screen stick and
 * fire button; used on phones/tablets, in browsers without pointer lock, and
 * as a manual fallback when the lock is refused. Nothing pauses in touch mode.
 */
export type InputMode = 'pointer' | 'touch'

export function detectInputMode(): InputMode {
  if (typeof window === 'undefined') return 'pointer'
  const coarse = window.matchMedia?.('(pointer: coarse)').matches === true
  const touchy = (navigator.maxTouchPoints ?? 0) > 0 && coarse
  const noLock = typeof HTMLElement !== 'undefined' && !('requestPointerLock' in HTMLElement.prototype)
  return touchy || noLock ? 'touch' : 'pointer'
}

// ── Look sensitivity (multiplier on FPS.MOUSE_SENS), persisted per browser ──
const SENS_KEY = 'fps:sensitivity:v1'

export function clampSensitivity(v: number): number {
  const c = Math.min(FPS.SENS_MAX, Math.max(FPS.SENS_MIN, v))
  return Math.round(c * 100) / 100
}

function loadSensitivity(): number {
  if (typeof window === 'undefined') return FPS.SENS_DEFAULT
  try {
    const v = Number.parseFloat(window.localStorage.getItem(SENS_KEY) ?? '')
    return Number.isFinite(v) ? clampSensitivity(v) : FPS.SENS_DEFAULT
  } catch {
    return FPS.SENS_DEFAULT
  }
}

function saveSensitivity(v: number) {
  try {
    window.localStorage.setItem(SENS_KEY, String(v))
  } catch {
    // ignore storage errors
  }
}

/**
 * First-person-mode UI state. Written from the FPSPlayer frame loop, read by
 * the DOM FPSHUD (crosshair, ammo, hit marker, pointer-lock prompt). Match
 * state (time, score, phase) stays in depotState — it's the same match.
 */
type FpsState = {
  inputMode: InputMode
  /** The canvas currently holds the mouse (pointer lock). */
  locked: boolean
  /** The WebGL canvas, so the DOM prompt can request pointer lock on click. */
  canvas: HTMLCanvasElement | null
  ammo: number
  reloading: boolean
  /** Crosshair is over a live walker. */
  hover: boolean
  /** Increments on every connected shot; `hitKind`/`hitZone` say which marker to show. */
  hitPulse: number
  hitKind: HitOutcome | null
  hitZone: HitZone | null
  /** Look sensitivity multiplier (1 = FPS.MOUSE_SENS). `sensPulse` bumps on every change (HUD toast). */
  sensitivity: number
  sensPulse: number

  setInputMode: (mode: InputMode) => void
  setLocked: (locked: boolean) => void
  setCanvas: (canvas: HTMLCanvasElement | null) => void
  setAmmo: (ammo: number) => void
  setReloading: (reloading: boolean) => void
  setHover: (hover: boolean) => void
  registerHit: (kind: HitOutcome, zone: HitZone) => void
  setSensitivity: (v: number) => void
  resetMatch: () => void
}

export const useFps = create<FpsState>((set) => ({
  inputMode: detectInputMode(),
  locked: false,
  canvas: null,
  ammo: FPS.MAG_SIZE,
  reloading: false,
  hover: false,
  hitPulse: 0,
  hitKind: null,
  hitZone: null,
  sensitivity: loadSensitivity(),
  sensPulse: 0,

  setInputMode: (inputMode) =>
    set((s) => (s.inputMode === inputMode ? s : { ...s, inputMode })),
  setLocked: (locked) => set((s) => (s.locked === locked ? s : { ...s, locked })),
  setCanvas: (canvas) => set({ canvas }),
  setAmmo: (ammo) => set((s) => (s.ammo === ammo ? s : { ...s, ammo })),
  setReloading: (reloading) =>
    set((s) => (s.reloading === reloading ? s : { ...s, reloading })),
  setHover: (hover) => set((s) => (s.hover === hover ? s : { ...s, hover })),
  registerHit: (kind, zone) =>
    set((s) => ({ hitPulse: s.hitPulse + 1, hitKind: kind, hitZone: zone })),
  setSensitivity: (v) =>
    set((s) => {
      const sensitivity = clampSensitivity(v)
      if (sensitivity === s.sensitivity) return s
      saveSensitivity(sensitivity)
      return { ...s, sensitivity, sensPulse: s.sensPulse + 1 }
    }),
  resetMatch: () =>
    set({
      ammo: FPS.MAG_SIZE,
      reloading: false,
      hover: false,
      hitPulse: 0,
      hitKind: null,
      hitZone: null,
    }),
}))

/**
 * Ask the browser to lock the mouse to the game canvas. Must run inside a user
 * gesture (click / keypress). Failures are swallowed — Chrome rejects re-locks
 * for ~1 s after an Esc, and the DOM prompt simply stays up for another click.
 */
export function requestPointerLock(): void {
  const canvas =
    useFps.getState().canvas ??
    (document.querySelector('canvas') as HTMLCanvasElement | null)
  if (!canvas || typeof canvas.requestPointerLock !== 'function') return
  try {
    // Returns a promise in modern Chromium, undefined elsewhere.
    const p = canvas.requestPointerLock() as unknown as Promise<void> | undefined
    p?.catch?.(() => {})
  } catch {
    // unsupported / rejected — the prompt stays up
  }
}

export function exitPointerLock(): void {
  try {
    if (document.pointerLockElement) document.exitPointerLock()
  } catch {
    // ignore
  }
}
