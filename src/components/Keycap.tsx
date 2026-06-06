import type { ReactNode } from 'react'

type KeycapProps = {
  children: ReactNode
  /** `md` for the title-screen legend, `sm` for the compact in-game HUD. */
  size?: 'sm' | 'md'
}

/**
 * A chunky tactile keycap that speaks the game's depth language: a light face,
 * a same-hue hard bottom-shadow (matching the Start button's `shadow-[0_4px_0]`
 * and the rank badges), and a navy glyph. Single-glyph caps render square.
 */
export function Keycap({ children, size = 'md' }: KeycapProps) {
  const dims =
    size === 'sm'
      ? 'h-6 min-w-6 px-1.5 text-[11px] shadow-[0_2px_0_var(--cap-shadow)]'
      : 'h-9 min-w-9 px-2.5 text-[13px] shadow-[0_3px_0_var(--cap-shadow)]'
  return (
    <kbd
      className={[
        'inline-flex items-center justify-center rounded-[9px] font-bold leading-none select-none ring-1',
        'bg-gradient-to-b from-white to-[#e6ecf7] text-[#1b2344] ring-[#1b2344]/10 [--cap-shadow:#1b2344]',
        dims,
      ].join(' ')}
    >
      {children}
    </kbd>
  )
}

/** A D-pad style diamond: one cap on top, three along the bottom. */
function KeyCluster({
  up,
  left,
  down,
  right,
}: {
  up: string
  left: string
  down: string
  right: string
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Keycap size="sm">{up}</Keycap>
      <div className="flex gap-1">
        <Keycap size="sm">{left}</Keycap>
        <Keycap size="sm">{down}</Keycap>
        <Keycap size="sm">{right}</Keycap>
      </div>
    </div>
  )
}

/** A small "OR" divider separating two alternative key bindings. */
function OrDivider() {
  return (
    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
      or
    </span>
  )
}

/** Both movement bindings — WASD and arrow D-pads — for the title-screen legend. */
export function MoveKeys() {
  return (
    <div className="flex items-center gap-2.5">
      <KeyCluster up="W" left="A" down="S" right="D" />
      <OrDivider />
      <KeyCluster up="↑" left="←" down="↓" right="→" />
    </div>
  )
}

/** Compact one-line "WASD or arrows" pair for the in-game HUD walk rows. */
export function MoveKeysInline() {
  return (
    <>
      <Keycap size="sm">WASD</Keycap>
      <OrDivider />
      <Keycap size="sm">↑↓←→</Keycap>
    </>
  )
}
