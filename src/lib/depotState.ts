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
  dirtyBins: ReadonlySet<WasteType>
  /** Increments each fresh punch. WasteNPC subscribes and tests overlap. */
  punchPulse: number
  lastPunch: PlayerPunch | null
  /** Most recent deposit outcome — Bin reads this to animate ✓/✗. */
  lastFeedback: DepositFeedback | null

  start: () => void
  reset: () => void
  tick: (dt: number) => void
  registerWrongStop: () => void
  registerRightStop: () => void
  registerWrongDeposit: (binId: WasteType) => void
  registerCorrectDeposit: (binId: WasteType) => void
  registerPunch: (p: PlayerPunch) => void
}

const initial = (): Omit<
  DepotState,
  | 'start'
  | 'reset'
  | 'tick'
  | 'registerWrongStop'
  | 'registerRightStop'
  | 'registerWrongDeposit'
  | 'registerCorrectDeposit'
  | 'registerPunch'
> => ({
  phase: 'idle',
  timeLeft: GAME.MATCH_DURATION,
  score: 0,
  correctStops: 0,
  wrongStops: 0,
  wrongDeposits: 0,
  correctDeposits: 0,
  dirtyBins: new Set(),
  punchPulse: 0,
  lastPunch: null,
  lastFeedback: null,
})

export const useDepot = create<DepotState>((set) => ({
  ...initial(),

  start: () => set({ ...initial(), phase: 'playing' }),
  reset: () => set({ ...initial() }),

  tick: (dt) =>
    set((s) => {
      if (s.phase !== 'playing') return s
      const next = Math.max(0, s.timeLeft - dt)
      if (next <= 0) return { ...s, timeLeft: 0, phase: 'over' }
      return { ...s, timeLeft: next }
    }),

  registerWrongStop: () =>
    set((s) => ({ score: s.score + 1, wrongStops: s.wrongStops + 1 })),

  registerRightStop: () =>
    set((s) => ({ score: s.score - 1, correctStops: s.correctStops + 1 })),

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
}))
