import { useRef } from 'react'
import { Vector3 } from 'three'
import { Character } from './Character'
import { ChapterTrigger } from './ChapterTrigger'
import { Chapter1Before } from './chapters/Chapter1Before'
import { KnockableBox } from './KnockableBox'
import { CHAPTER_POSITION, WORLD_HALF_EXTENT } from '../lib/chapters'

// Single neutral gray-blue. Background, ground, and fog all share this so the
// world reads as one continuous studio space rather than a sky-over-floor scene.
export const WORLD_TONE = '#b8c4cf'

export function World() {
  const characterPos = useRef(new Vector3(0, 0, 0))

  return (
    <>
      <ambientLight intensity={0.55} color={'#dde3eb'} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={1.1}
        color={'#fbfaf6'}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
        shadow-bias={-0.0008}
      />

      {/* Invisible ground — only renders the shadow contact pass. */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[WORLD_HALF_EXTENT * 2, WORLD_HALF_EXTENT * 2]} />
        <shadowMaterial transparent opacity={0.28} color="#1a2330" />
      </mesh>

      <Chapter1Before />

      <Knockables />

      <Character positionRef={characterPos} />

      <ChapterTrigger chapterId="ch1" characterRef={characterPos} />
    </>
  )
}

/**
 * All physics-driven crates and props in world space. Rendered outside chapter
 * <group> transforms so each box owns its own world-space rigid-body state.
 */
function Knockables() {
  // Garage corner stack — formerly CornerBoxes() in Chapter1Before. World
  // coords are derived from the chapter offset so it stays aligned.
  const [gx, gz] = CHAPTER_POSITION.ch1
  const cx = gx + 5.5 - 0.9 // HALF_W - 0.9
  const cz = gz + 4.0 - 0.9 // HALF_D - 0.9

  return (
    <>
      {/* Garage corner stack */}
      <KnockableBox
        position={[cx, 0.18, cz]}
        size={[1.0, 0.6, 0.8]}
        color="#a8825a"
        label="APPLE I"
      />
      <KnockableBox
        position={[cx - 0.1, 0.78, cz + 0.05]}
        rotationY={0.2}
        size={[0.85, 0.5, 0.7]}
        color="#9a7350"
      />
      <KnockableBox
        position={[cx + 0.05, 1.28, cz - 0.05]}
        rotationY={-0.15}
        size={[0.7, 0.4, 0.55]}
        color="#a8825a"
      />

      {/* A few extra crates scattered in the open hub for sprint/tumble fun */}
      <KnockableBox position={[-3, 0.18, -8]} rotationY={0.4} size={[0.9, 0.9, 0.9]} color="#a8825a" />
      <KnockableBox position={[2.5, 0.18, -10]} rotationY={-0.2} size={[1.1, 0.7, 0.8]} color="#9a7350" />
      <KnockableBox position={[-7, 0.18, -3]} size={[0.8, 0.8, 0.8]} color="#b8915d" />
      <KnockableBox position={[6, 0.18, -2]} rotationY={0.6} size={[0.7, 1.0, 0.7]} color="#8d6943" />
    </>
  )
}
