import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useGame, type PlayableMode } from '../lib/store'
import {
  BOARDS,
  BOARD_LABEL,
  fmtScore,
  loadTopScores,
  type BoardId,
  type ScoreEntry,
} from '../lib/highScore'
import { fetchTopScores } from '../lib/leaderboard'
import { detectInputMode } from '../lib/fpsState'
import { Keycap, MoveKeys } from './Keycap'
import { SensitivityControl } from './fps/SensitivityControl'

type Props = {
  onBegin: (mode: PlayableMode) => void
}

const FONT_STACK = "'Open Runde', system-ui, -apple-system, 'Segoe UI', sans-serif"

// First person is THE game here; the classic 3rd-person kick mode stays
// available as a secondary pick. Remember the last choice per browser.
const MODE_KEY = 'game:mode:v1'
function loadMode(): PlayableMode {
  try {
    const v = window.localStorage.getItem(MODE_KEY)
    return v === 'depot' ? 'depot' : 'fps'
  } catch {
    return 'fps'
  }
}
function saveMode(mode: PlayableMode) {
  try {
    window.localStorage.setItem(MODE_KEY, mode)
  } catch {
    // ignore storage errors
  }
}

const MODE_COPY: Record<PlayableMode, { label: string; hint: string; tagline: ReactNode }> = {
  depot: {
    label: 'Kick mode',
    hint: '3rd person · Space to kick',
    tagline: (
      <>
        Some people have no concept of what waste goes in the right containers.
        <br />
        Help them understand by kicking them in the face!
      </>
    ),
  },
  fps: {
    label: 'FPS mode',
    hint: 'First person · mouse to aim',
    tagline: (
      <>
        Some people have no concept of what waste goes in the right containers.
        <br />
        Help them understand — down the barrel of the Eco-Blaster!
      </>
    ),
  },
}

/**
 * Title screen for "Defend the Waste Fractions", built to match the
 * WasteHero design-system Figma frame (node 1174:2989): full-bleed hero
 * artwork, the WasteHero wordmark eyebrow, the two-tone vector title, a
 * punchy subtitle, a keycap control legend, and the blue Start game CTA.
 *
 * Two ways to play the same match: the classic 3rd-person kick game and the
 * first-person blaster. The picker below the legend chooses; each mode has its
 * own leaderboard (tabs on the score card) so kick and FPS scores never mix.
 *
 * The title, wordmark and keycaps ship as pre-rendered SVGs from the design
 * system, so the licensed display fonts are baked into vectors and only the
 * free Open Runde face is loaded for UI text.
 */
export function LoadingScreen({ onBegin }: Props) {
  const hasStarted = useGame((s) => s.hasStarted)
  // Load state is reported up from the lazily-loaded Scene chunk (drei lives
  // there), so the title screen itself pulls in zero WebGL code.
  const loadProgress = useGame((s) => s.loadProgress)
  const assetsReady = useGame((s) => s.assetsReady)
  const [hidden, setHidden] = useState(false)
  const [graceElapsed, setGraceElapsed] = useState(false)
  const [mode, setMode] = useState<PlayableMode>(() => loadMode())
  // Phones/tablets aim by dragging — show the matching legend.
  const [touch] = useState(() => detectInputMode() === 'touch')
  // The leaderboard tab follows the picked mode but can be flipped on its own.
  const [board, setBoard] = useState<BoardId>(() => loadMode())
  // Both boards, seeded from the instant local mirrors and refreshed from the
  // shared API per board — so flipping tabs never shows a blank list.
  const [boards, setBoards] = useState<Record<BoardId, ScoreEntry[]>>(() => ({
    depot: loadTopScores('depot'),
    fps: loadTopScores('fps'),
  }))
  const topScores = boards[board]

  const pickMode = useCallback((m: PlayableMode) => {
    setMode(m)
    setBoard(m)
    saveMode(m)
  }, [])

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
    // On the menu (incl. returning from a match): refresh the selected board
    // from the shared API; the local mirror already in state shows meanwhile.
    setHidden(false)
    let cancelled = false
    fetchTopScores(board).then((s) => {
      if (!cancelled) setBoards((prev) => ({ ...prev, [board]: s }))
    })
    return () => {
      cancelled = true
    }
  }, [hasStarted, board])

  const ready = graceElapsed && assetsReady

  // Enter starts the selected mode once everything is loaded (Space is the
  // in-game kick). Tab flips the mode picker.
  useEffect(() => {
    if (!ready || hasStarted) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onBegin(mode)
      } else if (e.key === 'Tab') {
        e.preventDefault()
        pickMode(mode === 'depot' ? 'fps' : 'depot')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, hasStarted, onBegin, mode, pickMode])

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

      {/* Bottom-left leaderboard, one tab per mode */}
      <Leaderboard scores={topScores} board={board} onSelectBoard={setBoard} />

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
          {MODE_COPY[mode].tagline}
        </p>
      </header>

      <div className="flex-1" />

      {/* ── Bottom: control legend + mode picker + Start game ─────────── */}
      <footer className="relative flex flex-col items-center gap-[clamp(1rem,3vh,2.25rem)] px-6 pb-[clamp(1.5rem,5vh,3rem)]">
        <div
          className="ts-rise flex flex-wrap items-center justify-center gap-x-[clamp(1.5rem,3vw,3rem)] gap-y-3 text-white"
          style={{ animationDelay: '220ms' }}
        >
          {mode === 'fps' && touch ? (
            <>
              <ControlHint label="Move">
                <Keycap>Left stick</Keycap>
              </ControlHint>
              <ControlHint label="Aim">
                <Keycap>Drag</Keycap>
              </ControlHint>
              <ControlHint label="Shoot">
                <Keycap>Tap</Keycap>
              </ControlHint>
            </>
          ) : (
            <>
              <ControlHint label="Move">
                <MoveKeys />
              </ControlHint>
              <ControlHint label="Run">
                <Keycap>Shift</Keycap>
              </ControlHint>
              {mode === 'depot' ? (
                <ControlHint label="Eco kick">
                  <Keycap>Space</Keycap>
                </ControlHint>
              ) : (
                <>
                  <ControlHint label="Aim">
                    <Keycap>Mouse</Keycap>
                  </ControlHint>
                  <ControlHint label="Shoot">
                    <Keycap>Click</Keycap>
                  </ControlHint>
                  <ControlHint label="Reload">
                    <Keycap>R</Keycap>
                  </ControlHint>
                </>
              )}
            </>
          )}
        </div>

        <ModePicker mode={mode} onPick={pickMode} touch={touch} />

        {/* Look sensitivity for the blaster — persists per browser, also
            adjustable in-game (Esc card / `[` `]` / touch gear). */}
        {mode === 'fps' && (
          <div
            className="ts-rise flex justify-center rounded-xl bg-[#0e1430]/60 px-4 py-2 ring-1 ring-white/10 backdrop-blur-md"
            style={{ animationDelay: '300ms' }}
          >
            <SensitivityControl />
          </div>
        )}

        <div className="ts-pop relative isolate">
          {/* Breathing cyan halo — appears the moment the game is ready, which
              is itself the "comes alive" beat. `isolate` keeps the -z-10 halo
              scoped to this wrapper (above the full-screen hero, behind the CTA). */}
          {ready && (
            <span
              aria-hidden
              className="ts-cta-glow pointer-events-none absolute inset-0 -z-10 rounded-[16px] bg-[#75bdea] blur-2xl"
            />
          )}
          <button
            type="button"
            onClick={ready ? () => onBegin(mode) : undefined}
            disabled={!ready}
            className={[
              'relative flex items-center justify-center gap-3 overflow-hidden rounded-[14px] bg-[#75bdea] px-9 py-5',
              'text-lg font-extrabold uppercase tracking-[0.12em] whitespace-nowrap text-[#13203f]',
              'shadow-[0_6px_0_#1f4a66] transition-[transform,filter,box-shadow] duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b2344]',
              ready
                ? 'cursor-pointer hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_8px_0_#1f4a66] active:translate-y-1 active:shadow-[0_2px_0_#1f4a66] active:brightness-95'
                : 'cursor-default opacity-70 shadow-[0_4px_0_#1f4a66]',
            ].join(' ')}
          >
            {/* Subtle progress fill so the wait reads as intentional. */}
            {!ready && loadProgress > 0 && (
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 bg-white/20 transition-[width] duration-300"
                style={{ width: `${loadProgress}%` }}
              />
            )}
            {/* Periodic light sweep when ready. */}
            {ready && (
              <span
                aria-hidden
                className="ts-cta-sheen pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent"
              />
            )}
            <span className="relative z-10 flex items-center gap-3">
              {ready && (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
              {ready
                ? mode === 'fps'
                  ? 'Start game'
                  : 'Start kick mode'
                : loadProgress > 0
                  ? `Loading ${Math.round(loadProgress)}%`
                  : 'Loading…'}
            </span>
          </button>
        </div>
      </footer>
    </div>
  )
}

function BootIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M8 3h5v9l6 3.5V19H5v-3l3-2V3Zm2 2v8.2l-3 2V17h9v-.4L12 14V5h-2Z" />
    </svg>
  )
}

function BlasterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M2 8h18l2 1v3l-2 1h-7l-1 3H9l1-3H7l-2 6H2l2-6V8Zm2 2v2h13.6l.4-.2v-1.6l-.4-.2H4Z" />
    </svg>
  )
}

/** Segmented control that picks how you play: first-person blaster (default) or classic kick. */
function ModePicker({
  mode,
  onPick,
  touch,
}: {
  mode: PlayableMode
  onPick: (m: PlayableMode) => void
  touch: boolean
}) {
  const hint =
    mode === 'fps'
      ? touch
        ? 'First person · drag to aim, tap to shoot'
        : MODE_COPY.fps.hint
      : MODE_COPY.depot.hint
  return (
    <div className="ts-rise flex flex-col items-center gap-2" style={{ animationDelay: '280ms' }}>
      <div
        role="radiogroup"
        aria-label="Game mode"
        className="flex items-center gap-1 rounded-[14px] bg-[#0e1430]/70 p-1 ring-1 ring-white/10 backdrop-blur-md shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]"
      >
        {(['fps', 'depot'] as const).map((m) => {
          const active = m === mode
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onPick(m)}
              className={[
                'mode-pill flex items-center gap-2 rounded-[10px] px-4 py-2 text-[13px] font-bold uppercase tracking-[0.12em]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                active
                  ? 'bg-white text-[#1b2344] shadow-[0_3px_0_#1b2344]'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              ].join(' ')}
            >
              {m === 'depot' ? <BootIcon /> : <BlasterIcon />}
              {MODE_COPY[m].label}
            </button>
          )
        })}
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">
        {hint}
        {!touch && <span className="text-white/35"> · Tab to switch</span>}
      </div>
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

function Leaderboard({
  scores,
  board,
  onSelectBoard,
}: {
  scores: ScoreEntry[]
  board: BoardId
  onSelectBoard: (b: BoardId) => void
}) {
  return (
    <aside
      // z-10: the footer's full-width box overlaps this corner; lift the card so
      // the board tabs receive clicks.
      className="ts-rise absolute bottom-[clamp(1rem,4vh,2.25rem)] left-[clamp(1rem,3vw,2.25rem)] z-10 hidden w-[clamp(212px,17vw,272px)] overflow-hidden rounded-2xl bg-gradient-to-b from-[#26315a]/85 to-[#161d39]/90 px-5 py-4 text-white shadow-[0_14px_36px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/10 backdrop-blur-md sm:block"
      style={{ animationDelay: '360ms' }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.26em] text-[#75bdea]">
          <CrownIcon />
          High scores
        </h2>
        {/* One board per mode — kick and FPS scores are never mixed. */}
        <div role="tablist" aria-label="Leaderboard" className="flex gap-0.5 rounded-md bg-white/5 p-0.5">
          {BOARDS.map((b) => {
            const active = b === board
            return (
              <button
                key={b}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectBoard(b)}
                className={[
                  'mode-pill rounded-[5px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                  active ? 'bg-[#75bdea] text-[#1b2344]' : 'text-white/45 hover:text-white/80',
                ].join(' ')}
              >
                {BOARD_LABEL[b]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-3 h-px bg-gradient-to-r from-white/20 via-white/5 to-transparent" />

      {scores.length === 0 ? (
        <p className="mt-3 text-[13px] font-semibold leading-snug text-white/55">
          No {BOARD_LABEL[board]} records yet — set the first!
        </p>
      ) : (
        <ol className="mt-2 flex flex-col gap-0.5">
          {scores.map((entry, i) => (
            <li
              key={`${board}-${entry.at}-${i}`}
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
                {fmtScore(entry.score)}
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
  children: ReactNode
}

function ControlHint({ label, children }: ControlHintProps) {
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      {children}
      <span className="text-[clamp(0.8rem,1.1vw,1rem)] font-bold whitespace-nowrap">{label}</span>
    </div>
  )
}
