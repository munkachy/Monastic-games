# Feast Day — Plan

A Kirby-style side-scroller. A big-headed, skinny monk has fasted all week in Lent. After Vespers on Saturday the bell rings: Sunday is being kept, and Sunday is a little Easter. He inhales every sweet in sight and gives it back as charity (hearts).

**Read this file first in every session. Do not reread the old chat.** Each chunk lists the only files it touches.

## Fixed decisions

- Engine: Phaser 3.80.1 from cdnjs, one `<script>` tag, no build. Arcade physics.
- Art: Phaser shapes and textures generated in code (`art.js`). No image files at first.
- Phone sideways first; keys too.
- Controls (as in Canticle Mansion): left half of the screen walks (outer = left, inner = right). Tap the right half to jump; tap in the air to flap when he is full of incense. A round button at the lower right: hold to inhale, tap to give a heart when full. Keys: arrows, Z jump, X inhale/give.
- Hearts win enemies over (they smile and hop off to the feast). They don't destroy them.
- Float only after inhaling incense.
- No copy abilities, cut scenes or bosses until the core feels good.

## Code rules (keep it lean)

- One job per file, each under ~200 lines. A change opens only its file.
- All feel numbers live in `config.js` as one flat object `C`. No magic numbers elsewhere.
- Plain ES modules, no classes unless Phaser needs them. Short functions, few comments.
- Enemies are data: `enemies.js` holds a table `{ name: { draw, speed, behavior, swallowable } }`. Adding an enemy = one table entry + one tiny behavior function.
- Levels are data: arrays of strings in `levels.js` (`#` ground, `=` platform, `g` gummy bear, `i` incense…).
- The monk is a small state machine in `monk.js`: `idle, walk, jump, inhale, full, float, hurt`.

## Files

```
feast-day/
  index.html   page, Phaser tag, loads main.js
  main.js      game config, scene list
  config.js    C = { gravity, walk, jump, inhale range, ... }
  art.js       makes all textures from shapes
  input.js     touch zones + keys -> { left, right, jumpPressed, actHeld, actPressed }
  monk.js      monk states and moves
  inhale.js    vortex box, pulling, catching, chewing, swallowing
  heart.js     glow, hearts flying out, heart hits
  scapular.js  bendy scapular panels
  enemies.js   enemy table + behaviors
  levels.js    level strings + builder
  play.js      the play scene: wires everything
  tune.js      pause screen; in the artifact only: tuning sliders + feedback to the artifact database
  PLAN.md      this file; update "Status" at the end of every chunk
```

## Chunks

Each chunk is one session, ends playable, and ends with a commit and a Status update.

1. **Skeleton.** `index.html`, `main.js`, `config.js`, `input.js`, `play.js`. A box walks and jumps on flat ground with both kinds of control. Late jump and early jump (4 frames each).
2. **The monk.** `art.js`, `monk.js`. Big head, skinny body, goofy walk (head bobs a beat late), squash on landing, crouch.
3. **Pause, tuning and feedback.** `tune.js`. Pause button. In the pause screen: sliders for every number in `C`, and a feedback box (with the level, position and current numbers attached automatically). Feedback is saved to the artifact's database, which Claude reads with ArtifactData: no copying and pasting. Shown **only when running as the claude.ai artifact** (the dev build); on GitHub Pages pause just pauses. Load the `artifact-capabilities` skill before this chunk.
4. **Inhale.** `inhale.js`. Hold the button: he stops, the mouth opens, there's a vortex box in front, things speed up toward him and shrink, he catches up to 4. Full: cheeks, slower, can't flap.
5. **The heart.** In `inhale.js`. Full (cheeks) → tap (or Down) to chew, 2 chews per thing → swallow → fed. Tap while fed: a glow from belly to chest, a heart flies out. Its size grows with the chews it took (= things swallowed × `chewsPer`); big hearts go through a line of enemies. Short freeze on catch and hit.
6. **Enemies, round 1.** `enemies.js`. Gummy bear (walks), pizza (flies), jawbreaker (can't be swallowed). Won-over animation.
7. **Level 1.** `levels.js`. The cloister garden, with the camera following, a start and an end.
8. **Incense float.** In `monk.js` and `levels.js`. Inhale a cloud, swell up, glow, flap the sleeves, slow fall; letting go puffs a smoke ring.
9. **Health and items.** Getting hurt, flashing, health; the chocolate egg makes him invincible.
10. **Enemies, round 2.** Lollipop knight (boomerang to catch), ice-cream cone (drops scoops).
11. **Boss.** The Candied-Apple Tree.
12. **Opening scene.** The calendar, Vespers, the bell, "Feast day!"
13. **Sound.** Small synth sound effects; music later.

After 13: the Cellarer, more levels, chant-note flight, copy abilities, the six Sundays of Lent.

Idea for later — fast-day levels: sweets are hazards to jump around; touching one makes him eat it and get hurt. Only healthy food (broccoli and the like) is safe to eat there.

## Rough token cost per chunk (guesses, one session each, no big fixes)

| Chunk | Cost |
|---|---|
| 1 Skeleton | 60–100k |
| 2 Monk | 80–150k |
| 3 Pause, tuning, feedback | 60–110k |
| 4 Inhale | 100–200k |
| 5 Heart | 60–120k |
| 6 Enemies 1 | 70–130k |
| 7 Level 1 | 60–110k |
| 8 Incense float | 60–110k |
| 9 Health, items | 50–90k |
| 10 Enemies 2 | 50–90k |
| 11 Boss | 100–180k |
| 12 Opening scene | 80–150k |
| 13 Sound | 50–90k |
| **Total** | **~0.85–1.6M** |

Each round of fixes after playing: about 20–60k.

## How to ask (cheap)

- "Do chunk N." One chunk per session.
- Feedback: write it in the pause screen while playing, then say "read the feedback and fix it".
- Feel problems: use the tuning panel first, then tell me the numbers to keep.

## Status

- Chunk 1 done: a box walks and jumps (touch zones + keys, late/early jump, lower jump on early release). `window.game` exposed for tests.
- Chunk 2 done: `art.js` (robe, tonsured head), `monk.js` (physics box + drawn look; states idle/walk/jump/crouch; head bobs a beat late, waddle, air lean, landing squash, crouch on Down key — no touch crouch yet). Movement moved from `play.js` to `monk.js`; input now has `down`.
- After chunk 2 feedback: triangle hood-head, a bit bigger, face inside it, black habit, dangling arms that swing a beat late and spread out in the air (front forward, back backward; `armAir`). Scapular: front and back panels to the ankles on a spring (trail when moving, flare when falling); numbers `scap*` in config. Dev artifact: https://claude.ai/artifact/5rN6gHcaYhzg638CKKR57s
- Chunk 3 done: `tune.js`. Pause button (top right; Esc/P too). In the artifact (`claude.use('db')` not null): feedback box first, then a slider for every `C` number (0–3× start; boxW/boxH only take effect on reload). Feedback goes to db collection `feedback` with level, x, y, state, C and time. Artifact declares `capabilities: {db:{}}`. Read with ArtifactData list `feedback`.
- Scapular is now `scapular.js`: two bendy verlet chains drawn in the monk container (back stays behind, front stays in front).
- Feedback round 1 (db doc lddjsifbv8h934498w8r): user's tuned numbers are now the defaults. Scapular panels sit wider apart, each kept on its own side (back trails back, front flares forward), with a different spring rate (`scapOffbeat`) so they don't move together.
- Chunk 4 done: `inhale.js` (vortex box in front, from the feet up; things in it speed up toward the mouth and shrink; catch up to `inhaleMax`; release with something inside → full). Monk: `m.mode` = inhale (walks at `inhaleSlow` = half speed, facing locked, mouth open, no jump) / full (cheeks stay puffed, wider head, `fullSlow`, `fullJump`) / fed (each tap of act/Down while full is one chew — cheeks squish; `chewsPer` chews per thing eaten, then a gulp and he is fed; body stays skinny — belly growth and body frames were tried and dropped). Test sweets in `play.js` (`things` group, respawn when all eaten) until enemies exist. Placeholder: tapping act while fed just empties him — chunk 5 replaces this with the heart.
- Chunk 5 done: `heart.js`. Fed + tap (that press never inhales; no inhaling for `heartCool` after): a glow rises from belly to chest (`glowTime`), then a heart flies forward with a wobble and fades (`heartSpeed`, `heartLife`). Size = `heartBase + chews × heartGrow`; `heartPierce` (2+ swallowed) marks it `big`. Hit-stop: `scene.freeze(t)` in `play.js`; used on catch (`catchFreeze`) and in `hearts.hit(t)` (`hitFreeze`; small hearts vanish, big ones carry on) — chunk 6 wires `hearts.group` overlap to enemies and calls `hearts.hit`.
- Camera (early part of chunk 7): follows the monk and keeps him mid-screen vertically, so the lower half is free for thumbs (`camLerp`, `camLerpY`). Ground is a deep block; the act button is fixed to the screen.
- Heart "hiccup": during the glow he stretches tall, shivers and clutches his chest (`m.windup`); when the heart pops out he squashes, head snaps back, arms fling up and he hops backward (`m.pop`, `recoil`, `popHop`). Numbers `windStretch…popHop` in config.
