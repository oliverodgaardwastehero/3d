import { create } from 'zustand'
import type { ChapterId } from './chapters'

type GameState = {
  hasStarted: boolean
  currentChapter: ChapterId | null
  visitedChapters: Set<ChapterId>

  start: () => void
  setCurrentChapter: (id: ChapterId | null) => void
}

export const useGame = create<GameState>((set, get) => ({
  hasStarted: false,
  currentChapter: null,
  visitedChapters: new Set(),

  start: () => {
    if (!get().hasStarted) set({ hasStarted: true })
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
