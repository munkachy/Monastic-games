"use strict";
// Canticle Mansion: menus, the book of verses, powers, and the loop.

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const POWERS = {
  staff:   { name: "The Staff", text: "Lean on it and leap: you jump a tile higher." },
  sandals: { name: "The Sandals of the Roe", text: "Leap upon the mountains: jump again in the air." },
  lantern: { name: "The Lantern", text: "By night you see far: the dark gives way before you." },
  angel:   { name: "The Guardian Angel", text: "Your angel goes before you, strikes what threatens, and turns blows aside." },
  helmet:  { name: "The Helmet", text: "A thousand bucklers: one more heart, and you break cracked stone from below." },
  chariot: { name: "The Chariot of Aminadab", text: "The round button dashes the way you face, when there is nothing else to do (C or Shift on keys)." },
  gloves:  { name: "The Climber's Gloves", text: "I will go up into the palm tree: in the air, hold toward a wall to climb it." },
  seal:    { name: "The Seal upon Thy Heart", text: "Love is strong as death: your holy water burns as flame, through two at once, and sets cedar barricades alight." },
};
Game.gainPower = function (key) {
  save.powers[key] = true; store();
  Snd.sfx("power"); this.powerT = 1.6; this.shake = 0.2;
  this.banner = { title: POWERS[key].name, text: POWERS[key].text, t: 0, len: 5 };
  if (key === "angel") this.angel = { x: this.monk.x, y: this.monk.y - 20, t: 0 };
  if (key === "helmet") { this.monk.max = Grace.maxHearts(); this.monk.hearts = this.monk.max; }
  for (let i = 0; i < 30; i++) World.parts.push({ x: this.monk.x + 5, y: this.monk.y + 10, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 200, g: 120, life: 1, c: i % 2 ? "#fff4c8" : "#ffe08a", s: 2 });
};
Game.finishChapter = function () {
  const ch = this.chapter;
  save.done[ch] = 1; save.open = Math.max(save.open, Math.min(8, ch + 1)); store();
  Snd.stop(); Snd.sfx("win");
  this.state = "end"; this.endT = 0; this.scrollY = 0;
};
Game.say = function (who, line, len) { this.speech = { who, line, t: 0, len: len || 4 }; };

// ---- The screens beside the play -------------------------------------------------------------
function button(label, x, y, w, h, hot) {
  sx.fillStyle = "#06040a"; sx.fillRect(x - 1, y - 1, w + 2, h + 2);
  sx.fillStyle = hot ? "#e8b94a" : "#2a2238"; sx.fillRect(x, y, w, h);
  sx.fillStyle = hot ? "#fff0a0" : "#3c3250"; sx.fillRect(x, y, w, 1.5);
  uiText(label, x + w / 2, y + h / 2 - 4.5, { align: "center", size: 8.5, color: hot ? "#140c1c" : "#ffe8b0", edge: hot ? null : undefined });
  return { x, y, w, h };
}
const inBox = (p, b) => p && p.x !== undefined && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
const titleArt = { t: 0 };
function drawGardenBack(t) {
  // The mansion at dusk: lit windows, cedar beams, a garden before it, the evening star.
  bx.setTransform(1, 0, 0, 1, 0, 0);
  SKIES.sunset(bx, {}, t * 6, 0, t);
  px(bx, 0, 160, W, 64, "#22301e");
  // The house: a central block with a gable, two wings, a tower.
  const stone = "#5a4a52", dark = "#3a2e36", lit = (i) => (Math.sin(t * 0.7 + i * 1.7) > -0.6 ? "#ffcf6a" : "#c88a3a");
  px(bx, 60, 104, 280, 58, stone); px(bx, 60, 104, 280, 2, "#7a6a72");
  px(bx, 150, 74, 100, 88, stone); bx.fillStyle = dark; bx.beginPath(); bx.moveTo(144, 76); bx.lineTo(200, 40); bx.lineTo(256, 76); bx.fill();
  px(bx, 292, 56, 34, 106, stone); bx.fillStyle = dark; bx.beginPath(); bx.moveTo(288, 58); bx.lineTo(309, 30); bx.lineTo(330, 58); bx.fill();
  px(bx, 307, 24, 2, 8, "#c8962a");
  for (let i = 0; i < 8; i++) { const x = 70 + i * 34; if (x > 140 && x < 250) continue; px(bx, x, 116, 14, 20, "#1a1218"); px(bx, x + 1, 117, 12, 18, lit(i)); px(bx, x + 7, 117, 1, 18, "#1a1218"); px(bx, x + 1, 126, 12, 1, "#1a1218"); }
  for (let i = 0; i < 3; i++) { const x = 160 + i * 30; px(bx, x, 84, 18, 24, "#1a1218"); px(bx, x + 1, 85, 16, 22, lit(i + 9)); px(bx, x + 8, 85, 1, 22, "#1a1218"); }
  px(bx, 302, 70, 14, 22, "#1a1218"); px(bx, 303, 71, 12, 20, lit(20));
  // The door, open, warm light on the step.
  bx.fillStyle = "#1a1218"; bx.beginPath(); bx.moveTo(186, 162); bx.lineTo(186, 128); bx.arc(200, 128, 14, Math.PI, 0); bx.lineTo(214, 162); bx.fill();
  bx.fillStyle = "#ffcf6a"; bx.beginPath(); bx.moveTo(189, 162); bx.lineTo(189, 130); bx.arc(200, 130, 11, Math.PI, 0); bx.lineTo(211, 162); bx.fill();
  px(bx, 176, 160, 48, 4, "#7a6a62");
  // Cypress and vines before the house.
  for (const x of [40, 352, 372]) SCENE.cypress(bx, x, 164, 60);
  SCENE.vines(bx, 70, 150, 90, t); SCENE.vines(bx, 240, 150, 50, t);
  px(bx, 330, 30, 2, 2, "#ffffff");
  // The monk at the door.
  const m = { x: 195, y: 136, w: 10, h: 24, face: 1, anim: "idle", at: 0, step: 0, inv: 0 };
  ART.monk(bx, m, t);
  sx.setTransform(1, 0, 0, 1, 0, 0); sx.fillStyle = "#000"; sx.fillRect(0, 0, screen.width, screen.height); sx.imageSmoothingEnabled = false;
  sx.drawImage(bgBuf, Math.round(offX * dpr), Math.round(offY * dpr), Math.round(W * scale * dpr), Math.round(H * scale * dpr));
  toScreenSpace();
}
function drawTitle(t) {
  drawGardenBack(t);
  sx.save(); sx.font = "700 30px " + FONT.carved; sx.textAlign = "center"; sx.textBaseline = "top";
  sx.lineWidth = 3; sx.strokeStyle = "#1a0c08"; sx.strokeText("CANTICLE MANSION", W / 2, 18);
  const g = sx.createLinearGradient(0, 18, 0, 50); g.addColorStop(0, "#fff0b0"); g.addColorStop(1, "#c8862a"); sx.fillStyle = g; sx.fillText("CANTICLE MANSION", W / 2, 18);
  sx.font = "italic 12px " + FONT.book; sx.fillStyle = "#ffe8c8"; sx.fillText("The Canticle of Canticles, in eight chapters", W / 2, 54);
  sx.font = "italic 9px " + FONT.book; sx.fillStyle = "rgba(255,232,200,0.8)"; sx.fillText("“The king hath brought me into his storerooms.” Canticle 1:3", W / 2, 70);
  sx.restore();
  if (Math.floor(t * 2) % 2) uiText("TAP TO ENTER", W / 2, 196, { align: "center", size: 10 });
  for (const tp of input.taps) { Snd.sfx("select"); Game.state = "chapters"; }
  input.taps = [];
}
const CHAPTER_TITLES = ["The Kiss of His Mouth", "The Lily among Thorns", "By Night I Sought Him", "A Garden Enclosed", "My Heart Watcheth", "Terrible as an Army", "The Palm Tree", "Love Is Strong as Death"];
let chapterHot = 0;
function versesRead(ch) { let n = 0; for (let v = 1; v <= CANTICLE[ch - 1].length; v++) if (save.read[ch + ":" + v]) n++; return n; }
function drawChapters(t) {
  drawGardenBack(t);
  sx.fillStyle = "rgba(8,6,14,0.55)"; sx.fillRect(0, 0, W, H);
  uiText("THE EIGHT CHAPTERS", W / 2, 6, { align: "center", size: 11, color: "#ffe08a" });
  const boxes = [];
  for (let i = 0; i < 8; i++) {
    const x = 14 + (i % 4) * 94, y = 24 + Math.floor(i / 4) * 78, w = 86, h = 72, ch = i + 1;
    const built = !!CHAPTERS[i], open = built && ch <= save.open, hot = i === chapterHot;
    sx.fillStyle = "#06040a"; sx.fillRect(x - 1, y - 1, w + 2, h + 2);
    sx.fillStyle = open ? (hot ? "#3a2a4a" : "#221a30") : "#16121c"; sx.fillRect(x, y, w, h);
    // An arch for each chapter.
    sx.fillStyle = open ? "#120c18" : "#0c0a10"; sx.beginPath(); sx.moveTo(x + w / 2 - 14, y + 44); sx.lineTo(x + w / 2 - 14, y + 26); sx.arc(x + w / 2, y + 26, 14, Math.PI, 0); sx.lineTo(x + w / 2 + 14, y + 44); sx.fill();
    if (hot) { sx.fillStyle = "#ffe08a"; sx.fillRect(x, y, w, 1.5); sx.fillRect(x, y + h - 1.5, w, 1.5); }
    uiText(ROMAN[ch], x + w / 2, y + 22, { align: "center", size: 12, color: open ? "#ffe08a" : "#5a5068", font: FONT.carved, edge: null });
    uiText(CHAPTER_TITLES[i], x + w / 2, y + 47, { align: "center", size: 6.5, color: open ? "#ffffff" : "#5a5068", edge: null });
    if (open) {
      uiText(versesRead(ch) + " / " + CANTICLE[i].length + " verses" + (save.done[ch] ? "  ✓" : ""), x + w / 2, y + 56, { align: "center", size: 6, color: save.done[ch] ? "#9ae07a" : "#c8b8ff", edge: null });
      const [pf, pt] = Grace.pomeIn(ch), lk = Grace.lilyKept(ch), la = Grace.lilyTotal(ch);
      uiText("❀ " + lk + "/" + la + (pt ? "   ● " + pf + "/" + pt : ""), x + w / 2, y + 64, { align: "center", size: 6, color: lk >= la ? "#ffe08a" : "#a89cb8", edge: null });
    }
    else uiText(built ? "Finish chapter " + ROMAN[ch - 1] : "To come", x + w / 2, y + 58, { align: "center", size: 6, color: "#5a5068", edge: null });
    boxes.push({ x, y, w, h, i, open });
  }
  const back = button("BACK", 8, 204, 46, 14, false);
  uiText(Snd.on ? "SOUND ON (M)" : "SOUND OFF (M)", W - 10, 207, { align: "right", size: 7, color: "#8a80a8", edge: null });
  const snd = { x: W - 80, y: 202, w: 72, h: 18 };
  for (const tp of input.taps) {
    if (tp.key === "ArrowRight") chapterHot = Math.min(7, chapterHot + 1);
    else if (tp.key === "ArrowLeft") chapterHot = Math.max(0, chapterHot - 1);
    else if (tp.key === "ArrowDown") chapterHot = Math.min(7, chapterHot + 4);
    else if (tp.key === "ArrowUp") chapterHot = Math.max(0, chapterHot - 4);
    else if (tp.key === "Enter" || tp.key === "Space") { if (boxes[chapterHot].open) { Snd.sfx("select"); Game.start(chapterHot + 1); } }
    else if (tp.key === "Escape" || inBox(tp, back)) Game.state = "title";
    else if (inBox(tp, snd) || tp.key === "KeyM") Snd.toggle();
    else for (const b of boxes) if (inBox(tp, b) && b.open) { if (chapterHot === b.i) { Snd.sfx("select"); Game.start(b.i + 1); } chapterHot = b.i; }
  }
  input.taps = [];
}

// ---- The play screen's own words -------------------------------------------------------------------
function heartAt(x, y, full) {
  const c = full ? "#e8324a" : "#3a2230";
  sx.fillStyle = "#06040a"; sx.fillRect(x - 1, y, 9, 7);
  sx.fillStyle = c; sx.fillRect(x, y + 1, 3, 3); sx.fillRect(x + 4, y + 1, 3, 3); sx.fillRect(x + 1, y, 2, 1); sx.fillRect(x + 4, y, 2, 1); sx.fillRect(x + 1, y + 4, 5, 1); sx.fillRect(x + 2, y + 5, 3, 1);
  if (full) { sx.fillStyle = "#ffb0b8"; sx.fillRect(x + 1, y + 1, 1, 1); }
}
function drawHud(t) {
  const m = Game.monk, ch = Game.chapter;
  toScreenSpace();
  for (let i = 0; i < m.max; i++) heartAt(6 + i * 10, 6, i < m.hearts);
  const lil = Grace.lilyKept(ch), lilAll = Grace.lilyTotal(ch);
  const swell = Game.countPulse > 0 ? 1 + Game.countPulse * 0.5 : 1;
  if (Game.countPulse > 0) Game.countPulse -= 1 / 60;
  uiText("❦ " + versesRead(ch) + "/" + CANTICLE[ch - 1].length + "   ❀ " + lil + "/" + lilAll + (Grace.pomeIn(ch)[1] ? "   ● " + Grace.pomeIn(ch).join("/") : "") + (Game.lily ? "  carrying a lily" : ""), 6, 16, { size: 7 * swell, color: swell > 1 ? "#fff4a0" : "#ffe8b0" });
  for (const f of Game.flyers) {
    f.t += 1 / 60; if (f.t < 0) continue;
    const u = Math.min(1, f.t / 0.7), e = u * u * (3 - 2 * u);
    const x = lerp(f.sx, 12, e), y = lerp(f.sy, 19, e) - Math.sin(u * Math.PI) * 40;
    uiText(f.ch, x, y, { size: 12 - u * 6, color: "#fff0a0", alpha: 1 - u * 0.2, font: FONT.carved });
    if (u >= 1 && !f.done) { f.done = true; Game.countPulse = 0.25; }
  }
  Game.flyers = Game.flyers.filter((f) => !f.done);
  // Pause.
  sx.fillStyle = "#ffffff"; sx.fillRect(W - 16, 6, 3, 9); sx.fillRect(W - 10, 6, 3, 9);
  if (Game.nameTime > 0 && Game.roomName) {
    const a = Math.min(1, Game.nameTime);
    sx.save(); sx.globalAlpha = a * 0.6; sx.fillStyle = "#06040a"; sx.fillRect(W / 2 - 110, H - 46, 220, 18); sx.restore();
    uiText(Game.roomName, W / 2, H - 43, { align: "center", size: 10, color: "#ffe08a", alpha: a, font: FONT.carved });
  }
  if (Game.toast) {
    const a = Math.min(1, (2.6 - Game.toast.t) * 2, Game.toast.t * 4);
    uiText((Game.toast.verse ? "❦ " : "") + Game.toast.text, W / 2, H - 20, { align: "center", size: 8, color: "#fff4c8", alpha: a });
  }
  if (Game.speech) {
    const s = Game.speech; s.t += 1 / 60;
    if (s.t > s.len) Game.speech = null;
    else {
      sx.save(); sx.globalAlpha = Math.min(1, s.t * 4, (s.len - s.t) * 3);
      sx.fillStyle = "rgba(10,6,16,0.82)"; sx.fillRect(40, 150, W - 80, 52); sx.fillStyle = "#c8962a"; sx.fillRect(40, 150, W - 80, 1);
      uiText(s.who, 50, 155, { size: 7.5, color: "#ffe08a" });
      sx.font = "italic 10px " + FONT.book; sx.fillStyle = "#fff4e0"; sx.textBaseline = "top";
      wrap(sx, s.line, W - 100).slice(0, 3).forEach((l, i) => sx.fillText(l, 50, 166 + i * 11));
      sx.restore();
    }
  }
  if (Game.whisper) {
    const w = Game.whisper, a = Math.min(1, w.t * 2, (w.len - w.t) * 1.5);
    sx.save(); sx.globalAlpha = a * 0.55; sx.fillStyle = "#06040a"; sx.fillRect(30, 28, W - 60, 40); sx.restore();
    sx.save(); sx.globalAlpha = a; sx.font = "italic 10px " + FONT.book; sx.fillStyle = "#fff0d0"; sx.textBaseline = "top"; sx.textAlign = "center";
    wrap(sx, "“" + w.text + "”", W - 80).slice(0, 2).forEach((l, i) => sx.fillText(l, W / 2, 32 + i * 12));
    sx.restore();
    uiText(w.ref, W / 2, 57, { align: "center", size: 6.5, color: "#c8b8ff", alpha: a });
  }
  if (Game.banner) {
    const b = Game.banner, a = Math.min(1, b.t * 3, (b.len - b.t) * 2);
    sx.save(); sx.globalAlpha = a; sx.fillStyle = "rgba(10,6,16,0.8)"; sx.fillRect(0, 70, W, 56); sx.fillStyle = "#e8b94a"; sx.fillRect(0, 70, W, 1); sx.fillRect(0, 125, W, 1); sx.restore();
    uiText(b.title, W / 2, 78, { align: "center", size: 14, color: "#ffe08a", alpha: a, font: FONT.carved });
    uiText(b.text, W / 2, 102, { align: "center", size: 8, color: "#ffffff", alpha: a });
  }
  drawControls(t);
  // The first steps: how to move.
  if (Game.hint > 0) {
    const a = Math.min(1, Game.hint);
    sx.save(); sx.globalAlpha = a * 0.14; sx.fillStyle = "#ffffff"; sx.fillRect(0, 24, WALK_SPLIT - 1, H - 24); sx.fillRect(WALK_SPLIT + 1, 24, W / 2 - WALK_SPLIT - 2, H - 24); sx.globalAlpha = a * 0.22; sx.fillRect(W / 2 + 1, 24, W / 2, H - 24); sx.restore();
    uiText("◀ HOLD", WALK_SPLIT / 2, 100, { align: "center", size: 9, alpha: a });
    uiText("HOLD ▶", (WALK_SPLIT + W / 2) / 2, 100, { align: "center", size: 9, alpha: a });
    uiText("TAP HERE TO JUMP", W * 3 / 4, 80, { align: "center", size: 9, alpha: a });
    uiText("hold for higher", W * 3 / 4, 94, { align: "center", size: 7, alpha: a });
    uiText("The round button lifts, opens, speaks.  Tap a creature to throw holy water.", W / 2, 128, { align: "center", size: 7, alpha: a });
  }
  if (Game.fade > 0) { sx.fillStyle = "rgba(0,0,0," + clamp(Game.fade, 0, 1) + ")"; sx.fillRect(0, 0, W, H); }
}
// The thumbs' guides: two faint arrows at the lower left, and the action button
// at the lower right, lit and labelled when there is something to do.
function drawControls(t) {
  const m = Game.monk, hint = Game.cutscene ? null : Game.actionHint(m);
  sx.save();
  sx.globalAlpha = 0.18; sx.fillStyle = "#ffffff";
  for (const [x, d] of [[WALK_SPLIT / 2, -1], [(WALK_SPLIT + W / 2) / 2, 1]]) {
    const on = d < 0 ? input.left : input.right;
    sx.globalAlpha = on ? 0.4 : 0.16;
    sx.beginPath(); sx.moveTo(x + 7 * d, H - 22); sx.lineTo(x - 7 * d, H - 30); sx.lineTo(x - 7 * d, H - 14); sx.closePath(); sx.fill();
  }
  const press = Game.actPress > 0 ? 2 : 0;
  sx.globalAlpha = hint ? 0.85 : 0.22;
  sx.fillStyle = "#06040a"; sx.beginPath(); sx.arc(ACT.x, ACT.y, ACT.r + 1.5, 0, 7); sx.fill();
  sx.fillStyle = hint ? "#c8962a" : "#3c3250"; sx.beginPath(); sx.arc(ACT.x, ACT.y + press * 0.5, ACT.r - press * 0.5, 0, 7); sx.fill();
  if (hint) { sx.globalAlpha = 0.5 + Math.sin(t * 5) * 0.2; sx.strokeStyle = "#fff0a0"; sx.lineWidth = 1.2; sx.beginPath(); sx.arc(ACT.x, ACT.y, ACT.r + 3, 0, 7); sx.stroke(); }
  sx.restore();
  if (hint) uiText(hint, ACT.x, ACT.y - 4, { align: "center", size: hint.length > 6 ? 6.5 : 7.5, color: "#140c1c", edge: null });
  if (Game.actPress > 0) Game.actPress -= 1 / 60;
}
// The pause: the book of this chapter, in four pages. The verses read so far;
// the rooms, with what each still keeps; the Fathers on the chapter, opened by
// its lilies; and help, with the easier ways.
const BOOK_TABS = ["VERSES", "ROOMS", "FATHERS", "HELP"];
const ASSISTS = [
  ["gentle", "No harm", "A blow pushes you back but takes no heart, and the lily stays."],
  ["slow", "Slower", "Everything moves at three quarters of the speed."],
  ["wings", "Endless leaps", "Jump again in the air as often as you like."],
];
function drawPause(t) {
  drawWorld(); toScreenSpace();
  sx.fillStyle = "rgba(6,4,10,0.94)"; sx.fillRect(0, 0, W, H);
  const ch = Game.chapter, vs = CANTICLE[ch - 1], tab = Game.bookTab || 0;
  uiText("CANTICLE " + ROMAN[ch] + " · " + CHAPTER_TITLES[ch - 1].toUpperCase(), W / 2, 5, { align: "center", size: 8.5, color: "#ffe08a", font: FONT.carved });
  const tabs = BOOK_TABS.map((name, i) => {
    const b = { x: 40 + i * 82, y: 18, w: 76, h: 13 };
    sx.fillStyle = i === tab ? "#3a2a18" : "#16121e"; sx.fillRect(b.x, b.y, b.w, b.h);
    sx.fillStyle = i === tab ? "#e8b94a" : "#3c3250"; sx.fillRect(b.x, b.y + b.h - 1.5, b.w, 1.5);
    uiText(name, b.x + b.w / 2, b.y + 2.5, { align: "center", size: 7.5, color: i === tab ? "#ffe8b0" : "#8a80a0" });
    return b;
  });
  const top = 36, bottom = 186, assistBoxes = [];
  sx.save(); sx.beginPath(); sx.rect(16, top, W - 32, bottom - top); sx.clip();
  sx.textBaseline = "top";
  let y = top + 2 - Game.pageRead;
  if (tab === 0) {
    sx.font = "italic 8.5px " + FONT.book;
    vs.forEach((v, i) => {
      const read = save.read[ch + ":" + (i + 1)];
      const lines = read ? wrap(sx, v, W - 64) : ["… (not yet found)"];
      sx.fillStyle = "#c8962a"; sx.fillText(String(i + 1), 20, y);
      sx.fillStyle = read ? "#f4ead4" : "#6a6078";
      lines.forEach((l, k) => sx.fillText(l, 34, y + k * 10.5));
      y += lines.length * 10.5 + 4;
    });
  } else if (tab === 1) {
    // One line for each room of the chapter, in the order of the way.
    const rooms = Object.values(ROOMS).filter((R) => R.chapter === ch), vis = save.visited || {};
    const pomes = save.pomes || {}, glimpsed = save.glimpsed || {};
    for (const R of rooms) {
      const been = vis[R.id] || (save.done[ch] && R.id === CHAPTERS[ch - 1].start);
      sx.fillStyle = been ? "rgba(255,232,190,0.07)" : "rgba(255,255,255,0.025)"; sx.fillRect(20, y, W - 40, 15);
      sx.font = "italic 8.5px " + FONT.book; sx.fillStyle = been ? "#f4ead4" : "#5a5068";
      sx.fillText(been ? R.name : "· · ·", 26, y + 3);
      if (been) {
        const vv = (R.texts || []).map((q) => q.v), got = vv.filter((v) => save.read[ch + ":" + v]).length;
        const lily = Grace.roomLily(R), kept = lily && (save.lilies[ch] || {})[lily];
        const cols = [];
        if (vv.length) cols.push([got + "/" + vv.length + " ❦", got === vv.length ? "#e8b94a" : "#a89cb8"]);
        if (lily) cols.push([kept ? "❀ kept" : "❀ not yet", kept ? "#f4f0ff" : "#7a7090"]);
        if (glimpsed[R.id]) cols.push(["he was here", "#e8c070"]);
        if (R.secret && R.secret.F !== undefined) {
          const found = pomes[R.id + ":pome"], can = save.powers[R.secret.power];
          cols.push([found ? "● pomegranate" : can ? "● something hidden" : "● out of reach", found ? "#e0485a" : can ? "#c88a7a" : "#5a5068"]);
        }
        let x = W - 26;
        sx.font = "7.5px " + FONT.ui; sx.textAlign = "right";
        for (const [txt, col] of cols.reverse()) { sx.fillStyle = col; sx.fillText(txt, x, y + 4); x -= sx.measureText(txt).width + 10; }
        sx.textAlign = "left";
      }
      y += 18;
    }
    sx.font = "7.5px " + FONT.ui; sx.fillStyle = "#8a80a0";
    sx.fillText("Pomegranates found in all: " + Grace.pomeFound() + " of " + Grace.pomeTotal() + " · every four give a heart", 24, y + 4); y += 18;
  } else if (tab === 2) {
    const kept = Grace.lilyKept(ch), all = Grace.lilyTotal(ch), C = COMMENTARY[ch - 1];
    if (kept >= all) {
      sx.font = "700 8px " + FONT.carved; sx.fillStyle = "#e8b94a"; sx.fillText(C.who.toUpperCase(), 26, y);
      sx.font = "italic 7.5px " + FONT.book; sx.fillStyle = "#a89cb8"; sx.fillText(C.from + " (" + C.tr + ")", 26, y + 12); y += 28;
      sx.font = "9px " + FONT.book; sx.fillStyle = "#f4ead4";
      for (const l of wrap(sx, C.text, W - 60)) { sx.fillText(l, 26, y); y += 11.5; }
    } else {
      sx.font = "italic 10px " + FONT.book; sx.fillStyle = "#f4ead4"; sx.textAlign = "center";
      y += 22;
      for (const l of wrap(sx, "Carry every lily of this chapter to the vase by the way onward, and a page of the Fathers on it will open here.", W - 110)) { sx.fillText(l, W / 2, y); y += 13; }
      y += 10; sx.font = "8px " + FONT.ui; sx.fillStyle = "#e8b94a"; sx.fillText("❀  " + kept + " of " + all + " lilies kept", W / 2, y); y += 18;
      sx.font = "italic 8px " + FONT.book; sx.fillStyle = "#8a80a0";
      sx.fillText("“I am the flower of the field, and the lily of the valleys.” Canticle 2:1", W / 2, y); y += 14;
      sx.textAlign = "left";
    }
  } else {
    sx.font = "8px " + FONT.ui; sx.fillStyle = "#e8b94a"; sx.fillText("EASIER WAYS · use any, at any time", 26, y); y += 14;
    for (const [key, name, about] of ASSISTS) {
      const on = !!(save.assist && save.assist[key]), b = { x: 26, y, w: W - 52, h: 18 };
      sx.fillStyle = on ? "rgba(232,185,74,0.18)" : "rgba(255,255,255,0.04)"; sx.fillRect(b.x, b.y, b.w, b.h);
      sx.fillStyle = on ? "#e8b94a" : "#3c3250"; sx.fillRect(b.x + 6, b.y + 5, 8, 8);
      if (on) { sx.fillStyle = "#140c1c"; sx.fillRect(b.x + 8, b.y + 7, 4, 4); }
      sx.font = "700 8px " + FONT.ui; sx.fillStyle = on ? "#ffe8b0" : "#c8bcd8"; sx.fillText(name, b.x + 20, b.y + 5);
      sx.font = "italic 8px " + FONT.book; sx.fillStyle = "#a89cb8"; sx.fillText(about, b.x + 100, b.y + 5);
      assistBoxes.push([key, { x: b.x, y: b.y, w: b.w, h: b.h }]); y += 22;
    }
    y += 4; sx.font = "8px " + FONT.ui; sx.fillStyle = "#e8b94a"; sx.fillText("HOW TO PLAY", 26, y); y += 13;
    sx.font = "8px " + FONT.book; sx.fillStyle = "#d8cce8";
    const lines = [
      "Phone: hold the left half to walk (outer quarter back, inner quarter on). Tap the right half to jump; hold for higher.",
      "The round button lifts, sets down, opens and speaks; tap a creature or a cedar door to throw holy water at it.",
      "Keys: arrows or A/D to walk, Space or W to jump, E or Down to lift, X to throw, C to dash, P to pause.",
      "A lily follows at your shoulder once picked. Bring it to the vase by the way onward. A blow sends it home.",
      "Look for the dark figure in the shadows. He does not wait long.",
    ];
    for (const l0 of lines) for (const l of wrap(sx, l0, W - 60)) { sx.fillText(l, 26, y); y += 10.5; }
  }
  Game.pageMax = Math.max(0, y + Game.pageRead - bottom + 4);
  sx.restore();
  const go = button("RESUME", W / 2 - 104, 194, 64, 16, true), up = button("▲", W / 2 - 34, 194, 30, 16, false), dn = button("▼", W / 2 + 4, 194, 30, 16, false), out = button("CHAPTERS", W / 2 + 40, 194, 64, 16, false);
  const setTab = (i) => { Game.bookTab = (i + BOOK_TABS.length) % BOOK_TABS.length; Game.pageRead = 0; };
  for (const tp of input.taps) {
    const tabHit = tabs.findIndex((b) => inBox(tp, b));
    const asHit = assistBoxes.find(([, b]) => tp.y !== undefined && tp.y >= top && tp.y <= bottom && inBox(tp, b));
    if (tp.key === "KeyP" || tp.key === "Escape" || inBox(tp, go)) Game.state = "play";
    else if (tabHit >= 0) setTab(tabHit);
    else if (tp.key === "ArrowLeft") setTab(tab - 1);
    else if (tp.key === "ArrowRight" || tp.key === "Tab") setTab(tab + 1);
    else if (asHit) { save.assist = save.assist || {}; save.assist[asHit[0]] = !save.assist[asHit[0]]; store(); Snd.sfx("verse"); }
    else if (tp.key === "ArrowUp" || inBox(tp, up)) Game.pageRead = Math.max(0, Game.pageRead - 60);
    else if (tp.key === "ArrowDown" || inBox(tp, dn)) Game.pageRead = Math.min(Game.pageMax, Game.pageRead + 60);
    else if (inBox(tp, out)) { Game.state = "chapters"; Snd.stop(); }
    else if (tp.key === "KeyM") Snd.toggle();
  }
  input.taps = [];
}
// The end of a chapter: the whole of it, to read at leisure.
function drawEnd(t) {
  Game.endT += 1 / 60;
  sx.setTransform(1, 0, 0, 1, 0, 0); sx.fillStyle = "#000"; sx.fillRect(0, 0, screen.width, screen.height); toScreenSpace();
  const g = sx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#f7f0dc"); g.addColorStop(1, "#ead8b0"); sx.fillStyle = g; sx.fillRect(0, 0, W, H);
  const ch = Game.chapter, vs = CANTICLE[ch - 1];
  uiText("CANTICLE OF CANTICLES " + ROMAN[ch], W / 2, 8, { align: "center", size: 11, color: "#7a1f2b", edge: null, font: FONT.carved });
  uiText(CHAPTER_TITLES[ch - 1] + (ch === 8 ? " · Here endeth the Canticle of Canticles" : ""), W / 2, 24, { align: "center", size: 8, color: "#8a6a4a", edge: null });
  sx.save(); sx.beginPath(); sx.rect(20, 38, W - 40, 148); sx.clip();
  sx.font = "10px " + FONT.book; sx.textBaseline = "top";
  let y = 40 - Game.scrollY;
  vs.forEach((v, i) => { sx.fillStyle = "#a8341a"; sx.font = "700 8px " + FONT.carved; sx.fillText(String(i + 1), 24, y + 1); sx.font = "10px " + FONT.book; sx.fillStyle = "#2a1a10"; const ls = wrap(sx, v, W - 76); ls.forEach((l, k) => sx.fillText(l, 38, y + k * 12)); y += ls.length * 12 + 5; });
  const max = Math.max(0, y + Game.scrollY - 184);
  sx.restore();
  if (Game.endT > 2.5) Game.scrollY = Math.min(max, Game.scrollY + 0.25);
  const lil = Grace.lilyKept(ch);
  uiText(versesRead(ch) + " of " + vs.length + " verses found · " + lil + " of " + Grace.lilyTotal(ch) + " lilies kept", W / 2, 188, { align: "center", size: 7, color: "#6a4a2a", edge: null });
  const next = ch < 8 && CHAPTERS[ch] ? button("CHAPTER " + ROMAN[ch + 1], W / 2 - 104, 200, 100, 16, true) : null;
  const menu = button("CHAPTERS", W / 2 + 4, 200, 100, 16, !next);
  for (const tp of input.taps) {
    if (next && (inBox(tp, next) || tp.key === "Enter")) Game.start(ch + 1);
    else if (inBox(tp, menu) || tp.key === "Escape" || (!next && tp.key === "Enter")) Game.state = "chapters";
    else if (tp.key === "ArrowDown") Game.scrollY = Math.min(max, Game.scrollY + 40);
    else if (tp.key === "ArrowUp") Game.scrollY = Math.max(0, Game.scrollY - 40);
    else if (tp.y !== undefined && tp.y < 190) Game.scrollY = Math.min(max, Game.scrollY + 60);
  }
  input.taps = [];
}
function drawFallen(t) {
  drawWorld(); toScreenSpace();
  Game.fallenT += 1 / 60;
  sx.fillStyle = "rgba(0,0,0," + Math.min(0.75, Game.fallenT) + ")"; sx.fillRect(0, 0, W, H);
  uiText("“For love is strong as death.”", W / 2, 90, { align: "center", size: 11, color: "#ffe8b0", font: FONT.book, weight: 400 });
  uiText("Canticle 8:6", W / 2, 108, { align: "center", size: 7, color: "#c8b8ff" });
  if (Game.fallenT > 1.2) {
    uiText("TAP TO RISE", W / 2, 140, { align: "center", size: 9 });
    for (const tp of input.taps) { Game.state = "play"; const e = Game.respawn; World.load(e.room, e.door); if (!e.door) { Game.monk.x = e.x; Game.monk.y = e.y; World.snapCamera(); } Game.monk.hearts = Game.monk.max; Game.monk.inv = 1.5; for (const g of Game.flock || []) World.npcs.push(g); }
  }
  input.taps = [];
}

// ---- The loop ---------------------------------------------------------------------------------
let last = performance.now(), acc = 0;
const STEP = 1 / 60;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  Snd.update();
  if (Game.state === "play") {
    acc += dt * (save.assist && save.assist.slow ? 0.75 : 1);
    let n = 0;
    while (acc >= STEP && n < 6) {
      acc -= STEP; n++;
      // A blow landed: everything holds still for a moment.
      if (Game.hitStop > 0) { Game.hitStop -= STEP; continue; }
      stepPlay(STEP); if (Game.state !== "play") break;
    }
    if (Game.hint > 0) Game.hint -= dt;
    if (Game.state === "play") { drawWorld(); drawHud(now / 1000); }
  } else {
    acc = 0;
    titleArt.t += dt;
    if (Game.state === "title") drawTitle(titleArt.t);
    else if (Game.state === "chapters") drawChapters(titleArt.t);
    else if (Game.state === "pause") { drawPause(titleArt.t); }
    else if (Game.state === "end") drawEnd(titleArt.t);
    else if (Game.state === "fallen") drawFallen(titleArt.t);
  }
  if (Game.state === "title" || Game.state === "chapters") Snd.play("title");
  if (innerHeight > innerWidth * 1.1) { toScreenSpace(); uiText("Turn your phone sideways to play", W / 2, 2, { align: "center", size: 8, color: "#c8b8ff" }); }
  requestAnimationFrame(frame);
}
// Wait a little for the fonts, then begin.
const Q = new URLSearchParams(location.search);
function boot() {
  if (Q.has("god")) Game.god = true;
  if (Q.has("powers")) for (const k of Q.get("powers").split(",")) save.powers[k] = true;
  if (Q.has("open")) save.open = 8;
  if (Q.has("ch")) { Game.start(+Q.get("ch"), Q.get("room") || undefined, Q.get("door") || undefined); if (Q.has("x")) { Game.monk.x = +Q.get("x") * T; Game.monk.y = +(Q.get("y") || 0) * T; World.snapCamera(); } }
  else if (!save.done[1] && !Object.keys(save.read).length) Game.hint = 0;
  requestAnimationFrame(frame);
}
Game.hint = 0;
const fontsReady = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve();
fontsReady.then(boot);
// For tests: step the game by hand, and look inside.
window.HC = { Game, World, input, step(dt) { stepPlay(dt || STEP); }, save: () => save, ROOMS, CHAPTERS, draw() { drawWorld(); drawHud(0); } };
