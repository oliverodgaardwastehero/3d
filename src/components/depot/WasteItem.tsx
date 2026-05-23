import { binById, type WasteType } from '../../lib/depotLayout'

type Props = {
  type: WasteType
}

/**
 * Visual representation of a piece of waste an NPC is carrying. Each waste
 * type uses primitive geometry shaped to look like the real thing — a can for
 * metal, a bottle for plastic / glass, a taped box for cardboard, an apple
 * for organic. Color comes from the matching bin lid so the carried item
 * stays readable against the labeled bins.
 */
export function WasteItem({ type }: Props) {
  const color = binById(type).color
  switch (type) {
    case 'cardboard':
      return <CardboardBox color={color} />
    case 'plastic':
      return <PlasticBottle color={color} />
    case 'glass':
      return <GlassBottle color={color} />
    case 'metal':
      return <MetalCan color={color} />
    case 'organic':
      return <OrganicApple color={color} />
  }
}

function CardboardBox({ color }: { color: string }) {
  return (
    <group>
      {/* Box body */}
      <mesh castShadow>
        <boxGeometry args={[0.48, 0.34, 0.32]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      {/* Packing tape across the top */}
      <mesh position={[0, 0.171, 0]} castShadow>
        <boxGeometry args={[0.5, 0.012, 0.07]} />
        <meshStandardMaterial color="#5c3f28" roughness={1} />
      </mesh>
      {/* Tape down each side */}
      <mesh position={[0, 0, 0.161]} castShadow>
        <boxGeometry args={[0.07, 0.36, 0.01]} />
        <meshStandardMaterial color="#5c3f28" roughness={1} />
      </mesh>
    </group>
  )
}

function PlasticBottle({ color }: { color: string }) {
  return (
    <group>
      {/* Bottle body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.34, 14]} />
        <meshStandardMaterial color={color} roughness={0.25} transparent opacity={0.88} />
      </mesh>
      {/* Neck */}
      <mesh castShadow position={[0, 0.21, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.08, 12]} />
        <meshStandardMaterial color={color} roughness={0.25} transparent opacity={0.88} />
      </mesh>
      {/* Cap */}
      <mesh castShadow position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.06, 12]} />
        <meshStandardMaterial color="#f7fafc" roughness={0.5} />
      </mesh>
      {/* Label band */}
      <mesh castShadow>
        <cylinderGeometry args={[0.123, 0.123, 0.12, 14]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </mesh>
    </group>
  )
}

function GlassBottle({ color }: { color: string }) {
  return (
    <group>
      {/* Tapered body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.11, 0.14, 0.3, 14]} />
        <meshStandardMaterial color={color} roughness={0.18} transparent opacity={0.72} />
      </mesh>
      {/* Shoulder taper */}
      <mesh castShadow position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.06, 0.11, 0.08, 12]} />
        <meshStandardMaterial color={color} roughness={0.18} transparent opacity={0.72} />
      </mesh>
      {/* Long neck */}
      <mesh castShadow position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.055, 0.06, 0.12, 12]} />
        <meshStandardMaterial color={color} roughness={0.18} transparent opacity={0.72} />
      </mesh>
      {/* Cork / cap */}
      <mesh castShadow position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.05, 12]} />
        <meshStandardMaterial color="#a07a4a" roughness={0.95} />
      </mesh>
    </group>
  )
}

function MetalCan({ color }: { color: string }) {
  return (
    <group>
      {/* Can body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.11, 0.11, 0.26, 16]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.75} />
      </mesh>
      {/* Top rim */}
      <mesh castShadow position={[0, 0.135, 0]}>
        <cylinderGeometry args={[0.112, 0.112, 0.02, 16]} />
        <meshStandardMaterial color="#6b7280" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* Bottom rim */}
      <mesh castShadow position={[0, -0.135, 0]}>
        <cylinderGeometry args={[0.112, 0.112, 0.02, 16]} />
        <meshStandardMaterial color="#6b7280" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* Label stripe */}
      <mesh castShadow>
        <cylinderGeometry args={[0.115, 0.115, 0.09, 16]} />
        <meshStandardMaterial color="#e6edf3" roughness={0.55} metalness={0.3} />
      </mesh>
    </group>
  )
}

function OrganicApple({ color }: { color: string }) {
  return (
    <group>
      {/* Apple body — slightly squashed sphere */}
      <mesh castShadow scale={[1, 0.92, 1]}>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      {/* Stem */}
      <mesh castShadow position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.06, 6]} />
        <meshStandardMaterial color="#3a2818" roughness={1} />
      </mesh>
      {/* Leaf */}
      <mesh
        castShadow
        position={[0.05, 0.2, 0]}
        rotation={[0, 0, Math.PI / 3.5]}
      >
        <boxGeometry args={[0.08, 0.014, 0.035]} />
        <meshStandardMaterial color="#4ea84a" roughness={1} />
      </mesh>
    </group>
  )
}
