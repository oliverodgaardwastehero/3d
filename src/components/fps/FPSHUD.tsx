import { useEffect, useState, type CSSProperties } from 'react'
import { useDepot } from '../../lib/depotState'
import { GAME } from '../../lib/depotLayout'
import { requestPointerLock, useFps } from '../../lib/fpsState'
import { FPS } from '../../lib/fpsConfig'
import type { HitOutcome, HitZone } from '../../lib/npcBodies'
import { Keycap, MoveKeysInline } from '../Keycap'
import { SensitivityControl } from './SensitivityControl'
import { TouchControls } from './TouchControls'

type Marker = { kind: HitOutcome; zone: HitZone; key: number }

/**
 * Show something from a store "pulse" (a counter that bumps on each event)
 * until `ms` later. Returns true while the latest pulse is still fresh.
 * Re-keying on the pulse restarts CSS animations for back-to-back events.
 */
function usePulseWindow(pulse: number, ms: number, ignoreInitial = false): boolean {
  const [seen, setSeen] = useState(() => (ignoreInitial ? pulse : 0))
  useEffect(() => {
    if (pulse === seen) return
    const id = window.setTimeout(() => setSeen(pulse), ms)
    return () => window.clearTimeout(id)
  }, [pulse, seen, ms])
  return pulse !== seen
}

/**
 * DOM overlay for the first-person mode: crosshair (+ hit marker / headshot
 * call-out), ammo readout, sensitivity feedback, and either the pointer-lock
 * "click to take aim" prompt (desktop — doubles as the pause screen, with the
 * sensitivity slider) or the on-screen touch controls with a settings gear.
 * The shared match scoreboard / game-over card come from DepotHUD; this only
 * adds what's specific to being behind the gun.
 */
export function FPSHUD() {
  const inputMode = useFps((s) => s.inputMode)
  const locked = useFps((s) => s.locked)
  const ammo = useFps((s) => s.ammo)
  const reloading = useFps((s) => s.reloading)
  const hover = useFps((s) => s.hover)
  const hitPulse = useFps((s) => s.hitPulse)
  const hitKind = useFps((s) => s.hitKind)
  const hitZone = useFps((s) => s.hitZone)
  const sensitivity = useFps((s) => s.sensitivity)
  const sensPulse = useFps((s) => s.sensPulse)
  const phase = useDepot((s) => s.phase)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const markerFresh = usePulseWindow(hitPulse, 300)
  const headshotFresh = usePulseWindow(hitPulse, 750)
  const sensFresh = usePulseWindow(sensPulse, 1200, true)

  if (phase !== 'playing') return null

  const marker: Marker | null =
    markerFresh && hitPulse > 0 && hitKind && hitZone
      ? { kind: hitKind, zone: hitZone, key: hitPulse }
      : null
  const headshot = headshotFresh && hitPulse > 0 && hitKind === 'good' && hitZone === 'head'

  const feedback = (
    <>
      <Crosshair hover={hover} marker={marker} />
      {headshot && (
        <div
          key={hitPulse}
          className="toast-pop pointer-events-none absolute left-1/2 top-[calc(50%+2.75rem)] -translate-x-1/2 whitespace-nowrap text-center"
        >
          <div className="text-[11px] font-extrabold uppercase tracking-[0.4em] text-amber-300 [text-shadow:0_2px_0_#0b1024,0_0_18px_rgba(252,211,77,0.6)]">
            Headshot
          </div>
          <div className="text-xl font-bold tabular-nums text-amber-200 [text-shadow:0_2px_0_#0b1024]">
            +{GAME.POINTS_HEADSHOT}
          </div>
        </div>
      )}
      {sensFresh && (
        <div
          key={`s${sensPulse}`}
          className="toast-pop pointer-events-none absolute bottom-[8.5rem] left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-white backdrop-blur sm:bottom-[7rem]"
        >
          Sensitivity {Math.round(sensitivity * 100)}%
        </div>
      )}
    </>
  )

  if (inputMode === 'touch') {
    return (
      <div className="pointer-events-none absolute inset-0 select-none">
        {feedback}
        <TouchControls ammo={ammo} reloading={reloading} />
        {/* Settings gear + slider panel sit above the touch layer, so presses
            here never plant the stick or fire. */}
        <button
          type="button"
          aria-label="Settings"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((o) => !o)}
          className={[
            'pointer-events-auto absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full ring-1 backdrop-blur-md transition active:scale-95',
            settingsOpen ? 'bg-[#75bdea] text-[#1b2344] ring-white/40' : 'bg-[#0e1430]/75 text-white ring-white/15',
          ].join(' ')}
        >
          <GearIcon />
        </button>
        {settingsOpen && (
          <div className="pointer-events-auto absolute right-4 top-[4.25rem] rounded-2xl bg-gradient-to-b from-[#26315a]/95 to-[#161d39]/95 px-4 py-3 shadow-[0_14px_36px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/10 backdrop-blur-md">
            <SensitivityControl />
            <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
              How fast a drag turns you
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {locked && (
        <>
          {feedback}
          <AmmoReadout ammo={ammo} reloading={reloading} />
        </>
      )}

      {!locked && (
        <div
          role="button"
          tabIndex={0}
          onClick={requestPointerLock}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') requestPointerLock()
          }}
          className="over-backdrop pointer-events-auto absolute inset-0 flex cursor-pointer items-center justify-center bg-[#0b1020]/70 px-4 backdrop-blur-md"
        >
          <div className="over-card w-full max-w-md rounded-[28px] bg-gradient-to-b from-[#26315a] to-[#161d39] px-8 py-8 text-center text-white shadow-[0_30px_90px_-20px_rgba(0,0,0,0.75)] ring-1 ring-white/10 sm:px-10">
            <div className="text-[11px] font-bold uppercase tracking-[0.45em] text-white/45">
              Paused
            </div>
            <div className="mt-3 text-3xl font-bold tracking-tight">Click to take aim</div>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              The clock only runs while you hold the mouse.
              <br />
              Press <span className="font-bold text-white/80">Esc</span> any time to let go.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2.5 text-left text-sm text-white/85">
              <div className="flex items-center gap-2">
                <MoveKeysInline /> walk
              </div>
              <div className="flex items-center gap-2">
                <Keycap size="sm">Shift</Keycap> run
              </div>
              <div className="flex items-center gap-2">
                <Keycap size="sm">Mouse</Keycap> aim
              </div>
              <div className="flex items-center gap-2">
                <Keycap size="sm">Click</Keycap> shoot
              </div>
              <div className="flex items-center gap-2">
                <Keycap size="sm">R</Keycap> reload
              </div>
              <div className="flex items-center gap-2">
                <Keycap size="sm">[ ]</Keycap> sensitivity
              </div>
            </div>

            {/* Slider stops its own clicks, so dragging it doesn't re-lock. */}
            <div className="mt-6 flex justify-center rounded-xl bg-white/[0.06] px-4 py-3 ring-1 ring-inset ring-white/5">
              <SensitivityControl />
            </div>

            <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#75bdea]">
              Shoot the ones heading to the wrong bin · headshots +{GAME.POINTS_HEADSHOT}
            </div>
            {/* Escape hatch for browsers / setups that refuse pointer lock. */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                useFps.getState().setInputMode('touch')
              }}
              className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40 underline-offset-4 transition hover:text-white hover:underline"
            >
              No mouse lock? Use drag &amp; tap controls
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  )
}

const BAR = 'absolute left-1/2 top-1/2 rounded-[1px] transition-[transform,background-color] duration-100 xhair-shadow'

function Crosshair({ hover, marker }: { hover: boolean; marker: Marker | null }) {
  const color = hover ? 'bg-[#75bdea]' : 'bg-white'
  const gap = hover ? 8 : 5
  const bars: CSSProperties[] = [
    { width: 2, height: 11, transform: `translate(-50%, calc(-100% - ${gap}px))` },
    { width: 2, height: 11, transform: `translate(-50%, ${gap}px)` },
    { width: 11, height: 2, transform: `translate(calc(-100% - ${gap}px), -50%)` },
    { width: 11, height: 2, transform: `translate(${gap}px, -50%)` },
  ]
  // Green for a good stop, gold for a headshot, red for a mistake.
  const markerColor =
    marker?.kind === 'bad'
      ? 'bg-rose-300'
      : marker?.zone === 'head'
        ? 'bg-amber-300'
        : 'bg-emerald-300'
  const markerLen = marker?.kind === 'good' && marker.zone === 'head' ? 'w-9' : 'w-7'
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2">
      <span className={`${BAR} h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full ${color}`} />
      {bars.map((style, i) => (
        <span key={i} className={`${BAR} ${color}`} style={style} />
      ))}
      {marker && (
        <div key={marker.key} className="hitmark absolute left-1/2 top-1/2">
          {[45, -45].map((deg) => (
            <span
              key={deg}
              className={`absolute left-1/2 top-1/2 h-[3px] ${markerLen} rounded-full ${markerColor} xhair-shadow`}
              style={{ transform: `translate(-50%, -50%) rotate(${deg}deg)` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AmmoReadout({ ammo, reloading }: { ammo: number; reloading: boolean }) {
  const low = ammo <= 2 && !reloading
  return (
    <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2">
      <div
        className={`text-[11px] font-bold uppercase tracking-[0.3em] transition-opacity ${
          reloading
            ? 'animate-pulse text-amber-300 opacity-100'
            : low
              ? 'text-rose-300 opacity-100'
              : 'opacity-0'
        }`}
      >
        {reloading ? 'Swapping cell…' : 'R to reload'}
      </div>
      <div className="flex items-end gap-4 rounded-2xl bg-gradient-to-b from-[#26315a]/80 to-[#161d39]/85 px-5 py-3 text-white shadow-[0_14px_36px_-10px_rgba(0,0,0,0.5)] ring-1 ring-white/10 backdrop-blur-md">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#75bdea]">
            Energy cell
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 font-mono tabular-nums">
            <span
              className={`text-4xl font-bold leading-none ${
                reloading ? 'text-amber-300' : low ? 'text-rose-300' : 'text-white'
              }`}
            >
              {reloading ? '––' : ammo}
            </span>
            <span className="text-sm text-white/45">/ {FPS.MAG_SIZE}</span>
          </div>
        </div>
        <div className="mb-1 flex gap-1">
          {Array.from({ length: FPS.MAG_SIZE }, (_, i) => (
            <span
              key={i}
              className={`h-6 w-1.5 rounded-sm transition-colors ${
                !reloading && i < ammo
                  ? 'bg-[#75bdea] shadow-[0_0_8px_rgba(117,189,234,0.9)]'
                  : 'bg-white/15'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
