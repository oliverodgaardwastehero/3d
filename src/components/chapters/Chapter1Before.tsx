import { Text } from '@react-three/drei'
import {
  CHAPTER_ACCENT,
  CHAPTER_POSITION,
  CHAPTER_SUBTITLE,
  CHAPTER_TITLE,
} from '../../lib/chapters'
import { StaticCharacter } from './StaticCharacter'

const ACCENT = CHAPTER_ACCENT.ch1
const [GX, GZ] = CHAPTER_POSITION.ch1 // (0, -28)

const HALF_W = 5.5
const HALF_D = 4.0
const WALL_HEIGHT = 4
const WALL_THICKNESS = 0.3
const PLATFORM_HEIGHT = 0.18

/**
 * Chapter 1 — The Before. A 70s suburban garage rendered as an open-front
 * diorama: 3 walls, a roof beam, a workbench against the back wall, hanging
 * bulb with a warm amber glow, and two characters mid-roleplay (Woz seated at
 * the workbench, Jobs standing nearby looking on). A small info plinth out front
 * labels the chapter.
 */
export function Chapter1Before() {
  return (
    <group position={[GX, 0, GZ]}>
      {/* Concrete diorama platform */}
      <mesh position={[0, PLATFORM_HEIGHT / 2, 0]} receiveShadow>
        <boxGeometry args={[HALF_W * 2 + 1.5, PLATFORM_HEIGHT, HALF_D * 2 + 1.5]} />
        <meshStandardMaterial color="#6b6760" />
      </mesh>

      {/* Garage floor (slightly raised, tinted oil-stained concrete) */}
      <mesh position={[0, PLATFORM_HEIGHT + 0.01, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[HALF_W * 2, HALF_D * 2]} />
        <meshStandardMaterial color="#3f3a33" />
      </mesh>

      <GarageWalls />
      <RoofBeams />
      <Workbench />
      <HangingBulb />
      <HomebrewFlyer />

      {/* Cast — placed at the workbench */}
      {/* Woz: seated at bench, leaning forward over a circuit board */}
      <StaticCharacter
        position={[-1.0, PLATFORM_HEIGHT, -HALF_D + 1.6]}
        rotationY={Math.PI} // facing -Z (toward the bench/back wall)
        pose="seated"
        leanForward={0.45}
        shirtColor="#1e3a8a" // blue plaid shirt
        skinColor="#f5d6b8"
        hairColor="#5a3a22"
        hasGlasses
      />
      {/* Stool under Woz */}
      <mesh position={[-1.0, PLATFORM_HEIGHT + 0.25, -HALF_D + 1.6]} receiveShadow>
        <cylinderGeometry args={[0.3, 0.32, 0.5, 8]} />
        <meshStandardMaterial color="#2c241c" />
      </mesh>

      {/* Jobs: standing to the right of Woz, watching */}
      <StaticCharacter
        position={[1.4, PLATFORM_HEIGHT, -HALF_D + 2.4]}
        rotationY={Math.PI - 0.5} // facing the bench at an angle
        pose="standing"
        shirtColor="#3f3f46" // dark turtleneck-ish
        skinColor="#f5d6b8"
        hairColor="#1f1813"
      />

      {/* Info plinth out front */}
      <InfoPlinth />
    </group>
  )
}

function GarageWalls() {
  return (
    <group>
      {/* Back wall — wood paneling */}
      <mesh
        position={[0, PLATFORM_HEIGHT + WALL_HEIGHT / 2, -HALF_D - WALL_THICKNESS / 2]}
        receiveShadow
      >
        <boxGeometry args={[HALF_W * 2 + WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color="#7a5b3d" />
      </mesh>
      {/* Wood plank vertical accents on back wall */}
      {Array.from({ length: 8 }).map((_, i) => {
        const x = -HALF_W + 0.7 + i * (HALF_W * 2 - 1.4) / 7
        return (
          <mesh
            key={i}
            position={[x, PLATFORM_HEIGHT + WALL_HEIGHT / 2, -HALF_D - WALL_THICKNESS / 2 + 0.02]}
          >
            <boxGeometry args={[0.04, WALL_HEIGHT - 0.2, 0.02]} />
            <meshStandardMaterial color="#5a3f28" />
          </mesh>
        )
      })}

      {/* Left wall */}
      <mesh
        position={[-HALF_W - WALL_THICKNESS / 2, PLATFORM_HEIGHT + WALL_HEIGHT / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, HALF_D * 2 + WALL_THICKNESS]} />
        <meshStandardMaterial color="#7a5b3d" />
      </mesh>

      {/* Right wall */}
      <mesh
        position={[HALF_W + WALL_THICKNESS / 2, PLATFORM_HEIGHT + WALL_HEIGHT / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, HALF_D * 2 + WALL_THICKNESS]} />
        <meshStandardMaterial color="#7a5b3d" />
      </mesh>
    </group>
  )
}

function RoofBeams() {
  return (
    <group>
      {/* Three crossbeams suggesting an open garage ceiling */}
      {[-HALF_D + 0.5, 0, HALF_D - 0.5].map((z, i) => (
        <mesh key={i} position={[0, PLATFORM_HEIGHT + WALL_HEIGHT - 0.15, z]}>
          <boxGeometry args={[HALF_W * 2 + 0.4, 0.25, 0.25]} />
          <meshStandardMaterial color="#5a3f28" />
        </mesh>
      ))}
      {/* Long ridge along Z */}
      <mesh position={[0, PLATFORM_HEIGHT + WALL_HEIGHT - 0.05, 0]}>
        <boxGeometry args={[0.18, 0.18, HALF_D * 2 + 0.4]} />
        <meshStandardMaterial color="#3f2a1c" />
      </mesh>
    </group>
  )
}

function Workbench() {
  const benchY = PLATFORM_HEIGHT + 0.85
  const benchZ = -HALF_D + 0.7
  return (
    <group>
      {/* Top */}
      <mesh position={[0, benchY, benchZ]} castShadow receiveShadow>
        <boxGeometry args={[8.5, 0.1, 1.0]} />
        <meshStandardMaterial color="#a87a4a" />
      </mesh>
      {/* Front skirt (hides legs) */}
      <mesh position={[0, benchY - 0.42, benchZ + 0.4]} receiveShadow>
        <boxGeometry args={[8.5, 0.1, 0.05]} />
        <meshStandardMaterial color="#7a5a36" />
      </mesh>
      {/* Legs */}
      {[
        [-3.9, benchZ + 0.4],
        [3.9, benchZ + 0.4],
        [-3.9, benchZ - 0.4],
        [3.9, benchZ - 0.4],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, PLATFORM_HEIGHT + 0.42, z]}>
          <boxGeometry args={[0.18, 0.84, 0.18]} />
          <meshStandardMaterial color="#5a3f28" />
        </mesh>
      ))}

      {/* Workbench clutter — none of these cast shadows (too small to matter) */}
      {/* Circuit board in front of Woz */}
      <mesh position={[-1.0, benchY + 0.06, benchZ + 0.05]}>
        <boxGeometry args={[0.55, 0.04, 0.4]} />
        <meshStandardMaterial color="#1f6b3c" />
      </mesh>
      {/* Tiny capacitors / chips on the board */}
      {[
        [-1.2, 0.0],
        [-0.95, -0.05],
        [-0.8, 0.05],
        [-1.1, 0.08],
      ].map(([dx, dz], i) => (
        <mesh
          key={`chip-${i}`}
          position={[-1.0 + dx + 0.6, benchY + 0.1, benchZ + 0.05 + dz]}
        >
          <boxGeometry args={[0.06, 0.04, 0.06]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      ))}

      {/* Soldering iron */}
      <group position={[-0.3, benchY + 0.06, benchZ - 0.15]} rotation={[0, -0.6, 0]}>
        <mesh>
          <cylinderGeometry args={[0.04, 0.04, 0.45, 8]} />
          <meshStandardMaterial color="#7a3a1f" />
        </mesh>
        <mesh position={[0, 0.27, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.18, 6]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* Coffee mug */}
      <mesh position={[2.6, benchY + 0.12, benchZ - 0.1]}>
        <cylinderGeometry args={[0.08, 0.07, 0.18, 8]} />
        <meshStandardMaterial color="#e7d3b1" />
      </mesh>

      {/* A stack of papers/schematics on the right */}
      <mesh position={[2.0, benchY + 0.06, benchZ + 0.1]} rotation={[0, 0.2, 0]}>
        <boxGeometry args={[0.4, 0.04, 0.55]} />
        <meshStandardMaterial color="#f3e9d0" />
      </mesh>

      {/* Random small parts strewn left side */}
      {[
        [-3.0, -0.1],
        [-2.7, 0.0],
        [-3.2, 0.05],
      ].map(([dx, dz], i) => (
        <mesh
          key={`part-${i}`}
          position={[dx, benchY + 0.07, benchZ + dz]}
        >
          <boxGeometry args={[0.1, 0.05, 0.1]} />
          <meshStandardMaterial color="#4b5563" />
        </mesh>
      ))}
    </group>
  )
}

function HangingBulb() {
  const bulbY = PLATFORM_HEIGHT + WALL_HEIGHT - 1.4
  return (
    <group position={[0, 0, -1.0]}>
      {/* Cable from ceiling to bulb */}
      <mesh position={[0, PLATFORM_HEIGHT + WALL_HEIGHT - 0.7, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.4, 6]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Socket */}
      <mesh position={[0, bulbY + 0.12, 0]}>
        <cylinderGeometry args={[0.06, 0.05, 0.1, 8]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Bulb */}
      <mesh position={[0, bulbY, 0]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial
          color="#fef3c7"
          emissive={ACCENT}
          emissiveIntensity={2.4}
        />
      </mesh>
      {/* Warm amber light — no castShadow (way too expensive for a single bulb's gain) */}
      <pointLight
        position={[0, bulbY - 0.05, 0]}
        intensity={9}
        distance={9}
        decay={1.5}
        color={ACCENT}
      />
    </group>
  )
}

function HomebrewFlyer() {
  return (
    <group position={[3.4, PLATFORM_HEIGHT + 2.4, -HALF_D + 0.05]}>
      <mesh>
        <planeGeometry args={[0.85, 1.1]} />
        <meshStandardMaterial color="#f3e9d0" />
      </mesh>
      <Text
        position={[0, 0.35, 0.01]}
        fontSize={0.09}
        color="#1f1813"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.7}
        textAlign="center"
      >
        HOMEBREW
      </Text>
      <Text
        position={[0, 0.18, 0.01]}
        fontSize={0.07}
        color="#1f1813"
        anchorX="center"
        anchorY="middle"
      >
        COMPUTER
      </Text>
      <Text
        position={[0, 0.04, 0.01]}
        fontSize={0.07}
        color="#1f1813"
        anchorX="center"
        anchorY="middle"
      >
        CLUB
      </Text>
      <Text
        position={[0, -0.3, 0.01]}
        fontSize={0.05}
        color="#9a3a1c"
        anchorX="center"
        anchorY="middle"
      >
        — meets Wednesdays —
      </Text>
    </group>
  )
}

function InfoPlinth() {
  return (
    <group position={[0, 0, HALF_D + 1.4]}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 1.0, 0.4]} />
        <meshStandardMaterial color="#1f1d1c" />
      </mesh>
      {/* Slanted info plate */}
      <mesh position={[0, 1.04, 0.05]} rotation={[-0.6, 0, 0]} castShadow>
        <boxGeometry args={[1.2, 0.5, 0.04]} />
        <meshStandardMaterial color="#f5efe6" />
      </mesh>
      <Text
        position={[0, 1.16, 0.27]}
        rotation={[-0.6, 0, 0]}
        fontSize={0.08}
        color="#3f2a1c"
        anchorX="center"
        anchorY="middle"
      >
        {CHAPTER_TITLE.ch1}
      </Text>
      <Text
        position={[0, 1.0, 0.18]}
        rotation={[-0.6, 0, 0]}
        fontSize={0.05}
        color="#7a5a36"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.05}
        textAlign="center"
      >
        {CHAPTER_SUBTITLE.ch1}
      </Text>
    </group>
  )
}
