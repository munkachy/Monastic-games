"use strict";
// Fear Not: the cut scenes. Shots move between tight close-ups (an eye filling the screen, a
// mouth, hands on a rosary, rain on a hat brim) and medium views of a figure framed close. Flat
// colour, a few sharp shapes, neon light down one side of the face. The dialogue sits in a clean
// band below the picture. Few words, plain type, slow cuts. Nobody speaks aloud: the angel's
// words come with a faint chord, a sigh is a breath, the whispers are a hiss.

const BAND = 84;
const WHO = {
  radio: { name: "THE RADIO", color: "#8fd8f0" },
  girl: { name: "THE GIRL", color: "#ffb8d0" },
  whisper: { name: "THE WHISPERS", color: "#ff7a50", italic: true },
  angel: { name: "HIS ANGEL", color: C.holy, italic: true },
  lawrence: { name: "FR. LAWRENCE", color: "#e9e6df" },
  guardian: { name: "THE GUARDIAN", color: "#c4f0ff", italic: true },
  brother: { name: "BR. AMBROSE", color: "#e8c8a0" },
  cantor: { name: "THE CANTOR", color: C.holy, italic: true },
  choir: { name: "THE CHOIR", color: C.holy, italic: true },
  phone: { name: "A TEXT MESSAGE", color: "#9fe4ff" },
  caption: { name: "", color: "#a9a49a", italic: true },
};

// ---- The engine ---------------------------------------------------------------------------------
// A scene is a list of shots: { draw(t, A), lines: [[who, text, sound?]], hold, enter(), music,
// level, cut: "hard" }. A shot without lines moves on by itself after `hold` seconds.
const Scene = {
  start(shots, done) {
    const S = { shots, done, i: -1, li: 0, t: 0, lt: 0, fade: 1, out: false, next: 0, chord: 0, over: false };
    Scene.S = S; mode = Scene; Scene.enter(0);
  },
  // Move to shot i: through black (a fade out, then the new shot fades in), or a hard cut.
  go(i) {
    const S = Scene.S;
    if (i >= S.shots.length) { if (!S.over) { S.over = true; S.done(); } return; }
    if (S.shots[i].cut === "hard") { Scene.enter(i); return; }
    S.out = true; S.next = i;
  },
  enter(i) {
    const S = Scene.S, sh = S.shots[i];
    S.i = i; S.li = 0; S.t = 0; S.lt = 0; S.out = false;
    if (sh.cut === "hard") S.fade = 0;
    if (sh.music) { if (sh.music === "stop") Sound.stop(); else if (sh.now) Sound.play(SONGS[sh.music]); else Sound.queue(SONGS[sh.music]); }
    if (sh.level !== undefined) Sound.setLevel(sh.level);
    if (sh.amb) Sound.ambience(sh.amb);
    Sound.ambience({ rain: sh.rain || 0 });           // rain is heard only where a shot asks for it
    if (sh.enter) sh.enter();
    Scene.voice();
  },
  // The sound that comes with a line: never a voice.
  voice() {
    const S = Scene.S, sh = S.shots[S.i], ln = sh.lines && sh.lines[S.li];
    if (!ln) return;
    const fx = Sound.fx, k = ln[2];
    if (k === "none") return;
    if (k === "sigh") fx.sigh(); else if (k === "gasp") fx.gasp();
    else if (ln[0] === "angel") fx.chord(S.chord++);
    else if (ln[0] === "guardian") fx.lowChord(S.chord++);
    else if (ln[0] === "whisper") fx.whisper(1.6);
    else if (ln[0] === "radio") fx.radio(2.2);
    else if (ln[0] === "phone") fx.buzz();
  },
  advance() {
    const S = Scene.S, sh = S.shots[S.i];
    if (S.out || S.over) return;
    const n = sh.lines ? sh.lines.length : 0;
    if (n && S.lt < 0.3) { S.lt = 0.3; return; }
    if (!n && S.t < 0.5) return;
    if (n && S.li < n - 1) { S.li++; S.lt = 0; Scene.voice(); return; }
    Scene.go(S.i + 1);
  },
  skip() { const S = Scene.S; if (!S.over) { S.over = true; S.done(); } },
  step(dt) {
    const S = Scene.S, sh = S.shots[S.i];
    S.t += dt; S.lt += dt;
    if (S.out) { S.fade += dt / 0.28; if (S.fade >= 1) { S.fade = 1; Scene.enter(S.next); } return; }
    if (S.fade > 0) S.fade = Math.max(0, S.fade - dt / 0.4);
    if (S.over) return;
    if ((!sh.lines || !sh.lines.length) && S.t > (sh.hold || 2.5)) Scene.go(S.i + 1);
    else if (sh.lines && sh.auto && S.lt > sh.auto) Scene.advance();
  },
  draw() {
    const S = Scene.S, sh = S.shots[S.i];
    rect(0, 0, W, H, "#000");
    if (!sh) return;
    const A = { w: W, h: H - BAND };
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, A.w, A.h); ctx.clip();
    if (sh.zoom) { const k = 1 + sh.zoom * smooth(S.t / (sh.zoomT || 8)), fx = (sh.fx === undefined ? 0.5 : sh.fx) * A.w, fy = (sh.fy === undefined ? 0.5 : sh.fy) * A.h; ctx.translate(fx, fy); ctx.scale(k, k); ctx.translate(-fx, -fy); }
    sh.draw(S.t, A);
    ctx.restore();
    // The band.
    rect(0, A.h, W, BAND, "#050407"); rect(0, A.h, W, 1, "rgba(232,196,106,0.18)");
    const ln = sh.lines && sh.lines[S.li];
    if (ln) {
      const who = WHO[ln[0]] || WHO.caption, a = clamp(S.lt / 0.3, 0, 1), x = Math.max(40, W * 0.09);
      if (who.name) text(who.name, x, A.h + 21, { size: 8, weight: 700, spacing: 2.5, color: who.color, alpha: a });
      const font = who.italic ? FONT.line : FONT.ui, size = who.italic ? 19 : 14, wt = who.italic ? 500 : 500;
      const lines = wrap(ln[1], W - x * 2 - 20, (who.italic ? "italic " : "") + wt + " " + size + "px " + font);
      const y0 = A.h + (who.name ? 42 : 34) + (lines.length > 1 ? -4 : 2);
      lines.slice(0, 2).forEach((l, i) => text(l, x, y0 + i * (size + 5), { size, weight: wt, font, italic: who.italic, color: who.name ? "#f1ede4" : who.color, alpha: a }));
      if (a >= 1 && Math.sin(S.lt * 5) > -0.3) poly([W - x + 4, H - 22, W - x + 12, H - 18, W - x + 4, H - 14], "rgba(232,196,106,0.7)");
      if (a >= 1 && usingKeys()) text("SPACE OR CLICK", W - x, H - 14, { align: "right", size: 7, weight: 700, spacing: 2, color: "rgba(232,196,106,0.45)" });
    }
    if (sh.caption) text(sh.caption, 18, 26, { size: 10, weight: 600, spacing: 2, color: "#e9e6df", alpha: clamp(S.t / 0.8, 0, 1) * 0.85 });
    if (S.fade > 0) rect(0, 0, W, H, "rgba(0,0,0," + S.fade + ")");
    // Skip.
    buttons.push({ x: W - 74, y: 0, w: 74, h: 34, act: () => Scene.skip() });
    text("SKIP ›", W - 14, 22, { align: "right", size: 9, weight: 700, spacing: 2, color: "rgba(233,230,223,0.55)" });
  },
  down() { Scene.advance(); },
  key(code, down) { if (!down) return; if (code === "Escape") Scene.skip(); else if (code === "Enter" || code === "Space" || code === "ArrowRight") Scene.advance(); },
};

// ---- Vigils ----------------------------------------------------------------------------------------
function bellTowerShot(t, A) {
  const w = A.w, h = A.h;
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#04050e"); g.addColorStop(1, "#1e1430"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  stars(88, 160, 0, 0, w, h * 0.9, t);
  const tx = w * 0.5, adobe = "#3a2420";
  ctx.fillStyle = adobe; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(tx - 70, h * 0.2, 140, h, 8) : ctx.rect(tx - 70, h * 0.2, 140, h); ctx.fill();
  ctx.fillStyle = "#08050a"; ctx.beginPath(); ctx.moveTo(tx - 40, h * 0.75); ctx.lineTo(tx - 40, h * 0.42); ctx.arc(tx, h * 0.42, 40, PI, TAU); ctx.lineTo(tx + 40, h * 0.75); ctx.closePath(); ctx.fill();
  rect(tx - 3, h * 0.02, 6, h * 0.18, "#2a1a14"); rect(tx - 18, h * 0.07, 36, 6, "#2a1a14");
  const a = Math.sin(t * 2.2) * 0.55 * Math.max(0, 1 - t / 14);
  ctx.save(); ctx.translate(tx, h * 0.4); ctx.rotate(a);
  rect(-2, 0, 4, 10, "#1a120a"); ctx.beginPath(); ctx.moveTo(-14, 10); ctx.quadraticCurveTo(-16, 40, -28, 52); ctx.lineTo(28, 52); ctx.quadraticCurveTo(16, 40, 14, 10); ctx.closePath(); ctx.fillStyle = "#7a6234"; ctx.fill();
  circle(0, 54, 5, "#5a4624"); ctx.restore();
  line(tx + Math.sin(a) * 50, h * 0.4 + 50, tx + 10, h, "#5a4030", 1.4);
  glowOval(tx, h * 0.98, 140, 30, "#ffa040", 0.25);
  vignette(0.5, 0.35);
}
// The brothers filing into the chapel past the lit door, hoods up.
function brothersShot(t, A) {
  const w = A.w, h = A.h, gy = h * 0.9;
  rect(0, 0, w, h, "#120a08");
  const dx = w * 0.38, dw = 120;
  rect(dx, h * 0.12, dw, gy - h * 0.12, "#3a2414"); ctx.beginPath(); ctx.arc(dx + dw / 2, h * 0.12 + 2, dw / 2, PI, TAU); ctx.fillStyle = "#3a2414"; ctx.fill();
  glow(dx + dw / 2, gy - 60, 180, "#ffa040", 0.55);
  rect(0, gy, w, h - gy, "#0c0806");
  for (let i = 0; i < 6; i++) {
    const x = w * 0.92 - (t * 46 - i * 76);
    if (x < -60 || x > w + 60) continue;
    const ph = t * 4.2 + i, sw = Math.sin(ph) * 0.35;
    drawFigure("monk", x, gy, 1.5, -1, pose({ lean: 0.08, head: 0.15, hF: sw, kF: Math.max(0, -sw) * 0.6, hB: -sw, kB: Math.max(0, sw) * 0.6, sF: 0.55, eF: 1.75, sB: 0.45, eB: 1.8 }), { t, hood: true, rim: "#ffa040", rimX: -2, handsHidden: true });
  }
  vignette(0.6, 0.3);
}
// The choir stalls, candles, and the first words of the Night Office.
function choirShot(t, A) {
  const w = A.w, h = A.h, gy = h * 0.88;
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#0a0605"); g.addColorStop(1, "#1e120c"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 4; i++) { const cx = w * (0.15 + i * 0.24), fl = 0.8 + 0.2 * Math.sin(t * 8 + i * 2); rect(cx - 2, gy - 120, 4, 22, "#efe6d6"); circle(cx, gy - 124, 2.5, "#ffd27a"); glow(cx, gy - 126, 60, "#ffa040", 0.45 * fl); }
  rect(0, gy - 40, w, 40, "#24160e"); rect(0, gy - 44, w, 5, "#3a2414");
  for (let i = 0; i < 7; i++) drawFigure("monk", w * (0.08 + i * 0.14), gy - 8, 1.25, 1, pose({ lean: 0.04, head: -0.12, sF: 0.5, eF: 1.7, sB: 0.4, eB: 1.8 }), { t: t + i, hood: i !== 3, rim: "#ffa040", rimX: 2, handsHidden: true, noGlasses: true });
  rect(0, gy - 10, w, h - gy + 10, "#160d08");
  vignette(0.55, 0.3);
}
function endCard(t, A) {
  const w = A.w, h = A.h;
  rect(0, 0, w, h, "#050407");
  const a = smooth(t / 2);
  glow(w / 2, h * 0.42, 220, C.holy, 0.12 * a);
  text("FEAR NOT", w / 2, h * 0.42, { align: "center", font: FONT.title, size: 48, weight: 700, spacing: 10, color: "#ffffff", glow: "rgba(232,196,106,0.7)", blur: 24, alpha: a });
  text("The first night", w / 2, h * 0.42 + 34, { align: "center", font: FONT.line, italic: true, size: 20, weight: 500, color: C.holy, alpha: a });
}

// ---- The scripts -----------------------------------------------------------------------------------
const SCENES = {
  // 1. Bring Daddy Home.
  cold: () => [
    { draw: radioShot, caption: "2:00 AM", music: "radio", now: true, level: 0, zoom: 0.06, fx: 0.42, fy: 0.5,
      lines: [["radio", "…a week now. Every night, a few more blocks of the city go dark."], ["radio", "The power company says it can find no fault. Tonight it was the Eastside…"]] },
    { draw: skylineDarkShot, zoom: 0.04, lines: [["radio", "…keep a flashlight by the bed. Stay indoors."]] },
    { draw: girlWindowShot, zoom: 0.08, fx: 0.42, fy: 0.55, lines: [["girl", "Please bring Daddy home."]] },
    { draw: girlHandsShot, hold: 3.2, zoom: 0.05 },
    { draw: carStreetShot, hold: 3.6, rain: 1, zoom: 0.05, fx: 0.3, fy: 0.8, caption: "Across the city" },
    { draw: mirrorShot, hold: 3.0, zoom: 0.04 },
    { draw: phoneShot, enter: () => Sound.fx.buzz(), lines: [["caption", "Deep in debt to the wrong people."]] },
    { draw: handsGunShot, hold: 3.0, level: 1, enter: () => Sound.fx.heart(0.8), zoom: 0.05 },
    { draw: (t, A) => carStreetShot(t, A, { shapes: true, lamp: 0.25 }), rain: 1, level: 2, zoom: 0.07, fx: 0.32, fy: 0.75,
      lines: [["whisper", "Just this once."], ["whisper", "Nobody gets hurt."], ["whisper", "You have no choice."]] },
  ],
  // 2. Someone Asked.
  desert: () => [
    { draw: desertNight, cut: "hard", music: "silence", now: true, amb: { wind: 0.15, windF: 300 }, hold: 4.2, caption: "The same night. A monastery in the desert.", zoom: 0.04, fx: 0.45, fy: 0.7 },
    { draw: cellShot, hold: 3.0, music: "desert", now: true, level: 0 },
    { draw: (t, A) => cellShot(t, A, { light: smooth(t / 1.5) }), enter: () => Sound.fx.glory(), level: 1, lines: [["angel", "Get up."], ["angel", "Someone asked."]] },
    { draw: (t, A) => lawrenceBust(t, A, { look: "squint", hand: "shade", L: 1 }), lines: [["lawrence", "Asked? Who… who asked?", "gasp"], ["angel", "A child, in a city far from here. She asked for her father."], ["angel", "We have work to do."]] },
    { draw: (t, A) => lawrenceBust(t, A, { look: "wide", hand: "protest", mouth: "open", L: 1 }), zoom: 0.05, fx: 0.5, fy: 0.45,
      lines: [["lawrence", "Wait a minute. I'm not Padre Pio!"], ["lawrence", "I lose my glasses twice a day. I fell asleep in Vespers. Twice this week."]] },
    { draw: (t, A) => angelShot(t, A, {}), zoom: 0.04, lines: [["angel", "No. You are not."], ["angel", "He knows every weakness you have. He means to show His power through them."], ["angel", "“Power is made perfect in infirmity.”"]] },
    { draw: (t, A) => lawrenceBust(t, A, { look: "kind", mouth: "smile", L: 0.8 }), lines: [["lawrence", "…Let me find my shoes.", "sigh"], ["angel", "Leave them. Your body will stay here, kneeling. The rest of you comes with me."]] },
    { draw: (t, A) => chapelShot(t, A, { spirit: clamp((t - 1) / 2.5, 0, 1) }), hold: 4.6, enter: () => Sound.fx.glory() },
    { draw: (t, A) => chapelShot(t, A, { spirit: 1 }), lines: [["lawrence", "Should I bring my hat?"], ["angel", "Bring what you like. It is your own imagination I am using."]] },
    { draw: (t, A) => rooftopShot(t, A, { title: true }), music: "noir", level: 0, now: true, amb: { wind: 0 }, lines: [["angel", "Fear not."]] },
  ],
  // 4a. The street, before the fight.
  street: () => [
    { draw: brimShot, music: "radio", now: true, level: 1, amb: { wind: 0 }, lines: [["lawrence", "What are they?"]] },
    { draw: (t, A) => demonShot(t, A, { eyes: [[0.3, 0.45, 1], [0.72, 0.38, 0.7], [0.55, 0.7, 0.5]] }), lines: [["angel", "What you will see is a fight. What is really happening is beyond what you can understand."], ["angel", "I am showing it to you with what you already have."]] },
    { draw: lawrenceEyesShot, zoom: 0.03,
      lines: [["angel", "If you had grown up on westerns, this would be a showdown at noon."], ["lawrence", "I grew up on kung fu films."], ["angel", "I know."]] },
  ],
  // 4b. After the fight: what the guardian has seen.
  guardian: () => [
    { draw: (t, A) => angelShot(t, A, { cool: true, close: true }), music: "noir", level: 0, lines: [["guardian", "Thank you, brothers. I have been calling since midnight."], ["guardian", "His name is Danny. He owes money to a man uptown: Mr. Crane. Half this district owes Mr. Crane."]] },
    { draw: guardianStandShot, lines: [["guardian", "And the lights. The first to go out was the sanctuary lamp at St. Brigid's, by the river, a week ago tonight."], ["guardian", "The streets went dark after it, one by one."], ["lawrence", "A sanctuary lamp doesn't go out by itself."], ["angel", "No. It does not."]] },
    { draw: (t, A) => guardianStandShot(t, A, { all: true }), lines: [["lawrence", "What happens now?"], ["angel", "Now he chooses. We cannot choose for him."], ["guardian", "But the fog round him is gone. He can see his way."]] },
  ],
  // 5. The choice.
  choice: () => [
    { draw: dannyEyesShot, music: "home", level: 0, hold: 3.4 },
    { draw: drawingShot, hold: 4.2, zoom: 0.08 },
    { draw: lightsOnShot, rain: 0.6, level: 1, enter: () => { Sound.fx.engine(); [1, 1.55, 2.1, 2.65, 3.2].forEach((s, i) => setTimeout(() => Sound.fx.lightOn(i), s * 1000)); }, hold: 5.2 },
    { draw: skylineOnShot, hold: 4.0, enter: () => Sound.fx.glory() },
    { draw: doorShot, level: 2, enter: () => Sound.fx.door(), hold: 3.4 },
    { draw: girlFaceShot, hold: 3.0, zoom: 0.06, fx: 0.5, fy: 0.5, lines: [["girl", "Daddy."]] },
  ],
  // 6. Vigils.
  bell: () => [
    { draw: (t, A) => chapelShot(t, A, { head: t < 0.8 ? -0.1 : -0.1 + 0.35 * smooth((t - 0.8) / 0.3) }), cut: "hard", music: "stop", amb: { wind: 0.08, windF: 300 }, enter: () => Sound.fx.bigBell(), hold: 3.4 },
    { draw: bellTowerShot, enter: () => { setTimeout(() => Sound.fx.bigBell(0.8), 400); setTimeout(() => Sound.fx.bigBell(0.6), 3200); }, hold: 4.8, zoom: 0.05 },
    { draw: brothersShot, lines: [["brother", "You're up early, Father."], ["lawrence", "Something like that."]] },
    { draw: (t, A) => chapelShot(t, A, { kneel: blendPose(pose({ lean: 0.05, head: -0.1, hF: 0.02, kF: 1.55, hB: -0.02, kB: 1.6, sF: 0.6, eF: 1.9, sB: 0.5, eB: 1.9 }), pose({ lean: 0.35, head: 0.1, hF: 0.6, kF: 0.6, hB: -0.1, kB: 0.1, sF: 0.6, eF: 0.4, sB: 0.2, eB: 0.3 }), smooth(t / 2.5)) }), enter: () => setTimeout(() => Sound.fx.sigh(), 600), lines: [["caption", "His knees ache."]] },
    { draw: choirShot, music: "chant", now: true, lines: [["cantor", "Domine, labia mea aperies.  (O Lord, open my lips.)"], ["choir", "Et os meum annuntiabit laudem tuam.  (And my mouth shall declare your praise.)"]] },
    { draw: endCard, hold: 6 },
  ],
};
