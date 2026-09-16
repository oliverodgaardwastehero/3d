import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  MathUtils,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  SRGBColorSpace,
} from 'three'
import { WasteHeroBadge } from '../WasteHeroBadge'
import type { GunFx } from '../../lib/gunFx'

// WasteHero palette.
const NAVY = '#1b2344'
const BLUE = '#75bdea'
const STEEL = '#5b6470'
const DARK = '#23262d'
const LIGHT = '#dfe6f2'

/** Resting pose in camera space: right-handed, low, barrel converging on the crosshair. */
const REST_POS = { x: 0.24, y: -0.225, z: -0.56 }
const REST_ROT = { x: 0.035, y: -0.05, z: 0.0 }
/** Viewmodel scale — the pistol is modelled ~0.5 m long; shrink it so it sits in the corner. */
const VIEW_SCALE = 0.7

type Props = {
  /** Animation inputs written by FPSPlayer every frame (see lib/gunFx). */
  fxRef: RefObject<GunFx>
  /** Empty anchor at the barrel tip — the player reads its world position for tracers. */
  muzzleRef: RefObject<Group | null>
}

/**
 * The "Eco-Blaster": a stylised energy pistol built from primitives in the
 * same chunky, outlined-primitive language as the chibi walkers, in WasteHero
 * navy + light blue. Forward is -Z in gun space. Rendered as a child of the
 * first-person camera, so everything here is camera-relative.
 */
export function Gun({ fxRef, muzzleRef }: Props) {
  const gunRef = useRef<Group>(null)
  const flashRef = useRef<Group>(null)
  const flashMatRef = useRef<MeshBasicMaterial>(null)
  const lightRef = useRef<PointLight>(null)
  const cellMatRef = useRef<MeshStandardMaterial>(null)

  const mats = useMemo(
    () => ({
      navy: new MeshStandardMaterial({ color: NAVY, roughness: 0.55, metalness: 0.25 }),
      light: new MeshStandardMaterial({ color: LIGHT, roughness: 0.4, metalness: 0.3 }),
      steel: new MeshStandardMaterial({ color: STEEL, roughness: 0.35, metalness: 0.7 }),
      dark: new MeshStandardMaterial({ color: DARK, roughness: 0.8, metalness: 0.1 }),
      glow: new MeshStandardMaterial({
        color: '#a9dcff',
        emissive: new Color(BLUE),
        emissiveIntensity: 1.6,
        roughness: 0.2,
        metalness: 0.0,
        toneMapped: false,
      }),
    }),
    [],
  )

  // Soft six-spike star for the muzzle flash (drawn once).
  const flashTex = useMemo(() => {
    const s = 128
    const c = document.createElement('canvas')
    c.width = c.height = s
    const g = c.getContext('2d')!
    const cx = s / 2
    const core = g.createRadialGradient(cx, cx, 0, cx, cx, s * 0.5)
    core.addColorStop(0, 'rgba(255,255,255,1)')
    core.addColorStop(0.18, 'rgba(210,240,255,0.9)')
    core.addColorStop(0.45, 'rgba(117,189,234,0.35)')
    core.addColorStop(1, 'rgba(117,189,234,0)')
    g.fillStyle = core
    g.fillRect(0, 0, s, s)
    g.strokeStyle = 'rgba(230,248,255,0.9)'
    g.lineCap = 'round'
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      const len = s * (i % 2 ? 0.3 : 0.47)
      g.lineWidth = i % 2 ? 2.5 : 4
      g.beginPath()
      g.moveTo(cx, cx)
      g.lineTo(cx + Math.cos(a) * len, cx + Math.sin(a) * len)
      g.stroke()
    }
    const tex = new CanvasTexture(c)
    tex.colorSpace = SRGBColorSpace
    return tex
  }, [])

  useEffect(
    () => () => {
      for (const m of Object.values(mats)) m.dispose()
      flashTex.dispose()
    },
    [mats, flashTex],
  )

  useFrame((state, delta) => {
    const g = gunRef.current
    const f = fxRef.current
    if (!g || !f) return
    const dt = Math.min(delta, 0.05)

    // On narrow (portrait) viewports the horizontal field of view shrinks, so
    // pull the gun toward the centre to keep it on screen.
    const aspect = state.size.width / Math.max(1, state.size.height)
    const xk = MathUtils.clamp(aspect / 1.6, 0.5, 1)

    // Decay the one-shot impulses.
    f.recoil = Math.max(0, f.recoil - dt / 0.13)
    f.flash = Math.max(0, f.flash - dt / 0.07)
    const k = f.recoil * f.recoil * (3 - 2 * f.recoil) // smoothstep

    // Reload: dip the gun down-and-tilted, then bring it back (sin bump).
    const rl = f.reloading ? Math.sin(Math.PI * MathUtils.clamp(f.reload, 0, 1)) : 0

    // Weapon bob while moving: figure-8 in the camera plane.
    const bx = Math.sin(f.bobPhase) * 0.014 * f.moveBlend
    const by = -Math.abs(Math.cos(f.bobPhase)) * 0.011 * f.moveBlend

    // The gun trails the view slightly for weight.
    const lagY = MathUtils.clamp(-f.lookLagY * 0.012, -0.08, 0.08)
    const lagX = MathUtils.clamp(-f.lookLagX * 0.012, -0.06, 0.06)

    g.position.set(
      REST_POS.x * xk + bx + 0.03 * rl,
      REST_POS.y + by - 0.17 * rl,
      REST_POS.z + 0.07 * k + 0.03 * rl,
    )
    g.rotation.set(
      REST_ROT.x + 0.17 * k - 0.8 * rl + lagX,
      REST_ROT.y + lagY - 0.15 * rl,
      REST_ROT.z + 0.4 * rl,
    )

    // Muzzle flash + light.
    const fl = flashRef.current
    if (fl) {
      fl.visible = f.flash > 0
      const s = f.flashScale * (0.55 + 0.45 * f.flash)
      fl.scale.setScalar(s)
      fl.rotation.z = f.flashRoll
      if (flashMatRef.current) flashMatRef.current.opacity = f.flash
    }
    if (lightRef.current) lightRef.current.intensity = 16 * f.flash

    // Energy cell dims while swapping, pulses gently otherwise.
    if (cellMatRef.current) {
      const pulse = 1.35 + Math.sin(performance.now() / 260) * 0.25
      cellMatRef.current.emissiveIntensity = f.reloading ? 0.25 : pulse
    }
  })

  return (
    <group ref={gunRef} position={[REST_POS.x, REST_POS.y, REST_POS.z]} scale={VIEW_SCALE}>
      {/* Receiver */}
      <mesh material={mats.navy} position={[0, 0, 0.02]}>
        <boxGeometry args={[0.085, 0.11, 0.4]} />
      </mesh>
      {/* Upper / rail */}
      <mesh material={mats.light} position={[0, 0.072, 0]}>
        <boxGeometry args={[0.07, 0.035, 0.4]} />
      </mesh>
      {/* Rear sight (two low ears) + front post */}
      <mesh material={mats.dark} position={[-0.018, 0.1, 0.17]}>
        <boxGeometry args={[0.008, 0.02, 0.014]} />
      </mesh>
      <mesh material={mats.dark} position={[0.018, 0.1, 0.17]}>
        <boxGeometry args={[0.008, 0.02, 0.014]} />
      </mesh>
      <mesh material={mats.dark} position={[0, 0.103, -0.16]}>
        <boxGeometry args={[0.008, 0.026, 0.014]} />
      </mesh>

      {/* Glowing side strips (energy conduits) */}
      <mesh material={mats.glow} position={[-0.044, 0.01, -0.03]}>
        <boxGeometry args={[0.005, 0.022, 0.26]} />
      </mesh>
      <mesh material={mats.glow} position={[0.044, 0.01, -0.03]}>
        <boxGeometry args={[0.005, 0.022, 0.26]} />
      </mesh>

      {/* Barrel shroud + barrel + muzzle ring */}
      <mesh material={mats.steel} position={[0, 0.01, -0.32]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.042, 0.042, 0.26, 18]} />
      </mesh>
      <mesh material={mats.dark} position={[0, 0.01, -0.36]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.36, 14]} />
      </mesh>
      <mesh material={mats.glow} position={[0, 0.01, -0.475]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.035, 18]} />
      </mesh>

      {/* Grip — hinged at the receiver, leaning back like a pistol grip */}
      <group position={[0, -0.05, 0.11]} rotation={[-0.3, 0, 0]}>
        <mesh material={mats.dark} position={[0, -0.1, 0]}>
          <boxGeometry args={[0.07, 0.2, 0.085]} />
        </mesh>
        <mesh material={mats.navy} position={[0, -0.2, 0]}>
          <boxGeometry args={[0.076, 0.02, 0.092]} />
        </mesh>
      </group>

      {/* Trigger guard + trigger */}
      <mesh material={mats.steel} position={[0, -0.095, -0.02]}>
        <boxGeometry args={[0.012, 0.012, 0.1]} />
      </mesh>
      <mesh material={mats.steel} position={[0, -0.075, -0.066]}>
        <boxGeometry args={[0.012, 0.05, 0.012]} />
      </mesh>
      <mesh material={mats.light} position={[0, -0.072, -0.02]}>
        <boxGeometry args={[0.012, 0.04, 0.012]} />
      </mesh>

      {/* Energy cell (the "magazine") hanging under the receiver */}
      <mesh position={[0, -0.075, -0.13]} rotation={[-0.12, 0, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.14, 16]} />
        <meshStandardMaterial
          ref={cellMatRef}
          color="#a9dcff"
          emissive={BLUE}
          emissiveIntensity={1.4}
          roughness={0.2}
          toneMapped={false}
        />
      </mesh>
      <mesh material={mats.steel} position={[0, -0.15, -0.14]} rotation={[-0.12, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
      </mesh>

      {/* WasteHero badge on the side that faces the player */}
      <group position={[-0.0435, 0.0, 0.1]} rotation={[0, -Math.PI / 2, 0]}>
        <WasteHeroBadge size={0.06} position={[0, 0, 0]} />
      </group>

      {/* Muzzle: anchor for tracers + flash + light */}
      <group ref={muzzleRef} position={[0, 0.01, -0.5]} />
      <group ref={flashRef} position={[0, 0.01, -0.52]} visible={false}>
        <mesh>
          <planeGeometry args={[0.26, 0.26]} />
          <meshBasicMaterial
            ref={flashMatRef}
            map={flashTex}
            transparent
            opacity={0}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
            side={DoubleSide}
          />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.2, 0.2]} />
          <meshBasicMaterial
            map={flashTex}
            transparent
            opacity={0.8}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
            side={DoubleSide}
          />
        </mesh>
      </group>
      <pointLight
        ref={lightRef}
        position={[0, 0.02, -0.55]}
        color={BLUE}
        intensity={0}
        distance={7}
        decay={2}
      />
    </group>
  )
}

/**
 * A single reusable bolt tracer: a thin glowing rod from the muzzle to the
 * impact point that fades over ~90 ms. Lives at the world root (not in the
 * camera rig) so it stays put in the world while the view keeps moving.
 */
type TracerProps = {
  groupRef: RefObject<Group | null>
  matRef: RefObject<MeshBasicMaterial | null>
}

export function Tracer({ groupRef, matRef }: TracerProps) {
  return (
    <group ref={groupRef} visible={false}>
      {/* Cylinder axis is Y; rotate so it runs along the group's +Z, which
          lookAt() aims at the impact point. Unit length — scaled per shot. */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.5]}>
        <cylinderGeometry args={[0.014, 0.014, 1, 6]} />
        <meshBasicMaterial
          ref={matRef}
          color="#bfe9ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
