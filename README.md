# Monastic Games

Small browser games with a monastic theme. Each game lives in its own folder
and runs as plain HTML and JavaScript, with no build step, so GitHub Pages can
serve the whole repo as-is.

## ▶ Play

- **[Benedictine Bricks](https://munkachy.github.io/Monastic-games/benedictine-bricks/)**: build the abbey tower and drive off the demon
- **[Psalter Runner](https://munkachy.github.io/Monastic-games/psalter-runner/)**: run all 150 psalms with the saints (made for phones)
- **[SaintStyle Turbo](https://munkachy.github.io/Monastic-games/saintstyle-turbo/)**: the saints race the seven deadly sins through St. Teresa's Interior Castle: big air, tricks, combos and funk (made for phones)
- **[Canticle Mansion](https://munkachy.github.io/Monastic-games/canticle-mansion/)**: explore a mansion made of the Canticle of Canticles (made for phones)
- **[Luminaries](https://munkachy.github.io/Monastic-games/luminaries/)**: a Lumines-style music puzzle through the Doctors of the Church (made for phones)
- **[Catholic Truth Squad: Tactics](https://munkachy.github.io/Monastic-games/new-apologetics/play.html)**: assemble a squad, level up, light up the world ([about the game](https://munkachy.github.io/Monastic-games/new-apologetics/))

All the games: **[munkachy.github.io/Monastic-games](https://munkachy.github.io/Monastic-games/)**

| Game | Folder | What it is |
| --- | --- | --- |
| [Benedictine Bricks](https://munkachy.github.io/Monastic-games/benedictine-bricks/) | `benedictine-bricks/` | Physics tower builder in the style of 99 Bricks Wizard Academy, built on seven real Benedictine monasteries |
| [Psalter Runner](https://munkachy.github.io/Monastic-games/psalter-runner/) | `psalter-runner/` | A 16-bit auto-runner for phones through all 150 psalms, with ten saints to play; a single HTML file with nothing to load |
| [SaintStyle Turbo](https://munkachy.github.io/Monastic-games/saintstyle-turbo/) | `saintstyle-turbo/` | A trick racer with the saints of Psalter Runner: the seven deadly sins race them through St. Teresa's seven mansions, by the same rules; ramps, loops, rails, tricks on an arrow pad, combos, stacking surges, surges, a tutorial, and adaptive funk music; a single HTML file with nothing to load |
| [Canticle Mansion](https://munkachy.github.io/Monastic-games/canticle-mansion/) | `canticle-mansion/` | An exploring, climbing and building game through the Canticle of Canticles: a Benedictine monk in a mansion whose rooms are made of the verses |
| [Luminaries](https://munkachy.github.io/Monastic-games/luminaries/) | `luminaries/` | A falling-block music puzzle in the spirit of Lumines through all 38 Doctors of the Church: a stage, a world, a song and a gift for each Doctor, a tutorial, and Master mode, synthesised live in the browser, with their words on a ticker beneath the field |
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

## SaintStyle Turbo

One file, `saintstyle-turbo/index.html` (it was called Run the Way; the old
address sends you on, and saved progress is kept). The saints of Psalter
Runner race the seven deadly sins through the seven mansions of St. Teresa
of Ávila's *Interior Castle*, from the gate of prayer to the King's own room
at the centre. Each mansion has its own colours and country, its own funk
groove, and its own demon, drawn as in Benedictine Bricks: Pride, Sloth,
Avarice, Envy, Gluttony, Wrath and Lust. Every mansion is open from the
start; beating a demon teaches new tricks and wins a new saint.

**The saints.** A new player has three: St. Therese, St. Maurus and St.
Benedict. Each demon beaten wins one more: St. Scholastica, St. Joseph of
Cupertino, St. Peter, St. Cecilia, St. Lucy, St. Hildegard and St.
Augustine. When every demon has been beaten, St. Teresa of Ávila comes
too, she who wrote the *Interior Castle* itself; her gift is her pen, and
her cry is "Solo Dios basta!" The more you play a saint, the higher that
saint jumps: every point of style is experience, up to level 10, shown on
the saints screen as a level, a progress bar and a gold bar for the jump.
RESET PROGRESS on the castle screen (tap it twice) starts everything again
from nothing.

**After each race** the camera closes in on the saint, in rays of glory
for a win or in the rain for a loss, with the demon tumbling away or
gloating across from them, and the saint says something in character.
St. Benedict: "Ora et labora. Mostly labora, today." St. Peter: "Three
times I fell. I sense a pattern." St. Teresa: "Lord, if this is how you
treat your friends, no wonder you have so few!" Each saint has three lines
for a win and three for a loss.

**The one shot.** Once in each race, the quick trick (→ in the air, or F)
throws the saint's own gift after the demon, whether he is ahead or behind: St. Therese's rose, St.
Benedict's medal, St. Scholastica's dove, St. Peter's keys, St. Augustine's
burning heart, and so on. It follows him wherever he is, always faster than
he is, and when it finds him he tumbles, loses his tricks and his surge, and
is a long while getting up. One relic is hidden in each mansion, on the
highest road of clouds and just out of reach without a jump; it gives the
shot back.

**Freestyle** (from the title): no demon and no door, only the way, built
on ahead for as long as the saint runs. It is mostly the biggest throws,
the heavens and loops. Every 16,000 paces the sky changes to another
mansion's colours and song. The pause screen ends the run and shows the
style, the distance and the best of each.

**Race your Guardian Angel** (from the title): any mansion, against your
guardian angel instead of its demon. He runs by the same rules, but paces
himself to your own best time there: the game keeps where you were every
quarter second of your best run, and he follows it. Beat your best and he
gets faster too. Afterwards he says what he saw. After a loss he gives hints
from the run ("You crashed 4 times. Pay attention to the bar over your
head..."). After a win he praises the best of it: your biggest combo, perfect
landings, no crashes. Either way he suggests two combos you have not landed
yet. You may throw your gift at him. He notices, he says so, and he brings
it up again afterwards.

**Speed** (from the title): SLOW MO, MEDIUM or TURBO. Turbo is the game as
it was made. The slower speeds slow the whole world, so there is more time in
the air to put combos together. The race clock runs with the world, so a
time is a time at any speed.

**Running and surging.** The saint runs alone, always. Tap anywhere to jump
(keep your finger down to float, rise, skim or jump again, as each saint
does). In the air, a pad of four arrows comes up at the bottom right: tap
the arrows for tricks (a finger can slide from one to the next), and → on
its own is the quick trick. Arrow keys and the space bar work too. Running
only gets a saint so far. Every trick landed on his feet sets
off a surge: his feet become a wheel and he flies along, faster for more and
harder tricks and for a perfect landing, and then, little by little, he is
running again. The surge is the only way to go faster than a run. Land
again while still surging and the surges stack, shown as six flames at
the top right: a one-arrow move lights none, a flip one, and a great trick
(the Sign of the Cross, the Thurible, the triple flip, the saint's own
trick, the Te Deum) two, at most three in one landing. Each flame past the
first adds speed, and the surges' time adds up. A crash, or being hit by the saint's shot, loses the whole stack. The same rule holds for the demons.

**The way.** Great ramps throw the saint high, and the greatest, Jacob's
Ladder (Genesis 28:12), stands with angels going up and down it. The ground
has few obstacles and no gaps to fall into anywhere. Every loop throws the saint out faster than he went in
(a quarter again, and a push), and runs on into a ramp that throws him up
to the clouds. The clouds are all good: long roads with nothing on them but
neumes, where a surge and its stack never run down and a trick landed too
soon only bounces. Ramps of cloud throw him up to a second road and
sometimes a third, and at the very top the Gate of Heaven (Genesis 28:17)
gives the longest air in the game, for the biggest combos. As
he climbs, the country behind sinks away below. Columns of
wind, the breath of the Spirit (John 3:8), lift him and hold him up. There
are loops small and large, rails to grind, springs up to roads of cloud, and
two gifts: a mighty wind (Acts 2:2), lighter in the air, and tongues of fire
(Acts 2:3), tricks counting double. The camera pulls back in big air so the
ground stays in sight, and a ring marks where he will come down.

**Tricks.** Every trick has its own movement. The saint is drawn from
jointed parts whose arms and legs swing and stretch, longer than life when
the move looks better for it. The front flip is a tight tuck; the back flip
is laid out with arms flung back; the barrel roll is spread like an X;
prostration is a plank, the Superman; the double flip ends with a kick;
the double back flip is a split kick; the Sign of the Cross is a Christ Air;
the Thurible swings the censer round at full stretch while the legs
scissor; each saint's own trick is a Rocket Air with the saint's treasure
held high; and the Te Deum is everything at once. In the air, tap the right
side for each saint's quick flourish, holding up what that saint carries
(St. Benedict raises his medal, St. Therese throws a handful of rose petals out ahead of her, St. Peter the keys,
St. Lucy her lamp; St. Maurus grabs his board), or tap the arrows for
the others: a single ↑ is the Leap of Joy (a star jump), a single ↓ a
genuflection in the air, a single ← a heel click, all quick, for short jumps (keep the arrow held down
and the move is held, worth more the longer it lasts;
let go before landing, or it is a crash); ↑↑ front flip, ↓↓ back flip, ↓↑ barrel roll, →→ prostration,
↑↑↑ double flip, ↓↓↓ double back flip, ↑↓←→ the Sign of the Cross (drawn in
light on the sky), ↓↑↓↑ the Thurible (swung like the censer at Vespers, with
incense), ↓↓↑↑← each saint's own trick (which drives the demon back), ↑↑↑↑
triple flip, and ↑↑↓↓→→ the Te Deum. The flourish and the two flips are known
from the start; each demon beaten teaches the next, and a new trick is shown
in slow motion the first time there is air enough for it. A bar over the
saint's head shows how long until he lands, green when there is time for the
tricks he has asked for. As on a skate ramp, each trick's name and points go
by at the foot of the screen, a combo of tricks (and grinds between them) is
paid times the number of tricks when he lands, the same trick done again too
soon is worth less, and landing before a trick is finished is a crash that
loses the combo and the surge, except on clouds, which bounce him up for
another try. Big chains are hailed in Latin: Bene, Optime, Gloria,
Alleluia, Hosanna, and the saint sings out the word in a little voice of
his own, high or low. Each saint cries out at his own trick ("Vade retro!",
"Tolle, lege!", "Tu es Petrus!", "Viriditas!", "Lux!"). The demon growls
his taunts. Harder tricks make a faster and a longer surge. Moves flow into one another: an
arrow that, added to the moves just done, makes the start of a longer
trick turns them into that trick, carrying on from where they were (↑, a
breath, ↑ is a front flip; one more ↑ makes it a double, one more a
triple), so long tricks need not be tapped all at once.

**The book of combos.** Every chain of two or more tricks landed is written
down in order, with how many times it has been landed and its best score.
The records are kept too: the longest chain ever and the best combo ever.
A new combo, or a new record, is announced the moment it is landed, and the
end of each race counts the new combos found. The book is the COMBOS page of
the book of tricks. Between tricks, in plain flight, the saint jumps with
knees up and arms back, and comes down with arms out.

**The demon.** He runs the same way by the same rules: round the loops,
along the rails, off the ramps and up on the wind, doing tricks in the air
and surging when he lands them, crashing when he misjudges. Nothing helps
him when he is behind or holds him back when he is ahead. Each sin races in
character: Pride goes for the biggest trick and often overreaches (and
"Pride goeth before destruction", Proverbs 16:18), Sloth sometimes cannot be
bothered and now and then dozes off, Avarice snatches the neumes ahead of
the saint, Envy copies the saint's last trick, Gluttony crams in one trick
too many, Wrath is fast and reckless, and Lust, the last, is the steadiest of
all. He has plenty to say for himself. A bar at the top shows where both
are and who leads by how many paces; when he is off the screen his face
waits at its edge, smaller the further away he is. In testing, a saint who
only runs loses every race; one who does the basic tricks well beats the
first two demons; one who uses each new trick wins them all, some by only
a few paces.

At the end of each race comes a verse about running and striving, a
different one each time: a verse of victory for a win ("I have fought a
good fight", 2 Timothy 4:7; "I so run, not as at an uncertainty", 1
Corinthians 9:26), and a verse of encouragement for a loss ("The race is
not to the swift", Ecclesiastes 9:11; "A just man shall fall seven times,
and shall rise again", Proverbs 24:16).

**The music** is funk, made in the browser: a sampled drum kit with ghost
notes and swing, slap and synth bass, clavinet, chicken-scratch and wah
guitar, Rhodes and Hammond, disco strings, a gospel choir, a horn section and
a talk box. Walking, the saint hears only the drums; running, the bass comes
in, then the keys and guitars; surging, the horns and the tune. High in a big
jump the band goes muffled, as if heard from far above, and answers each
landed trick with a crash and a horn stab.

**The Novitiate** ("Ausculta": "Listen, O my son, to the precepts of thy
master", Rule of St. Benedict, Prologue) is the first thing a new player
sees: the Novice Master teaches running, jumping, the flourish, the flips, the
surge, combos, clouds, rails, loops and the wind, one lesson at a time,
slowing time and showing the arrows to tap when a trick is wanted, and putting the
saint back to try again when it goes wrong. The book of tricks (from the
title or the pause screen) shows every trick done, which arrows make it, what it
is worth and when it is learned.
## Luminaries

A falling-block music puzzle in the spirit of Lumines, through all
thirty-eight Doctors of the Church. Blocks of four fall in, in two colours;
turn them and move them so that four of one colour meet in a square. A line
of light sweeps the field in time with the music and takes away every square
it passes. Clear four or more in one sweep for a streak.

**Learn to Play** is a tutorial in eight short lessons (moving, turning,
dropping, making a square, the line of light, streaks, the light block, and
the Doctor's gift), played by the Lake of Annecy with St. Francis de Sales.

**The Pilgrimage** goes through the Doctors in the order of their deaths, from
St. Irenaeus (c. 202) to St. Thérèse (1897). Each Doctor is a stage with its
own colours, its own world behind the field, its own song and its own gift.
The stage changes in the middle of play, as in Lumines, with the next song
starting on the downbeat.

It comes in three difficulties. In each, the blocks speed up along one smooth
curve from the first Doctor to the last, so Continue picks up at the same pace
where you left off:
- **Easy**: 0.7 rows a second at the start, 1.6 at the end (a moderate pace).
- **Normal**: 0.9 to 2.6, which asks real skill by St. Thérèse.
- **Hard**: 1.2 to 3.8, fast at the end but still playable.

Normal and Hard open once the Pilgrimage has been finished at any difficulty.
Each difficulty keeps its own Continue.

**When you finish**, the Doctors speak to you from heaven, in panels
drawn like icons: each Doctor with a gold halo and a name-plate, in an
arched frame, over the world of their own stage. After Easy, Thérèse,
Augustine, Francis de Sales, Jerome and Teresa urge you on to Normal. After
Normal, Thomas, Catherine, Hildegard, John of the Cross and Athanasius send you
on to Hard. After Hard, Gregory the Great, Bede, Anselm, Bernard and Newman
send you home. Their words are written for the game, in their spirit, and are
not quotations. The scene can be watched again from the Pilgrimage page.

**Single Stage** plays one Doctor for as long as you last, at the pace of that
point in the Pilgrimage, at any difficulty you have opened. Each Doctor's
stage opens here once you have passed it in the Pilgrimage.

**Master** is five zones, fast from the first block and with no gifts: clear
each zone's squares before its time runs out, and finish all five to be named
*Doctor Optime*. It opens once the Pilgrimage has been finished.

**Reset Progress** on the title screen erases saved progress (tap it twice).

**The Doctor's gift.** Clearing squares fills a gift (✦). The small (i) beside
it pauses the game and explains what this Doctor's gift does. Each Doctor gives
one of these, named for that Doctor (*Tolle, lege*; *Viriditas*; *Summa*;
*Contra Mundum*; *The Cell*; *Kindly Light*; and so on):
- the next blocks come in one colour;
- every lonely block turns to the other colour;
- the next block (or two) carries a light that takes its whole colour;
- the blocks fall at half speed for thirty seconds;
- the blocks hang still for twenty seconds;
- the line of light waits eight beats while you build;
- the lowest row, or the top two blocks of every column, are struck away;
- every square on the field is taken at once;
- roses take up the top blocks of the tallest columns.

**The songs.** Every Doctor has a song in a modern style chosen for that
Doctor: soul-funk for St. Irenaeus, swing jazz-funk for St. Hilary, a key that
climbs at each of St. Athanasius's five exiles, dub for St. Cyril of
Jerusalem's mysteries, big-band gospel for St. John Chrysostom, the Doctors'
hymn *Iste Confessor* over a groove for St. Gregory the Great, chiptune for
St. Isidore, the eight tones in turn for St. John Damascene, a duduk for St.
Gregory of Narek, a scale that rises for ever for St. Anselm, a slow jam for
St. Bernard, *Summa Funkologica* for St. Thomas, a heartbeat for St.
Catherine, flamenco for St. John of Ávila, mandolins for St. Alphonsus, an
organ in the fog for St. John Henry Newman, and many more.

**The ticker.** The Doctors' words pass under the field at a reading pace:
376 quotations in all. Each one is copied from a public-domain translation
and cited (the Ante-Nicene and Nicene and Post-Nicene Fathers, Pusey,
Eales, Thorold, Deane, Allies, Sellar, the Stanbrook Benedictines, Grimm,
Lewis, Taylor and others), or newly translated from the Latin and marked
"tr. for Luminaries" (among them St. Peter Chrysologus, St. Isidore, St. Peter
Damian, St. Anthony, St. Bonaventure, St. Albert, St. Peter Canisius and St.
Lawrence of Brindisi). The chant melodies come from the public-domain chant
books, as transcribed at GregoBase.

**Controls.** On a phone, played sideways:
- Drag sideways to move.
- Tap to turn: the left half turns one way, the right half the other.
- Drag down to drop faster; flick down to drop at once.

There is no separate rules page: Learn to Play teaches everything.
- Tap ✦ for the gift.

On a keyboard:
- ← → move.
- ↑ or X turns; Z turns back.
- ↓ drops faster; Space drops at once.
- G or Shift uses the gift.
- P pauses; M switches the sound.

The music is synthesised live in the browser (`audio.js`). The band has drums,
FM keys, supersaw pads, plucks, a formant choir, and a mixing desk: reverb,
ping-pong delay, sidechain pumping from the kick, and a compressor and
limiter. Sounds from the game land on the song's grid.

## Canticle Mansion

A Benedictine monk explores a great house, and the lands about it, made of
the Canticle of Canticles (Douay-Rheims). Every verse is somewhere in the
world: carved over a door, gilded on a frieze, written across the sky,
pressed into sand, stitched into a curtain, lettered on a label, kindled in
light as he comes near, strung bead by bead on a chain of gold. Pause to read
the chapter as far as you have found it; finish a chapter to read it whole.

On a phone: hold the left quarter of the screen to walk back, the next
quarter to walk on, and tap anywhere on the right half to jump (hold for
higher). The round button at the lower right lifts and sets down, opens,
speaks, leaps off a wall, and dashes; its label says what it will do. Tap a
creature to throw holy water at it. On a keyboard: arrows or WASD to walk, Up,
W or Space to jump, Down, S or E for the button, X or J to throw, C or Shift
to dash, P to pause, M for sound.

The lilies are not kept by touching them: a lily follows at the monk's
shoulder until he brings it to the vase by the way onward. A blow sends it
home to where it grew. Keep every lily of a chapter and a page of the Fathers
on that chapter opens in the book: St. Bernard's Sermons on the Song of Songs
for the first three chapters (tr. S. J. Eales, 1895), St. John of the Cross's
A Spiritual Canticle for the rest (tr. D. Lewis, 1909 edition).

In about half the rooms, and always in the last of each chapter, a dark
figure stands in the shadows with the light along one edge of him. Come near
and he is gone, leaving a line of the Canticle behind; at the end of a
chapter he stays a breath longer.

In two rooms of most chapters something is set out of reach of the powers
found so far: a ledge too high (the sandals), a box of cracked stone in the
air (the helmet), a stair that cannot be seen (the lantern shows it), a tall
hanging pillar (the gloves), a little cedar hut (the seal's flame). In each
is a pomegranate ("thy plants are a paradise of pomegranates", 4:13); every
four found give one more heart.

The pause book has four pages: the verses found, the rooms of the chapter
(with what each still keeps), the Fathers, and help, where three easier ways
can be turned on at any time: no harm from blows, a slower game, and endless
leaps. Some chapters end with a moment of their own: the keepers of the city
come after the monk at the end of V, petals fall on the day of the king's
espousals at the end of III, and the young hart leads the way up the
mountains of spices at the very end.

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
cedar. Chapter II, "The Lily among Thorns", has ten rooms: lilies among thorns, the apple tree to climb, the cellar of wine with its verse set out in flowers, roes and harts leaping across a field, the mountains where the sandals of the roe let you leap again in the air, the lattice over the garden wall, the winter passing into spring, the clefts of the rock full of doves, the little foxes to catch before the vineyard gate opens, and the break of day. Chapter III, "By Night I Sought Him", has nine rooms: the dark bedchamber where the lantern waits on a high shelf, the streets and the broad ways with the watchmen walking them, the city gate they keep, my mother's house, the sleeping roes with the verse spelled in stars, a pillar of smoke of spices to ride up, the threescore valiant ones about the bed of Solomon, the litter of Solomon (pillars of silver, the seat of gold, the going-up of purple), and the king crowned on the day of his espousals. Chapter IV, "A Garden Enclosed", has eight rooms: Mount Galaad and its flocks, the river crossed on the backs of sheep come up from the washing, the scarlet lace to climb, the tower of David hung with a thousand bucklers, the mountain of myrrh and the hill of frankincense, the dens of the lions and the mountains of the leopards, the dropping honeycomb, and the garden enclosed, where the guardian angel waits beside a sealed fountain; once found, the angel follows you and turns blows aside, the fountain is unsealed and lifts you, and the north wind and the south wind blow. Chapter V, "My Heart Watcheth", has seven rooms: the feast in the garden, the night door with its keyhole and its bolt to open, the empty streets with their verse in the stars, the keepers of the walls (the helmet waits in their guardroom: one more heart, and cracked stone breaks when you jump into it), the daughters of Jerusalem, a colossal image of the beloved to climb from its bases of gold to its head of finest gold with each verse beside the part it tells of, and the crossroads where the daughters ask whither he is gone. Chapter VI, "Terrible as an Army", has seven rooms: the bed of spices with its verse in flowers, the army in its ranks and banners, the flock from the washing, the threescore queens on their balconies with the one dove flying ahead to show the way, the climb through the clouds as the sky passes from dawn to moon to sun, the garden of nuts with walnuts dropping from the boughs, and the chariots of Aminadab, whose power is a dash (the round button) to carry you over chasms no jump can cross. Chapter VII, "The Palm Tree", has eight rooms: the companies of camps with the skilful workman's jewels, the heap of wheat set about with lilies and two young roes, the tower of ivory to climb above the fishpools of Hesebon, Carmel and the channels of the king's purple, the palm tree itself, whose gloves at its foot let you climb any wall you hold toward in the air, the best wine in the cellar, the field and the villages, and the gates where all fruits, new and old, are kept. Chapter VIII, "Love Is Strong as Death", has eight rooms: my mother's house with the cup of spiced wine, the desert by night with the charge to the daughters spelled in stars and the apple tree at its end, the seal upon the heart (with the seal, holy water burns as flame, and a cedar barricade it touches burns from board to board), the many waters that cannot quench charity, crossed on the floating goods of a house, the little sister and the wall like a tower, the vineyard of the peaceable with its verses laid out in pieces of silver, the gardens where the friends turn to hearken, and the flight of the roe and the young hart over the mountains of spices, where the Canticle ends.

The engine is new (`engine.js`): rooms joined by doors, tile physics with
stackable objects, lighting, and the verses lettered at full resolution
between the back wall and the figures. The text of the Canticle (`text.js`) is
the Douay-Rheims (Challoner) from the Lumina project, checked verse by verse
against drbo.org and eBible.org. The music is Psalter Runner's engine.

