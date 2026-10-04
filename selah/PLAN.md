# SELAH — build prompt

*The plan for the game. The first build is playable (`index.html`): milestone 1, three
psalms with their songs, the four ranks, and the Voice setting with pack import, rebuilt
after the author played it so that the notes are the drums (see "How to read this").*

**How to read this.** The author's prompt comes first, and it binds: the locked
decisions, the note language and the copyright architecture. The author made
two changes to it: the music is **funky**, techno-funk in many genres as in
Luminaries (decision 8), and the interface is **sleek and modern** (decision 9).
After playing the first build, the author changed it again (decisions 10 to 12):
**the notes are the drums**, not the rhythm of speech, because a player can feel a
beat coming and cannot guess a melody; **the Voice is one straight line**; the ranks
add the drum part **as Rock Band does**; and the music is **more percussive, more
varied and more progressive**, with dubstep and odd meters. Where the older text
below (Phigros DNA, the note language, the moving Voice, the set pieces) disagrees
with these, these win; those passages are kept, marked, for what they still say
about the words and the feel.
Sections marked *(proposed)* were filled in by Claude at the author's request.
They are the plan, but the author may change them, and they never override a
locked decision. Every quotation of the Psalms here is the Douay-Rheims
(Challoner), checked against the text in `psalter-runner/index.html`.

---

You are building **SELAH**, a mobile-first Phigros-style rhythm game. Read this entire prompt before writing a line of code. Locked decisions below override your defaults. Do not “improve” the theology, the text, or the copyright model.

## One-sentence pitch

A Phigros-like rhythm game where the notes are **words from the Psalms**. You **tap words** as they hit a moving judgment line. 150 charts. Techno-funk that changes genre with the psalm. The whole Psalter, including the dark ones.

*(As changed by the author: you play the drums — kick, snare, toms, cymbals — on one straight line, and the words of the psalm ride the strokes.)*

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
10. **The notes are the drums.** The player plays the song's drum part: mostly the kick and the snare, and the fills when they come. Every psalm's song has its drum part written out bar by bar, and the same part both plays the drums and makes the chart. The words ride the strokes. Details in The drums below.
11. **One straight line.** The Voice is a single straight judgment line, still, with the drum kit along it: hi-hat at the left, snare, toms, crash at the right; the kick is the whole line, struck anywhere. No splitting, turning or moving lines.
12. **Ranks as in Rock Band.** The easiest rank plays the kick and snare, on the beat, with a cymbal now and then; each rank above adds more of the drum part (the syncopated kicks and simple fills; then hi-hats, toms and crashes; then sixteenths, ghost strokes and whole fills). The band always plays the full part; the rank decides how much of it is the player's.
13. **Every note is a tap.** No flicks, holds or drags: a stroke is a touch on time, in its place. Every drum but the kick is a box glowing in the drum's color, with its word inside, or empty where the stroke has no word: the box is the note, always. The kick is only a bar across the line, and never carries a word. The only other thing the player does is keep still at a Selah.
14. **A person must be able to play every chart, with two thumbs.** Every chart is checked against a model of a person playing a phone held sideways (two touches at once at most, how fast a thumb can tap and move, how fast anyone can keep time), and the compiler leaves out whatever the model cannot reach. Details in How hard below.

## What Phigros DNA to keep

*(Decisions 10–12 replace the moving, splitting line and "spectacle and chaos": one still line, and difficulty that is more of the drum part.)*

- A **judgment line** (“the Voice”) that can move, rotate, split, multiply, disappear.
- Notes fly in from any direction and must be hit when they meet the Voice.
- Four hit types: Tap, Hold, Flick, Drag — plus a fifth unique type: **Selah**. *(Set aside by the author: Tap and Selah only, decision 13.)*
- Combo, accuracy, Perfect / Good / Miss.
- High difficulty = spectacle and chaos, not “more lanes of the same.”
- Typical chart length **90–180 seconds**. Short psalms loop and intensify. Long psalms chart the spine, not every syllable.

Judgment windows (start here, tune later): Perfect ±80ms · Good ±160ms · Bad ±180ms (tap only) · Miss = combo break.

*(As built.)* A touch strikes the earliest note it can reach that is within a Perfect of it (else the
nearest in time), as most rhythm games do, so that a touch a little late for one note never takes the
next and leaves the first behind. A touch on a drum's place strikes that drum before the kick, so two
thumbs can strike a kick and a snare together.

## The drums *(the note language as the author changed it)*

The notes are the strokes of the drum part. Each stroke has its place on the line, and every one is a tap:

| Drum | Where on the line | Looks like | From which rank |
|---|---|---|---|
| Kick | The whole line: strike anywhere | An orange bar across the line, with no word | Feria |
| Snare (and clap, rim) | Left of centre | A gold box, its word inside or empty | Feria |
| Toms, high to low | Right of centre, three places | Green boxes | Memoria (in fills) |
| Crash; ride | The right end | Cyan boxes | Feria (crash), Festum (ride) |
| Hi-hat | The left end | Small white boxes, always empty | Festum (eighths), Sollemnitas (sixteenths) |
| A roll (into a drop) | The snare's place | Strokes on the snare that quicken: quarters, then eighths from Festum, then sixteenths in its second half at Sollemnitas | Memoria |
| **Selah**: the band falls away | The line goes still | SELAH; touch nothing | Feria |

**Writing a drum part.** One character to a sixteenth, per drum: `0`–`3` a stroke charted from that rank up (Feria, Memoria, Festum, Sollemnitas), `g` a ghost stroke (Sollemnitas), `x` a stroke the band plays that no rank charts, `f` a stroke charted at Feria only, `.` nothing. Fills end phrases (every two lines); a crash begins them. The compiler then keeps each rank to its rules (How hard, below).

### How hard *(as built)*

The ranks follow the rules Rock Band's charters keep when they cut an Expert drum part down: Hard
drops the sixteenths but keeps the eighths; Medium keeps the quarter-note grid and nothing an
eighth apart or closer; Easy is kick and snare on the beat (or the hands alone). In SELAH:

| Rank | At once | Closest two strokes | Thumbs must have to spare | Strokes a second (Psalms 1, 3, 150) |
|---|---|---|---|---|
| **Feria** | one | a quarter note, never under 0.3 s | 0.15 s | 1.2–1.8 |
| **Memoria** | one | an eighth, never under 0.2 s | 0.08 s | 1.9–2.4 |
| **Festum** | two: the kick with a hand; the hat or ride only alone | an eighth, never under 0.15 s | 0.04 s | 3.5–4.3 |
| **Sollemnitas** | two | a sixteenth, never under 0.1 s | 0.02 s | 6.0–6.5 |

When two strokes are too close, the lighter goes: the one that enters at the higher rank, on the
weaker beat (the downbeat is strongest), and the lesser drum (crash, snare, toms, kick, hat last).

**Two thumbs** (`hands.js`). Then every chart is played through by a model of a person holding the
phone sideways, as most people play rhythm games on a phone, and searched for the best way to share
the strokes between the thumbs. Its limits come from what is known of how fast people tap, point and
keep time:

- two touches at once, at most;
- one thumb taps in one place no faster than 6 times a second (the fastest finger tapping measured in
  ordinary adults is about 6 to 7 a second; thumbs on glass are slower);
- one thumb moving from one place to another takes a + b·log2(d/w + 1) seconds (Fitts's law; set so
  that a short hop takes about 0.18 s, and the whole line about 0.36 s);
- nothing faster than 10 strokes a second, both thumbs together (Repp's synchronization threshold:
  faster than one in 100 to 120 ms, people can no longer keep time with a beat);
- the thumbs do not cross; the kick is struck wherever a thumb already is.

Anything the thumbs cannot reach with the rank's time to spare is left out of the chart.
`node selah/tools/playtest.js` checks every chart against the model and the rank's rules, and prints
how dense each one is; it fails if any chart asks for what two thumbs cannot do. Before the change to
taps only, the model found that Festum and Sollemnitas asked for the impossible 17 to 149 times a
chart: three touches at once (a held hi-hat, a snare and a kick), and doubled kicks a sixteenth apart
with the other thumb busy.

**The words ride the strokes.** Each line of the psalm takes two bars of a verse section. Its words are cut into phrases (the little words go with the word after them, so a little word never stands alone) and the phrases are laid on the line's strokes of the snare, toms and cymbals (never the kick or the hat), spread across its two bars: fewer, longer phrases at the lower ranks. A box shows a short phrase whole ("O Lord", "of the just"), or else the phrase's key word: its divine name if it has one, else its longest word. So at Feria the boxes of Psalm 1 read BLESSED, UNGODLY, STOOD, SINNERS, PESTILENCE. Strokes with no phrase are empty boxes, still played. A divine name is set a little larger. In the instrumental sections (the intro, the drops) the words are the psalm's Latin, from the Vulgate, a word to each stroke but the kick and the hats. The verse under the line lights each whole phrase as its stroke is struck. A touch anywhere in a box strikes it.

**Selah** keeps its meaning and its judging (below): at the Hebrew's selahs the band falls away for two bars to a held chord and a heartbeat, and the player touches nothing.

*The older note language follows, for its rules about the words. (Its Hold, Flick and Drag are set
aside by decision 13; where the plan below still names them, read a Hold as a roll, a Flick as a
crash, and a Drag as a run of hats.)*

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

**Judging a Selah** *(proposed)*. As the Voice stills, lift every finger (a grace of 100 ms), then touch nothing until the window closes: one bar, or two at slow tempos. Kept, it counts as a Perfect and the band comes back in on the drop. Broken, it counts as a Miss, the combo breaks, and the drop comes in thin. A Hold that would run into a Selah ends before it. Selah appears from the easiest rank up: it is the game's signature, and the easiest note to explain. Do nothing.

**Triplets** *(proposed)*. A verse of three lines splits the Voice in three.

## The Voice: how it moves *(proposed, then set aside by the author: the Voice is one straight line)*

The Voice moves because the words move. Most of its motion comes from the text
itself. The compiler finds these by meaning lists that cover old and modern
English alike (arise / rise up, thou / you), so they work for any pack.

| What the text does | What the Voice does |
|---|---|
| A couplet; a triplet | Splits in two; in three |
| "Arise" ("Let God arise", Ps 67; "Arise, O Lord", Ps 3, 7, 9) | Rises from the floor of the screen |
| "Turn" / "Convert us" | Turns half round |
| "How long?" | Slows: the notes crawl in, though the beat does not |
| "Turn away thy face" / "hide not thy face" | Goes dark for the line; play it by ear |
| The pit, the deep, "out of the depths" | Sinks toward the bottom edge |
| A list (of enemies, of creatures, of instruments) | Multiplies, one Voice for each, up to the rank's limit |
| A refrain | Plays the same pattern every time, a little faster |

Beyond these, many psalms have their own set pieces (see Set pieces).

## Music: techno-funk, a new genre for each kind of psalm

**As the author asked after the first build: more percussive, more varied, more progressive.**
Each song is a form, not a loop: an intro, verse sections, a build with a snare roll, a drop,
more verses in another meter, a breakdown, the last verses, a second build and drop, an outro.
Odd meters give the drums something to say: 7/8 (grouped 2 + 2 + 3), 6/8, 5/4. The drops reach
into bass music (dubstep's wobble and growl basses, half time, lasers, chopped voices; breakbeat;
a jungle break with its ghost strokes). And each section has its own lead instrument, so no two
sound alike: electric piano, bell, clavinet, flute, supersaw, organ, bowed strings, brass,
melodica, kalimba, marimba, choir, harp. The first three:

- **Psalm 1, "Two Ways"** (124): progressive house. The just in 4/4 deep house; the wicked in 7/8
  progressive funk (clavinet and slap bass stumbling); breakbeat drops with chopped voices; tech
  house with organ and strings for the tree by the waters; the last drop limps into seven and the
  song ends on D minor alone.
- **Psalm 3, "Shield"** (140): dub into dubstep. A half-time dub-techno lament; dubstep drops whose
  wobble moves from eighths to sixteenths to triplets; the second verses in 6/8 with choir and
  kalimba; after "Arise", lifted harmony, brass and a heavy riddim; three Selahs; C major at the end.
- **Psalm 150, "Every Spirit"** (128): gospel house into breakbeat. Claps, octave bass, house piano;
  a jungle break with horns; the verses of timbrel and choir in 5/4 Afro house (congas, marimba);
  every instrument the psalm names joins the band as it is named.

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
- **150 songs is a lot** *(proposed)*. Luminaries has 38, each written by hand.
  Build a kit for each genre in the palette below (its drums, bass, chords and
  arrangement), then make most psalms' songs from a kit plus the psalm's own key,
  tempo and hook. Write the set-piece psalms by hand, perhaps thirty of them.

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

### Hooks from the Church's own music *(proposed)*

As Luminaries sets the Doctors' own chants over its grooves, SELAH takes its
hooks from music written for these very psalms. All of it is centuries out of
copyright, and it is played as notes on the synth, never as recordings.

- **The psalm tones.** Each song's mode is the mode of a Gregorian psalm tone,
  and the tone's reciting note and cadence make the hook. Psalm 113, *In exitu
  Israel*, takes the *tonus peregrinus*, the "wandering tone" with a different
  reciting note in each half: its song changes key at every half-verse.
- **Allegri's *Miserere*** for Psalm 50, its high line floating over slow neo-soul.
- **Palestrina's *Sicut cervus*** for Psalm 41, and his *Super flumina Babylonis*
  for Psalm 136.
- **Monteverdi's Vespers of 1610** for its five psalms: *Dixit Dominus* (109),
  *Laudate pueri* (112), *Laetatus sum* (121), *Nisi Dominus* (126), *Lauda
  Jerusalem* (147).
- **Mozart's *Laudate Dominum*** (from the *Vesperae solennes de confessore*)
  for Psalm 116.

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
  breakdown, with the verse you played set in the serif. *(Proposed:)* a thin
  early/late bar under it showing where your hits fell, which also tells you
  whether to change the audio offset.
- **Settings** *(proposed)*. Voice (Douay, import a pack, remove a pack); audio
  offset with a tap-along calibration; note speed; note size; background
  dimming; No flashing; Reduced motion; music, effects and hit-sound volumes.
- **Phones, held sideways** *(proposed)*. Like Phigros, SELAH plays in landscape.
  Lock to landscape where the phone allows and ask to be turned where it does not,
  as Fear Not does. Up to four fingers at once; no scrolling, zooming or
  text-selection on the play field.

## Art: the club-cathedral *(proposed)*

Locked: black void, gold, bone, one mood color, neon geometry. Not stained
glass, doves, clipart crosses or worship-app gradients.

- **The cathedral is drawn in light, the way a club rig draws it.** The ribs of a
  vault are laser beams fanning from a point overhead; the columns are LED bars
  that pulse with the kick; the nave is haze with light cutting through it. Never
  a picture of a church: the church is only implied by geometry.
- **One mood color for each psalm**, over the gold and bone, drawn from its
  book's color family (see The Five Books). Laments and the pit go cold, nearly
  grey; praise goes warm.
- **The notes are the words themselves**, set in the heavy sans inside boxes glowing in
  their drum's color; a stroke with no word is an empty box. *(As built: every
  note is a tap.)* A Perfect breaks the word into gold squares that rise and
  fade, as Phigros breaks its notes.
- **The played words stay a moment.** After a verse, the words you hit hang above
  the Voice in bone white, so the verse can be read whole as it passes. The Word
  is the note, and also the thing you read.
- **Safety.** A club look flashes. By default nothing flashes more than three times
  a second (the limit in the web's accessibility guidelines for seizures). "No
  flashing" removes flashes altogether. "Reduced motion" keeps the Voice's moves,
  since they are the game, but stops camera shake and background motion. The note
  types differ in shape as well as color, for color-blind players.

## Charts, ranks and score *(proposed)*

### Four ranks, named for the ranks of the liturgical day

*(As changed by the author: the ranks add the drum part, as in Rock Band.)*

| Rank | What you play |
|---|---|
| **Feria** | Kick and snare, on the beat; a crash now and then; Selah |
| **Memoria** | And the syncopated kicks, the simple fills, the rolls into the drops |
| **Festum** | And the hi-hat and ride, the toms, eighth-note fills; two strokes at once |
| **Sollemnitas** | Every stroke: sixteenths, ghost strokes, whole fills |

Every note is a tap; the rules of each rank and the two-thumb check are in How hard, above.

A hidden fifth rank, **Vigilia**, comes on a dozen of the great set-piece
psalms. A Full Combo on Sollemnitas opens it.

### Score and grades

As in Phigros, a chart is worth 1,000,000: 900,000 for accuracy (a Perfect counts
1, a Good 0.65, a Bad or a Miss 0) and 100,000 for the longest combo. Grades:
**AMEN** for all Perfect; then S+ from 960,000, S from 920,000, A from 880,000,
B from 820,000, C from 700,000, and F below that. A Full Combo puts a gold ring
round the grade. Records are kept for each Voice separately, since a Grail
chart is not the same chart as the Douay one.

### The chart compiler

*(As built after the author's change: the chart comes from the drum part, and the words ride it.
See "The drums" above. The steps below were the first build's, from the rhythm of speech.)*

Every chart is made from the text by the compiler, then shaped by hand. It must
work as well on a pack as on the Douay, because charts regenerate from the
active text.

1. **Lines.** Each verse's lines are the pack's own; for the Douay, the verse is
   cut at its colons and semicolons, as Psalter Runner sets it.
2. **Sort the words.** Glue words (the, and, of, unto, thee...) become Drags, or
   nothing at the low ranks. Divine names become accent Holds or Taps on a strong
   beat. Questions and imprecations become Flicks. "For ever", "mercy",
   "Alleluia" and long vowels become Holds. All other content words become Taps.
3. **Speech rhythm.** Count syllables (a vowel-group rule with a list of
   exceptions) and set each content word's stressed syllable on the song's grid
   where speech would put it: a line to a bar, or two, by its length and the tempo.
4. **Rank.** Thin the chart or thicken it for the rank.
5. **Selahs.** Put them in from the table, or from the pack's own marks, each
   with the drop that follows it.
6. **Direction.** Apply the psalm's direction file: its set pieces, keyed to
   verse numbers and to the role of a word (the verse's strongest word, its
   divine name, its question), never to an exact Douay word. That way they work
   in any text.
7. **Always the same.** The same text, song and rank always make the same chart:
   any chance choices come from a seed made of the psalm number.

**Long psalms chart the spine.** The compiler keeps the first and last verses,
the refrains, the Selahs and the set-piece verses, and enough others between to
fill 90 to 180 seconds. The verses it does not chart still pass across the
screen, dimmer, on the Voice's tide, so the whole psalm is still there to be
read. **Short psalms loop:** Psalm 116, two verses, plays four times, each time
with the band a step higher and the chart denser.

## The campaign *(proposed)*

### Title

The black void, SELAH in thin, wide capitals, and one gold Voice breathing
slowly across the screen. Tap anywhere: the Voice catches a beat and the title
song begins. (Phones only allow sound after a touch; Luminaries does the same.)

### The Five Books

The Psalter is five books, and each ends with a doxology. An old Jewish
tradition (the Midrash on Psalms, on Psalm 1) sets them beside the five books of
Moses: Moses gave Israel the five books of the Law, and David gave them the five
books of the Psalms. SELAH builds a world for each book on that pattern, and the
fit is closer than you might expect.

| Book | Psalms | World | Color family | Ends with |
|---|---|---|---|---|
| I · Genesis | 1–40 | The firmament: a grid of stars, the Voice as the horizon, light divided from darkness | Dawn gold, amber | 40: "Blessed be the Lord the God of Israel from eternity to eternity. So be it. So be it." |
| II · Exodus | 41–71 | The sea and the pillar: a column of fire, walls of water drawn in lines | Ember red | 71, closing "The praises of David, the son of Jesse, are ended." |
| III · Leviticus | 72–88 | The sanctuary: squares nested inward, veils of scanlines. The darkest book: 72 goes "into the sanctuary of God"; it ends with the pit (87) and the fallen house of David (88) | Violet | 88: "Blessed be the Lord for evermore. So be it. So be it." |
| IV · Numbers | 89–105 | The wilderness: dunes as sine waves, a tent, cold stars. It opens with the only prayer of Moses in the Psalter (89) | Night cyan | 105: "...and let all the people say: So be it, so be it." |
| V · Deuteronomy | 106–150 | The city: Jerusalem rising in laser verticals, climbed by the pilgrims in the Songs of Ascents. It holds the great psalm of the Law, 118 | White gold, then every color | 150, the doxology of the whole Psalter |

Book I is open from the start. Every psalm of an open book can be played in any
order. A book's last psalm opens when two-thirds of the book is cleared, and
clearing it opens the next book.

**The doxology finale.** At the end of a book's last psalm its doxology is the
finale: every Voice on screen at once, the full band, and the two "So be it"s as
two great Holds, the people's Amen. Book V has no separate doxology, because
Psalm 150 is the doxology of the whole Psalter.

### The Book of Letters

Psalm 118, as its own chapter, opening with Book V. See below.

### The Week (*per septimanae circulum*)

St. Benedict lays out the whole Psalter over one week (RB 8–18). He says that
monks who sing less than the whole Psalter in a week show themselves too lazy
in their service, since the holy Fathers did it all in a single day; may we,
lukewarm as we are, at least do it in a week (RB 18). The Week plays the
psalms as the Rule sets them.

- **Each Hour is a setlist.** Its psalms play back to back as one DJ set,
  beat-matched, with no menus between: Vigils, Lauds, Prime, Terce, Sext, None,
  Vespers, Compline.
- **The Hour now.** The game reads the clock and offers the Hour it is. At night,
  Compline: Psalms 4, 90 and 133.
- **The seal.** Finish every Hour of all seven days, in any order and at any rank,
  for the seal *Per septimanae circulum*.
- ***Uno die.*** Play all 150 between one midnight and the next, as the Fathers
  did. A seal, and one quiet line from RB 18 when it is done.

The full table is built from the Latin of RB 8–18 (public domain) and checked
by the author before it ships. In outline: Sunday Vigils always begins with
Psalm 20; Psalm 118 fills the little Hours of Sunday and Monday; Prime runs
from Psalm 1 to 19 through the week; the little Hours from Tuesday on take
119–127; Vespers takes 109–147 except the psalms set aside for other Hours;
Compline is 4, 90 and 133 every day.

### The Psalterium

The progress screen is the whole Psalter at a glance: 150 cells in a grid of 10
by 15. Each is lit in its psalm's mood color once cleared, and gold once All
Perfect. Tap a cell to play it.

### The Schola (learning to play)

Five short lessons, each on a real psalm, then calibration.

1. **Kick and snare.** Psalm 116, the shortest: "O Praise the Lord, all ye nations:
   praise him, all ye people", on the beat.
2. **The roll.** Its second verse, "For his mercy is confirmed upon us: and the truth
   of the Lord remaineth for ever", quickening into a drop.
3. **Fills.** Psalm 1: the toms at the end of each phrase, and the 7/8 of the wicked.
4. **Cymbals.** Psalm 2, the potter's vessel: the crashes.
5. **Hi-hat and Selah.** Psalm 3: the hats, two thumbs at once, and its three Selahs.
6. **Calibrate.** Tap along with a click to set the audio offset.

### Free play

Any psalm that is open, at any rank, sorted by number, by kind (the music
table), by mood color, by tempo or by length.

### Glosses (optional)

After a psalm, one line from the Fathers or the Rule about it, from a
public-domain translation or newly translated from the Latin, as Luminaries
does with the Doctors. It sits under the grade on the results screen; tap to
hide it. After Psalm 136, for example, the Rule's own reading of its last verse:
blessed is the one who takes the devil's suggestions while they are still young
and dashes them against Christ (RB Prologue 28). The psalm itself is never
changed or softened; the gloss only stands beside it.

## Psalm 118: the Book of Letters *(proposed)*

Psalm 118 (Hebrew 119) has 176 verses in 22 stanzas of 8, one for each letter of
the Hebrew alphabet. In the Hebrew, every verse of a stanza begins with that
stanza's letter. The Douay prints the letters' names over the stanzas (Aleph,
Beth, Ghimel, Daleth, He, Vau, Zain, Heth, Teth, Jod, Caph, Lamed, Mem, Nun,
Samech, Ain, Phe, Sade, Coph, Res, Sin, Tau; check each spelling against the
printed Douay).

### 22 letter-songs

Each stanza is its own chart, 60 to 90 seconds long, with its own song.

- **The letter over the line.** *(The Voice stays one straight line, as the author
  decided; the letter is drawn in neon behind it, and the drums take its shape.)*
  Each song's judgment line is drawn in neon from
  the strokes of its Hebrew letter. Vau (ו) is a single upright stroke, so its
  Voice stands upright and the notes come in from the sides. Daleth (ד) is a
  corner: two Voices at a right angle. Sin (ש) has three arms: three Voices. Tau
  (ת), the last letter, closes like a gate.
- **Eight verses, eight letters.** The first word of every verse is an accent
  note marked with the letter, because in the Hebrew every verse begins with it.
  Hit all eight and the letter lights up whole at the end of the song. Light all
  22 and you have the alphabet from Aleph to Tau.
- **The words for the Law.** Nearly every verse names the Law in one of several
  words (in the Douay chiefly law, testimonies, ways, commandments,
  justifications, judgments and word). Each of these words has its own bell in
  the band, tuned to the song's key, and its own small mark on the note. Catch
  every one in a stanza for a seal on that letter.
- **Music.** One tempo spine for the whole psalm, and each letter takes a genre
  from the palette, so the 22 sound like one long set.

### Set pieces from the text

- **Heth, verse 62:** "I rose at midnight to give praise to thee; for the
  judgments of thy justification." The screen goes to night, and twelve strokes
  of a bell are twelve Taps.
- **Nun, verse 105:** "Thy word is a lamp to my feet, and a light to my paths."
  The screen goes dark but for a small circle of lamplight round the Voice; the
  notes can be seen only once they come into it.
- **Sin, verse 164:** "Seven times a day I have given praise to thee, for the
  judgments of thy justice." Seven Voices flash in turn: seven Flicks. (St.
  Benedict founds the seven Hours of the day on this verse, and the night
  Office on verse 62: RB 16.)
- **Tau, verse 176:** "I have gone astray like a sheep that is lost: seek thy
  servant, because I have not forgotten thy commandments." The Voice wanders off
  its path and the player follows it with one long Drag. The psalm ends asking,
  so the song ends asking, on a suspended chord that does not resolve.

### The marathon

All 22 letters as one continuous set: 176 verses, about half an hour, with no
menus. It is divided as the Rule divides the psalm (RB 18), which gives seven
movements. Seven times a day.

| Movement | Letters | Verses |
|---|---|---|
| Sunday, Prime | Aleph, Beth, Ghimel, Daleth | 1–32 |
| Sunday, Terce | He, Vau, Zain | 33–56 |
| Sunday, Sext | Heth, Teth, Jod | 57–80 |
| Sunday, None | Caph, Lamed, Mem | 81–104 |
| Monday, Terce | Nun, Samech, Ain | 105–128 |
| Monday, Sext | Phe, Sade, Coph | 129–152 |
| Monday, None | Res, Sin, Tau | 153–176 |

Between movements comes a Selah of one bar, and the tempo spine steps up. The
game saves at each movement, so the marathon can be played in sittings, as the
Hours are. A Full Combo of the whole marathon is the hardest thing in SELAH.

## Set pieces *(proposed)*

*(Since the author's change, a set piece that moved the Voice is done in the drums and the music
instead, on the one still line: Psalm 2's potter's vessel is a crash; Psalm 18's giant running his
course is a tom run across the kit; Psalm 87's sinking is the drum part thinning to a heartbeat.)*

Signature moments, each taken from the text. They are written into the psalms'
direction files and keyed to verses, so they also play in a pack's text.

- **1.** The two ways. The Voice splits, and at "the way of the wicked shall
  perish" the right-hand Voice goes out.
- **2.** "Thou shalt rule them with a rod of iron, and shalt break them in pieces
  like a potter's vessel": a Flick that shatters the word into shards.
- **3.** Three Selahs. "I have slept and taken my rest: and I have risen up": the
  Voice sinks to the floor and rises.
- **12.** "How long, O Lord, wilt thou forget me unto the end? how long dost thou
  turn away thy face from me?" Each "How long" slows the notes further; then the
  psalm turns to trust, and the song comes back up to tempo.
- **18.** "Hath rejoiced as a giant to run the way": the Voice runs across the
  sky in an arc, like the sun.
- **21.** "O God my God, look upon me: why hast thou forsaken me?" opens on a
  Flick into near silence. The song is dub until "I will declare thy name to my
  brethren: in the midst of the church will I praise thee", where it turns to
  gospel and stays there.
- **23.** "Lift up your gates, O ye princes": two Voices swing open like doors,
  and on "the King of Glory shall enter in" every note comes through the gap.
  Twice, as in the psalm.
- **41–42.** "Deep calleth on deep, at the noise of thy flood-gates": two Voices,
  top and bottom, calling and answering. The refrain "why art thou sad, O my
  soul?" plays the same pattern each time it comes back, faster.
- **50.** The *Miserere*, with Allegri's high line over slow neo-soul. "Wash me
  yet more from my iniquity": Holds that grow longer each time.
- **67.** "Let God arise, and let his enemies be scattered": the Voice rises from
  the floor, and on "scattered" the notes burst outward in every direction.
- **87.** The pit. "I am counted among them that go down to the pit." The screen
  narrows and the Voice sinks lower with every verse. The last line, "Friend and
  neighbour thou hast put far from me: and my acquaintance, because of misery",
  plays over a band almost gone. The results screen is silent: no fanfare after
  Psalm 87.
- **89.** "For a thousand years in thy sight are as yesterday, which is past":
  the notes slow to a quarter speed for the line, the music winds down like a
  stopped tape, then everything snaps back.
- **90.** Compline's psalm. "Thou shalt walk upon the asp and the basilisk: and
  thou shalt trample under foot the lion and the dragon": four downward Flicks,
  four stamps.
- **113.** *In exitu Israel* on the *tonus peregrinus*. "The sea saw and fled:
  Jordan was turned back": the notes reverse direction. "The mountains skipped
  like rams, and the hills like the lambs of the flock": the Voice hops on the
  beat.
- **116.** The shortest psalm, looped four times, rising. The first lesson.
- **135.** The litany: 27 verses, and every one ends "for his mercy endureth for
  ever". Every one of those endings is a Hold. The calls change; the answer never
  does.
- **136.** "On the willows in the midst thereof we hung up our instruments": the
  band stops one instrument at a time, until "How shall we sing the song of the
  Lord in a strange land?" is a Flick over silence. The ending turns to acid.
  "Blessed be he that shall take and dash thy little ones against the rock" is
  played as written.
- **148.** Creation's choir: each thing called to praise ("ye dragons, and all
  ye deeps"; "Fire, hail, snow, ice, stormy winds"; "Kings of the earth and all
  people") adds a Voice, until the screen is full.
- **150.** The end of the Psalter. Each instrument joins the band as it is named:
  trumpet; psaltery and harp; timbrel and choir; strings and organs; cymbals;
  cymbals of joy. On "let every spirit praise the Lord", every Voice from the
  whole game appears at once.

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

### The pack file in full *(proposed)*

Version 1 is the shape above, plus a few optional fields. `pack.js` checks it
(`SelahPack.validate`), and `packs/template.selah-pack.v1.json` shows every
field with placeholder words.

**At the top:**

| Field | Needed | What it is |
|---|---|---|
| `selahPack` | yes | `1` |
| `id` | yes | Lower-case letters, digits and hyphens, at most 32. `douay` is kept for the built-in text. Importing a pack with the same id as one already on the device replaces it |
| `displayName` | yes | 1 to 24 characters. The HUD shows "Voice: " and this |
| `name` | no | The full name, up to 80 characters ("The Grail Psalms") |
| `numbering` | yes | `"hebrew"` or `"vulgate"`: how the pack numbers its psalms |
| `titlesCounted` | no | `true` if the psalms' headings count as verses (as in the Douay and the Hebrew Bible), `false` if not (as in most modern English psalters). If it is left out, `true` for vulgate, `false` for hebrew |
| `license` | yes | A short note, 1 to 80 characters. For a psalter under copyright: `user-supplied-do-not-redistribute` |
| `language` | no | A tag such as `"en"` |
| `psalms` | yes | 1 to 150 psalms. A pack may hold only some; the rest are played from the Douay |

**Each psalm:** `n`, its number in the pack's numbering (1 to 150, each once);
`incipit` (optional), its Latin opening words, up to 120 characters; and `verses`,
listed in the order the psalter prints them.

**Each verse:**

| Field | Needed | What it is |
|---|---|---|
| `v` | yes | The verse number as this psalter prints it, each number once in a psalm. The numbers need not rise: a psalter may move a verse (the Grail moves one in Psalm 101 and one in Psalm 106) |
| `lines` | yes | 1 to 12 lines, each at most 400 characters. Two lines are a couplet and split the Voice; three are a triplet; the compiler groups longer verses |
| `title` | no | `true`: this verse is the psalm's heading. It is shown on the title card and not played |
| `pause` | no | `true`: a Pause or Selah after this verse. If a psalm has any `pause` marks, they replace the selah table for that psalm |
| `stanzaEnd` | no | `true`: a stanza ends here. This is not a Selah; it is a breath of half a bar, with the band thinning for a moment |
| `douay` | no | The Douay verse this one answers to, where its number differs. The game uses it to place Selahs and set pieces |
| `heading` | no | A heading shown before this verse, up to 80 characters: one of Psalm 118's letters, a stanza mark |
| `sectionStart` | no | `true`: a second psalm joined into this one begins here (Hebrew 10 within Douay 9, Hebrew 115 within Douay 113) |

**Numbering.** The game keeps the Douay's (Vulgate) numbers. A pack numbered
from the Hebrew is mapped like this (`SelahPack.toVulgate`, checked against
Psalter Runner's labels for all 150 psalms):

| Hebrew | Douay |
|---|---|
| 1–8 | 1–8 |
| 9 and 10 | 9 (one psalm) |
| 11–113 | one lower (10–112) |
| 114 and 115 | 113 (one psalm) |
| 116 | 114 (verses 1–9) and 115 (verses 10–19) |
| 117–146 | one lower (116–145) |
| 147 | 146 (verses 1–11) and 147 (verses 12–20) |
| 148–150 | 148–150 |

The selah table and the set pieces are keyed to the Douay's verses. For a pack,
the game uses each verse's `douay` number where it has one; otherwise it maps
verses by number, allowing for `titlesCounted`, and where a psalm's verse count
still differs from the Douay's, by position.

**Checking.** A pack is refused if it is over 4 MB, is not JSON, has the wrong
version or a bad id, lacks a required field, has a psalm twice, has verse
number twice in one psalm, or has an empty line, an over-long line or control
characters. Some problems are only warnings, and that psalm is then played from
the Douay: a missing psalm, a Psalm 118 (Hebrew 119) without 176 verses (the
Book of Letters needs 22 times 8), or a field version 1 does not know. The
checker never prints, logs or sends the text.

**One file for SELAH and Lumina.** Lumina (`munkachy/lumina`) reads the same
file: the author's Grail file, numbered after the Vulgate with every verse's
`douay` number, Psalm 118's letters as `heading`s and the Latin incipits, works
in both, imported once on each device. Lumina's `tools/grail-pack.js` makes it
from a private copy. The Grail has been taken out of Lumina's repository for the
same reason it never goes into this one.

**On the device.** The pack is read through the file picker, checked, and kept
in IndexedDB under its id. It never leaves the device: no upload, no analytics
of its contents, nothing cached on a server. Pack text is drawn on the canvas or
set as plain text, never as HTML, because it is someone else's file. The share
card from the results screen shows the psalm number, grade and score, never pack
text. Removing a pack deletes its text; its scores, which hold no text, stay.

**Keeping it out of the repo.** The repo's `.gitignore` refuses `*grail*.json`,
`*Grail*.json`, `*.private.json` and `selah/local/`. Tests use the Douay, or
packs of placeholder words made up by the test itself: never a copyrighted text,
not even one line to search for.

## Files *(proposed)*

Like every game here: plain HTML and JavaScript, no build step, in its own
folder.

| File | What it holds |
|---|---|
| `selah/index.html` | The page, the canvas and the interface |
| `selah/audio.js` | The Luminaries engine, copied whole, with SELAH's own instruments |
| `selah/songs1.js` … `songs5.js` | The genre kits and the songs, one file for each Book |
| `selah/douay.js` | The Douay in Vulgate numbering, headings marked |
| `selah/selahs.js` | Where the selahs fall (verse numbers only) |
| `selah/compiler.js` | Text and song into chart |
| `selah/direction1.js` … `direction5.js` | The set pieces, one file for each Book |
| `selah/letters.js` | The Book of Letters: the 22 letter shapes and the marathon |
| `selah/week.js` | The Week: the Benedictine distribution (RB 8–18) |
| `selah/game.js` | Play: touch, judging, the Voice, drawing |
| `selah/ui.js` | Title, books, Psalterium, settings, results |
| `selah/pack.js` | The pack checker and the numbering map (**exists**) |
| `selah/packs/template.selah-pack.v1.json` | The empty template (**exists**) |
| `selah/packs/douay.selah-pack.v1.json` | The Douay export, made from `douay.js` |

## Milestones *(proposed)*

1. **Three real charts with sound**, playable on a phone: Psalm 1 (deep house;
   the two ways), Psalm 3 (dub techno; three Selahs) and Psalm 150 (gospel house;
   the instruments come in one by one). Judging, score, results, calibration.
   This is decision 7's first milestone; the choice of psalms is proposed.
2. **The campaign shell:** title, the Five Books, the Psalterium, settings,
   saving, the Schola.
3. **The Voice setting:** import, check, store, regenerate and remove a pack; the
   Douay export and the template shipped.
4. **Book I whole** (40 charts), with the compiler and the genre kits grown on it.
5. **Books II to V and the Book of Letters.**
6. **The Week, *Uno die*, the Vigilia charts and the glosses.**

## Open questions for the author

1. **The Week.** Should it follow the Rule exactly as written (RB 18), or your
   house's own distribution? Many monasteries now spread the Psalter over two
   weeks. This plan uses the Rule as written; the table is only data, so another
   arrangement could be added as a second choice.
2. **A Latin Voice?** The Clementine Vulgate is in the public domain, and Latin
   stress is regular (on the second-to-last syllable, or the third-to-last),
   which would make it the easiest text of all to chart well. A third built-in
   Voice, "Vulgata", would let you play the psalms as they are chanted.
3. **Glosses** on by default, or off?

## Notes for the builder (from this repo)

- **House rules.** Like every game here: plain HTML and JavaScript, no build
  step, in its own folder (`selah/`), made for phones. The site is served from
  the `gh-pages` branch.
- **The Douay text is already here.** `psalter-runner/index.html` holds all 150
  psalms of the Challoner Douay-Rheims, checked verse by verse, as the
  `PSALTER` array. It is in Hebrew order with the Vulgate number beside each
  psalm (it labels the joined and split psalms `9A`, `9B`, `113A`, `113B`,
  `114–115` and `146–147`), and it leaves out the psalm headings. Re-key it to
  Vulgate numbering for SELAH, following the Douay where the two numberings
  split or join psalms (the table above), and put the headings back as `title`
  verses where the Douay counts them.
- **Selah verse numbers need mapping.** Most selah tables use English verse
  numbers, which do not count a psalm's heading; the Douay often counts the
  heading as verse 1 (as the Hebrew does), and the Vulgate splits and joins
  some psalms. So the same line can carry a different number. Map the table to
  Douay verses psalm by psalm and check each one against the text by hand.
