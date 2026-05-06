import { EffectComposer, Vignette } from '@react-three/postprocessing'

/**
 * Lightweight post-processing. Bloom was too expensive for the open scene;
 * sticking with vignette only for now. The garage bulb glow is faked with the
 * mesh's emissive material plus the warm point light, no bloom needed.
 */
export function PostFX() {
  return (
    <EffectComposer>
      <Vignette eskil={false} offset={0.2} darkness={0.55} />
    </EffectComposer>
  )
}
