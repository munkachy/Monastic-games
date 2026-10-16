"use strict";
// While You Have the Light: the gate of Gluttony's mountain. A scene of its own, before the
// mountain and apart from it (not on its map): outside, under the night sky and the moon, the foot
// of the mountain with a glutton's face carved in it, its mouth the door. He walks to it; at the
// mouth, up (or a tap on the mouth) takes him in, into the mountain's first room.

const GATE_K = 0.62;                                   // the face's scale on the screen
const Gate = {
  t: 0, x: 0, dir: 1, ph: 0, to: null, keys: {}, sc: null, onGo: null, back: null,
  // sc.seed: the mountain behind it (made now, a little each frame, while he stands here). onGo: in
  // at the mouth (else the scene sc, from the white room); back: the way back out (else the white room).
  open(sc, onGo, back) {
    sc = Object.assign({}, sc); if (!sc.seed) sc.seed = (Math.random() * 1e9) | 0;
    Object.assign(Gate, { t: 0, x: W * 0.1, dir: 1, ph: 0, to: null, keys: {}, sc, onGo: onGo || null, back: back || null });
    mode = Gate; Sound.flare(false); Sound.muffle(false); Sound.ambience({ wind: 0.6 });
  },
  door: () => W * 0.66, ground: () => H * 0.84,
  at: () => Math.abs(Gate.x - Gate.door()) < 120 * GATE_K,
  out() { if (Gate.back) Gate.back(); else Room.open(); },
  go() { ev("in at the mouth"); prepMountain(Gate.sc.seed); Sound.fx.whoosh(0.6); if (Gate.onGo) Gate.onGo(Gate.sc.seed); else Game.scene(Gate.sc); Climb.S.say = { text: "INTO THE MOUTH", sub: "The mountain of Gluttony.", t: 0 }; },
  step(dt) {
    Gate.t += dt; prepMountain(Gate.sc.seed, 1);
    const K = Gate.keys, l = K.ArrowLeft || K.KeyA, r = K.ArrowRight || K.KeyD;
    let d = l === r ? 0 : r ? 1 : -1;
    if (!d && Gate.to !== null) { if (Math.abs(Gate.to - Gate.x) < 4) Gate.to = null; else d = Math.sign(Gate.to - Gate.x); }
    if (d) { Gate.dir = d; Gate.x = clamp(Gate.x + d * WALK * dt, 18, W - 18); Gate.ph += dt * 0.9; }
    Gate.moving = !!d;
  },
  draw() {
    const D = Gate.door(), G = Gate.ground(), t = Gate.t;
    rect(0, 0, W, H, "#050506");
    drawGateScene(D, G, t);
    rect(0, G, W, H - G, C.ink); line(0, G + 0.5, W, G + 0.5, "rgba(255,179,71,0.18)", 1);
    // Him, with his torch, on the ground before it.
    const u = (Gate.ph % 1 + 1) % 1, p = Gate.moving ? MONK_ANIM.walk(u) : MONK_ANIM.idle((t * 0.4) % 1, t);
    const o = drawMonk(Gate.x, G, Gate.dir, p, { t }); glow(o.torch[0], o.torch[1], 60, C.flame, 0.35); drawFlame(o.torch[0], o.torch[1], 1, t * 1.4, { vx: 0 });
    if (Gate.at()) text(usingKeys() ? "↑  GO IN" : "TAP THE MOUTH TO GO IN", D, G + 24, { align: "center", size: 9, weight: 800, spacing: 3, color: "rgba(255,200,150,0.85)" });
    if (t < 4) { const a = clamp(Math.min(t / 0.8, (4 - t) / 0.8), 0, 1); text("THE MOUNTAIN OF GLUTTONY", W / 2, 34, { align: "center", font: FONT.title, size: 16, weight: 700, spacing: 5, color: "#fff", alpha: a }); }
    button("‹", 10, 10, 30, 26, () => Gate.out(), { size: 12 });
  },
  key(code, down) {
    Gate.keys[code] = down;
    if (!down) return;
    if ((code === "ArrowUp" || code === "KeyW" || code === "Space" || code === "Enter") && Gate.at()) Gate.go();
    if (code === "Escape") Gate.out();
  },
  down(p) {
    const D = Gate.door(), G = Gate.ground();
    if (Gate.at() && Math.abs(p.x - D) < 130 * GATE_K && p.y > G - 170 * GATE_K && p.y < G + 10) { Gate.go(); return; }
    Gate.to = clamp(p.x, 18, W - 18);
  },
};

// The scene: drawn in the game's way, layers of grey and black, after gluttony-gate-1.png. D: the
// door's middle on the screen; G: the ground's line.
function drawGateScene(D, G, t) {
  const cx = W, lay = (f) => (D - W / 2) * f;           // (how far a far layer stands off, by its depth)
  ctx.save(); ctx.beginPath(); ctx.rect(0, -10, cx, G + 12); ctx.clip();
  // The sky, darker going up.
  const sk = ctx.createLinearGradient(0, G - 700, 0, G); sk.addColorStop(0, "#08080a"); sk.addColorStop(0.55, "#1b1b1f"); sk.addColorStop(1, "#4a4a4c");
  ctx.fillStyle = sk; ctx.fillRect(0, -10, cx, G + 12);
  // The moon, far: it hardly moves.
  const mx = W * 0.2 + lay(0.1), my = G - 235;
  glow(mx, my, 160, "#d8d4c0", 0.18); glow(mx, my, 76, "#efe9d2", 0.35); circle(mx, my, 40, "#e6e1cb");
  for (const [u, v, r, a] of [[-14, -10, 11, 0.16], [12, 6, 8, 0.14], [-4, 18, 6, 0.12], [18, -16, 5, 0.12], [-22, 10, 4, 0.1]]) circle(mx + u, my + v, r, "rgba(120,114,96," + a + ")");
  // Cloud drifting over it.
  for (let q = 0; q < 6; q++) { const y = G - 360 + q * 34, x = ((t * (6 + q * 2) + q * 260) % (W + 600)) - 300 + lay(0.05); ctx.fillStyle = "rgba(12,12,14," + (0.35 + 0.08 * (q % 3)) + ")"; ctx.beginPath(); ctx.ellipse(x, y, 220 + q * 30, 16 + (q % 2) * 8, 0, 0, TAU); ctx.fill(); }
  // Far peaks in the mist, two ranks.
  for (const [f, col, hy, sd] of [[0.2, "rgba(120,120,122,0.55)", 190, 3], [0.4, "rgba(80,80,84,0.75)", 130, 7]]) {
    const o = -lay(f) * 0, pts = [-60, G];
    for (let x = -60; x <= cx + 60; x += 30) { const k = Math.floor((x - D * f) / 30), h = hy * (0.35 + 0.65 * Math.abs(Math.sin(k * 1.7 + sd) * Math.cos(k * 0.6 + sd))); pts.push(x, G - 20 - h); }
    pts.push(cx + 60, G); poly(pts, col); void o;
  }
  // (The mountain and its face drawn at the scale of the screen, so the whole face is seen.)
  ctx.save(); ctx.translate(D, G); ctx.scale(GATE_K, GATE_K); ctx.translate(-D, -G);
  // The mountain's foot: rising on the right, its slope lit a little by the moon on the left.
  const mt = ctx.createLinearGradient(D - 460, 0, D + 300, 0); mt.addColorStop(0, "#2a2826"); mt.addColorStop(0.4, "#1c1a19"); mt.addColorStop(1, "#121110");
  poly([D - 470, G, D - 360, G - 120, D - 280, G - 260, D - 210, G - 420, D - 120, G - 720, D + 600, G - 720, D + 600, G], mt);
  // The face. Its cheeks swollen either side; the brow heavy over it all.
  const stone = "#272421", deep = "#0f0e0d";
  ctx.fillStyle = stone; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(D + s * 150, G - 150, 125, 150, s * 0.12, 0, TAU); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(D, G - 250, 215, 150, 0, PI, TAU); ctx.fill();
  // Folds of fat at the jowls; cracks.
  ctx.strokeStyle = deep; ctx.lineWidth = 2.2;
  for (const s of [-1, 1]) for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.arc(D + s * (165 + q * 14), G - 120 + q * 6, 70 + q * 18, s > 0 ? PI * 0.55 : PI * 0.2, s > 0 ? PI * 0.8 : PI * 0.45); ctx.stroke(); }
  for (const [x0, y0, x1, y1] of [[-60, -360, -20, -320], [-20, -320, -40, -290], [70, -350, 110, -300], [-190, -220, -160, -170], [180, -230, 150, -190]]) line(D + x0, G + y0, D + x1, G + y1, deep, 1.6);
  // The brow: two heavy ridges, knotted down to the nose.
  for (const s of [-1, 1]) { poly([D + s * 18, G - 262, D + s * 60, G - 300, D + s * 150, G - 302, D + s * 205, G - 270, D + s * 150, G - 280, D + s * 60, G - 278], "#1a1816"); }
  // The eyes: slits under the brow, half shut.
  for (const s of [-1, 1]) { ctx.fillStyle = deep; ctx.beginPath(); ctx.ellipse(D + s * 100, G - 262, 46, 8, s * -0.08, 0, TAU); ctx.fill(); }
  // The nose: a bridge down from the brow, a fat bulb, the nostrils.
  poly([D - 18, G - 262, D + 18, G - 262, D + 34, G - 205, D - 34, G - 205], "#2e2a26");
  ctx.fillStyle = "#332f2a"; ctx.beginPath(); ctx.ellipse(D, G - 200, 54, 36, 0, 0, TAU); ctx.fill();
  for (const s of [-1, 1]) { ctx.fillStyle = deep; ctx.beginPath(); ctx.ellipse(D + s * 24, G - 186, 13, 8, s * 0.3, 0, TAU); ctx.fill(); }
  // The mouth, gaping: the door. Its lips; its upper teeth, blunt and worn; the dark of the throat
  // and the embers deep in it; the lower lip worn flat, a threshold.
  const mouth = new Path2D(); mouth.moveTo(D - 118, G); mouth.lineTo(D - 124, G - 96); mouth.quadraticCurveTo(D - 120, G - 158, D, G - 160); mouth.quadraticCurveTo(D + 120, G - 158, D + 124, G - 96); mouth.lineTo(D + 118, G); mouth.closePath();
  ctx.fillStyle = "#1f1c19"; ctx.save(); ctx.translate(0, -6); ctx.scale(1, 1); ctx.lineWidth = 16; ctx.strokeStyle = "#1f1c19"; ctx.stroke(mouth); ctx.restore();
  ctx.fillStyle = "#040304"; ctx.fill(mouth);
  const fl = 0.75 + 0.25 * Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1);
  ctx.save(); ctx.clip(mouth); glow(D, G - 18, 110, "#c2410f", 0.45 * fl); glow(D + 6, G - 10, 46, "#ff7a2a", 0.5 * fl); glow(D - 10, G - 6, 18, "#ffc070", 0.55 * fl); ctx.restore();
  for (let q = 0; q < 9; q++) { const x = D - 108 + q * 24, h = 26 - Math.abs(q - 4) * 1.5; poly([x + 2, G - 154 + Math.abs(q - 4) * 2, x + 21, G - 154 + Math.abs(q - 4) * 2, x + 19, G - 154 + h, x + 4, G - 154 + h], "#5c564d"); line(x + 4, G - 154 + h, x + 19, G - 154 + h, "#2a2622", 1); }
  poly([D - 140, G + 2, D + 140, G + 2, D + 128, G - 18, D - 128, G - 18], "#3b3630"); for (let q = 0; q < 8; q++) line(D - 120 + q * 34, G - 18, D - 122 + q * 34, G - 4, "#26221e", 1);
  // Boulders in front, black.
  ctx.restore();
  for (const [x, w, h, k] of [[-560, 44, 110, 0.18], [-500, 26, 34, 0], [-420, 22, 22, 0], [-250, 30, 18, 0], [250, 36, 26, 0], [330, 22, 16, 0]]) poly([D + x - w / 2, G, D + x - w / 2 + k * w, G - h, D + x + w / 2, G - h * 0.8, D + x + w / 2 + 4, G], "#060606");
  ctx.restore();
}
