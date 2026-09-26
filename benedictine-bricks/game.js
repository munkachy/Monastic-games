// Benedictine Bricks — a stacking game in the style of 99 Bricks Wizard Academy.
// Build the tower as high as you can. When your candles are out, the tower is finished.
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
const TILE = 12 * PX;        // one stone square; also one cubit of height
const FOUND_Y = MIN_VIEW_H - 120;  // top of the rock foundation
const TOWER_TOP_AT = 0.55;   // where the top of the tower sits on screen (0 top, 1 bottom)

const TIER_CUBITS = 10;      // every 10 cubits the tower below sets solid
const FALL_SPEED = 1.0;      // world pixels per physics step, at the start
const FALL_SPEED_PER_TIER = 0.2;  // a little faster at each new tier
const MAX_FALL_SPEED = 2.6;
const MAX_DROP_SPEED = 5;
const LANDING_DAMPING = 0.3; // share of speed a stone keeps when it lands

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
const BUBBLE_SPELLS = ["mortar", "scaffold", "gild"];
const BUBBLE_EVERY = [16, 28];     // seconds between bubbles (min, max)
const GOLD_BONUS = 10;             // coins for a gilded stone

const DEMON_FIRST_AT = 5;          // cubits of height before his first visit
const DEMON_AWAY = [18, 32];       // seconds between visits (min, max)
const DEMON_CURSES = 3;            // curses per visit
const CURSE_CHANCE = 0.45;         // chance he curses each new stone while here
const HASTE_FACTOR = 2.6;
const HUGE_FACTOR = 1.5;

const STONE = { density: 0.002, friction: 0.9, frictionStatic: 1.4, frictionAir: 0.02, restitution: 0 };
const ICE = { density: 0.002, friction: 0.02, frictionStatic: 0.04, frictionAir: 0.02, restitution: 0 };

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
const MORTAR_COST_BY_LEVEL = [3, 2, 1];

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
      { price: 250, text: "Mortar costs 2 prayer." },
      { price: 600, text: "Mortar costs 1 prayer." },
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
  { id: "olive", name: "Olive-wood rosary", price: 200, beads: "#7a8a3a", spell: "mortar", text: "Every tower starts with Mortar." },
  { id: "silver", name: "Silver rosary", price: 450, beads: "#c8d0d8", spell: "scaffold", text: "Every tower starts with Scaffold." },
  { id: "gold", name: "Gold rosary", price: 700, beads: "#f0c030", spell: "gild", text: "Every tower starts with Gild." },
];

const HABITS = [
  { id: "black", name: "Benedictine black", price: 0, colors: {}, text: "The black habit of the Order of St. Benedict." },
  { id: "white", name: "Olivetan white", price: 150, colors: { K: "#e9e6dc", k: "#bdb8aa" }, text: "The white habit of the Olivetan Benedictines." },
  { id: "blue", name: "Sylvestrine blue", price: 150, colors: { K: "#1f2f5a", k: "#3a4f86" }, text: "The blue habit of the Sylvestrine Benedictines." },
];

// ---------------------------------------------------------------------------
// Saved progress (coins, best height, what you own). Stored on this device only.
// ---------------------------------------------------------------------------

const SAVE_KEY = "benedictine-bricks";
const save = loadSave();

function loadSave() {
  const fresh = {
    coins: 0, best: 0, prayerLevel: 0, candle: 0, trowel: 0, foundation: 0, medal: 0,
    rosaries: ["boxwood"], rosary: "boxwood", habits: ["black"], habit: "black",
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
let foundTiles = 7;
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
  engine.positionIterations = 12;
  engine.velocityIterations = 8;

  foundTiles = FOUNDATION_BY_LEVEL[save.foundation];
  const foundation = Bodies.rectangle(VIEW_W / 2, FOUND_Y + 200, foundTiles * TILE, 400, {
    isStatic: true,
    friction: 1,
    frictionStatic: 1.5,
    label: "foundation",
  });
  Composite.add(engine.world, foundation);

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
    curse = ["ice", "haste", "huge"][Math.floor(Math.random() * 3)];
    demon.curses--;
  }

  const tile = curse === "huge" ? TILE * HUGE_FACTOR : TILE;
  const x = VIEW_W / 2;
  // Start well above the tower, but not so far that the wait is tedious.
  const y = Math.max(camY + VIEW_H * 0.12, towerTop - 380);
  const material = curse === "ice" ? ICE : STONE;
  const parts = shape.cells.map(([cx, cy]) =>
    Bodies.rectangle(x + cx * tile, y + cy * tile, tile, tile, material)
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
  if (pending) {
    enchant(body, pending);
    pending = null;
  }
  if (curse) {
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
  }
  let coins = 1;
  if (body.plugin.gold) coins += GOLD_BONUS;
  earned += coins * multiplier;
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
  const x = Math.max(half, Math.min(VIEW_W - half, active.position.x + dir * half));
  Body.setPosition(active, { x, y: active.position.y });
}

function rotate() {
  if (mode !== "play" || !active || !steering) return;
  targetAngle += Math.PI / 2;
  Body.setAngle(active, targetAngle);
}

function drop() {
  if (mode !== "play" || !active || !steering) return;
  steering = false;
  Body.setVelocity(active, { x: 0, y: MAX_DROP_SPEED });
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
  blessAnim = 1;
}

// Zap: a bolt from heaven breaks the last stone laid.
function zap() {
  const body = lastLaid();
  const x = body.position.x;
  const y = body.position.y;
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
  if (spell === "prayer") {
    prayer = Math.min(prayerMax, prayer + PRAYER_FROM_BUBBLE);
    flashBanner("+" + PRAYER_FROM_BUBBLE + " prayer");
  } else {
    known.add(spell);
    flashBanner(SPELLS[spell].name + " learned");
  }
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
  if (tierPopup && (tierPopup.t -= dt) <= 0) tierPopup = null;

  // Stones that fall off the tower are lost, and a candle goes out.
  const screenBottom = camY + VIEW_H;
  for (const body of Composite.allBodies(engine.world)) {
    if (body.plugin.kind !== "stone" || body.isStatic) continue;
    const gone = body.position.y > FOUND_Y + 320 ||
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
  }

  updateDemon(dt);
  updateBubble(dt);

  if (lost >= lives) {
    endTimer += dt;
    if (endTimer > 1.2) return finish();
  } else if (!active) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) spawn();
  }

  camY += (cameraTarget() - camY) * Math.min(1, dt * 3);
  updateHud();
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
  const unknown = BUBBLE_SPELLS.filter((s) => !known.has(s));
  const spell = unknown.length ? unknown[Math.floor(Math.random() * unknown.length)] : "prayer";
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
  const record = final > save.best;
  if (record) save.best = final;
  save.coins += earned;
  writeSave();
  reopenOverlay = () => showOverlay(
    record ? "Deo gratias!" : "Consummatum est",
    "Your tower stands " + final.toFixed(1) + " cubits high" +
      (record ? ", a new record." : ". Your best is " + save.best.toFixed(1) + ".") +
      " You earned " + earned + " coins, and have " + save.coins + " in all.",
    ["Build again", newTower],
    ["Shop", openShop]
  );
  reopenOverlay();
}

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

// Sky colors from the ground (index 0) up into the night.
const SKY = [
  ["#7fd0f5", "#d8f2ff"],
  ["#62c8d8", "#b8f0e0"],
  ["#5aa0e0", "#f0c8a0"],
  ["#2a2f6a", "#8a5a9a"],
  ["#070a1e", "#1a1f4a"],
];

function drawSky() {
  const t = Math.min(SKY.length - 1.001, Math.max(0, -cameraRise() / 800));
  const i = Math.floor(t);
  const f = t - i;
  const top = mixColor(SKY[i][0], SKY[i + 1][0], f);
  const bottom = mixColor(SKY[i][1], SKY[i + 1][1], f);
  // Banded gradient, for a pixel look.
  const bands = 18;
  for (let b = 0; b < bands; b++) {
    ctx.fillStyle = mixColor(top, bottom, b / (bands - 1));
    ctx.fillRect(0, Math.floor((b * VIEW_H) / bands), VIEW_W, Math.ceil(VIEW_H / bands) + 1);
  }
  if (t > 2.5) {
    ctx.globalAlpha = Math.min(1, t - 2.5);
    ctx.fillStyle = "#fff";
    for (let s = 0; s < 110; s++) {
      const sx = (s * 97) % VIEW_W;
      const sy = (s * 57) % VIEW_H;
      const twinkle = Math.sin(time * 2 + s) > 0.6 ? 3 : 2;
      ctx.fillRect(sx, sy, twinkle, twinkle);
    }
    ctx.globalAlpha = 1;
  }
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
  const farY = FOUND_Y + 30 + cameraRise() * 0.8;
  ctx.fillStyle = "#7aa6c0";
  for (let x = 0; x < VIEW_W; x += 4) {
    const h = 150 - Math.abs(((x + 120) % 360) - 180) * 0.8 + Math.sin(x * 0.05) * 6;
    ctx.fillRect(x, Math.round(farY - h), 4, 600);
  }
  const hillY = FOUND_Y + 60 + cameraRise() * 0.7;
  ctx.fillStyle = "#4f8a6a";
  for (let x = 0; x < VIEW_W; x += 4) {
    const h = 60 + Math.sin(x * 0.012 + 1) * 24 + Math.sin(x * 0.041) * 8;
    ctx.fillRect(x, Math.round(hillY - h), 4, 600);
  }
  ctx.fillStyle = "#3a6e50";
  for (let x = 0; x < VIEW_W; x += 4) {
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

function foundationLeft() {
  return VIEW_W / 2 - (foundTiles * TILE) / 2;
}

function ledge() {
  return { x: foundationLeft() - 5 * TILE, y: FOUND_Y + 3 * TILE };
}

// The monk climbs his scaffold so he stays on screen as the tower rises.
function monkFeetY() {
  return Math.min(ledge().y, camY + VIEW_H - 40);
}

function monkHands() {
  const l = ledge();
  return { x: l.x + 48, y: monkFeetY() - 60 };
}

function drawFoundation() {
  const tex = images.stone_granite;
  const centerX = VIEW_W / 2;
  for (let row = 0; row < 14; row++) {
    // Odd rows are shifted half a stone, like laid masonry.
    const widthTiles = foundTiles + Math.floor(row / 2) * 2 + (row % 2);
    const left = centerX - (widthTiles * TILE) / 2;
    for (let i = 0; i < widthTiles; i++) {
      ctx.drawImage(tex, left + i * TILE, FOUND_Y + row * TILE, TILE, TILE);
    }
  }
  const grassX = foundationLeft();
  ctx.fillStyle = "#5fa845";
  ctx.fillRect(grassX, FOUND_Y - 2, foundTiles * TILE, 4);
  ctx.fillStyle = "#86cf5c";
  ctx.fillRect(grassX, FOUND_Y - 2, foundTiles * TILE, 2);

  // The ledge, the scaffold above it, and the monk.
  const l = ledge();
  const w = 4 * TILE;
  for (let i = 0; i < 4; i++) ctx.drawImage(tex, l.x + i * TILE, l.y, TILE, TILE);
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
  if (!active || !steering) return;
  const minX = active.bounds.min.x;
  const maxX = active.bounds.max.x;
  const top = active.bounds.max.y;
  const foundL = foundationLeft();
  let surface = maxX > foundL && minX < foundL + foundTiles * TILE ? FOUND_Y : camY + VIEW_H;
  for (const b of landed.concat(planks)) {
    if (b.bounds.max.x > minX && b.bounds.min.x < maxX && b.bounds.min.y > top) {
      surface = Math.min(surface, b.bounds.min.y);
    }
  }
  ctx.fillStyle = "rgba(255,255,240,0.16)";
  ctx.fillRect(minX, camY, maxX - minX, Math.max(0, surface - camY));
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
  ctx.translate(0, -Math.round(camY));
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
  ctx.restore();
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
  $("shop").hidden = true;
  $("overlay").hidden = false;
}

function hideScreens() {
  $("overlay").hidden = true;
  $("shop").hidden = true;
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
  mode = "title";
  reopenOverlay = () => showOverlay(
    "Benedictine Bricks",
    "Build the abbey tower as high as you can. Each stone you drop puts out a candle; when they are all out, the tower is finished. " +
      "Drag to steer, tap to turn, swipe down to drop. " +
      "Each stone you lay adds prayer. Spend it on the spells at the right: holy water drives off the demon, " +
      "the bolt breaks your last stone. Tap the bubbles that float past to learn new spells.",
    ["Begin", newTower],
    ["Shop", openShop]
  );
  reopenOverlay();
  requestAnimationFrame(frame);
});
