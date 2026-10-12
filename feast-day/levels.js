import { C, W, H } from './config.js';
import { spawn } from './enemies.js';
// Levels are data. # ground, = platform (jump up through it), @ start, D refectory door (the end),
// s sweet, g gummy, p pizza, j jawbreaker, G gluttony demon, L lust demon.
// Props (decoration only, stand on the tile's floor): W well, F fountain, R roses, V lavender, U sundial, H beehive, B bench, M monk statue.
export const LEVELS = [{
  name: 'The Cloister Garden',
  rows: [
    '',
    '',
    '',
    '                                                                                     sss',
    '                                                                          p         =====',
    '                                                    p             s                                 L       p',
    '                                     s s                        ######                                           ss',
    '                                    =====                     ########        =====       =====                 ====',
    '                                                            ##########',
    '   @  W   s s s   R   g    V  s s U            g    B     ############  j    H      F             g     g       M       j   s s   G  R      V   D',
    '######################################     #############################################      ########################################################',
    '######################################     #############################################      ########################################################',
  ],
}];
export const PROPS = { W: 'well', F: 'fountain', R: 'roses', V: 'lavender', U: 'sundial', H: 'beehive', B: 'bench', M: 'statue' };
const ENEMY = { g: 'gummy', p: 'pizza', j: 'jawbreaker', G: 'gluttony', L: 'lust' };
// Draw terrain and make its bodies (one body per run of tiles); returns the level's size, start and door.
export function buildLevel(scene, lv) {
  const T = C.tile, rows = lv.rows, w = Math.max(...rows.map(r => r.length)) * T, h = rows.length * T;
  const at = (r, c) => (rows[r] || '')[c] || ' ';
  scene.layers = [ // far to near: each scrolls slower the farther it is; the sky also drifts on its own
    layer(scene, 'sky', 0, H, C.skyScroll, C.skyDrift, -3),
    layer(scene, 'abbey', h - 2 * T - C.abbeyH + C.abbeySink, C.abbeyH, C.abbeyScroll, 0, -2.5),
    layer(scene, 'arcade', h - 2 * T - C.archH + C.archSink, C.archH, C.archScroll, 0, -2),
  ];
  scene.under = scene.add.rectangle(0, 0, W, H * 2, C.underColor).setOrigin(0).setScrollFactor(0).setDepth(-2);
  const solid = scene.physics.add.staticGroup(), plats = scene.physics.add.staticGroup();
  const out = { w, h, solid, plats, spawns: [], solidAt: (x, y) => '#='.includes(at(Math.floor(y / T), Math.floor(x / T))) };
  rows.forEach((row, r) => {
    let run = -1;
    for (let c = 0; c <= row.length; c++) {
      const ch = at(r, c), x = c * T, y = r * T;
      if (ch === '#' && run < 0) run = c;
      if (ch !== '#' && run >= 0) { body(scene, solid, run * T, y, (c - run) * T, r === rows.length - 1 ? T + H : T); run = -1; }
      if (ch === '#') {
        tile(scene, x, y, groundFrame(at, r, c, rows.length));
        if (r === rows.length - 1) scene.add.tileSprite(x, y + T, T, H, 'tiles', edge(at, r, c, '#', 4, 6, 5))
          .setOrigin(0).setTileScale(T / C.tileArt).setDepth(-1); // deep earth below the last row
      } else if (ch === '=') {
        tile(scene, x, y, edge(at, r, c, '=', 8, 10, 9, 11));
        body(scene, plats, x, y, T, 6).body.checkCollision.down = false;
      } else if (ch === '@') out.start = { x: x + T / 2, y: y };
      else if (PROPS[ch]) scene.add.image(x + T / 2, y + T, PROPS[ch]).setOrigin(0.5, 1).setDepth(-1.5);
      else if (ch === 'D') out.door = scene.add.image(x + T / 2, y + T, 'door').setOrigin(0.5, 1).setDepth(-1);
      else if (ch !== ' ') out.spawns.push({ ch, x: x + T / 2, y: y + T / 2 });
    }
  });
  plats.getChildren().forEach(p => { p.body.checkCollision.left = p.body.checkCollision.right = false; });
  return out;
}
// Tileset frames: 0-3 grass top (left, middle, right, single), 4-7 soil (left, middle, right, hanging bottom),
// 8-11 stone ledge (left, middle, right, single).
const tile = (scene, x, y, f) => scene.add.image(x, y, 'tiles', f).setOrigin(0).setScale(C.tile / C.tileArt).setDepth(-1);
function edge(at, r, c, ch, left, right, mid, single = mid) {
  const l = at(r, c - 1) !== ch, rt = at(r, c + 1) !== ch;
  return l && rt ? single : l ? left : rt ? right : mid;
}
function groundFrame(at, r, c, n) {
  if (at(r - 1, c) !== '#') return edge(at, r, c, '#', 0, 2, 1, 3);
  if (r < n - 1 && at(r + 1, c) !== '#') return 7;
  return edge(at, r, c, '#', 4, 6, 5);
}
function layer(scene, key, y, hgt, f, drift, depth) {
  return { ts: scene.add.tileSprite(0, 0, W, hgt, key).setOrigin(0).setScrollFactor(0).setDepth(depth), y, f, drift, off: 0 };
}
// Called every frame: slide each layer by its own share of the camera's movement.
export function moveBackdrop(scene, dt) {
  const cam = scene.cameras.main;
  for (const L of scene.layers) {
    L.off += L.drift * dt;
    L.ts.tilePositionX = cam.scrollX * L.f + L.off;
    L.ts.y = L.y ? L.y - cam.scrollY : 0; // layers stay on the ground line vertically; the sky stays put
  }
  const arc = scene.layers[2].ts; // fill under the arcade so no sky shows in pits or below the ground
  scene.under.setPosition(0, arc.y + arc.height - 1);
}
function body(scene, group, x, y, w, h) {
  const r = scene.add.rectangle(x + w / 2, y + h / 2, w, h).setVisible(false);
  group.add(r); return r;
}
// Put the sweets and enemies (back) in place.
export function populate(things, lv) {
  things.clear(true, true);
  for (const s of lv.spawns) ENEMY[s.ch] ? spawn(things, ENEMY[s.ch], s.x, s.y) : things.create(s.x, s.y, 'sweet');
}
