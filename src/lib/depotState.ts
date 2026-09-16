import { create } from 'zustand'
import { GAME, type WasteType } from './depotLayout'

export type GamePhase = 'idle' | 'playing' | 'over'

export type PlayerPunch = {
  x: number
  z: number
  fx: number
  fz: number
}

export type DepositFeedback = {
  binId: WasteType
  type: 'right' | 'wrong'
  /** Use a fresh timestamp on each event so consumers can re-trigger animations
   *  even if the same bin receives back-to-back deposits of the same kind. */
  at: number
}

type DepotState = {
  phase: GamePhase
  timeLeft: number
  score: number
  correctStops: number
  wrongStops: number
  wrongDeposits: number
  correctDeposits: number
  /** FPS mode: blaster shots fired / shots that connected with a walker / of those, head hits. */
  shotsFired: number
  shotsHit: number
  headshots: number
  dirtyBins: ReadonlySet<WasteType>
  /** Increments each fresh punch. WasteNPC subscribes and tests overlap. */
  punchPulse: number
  lastPunch: PlayerPunch | null
  /** Most recent deposit outcome — Bin reads this to animate ✓/✗. */
  lastFeedback: DepositFeedback | null
  /**
   * Freeze the match clock + walkers. FPS mode sets this while the pointer
   * isn't locked (Esc / tabbed out) so a player who can't aim doesn't bleed
   * time. Deliberately NOT reset by start()/reset() — the mode that owns it
   * clears it on unmount.
   */
  paused: boolean

  start: () => void
  reset: () => void
  tick: (dt: number) => void
  setPaused: (paused: boolean) => void
  /** A wrong-bin walker was stopped; `points` defaults to the plain stop value (kick / body shot). */
  registerWrongStop: (points?: number) => void
  registerRightStop: () => void
  registerWrongDeposit: (binId: WasteType) => void
  registerCorrectDeposit: (binId: WasteType) => void
  registerPunch: (p: PlayerPunch) => void
  registerShot: (hit: boolean, headshot?: boolean) => void
}

const initial = (): Omit<
  DepotState,
  | 'paused'
  | 'start'
  | 'reset'
  | 'tick'
  | 'setPaused'
  | 'registerWrongStop'
  | 'registerRightStop'
  | 'registerWrongDeposit'
  | 'registerCorrectDeposit'
  | 'registerPunch'
  | 'registerShot'
> => ({
  phase: 'idle',
  timeLeft: GAME.MATCH_DURATION,
  score: 0,
  correctStops: 0,
  wrongStops: 0,
  wrongDeposits: 0,
  correctDeposits: 0,
  shotsFired: 0,
  shotsHit: 0,
  headshots: 0,
  dirtyBins: new Set(),
  punchPulse: 0,
  lastPunch: null,
  lastFeedback: null,
})

export const useDepot = create<DepotState>((set) => ({
  ...initial(),
  paused: false,

  start: () => set({ ...initial(), phase: 'playing' }),
  reset: () => set({ ...initial() }),

  tick: (dt) =>
    set((s) => {
      if (s.phase !== 'playing' || s.paused) return s
      const next = Math.max(0, s.timeLeft - dt)
      if (next <= 0) return { ...s, timeLeft: 0, phase: 'over' }
      return { ...s, timeLeft: next }
    }),

  setPaused: (paused) =>
    set((s) => (s.paused === paused ? s : { ...s, paused })),

  registerWrongStop: (points = GAME.POINTS_STOP) =>
    set((s) => ({ score: s.score + points, wrongStops: s.wrongStops + 1 })),

  registerRightStop: () =>
    set((s) => ({ score: s.score - GAME.POINTS_MISTAKE, correctStops: s.correctStops + 1 })),

  registerWrongDeposit: (binId) =>
    set((s) => {
      const dirty = new Set(s.dirtyBins)
      dirty.add(binId)
      return {
        score: s.score - 1,
        wrongDeposits: s.wrongDeposits + 1,
        dirtyBins: dirty,
        lastFeedback: { binId, type: 'wrong', at: performance.now() },
      }
    }),

  registerCorrectDeposit: (binId) =>
    set((s) => ({
      score: s.score + 1,
      correctDeposits: s.correctDeposits + 1,
      lastFeedback: { binId, type: 'right', at: performance.now() },
    })),

  registerPunch: (p) =>
    set((s) => ({ punchPulse: s.punchPulse + 1, lastPunch: p })),

  registerShot: (hit, headshot = false) =>
    set((s) => ({
      shotsFired: s.shotsFired + 1,
      shotsHit: s.shotsHit + (hit ? 1 : 0),
      headshots: s.headshots + (hit && headshot ? 1 : 0),
    })),
}))
