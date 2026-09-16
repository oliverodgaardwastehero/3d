import { useRef } from 'react'
import { Vector3 } from 'three'
import { Sky, Environment, Lightformer } from '@react-three/drei'
import { Character } from './Character'
import { Office } from './office/Office'
import { GuideNPC } from './office/GuideNPC'
import { RoomWatcher } from './office/RoomWatcher'
import { Depot } from './depot/Depot'
import { DepotNPCManager } from './depot/DepotNPCManager'
import { FPSPlayer } from './fps/FPSPlayer'
import { SPAWN as OFFICE_SPAWN } from '../lib/officeLayout'
import { DEPOT_SPAWN, DEPOT_INITIAL_FACING } from '../lib/depotLayout'
import { useGame } from '../lib/store'

export const WORLD_TONE = '#b8c4cf'

export function World() {
  const gameMode = useGame((s) => s.gameMode)
  const characterPos = useRef(new Vector3(0, 0, 0))

  if (!gameMode) return null

  // Both match modes play out in the same recycling yard with the same walkers;
  // they differ only in how the player is embodied (3rd-person kicker vs.
  // first-person blaster).
  const inYard = gameMode === 'depot' || gameMode === 'fps'

  return (
    <>
      {/* Soft sky/ground fill replaces the old flat ambient — undersides go
          subtly warm, tops cool, so forms read instead of looking flat-lit. */}
      <hemisphereLight color={'#cfe0ef'} groundColor={'#6b6256'} intensity={0.55} />
      {/* Warm low-sun key. Soft, clean shadows: a 2048 map over a frustum
          tightened to the actual yard + normalBias to kill acne without the
          peter-panning that the old big negative bias caused. */}
      <directionalLight
        position={[20, 14, -13]}
        intensity={1.15}
        color={'#fff1d6'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={0.5}
        shadow-camera-far={70}
        shadow-bias={-0.0002}
        shadow-normalBias={0.04}
      />

      {gameMode === 'office' && (
        <>
          <fog attach="fog" args={['#b8c4cf', 30, 95]} />
          <Office />
          <GuideNPC playerRef={characterPos} />
          <RoomWatcher playerRef={characterPos} />
          <Character
            positionRef={characterPos}
            spawn={OFFICE_SPAWN}
            initialFacing={Math.PI}
          />
        </>
      )}

      {inYard && (
        <>
          {/* Lower, hazier sun for a warm late-afternoon read. sunPosition
              matches the directional key so cast shadows track the visible sun. */}
          <Sky
            distance={450000}
            sunPosition={[20, 7, -14]}
            turbidity={9}
            rayleigh={2.4}
            mieCoefficient={0.006}
            mieDirectionalG={0.85}
          />
          {/* Offline image-based lighting: a few Lightformer panels build a soft
              env map (no CDN HDR download). Gives the specular player GLB and the
              bin/can plastics gentle reflections + a directional gradient fill. */}
          <Environment resolution={64} environmentIntensity={0.4}>
            <Lightformer
              intensity={2.4}
              color="#fff2dd"
              position={[12, 9, -9]}
              scale={[12, 12, 1]}
            />
            <Lightformer
              intensity={0.9}
              color="#cfe0ef"
              position={[-11, 7, 7]}
              scale={[14, 9, 1]}
            />
            <Lightformer
              intensity={0.5}
              color="#8a7f73"
              rotation={[Math.PI / 2, 0, 0]}
              position={[0, -6, 0]}
              scale={[22, 22, 1]}
            />
          </Environment>
          {/* Fog tuned to the sky horizon; pulled in a little so the layered
              skyline fades into atmosphere. */}
          <fog attach="fog" args={['#c9d6e0', 22, 95]} />
          <Depot />
          <DepotNPCManager />
          {gameMode === 'depot' ? (
            <Character
              positionRef={characterPos}
              spawn={DEPOT_SPAWN}
              initialFacing={DEPOT_INITIAL_FACING}
            />
          ) : (
            <FPSPlayer positionRef={characterPos} />
          )}
        </>
      )}
    </>
  )
}
