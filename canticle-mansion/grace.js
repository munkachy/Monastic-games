"use strict";
// Canticle Mansion: the lilies carried to safety, the commentary they open,
// and (below) the Beloved glimpsed in the shadows and the hidden alcoves.

// ---- The commentary --------------------------------------------------------------------------
// When every lily of a chapter has been carried to safety, a page of the
// Fathers on that chapter opens in the book. St. Bernard's sermons reach only
// to the third chapter of the Canticle; St. John of the Cross, who made his
// own Spiritual Canticle out of it, speaks for the rest. Both in their old
// public-domain translations.
const COMMENTARY = [
  { who: "St. Bernard", from: "Sermons on the Song of Songs, II", tr: "tr. S. J. Eales, 1895",
    text: "Let Him empty Himself, let Him humble Himself, let Him stoop from His high heaven, and kiss me with the kiss of His Mouth. Let the Son of God, if He will be a Mediator acceptable to both parties, and suspected by neither, become Man, become Son of Man, and establish my trust on a sure ground by this. With assured confidence shall I take the Son of God as Mediator when I perceive that He is also a son of my own human race. I can no longer retain any suspicion of Him, since He is my brother and my flesh. For I hope that He will then not be able to despise me, when He is bone of my bones, and flesh of my flesh." },
  { who: "St. Bernard", from: "Sermons on the Song of Songs, LVI", tr: "tr. S. J. Eales, 1895",
    text: "The Bridegroom, then, has drawn near to the wall, because He has united Himself to human flesh. The wall is human nature, and the drawing near of the Bridegroom is the Incarnation of the Word. The windows and the lattices by which He is said to look out are as, I think, the senses of the flesh, and the human affections and feelings by which Christ gained an experimental knowledge of human necessities. For He hath borne our griefs and carried our sorrows." },
  { who: "St. Bernard", from: "Sermons on the Song of Songs, LXXXIV", tr: "tr. S. J. Eales, 1895",
    text: "It is a great good to seek God. I think that, among all the blessings of the soul, there is none greater than this. … The soul seeks the Word, but it had been previously sought by the Word. … Let her remember that, as she was first beloved, so she was first sought; and to that she owes it that she herself loves and is engaged in seeking." },
  { who: "St. John of the Cross", from: "A Spiritual Canticle, Stanzas XX–XXI", tr: "tr. D. Lewis, 1909 ed.",
    text: "The wall is the territory of peace and the fortress of virtue and perfections, which are the defences and protection of the soul. The soul is the garden wherein the Beloved feeds among the flowers, defended and guarded for Him alone. Hence it is called in the Canticle ‘a garden enclosed.’ The Bridegroom bids all disorderly emotions not to touch the territory and wall of His garden." },
  { who: "St. John of the Cross", from: "A Spiritual Canticle, Stanza I", tr: "tr. D. Lewis, 1909 ed.",
    text: "‘Where hast Thou hidden Thyself?’ … The communication and sense of His presence, however great they may be, … are not God essentially, … for in very truth He is still hidden from the soul; and it is therefore expedient for it, amid all these grandeurs, always to consider Him as hidden, and to seek Him in His hiding-place. … Neither sublime communications nor sensible presence furnish any certain proof of His gracious presence; nor is the absence thereof, and aridity, any proof of His absence from the soul." },
  { who: "St. John of the Cross", from: "A Spiritual Canticle, Stanzas XX–XXI", tr: "tr. D. Lewis, 1909 ed.",
    text: "As the sun when it shines upon the sea illumines its great depths, and reveals the pearls, and gold, and precious stones therein, so the divine sun of the Bridegroom, turning towards the bride, reveals in a way the riches of her soul, so that even the angels behold her with amazement and say: ‘Who is she that cometh forth as the morning rising, fair as the moon, bright as the sun, terrible as the army of a camp set in array.’" },
  { who: "St. John of the Cross", from: "A Spiritual Canticle, Stanza XXVI", tr: "tr. D. Lewis, 1909 ed.",
    text: "The cellar is the highest degree of love to which the soul may attain in this life, and is therefore said to be the inner. It follows from this that there are other cellars not so interior; that is, the degrees of love by which souls reach this, the last. These cellars are seven in number, and the soul has entered into them all when it has in perfection the seven gifts of the Holy Ghost, so far as it is possible for it." },
  { who: "St. John of the Cross", from: "A Spiritual Canticle, Stanza XII", tr: "tr. D. Lewis, 1909 ed.",
    text: "He desires, therefore, that the bride should have Him thus delineated in her soul, and saith unto her, ‘Put Me as a seal upon thy heart, as a seal upon thy arm.’ The heart here signifies the soul, wherein God in this life dwells as an impression of the seal of faith, and the arm is the resolute will, where He is as the impressed token of love." },
];

const Grace = {};

// ---- The lilies --------------------------------------------------------------------------------
// A lily is not kept by touching it: it follows at the monk's shoulder, and is
// kept only when he brings it to the vase by the way onward (or out by that
// way). A blow, or a fall, and it slips back to where it grew.
Grace.forwardDoor = function () {
  return World.doors["2"] || World.doors["1"] || null;
};
// How many lilies grow in each chapter, and how many are kept.
Grace.lilyTotal = function (ch) {
  let n = 0;
  for (const R of Object.values(ROOMS)) if (R.chapter === ch && !(R.spawn && R.spawn.l) && !(R.legend && R.legend.l !== undefined)) for (const row of R.map) n += (row.match(/l/g) || []).length;
  return n;
};
Grace.lilyKept = (ch) => Object.keys(save.lilies[ch] || {}).length;
Grace.roomLily = function (R) { for (let y = 0; y < R.map.length; y++) { const x = R.map[y].indexOf("l"); if (x >= 0 && !(R.spawn && R.spawn.l) && !(R.legend && R.legend.l !== undefined)) return R.id + x * T + "," + y * T; } return null; };
Grace.onLoad = function () {
  const R = World.def, key = Grace.roomLily(R);
  Game.lily = null; World.vase = null;
  if (!key) return;
  // The vase stands on the floor just inside the way onward.
  const d = Grace.forwardDoor();
  if (d && d.edge !== "top" && d.edge !== "bottom") {
    const vx = d.edge === "left" ? d.x + d.w + 6 : d.x - 20, col = Math.floor((vx + 7) / T);
    for (let ty = Math.floor((d.y + d.h - 1) / T); ty < World.h; ty++) {
      const k = World.at(col, ty);
      if (k === SOLID || k === ONEWAY) { World.vase = { x: vx, y: ty * T - 16, w: 14, h: 16, kept: !!(save.lilies[R.chapter] || {})[key] }; break; }
    }
  }
  if (!World.vase) World.vase = { door: d, kept: !!(save.lilies[R.chapter] || {})[key] };
};
Grace.onLoadAll = function () {
  save.visited = save.visited || {}; if (!save.visited[World.def.id]) { save.visited[World.def.id] = 1; store(); }
  Game.whisper = null; Grace.onLoad(); Grace.placeBeloved(); Grace.beginSet(); };
Grace.pickLily = function (it) {
  Game.lily = { key: it.key, x: it.x, y: it.y, home: { x: it.x, y: it.y }, chapter: World.def.chapter, t: 0 };
  Snd.sfx("neume");
  Game.toast = { text: "A lily: carry it to the vase by the way onward", t: 0 };
};
Grace.keepLily = function () {
  const L = Game.lily; if (!L) return;
  const c = save.lilies[L.chapter] = save.lilies[L.chapter] || {};
  c[L.key] = 1; store(); Game.lily = null;
  if (World.vase) World.vase.kept = true;
  Snd.sfx("verse"); Game.shake = 0.1;
  for (let i = 0; i < 22; i++) World.parts.push({ x: (World.vase && World.vase.x !== undefined ? World.vase.x + 7 : L.x + 5), y: (World.vase && World.vase.y !== undefined ? World.vase.y : L.y), vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 120, g: 160, life: 0.9, c: i % 3 ? "#ffffff" : "#ffe08a", s: 2 });
  const ch = L.chapter, kept = Grace.lilyKept(ch), all = Grace.lilyTotal(ch);
  if (kept >= all) Game.banner = { title: "Every lily of Canticle " + ROMAN[ch], text: "A page of " + COMMENTARY[ch - 1].who + " is opened in the book (pause to read it).", t: 0, len: 5 };
  else Game.toast = { text: "The lily is kept · " + kept + " of " + all + " in this chapter", t: 0 };
};
Grace.loseLily = function (why) {
  const L = Game.lily; if (!L) return;
  Game.lily = null;
  // It drifts back to where it grew, to be found again.
  if (World.def.chapter === L.chapter && !World.items.some((i) => i.key === L.key)) World.items.push({ kind: "lily", x: L.home.x, y: L.home.y, w: 10, h: 12, key: L.key, back: 0.6 });
  for (let i = 0; i < 10; i++) World.parts.push({ x: L.x + 5, y: L.y + 5, vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 60, g: 80, life: 0.6, c: "#ffffff", s: 1 });
  if (why !== "quiet") Game.toast = { text: "The lily slipped away, back to where it grew", t: 0 };
};
// Leaving a room: by the way onward, the lily is kept; by any other, it is lost.
Grace.leaving = function (to, door) {
  if (!Game.lily) return;
  const d = Grace.forwardDoor();
  if (d && (d.to === to || to === "END")) Grace.keepLily(); else Grace.loseLily("quiet");
};
Grace.step = function (dt) {
  Grace.stepBeloved(dt); Grace.stepSet(dt);
  if (Game.whisper) { Game.whisper.t += dt; if (Game.whisper.t > Game.whisper.len) Game.whisper = null; }
  const L = Game.lily, m = Game.monk;
  if (L) {
    L.t += dt;
    // Following at the shoulder, a little behind, bobbing.
    const tx = m.x + m.w / 2 - m.face * 12 - 5, ty = m.y - 8 + Math.sin(L.t * 4) * 2;
    L.x = lerp(L.x, tx, Math.min(1, dt * 7)); L.y = lerp(L.y, ty, Math.min(1, dt * 7));
    if (Math.random() < dt * 6) World.parts.push({ x: L.x + 5, y: L.y + 4, vx: 0, vy: 10, g: 0, life: 0.5, c: "#fff8e0", s: 1 });
    const V = World.vase;
    if (V && V.x !== undefined && overlap({ x: m.x - 4, y: m.y, w: m.w + 8, h: m.h }, V)) Grace.keepLily();
  }
};
Grace.drawWorld = function (c, t) {
  Grace.drawBeloved(c, t); Grace.drawSet(c, t);
  Grace.drawHidden(c, t);
  const V = World.vase;
  if (V && V.x !== undefined) {
    // A tall vase of gold-banded clay; a lily stands in it once one is kept.
    const x = Math.round(V.x), y = Math.round(V.y);
    if (V.kept) { px(c, x + 6, y - 9, 2, 10, "#3a8a2e"); px(c, x + 3, y - 14, 8, 6, "#ffffff"); px(c, x + 1, y - 12, 12, 3, "#ffffff"); px(c, x + 6, y - 12, 2, 2, "#ffe08a"); }
    px(c, x + 1, y + 2, 12, 14, "#06040a"); px(c, x + 2, y + 3, 10, 12, "#a8642e"); px(c, x + 2, y + 3, 2, 12, "#c8844a"); px(c, x + 2, y + 7, 10, 2, "#e8b94a");
    px(c, x + 3, y, 8, 3, "#06040a"); px(c, x + 4, y + 1, 6, 2, "#8a4a1e");
    if (Game.lily && !V.kept) { c.save(); c.globalAlpha = 0.4 + Math.sin(t * 5) * 0.25; c.strokeStyle = "#fff4a0"; c.lineWidth = 1; c.strokeRect(x - 2, y - 4, 18, 22); c.restore(); }
  }
  // Where there is no floor by the way onward (a way up or down), the doorway itself glows.
  if (V && V.door && Game.lily) { const d = V.door; c.save(); c.globalAlpha = 0.35 + Math.sin(t * 5) * 0.2; c.strokeStyle = "#fff4a0"; c.lineWidth = 2; c.strokeRect(d.x + 1, d.y + 1, d.w - 2, d.h - 2); c.restore(); }
  if (Game.lily) ART.item(c, { kind: "lily", x: Game.lily.x, y: Game.lily.y }, t);
};

// ---- The Beloved -----------------------------------------------------------------------------
// "I sought him, and found him not." In many rooms a figure stands in the
// shadows, a little ahead: no face, only the edge of the light on his robe.
// Come near, and he turns aside and is gone, and a word of the Canticle is
// left behind. At the end of each chapter he waits by the way onward a moment
// longer. He is never caught; he is glimpsed, and the glimpses are counted.
const GLIMPSE = {
  1: [[1, 3, "Draw me: we will run after thee to the odour of thy ointments."], [1, 6, "Shew me, O thou whom my soul loveth, where thou feedest"]],
  2: [[2, 9, "Behold he standeth behind our wall, looking through the windows, looking through the lattices."], [2, 8, "The voice of my beloved, behold he cometh leaping upon the mountains, skipping over the hills."]],
  3: [[3, 1, "I sought him, and found him not."], [3, 3, "Have you seen him, whom my soul loveth?"]],
  4: [[4, 16, "Arise, O north wind, and come, O south wind, blow through my garden"], [1, 12, "A bundle of myrrh is my beloved to me"]],
  5: [[5, 2, "the voice of my beloved knocking"], [5, 6, "I sought him, and found him not: I called, and he did not answer me."]],
  6: [[6, 1, "My beloved is gone down into his garden, to the bed of aromatical spices"], [6, 11, "I knew not: my soul troubled me for the chariots of Aminadab."]],
  7: [[7, 11, "Come, my beloved, let us go forth into the field, let us abide in the villages."], [7, 12, "Let us get up early to the vineyards"]],
  8: [[8, 13, "Thou that dwellest in the gardens, the friends hearken: make me hear thy voice."], [8, 1, "that I may find thee without"]],
};
// At the end of each chapter: the nearest he comes.
const MEETING = {
  1: [1, 3, "Draw me: we will run after thee to the odour of thy ointments."],
  2: [2, 17, "Till the day break, and the shadows retire. Return: be like, my beloved, to a roe, or to a young hart upon the mountains of Bether."],
  3: [3, 4, "I found him whom my soul loveth: I held him: and I will not let him go"],
  4: [5, 1, "Let my beloved come into his garden, and eat the fruit of his apple trees."],
  5: [5, 6, "I opened the bolt of my door to my beloved: but he had turned aside, and was gone."],
  6: [6, 1, "My beloved is gone down into his garden, to the bed of aromatical spices, to feed in the gardens, and to gather lilies."],
  7: [7, 13, "In our gates are all fruits: the new and the old, my beloved, I have kept for thee."],
  8: [8, 14, "Flee away, O my beloved, and be like to the roe, and to the young hart upon the mountains of aromatical spices."],
};
Grace.lastRoom = (R) => Object.values(R.doors || {}).some((d) => d.to === "END");
Grace.roomIndex = (R) => Object.keys(ROOMS).indexOf(R.id);
Grace.placeBeloved = function () {
  const R = World.def, last = Grace.lastRoom(R);
  Game.beloved = null;
  if (R.beloved === false) return;
  // In about half the rooms, and always in the last of each chapter.
  if (!last && (Grace.roomIndex(R) * 5 + R.chapter) % 9 > 4) return;
  // A place to stand: firm ground, two tiles of room above, well along the way.
  const d = Grace.forwardDoor(), cands = [];
  const free = (x, y) => { const k = World.at(x, y); return k === 0 || k === undefined ? !Object.values(World.doors).some((q) => x * T >= q.x && x * T < q.x + q.w && y * T >= q.y && y * T < q.y + q.h) : false; };
  for (let x = 2; x < World.w - 2; x++) for (let y = 3; y < World.h; y++) {
    const k = World.at(x, y);
    if ((k === SOLID || k === ONEWAY) && free(x, y - 1) && free(x, y - 2) && free(x + 1, y - 1)) {
      const px0 = x * T, start = Game.entry ? Math.hypot(px0 - Game.entry.x, y * T - Game.entry.y) : 999;
      if (start < 180) continue;
      const toDoor = d ? Math.hypot(px0 - (d.x + d.w / 2), y * T - (d.y + d.h)) : 999;
      if (World.vase && World.vase.x !== undefined && Math.abs(px0 - World.vase.x) < 40) continue;
      cands.push({ x: px0, y: y * T, score: last ? -toDoor : px0 / (World.w * T) + Math.abs(hash(x, y, Grace.roomIndex(R))) % 1 * 0.6 });
    }
  }
  if (!cands.length) return;
  cands.sort((a, b) => b.score - a.score);
  const c = last ? cands.find((q) => Math.hypot(q.x - (d.x + d.w / 2), q.y - (d.y + d.h)) > 50) || cands[0] : cands[Math.floor(Math.abs(hash(Grace.roomIndex(R), 2, 9)) * 1000) % Math.min(4, cands.length)];
  const lines = GLIMPSE[R.chapter] || GLIMPSE[1];
  Game.beloved = { x: c.x + 2, y: c.y - 30, w: 12, h: 30, state: "wait", t: 0, a: 1, face: -1, last, line: last ? MEETING[R.chapter] : lines[Grace.roomIndex(R) % lines.length] };
};
Grace.stepBeloved = function (dt) {
  const B = Game.beloved; if (!B) return;
  const m = Game.monk, dx = m.x + m.w / 2 - (B.x + B.w / 2), dy = m.y + m.h / 2 - (B.y + B.h / 2), dist = Math.hypot(dx, dy * 1.5);
  B.t += dt;
  if (B.state === "wait") {
    B.face = dx < 0 ? -1 : 1;
    if (dist < (B.last ? 70 : 115)) { B.state = B.last ? "still" : "go"; B.t = 0; Grace.glimpsed(B); }
  } else if (B.state === "still") {
    // At the end of the chapter he stays a breath, turned toward the monk, in more light.
    if (B.t > 1.6) { B.state = "go"; B.t = 0; }
  } else if (B.state === "go") {
    B.a = Math.max(0, 1 - B.t / (B.last ? 2.2 : 1.1));
    B.x -= B.face * dt * (B.last ? 10 : 22);
    if (Math.random() < dt * 30) World.parts.push({ x: B.x + Math.random() * B.w, y: B.y + Math.random() * B.h, vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 30, g: -10, life: 0.9, c: Math.random() < 0.5 ? "#fff4c8" : "#e8c070", s: 1 });
    if (B.a <= 0) Game.beloved = null;
  }
};
Grace.glimpsed = function (B) {
  const R = World.def, [c, v, words] = B.line;
  save.glimpsed = save.glimpsed || {};
  const first = !save.glimpsed[R.id]; save.glimpsed[R.id] = 1; store();
  Game.whisper = { text: words, ref: "Canticle " + c + ":" + v, t: 0, len: B.last ? 6 : 4.2 };
  Snd.sfx(B.last ? "power" : "verse");
  if (first && B.last) Game.shake = 0;
};
Grace.drawBeloved = function (c, t) {
  const B = Game.beloved; if (!B) return;
  const x = Math.round(B.x), y = Math.round(B.y), a = B.a;
  c.save();
  // The shadow he stands in.
  const g = c.createRadialGradient(x + 6, y + 18, 2, x + 6, y + 18, 34);
  g.addColorStop(0, "rgba(4,2,10," + 0.55 * a + ")"); g.addColorStop(1, "rgba(4,2,10,0)");
  c.fillStyle = g; c.fillRect(x - 30, y - 18, 72, 72);
  c.globalAlpha = a;
  if (B.face < 0) { c.translate(x + 12, y); c.scale(-1, 1); } else c.translate(x, y);
  // A tall figure in a mantle, no face: dark, with the light along one edge.
  const ink = "#0c0a12", robe = "#16121e";
  px(c, 2, 9, 9, 21, ink); px(c, 1, 18, 11, 12, ink); px(c, 3, 10, 7, 19, robe); px(c, 2, 19, 9, 10, robe);
  px(c, 3, 1, 7, 9, ink); px(c, 4, 2, 5, 7, "#1e1a26");
  px(c, 1, 4, 3, 8, ink);
  // The edge of the light: along the far side of the head, shoulder and robe.
  const rim = "rgba(255,226,170," + (0.55 + 0.25 * Math.sin(t * 2)) + ")";
  px(c, 9, 2, 1, 7, rim); px(c, 10, 10, 1, 19, rim); px(c, 11, 19, 1, 10, rim); px(c, 4, 1, 5, 1, rim);
  c.restore();
};
Grace.glowBeloved = function (glow, t) {
  Grace.glowSet(glow);
  const B = Game.beloved; if (!B) return;
  const k = B.state === "wait" ? 0.18 : B.state === "still" ? 0.6 : 0.5 * B.a;
  glow(B.x + 6, B.y + 12, B.state === "still" ? 70 : 40, "rgba(255,226,170,0.6)", k);
};

// ---- The hidden alcoves, and the pomegranates in them -------------------------------------------
// "Thy plants are a paradise of pomegranates" (4:13). In two rooms of most
// chapters something is set out of reach of the powers found so far: a
// pillar too tall to jump (the gloves climb it), a ledge too high (the
// sandals' second leap), a sealed box of cracked stone overhead (the helmet
// breaks it), a little cedar hut (the seal's flame burns its door), a stair
// that cannot be seen (the lantern shows it). In each a pomegranate waits.
// Every four found give one more heart.
const SECRETS = [
  { room: "c1_desert", kind: "ledge", power: "sandals" }, { room: "c1_vineyard", kind: "box", power: "helmet" },
  { room: "c2_harts", kind: "stair", power: "lantern" }, { room: "c2_spring", kind: "pillar", power: "gloves" },
  { room: "c3_garden", kind: "box", power: "helmet" }, { room: "c3_valiant", kind: "hut", power: "seal" },
  { room: "c4_galaad", kind: "pillar", power: "gloves" }, { room: "c4_myrrh", kind: "hut", power: "seal" },
  { room: "c5_feast", kind: "pillar", power: "gloves" }, { room: "c5_street", kind: "hut", power: "seal" },
  { room: "c6_army", kind: "pillar", power: "gloves" }, { room: "c6_spices", kind: "hut", power: "seal" },
  { room: "c7_camps", kind: "hut", power: "seal" }, { room: "c7_villages", kind: "box", power: "helmet" },
  { room: "c8_desert", kind: "pillar", power: "gloves" }, { room: "c8_house", kind: "box", power: "helmet" },
];
// The shapes: [dx, dy, char] from the spot's foot (x at the floor row F); the
// clear space each needs about it: [x0, x1, height above the floor].
const SHAPES = {
  // Two tiles wide, hanging from three tiles up to nine, with room to walk beneath: no leap reaches
  // its top (the sandals' best is under eight); the gloves climb its face.
  pillar: { cells: (() => { const c = []; for (let dy = 3; dy <= 9; dy++) { c.push([0, -dy, "#"], [1, -dy, "#"]); } c.push([1, -10, "§"]); return c; })(), clear: [-5, 6, 10] },
  // A ledge six tiles up, alone: the staff's leap falls short; the sandals' second leap reaches it.
  ledge: { cells: [[0, -6, "="], [1, -6, "="], [0, -7, "§"]], clear: [-6, 7, 8] },
  // A box of stone in the air, its underside cracked: the helmet breaks it from below.
  box: { cells: [[-1, -7, "#"], [0, -7, "#"], [1, -7, "#"], [-1, -6, "#"], [0, -6, "§"], [1, -6, "#"], [-1, -5, "#"], [0, -5, "%"], [1, -5, "#"]], clear: [-4, 4, 9] },
  // A little hut of cedar with a cedar door: the seal's flame burns the door away.
  hut: { cells: [[0, -3, "#"], [1, -3, "#"], [2, -3, "#"], [3, -3, "#"], [3, -2, "#"], [3, -1, "#"], [0, -2, "%"], [0, -1, "%"], [1, -1, "§"]], clear: [-2, 5, 5], floor: [-3, -2, -1, 0, 1, 2, 3] },
  // A stair of hidden steps up to a high place: the lantern shows them.
  stair: { cells: [[0, -3, "¤"], [1, -3, "¤"], [3, -6, "¤"], [4, -6, "¤"], [6, -9, "¤"], [7, -9, "¤"], [7, -10, "§"]], clear: [-3, 10, 10] },
};
Grace.layAlcoves = function () {
  for (const S of SECRETS) {
    const R = ROOMS[S.room]; if (!R) { console.warn("no room", S.room); continue; }
    const rows = R.map.map((r) => r.split("")), w = Math.max(...rows.map((r) => r.length)), h = rows.length, sh = SHAPES[S.kind];
    const at = (x, y) => (y >= 0 && y < h && x >= 0 && x < w ? rows[y][x] || "." : "#");
    const firm = (ch) => ch === "#" || (R.legend && R.legend[ch] === SOLID) || (!R.legend || R.legend[ch] === undefined) && TILE_OF[ch] === SOLID;
    let spot = null;
    // From the middle of the room outward, the first place where the shape stands on firm ground in open air.
    // (Not by the doors at either end, where the monk comes in and goes out.)
    const xs = []; for (let k = 0; k < w; k++) { const x = Math.round(w * 0.55 + (k % 2 ? 1 : -1) * Math.ceil(k / 2)); if (x > w * 0.18 && x < w * 0.86) xs.push(x); }
    const feet = sh.floor || [...new Set(sh.cells.filter((c) => c[1] === -1 || sh.cells.every((q) => q[1] < -1)).map((c) => c[0]))];
    if (!feet.length) feet.push(0);
    for (const x of xs) {
      for (let F = h - 1; F > 2 && !spot; F--) {
        if (!feet.every((dx) => firm(at(x + dx, F))) || at(x, F - 1) !== ".") continue;
        let ok = true;
        // Open air all about it, so nothing nearby lends a foothold; the floor under it may rise or fall.
        for (let dx = sh.clear[0]; dx <= sh.clear[1] && ok; dx++) {
          for (let dy = 1; dy <= sh.clear[2] && ok; dy++) if (at(x + dx, F - dy) !== ".") ok = false;
          if (ok && !firm(at(x + dx, F)) && at(x + dx, F) !== "." && !"=~^".includes(at(x + dx, F))) ok = false;
        }
        if (ok) spot = { x, F };
      }
      if (spot) break;
    }
    if (!spot) { console.warn("no place for the alcove in", S.room); continue; }
    for (const [dx, dy, ch] of sh.cells) if (rows[spot.F + dy]) rows[spot.F + dy][spot.x + dx] = ch;
    R.map = rows.map((r) => r.join(""));
    S.x = spot.x; S.F = spot.F;
    if (S.kind === "stair") { R.legend = Object.assign({}, R.legend, { "¤": ONEWAY }); R.hide = (R.hide || "") + "¤"; }
    if (S.kind === "hut") R.cedar = true;
    R.secret = S;
  }
};
Grace.layAlcoves();
Grace.pomeTotal = () => SECRETS.filter((S) => S.F !== undefined).length;
Grace.pomeIn = (ch) => { const here = SECRETS.filter((S) => S.F !== undefined && ROOMS[S.room].chapter === ch); return [here.filter((S) => (save.pomes || {})[S.room + ":pome"]).length, here.length]; };
Grace.pomeFound = () => Object.keys(save.pomes || {}).length;
// One more heart for every four pomegranates.
Grace.extraHearts = () => Math.floor(Grace.pomeFound() / 4);
Grace.maxHearts = () => (save.powers.helmet ? 6 : 5) + Grace.extraHearts();
Grace.takePome = function (it) {
  save.pomes = save.pomes || {}; save.pomes[it.key] = 1; store();
  const n = Grace.pomeFound(), m = Game.monk;
  Snd.sfx("power"); Game.hitStop = 0.08; Game.shake = 0.15;
  for (let i = 0; i < 24; i++) World.parts.push({ x: it.x + 6, y: it.y + 6, vx: (Math.random() - 0.5) * 140, vy: -Math.random() * 160, g: 200, life: 0.8, c: i % 2 ? "#d8324a" : "#ffe08a", s: 2 });
  if (n % 4 === 0) { m.max = Grace.maxHearts(); m.hearts = m.max; Game.banner = { title: "A Paradise of Pomegranates", text: n + " found: one more heart, now " + m.max + ".", t: 0, len: 4.5 }; }
  else Game.toast = { text: "A pomegranate, hidden away · " + n + " of " + Grace.pomeTotal() + " (every four, a heart)", t: 0 };
};
// The lantern shows the hidden steps near the monk.
Grace.drawHidden = function (c, t) {
  if (!save.powers.lantern || !World.def.hide || !World.def.hide.includes("¤")) return;
  const m = Game.monk, cx = m.x + m.w / 2, cy = m.y + m.h / 2;
  for (let ty = 0; ty < World.h; ty++) for (let tx = 0; tx < World.w; tx++) {
    if (!World.hidden[ty * World.w + tx]) continue;
    const d = Math.hypot(tx * T + 8 - cx, ty * T + 4 - cy); if (d > 150) continue;
    c.save(); c.globalAlpha = (1 - d / 150) * (0.6 + Math.sin(t * 4 + tx) * 0.2);
    px(c, tx * T, ty * T, T, 3, "#ffe08a"); px(c, tx * T, ty * T + 3, T, 1, "#a87a2a"); c.restore();
  }
};

// ---- At the end of some chapters, a moment of their own ------------------------------------------
// Kept small: they press or delight, but never stand in the way.
//  V:    the keepers that go about the city come after the monk (5:7); keep moving and they fall behind.
//  III:  the day of his espousals (3:11): petals and gold fall from above.
//  VIII: the young hart upon the mountains of spices (8:14) leaps up ahead and shows the way.
Grace.surface = function (x) {
  const col = Math.floor(x / T);
  for (let y = 0; y < World.h; y++) if (World.at(col, y) === SOLID) return y * T;
  return World.h * T;
};
const SETS = {
  c5_whither: {
    begin() { return { keepers: [], on: false }; },
    step(S, dt, m) {
      const goal = World.doors["2"];
      if (!S.on && m.x > 7 * T) {
        S.on = true;
        S.keepers = [{ x: -10, y: Grace.surface(0), ph: 0 }, { x: -40, y: Grace.surface(0), ph: 1.7 }];
        Game.whisper = { text: "The keepers that go about the city found me: they struck me: and wounded me", ref: "Canticle 5:7", t: 0, len: 4.5 };
      }
      if (!S.on) return;
      const safe = goal && m.x > goal.x - 5 * T;
      for (const k of S.keepers) {
        k.ph += dt;
        if (safe) { k.gone = Math.min(1, (k.gone || 0) + dt); continue; }
        // A steady walk, a little slower than the monk's run; they never fall more than a screen behind.
        k.x += 74 * dt; if (m.x - k.x > 250) k.x = m.x - 250;
        const sy = Grace.surface(k.x + 6); k.y += clamp(sy - k.y, -220 * dt, 220 * dt);
        if (Math.abs(k.x + 6 - (m.x + m.w / 2)) < 10 && m.y + m.h > k.y - 26 && m.y < k.y) { hurtMonk(m, k.x + 6); for (const q of S.keepers) q.x -= 90; }
      }
    },
    draw(S, c, t) {
      for (const k of S.keepers) {
        const a = 1 - (k.gone || 0); if (a <= 0) continue;
        const x = Math.round(k.x), y = Math.round(k.y), b = Math.floor(k.ph * 6) % 2;
        c.save(); c.globalAlpha = a;
        px(c, x + 1, y - 26, 10, 22, "#06040a"); px(c, x + 2, y - 25, 8, 20, "#2a2438"); px(c, x + 3, y - 30, 6, 6, "#06040a"); px(c, x + 4, y - 29, 4, 4, "#4a3a30");
        px(c, x + 2 + b, y - 4, 2, 4, "#06040a"); px(c, x + 7 - b, y - 4, 2, 4, "#06040a");
        px(c, x + 11, y - 36, 1, 34, "#5a3a1a"); px(c, x + 10, y - 38, 3, 3, "#8a8a9a");
        px(c, x - 3, y - 16, 4, 5, "#06040a"); px(c, x - 2, y - 15, 2, 3, "#ffcf6a");
        c.restore();
      }
    },
    glow(S, glow) { for (const k of S.keepers) if (!k.gone) glow(k.x - 1, k.y - 13, 34, "rgba(255,200,110,0.7)", 0.5); },
  },
  c3_crown: {
    begin() { return {}; },
    step(S, dt, m) {
      const k = 0.6 + 2.4 * clamp(m.x / (World.w * T), 0, 1), cx = World.camX;
      if (Math.random() < dt * 14 * k) World.parts.push({ x: cx + Math.random() * W, y: World.camY - 4, vx: (Math.random() - 0.5) * 16, vy: 18 + Math.random() * 14, g: 0, life: 7, c: ["#f2a0b8", "#ffffff", "#ffe08a", "#e8607a"][Math.floor(Math.random() * 4)], s: Math.random() < 0.3 ? 2 : 1 });
    },
  },
  c8_flee: {
    begin(m) { return { x: m.x + 60, y: Grace.surface(m.x + 60), from: null, k: 1, face: 1, wait: 0.4 }; },
    step(S, dt, m) {
      if (S.gone) return;
      if (S.from) {
        S.k = Math.min(1, S.k + dt / 0.5);
        const f = S.from, e = S.to;
        S.x = lerp(f.x, e.x, S.k); S.y = lerp(f.y, e.y, S.k) - Math.sin(S.k * Math.PI) * (28 + Math.max(0, f.y - e.y) * 0.5);
        if (S.k >= 1) { S.from = null; S.wait = 0.25; if (S.leaving) S.gone = true; }
        return;
      }
      S.wait -= dt;
      // He waits until the monk is near, then bounds on to the next height, and at the top out of sight.
      if (S.wait > 0 || S.x - m.x > 90) return;
      const d = World.doors["2"];
      let nx = S.x + 72;
      if (d && nx > d.x - 10) { S.from = { x: S.x, y: S.y }; S.to = { x: d.x + d.w + 40, y: d.y + d.h }; S.k = 0; S.leaving = true; S.face = 1; Snd.sfx("float"); return; }
      let ny = Grace.surface(nx);
      if (ny < S.y - 4 * T) { nx = S.x + 30; ny = Grace.surface(nx); }
      if (ny < S.y - 4 * T) { nx = S.x + 12; ny = Grace.surface(nx); }
      S.from = { x: S.x, y: S.y }; S.to = { x: nx, y: ny }; S.k = 0; S.face = 1;
    },
    draw(S, c, t) {
      if (S.gone) return;
      roe(c, S.x, S.y, t, { face: S.face, leap: !!S.from, hart: true, col: "#b87a3a" });
    },
    glow(S, glow) { if (!S.gone) glow(S.x, S.y - 10, 30, "rgba(255,230,180,0.6)", 0.35); },
  },
};
Grace.beginSet = function () {
  const P = SETS[World.def.id];
  Game.setPiece = P ? Object.assign(P.begin(Game.monk), { P }) : null;
};
Grace.stepSet = function (dt) { const S = Game.setPiece; if (S && !Game.cutscene) S.P.step(S, dt, Game.monk); };
Grace.drawSet = function (c, t) { const S = Game.setPiece; if (S && S.P.draw) S.P.draw(S, c, t); };
Grace.glowSet = function (glow) { const S = Game.setPiece; if (S && S.P.glow) S.P.glow(S, glow); };
