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

## Recent highlights

- **Luminaries:** all 38 Doctors; three difficulties with one smooth speed curve; closing scenes with the Doctors; your own instruments in every song; St. Teresa's new gift, the Interior Castle; the title music from the first tap; a "turn sideways" screen.
- **SaintStyle Turbo:** renamed from Run the Way (the old address still works); slow motion is now the default speed.
- **Fear Not:** the first build is playable, the whole first night from the cold open to the bell for Vigils. The fight plays like Arkham Asylum with one rule of its own (never the same blow twice on the same demon), and the angel leaps across a Grand Theft Auto city from rooftop to rooftop. The score is now jazz techno. New: the Holy Hour, a survival mode in six places, rooms with walls among them; demons roaming the whole city during the flight, thickest in the dark, and wherever you meet them the whole gang comes at you on that roof, side on, a round as in the Holy Hour; the angel coming down like a hammer after the blessing, in rings of light; two fingers to block; the blessing only in the Heights; and a shield can now only be taken with the rosary.

## Playing locally

Open a terminal in this folder, run `python3 -m http.server`, and open the address it prints.

## Publishing

The site is served by GitHub Pages from the `gh-pages` branch. To publish, copy
the changed files onto that branch and push it.
