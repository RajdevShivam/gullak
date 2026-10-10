# Contraption: UI/UX Plan

## Key findings

1. **Teach by level, not by text.** The Incredible Machine gives every puzzle a goal, a fixed half-built machine and a small parts bin. It brings in one part at a time and makes the first puzzle trivial ([Filfre](https://www.filfre.net/?p=3440)). Crayon Physics has no tutorial. It writes a few words on the level itself, in the game's own art style ([TUNI Playlab](https://blogs.tuni.fi/playlab/game-reviews/crayon-physics-deluxe-review-pc/)). Poly Bridge opens with about seven short missions, each teaching one tool ([MacStories](https://www.macstories.net/reviews/game-day-poly-bridge/)).
2. **A limited parts bin is the puzzle.** Few part types in small amounts force creative combinations, and physics allows several valid solutions ([Filfre](https://www.filfre.net/?p=3440)). Fantastic Contraption works with only 3–4 object types ([Road to VR](https://www.roadtovr.com/open-world-building-minimalist-game-design-fantastic-contraption/)).
3. **Retries must be instant, and the test run must be easy to read.** Long death animations and fades are a main source of frustration. Super Meat Boy respawns instantly ([Game Informer](https://gameinformer.com/b/features/archive/2011/01/07/video-game-stress-relievers.aspx)). Poly Bridge players test, then slow the replay and turn on stress view to see what broke ([MacStories](https://www.macstories.net/reviews/game-day-poly-bridge/)). Fantastic Contraption added "streamers" and tracer balls so players can see the physics ([Voices of VR](https://voicesofvr.com/319-optimizing-for-play-with-fantastic-contraption/)).
4. **The physics must be deterministic.** Poly Bridge's first engine was not deterministic, so the same bridge could give different results, and the team had to build a custom engine ([TechRadar DE](https://global.techradar.com/de-de/features/poly-bridge-im-gesprach-mit-dem-technical-director)). If the same layout gives a different result each run, tweaking feels random.
5. **Optional optimisation goals bring players back.** Zachtronics games score solutions on parts used and speed, so "solve it" becomes "solve it better" ([Wikipedia](https://en.wikipedia.org/wiki/Zachtronics), [GameCloud](https://gamecloud.net.au/review/shenzhen-io)). Brain It On unlocks levels with stars and offers hints that show which shapes to use ([AppUnwrapper](https://www.appunwrapper.com/2015/07/17/brain-it-on-review-draw-your-way-out-of-this-conundrum/)).
6. **Juice makes impacts feel real, but use it sparingly.** Shake, particles, flashes and sound turn a flat prototype into something alive ("Juice it or lose it", [summary](https://rpgplayground.com/research-making-a-juicy-game/)). Too much hurts readability. Screen shake should be sparing and toggleable because of motion sickness ([Xbox XAG 107](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/107)). The basic accessibility tier asks for high UI contrast and remappable controls ([Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/?p=21)).

**Prototype gaps (from `prototype/index.html`):**
- Tray buttons spawn parts at a fixed spot (300,220) instead of letting you drag them.
- The ball trail is erased on reset.
- The timer uses wall-clock `performance.now()`, which breaks determinism and fast-forward.
- There is no undo.
- Overlapping placement is allowed.
- Star goals are hidden until you win.
- Fail waits for a 12s timeout.

## P0: must do (about 60 min)

| # | Item (time) | Why | How |
|---|---|---|---|
| 1 | **Level data + loader** (10) | Findings 1, 2 | `LEVELS = [{name, ball, cup:{x0,x1}, statics:[[x,y,w,h,angle?]], parts:{ramp:1,...}, par:{parts, time}, hint}]`. `loadLevel(i)` clears the world with `Composite.clear(engine.world)`, then rebuilds statics, ball and tray counts. Floor pieces either side of the cup, cup bottom at y 595. |
| 2 | **Sim-step timer + deterministic replay** (3) | Finding 4 | Count `steps++` in `afterUpdate` and use `t = steps/60`. Always call `Engine.update(engine, 1000/60)` with a fixed delta. On reset, restore positions, angles and velocities exactly (already done). |
| 3 | **Ghost trail of the previous run** (5) | Finding 3 | Keep the full `trail` (sample every 2nd step) as `lastRun`. On reset, copy `trail` into `lastRun` instead of discarding it. In build mode, draw `lastRun` as a dotted, low-alpha (0.25) gold polyline, with a small ✕ where the ball stopped. This is the single most useful aid for iterating. |
| 4 | **Instant fail -> build** (4) | Finding 3 | Out of bounds: fail at once. Stuck: `still > 45` (0.75s). Show a small "Stuck. Tweak it!" chip in the corner for 0.6s, then call `reset()` automatically. No modal. Space or R also resets during play. Keep the 12s hard cap. |
| 5 | **Drag from tray** (8) | Findings 1, 2 | On tray button `pointerdown`, create the part at the cursor's world position and start a `drag` straight away (reuse the existing `drag` and pointer capture). If it is dropped back over the tray or outside the canvas, remove the part. While dragging, draw the part at 0.6 alpha with a soft shadow. |
| 6 | **Invalid placement feedback** (6) | Finding 2 | During drag, test `Query.collides(body, staticsAndBall).length` and whether the part overlaps the cup rectangle. If invalid, outline the part in red (`#ff5a5a`). On drop, tween it back to its last valid position (or delete it if it is new) and play a low "thunk". |
| 7 | **Rotation snap + handle feedback** (4) | Finding 1 | Snap the angle to 15° steps (`Math.round(a/(PI/12))*PI/12`) on wheel and on R; Shift+R rotates the other way. Draw a small arc and the degrees next to the selected part for 600ms after each rotation. |
| 8 | **Undo (Ctrl+Z)** (5) | Finding 3 | Before every add, move, rotate or delete, push `snapshot()` = `placed.map(p=>({type,x,y,a}))` onto a stack capped at 50. Undo rebuilds `placed` from the top of the stack. |
| 9 | **Fast-forward** (3) | Finding 3 | Hold F (or a ⏩ button) to run 3 `Engine.update` steps per frame. Show "×3" in the corner. |
| 10 | **Goals visible up front + stars** (5) | Finding 5 | A HUD strip above the canvas reads: `★ Reach cup · ★ ≤ N parts · ★ < T s`. During play, tick each goal live and grey out a goal the moment it is missed. Set N and T per level. Win toast: stars pop in one at a time, 150ms apart, each with a rising tone. Buttons: Next (Enter) and Retry (Space). |
| 11 | **Level select + progress** (5) | Finding 5 | A row of 5 numbered pills under the title showing the best stars. Store progress in `localStorage` inside try/catch. Unlock a level when the previous one is finished (1 star). Arrow keys or clicking a pill switch levels. |
| 12 | **First-level teaching hints** (2) | Finding 1 | Level 1 draws a dashed "ghost ramp" outline where a ramp would work, plus a bobbing arrow from the tray to that spot. Each later level shows one short hand-lettered line on the canvas (`hint` field) that fades after the first Play. |

## P1: nice to have

- **Mode signal (5 min):** in build mode, show a faint 40px dot grid like a blueprint, and fade it out during play. Players should never wonder which mode they are in.
- **Juice tuning (5 min):**
  - Shake only for bouncer hits and the win (max 6px, decays in 150ms), with a "Reduce motion" toggle that also respects `prefers-reduced-motion`.
  - Crate landing gives a small dust puff.
  - Ball entering the cup: freeze for 80ms, cup glow flares, then confetti.
- **Hint button (5 min):** after 3 fails, a 💡 appears. It shows one part's outline from the reference solution (`level.solution[0]`).
- **Fan readability:** draw the airflow zone as a soft trapezoid during build mode too, so its reach is visible before testing (already partly there).
- **Keyboard and contrast basics:**
  - Tab moves through placed parts and arrow keys nudge the selected one by 5px.
  - Every key has a button equivalent.
  - Keep text at 4.5:1 contrast or better on `#12162a`.
  - Don't rely on color alone: give each part a distinct silhouette (ramp = long bar with end caps, bouncer = bar with a zig-zag spring, fan = square with blades, crate = box with an X).
- **Touch (cheap only):** pointer events already work. Add `touch-action:none` on the canvas, use a ⟳ button for rotation, and give selected parts a 44px minimum hit area.

## P2: skip

- Level editor and URL-hash sharing. Leave the stretch goal for after 5 polished levels are done.
- Slow-motion scrubbing, leaderboards, histograms, parts that join together, music.

## Visual style

- **Background:** navy `#12162a`. The world is a single slate `#2a3152` with 6px rounded corners. It is the "inert" layer.
- **Player parts:** saturated, one hue each. Ramp blue `#6c8cff`, Bouncer pink `#ff5fa2`, Fan teal `#44d4c4`, Crate wood `#c8894a`. Each has a 2px lighter top edge (`ctx.strokeStyle` lighten), which gives depth for one line of code.
- **Goal and ball:** both gold `#ffcc4d`, so the eye links ball to goal. The cup gets a pulsing glow, which is already there.
- **Text:** the system UI font, numbers in tabular figures. Use one rounded display weight for the title and stars.

## Five levels (960x600, floor top y=520)

Every level has walls at x=-10 and x=970.

1. **"Slide"** teaches drag + Play.
   - Ball (120,80). Cup x 420–500. Floor everywhere except the cup.
   - The ball falls straight onto the floor at x=120 and stops (it fails on its own).
   - Tray: Ramp ×1. The ghost outline shows a ramp at (220,300) tilted 20°. Par: 1 part, <4s.

2. **"Tilt"** teaches rotation.
   - Ball (480,60). Cup x 830–910.
   - A block at (300,470,80,100) and a low ledge at (660,490,120,60) stop the ball from rolling there flat.
   - Tray: Ramp ×2. They spawn flat and must be rotated: one ramp under the ball at about 25° down to the right, one bridging toward the cup. Par: 2 parts, <5s.

3. **"Boing"** teaches the Bouncer.
   - Ball (120,80). Cup x 830–910.
   - A tall wall at (470,420,28,200), top at y=320 (the prototype layout).
   - Tray: Ramp ×1, Bouncer ×1. Bounce the ball off an angled bouncer before the wall and over it. Par: 2 parts, <5s.

4. **"Plug"** teaches the Crate (a part that moves during play).
   - Ball (100,200) on a fixed slope (static (220,330,260,16) angled 20° down to the right) that sends it rolling right along the floor.
   - Floor x 0–500 and 556–830. A 56px-wide, 52px-deep slot at x 500–556, with a block at the bottom of the slot. Cup x 830–910.
   - Without help, the ball drops into the slot and gets stuck.
   - Tray: Crate ×1, Ramp ×1 (decoy, though a ramp bridge over the slot also works). Hover the crate above the slot. On Play it falls in flush and the ball rolls over it. Par: 1 part, <5s.

5. **"Breeze"** teaches the Fan, then combines everything.
   - Ball (120,80) on a fixed ledge (120,140,160,16) tilted 8° to the right.
   - A 260px gap in the floor (x 320–580, open to the bottom, so fall = instant fail). An overhang at (700,380,220,20) so a high bounce can't reach the cup at x 830–910.
   - Tray: Fan ×1, Ramp ×1, Crate ×1, Bouncer ×1 (some are decoys).
   - Intended solution: a ramp catches the ball, and a fan at about (300,470) pointing right carries it across the gap and under the overhang. Par: 2 parts, <6s.

Difficulty curve:
- **Levels 1–2:** one obvious placement, mainly to teach the controls.
- **Level 3:** you have to judge an angle.
- **Level 4:** you have to predict how a part moves during play.
- **Level 5:** you have to pick the right parts out of decoys and combine them.

Playtest each level in under a minute and keep at least two working solutions per level (Finding 2).
