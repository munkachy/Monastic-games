"use strict";
// Fear Not: the fight. Down on the wet street round the car, side on, with room to move up and
// down as in Double Dragon. Flowing crowd combat, as in the Batman Arkham games.
// Touch: tap a demon to zip to it and strike, and keep tapping to chain; tap one showing the gold
// sign to counter; swipe away from a red sign to dodge; tap twice for a heavy blow that breaks a
// guard; swipe up to launch; hold to block; tap open street to zip there and make room.
// Keyboard: the arrows move him; Space strikes toward the arrow held; X counters, Z dodges,
// C is the heavy blow, E launches, Q blocks, B blesses.
// Fr. Lawrence fights drunken fist: he sways and staggers, and he never simply walks. His angel
// waits above, out of sight, a light over his head, and comes down only at the great moments:
// every fifth blow of a combo, when a demon has him in its grip, and when he falls.
// The father sits frozen in his car; his own guardian angel is pinned against it in chains of
// shadow. Break the chains and the guardian rises to fight beside you for a moment.

const Fight = (() => {
  const Y0 = 250, Y1 = 338, SPIRIT = 10, SKY = 430;
  const depth = (y) => 0.82 + 0.24 * (y - Y0) / (Y1 - Y0);
  let G = null, bg = null, bgKey = "";
  const carX = () => W * 0.5, CARY = 238;
  // Fr. Lawrence in the fight: a steel-blue coat, a gold band on his hat, the light of his angel
  // round his edges and a ring of it at his feet, so he can never be mistaken for the demons,
  // who are black and edged in red.
  const PRIEST_FIGHT = { trouser: "#2a3656", trouser2: "#1c2640", coat: "#3a4c78", coat2: "#283658", lapel: "#6a7ca8", shoe: "#0c0e18", skin: "#9a6e58", skinSh: "#4e342a", collar: "#ffffff", hat: "#33446c", band: "#e8c46a", glass: "#c4f0ff" };
  const DEMON_RIMS = ["#ff2a2a", "#ff6a2a", "#e0105a"];

  // ---- Poses ---------------------------------------------------------------------------------------
  // Fr. Lawrence's drunken-fist stance: always swaying, a cupped hand up as if it held a cup.
  const idleP = (t) => pose({ lean: 0.1 + 0.1 * Math.sin(t * 1.7), head: -0.05 + 0.1 * Math.sin(t * 1.7 + 1), sF: 1.15 + 0.15 * Math.sin(t * 1.7), eF: 1.6, sB: -0.35 + 0.12 * Math.sin(t * 1.7 + 2), eB: 0.9, hF: 0.3 + 0.08 * Math.sin(t * 1.7), kF: 0.38, hB: -0.3 + 0.05 * Math.sin(t * 1.7 + 1), kB: 0.28 });
  // The lurching run: legs crossing, leaning, arms loose; now and then a trip.
  const walkP = (ph, trip) => trip ? pose({ lean: 0.95, head: 0.4, sF: 2.1, eF: 0.3, sB: 2.4, eB: 0.2, hF: 0.9, kF: 0.6, hB: -0.9, kB: 0.4 })
    : pose({ lean: 0.32 + 0.14 * Math.sin(ph * 0.5), head: 0.1 * Math.sin(ph * 0.5 + 1), sF: 0.9 + 0.6 * Math.sin(ph * 0.5 + 1), eF: 1.2, sB: -0.6 + 0.5 * Math.sin(ph * 0.5), eB: 0.7, hF: 0.6 * Math.sin(ph), kF: 0.25 + 0.35 * Math.max(0, Math.cos(ph)), hB: -0.6 * Math.sin(ph), kB: 0.25 + 0.35 * Math.max(0, -Math.cos(ph)) });
  const TUCK = pose({ lean: 0.5, head: 0.4, sF: 1.6, eF: 2.2, sB: 1.4, eB: 2.2, hF: 2.2, kF: 2.6, hB: 2.0, kB: 2.5 });
  // The strikes he flows through: [wind-up, blow, name].
  const STRIKES = [
    [{ lean: -0.1, sF: 0.6, eF: 1.6, sB: -0.4, eB: 0.6, hF: 0.3, kF: 0.3, hB: -0.4, kB: 0.2 }, { lean: 0.32, sF: 1.68, eF: 0.05, sB: -0.9, eB: 0.3, hF: 0.75, kF: 0.4, hB: -0.65, kB: 0.05 }, "palm"],
    [{ lean: 0.25, sB: 0.3, eB: 1.8, sF: 0.8, eF: 1.2, hF: 0.4, kF: 0.5 }, { lean: -0.35, head: 0.25, sB: 1.95, eB: 0.15, sF: -0.6, eF: 1.0, hF: 0.95, kF: 0.25, hB: -0.2, kB: 0.6 }, "cup"],
    [{ lean: 0.1, hF: 0.6, kF: 1.6, sF: 1.2, eF: 1.2, sB: -1.0 }, { lean: -0.5, hF: 2.15, kF: 0.05, hB: -0.12, kB: 0.05, sF: 2.4, eF: 0.4, sB: -1.6, eB: 0.3 }, "kick"],
    [{ kF: 0.6, hF: 0.3, lean: 0.12, sF: 1.0, eF: 1.5 }, { lift: 18, hF: 1.75, kF: 2.2, hB: -0.5, kB: 0.9, sF: 1.4, eF: 1.9, sB: -1.3, lean: 0.18 }, "knee"],
    [{ lean: 0.3, hF: 0.9, kF: 1.9, hB: -0.4, kB: 1.7, sF: 1.0, eF: 1.2, sB: -0.8 }, { lean: 0.42, hF: 1.55, kF: 0.1, hB: -0.25, kB: 2.1, sF: 1.3, eF: 0.4, sB: -1.5, eB: 0.4 }, "sweep"],
    [{ sF: 2.6, eF: 0.6, sB: -0.6, lean: -0.15, hF: 0.4, kF: 0.4 }, { sF: 1.25, eF: -0.25, sB: -1.0, lean: 0.25, hF: 0.7, kF: 0.3, hB: -0.5 }, "water"],
  ];
  // The heavy blow: both palms, with holy water. It breaks a guard.
  const HEAVY = [{ sF: 0.4, eF: 2.0, sB: 0.3, eB: 2.0, lean: -0.15, kF: 0.7, kB: 0.7, hF: 0.4, hB: -0.3 }, { sF: 1.62, eF: 0, sB: 1.5, eB: 0.1, lean: 0.38, hF: 0.85, kF: 0.6, hB: -0.75, kB: 0.1 }, "heavy"];
  // The launch: a crouch, and a kick that rises straight up.
  const LAUNCH = [{ lean: 0.3, hF: 0.9, kF: 1.8, hB: -0.3, kB: 1.6, sF: 0.8, eF: 1.4, sB: -0.5 }, { lean: -0.55, hF: 2.7, kF: 0.1, hB: -0.1, kB: 0.05, sF: 2.6, eF: 0.3, sB: -1.8, eB: 0.3, lift: 26 }, "launch"];
  const HURT = pose({ lean: -0.45, head: -0.4, sF: 2.0, eF: 0.4, sB: 2.4, eB: 0.3, hF: 0.6, kF: 0.2, hB: -0.2, kB: 0.5 });
  const BLOCKP = pose({ lean: 0.2, head: 0.3, sF: 1.0, eF: 2.2, sB: 0.9, eB: 2.2, hF: 0.5, kF: 0.9, hB: -0.3, kB: 0.8 });
  const CROSS = [pose({ sF: 2.9, eF: 0.1, sB: -0.3, eB: 0.6, lean: -0.1, hF: 0.2, kF: 0.1, hB: -0.2 }), pose({ sF: 1.6, eF: 0.1, sB: -0.3, eB: 0.6, lean: 0.1 }), pose({ sF: 1.3, eF: 0.6, lean: 0.05 }), pose({ sF: 1.3, eF: 1.4, lean: 0.05 })];
  const blessP = (u) => keyPose([[0, CROSS[0]], [0.3, CROSS[1]], [0.55, CROSS[2]], [0.8, CROSS[3]], [1, idleP(0)]], u);
  const GRABBED = (t) => pose({ lean: -0.2 + 0.15 * Math.sin(t * 22), head: 0.3, sF: 1.8 + 0.4 * Math.sin(t * 17), eF: 0.4, sB: 2.2, eB: 0.6, hF: 0.4, kF: 0.3, hB: -0.3, kB: 0.4, lift: 8 });
  const DOWNP = pose({ lean: -1.45, head: -0.3, sF: 2.8, eF: 0.2, sB: 2.4, eB: 0.4, hF: 1.5, kF: 0.2, hB: 1.3, kB: 0.3, lift: -22 });
  const CARRIEDP = pose({ lean: 0.1, head: -0.3, sF: 2.9, eF: 0.1, sB: 2.7, eB: 0.2, hF: 0.1, kF: 0.4, hB: -0.1, kB: 0.5 });
  // The angel: a dive with the wings folded back, a wing strike, and the climb away.
  const angelDive = pose({ lean: 0.9, head: 0.5, wa: -2.9, wl: 0.45, sF: 2.2, eF: 0.2, sB: 2.0, eB: 0.2, hF: -0.3, kF: 0.2, hB: -0.5, kB: 0.3 });
  const angelStrikeP = (u) => keyPose([[0, pose({ wa: -2.5, wl: 1, sF: 2.4, eF: 0.4, lean: -0.2, lift: 12 })], [0.45, pose({ wa: -0.35, wl: 1.25, sF: 1.6, eF: 0.0, lean: 0.4, lift: 6 })], [1, pose({ wa: -2.0, wl: 1, lift: 8 })]], u);
  const angelRise = pose({ wa: -2.3, wl: 1.25, lean: -0.1, sF: 0.4, eF: 0.3, hF: 0.1, kF: 0.3, hB: -0.1, kB: 0.4, lift: 10 });
  const angelCarry = pose({ wa: -2.2, wl: 1.2, lean: 0.1, sF: 1.0, eF: 0.6, sB: 0.9, eB: 0.7, hF: 0.1, kF: 0.3, hB: -0.1, kB: 0.4, lift: 10 });
  // Demons: hunched, twitching; the slapstick is all theirs.
  const demonIdle = (t, k) => pose({ lean: 0.35 + 0.08 * Math.sin(t * 2.3 + k), head: 0.3 + 0.2 * Math.sin(t * 3.1 + k), sF: 0.7 + 0.3 * Math.sin(t * 2 + k), eF: 0.8, sB: 0.4, eB: 0.9, hF: 0.25, kF: 0.5, hB: -0.3, kB: 0.4 });
  const demonWalk = (ph) => pose({ lean: 0.45, head: 0.3, sF: 0.5 + 0.5 * Math.sin(ph), eF: 0.8, sB: 0.5 - 0.5 * Math.sin(ph), eB: 0.8, hF: 0.5 * Math.sin(ph), kF: 0.6 + 0.3 * Math.cos(ph), hB: -0.5 * Math.sin(ph), kB: 0.6 - 0.3 * Math.cos(ph) });
  const demonWind = (grab) => grab ? pose({ lean: -0.1, head: 0.1, sF: 2.4, eF: 0.4, sB: 2.2, eB: 0.5, hF: 0.4, kF: 0.6, hB: -0.5, kB: 0.6 }) : pose({ lean: -0.15, head: 0.2, sF: 2.7, eF: 0.8, sB: -0.6, eB: 0.6, hF: 0.4, kF: 0.4, hB: -0.6, kB: 0.3 });
  const demonLunge = (grab) => grab ? pose({ lean: 0.9, head: 0.5, sF: 1.7, eF: 0.1, sB: 1.6, eB: 0.1, hF: 0.9, kF: 0.4, hB: -0.9, kB: 0.2 }) : pose({ lean: 0.7, head: 0.4, sF: 1.6, eF: -0.1, sB: -1.2, eB: 0.4, hF: 0.9, kF: 0.4, hB: -0.8, kB: 0.1 });
  const demonHurt = (t) => pose({ lean: -0.6, head: -0.7, sF: 2.3 + Math.sin(t * 30) * 0.4, eF: 0.6, sB: 2.8, eB: 0.3, hF: 0.7, kF: 0.4, hB: -0.1, kB: 0.6 });
  const demonDizzy = (t) => pose({ lean: 0.2 * Math.sin(t * 4), head: 0.5 * Math.sin(t * 4 + 1), sF: 0.2 + 0.4 * Math.sin(t * 4), eF: 0.3, sB: -0.2, eB: 0.3, hF: 0.25 * Math.sin(t * 4), kF: 0.5, hB: -0.25 * Math.sin(t * 4), kB: 0.5 });
  const demonFlail = (t) => pose({ lean: -0.5, head: -0.6, sF: 2.5 + Math.sin(t * 40) * 0.6, eF: 0.4, sB: 3.0 + Math.cos(t * 37) * 0.6, eB: 0.2, hF: 1.2 + Math.sin(t * 33) * 0.5, kF: 0.4, hB: 0.6 + Math.cos(t * 29) * 0.5, kB: 0.2, spin: -t * 4 });
  const demonFace = () => pose({ lean: 1.45, head: 0.8, sF: 2.9, eF: 0.1, sB: 3.0, eB: 0, hF: 0.2, kF: 0, hB: -0.2, kB: 0, lift: -18 });

  // ---- Words, for whichever hands are playing ---------------------------------------------------------
  const tip = (touch, keys) => (usingKeys() ? keys : touch);
  // Each wave: who comes, and when (seconds into the wave), and what the angel says.
  const WAVES = [
    { foes: [["whisper", 0.6], ["whisper", 1.6], ["whisper", 7]], gap: [2.6, 3.4],
      say: () => tip("Tap a demon to strike, and keep tapping. Keep the flow, and I will come down to you.", "Arrows to move, Space to strike. Keep the flow, and I will come down to you.") },
    { foes: [["whisper", 0.6], ["grab", 1.4], ["whisper", 5], ["whisper", 10]], gap: [1.9, 2.7],
      say: () => tip("More of them. Tap the open street to get clear. Hold to block.", "More of them. Z rolls you clear. Hold Q to block.") },
    { chains: true, foes: [["whisper", 1.5], ["whisper", 4]], gap: [1.8, 2.6],
      say: () => tip("His guardian, in chains! Tap the chains to bless them. Break them!", "His guardian, in chains! Go to them and press Space to bless them. Break them!") },
    { foes: [["shield", 0.6], ["whisper", 1.2], ["grab", 4], ["whisper", 8], ["whisper", 12]], gap: [1.4, 2.2],
      say: () => tip("That one hides behind a shield. Tap it twice, quickly, for a heavy blow.", "That one hides behind a shield. Press C for a heavy blow to break it.") },
  ];
  function start(done) {
    G = {
      done, t: 0, ts: 1, slowT: 0, slowTs: 1, zoom: { k: 1, x: W / 2, y: H / 2 }, cam: { k: 1, x: W / 2, y: H / 2 }, view: { k: 1, cx: W / 2, cy: H / 2 }, freeze: 0, muffled: false,
      wave: -1, waveT: 0, foes: [], parts: [], pops: [], spawnQ: [], nextAtk: 2, touch: null, lastTap: null, msg: null, flash: 0, flashC: "#fff", shake: 0,
      hero: { x: W * 0.3, y: 300, z: 0, dir: 1, act: { kind: "idle", t: 0 }, resolve: 100, spirit: 0, inv: 0, combo: 0, comboT: 0, best: 0, queue: null, hits: 0, last: null },
      angel: { x: W * 0.3, y: 300, z: SKY, dir: 1, act: { kind: "above", t: 0 }, t: 0, lightX: W * 0.3, catchT: 0 },
      guard: { chains: 6, freed: false, t: 0, fight: 0, nextHit: 0, x: carX() - 40 },
      taught: {}, over: 0, down: 0, keys: {}, launched: false,
    };
    nextWave();
    Sound.play(SONGS.fight); Sound.setLevel(1); Sound.fill("hit"); Sound.ambience({ wind: 0, rain: 0 });
    mode = Fight;
  }
  function say(t, who) { G.msg = { text: t, t: 0, who: who || "angel" }; if ((who || "angel") === "angel") Sound.fx.chord(G.t | 0); else if (who === "guardian") Sound.fx.lowChord(1); }
  function nextWave() {
    G.wave++; G.waveT = 0;
    const w = WAVES[G.wave]; if (!w) return;
    for (const [kind, at] of w.foes) G.spawnQ.push({ kind, at });
    say(w.say());
    if (G.wave > 0) Sound.fill("hit");
    G.nextAtk = 2.2;
  }
  let foeId = 0;
  function spawn(kind) {
    const left = (foeId % 2 === 0) !== (G.hero.x > W / 2);
    const f = { id: ++foeId, kind, x: left ? -40 : W + 40, y: lerp(Y0 + 10, Y1 - 6, Math.random()), z: 0, vz: 0, vx: 0, dir: left ? 1 : -1,
      hp: kind === "grab" ? 12 : kind === "shield" ? 10 : 9, act: { kind: "enter", t: 0 }, sign: null, stun: 0, dizzy: 0, shield: kind === "shield", hat: true, hatKind: foeId % 3 === 0 ? 1 : 0,
      slot: Math.random() * TAU, ph: Math.random() * 10, seed: Math.random() * 10, rim: DEMON_RIMS[foeId % 3] };
    f.max = f.hp; G.foes.push(f);
    puff(f.x + (left ? 30 : -30), f.y - 50, "#000000", 10, true);
  }

  // ---- Slow motion -----------------------------------------------------------------------------------
  // Time slows hard at the great moments (a counter, the angel's swoop, the last demon cast out),
  // and the camera pushes in on them; every blow lands with a short stop; and while a demon near
  // him winds up, time runs at half speed, so the fight reads like the films.
  function slowmo(ts, secs, x, y, k) {
    if (G.slowT > 0 && ts > G.slowTs) return;
    G.slowTs = ts; G.slowT = secs; G.zoom = { k: k || 1.15, x, y };
  }
  const hitStop = (s) => { G.freeze = Math.max(G.freeze, s); };
  function engaged() {
    const H0 = G.hero;
    return G.foes.some((f) => !f.gone && f.act.kind === "wind" && f.act.t < f.act.dur * 0.6 && Math.abs(f.x - H0.x) < 230);
  }

  // ---- What the player does -------------------------------------------------------------------------
  const busy = () => ["strike", "zip", "counter", "hurt", "grabbed", "dodge", "bless", "chain", "down", "jumpkick", "dash"].includes(G.hero.act.kind);
  function act(kind, o) { G.hero.act = Object.assign({ kind, t: 0 }, o); }
  function reachX(f) { return f.x - Math.sign(f.x - G.hero.x || 1) * (f.kind === "grab" ? 62 : 54) * depth(f.y); }
  function tapDemon(f, fromKey) {
    const H0 = G.hero, now = G.t;
    if (H0.act.kind === "grabbed" || H0.act.kind === "down" || G.over) return;
    // Two quick taps on the same demon: the heavy blow. (On the keyboard, C.)
    if (!fromKey && G.lastTap && G.lastTap.f === f && now - G.lastTap.t < 0.34 * Math.max(G.ts, 0.3)) { G.lastTap = null; heavy(f); return; }
    G.lastTap = { f, t: now };
    // The gold sign: a counter, whatever he was doing.
    if (f.sign === "gold" && f.act.kind === "wind") { counter(f); return; }
    if (f.sign === "red" && f.act.kind === "wind") { pop(f.x, f.y - 120 * depth(f.y), tip("SWIPE AWAY!", "PRESS Z!"), "#ff8a70"); return; }
    if (busy() && H0.act.kind !== "hurt") { H0.queue = { f, move: "strike" }; return; }
    goStrike(f, "strike");
  }
  // Zip to a demon (a flip, a roll, a lurch: never a walk), then the move.
  function goStrike(f, move) {
    const H0 = G.hero; if (f.gone) return;
    H0.dir = f.x >= H0.x ? 1 : -1;
    if (f.z > 20 && move === "strike") { act("jumpkick", { f, dur: 0.32, from: [H0.x, H0.y], to: [f.x - H0.dir * 40, f.y + 2] }); Sound.fx.whoosh(0.25, 0.6, true); return; }
    const tx = reachX(f), d = Math.abs(tx - H0.x) + Math.abs(f.y - H0.y);
    if (d > 26) {
      const styles = ["flip", "roll", "lurch"], style = d > 220 ? "flip" : styles[(G.hero.hits + f.id) % 3];
      act("zip", { f, move, style, dur: clamp(d / 600, 0.16, 0.4), from: [H0.x, H0.y], to: [tx, f.y + 1] });
      Sound.fx.whoosh(0.22, 0.5);
    } else doMove(f, move);
  }
  function doMove(f, move) {
    if (move === "heavy") { act("strike", { f, which: HEAVY, dur: 0.36, hit: false }); Sound.fx.effort(); return; }
    if (move === "launch") { act("strike", { f, which: LAUNCH, dur: 0.34, hit: false }); Sound.fx.effort(); return; }
    const H0 = G.hero;
    act("strike", { f, which: STRIKES[H0.hits % STRIKES.length], dur: 0.24, hit: false });
    Sound.fx.effort(H0.dir * 0.3);
  }
  // A heavy blow or a launch: if he is already on his way to that demon, the move changes to it.
  function special(f, move) {
    if (f.gone || G.over) return;
    const a = G.hero.act;
    if (a.kind === "zip" && a.f === f) { a.move = move; return; }
    if (a.kind === "strike" && a.f === f && !a.hit && a.which !== HEAVY && a.which !== LAUNCH) { doMove(f, move); return; }
    if (busy() && a.kind !== "hurt") { G.hero.queue = { f, move }; return; }
    goStrike(f, move);
  }
  const heavy = (f) => special(f, "heavy"), launch = (f) => special(f, "launch");
  function landHit(f, dmg, k, o) {
    o = o || {};
    if (f.gone) return;
    const H0 = G.hero;
    if (f.shield && !o.breaks && (o.front !== false)) {
      // The shield turns his blow aside. Clank.
      Sound.fx.hit(0.6); Sound.fx.tick(900, 1); pop(f.x, f.y - 110 * depth(f.y), tip("TAP TWICE", "PRESS C"), C.holy); sparks(f.x - f.dir * 14, f.y - 60, "#ff9a60", 6);
      if (!G.taught.shield) { G.taught.shield = true; say(WAVES[3].say()); }
      return false;
    }
    if (o.breaks && f.shield) { f.shield = false; Sound.fx.shatter(); shards(f.x + f.dir * 10, f.y - 60); pop(f.x, f.y - 120 * depth(f.y), "GUARD BROKEN", C.holy); f.dizzy = 2.2; }
    const mult = f.dizzy > 0 ? 1.5 : 1;
    f.hp -= dmg * mult; f.stun += 1; f.stunT = 1.6;
    if (f.act.kind === "wind" || f.act.kind === "lunge") { f.sign = null; if (G.slowFor === f) G.slowFor = null; }
    f.act = { kind: "hurt", t: 0, dur: 0.32 }; f.vx = (o.kx === undefined ? 1 : o.kx) * Math.sign(f.x - (o.fromX === undefined ? H0.x : o.fromX) || 1) * (110 + 90 * k);
    if (k > 1.3 && f.hat && Math.random() < 0.6) { f.hat = false; G.parts.push({ kind: "hat", x: f.x, y: f.y - 115 * depth(f.y), vx: f.vx * 0.6, vy: -220, r: 0, vr: 12 * Math.sign(f.vx), hk: f.hatKind, t: 0, s: depth(f.y), floor: f.y }); }
    if (f.stun >= 3 && f.dizzy <= 0) { f.dizzy = 2.0; f.stun = 0; pop(f.x, f.y - 128 * depth(f.y), "DIZZY", "#ffe08a"); }
    if (!o.angel) {
      H0.combo++; H0.comboT = 2.6; H0.hits++; H0.best = Math.max(H0.best, H0.combo); H0.last = f;
      if (H0.spirit < SPIRIT) { H0.spirit++; if (H0.spirit === SPIRIT && !G.taught.bless) { G.taught.bless = true; say(tip("The Spirit fills you. Tap the gold cross to bless them all.", "The Spirit fills you. Press B to bless them all.")); } }
      // Every fifth blow of a flowing combo, the angel comes down.
      if (H0.combo % 5 === 0) G.callAngel = H0.combo % 10 === 0 ? "sweep" : "strike";
    }
    hitStop(k > 1.5 ? 0.09 : 0.045);
    G.shake = Math.max(G.shake, 2 + k * 2);
    Sound.fx.hit(k, clamp((f.x - W / 2) / W, -0.8, 0.8));
    sparks(f.x - Math.sign(f.x - H0.x || 1) * 10, f.y - 70 * depth(f.y) - f.z, k > 1.3 ? "#ffffff" : f.rim, 6 + k * 3);
    if (f.hp <= 0) castOut(f);
    return true;
  }
  function counter(f) {
    const H0 = G.hero;
    f.sign = null; H0.dir = f.x >= H0.x ? 1 : -1; H0.x = reachX(f); H0.y = f.y + 1; H0.z = 0;
    act("counter", { f, dur: 0.3, which: STRIKES[1] });
    slowmo(0.16, 0.6, (f.x + H0.x) / 2, f.y - 60, 1.24);
    G.flash = 0.35; G.flashC = C.holy;
    Sound.fx.clang(clamp((f.x - W / 2) / W, -0.8, 0.8));
    pop(f.x, f.y - 130 * depth(f.y), "COUNTER", C.holy);
    f.act = { kind: "hurt", t: 0, dur: 0.4 };
    landHit(f, 2, 1.6, { breaks: false, front: false });
    if (!f.gone) { f.z = 1; f.vz = 260; f.dizzy = Math.max(f.dizzy, 1.6); }
    if (G.slowFor === f) G.slowFor = null;
  }
  function dodge(dx, dy) {
    const H0 = G.hero;
    if (["dodge", "down", "grabbed"].includes(H0.act.kind)) return;
    const m = Math.hypot(dx, dy || 0) || 1;
    act("dodge", { dur: 0.36, from: [H0.x, H0.y], to: [clamp(H0.x + dx / m * 125, 30, W - 30), clamp(H0.y + (dy || 0) / m * 60, Y0, Y1)] });
    H0.inv = 0.45; Sound.fx.whoosh(0.3, 0.6);
  }
  function bless() {
    const H0 = G.hero;
    if (H0.spirit < SPIRIT || ["down", "grabbed", "bless"].includes(H0.act.kind)) return;
    H0.spirit = 0; act("bless", { dur: 0.95, fired: false });
    Sound.fx.glory();
  }
  const chainsOpen = () => !G.guard.freed && WAVES[G.wave] && (WAVES[G.wave].chains || G.wave > 2);
  function tapChains() {
    const H0 = G.hero, g = G.guard;
    if (!chainsOpen()) return false;
    if (busy()) return true;
    const tx = g.x + 46, ty = Y0 + 4;
    if (Math.abs(H0.x - tx) + Math.abs(H0.y - ty) > 20) act("zip", { chain: true, style: "lurch", dur: clamp(Math.abs(H0.x - tx) / 500, 0.16, 0.4), from: [H0.x, H0.y], to: [tx, ty] });
    else act("chain", { dur: 0.42, hit: false });
    H0.dir = -1;
    return true;
  }
  // Tap the open street: he zips there at once, in a flip or a roll, to get clear of them.
  function tapGround(p) {
    const H0 = G.hero;
    if (["grabbed", "down", "bless"].includes(H0.act.kind) || G.over) return;
    const ty = clamp(p.y, Y0, Y1), tx = clamp(p.x, 24, W - 24), d = dist(H0.x, H0.y, tx, ty);
    if (d < 12) return;
    H0.dir = tx >= H0.x ? 1 : -1; H0.queue = null;
    act("dash", { from: [H0.x, H0.y], to: [tx, ty], dur: clamp(d / 700, 0.16, 0.42), style: d > 160 ? "flip" : "roll" });
    H0.inv = Math.max(H0.inv, 0.2);
    Sound.fx.whoosh(0.25, 0.6);
    G.parts.push({ kind: "mark", x: tx, y: ty, t: 0 });
  }

  // ---- His angel, who waits above ------------------------------------------------------------------
  // He comes down in a dive, strikes (or sweeps through a group, or tears a demon off him, or
  // lifts him away), and climbs back out of sight.
  function swoop(kind, f) {
    const A = G.angel; if (A.act.kind !== "above") return false;
    if (kind !== "carry" && (!f || f.gone)) return false;
    const T = kind === "carry" ? G.hero : f;
    A.dir = T.x >= W / 2 ? -1 : 1; if (Math.abs(T.x - G.hero.x) > 5 && kind !== "carry") A.dir = T.x >= G.hero.x ? 1 : -1;
    A.x = T.x - A.dir * 150; A.y = T.y - 2; A.z = SKY;
    A.act = { kind, phase: "dive", t: 0, f };
    Sound.fx.whoosh(0.45, 1, false);
    if (kind !== "carry") slowmo(0.28, 0.75, T.x, T.y - 70, 1.18);
    if (!G.taught.swoop && kind !== "carry") { G.taught.swoop = true; say("Now. Together."); }
    return true;
  }
  function stepAngel(dt) {
    const A = G.angel, H0 = G.hero, a = A.act; A.t += dt; a.t += dt;
    A.catchT = Math.max(0, A.catchT - dt);
    A.lightX = lerp(A.lightX, H0.x, Math.min(1, dt * 3));
    if (a.kind === "above") { A.z = SKY; A.x = A.lightX; return; }
    const T = a.kind === "carry" ? H0 : a.f;
    if (a.phase === "dive") {
      const u = clamp(a.t / 0.26, 0, 1), e = u * u;
      if (T && !(T.gone && a.kind !== "carry")) { A.x = lerp(T.x - A.dir * 150, T.x - A.dir * (a.kind === "carry" ? 10 : 48), e); A.y = T.y - 2; }
      A.z = lerp(SKY, 0, e);
      if (u >= 1) { a.phase = a.kind === "carry" ? "lift" : "hit"; a.t = 0; Sound.fx.hit(1.6); G.shake = 6; G.flash = 0.25; G.flashC = C.holy; }
    } else if (a.phase === "hit") {
      const u = clamp(a.t / 0.24, 0, 1);
      if (!a.hit && u > 0.42) {
        a.hit = true;
        if (a.kind === "sweep") {
          let n = 0;
          for (const f of G.foes) if (!f.gone && Math.abs(f.x - A.x) < 200 && Math.abs(f.y - A.y) < 60) { landHit(f, 2, 1.8, { breaks: true, front: false, angel: true, fromX: A.x }); if (!f.gone) f.dizzy = Math.max(f.dizzy, 1.8); n++; }
          pop(A.x + A.dir * 40, A.y - 150, n > 1 ? "WING SWEEP ×" + n : "WING SWEEP", C.holy);
        } else if (a.f && !a.f.gone) {
          landHit(a.f, a.kind === "free" ? 2 : 3, 2, { breaks: true, front: false, angel: true, fromX: A.x });
          if (!a.f.gone) a.f.dizzy = Math.max(a.f.dizzy, 1.8);
          pop(a.f.x, a.f.y - 150, a.kind === "free" ? "TORN AWAY" : "HIS ANGEL", C.holy);
          if (a.kind === "free" && H0.act.kind === "grabbed") { act("idle"); H0.inv = 0.8; }
        }
        G.flash = 0.3; G.flashC = C.holy; hitStop(0.1);
      }
      if (u >= 1) { a.phase = "rise"; a.t = 0; Sound.fx.flap(1.2); }
    } else if (a.phase === "rise") {
      const u = clamp(a.t / 0.42, 0, 1);
      A.z = lerp(0, SKY, u * u); A.x += A.dir * 60 * dt;
      if (u >= 1) A.act = { kind: "above", t: 0 };
    } else if (a.phase === "lift") {
      // Carrying him away to the church.
      A.z = lerp(0, SKY, clamp(a.t / 1.1, 0, 1) ** 2); H0.z = A.z + 6; H0.x = A.x + A.dir * 10;
    }
  }

  // ---- Time ---------------------------------------------------------------------------------------
  function step(dtRaw) {
    // How fast time runs: slowed for the great moments, half speed while a demon near him winds up.
    let target = 1;
    if (G.slowFor) target = 0.2;
    else if (G.slowT > 0) target = G.slowTs;
    else if (engaged() && !G.over) target = 0.5;
    G.ts += (target - G.ts) * Math.min(1, dtRaw * (target < G.ts ? 16 : 5));
    if (G.slowT > 0) G.slowT -= dtRaw;
    let dt = dtRaw * G.ts;
    if (G.freeze > 0) { G.freeze -= dtRaw; dt = 0; }
    // The camera pushes in on the great moments.
    const close = G.slowT > 0 || G.slowFor, Z = close ? G.zoom : { k: 1, x: W / 2, y: H / 2 }, ck = Math.min(1, dtRaw * (close ? 7 : 3));
    if (G.slowFor && !G.slowT) { const f = G.slowFor; Z.k = 1.12; Z.x = (f.x + G.hero.x) / 2; Z.y = f.y - 60; }
    G.cam.k += (Z.k - G.cam.k) * ck; G.cam.x += (Z.x - G.cam.x) * ck; G.cam.y += (Z.y - G.cam.y) * ck;
    // The music is muffled while time is slow.
    const muff = G.ts < 0.6;
    if (muff !== G.muffled) { G.muffled = muff; Sound.muffle(muff, muff ? 0.05 : 0.2); }
    G.t += dt; G.waveT += dt; if (G.msg) G.msg.t += dtRaw;
    G.flash = Math.max(0, G.flash - dtRaw * 2); G.shake = Math.max(0, G.shake - dtRaw * 20);
    const H0 = G.hero;
    // Spawns.
    for (const s of G.spawnQ) if (!s.done && G.waveT > s.at) { s.done = true; spawn(s.kind); }
    G.spawnQ = G.spawnQ.filter((s) => !s.done);
    // The chains phase keeps sending demons until the guardian is free.
    const w = WAVES[G.wave];
    if (w && w.chains && !G.guard.freed && G.spawnQ.length === 0 && G.foes.filter((f) => !f.gone).length < 2 && G.waveT > 3) G.spawnQ.push({ kind: "whisper", at: G.waveT + 2.5 });
    if (G.wave === 3 && !G.launched && G.waveT > 9 && !G.taught.launch) { G.taught.launch = true; say(tip("Swipe up on one to launch it into the air, then tap it to keep it there.", "Press E to launch one into the air, then Space to keep it there.")); }
    // Hold to block.
    if (G.touch && !G.touch.moved && !G.touch.target && G.t - G.touch.t0 > 0.24 * G.ts && !busy() && H0.act.kind !== "block") { act("block", {}); G.touch.block = true; }
    stepKeys(dt);
    stepHero(dt); stepAngel(dt); stepGuard(dt);
    if (G.callAngel) { const kind = G.callAngel; G.callAngel = null; const f = H0.last && !H0.last.gone ? H0.last : nearestFoe(); if (f) swoop(kind, f); }
    for (const f of G.foes) stepFoe(f, dt);
    G.foes = G.foes.filter((f) => !f.gone || f.act.t < 0.6);
    attackScheduler(dt);
    stepParts(dt);
    if (H0.comboT > 0) { H0.comboT -= dt; if (H0.comboT <= 0) H0.combo = 0; }
    Sound.setLevel(H0.combo >= 12 ? 3 : H0.combo >= 5 ? 2 : 1);
    // The wave is won when its demons are all cast out (and, in the chains phase, the guardian is free).
    const alive = G.foes.filter((f) => !f.gone).length;
    if (!G.over && w && G.spawnQ.length === 0 && alive === 0 && G.waveT > 1.5 && (!w.chains || G.guard.freed)) {
      if (G.wave >= WAVES.length - 1) { if (G.guard.freed) finish(); else { G.wave = 1; nextWave(); } }
      else nextWave();
    }
    if (G.over) { G.over += dtRaw; if (G.over > 3.4 && !G.left) { G.left = true; Sound.muffle(false); G.done(); } }
    if (G.down) { G.down += dtRaw; if (G.down > 2.8) recover(); }
  }
  const nearestFoe = () => G.foes.filter((f) => !f.gone).sort((a, b) => dist(a.x, a.y, G.hero.x, G.hero.y) - dist(b.x, b.y, G.hero.x, G.hero.y))[0];
  function finish() {
    G.over = 0.001; say("It is done. The street is clear.");
    Sound.queue(SONGS.noir); Sound.setLevel(0);
  }
  function recover() {
    // His angel has carried him to the church to recover. No death: the wave begins again.
    G.down = 0;
    const H0 = G.hero; H0.resolve = 100; H0.combo = 0; H0.spirit = Math.max(H0.spirit, 2); act("idle"); H0.x = W * 0.3; H0.y = 300; H0.z = 0; H0.inv = 1.5;
    G.angel.act = { kind: "above", t: 0 };
    for (const f of G.foes) f.gone = true;
    G.foes = []; G.spawnQ = []; G.slowFor = null;
    G.wave--; nextWave();
    say("Rested in the church's light. Again, Father: they are not so strong as they look.");
  }
  function stepHero(dt) {
    const H0 = G.hero, A0 = H0.act; A0.t += dt;
    H0.inv = Math.max(0, H0.inv - dt);
    const u = A0.dur ? clamp(A0.t / A0.dur, 0, 1) : 0;
    const after = () => { act("idle"); if (H0.queue) { const q = H0.queue; H0.queue = null; if (!q.f.gone) goStrike(q.f, q.move); } };
    if (A0.kind === "run") {
      // Moved by the arrow keys: a lurching, staggering run.
      A0.ph += dt * 11;
      if (A0.trip === undefined) A0.trip = Math.random() < 0.15 ? 0.8 + Math.random() : -1;
      if (A0.trip > 0 && A0.t > A0.trip && A0.t < A0.trip + 0.25 && !A0.caught) { A0.caught = true; G.angel.catchT = 0.5; Sound.fx.gasp(); }
    } else if (A0.kind === "zip" || A0.kind === "dodge" || A0.kind === "jumpkick" || A0.kind === "dash") {
      const [fx, fy] = A0.from, [tx, ty] = A0.to, e = A0.kind === "dodge" || A0.kind === "dash" ? ease(u) : smooth(u);
      H0.x = lerp(fx, tx, e); H0.y = lerp(fy, ty, e);
      H0.z = A0.style === "flip" ? Math.sin(u * PI) * 60 : A0.kind === "jumpkick" ? Math.sin(u * PI * 0.5) * (A0.f ? A0.f.z * 0.8 + 30 : 40) : A0.style === "roll" || A0.kind === "dodge" ? Math.sin(u * PI) * 8 : 0;
      if (A0.kind === "jumpkick" && u > 0.55 && !A0.hit) { A0.hit = true; if (!A0.f.gone) { landHit(A0.f, 1, 1.1, { kx: 0.4 }); A0.f.vz = Math.max(A0.f.vz, 200); } }
      if (u >= 1) {
        H0.z = A0.kind === "jumpkick" ? H0.z : 0;
        if (A0.kind === "zip" && A0.chain) act("chain", { dur: 0.42, hit: false });
        else if (A0.kind === "zip" && A0.f && !A0.f.gone) doMove(A0.f, A0.move || "strike");
        else if (A0.kind === "jumpkick") act("land", { dur: 0.25, z0: H0.z });
        else after();
      }
    } else if (A0.kind === "land") { H0.z = A0.z0 * (1 - ease(u)); if (u >= 1) { H0.z = 0; after(); } }
    else if (A0.kind === "strike" || A0.kind === "counter") {
      const f = A0.f;
      if (!A0.hit && u > (A0.kind === "counter" ? 0.3 : 0.42)) {
        A0.hit = true;
        if (A0.kind === "strike" && f && !f.gone && Math.abs(f.x - H0.x) < 110 && Math.abs(f.y - H0.y) < 40) {
          const name = A0.which[2];
          if (name === "heavy") {
            landHit(f, 2, 1.9, { breaks: true, front: false }); Sound.fx.hah(1, H0.dir * 0.3); splashAt(f.x, f.y - 70 * depth(f.y));
            slowmo(0.35, 0.3, f.x, f.y - 60, 1.1);
          } else if (name === "launch") {
            if (f.shield) landHit(f, 0, 0.6);
            else { landHit(f, 1, 1.3, { kx: 0.2 }); if (!f.gone) { f.z = Math.max(f.z, 1); f.vz = 480; f.act = { kind: "air", t: 0 }; f.dizzy = Math.max(f.dizzy, 1); pop(f.x, f.y - 140 * depth(f.y), "LAUNCHED", C.holy); G.launched = true; } }
          } else {
            const landed = landHit(f, 1, 1);
            if (landed === false) { act("hurt", { dur: 0.3, small: true }); return; }
            if (name === "water") splashAt(f.x, f.y - 70 * depth(f.y));
            // Now and then he fumbles the holy water, and it splashes the demon behind him.
            const behind = G.foes.find((o) => !o.gone && o !== f && Math.sign(o.x - H0.x) === -H0.dir && Math.abs(o.x - H0.x) < 120 && Math.abs(o.y - H0.y) < 40);
            if (behind && Math.random() < 0.16) fumble(behind);
          }
        }
      }
      if (u >= 1) after();
    }
    else if (A0.kind === "hurt") { H0.x = clamp(H0.x - H0.dir * 60 * dt * (1 - u), 20, W - 20); if (u >= 1) after(); }
    else if (A0.kind === "grabbed") {
      if (A0.t > (A0.tick || 0)) { A0.tick = A0.t + 0.4; hurtHero(5, true); }
      // His angel comes down and tears the demon off him.
      if (A0.t > 1.0 && !A0.called && A0.by && !A0.by.gone) A0.called = swoop("free", A0.by);
      if (A0.t > 2.2 || (A0.by && A0.by.gone)) { act("idle"); H0.inv = 0.6; }
    } else if (A0.kind === "bless") {
      if (!A0.fired && u > 0.5) {
        A0.fired = true; G.flash = 0.6; G.flashC = C.holy; G.parts.push({ kind: "ring", x: H0.x, y: H0.y - 60, r: 10, t: 0 });
        slowmo(0.25, 0.6, H0.x, H0.y - 60, 1.12);
        for (const f of G.foes) if (!f.gone) { landHit(f, 2, 1.4, { breaks: true, front: false }); f.dizzy = Math.max(f.dizzy, 2.2); f.sign = null; }
        Sound.fx.hah(1); Sound.fx.clang();
      }
      if (u >= 1) act("idle");
    } else if (A0.kind === "chain") {
      if (!A0.hit && u > 0.55) {
        A0.hit = true; const g = G.guard;
        g.chains--; Sound.fx.chain(g.chains <= 0); sparks(g.x + 10, Y0 - 40, C.holy, 8); G.flash = 0.15; G.flashC = C.holy;
        if (g.chains <= 0) freeGuardian();
      }
      if (u >= 1) act("idle");
    } else if (A0.kind === "block") { if (!(G.touch && G.touch.block) && !G.keys.KeyQ) act("idle"); }
    H0.x = clamp(H0.x, 20, W - 20); H0.y = clamp(H0.y, Y0, Y1);
  }
  function hurtHero(dmg, grab) {
    const H0 = G.hero;
    H0.resolve = Math.max(0, H0.resolve - dmg); H0.combo = 0; H0.comboT = 0; H0.queue = null; H0.spirit = Math.max(0, H0.spirit - 2);
    G.shake = 6; Sound.fx.hit(1.2); Sound.fx.effort(); hitStop(0.07);
    if (!grab) act("hurt", { dur: 0.42 });
    if (H0.resolve <= 0 && !G.down) {
      G.down = 0.001; act("down", {}); say("I have you. I have you. Rest now."); for (const f of G.foes) f.sign = null; G.slowFor = null;
      G.angel.act = { kind: "above", t: 0 }; swoop("carry");
    }
  }
  function freeGuardian() {
    const g = G.guard; g.freed = true; g.fight = 6; g.nextHit = 0.6;
    G.flash = 0.9; G.flashC = "#e8f6ff"; Sound.fill("hit"); Sound.fx.glory();
    slowmo(0.2, 0.9, g.x, Y0 - 60, 1.2);
    say("Brothers!", "guardian");
    for (let i = 0; i < 14; i++) G.parts.push({ kind: "link", x: g.x + 10, y: Y0 - 30, vx: (Math.random() - 0.5) * 320, vy: -150 - Math.random() * 200, t: 0, r: Math.random() * TAU });
  }
  function stepGuard(dt) {
    const g = G.guard; g.t += dt; g.x = carX() - 40;
    if (!g.freed) return;
    if (g.fight > 0) {
      g.fight -= dt; g.nextHit -= dt;
      if (g.nextHit <= 0) {
        const t = G.foes.filter((f) => !f.gone)[0];
        if (t) { g.nextHit = 0.9; G.parts.push({ kind: "streak", x0: g.x, y0: Y0 - 60, x1: t.x, y1: t.y - 60 * depth(t.y), t: 0 }); landHit(t, 2, 1.5, { breaks: true, front: false, angel: true, fromX: g.x }); t.dizzy = Math.max(t.dizzy, 1.6); }
        else g.nextHit = 0.3;
      }
      if (g.fight <= 0 && G.wave === 2) { nextWave(); }
    }
  }
  // Demons take turns to attack, a few at a time, as in Arkham: one or two winding up at once.
  function attackScheduler(dt) {
    if (G.over || G.down) return;
    G.nextAtk -= dt;
    const winding = G.foes.filter((f) => !f.gone && (f.act.kind === "wind" || f.act.kind === "lunge")).length;
    const maxW = G.wave >= 3 ? 2 : 1;
    if (G.nextAtk > 0 || winding >= maxW) return;
    const H0 = G.hero, cands = G.foes.filter((f) => !f.gone && f.act.kind === "idle" && f.dizzy <= 0 && f.z === 0 && Math.abs(f.x - H0.x) < 300);
    if (!cands.length) return;
    const f = cands[Math.floor(Math.random() * cands.length)];
    const grab = f.kind === "grab";
    f.act = { kind: "wind", t: 0, dur: grab ? 0.95 : 0.85 }; f.sign = grab ? "red" : "gold"; f.dir = H0.x >= f.x ? 1 : -1;
    Sound.fx.growl(0.4);
    const gap = (WAVES[G.wave] || WAVES[0]).gap; G.nextAtk = lerp(gap[0], gap[1], Math.random());
    // The first time each sign shows, time nearly stops and the angel explains.
    if (!grab && !G.taught.gold) { G.taught.gold = true; G.slowFor = f; say(tip("A gold sign: tap him now, to counter!", "A gold sign: press X now, to counter!")); f.act.dur = 1.0; }
    if (grab && !G.taught.red) { G.taught.red = true; G.slowFor = f; say(tip("A red sign cannot be countered. Swipe away from it, to dodge!", "A red sign cannot be countered. Press Z with an arrow away from it, to dodge!")); f.act.dur = 1.1; }
  }
  function stepFoe(f, dt) {
    const H0 = G.hero, a = f.act; a.t += dt; f.ph += dt;
    if (f.gone) return;
    if (f.dizzy > 0) f.dizzy -= dt;
    if (f.stunT > 0) { f.stunT -= dt; if (f.stunT <= 0) f.stun = 0; }
    // In the air: launched, or bounced by a counter.
    if (f.z > 0 || f.vz > 0) {
      f.vz -= 900 * dt; f.z += f.vz * dt; f.x += f.vx * dt * 0.5;
      if (f.z <= 0) { f.z = 0; f.vz = 0; if (a.kind === "air") { f.act = { kind: "idle", t: 0 }; landHit(f, 1, 0.8, { front: false, kx: 0.2, angel: true }); f.dizzy = Math.max(f.dizzy, 1.5); G.shake = 4; } }
    }
    f.x += f.vx * dt; f.vx *= 1 - 6 * dt;
    if (a.kind === "castout") return;
    if (a.kind !== "enter") { if (f.x < 24) { f.x = 24; f.vx = Math.abs(f.vx) * 0.3; } if (f.x > W - 24) { f.x = W - 24; f.vx = -Math.abs(f.vx) * 0.3; } }
    if (a.kind === "enter") {
      const tx = clamp(f.x + f.dir * 160, 60, W - 60);
      f.x += f.dir * 80 * dt; if ((f.dir > 0 && f.x >= tx - 100) || (f.dir < 0 && f.x <= tx + 100) || a.t > 2.5) f.act = { kind: "idle", t: 0 };
      return;
    }
    if (a.kind === "hurt") { if (a.t > a.dur) f.act = { kind: "idle", t: 0 }; return; }
    if (a.kind === "face") { if (a.t > 1.4) f.act = { kind: "idle", t: 0 }; return; }
    if (a.kind === "wind") {
      f.dir = H0.x >= f.x ? 1 : -1;
      if (f.dizzy > 0) { f.sign = null; f.act = { kind: "idle", t: 0 }; if (G.slowFor === f) G.slowFor = null; return; }
      if (a.t > a.dur) { f.act = { kind: "lunge", t: 0, dur: 0.2, x0: f.x, y0: f.y }; if (G.slowFor === f) G.slowFor = null; }
      return;
    }
    if (a.kind === "lunge") {
      const tx = H0.x - f.dir * 40, u = clamp(a.t / a.dur, 0, 1);
      f.x = lerp(a.x0, tx, ease(u)); f.y = lerp(a.y0, H0.y, ease(u));
      if (u >= 1) resolveAttack(f);
      return;
    }
    if (a.kind === "recover") { if (a.t > 0.6) f.act = { kind: "idle", t: 0 }; return; }
    if (a.kind === "grabbing") { f.x = H0.x - f.dir * 34; if (H0.act.kind !== "grabbed") f.act = { kind: "recover", t: 0 }; return; }
    // Idle: drift toward a place round him, keeping their distance from each other.
    if (f.dizzy > 0) return;
    const others = G.foes.filter((o) => o !== f && !o.gone);
    // Their places stay on the screen: one that would stand past the edge goes round to his other side.
    const ring = 92 + (f.kind === "grab" ? 20 : 0);
    let side = f.x >= H0.x ? 1 : -1;
    if (H0.x + side * (ring + 30) < 40 || H0.x + side * (ring + 30) > W - 40) side = -side;
    let tx = clamp(H0.x + side * ring + Math.sin(f.slot + G.t * 0.3) * 30, 40, W - 40), ty = clamp(H0.y + Math.sin(f.slot * 2.1 + G.t * 0.25) * 34, Y0, Y1);
    for (const o of others) { const dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy); if (d < 60 && d > 0.1) { tx += dx / d * 50; ty += dy / d * 20; } }
    const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy);
    if (d > 6) { const sp = f.kind === "grab" ? 55 : 72; f.x += dx / d * sp * dt; f.y += dy / d * sp * 0.6 * dt; f.walk = true; } else f.walk = false;
    f.dir = H0.x >= f.x ? 1 : -1; f.y = clamp(f.y, Y0, Y1); f.x = clamp(f.x, 24, W - 24);
  }
  function resolveAttack(f) {
    const H0 = G.hero, grab = f.sign === "red", near = Math.abs(f.x - H0.x) < 90 && Math.abs(f.y - H0.y) < 40;
    f.sign = null;
    if (!near || H0.inv > 0 || H0.act.kind === "dodge" || H0.act.kind === "dash" || G.down || G.over) {
      // Missed. A grabber that misses goes flat on its face.
      if (grab) { f.act = { kind: "face", t: 0 }; f.dizzy = 1.6; pop(f.x, f.y - 60, "DODGED", "#9fe4ff"); Sound.fx.hit(0.6); f.vx = f.dir * 220; }
      else { f.act = { kind: "recover", t: 0 }; if (H0.act.kind === "dodge" || H0.act.kind === "dash") pop(H0.x, H0.y - 130, "DODGED", "#9fe4ff"); }
      return;
    }
    if (grab) {
      if (H0.act.kind === "block") pop(H0.x, H0.y - 130, "A GRAB CANNOT BE BLOCKED", "#ff8a70");
      act("grabbed", { by: f }); f.act = { kind: "grabbing", t: 0 };
      Sound.fx.growl(1); return;
    }
    if (H0.act.kind === "block") { f.act = { kind: "hurt", t: 0, dur: 0.4 }; f.vx = f.dir * -200; Sound.fx.clang(); pop(H0.x, H0.y - 130, "BLOCKED", C.holy); f.dizzy = 1; hitStop(0.06); return; }
    f.act = { kind: "recover", t: 0 };
    hurtHero(10);
  }
  function castOut(f) {
    f.gone = true; f.sign = null; f.act = { kind: "castout", t: 0 }; f.vx = Math.sign(f.x - G.hero.x || 1) * 260; f.vz = 260; f.z = Math.max(f.z, 1);
    Sound.fx.yelp(clamp((f.x - W / 2) / W, -0.8, 0.8));
    setTimeout(() => { Sound.fx.puff(); }, 380);
    pop(f.x, f.y - 140 * depth(f.y), "CAST OUT", "#ffffff");
    if (G.slowFor === f) G.slowFor = null;
    // The last of a wave goes out in deep slow motion.
    if (!G.foes.some((o) => !o.gone) && G.spawnQ.length === 0) slowmo(0.12, 1.1, f.x, f.y - 60, 1.3);
  }
  function fumble(f) {
    const H0 = G.hero;
    G.parts.push({ kind: "flask", x: H0.x, y: H0.y - 80, x1: f.x, y1: f.y - 60 * depth(f.y), t: 0, f });
  }
  function splashAt(x, y) { Sound.fx.splash(); for (let i = 0; i < 12; i++) G.parts.push({ kind: "drop", x, y, vx: (Math.random() - 0.5) * 260, vy: -120 - Math.random() * 160, t: 0 }); }

  // ---- The keyboard: arrows move, Space strikes toward the arrow you hold ------------------------
  const arrows = () => { const k = G.keys; return [(k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0), (k.ArrowDown || k.KeyS ? 1 : 0) - (k.ArrowUp || k.KeyW ? 1 : 0)]; };
  function stepKeys(dt) {
    const H0 = G.hero, [kx, ky] = arrows(), moving = kx || ky;
    if (moving && (H0.act.kind === "idle" || H0.act.kind === "run")) {
      if (H0.act.kind !== "run") act("run", { ph: 0 });
      const m = Math.hypot(kx, ky);
      H0.x += kx / m * 190 * dt; H0.y += ky / m * 120 * dt;
      if (kx) H0.dir = kx > 0 ? 1 : -1;
    } else if (!moving && H0.act.kind === "run") act("idle");
  }
  // The best target in the direction held (or, with no arrow, the nearest, the one he faces first).
  function pick(chainsToo) {
    const H0 = G.hero, [kx, ky] = arrows(), m = Math.hypot(kx, ky);
    const cands = G.foes.filter((f) => !f.gone).map((f) => ({ f, x: f.x, y: f.y }));
    if (chainsToo && chainsOpen()) cands.push({ chains: true, x: G.guard.x + 46, y: Y0 + 4 });
    let best = null, bs = -1e9;
    for (const c of cands) {
      const dx = c.x - H0.x, dy = (c.y - H0.y) * 1.8, d = Math.hypot(dx, dy) || 1;
      if (d > 560) continue;
      let s;
      if (m) { const dot = (dx * kx + dy * ky) / (d * m); if (dot < 0.25) continue; s = dot * 260 - d; }
      else s = -d + (Math.sign(dx) === H0.dir ? 60 : 0);
      if (c.f && c.f.sign === "gold") s += 40;
      if (s > bs) { bs = s; best = c; }
    }
    return best;
  }

  // ---- Particles and pop-up words --------------------------------------------------------------------
  function sparks(x, y, c, n) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 120 + Math.random() * 240; G.parts.push({ kind: "spark", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, c, t: 0 }); } }
  function shards(x, y) { for (let i = 0; i < 10; i++) G.parts.push({ kind: "shard", x, y, vx: (Math.random() - 0.5) * 300, vy: -100 - Math.random() * 200, r: Math.random() * TAU, t: 0 }); }
  function puff(x, y, c, n, dark) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 30 + Math.random() * 60; G.parts.push({ kind: dark ? "smoke" : "puff", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, t: 0, c }); } }
  function pop(x, y, text, c) { G.pops.push({ x: clamp(x, 60, W - 60), y: Math.max(70, y), text, c, t: 0 }); }
  const LIFE = { hat: 2.5, ring: 0.8, smoke: 0.9, puff: 0.9, flask: 0.5, link: 1.4, streak: 0.3, mark: 0.4 };
  function stepParts(dt) {
    for (const p of G.parts) {
      p.t += dt;
      if (p.kind === "spark" || p.kind === "drop" || p.kind === "shard" || p.kind === "link") { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.kind === "spark" ? 300 : 700) * dt; p.vx *= 1 - 2 * dt; if (p.r !== undefined) p.r += dt * 8; }
      else if (p.kind === "puff" || p.kind === "smoke") { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - 3 * dt; p.vy *= 1 - 3 * dt; }
      else if (p.kind === "hat") { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; p.r += p.vr * dt; if (p.y > p.floor - 4) { p.y = p.floor - 4; p.vy = -p.vy * 0.3; p.vx *= 0.6; p.vr *= 0.5; } }
      else if (p.kind === "ring") p.r += dt * 900;
      else if (p.kind === "flask" && p.t > 0.45 && !p.done) { p.done = true; splashAt(p.x1, p.y1); if (!p.f.gone) { landHit(p.f, 2, 1.2, { front: false, breaks: true }); p.f.dizzy = Math.max(p.f.dizzy, 1.8); pop(p.x1, p.y1 - 50, "SPLASH!", "#9fe4ff"); } }
    }
    G.parts = G.parts.filter((p) => p.t < (LIFE[p.kind] || 0.6));
    for (const p of G.pops) p.t += dt;
    G.pops = G.pops.filter((p) => p.t < 1.1);
  }

  // ---- Drawing -------------------------------------------------------------------------------------
  function background() {
    const key = W + ":" + DPR + ":" + scale;
    if (bg && bgKey === key) return bg;
    bgKey = key; bg = document.createElement("canvas"); bg.width = Math.round(W * scale * DPR); bg.height = Math.round(H * scale * DPR);
    const c2 = bg.getContext("2d"); c2.setTransform(scale * DPR, 0, 0, scale * DPR, 0, 0);
    // Draw with the shared helpers, pointed at the off-screen canvas for a moment.
    const back = useCtx(c2);
    const g = ctx.createLinearGradient(0, 0, 0, Y0); g.addColorStop(0, "#03040a"); g.addColorStop(1, "#101a34"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, Y0);
    skyline(101, -10, W + 10, Y0 - 50, 60, 200, "#0a1124", { t: 0, winA: 0.35, lit: 0.35 });
    skyline(102, -10, W + 10, Y0 - 10, 30, 110, "#070b18", { t: 0, winA: 0.45, lit: 0.4, signs: false });
    rect(0, Y0 - 14, W, 14, "#10131e"); rect(0, Y0 - 14, W, 2, "#1c2134");     // the far kerb
    useCtx(back);
    return bg;
  }
  // From the screen to the street, through the camera's push-in.
  function toWorld(p) { const v = G.view; return { x: v.cx + (p.x - W / 2) / v.k, y: v.cy + (p.y - H / 2) / v.k }; }
  function draw() {
    const t = G.t, H0 = G.hero, k = G.cam.k;
    const cx = clamp(G.cam.x, W / (2 * k), W - W / (2 * k)), cy = clamp(G.cam.y, H / (2 * k), H - H / (2 * k));
    G.view = { k, cx, cy };
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-cx, -cy);
    if (G.shake) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
    ctx.drawImage(background(), 0, 0, W, H);
    const sx = W * 0.72;
    cornerStore(sx, Y0 - 12, Math.min(200, W * 0.27), 118, t);
    lamp(W * 0.12, Y0 - 12, 128, C.ice, Math.sin(t * 7) > 0.8 && !G.guard.freed ? 0.4 : 1, 1);
    wetStreet(Y0 - 2, H, [[sx + Math.min(200, W * 0.27) * 0.36, C.red, 1, 44], [sx + Math.min(200, W * 0.27) * 0.79, C.cyan, 1, 14], [W * 0.12 + 11, C.ice, 1, 12], [carX(), C.cyan, 0.4, 30]], t);
    // The car, and the father frozen in it.
    car(carX(), CARY, 1.6, { t, dash: 1, bow: 2, rim: C.cyan });
    drawGuardian(t);
    // Everyone, back to front, with their reflections in the wet street first.
    const ents = [];
    ents.push({ y: H0.y, draw: (fl) => drawHero(fl) });
    if (G.angel.act.kind !== "above") ents.push({ y: G.angel.y - 0.5, draw: (fl) => drawAngelE(fl) });
    for (const f of G.foes) ents.push({ y: f.y, draw: (fl) => drawFoe(f, fl) });
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) e.draw(true);
    for (const e of ents) e.draw(false);
    drawParts();
    rain(t, 130, 0, 0, W, H, { seed: 41 });
    ctx.restore();
    drawAbove();
    // Slow motion: the colour drains toward night blue, and the edges darken.
    if (G.ts < 0.85) {
      const a = (0.85 - G.ts) / 0.73;
      ctx.fillStyle = "rgba(6,12,30," + (0.32 * a) + ")"; ctx.fillRect(0, 0, W, H);
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0," + (0.6 * a) + ")"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
    if (G.flash > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = hexA(G.flashC, Math.min(0.5, G.flash * 0.6)); ctx.fillRect(0, 0, W, H); ctx.restore(); }
    drawHUD();
    if (G.down) rect(0, 0, W, H, "rgba(0,0,0," + clamp((G.down - 1.2) / 0.8, 0, 1) * (G.down > 2.4 ? (2.8 - G.down) / 0.4 : 1) + ")");
    if (G.over > 1.9) rect(0, 0, W, H, "rgba(0,0,0," + clamp((G.over - 1.9) / 1.2, 0, 1) + ")");
    if (G.t < 0.6) rect(0, 0, W, H, "rgba(0,0,0," + (1 - G.t / 0.6) + ")");
  }
  // The angel above, out of sight: only his light falling from the top of the screen, brighter
  // as the combo comes near the fifth blow that brings him down.
  function drawAbove() {
    const A = G.angel, H0 = G.hero;
    if (A.act.kind !== "above" && A.z < SKY * 0.6) return;
    const v = G.view, x = (A.lightX - v.cx) * v.k + W / 2, near = (H0.combo % 5) / 5, pul = 0.5 + 0.5 * Math.sin(A.t * 2);
    glowOval(x, -10, 120 + 60 * near, 60 + 30 * near, C.holy, 0.16 + 0.22 * near + 0.05 * pul);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.06 + 0.1 * near;
    poly([x - 40, 0, x + 40, 0, x + 90, H * 0.55, x - 90, H * 0.55], C.holy); ctx.restore();
    const r = seeded(9);
    for (let i = 0; i < 8; i++) { const u = (r() + A.t * (0.08 + r() * 0.05)) % 1, mx = x + (r() - 0.5) * 160 + Math.sin(A.t + i) * 10; glow(mx, u * H * 0.5, 3 + r() * 3, "#fff6dc", 0.4 * (1 - u)); }
    if (A.catchT > 0) { const hp = [(H0.x - v.cx) * v.k + W / 2, (H0.y - 90 - v.cy) * v.k + H / 2]; ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = A.catchT; line(hp[0], 0, hp[0], hp[1], C.holy, 6); ctx.restore(); glow(hp[0], hp[1], 26, C.holy, A.catchT * 1.4); }
  }
  function heroPose() {
    const H0 = G.hero, a = H0.act, u = a.dur ? clamp(a.t / a.dur, 0, 1) : 0, t = G.t;
    switch (a.kind) {
      case "run": return walkP(a.ph, a.trip > 0 && a.t > a.trip && a.t < a.trip + 0.25);
      case "zip": case "dash": if (a.style === "flip") return Object.assign(blendPose(TUCK, idleP(t), Math.max(0, u * 2 - 1) ** 2), { spin: u * TAU }); if (a.style === "roll") return Object.assign(blendPose(TUCK, idleP(t), Math.max(0, u * 3 - 2)), { spin: u * TAU }); return walkP(a.t * 22, u > 0.3 && u < 0.6);
      case "dodge": return Object.assign(blendPose(TUCK, idleP(t), Math.max(0, u * 3 - 2)), { spin: Math.sign(a.to[0] - a.from[0] || 1) * H0.dir * u * TAU });
      case "jumpkick": return pose({ lean: -0.3, hF: 1.9, kF: 0.1, hB: -0.2, kB: 1.4, sF: 2.4, eF: 0.4, sB: -1.4 });
      case "land": return blendPose(pose({ lean: 0.3, kF: 1.4, hF: 0.8, kB: 1.2, hB: -0.2 }), idleP(t), u);
      case "strike": case "counter": { const [w, h] = a.which; return keyPose([[0, idleP(t)], [0.3, pose(w)], [0.48, pose(h)], [0.72, pose(h)], [1, idleP(t)]], u); }
      case "hurt": return blendPose(HURT, idleP(t), u);
      case "grabbed": return GRABBED(t);
      case "block": return BLOCKP;
      case "bless": return blessP(u);
      case "chain": return keyPose([[0, idleP(t)], [0.3, CROSS[0]], [0.6, CROSS[1]], [1, idleP(t)]], u);
      case "down": return G.angel.act.phase === "lift" ? CARRIEDP : DOWNP;
      default: return idleP(t);
    }
  }
  function drawHero(fl) {
    const H0 = G.hero, s = depth(H0.y), p = heroPose(), sway = H0.act.kind === "idle" ? Math.sin(G.t * 1.7) * 3 : 0;
    if (fl) { if (H0.z < 60) drawFigure("priest", H0.x + sway, H0.y + 2, s, H0.dir, p, { flipY: true, alpha: 0.16, t: G.t, pal: PRIEST_FIGHT }); return; }
    // His ring of light on the street, and his shadow.
    const ringA = 0.5 + 0.15 * Math.sin(G.t * 3);
    ctx.globalAlpha = 0.3; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(H0.x, H0.y, 22 * s, 5 * s, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    glowOval(H0.x, H0.y + 1, 38 * s, 9 * s, C.holy, 0.35);
    ctx.strokeStyle = hexA(C.holy, ringA); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(H0.x, H0.y + 1, 26 * s, 6.5 * s, 0, 0, TAU); ctx.stroke();
    const hide = H0.inv > 0 && !["dodge", "dash"].includes(H0.act.kind) && Math.sin(G.t * 40) > 0;
    drawFigure("priest", H0.x + sway, H0.y - H0.z, s, H0.dir, p, { t: G.t, pal: PRIEST_FIGHT, rim: C.holy, rimX: -1.8 * H0.dir, rimY: -1, flow: ["zip", "dash", "run"].includes(H0.act.kind) ? 0.8 : 0.2, flask: H0.act.kind === "strike" && H0.act.which && (H0.act.which[2] === "water" || H0.act.which[2] === "heavy"), alpha: hide ? 0.6 : 1 });
    if (H0.act.kind === "bless" || H0.act.kind === "chain") { const hp = jointAt("priest", H0.x, H0.y - H0.z, s, H0.dir, p, "hF"); glow(hp[0], hp[1], 30, C.holy, 0.8); }
    if (H0.act.kind === "block") { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = hexA(C.holy, 0.7); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(H0.x + H0.dir * 8, H0.y - 60 * s, 44 * s, -PI / 2 - 1.1, -PI / 2 + 1.1); ctx.stroke(); ctx.restore(); glow(H0.x + H0.dir * 20, H0.y - 60 * s, 40 * s, C.holy, 0.25); }
  }
  function drawAngelE(fl) {
    const A = G.angel, a = A.act, s = depth(A.y);
    let p = angelRise;
    if (a.phase === "dive") p = angelDive; else if (a.phase === "hit") p = angelStrikeP(clamp(a.t / 0.24, 0, 1)); else if (a.phase === "lift") p = angelCarry;
    if (fl) { if (A.z < 40) drawFigure("angel", A.x, A.y + 2, s, A.dir, p, { flipY: true, alpha: 0.08, t: G.t, dim: true }); return; }
    if (A.z < 120) glowOval(A.x, A.y + 2, 50 * s, 10 * s, C.holy, 0.35 * (1 - A.z / 120));
    // The streak of his dive.
    if (a.phase === "dive") { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5; line(A.x - A.dir * 60, A.y - A.z - 260, A.x, A.y - A.z - 60, C.holy, 10); ctx.restore(); }
    drawFigure("angel", A.x, A.y - A.z, s * 1.05, A.dir, p, { t: G.t, handGlow: a.phase === "hit" ? 1 : 0, shine: 1.2 });
  }
  function foePose(f) {
    const a = f.act, t = G.t + f.seed, grab = f.kind === "grab";
    if (a.kind === "castout") return demonFlail(a.t);
    if (a.kind === "hurt") return demonHurt(a.t);
    if (a.kind === "face") return demonFace();
    if (f.z > 0) return demonFlail(t * 0.5);
    if (f.dizzy > 0) return demonDizzy(t);
    if (a.kind === "wind") return blendPose(demonIdle(t, f.seed), demonWind(grab), smooth(a.t / 0.3));
    if (a.kind === "lunge" || a.kind === "grabbing") return demonLunge(grab);
    if (a.kind === "enter" || f.walk) return demonWalk(f.ph * 7);
    return demonIdle(t, f.seed);
  }
  function drawFoe(f, fl) {
    const s = depth(f.y) * (f.kind === "grab" ? 1.08 : 1), p = foePose(f), o = { t: G.t + f.seed, hat: f.hat, hatKind: f.hatKind, body: f.kind === "grab" ? "big" : undefined, shield: f.shield, dizzy: f.dizzy > 0 };
    if (fl) { if (f.act.kind !== "castout") drawFigure("demon", f.x, f.y + 2, s, f.dir, p, Object.assign({ flipY: true, alpha: 0.2 }, o)); return; }
    if (f.act.kind === "castout") {
      const k = f.act.t;
      if (k > 0.42) { if (!f.puffed) { f.puffed = true; puff(f.x, f.y - 60 * s - f.z, C.holy, 16, false); G.parts.push({ kind: "ring", x: f.x, y: f.y - 60 * s - f.z, r: 4, t: 0.4 }); } return; }
      ctx.globalAlpha = 1 - k * 1.2;
    }
    ctx.globalAlpha *= 0.35; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(f.x, f.y, 20 * s * Math.max(0.4, 1 - f.z / 200), 5 * s, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = f.act.kind === "castout" ? 1 - f.act.t * 1.2 : 1;
    // A dark red pool under each of them, where his is gold.
    if (f.act.kind !== "castout") glowOval(f.x, f.y + 1, 30 * s, 7 * s, "#ff1a1a", 0.18);
    drawFigure("demon", f.x, f.y - f.z, s, f.dir, p, Object.assign({ rim: f.rim, rimX: f.x < G.hero.x ? -2 : 2 }, o));
    ctx.globalAlpha = 1;
    // The signs: gold, counter it; red, get out of the way.
    if (f.sign) {
      const hx = f.x, hy = f.y - f.z - 138 * s, pul = 1 + 0.15 * Math.sin(G.t * 18), col = f.sign === "gold" ? C.holy : "#ff3040";
      glow(hx, hy, 26 * pul, col, 0.7);
      ctx.save(); ctx.translate(hx, hy); ctx.scale(pul, pul);
      if (f.sign === "gold") { rect(-2, -10, 4, 20, "#fff3cf"); rect(-8, -4, 16, 4, "#fff3cf"); }
      else { poly([0, -11, 10, 7, -10, 7], "#ff6070"); rect(-1.2, -4, 2.4, 6, "#200"); rect(-1.2, 3, 2.4, 2, "#200"); }
      ctx.restore();
      const k = clamp(f.act.t / f.act.dur, 0, 1); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, hy, 17, -PI / 2, -PI / 2 + TAU * (1 - k)); ctx.stroke();
    }
    if (f.dizzy > 0 && f.act.kind !== "castout") for (let i = 0; i < 3; i++) { const a = G.t * 5 + i * TAU / 3, hx = f.x + Math.cos(a) * 16, hy = f.y - f.z - 128 * s + Math.sin(a) * 4; star(hx, hy, 4, "#ffe08a"); }
    // How much fight is left in it.
    if (f.hp < f.max && f.act.kind !== "castout") { const bw = 30 * s; rect(f.x - bw / 2, f.y + 6, bw, 2.5, "rgba(255,255,255,0.12)"); rect(f.x - bw / 2, f.y + 6, bw * Math.max(0, f.hp) / f.max, 2.5, f.rim); }
  }
  function star(x, y, r, c) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * PI / 5 - PI / 2, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fillStyle = c; ctx.fill(); }
  // The father's guardian: held against the car in chains of shadow, calling for help.
  function drawGuardian(t) {
    const g = G.guard, x = g.x, y = Y0 - 6;
    if (!g.freed) {
      const strain = Math.sin(t * 3) * 0.08;
      drawFigure("angel", x, y, 0.9, 1, pose({ lean: -0.25 + strain, head: -0.5, wa: 1.6, wl: 0.25, sF: 2.6, eF: 0.4, sB: 2.8, eB: 0.3, hF: 0.02, kF: 1.55, hB: -0.02, kB: 1.6 }), { t, pal: GUARD, dim: true, shine: 0.25 });
      glow(x, y - 70, 50, "#9fd0ff", 0.25 + 0.1 * Math.sin(t * 2));
      // The chains: dark links from the ground and the car to him.
      const anchors = [[x - 46, y + 4], [x + 50, y + 2], [x - 20, y - 110], [x + 34, y - 96], [x - 50, y - 60], [x + 56, y - 50]];
      const holds = [[x - 6, y - 30], [x + 6, y - 28], [x - 4, y - 92], [x + 6, y - 88], [x - 8, y - 60], [x + 8, y - 58]];
      for (let i = 0; i < g.chains; i++) {
        const [ax, ay] = anchors[i], [hx, hy] = holds[i], n = 7;
        for (let k = 0; k <= n; k++) {
          const u = k / n, cx = lerp(ax, hx, u), cy = lerp(ay, hy, u) + Math.sin(u * PI) * 6 + Math.sin(t * 4 + i) * 1.2;
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.atan2(hy - ay, hx - ax) + (k % 2 ? PI / 2 : 0) * 0.6);
          ctx.strokeStyle = "#020104"; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.6, 0, 0, TAU); ctx.stroke();
          ctx.strokeStyle = hexA("#7a2a6a", 0.55); ctx.lineWidth = 0.8; ctx.stroke(); ctx.restore();
        }
      }
      // In the chains phase, the chains can be struck: a ring shows it.
      if (chainsOpen()) { ctx.strokeStyle = hexA(C.holy, 0.4 + 0.3 * Math.sin(t * 5)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 60, 58, 0, TAU); ctx.stroke(); text(tip("TAP", "SPACE"), x, y - 125, { align: "center", size: 9, weight: 800, spacing: 3, color: C.holy, alpha: 0.6 + 0.3 * Math.sin(t * 5) }); }
    } else {
      // Free: risen, bright, beside the car.
      const fight = g.fight > 0;
      drawFigure("angel", x, y + 4, 0.95, 1, pose({ wa: fight ? -2.4 : -2.1, wl: fight ? 1.1 : 0.7, lift: 6 + Math.sin(t * 1.5) * 2, sF: fight ? 2.2 : 0.4, eF: 0.3 }), { t, pal: GUARD, shine: 0.8 });
    }
  }
  function drawParts() {
    for (const p of G.parts) {
      const a = 1 - p.t / (LIFE[p.kind] || 0.6);
      if (p.kind === "spark") { line(p.x, p.y, p.x - p.vx * 0.03, p.y - p.vy * 0.03, p.c, 2); glow(p.x, p.y, 6, p.c, a * 0.6); }
      else if (p.kind === "drop") circle(p.x, p.y, 2.2, "rgba(196,240,255," + a + ")");
      else if (p.kind === "shard") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); poly([-5, -3, 6, 0, -3, 4], "#050308"); ctx.restore(); glow(p.x, p.y, 6, C.ember, a * 0.5); }
      else if (p.kind === "link") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.max(0, a); ctx.strokeStyle = "#1a0a14"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.6, 0, 0, TAU); ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1; }
      else if (p.kind === "puff") { const k = p.t / 0.9; glow(p.x, p.y, 10 + k * 20, C.holy, (1 - k) * 0.8); circle(p.x, p.y, (1 - k) * 4, "#fff6dc"); }
      else if (p.kind === "smoke") { const k = p.t / 0.9; ctx.globalAlpha = (1 - k) * 0.7; circle(p.x, p.y, 8 + k * 16, "#030205"); ctx.globalAlpha = 1; }
      else if (p.kind === "ring") { ctx.strokeStyle = hexA(C.holy, Math.max(0, a)); ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.45, 0, 0, TAU); ctx.stroke(); }
      else if (p.kind === "hat") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(p.s, p.s); ctx.fillStyle = "#050308"; ctx.beginPath(); ctx.ellipse(0, 0, 12, 2.2, 0, 0, TAU); ctx.fill(); if (p.hk === 1) { ctx.beginPath(); ctx.arc(0, -1, 6, PI, TAU); ctx.fill(); } else poly([-6, 0, -4, -8, 3, -7, 7, -1], "#050308"); ctx.restore(); }
      else if (p.kind === "flask") { const k = p.t / 0.45, x = lerp(p.x, p.x1, k), y = lerp(p.y, p.y1, k) - Math.sin(k * PI) * 60; ctx.save(); ctx.translate(x, y); ctx.rotate(k * 12); rect(-2, -5, 4, 8, "#bfe8ff"); ctx.restore(); glow(x, y, 8, C.ice, 0.5); }
      else if (p.kind === "streak") { ctx.save(); ctx.globalCompositeOperation = "lighter"; line(p.x0, p.y0, p.x1, p.y1, hexA("#c4f0ff", Math.max(0, a)), 6); line(p.x0, p.y0, p.x1, p.y1, "#ffffff", 2); ctx.restore(); }
      else if (p.kind === "mark") { ctx.strokeStyle = hexA(C.holy, Math.max(0, a) * 0.8); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(p.x, p.y, 10 + p.t * 40, 3 + p.t * 10, 0, 0, TAU); ctx.stroke(); }
    }
    for (const p of G.pops) {
      const a = clamp(1 - (p.t - 0.6) / 0.5, 0, 1), y = p.y - p.t * 26;
      text(p.text, p.x, y, { align: "center", size: 11, weight: 800, spacing: 2, color: p.c, glow: p.c, blur: 10, alpha: a });
    }
  }
  function drawHUD() {
    const H0 = G.hero;
    text("FR. LAWRENCE", 16, 20, { size: 8, weight: 700, spacing: 2, color: C.holy });
    rect(16, 26, 140, 6, "rgba(255,255,255,0.1)"); rect(16, 26, 140 * H0.resolve / 100, 6, H0.resolve < 30 && Math.sin(G.t * 10) > 0 ? "#ff6a50" : "#e9eef8");
    for (let i = 0; i < SPIRIT; i++) { const x = 20 + i * 11, y = 44, on = i < H0.spirit; ctx.save(); ctx.translate(x, y); ctx.rotate(PI / 4); rect(-3, -3, 6, 6, on ? C.holy : "rgba(255,255,255,0.12)"); ctx.restore(); if (on) glow(x, y, 9, C.holy, 0.4); }
    text("SPIRIT", 22 + SPIRIT * 11, 47, { size: 7, weight: 700, spacing: 2, color: "rgba(242,212,122,0.6)" });
    // Five feathers: the blows still to land before his angel comes down.
    const n = H0.combo % 5, ready = G.angel.act.kind === "above";
    for (let i = 0; i < 5; i++) { const x = 20 + i * 14, y = 60, on = i < n; ctx.save(); ctx.translate(x, y); ctx.rotate(-0.6); ctx.beginPath(); ctx.ellipse(0, 0, 5.5, 2, 0, 0, TAU); ctx.fillStyle = on ? "#fff6dc" : "rgba(255,255,255,0.14)"; ctx.fill(); ctx.restore(); if (on) glow(x, y, 8, C.holy, 0.35); }
    text(ready ? "HIS ANGEL" : "HIS ANGEL IS HERE", 92, 63, { size: 7, weight: 700, spacing: 2, color: ready ? "rgba(242,212,122,0.6)" : C.holy });
    // The combo.
    if (H0.combo >= 2) {
      const k = clamp(H0.comboT / 2.6, 0, 1);
      text(H0.combo + "", W - 66, 60, { align: "right", size: 34, weight: 800, italic: true, color: "#ffffff", glow: C.holy, blur: 16, alpha: 0.4 + 0.6 * k });
      text("HITS", W - 62, 60, { size: 9, weight: 800, spacing: 2, color: C.holy, alpha: 0.4 + 0.6 * k });
      if (H0.combo >= 5) text(H0.combo >= 10 ? "sobria ebrietas" : "sobria", W - 18, 78, { align: "right", size: 15, italic: true, font: FONT.line, weight: 500, color: C.holy, alpha: 0.5 + 0.5 * k });
    }
    // The blessing, when the Spirit is full.
    if (H0.spirit >= SPIRIT) {
      const bx = W - 52, by = H - 52, pul = 1 + 0.08 * Math.sin(G.t * 6);
      glow(bx, by, 50 * pul, C.holy, 0.5); circle(bx, by, 26 * pul, "rgba(20,14,8,0.85)"); ctx.strokeStyle = C.holy; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 26 * pul, 0, TAU); ctx.stroke();
      rect(bx - 2.5, by - 13, 5, 26, "#fff3cf"); rect(bx - 10, by - 6, 20, 5, "#fff3cf");
      text(tip("BLESS", "B · BLESS"), bx, by + 40, { align: "center", size: 8, weight: 800, spacing: 2, color: C.holy });
      buttons.push({ x: bx - 34, y: by - 34, w: 68, h: 68, act: () => bless() });
    }
    // The angel's words.
    if (G.msg && G.msg.t < 7) {
      const a = clamp(G.msg.t / 0.3, 0, 1) * clamp((7 - G.msg.t) / 0.8, 0, 1), who = G.msg.who === "guardian";
      const ls = wrap(G.msg.text, Math.min(W - 240, 480), "italic 500 17px " + FONT.line), bw = Math.min(W - 220, 500);
      ctx.globalAlpha = 0.55 * a; rect(W / 2 - bw / 2, 8, bw, 14 + ls.length * 20, "#050407"); ctx.globalAlpha = 1;
      ls.forEach((l, i) => text(l, W / 2, 26 + i * 20, { align: "center", size: 17, weight: 500, italic: true, font: FONT.line, color: who ? "#c4f0ff" : "#f6eccb", alpha: a }));
    }
    if (G.wave <= 1) {
      text(tip("TAP: STRIKE · TAP STREET: ZIP · TWO TAPS: HEAVY · SWIPE UP: LAUNCH · SWIPE: DODGE · HOLD: BLOCK", "ARROWS: MOVE · SPACE: STRIKE · X: COUNTER · Z: DODGE · C: HEAVY · E: LAUNCH · Q: BLOCK · B: BLESS"),
        W / 2, H - 12, { align: "center", size: 7.5, weight: 700, spacing: 1.5, color: "rgba(233,230,223,0.5)", max: W - 40 });
    }
    pauseButton();
  }

  // ---- Touch ---------------------------------------------------------------------------------------
  function foeAt(p) {
    let best = null, bd = 1e9;
    for (const f of G.foes) {
      if (f.gone) continue;
      const s = depth(f.y), top = f.y - f.z - 128 * s, bot = f.y - f.z + 10;
      if (p.y < top - 14 || p.y > bot + 14 || Math.abs(p.x - f.x) > 34 * s + 10) continue;
      const d = Math.abs(p.x - f.x) + Math.abs(p.y - (top + bot) / 2) * 0.4;
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }
  function onChains(p) { const g = G.guard; return chainsOpen() && Math.abs(p.x - g.x) < 64 && p.y > Y0 - 140 && p.y < Y0 + 14; }
  function down(s, ev) {
    if (G.over || G.down) return;
    const p = toWorld(s), f = foeAt(p);
    G.touch = { id: ev.pointerId, x0: s.x, y0: s.y, t0: G.t, target: f || (onChains(p) ? "chains" : null), moved: false, block: false };
  }
  function move(s, ev) {
    const T = G.touch; if (!T || T.id !== ev.pointerId) return;
    if (dist(s.x, s.y, T.x0, T.y0) > 14) T.moved = true;
    // A swipe is read as soon as it is plainly a swipe, so a dodge comes in time.
    if (T.moved && !T.done && !T.block) {
      const dx = s.x - T.x0, dy = s.y - T.y0;
      if (dy < -34 && Math.abs(dy) > Math.abs(dx) * 1.2 && T.target && T.target !== "chains") { T.done = true; launch(T.target); }
      else if (Math.hypot(dx, dy) > 40) { T.done = true; dodge(dx, dy * 0.6); }
    }
  }
  function up(s, ev) {
    const T = G.touch; if (!T || T.id !== ev.pointerId) return;
    G.touch = null;
    if (T.block) { if (G.hero.act.kind === "block") act("idle"); return; }
    if (T.done || G.over || G.down) return;
    if (!T.moved) {
      const p = toWorld(s);
      if (T.target === "chains") { tapChains(); return; }
      if (T.target && !T.target.gone) { tapDemon(T.target); return; }
      const f = foeAt(p); if (f) { tapDemon(f); return; }
      if (onChains(p) && tapChains()) return;
      tapGround(p);
    } else {
      const dx = s.x - T.x0, dy = s.y - T.y0;
      if (Math.hypot(dx, dy) > 20) { if (dy < -20 && Math.abs(dy) > Math.abs(dx) && T.target && T.target !== "chains") launch(T.target); else dodge(dx, dy * 0.6); }
    }
  }
  function key(code, isDown, e) {
    G.keys[code] = isDown;
    if (!isDown) { if (code === "KeyQ" && G.hero.act.kind === "block") act("idle"); return; }
    if (e && e.repeat) return;
    if (code === "Escape" || code === "KeyP") { Game.pause(); return; }
    if (G.over || G.down) return;
    const H0 = G.hero;
    if (code === "Space" || code === "KeyJ") {
      const c = pick(true);
      if (c && c.chains) tapChains(); else if (c) tapDemon(c.f, true);
    } else if (code === "KeyX") {
      const gold = G.foes.filter((f) => !f.gone && f.sign === "gold" && f.act.kind === "wind").sort((a, b) => Math.abs(a.x - H0.x) - Math.abs(b.x - H0.x))[0];
      if (gold) counter(gold); else pop(H0.x, H0.y - 130, "NOTHING TO COUNTER", "rgba(233,230,223,0.6)");
    } else if (code === "KeyZ" || code === "ShiftLeft" || code === "ShiftRight") {
      let [kx, ky] = arrows();
      if (!kx && !ky) { const th = G.foes.filter((f) => !f.gone && f.sign).sort((a, b) => Math.abs(a.x - H0.x) - Math.abs(b.x - H0.x))[0] || nearestFoe(); kx = th ? (th.x > H0.x ? -1 : 1) : -H0.dir; }
      dodge(kx, ky);
    } else if (code === "KeyC") { const c = pick(false); if (c) heavy(c.f); }
    else if (code === "KeyE") { const c = pick(false); if (c) launch(c.f); }
    else if (code === "KeyQ") { if (!busy()) act("block", {}); }
    else if (code === "KeyB") bless();
  }
  return { start, step, draw, down, move, up, key, get G() { return G; } };
})();
