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
          camera={{ fov: 60, near: 0.1, far: 200 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={['#b8c4cf']} />
          <fog attach="fog" args={['#b8c4cf', 30, 95]} />
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
