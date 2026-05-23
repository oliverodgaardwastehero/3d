import { useFrame } from '@react-three/fiber'
import { useCallback, useRef, useState } from 'react'
import { useDepot } from '../../lib/depotState'
import {
  BINS,
  GAME,
  NPC_SPAWN_POINTS,
  type WasteType,
} from '../../lib/depotLayout'
import { WasteNPC, type WasteNPCInit } from './WasteNPC'

const SKIN_COLORS = ['#f5d6b8', '#d6a87a', '#a8784a', '#7a5234', '#f0bf94']
const SHIRT_COLORS = [
  '#ef4444',
  '#22c55e',
  '#3b82f6',
  '#a855f7',
  '#f59e0b',
  '#ec4899',
  '#14b8a6',
]
const PANTS_COLORS = ['#3f3f46', '#1f2937', '#525252', '#475569', '#27272a']

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInRange(lo: number, hi: number) {
  return lo + Math.random() * (hi - lo)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/**
 * Returns a randomized spawn interval scaled by match progress (0 → 1).
 * Early match: leisurely spawns. Late match: relentless.
 */
function nextSpawnInterval(matchProgress: number): number {
  const t = Math.min(1, Math.max(0, matchProgress))
  const lo = lerp(GAME.SPAWN_INTERVAL_START_MIN, GAME.SPAWN_INTERVAL_END_MIN, t)
  const hi = lerp(GAME.SPAWN_INTERVAL_START_MAX, GAME.SPAWN_INTERVAL_END_MAX, t)
  return randInRange(lo, hi)
}

function pickTargetBin(wasteType: WasteType): WasteType {
  if (Math.random() < GAME.WRONG_BIN_RATIO) {
    const choices = BINS.filter((b) => b.id !== wasteType)
    return pick(choices).id
  }
  return wasteType
}

export function DepotNPCManager() {
  const [npcs, setNpcs] = useState<WasteNPCInit[]>([])
  const nextIdRef = useRef(0)
  const spawnTimerRef = useRef(0)
  const nextIntervalRef = useRef(nextSpawnInterval(0))
  const phaseRef = useRef<'idle' | 'playing' | 'over'>('idle')
  // Count of NPCs that still occupy a "live spawn slot." Decremented when an
  // NPC either falls (becomes a corpse) or walks back out the gate. Corpses
  // remain mounted in `npcs` for the rest of the match but don't gate spawns.
  const livingRef = useRef(0)
  const countedAsDoneRef = useRef<Set<number>>(new Set())

  useFrame((_, delta) => {
    const { phase, timeLeft } = useDepot.getState()
    if (phase !== phaseRef.current) {
      phaseRef.current = phase
      if (phase !== 'playing') {
        spawnTimerRef.current = 0
        livingRef.current = 0
        countedAsDoneRef.current.clear()
        setNpcs([])
        return
      }
    }
    if (phase !== 'playing') return

    const dt = Math.min(delta, 0.05)
    spawnTimerRef.current += dt
    if (
      spawnTimerRef.current >= nextIntervalRef.current &&
      livingRef.current < GAME.MAX_NPCS_ALIVE
    ) {
      spawnTimerRef.current = 0
      const matchProgress = 1 - timeLeft / GAME.MATCH_DURATION
      nextIntervalRef.current = nextSpawnInterval(matchProgress)
      const sp = pick(NPC_SPAWN_POINTS)
      const wasteType = pick(BINS).id
      const targetBinId = pickTargetBin(wasteType)
      const id = nextIdRef.current++
      livingRef.current += 1
      setNpcs((prev) => [
        ...prev,
        {
          id,
          startX: sp[0],
          startZ: sp[1],
          wasteType,
          targetBinId,
          skinColor: pick(SKIN_COLORS),
          shirtColor: pick(SHIRT_COLORS),
          pantsColor: pick(PANTS_COLORS),
          scale: randInRange(0.9, 1.12),
          walkPhaseOffset: Math.random() * Math.PI * 2,
        },
      ])
    }
  })

  // Each NPC's "alive→inactive" transition fires exactly once via the
  // countedAsDone guard, regardless of whether it was a fall or a normal exit.
  const markDone = useCallback((id: number) => {
    if (countedAsDoneRef.current.has(id)) return
    countedAsDoneRef.current.add(id)
    livingRef.current = Math.max(0, livingRef.current - 1)
  }, [])

  const handleFall = useCallback(
    (id: number) => {
      markDone(id)
    },
    [markDone],
  )

  const handleRemove = useCallback(
    (id: number) => {
      markDone(id)
      setNpcs((prev) => prev.filter((n) => n.id !== id))
    },
    [markDone],
  )

  return (
    <>
      {npcs.map((n) => (
        <WasteNPC
          key={n.id}
          {...n}
          onRemove={handleRemove}
          onFall={handleFall}
        />
      ))}
    </>
  )
}
