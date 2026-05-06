import { useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'

/**
 * The WasteHero badge: a rounded light-blue square containing a stylised white
 * "W" with a notched base. Drawn once into a CanvasTexture and reused by every
 * mounted instance.
 */
let _cached: CanvasTexture | null = null

function buildBadgeTexture(): CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const px = (p: number) => p * size

  // Rounded light-blue square (transparent outside the corners).
  const radius = size * 0.16
  ctx.fillStyle = '#7eb2dd'
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(size - radius, 0)
  ctx.quadraticCurveTo(size, 0, size, radius)
  ctx.lineTo(size, size - radius)
  ctx.quadraticCurveTo(size, size, size - radius, size)
  ctx.lineTo(radius, size)
  ctx.quadraticCurveTo(0, size, 0, size - radius)
  ctx.lineTo(0, radius)
  ctx.quadraticCurveTo(0, 0, radius, 0)
  ctx.closePath()
  ctx.fill()

  // White "W" — three peaks, drawn as a thick zigzag stroke.
  ctx.strokeStyle = '#ffffff'
  ctx.fillStyle = '#ffffff'
  ctx.lineWidth = size * 0.135
  ctx.lineCap = 'butt'
  ctx.lineJoin = 'miter'
  ctx.miterLimit = 4

  ctx.beginPath()
  ctx.moveTo(px(0.18), px(0.28))
  ctx.lineTo(px(0.355), px(0.62))
  ctx.lineTo(px(0.5), px(0.34))
  ctx.lineTo(px(0.645), px(0.62))
  ctx.lineTo(px(0.82), px(0.28))
  ctx.stroke()

  // Base block underneath the W — a small platform with a notch cut from
  // the bottom-middle so it reads as little legs/feet.
  const baseTop = px(0.7)
  const baseBot = px(0.9)
  const baseLeft = px(0.34)
  const baseRight = px(0.66)
  const notchTop = px(0.78)
  const notchHalf = px(0.06)
  const cx = px(0.5)

  ctx.beginPath()
  ctx.moveTo(baseLeft, baseTop)
  ctx.lineTo(baseRight, baseTop)
  ctx.lineTo(baseRight, baseBot)
  ctx.lineTo(cx + notchHalf, baseBot)
  ctx.lineTo(cx + notchHalf, notchTop)
  ctx.lineTo(cx - notchHalf, notchTop)
  ctx.lineTo(cx - notchHalf, baseBot)
  ctx.lineTo(baseLeft, baseBot)
  ctx.closePath()
  ctx.fill()

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

type Props = {
  /** Width/height of the patch in metres. */
  size?: number
  /** Local-space position relative to the parent group. */
  position?: [number, number, number]
}

export function WasteHeroBadge({
  size = 0.28,
  position = [0, 0.95, 0.39],
}: Props) {
  const texture = useMemo(() => {
    if (!_cached) _cached = buildBadgeTexture()
    return _cached
  }, [])

  return (
    <mesh position={position} castShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial
        map={texture}
        transparent
        alphaTest={0.5}
        toneMapped={false}
      />
    </mesh>
  )
}
