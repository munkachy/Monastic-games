# Monastic Games

Small browser games with a monastic theme. Each game lives in its own folder
and runs as plain HTML and JavaScript, with no build step, so GitHub Pages can
serve the whole repo as-is.

## ▶ Play

- **[Benedictine Bricks](https://munkachy.github.io/Monastic-games/benedictine-bricks/)**: build the abbey tower and drive off the demon
- **[Psalter Runner](https://munkachy.github.io/Monastic-games/psalter-runner/)**: run all 150 psalms with the saints (made for phones)
- **[Run the Way](https://munkachy.github.io/Monastic-games/run-the-way/)**: the saints at full speed, off ramps and round loops (made for phones)
- **[Canticle Mansion](https://munkachy.github.io/Monastic-games/canticle-mansion/)**: explore a mansion made of the Canticle of Canticles (made for phones)
- **[Catholic Truth Squad: Tactics](https://munkachy.github.io/Monastic-games/new-apologetics/play.html)**: assemble a squad, level up, light up the world ([about the game](https://munkachy.github.io/Monastic-games/new-apologetics/))

All the games: **[munkachy.github.io/Monastic-games](https://munkachy.github.io/Monastic-games/)**

| Game | Folder | What it is |
| --- | --- | --- |
| [Benedictine Bricks](https://munkachy.github.io/Monastic-games/benedictine-bricks/) | `benedictine-bricks/` | Physics tower builder in the style of 99 Bricks Wizard Academy, built on seven real Benedictine monasteries |
| [Psalter Runner](https://munkachy.github.io/Monastic-games/psalter-runner/) | `psalter-runner/` | A 16-bit auto-runner for phones through all 150 psalms, with ten saints to play; a single HTML file with nothing to load |
| [Run the Way](https://munkachy.github.io/Monastic-games/run-the-way/) | `run-the-way/` | A speed runner with the saints of Psalter Runner: slopes, ramps into the sky, springs, loop-the-loops and best times; a single HTML file with nothing to load |
| [Canticle Mansion](https://munkachy.github.io/Monastic-games/canticle-mansion/) | `canticle-mansion/` | An exploring, climbing and building game through the Canticle of Canticles: a Benedictine monk in a mansion whose rooms are made of the verses |
| [Catholic Truth Squad: Tactics](https://munkachy.github.io/Monastic-games/new-apologetics/play.html) | `new-apologetics/` | Assemble a squad. Level up. Light up the world. A team battler starring today's Catholic apologists (still under review) |

## Playing locally

Open a terminal in this folder and run `npx serve .`, then open the address it prints.

## Publishing with GitHub Pages

Settings → Pages → Build and deployment → Source: *Deploy from a branch*,
branch `main`, folder `/ (root)`. The games then appear at
`https://<your-username>.github.io/Monastic-games/`.

## Benedictine Bricks: the demon and his fire

The demon comes each time as one of the seven deadly sins (Pride, Avarice,
Lust, Envy, Gluttony, Wrath, Sloth), each in his own colours and with his own
mark, and a verse of Scripture against that sin is shown as he comes. He
hovers two seconds before he does anything. Then he drops fire on the tower:
lay a stone on it at once and it is smothered; leave it and it spreads, in
any direction, from stone to stone, and burns them away. Tap a fire to douse
it with holy water for 2 prayer. A verse about the cornerstone, or the
temple of God, is written large across the sky (in clouds by day, in stars
by night), and changes with each tower and every few Hours. Mortar,
Scaffold, ice stones and invisible stones are gone.

## Benedictine Bricks: the saints

In place of habits, the shop's Saints tab lets you build as a saint of the
Order: St. Benedict to begin with, then St. Scholastica (with her dove),
St. Maurus (on the water), St. Gertrude the Great (with the Sacred Heart),
St. Anselm (mitre and pallium), St. Hildegard of Bingen (a flame of the
living light) and St. Gregory the Great (tiara, and the dove at his ear).
Coins spent on habits before the change were given back.

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
tap the right half to attack, and hold it to run faster: the longer you hold,
the faster the saint goes, with no limit at all (the camera looks further
ahead as the pace rises). On a keyboard: Space,
Up or W to jump (hold to float), X, J or Enter to attack, Right or D to run
faster, P to pause, M for sound. Each psalm is timed; the end screen shows your
time and your best, and the psalm list shows each psalm's best score and time. Every
stretch of every psalm is half again as long as it was first built: the
stretch itself, then a fresh half-stretch of the same place joined on after it.

The title page shows the five books of the Psalter (Psalms 1–41, 42–72,
73–89, 90–106 and 107–150), all open from the start; within a book any psalm
can be sung, in any order. Below the books are the other ways to play:

- **Random**: choose a saint, run a psalm chosen at random, then go home to
  the title page (or straight on to another).
- **Pick a psalm**: choose a saint, then any of the 150 from a grid.
- **Watch Mary**: choose a psalm and watch the Blessed Virgin Mary run it. The
  computer plays her, and she plays perfectly. It looks ahead and foresees
  where every foe and hazard will be (the swing of a fireball, the fall of the
  hail, the stroke of the lightning, the chariots coming up from behind), and
  she runs the lowest path nothing can touch, borne up on light when she must
  rise. She throws the gifts of every saint, chosen at random: roses, joy,
  medals, waves, rain, seeds, notes, rocks, hearts and eyes. In tests she ran
  all 510 stages without being touched once.
- **Watch Jesus**: comes when every book has been sung. Our Lord runs as Mary
  does, perfectly, with one weapon: the cross, full of light, which nothing
  stands against.

After each psalm, READ PSALM steps through the whole psalm one verse at a
time, a tap for each verse.

Each saint plays differently: St. Therese floats down like a petal and throws
roses; St. Joseph of Cupertino levitates and bursts with ecstatic joy; St.
Benedict throws his medal straight through two foes; St. Maurus, who at St.
Benedict's word walked on the water to save St. Placidus, surfs across rivers,
fire and gaps on his board and sends a rolling wave along the ground; St.
Scholastica jumps twice and calls down a storm.

Five more saints join the run, one for each whole book of the Psalter sung:

- **St. Hildegard** (Book I) throws seeds. Where a seed lands a green
  vine springs up and keeps striking whatever walks into it.
- **St. Cecilia** (Book II) throws musical notes that weave up and down
  and pass through two foes. Each throw sounds a note in the key and on the
  beat of the music that is playing.
- **St. Peter** (Book III) throws rocks. They are heavy: they bounce once,
  strike twice as hard, and smash fireballs, falling drops and broken jars.
- **St. Augustine** (Book IV) throws flaming hearts that turn and seek
  the nearest foe.
- **St. Lucy** (Book V) throws eyes. Each one hangs in the air ahead of
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

The psalm text that scrolls behind the run is the Douay-Rheims Bible
(Challoner, in the public domain) from the Lumina project
([munkachy/lumina](https://github.com/munkachy/lumina), `bible-data.js`),
checked verse by verse against [drbo.org](https://www.drbo.org) and
[eBible.org](https://ebible.org): where Lumina's copy stood alone against
both, their reading was taken. It is shown without the psalm headings, each verse set in lines at its colons and
semicolons. The game counts the psalms by the Hebrew numbering and shows the
Douay's own Vulgate number beside it where the two differ: Psalm 23 (22). The
verses sit in `PSALTER` at the top of the file; each stage names the verses it
shows.

## Run the Way

One file, `run-the-way/index.html`. The saints of Psalter Runner (its screen,
type, music and figures are copied from there) run six zones: Green
Pastures, The High Places, Upon Many Waters, The Holy City, The Valley of the
Shadow and The Courts of the Lord, each about 35,000 to 46,000 pixels long.
Hold the right half of the screen to run faster, the longer the harder; tap
or hold the left half to jump (a short tap is a short jump, and holding
floats, rises, skims a gap or jumps again, as each saint does). Slopes speed
the saint going down and slow him going up; over a crest at speed he flies;
boost pads throw him on, ramps throw him into the sky over a gap, springs
bounce him onto roads of cloud, and loops take him round if he comes in
fast enough. His feet turn to a blur, then a figure of eight. Neumes are
the rings: a foe takes them all, or, with none left, sends him back to the
last lamp; at speed, or landing from above, he bowls the foe over. Each
zone is timed, with best times kept. Along the foot of the screen a ticker
carries the Douay verses about running (Psalm 118:32, "I have run the way of
thy commandments"; Isaias 40:31; Hebrews 12:1–2; 1 Corinthians 9:24 and
more) at a steady reading pace, however fast the saint goes. Every zone can
be finished without ever holding the right side, in about three minutes;
driving hard, in under one.

## Canticle Mansion

A Benedictine monk explores a great house, and the lands about it, made of
the Canticle of Canticles (Douay-Rheims). Every verse is somewhere in the
world: carved over a door, gilded on a frieze, written across the sky,
pressed into sand, stitched into a curtain, lettered on a label, kindled in
light as he comes near, strung bead by bead on a chain of gold. Pause to read
the chapter as far as you have found it; finish a chapter to read it whole.

On a phone: hold the lower left of the screen to walk left, the lower right
to walk right, and tap the top to jump (hold for higher). Double-tap a thing
to lift it or set it down, to open a door or greet someone; double-tap beside
a wall to leap off it. Tap a creature to throw holy water at it. On a
keyboard: arrows or WASD to walk, Up, W or Space to jump, Down, S or E to lift
and set down, X or J to throw, P to pause, M for sound.

Chapter I, "The Kiss of His Mouth", runs through fifteen rooms: in through a
great mouth of marble whose lips part as you come; the wine and the perfume,
whose scent lifts you up a shaft; down into the king's storerooms to stack
crates and find the staff; the tunnel out into the desert and the black tents
of Cedar; the curtains of Solomon to climb; the vineyard under the sun, where
the monk grows brown as he walks; the shepherd, who gives you three kids to
lead past a stream and a wall to the shepherds' tent, where they graze; up
Pharaoh's throne room and across a chasm on his chariots; the chains of gold,
climbing a seated bride with little goldsmiths who climb beside you; the king
at his repose and a bundle of myrrh as tall as a tower; the vineyards of
Engaddi; the fair one whose eyes are doves; and the bed beneath the beams of
cedar. Chapter II, "The Lily among Thorns", has ten rooms: lilies among thorns, the apple tree to climb, the cellar of wine with its verse set out in flowers, roes and harts leaping across a field, the mountains where the sandals of the roe let you leap again in the air, the lattice over the garden wall, the winter passing into spring, the clefts of the rock full of doves, the little foxes to catch before the vineyard gate opens, and the break of day. Chapter III, "By Night I Sought Him", has nine rooms: the dark bedchamber where the lantern waits on a high shelf, the streets and the broad ways with the watchmen walking them, the city gate they keep, my mother's house, the sleeping roes with the verse spelled in stars, a pillar of smoke of spices to ride up, the threescore valiant ones about the bed of Solomon, the litter of Solomon (pillars of silver, the seat of gold, the going-up of purple), and the king crowned on the day of his espousals. Chapter IV, "A Garden Enclosed", has eight rooms: Mount Galaad and its flocks, the river crossed on the backs of sheep come up from the washing, the scarlet lace to climb, the tower of David hung with a thousand bucklers, the mountain of myrrh and the hill of frankincense, the dens of the lions and the mountains of the leopards, the dropping honeycomb, and the garden enclosed, where the guardian angel waits beside a sealed fountain; once found, the angel follows you and turns blows aside, the fountain is unsealed and lifts you, and the north wind and the south wind blow. Chapter V, "My Heart Watcheth", has seven rooms: the feast in the garden, the night door with its keyhole and its bolt to open, the empty streets with their verse in the stars, the keepers of the walls (the helmet waits in their guardroom: one more heart, and cracked stone breaks when you jump into it), the daughters of Jerusalem, a colossal image of the beloved to climb from its bases of gold to its head of finest gold with each verse beside the part it tells of, and the crossroads where the daughters ask whither he is gone. Chapter VI, "Terrible as an Army", has seven rooms: the bed of spices with its verse in flowers, the army in its ranks and banners, the flock from the washing, the threescore queens on their balconies with the one dove flying ahead to show the way, the climb through the clouds as the sky passes from dawn to moon to sun, the garden of nuts with walnuts dropping from the boughs, and the chariots of Aminadab, whose power is a dash (double-tap low on the screen) to carry you over chasms no jump can cross. Chapter VII, "The Palm Tree", has eight rooms: the companies of camps with the skilful workman's jewels, the heap of wheat set about with lilies and two young roes, the tower of ivory to climb above the fishpools of Hesebon, Carmel and the channels of the king's purple, the palm tree itself, whose gloves at its foot let you climb any wall you hold toward in the air, the best wine in the cellar, the field and the villages, and the gates where all fruits, new and old, are kept. Chapter VIII, "Love Is Strong as Death", has eight rooms: my mother's house with the cup of spiced wine, the desert by night with the charge to the daughters spelled in stars and the apple tree at its end, the seal upon the heart (with the seal, holy water burns as flame, and a cedar barricade it touches burns from board to board), the many waters that cannot quench charity, crossed on the floating goods of a house, the little sister and the wall like a tower, the vineyard of the peaceable with its verses laid out in pieces of silver, the gardens where the friends turn to hearken, and the flight of the roe and the young hart over the mountains of spices, where the Canticle ends.

The engine is new (`engine.js`): rooms joined by doors, tile physics with
stackable objects, lighting, and the verses lettered at full resolution
between the back wall and the figures. The text of the Canticle (`text.js`) is
the Douay-Rheims (Challoner) from the Lumina project, checked verse by verse
against drbo.org and eBible.org. The music is Psalter Runner's engine.

