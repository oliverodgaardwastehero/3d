import {
  BrightnessContrast,
  EffectComposer,
  HueSaturation,
  Vignette,
} from '@react-three/postprocessing'

/**
 * Lightweight post-processing. The renderer already tone-maps (ACES) and the
 * composer resolves 8x MSAA, so this is just a gentle grade: a touch of
 * contrast + saturation and a soft vignette. Bloom is intentionally omitted —
 * it was too expensive for the open scene and the dusk windows read fine without
 * it. Keep these cheap (~sub-millisecond) effects only.
 */
export function PostFX() {
  return (
    <EffectComposer>
      <BrightnessContrast brightness={0.015} contrast={0.07} />
      <HueSaturation saturation={0.07} />
      <Vignette eskil={false} offset={0.22} darkness={0.5} />
    </EffectComposer>
  )
}
