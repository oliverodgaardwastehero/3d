import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { Color, MathUtils, type Group, type Mesh, type MeshStandardMaterial } from 'three'
import { useDepot } from '../../lib/depotState'
import type { BinDef } from '../../lib/depotLayout'

const FLASH_COLOR = new Color('#ef4444')
const FLASH_DURATION = 1.0

const FEEDBACK_DURATION = 1.2
const FEEDBACK_START_Y = 1.5
const FEEDBACK_END_Y = 3.2
const RIGHT_COLOR = '#34d399'
const WRONG_COLOR = '#f87171'

type Props = {
  bin: BinDef
}

/**
 * Single labeled recycling bin. Lid color identifies its waste type; the lid
 * flashes red on contamination. A floating ✓ / ✗ rises and fades above the
 * bin on each deposit.
 */
export function Bin({ bin }: Props) {
  const lidRef = useRef<Mesh>(null)
  const baseColor = useRef(new Color(bin.color))
  const flashUntilRef = useRef(0)
  const dirtyContaminated = useDepot((s) => s.dirtyBins.has(bin.id))

  // Floating feedback state
  const feedbackGroupRef = useRef<Group>(null)
  const feedbackTextRef = useRef<Mesh>(null)
  const feedbackStartedAtRef = useRef(0)
  const feedbackDurationMsRef = useRef(0)
  const [feedbackType, setFeedbackType] = useState<'right' | 'wrong'>('right')
  const lastSeenFeedbackAtRef = useRef(0)
  const fb = useDepot((s) => s.lastFeedback)

  // Lid contamination flash
  useEffect(() => {
    if (dirtyContaminated) {
      flashUntilRef.current = performance.now() + FLASH_DURATION * 1000
    }
  }, [dirtyContaminated])

  // Trigger feedback animation when this bin receives a deposit signal.
  useEffect(() => {
    if (!fb) return
    if (fb.binId !== bin.id) return
    if (fb.at <= lastSeenFeedbackAtRef.current) return
    lastSeenFeedbackAtRef.current = fb.at
    feedbackStartedAtRef.current = performance.now()
    feedbackDurationMsRef.current = FEEDBACK_DURATION * 1000
    setFeedbackType(fb.type)

    const g = feedbackGroupRef.current
    if (g) {
      g.visible = true
      g.position.y = FEEDBACK_START_Y
    }
  }, [fb, bin.id])

  useFrame(() => {
    const lid = lidRef.current
    const now = performance.now()
    if (lid) {
      const mat = lid.material as MeshStandardMaterial
      if (now < flashUntilRef.current) {
        const t = (flashUntilRef.current - now) / (FLASH_DURATION * 1000)
        mat.color.copy(baseColor.current).lerp(FLASH_COLOR, t)
      } else {
        mat.color.copy(baseColor.current)
      }
    }

    // Drive the ✓/✗ animation
    const fbGroup = feedbackGroupRef.current
    const fbText = feedbackTextRef.current
    if (fbGroup && fbGroup.visible) {
      const elapsed = now - feedbackStartedAtRef.current
      const t = MathUtils.clamp(elapsed / feedbackDurationMsRef.current, 0, 1)
      // Ease-out cubic for the rise
      const eased = 1 - Math.pow(1 - t, 3)
      fbGroup.position.y = MathUtils.lerp(FEEDBACK_START_Y, FEEDBACK_END_Y, eased)
      if (fbText) {
        const mat = fbText.material as MeshStandardMaterial
        // Fade in fast, fade out slow
        const opacity = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85
        mat.opacity = MathUtils.clamp(opacity, 0, 1)
      }
      if (t >= 1) {
        fbGroup.visible = false
      }
    }
  })

  return (
    <group position={[bin.pos[0], 0, bin.pos[1]]}>
      {/* Wheels at the base */}
      {([
        [-0.42, 0.12, 0.36],
        [0.42, 0.12, 0.36],
        [-0.42, 0.12, -0.36],
        [0.42, 0.12, -0.36],
      ] as const).map(([x, y, z], i) => (
        <mesh
          key={i}
          position={[x, y, z]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.11, 0.11, 0.1, 14]} />
          <meshStandardMaterial color="#1a1a1c" roughness={0.7} />
        </mesh>
      ))}

      {/* Body — lifted so wheels are visible */}
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 1.2, 0.9]} />
        <meshStandardMaterial color="#3a3a40" roughness={0.85} />
      </mesh>

      {/* Lid / colored ring */}
      <mesh ref={lidRef} position={[0, 1.37, 0]} castShadow>
        <boxGeometry args={[1.18, 0.14, 0.98]} />
        <meshStandardMaterial color={bin.color} roughness={0.55} />
      </mesh>

      {/* Deposit slot — dark rectangle inset on top of the lid */}
      <mesh position={[0, 1.445, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.72, 0.42]} />
        <meshStandardMaterial color="#0a0a0c" roughness={1} />
      </mesh>

      {/* Front placard with the label */}
      <mesh position={[0, 0.92, 0.46]}>
        <planeGeometry args={[0.85, 0.34]} />
        <meshStandardMaterial color="#0e0e10" />
      </mesh>
      <Text
        position={[0, 0.92, 0.461]}
        fontSize={0.16}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {bin.label}
      </Text>

      {/* Floating ✓/✗ — hidden until a deposit triggers it. */}
      <group ref={feedbackGroupRef} position={[0, FEEDBACK_START_Y, 0]} visible={false}>
        <Billboard>
          <Text
            ref={feedbackTextRef}
            fontSize={1.1}
            color={feedbackType === 'right' ? RIGHT_COLOR : WRONG_COLOR}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.08}
            outlineColor="#0a0a0a"
            material-transparent
            material-toneMapped={false}
          >
            {feedbackType === 'right' ? '✓' : '✗'}
          </Text>
        </Billboard>
      </group>
    </group>
  )
}
