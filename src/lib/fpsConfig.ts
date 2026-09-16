// Tuning for the first-person blaster mode. The match rules (60 s, walkers,
// bins, scoring) are shared with the kick game via depotLayout / depotState;
// this is only what's specific to being behind the gun.

import { DEPOT_SPAWN } from './depotLayout'

export const FPS = {
  /** Camera height above the feet. The chibi walkers are ~1.9 m tall. */
  EYE_HEIGHT: 1.62,
  WALK_SPEED: 3.4,
  RUN_SPEED: 6.4,
  /** Radians of yaw/pitch per pixel of mouse travel at 100 % sensitivity. */
  MOUSE_SENS: 0.0012,
  /** Player-adjustable multiplier on MOUSE_SENS: slider range, slider step, `[`/`]` key step. */
  SENS_DEFAULT: 1,
  SENS_MIN: 0.25,
  SENS_MAX: 3,
  SENS_STEP: 0.05,
  SENS_KEY_STEP: 0.1,
  /** Touch drag is multiplied by this before MOUSE_SENS — thumbs travel less than mice. */
  TOUCH_LOOK_GAIN: 2.4,
  /** Max look up/down (radians). */
  PITCH_LIMIT: 1.35,
  FOV: 72,

  /** Rounds per energy cell, and how long swapping the cell takes. */
  MAG_SIZE: 8,
  RELOAD_TIME: 1.15,
  /** Minimum seconds between shots (semi-auto: one shot per click). */
  FIRE_COOLDOWN: 0.16,
  /** Hit-scan range — the yard is 20 × 14 m, so this is effectively unlimited. */
  RANGE: 60,
  /**
   * Extra radius added to each walker's body for the shot test. A little
   * generosity makes aiming at moving chibis feel fair at 13 m.
   */
  HIT_RADIUS_PAD: 0.08,

  /** Player starts where the kicker does, looking west at the gate. */
  SPAWN: DEPOT_SPAWN,
  /** Initial look direction (unit XZ vector). West = toward the gate. */
  LOOK_DIR: [-1, 0] as const,

  /** Head-bob while moving: vertical amplitude (m) and cycles per metre. */
  BOB_AMP: 0.028,
  BOB_FREQ: 1.9,
} as const
