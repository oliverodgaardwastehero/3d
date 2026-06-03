import { Canvas } from '@react-three/fiber'
import { KeyboardControls, useProgress } from '@react-three/drei'
import { Suspense, useEffect } from 'react'
import { CONTROL_MAP } from '../lib/controls'
import { useGame } from '../lib/store'
import { PostFX } from './PostFX'
import { World } from './World'

type Props = {
  /** Drive the render loop only once the match is live. */
  active: boolean
}

/**
 * The entire WebGL stack — three, @react-three/fiber, drei and the
 * post-processing composer — lives behind this module's default export so it
 * can be code-split out of the title screen's critical path. `Game` pulls it in
 * with `React.lazy`, so the DOM title screen paints from a tiny entry chunk
 * while this ~450 KB-gzip chunk streams in (and preloads the player GLB) in the
 * background. By the time the player reads the title and clicks Start, it's hot.
 */
export default function Scene({ active }: Props) {
  return (
    <KeyboardControls
      map={CONTROL_MAP as unknown as { name: string; keys: string[] }[]}
    >
      {/* Mirror the title load progress into the store so the (drei-free) DOM
          title screen can show "Loading N%" and light up Start when ready. */}
      <LoadReporter />
      <Canvas
        shadows
        dpr={[1, 1.5]}
        // The 3D world is empty until Start (World returns null without a
        // gameMode), so keep the render loop idle — no per-frame PostFX
        // passes — while the title overlay is up. This frees the GPU/rAF
        // for the CSS title animations to run at full frame rate.
        frameloop={active ? 'always' : 'demand'}
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
    </KeyboardControls>
  )
}

/**
 * Bridges drei's global loading-manager progress (the player GLB preloads at
 * module scope via `useGLTF.preload`) into the zustand store. Renders nothing.
 * `assetsReady` only flips true once a real asset has registered and finished,
 * so Start can't light up before the GLB is genuinely hot.
 */
function LoadReporter() {
  const { active, progress, total } = useProgress()
  const setLoad = useGame((s) => s.setLoad)

  useEffect(() => {
    const ready = total > 0 && !active && progress >= 100
    setLoad(progress, ready)
  }, [active, progress, total, setLoad])

  return null
}
