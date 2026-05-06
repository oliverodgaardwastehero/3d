import type { ReactNode, RefObject } from 'react'
import type { Group } from 'three'

/**
 * Chibi humanoid built from primitives. Arms hinge at the shoulders, legs hinge
 * at the hips, and the whole body lives inside a "bob" group — so a parent
 * component can drive run/jump animations by writing to the passed-in refs.
 *
 * Total height ≈ 1.94m. Origin at the feet (Y=0).
 */
type Props = {
  skinColor?: string
  shirtColor?: string
  pantsColor?: string
  shoeColor?: string
  hairColor?: string
  hasHair?: boolean
  hasGlasses?: boolean
  hideLegs?: boolean

  /** Decoration on the chest (e.g. logo badge). Lives inside the bob group. */
  chestBadge?: ReactNode

  /** Optional refs for animation. Wire these into useFrame in the parent. */
  bobRef?: RefObject<Group | null>
  leftArmRef?: RefObject<Group | null>
  rightArmRef?: RefObject<Group | null>
  leftLegRef?: RefObject<Group | null>
  rightLegRef?: RefObject<Group | null>
}

// Rest-pose rotations (Z = outward tilt of arm at the shoulder)
export const ARM_REST_Z = 0.22

export function Humanoid({
  skinColor = '#f5d6b8',
  shirtColor = '#a855f7',
  pantsColor = '#3f3f46',
  shoeColor = '#1a1a1f',
  hairColor = '#3a2418',
  hasHair = false,
  hasGlasses = false,
  hideLegs = false,
  chestBadge,
  bobRef,
  leftArmRef,
  rightArmRef,
  leftLegRef,
  rightLegRef,
}: Props) {
  return (
    <group ref={bobRef}>
      {/* Head */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.34, 16, 12]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>

      {/* Hair (top half-cap) */}
      {hasHair && (
        <mesh position={[0, 1.66, 0]} castShadow>
          <sphereGeometry
            args={[0.35, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]}
          />
          <meshStandardMaterial color={hairColor} />
        </mesh>
      )}

      {/* Glasses */}
      {hasGlasses && (
        <mesh position={[0, 1.55, 0.29]}>
          <boxGeometry args={[0.3, 0.07, 0.03]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      )}

      {/* Eyes */}
      <mesh position={[-0.12, 1.62, 0.31]}>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.12, 1.62, 0.31]}>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Body — slightly oblong sphere for a chibi torso */}
      <mesh position={[0, 0.9, 0]} castShadow scale={[1, 1.15, 0.85]}>
        <sphereGeometry args={[0.45, 16, 12]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>

      {/* Optional chest badge — placed just in front of the torso. */}
      {chestBadge}

      {/* Left arm — group origin at the shoulder so rotation hinges there */}
      <group ref={leftArmRef} position={[-0.5, 1.1, 0]} rotation={[0, 0, -ARM_REST_Z]}>
        <mesh position={[0, -0.225, 0]} castShadow>
          <capsuleGeometry args={[0.1, 0.45, 4, 10]} />
          <meshStandardMaterial color={shirtColor} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.5, 0]}>
          <sphereGeometry args={[0.11, 10, 8]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
      </group>

      {/* Right arm */}
      <group ref={rightArmRef} position={[0.5, 1.1, 0]} rotation={[0, 0, ARM_REST_Z]}>
        <mesh position={[0, -0.225, 0]} castShadow>
          <capsuleGeometry args={[0.1, 0.45, 4, 10]} />
          <meshStandardMaterial color={shirtColor} />
        </mesh>
        <mesh position={[0, -0.5, 0]}>
          <sphereGeometry args={[0.11, 10, 8]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
      </group>

      {/* Legs + Feet (hidden for seated pose). Hip = group origin. */}
      {!hideLegs && (
        <>
          <group ref={leftLegRef} position={[-0.18, 0.62, 0]}>
            <mesh position={[0, -0.27, 0]} castShadow>
              <capsuleGeometry args={[0.13, 0.3, 4, 8]} />
              <meshStandardMaterial color={pantsColor} />
            </mesh>
            <mesh position={[0, -0.55, 0.07]} castShadow scale={[1, 0.55, 1.5]}>
              <sphereGeometry args={[0.13, 10, 8]} />
              <meshStandardMaterial color={shoeColor} />
            </mesh>
          </group>
          <group ref={rightLegRef} position={[0.18, 0.62, 0]}>
            <mesh position={[0, -0.27, 0]} castShadow>
              <capsuleGeometry args={[0.13, 0.3, 4, 8]} />
              <meshStandardMaterial color={pantsColor} />
            </mesh>
            <mesh position={[0, -0.55, 0.07]} castShadow scale={[1, 0.55, 1.5]}>
              <sphereGeometry args={[0.13, 10, 8]} />
              <meshStandardMaterial color={shoeColor} />
            </mesh>
          </group>
        </>
      )}
    </group>
  )
}
