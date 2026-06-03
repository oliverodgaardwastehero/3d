import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useGame } from '../../lib/store'
import { useDepot } from '../../lib/depotState'
import { GAME } from '../../lib/depotLayout'
import {
  loadBestScore,
  maybeSaveBestScore,
  loadPlayerName,
  savePlayerName,
  sanitizeName,
  MAX_NAME_LEN,
  type ScoreEntry,
} from '../../lib/highScore'
import { fetchTopScores, submitScore } from '../../lib/leaderboard'

const fmtScore = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

/** Count a number up from 0 to `target` with an ease-out (skipped if reduced motion). */
function useCountUp(target: number, ms = 650): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0))
  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return value
}

/** The hero score — huge, count-up, with a soft tone-coloured glow behind it. */
function ScoreReveal({ score }: { score: number }) {
  const shown = useCountUp(score)
  const positive = score >= 0
  return (
    <div className="relative mx-auto w-fit">
      <div
        aria-hidden
        className={`over-glow pointer-events-none absolute left-1/2 top-1/2 h-36 w-36 rounded-full blur-2xl ${
          positive ? 'bg-emerald-400/40' : 'bg-rose-400/40'
        }`}
      />
      <div
        className={`over-score relative font-bold leading-none tracking-tight [font-size:clamp(4.5rem,13vw,7.5rem)] ${
          positive ? 'text-emerald-300' : 'text-rose-300'
        }`}
        style={{ textShadow: '0 4px 0 #0b1024, 0 16px 34px rgba(0,0,0,0.55)' }}
      >
        {fmtScore(shown)}
      </div>
    </div>
  )
}

const CONFETTI_COLORS = ['#75bdea', '#6ee7b7', '#fcd34d', '#ffffff', '#f9a8d4']

/** A short, deterministic confetti burst from behind the score (new best only). */
function Confetti() {
  const pieces = Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2 + (i % 2) * 0.35
    const dist = 80 + (i % 5) * 26
    return {
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist - 24,
      rot: `${(i % 2 ? 1 : -1) * (200 + (i % 4) * 80)}deg`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: (i % 6) * 28,
    }
  })
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="over-confetti-piece absolute left-1/2 top-[34%] h-2.5 w-1.5 rounded-[1px]"
          style={
            {
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              '--rot': p.rot,
              background: p.color,
              animationDelay: `${p.delay}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'good' | 'bad'
}) {
  return (
    <div className="rounded-xl bg-white/[0.06] px-2 py-2.5 ring-1 ring-inset ring-white/5">
      <div
        className={`text-[9px] font-bold uppercase leading-tight tracking-[0.16em] ${
          tone === 'good' ? 'text-emerald-300/90' : 'text-rose-300/90'
        }`}
      >
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-white">{value}</div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.18" />
      <path
        d="M7 12.5l3.2 3.2L17 9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

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
  // Leaderboard name entry (shown on a qualifying top-5 finish).
  const [topOnOver, setTopOnOver] = useState<ScoreEntry[] | null>(null)
  const [qualifies, setQualifies] = useState(false)
  const [name, setName] = useState<string>(() => loadPlayerName())
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [savedRank, setSavedRank] = useState<number | null>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  // Best as it stood at the start of this match — so "new best" is judged
  // against the pre-match record and stays correct even if the over-effect
  // re-runs (e.g. StrictMode double-invoke), where loadBestScore() would
  // already reflect this match's just-saved score.
  const bestAtStartRef = useRef<number | null>(loadBestScore())

  // Kick off the first match.
  useEffect(() => {
    if (hasStarted && phase === 'idle') start()
  }, [hasStarted, phase, start])

  // Snapshot the record at the start of each match.
  useEffect(() => {
    if (phase === 'playing') bestAtStartRef.current = loadBestScore()
  }, [phase])

  // On match end: record the local best, snapshot the shared board, and decide
  // whether this score qualifies for the top 5. We only submit to the board on
  // an explicit Save (with a name) from the game-over card below.
  useEffect(() => {
    if (phase !== 'over') {
      setIsNewBest(false)
      setTopOnOver(null)
      setQualifies(false)
      setSaveState('idle')
      setSavedRank(null)
      return
    }
    const prev = bestAtStartRef.current
    setBestScore(maybeSaveBestScore(score))
    setIsNewBest(prev == null || score > prev)
    setSaveState('idle')
    setSavedRank(null)
    setName(loadPlayerName())
    setTopOnOver(null)

    let cancelled = false
    fetchTopScores(5).then((top) => {
      if (cancelled) return
      const lowest = top.length ? top[top.length - 1].score : -Infinity
      setTopOnOver(top)
      // Strictly greater — a tie with 5th place does not bump it.
      setQualifies(top.length < 5 || score > lowest)
    })
    return () => {
      cancelled = true
    }
  }, [phase, score])

  // Focus the name field as soon as it appears (qualified, not yet saved).
  useEffect(() => {
    if (phase === 'over' && qualifies && saveState !== 'saved') {
      nameInputRef.current?.focus()
    }
  }, [phase, qualifies, saveState])

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

  const handleSave = async () => {
    if (saveState !== 'idle') return
    setSaveState('saving')
    const finalName = sanitizeName(name)
    savePlayerName(finalName)
    const top = await submitScore(score, finalName, 5)
    const idx = top.findIndex((e) => e.name === finalName && e.score === score)
    setSavedRank(idx >= 0 ? idx + 1 : null)
    setSaveState('saved')
  }

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
        <div className="over-backdrop pointer-events-auto absolute inset-0 flex items-center justify-center bg-[#0b1020]/75 px-4 backdrop-blur-md">
          <div className="over-card relative w-full max-w-md overflow-hidden rounded-[28px] bg-gradient-to-b from-[#26315a] to-[#161d39] px-8 py-9 text-center text-white shadow-[0_30px_90px_-20px_rgba(0,0,0,0.75)] ring-1 ring-white/10 sm:px-12 sm:py-10">
            {isNewBest && !prefersReducedMotion() && <Confetti />}

            <div className="relative z-10">
              <div className="text-[11px] font-bold uppercase tracking-[0.45em] text-white/45">
                Time&apos;s up
              </div>

              <div className="mt-5">
                <ScoreReveal score={score} />
              </div>

              <div className="mt-4 flex min-h-[28px] items-center justify-center">
                {isNewBest ? (
                  <span className="over-badge inline-flex items-center gap-1.5 rounded-full bg-amber-300 px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-[#1b2344] shadow-[0_3px_0_#a16207]">
                    ★ New best
                  </span>
                ) : bestScore != null ? (
                  <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/45">
                    Best {fmtScore(bestScore)}
                  </span>
                ) : null}
              </div>

              <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <StatChip label="Wrong stopped" value={wrongStops} tone="good" />
                <StatChip label="Saved" value={correctDeposits} tone="good" />
                <StatChip label="Right stopped" value={correctStops} tone="bad" />
                <StatChip label="Spoiled" value={wrongDeposits} tone="bad" />
              </div>

              {/* Top-5 name entry — only on a qualifying finish */}
              <div className="mt-7">
                {topOnOver === null ? (
                  <div className="h-[68px]" />
                ) : qualifies ? (
                  saveState === 'saved' ? (
                    <div className="over-check flex flex-col items-center gap-1 text-emerald-300">
                      <div className="flex items-center gap-2">
                        <CheckIcon />
                        <span className="text-sm font-bold">
                          Saved as {sanitizeName(name)}
                        </span>
                      </div>
                      {savedRank != null && (
                        <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#75bdea]">
                          #{savedRank} on the board
                        </span>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#75bdea]">
                        You made the top 5!
                      </div>
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <input
                          ref={nameInputRef}
                          value={name}
                          onChange={(e) =>
                            setName(
                              e.target.value
                                .toUpperCase()
                                .replace(/[^A-Z0-9 ]/g, '')
                                .slice(0, MAX_NAME_LEN),
                            )
                          }
                          onKeyDown={(e) => {
                            e.stopPropagation()
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              void handleSave()
                            }
                          }}
                          maxLength={MAX_NAME_LEN}
                          autoComplete="off"
                          autoCapitalize="characters"
                          spellCheck={false}
                          placeholder="YOUR NAME"
                          className="h-11 w-44 rounded-xl border-2 border-white/15 bg-[#0e1430] px-3 text-center text-base font-bold uppercase tracking-wider text-white outline-none transition placeholder:text-white/25 focus:border-[#75bdea] focus:ring-2 focus:ring-[#75bdea]/30"
                        />
                        <button
                          type="button"
                          onClick={() => void handleSave()}
                          disabled={saveState !== 'idle'}
                          className="h-11 rounded-xl bg-[#75bdea] px-5 text-sm font-bold uppercase tracking-wider text-[#1b2344] shadow-[0_4px_0_#1f4a66] transition hover:brightness-105 active:translate-y-[3px] active:shadow-[0_1px_0_#1f4a66] disabled:opacity-60"
                        >
                          {saveState === 'saving' ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  topOnOver.length >= 5 && (
                    <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">
                      Beat {fmtScore(topOnOver[topOnOver.length - 1].score)} to make the top 5
                    </div>
                  )
                )}
              </div>

              <div className="mt-8 flex justify-center gap-3">
                <button
                  onClick={() => {
                    reset()
                    start()
                  }}
                  className="h-11 rounded-xl bg-[#75bdea] px-7 text-sm font-bold uppercase tracking-wider text-[#1b2344] shadow-[0_4px_0_#1f4a66] transition hover:brightness-105 active:translate-y-[3px] active:shadow-[0_1px_0_#1f4a66] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  Play again
                </button>
                <button
                  onClick={() => {
                    reset()
                    resetToMenu()
                  }}
                  className="h-11 rounded-xl border-2 border-white/20 px-6 text-sm font-bold uppercase tracking-wider text-white/75 transition hover:border-white/50 hover:text-white active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  Back to menu
                </button>
              </div>
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
