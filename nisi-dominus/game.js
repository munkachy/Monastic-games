// Nisi Dominus — a stacking game in the style of 99 Bricks.
// Physics by Matter.js (lib/matter.min.js). Art in art.js.

const { Engine, Bodies, Body, Composite, Events } = Matter;

// ---------------------------------------------------------------------------
// Tuning. Most of the "feel" of the game lives in these numbers.
// ---------------------------------------------------------------------------

const VIEW_W = 360;          // logical screen width, in world pixels
const MIN_VIEW_H = 560;      // taller screens show more sky above
let VIEW_H = MIN_VIEW_H;
const PX = 2;                // one art pixel = 2 world pixels
const TILE = 12 * PX;        // one stone square
const FOUND_Y = 440;         // top of the rock foundation
const FOUND_TILES = 7;       // width of the foundation, in stones
const HOLD_SECONDS = 3;      // how long the tower must stand at the goal
const BLESS_COUNT = 4;       // how many recent stones one blessing sets fast
const STONES_PER_BLESSING = 6;

const STONE = {
  density: 0.002,
  friction: 0.8,
  frictionStatic: 1.2,
  restitution: 0,
};

function levelSettings(n) {
  return {
    goalTiles: 5 + 3 * n,             // level 1: 8 stones high
    stones: 16 + 6 * n,
    fallSpeed: 1.5 + 0.12 * (n - 1),  // world pixels per physics step
    impChance: n === 1 ? 0 : Math.min(0.1 + 0.03 * n, 0.3),
  };
}

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
let level = 1;
let settings;
let active = null;        // the stone being steered or dropped
let steering = false;     // true while the player controls the falling stone
let targetAngle = 0;
let landed = [];          // stones that have come to rest, oldest first
let stonesLeft = 0;
let placed = 0;
let blessings = 1;
let spawnTimer = 0;
let holdTimer = 0;
let loseTimer = 0;
let blessAnim = 0;
let camY = 0;
let towerTop = FOUND_Y;
let mode = "title";       // title | play | paused | won | lost
let time = 0;
let nextShape = randomShape();

const $ = (id) => document.getElementById(id);
const canvas = $("game");
const ctx = canvas.getContext("2d");
let scale = 1;

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function startLevel(n) {
  level = n;
  settings = levelSettings(n);
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
  stonesLeft = settings.stones;
  placed = 0;
  blessings = 1;
  spawnTimer = 0.6;
  holdTimer = 0;
  loseTimer = 0;
  towerTop = FOUND_Y;
  camY = cameraTarget();
  nextShape = randomShape();
  mode = "play";
  hideOverlay();
  updateHud();
}

function randomShape() {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)];
}

function spawn() {
  if (stonesLeft <= 0) return;
  const shape = nextShape;
  nextShape = randomShape();
  const x = VIEW_W / 2;
  // Start well above the tower, but not so far that the wait is tedious.
  const y = Math.max(camY + 60, towerTop - 260);
  const parts = shape.cells.map(([cx, cy]) =>
    Bodies.rectangle(x + cx * TILE, y + cy * TILE, TILE, TILE, STONE)
  );
  const body = Body.create({ parts, ...STONE });
  body.plugin.kind = "stone";
  body.plugin.tex = shape.tex;
  if (Math.random() < settings.impChance) {
    body.plugin.imp = true;
    Body.setDensity(body, STONE.density * 4);
  }
  Composite.add(engine.world, body);
  active = body;
  steering = true;
  targetAngle = 0;
  stonesLeft--;
  updateHud();
}

function land() {
  const body = active;
  active = null;
  steering = false;
  landed.push(body);
  placed++;
  if (placed % STONES_PER_BLESSING === 0) blessings++;
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

function bless() {
  if (mode !== "play" || blessings <= 0) return;
  const stones = landed
    .filter((b) => Composite.get(engine.world, b.id, "body") && !b.isStatic)
    .slice(-BLESS_COUNT);
  if (stones.length === 0) return;
  for (const body of stones) {
    Body.setStatic(body, true);
    body.plugin.blessed = true;
    body.plugin.imp = false; // Vade retro, Satana.
  }
  blessings--;
  blessAnim = 1.2;
  updateHud();
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
  if (engine) draw();
  requestAnimationFrame(frame);
}

function physicsStep() {
  if (active && steering) {
    // The steered stone falls at a steady speed and does not spin.
    Body.setAngle(active, targetAngle);
    Body.setAngularVelocity(active, 0);
    Body.setVelocity(active, { x: 0, y: settings.fallSpeed });
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

  // The top of the tower, counting only stones at rest.
  towerTop = FOUND_Y;
  for (const body of landed) {
    if (body.bounds.min.y < towerTop) towerTop = body.bounds.min.y;
  }

  const goalY = FOUND_Y - settings.goalTiles * TILE;
  if (towerTop <= goalY) {
    holdTimer += dt;
    if (holdTimer >= HOLD_SECONDS) return win();
  } else {
    holdTimer = 0;
  }

  // Spawn the next stone, but not while the bell is ringing.
  if (!active && holdTimer === 0) {
    if (stonesLeft > 0) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) spawn();
    } else {
      loseTimer += dt;
      if (loseTimer > 3) return lose();
    }
  } else {
    loseTimer = 0;
  }

  // Keep the top of the tower in comfortable view.
  camY += (cameraTarget() - camY) * Math.min(1, dt * 3);
}

// Keep the foundation near the bottom of the screen until the tower grows,
// then keep the top of the tower in comfortable view.
// How far the camera has climbed above its resting place (zero or negative).
function cameraRise() {
  return camY - (MIN_VIEW_H - VIEW_H);
}

function cameraTarget() {
  const bottomAnchor = MIN_VIEW_H - VIEW_H;
  return Math.min(bottomAnchor, towerTop - 300 + bottomAnchor);
}

function win() {
  mode = "won";
  showOverlay(
    "Deo gratias!",
    "Gradus " + roman(level) + " is built, with " + stonesLeft + " stones to spare.",
    "Next level",
    () => startLevel(level + 1)
  );
}

function lose() {
  mode = "lost";
  showOverlay(
    "In vanum laboraverunt",
    "The stones ran out. Unless the Lord builds the house, they labor in vain who build it.",
    "Try again",
    () => startLevel(level)
  );
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function artSize(img) {
  return [(img.artWidth || img.width) * PX, (img.artHeight || img.height) * PX];
}

function drawSprite(name, x, y, flip) {
  const img = images[name];
  const [w, h] = artSize(img);
  if (flip) {
    ctx.save();
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(img, x, y, w, h);
  }
}

function lerpColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p, s) => (p >> s) & 255;
  const mix = (s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return "rgb(" + mix(16) + "," + mix(8) + "," + mix(0) + ")";
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
  const climbed = -cameraRise();
  const t = Math.min(SKY.length - 1.001, Math.max(0, climbed / 700));
  const i = Math.floor(t);
  const f = t - i;
  const top = lerpColor(SKY[i][0], SKY[i + 1][0], f);
  const bottom = lerpColor(SKY[i][1], SKY[i + 1][1], f);
  // Banded gradient, for a pixel look.
  const bands = 14;
  for (let b = 0; b < bands; b++) {
    ctx.fillStyle = lerpColor(rgbToHex(top), rgbToHex(bottom), b / (bands - 1));
    ctx.fillRect(0, Math.floor((b * VIEW_H) / bands), VIEW_W, Math.ceil(VIEW_H / bands) + 1);
  }
  // Stars once it gets dark.
  if (t > 2.5) {
    ctx.globalAlpha = Math.min(1, t - 2.5);
    ctx.fillStyle = "#fff";
    for (let s = 0; s < 60; s++) {
      const sx = (s * 97) % VIEW_W;
      const sy = (((s * 57) % VIEW_H) - camY * 0.05) % VIEW_H;
      const twinkle = Math.sin(time * 2 + s) > 0.6 ? 2 : 1;
      ctx.fillRect(sx, (sy + VIEW_H) % VIEW_H, twinkle, twinkle);
    }
    ctx.globalAlpha = 1;
  }
}

function rgbToHex(rgb) {
  const [r, g, b] = rgb.match(/\d+/g).map(Number);
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function drawScenery() {
  // Clouds drift slowly and scroll a little with the camera.
  for (let c = 0; c < 5; c++) {
    const speed = 4 + c * 2;
    const x = ((c * 131 + time * speed) % (VIEW_W + 80)) - 60;
    // World y chosen so the clouds scroll at half the camera's speed.
    const y = 80 - c * 220 + MIN_VIEW_H - VIEW_H + cameraRise() * 0.5;
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
  ctx.fillStyle = "#5fa845";
  ctx.fillRect(centerX - (FOUND_TILES * TILE) / 2, FOUND_Y - 2, FOUND_TILES * TILE, 4);
  ctx.fillStyle = "#86cf5c";
  ctx.fillRect(centerX - (FOUND_TILES * TILE) / 2, FOUND_Y - 2, FOUND_TILES * TILE, 2);

  // The monk stands on a ledge to the left of the crag.
  const ledgeX = centerX - (FOUND_TILES * TILE) / 2 - 3 * TILE;
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
    ctx.fillRect(monkX + 4, ledgeY - mh - 600, 24, 600);
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
    if (body.plugin.imp) {
      ctx.fillStyle = "rgba(60,0,0,0.35)";
      ctx.fillRect(-TILE / 2, -TILE / 2, TILE, TILE);
    }
    if (body.plugin.blessed) {
      ctx.globalAlpha = 0.8;
      ctx.drawImage(images.blessed, -TILE / 2, -TILE / 2, TILE, TILE);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  if (body.plugin.imp) {
    // The imp sits on top of its stone, bobbing.
    const frameName = Math.floor(time * 4) % 2 ? "imp_a" : "imp_b";
    const [w, h] = artSize(images[frameName]);
    drawSprite(frameName, Math.round(body.position.x - w / 2), Math.round(body.bounds.min.y - h + 2));
  }
}

function drawGoal() {
  const goalY = FOUND_Y - settings.goalTiles * TILE;
  const screenY = goalY - camY;
  ctx.fillStyle = holdTimer > 0 ? "#ffe26a" : "#ffd84a";
  if (screenY < 8) {
    // Goal is above the screen: show an arrow.
    const top = camY + 8;
    ctx.fillRect(VIEW_W - 22, top + 4, 12, 4);
    ctx.fillRect(VIEW_W - 18, top, 4, 4);
    ctx.fillRect(VIEW_W - 18, top + 8, 4, 8);
    return;
  }
  for (let x = 0; x < VIEW_W; x += 12) ctx.fillRect(x, goalY, 7, 2);
  ctx.drawImage(images.bell, 4, goalY - 22, 24, 20);
}

function drawHoldBell() {
  if (holdTimer <= 0) return;
  const left = Math.max(1, Math.ceil(HOLD_SECONDS - holdTimer));
  const swing = Math.sin(time * 12) * 0.3;
  ctx.save();
  ctx.translate(VIEW_W / 2, 90);
  ctx.rotate(swing);
  ctx.drawImage(images.bell, -24, 0, 48, 40);
  ctx.restore();
  ctx.fillStyle = "#fff";
  ctx.font = "16px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillText(String(left), VIEW_W / 2, 158);
}

function drawNextPreview() {
  // A small preview of the next stone, top-left.
  const size = 10;
  const x0 = 24;
  const y0 = 24;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x0 - 20, y0 - 18, 44, 36);
  for (const [cx, cy] of nextShape.cells) {
    ctx.drawImage(images[nextShape.tex], x0 + cx * size - size / 2 + 2, y0 + cy * size - size / 2, size, size);
  }
}

function draw() {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  drawSky();
  ctx.save();
  ctx.translate(0, -Math.round(camY));
  drawScenery();
  drawFoundation();
  for (const body of Composite.allBodies(engine.world)) {
    if (body.plugin.kind === "stone") drawStone(body);
  }
  drawGoal();
  ctx.restore();
  drawHoldBell();
  drawNextPreview();
}

// ---------------------------------------------------------------------------
// HUD and overlays
// ---------------------------------------------------------------------------

function roman(n) {
  const table = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  for (const [v, s] of table) while (n >= v) { out += s; n -= v; }
  return out;
}

function updateHud() {
  $("level").textContent = "Gradus " + roman(level);
  $("stones").textContent = stonesLeft;
  $("bless-count").textContent = blessings;
  $("btn-bless").disabled = blessings <= 0;
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
    b: bless,
    B: bless,
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
bindButton("btn-bless", bless, false);
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
  if (engine && mode !== "play") camY = cameraTarget();
  canvas.style.width = VIEW_W * scale + "px";
  canvas.style.height = VIEW_H * scale + "px";
  canvas.width = Math.round(VIEW_W * scale * dpr);
  canvas.height = Math.round(VIEW_H * scale * dpr);
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
  startLevel(1);
  mode = "title";
  showOverlay(
    "Nisi Dominus",
    "Stack the stones to the golden line and hold them there while the bell rings. " +
      "Steer with the arrows or drag, tap to turn, flick down to drop. " +
      "The medal blesses your last stones and sets them fast.",
    "Begin",
    () => startLevel(1)
  );
  requestAnimationFrame(frame);
});
