// Chapter manifest for the open-world hub. Each chapter is a diorama placed
// at a fixed (x, z) on the open ground. The player walks around between them.

export type ChapterId =
  | 'ch1'
  | 'ch2'
  | 'ch3'
  | 'ch4'
  | 'ch5'
  | 'ch6'

export const CHAPTER_IDS: ChapterId[] = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6']

export const CHAPTER_TITLE: Record<ChapterId, string> = {
  ch1: 'Chapter 1 — The Before',
  ch2: 'Chapter 2 — The Spark',
  ch3: 'Chapter 3 — The Garage Order',
  ch4: 'Chapter 4 — The Crisis',
  ch5: 'Chapter 5 — The Breakthrough',
  ch6: 'Chapter 6 — The Now',
}

export const CHAPTER_SUBTITLE: Record<ChapterId, string> = {
  ch1: 'Hobbyists, soldering irons, and Homebrew',
  ch2: 'A desk in the dark, blueprints in motion',
  ch3: 'Boxes, ledgers, and the Byte Shop bet',
  ch4: 'A cold boardroom and a choice that wasn’t',
  ch5: 'Translucent plastic, click wheels, glass screens',
  ch6: 'Today, in everyone’s pocket',
}

export const CHAPTER_ACCENT: Record<ChapterId, string> = {
  ch1: '#d97706', // warm amber (garage bulb)
  ch2: '#3b82f6', // electric blue
  ch3: '#15803d', // deep green
  ch4: '#b91c1c', // deep red
  ch5: '#f8fafc', // bright white
  ch6: '#fde68a', // soft daylight
}

/** World position of each diorama center. Player spawns at (0, 0, 0) facing -Z. */
export const CHAPTER_POSITION: Record<ChapterId, [number, number]> = {
  ch1: [0, -28], // dead ahead at spawn — featured
  ch2: [-26, -10],
  ch3: [-26, 16],
  ch4: [26, -10],
  ch5: [26, 16],
  ch6: [0, 30],
}

/** How close the player has to be to a diorama before its trigger fires. */
export const CHAPTER_TRIGGER_RADIUS = 5

/** World extent (used for ground plane sizing and travel clamps). */
export const WORLD_HALF_EXTENT = 60
