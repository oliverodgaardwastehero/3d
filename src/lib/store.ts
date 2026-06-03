import { create } from 'zustand'
import type { ChapterId } from './chapters'

export type GameMode = 'office' | 'depot'

type GameState = {
  hasStarted: boolean
  gameMode: GameMode | null
  currentChapter: ChapterId | null
  visitedChapters: Set<ChapterId>

  // Title-screen load state, reported up from the lazily-loaded 3D Scene chunk
  // (drei lives in that chunk, so the DOM title screen can't read useProgress
  // directly). loadProgress drives the "Loading N%" label; assetsReady gates
  // the Start CTA once the player GLB has finished preloading.
  loadProgress: number
  assetsReady: boolean

  start: (mode: GameMode) => void
  resetToMenu: () => void
  setCurrentChapter: (id: ChapterId | null) => void
  setLoad: (progress: number, assetsReady: boolean) => void
}

export const useGame = create<GameState>((set, get) => ({
  hasStarted: false,
  gameMode: null,
  currentChapter: null,
  visitedChapters: new Set(),
  loadProgress: 0,
  assetsReady: false,

  start: (mode) => {
    if (get().hasStarted) return
    set({ hasStarted: true, gameMode: mode })
  },

  resetToMenu: () => {
    set({ hasStarted: false, gameMode: null, currentChapter: null })
  },

  setLoad: (progress, assetsReady) => {
    const s = get()
    if (s.loadProgress === progress && s.assetsReady === assetsReady) return
    set({ loadProgress: progress, assetsReady })
  },

  setCurrentChapter: (id) => {
    if (get().currentChapter === id) return
    if (id !== null) {
      const visited = new Set(get().visitedChapters)
      visited.add(id)
      set({ currentChapter: id, visitedChapters: visited })
      // eslint-disable-next-line no-console
      console.log('[chapter]', id)
    } else {
      set({ currentChapter: null })
    }
  },
}))
