import { useEffect, useRef, useState } from 'react'
import { fpsInput } from '../../lib/fpsInput'
import { FPS } from '../../lib/fpsConfig'

/** Virtual-stick throw in px; also the visual radius of the base ring. */
const STICK_RADIUS = 56
/** A press that moves less than this and lifts within TAP_MAX_MS counts as a tap = shoot. */
const TAP_MAX_MOVE = 10
const TAP_MAX_MS = 260
/** Share of the screen width (from the left) that owns the movement stick. */
const STICK_ZONE = 0.42

type Props = {
  ammo: number
  reloading: boolean
}

/**
 * On-screen controls for phones/tablets (and the desktop fallback when the
 * browser refuses pointer lock). Left part of the screen: touch down to plant
 * a virtual stick and drag to move. Everywhere else: drag to aim, tap to shoot.
 * Big FIRE button (shows the ammo) and a RELOAD button bottom-right. Uses
 * Pointer Events, so a mouse drives it too. Writes into the shared `fpsInput`
 * channel; FPSPlayer drains it each frame.
 */
export function TouchControls({ ammo, reloading }: Props) {
  const layerRef = useRef<HTMLDivElement>(null)
  const baseRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const [hintVisible, setHintVisible] = useState(true)

  useEffect(() => {
    const id = window.setTimeout(() => setHintVisible(false), 6000)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    const layer = layerRef.current
    const base = baseRef.current
    const knob = knobRef.current
    if (!layer || !base || !knob) return

    let stickId: number | null = null
    let stickOX = 0
    let stickOY = 0
    let lookId: number | null = null
    let lookX = 0
    let lookY = 0
    let lookT = 0
    let lookMoved = 0

    const showStick = (x: number, y: number) => {
      base.hidden = false
      base.style.left = `${x}px`
      base.style.top = `${y}px`
      knob.style.transform = 'translate(-50%, -50%)'
    }
    const hideStick = () => {
      base.hidden = true
      fpsInput.moveX = 0
      fpsInput.moveZ = 0
    }

    const onDown = (e: PointerEvent) => {
      // The FIRE / RELOAD buttons (and any other on-screen UI) handle their own presses.
      if ((e.target as HTMLElement | null)?.closest('[data-touch-ui]')) return
      e.preventDefault()
      try {
        layer.setPointerCapture(e.pointerId)
      } catch {
        // not critical
      }
      const inStickZone = e.clientX < window.innerWidth * STICK_ZONE
      if (inStickZone && stickId === null) {
        stickId = e.pointerId
        stickOX = e.clientX
        stickOY = e.clientY
        showStick(stickOX, stickOY)
      } else if (lookId === null) {
        lookId = e.pointerId
        lookX = e.clientX
        lookY = e.clientY
        lookT = performance.now()
        lookMoved = 0
      }
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerId === stickId) {
        let dx = e.clientX - stickOX
        let dy = e.clientY - stickOY
        const len = Math.hypot(dx, dy)
        if (len > STICK_RADIUS) {
          dx *= STICK_RADIUS / len
          dy *= STICK_RADIUS / len
        }
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
        // Screen right = strafe right, screen down = backward.
        fpsInput.moveX = dx / STICK_RADIUS
        fpsInput.moveZ = dy / STICK_RADIUS
      } else if (e.pointerId === lookId) {
        const dx = e.clientX - lookX
        const dy = e.clientY - lookY
        lookX = e.clientX
        lookY = e.clientY
        lookMoved += Math.hypot(dx, dy)
        fpsInput.lookDX += dx * FPS.TOUCH_LOOK_GAIN
        fpsInput.lookDY += dy * FPS.TOUCH_LOOK_GAIN
      }
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerId === stickId) {
        stickId = null
        hideStick()
      } else if (e.pointerId === lookId) {
        lookId = null
        // A quick, still press on the aim area is a shot.
        if (lookMoved < TAP_MAX_MOVE && performance.now() - lookT < TAP_MAX_MS) {
          fpsInput.fire = true
        }
      }
    }

    layer.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      layer.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      hideStick()
    }
  }, [])

  const low = ammo <= 2 && !reloading

  return (
    <div
      ref={layerRef}
      className="touch-layer pointer-events-auto absolute inset-0 touch-none select-none"
    >
      {/* Virtual stick — planted where the thumb lands */}
      <div
        ref={baseRef}
        hidden
        data-touch-stick
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-sm"
        style={{ width: STICK_RADIUS * 2, height: STICK_RADIUS * 2 }}
      >
        <div
          ref={knobRef}
          className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full bg-white/75 shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
          style={{ transform: 'translate(-50%, -50%)' }}
        />
      </div>

      {/* Opening hint */}
      {hintVisible && (
        <div className="pointer-events-none absolute left-1/2 top-[7.5rem] -translate-x-1/2 rounded-full bg-black/45 px-4 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-200 backdrop-blur">
          Left: drag to move · Right: drag to aim, tap to shoot
        </div>
      )}

      {/* Reload */}
      <button
        type="button"
        data-touch-ui
        aria-label="Reload"
        onPointerDown={(e) => {
          e.preventDefault()
          fpsInput.reload = true
        }}
        className={[
          'absolute bottom-[10.5rem] right-9 flex h-14 w-14 flex-col items-center justify-center rounded-full ring-1 backdrop-blur-md',
          'text-white transition active:scale-95',
          reloading ? 'animate-pulse bg-amber-400/25 ring-amber-300/50' : 'bg-[#0e1430]/75 ring-white/15',
        ].join(' ')}
      >
        <span className="text-base font-bold leading-none">R</span>
        <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.2em] text-white/60">
          reload
        </span>
      </button>

      {/* Fire — shows the cell */}
      <button
        type="button"
        data-touch-ui
        aria-label="Fire"
        onPointerDown={(e) => {
          e.preventDefault()
          fpsInput.fire = true
        }}
        className={[
          'absolute bottom-7 right-6 flex h-24 w-24 flex-col items-center justify-center rounded-full ring-4 ring-white/20',
          'shadow-[0_6px_0_#1f4a66] transition active:translate-y-1 active:shadow-[0_2px_0_#1f4a66]',
          reloading
            ? 'bg-amber-300 text-[#1b2344]'
            : low
              ? 'bg-rose-300 text-[#1b2344]'
              : 'bg-[#75bdea] text-[#13203f]',
        ].join(' ')}
      >
        <span className="font-mono text-4xl font-bold leading-none tabular-nums">
          {reloading ? '––' : ammo}
        </span>
        <span className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.24em]">
          {reloading ? 'cell…' : 'fire'}
        </span>
      </button>
    </div>
  )
}
