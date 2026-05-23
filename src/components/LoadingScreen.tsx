import { useProgress } from '@react-three/drei'
import { useEffect, useState } from 'react'
import { useGame } from '../lib/store'
import { loadBestScore } from '../lib/highScore'

type Props = {
  onBegin: () => void
}

type MenuKey = 'begin' | 'how' | 'credits'

/**
 * Title screen modeled after The Legend of Zelda: Breath of the Wild —
 * full-bleed hero artwork, centered title at the top, a right-aligned
 * menu in the middle, and small corner info.
 */
export function LoadingScreen({ onBegin }: Props) {
  const { progress, active, total } = useProgress()
  const hasStarted = useGame((s) => s.hasStarted)
  const [hidden, setHidden] = useState(false)
  const [graceElapsed, setGraceElapsed] = useState(false)
  const [bestScore, setBestScore] = useState<number | null>(() => loadBestScore())
  const [hovered, setHovered] = useState<MenuKey>('begin')

  useEffect(() => {
    const id = window.setTimeout(() => setGraceElapsed(true), 350)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (!hasStarted) {
      setHidden(false)
      setBestScore(loadBestScore())
      return
    }
    const id = window.setTimeout(() => setHidden(true), 600)
    return () => window.clearTimeout(id)
  }, [hasStarted])

  if (hidden) return null

  const nothingToLoad = total === 0
  const ready = graceElapsed && !active && (nothingToLoad || progress >= 100)

  return (
    <div
      className={[
        'pointer-events-auto absolute inset-0 z-50 overflow-hidden',
        'bg-zinc-950 transition-opacity duration-500',
        hasStarted ? 'opacity-0' : 'opacity-100',
      ].join(' ')}
    >
      {/* Full-bleed hero background */}
      <img
        src="/hero-mascot.png"
        alt=""
        className="intro-bg pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
      />

      {/* Atmospheric dim — top + bottom vignette so title + menu pop */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_45%,_rgba(0,0,0,0.55))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[40vh] bg-gradient-to-b from-zinc-950/65 via-zinc-950/15 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[24vh] bg-gradient-to-t from-zinc-950/55 via-zinc-950/10 to-transparent" />

      {/* Top-center title */}
      <div className="absolute inset-x-0 top-[7vh] flex flex-col items-center px-6 text-center">
        <div className="zelda-eyebrow text-[10px] uppercase tracking-[0.5em] text-amber-200/80">
          Waste Hero presents
        </div>
        <h1
          className="zelda-title mt-3 text-5xl font-light uppercase leading-[0.95] tracking-[0.12em] text-zinc-50 sm:text-7xl md:text-[5.5rem]"
          style={{
            textShadow:
              '0 2px 26px rgba(0,0,0,0.7), 0 0 60px rgba(244, 208, 64, 0.18)',
          }}
        >
          Defend the
          <br />
          <span className="font-extralight text-amber-200">Waste Fractions</span>
        </h1>
        <div className="zelda-subtitle mt-5 text-[11px] uppercase tracking-[0.42em] text-zinc-300/85">
          A 60-second sorting drill
        </div>
      </div>

      {/* Right-aligned menu */}
      <div className="absolute inset-y-0 right-[6vw] flex flex-col items-end justify-center gap-1.5 text-right text-zinc-100">
        <MenuItem
          label="Begin"
          enabled={ready}
          hovered={hovered === 'begin'}
          onHover={() => setHovered('begin')}
          onClick={ready ? onBegin : undefined}
          delayMs={1100}
        />
        <MenuItem
          label="How to play"
          enabled={false}
          hovered={hovered === 'how'}
          onHover={() => setHovered('how')}
          delayMs={1250}
        />
        <MenuItem
          label="Credits"
          enabled={false}
          hovered={hovered === 'credits'}
          onHover={() => setHovered('credits')}
          delayMs={1400}
        />

        {!ready && (
          <div className="mt-5 flex w-44 flex-col items-end gap-2 text-[10px] uppercase tracking-[0.32em] text-zinc-400">
            <div className="h-px w-full overflow-hidden bg-zinc-700">
              <div
                className="h-full bg-amber-300 transition-[width] duration-200 ease-out"
                style={{ width: `${Math.max(2, progress)}%` }}
              />
            </div>
            <span>Loading {Math.round(progress)}%</span>
          </div>
        )}
      </div>

      {/* Bottom-left: best score */}
      <div className="zelda-corner absolute bottom-6 left-6 text-[10px] uppercase tracking-[0.35em] text-zinc-300/80">
        {bestScore != null ? (
          <>
            Personal Best{' '}
            <span className="font-semibold text-amber-200">
              {bestScore >= 0 ? `+${bestScore}` : bestScore}
            </span>
          </>
        ) : (
          'No record yet'
        )}
      </div>

      {/* Bottom-right: control hint */}
      <div className="zelda-corner absolute bottom-6 right-6 text-[10px] uppercase tracking-[0.32em] text-zinc-400">
        WASD walk · Shift run · Space kick
      </div>
    </div>
  )
}

type MenuItemProps = {
  label: string
  enabled: boolean
  hovered: boolean
  onHover: () => void
  onClick?: () => void
  delayMs: number
}

function MenuItem({
  label,
  enabled,
  hovered,
  onHover,
  onClick,
  delayMs,
}: MenuItemProps) {
  const interactive = enabled && !!onClick
  const isHighlighted = interactive && hovered
  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onClick}
      disabled={!interactive}
      className={[
        'zelda-menu-item group relative flex items-center gap-3 px-3 py-2 text-base uppercase tracking-[0.32em] transition-all',
        interactive
          ? 'cursor-pointer'
          : 'cursor-not-allowed opacity-35',
        isHighlighted
          ? 'text-amber-100'
          : interactive
            ? 'text-zinc-200 hover:text-amber-100'
            : 'text-zinc-400',
      ].join(' ')}
      style={{
        animationDelay: `${delayMs}ms`,
        textShadow: '0 2px 14px rgba(0,0,0,0.7)',
      }}
    >
      {/* Hover marker — small left chevron */}
      <span
        aria-hidden
        className={[
          'h-px w-6 origin-right bg-amber-200 transition-all duration-300',
          isHighlighted ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />
      <span className="relative">
        {label}
        {/* Underline grows on hover */}
        <span
          aria-hidden
          className={[
            'absolute -bottom-1 right-0 h-px bg-amber-200/70 transition-all duration-300',
            isHighlighted ? 'w-full' : 'w-0',
          ].join(' ')}
        />
      </span>
    </button>
  )
}
