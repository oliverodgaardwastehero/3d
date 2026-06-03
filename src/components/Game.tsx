import { Canvas } from '@react-three/fiber'
import { KeyboardControls } from '@react-three/drei'
import { Suspense } from 'react'
import { CONTROL_MAP } from '../lib/controls'
import { useGame } from '../lib/store'
import { HUD } from './HUD'
import { LoadingScreen } from './LoadingScreen'
import { PostFX } from './PostFX'
import { World } from './World'

export function Game() {
  const hasStarted = useGame((s) => s.hasStarted)

  const handleBegin = () => {
    useGame.getState().start('depot')
  }

  return (
    <KeyboardControls
      map={CONTROL_MAP as unknown as { name: string; keys: string[] }[]}
    >
      <div className="relative h-screen w-screen">
        <Canvas
          shadows
          dpr={[1, 1.5]}
          // The 3D world is empty until Start (World returns null without a
          // gameMode), so keep the render loop idle — no per-frame PostFX
          // passes — while the title overlay is up. This frees the GPU/rAF
          // for the CSS title animations to run at full frame rate.
          frameloop={hasStarted ? 'always' : 'demand'}
          camera={{ fov: 60, near: 0.1, far: 200 }}
          gl={{
            antialias: false, // EffectComposer already resolves 8x MSAA
            powerPreference: 'high-performance',
            toneMappingExposure: 1.15,
          }}
        >
          <color attach="background" args={['#b8c4cf']} />
          <Suspense fallback={null}>
            <World />
            <PostFX />
          </Suspense>
        </Canvas>
        <HUD />
        <LoadingScreen onBegin={handleBegin} />
      </div>
    </KeyboardControls>
  )
}
