# SELAH — build prompt

*A plan for a future game. Nothing is built yet.*

Two changes from the first draft of this prompt, made by the author: the music
is **funky**, techno-funk in many genres as in Luminaries, not one techno sound
(locked decision 8 and the Music section); and the interface is **sleek and
modern** (locked decision 9 and the Interface section). Everything else is as
written.

---

You are building **SELAH**, a mobile-first Phigros-style rhythm game. Read this entire prompt before writing a line of code. Locked decisions below override your defaults. Do not “improve” the theology, the text, or the copyright model.

## One-sentence pitch

A Phigros-like rhythm game where the notes are **words from the Psalms**. You **tap words** as they hit a moving judgment line. 150 charts. Techno-funk that changes genre with the psalm. The whole Psalter, including the dark ones.

Title: **SELAH**
Tagline: *The Word is the note.*

## Locked decisions (do not reopen)

1. **Input = TAP, not type.** Phigros feel. Touch / mouse / optional keyboard as extra lanes later, never a typing game.
2. **Default public text = Douay-Rheims (Challoner), public domain.** Vulgate/Septuagint numbering.
3. **Optional “Grail” text = user-supplied local file only.** Never shipped, never fetched, never sampled in the repo, never in screenshots, never in tests.
4. **All 150 psalms.** Laments, imprecatory psalms, the pit. No skipping, no paraphrasing, no “family friendly” rewrite.
5. **Psalm 118 Douay (= Hebrew 119) is its own book of 22 letter-songs**, plus an optional marathon. Details below.
6. **Look:** club-cathedral. Black void, gold, bone, one mood color. Neon geometry. **Not** stained glass, doves, clipart crosses, worship-app gradients.
7. **Ship playable, not a mock.** First milestone is three real charts with sound, then the campaign shell.
8. **Music = funky.** Techno-funk in many genres, a different groove for each kind of psalm, the way Luminaries gives every Doctor a song of their own. Not one techno sound for all 150. Built on the Luminaries synth engine. Details in Music below.
9. **Interface = sleek and modern.** A current, premium rhythm-game interface (think Phigros, Arcaea, Cytus II): clean type, lots of space, smooth motion. Not pixel fonts, parchment, or medieval UI. Details in Interface below.

## What Phigros DNA to keep

- A **judgment line** (“the Voice”) that can move, rotate, split, multiply, disappear.
- Notes fly in from any direction and must be hit when they meet the Voice.
- Four hit types: Tap, Hold, Flick, Drag — plus a fifth unique type: **Selah**.
- Combo, accuracy, Perfect / Good / Miss.
- High difficulty = spectacle and chaos, not “more lanes of the same.”
- Typical chart length **90–180 seconds**. Short psalms loop and intensify. Long psalms chart the spine, not every syllable.

Judgment windows (start here, tune later): Perfect ±80ms · Good ±160ms · Bad ±180ms (tap only) · Miss = combo break.

## Note language (grammar → hits)

Do **not** make “the / and / of / a” into real taps. That kills the game.

| Type | Visual | Input | What it maps to |
|---|---|---|---|
| **Tap** | Gold/cyan word | Touch on time | Content words: verbs, nouns, blows, names |
| **Hold** | Elongated word, sustain glow | Press at head, keep holding | Divine names, “for ever”, mercy, long vowels |
| **Flick** | Word with a slash / spark | Swipe any direction on time | Questions, sudden turns, imprecations, “How long?” |
| **Drag** | Dimmer flowing words | Finger already down, sweep | Glue words, lists, the second half of a couplet |
| **Selah** | The Voice stills. Word may read SELAH or the line goes empty | **Do not tap.** Hold stillness for the window | Hebrew selah / LXX diapsalma / stanza pause |

**Divine names** (Lord, God, Adonai, etc.) are accent holds or accent taps — always on a downbeat or drop.

**Parallelism:** when a verse is an A/B couplet, **the Voice splits**. Left = A, right = B. Missing B leaves the verse unfinished.

**Selah positions:** Douay often omits the word “Selah.” Keep a data table of traditional Hebrew selah verse-locations (verse numbers are not copyrighted) and trigger the mechanic there even when Douay doesn’t print it. If a Grail pack marks Pause/Selah, prefer the pack.

## Music: techno-funk, a new genre for each kind of psalm

Every psalm has its own song, and the song is funky. The genre follows what the
psalm is doing: a psalm of praise does not sound like a lament, and the
imprecatory psalms do not sound like the songs of the pilgrims. Listen to
Luminaries for the standard: neo-soul funk for St. Augustine, melodic house for
St. Hildegard, progressive funk in odd meters for St. Thomas, dub for St. Cyril
of Jerusalem, motorik for St. Peter Canisius, almost nothing at all for St. John
of the Cross. Fear Not adds Detroit jazz techno.

### The engine

- **Copy `luminaries/audio.js` whole into `selah/audio.js`**, as Fear Not did
  (`fear-not/audio.js`). Everything is synthesised in the browser: drums,
  basses, keys, pads, choirs, a reverb, a ping-pong delay, sidechain pumping from
  the kick, and a compressor and limiter on the master. Add instruments as the
  genres need them (an acid bass, a talkbox, a vocoder), as Fear Not added its
  jazz section.
- **Write songs the Luminaries way** (`luminaries/songs.js`): each song is
  `{ title, bpm, swing, duck, play(e) }`, and `play` is called once for every
  sixteenth with the time, the step, the bar, and `L`, the intensity from 0 to 3.
- **The audio clock is the master clock.** Note timing and judgment both read
  `AudioContext.currentTime`, never animation-frame time. The chart compiler
  places words on the song's own sixteenth grid, so the words and the music
  come from the same score. Add an audio-offset calibration in settings, as
  every rhythm game needs for Bluetooth headphones and slow phones.

### How the music answers the player

- **The band builds with the combo.** `L` rises as the combo grows and falls a
  step on a miss: a full combo hears the whole song; a broken one hears it thin
  out and come back.
- **A Selah is the breakdown before the drop.** In club music the pause is what
  gives the drop its force. When a Selah comes, the band drops away to a pad and
  a heartbeat kick and the Voice stills; hold your stillness through the window
  and the whole band comes back in on the next downbeat, louder than before.
- **Divine names land on the drop**, as the note language already says: the
  song should be written so its strongest downbeats are free for them.
- **Difficulty does not change the song.** Easy and the hardest chart play the
  same score; harder charts reach `L` 3 sooner and stay there.

### A starting palette (tune by ear)

Psalm numbers are the Douay's.

| Kind of psalm | For example | Groove |
|---|---|---|
| Praise and the Hallel | 112–117, 145–150 | Nu-disco and gospel house: four on the floor, octave bass, piano stabs, handclaps, brass hits |
| Royal and enthronement | 2, 44, 46, 92, 95–98, 109 | Electro-funk: slap bass, a talkbox fanfare, horn stabs, half-time drops |
| Creation | 8, 18, 28, 103, 148 | Melodic house: wide arpeggios, a sub bass that drops to the floor (as in Viriditas) |
| Wisdom and the Law | 1, 36, 48, 72, 111 | Deep house and jazz-funk: a walking bass, a Rhodes, swung hats |
| Songs of Ascents | 119–133 | Motorik techno-funk: steady, tireless eighths, a figure that climbs a step at a time, as pilgrims climb to Jerusalem |
| Laments | 3, 12, 21, 41–42, 76, 85 | Dub techno: chords that echo away, a one-drop beat, tape hiss |
| The seven penitential psalms | 6, 31, 37, 50, 101, 129, 142 | Slow neo-soul and broken beat: behind the beat, sighing pads (Ps 129, *De profundis*, is also a Song of Ascents: the pilgrims' walking beat can run under it) |
| Imprecatory and war | 34, 57, 68, 108, 136 | Acid and industrial funk: a squelching acid bass, distortion, martial snares |
| The pit | 87 | Minimal techno: a deep kick, a sub bass that hardly moves, one far light (as in Noche Oscura). It never resolves. The psalm ends in darkness, and so does the song |
| History and litany | 77, 104, 105, 135 | Progressive funk that changes section by section; Ps 135's refrain ("for his mercy endureth for ever") as a call and response, every answer a Hold |
| Psalm 118, the 22 letters | 118 | One tempo spine, 22 grooves: each letter takes a genre from this palette, so the marathon plays as one DJ set, mixed beat to beat |

## Interface: sleek and modern

The play field is the club-cathedral of decision 6. The menus, HUD and results
around it should look like a current premium rhythm game.

- **Type.** A clean modern sans for the interface (Inter, Manrope or Space
  Grotesk from Google Fonts), light and regular weights, small caps labels with
  wide letter-spacing, big confident numbers. The words on the notes in a heavy,
  high-contrast sans that stays legible in motion. A refined serif only for still
  text: the psalm's title card, the verse shown on the results screen. No pixel
  fonts (the other games in this repo use Press Start 2P; SELAH does not).
- **Surfaces.** Flat black, frosted-glass panels, hairline gold rules, rounded
  corners, generous space. No bevels, drop-shadow buttons, parchment or scrolls.
- **Motion.** Every change of screen eases in and out; nothing jumps. Keep 60 fps
  on a mid-range phone. The song select is one smooth list of the 150 psalms,
  and the psalm's mood color washes into the background as you scroll to it.
- **HUD.** Minimal and out of the way of the Voice: score top right, combo top
  centre, accuracy small, the "Voice: Douay" tag, a pause button. Nothing else.
- **Results.** Grade, accuracy, max combo and a Perfect / Good / Bad / Miss
  breakdown, with the verse you played set in the serif.

## Copyright architecture (non-negotiable)

This repo will be **public on GitHub**.

### Shipped in the repo
Douay-Rheims Challoner (PD). A schema + empty template for optional user packs. A Douay export in that same schema so the player can see the file shape. Engine, chart compiler, art, procedural audio.

### NEVER in the repo, builds, tests, CI, screenshots, README, or demo GIFs
Grail Psalms (1963), Revised Grail (2010), Abbey Psalms and Canticles, any other copyrighted psalter — **not even one verse “for illustration.”** No scraping. No “demo Grail” toggle.

### Grail pack flow
1. Settings → **Voice** → Default Douay. Optional: **Import pack**.
2. Native file picker. Client-side read only.
3. Validate schema. Store **on device** (IndexedDB / app private storage).
4. HUD: “Voice: Douay” or “Voice: Grail”.
5. Charts regenerate from the active text (word timings depend on the words).
6. Remove pack = delete from device.
7. **Zero network upload of pack contents.**

If the file is missing or declined: stay on Douay. One quiet settings sentence: “Grail is not included. If you own it, import a pack file.”

### Pack file

JSON `selah-pack.v1.json`:

```json
{
  "selahPack": 1,
  "id": "grail",
  "displayName": "Grail",
  "numbering": "hebrew",
  "license": "user-supplied-do-not-redistribute",
  "psalms": [
    { "n": 1, "verses": [ { "v": 1, "lines": ["…"] } ] }
  ]
}
```

---

## Still to write

The prompt as first drafted ends at the pack file above. These parts are named
but not yet written:

- **Psalm 118 (Hebrew 119)**: "Details below" — the 22 letter-songs and the
  marathon.
- **The rest of the pack file**: validation rules, how Hebrew numbering in a
  pack maps to the Douay's Vulgate numbering, and how Pause/Selah marks are
  written in it.
- **The campaign shell** that follows the first milestone.

## Notes for the builder (from this repo)

- **House rules.** Like every game here: plain HTML and JavaScript, no build
  step, in its own folder (`selah/`), made for phones. The site is served from
  the `gh-pages` branch.
- **The Douay text is already here.** `psalter-runner/index.html` holds all 150
  psalms of the Challoner Douay-Rheims, checked verse by verse, as the
  `PSALTER` array. It is in Hebrew order with the Vulgate number beside each
  psalm, and leaves out the psalm headings. Re-key it to Vulgate numbering for
  SELAH, following the Douay where the two numberings split or join psalms
  (Vulgate 9 = Hebrew 9–10; Vulgate 113 = Hebrew 114–115; Vulgate 114–115 =
  Hebrew 116; Vulgate 146–147 = Hebrew 147).
- **Selah verse numbers need mapping.** Most selah tables use English verse
  numbers, which do not count a psalm's heading; the Douay often counts the
  heading as verse 1 (as the Hebrew does), and the Vulgate splits and joins
  some psalms. So the same line can carry a different number. Map the table to
  Douay verses psalm by psalm and check each one against the text by hand.
