/**
 * Per-frame animation inputs for the first-person gun, written by FPSPlayer
 * and read by the Gun component. A plain mutable object held in a ref (not
 * React state) because most fields change every frame.
 */
export type GunFx = {
  /** 1 on the shot, decays to 0 — drives the kick-back. */
  recoil: number
  /** 1 on the shot, decays to 0 fast — drives the muzzle flash + light. */
  flash: number
  /** Random size / roll for this shot's flash so no two look alike. */
  flashScale: number
  flashRoll: number
  /** Reload progress 0 → 1 while `reloading`, else 0. */
  reloading: boolean
  reload: number
  /** 0..1 how much the player is moving (smoothed) — weapon bob amount. */
  moveBlend: number
  /** Walk-cycle phase (radians), advanced by the player while moving. */
  bobPhase: number
  /** Smoothed look velocity (rad/s) — the gun lags the view a touch. */
  lookLagX: number
  lookLagY: number
}

export const createGunFx = (): GunFx => ({
  recoil: 0,
  flash: 0,
  flashScale: 1,
  flashRoll: 0,
  reloading: false,
  reload: 0,
  moveBlend: 0,
  bobPhase: 0,
  lookLagX: 0,
  lookLagY: 0,
})
