// Benedictine Bricks — a stacking game in the style of 99 Bricks Wizard Academy.
// Build the tower as high as you can. When your candles are out, a roof caps the tower.
// Physics by Box2D (planck.js, through physics.js). Art in art.js.

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

const TIER_CUBITS = 10;      // every 10 cubits coins count for more and stones fall faster
const FALL_SPEED = 1.0;      // world pixels per physics step, at the start
const FALL_SPEED_PER_TIER = 0.2;  // a little faster at each new tier
const MAX_FALL_SPEED = 2.6;
const MAX_DROP_SPEED = 6;
// Every square is exactly one stone wide. A falling stone this close to
// lining up with an edge below snaps to it.
const INSET = 0;
const MAGNET = 3;
const DRAG_PER_STEP = 20;     // screen pixels of finger travel to move half a stone
const LANDING_DAMPING = 0.12; // share of speed a stone keeps when it lands

const PRAYER_PER_STONE = 1;
const PRAYER_PER_TIER = 3;
const PRAYER_FROM_BUBBLE = 4;

const SPELLS = {
  repel:    { icon: "aspergillum", cost: 4, name: "Holy water", key: "h" },
  zap:      { icon: "bolt",        cost: 3, name: "Zap",        key: "z" },
  gild:     { icon: "stone_gold",  cost: 2, name: "Gild",       key: "g" },
};
const BUBBLE_EVERY = [16, 28];     // seconds between bubbles (min, max)
const GOLD_BONUS = 10;             // coins for a gilded stone
// What each power does, shown when a bubble teaches it.
const SPELL_HELP = {
  repel: "drives off the demon",
  zap: "breaks the last stone",
  gild: "gold stone, +" + GOLD_BONUS + " coins",
};

const DEMON_FIRST_AT = 5;          // cubits of height before his first visit
const DEMON_AWAY = [18, 32];       // seconds between visits (min, max)
const DEMON_WAIT = 2;              // seconds he hovers, doing nothing, when he comes
const DEMON_CURSES = 3;            // curses per visit
const CURSE_CHANCE = 0.45;         // chance he curses each new stone while here

// Fire. The demon drops it on the tower. Lay a stone on it at once and it is
// smothered; leave it, and it spreads from stone to stone, in any direction,
// and burns them away. Holy water douses one fire, for a little prayer.
const FIRE_DROPS = [2, 3];         // fires he drops on each visit (first monasteries, later ones)
const FIRE_EVERY = [3.5, 6];       // seconds between his fires (min, max)
const FIRE_GRACE = 3;              // seconds a new fire smoulders before it spreads
const FIRE_SPREAD = [1.1, 2.2];    // seconds between each fire's attempts to spread
const FIRE_SPREAD_CHANCE = 0.65;   // chance each attempt finds fuel and catches
const FIRE_BURN = 7;               // seconds until a burning stone is burned away
const DOUSE_COST = 2;              // prayer to douse one fire with holy water

// The seven deadly sins. The demon comes as one of them each time: each looks
// different, and each does the same mischief.
const SINS = [
  { id: "pride", name: "Pride", colors: { m: "#2a0a3a", M: "#4a1a6a", o: "#1a0a20", r: "#a86ad8", R: "#6a2a9a", y: "#ffd83a" } },
  { id: "avarice", name: "Avarice", colors: { m: "#2a3a0a", M: "#4a5a1a", o: "#2a2008", r: "#c8b02a", R: "#6a7a1a", y: "#fff4a0" } },
  { id: "lust", name: "Lust", colors: { m: "#3a0a2a", M: "#7a1a4a", o: "#2a0818", r: "#e85a9a", R: "#a82a6a", y: "#ffe0f0" } },
  { id: "envy", name: "Envy", colors: { m: "#0a2a14", M: "#1a5a2a", o: "#082010", r: "#6ad06a", R: "#2a7a3a", y: "#c8ff3a" } },
  { id: "gluttony", name: "Gluttony", colors: { m: "#3a1a08", M: "#6a3a1a", o: "#2a1408", r: "#f09a4a", R: "#b8682a", y: "#ffe8a0" } },
  { id: "wrath", name: "Wrath", colors: { m: "#4a0404", M: "#8a0a0a", o: "#1a0404", r: "#ff5a2a", R: "#d01a1a", y: "#ffff6a" } },
  { id: "sloth", name: "Sloth", colors: { m: "#1a2030", M: "#3a4458", o: "#141820", r: "#9aa8c0", R: "#5a6a88", y: "#d8e0f0" } },
];

// Scripture over the building site, in large letters: written in cloud by day
// and in stars by night. It changes now and then: with each new tower, and
// every few Hours of the day.
const SKY_VERSES = [
  ["The stone which the builders rejected; the same is become the head of the corner.", "Psalm 117:22"],
  ["Know you not, that you are the temple of God, and that the Spirit of God dwelleth in you?", "1 Corinthians 3:16"],
  ["Behold I will lay a stone in the foundations of Sion, a tried stone, a corner stone, a precious stone.", "Isaias 28:16"],
  ["Your members are the temple of the Holy Ghost, who is in you.", "1 Corinthians 6:19"],
  ["Be you also as living stones built up, a spiritual house.", "1 Peter 2:5"],
  ["Jesus Christ himself being the chief corner stone.", "Ephesians 2:20"],
  ["For other foundation no man can lay, but that which is laid; which is Christ Jesus.", "1 Corinthians 3:11"],
  ["Upon this rock I will build my church, and the gates of hell shall not prevail against it.", "Matthew 16:18"],
  ["The name of the Lord is a strong tower: the just runneth to it, and shall be exalted.", "Proverbs 18:10"],
  ["A wise man that built his house upon a rock.", "Matthew 7:24"],
  ["Wisdom hath built herself a house, she hath hewn her out seven pillars.", "Proverbs 9:1"],
  ["You are the temple of the living God; as God saith: I will dwell in them, and walk among them.", "2 Corinthians 6:16"],
];
const HASTE_FACTOR = 2.6;
const HUGE_FACTOR = 1.5;

// Box2D units: one stone square is one metre. Gravity, density and the
// solver iterations follow Byron Knoll's planck.js stacking game "Stacking
// Things" (gravity 20, density 1, 10 and 8 iterations, no linear damping).
// Friction follows Stacktris, a Box2D tetromino stacker (0.99 there), so
// stones grip as they do in 99 Bricks; a little angular damping stops a
// square stone rolling like a wheel. No bounce.
const GRAVITY = 20;           // metres (stone squares) per second squared
const STONE = { density: 1, friction: 0.95, restitution: 0, linearDamping: 0, angularDamping: 0.3 };

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
// and Benedictine saints to build as.
// ---------------------------------------------------------------------------

const PRAYER_BY_LEVEL = [10, 13, 16, 20];
const FOUNDATION_BY_LEVEL = [7, 9, 11];

const UPGRADES = [
  { id: "prayerLevel", name: "Deeper prayer", icon: "beads", now: (l) => "You hold " + PRAYER_BY_LEVEL[l] + " prayer.",
    levels: [
      { price: 150, text: "Hold 13 prayer." },
      { price: 350, text: "Hold 16 prayer." },
      { price: 700, text: "Hold 20 prayer." },
    ] },
  { id: "candle", name: "A fourth candle", icon: "candle_lit", now: (l) => "You have " + (3 + l) + " candles.",
    levels: [{ price: 500, text: "Drop four stones before the tower is finished, instead of three." }] },
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
  { id: "olive", name: "Olive-wood rosary", price: 200, beads: "#7a8a3a", spell: null, prayer: 3, text: "Every tower starts with 3 prayer already said." },
  { id: "silver", name: "Silver rosary", price: 450, beads: "#c8d0d8", spell: null, slowFire: true, text: "The demon's fires smoulder twice as long before they spread." },
  { id: "gold", name: "Gold rosary", price: 700, beads: "#f0c030", spell: "gild", text: "Every tower starts with Gild." },
];

// The builder: St. Benedict to begin with, and other saints of his Order to
// buy. Each looks his or her own way (art.js, saintSprite); all build alike.
const SAINTS = [
  { id: "benedict", name: "St. Benedict", price: 0, text: "St. Benedict of Nursia (c. 480–547), father of the monks of the West, who wrote the Rule: ora et labora, pray and work." },
  { id: "scholastica", name: "St. Scholastica", price: 150, text: "St. Benedict's twin sister. At their last meeting she prayed, and a storm kept him talking with her through the night. Three days later he saw her soul rise to heaven as a dove." },
  { id: "maurus", name: "St. Maurus", price: 200, text: "St. Benedict's young disciple. At his abbot's word he ran out across the lake to save the drowning boy Placid, and only on the shore knew he had walked on the water." },
  { id: "gertrude", name: "St. Gertrude the Great", price: 300, text: "A nun of Helfta (1256–c. 1302), a mystic of the Sacred Heart, whose prayers and visions have taught Christians to trust the mercy of Christ." },
  { id: "anselm", name: "St. Anselm", price: 400, text: "Monk and abbot of Bec, Archbishop of Canterbury (1033–1109), and Doctor of the Church: faith seeking understanding." },
  { id: "hildegard", name: "St. Hildegard of Bingen", price: 500, text: "Abbess, visionary, composer, healer and Doctor of the Church (1098–1179), who saw the “living light” and wrote down what it showed her." },
  { id: "gregory", name: "St. Gregory the Great", price: 700, text: "Monk and pope (c. 540–604), who wrote the life of St. Benedict and sent monks to England. He is shown with the dove of the Holy Spirit at his ear." },
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
    spells: [],
    curses: [],
  },
  {
    id: "subiaco", name: "Subiaco", rank: "Novice",
    about: "The Sacro Speco, built into the cliff around the cave where St. Benedict lived as a hermit.",
    base: [{ x: -3.5, w: 7 }],
    spells: [],
    curses: ["huge"],
  },
  {
    id: "montecassino", name: "Monte Cassino", rank: "Simple Vows",
    about: "St. Benedict's abbey on the mountain, where he wrote the Rule. Mind the cloister between the wings.",
    base: [{ x: -5.5, w: 4 }, { x: 1.5, w: 4 }],
    spells: ["gild"],
    curses: ["huge"],
  },
  {
    id: "cluny", name: "Cluny", rank: "Solemn Profession",
    about: "The great abbey of Burgundy. Of its church, one octagonal bell tower still stands.",
    base: [{ x: -2.5, w: 5 }],
    spells: ["gild"],
    curses: ["huge", "haste"],
  },
  {
    id: "melk", name: "Melk", rank: "Cellarer",
    about: "The Baroque abbey on its rock above the Danube, with green domes on its towers.",
    base: [{ x: -4, w: 8 }],
    spells: ["gild"],
    curses: ["huge", "haste"],
  },
  {
    id: "montsaintmichel", name: "Mont-Saint-Michel", rank: "Prior",
    about: "The abbey on its rock in the bay of Normandy, under the spire of St. Michael.",
    base: [{ x: -2, w: 4 }],
    spells: ["gild"],
    curses: ["huge", "haste", "tumble"],
  },
  {
    id: "montserrat", name: "Montserrat", rank: "Abbot",
    about: "The abbey among the saw-toothed peaks of Catalonia, home of the Black Madonna.",
    base: [{ x: -5, w: 3, drop: 1 }, { x: -2, w: 6 }],
    spells: ["gild"],
    curses: ["huge", "haste", "tumble"],
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
    level === 0 ? { key: "mortar", text: "Smother a fire with a stone", check: (s) => s.smothered >= 1 }
      : level <= 2 ? { key: "scaffold", text: "Smother " + (1 + level) + " fires in one tower", check: (s) => s.smothered >= 1 + level }
      : { key: "gold", text: "Build a tower with " + (level - 1) + " gold stones", check: (s) => s.golds >= level - 1 },
    { key: "noprayer", text: "Reach " + half + " cubits without using prayer", check: (s) => s.heightNoPrayer >= half },
    world.curses.length
      ? { key: "cursed", text: "Lay " + (2 + level) + " cursed stones on one tower", check: (s) => s.cursedLanded >= 2 + level }
      : { key: "cursed", text: "Douse a fire with holy water", check: (s) => s.doused >= 1 },
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
    rosaries: ["boxwood"], rosary: "boxwood", saints: ["benedict"], saint: "benedict",
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
  // Habits were once for sale; they gave way to saints. Coins spent on a
  // habit come back.
  if (stored.habits) {
    stored.coins = (stored.coins || 0) + 150 * stored.habits.filter((h) => h !== "black").length;
    delete stored.habits;
    delete stored.habit;
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
let fires = [];           // squares of stone that are burning
let skyText = null;       // the verse in the sky now, as points to draw
let sinIndex = 0;         // which of the seven sins comes next
let nextShape;
let pending = null;       // "gild", waiting for the next stone
let lost = 0;
let prayer = 0;
let prayerMax = 10;
let known = new Set();    // spells learned this tower
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
let towerTop = FOUND_Y;   // top of the standing tower: stones at rest only (for the score)
let stackTop = FOUND_Y;   // top of everything laid, settled or not (for the camera and the falling stone)
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
  wait: 0,                // seconds left of his pause on arriving
  drops: 0,               // fires left to drop this visit
  fireTimer: 0,
  sin: SINS[0],
};

const $ = (id) => document.getElementById(id);
const canvas = $("game");
const ctx = canvas.getContext("2d");
let scale = 1;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function spellCost(name) {
  return SPELLS[name].cost;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function newTower() {
  engine = Engine.create({ enableSleeping: true });
  engine.velocityIterations = 10;
  engine.positionIterations = 8;
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
  fires = [];
  pending = null;
  lost = 0;
  lives = 3 + save.candle;
  prayerMax = PRAYER_BY_LEVEL[save.prayerLevel];
  const rosary = ROSARIES.find((r) => r.id === save.rosary) || ROSARIES[0];
  prayer = Math.min(prayerMax, rosary.prayer || 0);
  known = new Set(rosary.spell ? [rosary.spell] : []);
  stats = {
    height: 0, laid: 0, repelled: 0, bubbles: 0, rotations: 0, golds: 0, smothered: 0, doused: 0, burned: 0,
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
  stackTop = FOUND_Y;
  camY = cameraTarget();
  effects = [];
  demon.present = false;
  demon.fleeing = 0;
  demon.timer = 0;
  setSkyVerse(Math.floor(Math.random() * SKY_VERSES.length));
  nextShape = randomShape();
  mode = "play";
  hideScreens();
  buildCandles();
  drawNextPreview();
  updateHud();
}

// Paint the builder as the saint chosen in the shop.
function paintMonk() {
  const saint = SAINTS.find((h) => h.id === save.saint) || SAINTS[0];
  for (const pose of ["monk_idle", "monk_bless"]) {
    images[pose] = renderSprite(saintSprite(pose, saint.id));
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
  if (demon.present && !demon.fleeing && demon.wait <= 0 && demon.curses > 0 && world.curses.length && !pending && Math.random() < CURSE_CHANCE) {
    curse = world.curses[Math.floor(Math.random() * world.curses.length)];
    demon.curses--;
  }

  const tile = curse === "huge" ? TILE * HUGE_FACTOR : TILE;
  const x = VIEW_W / 2;
  // Start well above the tower, but not so far that the wait is tedious.
  // Well above the top of the tower, always with a long fall below it, and on screen.
  const y = Math.min(stackTop - 320, Math.max(camY + VIEW_H * 0.1, stackTop - Math.max(440, VIEW_H * 0.4)));
  const material = STONE;
  const parts = shape.cells.map(([cx, cy]) =>
    Bodies.rectangle(x + cx * tile, y + cy * tile, tile, tile, material)
  );
  const body = Body.create({ parts, ...material });
  body.plugin.kind = "stone";
  body.plugin.tex = shape.tex;
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

// Turn a stone to gold (worth extra coins).
function enchant(body, spell) {
  if (spell === "gild") {
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
  body.plugin.laidAt = time;
  Sound.play("land", (body.plugin.tile || TILE) / TILE);
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
  return Matter.overlaps(active, others, 2);
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
  for (const b of landed) {
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
      if (Math.abs(d) > 1.5 && Math.abs(d) <= MAGNET && (!best || Math.abs(d) < Math.abs(best))) best = d;
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
  return known.has(name);
}

function cast(name) {
  if (!canCast(name)) return;
  prayer -= spellCost(name);
  stats.spellsUsed++;
  if (name === "repel") repel();
  else if (name === "zap") zap();
  else if (active && steering && !active.plugin.gold) enchant(active, name);
  else pending = name;
  if (name === "gild") flashBanner("Gold stone: +" + GOLD_BONUS + " coins when it lands");
  drawNextPreview();
  updateHud();
}

// Holy water: the monk sprinkles the demon and he flees for a while.
function repel() {
  demon.fleeing = 99; // he is hit when the spray arrives; see updateEffects
  effects.push({ kind: "spray", from: monkHands(), to: demon, t: 0, duration: 0.45 });
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
  removeStone(body);
}

// Take a stone out of the tower (broken by Zap, or burned away).
function removeStone(body) {
  Composite.remove(engine.world, body);
  landed = landed.filter((b) => b !== body);
  fires = fires.filter((f) => f.body !== body);
  // Wake the stones around it so the tower settles again.
  for (const b of landed) if (!b.isStatic) Sleeping.set(b, false);
}

// ---------------------------------------------------------------------------
// Fire
// ---------------------------------------------------------------------------

function squaresOf(body) {
  return body.parts.length > 1 ? body.parts.slice(1) : [body];
}

// The centre of a burning square, wherever its stone has rolled.
function firePoint(f) {
  const sq = squaresOf(f.body)[f.index];
  return sq ? sq.position : f.body.position;
}

function burning(body, index) {
  return fires.some((f) => f.body === body && f.index === index);
}

// The square of a laid stone at this point, if there is one (leaving out `except`).
function squareAt(x, y, except) {
  for (const b of landed) {
    const squares = squaresOf(b);
    for (let i = 0; i < squares.length; i++) {
      if (except && b === except.body && i === except.index) continue;
      const bb = squares[i].bounds;
      if (x > bb.min.x + 2 && x < bb.max.x - 2 && y > bb.min.y + 2 && y < bb.max.y - 2) return { body: b, index: i };
    }
  }
  return null;
}

function startFire(body, index) {
  if (burning(body, index)) return;
  const rosary = ROSARIES.find((r) => r.id === save.rosary) || ROSARIES[0];
  fires.push({ body, index, age: 0, born: time, grace: FIRE_GRACE * (rosary.slowFire ? 2 : 1), spreadT: rand(FIRE_SPREAD[0], FIRE_SPREAD[1]) });
}

// The demon throws fire down onto a stone whose top lies open to the sky.
function dropFire() {
  const open = [];
  for (const b of landed) {
    if (!(b.isStatic || b.isSleeping || b.plugin.stillFor > 0.33)) continue;
    const tile = b.plugin.tile || TILE;
    squaresOf(b).forEach((sq, i) => {
      const p = sq.position;
      if (p.y < camY + 60 || burning(b, i)) return;
      if (!squareAt(p.x, p.y - tile, { body: b, index: i })) open.push({ body: b, index: i });
    });
  }
  if (!open.length) return false;
  const target = open[Math.floor(Math.random() * open.length)];
  effects.push({ kind: "fireball", from: { x: demon.x, y: demon.y + 16 }, target, t: 0, duration: 0.8 });
  Sound.play("curse");
  return true;
}

function updateFires(dt) {
  for (const f of fires.slice()) {
    if (!landed.includes(f.body)) { fires = fires.filter((g) => g !== f); continue; }
    f.age += dt;
    const p = firePoint(f);
    const tile = f.body.plugin.tile || TILE;
    // Smothered: a stone laid since the fire began now lies on top of it.
    const over = squareAt(p.x, p.y - tile, f);
    if (over && over.body !== f.body && over.body.plugin.laidAt > f.born) {
      fires = fires.filter((g) => g !== f);
      stats.smothered++;
      steam(p.x, p.y - tile / 2);
      Sound.play("hiss");
      continue;
    }
    // Left alone, it spreads: now this way, now that, to any stone that touches it.
    if (f.age > f.grace) {
      f.spreadT -= dt;
      if (f.spreadT <= 0) {
        f.spreadT = rand(FIRE_SPREAD[0], FIRE_SPREAD[1]);
        if (Math.random() < FIRE_SPREAD_CHANCE) {
          const ways = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].sort(() => Math.random() - 0.5);
          for (const [dx, dy] of ways) {
            const next = squareAt(p.x + dx * tile, p.y + dy * tile, f);
            if (next && !burning(next.body, next.index)) { startFire(next.body, next.index); Sound.play("fire"); break; }
          }
        }
      }
    }
    if (f.age > FIRE_BURN) burnAway(f.body);
  }
}

// A stone that has burned long enough falls to ash.
function burnAway(body) {
  const x = body.position.x;
  const y = body.position.y;
  for (let i = 0; i < 18; i++) {
    effects.push({ kind: "chip", tex: "stone_granite", x: x + rand(-TILE, TILE), y: y + rand(-TILE, TILE), vx: rand(-70, 70), vy: rand(-140, -20), t: rand(0.6, 1), ash: true });
  }
  effects.push({ kind: "flash", x, y, t: 0.5, color: "#ff8a3a" });
  removeStone(body);
  stats.burned++;
  Sound.play("burn");
}

function nearestFire(x, y, r) {
  let best = null;
  let bd = r;
  for (const f of fires) {
    const p = firePoint(f);
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bd) { bd = d; best = f; }
  }
  return best;
}

// Holy water on one fire.
function douse(fire) {
  prayer -= DOUSE_COST;
  stats.spellsUsed++;
  const p = firePoint(fire);
  effects.push({ kind: "spray", from: monkHands(), to: { x: p.x, y: p.y }, fire, t: 0, duration: 0.45 });
  Sound.play("repel");
  blessAnim = 1;
  updateHud();
}

function steam(x, y) {
  for (let i = 0; i < 14; i++) effects.push({ kind: "puff", x: x + rand(-14, 14), y: y + rand(-6, 6), vx: rand(-20, 20), vy: rand(-90, -40), t: rand(0.6, 1.1) });
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
    renderMusicChoices();
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
  // A fire under the finger: holy water to douse it.
  const fire = nearestFire(x, y, 44);
  if (fire) {
    if (prayer >= DOUSE_COST) douse(fire);
    else flashBanner("Not enough prayer");
    return;
  }
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
  } else {
    known.add(spell);
    flashBanner(SPELLS[spell].name + ": " + SPELL_HELP[spell]);
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
  Engine.update(engine, STEP);
}

function gameLogic(dt) {
  if (blessAnim > 0) blessAnim -= dt;
  if (banner && (banner.t -= dt) <= 0) banner = null;
  if (skyText) skyText.t += dt;
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
    // Only stones at rest count: asleep, or barely moving for a third of a
    // second, never one pausing for an instant in mid-air as it falls.
    const calm = body.speed < 0.08 && Math.abs(body.angularVelocity) < 0.004;
    body.plugin.stillFor = calm ? (body.plugin.stillFor || 0) + dt : 0;
    const still = body.isStatic || body.isSleeping || body.plugin.stillFor > 0.33;
    if (still && body.bounds.min.y < towerTop) towerTop = body.bounds.min.y;
  }
  height = Math.max(0, (FOUND_Y - towerTop) / TILE);
  // The camera follows every stone laid, settled or still settling, so a tower
  // that sways never makes the view drop away. It rises at once and falls slowly.
  let top = FOUND_Y;
  for (const body of landed) {
    if (body.position.y > FOUND_Y + TILE * 2 || body.velocity.y > 4) continue;
    if (body.bounds.min.y < top) top = body.bounds.min.y;
  }
  top = Math.min(top, towerTop);
  stackTop = top < stackTop ? top : stackTop + Math.min(top - stackTop, 120 * dt);
  stats.height = Math.max(stats.height, height);
  if (stats.rotations === 0) stats.heightNoTurn = Math.max(stats.heightNoTurn, height);
  if (lost === 0) stats.heightNoLoss = Math.max(stats.heightNoLoss, height);
  if (stats.spellsUsed === 0) stats.heightNoPrayer = Math.max(stats.heightNoPrayer, height);
  checkMissions();

  // Every tier of height, coins count for more and stones fall a little
  // faster. The stones stay loose: they can still knock into one another.
  const reached = Math.floor(height / TIER_CUBITS);
  if (reached > tier) {
    tier = reached;
    multiplier = tier + 1;
    prayer = Math.min(prayerMax, prayer + PRAYER_PER_TIER);
    tierPopup = { level: tier + 1, t: 2.6, y: stackTop - 40 };
    Sound.play("tier");
    Sound.setIntensity(Math.min(2, tier));
  }

  updateDemon(dt);
  updateFires(dt);
  updateBubble(dt);

  if (lost >= lives) {
    endTimer += dt;
    if (endTimer > 0.8) return startFinale();
  } else if (!active) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) spawn();
  }

  // Up quickly, so the falling stone always has room; down gently.
  const camGoal = cameraTarget();
  camY += (camGoal - camY) * Math.min(1, dt * (camGoal < camY ? 5 : 2));
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
  fires = [];
  if (active && steering) {
    Composite.remove(engine.world, active);
    active = null;
  }
  let top = null;
  for (const body of landed) if (!top || body.bounds.min.y < top.bounds.min.y) top = body;
  const x = top ? top.position.x : VIEW_W / 2;
  const topY = top ? Math.min(top.bounds.min.y, stackTop) : stackTop;
  const [, h] = artSize(images.roof, ROOF_PX);
  finale = { t: 0, x, fromY: camY - h, toY: topY - h + 6, startFocus: camY + VIEW_H / 2 };
}

function updateFinale(dt) {
  finale.t += dt;
  // Pull back until the whole tower, foundation to roof, fits on screen.
  const towerSpan = GROUND_Y + 40 - (stackTop - 140);
  const fit = Math.min(1, (VIEW_H * 0.85) / towerSpan);
  const p = Math.min(1, Math.max(0, (finale.t - 1) / 1.3));
  const ease = p * p * (3 - 2 * p);
  zoom = 1 + (fit - 1) * ease;
  // Centre on the tower, but never show more ground below it than play does.
  const target = Math.min((stackTop - 140 + GROUND_Y + 40) / 2, GROUND_Y + 40 - VIEW_H / (2 * fit));
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
      demon.curses = world.curses.length ? DEMON_CURSES : 0;
      demon.drops = WORLDS.indexOf(world) < 3 ? FIRE_DROPS[0] : FIRE_DROPS[1];
      demon.wait = DEMON_WAIT;
      demon.fireTimer = rand(0.4, 1.2);
      demon.timer = 30;
      demon.sin = SINS[sinIndex++ % SINS.length];
      flashBanner("The demon of " + demon.sin.name + "!", 2.2);
      Sound.play("demon");
    }
  } else if (demon.wait > 0) {
    // He hovers a moment, looking the tower over, before he does anything.
    demon.wait -= dt;
  } else {
    demon.timer -= dt;
    demon.fireTimer -= dt;
    if (demon.drops > 0 && demon.fireTimer <= 0) {
      demon.fireTimer = rand(FIRE_EVERY[0], FIRE_EVERY[1]);
      if (dropFire()) demon.drops--;
    }
    // He leaves once his curses and fires are spent, or when he grows bored.
    const falling = effects.some((e) => e.kind === "fireball" && !e.done);
    if ((demon.curses === 0 && demon.drops === 0 && !active && !falling) || demon.timer <= 0) demon.fleeing = 1.2;
  }
  // Hover back and forth above the building site.
  demon.x = VIEW_W / 2 + Math.sin(time * 0.9) * (VIEW_W / 2 - 110);
  demon.y = Math.max(camY + VIEW_H * 0.1, stackTop - 520) + Math.sin(time * 2.3) * 12;
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
    if (!known.has(s)) choices.push([s, 3]);
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
        if (e.fire) {
          // Holy water on a fire: it hisses out.
          if (fires.includes(e.fire)) {
            const at = firePoint(e.fire);
            fires = fires.filter((f) => f !== e.fire);
            stats.doused++;
            steam(at.x, at.y);
          }
        } else {
          demon.fleeing = 1.2;
          stats.repelled++;
          effects.push({ kind: "flash", x: demon.x, y: demon.y, t: 0.6, color: "#bfe8ff" });
          flashBanner("Vade retro, Satana!");
        }
      }
    } else if (e.kind === "fireball") {
      e.t += dt;
      if (e.t >= e.duration && !e.done) {
        e.done = true;
        // It lands, if the stone is still there to land on.
        if (landed.includes(e.target.body)) {
          startFire(e.target.body, e.target.index);
          Sound.play("fire");
        }
      }
    } else {
      e.t -= dt;
    }
    if (e.kind === "puff") {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    }
    if (e.kind === "chip") {
      e.vy += 400 * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    }
  }
  effects = effects.filter((e) => (e.kind === "spray" || e.kind === "fireball" ? e.t < e.duration + 0.1 : e.t > 0));
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

// The verse in the sky for this Hour, turned into points to be spelled in
// stars or clouds.
let skyVerseIndex = 0;
const SKY_FONT = 30;
function setSkyVerse(index) {
  skyVerseIndex = index;
  const [text, ref] = SKY_VERSES[index % SKY_VERSES.length];
  const width = 360;
  const c = document.createElement("canvas").getContext("2d");
  c.font = "bold " + SKY_FONT + "px Georgia, 'Times New Roman', serif";
  const lines = [];
  let line = "";
  for (const w of text.split(" ")) {
    const t = line ? line + " " + w : w;
    if (c.measureText(t).width > width && line) { lines.push(line); line = w; } else line = t;
  }
  lines.push(line);
  // A few points on the letters, for stars to twinkle on at night.
  const lh = SKY_FONT * 1.15;
  const can = document.createElement("canvas");
  can.width = width + 40;
  can.height = Math.ceil(lines.length * lh + 10);
  const g = can.getContext("2d");
  g.font = c.font; g.textAlign = "center"; g.textBaseline = "top"; g.fillStyle = "#fff";
  lines.forEach((l, k) => g.fillText(l, can.width / 2, k * lh));
  const data = g.getImageData(0, 0, can.width, can.height).data;
  const points = [];
  for (let y = 0; y < can.height; y += 4) for (let x = 0; x < can.width; x += 4) if (data[(y * can.width + x) * 4 + 3] > 160 && Math.random() < 0.12) points.push([x - can.width / 2, y, Math.random()]);
  skyText = { ref, lines, lh, points, h: can.height, t: 0 };
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
  return Math.min(rest, stackTop - VIEW_H * TOWER_TOP_AT);
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
    if (index % 3 === 0) setSkyVerse(skyVerseIndex + 1);   // a new verse every three Hours
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
  // It rises from behind the hills and sets behind them again, so it never
  // hangs beside the tower looking like a button.
  const y = VIEW_H * (0.78 - Math.sin(dayPart * Math.PI) * 0.62);
  if (cycle < 0.5) {
    // A pixel sun: a stepped disc with eight short rays that turn slowly.
    const px = 6;
    ctx.fillStyle = "#ffcf5a";
    for (let r = 0; r < 8; r++) {
      const a = r * Math.PI / 4 + time * 0.15;
      for (const d of [34, 40]) {
        ctx.fillRect(Math.round((x + Math.cos(a) * d) / px) * px - px / 2, Math.round((y + Math.sin(a) * d) / px) * px - px / 2, px, px);
      }
    }
    ctx.fillStyle = "#ffe28a";
    for (let dy = -4; dy <= 4; dy++) {
      const half = Math.round(Math.sqrt(20.25 - dy * dy));
      ctx.fillRect(Math.round(x / px) * px - half * px, Math.round(y / px) * px + dy * px - px / 2, half * 2 * px, px);
    }
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

// Scripture across the sky: written in cloud by day, gilded by the sun at its
// rising and setting, and in starlight by night. Whole letters, to be read.
function drawSkyVerse() {
  if (!skyText || mode === "title") return;
  const sky = skyNow();
  const fade = Math.min(1, skyText.t / 2.5);
  const cx = VIEW_W / 2 + Math.sin(time * 0.15) * 4;
  const y0 = Math.round(VIEW_H * 0.115);
  const night = Math.max(0, Math.min(1, (sky.stars - 0.25) / 0.35));
  ctx.save();
  ctx.font = "bold " + SKY_FONT + "px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.lineJoin = "round";
  if (night < 1) {
    // Cloud letters: a soft grey underside, a thick white billow, a bright face.
    const warm = sky.dark > 0.05 ? 0.35 : 0;
    ctx.globalAlpha = (1 - night) * fade;
    skyText.lines.forEach((l, k) => {
      const y = y0 + k * skyText.lh;
      ctx.lineWidth = 4; ctx.strokeStyle = mixColor("#8a9cba", sky.top, warm); ctx.strokeText(l, cx + 1, y + 2);
      ctx.lineWidth = 3; ctx.strokeStyle = mixColor("#e4ecf8", sky.bottom, warm); ctx.strokeText(l, cx, y);
      ctx.fillStyle = "#ffffff"; ctx.fillText(l, cx, y);
    });
  }
  if (night > 0) {
    // Letters of starlight, with stars twinkling along them.
    ctx.globalAlpha = night * fade;
    ctx.shadowColor = "rgba(190,210,255,0.9)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "rgba(250,248,232,0.9)";
    skyText.lines.forEach((l, k) => ctx.fillText(l, cx, y0 + k * skyText.lh));
    ctx.shadowBlur = 0;
    for (const [x, y, r] of skyText.points) {
      const a = Math.max(0, Math.sin(time * (1 + r * 3) + r * 40));
      ctx.fillStyle = "rgba(255,255,255," + a.toFixed(2) + ")";
      ctx.fillRect(Math.round(cx + x - 3), Math.round(y0 + y), 7, 1);
      ctx.fillRect(Math.round(cx + x), Math.round(y0 + y - 3), 1, 7);
    }
  }
  ctx.globalAlpha = fade;
  ctx.font = "13px 'Press Start 2P', monospace";
  ctx.lineWidth = 4;
  ctx.strokeStyle = night > 0.5 ? "rgba(10,12,40,0.7)" : "rgba(40,70,120,0.55)";
  ctx.strokeText(skyText.ref, VIEW_W / 2, y0 + skyText.lines.length * skyText.lh + 6);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(skyText.ref, VIEW_W / 2, y0 + skyText.lines.length * skyText.lh + 6);
  ctx.restore();
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
  const parts = squaresOf(body);
  const tex = images[body.plugin.tex];
  const tile = body.plugin.tile || TILE;
  parts.forEach((part, i) => {
    ctx.save();
    ctx.translate(part.position.x, part.position.y);
    ctx.rotate(body.angle);
    ctx.drawImage(tex, -tile / 2, -tile / 2, tile, tile);
    // A burning square glows, then chars.
    const f = fires.find((g) => g.body === body && g.index === i);
    if (f) {
      const k = Math.min(1, f.age / FIRE_BURN);
      ctx.fillStyle = "rgba(" + Math.round(255 - k * 200) + "," + Math.round(110 - k * 90) + ",30," + (0.3 + k * 0.45 + Math.sin(time * 12 + i) * 0.06).toFixed(3) + ")";
      ctx.fillRect(-tile / 2, -tile / 2, tile, tile);
    }
    ctx.restore();
  });
  if (body === active && body.plugin.curse === "haste") {
    ctx.fillStyle = "rgba(220,40,40,0.6)";
    for (let i = -1; i <= 1; i++) ctx.fillRect(body.position.x + i * 16, body.bounds.min.y - 30, 3, 22);
  }
}

// Flames on every burning square: small at first, taller as it takes hold.
function drawFires() {
  for (const f of fires) {
    const p = firePoint(f);
    const tile = f.body.plugin.tile || TILE;
    const grow = Math.min(1, 0.35 + f.age / 2);
    const spreading = f.age > f.grace;
    const base = p.y + tile / 2 - 2;
    for (let k = 0; k < 6; k++) {
      const x = p.x - tile / 2 + 2 + k * (tile - 4) / 5;
      const h = (tile * 0.9 + Math.sin(time * 14 + k * 1.7 + f.born) * tile * 0.3) * grow * (spreading ? 1.35 : 1);
      ctx.fillStyle = "#c8321a";
      ctx.fillRect(Math.round(x - 3), Math.round(base - h), 6, Math.round(h));
      ctx.fillStyle = "#ff8a2a";
      ctx.fillRect(Math.round(x - 2), Math.round(base - h * 0.75), 4, Math.round(h * 0.75));
      ctx.fillStyle = "#ffe25a";
      ctx.fillRect(Math.round(x - 1), Math.round(base - h * 0.45), 2, Math.round(h * 0.45));
    }
    // Sparks rise from a fire that is spreading.
    if (spreading) {
      ctx.fillStyle = "#ffcf5a";
      for (let k = 0; k < 3; k++) {
        const u = (time * 0.8 + k / 3 + f.born) % 1;
        ctx.fillRect(Math.round(p.x + Math.sin(u * 9 + k) * tile * 0.6), Math.round(base - tile - u * tile * 2), 3, 3);
      }
    }
  }
}

// A column of light, from the top of the screen down to where the stone will land.
function drawDropGuide() {
  if (!active || !steering) return;
  const minX = active.bounds.min.x;
  const maxX = active.bounds.max.x;
  const top = active.bounds.max.y;
  let surface = camY + VIEW_H;
  for (const r of foundRects) {
    if (r.x + r.w > minX && r.x < maxX) surface = Math.min(surface, r.top);
  }
  for (const b of landed) {
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
  const sin = demon.sin;
  const flap = sin.id === "sloth" ? 3 : 6;
  const frameName = (Math.floor(time * flap) % 2 ? "demon_a_" : "demon_b_") + sin.id;
  const [w, h] = artSize(images[frameName], FIGURE_PX);
  const fading = demon.fleeing > 0 && demon.fleeing < 99;
  if (fading) ctx.globalAlpha = Math.max(0, demon.fleeing / 1.2);
  const x = Math.round(demon.x - w / 2);
  const y = Math.round(demon.y - h / 2);
  drawSprite(frameName, x, y, FIGURE_PX);
  drawSinMark(sin, x, y);
  ctx.globalAlpha = 1;
}

// What sets each sin apart, drawn over the demon in his own pixels.
function drawSinMark(sin, x, y) {
  const P = FIGURE_PX;
  const dot = (col, row, color, wd, ht) => { ctx.fillStyle = color; ctx.fillRect(x + col * P, y + row * P, (wd || 1) * P, (ht || 1) * P); };
  const c = sin.colors;
  if (sin.id === "pride") {
    // A crown of gold, set above his horns.
    dot(7, -1, "#e8b030", 6, 1);
    for (const col of [7, 9, 10, 12]) dot(col, -2, "#e8b030");
    dot(9, -1, "#d02a3a");
    dot(10, -1, "#3a6ad8");
  } else if (sin.id === "avarice") {
    // A bag of money clutched in his claw, a coin always slipping out.
    dot(13, 8, "#6a4a1a", 3, 3);
    dot(14, 7, "#4a3010");
    dot(14, 9, "#f0c030");
    const u = (time * 1.2) % 1;
    dot(14, 11 + u * 6, "#f0c030");
  } else if (sin.id === "lust") {
    // A tail curling to a heart.
    for (const [col, row] of [[11, 9], [12, 10], [13, 11], [14, 11], [15, 10]]) dot(col, row, c.r);
    dot(15, 8, "#ff5a8a", 3, 1);
    dot(16, 9, "#ff5a8a");
    dot(15, 9, "#ff5a8a");
  } else if (sin.id === "envy") {
    // Great green eyes, always looking sideways at what others have.
    const look = Math.sin(time * 1.5) > 0 ? 1 : 0;
    dot(7, 3, "#c8ff3a", 2, 2);
    dot(11, 3, "#c8ff3a", 2, 2);
    dot(7 + look, 4, "#0a1a08");
    dot(11 + look, 4, "#0a1a08");
  } else if (sin.id === "gluttony") {
    // A round belly, and a leg of mutton in his claw.
    dot(6, 7, c.R, 8, 3);
    dot(7, 10, c.R, 6, 1);
    dot(8, 8, "#f8c88a", 4, 2);
    dot(3, 8, "#a8481a", 2, 2);
    dot(5, 9, "#f4ecd8");
  } else if (sin.id === "wrath") {
    // Fire about his horns, and a furious brow.
    for (let k = 0; k < 6; k++) {
      const hgt = 1 + Math.floor((Math.sin(time * 16 + k * 2) + 1) * 1.2);
      dot(7 + k, 1 - hgt, k % 2 ? "#ffcf5a" : "#ff6a2a", 1, hgt);
    }
    dot(7, 3, c.o, 2, 1);
    dot(11, 3, c.o, 2, 1);
  } else if (sin.id === "sloth") {
    // Heavy eyelids and a nightcap; he would rather be asleep.
    dot(8, 4, c.R, 1, 0.6);
    dot(11, 4, c.R, 1, 0.6);
    dot(8, 0, "#3a5a9a", 4, 2);
    dot(12, 0, "#3a5a9a", 2, 1);
    dot(14, 1, "#3a5a9a");
    dot(15, 2, "#ffffff");
    ctx.font = "12px 'Press Start 2P', monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#e8eef8";
    const u = (time * 0.5) % 1;
    ctx.globalAlpha *= 1 - u;
    ctx.fillText("z", x + 17 * P + u * 20, y - u * 30);
  }
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
      // Drops of holy water arcing from the monk's hands to the demon, or to a fire.
      const p = Math.min(1, e.t / e.duration);
      ctx.fillStyle = "#9fe0ff";
      for (let i = 0; i < 12; i++) {
        const f = Math.max(0, p - i * 0.04);
        const x = e.from.x + (e.to.x - e.from.x) * f + Math.sin(i * 7) * 8;
        const y = e.from.y + (e.to.y - e.from.y) * f - Math.sin(f * Math.PI) * 120 + Math.cos(i * 5) * 8;
        ctx.fillRect(Math.round(x), Math.round(y), 6, 6);
      }
    } else if (e.kind === "chip") {
      ctx.globalAlpha = Math.max(0, e.t);
      if (e.ash) { ctx.fillStyle = e.t > 0.8 ? "#ff8a2a" : "#3a3434"; ctx.fillRect(e.x, e.y, 7, 7); }
      else ctx.drawImage(images[e.tex], 3, 3, 6, 6, e.x, e.y, 8, 8);
    } else if (e.kind === "puff") {
      ctx.globalAlpha = Math.max(0, e.t * 0.8);
      ctx.fillStyle = "#e8eef4";
      ctx.fillRect(Math.round(e.x), Math.round(e.y), 10, 10);
    } else if (e.kind === "fireball" && !e.done) {
      // Fire falling from the demon onto the tower.
      const to = firePoint(e.target);
      const tile = e.target.body.plugin.tile || TILE;
      const f = Math.min(1, e.t / e.duration);
      const x = e.from.x + (to.x - e.from.x) * f;
      const y = e.from.y + (to.y - tile / 2 - e.from.y) * f * f;
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i ? "#ff8a2a" : "#ffe25a";
        ctx.globalAlpha = 1 - i * 0.18;
        ctx.fillRect(Math.round(x - 6 + i * (e.from.x - to.x) * 0.02), Math.round(y - 6 - i * 9), 12 - i, 12 - i);
      }
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
  drawSkyVerse();
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
  for (const body of Composite.allBodies(engine.world)) {
    if (body.plugin.kind === "stone") drawStone(body);
  }
  drawFires();
  drawDemon();
  drawBubble();
  drawEffects();
  drawTierPopup();
  drawRoof();
  ctx.restore();
  drawNightTint();
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
  const tex = pending === "gild" ? "stone_gold" : nextShape.tex;
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
  const list = tab === "rosaries" ? ROSARIES : SAINTS;
  const owned = tab === "rosaries" ? save.rosaries : save.saints;
  const worn = tab === "rosaries" ? save.rosary : save.saint;
  return list.map((item) => {
    const has = owned.includes(item.id);
    return {
      key: item.id, name: item.name, icon: (tab === "rosaries" ? "beads_" : "saint_") + item.id,
      price: has ? null : item.price,
      state: item.id === worn ? "worn" : has ? "own" : "buy",
      text: item.text,
      act: () => {
        if (!has) { save.coins -= item.price; owned.push(item.id); }
        if (tab === "rosaries") save.rosary = item.id;
        else save.saint = item.id;
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
    action.textContent = shopTab === "rosaries" ? "Use it" : "Build as " + pick.name.replace(/^St\. /, "");
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
const MUSIC_NAMES = {
  both: "Chant + Techno", "dubstep-chant": "Chant + Dubstep", "electro-chant": "Chant + Electro",
  chant: "Chant", techno: "Techno", dubstep: "Dubstep", electro: "Electro", off: "Silence",
};
const MUSIC_MARKS = {
  both: "♪✠", "dubstep-chant": "♪✠", "electro-chant": "♪✠",
  chant: "✠", techno: "♪", dubstep: "♪", electro: "♪", off: "–",
};

function paintSoundButtons() {
  for (const el of document.querySelectorAll(".sound-toggle")) {
    el.textContent = el.id === "music-chip" ? "♪ " + MUSIC_NAMES[save.music] : MUSIC_MARKS[save.music];
    el.setAttribute("aria-label", "Music: " + MUSIC_NAMES[save.music] + ". Tap to change.");
    el.classList.toggle("off", save.music === "off");
  }
  const label = $("music-name");
  if (label) label.textContent = MUSIC_NAMES[save.music];
}

function toggleSound() {
  const modes = Sound.MODES;
  setMusic(modes[(modes.indexOf(save.music) + 1) % modes.length]);
}

// Change the music at once, even in the middle of a tower.
function setMusic(choice) {
  Sound.unlock();
  save.music = choice;
  writeSave();
  Sound.setMode(save.music);
  if (mode === "play" || mode === "paused") {
    Sound.startMusic(HOURS[hourIndex].chant);
    if (mode === "play") flashBanner("Music: " + MUSIC_NAMES[save.music]);
  }
  paintSoundButtons();
  if (mode === "paused") renderMusicChoices();
}

// In the pause menu: the four kinds of music, to choose from directly.
function renderMusicChoices() {
  const box = $("overlay-extra");
  box.textContent = "";
  const grid = document.createElement("div");
  grid.className = "music-modes";
  for (const m of Sound.MODES) {
    const b = document.createElement("button");
    b.className = "chunky" + (m === save.music ? " current" : "");
    b.textContent = MUSIC_NAMES[m];
    b.addEventListener("click", () => setMusic(m));
    grid.append(b);
  }
  const label = document.createElement("p");
  label.className = "missions-title";
  label.textContent = "Music";
  box.append(label, grid);
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
  touch.carry += dx;
  const step = DRAG_PER_STEP;
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
  // Shop icons: rosaries in their own wood or metal, and each saint.
  for (const r of ROSARIES) {
    images["beads_" + r.id] = renderSprite({ grid: ART.beads.grid, colors: { ...ART.beads.colors, b: r.beads } });
  }
  for (const h of SAINTS) images["saint_" + h.id] = renderSprite(saintSprite("monk_idle", h.id));
  // The demon in the colours of each of the seven sins.
  for (const sin of SINS) {
    for (const f of ["demon_a", "demon_b"]) images[f + "_" + sin.id] = renderSprite({ grid: ART[f].grid, colors: { ...ART[f].colors, ...sin.colors } });
  }
  for (const el of document.querySelectorAll("[data-sprite]")) paintIcon(el, el.dataset.sprite);
  resize();
  newTower();
  showTitle();
  requestAnimationFrame(frame);
});
