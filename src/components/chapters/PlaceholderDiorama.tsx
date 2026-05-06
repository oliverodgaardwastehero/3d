import { Text } from '@react-three/drei'
import {
  CHAPTER_ACCENT,
  CHAPTER_POSITION,
  CHAPTER_SUBTITLE,
  CHAPTER_TITLE,
  type ChapterId,
} from '../../lib/chapters'

type Props = { chapterId: ChapterId }

/**
 * A simple plinth + accent column marking where a future diorama will live.
 * Used for chapters 2-6 until they're individually built out.
 */
export function PlaceholderDiorama({ chapterId }: Props) {
  const [x, z] = CHAPTER_POSITION[chapterId]
  const accent = CHAPTER_ACCENT[chapterId]
  const title = CHAPTER_TITLE[chapterId]
  const subtitle = CHAPTER_SUBTITLE[chapterId]

  return (
    <group position={[x, 0, z]}>
      {/* Concrete platform */}
      <mesh position={[0, 0.09, 0]} receiveShadow>
        <boxGeometry args={[8, 0.18, 8]} />
        <meshStandardMaterial color="#6b6760" />
      </mesh>

      {/* Tall accent column rising above the platform — visible at distance.
          Pure emissive (no point light) — keeps the cost down across 5 placeholders. */}
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[0.35, 4.2, 0.35]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.9}
        />
      </mesh>

      {/* Info plinth */}
      <mesh position={[0, 0.6, 3.3]} receiveShadow>
        <boxGeometry args={[1.3, 1.0, 0.35]} />
        <meshStandardMaterial color="#1f1d1c" />
      </mesh>
      <mesh position={[0, 1.14, 3.4]} rotation={[-0.6, 0, 0]}>
        <boxGeometry args={[1.15, 0.45, 0.04]} />
        <meshStandardMaterial color="#f5efe6" />
      </mesh>
      <Text
        position={[0, 1.24, 3.6]}
        rotation={[-0.6, 0, 0]}
        fontSize={0.075}
        color="#3f2a1c"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.0}
        textAlign="center"
      >
        {title}
      </Text>
      <Text
        position={[0, 1.1, 3.5]}
        rotation={[-0.6, 0, 0]}
        fontSize={0.045}
        color="#7a5a36"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.0}
        textAlign="center"
      >
        {subtitle}
      </Text>
      <Text
        position={[0, 0.95, 3.4]}
        rotation={[-0.6, 0, 0]}
        fontSize={0.035}
        color="#9a8060"
        anchorX="center"
        anchorY="middle"
      >
        — coming soon —
      </Text>
    </group>
  )
}
