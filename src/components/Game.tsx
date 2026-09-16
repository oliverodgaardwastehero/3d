import { Suspense, lazy } from 'react'
import { useGame, type PlayableMode } from '../lib/store'
import { requestPointerLock, useFps } from '../lib/fpsState'
import { HUD } from './HUD'
import { LoadingScreen } from './LoadingScreen'

// Code-split the WebGL stack (three/@react-three/*/postprocessing — ~450 KB
// gzip) out of the entry chunk. The import kicks off on first render, so it
// downloads and warms the GPU context in parallel with the DOM title screen
// instead of blocking its first paint.
const Scene = lazy(() => import('./Scene'))

export function Game() {
  const hasStarted = useGame((s) => s.hasStarted)

  const handleBegin = (mode: PlayableMode) => {
    useGame.getState().start(mode)
    // Pointer lock needs a user gesture, and the Start click / Enter press is
    // one — grab the mouse right here so FPS mode goes straight into aiming.
    // If the browser refuses, the in-game "Click to take aim" prompt covers it.
    // Touch devices skip this: they aim by dragging, no lock involved.
    if (mode === 'fps' && useFps.getState().inputMode === 'pointer') requestPointerLock()
  }

  return (
    <div className="relative h-screen w-screen">
      <Suspense fallback={null}>
        <Scene active={hasStarted} />
      </Suspense>
      <HUD />
      <LoadingScreen onBegin={handleBegin} />
    </div>
  )
}
