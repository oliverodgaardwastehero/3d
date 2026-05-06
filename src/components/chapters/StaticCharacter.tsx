import { Humanoid } from './Humanoid'

type Props = {
  position: [number, number, number]
  /** Y rotation in radians (0 = facing -Z). */
  rotationY?: number
  /** Posture: standing or seated. */
  pose?: 'standing' | 'seated'
  /** Lean forward in radians (e.g. 0.4 = leaning over the workbench). */
  leanForward?: number
  shirtColor: string
  pantsColor?: string
  shoeColor?: string
  skinColor?: string
  hairColor?: string
  hasGlasses?: boolean
}

/**
 * A posed humanoid for diorama scenes. Seated mode hides the legs (they'd
 * otherwise stick through the stool/bench) and sinks the torso to look like
 * the character is resting on a seat.
 */
export function StaticCharacter({
  position,
  rotationY = 0,
  pose = 'standing',
  leanForward = 0,
  shirtColor,
  pantsColor = '#3f3f46',
  shoeColor = '#1a1a1f',
  skinColor = '#f5d6b8',
  hairColor = '#3a2418',
  hasGlasses = false,
}: Props) {
  const isSeated = pose === 'seated'
  const seatedYDrop = isSeated ? -0.4 : 0
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group rotation={[leanForward, 0, 0]} position={[0, seatedYDrop, 0]}>
        <Humanoid
          skinColor={skinColor}
          shirtColor={shirtColor}
          pantsColor={pantsColor}
          shoeColor={shoeColor}
          hairColor={hairColor}
          hasHair
          hasGlasses={hasGlasses}
          hideLegs={isSeated}
        />
      </group>
    </group>
  )
}
