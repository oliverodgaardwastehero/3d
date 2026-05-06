import { useEffect, useState } from 'react'
import { useGame } from '../lib/store'
import { CHAPTER_SUBTITLE, CHAPTER_TITLE, type ChapterId } from '../lib/chapters'

/**
 * HUD: tiny controls panel in the top-left, and a chapter title that fades in
 * for ~3.5s whenever the player enters a new diorama's trigger radius.
 */
export function HUD() {
  const currentChapter = useGame((s) => s.currentChapter)
  const hasStarted = useGame((s) => s.hasStarted)
  const [titleVisible, setTitleVisible] = useState<ChapterId | null>(null)

  useEffect(() => {
    if (!currentChapter) return
    setTitleVisible(currentChapter)
    const id = window.setTimeout(() => setTitleVisible(null), 3500)
    return () => window.clearTimeout(id)
  }, [currentChapter])

  if (!hasStarted) return null

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      <div className="absolute left-6 top-6 rounded-lg bg-black/40 px-4 py-2 text-sm leading-relaxed backdrop-blur">
        <div className="font-semibold text-white">Controls</div>
        <div>Arrows / WASD — walk</div>
        <div>Shift — run</div>
        <div>Space — jump (×2 to double-jump)</div>
      </div>

      {titleVisible && (
        <div
          key={titleVisible}
          className="chapter-title absolute bottom-24 left-1/2 -translate-x-1/2 text-center"
        >
          <div className="text-xs uppercase tracking-[0.4em] text-zinc-300/80 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
            Now entering
          </div>
          <div className="mt-2 text-3xl font-light tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
            {CHAPTER_TITLE[titleVisible]}
          </div>
          <div className="mt-1 text-sm font-light tracking-wide text-zinc-200/80 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
            {CHAPTER_SUBTITLE[titleVisible]}
          </div>
        </div>
      )}
    </div>
  )
}
