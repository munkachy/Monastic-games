"use strict";
// Luminaries: what the Doctors say when the Pilgrimage is finished. Comic panels in the manner
// of an icon: each Doctor is drawn flat and outlined, with a gold halo and a red name-plate, in an
// arched frame, and behind them the world of their own stage, under a comic halftone.

// ---- How each Doctor looks ------------------------------------------------------------------------
// skin/shade: face and its shadow; hair: colour, or "bald" (a fringe), or "tonsure"; beard: kind and
// colour; head: what is on it; robe: what they wear; attr: a small sign of who they are.
const OCHRE = { skin: "#d9a26c", shade: "#a86a3a" };
const LOOKS = {
  therese: { skin: "#eec49c", shade: "#c48e62", young: true, head: "veilC", robe: "carmelite", attr: "roses", latin: "S · THERESIA" },
  augustine: { skin: "#b97b4b", shade: "#87502a", hair: "#1e140c", beard: "short", beardCol: "#1e140c", head: "mitre", robe: "bishop", robeCol: "#a01c1c", attr: "heart", latin: "S · AVGVSTINVS" },
  francis: { ...OCHRE, hair: "bald", hairCol: "#3a2818", beard: "full", beardCol: "#3a2818", head: "zucchetto", headCol: "#6a2a8a", robe: "mozzetta", robeCol: "#6a2a8a", attr: "heart2", latin: "S · FRANCISCVS" },
  jerome: { skin: "#c88e5e", shade: "#94582c", old: true, hair: "bald", hairCol: "#ece8e0", beard: "long", beardCol: "#ece8e0", robe: "cardinal", robeCol: "#b01020", attr: "book", latin: "S · HIERONYMVS" },
  teresa: { skin: "#e2ad84", shade: "#b47a52", head: "veilC", robe: "carmelite", attr: "quill", latin: "S · TERESIA" },
  thomas: { skin: "#dcae80", shade: "#ae7c50", hair: "tonsure", hairCol: "#3a2818", wide: true, robe: "dominican", attr: "sun", latin: "S · THOMAS" },
  catherine: { skin: "#e8bc94", shade: "#ba8a62", head: "veilD", robe: "dominicanF", attr: "lily", thorns: true, latin: "S · CATHARINA" },
  hildegard: { skin: "#e4b48c", shade: "#b6845c", head: "veilB", robe: "benedictine", attr: "flame", latin: "S · HILDEGARDIS" },
  john: { skin: "#d8a274", shade: "#a8703e", hair: "tonsure", hairCol: "#2a1a10", robe: "carmeliteM", attr: "cross", latin: "S · IOANNES A CRVCE" },
  athanasius: { ...OCHRE, old: true, hair: "bald", hairCol: "#e8e2d8", beard: "long", beardCol: "#e8e2d8", robe: "omophorion", robeCol: "#2a5aa8", attr: "book", latin: "S · ATHANASIVS" },
  gregory: { ...OCHRE, hair: "tonsure", hairCol: "#5a4a3a", beard: "short", beardCol: "#6a5a4a", head: "tiara", robe: "pope", attr: "dove", latin: "S · GREGORIVS" },
  bede: { skin: "#e0aa7c", shade: "#b07848", old: true, hair: "tonsure", hairCol: "#bab4a8", robe: "benedictine", attr: "book", latin: "S · BEDA" },
  anselm: { ...OCHRE, old: true, hair: "#e4ded4", beard: "short", beardCol: "#e4ded4", head: "mitre", robe: "pallium", robeCol: "#1e1a24", attr: "book", latin: "S · ANSELMVS" },
  bernard: { skin: "#e6b68c", shade: "#b8865c", hair: "tonsure", hairCol: "#8a6a44", robe: "cistercian", attr: "beehive", latin: "S · BERNARDVS" },
  newman: { skin: "#e8bea0", shade: "#b88c70", old: true, hair: "bald", hairCol: "#ebe6de", robe: "cardinal", robeCol: "#b01020", head: "zucchetto", headCol: "#b01020", attr: "lamp", latin: "S · IOANNES HENRICVS" },
};

// ---- The scenes ----------------------------------------------------------------------------------
// What they say is written for this game, in their spirit: not quotations.
const SCENES = {
  easy: {
    badge: "EASY", caption: "Meanwhile, in heaven…",
    cast: [
      ["therese", "You made it! All thirty-eight of us! And you did it the little way: one block at a time.", "That is how holiness goes, too. Little things, done with great love."],
      ["augustine", "I was restless for years, until I found the One I was looking for.", "Don't stop at the first rest. There is more to find. There always is."],
      ["francis", "Gently, now. You will drop blocks. You will make mistakes. Never fret at them.", "Pick yourself up and begin again. That is the whole devout life, really."],
      ["jerome", "Easy mode? Hmph. I learned Hebrew in a cave in Bethlehem.", "Up you get. Do it again, properly. NORMAL is open."],
      ["teresa", "Don't mind Jerome. You have only seen the first rooms of the castle.", "There are more mansions, further in. Come and see."],
    ],
    finale: { ids: ["therese", "augustine", "francis", "jerome", "teresa"], line: "Keep going: NORMAL is open, and we are cheering you on.", next: "normal", label: "PLAY NORMAL" },
  },
  normal: {
    badge: "NORMAL", caption: "The Doctors have been watching…",
    cast: [
      ["thomas", "Objection 1: it seems the player should rest, having finished twice. On the contrary, there is a third.", "I answer that the good spreads itself. What has begun to grow keeps growing."],
      ["catherine", "Fire! You played with fire that time.", "Never be lukewarm about what matters. Go on, all the way."],
      ["hildegard", "Viriditas! I see something green and living coming up in you.", "Faster blocks, deeper music. Sing louder."],
      ["john", "It grew darker and faster, didn't it? The night that tests you is the same night that leads you.", "HARD is open. Go on up the mountain."],
      ["athanasius", "They sent me into exile five times. Five! And five times I came home.", "When everything is against you, come back again."],
    ],
    finale: { ids: ["thomas", "catherine", "hildegard", "john", "athanasius"], line: "One more ascent: HARD is open. We will be there.", next: "hard", label: "PLAY HARD" },
  },
  hard: {
    badge: "HARD", caption: "And all heaven was glad…",
    cast: [
      ["gregory", "I wrote the life of a monk named Benedict, who dwelt alone with himself in the sight of God.", "You kept watch over a fast and crowded field. Keep that same watch over your heart."],
      ["bede", "I always took delight in learning, and teaching, and writing. And in finishing things, like you.", "Life is a sparrow's flight through a warm hall. Use the hall well."],
      ["anselm", "Did you think this was the hardest thing there could be?", "Think of something greater. There it is: and it is God, and He is waiting for you."],
      ["bernard", "Why did you play all this way? Love needs no reason beyond itself.", "Now give that love to the One who made the music."],
      ["newman", "You never saw the distant scene. One step was enough, and then the next.", "Keep walking. The Light is kindly."],
    ],
    finale: { ids: ["gregory", "bede", "anselm", "bernard", "newman"], line: "The game is finished. The pilgrimage is not. Pray for us, and we will pray for you.", next: null, label: "AMEN" },
  },
};

// ---- Drawing a Doctor ----------------------------------------------------------------------------
const INK = "#1a0e08";
let dotPattern = null;
function dots() {
  if (dotPattern) return dotPattern;
  const cc = document.createElement("canvas"); cc.width = 6; cc.height = 6; const g = cc.getContext("2d");
  g.fillStyle = "#000"; g.beginPath(); g.arc(3, 3, 1.3, 0, Math.PI * 2); g.fill();
  dotPattern = ctx.createPattern(cc, "repeat"); return dotPattern;
}
function ink(c, w) { c.strokeStyle = INK; c.lineWidth = w || 2.4; c.stroke(); }
function shape(c, pts, close) { c.beginPath(); pts.forEach(([x, y], i) => c[i ? "lineTo" : "moveTo"](x, y)); if (close !== false) c.closePath(); }
function cross(c, x, y, r, col) { c.fillStyle = col; c.fillRect(x - r * 0.25, y - r, r * 0.5, r * 2); c.fillRect(x - r, y - r * 0.25, r * 2, r * 0.5); }

// The Doctor, face centred at (0, 0): the face is 48 wide and 64 high; the shoulders reach y = 130.
function portrait(c, id, cx, cy, s, o) {
  const P = LOOKS[id]; o = o || {};
  c.save(); c.translate(cx, cy); c.scale(s, s); c.lineJoin = "round"; c.lineCap = "round";
  const fw = P.wide ? 27 : P.young ? 23 : 24, fh = P.young ? 30 : 32;
  // The halo: gold, ringed, the rim punched with little marks.
  c.beginPath(); c.arc(0, -8, 56, 0, Math.PI * 2); c.fillStyle = grad(c, -40, -60, 40, 40, [[0, "#ffe9a0"], [0.5, "#f0c048"], [1, "#b8801c"]]); c.fill(); ink(c, 3);
  c.beginPath(); c.arc(0, -8, 49, 0, Math.PI * 2); c.strokeStyle = "rgba(120,70,0,0.6)"; c.lineWidth = 1.5; c.stroke();
  c.fillStyle = "rgba(120,70,0,0.55)"; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; c.beginPath(); c.arc(Math.cos(a) * 52.5, -8 + Math.sin(a) * 52.5, 1.2, 0, Math.PI * 2); c.fill(); }
  // Behind the head: veils and hoods fall to the shoulders.
  if (P.head === "veilC" || P.head === "veilB") { shape(c, [[-38, -20], [-44, 60], [-62, 120], [62, 120], [44, 60], [38, -20], [0, -46]]); c.fillStyle = "#14100e"; c.fill(); ink(c); }
  if (P.head === "veilD") { shape(c, [[-36, -20], [-44, 60], [-62, 120], [62, 120], [44, 60], [36, -20], [0, -44]]); c.fillStyle = "#f4f0e8"; c.fill(); ink(c); }
  if (P.robe === "cistercian" || P.robe === "carmeliteM" || P.robe === "benedictine" && !P.head) { shape(c, [[-42, 22], [-54, 58], [-30, 66], [30, 66], [54, 58], [42, 22], [0, 10]]); c.fillStyle = P.robe === "cistercian" ? "#eae6dc" : P.robe === "carmeliteM" ? "#6a4428" : "#1a1618"; c.fill(); ink(c); }
  // The shoulders and the robe.
  body(c, P);
  // The neck.
  shape(c, [[-10, 22], [-11, 44], [11, 44], [10, 22]]); c.fillStyle = P.shade; c.fill();
  // The wimple, framing the face, for the nuns.
  if (P.head === "veilC" || P.head === "veilB" || P.head === "veilD") { c.beginPath(); c.ellipse(0, 6, fw + 9, fh + 14, 0, 0, Math.PI * 2); c.fillStyle = "#f6f2ea"; c.fill(); ink(c); shape(c, [[-30, 30], [-34, 58], [34, 58], [30, 30]]); c.fill(); ink(c); }
  // The face: flat colour, a shadow down one side, white highlights in the manner of an icon.
  c.beginPath(); c.ellipse(0, 0, fw, fh, 0, 0, Math.PI * 2); c.fillStyle = P.skin; c.fill();
  c.save(); c.clip(); c.fillStyle = P.shade; c.beginPath(); c.ellipse(fw * 0.55, 4, fw * 0.75, fh * 1.1, 0, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 0.18; c.fillStyle = dots(); c.fillRect(0, -fh, fw, fh * 2); c.restore();
  c.beginPath(); c.ellipse(0, 0, fw, fh, 0, 0, Math.PI * 2); ink(c);
  c.strokeStyle = "rgba(255,246,226,0.85)"; c.lineWidth = 1.2;
  for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(-6 + k * 5, -fh + 12 + Math.abs(k) * 2); c.lineTo(-3 + k * 5, -fh + 15 + Math.abs(k) * 2); c.stroke(); }
  c.beginPath(); c.moveTo(-2, -2); c.lineTo(-2.5, 9); c.stroke();
  if (P.old) { c.strokeStyle = "rgba(60,30,10,0.45)"; c.lineWidth = 1; for (const y of [-fh + 14, -fh + 18]) { c.beginPath(); c.moveTo(-10, y); c.quadraticCurveTo(0, y - 2, 10, y); c.stroke(); } }
  // Hair.
  if (P.hair === "tonsure") { c.beginPath(); c.ellipse(0, -fh + 10, fw + 2, 11, 0, Math.PI * 0.95, Math.PI * 2.05); c.lineWidth = 7; c.strokeStyle = P.hairCol; c.stroke(); c.beginPath(); c.ellipse(0, -fh + 10, fw + 5.5, 14.5, 0, Math.PI * 0.95, Math.PI * 2.05); c.lineWidth = 1.8; c.strokeStyle = INK; c.stroke(); }
  else if (P.hair === "bald") { for (const sd of [-1, 1]) { shape(c, [[sd * fw * 0.95, -10], [sd * (fw + 5), -4], [sd * (fw + 4), 12], [sd * fw * 0.9, 14]]); c.fillStyle = P.hairCol; c.fill(); ink(c, 1.8); } }
  else if (P.hair) { c.beginPath(); c.ellipse(0, -fh + 12, fw + 3, 17, 0, Math.PI, Math.PI * 2); c.lineTo(fw + 3, -4); c.lineTo(fw - 2, -10); c.quadraticCurveTo(0, -fh + 6, -fw + 2, -10); c.lineTo(-fw - 3, -4); c.closePath(); c.fillStyle = P.hair; c.fill(); ink(c, 1.8); }
  // Beard.
  if (P.beard === "short" || P.beard === "full") { const d = P.beard === "full" ? 16 : 10; c.beginPath(); c.moveTo(-fw + 1, 4); c.quadraticCurveTo(-fw + 2, fh + d * 0.6, 0, fh + d); c.quadraticCurveTo(fw - 2, fh + d * 0.6, fw - 1, 4); c.quadraticCurveTo(fw - 6, 14, 8, 20); c.lineTo(-8, 20); c.quadraticCurveTo(-fw + 6, 14, -fw + 1, 4); c.closePath(); c.fillStyle = P.beardCol; c.fill(); ink(c, 1.8); }
  if (P.beard === "long") { c.beginPath(); c.moveTo(-fw + 1, 2); c.quadraticCurveTo(-fw, fh + 30, 0, fh + 52); c.quadraticCurveTo(fw, fh + 30, fw - 1, 2); c.quadraticCurveTo(fw - 6, 14, 8, 20); c.lineTo(-8, 20); c.quadraticCurveTo(-fw + 6, 14, -fw + 1, 2); c.closePath(); c.fillStyle = P.beardCol; c.fill(); ink(c, 1.8); c.strokeStyle = "rgba(120,110,100,0.6)"; c.lineWidth = 1; for (const x of [-8, 0, 8]) { c.beginPath(); c.moveTo(x, 26); c.quadraticCurveTo(x * 0.7, fh + 30, x * 0.3, fh + 44); c.stroke(); } }
  // Brows that run into the long nose; almond eyes.
  c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(-19, -11); c.quadraticCurveTo(-11, -16, -3, -11); c.lineTo(-2, 8); c.quadraticCurveTo(1, 11, 4, 8); c.moveTo(19, -11); c.quadraticCurveTo(11, -16, 3, -11); c.stroke();
  for (const sd of [-1, 1]) {
    const ex = sd * 10.5, ey = -4;
    if (o.blink) { c.beginPath(); c.moveTo(ex - 6, ey); c.quadraticCurveTo(ex, ey + 2, ex + 6, ey); ink(c, 2); continue; }
    c.beginPath(); c.moveTo(ex - 7, ey); c.quadraticCurveTo(ex, ey - 5.5, ex + 7, ey); c.quadraticCurveTo(ex, ey + 4, ex - 7, ey); c.fillStyle = "#f6ecd8"; c.fill();
    c.save(); c.clip(); c.fillStyle = "#2a160a"; c.beginPath(); c.arc(ex + 1.2, ey - 0.3, 3, 0, Math.PI * 2); c.fill(); c.fillStyle = "#fff"; c.fillRect(ex + 1.6, ey - 2, 1.2, 1.2); c.restore();
    c.beginPath(); c.moveTo(ex - 7, ey); c.quadraticCurveTo(ex, ey - 5.5, ex + 7, ey); ink(c, 2.2);
  }
  // The mouth: small and closed, or open as they speak.
  if (o.talk) { c.beginPath(); c.ellipse(0, 17, 4, 2.6 + o.talk * 2, 0, 0, Math.PI * 2); c.fillStyle = "#5a1810"; c.fill(); ink(c, 1.4); }
  else { c.beginPath(); c.moveTo(-4.5, 16.5); c.quadraticCurveTo(0, 18, 4.5, 16.5); ink(c, 1.6); c.beginPath(); c.ellipse(0, 19, 3, 1.4, 0, 0, Math.PI * 2); c.fillStyle = "#a0402c"; c.fill(); }
  // What is on the head, in front.
  if (P.head === "veilC" || P.head === "veilB") { c.beginPath(); c.ellipse(0, -fh + 2, fw + 10, 12, 0, Math.PI, Math.PI * 2); c.lineTo(fw + 10, -fh + 8); c.lineTo(-fw - 10, -fh + 8); c.closePath(); c.fillStyle = "#f6f2ea"; c.fill(); ink(c); c.beginPath(); c.ellipse(0, -fh - 2, fw + 14, 16, 0, Math.PI, Math.PI * 2); c.lineTo(fw + 14, -fh + 2); c.quadraticCurveTo(0, -fh - 10, -fw - 14, -fh + 2); c.closePath(); c.fillStyle = "#14100e"; c.fill(); ink(c); }
  if (P.head === "veilD") { c.beginPath(); c.ellipse(0, -fh + 2, fw + 12, 14, 0, Math.PI, Math.PI * 2); c.closePath(); c.fillStyle = "#f6f2ea"; c.fill(); ink(c); }
  if (P.thorns) { c.strokeStyle = "#3a2410"; c.lineWidth = 2.5; for (let k = 0; k < 2; k++) { c.beginPath(); for (let i = 0; i <= 24; i++) { const a = Math.PI + i / 24 * Math.PI; c.lineTo(Math.cos(a) * (fw + 4), -fh + 8 + Math.sin(a) * 9 + Math.sin(i * 1.7 + k) * 1.6); } c.stroke(); } c.lineWidth = 1.4; for (let i = 0; i < 9; i++) { const a = Math.PI + (i + 0.5) / 9 * Math.PI, x = Math.cos(a) * (fw + 4), y = -fh + 8 + Math.sin(a) * 9; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5 - 2); c.stroke(); } }
  if (P.head === "mitre") { shape(c, [[-22, -fh + 6], [-20, -fh - 22], [0, -fh - 40], [20, -fh - 22], [22, -fh + 6]]); c.fillStyle = "#f2d070"; c.fill(); ink(c); c.fillStyle = "#b02020"; c.fillRect(-3.5, -fh - 34, 7, 38); c.fillRect(-21, -fh - 2, 42, 7); c.strokeStyle = INK; c.lineWidth = 1.5; c.strokeRect(-21, -fh - 2, 42, 7); }
  if (P.head === "tiara") { shape(c, [[-20, -fh + 6], [-18, -fh - 26], [0, -fh - 38], [18, -fh - 26], [20, -fh + 6]]); c.fillStyle = "#f4f0e6"; c.fill(); ink(c); for (const y of [-fh + 2, -fh - 10, -fh - 22]) { c.fillStyle = "#e8b830"; c.fillRect(-19, y, 38, 4); } cross(c, 0, -fh - 42, 4, "#e8b830"); }
  if (P.head === "zucchetto") { c.beginPath(); c.ellipse(0, -fh + 5, 13, 6, 0, Math.PI, Math.PI * 2); c.closePath(); c.fillStyle = P.headCol; c.fill(); ink(c, 1.6); }
  attribute(c, P);
  c.restore();
}
function body(c, P) {
  const robe = P.robe;
  const base = { carmelite: "#6a4428", carmeliteM: "#6a4428", dominican: "#f4f0e8", dominicanF: "#f4f0e8", benedictine: "#1a1618", cistercian: "#eae6dc", pope: "#f4f0e6" }[robe] || P.robeCol || "#6a2020";
  const sh = [[-80, 140], [-74, 66], [-34, 44], [34, 44], [74, 66], [80, 140]];
  shape(c, sh); c.fillStyle = base; c.fill(); ink(c, 2.8);
  c.save(); shape(c, sh); c.clip();
  c.globalAlpha = 0.2; c.fillStyle = dots(); c.fillRect(20, 40, 70, 110); c.globalAlpha = 1;
  if (robe === "carmelite" || robe === "carmeliteM") { for (const sd of [-1, 1]) { shape(c, [[sd * 40, 46], [sd * 78, 70], [sd * 82, 140], [sd * 50, 140], [sd * 30, 60]]); c.fillStyle = "#f2ece0"; c.fill(); ink(c); } }
  if (robe === "dominican" || robe === "dominicanF") { for (const sd of [-1, 1]) { shape(c, [[sd * 30, 46], [sd * 78, 66], [sd * 82, 140], [sd * 34, 140], [sd * 18, 70]]); c.fillStyle = "#16120e"; c.fill(); ink(c); } }
  if (robe === "bishop" || robe === "omophorion") { c.beginPath(); c.moveTo(-60, 62); c.quadraticCurveTo(0, 120, 60, 62); c.lineWidth = 16; c.strokeStyle = "#f4f0e6"; c.stroke(); c.lineWidth = 2; c.strokeStyle = INK; c.beginPath(); c.moveTo(-63, 52); c.quadraticCurveTo(0, 128, 63, 52); c.stroke(); c.beginPath(); c.moveTo(-57, 72); c.quadraticCurveTo(0, 112, 57, 72); c.stroke(); for (const [x, y] of [[-38, 84], [0, 92], [38, 84]]) cross(c, x, y, 5, robe === "omophorion" ? "#1a1a1a" : "#b02020"); if (robe === "bishop") { c.strokeStyle = "#e8b830"; c.lineWidth = 3; c.beginPath(); c.moveTo(-34, 46); c.lineTo(-30, 140); c.moveTo(34, 46); c.lineTo(30, 140); c.stroke(); } }
  if (robe === "pallium" || robe === "pope") { c.beginPath(); c.moveTo(-46, 58); c.quadraticCurveTo(0, 96, 46, 58); c.moveTo(0, 84); c.lineTo(0, 140); c.lineWidth = 10; c.strokeStyle = "#f8f6f0"; c.stroke(); for (const [x, y] of [[-26, 74], [26, 74], [0, 112]]) cross(c, x, y, 4, "#1a1a1a"); if (robe === "pope") { c.strokeStyle = "#e8b830"; c.lineWidth = 4; c.beginPath(); c.moveTo(-74, 70); c.lineTo(-36, 46); c.moveTo(74, 70); c.lineTo(36, 46); c.stroke(); } }
  if (robe === "cardinal" || robe === "mozzetta") { shape(c, [[-74, 66], [-34, 44], [34, 44], [74, 66], [70, 92], [-70, 92]]); c.fillStyle = P.robeCol; c.fill(); ink(c); c.fillStyle = robe === "mozzetta" ? "#14100e" : "#c01828"; c.fillRect(-24, 92, 48, 48); c.fillStyle = "#e8b830"; for (let y = 50; y < 140; y += 11) { c.beginPath(); c.arc(0, y, 2, 0, Math.PI * 2); c.fill(); } }
  if (robe === "benedictine" || robe === "cistercian") { c.strokeStyle = robe === "cistercian" ? "rgba(100,90,80,0.6)" : "rgba(255,255,255,0.18)"; c.lineWidth = 1.4; for (const x of [-40, -18, 18, 40]) { c.beginPath(); c.moveTo(x * 0.7, 56); c.quadraticCurveTo(x, 100, x * 1.1, 140); c.stroke(); } }
  c.restore();
}
function attribute(c, P) {
  const a = P.attr;
  if (a === "roses") for (const [x, y] of [[-30, 104], [-18, 112], [-36, 118], [-22, 124]]) { c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fillStyle = "#e0306a"; c.fill(); ink(c, 1.4); c.beginPath(); c.arc(x, y, 2.5, 0, Math.PI * 2); c.strokeStyle = "#7a0a2a"; c.lineWidth = 1; c.stroke(); }
  if (a === "heart" || a === "heart2") { c.save(); c.translate(-34, 104); c.beginPath(); c.moveTo(0, 8); c.bezierCurveTo(-14, -2, -8, -14, 0, -6); c.bezierCurveTo(8, -14, 14, -2, 0, 8); c.fillStyle = "#d02020"; c.fill(); ink(c, 1.6); if (a === "heart") { c.beginPath(); c.moveTo(-4, -8); c.quadraticCurveTo(0, -24, 5, -10); c.quadraticCurveTo(2, -16, 0, -8); c.fillStyle = "#ffb020"; c.fill(); ink(c, 1.2); } else { c.strokeStyle = "#ffe080"; c.lineWidth = 1.2; c.beginPath(); c.arc(0, -1, 11, 0, Math.PI * 2); c.stroke(); } c.restore(); }
  if (a === "book") { c.save(); c.translate(-34, 108); c.rotate(-0.2); c.fillStyle = "#8a1a1a"; c.fillRect(-16, -12, 32, 24); c.strokeStyle = INK; c.lineWidth = 1.8; c.strokeRect(-16, -12, 32, 24); c.fillStyle = "#e8b830"; c.fillRect(-2, -8, 4, 16); c.fillRect(-8, -2, 16, 4); c.restore(); }
  if (a === "quill") { c.save(); c.translate(-36, 112); c.rotate(-0.6); c.beginPath(); c.moveTo(0, 14); c.quadraticCurveTo(-8, -10, 0, -26); c.quadraticCurveTo(8, -10, 0, 14); c.fillStyle = "#f6f2ea"; c.fill(); ink(c, 1.4); c.restore(); }
  if (a === "sun") { c.save(); c.translate(0, 100); c.fillStyle = "#f0c040"; c.beginPath(); c.arc(0, 0, 9, 0, Math.PI * 2); c.fill(); ink(c, 1.4); c.strokeStyle = "#e0a020"; c.lineWidth = 1.6; for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2; c.beginPath(); c.moveTo(Math.cos(an) * 11, Math.sin(an) * 11); c.lineTo(Math.cos(an) * 17, Math.sin(an) * 17); c.stroke(); } c.restore(); }
  if (a === "lily") { c.save(); c.translate(-36, 116); c.strokeStyle = "#2a6a2a"; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 20); c.lineTo(4, -14); c.stroke(); for (const r of [-0.6, 0, 0.6]) { c.save(); c.translate(4, -16); c.rotate(r); c.beginPath(); c.ellipse(0, -6, 3.5, 8, 0, 0, Math.PI * 2); c.fillStyle = "#fbfaf4"; c.fill(); ink(c, 1.2); c.restore(); } c.restore(); }
  if (a === "flame") for (const x of [-14, 0, 14]) { c.beginPath(); c.moveTo(x - 5, -62); c.quadraticCurveTo(x - 4, -74, x, -82); c.quadraticCurveTo(x + 4, -74, x + 5, -62); c.closePath(); c.fillStyle = "#ff8a20"; c.fill(); ink(c, 1.2); }
  if (a === "cross") { c.fillStyle = "#3a2410"; c.fillRect(-38, 82, 5, 46); c.fillRect(-46, 92, 21, 5); c.strokeStyle = INK; c.lineWidth = 1.2; c.strokeRect(-38, 82, 5, 46); }
  if (a === "dove") { c.save(); c.translate(36, -30); c.beginPath(); c.ellipse(0, 0, 10, 5, -0.3, 0, Math.PI * 2); c.fillStyle = "#ffffff"; c.fill(); ink(c, 1.4); c.beginPath(); c.moveTo(-2, -2); c.lineTo(-12, -14); c.lineTo(4, -4); c.closePath(); c.fill(); ink(c, 1.2); c.beginPath(); c.moveTo(-9, 2); c.lineTo(-14, 3); c.stroke(); c.restore(); }
  if (a === "beehive") { c.save(); c.translate(-36, 112); for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(0, 8 - i * 6, 13 - i * 2.5, 4, 0, 0, Math.PI * 2); c.fillStyle = "#e8b040"; c.fill(); ink(c, 1.2); } c.restore(); }
  if (a === "lamp") { c.save(); c.translate(-36, 112); c.beginPath(); c.ellipse(0, 4, 12, 6, 0, 0, Math.PI * 2); c.fillStyle = "#c08a30"; c.fill(); ink(c, 1.4); c.beginPath(); c.moveTo(10, 2); c.quadraticCurveTo(10, -10, 14, -14); c.quadraticCurveTo(18, -8, 14, 2); c.fillStyle = "#ffd060"; c.fill(); c.restore(); BG.glow(c, -22, 98, 26, "rgba(255,210,120,0.6)", 1); }
}

// ---- The comic --------------------------------------------------------------------------------------
let SC = null;
function startScene(diff, then) {
  if (!SCENES[diff]) { then(); return; }
  SC = { d: diff, data: SCENES[diff], i: -1, line: 0, t: 0, shown: 0, then, blink: 0 };
  state = "scene"; Sound.muffle(false); Sound.play(SONGS.title);
}
const SCENE_CPS = 42; // letters a second, as the bubble fills
function sceneLine() { const c = SC.data.cast[SC.i]; return c ? c[1 + SC.line] : ""; }
function sceneTap() {
  if (!SC) return;
  const L = SC.data.cast.length;
  if (SC.i >= 0 && SC.i < L && SC.shown < sceneLine().length) { SC.shown = sceneLine().length; return; }
  if (SC.i >= 0 && SC.i < L && SC.line === 0) { SC.line = 1; SC.shown = 0; return; }
  if (SC.i < L) { SC.i++; SC.line = 0; SC.shown = 0; SC.t = 0; }
}
function sceneSkip() { if (SC) { SC.i = SC.data.cast.length; SC.t = 1; } }
function sceneDone(next) { const f = SC.then; SC = null; if (next) start("pilgrimage", 0, next); else f(); }

// Draw a Doctor's world inside a rectangle, under a halftone, as a comic panel's ground.
function worldIn(c, id, x, y, w, h, t, L) {
  const st = STAGES[STAGE_BY_ID[id]];
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.translate(x, y); c.scale(w / W, h / H); st.bg(c, { t, pulse: 0.3 + 0.3 * Math.sin(t * 2), L: L === undefined ? 2 : L, energy: 0.3 }); c.restore();
  c.save(); c.globalAlpha = 0.22; c.fillStyle = dots(); c.fillRect(x, y, w, h); c.restore();
  return st;
}
// An arched icon frame: gold, with a red line inside it.
function archPath(c, x, y, w, h) { const r = w / 2; c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + r); c.arc(x + r, y + r, r, Math.PI, 0); c.lineTo(x + w, y + h); c.closePath(); }
function nameplate(c, str, cx, y, w) { c.fillStyle = "#9a1818"; c.fillRect(cx - w / 2, y, w, 18); c.strokeStyle = "#f0c048"; c.lineWidth = 2; c.strokeRect(cx - w / 2, y, w, 18); text(str, cx, y + 13, { align: "center", size: 10, weight: 700, font: FONT.title, color: "#ffe9a0", spacing: 1.5, max: w - 10 }); }
// A speech bubble; its tail comes out of the left side (side "l") or the top ("t") toward (tx, ty).
function bubble(c, x, y, w, h, tx, ty, side) {
  c.beginPath(); c.moveTo(x + 14, y);
  if (side === "t") { c.lineTo(tx - 18, y); c.lineTo(tx, ty); c.lineTo(tx + 6, y); }
  c.lineTo(x + w - 14, y); c.quadraticCurveTo(x + w, y, x + w, y + 14); c.lineTo(x + w, y + h - 14); c.quadraticCurveTo(x + w, y + h, x + w - 14, y + h);
  c.lineTo(x + 14, y + h); c.quadraticCurveTo(x, y + h, x, y + h - 14);
  if (side !== "t") { const m = Math.min(y + h - 16, Math.max(y + 16, ty - 6)); c.lineTo(x, m + 12); c.lineTo(tx, ty); c.lineTo(x, m - 10); }
  c.lineTo(x, y + 14); c.quadraticCurveTo(x, y, x + 14, y); c.closePath();
  c.fillStyle = "#fffdf4"; c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
}
function caption(c, str, x, y) {
  c.font = "700 10px " + FONT.ui; const w = c.measureText(str.toUpperCase()).width + str.length * 0.5 + 22;
  c.fillStyle = "#ffe48a"; c.fillRect(x, y, w, 20); c.strokeStyle = INK; c.lineWidth = 2.5; c.strokeRect(x, y, w, 20);
  text(str.toUpperCase(), x + 10, y + 14, { size: 10, weight: 700, color: INK, spacing: 0.5 });
}
// A comic "burst": a spiky star with words in it.
function burst(c, x, y, r, pts, col) { c.beginPath(); for (let i = 0; i <= pts * 2; i++) { const a = i / (pts * 2) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.72 : r; c.lineTo(x + Math.cos(a) * rr * 1.5, y + Math.sin(a) * rr); } c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 3.5; c.stroke(); }

function drawScene(dt) {
  if (!SC) { state = "title"; return; }
  SC.t += dt; menuT += dt; SC.blink -= dt; if (SC.blink < -3.2) SC.blink = 0.14;
  const t = menuT, D = SC.data, L = D.cast.length;
  // The page: dark, with a fine halftone.
  ctx.fillStyle = "#0d0a14"; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = dots(); ctx.fillRect(0, 0, W, H); ctx.restore();
  const enter = Math.min(1, SC.t / 0.35), ease = 1 - Math.pow(1 - enter, 3);

  if (SC.i < 0) {
    // The cover: a burst of gold over Thérèse's roses, the difficulty on a badge.
    worldIn(ctx, "therese", 18, 18, 604, 296, t, 3);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.strokeRect(18, 18, 604, 296); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(18, 18, 604, 296);
    ctx.save(); ctx.translate(W / 2, 150); ctx.scale(0.6 + 0.4 * ease, 0.6 + 0.4 * ease); ctx.rotate(-0.05);
    burst(ctx, 0, 0, 110, 14, "#ffd23a");
    text("THE PILGRIMAGE", 0, -18, { align: "center", size: 26, weight: 700, font: FONT.title, color: INK, spacing: 2 });
    text("IS COMPLETE!", 0, 16, { align: "center", size: 30, weight: 800, font: FONT.title, color: "#b01020", spacing: 2 });
    ctx.restore();
    ctx.save(); ctx.translate(W / 2 + 150, 228); ctx.rotate(0.12); ctx.fillStyle = "#b01020"; ctx.fillRect(-56, -16, 112, 32); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(-56, -16, 112, 32);
    text(D.badge, 0, 7, { align: "center", size: 18, weight: 800, font: FONT.title, color: "#ffe9a0", spacing: 3 }); ctx.restore();
    caption(ctx, D.caption, 30, 268);
  } else if (SC.i < L) {
    const [id] = D.cast[SC.i], st = STAGES[STAGE_BY_ID[id]], line = sceneLine();
    SC.shown = Math.min(line.length, SC.shown + dt * SCENE_CPS);
    const talking = SC.shown < line.length;
    ctx.save(); ctx.translate((1 - ease) * 120, 0); ctx.globalAlpha = ease;
    const tilt = (SC.i % 2 ? 1 : -1) * 0.012; ctx.translate(W / 2, 166); ctx.rotate(tilt); ctx.translate(-W / 2, -166);
    worldIn(ctx, id, 18, 18, 604, 296, t, 2);
    ctx.fillStyle = grad(ctx, 0, 0, W, 0, [[0, "rgba(0,0,0,0.1)"], [0.45, "rgba(0,0,0,0.05)"], [1, "rgba(0,0,0,0.35)"]]); ctx.fillRect(18, 18, 604, 296);
    // The icon in its arch, the Doctor's own world showing through.
    ctx.save(); archPath(ctx, 40, 34, 200, 280); ctx.clip();
    ctx.fillStyle = hexA(st.colors.accent, 0.18); ctx.fillRect(40, 34, 200, 280);
    portrait(ctx, id, 140, 178, 1.38, { talk: talking ? 0.5 + 0.5 * Math.sin(t * 22) : 0, blink: SC.blink > 0 });
    ctx.restore();
    archPath(ctx, 40, 34, 200, 280); ctx.strokeStyle = "#f0c048"; ctx.lineWidth = 7; ctx.stroke();
    archPath(ctx, 46, 40, 188, 276); ctx.strokeStyle = "#9a1818"; ctx.lineWidth = 1.5; ctx.stroke();
    archPath(ctx, 36, 30, 208, 284); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    nameplate(ctx, LOOKS[id].latin, 140, 286, 170);
    // The speech bubble.
    const lines = wrap(line.toUpperCase(), 296, "700 13px " + FONT.ui), bh = 30 + lines.length * 19;
    bubble(ctx, 270, 70, 330, bh, 196, 190);
    let left = Math.floor(SC.shown);
    lines.forEach((l, k) => { const part = l.slice(0, Math.max(0, left)); left -= l.length + 1; if (part) text(part, 287, 96 + k * 19, { size: 13, weight: 700, color: INK }); });
    caption(ctx, st.name + "  ·  " + st.life, 262, 30);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.strokeRect(18, 18, 604, 296); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(18, 18, 604, 296);
    ctx.restore();
  } else {
    // The last panel: all five together, a row of icons, each over their own world.
    const F = D.finale;
    ctx.save(); ctx.globalAlpha = ease;
    F.ids.forEach((id, k) => {
      const x = 26 + k * 119, y = 26, w = 112, h = 196;
      worldIn(ctx, id, x, y, w, h, t + k, 2);
      ctx.save(); archPath(ctx, x + 8, y + 8, w - 16, h - 16); ctx.clip(); ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.fillRect(x, y, w, h); portrait(ctx, id, x + w / 2, y + 84, 0.62, { blink: SC.blink > 0 && k === Math.floor(t) % 5 }); ctx.restore();
      archPath(ctx, x + 8, y + 8, w - 16, h - 16); ctx.strokeStyle = "#f0c048"; ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
      nameplate(ctx, LOOKS[id].latin, x + w / 2, y + h - 30, w - 14);
    });
    const ls = wrap(F.line.toUpperCase(), 520, "700 13px " + FONT.ui), bh = 22 + ls.length * 18;
    bubble(ctx, 50, 236, 540, bh, 320, 212, "t");
    ls.forEach((l, k) => text(l, W / 2, 256 + k * 18, { align: "center", size: 13, weight: 700, color: INK }));
    ctx.restore();
    if (SC.t > 0.5) {
      if (F.next) { button(F.label, W / 2 - 186, 322, 180, 28, { hot: true, act: () => sceneDone(F.next) }); button("NOT NOW", W / 2 + 6, 322, 180, 28, { act: () => sceneDone(null) }); }
      else button(F.label, W / 2 - 90, 322, 180, 28, { hot: true, act: () => sceneDone(null) });
    }
    return;
  }
  // Beneath the panel: skip, the page, and tap to go on.
  button("SKIP", 18, 326, 70, 22, { size: 9, act: sceneSkip });
  for (let k = 0; k <= L; k++) { ctx.fillStyle = k === SC.i + 1 ? "#ffe48a" : "rgba(255,255,255,0.3)"; ctx.beginPath(); ctx.arc(W / 2 - L * 8 + k * 16, 337, 3.5, 0, Math.PI * 2); ctx.fill(); }
  text("TAP TO CONTINUE ▸", W - 22, 342, { align: "right", size: 10, weight: 700, color: "#ffe48a", alpha: 0.6 + 0.4 * Math.sin(t * 4) });
}
window.LUM_SCENE = { startScene, get SC() { return SC; }, sceneTap, sceneSkip, LOOKS, SCENES };
