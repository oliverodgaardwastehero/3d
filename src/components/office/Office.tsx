import { Text } from '@react-three/drei'
import { useEffect } from 'react'
import { FURNITURE, ROOMS, WALLS, registerOfficeColliders } from '../../lib/officeLayout'
import { clearColliders } from '../../lib/world'

const WALL_HEIGHT = 1.6
const WALL_THICKNESS = 0.18
const WALL_COLOR = '#d6d2c8'

export function Office() {
  useEffect(() => {
    registerOfficeColliders()
    return () => clearColliders()
  }, [])

  return (
    <>
      {/* Floor tiles: one mesh per room (largest first via array order; lobby
          is last so typed rooms overlap it harmlessly thanks to polygonOffset). */}
      {ROOMS.map((r) => {
        const [x1, z1, x2, z2] = r.bounds
        const cx = (x1 + x2) / 2
        const cz = (z1 + z2) / 2
        const w = x2 - x1
        const d = z2 - z1
        return (
          <mesh
            key={r.id}
            position={[cx, 0.001, cz]}
            rotation-x={-Math.PI / 2}
            receiveShadow
          >
            <planeGeometry args={[w, d]} />
            <meshStandardMaterial
              color={r.floorColor}
              polygonOffset
              polygonOffsetFactor={r.id === 'lobby' ? 1 : -1}
              polygonOffsetUnits={r.id === 'lobby' ? 1 : -1}
            />
          </mesh>
        )
      })}

      {/* Floating room labels above each typed room */}
      {ROOMS.filter((r) => r.id !== 'lobby').map((r) => {
        const [x1, z1, x2, z2] = r.bounds
        const cx = (x1 + x2) / 2
        const cz = (z1 + z2) / 2
        return (
          <Text
            key={r.id}
            position={[cx, 0.05, cz]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.55}
            color="#3a3a3a"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.025}
            outlineColor="#ffffff"
          >
            {r.name.toUpperCase()}
          </Text>
        )
      })}

      {/* Walls */}
      {WALLS.map((w, i) => {
        const dx = w.b[0] - w.a[0]
        const dz = w.b[1] - w.a[1]
        const len = Math.hypot(dx, dz)
        const cx = (w.a[0] + w.b[0]) / 2
        const cz = (w.a[1] + w.b[1]) / 2
        const angleY = Math.atan2(dx, dz) - Math.PI / 2
        const h = w.height ?? WALL_HEIGHT
        return (
          <mesh
            key={i}
            position={[cx, h / 2, cz]}
            rotation-y={angleY}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[len, h, WALL_THICKNESS]} />
            <meshStandardMaterial color={WALL_COLOR} roughness={0.85} />
          </mesh>
        )
      })}

      {/* Furniture */}
      {FURNITURE.map((f, i) => (
        <mesh
          key={i}
          position={[f.pos[0], f.size[1] / 2, f.pos[1]]}
          rotation-y={f.rotationY ?? 0}
          castShadow
          receiveShadow
        >
          <boxGeometry args={f.size} />
          <meshStandardMaterial color={f.color} roughness={0.8} />
        </mesh>
      ))}
    </>
  )
}
