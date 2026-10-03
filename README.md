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
- On a phone: drag sideways to move, tap to turn, drag down to drop gently, flick down to drop at once.
- The Doctors' words pass under the field: 376 quotations, each from a cited public-domain translation or newly translated from the Latin.

## Fear Not

The first build: one night, in six parts, played with the phone sideways (it locks to sideways where the phone allows, and asks to be turned where it does not).

- **Bring Daddy Home.** 2 AM. A radio in the dark, a girl at her window, her father in his car across from a corner store with a gun in his lap, and the whispers.
- **Someone Asked.** The desert monastery. His angel wakes Fr. Lawrence; he protests that he is not Padre Pio, and is answered. His body stays kneeling in the chapel.
- **The Flight.** The city from above, riding the angel's back: drag on the left to steer, tap on the right to beat the wings (on the beat is strongest), hold to dive. Climb above the fog, touch a light to swing round it on a thread, fill up at the church, follow the girl's prayer to the car while the dark closes in.
- **The Street.** The fight, side on, by touch alone: tap a demon to strike and keep tapping to chain; tap a gold sign to counter; swipe away from a red sign to dodge; tap twice for the angel's wing bash; swipe up to launch; hold on the ground for a wing shield; fill the Spirit to bless them all. Break the chains of shadow on the father's guardian angel.
- **The Choice** and **Vigils.** What the father does; and back to the chapel before the bell.
- Everything is drawn in code (`fear-not/art.js`, `fear-not/scenes.js`); the music runs on the synth engine from Luminaries, with a noir jazz band for the city and kung fu film music for the fights (`fear-not/audio.js`, `fear-not/music.js`). Progress is saved after each part. `?part=2` in the address starts at a given part.

## Recent highlights

- **Luminaries:** all 38 Doctors; three difficulties with one smooth speed curve; closing scenes with the Doctors; an info button for each gift; gentler touch controls with a true flick; a Reset Progress button.
- **SaintStyle Turbo:** renamed from Run the Way (the old address still works); slow motion is now the default speed.
- **Fear Not:** the first build is playable: the whole first night, from the cold open to the bell for Vigils.

## Playing locally

Open a terminal in this folder, run `python3 -m http.server`, and open the address it prints.

## Publishing

The site is served by GitHub Pages from the `gh-pages` branch. To publish, copy
the changed files onto that branch and push it.
