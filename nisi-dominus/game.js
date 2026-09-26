// Nisi Dominus — a stacking game in the style of 99 Bricks.
// You have 99 stones. Build the tower as high as you can.
// Physics by Matter.js (lib/matter.min.js). Art in art.js.

const { Engine, Bodies, Body, Composite, Events } = Matter;

// ---------------------------------------------------------------------------
// Tuning. Most of the "feel" of the game lives in these numbers.
// ---------------------------------------------------------------------------

const VIEW_W = 360;          // logical screen width, in world pixels
const MIN_VIEW_H = 560;      // taller screens show more sky above
let VIEW_H = MIN_VIEW_H;
const PX = 2;                // one art pixel = 2 world pixels
const TILE = 12 * PX;        // one stone square; also one cubit of height
const FOUND_Y = 440;         // top of the rock foundation
const FOUND_TILES = 7;       // width of the foundation, in stones

const TOTAL_STONES = 99;
const CORNERSTONE_CHANCE = 0.08;   // a blessed stone that sets fast where it lands
const FALL_SPEED = 1.5;            // world pixels per physics step
const FALL_SPEED_PER_CUBIT = 0.015;
const MAX_FALL_SPEED = 2.6;

const PRAYER_MAX = 10;
const PRAYER_PER_STONE = 1;
const BANISH_COST = 5;             // the medal: drive off the demon
const DISSOLVE_COST = 3;           // holy water: remove the last stone laid

const DEMON_FIRST_AFTER = 8;       // stones laid before he can first appear
const DEMON_AWAY = [12, 25];       // seconds between visits (min, max)
const DEMON_STAYS = [20, 30];      // seconds per visit (min, max)
const CURSE_CHANCE = 0.35;         // chance he curses each new stone
const CURSED_FALL_FACTOR = 2.6;

const STONE = { density: 0.002, friction: 0.8, frictionStatic: 1.2, restitution: 0 };
const ICE = { density: 0.002, friction: 0.02, frictionStatic: 0.04, restitution: 0 };

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
// State
// ---------------------------------------------------------------------------

let images;
let engine;
let active = null;        // the stone being steered or dropped
let steering = false;     // true while the player controls the falling stone
let activeSpeed = FALL_SPEED;
let targetAngle = 0;
let landed = [];          // stones that have been laid, oldest first
let stonesLeft = 0;
let prayer = 0;
let spawnTimer = 0;
let endTimer = 0;
let height = 0;           // current height of the standing tower, in cubits
let bestThisRun = 0;
let bestEver = loadBest();
let camY = 0;
let towerTop = FOUND_Y;
let mode = "title";       // title | play | paused | over
let time = 0;
let blessAnim = 0;
let nextPiece;
let effects = [];         // short-lived sparkles and flashes

const demon = {
  present: false,
  leaving: 0,             // > 0 while flying off after being banished
  timer: 0,               // time until he arrives, or until he leaves
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

function loadBest() {
  try { return Number(localStorage.getItem("nisi-dominus-best")) || 0; } catch (e) { return 0; }
}

function saveBest(value) {
  try { localStorage.setItem("nisi-dominus-best", String(value)); } catch (e) { /* no storage */ }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function newGame() {
  engine = Engine.create({ enableSleeping: true });
  engine.positionIterations = 12;
  engine.velocityIterations = 8;

  const foundW = FOUND_TILES * TILE;
  const foundation = Bodies.rectangle(VIEW_W / 2, FOUND_Y + 200, foundW, 400, {
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

  active = null;
  steering = false;
  landed = [];
  stonesLeft = TOTAL_STONES;
  prayer = 0;
  spawnTimer = 0.6;
  endTimer = 0;
  height = 0;
  bestThisRun = 0;
  towerTop = FOUND_Y;
  camY = cameraTarget();
  effects = [];
  demon.present = false;
  demon.leaving = 0;
  demon.timer = rand(DEMON_AWAY[0], DEMON_AWAY[1]);
  nextPiece = pickPiece(0);
  mode = "play";
  hideOverlay();
  updateHud();
}

function pickPiece(stonesLaid) {
  return {
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    cornerstone: stonesLaid >= 3 && Math.random() < CORNERSTONE_CHANCE,
  };
}

function spawn() {
  if (stonesLeft <= 0) return;
  const piece = nextPiece;
  nextPiece = pickPiece(TOTAL_STONES - stonesLeft + 1);

  // The demon may curse this stone: ice, or a fast fall.
  let curse = null;
  if (demon.present && !demon.leaving && !piece.cornerstone && Math.random() < CURSE_CHANCE) {
    curse = Math.random() < 0.5 ? "ice" : "fast";
  }

  const x = VIEW_W / 2;
  // Start well above the tower, but not so far that the wait is tedious.
  const y = Math.max(camY + 60, towerTop - 260);
  const material = curse === "ice" ? ICE : STONE;
  const parts = piece.shape.cells.map(([cx, cy]) =>
    Bodies.rectangle(x + cx * TILE, y + cy * TILE, TILE, TILE, material)
  );
  const body = Body.create({ parts, ...material });
  body.plugin.kind = "stone";
  body.plugin.tex = curse === "ice" ? "stone_ice" : piece.shape.tex;
  body.plugin.cornerstone = piece.cornerstone;
  body.plugin.curse = curse;
  Composite.add(engine.world, body);

  active = body;
  steering = true;
  targetAngle = 0;
  activeSpeed = Math.min(MAX_FALL_SPEED, FALL_SPEED + height * FALL_SPEED_PER_CUBIT);
  if (curse === "fast") activeSpeed *= CURSED_FALL_FACTOR;
  if (curse) effects.push({ kind: "curse", from: { x: demon.x, y: demon.y }, to: body, t: 0.5 });
  stonesLeft--;
  updateHud();
}

function land() {
  const body = active;
  active = null;
  steering = false;
  if (body.plugin.cornerstone) {
    Body.setStatic(body, true);
    effects.push({ kind: "flash", x: body.position.x, y: body.position.y, t: 0.6 });
  }
  landed.push(body);
  prayer = Math.min(PRAYER_MAX, prayer + PRAYER_PER_STONE);
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
  Body.setVelocity(active, { x: 0, y: 8 });
}

// The St. Benedict medal: Vade retro, Satana.
function banish() {
  if (mode !== "play" || !demon.present || demon.leaving || prayer < BANISH_COST) return;
  prayer -= BANISH_COST;
  demon.leaving = 1.2;
  blessAnim = 1.2;
  effects.push({ kind: "flash", x: demon.x, y: demon.y, t: 0.8 });
  updateHud();
}

// Holy water: the last stone laid dissolves.
function dissolve() {
  if (mode !== "play" || prayer < DISSOLVE_COST) return;
  const body = lastLaid();
  if (!body) return;
  prayer -= DISSOLVE_COST;
  Composite.remove(engine.world, body);
  landed = landed.filter((b) => b !== body);
  // Wake the stones around it so the tower settles again.
  for (const b of landed) if (!b.isStatic) Matter.Sleeping.set(b, false);
  for (let i = 0; i < 14; i++) {
    effects.push({
      kind: "drop",
      x: body.position.x + rand(-TILE, TILE),
      y: body.position.y + rand(-TILE, TILE),
      vy: rand(-40, 10),
      t: rand(0.4, 0.8),
    });
  }
  blessAnim = 0.8;
  updateHud();
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
    showOverlay("Pausa", "The work waits for you.", "Resume", () => { mode = "play"; hideOverlay(); });
  } else if (mode === "paused") {
    mode = "play";
    hideOverlay();
  }
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
  }
  if (engine) draw(dt);
  requestAnimationFrame(frame);
}

function physicsStep() {
  if (active && steering) {
    // The steered stone falls at a steady speed and does not spin.
    Body.setAngle(active, targetAngle);
    Body.setAngularVelocity(active, 0);
    Body.setVelocity(active, { x: 0, y: activeSpeed });
  }
  Engine.update(engine, STEP);
}

function gameLogic(dt) {
  if (blessAnim > 0) blessAnim -= dt;

  // Stones that fall off the rock are lost.
  for (const body of Composite.allBodies(engine.world)) {
    if (body.plugin.kind === "stone" && body.position.y > FOUND_Y + 320) {
      Composite.remove(engine.world, body);
      landed = landed.filter((b) => b !== body);
      if (body === active) {
        active = null;
        steering = false;
        spawnTimer = 0.35;
      }
    }
  }

  // The tower's height counts only stones that are standing still.
  towerTop = FOUND_Y;
  let settling = false;
  for (const body of landed) {
    const still = body.isStatic || body.isSleeping || body.speed < 0.3;
    if (!still) { settling = true; continue; }
    if (body.bounds.min.y < towerTop) towerTop = body.bounds.min.y;
  }
  height = Math.max(0, (FOUND_Y - towerTop) / TILE);
  bestThisRun = Math.max(bestThisRun, height);

  updateDemon(dt);

  if (!active) {
    if (stonesLeft > 0) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) spawn();
    } else {
      // Out of stones: wait for the tower to settle, then count it.
      endTimer += dt;
      if ((endTimer > 1.5 && !settling) || endTimer > 6) return finish();
    }
  }

  camY += (cameraTarget() - camY) * Math.min(1, dt * 3);
  updateHud();
}

function updateDemon(dt) {
  if (demon.leaving > 0) {
    demon.leaving -= dt;
    demon.y -= 200 * dt;
    if (demon.leaving <= 0) {
      demon.present = false;
      demon.leaving = 0;
      demon.timer = rand(DEMON_AWAY[0], DEMON_AWAY[1]);
    }
    return;
  }
  const laid = TOTAL_STONES - stonesLeft;
  if (!demon.present) {
    if (laid < DEMON_FIRST_AFTER || stonesLeft === 0) return;
    demon.timer -= dt;
    if (demon.timer <= 0) {
      demon.present = true;
      demon.timer = rand(DEMON_STAYS[0], DEMON_STAYS[1]);
    }
  } else {
    demon.timer -= dt;
    if (demon.timer <= 0) {
      demon.present = false; // he gets bored and leaves
      demon.timer = rand(DEMON_AWAY[0], DEMON_AWAY[1]);
    }
  }
  // Hover back and forth near the top of the screen.
  demon.x = VIEW_W / 2 + Math.sin(time * 0.9) * 120;
  demon.y = camY + 130 + Math.sin(time * 2.3) * 10;
}

function finish() {
  mode = "over";
  const final = Number(height.toFixed(1));
  const record = final > bestEver;
  if (record) { bestEver = final; saveBest(final); }
  showOverlay(
    record ? "Deo gratias!" : "Consummatum est",
    "All 99 stones are laid. Your tower stands " + final.toFixed(1) + " cubits high" +
      (record ? ", a new record." : ". Your best is " + bestEver.toFixed(1) + "."),
    "Build again",
    newGame
  );
}

// Keep the foundation near the bottom of the screen until the tower grows,
// then keep the top of the tower in comfortable view.
function cameraTarget() {
  const bottomAnchor = MIN_VIEW_H - VIEW_H;
  return Math.min(bottomAnchor, towerTop - 300 + bottomAnchor);
}

// How far the camera has climbed above its resting place (zero or negative).
function cameraRise() {
  return camY - (MIN_VIEW_H - VIEW_H);
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function artSize(img) {
  return [(img.artWidth || img.width) * PX, (img.artHeight || img.height) * PX];
}

function drawSprite(name, x, y) {
  const img = images[name];
  const [w, h] = artSize(img);
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
  ["#8fd3ff", "#e8f6ff"],
  ["#5aa0e0", "#bfe4ff"],
  ["#3a5aa8", "#f0a878"],
  ["#1a1f4a", "#6a4a8a"],
  ["#070a1e", "#1a1f4a"],
];

function drawSky() {
  // How high the camera has climbed, as a position along the SKY list.
  const t = Math.min(SKY.length - 1.001, Math.max(0, -cameraRise() / 500));
  const i = Math.floor(t);
  const f = t - i;
  const top = mixColor(SKY[i][0], SKY[i + 1][0], f);
  const bottom = mixColor(SKY[i][1], SKY[i + 1][1], f);
  // Banded gradient, for a pixel look.
  const bands = 14;
  for (let b = 0; b < bands; b++) {
    ctx.fillStyle = mixColor(top, bottom, b / (bands - 1));
    ctx.fillRect(0, Math.floor((b * VIEW_H) / bands), VIEW_W, Math.ceil(VIEW_H / bands) + 1);
  }
  // Stars once it gets dark.
  if (t > 2.5) {
    ctx.globalAlpha = Math.min(1, t - 2.5);
    ctx.fillStyle = "#fff";
    for (let s = 0; s < 60; s++) {
      const sx = (s * 97) % VIEW_W;
      const sy = (s * 57) % VIEW_H;
      const twinkle = Math.sin(time * 2 + s) > 0.6 ? 2 : 1;
      ctx.fillRect(sx, sy, twinkle, twinkle);
    }
    ctx.globalAlpha = 1;
  }
}

function drawScenery() {
  // Clouds drift slowly and scroll at half the camera's speed.
  for (let c = 0; c < 10; c++) {
    const speed = 4 + (c % 5) * 2;
    const x = ((c * 131 + time * speed) % (VIEW_W + 80)) - 60;
    const y = 80 - c * 240 + MIN_VIEW_H - VIEW_H + cameraRise() * 0.5;
    ctx.globalAlpha = 0.85;
    drawSprite("cloud", Math.round(x), Math.round(y));
    ctx.globalAlpha = 1;
  }

  // Distant hills, with a slower scroll.
  const hillY = FOUND_Y + 40 + cameraRise() * 0.7;
  ctx.fillStyle = "#6b8fa8";
  for (let x = 0; x < VIEW_W; x += 4) {
    const h = 50 + Math.sin(x * 0.02) * 20 + Math.sin(x * 0.051 + 1) * 12;
    ctx.fillRect(x, Math.round(hillY - h), 4, 400);
  }
  ctx.fillStyle = "#4f7a5a";
  for (let x = 0; x < VIEW_W; x += 4) {
    const h = 20 + Math.sin(x * 0.03 + 2) * 10;
    ctx.fillRect(x, Math.round(hillY + 40 - h), 4, 400);
  }
}

function drawHeightMarks() {
  ctx.font = "8px 'Press Start 2P', monospace";
  ctx.textAlign = "right";
  // A faint mark every 5 cubits.
  const topVisible = camY;
  for (let c = 5; ; c += 5) {
    const y = FOUND_Y - c * TILE;
    if (y < topVisible - 20) break;
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    for (let x = 0; x < VIEW_W; x += 16) ctx.fillRect(x, y, 6, 1);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(String(c), VIEW_W - 4, y - 3);
  }
  // Your best height, in gold.
  if (bestEver > 0) {
    const y = Math.round(FOUND_Y - bestEver * TILE);
    ctx.fillStyle = "#ffd84a";
    for (let x = 0; x < VIEW_W; x += 12) ctx.fillRect(x, y, 7, 2);
    ctx.textAlign = "left";
    ctx.fillText("BEST", 4, y - 4);
  }
}

function drawFoundation() {
  // A rocky crag, widening as it goes down, drawn in granite stones.
  const tex = images.stone_granite;
  const centerX = VIEW_W / 2;
  for (let row = 0; row < 12; row++) {
    // Odd rows are shifted half a stone, like laid masonry.
    const widthTiles = FOUND_TILES + Math.floor(row / 2) * 2 + (row % 2);
    const left = centerX - (widthTiles * TILE) / 2;
    for (let i = 0; i < widthTiles; i++) {
      ctx.drawImage(tex, left + i * TILE, FOUND_Y + row * TILE, TILE, TILE);
    }
  }
  // Grass on top.
  const grassX = centerX - (FOUND_TILES * TILE) / 2;
  ctx.fillStyle = "#5fa845";
  ctx.fillRect(grassX, FOUND_Y - 2, FOUND_TILES * TILE, 4);
  ctx.fillStyle = "#86cf5c";
  ctx.fillRect(grassX, FOUND_Y - 2, FOUND_TILES * TILE, 2);

  // The monk stands on a ledge to the left of the crag.
  const ledgeX = grassX - 3 * TILE;
  const ledgeY = FOUND_Y + 3 * TILE;
  for (let i = 0; i < 3; i++) ctx.drawImage(tex, ledgeX + i * TILE, ledgeY, TILE, TILE);
  const monk = blessAnim > 0 ? "monk_bless" : "monk_idle";
  const [, mh] = artSize(images[monk]);
  const monkX = ledgeX + 16;
  drawSprite(monk, monkX, ledgeY - mh);
  if (blessAnim > 0) {
    // A glow rising from the raised hands.
    ctx.globalAlpha = Math.min(1, blessAnim) * 0.35;
    ctx.fillStyle = "#fff2a8";
    ctx.fillRect(monkX + 4, ledgeY - mh - 1200, 24, 1200);
    ctx.globalAlpha = 1;
  }
}

function drawStone(body) {
  const parts = body.parts.length > 1 ? body.parts.slice(1) : [body];
  const tex = images[body.plugin.tex];
  for (const part of parts) {
    ctx.save();
    ctx.translate(part.position.x, part.position.y);
    ctx.rotate(body.angle);
    ctx.drawImage(tex, -TILE / 2, -TILE / 2, TILE, TILE);
    if (body.plugin.cornerstone) {
      ctx.globalAlpha = body.isStatic ? 0.9 : 0.6 + Math.sin(time * 8) * 0.3;
      ctx.drawImage(images.blessed, -TILE / 2, -TILE / 2, TILE, TILE);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  if (body === active && body.plugin.curse === "fast") {
    // Speed streaks trailing above a cursed stone.
    ctx.fillStyle = "rgba(200,40,40,0.6)";
    for (let i = -1; i <= 1; i++) {
      ctx.fillRect(body.position.x + i * 14, body.bounds.min.y - 26, 2, 18);
    }
  }
}

function drawDemon() {
  if (!demon.present) return;
  const frameName = Math.floor(time * 6) % 2 ? "demon_a" : "demon_b";
  const [w, h] = artSize(images[frameName]);
  if (demon.leaving > 0) ctx.globalAlpha = Math.max(0, demon.leaving / 1.2);
  drawSprite(frameName, Math.round(demon.x - w / 2), Math.round(demon.y - h / 2));
  ctx.globalAlpha = 1;
}

function drawEffects(dt) {
  for (const e of effects) {
    e.t -= dt;
    if (e.kind === "flash") {
      ctx.globalAlpha = Math.max(0, e.t);
      ctx.fillStyle = "#fff2a8";
      const r = (1 - e.t) * 60 + 10;
      ctx.fillRect(e.x - r / 2, e.y - r / 2, r, r);
    } else if (e.kind === "curse") {
      // A crackle of red from the demon down to the stone.
      ctx.globalAlpha = Math.max(0, e.t * 2);
      ctx.fillStyle = "#ff4a3a";
      const steps = 8;
      for (let i = 0; i <= steps; i++) {
        const x = e.from.x + (e.to.position.x - e.from.x) * (i / steps) + rand(-5, 5);
        const y = e.from.y + (e.to.position.y - e.from.y) * (i / steps);
        ctx.fillRect(x, y, 4, 4);
      }
    } else if (e.kind === "drop") {
      e.vy += 200 * dt;
      e.y += e.vy * dt;
      ctx.globalAlpha = Math.max(0, e.t * 1.5);
      ctx.fillStyle = "#9fe0ff";
      ctx.fillRect(e.x, e.y, 3, 3);
    }
    ctx.globalAlpha = 1;
  }
  effects = effects.filter((e) => e.t > 0);
}

function drawNextPreview() {
  // A small preview of the next stone, top-left.
  const size = 10;
  const x0 = 24;
  const y0 = 24;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x0 - 20, y0 - 18, 44, 36);
  if (stonesLeft <= 0) return;
  for (const [cx, cy] of nextPiece.shape.cells) {
    const x = x0 + cx * size - size / 2 + 2;
    const y = y0 + cy * size - size / 2;
    ctx.drawImage(images[nextPiece.shape.tex], x, y, size, size);
    if (nextPiece.cornerstone) ctx.drawImage(images.blessed, x, y, size, size);
  }
}

function draw(dt) {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  drawSky();
  ctx.save();
  ctx.translate(0, -Math.round(camY));
  drawScenery();
  drawFoundation();
  drawHeightMarks();
  for (const body of Composite.allBodies(engine.world)) {
    if (body.plugin.kind === "stone") drawStone(body);
  }
  drawDemon();
  drawEffects(mode === "play" ? dt : 0);
  ctx.restore();
  drawNextPreview();
}

// ---------------------------------------------------------------------------
// HUD and overlays
// ---------------------------------------------------------------------------

function updateHud() {
  $("height").textContent = height.toFixed(1);
  $("stones").textContent = stonesLeft;
  $("prayer-fill").style.width = (prayer / PRAYER_MAX) * 100 + "%";
  $("prayer-count").textContent = prayer;
  $("btn-banish").disabled = !(demon.present && !demon.leaving && prayer >= BANISH_COST);
  $("btn-dissolve").disabled = prayer < DISSOLVE_COST || landed.length === 0;
}

let overlayAction = null;

function showOverlay(title, text, button, action) {
  $("overlay-title").textContent = title;
  $("overlay-text").textContent = text;
  $("overlay-btn").textContent = button;
  overlayAction = action;
  $("overlay").hidden = false;
}

function hideOverlay() {
  $("overlay").hidden = true;
}

$("overlay-btn").addEventListener("click", () => overlayAction && overlayAction());

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

document.addEventListener("keydown", (e) => {
  if (!$("overlay").hidden && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    if (overlayAction) overlayAction();
    return;
  }
  const actions = {
    ArrowLeft: () => move(-1),
    ArrowRight: () => move(1),
    ArrowUp: rotate,
    ArrowDown: drop,
    " ": drop,
    m: banish,
    M: banish,
    h: dissolve,
    H: dissolve,
    p: togglePause,
    P: togglePause,
    Escape: togglePause,
  };
  if (actions[e.key]) {
    e.preventDefault();
    actions[e.key]();
  }
});

// On-screen buttons. Arrow buttons repeat while held.
function bindButton(id, action, repeat) {
  const el = $(id);
  let timer = null;
  const stop = () => { clearInterval(timer); timer = null; };
  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    action();
    if (repeat) { stop(); timer = setInterval(action, 110); }
  });
  el.addEventListener("pointerup", stop);
  el.addEventListener("pointerleave", stop);
  el.addEventListener("pointercancel", stop);
}

bindButton("btn-left", () => move(-1), true);
bindButton("btn-right", () => move(1), true);
bindButton("btn-rotate", rotate, false);
bindButton("btn-drop", drop, false);
bindButton("btn-banish", banish, false);
bindButton("btn-dissolve", dissolve, false);
bindButton("btn-pause", togglePause, false);

// Touch on the play area: drag sideways to steer, tap to turn, flick down to drop.
let touch = null;
canvas.addEventListener("pointerdown", (e) => {
  touch = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, carry: 0 };
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
  if (dy > 50 && dt < 400) drop();
  else if (touch.moved < 8 && Math.abs(dy) < 8 && dt < 300) rotate();
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
  // Paint the button icons from the same art.
  for (const el of document.querySelectorAll("[data-sprite]")) {
    const src = images[el.dataset.sprite];
    el.width = src.width;
    el.height = src.height;
    el.getContext("2d").drawImage(src, 0, 0);
  }
  resize();
  newGame();
  mode = "title";
  showOverlay(
    "Nisi Dominus",
    "You have 99 stones. Build the tower as high as you can. " +
      "Steer with the arrows or drag, tap to turn, flick down to drop. " +
      "Stones marked with a cross set fast where they land. " +
      "Each stone you lay adds to your prayer: spend it on the medal to drive off the demon, " +
      "or on holy water to dissolve the last stone you laid.",
    "Begin",
    newGame
  );
  requestAnimationFrame(frame);
});
