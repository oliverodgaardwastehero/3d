export const CONTROL_MAP = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
  { name: 'kick', keys: ['Space'] },
  // FPS mode only — reload the blaster.
  { name: 'reload', keys: ['KeyR'] },
] as const

export type ControlName = (typeof CONTROL_MAP)[number]['name']
