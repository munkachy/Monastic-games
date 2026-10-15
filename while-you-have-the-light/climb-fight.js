"use strict";
// While You Have the Light, the climb (4 of 7): the weight of a blow, Avarice's gold, Gluttony's
// swallow, slime and grease, Wrath's rock that gives way, and his blows and the boulders in his hands.

// ---- The weight of a blow ----------------------------------------------------------------------------
// Where a blow lands: the world holds still a moment (longer, the harder the blow); a flash, and
// rays burst from the place it struck; the one struck is squashed along the blow; and the view
// shakes and is knocked a little the blow's way.
function impact(f, kx, ky, power, x, y) {
  impactAt(x === undefined ? f.x - (sign(f.x - S.x) || 1) * f.hw * 0.6 : x, y === undefined ? f.y - f.ht * 0.55 : y, kx, ky, power, f);
}
function impactAt(x, y, kx, ky, power, f) {
  S.freeze = Math.max(S.freeze || 0, Math.min(0.11, 0.03 + 0.03 * power));
  S.shake = Math.max(S.shake, 0.06 + 0.06 * power);
  const l = Math.hypot(kx, ky) || 1; S.kick = { x: kx / l * 3.5 * power, y: ky / l * 3.5 * power, t: 0 };
  if (f) { f.squash = 1; f.squashA = Math.atan2(ky, kx); }
  S.parts.push({ kind: "impact", x, y, vx: 0, vy: 0, a: Math.atan2(ky, kx), s: power, c: f && SINS[f.sin] ? SINS[f.sin].light : "#fff2d0", life: 0.22, age: 0, real: true });
}
// A blow to the idol: it shakes, and chips fly; its worshippers flee. The third, and it falls.
function hitIdol(f, dmg, kx) {
  if (f.st !== "idle") return false;
  f.hp -= dmg; f.hurtT = 0.3; f.showHp = 2.5; S.shake = Math.max(S.shake, 0.12);
  Sound.fx.crack(panX(f.x));
  for (let q = 0; q < 7; q++) S.parts.push({ kind: "chip", x: f.x + (Math.random() - 0.5) * 12, y: f.y - 18 - Math.random() * 20, vx: (Math.random() - 0.5) * 200, vy: -60 - Math.random() * 160, life: 0.6, age: 0 });
  scatter(f);
  if (f.hp <= 0) {
    setSt(f, "topple"); f.fall = sign(kx) || (f.x > S.x ? 1 : -1); gain(0.2);
    // Its worshippers are free of it: they will go down to the monastery (not from the white room).
    if (f.whoKinds && f.whoKinds.length && !(NOV && NOV.room)) {
      for (const k of f.whoKinds) S.freedList.push([f.sin, k]);
      ev("worshippers freed", { n: f.whoKinds.length });
      if (!save.seen.freedFolk) { save.seen.freedFolk = true; store(); tip("freedFolk", { text: "THEY ARE FREE", sub: "Those who worshipped it will go down to the monastery, and wait for you at its gate.", t: 0 }); }
      f.whoKinds = null;
    }
    // The idol thrown down, his torch is filled again: the light it was keeping comes to him.
    S.fuel = 1; const [mx, my] = middle();
    for (let k = 0; k < 26; k++) S.parts.push({ kind: "coinfly", x: f.x + (Math.random() - 0.5) * 24, y: f.y - Math.random() * f.ht, tx: mx, ty: my, vx: 0, vy: 0, life: 0.3 + k * 0.03, age: 0, real: true, light: true, quiet: true });
  }
  return true;
}
function scatter(f) {
  if (f.fled) return;
  f.fled = true; Sound.fx.scatter(panX(f.x));
  for (const w of f.who) { w.st = "run"; w.t = 0; w.dir = sign(w.x - f.x) || (Math.random() < 0.5 ? -1 : 1); w.sp = 75 + Math.random() * 40; w.vy = -110 - Math.random() * 60; w.y -= 1; }
}
// The shrine in time: its worshippers turning their heads to his light, or fleeing, and fading
// into the dark after a while; the idol, struck down, falling, and breaking in pieces.
function updIdol(f, dt) {
  if (f.st === "rise" && f.t > 0.9) setSt(f, "idle");
  for (const w of f.who) {
    if (w.st !== "run") continue;
    w.t += dt; w.ph += dt * 12;
    w.vx = w.dir * w.sp; w.vy += GRAV * dt;
    const [hx, hy] = moveBox(w, w.vx * dt, w.vy * dt, 6, 34);
    if (hx) { w.dir = -w.dir; w.vy = Math.min(w.vy, -140); }
    if (hy > 0) w.vy = 0;
    w.a = clamp(1 - (w.t - 2) / 28, 0, 1);
  }
  f.who = f.who.filter((w) => w.a > 0);
  if (f.st === "topple" && f.t > 0.45) {
    // Broken: three pieces of it, flung from where it fell.
    setSt(f, "broken"); Sound.fx.crumble(panX(f.x)); S.shake = 0.2;
    for (let q = 0; q < 3; q++) S.things.push({ kind: "stone", shard: f.sin, sid: f.id * 3 + q, x: f.x + f.fall * (8 + q * 10), y: f.y - 14 - q * 6, vx: f.fall * (40 + q * 50) + (Math.random() - 0.5) * 40, vy: -160 - Math.random() * 120, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8, st: "fly", by: null, g: 560, age: 0 });
    for (let q = 0; q < 12; q++) S.parts.push({ kind: "chip", big: q % 3 === 0, x: f.x + f.fall * 16 + (Math.random() - 0.5) * 20, y: f.y - 6, vx: (Math.random() - 0.5) * 240, vy: -40 - Math.random() * 200, life: 0.7, age: 0 });
    // In the seven mountains, a block out of it too: its own, the first time; after, whatever the demons brought it.
    if (NOV) { const out = f.blocks && f.blocks.length ? f.blocks.splice(0) : f.gave ? [] : [newBlock(f)]; f.gave = true; for (const b of out) reveal(b, f); }
  }
  if (f.st === "broken" && !f.who.length && dist(f.x, f.y, S.x, S.y) > 1600) f.st = "gone";
}
function populate(dt) {
  const hNow = -S.y / CELL;
  for (let n = 0; n < 200 && Number.isFinite(hNow); n++) { ensureSecs(S.popK); if (secs[S.popK].h0 > hNow + 30) break; placeFor(S.popK); S.popK++; }
  // In the novitiate, when all the demons of the place he is in are gone, others come.
  if (NOV && NOV.demons > 0) {
    const k = sectionAt(Math.max(1, Math.floor(hNow))).k;
    if (k < S.popK && !S.demons.some((f) => f.sec === k && !f.idol && f.st !== "gone")) { S.respawnT += dt; if (S.respawnT > 9) { S.respawnT = 0; placeFor(k, true); } } else S.respawnT = 0;
  }
}
function hurtDemon(f, dmg, kx, ky, how) {
  if (!alive(f)) return false;
  ev(f.idol ? "idol struck" : "demon struck", { sin: f.sin, dmg: r2(dmg), how: how || undefined, hpBefore: r2(f.hp) });
  if (f.idol) return hitIdol(f, dmg, kx);
  if (f.block) dropBlock(f, kx, ky);
  if (f.want && f.want.claim === f) f.want.claim = null; f.want = null;
  f.hp -= dmg; f.hurtT = 0.25; f.showHp = 2.5;
  if (S.pulled && S.pulled.f === f) { S.pulled = null; Sound.fx.tetherBreak(); }
  Sound.fx.demonHurt(f.sin, panX(f.x));
  const [cx, cy] = dMid(f);
  for (let k = 0; k < 8; k++) S.parts.push({ kind: "spark", c: SINS[f.sin].color, x: cx, y: cy, vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.5) * 220, life: 0.45, age: 0 });
  if (f.hp <= 0) { castOut(f); return true; }
  if (f.sin === "gluttony" && f.ground) {
    // Too heavy to throw: a blow that would send another flying only staggers it; a blow down fells it.
    if (how === "hurl" && ky > 300) setSt(f, "down"); else { setSt(f, "hurt"); f.vx = kx * 0.25; }
    return true;
  }
  if (how === "launch") { setSt(f, "air"); f.vx = kx; f.vy = ky; f.juggle = 0; }
  else if (how === "hurl") { setSt(f, "thrown"); f.vx = kx; f.vy = ky; }
  else if (f.st === "air" || f.st === "thrown" || f.st === "fall" || !f.ground) {
    setSt(f, "air"); f.vx = kx * 0.4; if (f.juggle < 4) f.vy = Math.min(f.vy, -240); f.juggle++;
  } else { setSt(f, "hurt"); f.vx = kx; }
  return true;
}
function castOut(f) {
  ev("cast out", { sin: f.sin });
  if (f.block) dropBlock(f, 0, -120);
  setSt(f, "dying"); Sound.fx.castOut(f.sin); S.fuel = Math.min(1, S.fuel + 0.12 + (f.loot || 0)); S.cast++; gain(0.25);
  if (f.loot) { const [mx, my] = middle(); for (let k = 0; k < 18; k++) S.parts.push({ kind: "coinfly", x: f.x + (Math.random() - 0.5) * 20, y: f.y - f.ht * 0.6, tx: mx, ty: my, vx: 0, vy: 0, life: 0.3 + k * 0.03, age: 0, real: true, light: true }); }
  const [cx, cy] = dMid(f);
  for (let k = 0; k < 26; k++) { const a = Math.random() * TAU, v = 40 + Math.random() * 160; S.parts.push({ kind: "spark", c: k % 3 ? SINS[f.sin].color : C.flameHot, x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.9, age: 0 }); }
}
function flyDemon(f, dt) {
  const n = clamp(Math.ceil(Math.max(Math.abs(f.vx), Math.abs(f.vy)) * dt / 6), 1, 10), h = dt / n;
  for (let k = 0; k < n; k++) {
    f.vy += (f.st === "thrown" && f.t < 0.25 ? 250 : 760) * h;
    const sp = Math.hypot(f.vx, f.vy), [hx, hy] = moveBox(f, f.vx * h, f.vy * h, f.hw, f.ht);
    // Into the briars: they tear it, and it springs back out of them.
    if ((hx || hy) && !(f.thornCd > S.rt)) {
      const px = hx ? f.x + hx * (f.hw + 3) : f.x, py = hy > 0 ? f.y + 3 : hy < 0 ? f.y - f.ht - 3 : f.y - f.ht / 2;
      if (thornAt(px, py)) { f.thornCd = S.rt + 0.6; briarHit(px, py); hurtDemon(f, 2, hx ? -hx * 160 : f.vx * 0.4, hy > 0 ? -320 : 80, "launch"); return; }
    }
    if ((hx || hy) && f.st === "thrown" && sp > 260) {
      // Into the rock, hard.
      Sound.fx.wallSlam(panX(f.x)); S.shake = 0.25; hurtDemon(f, 2, -sign(f.vx) * 60, -80); gain(0.06);
      if (alive(f)) setSt(f, hy > 0 ? "down" : "fall"); f.vx *= -0.25; if (hy < 0) f.vy = 60; if (hy > 0) { f.vy = 0; f.vx = 0; return; }
    } else { if (hx) f.vx *= -0.3; if (hy < 0) f.vy = 40; }
    if (hy > 0) {
      if (f.vy > 520 && alive(f)) hurtDemon(f, 1, 0, 0);
      f.vy = 0; f.vx = 0; if (alive(f)) setSt(f, "down"); return;
    }
    // Thrown into another of them: both hurt.
    if (f.st === "thrown") for (const g of S.demons) if (g !== f && alive(g) && Math.abs(g.x - f.x) < f.hw + g.hw && Math.abs(g.y - f.y) < Math.max(f.ht, g.ht)) {
      hurtDemon(g, 2, sign(f.vx) * 300, -260, "launch"); hurtDemon(f, 1, -sign(f.vx) * 80, -120); if (alive(f)) setSt(f, "fall"); f.vx *= -0.3;
      Sound.fx.wallSlam(panX(f.x)); gain(0.1); break;
    }
  }
}
function updDemon(f, dt) {
  f.t += dt; f.hurtT = Math.max(0, f.hurtT - dt); f.showHp = Math.max(0, f.showHp - dt); f.squash = Math.max(0, (f.squash || 0) - dt / 0.16);
  if (f.st === "gone") return;
  if (f.st === "dying") { if (f.t > 0.8) f.st = "gone"; return; }
  if (f.idol) { updIdol(f, dt); return; }
  if (f.st === "legs") return;                       // (on his legs: it goes where he goes)
  if (f.st === "emerge") { if (f.t > 0.9) setSt(f, "idle"); return; }
  if (f.st === "seize" || f.st === "carry") { floatDemon(f, dt); return; }
  if (f.st === "air" || f.st === "thrown" || f.st === "fall") { flyDemon(f, dt); return; }
  if (dist(f.x, f.y, S.x, S.y) > 760) return;
  f.ground = boxAt(f.x, f.y + 1, f.hw, f.ht);
  if (!f.ground) { setSt(f, "fall"); return; }
  if (f.vx) { moveBox(f, f.vx * dt, 0, f.hw, f.ht); f.vx *= Math.pow(0.01, dt); if (Math.abs(f.vx) < 6) f.vx = 0; }
  // Standing in briars (thrown there, say): they hurt it, and it springs out of them.
  if (thornAt(f.x, f.y + 2) && !(f.thornCd > S.rt)) { f.thornCd = S.rt + 0.6; f.y -= 2; hurtDemon(f, 1, (sign(f.vx) || f.dir) * 120, -300, "launch"); briarHit(f.x, f.y); return; }
  if ((f.st === "idle" || f.st === "walk" || f.st === "creep") && seekBlock(f)) return;
  const [mx, my] = middle(), [cx, cy] = dMid(f), sees = !S.dying && dist(mx, my, cx, cy) < (f.sin === "lust" ? 430 : 380) && los(cx, cy - 10, mx, my - 6);
  if (f.sin === "gluttony") stepGluttony(f, dt, mx, my, sees); else if (f.sin === "lust") stepLust(f, dt, mx, my, sees); else if (f.sin === "avarice") stepAvarice(f, dt, mx, my, sees); else stepWrath(f, dt, mx, my, sees);
}
// Pacing its platform while it waits.
function wander(f, dt, sp) {
  if (f.st === "idle" && f.t > 1.4) { setSt(f, "walk"); f.dir = f.x < (f.x0 + f.x1) / 2 ? 1 : -1; }
  if (f.st === "walk") {
    const [hx] = moveBox(f, f.dir * sp * dt, 0, f.hw, f.ht);
    if (hx || (f.dir > 0 ? f.x >= f.x1 : f.x <= f.x0) || !boxAt(f.x + f.dir * (f.hw + 2), f.y + 2, 2, 2) || f.t > 3) setSt(f, "idle");
  }
}
function stepWrath(f, dt, mx, my, sees) {
  switch (f.st) {
    case "idle": case "walk":
      f.cd -= dt;
      if (sees) { f.dir = mx < f.x ? -1 : 1; if (f.st === "walk") setSt(f, "idle"); if (f.cd <= 0) { setSt(f, "pickup"); Sound.fx.kindle(0.5, panX(f.x)); } break; }
      wander(f, dt, 26); break;
    case "pickup": f.dir = mx < f.x ? -1 : 1; if (f.t > 0.7) setSt(f, "windup"); break;      // the fire kindling over its head
    case "windup": f.dir = mx < f.x ? -1 : 1; if (f.t > 0.55) setSt(f, "throw"); break;
    case "throw": if (!f.thrown && f.t > 0.16) { f.thrown = true; throwFire(f); } if (f.t > 0.42) { setSt(f, "idle"); f.cd = 2.4 + Math.random() * 1.4; } break;
    case "hurt": if (f.t > 0.38) setSt(f, "idle"); break;
    case "down": if (f.t > 0.9) setSt(f, "getUp"); break;
    case "getUp": if (f.t > 0.5) setSt(f, "idle"); break;
  }
}
// ---- Avarice's gold -------------------------------------------------------------------------------
// Coins flung at him stick to his habit, and weigh on him: up the rope and the rock he goes slower,
// his swing sags, he falls harder; with enough, he hardly climbs at all. Given away (in the boxes
// for alms), each is light again in his torch: "alms deliver from death" (Tobit 12:9).
const COINS_MAX = 9, COIN_V = 255, ALMS_LIGHT = 0.07;
// (A block on his rope weighs as much as four of them.)
const heavy = () => Math.min(COINS_MAX, (S.coins || 0) + (S.tied ? BLOCK_LOAD : 0) + (S && S.legsIn ? 3 : 0)) / COINS_MAX;
// And his blows are weaker for it: with nine coins on him, two-thirds as hard, and shorter.
function blowTo(f, dmg, kx, ky, how, move) {
  const w = 1 - 0.35 * heavy(), k = 0.3 + 0.7 * w, c = move && alive(f) ? comboHit(move, f) : 1;
  return hurtDemon(f, dmg * w * c, kx * k, ky * k, how);
}
// A run of blows (as the fighting games keep them): every blow that lands counts, and the run holds
// while the next comes within COMBO_GAP; a blow that reaches him breaks it. His blows are stronger
// by it: the second x1.5, the third and after x2. But the same blow over again is worth less each
// time (x0.6, then x0.36, down to a quarter), until he uses another. And as a run goes on with
// fresh blows, it earns a name, word on word, to the last: "If you will, you can become all
// flame" (Abba Joseph, in the Sayings of the Desert Fathers).
const COMBO_GAP = 2.5, RANKS = [[3, "WATCHFUL"], [6, "FERVENT"], [10, "ZEALOUS"], [15, "AFLAME"], [21, "ALL FLAME"]];
const comboOn = () => !!S.combo && !S.combo.broke && S.rt - S.combo.t < COMBO_GAP;
function comboHit(move, f) {
  if (!comboOn()) S.combo = { n: 0, pts: 0, last: null, rep: 0, t: S.rt, rank: -1, rankT: -9 };
  const C = S.combo;
  C.rep = C.last === move ? C.rep + 1 : 0; C.last = move; C.n++; C.t = S.rt;
  // (Three blows unlike each other in a row, the third one that has a crowned form: crowned. Then
  // three more for the next.)
  C.set = (C.set || []).concat(move).slice(-3);
  if (C.set.length === 3 && new Set(C.set).size === 3 && CROWNED[move]) C.set = [];
  const fresh = Math.max(0.25, Math.pow(0.6, C.rep)), k = (C.n >= 3 ? 2 : C.n === 2 ? 1.5 : 1) * fresh;
  C.pts += fresh; C.k = k;
  let r = -1; RANKS.forEach(([p], i) => { if (C.pts >= p) r = i; });
  if (r > C.rank) { C.rank = r; C.rankT = S.rt; Sound.fx.kindle(0.5 + 0.12 * r, 0); }
  ev("combo", { move, n: C.n, k: r2(k) });
  return k;
}
// The crowned blows: the name each is given (from the Scriptures and the liturgy), and its English.
const CROWNED = { uppercut: ["SURSUM CORDA", "Lift up your hearts"], slam: ["DEPOSUIT", "He hath put down the mighty from their seat"] }, CROWN_SPIN = 0.55;
function wouldCrown(move) { if (!CROWNED[move]) return false; const set = (comboOn() && S.combo.set ? S.combo.set : []).concat(move).slice(-3); return set.length === 3 && new Set(set).size === 3; }
function crownFX(move, f) {
  S.crownShow = { name: CROWNED[move][0], sub: CROWNED[move][1], t: S.rt };
  S.slowT = 0.32; S.whiteT = Math.max(S.whiteT || 0, 0.06); Sound.fx.crown(panX(f.x)); ev("a crowned blow", { move });
}
// Its name, high in the middle, for a moment.
function drawCrown() {
  const D = S.crownShow, u = (S.rt - D.t) / 1.6; if (u >= 1) { S.crownShow = null; return; }
  const a = clamp(u / 0.06, 0, 1) * clamp((1 - u) / 0.35, 0, 1), z = 1 + 0.25 * Math.max(0, 1 - u / 0.12);
  text(D.name, W / 2, 48, { align: "center", font: FONT.title, size: 20 * z, weight: 700, spacing: 4, color: "#fff1c4", alpha: a, glow: "rgba(255,170,70,0.85)", blur: 14, max: W - 40 });
  text(D.sub, W / 2, 63, { align: "center", font: FONT.line, italic: true, size: 12, color: "#ffd9a0", alpha: a * 0.9, glow: "rgba(0,0,0,0.9)", blur: 6, max: W - 40 });
}
// Broken by a blow that reached him: "BROKEN", fading where the count was.
function breakCombo() { if (comboOn() && S.combo.n >= 2) { S.combo.broke = S.rt; ev("combo broken", { n: S.combo.n }); } else S.combo = null; }
// The run, at the right of the screen: how many blows, the bonus now, and its name.
function drawCombo() {
  const C = S.combo; if (!C || C.n < 2) return;
  const x = W - 18, y = 122, end = C.broke ? C.broke : C.t + COMBO_GAP, a = clamp(1 - (S.rt - end) / 0.7, 0, 1);
  if (a <= 0) { if (C.broke || S.rt - C.t > COMBO_GAP + 0.7) S.combo = null; return; }
  if (C.broke) { text("BROKEN", x, y + 4, { align: "right", font: FONT.title, size: 14, weight: 700, spacing: 2, color: "#ff8a7a", alpha: a, glow: "rgba(0,0,0,0.9)", blur: 6 }); return; }
  const pop = clamp(1 - (S.rt - C.t) / 0.18, 0, 1), live = S.rt - C.t < COMBO_GAP, fade = live ? 1 : a;
  text(String(C.n), x - 40, y, { align: "right", font: FONT.title, size: 22 + 6 * pop, weight: 700, color: "#fff3dc", alpha: fade, glow: "rgba(0,0,0,0.9)", blur: 8 });
  text("BLOWS", x - 40, y + 10, { align: "right", size: 6.5, weight: 800, spacing: 2, color: "rgba(233,230,223,0.75)", alpha: fade });
  text("\u00d7" + C.k.toFixed(1), x, y, { align: "right", font: FONT.title, size: 13, weight: 700, color: C.k >= 2 ? "#fff1b8" : C.k < 1 ? "#a9a49a" : "#e8c46a", alpha: fade, glow: "rgba(0,0,0,0.9)", blur: 6 });
  if (C.rank >= 0) {
    const up = clamp(1 - (S.rt - C.rankT) / 0.5, 0, 1);
    text(RANKS[C.rank][1], x, y + 27, { align: "right", font: FONT.title, size: 11 + 4 * up, weight: 700, spacing: 2, color: C.rank >= 3 ? "#ffd27a" : "#e9e6df", alpha: fade, glow: C.rank >= 3 ? "rgba(255,150,60,0.7)" : "rgba(0,0,0,0.9)", blur: 8 + 6 * up });
  }
  // (How long the run has left: a thin line that shortens.)
  if (live) rect(x - 70 * (1 - (S.rt - C.t) / COMBO_GAP), y + 33, 70 * (1 - (S.rt - C.t) / COMBO_GAP), 1.5, "rgba(255,210,140," + (0.5 * fade) + ")");
}
function throwCoins(f) {
  // (Thrown to come down on him: in the time the throw takes, the fall the coins make allowed for.)
  const hx = f.x + f.dir * 8, hy = f.y - f.ht + 6, [tx, ty] = middle(), T = Math.max(0.35, dist(hx, hy, tx, ty) / COIN_V), g = 330;
  const vx = (tx - hx) / T, vy = (ty - hy) / T - 0.5 * g * T;
  for (const da of [-0.12, 0, 0.12]) { const c = Math.cos(da), sn = Math.sin(da); S.things.push({ kind: "coin", x: hx, y: hy, vx: vx * c - vy * sn, vy: vx * sn + vy * c, rot: 0, vr: 0, st: "fly", by: "demon", g, age: 0, life: 5, r: 4, from: f }); }
  Sound.fx.coin(panX(f.x), 1);
}
// A coin strikes him: it clings to him.
function coinSticks(o) {
  S.coins = Math.min(COINS_MAX, S.coins + 1); o.st = "gone"; if (S.mark === o) S.mark = null;
  Sound.fx.coin(panX(o.x), 0.7);
  for (let k = 0; k < 5; k++) S.parts.push({ kind: "spark", c: SINS.avarice.color, x: o.x, y: o.y, vx: (Math.random() - 0.5) * 80, vy: -30 - Math.random() * 60, life: 0.4, age: 0 });
}
// At a box for alms, all the gold on him given: coin after coin into it, and light in his torch.
function giveAlms(b) {
  const n = S.coins; if (!n) return;
  S.coins = 0; S.fuel = Math.min(1, S.fuel + n * ALMS_LIGHT); S.whiteT = 0.1; Sound.fx.alms(panX(b.x), n);
  const [mx, my] = middle();
  for (let k = 0; k < n; k++) S.parts.push({ kind: "coinfly", x: mx + (Math.random() - 0.5) * 10, y: my + (Math.random() - 0.5) * 16, tx: b.x, ty: b.y - 6, vx: 0, vy: 0, life: 0.35 + k * 0.06, age: 0, real: true });
  S.parts.push({ kind: "ring", x: mx, y: my, vx: 0, vy: 0, life: 0.5, age: 0 });
}
// Avarice: a thief, low and quick, with its sack. From off, it flings coins at him out of the sack;
// near on its own ground, it creeps to him and snatches the light of his torch into the sack (the
// sack glows with it), and runs off with it. Cast out, its sack bursts, and the light comes back.
function stepAvarice(f, dt, mx, my, sees) {
  const dx = S.x - f.x, near = Math.abs(dx) < 130 && Math.abs(S.y - f.y) < 70, reach = dist(S.x, S.y - HT / 2, f.x, f.y - f.ht / 2) < f.hw + HW + 26;
  const ahead = (d) => boxAt(f.x + d * (f.hw + 3), f.y + 2, 2, 2);          // ground before it
  switch (f.st) {
    case "idle": case "walk":
      f.cd -= dt;
      if (sees) {
        f.dir = mx < f.x ? -1 : 1;
        if ((near || reach) && f.cd < 1 && !S.dying) { setSt(f, reach ? "snatch" : "creep"); break; }
        if (f.st === "walk") setSt(f, "idle");
        if (f.cd <= 0) setSt(f, "windup");
        break;
      }
      wander(f, dt, 24); break;
    case "creep": {
      // To him along its ground (waiting at its edge if it can go no further), and as he comes
      // within its reach (swinging by, it may be), it snatches.
      f.dir = sign(dx) || f.dir;
      if (reach) { setSt(f, "snatch"); break; }
      if (!near || f.t > 3) { setSt(f, "idle"); f.cd = 0.8; break; }
      if (ahead(f.dir)) moveBox(f, f.dir * 72 * dt, 0, f.hw, f.ht);
      break;
    }
    case "snatch":
      if (!f.thrown && f.t > 0.16) { f.thrown = true; snatchLight(f); }
      if (f.t > 0.4) { setSt(f, "flee"); f.dir = -(sign(dx) || f.dir); }
      break;
    case "flee": { const [hx] = moveBox(f, f.dir * 100 * dt, 0, f.hw, f.ht); if (hx || f.t > 1.5 || !ahead(f.dir)) { setSt(f, "idle"); f.cd = 1.4 + Math.random(); } break; }
    case "windup": f.dir = mx < f.x ? -1 : 1; if (f.t > 0.5) setSt(f, "throw"); break;
    case "throw": if (!f.thrown && f.t > 0.16) { f.thrown = true; throwCoins(f); } if (f.t > 0.42) { setSt(f, "idle"); f.cd = 2 + Math.random() * 1.3; } break;
    case "hurt": if (f.t > 0.38) setSt(f, "idle"); break;
    case "down": if (f.t > 0.9) setSt(f, "getUp"); break;
    case "getUp": if (f.t > 0.5) setSt(f, "idle"); break;
  }
}
function snatchLight(f) {
  const [mx, my] = middle(); if (dist(mx, my, f.x, f.y - f.ht / 2) > f.hw + HW + 30 || S.dying || S.latched) return;
  if (S.ward) { spendWard(); ev("ward turned the thief"); S.crosses.push({ kind: "turn", x: mx, y: my - 4, t: 0, size: 22 }); S.whiteT = 0.12; Sound.fx.parry(); setSt(f, "hurt"); return; }
  // A block on his rope: that, before his light. It cuts it from his belt and is off with it.
  if (S.tied) { const b = S.tied; S.tied = null; S.lost = b; S.dragging = false; carryOff(f, b); Sound.fx.steal(); Sound.fx.tetherBreak(); return; }
  const take = Math.max(0, Math.min(blowCost(0.09), S.fuel - 0.03));
  S.fuel -= take; f.loot = (f.loot || 0) + Math.max(take, 0.04); Sound.fx.steal(); S.shake = 0.12;
  for (let k = 0; k < 10; k++) S.parts.push({ kind: "spark", c: C.flameHot, x: S.torch[0], y: S.torch[1], vx: (f.x - S.torch[0]) * (2 + Math.random()) , vy: (f.y - f.ht * 0.6 - S.torch[1]) * (2 + Math.random()) - 40, life: 0.4, age: 0 });
}
// Lust: it waits on its bare ground. Far off, it throws thorns. Near, by turns, it throws a thorn,
// or casts its ribbon at him: the ribbon draws him to it through the air (off his line, into the
// briars, it may be), and if it brings him all the way, it strikes. A blow to it breaks the
// ribbon; so does his ward, if he has signed himself (and the ward is spent).
const PULL = 640, THORN_V = 215;
function stepLust(f, dt, mx, my, sees) {
  const d = dist(mx, my, f.x, f.y - f.ht / 2);
  switch (f.st) {
    case "idle": case "walk":
      f.cd -= dt;
      if (sees) {
        f.dir = mx < f.x ? -1 : 1; if (f.st === "walk") setSt(f, "idle");
        if (f.cd <= 0) {
          const close = d < 290;
          if (close && f.next === "ribbon" && !S.pulled) { f.next = "thorn"; setSt(f, "cast"); Sound.fx.ribbon(panX(f.x)); }
          else { f.next = close ? "ribbon" : f.next || "ribbon"; setSt(f, "windup"); }
        }
        break;
      }
      wander(f, dt, 34); break;
    case "cast": f.dir = mx < f.x ? -1 : 1; if (f.t > 0.5) castRibbon(f); break;
    case "tether": holdRibbon(f, dt); break;
    case "windup": f.dir = mx < f.x ? -1 : 1; if (f.t > 0.45) setSt(f, "throw"); break;
    case "throw": if (!f.thrown && f.t > 0.16) { f.thrown = true; throwThorn(f); } if (f.t > 0.42) { setSt(f, "idle"); f.cd = 1.6 + Math.random() * 1.2; } break;
    case "hurt": if (f.t > 0.38) setSt(f, "idle"); break;
    case "down": if (f.t > 0.9) setSt(f, "getUp"); break;
    case "getUp": if (f.t > 0.5) setSt(f, "idle"); break;
  }
}
const ribbonHand = (f) => demonJoint("lust", f.x, f.y, f.dir, f.p || demonPose(f), "hF");
function castRibbon(f) {
  const [hx, hy] = ribbonHand(f), [mx, my] = middle();
  if (S.dying || S.pulled || dist(hx, hy, mx, my) > 330 || !los(hx, hy, mx, my)) { setSt(f, "idle"); f.cd = 1.2; return; }
  if (S.ward) {
    // His ward turns the ribbon back, and is spent.
    spendWard(); ev("ward turned the ribbon"); S.crosses.push({ kind: "turn", x: mx, y: my - 4, t: 0, size: 22 }); S.whiteT = 0.12; Sound.fx.parry();
    setSt(f, "hurt"); f.cd = 2.5; return;
  }
  setSt(f, "tether"); S.pulled = { f, t: 0 }; S.pulls = (S.pulls || 0) + 1; Sound.fx.tether();
  if (S.ground) { S.ground = false; S.vy = -170; }
}
function holdRibbon(f, dt) {
  const P = S.pulled;
  if (!P || P.f !== f) { setSt(f, "idle"); f.cd = 2.5; return; }
  P.t += dt; f.dir = S.x < f.x ? -1 : 1;
  const [mx, my] = middle(), [cx, cy] = dMid(f);
  if (P.t > 2.6 || S.dying || S.act || !los(cx, cy - 10, mx, my)) { S.pulled = null; Sound.fx.tetherBreak(); setSt(f, "idle"); f.cd = 2.5; return; }
  // Drawn all the way in: it strikes.
  if (dist(mx, my, cx, cy) < f.hw + HW + 16) { S.pulled = null; hitMonk(S.x - f.x || f.dir, 0.06); setSt(f, "throw"); f.thrown = true; f.cd = 2.2; }
}
// The ribbon's pull on him (in his physics): toward its hand, through the air, or swinging him on
// the rope toward it. It tears him from the rock after a moment.
function pullOf(dt) {
  const P = S.pulled; if (!P || !alive(P.f)) { S.pulled = null; return; }
  const [hx, hy] = ribbonHand(P.f), [mx, my] = middle(), d = dist(hx, hy, mx, my) || 1;
  if (S.cling && P.t > 0.45) { S.cling = 0; S.ground = false; }
  if (S.cling || S.hang || S.act) return;
  if (S.ground) { S.ground = false; S.vy = Math.min(S.vy, -120); }
  S.vx += (hx - mx) / d * PULL * dt; S.vy += (hy - my) / d * PULL * dt;
}
function throwThorn(f) {
  const hx = f.x + f.dir * 8, hy = f.y - f.ht + 10, [tx, ty] = middle(), d = dist(hx, hy, tx, ty) || 1;
  S.things.push({ kind: "thorn", x: hx, y: hy, vx: (tx - hx) / d * THORN_V, vy: (ty - hy) / d * THORN_V, rot: 0, vr: 0, st: "fly", by: "demon", g: 0, age: 0, life: 5, from: f });
  Sound.fx.thorn(panX(f.x));
  const ts = S.things.filter((o) => o.kind === "thorn"); if (ts.length > 10) ts[0].st = "gone";
}
// Briars: under his feet, over his head, at his side, under his hands as he hangs from a ledge or
// holds to the rock. They tear him, and throw him off them (and off the ledge, or the rock).
function briars() {
  if (S.invT > 0 || S.dying) return;
  const probes = [[S.x - 4, S.y + 3, 0, -1], [S.x + 4, S.y + 3, 0, -1], [S.x, S.y - HT - 3, 0, 1], [S.x - HW - 4, S.y - 10, 1, 0], [S.x + HW + 4, S.y - 10, -1, 0], [S.x - HW - 4, S.y - 34, 1, 0], [S.x + HW + 4, S.y - 34, -1, 0]];
  if (S.hang) { const L = S.hang.L; probes.push([L.edge + L.s * 4, L.top + 3, -L.s, -1], [L.edge + L.s * 3, L.top + 12, -L.s, 0]); }
  const hit = probes.find(([x, y]) => thornAt(x, y)); if (!hit) return;
  const [, , nx, ny] = hit; briarHit(hit[0], hit[1]);
  hitMonk(nx || sign(S.vx) || -S.dir, 0.05);
  if (ny < 0 && !nx) { S.vy = -330; S.ground = false; } else if (ny > 0) S.vy = 160; else { S.vx = nx * 230; if (ny < 0) S.vy = -200; }
}
// Briars torn: dark leaves and a few drops of red.
function briarHit(x, y) {
  Sound.fx.briar(panX(x));
  for (let k = 0; k < 9; k++) S.parts.push({ kind: "spark", c: k % 3 ? "#3a0a2a" : SINS.lust.color, x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 140, vy: -40 - Math.random() * 100, life: 0.5, age: 0 });
}
// Where its mouth is: in its head, low and forward.
function mouth(f) {
  const sc = 1 + 0.1 * (f.size || 0);
  if (f.sin === "gluttony" && !f.great) return [f.x + f.dir * (f.st === "lob" ? 9 : 5) * sc, f.y - 53 * sc];   // (the traced shape's mouth)
  if (f.p) { const q = demonJoint(f.sin, 0, 0, f.dir, f.p, "head"); return [f.x + (q[0] + f.dir * 5) * sc, f.y + (q[1] + 4) * sc]; }
  return [f.x + f.dir * 12 * sc, f.y - f.ht + 12];
}
function stepGluttony(f, dt, mx, my, sees) {
  const [ox, oy] = mouth(f), d = dist(mx, my, ox, oy);
  switch (f.st) {
    case "idle": case "walk":
      f.cd -= dt;
      if (sees) {
        f.dir = mx < f.x ? -1 : 1; if (f.st === "walk") setSt(f, "idle");
        // Far off, it only heaves up fat and lobs it. Close, it does that and draws him in by turns.
        if (f.cd <= 0) {
          const close = d < 230 + 30 * f.size;
          if (close && f.next === "inhale") { f.next = "heave"; setSt(f, "inhale"); Sound.fx.inhale(panX(f.x)); }
          else { f.next = close ? "inhale" : f.next || "inhale"; setSt(f, "heave"); Sound.fx.gurgle(panX(f.x)); }
        }
        break;
      }
      wander(f, dt, 15); break;
    case "heave": f.dir = mx < f.x ? -1 : 1; if (f.t > 0.75) setSt(f, "lob"); break;          // the fat coming up out of it
    case "lob": if (!f.thrown && f.t > 0.18) { f.thrown = true; lobFat(f); } if (f.t > 0.5) { setSt(f, "idle"); f.cd = 2.4 + Math.random() * 1.4; } break;
    case "inhale":
      // It draws in its breath, and everything near is drawn to its mouth.
      f.dir = mx < f.x ? -1 : 1;
      if (f.t > 0.35 && f.t < 2.4) inhale(f, ox, oy, dt);
      // (Drawn in to it on his feet, its mouth is up at his head: near enough, so long as it is at him.)
      if (f.t > 0.35 && (d < 30 || (Math.abs(ox - S.x) < HW + 12 && oy > S.y - HT - 16 && oy < S.y + 8))) { if (!swallowLegs(f)) setSt(f, "bite"); }
      else if (f.t > 2.5) { setSt(f, "idle"); f.cd = 2.2 + Math.random() * 1.5; }
      break;
    case "bite":
      // The jaws: the torch half eaten, and he is spat out, hard.
      if (!f.thrown && f.t > 0.12) { f.thrown = true; if (dist(mx, my, ox, oy) < 50 && S.invT <= 0) { hitMonk(f.dir, 0.1); S.vx = f.dir * 340; S.vy = -280; Sound.fx.spit(); } }
      if (f.t > 0.6) { setSt(f, "idle"); f.cd = 2.6; }
      break;
    case "swallow": if (f.t > 0.7) { setSt(f, "idle"); f.cd = Math.min(f.cd, 1.4); } break;
    case "hurt": if (f.t > 0.45) setSt(f, "idle"); break;
    case "down": if (f.t > 1.3) setSt(f, "getUp"); break;
    case "getUp": if (f.t > 0.6) setSt(f, "idle"); break;
  }
}
// The breath drawn in: on the rope or in the air he is pulled off his way; on his feet he is
// dragged (but holding the rock, or hanging from a ledge, he holds); and what he has thrown, if it
// comes near its mouth now, it eats.
function inhale(f, ox, oy, dt) {
  const [mx, my] = middle(), dx = ox - mx, dy = oy - my, d = Math.hypot(dx, dy) || 1, reach = 340 + 40 * f.size, k = 1 + 0.25 * f.size;
  if (d < reach && !S.cling && !S.hang && !S.act && !S.atk && !S.latched && los(ox, oy, mx, my)) {
    const a = (560 * clamp(1 - d / (reach + 40), 0, 1) + 80) * k;
    if (S.ground) moveX(sign(dx) * Math.min(Math.abs(dx), (30 + a * 0.08) * dt));
    else { S.vx += dx / d * a * dt; S.vy += dy / d * a * dt; }
  }
  for (const o of S.things) {
    if (o.st !== "fly" || o.by === "demon") continue;
    const ex = ox - o.x, ey = oy - o.y, e = Math.hypot(ex, ey) || 1;
    if (e < 30) { eat(f, o); continue; }
    if (e < 260) { o.vx += ex / e * 700 * dt; o.vy += ey / e * 700 * dt; }
  }
  for (let q = 0; q < 2; q++) { const a = Math.random() * TAU, r = 60 + Math.random() * 140; S.parts.push({ kind: "draft", x: ox + Math.cos(a) * r, y: oy + Math.sin(a) * r, vx: 0, vy: 0, tx: ox, ty: oy, life: 0.6, age: 0 }); }
}
// ---- Gluttony's swallow ------------------------------------------------------------------------------
// Drawn in by its breath to its very mouth, he is not bitten but swallowed: his legs only, up to
// the hips, and it hangs on him, a sack with eyes. His hands are his own: he may throw the hook,
// and swing, and climb (the heavier for it); on his feet he can only hobble. While it has him his
// light ebbs, slowly (far more slowly than in a great demon's mouth). A hard knock against the
// rock (swung into a wall, or a heavy fall) smacks it off him; so do two kicks at it (a tap on
// it), or the sign of the cross over himself; and in a while it spits him out of itself.
function swallowLegs(f) {
  if (S.legsIn || S.latched || S.dying || S.act || S.invT > 0 || S.crawl || S.boonShow || S.dread) return false;
  if (S.ward || boonOn("vade")) {
    spendWard(); ev("the ward turned a swallow"); setSt(f, "hurt"); f.vx = -f.dir * 160;
    const [mx, my] = middle(); S.crosses.push({ kind: "turn", x: mx, y: my, t: 0, size: 22 }); S.whiteT = 0.12; Sound.fx.parry(); return true;
  }
  breakCombo();
  S.legsIn = { f, t: 0, kicks: 0 }; setSt(f, "legs"); S.hang = null; S.cling = 0; S.atk = null; S.act = null;
  Sound.fx.swallow(); Sound.fx.chomp(panX(S.x)); S.shake = 0.18; ev("legs swallowed");
  if (!S.legsSeen) { S.legsSeen = true; tip("legsSeen", { text: "IT HAS HIS LEGS", sub: "Swing him hard into the rock, or tap it and kick: knock it off.", t: 0 }); }
  return true;
}
function stepLegs(dt) {
  const L = S.legsIn, f = L.f;
  if (S.dying || S.latched || !f || f.st === "gone" || f.st === "dying") { S.legsIn = null; if (f && f.st === "legs") setSt(f, "idle"); return; }
  if (f.st !== "legs") { S.legsIn = null; offHim(f); return; }          // (struck off him by some blow)
  L.t += dt; f.x = S.x; f.y = S.y + 4; f.vx = 0; f.vy = 0; f.dir = S.dir;
  if (!boonOn("unconsumed")) { S.fuel -= dt * 0.012; if (S.fuel <= 0) lightOut(); }
  // (It does not let go of itself: he must knock it off, or his light goes.)
}
// Off him: set down beside him, out of the rock.
function offHim(f) {
  const s = -S.dir || 1, sp = dFree(S.x + s * (f.hw + HW + 2), S.y, f.hw, f.ht);
  if (sp) { f.x = sp[0]; f.y = sp[1]; }
  S.invT = Math.max(S.invT, 1);
}
function freeLegs(smack) {
  const L = S.legsIn; S.legsIn = null; if (!L) return;
  const f = L.f; if (!f || f.st !== "legs") return;
  setSt(f, "idle"); f.cd = 2.6; offHim(f);
  if (smack) { ev("knocked it off"); hurtDemon(f, 2, (f.x < S.x ? -1 : 1) * 260, -220, "launch"); S.shake = Math.max(S.shake, 0.3); Sound.fx.thump(1, panX(f.x)); }
  else { ev("it let go"); Sound.fx.spit(); }
}
// A kick at it, down at his own legs: two, and it lets go.
function kickLegs() {
  const L = S.legsIn; if (!L) return;
  L.kicks++; L.f.hurtT = 0.2; S.shake = Math.max(S.shake, 0.12); Sound.fx.thump(0.7, panX(S.x));
  if (L.kicks >= 2) freeLegs(true);
}
// It, drawn over him: its jaws, thrown back, shut about his waist, its body hanging below him
// (along him, however he hangs); cramming him in with its hands, and shaken by his blows.
const GS_AT = { gs0: [12, 63], gs1: [13, 64] };
function drawLegsSac(mx, my, p, cam) {
  const L = S.legsIn, f = L.f, hip = monkJoint(mx, my, S.dir, p, "hip"), fa = monkJoint(mx, my, S.dir, p, "fF"), fb = monkJoint(mx, my, S.dir, p, "fB");
  const ft = [(fa[0] + fb[0]) / 2, (fa[1] + fb[1]) / 2], rot = Math.atan2(ft[1] - hip[1], ft[0] - hip[0]) - PI / 2, sc = 0.62 * (1 + 0.1 * (f.size || 0));
  const k = L.t < 0.35 ? "gs0" : "gs1", [au, av] = GS_AT[k], d = S.dir;
  const sh = f.hurtT > 0 ? 2.6 : 0.5, jx = sh * (Math.random() * 2 - 1), jy = sh * 0.5 * (Math.random() * 2 - 1);
  const hx = hip[0] - cam.x, hy = hip[1] - cam.y;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(rot); ctx.scale(sc, sc);
  const P = new Path2D(); addShape(P, TRACED[k], (u, v) => [d * (u - au) + jx, -(v - av) + jy]);
  ctx.fillStyle = C.ink; ctx.fill(P, "evenodd");
  if (S.torch) {
    const dx = S.torch[0] - cam.x - hx, dy = S.torch[1] - cam.y - hy, cs = Math.cos(-rot), sn = Math.sin(-rot);
    shadeGlut(P, (dx * cs - dy * sn) / sc, (dx * sn + dy * cs) / sc, lightR() / sc, 1);
  }
  const e = glutEye(k); if (e) eyeGlut(k, d, jx - d * au, jy + av);
  ctx.restore();
}
// What it swallows makes it bigger: harder to bring down, its breath stronger, its fat heavier.
function eat(f, o) {
  o.st = "gone"; if (S.held === o) S.held = null; if (S.mark === o) S.mark = null;
  setSt(f, "swallow"); f.cd = 1.6; Sound.fx.swallow();
  if (f.size < 3) {
    f.size++; f.maxHp += 2; f.hp += 2; f.showHp = 2.5;
    f.hw = DEM.gluttony.hw + 3 * f.size; f.ht = DEM.gluttony.ht + 7 * f.size;
    const sp = dFree(f.x, f.y, f.hw, f.ht); if (sp) { f.x = sp[0]; f.y = sp[1]; }
  }
}
// A thing lobbed from (hx, hy) to fall on (tx, ty): the lower of the two arcs that reach it, or the longest throw.
function lob(hx, hy, tx, ty, v, g, by, kind) {
  const X = tx - hx, Y = hy - ty, xa = Math.max(1, Math.abs(X));
  let disc = v ** 4 - g * (g * xa * xa + 2 * Y * v * v);
  if (disc < 0) { v = Math.sqrt(g * (Y + Math.hypot(Y, xa))) * 1.02; disc = Math.max(0, v ** 4 - g * (g * xa * xa + 2 * Y * v * v)); }
  const th = Math.atan2(v * v - Math.sqrt(disc), g * xa);
  const o = { kind: kind || "stone", x: hx, y: hy, vx: sign(X) * v * Math.cos(th), vy: -v * Math.sin(th), rot: 0, vr: 6 * sign(X), st: "fly", by, g, age: 0 };
  S.things.push(o);
  return o;
}
// Gluttony's fat: heaved up out of it and lobbed, slow, quivering as it flies.
function lobFat(f) {
  const [ox, oy] = mouth(f), [tx, ty] = middle();
  const o = lob(ox, oy - 4, tx, ty, 240, 330, "demon", "fat");
  Object.assign(o, { r: 8 * (1 + 0.18 * f.size), w: 0, wv: 6, bounces: 0, from: f, life: 12 });
  Sound.fx.spit();
  const fats = S.things.filter((q) => q.kind === "fat"); if (fats.length > 8) fats[0].st = "gone";
}
// Wrath's fire: from over its head, straight at him, slow.
function throwFire(f) {
  const hx = f.x + f.dir * 6, hy = f.y - f.ht - 8, [tx, ty] = middle(), d = dist(hx, hy, tx, ty) || 1;
  S.things.push({ kind: "fire", x: hx, y: hy, vx: (tx - hx) / d * FIRE_V, vy: (ty - hy) / d * FIRE_V, rot: 0, vr: 0, st: "fly", by: "demon", g: 0, age: 0, life: 8, from: f });
  Sound.fx.fireball(panX(f.x));
  const fires = S.things.filter((o) => o.kind === "fire"); if (fires.length > 8) fires[0].st = "gone";
}
// A thorn into the rock: it stays there, quivering, a while, and is gone.
function thornStuck(o) {
  if (S.mark === o) S.mark = null;
  o.st = "stuck"; o.age = 0; o.life = 2.5; o.x -= o.vx * 0.012; o.y -= o.vy * 0.012; o.rot = Math.atan2(o.vy, o.vx); o.vx = 0; o.vy = 0;
  Sound.fx.objHit("stone", panX(o.x));
}
// Send a thing flying at a point (a demon's middle, if given), as he throws or kicks it: fire
// (or a thorn) straight and fast; anything else in a flat, hard arc.
function sendAt(o, x, y, tx, ty, f) {
  if (f && alive(f)) { const [cx, cy] = dMid(f); tx = cx + f.vx * 0.1; ty = cy; }
  const d = Math.max(1, dist(x, y, tx, ty));
  o.st = "fly"; o.by = "monk"; o.x = x; o.y = y; o.age = 0; o.bounces = 1;
  if (o.kind === "fire" || o.kind === "thorn") { o.g = 0; o.life = 3; o.vx = (tx - x) / d * FIRE_FLING; o.vy = (ty - y) / d * FIRE_FLING; }
  else { const T = d / BOULDER_V; o.g = 300; o.vx = (tx - x) / T; o.vy = (ty - y) / T - 0.5 * o.g * T; o.vr = 8 * sign(o.vx); if (o.kind === "fat") { o.life = 4; o.wv += 8; } }
}
// Rock at the thing's edge, on the side it is moving toward?
function rockAt(x, y, sx, sy, r) {
  r = r || BR;
  if (sx) return solidAt(x + sx * r, y) || solidAt(x + sx * r, y - r * 0.6) || solidAt(x + sx * r, y + r * 0.6);
  return solidAt(x, y + sy * r) || solidAt(x - r * 0.6, y + sy * r) || solidAt(x + r * 0.6, y + sy * r);
}
// A ball of fire against the rock: it bursts, and crumbling rock cracks at once.
function burst(o, x, y) {
  o.st = "gone"; if (S.mark === o) S.mark = null; Sound.fx.fireBurst(panX(o.x)); strikeRock(x, y);
  for (let k = 0; k < 14; k++) { const a = Math.random() * TAU, v = 30 + Math.random() * 120; S.parts.push({ kind: "spark", c: k % 2 ? SINS.wrath.color : C.flameHot, x: o.x, y: o.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.5 + Math.random() * 0.3, age: 0 }); }
}
// A blob of fat bursts: on a floor, it leaves the floor greased.
function splat(o, x, y, floor) {
  o.st = "gone"; if (S.mark === o) S.mark = null; Sound.fx.splat(panX(x));
  for (let k = 0; k < 10; k++) { const a = -PI * Math.random(), v = 40 + Math.random() * 110; S.parts.push({ kind: "glob", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 1.5 + Math.random() * 2.5, life: 0.7 + Math.random() * 0.4, age: 0 }); }
  if (floor) grease(x, y);
}
// ---- Slime, grease, and rock that lies askew --------------------------------------------------------
// Some platforms are slimy (in Gluttony's domain), and where Gluttony's fat bursts on a floor the
// floor is greased for a while: underfoot he slides, and a slick slab that lies askew slides him
// down it. The far cliff of each cavern is slimed: he cannot hold it. Some platforms lie a little
// askew (drawn so; underfoot they are as level as any other, but he stands on the slope as drawn).
function grease(x, y) {
  const i = Math.floor(x / CELL); let j = Math.floor((y + 2) / CELL);
  for (let q = 0; q < 3 && !solid(i, j); q++) j++;
  if (!solid(i, j) || solid(i, j - 1)) return;
  S.grease.push({ i0: i - 1, i1: i + 1, j, until: S.t + 20 });
  if (S.grease.length > 24) S.grease.shift();
}
// The platform whose top (a cell of it) is at (i, h), if any.
function slabAt(i, h) {
  const sec = sectionAt(Math.max(1, h));
  if (sec.type === "shaft") { const isl = island(Math.floor(h / SLOT)); if (isl && isl.st !== "gone" && h === isl.h1 && i >= isl.x0 && i <= isl.x1) return isl; }
  else if (sec.type === "cave") { const r = h - sec.h0; for (const p of cave(sec).plats) if (r === p.r1 && i >= p.x0 && i <= p.x1) return p; }
  return null;
}
const GREASE_T = 8;                        // how long his feet stay greased once he has stepped in it
function slickAt(x, y) {
  const i = Math.floor(x / CELL), j = Math.floor((y + 2) / CELL);
  for (const g of S.grease) if (g.j === j && i >= g.i0 && i <= g.i1 && g.until > S.t) return true;
  const p = slabAt(i, -j); return !!p && !!p.slick;
}
// How far the drawn top of a platform askew lies above or below its level top, at x.
function tiltDy(x, y) {
  const i = Math.floor(x / CELL), p = slabAt(i, -Math.floor((y + 2) / CELL)); if (!p || !p.tilt) return 0;
  const x0 = p.x0 * CELL, x1 = (p.x1 + 1) * CELL;
  return clamp((x - (x0 + x1) / 2) / ((x1 - x0) / 2), -1, 1) * p.tilt;
}
function slickWall(s) {
  const i = Math.floor((S.x + s * (HW + 1.5)) / CELL), h = -Math.floor((S.y - 20) / CELL), sec = sectionAt(Math.max(1, h));
  return sec.type === "cave" && h - sec.h0 >= 0 && h - sec.h0 < LH && i === cave(sec).face;
}
// A thing he has pointed at: standing, his hands free, he takes it out of the air as it comes.
function tryCatch(o) {
  if (S.mark !== o || S.held || S.atk || S.act || S.hang || S.cling || !S.ground || S.hurtT > 0 || S.dying) return false;
  const [cx, cy] = middle();
  if (dist(o.x, o.y, cx, cy - 4) > 42) return false;
  o.st = "held"; o.by = null; S.held = o; S.mark = null;
  S.atk = { kind: "catch", o, t: 0, dur: 0.24, from: [S.x, S.y], to: [S.x, S.y], dash: 0, arrived: true, hit: true };
  S.dir = o.x < S.x ? -1 : 1; S.vx = 0; Sound.fx.catchIt(); gain(0.08);
  return true;
}
// Swinging hard on the rope into a thing thrown at him: he kicks it back at whoever threw it.
function kickBack(o, r) {
  if (o.by !== "demon" || !S.rope || S.ground || S.cling || Math.hypot(S.vx, S.vy) < 100) return false;
  if (Math.abs(o.x - S.x) > HW + r + 12 || o.y < S.y - HT - r || o.y > S.y + r + 8) return false;
  const f = o.from && alive(o.from) ? o.from : null;
  sendAt(o, o.x, o.y, o.x - o.vx * 2, o.y - o.vy * 2, f);
  if (S.mark === o) S.mark = null;
  S.swingKickT = 0.35; S.kickCd = 0.3; Sound.fx.kick(1, panX(o.x)); S.shake = 0.12; gain(0.1); impactAt(o.x, o.y, sign(o.vx), sign(o.vy), 0.8);
  return true;
}
// Does a thing strike the monk? His ward turns it back where it came from, and then it is his.
function strikeMonk(o, r) {
  if (o.by !== "demon" || S.invT > 0) return false;
  if (Math.abs(o.x - S.x) >= HW + r + (S.ward ? 10 : 0) || o.y <= S.y - HT - r || o.y >= S.y + r) return false;
  if (S.ward) {
    spendWard(); ev("ward turned a thrown " + o.kind);
    if (o.kind === "stone") { o.by = null; o.vx *= -0.6; o.vy = -200; }
    else { const f = o.from && alive(o.from) ? o.from : null; sendAt(o, o.x, o.y, o.x - o.vx * 2, o.y - o.vy * 2, f); }
    const [cx, cy] = middle(); S.crosses.push({ kind: "turn", x: cx, y: cy - 4, t: 0, size: 22 }); S.whiteT = 0.12; Sound.fx.parry(); S.shake = 0.15;
  } else if (o.kind === "fire") { hitMonk(o.vx); burst(o, o.x, o.y); }
  else if (o.kind === "thorn") { hitMonk(o.vx, 0.04); o.st = "gone"; briarHit(o.x, o.y); }
  else if (o.kind === "coin") coinSticks(o);
  else if (o.kind === "fat") { hitMonk(o.vx, 0.05); splat(o, o.x, o.y, false); S.greaseT = GREASE_T; }
  else { hitMonk(o.vx); o.by = null; o.vx *= -0.3; o.vy = -120; }
  return true;
}
// Does a thing he threw (or kicked back) strike a demon? Gluttony, while it draws its breath,
// swallows whatever comes, and grows; at any other time it is struck like any other.
function strikeDemon(o, r) {
  if (o.by !== "monk") return false;
  for (const f of S.demons) if (alive(f) && Math.abs(o.x - f.x) < f.hw + r && o.y > f.y - f.ht - r && o.y < f.y + r && (impactAt(o.x, o.y, sign(o.vx), sign(o.vy), 1.1, f), true)) {
    if (f.sin === "gluttony" && f.st === "inhale") { f.dir = o.x < f.x ? -1 : 1; eat(f, o); return true; }
    if (o.kind === "fire") { hurtDemon(f, 2, sign(o.vx) * 220, -260, "launch"); burst(o, o.x, o.y); }
    else if (o.kind === "thorn") { hurtDemon(f, 2, sign(o.vx) * 220, -240, "launch"); o.st = "gone"; briarHit(o.x, o.y); }
    else if (o.kind === "coin") { hurtDemon(f, f.sin === "avarice" ? 2 : 1, sign(o.vx) * 160, -180, "launch"); o.st = "gone"; Sound.fx.coin(panX(o.x), 1); }
    else if (o.kind === "fat") { hurtDemon(f, 2, sign(o.vx) * 200, -220, "launch"); splat(o, o.x, o.y, false); }
    else { hurtDemon(f, 2, sign(o.vx) * 260, -220, "launch"); Sound.fx.objHit("stone", panX(o.x)); o.by = null; o.vx *= -0.3; o.vy = -150; o.g = 560; }
    S.shake = 0.2; gain(0.12);
    return true;
  }
  return false;
}
function updThing(o, dt) {
  o.age += dt;
  if (o.st === "held" || o.st === "gone") return;
  if (o.st === "stuck") { if (o.age > o.life) o.st = "gone"; return; }
  if (o.kind === "coin") {
    if (o.age > o.life) { o.st = "gone"; if (S.mark === o) S.mark = null; return; }
    if (o.st === "rest") return;
    const n = clamp(Math.ceil(Math.max(Math.abs(o.vx), Math.abs(o.vy)) * dt / 3), 1, 12), h = dt / n;
    for (let k = 0; k < n; k++) {
      o.vy += o.g * h;
      if (solidAt(o.x + o.vx * h, o.y)) { o.vx *= -0.4; o.by = null; } else o.x += o.vx * h;
      if (solidAt(o.x, o.y + o.vy * h)) { if (o.vy > 0 && Math.abs(o.vy) < 90) { o.st = "rest"; o.vy = 0; o.vx = 0; o.age = Math.max(o.age, o.life - 1.5); if (S.mark === o) S.mark = null; return; } o.vy *= -0.45; o.vx *= 0.6; o.by = null; Sound.fx.coin(panX(o.x), 0.25); }
      else o.y += o.vy * h;
      if (tryCatch(o) || kickBack(o, 6) || strikeMonk(o, 6) || strikeDemon(o, 7)) return;
    }
    return;
  }
  if (o.kind === "fire" || o.kind === "thorn") {
    // Fire: straight on, slow, until it meets rock or him or a demon, or burns out. A thorn: the
    // same, but quicker, and it goes into the rock and stays.
    const thorn = o.kind === "thorn";
    if (o.age > (o.life || 8)) { o.st = "gone"; if (S.mark === o) S.mark = null; if (!thorn) for (let k = 0; k < 5; k++) S.parts.push({ kind: "smoke", x: o.x, y: o.y, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20, r: 3 + Math.random() * 3, life: 0.7, age: 0 }); return; }
    const n = clamp(Math.ceil(Math.hypot(o.vx, o.vy) * dt / 4), 1, 12), h = dt / n;
    for (let k = 0; k < n; k++) {
      o.vy += (o.g || 0) * h; o.x += o.vx * h; o.y += o.vy * h; o.rot += h * 6;
      if (solidAt(o.x, o.y)) { if (thorn) thornStuck(o); else burst(o, o.x, o.y); return; }
      if (tryCatch(o) || kickBack(o, 9) || strikeMonk(o, 9) || strikeDemon(o, 10)) return;
    }
    if (!thorn && Math.random() < 0.5) S.parts.push({ kind: "ember", x: o.x + (Math.random() - 0.5) * 8, y: o.y + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 20 - o.vx * 0.1, vy: -20 - Math.random() * 30, life: 0.6, age: 0 });
    return;
  }
  if (o.kind === "fat") {
    // Fat: it stretches as it flies and quivers when it lands. It bounces once, heavily; then it
    // bursts (on a floor, greasing it). Into a wall, it sticks and slides down.
    o.wv += (-90 * o.w - 7 * o.wv) * dt; o.w += o.wv * dt;
    if (o.age > (o.life || 12)) { splat(o, o.x, o.y, false); return; }
    const n = clamp(Math.ceil(Math.max(Math.abs(o.vx), Math.abs(o.vy)) * dt / 4), 1, 12), h = dt / n;
    for (let k = 0; k < n; k++) {
      o.vy += o.g * h;
      // Into a wall it sticks, quivering, and slides slowly down it.
      if (o.vx && rockAt(o.x + o.vx * h, o.y, sign(o.vx), 0, o.r)) { o.vx = 0; o.vy = Math.min(o.vy, 25); o.g = 90; o.wv += 8; o.bounces = 1; if (!o.stuck) { o.stuck = true; Sound.fx.splat(panX(o.x), 0.5); } }
      o.x += o.vx * h;
      if (o.vy && rockAt(o.x, o.y + o.vy * h, 0, sign(o.vy), o.r)) {
        if (o.vy > 140 && o.bounces < 1) { o.bounces++; o.vy *= -0.34; o.vx *= 0.55; o.wv += 10; Sound.fx.splat(panX(o.x), 0.4); }
        else { splat(o, o.x, o.y + sign(o.vy) * o.r, o.vy > 0); return; }
      } else o.y += o.vy * h;
      if (tryCatch(o) || kickBack(o, o.r) || strikeMonk(o, o.r) || strikeDemon(o, o.r)) return;
    }
    return;
  }
  if (o.st === "rest") { if (!rockAt(o.x, o.y + 1, 0, 1)) { o.st = "fly"; o.by = null; o.vx = 0; o.vy = 0; } return; }
  const n = clamp(Math.ceil(Math.max(Math.abs(o.vx), Math.abs(o.vy)) * dt / 4), 1, 12), h = dt / n;
  for (let k = 0; k < n; k++) {
    o.vy += (o.g === undefined ? 560 : o.g) * h; o.rot += o.vr * h;
    let bounced = false;
    if (o.vx && rockAt(o.x + o.vx * h, o.y, sign(o.vx), 0)) { o.vx *= -0.3; bounced = true; } else o.x += o.vx * h;
    if (o.vy && rockAt(o.x, o.y + o.vy * h, 0, sign(o.vy))) {
      const down = o.vy > 0; o.vy *= down ? -0.25 : -0.4; bounced = true;
      if (down && Math.abs(o.vy) < 70) { o.vy = 0; o.vx *= 0.6; if (Math.abs(o.vx) < 40) { o.st = "rest"; o.vx = 0; o.y = Math.floor((o.y + BR + 2) / CELL) * CELL - BR - 0.01; if (S.mark === o) S.mark = null; return; } }
    } else o.y += o.vy * h;
    if (bounced) { if (o.by) Sound.fx.objHit("stone", panX(o.x)); o.by = null; o.vr *= 0.5; o.g = 560; }
    if (tryCatch(o) || kickBack(o, BR) || strikeMonk(o, BR)) return;
    if (strikeDemon(o, BR)) break;
  }
}
// ---- The rock that gives way (Wrath's) ----------------------------------------------------------------
// With his weight on it (standing on it, or his hook in it) it cracks: once, twice, three times,
// slowly; and then it falls to pieces. Take the weight off before then and the cracking stops where
// it is. Fire striking it cracks it at once.
const CRACK_T = 0.9;
function crumblerAt(x, y) {
  const i = Math.floor(x / CELL), h = -Math.floor(y / CELL), sec = sectionAt(Math.max(1, h));
  if (sec.type === "shaft") { const isl = island(Math.floor(h / SLOT)); if (isl && isl.crumble && isl.st !== "gone" && h >= isl.h0 && h <= isl.h1 && i >= isl.x0 - 1 && i <= isl.x1 + 1) return isl; }
  else if (sec.type === "trav") { const T = trav(sec), r = h - sec.h0; if (T.bridgeOf && r === 7 && T.bridgeOf[i]) { const B = T.bridges[T.bridgeOf[i] - 1]; if (B.st !== "gone") { B.h = h; return B; } } }
  return null;
}
// Its cells: [i0, i1, h0, h1].
const cellsOf = (c) => (c.i0 !== undefined ? [c.i0, c.i1, c.h, c.h] : [c.x0, c.x1, c.h0, c.h1]);
function weigh(c) { if (!c) return; c.loadT = S.rt; if (!c.st) { c.st = "crack"; c.stage = 0; c.t = 0; S.crumbling.push(c); } }
function strikeRock(x, y) { const c = crumblerAt(x, y); if (c) { weigh(c); crack(c); } }
function crack(c) {
  const [i0, i1, h0, h1] = cellsOf(c), x0 = i0 * CELL, x1 = (i1 + 1) * CELL, y0 = -h1 * CELL, y1 = (1 - h0) * CELL;
  c.stage++; c.t = 0;
  if (c.stage > 3) {
    // It goes. (If his hook was in it, the rope goes with it.)
    c.st = "gone";
    if (S.rope) { const hx = S.rope.hx === undefined ? S.rope.x : S.rope.hx, hy = S.rope.hy === undefined ? S.rope.y : S.rope.hy, hi = Math.floor(hx / CELL), hh = -Math.floor(hy / CELL); if (hi >= i0 - 1 && hi <= i1 + 1 && hh >= h0 - 1 && hh <= h1 + 1) { S.rope = null; S.climbing = false; Sound.fx.tetherBreak(); } }
    for (let k = 0; k < 18; k++) S.parts.push({ kind: "chip", x: lerp(x0, x1, Math.random()), y: lerp(y0, y1, Math.random()), vx: (Math.random() - 0.5) * 70, vy: -Math.random() * 60, life: 1.2, age: 0, big: Math.random() < 0.4 });
    for (let k = 0; k < 6; k++) S.parts.push({ kind: "smoke", x: lerp(x0, x1, Math.random()), y: lerp(y0, y1, Math.random()), vx: (Math.random() - 0.5) * 30, vy: 10 - Math.random() * 20, r: 5 + Math.random() * 6, life: 1, age: 0 });
    Sound.fx.crumble(panX((x0 + x1) / 2)); S.shake = Math.max(S.shake, 0.12);
    return;
  }
  Sound.fx.crack(panX((x0 + x1) / 2)); S.shake = Math.max(S.shake, 0.04 * c.stage);
  for (let k = 0; k < 3 + c.stage * 2; k++) S.parts.push({ kind: "chip", x: lerp(x0, x1, Math.random()), y: y1, vx: (Math.random() - 0.5) * 40, vy: Math.random() * 30, life: 0.8, age: 0 });
}
function stepCrumbling(dt) {
  for (const c of S.crumbling) {
    if (c.st !== "crack") continue;
    if (S.rt - c.loadT < 0.05) { c.t += dt; if (c.t >= (c.stage >= 3 ? CRACK_T * 0.7 : CRACK_T)) crack(c); }
    else c.t = 0;                              // the weight off: the cracking stops where it is
  }
  S.crumbling = S.crumbling.filter((c) => c.st === "crack");
}
function hitMonk(kx, cost) {
  if (S.dying || S.invT > 0 || S.latched) return;
  breakCombo();
  ev("he was hit", { cost: r2(cost || 0.06), wardLost: S.ward ? true : undefined, blockLoosed: S.tied && (cost === undefined || cost >= 0.06) ? true : undefined });
  S.freeze = Math.max(S.freeze || 0, 0.06);
  if (!boonOn("unconsumed")) S.fuel = Math.max(0, S.fuel - blowCost(cost || 0.06));
  S.hurtT = 0.5; S.invT = 0.9; S.flashT = 0.3; S.hoverT = 0; S.cling = 0; S.climbing = false; S.atk = null; S.act = null; S.hang = null; S.ward = null;
  S.vx = (sign(kx) || -S.dir) * 200; S.vy = -170; S.ground = false;
  if (S.held) { S.held.st = "fly"; S.held.by = null; S.held.vx = -S.vx * 0.3; S.held.vy = -100; S.held = null; }
  if (S.tied && (cost === undefined || cost >= 0.06)) loosen(kx);        // (a hard blow knocks the block loose)
  Sound.fx.hurt(); S.shake = 0.25;
}
const demonAt = (x, y) => { let best = null, bd = 1e9; for (const f of S.demons) { if (!alive(f)) continue; const [cx, cy] = dMid(f), d = dist(x, y, cx, cy); if (Math.abs(x - f.x) < f.hw + 18 && y > f.y - f.ht - 18 && y < f.y + 14 && d < bd) { bd = d; best = f; } } return best; };
const thingAt = (x, y) => { let best = null, bd = 34; for (const o of S.things) { if (o.st === "held" || o.st === "gone" || o.st === "stuck") continue; const d = dist(x, y, o.x, o.y); if (d < bd) { bd = d; best = o; } } return best; };

// ---- His blows, and the boulders in his hands ---------------------------------------------------------
// Every tap does the same thing, in the flare or out of it. A demon: he zips to it and strikes (a
// swipe up: a kick into the air; a swipe across: it is hurled). A boulder, in the air or on the
// ground: he zips to it and catches it. With a boulder in his hands, a tap anywhere: a heavy
// wind-up, and he flings it. Out of the flare he can only reach what he can see, near; in it,
// anything, through rock if need be. Swinging on the rope into a demon: a kick.
// In reach: anything the torch shows (any part of it), or anything at all in the flare.
const inLight = (x, y) => { const [lx, ly] = S.torch; return dist(lx, ly, x, y) < lightR() * 0.95 && los(lx, ly, x, y); };
const reachable = (x, y, tall) => S.flare.on || inLight(x, y) || (tall && (inLight(x, y - 20) || inLight(x, y + 20)));
function jumpTo(x, y) {
  S.ghosts.push({ x: S.drawX || S.x, y: S.drawY || S.y, dir: S.dir, p: S.lastPose || STAND, age: 0 });
  puff(S.x, S.y - HT / 2, 8, false);
  S.x = x; S.y = y; S.vx = 0; S.vy = 0;
  puff(S.x, S.y - HT / 2, 6, true); Sound.fx.zip();
}
// Start a move that ends at spot sp: a dash through the air, or (in the flare, past rock) a flash.
function startMove(kind, sp, extra) {
  const [mx, my] = middle(), seen = los(mx, my, sp[0], sp[1] - HT / 2);
  let dash = Math.min(0.15, dist(S.x, S.y, sp[0], sp[1]) / 900);
  if (!seen) { jumpTo(sp[0], sp[1]); dash = 0; }
  S.atk = Object.assign({ kind, t: 0, from: [S.x, S.y], to: sp, hit: false, dash, arrived: dash === 0 }, extra);
  S.rope = null; S.cling = 0; S.climbing = false; S.vx = 0; S.vy = 0; S.hang = null;
  if (dash > 0.03) Sound.fx.whoosh(0.35);
}
// Where he comes to strike: beside it, on the near side. If it stands on ground (a ledge, it may
// be), on that ground, so that when the blow is done he is not left in the air: the near side if
// there is footing there, else the far, else against it, as close as there is footing.
function strikeSpot(f) {
  const side = S.x < f.x ? -1 : 1, gap = f.hw + HW + 5;
  if (f.ground) {
    const footed = (x) => { const p = freeSpot(x, f.y - 0.01); return p && Math.abs(p[1] - f.y) < 8 && boxHit(p[0], p[1] + 3) ? p : null; };
    for (const x of [f.x + side * gap, f.x - side * gap, f.x + side * (HW + 6), f.x - side * (HW + 6), f.x + side * 2]) { const p = footed(x); if (p) return p; }
  }
  return freeSpot(f.x + side * gap, f.y) || freeSpot(f.x - side * gap, f.y) || [S.x, S.y];
}
function attack(kind, f, dir) {
  if (!alive(f)) return;
  const sp = strikeSpot(f);
  const move = kind === "kick" ? "uppercut" : kind === "slam" ? "slam" : null;
  startMove(kind, sp, { f, dir, dur: kind === "hurl" || kind === "slam" ? 0.4 : 0.34, crown: !!move && wouldCrown(move) });
  S.dir = f.x < sp[0] ? -1 : 1;
}
// A boulder lying near him on the same floor: he steps to it and heaves it up (it is heavy).
function heave(o) {
  if (o.st !== "rest" || !S.ground || Math.abs(o.x - S.x) > 64 || Math.abs(o.y + BR - S.y) > 30) return false;
  const side = S.x < o.x ? -1 : 1, to = [o.x + side * 14, S.y], step = !boxHit(to[0], to[1]) && Math.abs(to[0] - S.x) > 4;
  S.atk = { kind: "heave", o, t: 0, dur: 0.6, from: [S.x, S.y], to: step ? to : [S.x, S.y], dash: step ? 0.16 : 0, arrived: !step, hit: false };
  S.dir = o.x < S.x ? -1 : 1; return true;
}
// In the flare: he goes to it, through the air or the rock, and catches it (or heaves it up).
function catchThing(o) {
  if (S.held) return;
  if (heave(o)) return;
  const T = 0.12 * (S.flare.on ? FLARE_SLOW : 1), px = o.x + o.vx * T, py = o.y + o.vy * T;
  const side = S.x < px ? -1 : 1, sp = freeSpot(px + side * 8, py + 34) || freeSpot(px, py + 40);
  if (!sp) return;
  o.by = null;                     // in his reach it can no longer hurt him
  startMove("catch", sp, { o, dur: 0.24 });
  S.dir = px < sp[0] ? -1 : 1;
}
function throwHeld(tx, ty, f) {
  if (!S.held || S.atk) return;
  // A boulder: the slow heave of a heavy thing. Fire, or fat: a quick fling.
  const quick = S.held.kind !== "stone";
  S.atk = { kind: quick ? "fling" : "toss", f, tx, ty, t: 0, dur: quick ? 0.36 : 0.6, from: [S.x, S.y], to: [S.x, S.y], dash: 0, arrived: true, hit: false };
  S.dir = (f ? f.x : tx) < S.x ? -1 : 1; S.rope = null; S.cling = 0; S.climbing = false; S.vx = 0;
}
// Holding something with a demon close by: he strikes it with what he holds (a boulder stays in
// his hands; fire bursts on it; fat bursts over it).
const besides = (f) => Math.abs(f.x - S.x) < f.hw + HW + 40 && Math.abs((f.y - f.ht / 2) - (S.y - HT / 2)) < 50;
// Near enough to strike with what is in his hands (a great demon, by its middle).
const closeBy = (g, m) => Math.abs(g.x - S.x) < g.hw + HW + 40 && Math.abs((g.y - g.ht / 2) - (S.y - HT / 2)) < g.ht / 2 + m;
// The block in his hands swung into a demon close by: a heavy blow, and he keeps hold of it.
function swingBlock(f, g) {
  const b = S.tied; if (!b || b.st !== "hand" || S.atk) return;
  const t = g || f;
  S.atk = { kind: "brick", f, g, o: b, t: 0, dur: 0.42, from: [S.x, S.y], to: [S.x, S.y], dash: 0, arrived: true, hit: false };
  S.dir = t.x < S.x ? -1 : 1; S.vx = 0; ev("block swung", { at: g ? "great" : "demon" });
}
function bash(f) {
  if (!S.held || S.atk) return;
  S.atk = { kind: S.held.kind === "fire" || S.held.kind === "thorn" ? "sear" : "bash", f, o: S.held, t: 0, dur: 0.42, from: [S.x, S.y], to: [S.x, S.y], dash: 0, arrived: true, hit: false };
  S.dir = f.x < S.x ? -1 : 1; S.rope = null; S.cling = 0; S.climbing = false; S.vx = 0;
}
// Fling what he holds, at a point or a demon, as hard as it came.
function release(tx, ty, f) {
  const o = S.held; if (!o) return null;
  const [hx, hy] = S.handW || grip();
  sendAt(o, hx, hy, tx, ty, f);
  if (o.kind === "fire") Sound.fx.fireball(0); else if (o.kind === "thorn") Sound.fx.thorn(0);
  S.held = null; Sound.fx.throw(0.9);
  return o;
}
// Each move: its pose, and the moment it lands. The toss is slow: the wind-up of a heavy thing.
const ATK_ANIM = { punch: ["palm", MONK_HIT.palm], kick: ["launch", MONK_HIT.launch], slam: ["slam", MONK_HIT.slam], hurl: ["throw", MONK_HIT.throw], toss: ["throw", 0.62], fling: ["throw", 0.45], bash: ["slam", MONK_HIT.slam], brick: ["slam", MONK_HIT.slam], sear: ["palm", MONK_HIT.palm], heave: ["pickup", MONK_HIT.pickup], catch: ["catch", MONK_HIT.catch] };
function stepAtk(dt) {
  const a = S.atk; a.t += dt;
  if (a.t < a.dash) {
    // A dash: toward a moving boulder, he follows it.
    if (a.kind === "catch" && a.o.st === "fly") { const side = S.x < a.o.x ? -1 : 1; a.to = [a.o.x + side * 8, a.o.y + 34]; }
    const k = ease(a.t / a.dash); S.x = lerp(a.from[0], a.to[0], k); S.y = lerp(a.from[1], a.to[1], k); return;
  }
  if (!a.arrived) { a.arrived = true; S.x = a.to[0]; S.y = a.to[1]; if (boxHit(S.x, S.y)) { const fs = freeSpot(S.x, S.y); if (fs) { S.x = fs[0]; S.y = fs[1]; } } }
  const u = (a.t - a.dash) / a.dur, f = a.f;
  if (f && alive(f) && a.kind !== "toss" && a.kind !== "fling") S.dir = f.x < S.x ? -1 : 1;
  if (!a.hit && u >= ATK_ANIM[a.kind][1]) {
    a.hit = true;
    if (a.kind === "toss" || a.kind === "fling") release(a.tx, a.ty, f);
    else if (a.kind === "brick") {
      const b = a.o, g = a.g;
      if (S.tied === b && b.st === "hand") {
        if (g) { if (g.st !== "dying" && g.st !== "latch" && closeBy(g, 50)) strikeGreat(g, { vx: S.dir * 420, vy: -40, x: b.x, y: b.y, ht: b.ht, flung: false }, b); }
        else if (f && alive(f) && dist(S.x, S.y - 22, f.x, f.y - f.ht / 2) < 70 + f.hw) {
          blowTo(f, 4, S.dir * 320, -260, "launch", "brick"); Sound.fx.brickHit(1, panX(f.x)); S.shake = 0.25; gain(0.16); impact(f, S.dir, -0.3, 2.4);
        }
      }
    }
    else if (a.kind === "bash" || a.kind === "sear") {
      const o = a.o;
      if (S.held === o && alive(f) && dist(S.x, S.y - 22, f.x, f.y - f.ht / 2) < 70 + f.hw) {
        const [cx, cy] = dMid(f);
        if (o.kind === "fire") { blowTo(f, 3, S.dir * 220, -260, "launch", "bash"); S.held = null; o.x = cx; o.y = cy; burst(o, cx, cy); }
        else if (o.kind === "thorn") { blowTo(f, 3, S.dir * 220, -240, "launch", "bash"); S.held = null; o.st = "gone"; briarHit(cx, cy); }
        else if (o.kind === "coin") { blowTo(f, 2, S.dir * 180, -200, "launch", "bash"); S.held = null; o.st = "gone"; Sound.fx.coin(panX(f.x), 1); }
        else if (o.kind === "fat") { blowTo(f, 2, S.dir * 200, -200, "launch", "bash"); S.held = null; splat(o, cx, cy, false); }
        else { blowTo(f, 3, S.dir * 280, -240, "launch", "bash"); Sound.fx.objHit("stone", panX(f.x)); Sound.fx.punch(1, panX(f.x)); }
        S.shake = 0.22; gain(0.14); impact(f, S.dir, -0.3, 2);
      }
    }
    else if (a.kind === "heave" || a.kind === "catch") {
      if (a.o.st === "rest" || a.o.st === "fly") { a.o.st = "held"; a.o.by = null; S.held = a.o; if (a.kind === "catch") { Sound.fx.catchIt(); gain(0.08); } else Sound.fx.pickup(); }
    } else if (alive(f) && dist(S.x, S.y - 22, f.x, f.y - f.ht / 2) < 70 + f.hw) {
      if (a.kind === "punch") { impact(f, S.dir, -0.2, 1); blowTo(f, 1, S.dir * 150, -60, undefined, "strike"); Sound.fx.punch(0.8, panX(f.x)); gain(0.06); }
      else if (a.kind === "kick" && a.crown) {
        // SURSUM CORDA: flung up twice as high in a column of light, and he goes up after it, turning.
        crownFX("uppercut", f); impact(f, S.dir * 0.2, -1, 2.4); blowTo(f, 1.5, S.dir * 40, -820, "launch", "uppercut"); Sound.fx.kick(1, panX(f.x)); gain(0.12); a.leap = true;
        const [cx, cy] = dMid(f); for (let q = 0; q < 22; q++) S.parts.push({ kind: "spark", c: q % 3 ? "#fff1c4" : C.flame, x: cx + (Math.random() - 0.5) * 14, y: cy - q * 6, vx: (Math.random() - 0.5) * 30, vy: -260 - Math.random() * 260, life: 0.8, age: 0, real: true });
      }
      else if (a.kind === "slam" && a.crown) {
        // DEPOSUIT: driven down into the rock; the ground shakes in a ring, and every demon near is thrown down.
        crownFX("slam", f); impact(f, a.dir[0] * 0.3, 1, 2.6); blowTo(f, 1.5, a.dir[0] * 140, 900, "hurl", "slam"); Sound.fx.punch(1, panX(f.x)); Sound.fx.wallSlam(panX(f.x)); S.shake = 0.4; gain(0.12);
        S.parts.push({ kind: "wave", x: f.x, y: f.y, vx: 0, vy: 0, life: 0.6, age: 0, real: true });
        for (let q = 0; q < 14; q++) S.parts.push({ kind: "smoke", warm: true, x: f.x + (Math.random() - 0.5) * 60, y: f.y - 4, vx: (Math.random() - 0.5) * 160, vy: -20 - Math.random() * 40, r: 3 + Math.random() * 4, life: 0.9, age: 0 });
        for (const g of S.demons) if (g !== f && alive(g) && !g.idol && g.st !== "legs" && Math.abs(g.x - f.x) < 150 && Math.abs(g.y - f.y) < 70) hurtDemon(g, 1, (sign(g.x - f.x) || 1) * 220, -260, "launch");
      }
      else if (a.kind === "kick") { impact(f, S.dir * 0.2, -1, 1.4); blowTo(f, 1, S.dir * 30, -430, "launch", "uppercut"); Sound.fx.kick(0.9, panX(f.x)); gain(0.06); }
      else if (a.kind === "slam") { impact(f, a.dir[0] * 0.3, 1, 1.6); blowTo(f, 1, a.dir[0] * 140, 680, "hurl", "slam"); Sound.fx.punch(1, panX(f.x)); gain(0.06); }
      else { impact(f, a.dir[0], a.dir[1], 1.8); blowTo(f, 1, a.dir[0] * 580, a.dir[1] * 580 - 90, "hurl", "hurl"); Sound.fx.kick(1, panX(f.x)); gain(0.08); }
    }
  }
  if (u >= 1) {
    S.atk = null; S.ground = boxHit(S.x, S.y + 1); if (!S.ground) { S.vy = 0; S.floatT = 0.3; }
    if (a.leap) { S.ground = false; S.vy = -380; S.vx = S.dir * 30; S.floatT = 0; S.crownSpin = CROWN_SPIN; }      // (up after it)
  }
}
// What a tap or a swipe on a demon or a boulder does.
function gesture(kind, f, o, dir) {
  if (S.act || (S.atk && !S.atk.hit) || !upFromCrawl()) return;
  if (S.atk) S.atk = null;          // a blow already landed: straight into the next
  // A demon in the air with a block (or going for one): the hook, and it is pulled down.
  if (f && kind === "tap" && (f.block || f.st === "seize")) { yank(f); return; }
  if (f) {
    if (S.held) { if (besides(f)) bash(f); else throwHeld(0, 0, f); return; }
    const [cx, cy] = dMid(f);
    if (!reachable(cx, cy, true)) { Sound.fx.tick(420, 0.3); return; }
    attack(kind === "tap" ? "punch" : kind, f, dir);
  } else if (o && !S.held) {
    // In the flare: he goes to it and catches it. Out of it: a boulder lying near, he heaves up; a
    // thing in the air, he marks, and if he is standing when it comes he takes it out of the air.
    if (S.flare.on) { catchThing(o); return; }
    if (o.st === "rest") { if (!heave(o)) Sound.fx.tick(420, 0.3); return; }
    S.mark = o; Sound.fx.tick(1200, 0.35);
  }
}
// A stroke on the screen: a tap; up (the uppercut); down (the slam); across (the hurl); or the
// sign of the cross, down and then across (either way, or both, as the cross is made).
function stroke(P) {
  let len = 0; for (let i = 1; i < P.length; i++) len += dist(P[i - 1][0], P[i - 1][1], P[i][0], P[i][1]);
  if (len < 16) return { kind: "tap" };
  const [x0, y0] = P[0], [x1, y1] = P[P.length - 1];
  // The turn: the point furthest down that is not yet across.
  let c = 0, best = -1e9; for (let i = 1; i < P.length; i++) { const v = (P[i][1] - y0) - 1.2 * Math.abs(P[i][0] - x0); if (v > best) { best = v; c = i; } }
  const [xc, yc] = P[c]; let across = 0, drift = 0;
  for (let i = c; i < P.length; i++) { across = Math.max(across, Math.abs(P[i][0] - xc)); drift = Math.max(drift, Math.abs(P[i][1] - yc)); }
  if (yc - y0 > 22 && Math.abs(xc - x0) < (yc - y0) * 0.8 && across > 18 && drift < across * 1.1) return { kind: "cross" };
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, dir = [dx / L, dy / L];
  return { kind: dy < -0.55 * L ? "kick" : dy > 0.55 * L ? "slam" : "hurl", dir };
}
// The sign of the cross over a demon in his light: it is driven back, hurt and shaken. It costs
// flare; without enough, it does nothing.
const CROSS_COST = 0.3, HOLD_SIGN = 0.5;
function blessDemon(f) {
  if (!alive(f) || S.act) return;
  const [cx, cy] = dMid(f);
  if (!reachable(cx, cy, true)) { Sound.fx.tick(420, 0.3); return; }
  if (S.meter < CROSS_COST) { S.crosses.push({ kind: "fizzle", x: cx, y: cy, t: 0, size: 18 }); S.meterFlash = 0.8; Sound.fx.gutter(); return; }
  S.meter -= CROSS_COST;
  S.crosses.push({ kind: "smite", x: cx, y: cy, t: 0, size: 24 });
  f.brokenT = 1.6; S.freeze = 0.12; S.whiteT = 0.22;
  blowTo(f, 3, sign(f.x - S.x) * 300, -220, "hurl", "cross");
  for (let k = 0; k < 30; k++) { const a = Math.random() * TAU, v = 60 + Math.random() * 220; S.parts.push({ kind: "spark", c: k % 2 ? C.flameHot : SINS[f.sin].color, x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.7, age: 0, real: true }); }
  Sound.fx.unlock(); Sound.fx.demonBroken(f.sin); Sound.fx.castOut(f.sin); S.shake = 0.3;
}
// The sign of the cross over himself: a ward, free, that stays on him while he climbs and swings,
// and fights, for WARD_T. It turns away the first blow that reaches him (a thing thrown, a snatch,
// a ribbon cast), and is spent; then he must sign himself again. His own blows do not spend it.
const WARD_T = 45;
function ward() {
  if (S.legsIn) freeLegs(true);
  if (S.act || S.atk || S.rt - (S.blessT === undefined ? -9 : S.blessT) < 0.5) return;
  S.blessT = S.rt;
  ev("ward on");
  S.ward = { t: 0, n: boonOn("double") ? 2 : 1 }; const [cx, cy] = middle();
  S.crosses.push({ kind: "ward", x: cx + S.dir * 18, y: cy - 10, t: 0, size: 20 }); Sound.fx.unlock();
  // And with each blessing, one coin of the gold clinging to him shaken off (one only), to fall away.
  if (S.coins > 0) {
    S.coins--; ev("a coin shaken off", { left: S.coins });
    S.things.push({ kind: "coin", x: cx - S.dir * 5, y: cy + 4, vx: -S.dir * (50 + Math.random() * 40), vy: -150, rot: 0, vr: 0, st: "fly", by: null, g: 330, age: 0, life: 4, r: 4 });
    for (let k = 0; k < 6; k++) S.parts.push({ kind: "spark", c: SINS.avarice.color, x: cx - S.dir * 5, y: cy + 4, vx: (Math.random() - 0.5) * 90, vy: -20 - Math.random() * 70, life: 0.45, age: 0, real: true });
    Sound.fx.coin(panX(cx), 0.8);
    if (!S.shedSeen) { S.shedSeen = true; tip("shedSeen", { text: "A COIN SHAKEN OFF", sub: "With each blessing, one of the coins on him falls away.", t: 0 }); }
  }
}
// A blow turned: the ward spent (doubled, one of the two; under St Benedict's medal, not at all).
function spendWard() {
  if (!S.ward || boonOn("vade")) return;
  if ((S.ward.n || 1) > 1) S.ward.n--; else S.ward = null;
}
const wardFade = () => (S.ward ? clamp((WARD_T - S.ward.t) / 5, 0.25, 1) * (S.ward.t > WARD_T - 3 && Math.floor(S.rt * 9) % 2 ? 0.45 : 1) : 0);
// Swinging on the rope, fast, into a demon: a kick, as hard as the swing.
// Coming down on a demon from above, from any height (a fall, a let-go, a flash above it): he
// lands on it with both feet, and springs off. The harder the fall, the harder the blow.
function stomp(vyIn, yIn) {
  if (vyIn < 120 || S.ground) return false;
  for (const f of S.demons) {
    if (!alive(f) || f.st === "legs" || (f.stompCd || 0) > S.rt || Math.abs(S.x - f.x) > f.hw + HW - 2) continue;
    const top = f.y - f.ht;
    if (yIn <= top + 6 && S.y >= top - 2) {
      f.stompCd = S.rt + 0.35;
      impact(f, 0, 1, vyIn > 430 ? 1.8 : 1.2, f.x, f.y - f.ht);
      blowTo(f, vyIn > 430 ? 2 : 1, sign(f.x - S.x) * 40 || 40, 0, undefined, "stomp");
      if (alive(f) && !f.idol) setSt(f, "down");
      S.y = top - 0.5; S.vy = -330; S.vx *= 0.5; S.stompT = 0.4; S.ground = false;
      Sound.fx.kick(1, panX(f.x)); Sound.fx.land(0.8); S.shake = 0.2; gain(0.08);
      for (let k = 0; k < 8; k++) S.parts.push({ kind: "spark", c: SINS[f.sin].color, x: f.x + (Math.random() - 0.5) * 16, y: top, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 120, life: 0.4, age: 0 });
      return true;
    }
  }
  return false;
}
function swingKick() {
  const sp = Math.hypot(S.vx, S.vy); if (sp < 170 || S.kickCd > 0) return;
  const fx = S.x + sign(S.vx) * 12;
  for (const f of S.demons) if (alive(f) && f.st !== "legs" && Math.abs(f.x - fx) < f.hw + 16 && f.y - f.ht < S.y + 4 && f.y > S.y - HT - 6) {
    impact(f, sign(S.vx), -0.2, sp > 380 ? 2 : 1.3);
    blowTo(f, sp > 380 ? 2 : 1, S.vx * 0.9, -160 - sp * 0.2, "hurl", "swing");
    Sound.fx.kick(1, panX(f.x)); S.swingKickT = 0.35; S.kickCd = 0.45; S.shake = 0.15; gain(0.1);
    S.vx *= 0.6; S.vy *= 0.6; S.dir = sign(S.vx) || S.dir;
    break;
  }
}
