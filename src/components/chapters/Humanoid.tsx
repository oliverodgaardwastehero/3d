import { useEffect, useMemo } from 'react'
import type { ReactNode, RefObject } from 'react'
import {
  BoxGeometry,
  CapsuleGeometry,
  Group,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three'
import { Outlines } from '@react-three/drei'

/**
 * Chibi humanoid built from primitives. Arms hinge at the shoulders, legs hinge
 * at the hips, and the whole body lives inside a "bob" group — so a parent
 * component can drive run/jump animations by writing to the passed-in refs.
 *
 * Total height ≈ 1.94m. Origin at the feet (Y=0).
 *
 * Performance: every shape geometry is a module-level singleton shared across
 * all humanoids, and the small material set is memoized per instance (keyed on
 * the body colors) instead of one fresh material per mesh. Meshes set
 * `dispose={null}` so unmounting one humanoid never disposes geometry/materials
 * still in use by others; per-instance materials are disposed manually.
 */

// ── Shared geometry singletons (created once, reused by every humanoid) ──────
const HEAD_GEO = new SphereGeometry(0.34, 20, 16)
const HAIR_GEO = new SphereGeometry(0.35, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58)
const GLASSES_GEO = new BoxGeometry(0.3, 0.07, 0.03)
const EYE_WHITE_GEO = new SphereGeometry(0.058, 10, 8)
const PUPIL_GEO = new SphereGeometry(0.03, 8, 6)
const BROW_GEO = new BoxGeometry(0.11, 0.022, 0.03)
const TORSO_GEO = new SphereGeometry(0.45, 18, 14)
const YOKE_GEO = new SphereGeometry(0.3, 16, 12)
const HIP_GEO = new SphereGeometry(0.17, 12, 10)
const ARM_GEO = new CapsuleGeometry(0.1, 0.45, 4, 10)
const HAND_GEO = new SphereGeometry(0.11, 10, 8)
const LEG_GEO = new CapsuleGeometry(0.13, 0.3, 4, 8)
const FOOT_GEO = new SphereGeometry(0.13, 10, 8)

// Rest-pose rotations (Z = outward tilt of arm at the shoulder)
export const ARM_REST_Z = 0.22

const OUTLINE_COLOR = '#241c1a'
const OUTLINE_THICKNESS = 0.022

type Props = {
  skinColor?: string
  shirtColor?: string
  pantsColor?: string
  shoeColor?: string
  hairColor?: string
  hasHair?: boolean
  hasGlasses?: boolean
  hideLegs?: boolean
  /** Torso/shoulder/hip width multiplier for body-type variety (1 = default). */
  girth?: number
  /** Thin stylized contour on the main body masses. */
  outline?: boolean

  /** Decoration on the chest (e.g. logo badge). Lives inside the bob group. */
  chestBadge?: ReactNode

  /** Optional refs for animation. Wire these into useFrame in the parent. */
  bobRef?: RefObject<Group | null>
  leftArmRef?: RefObject<Group | null>
  rightArmRef?: RefObject<Group | null>
  leftLegRef?: RefObject<Group | null>
  rightLegRef?: RefObject<Group | null>
}

export function Humanoid({
  skinColor = '#f5d6b8',
  shirtColor = '#a855f7',
  pantsColor = '#3f3f46',
  shoeColor = '#1a1a1f',
  hairColor = '#3a2418',
  hasHair = false,
  hasGlasses = false,
  hideLegs = false,
  girth = 1,
  outline = false,
  chestBadge,
  bobRef,
  leftArmRef,
  rightArmRef,
  leftLegRef,
  rightLegRef,
}: Props) {
  // One small material set per humanoid, reused across all its meshes. Softer
  // roughness than the old flat default so clothing/skin catch the new IBL.
  const mats = useMemo(() => {
    return {
      skin: new MeshStandardMaterial({ color: skinColor, roughness: 0.82 }),
      shirt: new MeshStandardMaterial({ color: shirtColor, roughness: 0.8 }),
      pants: new MeshStandardMaterial({ color: pantsColor, roughness: 0.85 }),
      shoe: new MeshStandardMaterial({ color: shoeColor, roughness: 0.6 }),
      hair: new MeshStandardMaterial({ color: hairColor, roughness: 0.9 }),
      glasses: new MeshStandardMaterial({ color: '#1f2937', roughness: 0.4, metalness: 0.2 }),
      eyeWhite: new MeshStandardMaterial({ color: '#f2f0ea', roughness: 0.5 }),
      eyeDark: new MeshStandardMaterial({ color: '#16121a', roughness: 0.4 }),
    }
  }, [skinColor, shirtColor, pantsColor, shoeColor, hairColor])

  // Manual disposal (meshes use dispose={null} so R3F won't touch shared geo).
  useEffect(() => {
    return () => {
      for (const m of Object.values(mats)) m.dispose()
    }
  }, [mats])

  return (
    <group ref={bobRef}>
      {/* Head */}
      <mesh geometry={HEAD_GEO} material={mats.skin} position={[0, 1.6, 0]} castShadow dispose={null}>
        {outline && <Outlines thickness={OUTLINE_THICKNESS} color={OUTLINE_COLOR} />}
      </mesh>

      {/* Hair (top half-cap) */}
      {hasHair && (
        <mesh geometry={HAIR_GEO} material={mats.hair} position={[0, 1.66, 0]} castShadow dispose={null} />
      )}

      {/* Glasses */}
      {hasGlasses && (
        <mesh geometry={GLASSES_GEO} material={mats.glasses} position={[0, 1.55, 0.29]} dispose={null} />
      )}

      {/* Eyes — white + dark pupil for a face that reads, plus a brow above */}
      {([-0.12, 0.12] as const).map((ex) => (
        <group key={ex} position={[ex, 1.62, 0.295]}>
          <mesh geometry={EYE_WHITE_GEO} material={mats.eyeWhite} dispose={null} />
          <mesh geometry={PUPIL_GEO} material={mats.eyeDark} position={[0, 0, 0.04]} dispose={null} />
          <mesh
            geometry={BROW_GEO}
            material={mats.hair}
            position={[0, 0.085, 0.02]}
            rotation={[0, 0, ex < 0 ? 0.12 : -0.12]}
            dispose={null}
          />
        </group>
      ))}

      {/* Body — slightly oblong sphere for a chibi torso */}
      <mesh
        geometry={TORSO_GEO}
        material={mats.shirt}
        position={[0, 0.9, 0]}
        scale={[girth, 1.15, 0.85 * girth]}
        castShadow
        dispose={null}
      >
        {outline && <Outlines thickness={OUTLINE_THICKNESS} color={OUTLINE_COLOR} />}
      </mesh>

      {/* Shoulder yoke — buries both arm roots so the shoulders don't gap */}
      <mesh
        geometry={YOKE_GEO}
        material={mats.shirt}
        position={[0, 1.2, 0]}
        scale={[1.75 * girth, 0.66, 1.05]}
        castShadow
        dispose={null}
      />

      {/* Optional chest badge — placed just in front of the torso. */}
      {chestBadge}

      {/* Left arm — group origin at the shoulder so rotation hinges there */}
      <group ref={leftArmRef} position={[-0.5 * girth, 1.1, 0]} rotation={[0, 0, -ARM_REST_Z]}>
        <mesh geometry={ARM_GEO} material={mats.shirt} position={[0, -0.225, 0]} castShadow dispose={null} />
        <mesh geometry={HAND_GEO} material={mats.skin} position={[0, -0.5, 0]} dispose={null} />
      </group>

      {/* Right arm */}
      <group ref={rightArmRef} position={[0.5 * girth, 1.1, 0]} rotation={[0, 0, ARM_REST_Z]}>
        <mesh geometry={ARM_GEO} material={mats.shirt} position={[0, -0.225, 0]} castShadow dispose={null} />
        <mesh geometry={HAND_GEO} material={mats.skin} position={[0, -0.5, 0]} dispose={null} />
      </group>

      {/* Legs + Feet (hidden for seated pose). Hip = group origin. */}
      {!hideLegs && (
        <>
          {/* Hip spheres bridge the torso-bottom → leg-top seam */}
          <mesh geometry={HIP_GEO} material={mats.pants} position={[-0.18, 0.64, 0]} castShadow dispose={null} />
          <mesh geometry={HIP_GEO} material={mats.pants} position={[0.18, 0.64, 0]} castShadow dispose={null} />

          <group ref={leftLegRef} position={[-0.18, 0.62, 0]}>
            <mesh geometry={LEG_GEO} material={mats.pants} position={[0, -0.27, 0]} castShadow dispose={null} />
            <mesh
              geometry={FOOT_GEO}
              material={mats.shoe}
              position={[0, -0.55, 0.07]}
              scale={[1, 0.55, 1.5]}
              castShadow
              dispose={null}
            />
          </group>
          <group ref={rightLegRef} position={[0.18, 0.62, 0]}>
            <mesh geometry={LEG_GEO} material={mats.pants} position={[0, -0.27, 0]} castShadow dispose={null} />
            <mesh
              geometry={FOOT_GEO}
              material={mats.shoe}
              position={[0, -0.55, 0.07]}
              scale={[1, 0.55, 1.5]}
              castShadow
              dispose={null}
            />
          </group>
        </>
      )}
    </group>
  )
}
