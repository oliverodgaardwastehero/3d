// Tiny synthesised sound effects for the blaster — no audio assets to load.
// Everything is generated with WebAudio oscillators + a filtered noise burst.
// The context is created lazily on the first call (which always happens inside
// a click, so autoplay policy is satisfied) and every call is wrapped so audio
// can never break gameplay.

let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null
const MASTER = 0.45

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function noiseBuffer(c: AudioContext): AudioBuffer {
  if (noise && noise.sampleRate === c.sampleRate) return noise
  const len = Math.floor(c.sampleRate * 0.25)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  noise = buf
  return buf
}

function tone(
  c: AudioContext,
  type: OscillatorType,
  f0: number,
  f1: number,
  start: number,
  dur: number,
  gain: number,
) {
  const o = c.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(f0, start)
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), start + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(gain * MASTER, start)
  g.gain.exponentialRampToValueAtTime(0.0008, start + dur)
  o.connect(g).connect(c.destination)
  o.start(start)
  o.stop(start + dur + 0.02)
}

function burst(c: AudioContext, start: number, dur: number, freq: number, q: number, gain: number) {
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c)
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = freq
  bp.Q.value = q
  const g = c.createGain()
  g.gain.setValueAtTime(gain * MASTER, start)
  g.gain.exponentialRampToValueAtTime(0.0008, start + dur)
  src.connect(bp).connect(g).connect(c.destination)
  src.start(start)
  src.stop(start + dur + 0.02)
}

/** Blaster discharge: a sharp noise crack under a fast descending zap. */
export function playShot() {
  try {
    const c = audio()
    if (!c) return
    const t = c.currentTime
    burst(c, t, 0.11, 1100, 0.6, 0.55)
    tone(c, 'square', 920, 130, t, 0.12, 0.2)
    tone(c, 'sine', 1800, 300, t, 0.06, 0.12)
  } catch {
    // audio is optional
  }
}

/** Trigger pulled on an empty cell. */
export function playEmpty() {
  try {
    const c = audio()
    if (!c) return
    const t = c.currentTime
    tone(c, 'square', 420, 380, t, 0.05, 0.12)
  } catch {
    // audio is optional
  }
}

/** Cell swap: click out, rising charge, click in. Length matches FPS.RELOAD_TIME. */
export function playReload(duration: number) {
  try {
    const c = audio()
    if (!c) return
    const t = c.currentTime
    burst(c, t, 0.05, 2400, 2, 0.35)
    tone(c, 'triangle', 220, 880, t + 0.15, duration - 0.35, 0.09)
    burst(c, t + duration - 0.12, 0.06, 1800, 2, 0.4)
    tone(c, 'sine', 1400, 1500, t + duration - 0.1, 0.08, 0.1)
  } catch {
    // audio is optional
  }
}

/**
 * Hit confirmation: a bright ping for a good stop (a two-note chime for a
 * headshot), a dull thud for a mistake.
 */
export function playHit(good: boolean, headshot = false) {
  try {
    const c = audio()
    if (!c) return
    const t = c.currentTime + 0.02
    if (good && headshot) {
      tone(c, 'sine', 1500, 2100, t, 0.08, 0.22)
      tone(c, 'sine', 2200, 3000, t + 0.07, 0.1, 0.18)
      tone(c, 'triangle', 3400, 3400, t + 0.12, 0.1, 0.07)
    } else if (good) {
      tone(c, 'sine', 1300, 1900, t, 0.09, 0.22)
      tone(c, 'sine', 2600, 2600, t + 0.05, 0.08, 0.08)
    } else {
      tone(c, 'sawtooth', 240, 110, t, 0.22, 0.2)
      burst(c, t, 0.12, 300, 0.8, 0.3)
    }
  } catch {
    // audio is optional
  }
}
