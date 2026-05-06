import { useProgress } from '@react-three/drei'
import { useEffect, useState } from 'react'
import { useGame } from '../lib/store'

type Props = {
  onBegin: () => void
}

/**
 * Intro overlay over the canvas. Briefly shows a loading bar while assets load
 * (drei's useProgress), then a "Click to begin" button. Clicking starts the
 * game and fades the overlay out.
 */
export function LoadingScreen({ onBegin }: Props) {
  const { progress, active, total } = useProgress()
  const hasStarted = useGame((s) => s.hasStarted)
  const [hidden, setHidden] = useState(false)
  const [graceElapsed, setGraceElapsed] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => setGraceElapsed(true), 350)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (!hasStarted) return
    const id = window.setTimeout(() => setHidden(true), 600)
    return () => window.clearTimeout(id)
  }, [hasStarted])

  if (hidden) return null

  const nothingToLoad = total === 0
  const ready = graceElapsed && !active && (nothingToLoad || progress >= 100)

  return (
    <div
      className={[
        'pointer-events-auto absolute inset-0 z-50 flex flex-col items-center justify-center',
        'bg-zinc-950 transition-opacity duration-500',
        hasStarted ? 'opacity-0' : 'opacity-100',
      ].join(' ')}
    >
      <div className="mb-3 text-xs uppercase tracking-[0.4em] text-zinc-500">
        A walking story
      </div>
      <div className="mb-12 text-4xl font-light tracking-wide text-zinc-100">
        The Origin
      </div>

      {!ready && (
        <div className="flex w-72 flex-col items-center gap-3">
          <div className="h-px w-full overflow-hidden bg-zinc-800">
            <div
              className="h-full bg-zinc-200 transition-[width] duration-200 ease-out"
              style={{ width: `${Math.max(2, progress)}%` }}
            />
          </div>
          <div className="text-xs uppercase tracking-widest text-zinc-500">
            Loading {Math.round(progress)}%
          </div>
        </div>
      )}

      {ready && (
        <button
          type="button"
          onClick={onBegin}
          className="rounded-full border border-zinc-700 px-10 py-3 text-sm uppercase tracking-[0.3em] text-zinc-200 transition-colors hover:border-zinc-300 hover:text-white"
        >
          Click to begin
        </button>
      )}

      <div className="absolute bottom-8 text-xs text-zinc-600">
        WASD / Arrows to walk · Shift to run · Space to jump (×2 for double-jump)
      </div>
    </div>
  )
}
