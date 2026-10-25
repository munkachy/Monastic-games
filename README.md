# Monastic Games

*Ora et labora et lude.* Small browser games with a monastic theme. Each one
is plain HTML and JavaScript with no build step, and most are made for phones.

**Play them all at [munkachy.github.io/Monastic-games](https://munkachy.github.io/Monastic-games/)**

## Games

| Game | What it is |
| --- | --- |
| [Benedictine Bricks](https://munkachy.github.io/Monastic-games/benedictine-bricks/) | A physics tower builder in the style of 99 Bricks Wizard Academy, set at seven real Benedictine monasteries, with Gregorian chant for each Hour of the Office |
| [Psalter Runner](https://munkachy.github.io/Monastic-games/psalter-runner/) | A 16-bit auto-runner through all 150 psalms, with ten saints to play and the Douay-Rheims text scrolling behind the run |
| [SaintStyle Turbo](https://munkachy.github.io/Monastic-games/saintstyle-turbo/) | A trick racer: the saints race the seven deadly sins through the seven mansions of St. Teresa's *Interior Castle*, with combos, surges and funk music |
| [Canticle Mansion](https://munkachy.github.io/Monastic-games/canticle-mansion/) | A Benedictine monk explores, climbs and builds through a mansion made of the Canticle of Canticles, finding every verse |
| [Luminaries](https://munkachy.github.io/Monastic-games/luminaries/) | A falling-block music puzzle in the spirit of Lumines through all 38 Doctors of the Church, each with a world, a song, a gift and their own words |
| [Catholic Truth Squad: Tactics](https://munkachy.github.io/Monastic-games/new-apologetics/play.html) | Assemble a squad, level up, light up the world: a team battler starring today's Catholic apologists (still under review; [about it](https://munkachy.github.io/Monastic-games/new-apologetics/)) |
| [Fear Not](https://munkachy.github.io/Monastic-games/fear-not/) | A desert monk rides his guardian angel over a neon-noir city to fight the demons tempting a man in his car. The first night is playable as a first build ([design notes](https://munkachy.github.io/Monastic-games/fear-not/design.html)) |
| [SELAH](https://munkachy.github.io/Monastic-games/selah/) | A rhythm game where you play the drums and every word of the Psalms rides the strokes, to techno-funk, drum and bass, dubstep, Afro house and odd meters. Eight psalms so far, Compline among them ([the plan](selah/PLAN.md)) |
| [While You Have the Light](https://munkachy.github.io/Monastic-games/while-you-have-the-light/) | A hooded monk with a torch fights the seven deadly sins in a black, angular world of crags and floating rock. In the torchlight the demons show their true colours and he fights hand to hand in flowing combos; in the dark he has only holy water. A first build: the arena ([design notes](https://munkachy.github.io/Monastic-games/while-you-have-the-light/design.html)) |
| [The Seven Lampstands](https://munkachy.github.io/Monastic-games/seven-lampstands/design.html) | Not built yet: the [design notes](https://munkachy.github.io/Monastic-games/seven-lampstands/design.html). You are the unseen angel of a church, building it from a cross in the wilderness to a consecrated church, in the manner of Kingdom Two Crowns, one island for each of the seven churches of the Apocalypse, while the seven capital sins come by night to lead its people away. |

## Benedictine Bricks

- Stack stones into an abbey tower with real physics ([planck.js](https://github.com/piqnt/planck.js), a port of Box2D).
- The demon comes as one of the seven deadly sins and drops fire on the tower. Smother it with a stone or tap it to douse it with holy water.
- Build as the saints of the Order, from St. Benedict and St. Scholastica to St. Gregory the Great.
- The music is real Gregorian chant from [GregoBase](https://gregobase.selapa.net/), sung by a choir synthesised in the browser. `node tools/gabc2js.js` rebuilds the chant files.
- All art is drawn in `benedictine-bricks/art.js`; open `art.html` to see every sprite.

## Psalter Runner

- One file with nothing to load. Tap the left half to jump (hold to float), the right half to attack (hold to run faster).
- All 150 psalms, each cut into stages built from its own images: still waters, the cedars of Lebanon, the rivers of Babylon, the Red Sea.
- Five saints to start, and one more for each book of the Psalter finished. Each has their own gift to throw.
- Watch the Blessed Virgin Mary run any psalm perfectly; finish every book to watch Our Lord run with the cross.
- Each stage has its own chiptune song on a Gregorian psalm tone. The text is the Douay-Rheims, checked verse by verse.

## SaintStyle Turbo

- One file with nothing to load. Tap to jump; in the air, tap the arrows for tricks. Landing tricks sets off a surge, the only way to go faster than a run.
- Each demon races by the same rules as you, and in character: Pride overreaches, Sloth dozes off, Envy copies your last trick.
- Beat a demon to win a new saint and learn new tricks. Finish them all and St. Teresa of Ávila joins you.
- Also: Freestyle, racing your Guardian Angel against your own best time, a book of combos, and the Novitiate tutorial.
- Speed starts at SLOW MO, with MEDIUM and TURBO to choose. The funk band builds up as you speed up.

## Canticle Mansion

- Every verse of the Canticle of Canticles (Douay-Rheims) is somewhere in the world: carved over a door, written in the stars, strung on a chain of gold.
- Eight chapters of rooms, from the great mouth of marble to the mountains of spices.
- Bring the lilies home to open pages of St. Bernard and St. John of the Cross on each chapter.
- New powers (sandals, helmet, lantern, gloves, seal, chariots) open hidden places with pomegranates that give extra hearts.
- Easier ways can be turned on at any time from the pause book.

## Luminaries

- Turn and move falling blocks so four of one colour make a square; the line of light sweeps them away in time with the music.
- **The Pilgrimage** goes through all 38 Doctors in the order of their deaths, from St. Irenaeus to St. Thérèse. Each Doctor has their own colours, world, song and gift.
- **Easy, Normal and Hard.** Normal and Hard open once you finish the Pilgrimage. At the end of each, the Doctors speak to you from heaven.
- **Single Stage** plays any Doctor you have reached. **Master** is five fast zones with no gifts.
- **Learn to Play** teaches everything in eight short lessons with St. Francis de Sales.
- On a phone, held sideways: drag sideways to move, tap to turn, drag down to drop gently, flick down to drop at once.
- **You play along.** Every song lends you its own instruments: moving plays the column's note (low at the left, high at the right), drawing a block down plays a run down the scale, and a flick strikes a chord, all in the song's key and on its beat.
- The Doctors' words pass under the field: 376 quotations, each from a public-domain translation (cited in the source files) or newly translated from the Latin. Tap the words for the next one.

## Fear Not

The first build: one night, in six parts, played with the phone sideways (it locks to sideways where the phone allows, and asks to be turned where it does not).

- **Bring Daddy Home.** 2 AM. A radio in the dark, a girl at her window, her father in his car across from a corner store with a gun in his lap, and the whispers.
- **Someone Asked.** The desert monastery. His angel wakes Fr. Lawrence; he protests that he is not Padre Pio, and is answered. His body stays kneeling in the chapel.
- **The Flight.** The city from straight above, as in the first Grand Theft Auto: tall towers lean away as you pass, the camera draws back while the angel is in the air and comes in close when it lands, and below there is traffic and people under umbrellas. The angel leaps from rooftop to rooftop: tap a roof near you (the ones in reach glow gold) and it leaps there, beating its wings hard to climb to a higher roof or gliding down to a lower one. Only so far at a leap: across the city you go building by building. On a keyboard, an arrow leaps to the nearest roof that way and Space leaps toward where you are going. Stop at the church, follow the girl's prayer to her window, then on to her father's car and dive down to the street. Demons roam the roofs all over the city, in twos and threes, thickest wherever the lights are out. Each one smoulders red, with a red ripple now and then, so you see them from far off, and red arrows at the edge of the screen point to the nearest ones out of sight. Land near them and the whole gang comes at Fr. Lawrence on that roof, side on, with the same moves as on the street: one round, as in the Holy Hour, on a city roof in the rain, the hut over the stairs at one end and the lift's machine room at the other (throw a demon into either and it slams off it). The gang is bigger the further on you are, in the darker places, and biggest round his father's car, which is guarded: clear the roofs round it before you can dive down. Beat them and you are back on the roof and the flight goes on; fall, and his angel carries him off, and they are still there to come back for. The first time, if you have never practised, the angel shows you every move first. Those beaten are made up again from the dark, far away.
- **The Street.** The fight, side on, as in Batman: Arkham Asylum, on a long wet street with the camera always on Fr. Lawrence; the demons climb up out of the ground near him, through holes that burn open and close again. First, the first time, the angel shows him every move against shades (the practice; play it again any time from the parts screen or the pause screen, which also lists every move). One rule, the drunken master's: never the same blow twice on the same demon, or he trips over his own feet and loses resolve; the same blow on another demon is a new move. Three falls in a row (trips, or blows taken) drag the whole fight down into the Depths, until ten in a row bring him up. Only three demons come close enough to strike at him at a time; the rest, dimmed, prowl further off and wait their turn (he can still go after them, but they do not strike), and they all keep within his reach, coming up out of the ground only in the middle of the street. On a phone: tap a demon to strike, then go on to the next (he flies in on a flip, a roll, a flying kick, a cartwheel or a prostrate dive); tap open street to zip there; tap a gold sign to counter (he catches the wrist or ankle, throws the demon down and pins it); put two fingers down, or hold on the open street, to block, turned to us in prayer (one blow at a time: then block again; a red sign can only be blocked, and the block throws the grabber off); hold on a demon a moment, then let go, for holy water, near or far; tap twice for a heavy blow; swipe up to launch, down to slam; drag a far demon to throw the rosary, crucifix first, round it and haul it in; drag a near one to throw it into the others. A demon behind a shield can only be met with the rosary (drag it, or R): it snatches the shield away and sends it spinning off, and the rosary again hauls the demon in; strike the shield and it is Fr. Lawrence who is hurt. On a keyboard: arrows move, Space strikes toward the arrow held, X counters, Q (or Z, or Shift) blocks, C is the heavy blow, E launches, V slams, F holy water, R the rosary, T throws, B blesses (in the Heights). Demons knocked down lie on the street a moment: reach one before it rises and finish it (a takedown). The longer the flow, the harder every blow lands and the slower time runs; it all but stops when a sign shows, so there is time to counter and flow on. His angel waits above, out of sight, and takes the 3rd blow of every combo, and the 7th, and every fourth after (a sweep of its wings on every other one): Fr. Lawrence stands aside and the angel darts down and up again, quick even in slow time. Twelve in a row carries the whole fight up to the Heights, and only there can he bless them (the gold cross): then they all come down, his angel comes down on them like a hammer, rings of light run out along the street from where it lands, and every demon is struck flat as they reach it, harder the longer the flow. Let the flow break up there, and they all fall back with nothing done; no blow on him, but the count starts again. The father's guardian angel stays in chains of shadow against the car until the street is clear; then they break.
- **The Choice** and **Vigils.** What the father does; and back to the chapel before the bell.
- **The Holy Hour** (from the title screen). Survival. Fr. Lawrence kneels before the Blessed Sacrament, and his angel asks him what was asked in the garden: could you not watch one hour? Then he is shown the fight that goes on round every hour of prayer, one place to a round: the chapel, the cloister, his cell, the bell tower, the crypt, the desert, and round again. Each round is harder: more of them, sooner, the big grabbers and the shields among them, their blows quicker and heavier, two and then three striking at once. The chapel, the cell and the crypt are rooms: a demon thrown into a wall slams into it and flies back across the room, and one knocked into a wall hits it hard. Between rounds he kneels and the angel gives him a line of Scripture; one fall ends the watch, and your best is kept. `?hour` in the address starts it.
- Everything is drawn in code (`fear-not/art.js`, `fear-not/scenes.js`); the music runs on the synth engine from Luminaries, playing jazz techno in the Detroit style: deep for the city, harder for the fights, building with the combo (`fear-not/audio.js`, `fear-not/music.js`). Progress is saved after each part. `?part=2` in the address starts at a given part.

## SELAH

A first build of the plan in [`selah/PLAN.md`](selah/PLAN.md): eight psalms, Compline among them, played with the phone sideways.

- **You play the drums, and the words ride them.** One straight golden line (the Voice) with the kit along it: hi-hat at the left, snare, toms, crash at the right, and the kick is the whole line, struck anywhere. Every word of the psalm is a note: the words ride the snare, toms and cymbals in phrases, a phrase to a box, and where a rank has too few strokes for a line, the line is given more bars, so the easier ranks run a little longer. The intros and drops carry no words, and there is no Latin anywhere: only the psalm's own text.
- **Lectio.** Some words are said again, as a chorus does or as lectio divina dwells on a phrase: "I will sleep, and I will rest" three times, the band falling asleep a little more each time; "in pieces, in pieces, in pieces"; the shortest psalms sung whole two or three times. The verse under the line shows the words said again in gold.
- **Every note is a tap.** Every drum but the kick is a box glowing in its drum's color, with a word of the psalm inside or empty; the kick is only a bar across the line.
- **Four ranks**, named for the ranks of the liturgical day. Feria: kick and snare on the beat, a cymbal now and then. Memoria: the syncopated kicks and the fills, as Rock Band's Medium. Festum: a notch harder, the toms and fills, still one at a time (in every bar, Memoria's strokes and at most one more). Sollemnitas: a notch harder again (at most two more, and the kick with a hand on the first beat of a bar). The band always plays the whole drum part.
- **Every chart can be played with two thumbs.** Each rank keeps to rules like Rock Band's, and every chart is played through by a model of a person holding the phone sideways (two touches at once at most, how fast a thumb can tap and move, how fast anyone can keep time), which leaves out what no thumb could reach. `node selah/tools/playtest.js` checks every chart.
- **Selah.** Where the Hebrew has Selah, the band falls away to a heartbeat: touch nothing until it passes, and the band comes back in at once.
- **Eight songs, each a progressive form** (intro, verses, build, drop, verses in another meter, breakdown, drop, outro) on the synth engine from Luminaries:
  - Psalm 1, progressive house, the wicked in 7/8.
  - Psalm 2, drum and bass: heaven laughs in 9/8 (three times three, the "perfect" time), the decree turns the harmony to E major, the potter's vessel shatters on the crashes.
  - Psalm 3, dub into dubstep, a 6/8 lament, a lift at "Arise".
  - Psalm 4, late-night deep house, a 6/8 lullaby, and the band falling asleep.
  - Psalm 90, Afro house: the terrors of the night in 12/8 over the West African bell, angels in C major, the lion and the dragon on the crashes.
  - Psalm 116, gospel disco, sung three times: a disco band, a Balkan brass band in 7/8, then everyone.
  - Psalm 133, minimal techno for the night watch, sung twice, the second time in 5/8.
  - Psalm 150, gospel house into a jungle break, every instrument joining as the psalm names it.
- **The Voice is the text.** The Douay-Rheims is built in (`selah/douay.js`, made by `selah/tools/build-douay.js` from Psalter Runner's checked text). A psalter you own can be imported as a pack file in Settings; it stays on your device and is never sent anywhere.
- **Your hits play the drums, on the beat.** Every note you hit sounds its drum, quantized: an early touch sounds exactly on the beat of its note, with the song's own stroke. The Drums page is a small mixer: choose the kit (each song's own, or acoustic, 808, house, breakbeat, drum and bass, dub, late night, Afro or minimal, each heard in a short groove as you choose it), then set the song's own drums and your hits apart, the whole kit and each drum (kick, snare, hi-hat, toms, cymbals, from silent to twice as loud). "Song: kick only" leaves the song only its kick, for you to play the rest.
- Settings: audio offset with a tap-along calibration, note speed, music volume (the band without the drums), the Drums page, no flashing, reduced motion. The arrow by the name goes back to the title. `?verses=2` in the address plays only the first verses.

## While You Have the Light

The first build: the arena, played with the phone sideways. The name is from the Prologue of the Rule: "Run while you have the light of life, lest the darkness of death overtake you."

- **The look.** As in Limbo: every rock and every figure is a black silhouette against pale mist and angular mountains. The only colours are the torch flame, the seven sins, and the pale blue of holy water.
- **The light.** The torch casts a circle of light, cut by the rock. Inside it the demons show their true colours and he fights hand to hand; outside it they are black shapes with pale eyes, and he can only throw holy water at them (a few flasks). The light grows with the flow and shrinks when it breaks.
- **Two speeds.** In the dark he moves like the Prince of Persia of 1989: a careful walk, the hang and the slow pull-up. When a demon comes into the light he turns quick, and can zip through the air to anywhere he can see in the light.
- **Point and go.** Tap where he should go; he climbs and leaps on his own. What is under your finger decides the rest: a demon in the light, he flies at it and strikes (the blow fits where it is: a flying kick, the Superman with both fists, a dive from above, a rising knee); a demon in the dark, holy water; a thing lying about, he picks it up, and then tap any demon to throw it; a thing thrown at him, it slows in the light: tap to catch it, swipe to send it back. Swipe on a demon: up to launch, down to slam, across to dash through. Two fingers down to block (at the last instant, a parry).
- **The flare.** The flow fills a flask of oil. Spread two fingers apart and the torch flares: time all but stops, the music is muffled, and you draw one stroke through the demons; let go and he goes through them all.
- **The seven** fight each in their own way: Pride from the air, Avarice gathers and throws and steals your holy water, Lust's ribbon draws you in, Envy copies your last blow, Gluttony swallows what you throw, Wrath charges into the rock, and Sloth never wounds but drains your flow and your oil.
- **Finishers.** A demon brought to nothing is broken for a moment: tap to cast it out, or (as they open in the arena) swipe down for a life, up for oil, across for holy water, or hold for the virtue against that sin.
- **The arena:** waves of the seven, growing, with a line of Scripture between. **Practice:** choose which sins come; nothing can hurt you. `?arena` or `?practice` in the address starts them.
- Everything is drawn in code (`art.js`, with `art.html` to see every figure and move); the arena and its routes are in `world.js`; the music is built on the old Compline hymn *Christe qui lux es et dies* on the synth engine from Luminaries.

## Tools

### [Pocket Sampler](https://munkachy.github.io/Monastic-games/pocket-sampler/)

A 16-key pocket sampler and step sequencer, played like a Teenage Engineering
PO-33: pick a sound, tap out a beat, hold a key to punch in an effect.

- **Sixteen instruments.** The Pads are for instruments; the drums, the robot
  voice and the rap live in the Loops (🥁 Design a hit, 🤖 Robot words). Four
  of each part, in shades of its colour: bass (808, Reese, electric, upright),
  keys (Rhodes, grand piano, FM e-piano, organ), lead (supersaw, violin, chip,
  brass) and pads (warm pad, strings, Vigil Strings, Night Swarm). Any
  instrument from Menu › Sounds can go on any of the 16.
- **16 patterns,** chainable, with swing, eight scales and any key. **Write**
  places steps when stopped and records live when playing.
- **Key wheel:** tap the key on the screen. Majors and minors in
  circle-of-fifths order, the keys that sit well with yours shaded, and
  **Next** in the middle (up a fifth, then to the relative key). While the
  beat plays, a change lands on the next bar. With Write on it is saved in
  the pattern, so a chain can change key as it plays. A recording or import
  can be told its key (or have it found by listening) and then follows the
  song's key.
- **Effects on the keys:** in FX mode each key is an effect that stays on
  until it is tapped again (or only while held, if latching is off). The
  Effects menu picks the 16 from 26: loops, rolls, scratch, half time,
  scramble, pitch dive, octaves, reverse, unison, reverb, echo, ping-pong,
  chorus, low and high pass, bitcrush, and four distortions (overdrive,
  fuzz, wavefold, tape). Each has an amount on a slider, can be aimed at
  chosen tracks, and can be written into the pattern.
- **Quantize** (Settings): off, 1/16, 1/8, a beat, half a bar or a bar, for
  what you hear while the beat plays and for what is recorded. Exports are
  stereo.
- **Dark look and colours by part:** a near-black body and display, like
  Remixlive (the beige PO-33 look stays as Menu › Buttons › Look). Colours
  go by part, the same in the Pads and the Loops: kick red, snare orange,
  hats yellow, bass green, chords teal, lead pink, sub purple, vox/keys
  blue. Sounds 1–8 are instruments, one part each (bass, sub, chords,
  lead, vox/keys, pad, pluck/arp, stab/FX); 9–16 are drum kits and
  percussion, and inside a kit every hit has its part's colour. **Sound**
  cycles: instruments, then drums (pick one kit), then back to playing;
  kits load only on the drums and instruments only on 1–8. Write shows the
  side of the sound chosen: a kit's hits by colour, or the instruments.
- **A sound's own menu:** hold a sound in Sound mode (an instrument or a
  kit) for its volume, pitch and how it plays, and its own EQ (three bands,
  with its curve) and effect (reverb, echo, ping-pong, chorus, drive, distortion, fuzz,
  tape), on every note of it, in the beat and in the export.
- **Light sound engine** (Menu › Buttons › Sound engine), for older iPads
  whose sound breaks up: a bigger audio buffer, 32 kHz inside, a shorter
  reverb, fewer notes at once, loops made ready only when tapped. The app
  suggests it when it hears the sound breaking up; sounds only previewed
  are let go to save memory, on any device.
- **Tags:** REC (a recording), GEN (made in code beforehand and kept as a
  recording), MINE (yours), on every sound.
- **Everything made in code is played from a recording.** The synths (a
  note every 6 half steps, with a held take that loops seamlessly) and the
  808, 909, CR-78, 606 and Minimal kits are recorded once with the app's own
  engine (`pocket-sampler/tools/bake_sounds.js`) and played back as WAVs,
  which is far easier on a phone than making each note as it plays. **☆ Favorite** and
  **★ Save to My Sounds** under Load in the sound browser.
- **⟳ Make a loop:** the pattern, or a chain as one long loop, into the
  library: name it, choose its folder (Bass, Chords...) and whether the
  drums play; it shows in that folder, in My Sounds and in the Loops.
- **Repeat** in the Loops, as note values: 1/32, 1/16, 1/8, 1/4, 1/2, then bars.
- **Drum loops are beat sliced to the tempo**, not stretched: cut at every
  hit (and every 16th with none), each hit put down at its new time as
  recorded, so breaks like the Amen stay crisp at any tempo; slowed, each
  hit's ringing is stretched to fill the space after it (no gap, no rasp).
  Other loops are stretched by WSOLA or a phase vocoder, whichever comes out
  closer to the original. **Follow the tempo** (Loops › ⚙, for every loop at
  once, or each loop's own): Stretch, or Re-Pitch (like a record: no grit,
  the pitch moving with the tempo). Loops made in the app from notes (pads,
  designed beats, raps) are played again at a new tempo, never stretched. 🔁 in Review
  the library loops a sound at the tempo playing, as the Loops would.
- **A cell's sounds by colour:** choosing a sound for a Loops cell shows the
  browser's colour folders, the column's own first; anything can go anywhere.
- **Tempo and key on every cell** (and when choosing a sound): the tempo it
  was made at and its key, found by listening (kept on the device) or known.
- **Real reverbs** (Menu › Effects): recordings of real spaces (impulse
  responses) for every reverb: the Lady Chapels of St Albans and Ely
  Cathedrals, the St. Nicholas Chapel of Aachen Cathedral, a church in
  Cremona, a stairwell and a meeting room (OpenAIR, University of York, and
  Zenodo datasets; CC BY 4.0, credited in Help), made ready by
  `pocket-sampler/tools/reverbs.py`.
- **⏺ Loop rec:** record over the beat or the Loops straight into a loop,
  as notes (fixable as patterns first) or as sound (the pads alone, or
  everything, like a looper pedal); it starts on the next bar and goes in
  the Loops and the library.
- **Design** (Menu › Design, `pocket-sampler/design.js`): drum hits
  (kick, snare, clap, hats, tom, percussion, shaker: models with knobs)
  and synths (two waves, filter, envelopes, vibrato, unison), made once
  into recordings, into kits and My Sounds.
- **Loops + Pads** (where the app opens): the loops on the left, four columns
  a page, and 16 pads on the right that play the loop tapped last: in 16
  slices, or its first note pitched across the key. FX gives the pads
  their own EQ and effect (low or high pass, reverb, echo, ping-pong,
  drive, distortion, tape), kept in what ⏺ Rec records. Drive is modelled
  on a Tube Screamer (clean bass, soft-clipped mids); Distortion on a
  ProCo RAT (high gain, hard diode clipping, filter after); Tape on ChowTape (pre- and
  de-emphasis, soft saturation, head bump, high loss, wow and flutter),
  both level-matched.
- **🎹 Design a sound in a Loops cell:** the synth designer, for that cell;
  🎹 Play it on the pads records the instrument once and opens Loops +
  Pads with it on the pads; ⏺ Rec puts what you play in the cell.
- **🥁 Design in a Loops cell** (hold a cell, third tab): make a hit, tap
  its steps (up to 6 lines, a drum on each), and put the bar straight
  into the cell as a loop. Basic or Advanced shows a few knobs or all. The
  designer can also tune a drum to the key, soften its click, cut its low
  or high end, layer a second drum, bake in a short room, or reverse it.
- **⏺ Rec in Loops + Pads:** what you play on the pads, recorded as notes
  into a loop cell (🎹 From the pads, in a cell's picker, chooses which).
  Recorded exactly as played, never quantized; hold the cell for 🎹 Notes
  to quantize afterwards (1/16, 1/8, 1/4, or back to As played), drag
  notes along the beat, or tap to delete.
- **Sets and pack files:** save the Loops grid as a set; share it (or your
  sounds) as one pack file, to open on any device.
- **☁ Send to the library:** a pack and notes on it (what, who, source,
  license) go to the repository's library-inbox branch; ☁ Shared shows
  it on every device; `pocket-sampler/tools/inbox.py` files it.
- **Vigils loop set** (Loops › ⚙ › Sets): night electronica in G minor at
  144 BPM, broken beats, inspired by Remixlive's "Breakpoint Electro" and
  borrowing nothing from it: its own Plaits kit and kick, snare and tops
  loops; bass, pads, the abbey organ and choir, celestial arpeggios and a
  howling lead, sub and rain; and words of the Rule of St Benedict in
  pairs (A little rule… / …for beginners), robot cells whose words can be
  changed. It brings its own column effects and the Aachen chapel's reverb
  (`pocket-sampler/tools/vigils.py`).
- **New sounds for Vigils** (`pocket-sampler/tools/plaitsinst.py`): eight
  instruments made with Plaits' engines and kept as recordings: Vigil
  Strings (the string machine), Night Swarm, Chant (the formant voice),
  Cloister Bass, Howl, Lauds Pluck, Compline Bell and Night Glass, each
  checked as it is made to play the note asked.
- **Old records** (`pocket-sampler/tools/records.py`): real record noise in
  place of the made-up vinyl: the run-in and run-out grooves of Edison's
  own discs and cylinders (1888-1925, public domain), looped seamlessly.
- **Drum lab** (`pocket-sampler/tools/drumlab.py`): drum hits made with
  Mutable Instruments Plaits' drum engines (MIT), shaped (old-sampler grit,
  saturation, layers, tuned to the key) and measured against every hit of
  the recorded kits (attack, decay, brightness, pitch, noisiness), with a
  picture of each beside the closest real one; then each pack's kit, and
  its kick, snare and tops loops.
- **Per-loop fade, robot words, reverb in the Loops:** hold a cell for its
  own fade in and out; for a robot voice, its words and voice at the top of Settings
  (type what it says, choose the voice, 🔄 Update); EQ & Effect chooses the reverb space for the song.
- **Packs when choosing a cell's sound:** below the colour folders, the sets
  made for the looper (Electro Boom Bap), its sounds under a heading for each colour. The wave editor
  is on the cell's Settings tab.
- **Copy and Paste in the Loops:** Copy, then a cell; Paste, then any cells.
- **The Loops' top row:** the tempo opens common tempos (− and + fine-tune),
  the key opens the key wheel (▸ the next key); Stop remembers the loops
  playing and Play brings them back; ↺ Reset forgets them.
- **Multi in the Loops:** the cells of one column play together.
- **🗑 Review the library** (Menu › Sounds): hear every sound, tick the ones
  to go, and send the list to Claude (a GitHub issue, or copied for a chat)
  to delete them for good; ticked sounds leave the menus at once.
- **✎ Edit in the Loops:** the grid turns shades of amber, and a cell can be
  dragged to another place (onto a full cell, the two swap).
- **Loops tab** (beside **Pads**): a grid like Remixlive's, laid out
  sideways. Eight columns in their parts' colours (kick, snare, tops,
  bass, chords, lead, sub, vocals/keys), six cells each: drum loops a part
  each in Kick, Snare and Tops (or whole beats in Kick). A tap starts a cell
  on the next bar, in time and key (a hit starts as a loop that plays it
  every 4 beats; as a One shot, on the next 16th); one cell
  plays per column, and another takes over on the bar; a ring shows each
  loop's progress. Hold a cell for Loop, One shot or Gate, its own volume,
  its own quantize (or the default for all), an EQ (three bands, with its
  curve), transpose (half steps), repeat (every 1 to 32 beats: a short sound
  waits for the beat), time stretch on or off,
  following the key (on for every loop), an effect for its whole column
  (any loop can skip it), its sound, and its wave, where you drag to
  choose the part that plays; ⚙ sets the quantize (a beat to 4 bars, or
  off), fades, and Stop all loops. Each column has a volume and a mute.
  Tempo, key, Play and FX are shared with the Pads tab.
- **Sideways:** the Pads lie sideways like the Loops (screen and buttons
  left, keys right), turned a quarter turn when the phone is upright;
  Menu › Buttons › Pads › Upright brings back the tall layout. Effects
  aimed at chosen tracks (FX › Tracks) hit only those, from the FX keys and
  the blue buttons alike, the effects already on included.
- **One screen for playing:** the keys and the playing buttons fit without
  scrolling; **☰ Menu** opens over them with a sound browser (Hits, Packs
  and My Sounds, by family), sound settings, beat and tempo, voice, help and a log.
  Eight blue buttons are yours to set, four beside the Menu and four under
  the keys: mute drums, export, roll, new beat, clear, the key wheel, next
  key, octave down and up (for the keys you play on the current sound,
  kept in what you record), or any effect.
- **Editor (✂ Edit this sound):** see the waveform, drag to select, hear
  the selection, then crop to it or cut it out; place cut points by hand or
  let it find each hit, and put the pieces one per key on any sound. The
  robot voice can be chopped into words this way.
- **My Sounds:** save any sound or edited clip, import WAV, MP3 or a screen
  recording's sound (video files), rename and delete, and gather sounds into
  packs. Any pack, built-in or yours, can be opened to load one sound alone.
- **More sounds (Build 4):** violin, viola, cello, double bass and
  pizzicato, men's and women's choirs and celeste (Sonatina Symphonic
  Orchestra); trumpet and trombone stabs (VSCO 2 CE); Gretsch, Hofner and
  Epiphone electric guitars (Karoryfer); a Rhodes (jRhodes3d by Jeff Learman,
  CC BY-NC); tenor sax and xylophone (VCSL); nylon, acoustic and 12-string
  guitars and a steel drum modelled in code. Packs of 16: a sampled TR-808,
  electro, Drumtraks and boom bap kits, bells, tambourines and shakers, robot
  hype words, Speak & Spell and vocal chops, nature, air and water (with a
  respirator), arcade FX, machines, noise and risers, sirens, synth stabs,
  bass hits, pads and funk horns (TidalCycles' Dirt-Samples, the TR-808
  recorded by Michael Fischer, VCSL, and some made in code).
- **Loops:** 14 drum loops played on these kits, breakbeats (the Amen and
  others), old records (the hiss and crackle of Edison's discs and
  cylinders, 1888-1925) and ambience; each key a loop that comes in on
  the next bar in step, follows the tempo and key, and stops with the beat.
- **Human Grooves:** 16 beats played by drummers, a style each (hip hop,
  funk, soul, rock, pop, punk, jazz, Latin, Afrobeat, Afro-Cuban, reggae,
  New Orleans, blues shuffle, dance), every hit at the drummer's own timing
  and loudness, on the acoustic kit: two steady bars from performances in
  the [Groove MIDI Dataset](https://magenta.tensorflow.org/datasets/groove)
  (Gillick, Roberts, Engel, Eck and Bamman, Magenta, 2019; CC BY 4.0)
  (`pocket-sampler/tools/grooves.py`).
- **Beats played by drummers** (Menu › Rhythm › Drum beat): 56 one-bar beats
  in 17 styles from the same dataset, each hit at the drummer's timing and
  loudness, put on whatever kit is chosen; the app's own patterns are
  listed apart, as "Generated by the app" (`pocket-sampler/tools/grooves.py`).
- **Buttons in coloured rows:** what the keys do (Sound, Pattern, FX, Menu);
  playing and recording (green); Copy, Paste, Undo, Redo (grey); then the
  twenty you set, each in the colour of what it does: rhythm red, pitch and
  key purple, the sound amber, the voice blue, effects pink.
- **🤖 Robot pads:** type a word on a pad and the robot voice says it, cut
  into syllables; − and + choose how many stay on the pad, and the rest
  spill over onto the next pad, which has its own count. ⚙ on a pad gives
  its word a voice of its own (voice, pitch, tone, speed, gap, vowel length,
  cut), so one pattern can hold many voices.
- **Bass and basslines** (Menu › Rhythm): a Bass list puts a bass sound on
  sound 1, and a Bassline list writes a bar of bass on it: 72 bars played
  by bassists (jazz walking lines, sorted by chord: minor, dominant 7th,
  major) from the [FiloBass dataset](https://huggingface.co/datasets/xavriley/FiloBass)
  (Riley and Dixon, QMUL, 2023; MIT License), moved into the song's key,
  plus simple lines the app generates (`pocket-sampler/tools/basslines.py`).
- **Sounds by colour:** Menu › Sounds is in folders by part, in the parts'
  colours: Beats (red), Snares and claps (orange), Tops (yellow), Drum
  kits, Bass (green), Chords (teal), Lead (pink), Sub and color (purple: subs, glitchy
  accents and the video-game sounds), Vox and
  keys (blue), Pads, Plucks, Stabs and FX.
- **Electro Boom Bap loop set** (Loops › ⚙ › Sets): 45 loops written
  for the grid, with kit hits, an old record, Alleluia and Selah: F minor at 92
  BPM, swung. Its own kit (16 hits made with Mutable Instruments Plaits'
  drum engines, MIT) and kick, snare and tops loops of it, a part each, so
  any three go together (`pocket-sampler/tools/drumlab.py`); 808, electric, Reese and
  upright bass; Rhodes, pad, choir and organ; Juno stabs, pluck, chip,
  trumpet and bells; sub; the robot's words and the women's choir. The
  harmony is Fm7, D♭maj7, B♭m7, Cm7 a bar each, so every loop fits every
  other; every loop follows the key. Written as short songs and rendered
  by the app's own export (`pocket-sampler/tools/loopset.py`,
  `render_loops.js`).
- **Songs:** written for the app from its own sounds; the first is an
  8-bar electro boom bap in F minor (`pocket-sampler/tools/songs.py`).
- **Export** the pattern or chain as a seamless loop WAV for Remixlive.
  Everything is saved on the phone between visits.
- **One shot / Gate / Loop** per sound: the whole sound, only while held, or
  looping from one tap to the next; held organs and the electric bass ring
  on a seamless loop for as long as they're held.
- The keys, upright and electric bass and the Gogodze, Big Rusty and Brush
  kits are CC0, from the [Versilian Community Sample Library](https://github.com/sgossner/VCSL)
  and Karoryfer Samples ([Gogodze Phu Vol II](https://github.com/sfzinstruments/karoryfer.gogodze-phu-vol-ii),
  [Big Rusty Drums](https://github.com/sfzinstruments/karoryfer.big-rusty-drums),
  [Swirly Drums](https://github.com/sfzinstruments/karoryfer.swirly-drums),
  [Meatbass](https://github.com/sfzinstruments/karoryfer.meatbass),
  [Growlybass](https://github.com/sfzinstruments/karoryfer.growlybass));
  `pocket-sampler/tools/instruments.py` and `kits.py` build them.
- The Acoustic Kit and Percussion are from Karoryfer Samples' [Virtuosity
  Drums](https://github.com/sfzinstruments/virtuosity_drums), played by
  Austin McMahon (CC0); `pocket-sampler/tools/drums.py` builds them.
- The video-game sounds are CC0, from Juhani Junkala's [Essential Retro Video
  Game Sound Effects Collection](https://opengameart.org/content/512-sound-effects-8-bit-style)
  and Deva's [8-bit Sound Effect Pack](https://opengameart.org/content/8-bit-sound-effect-pack-vol-001);
  `pocket-sampler/tools/banks.py` builds the banks from them.

### [Vox Machina](https://munkachy.github.io/Monastic-games/vox-machina/)

Type a Bible verse and a robot speaks it. Shape the sound, then download it as
a WAV sample for a music app such as Remixlive, or for a game.

- **Synthetic voice. No human voice recordings used.** The voice is
  [eSpeak NG](https://github.com/espeak-ng/espeak-ng), which builds speech from
  rules and formant tables. No neural, cloud or built-in browser voices.
- **Voice:** about twenty eSpeak variants (Robosoft, UniRobot, croak, whisper,
  Demonic and more), five accents including Latin, and pitch, pitch range,
  speed and word gap.
- **Sing:** give it a key such as `Bm` or `D dorian` and a style (Monastic
  psalm tone, recto tono, hymn, Kraftwerk, lament, trance arpeggio, techno,
  electro, dubstep, acid, hip-hop flow, G-funk hook, trap), with chant-style
  melismas and vowels held up to double length,, and a
  vocoder sings the verse on exact notes at your tempo, with optional organum,
  thirds, choir chords or a drone.
- **Effects:** synthetic choir, ring modulator, bitcrusher, delay and reverb,
  with one *Robot amount* knob that blends them all.
- **Presets:** 22 built in, from Cold Cathedral, Night Office, Jubilus and
  Seraphim to West Coast Talkbox, Trap Psalm, Basilica Dub, Warehouse Vespers and Acid Compline, and your own saved in the
  browser. Tempo-locked **Wobble** and **Gate** effects for dance tracks.
- **📱 iPhone mode:** speaks with any iPhone voice you've installed, and can
  import a file saved by the Shortcuts app to run through the effects.
- **Export:** 44.1 kHz, 16-bit WAV. Preview and file are rendered the same way,
  so they sound the same. On iPhone, *Share* sends the file to Files or another app.
- **Batch:** one line per clip, `filename | verse text`, all downloaded as a ZIP.
- Works offline after the first visit. Licenses and sources are in
  [`vox-machina/README.md`](vox-machina/README.md); eSpeak NG is GPL v3.

## Recent highlights

- **Luminaries:** all 38 Doctors; three difficulties with one smooth speed curve; closing scenes with the Doctors; your own instruments in every song; St. Teresa's new gift, the Interior Castle; the title music from the first tap; a "turn sideways" screen.
- **SaintStyle Turbo:** renamed from Run the Way (the old address still works); slow motion is now the default speed.
- **Fear Not:** the first build is playable, the whole first night from the cold open to the bell for Vigils. The fight plays like Arkham Asylum with one rule of its own (never the same blow twice on the same demon), and the angel leaps across a Grand Theft Auto city from rooftop to rooftop. The score is now jazz techno. New: the Holy Hour, a survival mode in six places, rooms with walls among them; demons roaming the whole city during the flight, thickest in the dark, and wherever you meet them the whole gang comes at you on that roof, side on, a round as in the Holy Hour; the angel coming down like a hammer after the blessing, in rings of light; the cut scenes redrawn after storyboard sheets, dark and wet with one strong light in each picture; two fingers to block; the blessing only in the Heights; and a shield can now only be taken with the rosary.

## Playing locally

Open a terminal in this folder, run `python3 -m http.server`, and open the address it prints.

## Publishing

The site is served by GitHub Pages from the `gh-pages` branch. To publish, copy
the changed files onto that branch and push it.
