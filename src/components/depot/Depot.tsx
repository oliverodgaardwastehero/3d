import { useEffect, useMemo } from 'react'
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'
import { Instance, Instances, Text } from '@react-three/drei'
import {
  BINS,
  FENCE_HEIGHT,
  GATE_HALF_WIDTH,
  YARD,
  registerDepotColliders,
} from '../../lib/depotLayout'
import { clearColliders } from '../../lib/world'
import { Bin } from './Bin'

const FLOOR_COLOR = '#b4b4ad'

// ── Seeded PRNG (matches the deterministic-skyline convention) ──────────────
function makeRand(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

export function Depot() {
  useEffect(() => {
    registerDepotColliders()
    return () => clearColliders()
  }, [])

  const { halfX, halfZ } = YARD

  return (
    <>
      {/* Asphalt ground out to the fog + a street grid + sidewalks. */}
      <Ground halfX={halfX} halfZ={halfZ} />

      {/* Concrete play floor. Invisible AABB colliders keep the player here. */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[halfX * 2, halfZ * 2]} />
        <meshStandardMaterial color={FLOOR_COLOR} roughness={0.95} />
      </mesh>

      {/* Painted yellow stripe along the bin row */}
      <mesh rotation-x={-Math.PI / 2} position={[halfX - 1.6, 0.003, 0]}>
        <planeGeometry args={[0.18, halfZ * 2 - 1]} />
        <meshStandardMaterial color="#e8c44a" roughness={1} />
      </mesh>

      <Fence halfX={halfX} halfZ={halfZ} />

      {BINS.map((b) => (
        <Bin key={b.id} bin={b} />
      ))}

      <Skyline halfX={halfX} halfZ={halfZ} />
    </>
  )
}

type GroundProps = { halfX: number; halfZ: number }

// ── Ground: textured asphalt out to the fog + a street grid (worn-lane bands +
//    instanced dashed lines) + manhole decals + sidewalks hugging the fence ──
// A clear ring street right around the depot (visible before the fog) plus an
// outer ring for depth. NS vary by x, EW vary by z.
const GRID_NS = [-38, -15.5, 15.5, 38]
const GRID_EW = [-36, -13.5, 13.5, 36]
const ROAD_SPAN = 200
const ROAD_W = 5.5
const MANHOLES: [number, number][] = [
  [13, 4],
  [-13, -3],
  [5, 14],
  [-6, -13],
  [21, 10],
  [-26, -6],
  [31, 15],
  [-19, 18],
]

function Ground({ halfX, halfZ }: GroundProps) {
  const { asphaltTex, dashes } = useMemo(() => {
    // Asphalt base with subtle tonal patches + a few faint cracks so the huge
    // ground plane isn't a flat dead grey.
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const ctx = c.getContext('2d')!
    const rand = makeRand(0x4a51)
    ctx.fillStyle = '#34373c'
    ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 170; i++) {
      const v = 44 + Math.floor(rand() * 26)
      const s = 3 + rand() * 16
      ctx.fillStyle = `rgba(${v},${v + 3},${v + 8},0.12)`
      ctx.fillRect(rand() * 256, rand() * 256, s, s)
    }
    ctx.strokeStyle = 'rgba(18,18,22,0.35)'
    ctx.lineWidth = 1
    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      let px = rand() * 256
      let py = rand() * 256
      ctx.moveTo(px, py)
      for (let k = 0; k < 6; k++) {
        px += (rand() - 0.5) * 70
        py += (rand() - 0.5) * 70
        ctx.lineTo(px, py)
      }
      ctx.stroke()
    }
    const asphaltTex = new CanvasTexture(c)
    asphaltTex.colorSpace = SRGBColorSpace
    asphaltTex.wrapS = asphaltTex.wrapT = RepeatWrapping
    asphaltTex.repeat.set(13, 13)

    // Dashed centre lines along the grid. EW dashes sit a hair higher so they
    // don't z-fight the NS dashes where streets cross.
    const GAP = 5.5
    const half = ROAD_SPAN / 2
    const dashes: { x: number; z: number; ry: number; y: number }[] = []
    for (const gx of GRID_NS)
      for (let z = -half + 2; z < half; z += GAP) dashes.push({ x: gx, z, ry: 0, y: 0.02 })
    for (const gz of GRID_EW)
      for (let x = -half + 2; x < half; x += GAP) dashes.push({ x, z: gz, ry: Math.PI / 2, y: 0.022 })

    return { asphaltTex, dashes }
  }, [])

  useEffect(() => () => asphaltTex.dispose(), [asphaltTex])

  const sidewalk = '#9b9b92'
  const roadTone = '#3b3e44' // worn lane, a touch lighter than the base asphalt

  return (
    <group>
      {/* Big asphalt ground out to the fog */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0, -0.001, 0]}>
        <planeGeometry args={[260, 260]} />
        <meshStandardMaterial map={asphaltTex} roughness={1} />
      </mesh>

      {/* Worn-lane road bands forming a grid around the depot block */}
      {GRID_NS.map((x) => (
        <mesh key={`ns${x}`} rotation-x={-Math.PI / 2} position={[x, 0.0015, 0]} receiveShadow>
          <planeGeometry args={[ROAD_W, ROAD_SPAN]} />
          <meshStandardMaterial color={roadTone} roughness={1} />
        </mesh>
      ))}
      {GRID_EW.map((z) => (
        <mesh key={`ew${z}`} rotation-x={-Math.PI / 2} position={[0, 0.0018, z]} receiveShadow>
          <planeGeometry args={[ROAD_SPAN, ROAD_W]} />
          <meshStandardMaterial color={roadTone} roughness={1} />
        </mesh>
      ))}

      {/* Solid lane-edge lines along each street (read clearly as roads) */}
      {GRID_NS.map((x) =>
        [-1, 1].map((s) => (
          <mesh
            key={`nse${x}_${s}`}
            rotation-x={-Math.PI / 2}
            position={[x + s * (ROAD_W / 2 - 0.25), 0.0022, 0]}
          >
            <planeGeometry args={[0.18, ROAD_SPAN]} />
            <meshStandardMaterial color="#b9bab0" roughness={1} />
          </mesh>
        )),
      )}
      {GRID_EW.map((z) =>
        [-1, 1].map((s) => (
          <mesh
            key={`ewe${z}_${s}`}
            rotation-x={-Math.PI / 2}
            position={[0, 0.0024, z + s * (ROAD_W / 2 - 0.25)]}
          >
            <planeGeometry args={[ROAD_SPAN, 0.18]} />
            <meshStandardMaterial color="#b9bab0" roughness={1} />
          </mesh>
        )),
      )}

      {/* Dashed centre lines — one instanced draw call for the whole grid */}
      <Instances limit={dashes.length}>
        <boxGeometry args={[0.5, 0.02, 3.0]} />
        <meshStandardMaterial color="#e8d98a" roughness={1} />
        {dashes.map((d, i) => (
          <Instance key={i} position={[d.x, d.y, d.z]} rotation={[0, d.ry, 0]} />
        ))}
      </Instances>

      {/* Manhole covers */}
      {MANHOLES.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 0]}>
            <circleGeometry args={[0.55, 18]} />
            <meshStandardMaterial color="#2a2c30" roughness={0.8} metalness={0.3} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]}>
            <ringGeometry args={[0.55, 0.66, 18]} />
            <meshStandardMaterial color="#45484e" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Sidewalk strips just outside each fence run */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, -halfZ - 1.5]} receiveShadow>
        <planeGeometry args={[halfX * 2 + 6, 3]} />
        <meshStandardMaterial color={sidewalk} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, halfZ + 1.5]} receiveShadow>
        <planeGeometry args={[halfX * 2 + 6, 3]} />
        <meshStandardMaterial color={sidewalk} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-halfX - 1.5, 0.004, 0]} receiveShadow>
        <planeGeometry args={[3, halfZ * 2 + 6]} />
        <meshStandardMaterial color={sidewalk} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[halfX + 1.5, 0.004, 0]} receiveShadow>
        <planeGeometry args={[3, halfZ * 2 + 6]} />
        <meshStandardMaterial color={sidewalk} roughness={1} />
      </mesh>
    </group>
  )
}

// ── Fence: concrete curb + chain-link panels + instanced posts + signage ────
function Fence({ halfX, halfZ }: GroundProps) {
  const segLen = (halfZ - GATE_HALF_WIDTH) / 2
  const segOff = halfZ - segLen

  // Build runs + a per-run cloned chain-link texture (repeat baked in, so the
  // shared base bitmap isn't clobbered). Posts collected into one instanced set.
  const { runs, posts, dispose } = useMemo(() => {
    const s = 64
    const c = document.createElement('canvas')
    c.width = c.height = s
    const x = c.getContext('2d')!
    x.clearRect(0, 0, s, s)
    x.strokeStyle = '#7c828b'
    x.lineWidth = 3
    x.beginPath()
    for (let i = -s; i < s * 2; i += 16) {
      x.moveTo(i, 0)
      x.lineTo(i + s, s)
      x.moveTo(i, s)
      x.lineTo(i + s, 0)
    }
    x.stroke()
    const baseTex = new CanvasTexture(c)
    baseTex.wrapS = baseTex.wrapT = RepeatWrapping

    type Run = {
      c: readonly [number, number]
      len: number
      axis: 'x' | 'z'
      tex: CanvasTexture
    }
    const defs: { c: readonly [number, number]; len: number; axis: 'x' | 'z' }[] = [
      { c: [0, -halfZ], len: halfX * 2, axis: 'x' },
      { c: [0, halfZ], len: halfX * 2, axis: 'x' },
      { c: [halfX, 0], len: halfZ * 2, axis: 'z' },
      { c: [-halfX, -segOff], len: segLen * 2, axis: 'z' },
      { c: [-halfX, segOff], len: segLen * 2, axis: 'z' },
    ]
    const clones: CanvasTexture[] = []
    const runs: Run[] = defs.map((d) => {
      const tex = baseTex.clone()
      tex.needsUpdate = true
      tex.repeat.set(Math.max(2, Math.round(d.len / 0.5)), 3)
      clones.push(tex)
      return { ...d, tex }
    })

    const posts: [number, number][] = []
    for (const r of runs) {
      const n = Math.max(2, Math.round(r.len / 2.4))
      for (let i = 0; i <= n; i++) {
        const t = i / n - 0.5
        if (r.axis === 'x') posts.push([r.c[0] + t * r.len, r.c[1]])
        else posts.push([r.c[0], r.c[1] + t * r.len])
      }
    }
    posts.push([-halfX, -GATE_HALF_WIDTH], [-halfX, GATE_HALF_WIDTH]) // gate posts

    const dispose = () => {
      baseTex.dispose()
      for (const t of clones) t.dispose()
    }
    return { runs, posts, dispose }
  }, [halfX, halfZ, segLen, segOff])

  useEffect(() => dispose, [dispose])

  return (
    <group>
      {/* Posts (one draw call) */}
      <Instances limit={posts.length} castShadow>
        <cylinderGeometry args={[0.05, 0.06, FENCE_HEIGHT + 0.2, 6]} />
        <meshStandardMaterial color="#6e747c" roughness={0.5} metalness={0.5} />
        {posts.map((p, i) => (
          <Instance key={i} position={[p[0], (FENCE_HEIGHT + 0.2) / 2, p[1]]} />
        ))}
      </Instances>

      {runs.map((r, i) => {
        const w = r.len
        const rot: [number, number, number] = [0, r.axis === 'z' ? Math.PI / 2 : 0, 0]
        return (
          <group key={i}>
            {/* Concrete curb base */}
            <mesh position={[r.c[0], 0.18, r.c[1]]} rotation={rot} castShadow receiveShadow>
              <boxGeometry args={[w + 0.1, 0.36, 0.16]} />
              <meshStandardMaterial color="#9a958c" roughness={1} />
            </mesh>
            {/* Chain-link panel (alpha-tested so it writes depth cleanly) */}
            <mesh position={[r.c[0], 0.36 + FENCE_HEIGHT / 2, r.c[1]]} rotation={rot}>
              <planeGeometry args={[w, FENCE_HEIGHT]} />
              <meshStandardMaterial
                map={r.tex}
                transparent
                alphaTest={0.45}
                side={DoubleSide}
                color="#aeb4bc"
                roughness={0.6}
                metalness={0.4}
              />
            </mesh>
            {/* Top rail */}
            <mesh position={[r.c[0], 0.36 + FENCE_HEIGHT, r.c[1]]} rotation={rot} castShadow>
              <boxGeometry args={[w, 0.06, 0.06]} />
              <meshStandardMaterial color="#5f656d" roughness={0.5} metalness={0.5} />
            </mesh>
          </group>
        )
      })}

      {/* Gate sign above the west entrance, facing into the yard */}
      <group position={[-halfX, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[3.0, 0.6, 0.08]} />
          <meshStandardMaterial color="#2f6f4f" roughness={0.7} />
        </mesh>
        <Text position={[0, 0, 0.05]} fontSize={0.28} color="#f4f7f2" anchorX="center" anchorY="middle">
          CITY RECYCLING DEPOT
        </Text>
      </group>
    </group>
  )
}

type SkylineProps = {
  halfX: number
  halfZ: number
}

function Skyline({ halfX, halfZ }: SkylineProps) {
  // Deterministic skyline — same buildings every reload. Each building is its
  // own geometry (UVs scaled so windows tile at a consistent real-world size),
  // but all share ONE windowed material, and fog handles distance fade.
  const { buildings, material, dispose } = useMemo(() => {
    const rand = makeRand(0xc0ffee)

    // Windowed facade: a `map` (dark facade + lit/unlit windows) and a matching
    // `emissiveMap` (black except lit windows) baked from the same pattern so
    // only the windows glow at dusk.
    const size = 128
    const cols = 4
    const rows = 4
    const pad = 12
    const gap = 7
    const cw = (size - pad * 2 - gap * (cols - 1)) / cols
    const ch = (size - pad * 2 - gap * (rows - 1)) / rows
    const mapC = document.createElement('canvas')
    mapC.width = mapC.height = size
    const emC = document.createElement('canvas')
    emC.width = emC.height = size
    const m = mapC.getContext('2d')!
    const e = emC.getContext('2d')!
    m.fillStyle = '#28313d'
    m.fillRect(0, 0, size, size)
    e.fillStyle = '#000000'
    e.fillRect(0, 0, size, size)
    const wr = makeRand(0x51a9)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = wr() < 0.5
        const xx = pad + c * (cw + gap)
        const yy = pad + r * (ch + gap)
        m.fillStyle = lit ? '#ffdf9e' : '#161d28'
        m.fillRect(xx, yy, cw, ch)
        if (lit) {
          e.fillStyle = '#ffcf86'
          e.fillRect(xx, yy, cw, ch)
        }
      }
    }
    const map = new CanvasTexture(mapC)
    map.colorSpace = SRGBColorSpace
    map.wrapS = map.wrapT = RepeatWrapping
    const emissive = new CanvasTexture(emC)
    emissive.colorSpace = SRGBColorSpace
    emissive.wrapS = emissive.wrapT = RepeatWrapping
    const material = new MeshStandardMaterial({
      map,
      emissiveMap: emissive,
      emissive: new Color('#ffcaa0'),
      emissiveIntensity: 0.9,
      roughness: 0.88,
    })

    type B = { pos: [number, number, number]; geo: BoxGeometry }
    const geos: BoxGeometry[] = []
    const buildings: B[] = []

    const make = (x: number, z: number, w: number, h: number, d: number) => {
      const geo = new BoxGeometry(w, h, d)
      const uv = geo.attributes.uv
      const sx = Math.max(1, w / 8.8)
      const sy = Math.max(1, h / 12.8)
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy)
      uv.needsUpdate = true
      geos.push(geo)
      buildings.push({ pos: [x, h / 2, z], geo })
    }

    // East skyline (behind the bin row) — two depths for layered city feel.
    for (let depth = 0; depth < 2; depth++) {
      const baseX = halfX + 18 + depth * 16
      for (let i = -4; i <= 4; i++) {
        const w = 4 + rand() * 5
        const h = 6 + rand() * (depth ? 22 : 14)
        const d = 3 + rand() * 4
        const z = i * 5 + (rand() - 0.5) * 2
        const x = baseX + (rand() - 0.5) * 3
        make(x, z, w, h, d)
      }
    }

    // North skyline (visible past the player when looking forward) — two depths.
    for (let depth = 0; depth < 2; depth++) {
      const baseZ = -halfZ - 16 - depth * 16
      for (let i = -4; i <= 4; i++) {
        const w = 5 + rand() * 6
        const h = 5 + rand() * (depth ? 20 : 12)
        const d = 3 + rand() * 4
        const x = i * 5.5 + (rand() - 0.5) * 2
        const z = baseZ + (rand() - 0.5) * 4
        make(x, z, w, h, d)
      }
    }

    // South + West skylines kept sparser (behind / beside the camera).
    for (let i = -3; i <= 3; i++) {
      const w = 4 + rand() * 5
      const h = 4 + rand() * 9
      const d = 3 + rand() * 3
      make(i * 6 + (rand() - 0.5) * 2, halfZ + 16 + (rand() - 0.5) * 3, w, h, d)
    }
    for (let i = -3; i <= 3; i++) {
      const w = 3 + rand() * 5
      const h = 5 + rand() * 10
      const d = 3 + rand() * 3
      make(-halfX - 18 + (rand() - 0.5) * 3, i * 5 + (rand() - 0.5) * 2, w, h, d)
    }

    const dispose = () => {
      for (const g of geos) g.dispose()
      map.dispose()
      emissive.dispose()
      material.dispose()
    }

    return { buildings, material, dispose }
  }, [halfX, halfZ])

  useEffect(() => dispose, [dispose])

  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={b.pos} geometry={b.geo} material={material} dispose={null} />
      ))}
    </group>
  )
}
