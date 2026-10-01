// Benedictine Bricks — pixel art.
//
// Every sprite is a grid of characters. Each character is one pixel, and the
// sprite's `colors` table says what color that character means. A "." is
// transparent. To change a color, edit the table; to change a shape, edit the
// grid. Keep every row of a sprite the same length.
//
// To replace a sprite with your own PNG later, see IMAGE_OVERRIDES at the end.

const ART = {};

// ---------------------------------------------------------------------------
// Stones. One shared pattern, painted with a different five-color ramp for
// each kind of stone: a = highlight, b = light, c = base, d = shadow, e = dark.
// ---------------------------------------------------------------------------

const STONE_PATTERN = [
  "aaaaaaaaaaab",
  "abbbbbbbbbbd",
  "abcccccccccd",
  "abccdcccbccd",
  "abcccccccccd",
  "abcccccbcccd",
  "abcdccccccdd",
  "abccccccdccd",
  "abccbcccccce",
  "abcccccdcccd",
  "abccccccccdd",
  "bdddddddddde",
];

const STONE_RAMPS = {
  limestone: ["#fff4d6", "#eadcb2", "#d6c48f", "#b09a64", "#6e5a36"],
  sandstone: ["#ffd9a0", "#f0b870", "#d9964e", "#a86a30", "#5e3a1a"],
  granite:   ["#dfe3e8", "#b3bac2", "#8f98a3", "#6a727d", "#3a3f47"],
  brick:     ["#ffa58c", "#e0664c", "#b8452f", "#86301f", "#4a170f"],
  slate:     ["#b4cadb", "#7f9bb3", "#5f7a93", "#445a70", "#232f3d"],
  marble:    ["#ffffff", "#f3f0f1", "#ddd8db", "#b9b2b8", "#6f666e"],
  mossy:     ["#dde9ae", "#b6c97a", "#8fa455", "#66773a", "#36401c"],
  gold:      ["#fff6c0", "#ffd84a", "#e0a820", "#a87410", "#5a3a08"],
  wood:      ["#f0c890", "#d09a58", "#a8733a", "#7a5024", "#452c12"],
};

for (const [name, ramp] of Object.entries(STONE_RAMPS)) {
  ART["stone_" + name] = {
    grid: STONE_PATTERN,
    colors: { a: ramp[0], b: ramp[1], c: ramp[2], d: ramp[3], e: ramp[4] },
  };
}


// ---------------------------------------------------------------------------
// The monk. Black Benedictine habit, tonsure, hands folded in the sleeves.
// ---------------------------------------------------------------------------

const MONK_COLORS = {
  K: "#1b1b24", // habit
  k: "#3a3a4a", // habit fold highlight
  s: "#eab98f", // skin
  S: "#c48a5e", // skin shadow
  h: "#5a3a22", // hair (the tonsure ring)
  e: "#2a1a10", // eyes
  b: "#0b0b10", // leather belt
  f: "#7a5230", // sandals
};

ART.monk_idle = {
  grid: [
    "......ssss......",
    ".....hssssh.....",
    ".....sesses.....",
    ".....ssSSss.....",
    "......ssss......",
    "....KKkKKkKK....",
    "...KKKKkKKKKK...",
    "...KKKKkKKKKK...",
    "..KKKKKkKKKKKK..",
    "..KKkkkssskkKK..",
    "..KKKKKkKKKKKK..",
    "..KKKbbbbbbKKK..",
    "..KKKKKkKKKKKK..",
    "..KKKKKkKKKKKK..",
    "..KKKKKkKKKKKK..",
    ".KKKKKKkKKKKKKK.",
    ".KKKKKKkKKKKKKK.",
    ".KKKKKKkKKKKKKK.",
    "KKKKKKKkKKKKKKKK",
    "KKKKKKKkKKKKKKKK",
    "...ffff..ffff...",
  ],
  colors: MONK_COLORS,
};

// Arms raised in the orans posture, used while blessing.
ART.monk_bless = {
  grid: [
    "..s...ssss...s..",
    "..K..hssssh..K..",
    "..K..sesses..K..",
    "..KK.ssSSss.KK..",
    "...K..ssss..K...",
    "...KKKKkKKKKK...",
    "...KKKKkKKKKK...",
    "...KKKKkKKKKK...",
    "..KKKKKkKKKKKK..",
    "..KKKKKkKKKKKK..",
    "..KKKKKkKKKKKK..",
    "..KKKbbbbbbKKK..",
    "..KKKKKkKKKKKK..",
    "..KKKKKkKKKKKK..",
    "..KKKKKkKKKKKK..",
    ".KKKKKKkKKKKKKK.",
    ".KKKKKKkKKKKKKK.",
    ".KKKKKKkKKKKKKK.",
    "KKKKKKKkKKKKKKKK",
    "KKKKKKKkKKKKKKKK",
    "...ffff..ffff...",
  ],
  colors: MONK_COLORS,
};

// ---------------------------------------------------------------------------
// Benedictine saints. Each is the monk above with his or her own marks: a
// nun's black veil and white wimple, a dove, a heart, a flame, a mitre, a
// tiara, water underfoot. Built from the monk's two poses, row by row.
// ---------------------------------------------------------------------------

const SAINT_COLORS = {
  V: "#0b0b10", // veil
  W: "#f4f0e8", // wimple, mitre, dove
  D: "#ffffff", // dove
  G: "#e8b94a", // gold
  R: "#d8324a", // a heart
  F: "#ffb030", // flame
  P: "#f4f0e8", // pallium
  w: "#7fc8f0", // water
};

// The head of a nun, in each pose (the blessing pose has the arms raised beside it).
const VEILED = {
  monk_idle: ["....VVVVVVVV....", "...VVWWWWWWVV...", "...VVWesseWVV...", "...VVWsSSsWVV...", "...VVWWWWWWVV..."],
  monk_bless: ["..s.VVVVVVVV.s..", "..KVVWWWWWWVVK..", "..KVVWesseWVVK..", "..KVVWsSSsWVVK..", "...KVWWWWWWVK..."],
};

function saintSprite(pose, id) {
  const base = ART[pose];
  let grid = base.grid.slice();
  const put = (row, col, str) => { const r = grid[row]; grid[row] = r.slice(0, col) + str + r.slice(col + str.length); };
  const nun = id === "scholastica" || id === "gertrude" || id === "hildegard";
  if (nun) grid.splice(0, 5, ...VEILED[pose]);
  if (id === "scholastica") {
    // The dove: her soul, which Benedict saw rise to heaven.
    grid.unshift("............DD..", "...........DDDD.");
  }
  if (id === "gertrude") {
    // The Sacred Heart, held to her breast.
    put(6, 6, "RGR"); put(7, 6, "RRR"); put(8, 7, "R");
  }
  if (id === "hildegard") {
    // A flame of the living light she saw in her visions.
    grid.unshift(".......FF.......", "......FFFF......", ".......FF.......");
  }
  if (id === "maurus") {
    // Young, and walking on the water to save Placid.
    grid.push("wwwwwwwwwwwwwwww", ".w..w..w..w..w..");
  }
  if (id === "anselm") {
    // An archbishop's mitre and the pallium of Canterbury.
    grid.unshift("......WWWW......", ".....WWGGWW.....", ".....WWGGWW.....");
    put(5 + 3, 4, "PPPPPPPP"); put(6 + 3, 7, "P"); put(7 + 3, 7, "P"); put(8 + 3, 7, "P");
  }
  if (id === "gregory") {
    // The papal tiara, and the dove of the Holy Spirit at his ear.
    grid.unshift(".......GG.......", "......WWWW......", "......GGGG......", "......WWWW.DD...", "......GGGG.DDD..");
  }
  return { grid, colors: { ...base.colors, ...SAINT_COLORS } };
}

// ---------------------------------------------------------------------------
// The demon who hovers over the building site, curses your stones and drops
// fire on the tower. He comes as each of the seven deadly sins in turn.
// Two frames: wings up, wings down.
// ---------------------------------------------------------------------------

const DEMON_COLORS = {
  m: "#3a0a14", // wing edge
  M: "#6a1a2a", // wing membrane
  o: "#2a0808", // horns and claws
  r: "#c2362b", // body edge
  R: "#8a1c1c", // body
  y: "#ffd83a", // eyes
  w: "#f5f5f5", // teeth
};

ART.demon_a = {
  grid: [
    "m..................m",
    "mm......o..o......mm",
    "mMm.....rrrr.....mMm",
    "mMMm...rRRRRr...mMMm",
    ".mMMm..RyRRyR..mMMm.",
    "..mMMmmRRRRRRmmMMm..",
    "...mMMMRowowRMMMm...",
    ".....mmmRRRRmmm.....",
    ".......rRRRRr.......",
    ".......r.RR.r.......",
    "......oo....oo......",
  ],
  colors: DEMON_COLORS,
};

ART.demon_b = {
  grid: [
    "....................",
    "........o..o........",
    "........rrrr........",
    ".......rRRRRr.......",
    ".......RyRRyR.......",
    "..mmmmmRRRRRRmmmmm..",
    ".mMMMMMRowowRMMMMMm.",
    "mMMMMm..RRRR..mMMMMm",
    "mMMm...rRRRRr...mMMm",
    "mm.....r.RR.r.....mm",
    "......oo....oo......",
  ],
  colors: DEMON_COLORS,
};

// ---------------------------------------------------------------------------
// Scenery and icons.
// ---------------------------------------------------------------------------

ART.cloud = {
  grid: [
    "........wwww............",
    "......wwwwwwww..wwww....",
    "...wwwwwwwwwwwwwwwwwww..",
    ".wwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwww",
    ".gggggggggggggggggggggg.",
  ],
  colors: { w: "#ffffff", g: "#dfe6f0" },
};

// The St. Benedict medal, used as the icon for the blessing.
ART.medal = {
  grid: [
    "....gggg....",
    "..ggGGGGgg..",
    ".gGGGyyGGGg.",
    ".gGGGyyGGGg.",
    "gGGyyyyyyGGg",
    "gGGyyyyyyGGg",
    "gGGGGyyGGGGg",
    "gGGGGyyGGGGg",
    ".gGGGyyGGGg.",
    ".gGGGyyGGGg.",
    "..ggGGGGgg..",
    "....gggg....",
  ],
  colors: { g: "#7a5410", G: "#d9a520", y: "#fff2a8" },
};

// The aspergillum, for holy water: drives the demon away.
ART.aspergillum = {
  grid: [
    "......gggg..",
    ".....gGyGGg.",
    "..d..gGGGGg.",
    ".....gGGyGg.",
    "d.....gggg..",
    ".....hh.....",
    "....hh...d..",
    "...hh.......",
    "..hh....d...",
    ".hh.........",
    "hh.....d....",
    "h...........",
  ],
  colors: { g: "#5a6068", G: "#c8d0d8", y: "#ffffff", h: "#7a5230", d: "#7fd0ff" },
};

// Spell icons.


// Zap: a bolt that breaks the last stone you laid.
ART.bolt = {
  grid: [
    "......yyyy..",
    ".....yyyy...",
    "....yyyy....",
    "...yyyy.....",
    "..yyyyyyyy..",
    ".....yyyy...",
    "....yyyy....",
    "...yyy......",
    "..yyy.......",
    "..yy........",
    ".y..........",
    "............",
  ],
  colors: { y: "#ffe45a" },
};


// A coin, for gilding and for money.
ART.coin = {
  grid: [
    "....oooo....",
    "..ooYYYYoo..",
    ".oYYyyYYYYo.",
    ".oYyyYYYYYo.",
    "oYYyYYYYYYYo",
    "oYYYYYYYYYYo",
    "oYYYYYYYYYYo",
    "oYYYYYYYYYdo",
    ".oYYYYYYYdo.",
    ".oYYYYYYddo.",
    "..ooddddoo..",
    "....oooo....",
  ],
  colors: { o: "#7a5410", Y: "#f0c030", y: "#fff4b0", d: "#c08a18" },
};

// The novice master, who keeps the shop. White beard, pectoral cross.
ART.novice_master = {
  grid: [
    "......ssss......",
    ".....hssssh.....",
    ".....sesses.....",
    ".....ssSSss.....",
    ".....bbbbbb.....",
    "....KbbbbbbK....",
    "...KKKbbbbKKK...",
    "...KKKKbbKKKK...",
    "..KKKKKgKKKKKK..",
    "..KKKKgggKKKKK..",
    "..KKKKKgKKKKKK..",
    "..KKKBBBBBBKKK..",
    "..KKKKKkKKKKKK..",
    "..KKKKKkKKKKKK..",
    "..KKKKKkKKKKKK..",
    ".KKKKKKkKKKKKKK.",
    ".KKKKKKkKKKKKKK.",
    ".KKKKKKkKKKKKKK.",
    "KKKKKKKkKKKKKKKK",
    "KKKKKKKkKKKKKKKK",
    "...ffff..ffff...",
  ],
  colors: {
    K: "#1b1b24", k: "#3a3a4a", s: "#eab98f", S: "#c48a5e", e: "#2a1a10",
    h: "#d8d8d8", b: "#f2f2f2", g: "#e0b030", B: "#0b0b10", f: "#7a5230",
  },
};

// Lives: a candle for each stone you may drop. Lit, and snuffed out.
const CANDLE_COLORS = {
  y: "#ffe070", o: "#ff8a2a", k: "#3a2a1a", w: "#f4ead0", W: "#ffffff", b: "#b08a3a", s: "#9a9aa8",
};

ART.candle_lit = {
  grid: [
    "...yy...",
    "..yyyy..",
    "..yooy..",
    "...oo...",
    "...kk...",
    ".wwwwww.",
    ".wWwwww.",
    ".wWwwww.",
    ".wWwwww.",
    ".wWwwww.",
    ".wWwwww.",
    ".wWwwww.",
    ".wWwwww.",
    ".wWwwww.",
    "bbbbbbbb",
    ".bbbbbb.",
  ],
  colors: CANDLE_COLORS,
};

ART.candle_out = {
  grid: [
    "....s...",
    "...s....",
    "....s...",
    "...s....",
    "...kk...",
    ".wwwwww.",
    ".wWwwww.",
    ".wWwwww.",
    ".wWwwww.",
    ".wWwwww.",
    ".wWwwww.",
    ".wWwwww.",
    ".wWwwww.",
    ".wWwwww.",
    "bbbbbbbb",
    ".bbbbbb.",
  ],
  colors: CANDLE_COLORS,
};

// A rosary. The shop paints the beads in wood, silver or gold.
ART.beads = {
  grid: [
    "...b.b.b....",
    ".b.......b..",
    "b.........b.",
    "............",
    "b.........b.",
    ".b.......b..",
    "...b.g.b....",
    ".....g......",
    "....ggg.....",
    ".....g......",
    ".....g......",
    "............",
  ],
  colors: { b: "#8a5a2a", g: "#e0b030" },
};

// The belfry roof that caps a finished tower.
ART.roof = {
  grid: [
    ".........gg.........",
    ".......gggggg.......",
    ".........gg.........",
    ".........gg.........",
    ".........rr.........",
    "........rRRr........",
    ".......rRRRRr.......",
    "......rRRRRRRr......",
    ".....rRRRRRRRRr.....",
    "....rRRRRRRRRRRr....",
    "...rRRRRRRRRRRRRr...",
    "..rRRRRRRRRRRRRRRr..",
    ".rRRRRRRRRRRRRRRRRr.",
    "rrrrrrrrrrrrrrrrrrrr",
    "ssssssssssssssssssss",
  ],
  colors: { g: "#f0c030", r: "#2a3448", R: "#4a5a7a", s: "#b8b0a0" },
};

// ---------------------------------------------------------------------------
// Optional: replace any sprite above with your own PNG. Put the file in
// benedictine-bricks/img/ and add a line such as
//     monk_idle: "img/monk.png",
// The PNG is drawn at the same size on screen as the sprite it replaces,
// so draw it at the same proportions (or send it to Claude to resize).
// ---------------------------------------------------------------------------

const IMAGE_OVERRIDES = {
};

// Turn a character grid into a small canvas, one canvas pixel per character.
function renderSprite(sprite) {
  const h = sprite.grid.length;
  const w = sprite.grid[0].length;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  for (let y = 0; y < h; y++) {
    const row = sprite.grid[y];
    if (row.length !== w) {
      console.warn("Sprite row " + y + " is " + row.length + " wide, expected " + w);
    }
    for (let x = 0; x < row.length; x++) {
      const color = sprite.colors[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

// Build every sprite. Calls `done(images)` once any PNG overrides have loaded.
function loadArt(done) {
  const images = {};
  for (const [name, sprite] of Object.entries(ART)) {
    images[name] = renderSprite(sprite);
  }
  const overrides = Object.entries(IMAGE_OVERRIDES);
  let pending = overrides.length;
  if (pending === 0) return done(images);
  for (const [name, src] of overrides) {
    const img = new Image();
    const finish = () => { if (--pending === 0) done(images); };
    img.onload = () => {
      // Keep the on-screen size of the original sprite.
      const original = images[name];
      img.artWidth = original ? original.width : img.width;
      img.artHeight = original ? original.height : img.height;
      images[name] = img;
      finish();
    };
    img.onerror = () => { console.warn("Could not load " + src); finish(); };
    img.src = src;
  }
}
