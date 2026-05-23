import { useEffect, useMemo } from 'react'
import { BINS, YARD, registerDepotColliders } from '../../lib/depotLayout'
import { clearColliders } from '../../lib/world'
import { Bin } from './Bin'

const FLOOR_COLOR = '#b4b4ad'
const FLOOR_DARK = '#8d8e88'

export function Depot() {
  useEffect(() => {
    registerDepotColliders()
    return () => clearColliders()
  }, [])

  const { halfX, halfZ } = YARD

  return (
    <>
      {/* Outer apron — slightly darker concrete extending past the play area
          so the floor doesn't end in a sharp rectangle. */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0, -0.001, 0]}>
        <planeGeometry args={[halfX * 2 + 18, halfZ * 2 + 18]} />
        <meshStandardMaterial color={FLOOR_DARK} roughness={1} />
      </mesh>

      {/* Concrete play floor. Invisible AABB colliders keep the player here. */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[halfX * 2, halfZ * 2]} />
        <meshStandardMaterial color={FLOOR_COLOR} roughness={0.95} />
      </mesh>

      {/* Painted yellow stripe along the bin row */}
      <mesh rotation-x={-Math.PI / 2} position={[halfX - 1.6, 0.003, 0]}>
        <planeGeometry args={[0.18, halfZ * 2 - 1]} />
        <meshStandardMaterial color="#e8c44a" roughness={1} />
      </mesh>

      {BINS.map((b) => (
        <Bin key={b.id} bin={b} />
      ))}

      <Skyline halfX={halfX} halfZ={halfZ} />
    </>
  )
}

type SkylineProps = {
  halfX: number
  halfZ: number
}

function Skyline({ halfX, halfZ }: SkylineProps) {
  // Deterministic skyline — same buildings every reload.
  const buildings = useMemo(() => {
    let s = 0xc0ffee
    const rand = () => {
      s = (s * 1664525 + 1013904223) % 4294967296
      return s / 4294967296
    }
    type B = {
      pos: [number, number, number]
      size: [number, number, number]
      color: string
    }
    const buildings: B[] = []

    // East skyline (behind the bin row, distant)
    const eastBaseX = halfX + 18
    for (let i = -4; i <= 4; i++) {
      const w = 4 + rand() * 5
      const h = 6 + rand() * 14
      const d = 3 + rand() * 4
      const z = i * 5 + (rand() - 0.5) * 2
      const x = eastBaseX + (rand() - 0.5) * 3
      const c = 0.18 + rand() * 0.18 // dark blueish
      buildings.push({
        pos: [x, h / 2, z],
        size: [w, h, d],
        color: `rgb(${Math.round(c * 80)}, ${Math.round(c * 110)}, ${Math.round(c * 160)})`,
      })
    }

    // North skyline (visible past the player when looking forward)
    const northBaseZ = -halfZ - 16
    for (let i = -4; i <= 4; i++) {
      const w = 5 + rand() * 6
      const h = 5 + rand() * 12
      const d = 3 + rand() * 4
      const x = i * 5.5 + (rand() - 0.5) * 2
      const z = northBaseZ + (rand() - 0.5) * 4
      const c = 0.22 + rand() * 0.18
      buildings.push({
        pos: [x, h / 2, z],
        size: [w, h, d],
        color: `rgb(${Math.round(c * 90)}, ${Math.round(c * 120)}, ${Math.round(c * 170)})`,
      })
    }

    // South + West skylines kept sparser since they're behind the camera.
    for (let i = -3; i <= 3; i++) {
      const w = 4 + rand() * 5
      const h = 4 + rand() * 9
      const d = 3 + rand() * 3
      const x = i * 6 + (rand() - 0.5) * 2
      const z = halfZ + 14 + (rand() - 0.5) * 3
      const c = 0.24 + rand() * 0.14
      buildings.push({
        pos: [x, h / 2, z],
        size: [w, h, d],
        color: `rgb(${Math.round(c * 100)}, ${Math.round(c * 130)}, ${Math.round(c * 175)})`,
      })
    }
    for (let i = -3; i <= 3; i++) {
      const w = 3 + rand() * 5
      const h = 5 + rand() * 10
      const d = 3 + rand() * 3
      const x = -halfX - 16 + (rand() - 0.5) * 3
      const z = i * 5 + (rand() - 0.5) * 2
      const c = 0.2 + rand() * 0.16
      buildings.push({
        pos: [x, h / 2, z],
        size: [w, h, d],
        color: `rgb(${Math.round(c * 90)}, ${Math.round(c * 120)}, ${Math.round(c * 170)})`,
      })
    }

    return buildings
  }, [halfX, halfZ])

  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={b.pos}>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={b.color} roughness={1} />
        </mesh>
      ))}
    </group>
  )
}
