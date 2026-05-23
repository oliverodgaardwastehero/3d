import { useEffect, useState } from 'react'
import { GUIDE_NAME, LINE_DURATION_MS, useTour } from '../../lib/tourState'

/**
 * Bottom-of-screen speech bubble. Shows the guide's most recent line for
 * LINE_DURATION_MS, then fades out.
 */
export function GuidePanel() {
  const spokenLine = useTour((s) => s.spokenLine)
  const spokenAt = useTour((s) => s.spokenAt)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!spokenLine) {
      setVisible(false)
      return
    }
    setVisible(true)
    const id = window.setTimeout(() => setVisible(false), LINE_DURATION_MS)
    return () => window.clearTimeout(id)
  }, [spokenLine, spokenAt])

  return (
    <div
      className={`pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 max-w-xl rounded-2xl bg-zinc-950/85 px-6 py-4 text-white shadow-2xl backdrop-blur transition-opacity duration-300 ${
        visible && spokenLine ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.35em] text-emerald-300/90">
        {GUIDE_NAME}
      </div>
      <div className="mt-1.5 text-base leading-relaxed">{spokenLine}</div>
    </div>
  )
}
