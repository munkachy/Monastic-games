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
  inhale.js    vortex box, pulling, catching, giving hearts
  enemies.js   enemy table + behaviors
  levels.js    level strings + builder
  play.js      the play scene: wires everything
  tune.js      on-screen tuning panel (edits C live, saved in localStorage)
  PLAN.md      this file; update "Status" at the end of every chunk
```

## Chunks

Each chunk is one session, ends playable, and ends with a commit and a Status update.

1. **Skeleton.** `index.html`, `main.js`, `config.js`, `input.js`, `play.js`. A box walks and jumps on flat ground with both kinds of control. Late jump and early jump (4 frames each).
2. **The monk.** `art.js`, `monk.js`. Big head, skinny body, goofy walk (head bobs a beat late), squash on landing, crouch.
3. **Tuning panel.** `tune.js`. Sliders for every number in `C`; this is where you tune feel on the phone, for free.
4. **Inhale.** `inhale.js`. Hold the button: he stops, the mouth opens, there's a vortex box in front, things speed up toward him and shrink, he catches up to 4. Full: cheeks, slower, can't flap.
5. **The heart.** In `inhale.js`. Tap while full: a glow from belly to chest, a heart flies out; with 2+ things inside it's a big heart that goes through a line of enemies. Short freeze on catch and hit.
6. **Enemies, round 1.** `enemies.js`. Gummy bear (walks), pizza (flies), jawbreaker (can't be swallowed). Won-over animation.
7. **Level 1.** `levels.js`. The cloister garden, with the camera following, a start and an end.
8. **Incense float.** In `monk.js` and `levels.js`. Inhale a cloud, swell up, glow, flap the sleeves, slow fall; letting go puffs a smoke ring.
9. **Health and items.** Getting hurt, flashing, health; the chocolate egg makes him invincible.
10. **Enemies, round 2.** Lollipop knight (boomerang to catch), ice-cream cone (drops scoops).
11. **Boss.** The Candied-Apple Tree.
12. **Opening scene.** The calendar, Vespers, the bell, "Feast day!"
13. **Sound.** Small synth sound effects; music later.

After 13: the Cellarer, more levels, chant-note flight, copy abilities, the six Sundays of Lent.

## Rough token cost per chunk (guesses, one session each, no big fixes)

| Chunk | Cost |
|---|---|
| 1 Skeleton | 60–100k |
| 2 Monk | 80–150k |
| 3 Tuning panel | 40–70k |
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
- Feedback as one list after playing.
- Feel problems: use the tuning panel first, then tell me the numbers to keep.

## Status

- Chunk 0: plan written. Nothing built.
