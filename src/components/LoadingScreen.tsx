import { useProgress } from '@react-three/drei'
import { useEffect, useState } from 'react'
import { useGame } from '../lib/store'
import { loadTopScores, type ScoreEntry } from '../lib/highScore'
import { fetchTopScores } from '../lib/leaderboard'

type Props = {
  onBegin: () => void
}

const FONT_STACK = "'Open Runde', system-ui, -apple-system, 'Segoe UI', sans-serif"

/**
 * Title screen for "Defend the Waste Fractions", built to match the
 * WasteHero design-system Figma frame (node 1174:2989): full-bleed hero
 * artwork, the WasteHero wordmark eyebrow, the two-tone vector title, a
 * punchy subtitle, a keycap control legend, and the blue Start game CTA.
 *
 * The title, wordmark and keycaps ship as pre-rendered SVGs from the design
 * system, so the licensed display fonts are baked into vectors and only the
 * free Open Runde face is loaded for UI text.
 */
export function LoadingScreen({ onBegin }: Props) {
  const { progress, active, total } = useProgress()
  const hasStarted = useGame((s) => s.hasStarted)
  const [hidden, setHidden] = useState(false)
  const [graceElapsed, setGraceElapsed] = useState(false)
  const [topScores, setTopScores] = useState<ScoreEntry[]>(() => loadTopScores())

  // Brief grace window so a sub-frame load doesn't flash the CTA as ready.
  useEffect(() => {
    const id = window.setTimeout(() => setGraceElapsed(true), 350)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (hasStarted) {
      const id = window.setTimeout(() => setHidden(true), 600)
      return () => window.clearTimeout(id)
    }
    // On the menu (incl. returning from a match): refresh from the shared
    // board, falling back to the instant local mirror already in state.
    setHidden(false)
    let cancelled = false
    fetchTopScores().then((s) => {
      if (!cancelled) setTopScores(s)
    })
    return () => {
      cancelled = true
    }
  }, [hasStarted])

  const nothingToLoad = total === 0
  const ready = graceElapsed && !active && (nothingToLoad || progress >= 100)

  // Enter starts the game once everything is loaded (Space is the in-game kick).
  useEffect(() => {
    if (!ready || hasStarted) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onBegin()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, hasStarted, onBegin])

  if (hidden) return null

  return (
    <div
      className={[
        'pointer-events-auto absolute inset-0 z-50 flex flex-col overflow-hidden',
        'bg-[#1b2344] transition-opacity duration-500',
        hasStarted ? 'opacity-0' : 'opacity-100',
      ].join(' ')}
      style={{ fontFamily: FONT_STACK }}
    >
      {/* Full-bleed hero artwork, anchored to the bottom so the action stays in
          frame. AVIF with a WebP fallback — every WebGL2 browser supports WebP. */}
      <picture className="ts-bg-fade pointer-events-none absolute inset-0 block h-full w-full select-none overflow-hidden">
        <source srcSet="/hero-bg.avif" type="image/avif" />
        <img
          src="/hero-bg.webp"
          alt=""
          decoding="async"
          fetchPriority="high"
          className="ts-bg-zoom h-full w-full object-cover object-bottom"
        />
      </picture>

      {/* Bottom-left leaderboard */}
      <Leaderboard scores={topScores} />

      {/* ── Top: eyebrow + title + subtitle ───────────────────────────── */}
      <header className="relative flex flex-col items-center gap-5 px-6 pt-[clamp(1.5rem,5vh,3rem)] text-center sm:gap-7">
        {/* "A  WasteHero  original" */}
        <div className="ts-rise flex items-center justify-center gap-3 text-white">
          <span className="text-[clamp(0.8rem,1.4vw,1.25rem)] font-semibold">A</span>
          <img
            src="/ws-logo-text.svg"
            alt="WasteHero"
            className="h-[clamp(18px,1.7vw,24px)] w-auto"
          />
          <span className="text-[clamp(0.8rem,1.4vw,1.25rem)] font-semibold">original game</span>
        </div>

        {/* Two-tone vector title with baked-in navy drop shadow */}
        <img
          src="/logo.svg"
          alt="Defend the Waste Fractions"
          className="ts-title h-auto w-[clamp(336px,82vw,1056px)] select-none"
        />

        {/* Subtitle */}
        <p
          className="ts-rise max-w-[min(760px,92vw)] text-[clamp(0.9rem,1.45vw,1.25rem)] font-semibold leading-relaxed text-white"
          style={{ textShadow: '0 4px 8px rgba(27,35,68,0.9)', animationDelay: '120ms' }}
        >
          Some people have no concept of what waste goes in the right containers.
          <br />
          Help them understand by kicking them in the face!
        </p>
      </header>

      <div className="flex-1" />

      {/* ── Bottom: control legend + Start game ───────────────────────── */}
      <footer className="relative flex flex-col items-center gap-[clamp(1.25rem,3.5vh,3rem)] px-6 pb-[clamp(1.5rem,5vh,3rem)]">
        <div className="ts-rise flex flex-wrap items-center justify-center gap-x-[clamp(1.25rem,3vw,3rem)] gap-y-3 text-white" style={{ animationDelay: '220ms' }}>
          <ControlHint label="Move" icon="/move.svg" />
          <ControlHint label="Run" icon="/run.svg" />
          <ControlHint label="Eco kick" icon="/kick.svg" />
        </div>

        <div className="ts-pop">
          <button
            type="button"
            onClick={ready ? onBegin : undefined}
            disabled={!ready}
            className={[
              'flex items-center justify-center rounded-[12px] bg-[#75bdea] p-6',
              'text-xl font-semibold leading-[0.75] whitespace-nowrap text-[#1b2344]',
              'transition-[filter,opacity] duration-150',
              ready
                ? 'cursor-pointer hover:brightness-105 active:brightness-95'
                : 'cursor-default opacity-70',
            ].join(' ')}
          >
            {ready ? 'Start game' : `Loading ${Math.round(progress)}%`}
          </button>
        </div>
      </footer>
    </div>
  )
}

function CrownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M4 7l4 3 4-6 4 6 4-3-1 10H5L4 7Z" />
    </svg>
  )
}

// Gold / silver / bronze for the top three; neutral below.
const RANK_BADGE = [
  'bg-amber-300 text-[#1b2344] shadow-[0_2px_0_#a16207]',
  'bg-slate-200 text-[#1b2344]',
  'bg-[#cd8b4f] text-[#1b2344]',
]

function Leaderboard({ scores }: { scores: ScoreEntry[] }) {
  return (
    <aside
      className="ts-rise absolute bottom-[clamp(1rem,4vh,2.25rem)] left-[clamp(1rem,3vw,2.25rem)] hidden w-[clamp(212px,17vw,272px)] overflow-hidden rounded-2xl bg-gradient-to-b from-[#26315a]/85 to-[#161d39]/90 px-5 py-4 text-white shadow-[0_14px_36px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/10 backdrop-blur-md sm:block"
      style={{ animationDelay: '360ms' }}
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.26em] text-[#75bdea]">
          <CrownIcon />
          High scores
        </h2>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
          Top 5
        </span>
      </div>

      <div className="mt-3 h-px bg-gradient-to-r from-white/20 via-white/5 to-transparent" />

      {scores.length === 0 ? (
        <p className="mt-3 text-[13px] font-semibold leading-snug text-white/55">
          No records yet — set the first!
        </p>
      ) : (
        <ol className="mt-2 flex flex-col gap-0.5">
          {scores.map((entry, i) => (
            <li
              key={`${entry.at}-${i}`}
              className={[
                'flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[14px]',
                i === 0 ? 'bg-amber-300/10 ring-1 ring-inset ring-amber-300/20' : '',
              ].join(' ')}
            >
              <span
                className={[
                  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[12px] font-bold tabular-nums',
                  RANK_BADGE[i] ?? 'bg-white/10 text-white/65',
                ].join(' ')}
              >
                {i + 1}
              </span>
              <span
                className={[
                  'min-w-0 flex-1 truncate text-left font-semibold',
                  i === 0 ? 'text-white' : 'text-white/85',
                ].join(' ')}
              >
                {entry.name ?? 'ANON'}
              </span>
              <span
                className={[
                  'shrink-0 text-right font-bold tabular-nums',
                  i === 0 ? 'text-amber-300' : 'text-white/90',
                ].join(' ')}
              >
                {entry.score >= 0 ? `+${entry.score}` : entry.score}
              </span>
            </li>
          ))}
        </ol>
      )}
    </aside>
  )
}

type ControlHintProps = {
  label: string
  icon: string
}

function ControlHint({ label, icon }: ControlHintProps) {
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <span className="text-[clamp(0.8rem,1.1vw,1rem)] font-bold whitespace-nowrap">{label}</span>
      <img src={icon} alt="" className="h-[clamp(26px,2.6vw,34px)] w-auto select-none" />
    </div>
  )
}
