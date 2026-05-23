# Recycling Depot — optimization backlog

Audit captured 2026-05-20. Each item is a self-contained change. Priority labels
reflect best-bang-for-buck given current state; reassess as the game evolves.

Quick legend:
- **P1** — high impact, low effort. Do these first.
- **P2** — meaningful improvement, moderate effort.
- **P3** — polish / nice-to-have. Save for the polish pass.
- **TECH** — code health; no user-visible change.

---

## P1 — quick wins

### 1. NPC target indicator ❌ (tried + reverted 2026-05-20 — user preference)
Telegraphing intent is currently weak — the only signal of an NPC's destination
is the angle of their walking line. Display a small colored chevron / sphere
above each NPC's head whose color matches their *target bin*. Player can match
it against the colored item the NPC is carrying at a glance:
- match → leave them
- mismatch → punch
Cheap: one `<Billboard>` + small mesh per NPC, fed from `binById(targetBinId).color`.

### 2. Reward correct deposits ✅ (shipped 2026-05-20)
Current scoring has a degenerate equilibrium: stop-wrong is +1, stop-right is -1,
let-wrong-through is -1, let-right-through is **0**. AFK score ≈ -N where N is
the expected wrong deposits. Means inaction is statistically safer than
engagement. Fix: +1 for letting a *correct* NPC complete their deposit. Then
active play always beats AFK and good defenders shine.

### 3. Pre-match 3-2-1-GO ❌ (tried + reverted 2026-05-20 — user preference)
First NPC currently arrives ~1.4s after Begin — player is still parsing the
scene. Add an `intro` phase between `idle` and `playing` in `useDepot`; show a
3-second countdown overlay during which spawning is paused and timer hasn't
started. Bonus: show the 5 bin colors big and labeled during countdown so
first-time players learn the mapping.

### 4. Difficulty ramp ✅ (shipped 2026-05-20)
Spawn interval is flat 1.2–2.6s for the whole 60s. Should shorten over time.
Linear ramp: `interval = lerp(initial, final, 1 - timeLeft/MATCH_DURATION)`
with `initial = 2.6, final = 0.7`. First 15s feels learnable, last 15s
relentless.

### 5. Camera shake on hit ❌ (tried + reverted 2026-05-20 — user preference)
A hit currently produces ✗/✓ feedback + a corpse but no kinetic feedback at
the player's POV. Add a 0.22s, ~0.2-amplitude additive offset to camera
position with quadratic ease-out. Use `useDepot.hitPulse` (new counter
incremented on `registerWrongStop` / `registerRightStop`) so Character can
react to hits without coupling to NPCs directly.

### 6. High score in localStorage ✅ (shipped 2026-05-20)
Persist best score across reloads, show on the title screen ("Best: +14").
Two-line change, big motivator for replay.

---

## P2 — meaningful

### 7. Gradient sky / proper backdrop ✅ (shipped 2026-05-20)
Currently `<color attach="background">` is flat gray-blue with fog 30–95.
Replace with drei's `<Sky />` or a vertical gradient cubemap. Depot would feel
outdoor instead of studio-lit.

### 8. NPC variety ✅ (shipped 2026-05-20)
All NPCs use the same Humanoid shape with just color variation. Add scale
jitter (0.9–1.1) + walk-cycle phase offset on spawn so the crowd looks like
different people.

### 9. Bin geometric detail ✅ (shipped 2026-05-20)
Current bins are colored boxes. Add wheels at the base (4 small cylinders)
and a black slot cut on the lid (negative-Y plane geometry inset). Sells the
recycling-bin silhouette much harder.

### 10. Combo counter
Track consecutive correct stops (wrong-bin punches). Display "x3!" growing on
screen with each consecutive correct hit. Reset on a wrong stop. Add a small
score multiplier (`floor(combo/3)`) for replay depth.

### 11. Tutorial overlay (first run only)
First-time player doesn't know the rules. Show a 5-second one-time hint:
"Match the floating dot to the carried item. Punch when they don't match."
Store `tutorialSeen` in localStorage to suppress after first match.

### 12. Punch responsiveness
`PUNCH_DURATION = 2.47s` locks the player for the full Mixamo combo. Either:
- shorten the locked window to ~0.8s, allow new punches to interrupt the anim
- speed the animation with `timeScale: 2.5` for a 1s combo
- only lock for the first ~30% of the anim
Currently the cost of a mistimed punch is real.

### 13. Leaving NPCs shouldn't be punchable
Right now an NPC that has already deposited can still be punched on their way
out the gate. If they deposited correctly, you accidentally lose -1. Add
`phase.current === 'leaving'` to the early-return in the punch subscriber.

### 14. End-of-match star rating
Visual 0–5 star summary based on score thresholds, big in the end overlay. Adds
goal-feel beyond a bare number.

---

## P3 — polish

### 15. Sound effects + music
Currently silent. Even the minimum kit massively improves perceived quality:
- punch hit thump
- correct-deposit chime
- wrong-deposit alarm beep
- NPC footsteps (ambient, low-volume)
- end-of-match horn
- title-screen soft loop
Use Howler.js or plain `new Audio()`. Sources: freesound.org, zapsplat.

### 16. Punch hit particles
Tiny burst of yellow shards from impact point, despawn over 0.3s. drei has no
built-in; a 6-particle Points cloud with manual position/velocity updates
in `useFrame` works fine. Fires when an NPC transitions to `falling`.

### 17. Floor texture ⚠️ (partial — wear patches removed 2026-05-20)
Currently flat concrete color. Outer darker apron shipped + kept. Translucent
scattered "stain" planes were ugly (read as floating sheets) — reverted.
Future attempt should use a noise/repeating texture or vertex-color variation,
not flat decals.

### 18. Background silhouettes ✅ (shipped 2026-05-20)
Row of dark blue building silhouettes ~50m east (behind the bin wall) plus
maybe some trees / fence posts in the distance. Adds depth so the bins don't
feel like the edge of the universe.

### 19. Slow-mo on near-miss save
If you punch an NPC when they're <0.2s from depositing into the wrong bin,
briefly set animation `timeScale = 0.3` for 0.3s. Cinematic, rewarding.

### 20. Improved shadows
`shadow-mapSize-width={1024}` is coarse for a 20×14m yard. Bump to 2048 for
noticeably crisper edges. Costs ~3-4ms per frame on mid-range GPUs.

### 21. NPC reactions to player presence
NPCs slow down briefly or veer slightly when player gets close. Adds life
without changing punch mechanics.

---

## TECH — code health (background, do anytime)

### 22. Compress avatar GLB
`public/models/waste-hero.glb` is 7MB. Run `gltf-transform` with Draco
compression — typically 60–80% smaller. drei's `useGLTF` decodes Draco
natively.

### 23. Compress hero PNG
`public/hero-mascot.png` is 2MB. Convert to WebP (~600KB at same quality) or
add `loading="lazy"`. Most users wait for the title screen anyway, but smaller
is faster.

### 24. Extract `lerpAngle` helper ✅ (shipped 2026-05-20)
Duplicated in `Character.tsx`, `WasteNPC.tsx`, `GuideNPC.tsx`. Pull into
`src/lib/math.ts` and import.

### 25. Remove vestigial code ✅ (shipped 2026-05-20)
- `src/lib/knockables.ts` — no game uses `KnockableBox` anymore. Delete or
  quarantine.
- `WORLD_HALF_EXTENT = 60` in `chapters.ts` — used only by `Character.tsx`
  for a clamp that's irrelevant now (walls handle it). Drop or replace with
  mode-specific bounds.

### 26. Trim `countedAsDoneRef` in `DepotNPCManager`
Set grows unbounded across a match (every NPC ID ever spawned). Fine at 60s
scale; clean up if you add Endless Mode.

### 27. Corpse mesh reduction
After fall animation completes, swap the full Humanoid (6 lit meshes) for a
single low-poly "lying body" prefab. Frees up draw calls if you stack
particles / sound / heavier effects later. Negligible right now.

### 28. Explicit pause on `visibilitychange`
`requestAnimationFrame` halts in background tabs so the timer effectively
freezes — but that's incidental. Add a deterministic pause/resume via
`document.addEventListener('visibilitychange', ...)` so behavior is explicit.

---

## How to use this doc

- Pick from P1 first unless something specific is bothering you about feel.
- Each item is meant to be ~30-150 lines of code; if scope balloons, split.
- Mark items ✅ shipped + date when implemented.
- Add new findings to the appropriate priority bucket.
