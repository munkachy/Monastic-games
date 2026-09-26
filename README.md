# Monastic Games

Small browser games with a monastic theme. Each game lives in its own folder
and runs as plain HTML and JavaScript, with no build step, so GitHub Pages can
serve the whole repo as-is.

| Game | Folder | What it is |
| --- | --- | --- |
| Benedictine Bricks | `benedictine-bricks/` | Physics tower builder in the style of 99 Bricks Wizard Academy, built on seven real Benedictine monasteries |

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
