import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Group, Quaternion, Vector3 } from 'three'
import {
  registerKnockable,
  stepKnockable,
  type Knockable,
} from '../lib/knockables'

type Props = {
  /** World-space coords of the box's BOTTOM-CENTER when at rest. */
  position: [number, number, number]
  /** Initial yaw in radians. */
  rotationY?: number
  /** Full size [w, h, d] in metres. */
  size: [number, number, number]
  color: string
  /** Optional sticker on the +Z face (rotates with the box). */
  label?: string
  labelColor?: string
}

export function KnockableBox({
  position,
  rotationY = 0,
  size,
  color,
  label,
  labelColor = '#1f1813',
}: Props) {
  const groupRef = useRef<Group>(null)

  const knockable = useMemo<Knockable>(() => {
    const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rotationY)
    return {
      position: new Vector3(position[0], position[1] + size[1] / 2, position[2]),
      velocity: new Vector3(),
      quaternion: q,
      angularVelocity: new Vector3(),
      halfX: size[0] / 2,
      halfY: size[1] / 2,
      halfZ: size[2] / 2,
    }
    // Initial transform is captured once; subsequent prop changes don't reset it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => registerKnockable(knockable), [knockable])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    stepKnockable(knockable, dt)
    const g = groupRef.current
    if (!g) return
    g.position.copy(knockable.position)
    g.quaternion.copy(knockable.quaternion)
  })

  return (
    <group ref={groupRef}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} />
      </mesh>
      {label && (
        <Text
          position={[0, 0, size[2] / 2 + 0.001]}
          fontSize={Math.min(size[0], size[1]) * 0.22}
          color={labelColor}
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      )}
    </group>
  )
}
