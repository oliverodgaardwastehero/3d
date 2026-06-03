# Recycling Depot — optimization backlog

Audit captured 2026-05-20. Each item is a self-contained change. Priority labels
reflect best-bang-for-buck given current state; reassess as the game evolves.

Quick legend:
- **P1** — high impact, low effort. Do these first.
- **P2** — meaningful improvement, moderate effort.
- **P3** — polish / nice-to-have. Save for the polish pass.
- **TECH** — code health; no user-visible change.

---

## 2026-06-03 — title-screen critical-path split (shipped)

The start screen is pure DOM/CSS, but `main → App → Game` statically imported the
whole WebGL stack, so the title couldn't paint until **1.53 MB / 465 KB gzip** of
three + @react-three/* + postprocessing downloaded, parsed and executed.

- ✅ Extracted the `<Canvas>` subtree (KeyboardControls + Canvas + World + PostFX)
  into `Scene.tsx` and pulled it in with `React.lazy(() => import('./Scene'))`.
  three.js is now reachable only through the dynamic import, so Rollup isolates it.
  **Entry chunk 1.53 MB → 215 KB (465 → 68 KB gzip; ~85% smaller, 0 renderer code.)**
  The 1.28 MB Scene chunk streams in the background and the import fires on first
  render, so it loads in parallel with the title instead of blocking first paint.
- ✅ Decoupled `LoadingScreen` from drei. drei's `useProgress` now runs inside the
  lazy chunk (`LoadReporter`) and mirrors `{loadProgress, assetsReady}` into the
  zustand store; the title screen reads those — zero WebGL code on the title path.
  Live "Loading N%" + instant-Start preload (player GLB still preloads during the
  title via `useGLTF.preload`) are preserved.
- Verified: `tsc -b` clean, headless-Chrome/SwiftShader screenshot shows the title
  rendering and the Start CTA reaching its ready state (load bridge works e2e).

---

## 2026-05-31 — quality + performance pass (shipped)

Big multi-area pass. Verified in a real headless browser (puppeteer/swiftshader).

**Assets / load**
- ✅ GLB compressed with `gltf-transform optimize --compress meshopt --texture-compress webp`:
  7.1 MB → **340 KB** (~95% smaller). No code change — `useGLTF` decodes meshopt by
  default. All 4 clips + `KHR_materials_specular` preserved; kick plays in place.
- ✅ `hero-mascot.png` 1.9 MB → `hero-mascot.jpg` **265 KB** + `decoding="async"`.
  (Total first-load assets ~9 MB → ~0.6 MB.)
- ✅ `antialias: false` (the EffectComposer already resolves 8× MSAA); removed the
  duplicate Game-level fog (fog is now per-mode in World.tsx).

**Punch / player animation** — supersedes #12
- ✅ Hit timing fixed + decoupled from the wall clock: it fires off the render loop (was a
  `setTimeout`), gated on `useDepot.phase === 'playing'` so a punch in flight can't knock a
  standing NPC after the buzzer. Movement lock shortened; re-press allowed right after.
  `KICK_IMPACT_DELAY` is derived from the clip's contact fraction — retune it when a new
  punch clip is baked.
- ℹ️ Animation is baked-clip-driven via `Avatar.tsx` `ANIM_BY_STATE`, now wired to the new
  model's clips (idle/walk/run/kick all working; Space = kick). ⚠️ That GLB's clip NAMES are
  mislabeled vs their actual motion (verified by foot-motion FK), so the map points each
  state at the clip whose CONTENT matches — see the comment block in Avatar.tsx. Position
  tracks are stripped on load so any root motion plays in place. `KICK_*` constants are tuned
  to the new kick clip (1.30 s, contact at 0.417). (Procedural idle + arm-jab were prototyped
  earlier, then removed in favor of baked clips.)
- ✅ New model re-compressed with gltf-transform meshopt + WebP: **33.9 MB → 920 KB**. All
  4 clips (Idle_10/Running/Step_in_High_Kick/Walking) + KHR_materials_specular preserved.
  Re-run that command any time the model is re-exported (it always lands uncompressed).

**Punch feedback**
- ✅ Floating ✓ / ✗ over a punched NPC: green ✓ for a wrong-bin NPC (correct stop, +1),
  red ✗ for a right-bin NPC (mistake, -1) — Billboard + Text rising + fading, mirroring the
  bin deposit feedback (`WasteNPC.tsx`).

**Lighting / look-dev**
- ✅ Soft IBL via drei `<Environment>` (offline `<Lightformer>`s, no CDN) + `envMapIntensity`
  on the player GLB; flat ambient → `<hemisphereLight>`; warm dusk key.
- ✅ Soft, clean shadows: 2048 map + `normalBias 0.04` + frustum tightened to the yard. (#20)
- ✅ Dusk `<Sky>` sun + sky-matched fog; gentle `BrightnessContrast`/`HueSaturation` grade.

**NPCs** — supersedes #8 partially, #27
- ✅ Shared module-level limb geometry + ~8 memoized materials per NPC (was ~13 fresh
  geometries + ~13 materials each).
- ✅ Connective shoulder-yoke + hip spheres (close the joint seams), eye-whites + pupils
  + brows, softer roughness, desaturated shirts, thin `<Outlines>`, hair/glasses/body-girth
  variety wired through from spawn.
- ✅ Spawn scale-in (no pop), footfall bob + torso counter-twist, flailing knockdown.
- ✅ Corpse shadow-kill on settle + corpse cap (≤ 8) so the late-match draw-call cliff is bounded. (#27)

**City** — supersedes #18
- ✅ Emissive window-grid (CanvasTexture map + emissiveMap, per-building UV-scaled geometry,
  one shared material) so buildings read as a lit dusk skyline; two depth layers.
- ✅ Visible chain-link fence (curb + alpha-tested panels + instanced posts + gate posts +
  "CITY RECYCLING DEPOT" sign) where there was only an invisible collider.
- ✅ Road + sidewalk ring outside the fence with a dashed centre line.
- ✅ Large textured asphalt ground (260×260) out to the fog — fixes the bright-sky void where
  the old apron ended. Carries a street grid (worn-lane bands + solid lane-edge lines +
  instanced dashed centre lines, a near ring around the depot block + an outer ring for depth),
  subtle asphalt tonal/crack variation, and a few manhole decals.

**Still open / deferred:** #2 Avatar imperative play (P3 micro), #9 Math.hypot micro-opts,
the bigger NPC-instancing refactor (only matters for Endless mode), bloom (deferred —
windows read fine without it).

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
