import { create } from 'zustand'
import type { ChapterId } from './chapters'

export type GameMode = 'office' | 'depot'

type GameState = {
  hasStarted: boolean
  gameMode: GameMode | null
  currentChapter: ChapterId | null
  visitedChapters: Set<ChapterId>

  start: (mode: GameMode) => void
  resetToMenu: () => void
  setCurrentChapter: (id: ChapterId | null) => void
}

export const useGame = create<GameState>((set, get) => ({
  hasStarted: false,
  gameMode: null,
  currentChapter: null,
  visitedChapters: new Set(),

  start: (mode) => {
    if (get().hasStarted) return
    set({ hasStarted: true, gameMode: mode })
  },

  resetToMenu: () => {
    set({ hasStarted: false, gameMode: null, currentChapter: null })
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
