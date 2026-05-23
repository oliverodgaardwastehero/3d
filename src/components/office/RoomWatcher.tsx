import { useFrame } from '@react-three/fiber'
import type { RefObject } from 'react'
import type { Vector3 } from 'three'
import { roomAt } from '../../lib/officeLayout'
import { useTour } from '../../lib/tourState'
import { useGame } from '../../lib/store'

type Props = {
  playerRef: RefObject<Vector3>
}

/**
 * Reads the player's position each frame and tells the tour store which room
 * the player is currently standing in. The store dedupes — only transitions
 * actually trigger new dialogue.
 */
export function RoomWatcher({ playerRef }: Props) {
  useFrame(() => {
    if (!useGame.getState().hasStarted) return
    const pos = playerRef.current
    if (!pos) return
    const id = roomAt(pos.x, pos.z)
    useTour.getState().enterRoom(id)
  })
  return null
}
