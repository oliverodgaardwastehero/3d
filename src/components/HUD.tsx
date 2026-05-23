import { useGame } from '../lib/store'
import { GuidePanel } from './office/GuidePanel'
import { DepotHUD } from './depot/DepotHUD'

export function HUD() {
  const hasStarted = useGame((s) => s.hasStarted)
  const gameMode = useGame((s) => s.gameMode)
  if (!hasStarted) return null

  if (gameMode === 'office') {
    return (
      <>
        <div className="pointer-events-none absolute left-6 top-6 select-none rounded-lg bg-black/40 px-4 py-2 text-sm leading-relaxed text-white backdrop-blur">
          <div className="font-semibold">Your first day</div>
          <div>WASD / Arrows — walk</div>
          <div>Shift — run</div>
          <div className="mt-1.5 text-xs text-zinc-300">
            Walk into a room — Helena will tell you about it.
          </div>
        </div>
        <GuidePanel />
      </>
    )
  }

  if (gameMode === 'depot') {
    return (
      <>
        <div className="pointer-events-none absolute left-6 top-6 select-none rounded-lg bg-black/40 px-4 py-2 text-sm leading-relaxed text-white backdrop-blur">
          <div className="font-semibold">Recycling Depot</div>
          <div>WASD / Arrows — walk · Shift — run</div>
          <div>Space — kick</div>
        </div>
        <DepotHUD />
      </>
    )
  }

  return null
}
