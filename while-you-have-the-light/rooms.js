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
  return { name, w: W, h: Hh, g, marks };
}

// ---- The piece picker -----------------------------------------------------------------------------
// For trying the rooms one at a time (on the title, with ?pieces in the address): each room alone,
// with a demon or two in it, made afresh each time it is chosen (or begun again).
const Pieces = {
  t: 0,
  open() { Pieces.t = 0; mode = Pieces; Sound.flare(false); Sound.muffle(false); },
  go(name) {
    Game.scene({ title: ROOMS[name].name, mountain: "gluttony", summit: false, metres: 0, place: "any", demons: 1, near: [], great: 0, block: false, boon: null, torch: 1, endlessTorch: true, flare: 1, endlessFlare: false, seed: (Math.random() * 1e9) | 0, piece: name });
  },
  step(dt) { Pieces.t += dt; },
  draw() {
    rect(0, 0, W, H, "#f2efe8");
    text("THE PIECES", W / 2, 34, { align: "center", font: FONT.title, size: 18, weight: 700, spacing: 5, color: "#2a2620" });
    text("Each room of the mountain, alone. Made afresh each time: try one again and its maybe-rock falls otherwise.", W / 2, 52, { align: "center", font: FONT.line, italic: true, size: 12, color: "#6a6255", max: W - 40 });
    const names = Object.keys(ROOMS), cols = 3, bw = Math.min(200, (W - 60) / cols - 10);
    names.forEach((n, i) => { const x = W / 2 - (cols * (bw + 10)) / 2 + 5 + (i % cols) * (bw + 10), y = 80 + Math.floor(i / cols) * 54; button(ROOMS[n].name, x, y, bw, 44, () => Pieces.go(n), { sub: "Ways: " + ROOMS[n].ways }); });
    button("BACK", 16, H - 44, 80, 30, () => Game.toTitle(), {});
  },
  key(code, down) { if (down && code === "Escape") Game.toTitle(); },
};
