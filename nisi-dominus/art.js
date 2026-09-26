// Nisi Dominus — pixel art.
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
};

for (const [name, ramp] of Object.entries(STONE_RAMPS)) {
  ART["stone_" + name] = {
    grid: STONE_PATTERN,
    colors: { a: ramp[0], b: ramp[1], c: ramp[2], d: ramp[3], e: ramp[4] },
  };
}

// Drawn over a stone once it has been blessed: a gold rim and a small cross.
ART.blessed = {
  grid: [
    "yyyyyyyyyyyy",
    "y..........y",
    "y..........y",
    "y....gg....y",
    "y....gg....y",
    "y..gggggg..y",
    "y..gggggg..y",
    "y....gg....y",
    "y....gg....y",
    "y..........y",
    "y..........y",
    "yyyyyyyyyyyy",
  ],
  colors: { y: "#ffd84a", g: "#fff3b0" },
};

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
// The imp who sits on a stone and makes it heavy (Gregory, Dialogues II.9).
// ---------------------------------------------------------------------------

const IMP_COLORS = {
  o: "#2a0808", // horns and claws
  r: "#c2362b", // body edge
  R: "#8a1c1c", // body
  y: "#ffd83a", // eyes
  w: "#f5f5f5", // teeth
};

ART.imp_a = {
  grid: [
    "o..........o",
    "ro........ro",
    ".rr......rr.",
    "..rRRRRRRr..",
    ".rRyoRRyoRr.",
    ".rRRRRRRRRr.",
    ".rRowowowRr.",
    "..rRRRRRRr..",
    ".r.rRRRRr.r.",
    "...rr..rr...",
  ],
  colors: IMP_COLORS,
};

ART.imp_b = {
  grid: [
    "o..........o",
    "ro........ro",
    ".rr......rr.",
    "..rRRRRRRr..",
    ".rRoyRRoyRr.",
    ".rRRRRRRRRr.",
    ".rRRowowRRr.",
    "r.rRRRRRRr.r",
    "...rRRRRr...",
    "...rr..rr...",
  ],
  colors: IMP_COLORS,
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

// A small bell, shown while the tower is being held at the goal.
ART.bell = {
  grid: [
    ".....oo.....",
    "....oGGo....",
    "...oGGGGo...",
    "..oGGyGGGo..",
    "..oGGyGGGo..",
    "..oGGGGGGo..",
    ".oGGGGGGGGo.",
    ".oGGGGGGGGo.",
    "oooooooooooo",
    ".....oo.....",
  ],
  colors: { o: "#5a3a08", G: "#e0b030", y: "#fff2a8" },
};

// ---------------------------------------------------------------------------
// Optional: replace any sprite above with your own PNG. Put the file in
// nisi-dominus/img/ and add a line such as
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
