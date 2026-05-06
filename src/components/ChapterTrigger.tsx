import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Vector3 } from 'three'
import {
  CHAPTER_POSITION,
  CHAPTER_TRIGGER_RADIUS,
  type ChapterId,
} from '../lib/chapters'
import { useGame } from '../lib/store'

type Props = {
  chapterId: ChapterId
  characterRef: React.RefObject<Vector3>
}

/**
 * Proximity AABB-style trigger. When the player walks within radius of a
 * chapter's diorama center, set currentChapter. When they leave, clear it (so
 * other dioramas can fire next time).
 */
export function ChapterTrigger({ chapterId, characterRef }: Props) {
  const insideRef = useRef(false)
  const [cx, cz] = CHAPTER_POSITION[chapterId]

  useFrame(() => {
    const pos = characterRef.current
    if (!pos) return
    const dx = pos.x - cx
    const dz = pos.z - cz
    const dist = Math.hypot(dx, dz)
    const inside = dist < CHAPTER_TRIGGER_RADIUS

    if (inside && !insideRef.current) {
      insideRef.current = true
      useGame.getState().setCurrentChapter(chapterId)
    } else if (!inside && insideRef.current) {
      insideRef.current = false
      // Only clear if we were the active chapter
      if (useGame.getState().currentChapter === chapterId) {
        useGame.getState().setCurrentChapter(null)
      }
    }
  })

  return null
}
