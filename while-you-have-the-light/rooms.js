"use strict";
// While You Have the Light: the rooms a mountain is made of (Spelunky's way). Each is drawn by hand
// as a small grid of characters, each character a block of 2 x 2 cells (32 pixels): a room is 32
// across and 17 high, about a screen and a half each way. Some of its rock is "maybe", so the same
// room comes out different each time it is made.
//   #  rock            .  air
//   ?  rock, one time in two          1  rock, two times in three
//   S  where he starts (on the floor under it)
//   V  a carved verse (in the rock beside it)      D  a demon's place      H  an herb's place
//   I  an idol's place
// Its openings are where its edges are open: the way in and the way out.
const ROOM_W = 32, ROOM_H = 17, ROOM_K = 2;     // characters across and down; cells to a character

const ROOMS = {
  // Up through a tall shaft, ledges first on one side, then the other.
  shaft: { name: "THE ZIGZAG SHAFT", ways: "down, up", rows: [
    "##############....##############",
    "#######..................#######",
    "#######..................#######",
    "#######.........??1111111#######",
    "#######..........D.......#######",
    "#######..................#######",
    "#######1111111??.........#######",
    "#######.V................#######",
    "#######..................#######",
    "#######.........??1111111#######",
    "#######.............H....#######",
    "#######..................#######",
    "#######111111??..........#######",
    "#######..................#######",
    "#######.........S........#######",
    "#######.....######.......#######",
    "################....############",
  ] },
  // Across a floor broken by a wide pit: swung over from the rock above it, or down and up again.
  gap: { name: "THE PIT GAP", ways: "left, right", rows: [
    "################################",
    "########??????????????##########",
    "#####......................?####",
    "##..........................####",
    "................................",
    "................................",
    "......................D.........",
    "....S...........................",
    "##########?.........?###########",
    "##########...........###########",
    "###########.........????########",
    "###########.........############",
    "###########....H....############",
    "###########111111111############",
    "################################",
    "################################",
    "################################",
  ] },
  // A level way through, low-roofed, with a step or two in it.
  corridor: { name: "THE CORRIDOR", ways: "left, right", rows: [
    "################################",
    "################################",
    "################################",
    "#########??????????????#########",
    "######.....................#####",
    "####.........................###",
    "..............V.................",
    "................................",
    "...S..............D.............",
    "..........###............###....",
    "#######1#######...1###########??",
    "################################",
    "################################",
    "################################",
    "################################",
    "################################",
    "################################",
  ] },
  // The way turns: in from below, out to the right.
  elbow: { name: "THE ELBOW", ways: "down, right", rows: [
    "################################",
    "################################",
    "######################??????####",
    "##############..................",
    "############....................",
    "###########..........D..........",
    "###########.....................",
    "###########......1111???########",
    "###########.....................",
    "###########V...................#",
    "###########.............########",
    "###########111??................",
    "###########.....................",
    "###########..........S..........",
    "###########.......#########.....",
    "###############.....############",
    "################....############",
  ] },
  // A side room: a hollow off the way, and a low way into the rock at its foot, a crawl long.
  crawl: { name: "THE LOW CRAWL", ways: "left", rows: [
    "################################",
    "################################",
    "################################",
    "################################",
    "#########????????###############",
    "####...............#############",
    "..................H.############",
    "....................############",
    "...S.................###########",
    "########...............#########",
    "#########..........1........####",
    "############################..##",
    "################################",
    "################################",
    "################################",
    "################################",
    "################################",
  ] },
  // A side room: a little chapel, its idol, those who worship it, and an herb by the door.
  shrine: { name: "THE SHRINE ROOM", ways: "right", rows: [
    "################################",
    "################################",
    "################################",
    "########??????????????##########",
    "######..................########",
    "#####....................#######",
    "####......................######",
    "####......................######",
    "####.......I...................",
    "####..........................H.",
    "####...................S........",
    "########1111111111111111########",
    "################################",
    "################################",
    "################################",
    "################################",
    "################################",
  ] },
};
// A room made: its rock (a cell grid, top row first), and its marks, in cells from its top left.
function makeRoom(name, rnd) {
  const T = ROOMS[name], W = ROOM_W * ROOM_K, Hh = ROOM_H * ROOM_K, g = [], marks = { S: [], V: [], D: [], H: [], I: [] };
  for (let r = 0; r < Hh; r++) g.push(new Array(W).fill(false));
  T.rows.forEach((row, r) => {
    for (let c = 0; c < ROOM_W; c++) {
      const ch = row[c] || "#";
      const rock = ch === "#" || (ch === "?" && rnd() < 0.5) || (ch === "1" && rnd() < 2 / 3);
      for (let y = 0; y < ROOM_K; y++) for (let x = 0; x < ROOM_K; x++) g[r * ROOM_K + y][c * ROOM_K + x] = rock;
      if (marks[ch]) marks[ch].push([c * ROOM_K + 1, r * ROOM_K + 1]);
    }
  });
  return seal({ name, w: W, h: Hh, g, marks });
}
// No hollows sealed in the rock: any air that cannot be reached from where he starts or from the
// room's open edges becomes rock. (Until there is a way to break through to such places.)
function seal(R) {
  const { w, h, g } = R, seen = g.map((r) => r.map(() => false)), q = [];
  const go = (x, y) => { if (x >= 0 && y >= 0 && x < w && y < h && !g[y][x] && !seen[y][x]) { seen[y][x] = true; q.push([x, y]); } };
  for (let x = 0; x < w; x++) { go(x, 0); go(x, h - 1); }
  for (let y = 0; y < h; y++) { go(0, y); go(w - 1, y); }
  for (const [x, y] of R.marks.S) go(x, y);
  while (q.length) { const [x, y] = q.pop(); go(x + 1, y); go(x - 1, y); go(x, y + 1); go(x, y - 1); }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!g[y][x] && !seen[y][x]) g[y][x] = true;
  return R;
}
// Rooms linked: each laid against the last on the side its way leads (up, right or left) where the
// next has a way in, or else above it or beside it; what they do not fill is rock. He starts in the
// first. (For seeing how the pieces join: where their openings do not meet, it shows.)
const WAYS = (n) => ROOMS[n].ways.split(", ");
// Whether b can be come into from a: a way out of a on a side where b has its way in.
const fits = (a, b) => (WAYS(a).includes("up") && WAYS(b).includes("down")) || (WAYS(a).includes("right") && WAYS(b).includes("left")) || (WAYS(a).includes("left") && WAYS(b).includes("right"));
function linkRooms(names, rnd) {
  const at = [[0, 0]], used = new Set(["0,0"]);
  for (let i = 1; i < names.length; i++) {
    const [x, y] = at[i - 1], out = WAYS(names[i - 1]), inn = WAYS(names[i]);
    const tries = [["up", "down", 0, -1], ["right", "left", 1, 0], ["left", "right", -1, 0]].filter((t) => out.includes(t[0]) && inn.includes(t[1]));
    tries.push(["", "", 0, -1], ["", "", 1, 0], ["", "", -1, 0]);
    let p = null; for (const t of tries) { const q = [x + t[2], y + t[3]]; if (!used.has(q + "")) { p = q; break; } }
    if (!p) { let q = [x, y - 1]; while (used.has(q + "")) q = [q[0], q[1] - 1]; p = q; }
    at.push(p); used.add(p + "");
  }
  const xs = at.map((p) => p[0]), ys = at.map((p) => p[1]), mx = Math.min(...xs), my = Math.min(...ys);
  const RW = ROOM_W * ROOM_K, RH = ROOM_H * ROOM_K, W = (Math.max(...xs) - mx + 1) * RW, Hh = (Math.max(...ys) - my + 1) * RH;
  const g = []; for (let r = 0; r < Hh; r++) g.push(new Array(W).fill(true));
  const marks = { S: [], V: [], D: [], H: [], I: [] };
  names.forEach((n, i) => {
    const R = makeRoom(n, rnd), ox = (at[i][0] - mx) * RW, oy = (at[i][1] - my) * RH;
    for (let r = 0; r < RH; r++) for (let c = 0; c < RW; c++) g[oy + r][ox + c] = R.g[r][c];
    for (const m in R.marks) if (m !== "S" || i === 0) for (const [c, r] of R.marks[m]) marks[m].push([c + ox, r + oy]);
  });
  return { name: names.join(" + "), w: W, h: Hh, g, marks };
}

// ---- The piece picker -----------------------------------------------------------------------------
// For trying the rooms (on the title, with ?pieces in the address): each room alone, or several
// linked (chosen, or at random), with a demon or two, made afresh each time (or begun again).
let pieceOut = false;                            // (he walked out of the room by one of its ways)
const Pieces = {
  t: 0, linking: false, chain: [],
  can: (n) => Pieces.chain.length < 5 && (!Pieces.chain.length || fits(Pieces.chain[Pieces.chain.length - 1], n)),
  open() { Pieces.t = 0; mode = Pieces; Sound.flare(false); Sound.muffle(false); },
  go(names) {
    names = [].concat(names); pieceOut = false;
    Game.scene({ title: names.length > 1 ? names.length + " ROOMS LINKED" : ROOMS[names[0]].name, mountain: "gluttony", summit: false, metres: 0, place: "any", demons: names.length, near: [], great: 0, block: false, boon: null, torch: 1, endlessTorch: true, flare: 1, endlessFlare: false, seed: (Math.random() * 1e9) | 0, piece: names });
  },
  // A random chain: three to five rooms, each one that can be come into from the last where there is one.
  random() {
    const all = Object.keys(ROOMS), pick = (a) => a[Math.floor(Math.random() * a.length)], out = [pick(all.filter((n) => WAYS(n).length > 1))], len = 3 + Math.floor(Math.random() * 3);
    while (out.length < len) { const last = out[out.length - 1], ok = all.filter((n) => fits(last, n)); if (!ok.length) break; out.push(pick(ok)); if (WAYS(out[out.length - 1]).length < 2) break; }
    Pieces.go(out);
  },
  step(dt) { Pieces.t += dt; },
  draw() {
    rect(0, 0, W, H, "#f2efe8");
    text("THE PIECES", W / 2, 34, { align: "center", font: FONT.title, size: 18, weight: 700, spacing: 5, color: "#2a2620" });
    text("Each room of the mountain, alone. Made afresh each time: try one again and its maybe-rock falls otherwise.", W / 2, 52, { align: "center", font: FONT.line, italic: true, size: 12, color: "#6a6255", max: W - 40 });
    const names = Object.keys(ROOMS), cols = 3, bw = Math.min(200, (W - 60) / cols - 10);
    names.forEach((n, i) => { const x = W / 2 - (cols * (bw + 10)) / 2 + 5 + (i % cols) * (bw + 10), y = 80 + Math.floor(i / cols) * 54; button(ROOMS[n].name, x, y, bw, 44, () => (Pieces.linking ? Pieces.can(n) && Pieces.chain.push(n) : Pieces.go(n)), { sub: "Ways: " + ROOMS[n].ways, off: Pieces.linking && !Pieces.can(n) }); });
    const y = 80 + Math.ceil(names.length / cols) * 54 + 8, P = Pieces;
    button("A RANDOM CHAIN", W / 2 - 215, y, 140, 36, () => P.random(), { sub: "3 to 5 rooms, linked" });
    button(P.linking ? "LINKING: ON" : "LINK ROOMS", W / 2 - 70, y, 140, 36, () => { P.linking = !P.linking; P.chain = []; }, { sub: P.linking ? "Up to 5; only rooms that join the last can be chosen" : "Choose several, and see them joined" });
    if (P.linking) {
      button("PLAY THE CHAIN", W / 2 + 75, y, 140, 36, () => P.chain.length > 1 && P.go(P.chain), { off: P.chain.length < 2, sub: "Or press BACK to clear" });
      text(P.chain.length ? P.chain.map((n) => ROOMS[n].name.replace(/^THE /, "")).join("  \u2192  ") : "(none chosen yet)", W / 2, y + 56, { align: "center", font: FONT.line, size: 12, color: "#2a2620", max: W - 40 });
    }
    button("BACK", 16, H - 44, 80, 30, () => (P.linking ? (P.linking = false, P.chain = []) : Game.toTitle()), {});
  },
  key(code, down) { if (down && code === "Escape") Game.toTitle(); },
};
