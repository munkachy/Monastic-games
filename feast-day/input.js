import { W, H } from './config.js';
// Left half walks (outer = left, inner = right); right half jumps; round button acts.
export const ACT = { x: W - 40, y: H - 40, r: 26 };
const SPLIT = W * 0.25;
export function makeInput(scene) {
  scene.input.addPointer(2);
  const k = scene.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,Z,X,SPACE');
  const s = { left: false, down: false, right: false, jump: false, act: false, jumpPressed: false, actPressed: false };
  let pj = false, pa = false;
  s.update = () => {
    let l = k.LEFT.isDown, r = k.RIGHT.isDown, j = k.Z.isDown || k.UP.isDown || k.SPACE.isDown, a = k.X.isDown, d = k.DOWN.isDown;
    for (const p of scene.input.manager.pointers) {
      if (!p.isDown) continue;
      if (Math.hypot(p.x - ACT.x, p.y - ACT.y) < ACT.r + 10) a = true;
      else if (p.x >= W / 2) j = true;
      else if (p.x < SPLIT) l = true; else r = true;
    }
    Object.assign(s, { left: l, right: r, down: d, jump: j, act: a, jumpPressed: j && !pj, actPressed: a && !pa });
    pj = j; pa = a;
  };
  return s;
}
