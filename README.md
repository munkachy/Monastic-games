# Monastic Games

Small browser games with a monastic theme. Each game lives in its own folder
and runs as plain HTML and JavaScript, with no build step, so GitHub Pages can
serve the whole repo as-is.

## ▶ Play

- **[Benedictine Bricks](https://munkachy.github.io/Monastic-games/benedictine-bricks/)**: build the abbey tower and drive off the demon
- **[Psalter Runner](https://munkachy.github.io/Monastic-games/psalter-runner/)**: run all 150 psalms with the saints (made for phones)
- **[Catholic Truth Squad: Tactics](https://munkachy.github.io/Monastic-games/new-apologetics/play.html)**: assemble a squad, level up, light up the world ([about the game](https://munkachy.github.io/Monastic-games/new-apologetics/))

All the games: **[munkachy.github.io/Monastic-games](https://munkachy.github.io/Monastic-games/)**

| Game | Folder | What it is |
| --- | --- | --- |
| [Benedictine Bricks](https://munkachy.github.io/Monastic-games/benedictine-bricks/) | `benedictine-bricks/` | Physics tower builder in the style of 99 Bricks Wizard Academy, built on seven real Benedictine monasteries |
| [Psalter Runner](https://munkachy.github.io/Monastic-games/psalter-runner/) | `psalter-runner/` | A 16-bit auto-runner for phones through all 150 psalms, with ten saints to play; a single HTML file with nothing to load |
| [Catholic Truth Squad: Tactics](https://munkachy.github.io/Monastic-games/new-apologetics/play.html) | `new-apologetics/` | Assemble a squad. Level up. Light up the world. A team battler starring today's Catholic apologists (still under review) |

## Playing locally

Open a terminal in this folder and run `npx serve .`, then open the address it prints.

## Publishing with GitHub Pages

Settings → Pages → Build and deployment → Source: *Deploy from a branch*,
branch `main`, folder `/ (root)`. The games then appear at
`https://<your-username>.github.io/Monastic-games/`.

## Benedictine Bricks: changing the art

All art is in `benedictine-bricks/art.js`, drawn as grids of characters. Open
`benedictine-bricks/art.html` to see every sprite enlarged. To use a PNG in place of a
sprite, put it in `benedictine-bricks/img/` and list it in `IMAGE_OVERRIDES` at the
end of `art.js`.

The physics engine is [planck.js](https://github.com/piqnt/planck.js), a
JavaScript port of Box2D (MIT license), included in `benedictine-bricks/lib/`
and wrapped for the game in `benedictine-bricks/physics.js`.

## Benedictine Bricks: music

The music is real Gregorian chant, one piece for each Hour of the Office the
game passes through as you build: the Te Deum (Vigils), Jam lucis orto sidere
(Prime), Rector potens (Sext), Ave maris stella (Vespers), Te lucis ante
terminum and the Salve Regina (Compline). The scores are GABC transcriptions
from [GregoBase](https://gregobase.selapa.net/), kept in
`benedictine-bricks/music/gabc/`. `node tools/gabc2js.js` turns them into
`benedictine-bricks/chants.js` for the game, and into MIDI files in
`benedictine-bricks/music/` that open in any music program. The game sings
them with a synthesized choir over a drone and a beat, all made in the
browser (`audio.js`).

## Psalter Runner

One file, `psalter-runner/index.html`, with no libraries, fonts or images to
load. On a phone, tap the left half of the screen to jump and hold to float;
tap the right half to attack. On a keyboard: Space, Up or W to jump (hold to
float), X, J or Enter to attack, P to pause, M for sound.

Each saint plays differently: St. Therese floats down like a petal and throws
roses; St. Joseph of Cupertino levitates and bursts with ecstatic joy; St.
Benedict throws his medal straight through two foes; St. Maurus, who at St.
Benedict's word walked on the water to save St. Placidus, surfs across rivers,
fire and gaps on his board and sends a rolling wave along the ground; St.
Scholastica jumps twice and calls down a storm.

Five more saints join the run, one for every thirty psalms sung:

- **St. Hildegard** (after Psalm 30) throws seeds. Where a seed lands a green
  vine springs up and keeps striking whatever walks into it.
- **St. Cecilia** (after Psalm 60) throws musical notes that weave up and down
  and pass through two foes. Each throw sounds a note in the key and on the
  beat of the music that is playing.
- **St. Peter** (after Psalm 90) throws rocks. They are heavy: they bounce once,
  strike twice as hard, and smash fireballs, falling drops and broken jars.
- **St. Augustine** (after Psalm 120) throws flaming hearts that turn and seek
  the nearest foe.
- **St. Lucy** (after Psalm 150) throws eyes. Each one hangs in the air ahead of
  her for a while, watching, and sends a beam of light at any foe that comes
  near.

The first three psalms are built by hand, four stages each, with a cut scene
between them. Psalm 1: the counsel of the ungodly in a dark alley, a reading
man whose book opens onto a riverside of floating leaves, a windswept desert of
chaff, and a fiery abyss. Psalm 2: kings of the earth rising out of the ground,
the ascent past the One enthroned in heaven, the holy mountain where a rod of
iron breaks the potter's jars, and the divine flames. Psalm 3: the many who
rise up, the Lord as shield, a dream of beds and mattresses ("I have slept and
taken my rest"), and the broken teeth of the wicked.

Psalms 4 to 150 are built from their own images. Each psalm is cut into one to
eight stages by its length, and each stage takes the place its verses speak of:
the sea and the deep, green pastures, the temple courts, lions and bulls, the
fowler's snare, the storm and its lightning, the forest and the cedars, the
city gates, the harvest, the rivers of Babylon, the night watches, the pit,
the feast with harps and timbrels, the Red Sea and Pharaoh's chariots, the rock
and fortress, the dawn, snow and hail, and the places of Psalms 1 to 3. Many
psalms have a plan made by hand (Psalm 23: the shepherd, still waters, the
dark valley, the Lord's house; Psalm 29: the waters, the storm, the cedars of
Lebanon, the fire). Each stage is named for its verse, and the later psalms run
a little faster and fuller. The plans sit in `PLANS` and `IMAGERY` in the file.

The music is made in the browser in the style of Catholic Truth Squad's:
chip instruments played with Tim Follin's techniques (shimmering arpeggio
chords, a swept pulse lead with trills and late vibrato, an echo, a resonant
filter bass). Every stage has its own song on one of the Gregorian psalm
tones, set to the scene: peaceful by the river, in heaven and in the dream;
driving in the wind and on the mountain; dangerous over the fire and among
the broken teeth; rolling on the sea, mournful by the rivers of Babylon, and
festive among the harps and timbrels.

The psalm text that scrolls behind the run is The Grail Psalms (1963), as
chanted in the Divine Office, taken from the Lumina project
([munkachy/lumina](https://github.com/munkachy/lumina), `data-grail.js`). The
verses sit in `PSALMS` at the top of the file; each stage names the verses it
shows.
