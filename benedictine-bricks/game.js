// Benedictine Bricks — a stacking game in the style of 99 Bricks Wizard Academy.
// Build the tower as high as you can. When your candles are out, a roof caps the tower.
// Physics by Matter.js (lib/matter.min.js). Art in art.js.

const { Engine, Bodies, Body, Composite, Events, Sleeping } = Matter;

// ---------------------------------------------------------------------------
// Tuning. Most of the "feel" of the game lives in these numbers.
// ---------------------------------------------------------------------------

const VIEW_W = 720;          // logical screen width, in world pixels (30 stones)
const MIN_VIEW_H = 1000;     // taller screens show more sky above
let VIEW_H = MIN_VIEW_H;
const PX = 2;                // one art pixel = 2 world pixels, for stones and scenery
const FIGURE_PX = 3;         // the monk and the demon are drawn a little larger
const ROOF_PX = 4;           // and the roof that caps a finished tower, larger still
const TILE = 12 * PX;        // one stone square; also one cubit of height
const FOUND_Y = MIN_VIEW_H - 330;  // top of the monastery, where you build
const GROUND_Y = FOUND_Y + 12.5 * TILE;  // the ground the monastery stands on
const TOWER_TOP_AT = 0.55;   // where the top of the tower sits on screen (0 top, 1 bottom)

const TIER_CUBITS = 10;      // every 10 cubits the tower below sets solid
const FALL_SPEED = 1.0;      // world pixels per physics step, at the start
const FALL_SPEED_PER_TIER = 0.2;  // a little faster at each new tier
const MAX_FALL_SPEED = 2.6;
const MAX_DROP_SPEED = 6;
// Forgiveness: each square's solid body is a little smaller than its picture,
// with rounded corners, so stones slip into gaps instead of catching on them.
const INSET = 1.2;            // pixels trimmed from each side of a square
const CORNER = 3;             // corner rounding, in pixels
const MAGNET = 6;             // a stone this close to lining up with an edge snaps to it
const LANDING_DAMPING = 0.12; // share of speed a stone keeps when it lands

const PRAYER_PER_STONE = 1;
const PRAYER_PER_TIER = 3;
const PRAYER_FROM_BUBBLE = 4;

const SPELLS = {
  repel:    { icon: "aspergillum", cost: 4, name: "Holy water", key: "h" },
  zap:      { icon: "bolt",        cost: 3, name: "Zap",        key: "z" },
  mortar:   { icon: "mortar",      cost: 3, name: "Mortar",     key: "c" },
  scaffold: { icon: "scaffold",    cost: 5, name: "Scaffold",   key: "s" },
  gild:     { icon: "coin",        cost: 2, name: "Gild",       key: "g" },
};
const BUBBLE_EVERY = [16, 28];     // seconds between bubbles (min, max)
const GOLD_BONUS = 10;             // coins for a gilded stone

const DEMON_FIRST_AT = 5;          // cubits of height before his first visit
const DEMON_AWAY = [18, 32];       // seconds between visits (min, max)
const DEMON_CURSES = 3;            // curses per visit
const CURSE_CHANCE = 0.45;         // chance he curses each new stone while here
const HASTE_FACTOR = 2.6;
const HUGE_FACTOR = 1.5;

// Stone is heavy: strong gravity and almost no air drag, so a stone that
// tips falls hard instead of drifting down like foam.
const GRAVITY = 2.4;
const STONE = { density: 0.004, friction: 0.9, frictionStatic: 1.6, frictionAir: 0.004, restitution: 0, slop: 0.02 };
const ICE = { density: 0.004, friction: 0.02, frictionStatic: 0.04, frictionAir: 0.004, restitution: 0, slop: 0.02 };

// The seven shapes, as square offsets, each with its own kind of stone.
const SHAPES = [
  { tex: "stone_limestone", cells: [[-1.5, 0], [-0.5, 0], [0.5, 0], [1.5, 0]] }, // I
  { tex: "stone_slate",     cells: [[-1, -0.5], [0, -0.5], [1, -0.5], [1, 0.5]] }, // J
  { tex: "stone_sandstone", cells: [[-1, -0.5], [0, -0.5], [1, -0.5], [-1, 0.5]] }, // L
  { tex: "stone_marble",    cells: [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]] }, // O
  { tex: "stone_mossy",     cells: [[0, -0.5], [1, -0.5], [-1, 0.5], [0, 0.5]] }, // S
  { tex: "stone_granite",   cells: [[-1, -0.5], [0, -0.5], [1, -0.5], [0, 0.5]] }, // T
  { tex: "stone_brick",     cells: [[-1, -0.5], [0, -0.5], [0, 0.5], [1, 0.5]] }, // Z
];

// ---------------------------------------------------------------------------
// The shop: upgrades with levels, rosaries (each starts a tower with a spell),
// and habits.
// ---------------------------------------------------------------------------

const PRAYER_BY_LEVEL = [10, 13, 16, 20];
const FOUNDATION_BY_LEVEL = [7, 9, 11];
const MORTAR_COST_BY_LEVEL = [4, 3, 2];
const MORTAR_PER_BUBBLE = 2;       // uses of Mortar in each mortar bubble
const MORTAR_FROM_ROSARY = 1;      // uses at the start, with the olive-wood rosary

const UPGRADES = [
  { id: "prayerLevel", name: "Deeper prayer", icon: "beads", now: (l) => "You hold " + PRAYER_BY_LEVEL[l] + " prayer.",
    levels: [
      { price: 150, text: "Hold 13 prayer." },
      { price: 350, text: "Hold 16 prayer." },
      { price: 700, text: "Hold 20 prayer." },
    ] },
  { id: "candle", name: "A fourth candle", icon: "candle_lit", now: (l) => "You have " + (3 + l) + " candles.",
    levels: [{ price: 500, text: "Drop four stones before the tower is finished, instead of three." }] },
  { id: "trowel", name: "Mason's trowel", icon: "mortar", now: (l) => "Mortar costs " + MORTAR_COST_BY_LEVEL[l] + " prayer.",
    levels: [
      { price: 250, text: "Mortar costs 3 prayer." },
      { price: 600, text: "Mortar costs 2 prayer." },
    ] },
  { id: "foundation", name: "Wider foundation", icon: "stone_granite", now: (l) => "Your foundation is " + FOUNDATION_BY_LEVEL[l] + " stones wide.",
    levels: [
      { price: 300, text: "The cloister foundation, 9 stones wide." },
      { price: 900, text: "Monte Cassino, 11 stones wide." },
    ] },
  { id: "medal", name: "St. Benedict medal", icon: "medal", now: (l) => (l ? "The demon comes half as often." : "The demon visits often."),
    levels: [{ price: 400, text: "The demon comes half as often. Vade retro, Satana." }] },
];

const ROSARIES = [
  { id: "boxwood", name: "Boxwood rosary", price: 0, beads: "#d8b878", spell: null, text: "A plain rosary. Your towers start with no spell." },
  { id: "olive", name: "Olive-wood rosary", price: 200, beads: "#7a8a3a", spell: "mortar", text: "Every tower starts with one use of Mortar." },
  { id: "silver", name: "Silver rosary", price: 450, beads: "#c8d0d8", spell: "scaffold", text: "Every tower starts with Scaffold." },
  { id: "gold", name: "Gold rosary", price: 700, beads: "#f0c030", spell: "gild", text: "Every tower starts with Gild." },
];

const HABITS = [
  { id: "black", name: "Benedictine black", price: 0, colors: {}, text: "The black habit of the Order of St. Benedict." },
  { id: "white", name: "Olivetan white", price: 150, colors: { K: "#e9e6dc", k: "#bdb8aa" }, text: "The white habit of the Olivetan Benedictines." },
  { id: "blue", name: "Sylvestrine blue", price: 150, colors: { K: "#1f2f5a", k: "#3a4f86" }, text: "The blue habit of the Sylvestrine Benedictines." },
];

// ---------------------------------------------------------------------------
// The monasteries. Each is a world with its own building to build on, its own
// spells and curses, and ten missions shown three at a time. Every mission
// done earns a star; five stars open the next monastery. The rank is the step
// of monastic formation that the monastery stands for.
// A base is a list of solid tops: x is the left edge in stones from the
// centre, w the width in stones, and drop how far below the top it starts.
// ---------------------------------------------------------------------------

const STARS_TO_OPEN = 5;

const WORLDS = [
  {
    id: "stbernard", name: "St. Bernard Abbey", rank: "Postulant",
    about: "The abbey church at Cullman, Alabama: a great square block of sandstone quarried on the monks' own land.",
    base: [{ x: -4, w: 8 }],
    spells: ["mortar"],
    curses: ["ice"],
  },
  {
    id: "subiaco", name: "Subiaco", rank: "Novice",
    about: "The Sacro Speco, built into the cliff around the cave where St. Benedict lived as a hermit.",
    base: [{ x: -3.5, w: 7 }],
    spells: ["mortar", "scaffold"],
    curses: ["ice", "huge"],
  },
  {
    id: "montecassino", name: "Monte Cassino", rank: "Simple Vows",
    about: "St. Benedict's abbey on the mountain, where he wrote the Rule. Mind the cloister between the wings.",
    base: [{ x: -5.5, w: 4 }, { x: 1.5, w: 4 }],
    spells: ["mortar", "scaffold"],
    curses: ["ice", "huge"],
  },
  {
    id: "cluny", name: "Cluny", rank: "Solemn Profession",
    about: "The great abbey of Burgundy. Of its church, one octagonal bell tower still stands.",
    base: [{ x: -2.5, w: 5 }],
    spells: ["mortar", "scaffold", "gild"],
    curses: ["ice", "huge", "invisible"],
  },
  {
    id: "melk", name: "Melk", rank: "Cellarer",
    about: "The Baroque abbey on its rock above the Danube, with green domes on its towers.",
    base: [{ x: -4, w: 8 }],
    spells: ["mortar", "scaffold", "gild"],
    curses: ["ice", "huge", "invisible", "haste"],
  },
  {
    id: "montsaintmichel", name: "Mont-Saint-Michel", rank: "Prior",
    about: "The abbey on its rock in the bay of Normandy, under the spire of St. Michael.",
    base: [{ x: -2, w: 4 }],
    spells: ["mortar", "scaffold", "gild"],
    curses: ["ice", "huge", "invisible", "haste", "tumble"],
  },
  {
    id: "montserrat", name: "Montserrat", rank: "Abbot",
    about: "The abbey among the saw-toothed peaks of Catalonia, home of the Black Madonna.",
    base: [{ x: -5, w: 3, drop: 1 }, { x: -2, w: 6 }],
    spells: ["mortar", "scaffold", "gild"],
    curses: ["ice", "huge", "invisible", "haste", "tumble"],
  },
];

// Ten missions for each monastery, harder at each one, in a fixed shuffled order.
function makeMissions(world, level) {
  const H = 10 + 4 * level;
  const times = (n) => (n === 1 ? "once" : n === 2 ? "twice" : n + " times");
  const half = Math.round(H * 0.5);
  const pool = [
    { key: "height", text: "Reach " + H + " cubits", check: (s) => s.height >= H },
    { key: "laid", text: "Lay " + (20 + 5 * level) + " stones in one tower", check: (s) => s.laid >= 20 + 5 * level },
    { key: "repel", text: "Drive off the demon " + times(1 + Math.floor(level / 2)) + " in one tower", check: (s) => s.repelled >= 1 + Math.floor(level / 2) },
    { key: "noturn", text: "Reach " + half + " cubits without turning a stone", check: (s) => s.heightNoTurn >= half },
    { key: "noloss", text: "Reach " + Math.round(H * 0.6) + " cubits without dropping a stone", check: (s) => s.heightNoLoss >= Math.round(H * 0.6) },
    { key: "coins", text: "Earn " + (60 + 40 * level) + " coins in one tower", check: (s) => s.earned >= 60 + 40 * level },
    { key: "bubbles", text: "Catch " + (1 + Math.floor(level / 2)) + " bubble" + (level >= 2 ? "s" : "") + " in one tower", check: (s) => s.bubbles >= 1 + Math.floor(level / 2) },
    level === 0 ? { key: "mortar", text: "Use Mortar in a tower", check: (s) => s.mortars >= 1 }
      : level <= 2 ? { key: "scaffold", text: "Use Scaffold twice in one tower", check: (s) => s.scaffolds >= 2 }
      : { key: "gold", text: "Build a tower with " + (level - 1) + " gold stones", check: (s) => s.golds >= level - 1 },
    { key: "noprayer", text: "Reach " + half + " cubits without using prayer", check: (s) => s.heightNoPrayer >= half },
    { key: "cursed", text: "Lay " + (2 + level) + " cursed stones on one tower", check: (s) => s.cursedLanded >= 2 + level },
  ];
  // Shuffle with a fixed seed, so each monastery keeps the same order.
  let seed = 7 + level * 31;
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.map((m) => ({ ...m, id: world.id + "-" + m.key }));
}

WORLDS.forEach((w, i) => { w.missions = makeMissions(w, i); });

function starsIn(world) {
  return world.missions.filter((m) => save.missions[m.id]).length;
}

function worldOpen(index) {
  return index === 0 || starsIn(WORLDS[index - 1]) >= STARS_TO_OPEN;
}

// The three missions on offer. Done ones drop off and are replaced by
// missions drawn at random from those not yet done.
function currentMissions(world) {
  const byId = Object.fromEntries(world.missions.map((m) => [m.id, m]));
  let active = (save.active[world.id] || []).filter((id) => byId[id] && !save.missions[id]);
  const rest = world.missions.filter((m) => !save.missions[m.id] && !active.includes(m.id));
  while (active.length < 3 && rest.length) {
    active.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0].id);
  }
  save.active[world.id] = active;
  writeSave();
  return active.map((id) => byId[id]);
}

// ---------------------------------------------------------------------------
// Saved progress (coins, best height, what you own). Stored on this device only.
// ---------------------------------------------------------------------------

const SAVE_KEY = "benedictine-bricks";
const save = loadSave();

function loadSave() {
  const fresh = {
    coins: 0, best: 0, prayerLevel: 0, candle: 0, trowel: 0, foundation: 0, medal: 0,
    rosaries: ["boxwood"], rosary: "boxwood", habits: ["black"], habit: "black",
    missions: {}, active: {}, world: "stbernard", bests: {}, music: "both",
  };
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) { /* no storage */ }
  // An earlier version kept one rosary tier as a number.
  if (typeof stored.rosary === "number") {
    const tier = stored.rosary;
    stored.prayerLevel = tier;
    stored.rosaries = ROSARIES.slice(0, tier + 1).map((r) => r.id);
    stored.rosary = stored.rosaries[stored.rosaries.length - 1];
  }
  return Object.assign(fresh, stored);
}

function writeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* no storage */ }
}

// ---------------------------------------------------------------------------
// State for the tower being built
// ---------------------------------------------------------------------------

let images;
let engine;
let world = WORLDS[0];
let missionsNow = [];     // the three missions on offer for this tower
let foundRects = [];      // the foundation's pillars, in world pixels
let stats = {};           // what has happened on this tower, for the missions
let finale = null;        // the roof coming down and the camera pulling back
let zoom = 1;
let focusY = 0;
let lives = 3;
let active = null;        // the stone being steered or dropped
let steering = false;     // true while the player controls the falling stone
let activeSpeed = FALL_SPEED;
let targetAngle = 0;
let landed = [];          // stones that have been laid, oldest first
let planks = [];          // scaffold platforms
let nextShape;
let pending = null;       // "mortar" or "gild", waiting for the next stone
let lost = 0;
let prayer = 0;
let prayerMax = 10;
let known = new Set();    // spells learned this tower
let mortarCharges = 0;    // Mortar is limited: each use needs one of these
let tier = 0;
let multiplier = 1;
let earned = 0;           // coins earned on this tower
let height = 0;           // height of the standing tower, in cubits
let spawnTimer = 0;
let endTimer = 0;
let bubbleTimer = 0;
let bubble = null;
let banner = null;
let tierPopup = null;
let camY = 0;
let towerTop = FOUND_Y;
let mode = "title";       // title | play | paused | over | shop
let time = 0;
let blessAnim = 0;
let effects = [];

const demon = {
  present: false,
  fleeing: 0,             // > 0 while flying off; 99 while the holy water is on its way
  timer: 0,
  curses: 0,
  x: VIEW_W / 2,
  y: 0,
};

const $ = (id) => document.getElementById(id);
const canvas = $("game");
const ctx = canvas.getContext("2d");
let scale = 1;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function spellCost(name) {
  return name === "mortar" ? MORTAR_COST_BY_LEVEL[save.trowel] : SPELLS[name].cost;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function newTower() {
  engine = Engine.create({ enableSleeping: true });
  engine.positionIterations = 20;
  engine.velocityIterations = 14;
  engine.gravity.y = GRAVITY;

  world = WORLDS.find((w) => w.id === save.world) || WORLDS[0];
  missionsNow = currentMissions(world);
  // A wider foundation (from the shop) widens the outer pillars outward.
  const extra = (FOUNDATION_BY_LEVEL[save.foundation] - FOUNDATION_BY_LEVEL[0]) / 2;
  foundRects = world.base.map((b, i) => {
    let left = b.x;
    let w = b.w;
    if (i === 0) { left -= extra; w += extra; }
    if (i === world.base.length - 1) w += extra;
    return { x: VIEW_W / 2 + left * TILE, w: w * TILE, top: FOUND_Y + (b.drop || 0) * TILE };
  });
  for (const r of foundRects) {
    Composite.add(engine.world, Bodies.rectangle(r.x + r.w / 2, r.top + 200, r.w, 400, {
      isStatic: true,
      friction: 1,
      frictionStatic: 1.5,
      label: "foundation",
    }));
  }

  Events.on(engine, "collisionStart", (event) => {
    if (!active) return;
    for (const pair of event.pairs) {
      const a = pair.bodyA.parent;
      const b = pair.bodyB.parent;
      if ((a === active && b !== active) || (b === active && a !== active)) {
        land();
        return;
      }
    }
  });

  paintMonk();
  active = null;
  steering = false;
  landed = [];
  planks = [];
  pending = null;
  lost = 0;
  lives = 3 + save.candle;
  prayer = 0;
  prayerMax = PRAYER_BY_LEVEL[save.prayerLevel];
  const rosary = ROSARIES.find((r) => r.id === save.rosary) || ROSARIES[0];
  known = new Set(rosary.spell ? [rosary.spell] : []);
  mortarCharges = rosary.spell === "mortar" ? MORTAR_FROM_ROSARY : 0;
  stats = {
    height: 0, laid: 0, repelled: 0, bubbles: 0, rotations: 0, mortars: 0, scaffolds: 0, golds: 0,
    cursedLanded: 0, spellsUsed: 0, earned: 0, heightNoTurn: 0, heightNoLoss: 0, heightNoPrayer: 0,
  };
  finale = null;
  zoom = 1;
  dayClock = 0;
  hourIndex = 0;
  Sound.startMusic(HOURS[0].chant);
  Sound.setChant(HOURS[0].chant);
  Sound.setIntensity(0);
  tier = 0;
  multiplier = 1;
  earned = 0;
  height = 0;
  spawnTimer = 0.6;
  endTimer = 0;
  bubbleTimer = rand(8, 14);
  bubble = null;
  banner = null;
  tierPopup = null;
  towerTop = FOUND_Y;
  camY = cameraTarget();
  effects = [];
  demon.present = false;
  demon.fleeing = 0;
  demon.timer = 0;
  nextShape = randomShape();
  mode = "play";
  hideScreens();
  buildCandles();
  drawNextPreview();
  updateHud();
}

// Paint the monk in the habit he wears.
function paintMonk() {
  const habit = HABITS.find((h) => h.id === save.habit) || HABITS[0];
  for (const pose of ["monk_idle", "monk_bless"]) {
    images[pose] = renderSprite({ grid: ART[pose].grid, colors: { ...ART[pose].colors, ...habit.colors } });
  }
}

function randomShape() {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)];
}

function spawn() {
  const shape = nextShape;
  nextShape = randomShape();
  drawNextPreview();

  // The demon may curse this stone.
  let curse = null;
  if (demon.present && !demon.fleeing && demon.curses > 0 && !pending && Math.random() < CURSE_CHANCE) {
    curse = world.curses[Math.floor(Math.random() * world.curses.length)];
    demon.curses--;
  }

  const tile = curse === "huge" ? TILE * HUGE_FACTOR : TILE;
  const x = VIEW_W / 2;
  // Start well above the tower, but not so far that the wait is tedious.
  const y = Math.max(camY + VIEW_H * 0.12, towerTop - 380);
  const material = curse === "ice" ? ICE : STONE;
  const parts = shape.cells.map(([cx, cy]) =>
    Bodies.rectangle(x + cx * tile, y + cy * tile, tile - 2 * INSET, tile - 2 * INSET, { ...material, chamfer: { radius: CORNER } })
  );
  const body = Body.create({ parts, ...material });
  body.plugin.kind = "stone";
  body.plugin.tex = curse === "ice" ? "stone_ice" : shape.tex;
  body.plugin.tile = tile;
  body.plugin.curse = curse;
  Composite.add(engine.world, body);

  active = body;
  steering = true;
  targetAngle = 0;
  activeSpeed = Math.min(MAX_FALL_SPEED, FALL_SPEED + tier * FALL_SPEED_PER_TIER);
  if (curse === "haste") activeSpeed *= HASTE_FACTOR;
  snapToSupport();
  if (curse === "tumble") {
    // The stone breaks free and tumbles down on its own.
    steering = false;
    Body.setVelocity(body, { x: rand(-2, 2), y: 1 });
    Body.setAngularVelocity(body, rand(-0.12, 0.12));
  }
  if (pending) {
    enchant(body, pending);
    pending = null;
  }
  if (curse) {
    Sound.play("curse");
    effects.push(makeBolt(demon.x, demon.y + 10, body.position.x, body.position.y, "#ff4a3a", "#ffd0f0"));
    effects.push({ kind: "flash", x: body.position.x, y: body.position.y, t: 0.4, color: "#ff6a5a" });
  }
  updateHud();
}

// Turn a stone into mortar (sets fast on touch) or gold (worth extra coins).
function enchant(body, spell) {
  if (spell === "mortar") {
    body.plugin.mortar = true;
    body.plugin.tex = "stone_mortar";
  } else if (spell === "gild") {
    body.plugin.gold = true;
    body.plugin.tex = "stone_gold";
  }
  effects.push({ kind: "flash", x: body.position.x, y: body.position.y, t: 0.5, color: "#fff2a8" });
}

function land() {
  const body = active;
  active = null;
  steering = false;
  // Soak up most of the impact so stones settle instead of bouncing.
  Body.setVelocity(body, { x: body.velocity.x * LANDING_DAMPING, y: body.velocity.y * LANDING_DAMPING });
  Body.setAngularVelocity(body, body.angularVelocity * LANDING_DAMPING);
  if (body.plugin.mortar) {
    Body.setStatic(body, true);
    effects.push({ kind: "flash", x: body.position.x, y: body.position.y, t: 0.6, color: "#ffffff" });
    Sound.play("mortar");
  } else {
    Sound.play("land", (body.plugin.tile || TILE) / TILE);
  }
  let coins = 1;
  if (body.plugin.gold) coins += GOLD_BONUS;
  earned += coins * multiplier;
  stats.earned = earned;
  stats.laid++;
  if (body.plugin.gold) stats.golds++;
  if (body.plugin.curse) stats.cursedLanded++;
  landed.push(body);
  prayer = Math.min(prayerMax, prayer + PRAYER_PER_STONE);
  spawnTimer = 0.35;
  updateHud();
}

// ---------------------------------------------------------------------------
// Player actions
// ---------------------------------------------------------------------------

function move(dir) {
  if (mode !== "play" || !active || !steering) return;
  const half = TILE / 2;
  const before = { x: active.position.x, y: active.position.y };
  const x = Math.max(half, Math.min(VIEW_W - half, active.position.x + dir * half));
  Body.setPosition(active, { x, y: active.position.y });
  snapToSupport();
  // Stones are solid: a steered stone cannot be pushed into the tower, which
  // would fling the stones it overlaps.
  if (overlapsTower()) Body.setPosition(active, before);
}

function rotate() {
  if (mode !== "play" || !active || !steering) return;
  const before = { x: active.position.x, y: active.position.y };
  targetAngle += Math.PI / 2;
  Body.setAngle(active, targetAngle);
  snapToSupport();
  if (overlapsTower()) {
    targetAngle -= Math.PI / 2;
    Body.setAngle(active, targetAngle);
    Body.setPosition(active, before);
    return;
  }
  stats.rotations++;
  Sound.play("rotate");
}

// Test each square of the steered stone, not its outline, so an L can tuck
// under an overhang.
function overlapsTower() {
  const others = Composite.allBodies(engine.world).filter((b) => b !== active);
  const squares = active.parts.length > 1 ? active.parts.slice(1) : [active];
  return squares.some((sq) => Matter.Query.collides(sq, others).some((c) => (c.collided !== false) && c.depth > 2));
}

// Line the falling stone up with whatever it would land on: its edges sit
// either flush with the stone below or exactly half a stone over, even when
// the tower underneath has shifted off the grid.
function snapToSupport() {
  const half = TILE / 2;
  const minX = active.bounds.min.x;
  const maxX = active.bounds.max.x;
  let origin = null;
  let top = Infinity;
  for (const b of landed.concat(planks)) {
    if (b.bounds.max.x <= minX || b.bounds.min.x >= maxX) continue;
    if (b.bounds.min.y < active.bounds.max.y - 2 || b.bounds.min.y >= top) continue;
    top = b.bounds.min.y;
    const turn = ((b.angle % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
    const square = turn < 0.08 || turn > Math.PI / 2 - 0.08;
    origin = square ? b.bounds.min.x - (b.plugin.kind === "stone" ? 0 : -INSET) : null;
  }
  if (origin === null) {
    for (const r of foundRects) {
      if (r.x + r.w > minX && r.x < maxX && r.top < top) { top = r.top; origin = r.x + INSET; }
    }
  }
  if (origin === null) origin = VIEW_W / 2 + INSET;
  const snapped = origin + Math.round((minX - origin) / half) * half;
  Body.setPosition(active, { x: active.position.x + (snapped - minX), y: active.position.y });
  magnetToEdges();
}

// If a square of the falling stone is within a few pixels of lining up with
// the edge of a square below it (the side of a gap, or the stone beneath),
// close the difference so it drops cleanly into place.
function magnetToEdges() {
  const squares = active.parts.length > 1 ? active.parts.slice(1) : [active];
  const edges = (b) => [b.bounds.min.x - INSET, b.bounds.max.x + INSET];
  const mine = squares.flatMap(edges);
  const bottom = active.bounds.max.y;
  const theirs = [];
  for (const b of landed) {
    const turn = ((b.angle % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
    if (turn > 0.08 && turn < Math.PI / 2 - 0.08) continue;
    if (b.bounds.min.y < bottom - 2 || b.bounds.min.y > bottom + 4 * TILE) continue;
    if (b.bounds.max.x < active.bounds.min.x - TILE || b.bounds.min.x > active.bounds.max.x + TILE) continue;
    for (const sq of b.parts.length > 1 ? b.parts.slice(1) : [b]) theirs.push(...edges(sq));
  }
  for (const r of foundRects) theirs.push(r.x, r.x + r.w);
  let best = 0;
  for (const a of mine) {
    for (const e of theirs) {
      const d = e - a;
      if (Math.abs(d) > 0.3 && Math.abs(d) <= MAGNET && (!best || Math.abs(d) < Math.abs(best))) best = d;
    }
  }
  if (!best) return;
  Body.setPosition(active, { x: active.position.x + best, y: active.position.y });
  if (overlapsTower()) Body.setPosition(active, { x: active.position.x - best, y: active.position.y });
}

function drop() {
  if (mode !== "play" || !active || !steering) return;
  steering = false;
  Body.setVelocity(active, { x: 0, y: MAX_DROP_SPEED });
  Sound.play("drop");
}

function canCast(name) {
  if (mode !== "play" || prayer < spellCost(name)) return false;
  if (name === "repel") return demon.present && !demon.fleeing;
  if (name === "zap") return !!lastLaid();
  if (name === "mortar") return mortarCharges > 0;
  return known.has(name);
}

function cast(name) {
  if (!canCast(name)) return;
  prayer -= spellCost(name);
  stats.spellsUsed++;
  if (name === "mortar") { stats.mortars++; mortarCharges--; }
  if (name === "scaffold") stats.scaffolds++;
  if (name === "repel") repel();
  else if (name === "zap") zap();
  else if (name === "scaffold") scaffold();
  else if (active && steering && !active.plugin.mortar && !active.plugin.gold) enchant(active, name);
  else pending = name;
  drawNextPreview();
  updateHud();
}

// Holy water: the monk sprinkles the demon and he flees for a while.
function repel() {
  demon.fleeing = 99; // he is hit when the spray arrives; see updateEffects
  effects.push({ kind: "spray", from: monkHands(), t: 0, duration: 0.45 });
  Sound.play("repel");
  blessAnim = 1;
}

// Zap: a bolt from heaven breaks the last stone laid.
function zap() {
  const body = lastLaid();
  const x = body.position.x;
  const y = body.position.y;
  Sound.play("zap");
  effects.push(makeBolt(x + rand(-30, 30), camY - 10, x, y, "#ffe45a", "#ffffff"));
  effects.push({ kind: "flash", x, y, t: 0.5, color: "#ffffff" });
  for (let i = 0; i < 16; i++) {
    effects.push({
      kind: "chip",
      tex: body.plugin.tex,
      x: x + rand(-TILE, TILE),
      y: y + rand(-TILE, TILE),
      vx: rand(-90, 90),
      vy: rand(-160, -20),
      t: rand(0.6, 1),
    });
  }
  Composite.remove(engine.world, body);
  landed = landed.filter((b) => b !== body);
  // Wake the stones around it so the tower settles again.
  for (const b of landed) if (!b.isStatic) Sleeping.set(b, false);
}

// Scaffold: a wooden platform level with the top of the tower, under the
// falling stone, so you can build out to the side.
function scaffold() {
  const x = active ? active.position.x : VIEW_W / 2;
  const y = towerTop - TILE / 4 - 2;
  const plank = Bodies.rectangle(x, y, 4 * TILE, TILE / 2, { isStatic: true, friction: 1, frictionStatic: 1.5 });
  plank.plugin.kind = "plank";
  Composite.add(engine.world, plank);
  planks.push(plank);
  effects.push({ kind: "flash", x, y, t: 0.5, color: "#fff2a8" });
}

function lastLaid() {
  for (let i = landed.length - 1; i >= 0; i--) {
    if (Composite.get(engine.world, landed[i].id, "body")) return landed[i];
  }
  return null;
}

function togglePause() {
  if (mode === "play") {
    mode = "paused";
    showOverlay("Pausa", "The work waits for you.", ["Resume", () => { mode = "play"; hideScreens(); }]);
  } else if (mode === "paused") {
    mode = "play";
    hideScreens();
  }
}

// A tap on the play area: catch a bubble, sprinkle the demon, or turn the stone.
function tapAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) / scale;
  const y = (clientY - rect.top) / scale + camY;
  if (bubble && Math.hypot(x - bubble.x, y - bubble.y) < 56) return catchBubble();
  if (demon.present && !demon.fleeing && Math.hypot(x - demon.x, y - demon.y) < 56) {
    if (canCast("repel")) cast("repel");
    else flashBanner("Not enough prayer");
    return;
  }
  rotate();
}

function catchBubble() {
  const spell = bubble.spell;
  effects.push({ kind: "flash", x: bubble.x, y: bubble.y, t: 0.5, color: "#bfe8ff" });
  Sound.play("bubble");
  if (spell === "prayer") {
    prayer = Math.min(prayerMax, prayer + PRAYER_FROM_BUBBLE);
    flashBanner("+" + PRAYER_FROM_BUBBLE + " prayer");
  } else if (spell === "mortar") {
    known.add(spell);
    mortarCharges += MORTAR_PER_BUBBLE;
    flashBanner("Mortar +" + MORTAR_PER_BUBBLE);
  } else {
    known.add(spell);
    flashBanner(SPELLS[spell].name + " learned");
  }
  stats.bubbles++;
  bubble = null;
  updateHud();
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

const STEP = 1000 / 60;
let accumulator = 0;
let lastTime = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000 || 0);
  lastTime = now;
  time += dt;
  if (mode === "play") {
    accumulator += dt * 1000;
    while (accumulator >= STEP) {
      physicsStep();
      accumulator -= STEP;
    }
    gameLogic(dt);
    updateHours(dt);
    updateEffects(dt);
  } else if (mode === "finale") {
    updateFinale(dt);
    updateEffects(dt);
  }
  if (engine) draw();
  requestAnimationFrame(frame);
}

function physicsStep() {
  if (active && steering) {
    // The steered stone falls at a steady speed and does not spin.
    Body.setAngle(active, targetAngle);
    Body.setAngularVelocity(active, 0);
    Body.setVelocity(active, { x: 0, y: activeSpeed });
  } else if (active && active.velocity.y > MAX_DROP_SPEED) {
    // A dropped stone falls fast, but not so fast that it bounces off.
    Body.setVelocity(active, { x: active.velocity.x, y: MAX_DROP_SPEED });
  }
  // Settle small jiggles in stones that have landed, so they sit still instead
  // of bouncing and creeping; real tumbles are far faster than this and pass.
  for (const b of landed) {
    if (b.isStatic || b.isSleeping) continue;
    if (b.speed < 0.6 && Math.abs(b.angularVelocity) < 0.012) {
      Body.setVelocity(b, { x: b.velocity.x * 0.8, y: b.velocity.y * 0.8 });
      Body.setAngularVelocity(b, b.angularVelocity * 0.8);
    }
  }
  Engine.update(engine, STEP);
}

function gameLogic(dt) {
  if (blessAnim > 0) blessAnim -= dt;
  if (banner && (banner.t -= dt) <= 0) banner = null;
  if (tierPopup && (tierPopup.t -= dt) <= 0) tierPopup = null;

  // Stones that fall off the tower are lost, and a candle goes out.
  const screenBottom = camY + VIEW_H;
  for (const body of Composite.allBodies(engine.world)) {
    if (body.plugin.kind !== "stone" || body.isStatic) continue;
    const gone = body.position.y > GROUND_Y + 200 ||
      (body.position.y > screenBottom + 60 && body.velocity.y > 3);
    if (!gone) continue;
    Composite.remove(engine.world, body);
    landed = landed.filter((b) => b !== body);
    if (body === active) {
      active = null;
      steering = false;
      spawnTimer = 0.35;
    }
    lost++;
    Sound.play("lost");
    updateCandles();
    updateHud();
  }

  // The tower's height counts only stones that are standing still.
  towerTop = FOUND_Y;
  for (const body of landed) {
    const still = body.isStatic || body.isSleeping || body.speed < 0.3;
    if (still && body.bounds.min.y < towerTop) towerTop = body.bounds.min.y;
  }
  height = Math.max(0, (FOUND_Y - towerTop) / TILE);
  stats.height = Math.max(stats.height, height);
  if (stats.rotations === 0) stats.heightNoTurn = Math.max(stats.heightNoTurn, height);
  if (lost === 0) stats.heightNoLoss = Math.max(stats.heightNoLoss, height);
  if (stats.spellsUsed === 0) stats.heightNoPrayer = Math.max(stats.heightNoPrayer, height);
  checkMissions();

  // Every tier of height, the tower below sets solid and coins count for more.
  const reached = Math.floor(height / TIER_CUBITS);
  if (reached > tier) {
    tier = reached;
    multiplier = tier + 1;
    for (const body of landed) {
      if (!body.isStatic && (body.isSleeping || body.speed < 0.3)) {
        Body.setStatic(body, true);
        body.plugin.frozen = true;
      }
    }
    prayer = Math.min(prayerMax, prayer + PRAYER_PER_TIER);
    tierPopup = { level: tier + 1, t: 2.6, y: towerTop - 40 };
    Sound.play("tier");
    Sound.setIntensity(Math.min(2, tier));
  }

  updateDemon(dt);
  updateBubble(dt);

  if (lost >= lives) {
    endTimer += dt;
    if (endTimer > 0.8) return startFinale();
  } else if (!active) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) spawn();
  }

  camY += (cameraTarget() - camY) * Math.min(1, dt * 3);
  updateHud();
}

function checkMissions() {
  for (const m of missionsNow) {
    if (save.missions[m.id] || !m.check(stats)) continue;
    save.missions[m.id] = true;
    writeSave();
    flashBanner("★ " + m.text, 2.4);
    Sound.play("star");
  }
}

// The tower is finished: a roof comes down onto its top and the camera pulls
// back to show the whole thing.
function startFinale() {
  mode = "finale";
  Sound.play("end");
  demon.present = false;
  bubble = null;
  if (active && steering) {
    Composite.remove(engine.world, active);
    active = null;
  }
  let top = null;
  for (const body of landed) if (!top || body.bounds.min.y < top.bounds.min.y) top = body;
  const x = top ? top.position.x : VIEW_W / 2;
  const topY = top ? Math.min(top.bounds.min.y, towerTop) : towerTop;
  const [, h] = artSize(images.roof, ROOF_PX);
  finale = { t: 0, x, fromY: camY - h, toY: topY - h + 6, startFocus: camY + VIEW_H / 2 };
}

function updateFinale(dt) {
  finale.t += dt;
  // Pull back until the whole tower, foundation to roof, fits on screen.
  const towerSpan = GROUND_Y + 40 - (towerTop - 140);
  const fit = Math.min(1, (VIEW_H * 0.85) / towerSpan);
  const p = Math.min(1, Math.max(0, (finale.t - 1) / 1.3));
  const ease = p * p * (3 - 2 * p);
  zoom = 1 + (fit - 1) * ease;
  // Centre on the tower, but never show more ground below it than play does.
  const target = Math.min((towerTop - 140 + GROUND_Y + 40) / 2, GROUND_Y + 40 - VIEW_H / (2 * fit));
  focusY = finale.startFocus + (target - finale.startFocus) * ease;
  if (finale.t > 3.6) finish();
}

function updateDemon(dt) {
  if (demon.fleeing > 0 && demon.fleeing < 99) {
    demon.fleeing -= dt;
    demon.y -= 300 * dt;
    if (demon.fleeing <= 0) {
      demon.present = false;
      demon.fleeing = 0;
      demon.timer = rand(DEMON_AWAY[0], DEMON_AWAY[1]) * (save.medal ? 2 : 1);
    }
    return;
  }
  if (demon.fleeing) return; // waiting for the holy water to reach him
  if (!demon.present) {
    if (height < DEMON_FIRST_AT) return;
    demon.timer -= dt;
    if (demon.timer <= 0) {
      demon.present = true;
      demon.curses = DEMON_CURSES;
      demon.timer = 30;
      flashBanner("A demon comes!");
      Sound.play("demon");
    }
  } else {
    demon.timer -= dt;
    // He leaves once his curses are spent, or when he grows bored.
    if ((demon.curses === 0 && !active) || demon.timer <= 0) demon.fleeing = 1.2;
  }
  // Hover back and forth above the building site.
  demon.x = VIEW_W / 2 + Math.sin(time * 0.9) * (VIEW_W / 2 - 110);
  demon.y = Math.max(camY + VIEW_H * 0.1, towerTop - 520) + Math.sin(time * 2.3) * 12;
}

function updateBubble(dt) {
  if (bubble) {
    bubble.x += bubble.vx * dt;
    bubble.y = camY + bubble.screenY + Math.sin(time * 2) * 10;
    if (bubble.x < -80 || bubble.x > VIEW_W + 80) bubble = null;
    return;
  }
  bubbleTimer -= dt;
  if (bubbleTimer > 0) return;
  bubbleTimer = rand(BUBBLE_EVERY[0], BUBBLE_EVERY[1]);
  // Mortar is the rarest bubble; others appear only until you know them.
  const choices = [["prayer", 3]];
  for (const s of world.spells) {
    if (s === "mortar") choices.push(["mortar", 1]);
    else if (!known.has(s)) choices.push([s, 3]);
  }
  let roll = Math.random() * choices.reduce((sum, [, w]) => sum + w, 0);
  let spell = choices[0][0];
  for (const [s, w] of choices) { if ((roll -= w) < 0) { spell = s; break; } }
  const fromLeft = Math.random() < 0.5;
  bubble = {
    spell,
    x: fromLeft ? -60 : VIEW_W + 60,
    vx: fromLeft ? 70 : -70,
    screenY: rand(VIEW_H * 0.2, VIEW_H * 0.45),
  };
  bubble.y = camY + bubble.screenY;
}

function updateEffects(dt) {
  for (const e of effects) {
    if (e.kind === "spray") {
      e.t += dt;
      if (e.t >= e.duration && !e.done) {
        e.done = true;
        demon.fleeing = 1.2;
        stats.repelled++;
        effects.push({ kind: "flash", x: demon.x, y: demon.y, t: 0.6, color: "#bfe8ff" });
        flashBanner("Vade retro, Satana!");
      }
    } else {
      e.t -= dt;
    }
    if (e.kind === "chip") {
      e.vy += 400 * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    }
  }
  effects = effects.filter((e) => (e.kind === "spray" ? e.t < e.duration + 0.1 : e.t > 0));
}

// A jagged lightning bolt between two points.
function makeBolt(x1, y1, x2, y2, color, core) {
  const points = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const jitter = i === 0 || i === steps ? 0 : rand(-18, 18);
    points.push({ x: x1 + (x2 - x1) * f + jitter, y: y1 + (y2 - y1) * f });
  }
  return { kind: "bolt", points, color, core, t: 0.4 };
}

function flashBanner(text, seconds) {
  banner = { text, t: seconds || 1.6 };
}

let reopenOverlay = null;   // redraws the screen the shop was opened from

function finish() {
  mode = "over";
  const final = Number(height.toFixed(1));
  const best = save.bests[world.id] || 0;
  const record = final > best;
  if (record) save.bests[world.id] = final;
  save.best = Math.max(save.best, final);
  save.coins += earned;
  writeSave();
  reopenOverlay = () => {
    showOverlay(
      record ? "Deo gratias!" : "Consummatum est",
      "Your tower at " + world.name + " stands " + final.toFixed(1) + " cubits high" +
        (record ? ", a new record." : ". Your best here is " + best.toFixed(1) + ".") +
        " You earned " + earned + " coins, and have " + save.coins + " in all.",
      ["Build again", newTower],
      ["Monasteries", showTitle],
      ["Shop", openShop]
    );
    const box = $("overlay-extra");
    const ul = document.createElement("ul");
    ul.className = "missions";
    for (const m of missionsNow) {
      const li = document.createElement("li");
      li.className = save.missions[m.id] ? "done" : "";
      li.textContent = (save.missions[m.id] ? "★ " : "☆ ") + m.text;
      ul.append(li);
    }
    const stars = document.createElement("p");
    stars.className = "missions-title";
    stars.textContent = starsIn(world) + " of " + world.missions.length + " stars at " + world.name;
    box.append(stars, ul);
  };
  reopenOverlay();
}

// ---------------------------------------------------------------------------
// The title screen: page through the monasteries, see their missions and stars.
// ---------------------------------------------------------------------------

let titleIndex = 0;

function showTitle() {
  mode = "title";
  reopenOverlay = showTitle;
  titleIndex = Math.max(0, WORLDS.findIndex((w) => w.id === save.world));
  $("overlay").hidden = true;
  $("shop").hidden = true;
  $("title").hidden = false;
  renderTitle();
}

function renderTitle() {
  const w = WORLDS[titleIndex];
  const open = worldOpen(titleIndex);
  const stars = starsIn(w);
  $("world-name").textContent = (titleIndex + 1) + " · " + w.name;
  $("world-about").textContent = open ? w.about : "Earn " + STARS_TO_OPEN + " stars at " + WORLDS[titleIndex - 1].name + " to open " + w.name + ".";

  const list = $("world-missions");
  list.textContent = "";
  const shown = open ? currentMissions(w) : [];
  for (const m of shown) {
    const li = document.createElement("li");
    li.textContent = m.text;
    list.append(li);
  }
  if (open && shown.length === 0) {
    const li = document.createElement("li");
    li.className = "done";
    li.textContent = "Every mission here is done. Deo gratias!";
    list.append(li);
  }

  $("diploma-name").textContent = stars >= STARS_TO_OPEN ? w.rank : w.rank + " (" + stars + "/" + STARS_TO_OPEN + ")";
  $("diploma-stars").textContent = "★".repeat(stars) + "☆".repeat(w.missions.length - stars);
  $("world-best").textContent = (save.bests[w.id] || 0).toFixed(1);
  $("title-start").disabled = !open;
  $("world-prev").disabled = titleIndex === 0;
  $("world-next").disabled = titleIndex === WORLDS.length - 1;

  const dots = $("world-dots");
  dots.textContent = "";
  WORLDS.forEach((_, i) => {
    const d = document.createElement("span");
    d.className = "dot" + (i === titleIndex ? " current" : "") + (worldOpen(i) ? "" : " locked");
    dots.append(d);
  });

  drawWorldPicture($("world-canvas"), w, open);
}

// A picture of the monastery for the title screen.
function drawWorldPicture(el, w, open) {
  const c = el.getContext("2d");
  const T = TILE;
  el.width = 640;
  el.height = 440;
  const s = el.width / (32 * T);
  const sky = c.createLinearGradient(0, 0, 0, el.height);
  sky.addColorStop(0, "#7fd0f5");
  sky.addColorStop(1, "#d8f2ff");
  c.fillStyle = sky;
  c.fillRect(0, 0, el.width, el.height);
  c.save();
  c.scale(s, s);
  c.translate(16 * T, 9.5 * T);
  c.fillStyle = "#5fa845";
  c.fillRect(-16 * T, 12.5 * T, 32 * T, 6 * T);
  MonasteryArt[w.id](c);
  c.restore();
  if (!open) {
    c.fillStyle = "rgba(30,20,40,0.55)";
    c.fillRect(0, 0, el.width, el.height);
    c.fillStyle = "#fff";
    c.font = "28px 'Press Start 2P', monospace";
    c.textAlign = "center";
    c.fillText("Locked", el.width / 2, el.height / 2);
  }
}

$("world-prev").addEventListener("click", () => { titleIndex = Math.max(0, titleIndex - 1); renderTitle(); });
$("world-next").addEventListener("click", () => { titleIndex = Math.min(WORLDS.length - 1, titleIndex + 1); renderTitle(); });
$("title-start").addEventListener("click", () => {
  save.world = WORLDS[titleIndex].id;
  writeSave();
  newTower();
});
$("title-shop").addEventListener("click", openShop);

// Keep the foundation near the bottom of the screen until the tower grows,
// then keep the top of the tower a little below the middle of the screen.
function cameraTarget() {
  const rest = MIN_VIEW_H - VIEW_H;
  return Math.min(rest, towerTop - VIEW_H * TOWER_TOP_AT);
}

// How far the camera has climbed above its resting place (zero or negative).
function cameraRise() {
  return camY - (MIN_VIEW_H - VIEW_H);
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function artSize(img, px) {
  return [(img.artWidth || img.width) * px, (img.artHeight || img.height) * px];
}

function drawSprite(name, x, y, px) {
  const img = images[name];
  const [w, h] = artSize(img, px || PX);
  ctx.drawImage(img, x, y, w, h);
}

function mixColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p, s) => (p >> s) & 255;
  const mix = (s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return "#" + ((1 << 24) | (mix(16) << 16) | (mix(8) << 8) | mix(0)).toString(16).slice(1);
}

// ---------------------------------------------------------------------------
// The Hours. As you build, the day turns through the Divine Office and back
// again: the monks' prayer goes on around the clock. Each Hour has its sky
// and its chant.
// ---------------------------------------------------------------------------

const HOUR_SECONDS = 40;
const HOURS = [
  { name: "Prime", chant: "prime", top: "#4a6ab8", bottom: "#f5b080", dark: 0.12, stars: 0.15 },
  { name: "Sext", chant: "sext", top: "#7fd0f5", bottom: "#d8f2ff", dark: 0, stars: 0 },
  { name: "Vespers", chant: "vespers", top: "#5a60b0", bottom: "#f08a58", dark: 0.18, stars: 0.1 },
  { name: "Compline", chant: "compline", top: "#26285a", bottom: "#7a4a8a", dark: 0.38, stars: 0.6 },
  { name: "Compline", chant: "salve", top: "#141836", bottom: "#3a2e5a", dark: 0.5, stars: 0.9 },
  { name: "Vigils", chant: "vigils", top: "#070a1e", bottom: "#1a1f4a", dark: 0.55, stars: 1 },
];

let dayClock = 0;          // seconds of play since the tower began
let hourIndex = 0;

// The sky now: blend into the next Hour over the last third of this one.
function skyNow() {
  const here = HOURS[hourIndex];
  const next = HOURS[(hourIndex + 1) % HOURS.length];
  const into = (dayClock % HOUR_SECONDS) / HOUR_SECONDS;
  const f = Math.max(0, (into - 0.67) / 0.33);
  return {
    top: mixColor(here.top, next.top, f),
    bottom: mixColor(here.bottom, next.bottom, f),
    dark: here.dark + (next.dark - here.dark) * f,
    stars: here.stars + (next.stars - here.stars) * f,
  };
}

function updateHours(dt) {
  dayClock += dt;
  const index = Math.floor(dayClock / HOUR_SECONDS) % HOURS.length;
  if (index !== hourIndex) {
    hourIndex = index;
    if (HOURS[index].name !== HOURS[(index + HOURS.length - 1) % HOURS.length].name) {
      flashBanner(HOURS[index].name, 2.2);
      Sound.play("hour");
    }
    Sound.setChant(HOURS[index].chant);
  }
}

function drawSky() {
  const sky = skyNow();
  // Banded gradient, for a pixel look.
  const bands = 18;
  for (let b = 0; b < bands; b++) {
    ctx.fillStyle = mixColor(sky.top, sky.bottom, b / (bands - 1));
    ctx.fillRect(0, Math.floor((b * VIEW_H) / bands), VIEW_W, Math.ceil(VIEW_H / bands) + 1);
  }
  if (sky.stars > 0.02) {
    ctx.globalAlpha = sky.stars;
    ctx.fillStyle = "#fff";
    for (let s = 0; s < 110; s++) {
      const sx = (s * 97) % VIEW_W;
      const sy = (s * 57 + cameraRise() * -0.05) % VIEW_H;
      const twinkle = Math.sin(time * 2 + s) > 0.6 ? 3 : 2;
      ctx.fillRect(sx, (sy + VIEW_H) % VIEW_H, twinkle, twinkle);
    }
    ctx.globalAlpha = 1;
  }
  // The sun crosses the sky from Prime to Vespers; the moon from Compline to Vigils.
  const cycle = (dayClock / (HOUR_SECONDS * HOURS.length)) % 1;
  const dayPart = cycle < 0.5 ? cycle / 0.5 : (cycle - 0.5) / 0.5;
  const x = VIEW_W * (0.08 + dayPart * 0.84);
  const y = VIEW_H * (0.5 - Math.sin(dayPart * Math.PI) * 0.38);
  if (cycle < 0.5) {
    ctx.fillStyle = "rgba(255,230,150,0.25)";
    ctx.beginPath();
    ctx.arc(x, y, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe28a";
    ctx.beginPath();
    ctx.arc(x, y, 34, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#f2f0e0";
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = mixColor(sky.top, sky.bottom, 0.3);
    ctx.beginPath();
    ctx.arc(x + 10, y - 6, 22, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Night falls over the whole scene, but never so dark the stones are hard to see.
function drawNightTint() {
  const dark = skyNow().dark;
  if (dark <= 0.01) return;
  ctx.fillStyle = "rgba(12,16,52," + (dark * 0.6).toFixed(3) + ")";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

// The Latin being sung, faintly at the foot of the screen.
function drawLyric() {
  const text = Sound.lyric();
  if (!text || mode !== "play") return;
  ctx.font = "16px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText(text, VIEW_W / 2, VIEW_H - 22);
}

function drawScenery() {
  // Clouds drift slowly and scroll at half the camera's speed.
  for (let c = 0; c < 18; c++) {
    const speed = 5 + (c % 5) * 2;
    const x = ((c * 173 + time * speed) % (VIEW_W + 120)) - 90;
    const y = 120 - c * 260 + MIN_VIEW_H - VIEW_H + cameraRise() * 0.5;
    ctx.globalAlpha = 0.85;
    drawSprite("cloud", Math.round(x), Math.round(y), 3);
    ctx.globalAlpha = 1;
  }
  // Distant mountains, then nearer hills, each scrolling more slowly than the tower.
  const farY = GROUND_Y - 40 + cameraRise() * 0.8;
  ctx.fillStyle = "#7aa6c0";
  for (let x = -VIEW_W; x < VIEW_W * 2; x += 4) {
    const h = 150 - Math.abs(((x + 120) % 360) - 180) * 0.8 + Math.sin(x * 0.05) * 6;
    ctx.fillRect(x, Math.round(farY - h), 4, 600);
  }
  const hillY = GROUND_Y - 10 + cameraRise() * 0.7;
  ctx.fillStyle = "#4f8a6a";
  for (let x = -VIEW_W; x < VIEW_W * 2; x += 4) {
    const h = 60 + Math.sin(x * 0.012 + 1) * 24 + Math.sin(x * 0.041) * 8;
    ctx.fillRect(x, Math.round(hillY - h), 4, 600);
  }
  ctx.fillStyle = "#3a6e50";
  for (let x = -VIEW_W; x < VIEW_W * 2; x += 4) {
    const h = 26 + Math.sin(x * 0.03 + 2) * 10;
    ctx.fillRect(x, Math.round(hillY + 50 - h), 4, 600);
  }
}

function drawMarks() {
  // The next tier is a row of diamonds across the sky.
  const y = Math.round(FOUND_Y - (tier + 1) * TIER_CUBITS * TILE);
  ctx.fillStyle = "rgba(230,255,220,0.85)";
  for (let x = 120; x < VIEW_W - 120; x += 26) {
    ctx.beginPath();
    ctx.moveTo(x, y - 9);
    ctx.lineTo(x + 9, y);
    ctx.lineTo(x, y + 9);
    ctx.lineTo(x - 9, y);
    ctx.closePath();
    ctx.fill();
  }
  // Your best height, in gold.
  if (save.best > 0) {
    const by = Math.round(FOUND_Y - save.best * TILE);
    ctx.fillStyle = "#ffd84a";
    for (let x = 0; x < VIEW_W; x += 16) ctx.fillRect(x, by, 9, 3);
    ctx.font = "16px 'Press Start 2P', monospace";
    ctx.textAlign = "left";
    ctx.fillText("BEST", 100, by - 8);
  }
}

// The monk stands on the ground to the left of the monastery.
function ledge() {
  return { x: foundRects[0].x - 5 * TILE, y: GROUND_Y };
}

// He climbs a scaffold so he stays on screen as the tower rises.
function monkFeetY() {
  return Math.min(ledge().y, camY + VIEW_H - 40);
}

function monkHands() {
  const l = ledge();
  return { x: l.x + 48, y: monkFeetY() - 60 };
}

function drawFoundation() {
  // The ground.
  ctx.fillStyle = "#5fa845";
  ctx.fillRect(-VIEW_W, GROUND_Y, VIEW_W * 3, 8);
  ctx.fillStyle = "#4a8a3a";
  ctx.fillRect(-VIEW_W, GROUND_Y + 8, VIEW_W * 3, 800);

  // The monastery, drawn from monasteries.js.
  ctx.save();
  ctx.translate(VIEW_W / 2, FOUND_Y);
  MonasteryArt[world.id](ctx);
  ctx.restore();

  // A wider foundation from the shop: wooden platforms out to each side.
  world.base.forEach((b, i) => {
    const r = foundRects[i];
    const artLeft = VIEW_W / 2 + b.x * TILE;
    const artRight = artLeft + b.w * TILE;
    for (const [from, to] of [[r.x, artLeft], [artRight, r.x + r.w]]) {
      if (to - from < 2) continue;
      for (let x = from; x < to; x += TILE) ctx.drawImage(images.stone_wood, x, r.top, Math.min(TILE, to - x), TILE / 2);
      ctx.fillStyle = "#6a4424";
      ctx.fillRect(from + 4, r.top + TILE / 2, 4, TILE);
      ctx.fillRect(to - 8, r.top + TILE / 2, 4, TILE);
    }
  });

  // The scaffold the monk climbs, and the monk.
  const l = ledge();
  const w = 4 * TILE;
  const feet = monkFeetY();
  if (feet < l.y) {
    ctx.fillStyle = "#6a4424";
    ctx.fillRect(l.x + 6, feet, 5, l.y - feet);
    ctx.fillRect(l.x + w - 11, feet, 5, l.y - feet);
    ctx.fillStyle = "#8a5a2a";
    for (let y = feet + 30; y < l.y; y += 30) ctx.fillRect(l.x + 6, y, w - 12, 4);
    for (let i = 0; i < 4; i++) ctx.drawImage(images.stone_wood, l.x + i * TILE, feet, TILE, TILE / 2);
  }
  const monk = blessAnim > 0 ? "monk_bless" : "monk_idle";
  const [mw, mh] = artSize(images[monk], FIGURE_PX);
  drawSprite(monk, l.x + (w - mw) / 2, feet - mh, FIGURE_PX);
}

function drawStone(body) {
  const parts = body.parts.length > 1 ? body.parts.slice(1) : [body];
  const tex = images[body.plugin.tex];
  const tile = body.plugin.tile || TILE;
  const hidden = body === active && body.plugin.curse === "invisible";
  if (hidden) ctx.globalAlpha = 0.07 + Math.max(0, Math.sin(time * 3)) * 0.05;
  for (const part of parts) {
    ctx.save();
    ctx.translate(part.position.x, part.position.y);
    ctx.rotate(body.angle);
    ctx.drawImage(tex, -tile / 2, -tile / 2, tile, tile);
    if (body.plugin.mortar) {
      ctx.globalAlpha = body.isStatic ? 0.55 : 0.5 + Math.sin(time * 8) * 0.3;
      ctx.drawImage(images.blessed, -tile / 2, -tile / 2, tile, tile);
      ctx.globalAlpha = 1;
    } else if (body.plugin.frozen) {
      ctx.fillStyle = "rgba(40,30,60,0.18)";
      ctx.fillRect(-tile / 2, -tile / 2, tile, tile);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  if (body === active && body.plugin.curse === "haste") {
    ctx.fillStyle = "rgba(220,40,40,0.6)";
    for (let i = -1; i <= 1; i++) ctx.fillRect(body.position.x + i * 16, body.bounds.min.y - 30, 3, 22);
  }
}

function drawPlank(plank) {
  const w = plank.bounds.max.x - plank.bounds.min.x;
  ctx.fillStyle = "#6a4424";
  ctx.fillRect(plank.bounds.min.x + 6, plank.bounds.max.y, 4, 10);
  ctx.fillRect(plank.bounds.max.x - 10, plank.bounds.max.y, 4, 10);
  for (let x = 0; x < w; x += TILE) {
    ctx.drawImage(images.stone_wood, plank.bounds.min.x + x, plank.bounds.min.y, TILE, TILE / 2);
  }
}

// A column of light, from the top of the screen down to where the stone will land.
function drawDropGuide() {
  if (!active || !steering || active.plugin.curse === "invisible") return;
  const minX = active.bounds.min.x;
  const maxX = active.bounds.max.x;
  const top = active.bounds.max.y;
  let surface = camY + VIEW_H;
  for (const r of foundRects) {
    if (r.x + r.w > minX && r.x < maxX) surface = Math.min(surface, r.top);
  }
  for (const b of landed.concat(planks)) {
    if (b.bounds.max.x > minX && b.bounds.min.x < maxX && b.bounds.min.y > top) {
      surface = Math.min(surface, b.bounds.min.y);
    }
  }
  ctx.fillStyle = "rgba(255,255,240,0.16)";
  ctx.fillRect(minX, camY, maxX - minX, Math.max(0, surface - camY));
}

function drawRoof() {
  if (!finale) return;
  const [w] = artSize(images.roof, ROOF_PX);
  const p = Math.min(1, finale.t / 0.9);
  const y = finale.fromY + (finale.toY - finale.fromY) * p * p;
  drawSprite("roof", Math.round(finale.x - w / 2), Math.round(y), ROOF_PX);
}

function drawDemon() {
  if (!demon.present) return;
  const frameName = Math.floor(time * 6) % 2 ? "demon_a" : "demon_b";
  const [w, h] = artSize(images[frameName], FIGURE_PX);
  const fading = demon.fleeing > 0 && demon.fleeing < 99;
  if (fading) ctx.globalAlpha = Math.max(0, demon.fleeing / 1.2);
  drawSprite(frameName, Math.round(demon.x - w / 2), Math.round(demon.y - h / 2), FIGURE_PX);
  ctx.globalAlpha = 1;
}

function drawBubble() {
  if (!bubble) return;
  ctx.fillStyle = "rgba(200,235,255,0.35)";
  ctx.beginPath();
  ctx.arc(bubble.x, bubble.y, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(bubble.x - 22, bubble.y - 22, 6, 6);
  const icon = bubble.spell === "prayer" ? "beads" : SPELLS[bubble.spell].icon;
  ctx.drawImage(images[icon], bubble.x - 18, bubble.y - 18, 36, 36);
}

function drawEffects() {
  for (const e of effects) {
    if (e.kind === "flash") {
      ctx.globalAlpha = Math.max(0, e.t);
      ctx.fillStyle = e.color;
      const r = (1 - e.t) * 80 + 14;
      ctx.fillRect(e.x - r / 2, e.y - r / 2, r, r);
    } else if (e.kind === "bolt") {
      ctx.globalAlpha = Math.max(0, e.t * 2.5);
      for (const [color, size] of [[e.color, 8], [e.core, 3]]) {
        ctx.fillStyle = color;
        for (let i = 0; i < e.points.length - 1; i++) {
          const a = e.points[i];
          const b = e.points[i + 1];
          const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 3);
          for (let k = 0; k <= n; k++) {
            const x = a.x + (b.x - a.x) * (k / n);
            const y = a.y + (b.y - a.y) * (k / n);
            ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
          }
        }
      }
    } else if (e.kind === "spray") {
      // Drops of holy water arcing from the monk's hands to the demon.
      const p = Math.min(1, e.t / e.duration);
      ctx.fillStyle = "#9fe0ff";
      for (let i = 0; i < 12; i++) {
        const f = Math.max(0, p - i * 0.04);
        const x = e.from.x + (demon.x - e.from.x) * f + Math.sin(i * 7) * 8;
        const y = e.from.y + (demon.y - e.from.y) * f - Math.sin(f * Math.PI) * 120 + Math.cos(i * 5) * 8;
        ctx.fillRect(Math.round(x), Math.round(y), 6, 6);
      }
    } else if (e.kind === "chip") {
      ctx.globalAlpha = Math.max(0, e.t);
      ctx.drawImage(images[e.tex], 3, 3, 6, 6, e.x, e.y, 8, 8);
    }
    ctx.globalAlpha = 1;
  }
}

// "Tower level II!" rises from the top of the tower when a new tier is reached.
function drawTierPopup() {
  if (!tierPopup) return;
  const age = 2.6 - tierPopup.t;
  const y = tierPopup.y - age * 30;
  const x = VIEW_W / 2;
  ctx.globalAlpha = Math.min(1, tierPopup.t * 1.5);
  ctx.textAlign = "center";
  const shadowed = (text, font, color, dy) => {
    ctx.font = font;
    ctx.fillStyle = "#3a1a2a";
    ctx.fillText(text, x + 3, y + dy + 3);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y + dy);
  };
  shadowed("Tower level", "22px 'Press Start 2P', monospace", "#ffffff", 0);
  shadowed(roman(tierPopup.level) + "!", "36px 'Press Start 2P', monospace", "#e8467a", 44);
  shadowed("coins ×" + tierPopup.level + " · faster", "16px 'Press Start 2P', monospace", "#ffe26a", 80);
  ctx.globalAlpha = 1;
}

function drawBanner() {
  if (!banner) return;
  ctx.globalAlpha = Math.min(1, banner.t * 2);
  ctx.font = "20px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  const y = VIEW_H * 0.24;
  const w = ctx.measureText(banner.text).width + 36;
  ctx.fillStyle = "#5a1e1e";
  ctx.fillRect(VIEW_W / 2 - w / 2 - 3, y - 33, w + 6, 50);
  ctx.fillStyle = "#e8672a";
  ctx.fillRect(VIEW_W / 2 - w / 2, y - 30, w, 44);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(banner.text, VIEW_W / 2, y);
  ctx.globalAlpha = 1;
}

function draw() {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  drawSky();
  ctx.save();
  if (mode === "finale") {
    ctx.translate(VIEW_W / 2, VIEW_H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-VIEW_W / 2, -focusY);
  } else {
    ctx.translate(0, -Math.round(camY));
  }
  drawScenery();
  drawDropGuide();
  drawFoundation();
  drawMarks();
  for (const plank of planks) drawPlank(plank);
  for (const body of Composite.allBodies(engine.world)) {
    if (body.plugin.kind === "stone") drawStone(body);
  }
  drawDemon();
  drawBubble();
  drawEffects();
  drawTierPopup();
  drawRoof();
  ctx.restore();
  drawNightTint();
  drawLyric();
  drawBanner();
}

// ---------------------------------------------------------------------------
// Heads-up display
// ---------------------------------------------------------------------------

function roman(n) {
  const table = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  for (const [v, s] of table) while (n >= v) { out += s; n -= v; }
  return out;
}

function updateHud() {
  $("height").textContent = height.toFixed(1);
  $("earned").textContent = earned;
  $("prayer").textContent = prayer;
  for (const name of Object.keys(SPELLS)) {
    const el = $("spell-" + name);
    el.hidden = !(name === "repel" || name === "zap" || known.has(name));
    el.disabled = !canCast(name);
    el.classList.toggle("armed", pending === name);
    el.querySelector(".cost").textContent = spellCost(name);
  }
  $("mortar-charges").textContent = "×" + mortarCharges;
}

function paintIcon(el, name) {
  const src = images[name];
  el.width = src.width;
  el.height = src.height;
  const c = el.getContext("2d");
  c.imageSmoothingEnabled = false;
  c.drawImage(src, 0, 0);
}

function buildCandles() {
  const box = $("candles");
  box.textContent = "";
  for (let i = 0; i < lives; i++) box.append(document.createElement("canvas"));
  updateCandles();
}

function updateCandles() {
  const candles = $("candles").children;
  // The top candle goes out first.
  for (let i = 0; i < candles.length; i++) paintIcon(candles[i], i < lost ? "candle_out" : "candle_lit");
}

// The next stone, drawn in the diamond at the top left.
function drawNextPreview() {
  const el = $("next");
  const size = 12;
  el.width = 60;
  el.height = 60;
  const c = el.getContext("2d");
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, 60, 60);
  if (!nextShape) return;
  const tex = pending === "mortar" ? "stone_mortar" : pending === "gild" ? "stone_gold" : nextShape.tex;
  for (const [cx, cy] of nextShape.cells) {
    c.drawImage(images[tex], 30 + cx * size - size / 2, 30 + cy * size - size / 2, size, size);
  }
}

// ---------------------------------------------------------------------------
// Title, results and pause screens
// ---------------------------------------------------------------------------

let overlayActions = [];

function showOverlay(title, text, ...buttons) {
  $("overlay-title").textContent = title;
  $("overlay-text").textContent = text;
  const row = $("overlay-buttons");
  row.textContent = "";
  overlayActions = buttons;
  for (const [label, action] of buttons) {
    const b = document.createElement("button");
    b.className = "chunky";
    b.textContent = label;
    b.addEventListener("click", action);
    row.append(b);
  }
  $("overlay-extra").textContent = "";
  $("shop").hidden = true;
  $("title").hidden = true;
  $("overlay").hidden = false;
}

function hideScreens() {
  $("overlay").hidden = true;
  $("shop").hidden = true;
  $("title").hidden = true;
}

// ---------------------------------------------------------------------------
// The shop
// ---------------------------------------------------------------------------

let modeBeforeShop = "title";
let shopTab = "upgrades";
let shopPick = null;

const SHOP_WELCOME = "Pax, brother. Ut in omnibus glorificetur Deus: that in all things God may be glorified. Spend your coins wisely.";

function openShop() {
  modeBeforeShop = mode;
  mode = "shop";
  shopPick = null;
  $("overlay").hidden = true;
  $("title").hidden = true;
  renderShop();
  $("shop").hidden = false;
}

function closeShop() {
  $("shop").hidden = true;
  mode = modeBeforeShop;
  if (reopenOverlay) reopenOverlay();
}

// Every item on a shop tab as { key, name, icon, pips, state, price, text, act }.
function shopItems(tab) {
  if (tab === "upgrades") {
    return UPGRADES.map((u) => {
      const level = save[u.id];
      const next = u.levels[level];
      return {
        key: u.id, name: u.name, icon: u.icon, pips: [level, u.levels.length],
        price: next ? next.price : null,
        state: next ? "buy" : "done",
        text: u.now(level) + (next ? " Next: " + next.text : " Fully upgraded."),
        act: () => { save.coins -= next.price; save[u.id] = level + 1; },
      };
    });
  }
  const list = tab === "rosaries" ? ROSARIES : HABITS;
  const owned = tab === "rosaries" ? save.rosaries : save.habits;
  const worn = tab === "rosaries" ? save.rosary : save.habit;
  return list.map((item) => {
    const has = owned.includes(item.id);
    return {
      key: item.id, name: item.name, icon: (tab === "rosaries" ? "beads_" : "habit_") + item.id,
      price: has ? null : item.price,
      state: item.id === worn ? "worn" : has ? "own" : "buy",
      text: item.text,
      act: () => {
        if (!has) { save.coins -= item.price; owned.push(item.id); }
        if (tab === "rosaries") save.rosary = item.id;
        else save.habit = item.id;
      },
    };
  });
}

function renderShop() {
  $("shop-coins").textContent = save.coins;
  for (const tab of document.querySelectorAll(".tab")) {
    tab.classList.toggle("current", tab.dataset.tab === shopTab);
  }
  const grid = $("shop-grid");
  grid.textContent = "";
  const items = shopItems(shopTab);
  for (const item of items) {
    const card = document.createElement("button");
    card.className = "card-item " + item.state + (shopPick === item.key ? " picked" : "");
    card.setAttribute("aria-label", item.name);
    const icon = document.createElement("canvas");
    paintIcon(icon, item.icon);
    const label = document.createElement("span");
    label.className = "card-label";
    if (item.pips) {
      label.textContent = "◆".repeat(item.pips[0]) + "◇".repeat(item.pips[1] - item.pips[0]);
    } else {
      label.textContent = item.state === "worn" ? "In use" : item.state === "own" ? "Owned" : item.price;
    }
    card.append(icon, label);
    card.addEventListener("click", () => { shopPick = item.key; renderShop(); });
    grid.append(card);
  }

  // The novice master describes the chosen item.
  const pick = items.find((i) => i.key === shopPick);
  const action = $("shop-action");
  if (!pick) {
    $("shop-say-title").textContent = "Welcome to the shop";
    $("shop-say").textContent = SHOP_WELCOME;
    action.hidden = true;
    return;
  }
  $("shop-say-title").textContent = pick.name;
  $("shop-say").textContent = pick.text;
  action.hidden = pick.state === "done" || pick.state === "worn";
  if (pick.state === "buy") {
    action.textContent = "Buy · " + pick.price;
    action.disabled = save.coins < pick.price;
  } else {
    action.textContent = shopTab === "rosaries" ? "Use it" : "Wear it";
    action.disabled = false;
  }
  action.onclick = () => {
    if (pick.state === "buy" && save.coins < pick.price) return;
    pick.act();
    writeSave();
    renderShop();
  };
}

for (const tab of document.querySelectorAll(".tab")) {
  tab.addEventListener("click", () => { shopTab = tab.dataset.tab; shopPick = null; renderShop(); });
}
$("shop-close").addEventListener("click", closeShop);

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

document.addEventListener("keydown", (e) => {
  if (!$("overlay").hidden && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    if (overlayActions[0]) overlayActions[0][1]();
    return;
  }
  const actions = {
    ArrowLeft: () => move(-1),
    ArrowRight: () => move(1),
    ArrowUp: rotate,
    ArrowDown: drop,
    " ": drop,
    p: togglePause,
    Escape: togglePause,
  };
  for (const [name, spell] of Object.entries(SPELLS)) actions[spell.key] = () => cast(name);
  const action = actions[e.key] || actions[e.key.toLowerCase()];
  if (action) {
    e.preventDefault();
    action();
  }
});

function bindButton(el, action) {
  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  });
}

bindButton($("btn-pause"), togglePause);

// The music button cycles through chant with techno, chant alone, techno
// alone, and silence. Browsers allow sound only after a tap, so any tap on the
// page also wakes the sound system.
const MUSIC_NAMES = { both: "Chant + Techno", chant: "Chant", techno: "Techno", off: "Silence" };
const MUSIC_MARKS = { both: "♪✠", chant: "✠", techno: "♪", off: "–" };

function paintSoundButtons() {
  for (const el of document.querySelectorAll(".sound-toggle")) {
    el.textContent = MUSIC_MARKS[save.music];
    el.setAttribute("aria-label", "Music: " + MUSIC_NAMES[save.music] + ". Tap to change.");
    el.classList.toggle("off", save.music === "off");
  }
  const label = $("music-name");
  if (label) label.textContent = MUSIC_NAMES[save.music];
}

function toggleSound() {
  Sound.unlock();
  const modes = Sound.MODES;
  save.music = modes[(modes.indexOf(save.music) + 1) % modes.length];
  writeSave();
  Sound.setMode(save.music);
  if (mode === "play" || mode === "paused") {
    Sound.startMusic(HOURS[hourIndex].chant);
    flashBanner("Music: " + MUSIC_NAMES[save.music]);
  }
  paintSoundButtons();
}

for (const el of document.querySelectorAll(".sound-toggle")) bindButton(el, toggleSound);
document.addEventListener("pointerdown", () => Sound.unlock(), { capture: true });
if (typeof save.sound === "boolean") save.music = save.sound ? "both" : "off";
Sound.setMode(save.music);
paintSoundButtons();
for (const name of Object.keys(SPELLS)) bindButton($("spell-" + name), () => cast(name));

// Touch on the play area: drag sideways to steer, tap to turn (or to catch a
// bubble, or to sprinkle the demon), swipe down to drop.
let touch = null;
canvas.addEventListener("pointerdown", (e) => {
  touch = { x: e.clientX, y: e.clientY, x0: e.clientX, t: performance.now(), moved: 0, carry: 0 };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!touch) return;
  const dx = e.clientX - touch.x;
  touch.x = e.clientX;
  touch.moved += Math.abs(dx);
  touch.carry += dx / scale;
  const step = TILE / 2;
  while (touch.carry >= step) { move(1); touch.carry -= step; }
  while (touch.carry <= -step) { move(-1); touch.carry += step; }
});
canvas.addEventListener("pointerup", (e) => {
  if (!touch) return;
  const dt = performance.now() - touch.t;
  const dy = e.clientY - touch.y;
  if (dy > 40 && dt < 400 && touch.moved < dy) drop();
  else if (touch.moved < 8 && Math.abs(dy) < 8 && dt < 300 && mode === "play") tapAt(touch.x0, touch.y);
  touch = null;
});

// ---------------------------------------------------------------------------
// Sizing
// ---------------------------------------------------------------------------

function resize() {
  const box = $("stage");
  const dpr = window.devicePixelRatio || 1;
  // Fill the width; a tall screen gets a taller view instead of black bars.
  VIEW_H = Math.max(MIN_VIEW_H, Math.round((VIEW_W * box.clientHeight) / box.clientWidth));
  scale = Math.min(box.clientWidth / VIEW_W, box.clientHeight / VIEW_H);
  canvas.style.width = VIEW_W * scale + "px";
  canvas.style.height = VIEW_H * scale + "px";
  canvas.width = Math.round(VIEW_W * scale * dpr);
  canvas.height = Math.round(VIEW_H * scale * dpr);
  if (engine && mode !== "play") camY = cameraTarget();
}

window.addEventListener("resize", resize);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

loadArt((loaded) => {
  images = loaded;
  // Shop icons: rosaries in their own wood or metal, and the monk in each habit.
  for (const r of ROSARIES) {
    images["beads_" + r.id] = renderSprite({ grid: ART.beads.grid, colors: { ...ART.beads.colors, b: r.beads } });
  }
  for (const h of HABITS) {
    images["habit_" + h.id] = renderSprite({ grid: ART.monk_idle.grid, colors: { ...ART.monk_idle.colors, ...h.colors } });
  }
  for (const el of document.querySelectorAll("[data-sprite]")) paintIcon(el, el.dataset.sprite);
  resize();
  newTower();
  showTitle();
  requestAnimationFrame(frame);
});
