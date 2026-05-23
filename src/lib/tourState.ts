import { create } from 'zustand'
import { ROOMS, type RoomId, roomById } from './officeLayout'

export const GUIDE_NAME = 'Helena'
export const LINE_DURATION_MS = 7500

type LineIndexMap = Record<RoomId, number>

const ZERO_INDEXES: LineIndexMap = Object.fromEntries(
  ROOMS.map((r) => [r.id, 0]),
) as LineIndexMap

type TourState = {
  currentRoom: RoomId | null
  spokenLine: string | null
  spokenAt: number
  lineIndexByRoom: LineIndexMap

  enterRoom: (id: RoomId) => void
  clearLine: () => void
}

export const useTour = create<TourState>((set, get) => ({
  currentRoom: null,
  spokenLine: null,
  spokenAt: 0,
  lineIndexByRoom: ZERO_INDEXES,

  enterRoom: (id) => {
    if (get().currentRoom === id) return
    const room = roomById(id)
    const idx = get().lineIndexByRoom[id]
    const line = room.lines[idx % room.lines.length]
    set({
      currentRoom: id,
      spokenLine: line,
      spokenAt: performance.now(),
      lineIndexByRoom: { ...get().lineIndexByRoom, [id]: idx + 1 },
    })
  },

  clearLine: () => set({ spokenLine: null }),
}))
