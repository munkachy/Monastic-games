import { C, W, H } from './config.js';
import { spawn } from './enemies.js';
// Levels are data. # ground, = platform (jump up through it), @ start, D refectory door (the end),
// s sweet, g gummy, p pizza, j jawbreaker, G gluttony demon, L lust demon.
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
    '   @      s s s       g       s s              g          ############  j                         g     g               j   s s   G             D',
    '######################################     #############################################      ########################################################',
    '######################################     #############################################      ########################################################',
  ],
}];
const ENEMY = { g: 'gummy', p: 'pizza', j: 'jawbreaker', G: 'gluttony', L: 'lust' };
// Draw terrain and make its bodies (one body per run of tiles); returns the level's size, start and door.
export function buildLevel(scene, lv) {
  const T = C.tile, rows = lv.rows, w = Math.max(...rows.map(r => r.length)) * T, h = rows.length * T;
  const at = (r, c) => (rows[r] || '')[c] || ' ';
  scene.sky = scene.add.tileSprite(0, 0, W, H, 'sky').setOrigin(0).setScrollFactor(0).setDepth(-3); // play.js drifts it
  scene.add.tileSprite(0, h - C.archH, w / C.archScroll + W, C.archH, 'arch').setOrigin(0).setScrollFactor(C.archScroll).setDepth(-2);
  const g = scene.add.graphics().setDepth(-1), solid = scene.physics.add.staticGroup(), plats = scene.physics.add.staticGroup();
  const out = { w, h, solid, plats, spawns: [] };
  rows.forEach((row, r) => {
    let run = -1;
    for (let c = 0; c <= row.length; c++) {
      const ch = at(r, c), x = c * T, y = r * T;
      if (ch === '#' && run < 0) run = c;
      if (ch !== '#' && run >= 0) { body(scene, solid, run * T, y, (c - run) * T, r === rows.length - 1 ? T + H : T); run = -1; }
      if (ch === '#') {
        g.fillStyle(0x7a5a3a).fillRect(x, y, T, r === rows.length - 1 ? T + H : T); // earth, deep under the last row
        if (at(r - 1, c) !== '#') g.fillStyle(0x6b8f4e).fillRect(x, y, T, 5).fillStyle(0x86ab5f).fillRect(x, y, T, 2);
      } else if (ch === '=') {
        g.fillStyle(0xb9a27c).fillRect(x, y, T, 6).fillStyle(0x8c7656).fillRect(x, y + 6, T, 2);
        body(scene, plats, x, y, T, 6).body.checkCollision.down = false;
      } else if (ch === '@') out.start = { x: x + T / 2, y: y };
      else if (ch === 'D') out.door = scene.add.image(x + T / 2, y + T, 'door').setOrigin(0.5, 1).setDepth(-1);
      else if (ch !== ' ') out.spawns.push({ ch, x: x + T / 2, y: y + T / 2 });
    }
  });
  plats.getChildren().forEach(p => { p.body.checkCollision.left = p.body.checkCollision.right = false; });
  return out;
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
