/**
 * Shared input channel for the first-person player. Every input source —
 * the pointer-locked mouse, the DOM touch controls (virtual stick, drag-to-aim,
 * fire / reload buttons) — writes here, and FPSPlayer drains it once per frame.
 * A plain mutable singleton, never React state: it changes on every event.
 */
export const fpsInput = {
  /** Accumulated look delta in "mouse pixels" since the last frame. */
  lookDX: 0,
  lookDY: 0,
  /** Virtual stick, each in [-1, 1]. +moveX = strafe right, +moveZ = backward. */
  moveX: 0,
  moveZ: 0,
  /** One-shot flags, consumed (cleared) by the frame loop. */
  fire: false,
  reload: false,
}

export function resetFpsInput() {
  fpsInput.lookDX = 0
  fpsInput.lookDY = 0
  fpsInput.moveX = 0
  fpsInput.moveZ = 0
  fpsInput.fire = false
  fpsInput.reload = false
}
