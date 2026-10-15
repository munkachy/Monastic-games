"use strict";
// While You Have the Light: the climb, on the endless mountain and on the seven.
// The mountain goes up for ever, made by rules as he climbs: shafts, and between them long
// crossings with a ceiling to swing from and pits too wide to walk (never by chance alone: a
// clear way up always stays open, and rock to hook is always within the rope's reach). The
// torch is the clock: its light shrinks as it burns, the rock throws its shadows, and the
// verses of Psalm 118 cut into the rock fill it again, one stanza after another, Aleph to Tau.
//
// Touch: tap the rock and he throws the hook there, in an arc (swinging, a tap to one side of
// him: he lets go, flips over the way he is going, and throws it up at 45 degrees on the side
// tapped). Under the left thumb, a faint cross of four ways: up climbs the rope (against a wall
// he walks up it, hand over hand, the torch held in one), down lets it out; left and right
// swing on it (or walk, slow and careful, on the ground); swing into a wall and hold toward it
// to cling. At a ledge he pulls himself up. The button in the right corner is
// for everything else: on the rope, let go (at the top of a swing, a flip and a moment hung in
// the air); on a wall, a leap off it; with a boulder in his arms, drop it. The button above it:
// the flare, which slows the world while its meter lasts (fighting fills it). Every tap
// does the same thing in the flare or out: a demon, he zips to it and strikes; a boulder, he
// zips to it and catches it; with a boulder, he flings it; rock, the hook (in the flare, he
// appears there instead, through rock if need be). On the ground the hook goes only upward.
// Keys: click to throw the hook, arrows or A/D to swing and cling, W (or both arrows) to climb
// the rope and S to let it out, Space for the button, Shift to flare, Esc to pause.
//
// The climb is in seven files, loaded in this order: climb-world.js, climb-run.js, climb-foes.js,
// climb-fight.js, climb-frame.js, climb-draw.js, and this one (the record, touch and keys, and
// Climb itself). They share their top-level names; see CODEMAP.md.

// ---- The record, for notes to Claude ---------------------------------------------------------------
// The last half-minute of the climb, four times a second (where he was, what he was doing, the
// demons near him and what they were doing), and the last things that happened (blows given and
// taken, the ward, the blocks, the verses). A note sent from the pause screen carries it, so what
// went wrong can be seen, not only remembered.
const REC_N = 120, EV_N = 80;
let REC = { snaps: [], events: [], next: 0 };
function ev(what, o) { if (!S) return; REC.events.push(Object.assign({ t: Math.round(S.rt * 100) / 100, what }, o || {})); if (REC.events.length > EV_N) REC.events.shift(); }
const r2 = (v) => Math.round(v * 100) / 100;
function doing() {
  return S.dying ? "dying" : S.latched ? "held in a great demon's jaws" : S.act ? S.act.kind : S.atk ? "striking (" + S.atk.kind + ")" : S.hang ? "hanging from a ledge" : S.cling ? "on the rock" : S.rope ? (S.ground ? "standing, hooked" : S.climbing ? "climbing the rope" : "swinging") : S.flip ? "flipping" : S.ground ? (Math.abs(S.vx) > 5 ? "walking" : "standing") : "in the air";
}
function snapNow() {
  const I = pads(), near = [], things = [];
  for (const f of S.demons) { if (f.st === "gone" || dist(f.x, f.y, S.x, S.y) > 600) continue; near.push({ sin: f.sin, idol: f.idol ? true : undefined, st: f.st, hp: r2(f.hp), dx: Math.round(f.x - S.x), dy: Math.round(f.y - S.y), block: f.block ? f.block.shape : undefined }); if (near.length >= 6) break; }
  for (const o of S.things) { if (o.st === "gone" || dist(o.x, o.y, S.x, S.y) > 500) continue; things.push({ kind: o.kind, st: o.st, by: o.by || undefined, dx: Math.round(o.x - S.x), dy: Math.round(o.y - S.y) }); if (things.length >= 6) break; }
  const great = S.bigs.filter((g) => dist(g.x, g.y, S.x, S.y) < 900).slice(0, 3).map((g) => ({ tier: g.tier, st: g.st, hp: g.hp, wake: r2(g.wake), stun: r2(g.stunT), dx: Math.round(g.x - S.x), dy: Math.round(g.y - S.y), blows: g.st === "latch" ? g.blows + "/" + g.need : undefined }));
  return { t: r2(S.rt), m: metres(-S.y), x: Math.round(S.x), y: Math.round(S.y), vx: Math.round(S.vx), vy: Math.round(S.vy), doing: doing(), dir: S.dir, pads: (I.l ? "L" : "") + (I.r ? "R" : "") + (I.u ? "U" : "") + (I.dn ? "D" : ""),
    ward: S.ward ? Math.round(WARD_T - S.ward.t) : 0, torch: r2(S.fuel), flare: r2(S.meter), coins: S.coins || 0, block: S.tied ? S.tied.shape + (S.tied.st === "hand" ? " (in hand)" : S.tied.flung ? " (thrown)" : "") : null, rope: S.rope ? Math.round(freeOf(S.rope)) : null, demons: near, great: great.length ? great : undefined, things };
}
function record() {
  const sec = sectionAt(Math.max(1, Math.floor(-S.y / CELL)));
  return { mode: NOV ? "seven mountains" : "endless climb", mountain: NOV ? NOV.domain : sec.dom, section: { k: sec.k, type: sec.type, dom: sec.dom, gate: !!sec.gate }, seed,
    now: snapNow(), recent: REC.snaps.slice(), events: REC.events.slice(), blocks: S.blocks.map((b) => ({ shape: b.shape, st: b.st })), binned: S.binned, best: metres(S.top),
    faults: typeof FAULTS !== "undefined" ? FAULTS.slice() : [] };
}
// A picture of the moment (taken as the pause begins, before the pause screen is drawn over it).
function grabScreen() {
  try { const k = Math.min(1, 1280 / cv.width), c = document.createElement("canvas"); c.width = Math.round(cv.width * k); c.height = Math.round(cv.height * k); c.getContext("2d").drawImage(cv, 0, 0, c.width, c.height); return c; } catch (e) { return null; }
}
// ---- Touch, mouse and keys ------------------------------------------------------------------------
// Going on after a verse: the climb moves again (its last words fading), with nothing held over.
function goOn() { if (S.freedPend) freedSay(); S.verseHold = false; if (S.verse) S.verse.t = Math.max(S.verse.t, 5.6); S.touches.clear(); Sound.muffle(false, 0.3); }
const inDpad = (p) => { const b = dpad(); return !usingKeys() && dist(p.x, p.y, b.x, b.y) < b.r + 18; };
const pid = (ev) => (ev && ev.pointerId !== undefined ? ev.pointerId : "m");
const M = {
  action, start, scene, edges, solid, island, sectionAt, trav, cave, slope, thornAt, eyeOf, almsOf, ledge, get S() { return S; }, get nov() { return NOV; }, CELL, COLS, HOOK, TH, DOMAINS, BUILT,
  blocks: { newBlock, reveal, tie, loosen, carryOff, brotherOf, yank, hitMonk, hurtDemon, takeUp, throwBlock, TETHER, SHAPES, THROW_LEN },
  great: { placeGreat, strikeGreat, latch, punchOut, hurl, bigAt, burstAfter, burstSpot, startDread, onView, GREAT_V, GRASP },
  keptPlace: (dom) => keptAll()[dom] || null, forgetPlace: forget,
  boons: { BOONS, BOON_ORDER, boonOf, showBoon, grantBoon, VADE_R }, crawl: crawlOf, relicsOf, lightR: () => lightR(), combo: (m, f) => comboHit(m, f), swallowLegs: (f) => swallowLegs(f),
  wall: (n) => { const w = wallAt(n); return { w, pos: wallPos(w) }; }, record, pauseShot: null, pauseRec: null,
  step, draw,
  down(p, ev) {
    if (!S || S.dying) return;
    if (S.verseHold) { goOn(); return; }
    if (S.tipHold) { tipGone(); return; }
    if (S.dread || S.boonShow || S.angel) return;
    const id = pid(ev);
    if (inDpad(p)) { S.touches.set(id, { pad: 0, dpad: true, x: p.x, y: p.y, born: performance.now() }); return; }
    // Held in a great demon's jaws: every tap (but on the thumb's cross) is a blow from inside it.
    if (S.latched) { S.touches.set(id, { pad: 0, act: true, born: performance.now() }); punchOut(); return; }
    if (S.legsIn && dist(p.x + S.cam.x, p.y + S.cam.y, S.x, S.y - 8) < 46) { S.touches.set(id, { pad: 0, act: true, born: performance.now() }); kickLegs(); return; }
    const ab = actBtn(); if (!usingKeys() && dist(p.x, p.y, ab.x, ab.y) < ab.r + 10) { S.touches.set(id, { pad: 0, act: true, born: performance.now() }); if (lookable()) S.look = { id }; else action(); return; }
    const fb = flareBtn(); if (!usingKeys() && dist(p.x, p.y, fb.x, fb.y) < fb.r + 10) { S.touches.set(id, { pad: 0, act: true, born: performance.now() }); if (S.flare.on) endFlare(); else startFlare(); return; }
    const wx = p.x + S.cam.x, wy = p.y + S.cam.y, t = { pad: 0, born: performance.now() };
    { const G = cartAt(S.x, S.y); if (G && Math.abs(wx - G.cart) < 30 && wy > G.y - 40 && wy < G.y + 6) { if (S.tied && S.tied.out === G) { S.tied.out = null; deliver(G); } else if (!S.tied) unbin(G); return; } }
    S.touches.set(id, t);
    // Two fingers down on the play together: he signs himself (the ward). The first finger's
    // throw, if it is still in the air, is called back; neither finger's tap or swipe counts.
    const other = [...S.touches.entries()].find(([k, u]) => k !== id && !u.dpad && !u.act);
    if (!usingKeys() && other && !other[1].two && t.born - other[1].born < 260) {
      t.two = other[1].two = true; if (other[1].g) other[1].g.done = true;
      if (S.shot && S.shot.ph === "fly" && S.shot.t < 0.3) S.shot = null;
      S.pend = null;
      ward();                // (signed again while warded: the ward made new, and another coin shaken off)
      return;
    }
    if (S.act) return;
    // The block: in his hands, a tap throws it there (at a demon, great or not, straight at it; but a
    // demon close by, he swings it into it, still in his hands). On
    // its rope near him, tapped: he takes it up. A great demon tapped: only a block can hurt it;
    // with the block near him on its rope, he takes it up and throws it at once.
    const B = S.tied, gB = bigAt(wx, wy);
    if (B && !S.atk && B.st === "hand") {
      const f = gB ? null : demonAt(wx, wy), [ax, ay] = gB ? [gB.x, gB.y - gB.ht / 2] : f ? dMid(f) : [wx, wy];
      if (S.ground && ((gB && closeBy(gB, 30)) || (f && alive(f) && !f.idol && besides(f)))) { swingBlock(f, gB); return; }
      throwBlock(ax, ay); return;
    }
    if (gB) {
      if (B && !S.atk && takeUp()) throwBlock(gB.x, gB.y - gB.ht / 2);
      else { Sound.fx.tick(420, 0.3); if (!S.say) S.say = { text: "ONLY A BLOCK CAN HURT IT", sub: B ? "Go up to the block on your rope, then tap the demon." : "Throw down an idol for its block.", t: 0 }; }
      return;
    }
    if (B && !S.atk && B.st === "tied" && !B.flung && dist(wx, wy, B.x, B.y - B.ht / 2) < Math.max(26, B.hw + 14)) { if (!takeUp()) Sound.fx.tick(420, 0.3); return; }
    // On a demon or a boulder: wait to see if it is a tap or a swipe.
    // A boulder tapped right on wins over the demon behind it.
    let f = demonAt(wx, wy), o = thingAt(wx, wy);
    if (f && o) { if (dist(wx, wy, o.x, o.y) < 22) f = null; else o = null; }
    if (f || o) { t.g = { f, o, path: [[p.x, p.y]], t0: S.rt }; return; }
    // From himself: perhaps the sign of the cross over himself.
    const [mcx] = middle();
    if (!S.held && Math.abs(wx - mcx) < 30 && wy > S.y - HT - 30 && wy < S.y + 10) { t.g = { self: true, path: [[p.x, p.y]], t0: S.rt }; return; }
    if (S.atk && !S.atk.hit) return;
    if (S.held) { S.atk = null; throwHeld(wx, wy, null); return; }
    if (S.flare.on) { blink(wx, wy); return; }
    if (S.atk) return;
    if (S.ground && wy > S.y - 30) return;
    // Swinging, a tap on fresh rock: he lets go, flips over, and hooks it as he comes round.
    // (On a touch screen, a tenth of a second late: if a second finger follows, it was the
    // sign of the cross over himself, and he keeps hold of the rope.)
    if (S.rope && !S.ground) { if (usingKeys()) swapHook(wx, wy, tapSide(wx)); else S.pend = { wx, wy, side: tapSide(wx), t: 0.1 }; return; }
    if (S.next) { S.next.side = tapSide(wx); return; }
    throwHook(wx, wy);
  },
  move(p, ev) {
    if (!S) return;
    const t = S.touches.get(pid(ev));
    if (t && t.dpad) { t.x = p.x; t.y = p.y; }
    if (t && t.g && t.g.path.length < 80) t.g.path.push([p.x, p.y]);
  },
  up(p, ev) {
    if (!S) return;
    const id = pid(ev), t = S.touches.get(id); S.touches.delete(id);
    if (S.look && S.look.id === id) S.look = null;
    if (t && t.g && !t.g.done && !S.act) {
      t.g.path.push([p.x, p.y]);
      const k = stroke(t.g.path);
      // On keys, a click on a demon with an arrow held is the stroke that way: up the uppercut,
      // down the slam, either way across the hurl.
      if (t.g.f && k.kind === "tap" && usingKeys()) {
        const K = S.keys, l = K.ArrowLeft || K.KeyA, r = K.ArrowRight || K.KeyD;
        if (K.ArrowUp || K.KeyW) Object.assign(k, { kind: "kick", dir: [0, -1] });
        else if (K.ArrowDown || K.KeyS) Object.assign(k, { kind: "slam", dir: [0, 1] });
        else if (l !== r) Object.assign(k, { kind: "hurl", dir: [r ? 1 : -1, 0] });
      }
      if (t.g.self) { if (k.kind === "cross") ward(); }
      else if (t.g.f && k.kind === "cross") blessDemon(t.g.f);
      else if (t.g.f) gesture(k.kind, t.g.f, null, k.dir);
      else if (t.g.o) gesture("tap", null, t.g.o, null);
    }
  },
  // No finger left on the glass (or the page put away): let go of whatever is still held, the
  // pad above all. The browser does not always say when a finger lifts (a swipe it took for
  // itself, a finger slid off the edge), and a pad held down for ever walks him off a cliff.
  allUp(at, keysToo) {
    if (!S) return;
    for (const [id, t] of S.touches) if (!(t.born > at)) S.touches.delete(id);
    if (keysToo) S.keys = {};
  },
  key(code, down, e) {
    if (!S) return;
    S.keys[code] = down;
    if (!down && code === "Space" && S.look) S.look = null;
    if (S.verseHold) { if (down) goOn(); return; }
    if (S.tipHold) { if (down && code !== "Escape" && code !== "KeyP") { tipGone(); return; } }
    if (!down) return;
    if ((S.dread || S.boonShow || S.angel) && code !== "Escape" && code !== "KeyP") return;
    if (code === "Escape" || code === "KeyP") M.pause();
    else if (S.latched) { if (!(e && e.repeat)) punchOut(); }          // (in its jaws: any key, a blow)
    else if (code === "Space") { if (S.look) return; if (lookable()) S.look = { id: "key" }; else action(); }
    else if (code === "ShiftLeft" || code === "ShiftRight") { if (S.flare.on) endFlare(); else startFlare(); }
  },
  pause() {
    if (mode !== M || S.dying) return;
    M.pauseShot = grabScreen(); try { M.pauseRec = record(); } catch (e) { fault(e); M.pauseRec = { faults: FAULTS.slice() }; }
    ClimbPause.t = 0; mode = ClimbPause; Sound.muffle(true, 0.2);
  },
  resume() {
    mode = M; Sound.muffle(false, 0.2);
    S.touches.clear(); S.keys = {};
  },
  over() {
    const m = metres(S.top), rows = [["Height reached", m + " m"], ["Verses read", S.read], ["Demons cast out", S.cast]];
    if (S.relics) rows.push(["Relics found", S.relics]);
    if (S.freedN) rows.push(["Freed from the idols", S.freedN]);
    if (!NOV) rows.push(["Your best", (save.climbBest || m) + " m"]);
    return rows;
  },
};
const Climb = M;

// The pause for the climb.
const ClimbPause = {
  t: 0,
  step(dt) { ClimbPause.t += dt; },
  draw() {
    try { Climb.draw(); } catch (e) { fault(e); }     // (the pause must come up even if the mountain cannot be drawn)
    rect(0, 0, W, H, "rgba(3,3,5,0.82)");
    const cx = Math.min(W * 0.26, 170), bw = 200;
    text("PAUSED", cx, 46, { align: "center", font: FONT.title, size: 22, weight: 700, spacing: 5, color: "#fff" });
    let y = 66;
    const b = (label, act, o) => { button(label, cx - bw / 2, y, bw, 30, act, o || {}); y += 38; };
    b("GO ON", () => Climb.resume(), { hot: true });
    const room = Climb.nov && Climb.nov.room && typeof Room !== "undefined";
    b("BEGIN AGAIN", () => { Sound.muffle(false); Game.again(true); }, room ? { sub: "The same scene, from its start" } : Climb.nov ? { sub: "From the foot of the mountain" } : {});
    if (room) b("THE WHITE ROOM", () => Room.open(), { sub: "Say another scene" });
    else b(Climb.nov ? "THE SEVEN MOUNTAINS" : "TO THE SEVEN MOUNTAINS", () => Game.toNovitiate());
    { const hw = bw / 2 - 3; button(soundLabel(), cx - bw / 2, y, hw, 30, cycleSound, {});
      button(tipsOn() ? "TIPS: ON" : "TIPS: OFF", cx + 3, y, hw, 30, () => setTips(!tipsOn()), { sub: tipsOn() ? "" : "On again: all shown again" }); y += 38; }
    b("BACK TO THE TITLE", () => Game.toTitle());
    if (typeof Verses !== "undefined") b("THE VERSES", () => Verses.open(), { sub: Verses.custom ? "Your own, from a file" : "Douay-Rheims, or your own" });
    if (typeof Notes !== "undefined" && Notes.ready) b("A NOTE FOR CLAUDE", () => Notes.open(Climb.pauseShot, Climb.pauseRec), { sub: "What happened; what should change" });
    const mx = Math.max(cx + bw / 2 + 24, W * 0.42);
    const mv = usingKeys()
      ? [["CLICK THE ROCK", "He throws the hook there, however far (a long throw reels him up); swinging, to one side of him: he flips, then hooks up that way"], ["W, OR BOTH ARROWS", "Climb the rope or the rock; at a ledge, again to pull up"], ["S OR \u2193", "Let the rope out, climb down; on the ground, crawl (into a way too low to stand in, he crawls by himself)"], ["← →  OR  A D", "Rock the swing to build it (swing into what is thrown: kick it back); walk; toward a wall: climb it (not mid-flip)"], ["SPACE", "Let go, leap off a wall, drop what he holds"], ["CLICK A DEMON IN THE LIGHT", "Zip and strike; hold ▲ / ▼ / ◀▶ as you click (or drag that way): uppercut, slam, hurl; land on it: stomp"], ["CLICK WHAT IS THROWN, THEN CLICK", "Standing, he catches it as it comes; then he flings it (near a demon: strikes with it)"], ["HOLD THE CLICK ON A DEMON / ON HIM", "The sign of the cross: drives it back (costs flare) / a ward, free, for 45 s: it turns one blow that reaches him"], ["SHIFT", "The flare: time slows; click anywhere: appear there. Fills slowly, faster as you fight"]]
      : [["TAP THE ROCK", "He throws the hook there, however far (a long throw reels him up); swinging, to one side of him: he flips, then hooks up that way"], ["▲  ▼", "Climb the rope or the rock (at a ledge, again to pull up); let out the rope, climb down; on the ground, ▼ crawls (into a way too low to stand in, he crawls by himself)"], ["◀  ▶", "Rock the swing to build it (swing into what is thrown: kick it back); walk; toward a wall: climb it (not mid-flip)"], ["THE CORNER BUTTON", "Let go, leap off a wall, drop what he holds"], ["TAP A DEMON IN THE LIGHT", "Zip and strike; swipe up / down / across: uppercut, slam, hurl; land on it: stomp"], ["TAP WHAT IS THROWN, THEN TAP", "Standing, he catches it as it comes; then he flings it (near a demon: strikes with it)"], ["HOLD STILL ON A DEMON / TWO FINGERS", "The sign of the cross: drives it back (costs flare) / over himself, a ward, free, for 45 s: it turns one blow that reaches him"], ["FLARE", "Time slows; tap anywhere: appear there; tap what is thrown: take it. Fills slowly, faster as you fight"]];
    // (In the seven mountains: the block, and the great demons.)
    if (Climb.nov) mv.push(usingKeys() ? ["CLICK THE BLOCK ON ITS ROPE, THEN CLICK", "He takes it up, then throws it, its rope paying out. Only a block hurts a great demon (thrown, swung, or struck with), but it laughs, and throws it back at you"] : ["TAP THE BLOCK ON ITS ROPE, THEN TAP", "He takes it up, then throws it, its rope paying out. Only a block hurts a great demon (thrown, swung, or struck with), but it laughs, and throws it back at you"],
      [usingKeys() ? "IN A GREAT DEMON'S JAWS: CLICK, CLICK" : "IN A GREAT DEMON'S JAWS: TAP, TAP", "Strike your way out of it (any key will do). The longer it holds you, the faster the torch goes. On the rope, swing into it hard and it only knocks you off; slowly, and it takes you in"]);
    // Each move over as many lines as it needs; as large as lets them all fit.
    const cw = W - mx - 16;
    let z = 8.5; const lines = (sz) => mv.reduce((n, [, what]) => n + 1 + wrap(what, cw, "500 " + sz + "px " + FONT.ui).length, 0);
    while (z > 6.5 && lines(z) * (z + 2) + mv.length * 5 > H - 70) z -= 0.5;
    text("THE MOVES", mx, 40, { size: 9, weight: 800, spacing: 3, color: C.flame });
    let yy = 58;
    for (const [k, what] of mv) {
      text(k, mx, yy, { size: z, weight: 800, spacing: 1, color: "#f1ede4", max: cw });
      yy += (z + 2) * (1 + textLines(what, mx, yy + z + 2, cw, { size: z, weight: 500, color: "#b9b3a6", lh: z + 2 })) + 5;
    }
  },
  key(code, down) { if (down && (code === "Escape" || code === "KeyP" || code === "Enter")) Climb.resume(); },
};
