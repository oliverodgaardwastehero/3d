import type { SyntheticEvent } from 'react'
import { FPS } from '../../lib/fpsConfig'
import { useFps } from '../../lib/fpsState'

type Props = {
  className?: string
}

/**
 * Look-sensitivity slider (a multiplier on the base mouse/drag rate, shown as
 * a percentage). Lives on the title screen, the desktop pause card and the
 * touch settings panel; the value persists per browser. Stops its events from
 * bubbling so a drag on the slider can't trigger the surrounding "click to
 * take aim" handler or the title screen's Enter shortcut.
 */
export function SensitivityControl({ className = '' }: Props) {
  const sensitivity = useFps((s) => s.sensitivity)
  const setSensitivity = useFps((s) => s.setSensitivity)
  const stop = (e: SyntheticEvent) => e.stopPropagation()

  return (
    <label
      className={`flex items-center gap-3 text-white ${className}`}
      onClick={stop}
      onPointerDown={stop}
      onKeyDown={stop}
    >
      <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#75bdea]">
        Sensitivity
      </span>
      <input
        type="range"
        aria-label="Look sensitivity"
        min={FPS.SENS_MIN}
        max={FPS.SENS_MAX}
        step={FPS.SENS_STEP}
        value={sensitivity}
        onChange={(e) => setSensitivity(Number(e.target.value))}
        className="sens-slider w-36 cursor-pointer"
      />
      <span className="w-12 text-right text-sm font-bold tabular-nums">
        {Math.round(sensitivity * 100)}%
      </span>
    </label>
  )
}
