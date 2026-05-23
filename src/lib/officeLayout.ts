// Floor plan layout for the "first day at the office" tour.
// All coordinates are 3D world units (meters). Y is up. Floor at Y=0.

export const OFFICE_HALF_EXTENT = 22

export type RoomId =
  | 'staff'
  | 'library'
  | 'reception'
  | 'docdisp'
  | 'conference'
  | 'att1'
  | 'att2'
  | 'att3'
  | 'caserecs'
  | 'lobby'

export type Bounds = readonly [number, number, number, number] // x1, z1, x2, z2

export type Room = {
  id: RoomId
  name: string
  bounds: Bounds
  floorColor: string
  /** Lines the guide narrates when the player enters. Picked round-robin. */
  lines: string[]
}

// Reading the floor plan as a rectangle ~38m wide × 18m deep.
// Adjacent rooms share boundaries so the floor tiles tile the office cleanly.
export const ROOMS: Room[] = [
  {
    id: 'staff',
    name: 'Staff Workstations',
    bounds: [-19, -9, -10, -2],
    floorColor: '#f4ead0',
    lines: [
      "These are the staff workstations. Sarah, Mike and Priya sit at the back, Jake, Tom and Emma in front.",
      "Schedules, billing, intake — it all happens here. If you ever need a court date moved, this is the room.",
      "Pro tip: don't take the seat by the window. Sun glare. Sarah will laugh at you.",
    ],
  },
  {
    id: 'library',
    name: 'Library',
    bounds: [-19, 1, -10, 9],
    floorColor: '#e9d8b0',
    lines: [
      "Welcome to the library. Two big tables, the law journals on the shelves. The senior partners come here when they need to think.",
      "Quiet room. No phone calls in here — that's a hard rule.",
    ],
  },
  {
    id: 'reception',
    name: 'Reception',
    bounds: [-10, -2, -4, 2],
    floorColor: '#d4d4d4',
    lines: [
      "Reception. Helena runs the desk — she knows where everyone is at any given moment. Befriend her early.",
      "Visitors check in here. If a client looks lost, walk them over.",
    ],
  },
  {
    id: 'docdisp',
    name: 'Document Disposal',
    bounds: [-3, -8, 5, 1],
    floorColor: '#dcd2bd',
    lines: [
      "Document disposal area. Everything confidential goes in those shred bins. Don't toss case papers in the regular trash — ever.",
      "The shredder gets emptied Tuesdays and Fridays. If a bin's full, find another one.",
    ],
  },
  {
    id: 'conference',
    name: 'Conference Room',
    bounds: [7, -8, 18, -2],
    floorColor: '#e6dabd',
    lines: [
      "The conference room. Depositions, partner meetings, the occasional birthday cake.",
      "Book it through the calendar. Don't just walk in — it's almost always reserved.",
    ],
  },
  {
    id: 'att1',
    name: "Attorney's Office — Daniels",
    bounds: [-3, 2, 3, 9],
    floorColor: '#e8dec3',
    lines: [
      "Mr. Daniels' office. Litigation. Door open means he's free to talk — closed means absolutely not.",
    ],
  },
  {
    id: 'att2',
    name: "Attorney's Office — Okafor",
    bounds: [3, 2, 9, 9],
    floorColor: '#e8dec3',
    lines: [
      "Ms. Okafor — corporate counsel. She's the one to ask about contracts and clauses.",
    ],
  },
  {
    id: 'att3',
    name: "Attorney's Office — Reyes",
    bounds: [9, 2, 15, 9],
    floorColor: '#e8dec3',
    lines: [
      "Ms. Reyes handles family law. Be quiet near the door — emotional calls happen.",
    ],
  },
  {
    id: 'caserecs',
    name: 'Case Records',
    bounds: [15, 2, 18, 9],
    floorColor: '#d8ccaf',
    lines: [
      "Case records. Active files, archived files, sealed files — all in here. Sign anything out on the clipboard by the door.",
    ],
  },
  // Catch-all "lobby" tile that covers any floor area not claimed by another room.
  // Rendered last so the typed rooms paint over it.
  {
    id: 'lobby',
    name: 'Hallway',
    bounds: [-19, -9, 19, 9],
    floorColor: '#cfcfcf',
    lines: [
      "Just the main hallway. The good rooms are off to the sides.",
    ],
  },
]

export type Wall = {
  /** Start + end on the floor, X/Z. */
  a: [number, number]
  b: [number, number]
  height?: number
}

// Internal dividers + perimeter. Walls are stubs (1.5m tall) so the camera can
// still see over them while reading as a floor plan. Doors are 1.8m gaps left
// open between walls intentionally.
export const WALLS: Wall[] = [
  // ── Outer perimeter ───────────────────────────────────────────
  { a: [-19, -9], b: [19, -9] },
  { a: [-19, 9], b: [19, 9] },
  { a: [-19, -9], b: [-19, 9] },
  { a: [19, -9], b: [19, 9] },

  // ── Left bulge: staff workstations ↔ reception ↔ library ──────
  // Right edge of left rooms (with door into reception)
  { a: [-10, -9], b: [-10, -2] },
  { a: [-10, 2], b: [-10, 9] },
  // Reception's right wall (gap = doorway leading into the hallway)
  { a: [-4, -2], b: [-4, -0.6] },
  { a: [-4, 0.6], b: [-4, 2] },
  // Reception top + bottom walls
  { a: [-10, -2], b: [-4, -2] },
  { a: [-10, 2], b: [-4, 2] },

  // ── Staff / library ↔ reception walls (already covered by reception top/bottom)
  // Nothing extra needed; rooms tile naturally.

  // ── Document disposal area ────────────────────────────────────
  // Left wall (separating from reception/hallway)
  { a: [-3, -8], b: [-3, -2] },
  { a: [-3, 0], b: [-3, 1] }, // small stub south
  // Right wall (separating from conference + attorney 1)
  { a: [5, -8], b: [5, -2] },
  { a: [5, 0], b: [5, 1] },
  // Bottom wall (south side)
  { a: [-3, 1], b: [5, 1] },

  // ── Conference room ───────────────────────────────────────────
  { a: [7, -8], b: [7, -3] }, // gap = door to hallway
  { a: [7, -1], b: [7, -2] },
  { a: [7, -2], b: [18, -2] },

  // ── Attorney offices south row ────────────────────────────────
  { a: [-3, 2], b: [3, 2] }, // top of att1, with door gap below
  { a: [3, 2], b: [9, 2] }, // top of att2
  { a: [9, 2], b: [15, 2] }, // top of att3
  { a: [15, 2], b: [18, 2] }, // top of caserecs
  // Dividers between attorney offices
  { a: [3, 2], b: [3, 9] },
  { a: [9, 2], b: [9, 9] },
  { a: [15, 2], b: [15, 9] },
]

export type Furniture = {
  pos: [number, number] // x, z (center)
  size: [number, number, number] // w, h, d
  color: string
  rotationY?: number
}

export const FURNITURE: Furniture[] = [
  // ── Staff workstations: 6 desks in a 3×2 grid ────────────────
  ...[
    [-17, -7], [-14.5, -7], [-12, -7],
    [-17, -3.7], [-14.5, -3.7], [-12, -3.7],
  ].map(([x, z]) => ({
    pos: [x, z] as [number, number],
    size: [1.6, 0.78, 0.8] as [number, number, number],
    color: '#7a5b3f',
  })),

  // ── Library: 2 round-ish tables (approx with cylinders later; for now wide squat boxes)
  { pos: [-16, 4], size: [3.2, 0.78, 0.4], color: '#6b4a30' },
  { pos: [-16, 6.5], size: [3.2, 0.78, 0.4], color: '#6b4a30' },
  // Bookshelves on the left wall
  { pos: [-18.6, 3], size: [0.6, 2.2, 1.8], color: '#3d2a1a' },
  { pos: [-18.6, 5.5], size: [0.6, 2.2, 1.8], color: '#3d2a1a' },
  { pos: [-18.6, 8], size: [0.6, 2.2, 1.8], color: '#3d2a1a' },

  // ── Reception: L-shape desk ──────────────────────────────────
  { pos: [-7, 0.3], size: [2.5, 0.78, 0.7], color: '#5e4530' },
  { pos: [-5.6, -0.6], size: [0.7, 0.78, 1.8], color: '#5e4530' },

  // ── Document disposal: 3 shred cabinets ──────────────────────
  { pos: [1, -6], size: [1.0, 1.1, 0.8], color: '#3a3a40' },
  { pos: [1, -3.5], size: [1.0, 1.1, 0.8], color: '#3a3a40' },
  { pos: [1, -1], size: [1.0, 1.1, 0.8], color: '#3a3a40' },

  // ── Conference room: long table + chairs implied by table size
  { pos: [12.5, -5], size: [6.0, 0.78, 2.0], color: '#4a3220' },

  // ── Attorney offices: each has an L-shape desk ───────────────
  // Att1
  { pos: [0, 4.5], size: [2.5, 0.78, 0.7], color: '#6b4a30' },
  { pos: [1.5, 5.6], size: [0.7, 0.78, 1.8], color: '#6b4a30' },
  // Att2
  { pos: [6, 4.5], size: [2.5, 0.78, 0.7], color: '#6b4a30' },
  { pos: [7.5, 5.6], size: [0.7, 0.78, 1.8], color: '#6b4a30' },
  // Att3
  { pos: [12, 4.5], size: [2.5, 0.78, 0.7], color: '#6b4a30' },
  { pos: [13.5, 5.6], size: [0.7, 0.78, 1.8], color: '#6b4a30' },

  // ── Case records: 3 filing cabinets ──────────────────────────
  { pos: [16, 3.5], size: [0.9, 1.4, 0.6], color: '#4a4a52' },
  { pos: [16, 5.5], size: [0.9, 1.4, 0.6], color: '#4a4a52' },
  { pos: [16, 7.5], size: [0.9, 1.4, 0.6], color: '#4a4a52' },
]

/** Player spawn point — middle of the reception area. */
export const SPAWN: [number, number] = [-7, 0]

/** Returns the topmost typed room at (x, z), or 'lobby' if none. */
export function roomAt(x: number, z: number): RoomId {
  // Check typed rooms before the catch-all lobby (which is the last entry).
  for (let i = 0; i < ROOMS.length - 1; i++) {
    const r = ROOMS[i]
    const [x1, z1, x2, z2] = r.bounds
    if (x >= x1 && x <= x2 && z >= z1 && z <= z2) return r.id
  }
  return 'lobby'
}

export function roomById(id: RoomId): Room {
  return ROOMS.find((r) => r.id === id)!
}

// ── Collider registration (mounted by Office, not at module load) ────
import { addBoxCollider, clearColliders } from './world'

const WALL_COLLIDER_PAD = 0.1 // wall half-thickness ~0.09 + a hair

/**
 * Push office wall AABBs into the shared collider list. Call on Office mount;
 * pair with clearColliders() on unmount so other game modes start clean.
 */
export function registerOfficeColliders() {
  clearColliders()
  for (const w of WALLS) {
    const cx = (w.a[0] + w.b[0]) / 2
    const cz = (w.a[1] + w.b[1]) / 2
    const halfW = Math.abs(w.b[0] - w.a[0]) / 2 + WALL_COLLIDER_PAD
    const halfD = Math.abs(w.b[1] - w.a[1]) / 2 + WALL_COLLIDER_PAD
    addBoxCollider(cx, cz, halfW, halfD)
  }
}
