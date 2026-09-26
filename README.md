# Monastic Games

Small browser games with a monastic theme. Each game lives in its own folder
and runs as plain HTML and JavaScript, with no build step, so GitHub Pages can
serve the whole repo as-is.

| Game | Folder | What it is |
| --- | --- | --- |
| Nisi Dominus | `nisi-dominus/` | Physics stacking game in the style of 99 Bricks |

## Playing locally

Open a terminal in this folder and run `npx serve .`, then open the address it prints.

## Publishing with GitHub Pages

Settings → Pages → Build and deployment → Source: *Deploy from a branch*,
branch `main`, folder `/ (root)`. The games then appear at
`https://<your-username>.github.io/Monastic-games/`.

## Nisi Dominus: changing the art

All art is in `nisi-dominus/art.js`, drawn as grids of characters. Open
`nisi-dominus/art.html` to see every sprite enlarged. To use a PNG in place of a
sprite, put it in `nisi-dominus/img/` and list it in `IMAGE_OVERRIDES` at the
end of `art.js`.

The physics engine is [Matter.js](https://github.com/liabru/matter-js)
(MIT license), included in `nisi-dominus/lib/`.
