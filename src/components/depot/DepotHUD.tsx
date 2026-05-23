import { useEffect, useState } from 'react'
import { useGame } from '../../lib/store'
import { useDepot } from '../../lib/depotState'
import { GAME } from '../../lib/depotLayout'
import { loadBestScore, maybeSaveBestScore } from '../../lib/highScore'

export function DepotHUD() {
  const hasStarted = useGame((s) => s.hasStarted)
  const phase = useDepot((s) => s.phase)
  const timeLeft = useDepot((s) => s.timeLeft)
  const score = useDepot((s) => s.score)
  const wrongStops = useDepot((s) => s.wrongStops)
  const correctStops = useDepot((s) => s.correctStops)
  const wrongDeposits = useDepot((s) => s.wrongDeposits)
  const correctDeposits = useDepot((s) => s.correctDeposits)
  const start = useDepot((s) => s.start)
  const reset = useDepot((s) => s.reset)
  const resetToMenu = useGame((s) => s.resetToMenu)

  const [bestScore, setBestScore] = useState<number | null>(() => loadBestScore())
  const [isNewBest, setIsNewBest] = useState(false)
  const [showGo, setShowGo] = useState(false)

  // Kick off the first match.
  useEffect(() => {
    if (hasStarted && phase === 'idle') start()
  }, [hasStarted, phase, start])

  // Save best score whenever a match finishes.
  useEffect(() => {
    if (phase !== 'over') {
      setIsNewBest(false)
      return
    }
    const prev = loadBestScore()
    const next = maybeSaveBestScore(score)
    setBestScore(next)
    setIsNewBest(prev == null || score > prev)
  }, [phase, score])

  // Flash a big GO! when the match kicks off (or restarts).
  useEffect(() => {
    if (phase !== 'playing') {
      setShowGo(false)
      return
    }
    setShowGo(true)
    const id = window.setTimeout(() => setShowGo(false), 1400)
    return () => window.clearTimeout(id)
  }, [phase])

  // Match timer.
  useEffect(() => {
    if (phase !== 'playing') return
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      useDepot.getState().tick(dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  if (!hasStarted) return null

  const seconds = Math.ceil(timeLeft)
  const mm = Math.floor(seconds / 60)
  const ss = (seconds % 60).toString().padStart(2, '0')

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* Top-center scoreboard */}
      <div className="absolute left-1/2 top-6 -translate-x-1/2 flex items-center gap-6 rounded-2xl bg-black/55 px-6 py-3 text-white backdrop-blur">
        <Stat label="Time" value={`${mm}:${ss}`} />
        <div className="h-8 w-px bg-white/20" />
        <Stat
          label="Score"
          value={score >= 0 ? `+${score}` : `${score}`}
          tone={score < 0 ? 'rose' : 'emerald'}
        />
        <div className="h-8 w-px bg-white/20" />
        <Stat label="Wrong stopped" value={wrongStops} tone="emerald" />
        <Stat label="Saved" value={correctDeposits} tone="emerald" />
        <Stat label="Right stopped" value={correctStops} tone="rose" />
        <Stat label="Spoiled" value={wrongDeposits} tone="rose" />
      </div>

      {/* Big animated GO! when the match starts */}
      {showGo && (
        <div className="pointer-events-none absolute inset-0">
          <div className="go-streak" />
          <div className="go-shockwave" />
          <div className="go-overlay">GO!</div>
        </div>
      )}

      {/* Quick-help on opening seconds */}
      {phase === 'playing' && timeLeft > GAME.MATCH_DURATION - 4 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-zinc-200 backdrop-blur">
          Punch (P) the ones heading to the wrong bin
        </div>
      )}

      {phase === 'over' && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm">
          <div className="rounded-2xl bg-zinc-900/90 px-10 py-8 text-center text-white shadow-2xl">
            <div className="text-xs uppercase tracking-[0.4em] text-zinc-400">
              Time&apos;s up
            </div>
            <div className="mt-2 text-4xl font-light">Final score</div>
            <div
              className={`mt-3 font-mono text-5xl font-semibold ${
                score < 0 ? 'text-rose-300' : 'text-emerald-300'
              }`}
            >
              {score >= 0 ? `+${score}` : score}
            </div>
            {isNewBest ? (
              <div className="mt-2 text-xs font-semibold uppercase tracking-[0.4em] text-amber-300">
                New best!
              </div>
            ) : bestScore != null ? (
              <div className="mt-2 text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                Best {bestScore >= 0 ? `+${bestScore}` : bestScore}
              </div>
            ) : null}
            <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/90">
                  Wrong stopped
                </div>
                <div className="mt-1 font-mono text-2xl">{wrongStops}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/90">
                  Saved
                </div>
                <div className="mt-1 font-mono text-2xl">{correctDeposits}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-rose-300/90">
                  Right stopped
                </div>
                <div className="mt-1 font-mono text-2xl">{correctStops}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-rose-300/90">
                  Spoiled
                </div>
                <div className="mt-1 font-mono text-2xl">{wrongDeposits}</div>
              </div>
            </div>
            <div className="mt-8 flex justify-center gap-3">
              <button
                onClick={() => {
                  reset()
                  start()
                }}
                className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold uppercase tracking-wider text-zinc-900 transition hover:bg-emerald-400"
              >
                Play again
              </button>
              <button
                onClick={() => {
                  reset()
                  resetToMenu()
                }}
                className="rounded-full border border-zinc-600 px-6 py-2.5 text-sm font-semibold uppercase tracking-wider text-zinc-300 transition hover:border-zinc-300 hover:text-white"
              >
                Back to menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type StatProps = {
  label: string
  value: string | number
  tone?: 'emerald' | 'rose' | 'neutral'
}

function Stat({ label, value, tone = 'neutral' }: StatProps) {
  const labelClass =
    tone === 'emerald'
      ? 'text-emerald-300/90'
      : tone === 'rose'
        ? 'text-rose-300/90'
        : 'text-zinc-300/80'
  return (
    <div className="flex flex-col items-center">
      <div className={`text-[10px] uppercase tracking-[0.3em] ${labelClass}`}>
        {label}
      </div>
      <div className="font-mono text-2xl font-semibold tabular-nums">
        {value}
      </div>
    </div>
  )
}
