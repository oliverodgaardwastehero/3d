import type { ReactNode } from 'react'
import { useGame } from '../lib/store'
import { GuidePanel } from './office/GuidePanel'
import { DepotHUD } from './depot/DepotHUD'
import { Keycap, MoveKeysInline } from './Keycap'

/** Frosted-glass control card matching the leaderboard / score-modal language. */
function HudCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute left-6 top-6 select-none rounded-2xl bg-gradient-to-b from-[#26315a]/80 to-[#161d39]/85 px-4 py-3 ring-1 ring-white/10 backdrop-blur-md shadow-[0_14px_36px_-10px_rgba(0,0,0,0.5)]">
      <div className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#75bdea]">{title}</div>
      {children}
    </div>
  )
}

export function HUD() {
  const hasStarted = useGame((s) => s.hasStarted)
  const gameMode = useGame((s) => s.gameMode)
  if (!hasStarted) return null

  if (gameMode === 'office') {
    return (
      <>
        <HudCard title="Your first day">
          <div className="mt-2 flex flex-col gap-1.5 text-sm text-white/85">
            <div className="flex items-center gap-2">
              <MoveKeysInline /> walk
            </div>
            <div className="flex items-center gap-2">
              <Keycap size="sm">Shift</Keycap> run
            </div>
          </div>
          <div className="mt-2.5 max-w-[15rem] text-xs leading-relaxed text-white/55">
            Walk into a room — Helena will tell you about it.
          </div>
        </HudCard>
        <GuidePanel />
      </>
    )
  }

  if (gameMode === 'depot') {
    return (
      <>
        <HudCard title="Recycling Depot">
          <div className="mt-2 flex flex-col gap-1.5 text-sm text-white/85">
            <div className="flex items-center gap-2">
              <MoveKeysInline /> walk
            </div>
            <div className="flex items-center gap-2">
              <Keycap size="sm">Shift</Keycap> run
            </div>
            <div className="flex items-center gap-2">
              <Keycap size="sm">Space</Keycap> kick
            </div>
          </div>
        </HudCard>
        <DepotHUD board="depot" />
      </>
    )
  }

  return null
}
