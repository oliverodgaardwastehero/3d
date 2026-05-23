import { useRef } from 'react'
import { Vector3 } from 'three'
import { Sky } from '@react-three/drei'
import { Character } from './Character'
import { Office } from './office/Office'
import { GuideNPC } from './office/GuideNPC'
import { RoomWatcher } from './office/RoomWatcher'
import { Depot } from './depot/Depot'
import { DepotNPCManager } from './depot/DepotNPCManager'
import { SPAWN as OFFICE_SPAWN } from '../lib/officeLayout'
import { DEPOT_SPAWN, DEPOT_INITIAL_FACING } from '../lib/depotLayout'
import { useGame } from '../lib/store'

export const WORLD_TONE = '#b8c4cf'

export function World() {
  const gameMode = useGame((s) => s.gameMode)
  const characterPos = useRef(new Vector3(0, 0, 0))

  if (!gameMode) return null

  return (
    <>
      <ambientLight intensity={0.65} color={'#e6ebf1'} />
      <directionalLight
        position={[15, 25, 10]}
        intensity={1.0}
        color={'#fbfaf6'}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
        shadow-bias={-0.0008}
      />

      {gameMode === 'office' && (
        <>
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

      {gameMode === 'depot' && (
        <>
          {/* Procedural atmospheric sky. Sun position matches the directional
              light so cast shadows feel consistent with daylight direction. */}
          <Sky
            distance={450000}
            sunPosition={[15, 22, -10]}
            turbidity={4}
            rayleigh={1.2}
            mieCoefficient={0.005}
            mieDirectionalG={0.8}
          />
          {/* Sky-friendly fog so distant geometry fades into the horizon. */}
          <fog attach="fog" args={['#bcd0e0', 30, 110]} />
          <Depot />
          <DepotNPCManager />
          <Character
            positionRef={characterPos}
            spawn={DEPOT_SPAWN}
            initialFacing={DEPOT_INITIAL_FACING}
          />
        </>
      )}
    </>
  )
}
