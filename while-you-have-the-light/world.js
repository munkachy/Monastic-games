"use strict";
// While You Have the Light: the world. The rock is a grid of cells 16 px square, written out below
// as rows of letters; the monk is three cells tall. From the grid come the ways he can go (walk,
// step, climb, leap, drop: the moves of Prince of Persia), the routes between any two places, the
// reach of the torchlight (rock casts shadows), and the crags as they are drawn: flat on top where
// he stands, sharp and broken everywhere else, hanging in spikes beneath every overhang.

const CS = 16;

// ---- The Hollow -----------------------------------------------------------------------------------
// A deep cleft in the mountain. Terraced cliffs on both sides, a tunnel into a cave on the left, a
// spire in the middle of the hollow, and a ladder of floating crags rising into the sky.
//   #  rock               .  air                 :  air, with a cave's back wall behind it
//   o  a thing lying      f  a flask of holy water
//   S  a crack in the rock the demons come up out of        M  where the monk begins
const HOLLOW = [
  "##............................................................................................##",
  "##............................................................................................##",
  "##............................................................................................##",
  "##............................................................................................##",
  "##............................................................................................##",
  "##............................................................................................##",
  "##.........................................................f..................................##",
  "##.......................................................######...............................##",
  "##.S.....................................................######...............................##",
  "####......................................................####................................##",
  "######.....................................................##.................................##",
  "######...............................................o........................................##",
  "######.............................................######...................................S.##",
  "#########..........................................######..................................#####",
  "#########...........................................####...................................#####",
  "#########............................................##....................................#####",
  "#########..................................................................................#####",
  "#############................................######......................................f.#####",
  "#############................................######....................................#########",
  "#############.................................####.....................................#########",
  "#############..................................##......................................#########",
  "#################......................................................................#########",
  "#################.......................#####.......................................o..#########",
  "#################......#####............#####......................................#############",
  "#################......#####.............###.......................................#############",
  "####################....###...............#........................................#############",
  "####:::::::::::#####.....#....................o....................................#############",
  "####:::::::::::#####..........o..............#####.................................#############",
  "####:::::::::::#####........#######..........#####.....................S........################",
  "####:::###:::::#######..o...#######..........#####...................######.....################",
  "####:::###:::::##########....#####...........#####...................######.....################",
  "####:::::::::::##########.....###............#####....................####...###################",
  "####:::::::::::#######.........#............#######....................##....###################",
  "####:o:::::::::#######......................#######.............................################",
  "#######:::::::::::::::......................#######.............................################",
  "#######:::::::::::::::...###................#######.............................################",
  "####::::::::::::::::::...###................#######.........................###.################",
  "####::::::::::::::::::.....................#########........................###.################",
  "####S:::::f:o::::::::S.....................#########........o...S...............################",
  "######################.....o...............#########..M..########...o...........################",
  "###############################..o.o.......############################....o...S################",
  "#####################################S..o..#####################################################",
  "################################################################################################",
  "################################################################################################",
  "################################################################################################",
  "################################################################################################",
  "################################################################################################",
  "################################################################################################",
];

// A tiny binary heap of node ids keyed by a number, for the route-finding.
function Heap() { this.ids = []; this.keys = []; }
Heap.prototype.push = function (id, k) {
  const a = this.ids, b = this.keys; let i = a.length; a.push(id); b.push(k);
  while (i > 0) { const p = (i - 1) >> 1; if (b[p] <= k) break; a[i] = a[p]; b[i] = b[p]; i = p; }
  a[i] = id; b[i] = k;
};
Heap.prototype.pop = function () {
  const a = this.ids, b = this.keys, top = a[0], lastId = a.pop(), lastK = b.pop(), n = a.length;
  if (n) {
    let i = 0;
    for (; ;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && b[c + 1] < b[c]) c++; if (b[c] >= lastK) break; a[i] = a[c]; b[i] = b[c]; i = c; }
    a[i] = lastId; b[i] = lastK;
  }
  return top;
};
Heap.prototype.size = function () { return this.ids.length; };

const World = {
  cols: 0, rows: 0, w: 0, h: 0, grid: null, back: null,
  things: [], flasks: [], cracks: [], start: null,
  // Navigation: standable cells are nodes; ids index the arrays below.
  nodeAt: null, nx: [], ny: [], edges: [],

  load(map) {
    const rows = map.filter((r) => r.length), R = rows.length, Cc = rows[0].length;
    World.cols = Cc; World.rows = R; World.w = Cc * CS; World.h = R * CS;
    World.grid = new Uint8Array(Cc * R); World.back = new Uint8Array(Cc * R);
    World.things = []; World.flasks = []; World.cracks = []; World.start = null;
    for (let y = 0; y < R; y++) for (let x = 0; x < Cc; x++) {
      const ch = rows[y][x] || ".", i = y * Cc + x;
      if (ch === "#") World.grid[i] = 1;
      if (ch === ":") World.back[i] = 1;
      // A thing, a flask or a crack in a cave keeps the cave's wall behind it.
      if ("ofSM".includes(ch) && ((rows[y][x - 1] === ":") || (rows[y][x + 1] === ":"))) World.back[i] = 1;
      if (ch === "o") World.things.push({ cx: x, cy: y });
      if (ch === "f") World.flasks.push({ cx: x, cy: y });
      if (ch === "S") World.cracks.push({ cx: x, cy: y, x: (x + 0.5) * CS, y: (y + 1) * CS });
      if (ch === "M") World.start = { cx: x, cy: y };
    }
    World.buildNav();
    World.art = null;
  },

  // ---- Rock ------------------------------------------------------------------------------------
  // Out of bounds is rock to the sides and below, and open sky above.
  solid(cx, cy) {
    if (cx < 0 || cx >= World.cols || cy >= World.rows) return true;
    if (cy < 0) return false;
    return World.grid[cy * World.cols + cx] === 1;
  },
  solidAt(x, y) { return World.solid(Math.floor(x / CS), Math.floor(y / CS)); },
  backAt(x, y) { const cx = Math.floor(x / CS), cy = Math.floor(y / CS); return cx >= 0 && cy >= 0 && cx < World.cols && cy < World.rows && World.back[cy * World.cols + cx] === 1; },
  // Room for him to stand: three cells of air with rock under the lowest.
  standable(cx, cy) { return !World.solid(cx, cy) && !World.solid(cx, cy - 1) && !World.solid(cx, cy - 2) && World.solid(cx, cy + 1); },
  // The surface he would land on, falling straight down from (x, y): its height, or null.
  groundY(x, y) {
    const cx = Math.floor(x / CS); let cy = Math.max(0, Math.floor(y / CS));
    if (World.solid(cx, cy)) return null;
    for (; cy < World.rows; cy++) if (World.solid(cx, cy + 1)) return (cy + 1) * CS;
    return null;
  },
  // Whether a straight line between two points passes through no rock (stepping through the cells).
  lineClear(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0); if (d < 1) return !World.solidAt(x0, y0);
    return World.rayDist(x0, y0, (x1 - x0) / d, (y1 - y0) / d, d) >= d - 0.5;
  },
  // How far a ray goes before it meets rock (exact cell walking, as in old raycasters).
  rayDist(x, y, dx, dy, maxR) {
    let cx = Math.floor(x / CS), cy = Math.floor(y / CS);
    if (World.solid(cx, cy)) return 0;
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    const tdx = dx !== 0 ? Math.abs(CS / dx) : Infinity, tdy = dy !== 0 ? Math.abs(CS / dy) : Infinity;
    let tx = dx !== 0 ? ((dx > 0 ? (cx + 1) * CS - x : x - cx * CS) / Math.abs(dx)) : Infinity;
    let ty = dy !== 0 ? ((dy > 0 ? (cy + 1) * CS - y : y - cy * CS) / Math.abs(dy)) : Infinity;
    for (let n = 0; n < 200; n++) {
      if (tx < ty) { if (tx > maxR) return maxR; cx += sx; if (World.solid(cx, cy)) return tx; tx += tdx; }
      else { if (ty > maxR) return maxR; cy += sy; if (World.solid(cx, cy)) return ty; ty += tdy; }
    }
    return maxR;
  },
  // The torchlight: the shape the light fills from (x, y) out to radius R, cut by the rock.
  // Returned as a flat array of points round the circle.
  visPoly(x, y, R, n) {
    n = n || 160; const out = new Array(n * 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, dx = Math.cos(a), dy = Math.sin(a), r = World.rayDist(x, y, dx, dy, R);
      // A little past the rock's face, so the edge of the crag it strikes is lit too.
      const rr = r < R ? Math.min(R, r + 3) : R;
      out[i * 2] = x + dx * rr; out[i * 2 + 1] = y + dy * rr;
    }
    return out;
  },

  // ---- The ways he can go ---------------------------------------------------------------------------
  // From a standable cell (x, y), facing s (1 or -1):
  //   walk       to (x+s, y)
  //   stepUp     to (x+s, y-1), a small hop; stepDown to (x+s, y+1)
  //   climbUp    to (x+s, y-h), h 2..5: spring up, hang from the edge, pull up (and climbDown back)
  //   drop       off an edge to (x+s, y+d), d 6 or more (shorter drops he climbs down)
  //   leap       to (x+s*dx, y+dy), dx 2..6, dy -2..4, if the arc is clear of rock
  node(cx, cy) { return cx < 0 || cy < 0 || cx >= World.cols || cy >= World.rows ? -1 : World.nodeAt[cy * World.cols + cx]; },
  buildNav() {
    const Cc = World.cols, R = World.rows;
    World.nodeAt = new Int32Array(Cc * R).fill(-1); World.nx = []; World.ny = []; World.edges = [];
    for (let y = 0; y < R; y++) for (let x = 0; x < Cc; x++) if (World.standable(x, y)) {
      World.nodeAt[y * Cc + x] = World.nx.length; World.nx.push(x); World.ny.push(y); World.edges.push([]);
    }
    const S = World.solid, add = (from, to, kind, cost, s, n) => World.edges[from].push({ to, kind, cost, s, n });
    const clearCol = (x, y0, y1) => { for (let y = y0; y <= y1; y++) if (S(x, y)) return false; return true; };
    for (let id = 0; id < World.nx.length; id++) {
      const x = World.nx[id], y = World.ny[id];
      for (const s of [-1, 1]) {
        let t;
        if ((t = World.node(x + s, y)) >= 0) add(id, t, "walk", 1, s, 0);
        if ((t = World.node(x + s, y - 1)) >= 0 && !S(x, y - 3)) add(id, t, "stepUp", 1.5, s, 1);
        if ((t = World.node(x + s, y + 1)) >= 0 && !S(x + s, y - 2)) add(id, t, "stepDown", 1.4, s, 1);
        // Climbs: his own column must be clear from his head up past the edge he grips.
        for (let h = 2; h <= 5; h++) {
          if ((t = World.node(x + s, y - h)) < 0) continue;
          if (!clearCol(x, y - h - 1, y - 1)) continue;
          add(id, t, "climbUp", 3 + h * 0.8, s, h);
          World.edges[t].push({ to: id, kind: "climbDown", cost: 2 + h * 0.6, s: -s, n: h });
        }
        // Drops: walk off the edge and fall clear down the next column.
        if (!S(x + s, y) && !S(x + s, y - 1) && !S(x + s, y - 2)) {
          for (let d = 1; y + d < R; d++) {
            if (S(x + s, y + d)) break;
            if (d >= 6 && (t = World.node(x + s, y + d)) >= 0) { add(id, t, "drop", 2 + d * 0.25, s, d); break; }
          }
        }
        // Leaps across gaps and up or down onto other ledges, if the arc is clear.
        for (let dx = 2; dx <= 6; dx++) for (let dy = -2; dy <= 4; dy++) {
          if ((t = World.node(x + s * dx, y + dy)) < 0) continue;
          if (World.arcClear(x, y, x + s * dx, y + dy)) add(id, t, "leap", 2.5 + dx * 0.6 + Math.max(0, -dy) * 0.4, s, dx);
        }
      }
    }
  },
  // The arc of a leap, as the feet go: up over the higher end, then down. Sample it and look for
  // rock anywhere in the three cells of his body.
  arcClear(x0, y0, x1, y1) {
    const fx0 = x0 + 0.5, fy0 = y0 + 1, fx1 = x1 + 0.5, fy1 = y1 + 1;   // in cells, the feet
    const top = Math.min(fy0, fy1) - (1.1 + Math.abs(x1 - x0) * 0.22);
    const N = Math.abs(x1 - x0) * 5;
    for (let i = 1; i < N; i++) {
      const u = i / N, fx = lerp(fx0, fx1, u), fy = World.arcY(fy0, fy1, top, u);
      for (const k of [0.05, 1, 2, 2.9]) for (const ox of [-0.32, 0.32]) if (World.solid(Math.floor(fx + ox), Math.floor(fy - k))) return false;
    }
    return true;
  },
  // A parabola through y0 at u=0 and y1 at u=1 whose highest point is `top`.
  arcY(y0, y1, top, u) {
    // y(u) = y0 + b u + c u^2 with min = top: solve for b, c.
    const A = y0 - top, B = y1 - top;               // both >= 0
    const sa = Math.sqrt(Math.max(0, A)), sb = Math.sqrt(Math.max(0, B));
    const um = sa / Math.max(1e-6, sa + sb);         // where the apex falls
    const c = A / Math.max(1e-6, um * um);
    return top + c * (u - um) * (u - um);
  },

  // A route from one node to another (A*), as a list of steps { kind, from, to, s, n }.
  route(from, to) {
    if (from < 0 || to < 0) return null;
    if (from === to) return [];
    const N = World.nx.length, g = new Float64Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), cameE = new Array(N);
    const hx = World.nx[to], hy = World.ny[to], heur = (i) => Math.abs(World.nx[i] - hx) * 0.9 + Math.abs(World.ny[i] - hy) * 0.6;
    const open = new Heap(); g[from] = 0; open.push(from, heur(from));
    const closed = new Uint8Array(N);
    while (open.size()) {
      const c = open.pop(); if (closed[c]) continue; closed[c] = 1;
      if (c === to) break;
      for (const e of World.edges[c]) {
        const ng = g[c] + e.cost;
        if (ng < g[e.to]) { g[e.to] = ng; came[e.to] = c; cameE[e.to] = e; open.push(e.to, ng + heur(e.to)); }
      }
    }
    if (g[to] === Infinity) return null;
    const out = []; let c = to;
    while (c !== from) { const e = cameE[c]; out.push({ kind: e.kind, from: came[c], to: c, s: e.s, n: e.n }); c = came[c]; }
    return out.reverse();
  },
  // How far every node is from one (Dijkstra), to choose among places he can reach.
  costsFrom(from) {
    const N = World.nx.length, g = new Float64Array(N).fill(Infinity);
    if (from < 0) return g;
    const open = new Heap(); g[from] = 0; open.push(from, 0);
    while (open.size()) {
      const c = open.pop(), gc = g[c];
      for (const e of World.edges[c]) { const ng = gc + e.cost; if (ng < g[e.to]) { g[e.to] = ng; open.push(e.to, ng); } }
    }
    return g;
  },
  feetX(id) { return (World.nx[id] + 0.5) * CS; },
  feetY(id) { return (World.ny[id] + 1) * CS; },
  // The standable place nearest a point in the world (for anything set down or landing).
  nearestNode(x, y, maxR) {
    maxR = maxR || 200; let best = -1, bd = Infinity;
    const cx0 = Math.floor(x / CS), cy0 = Math.floor(y / CS), rr = Math.ceil(maxR / CS);
    for (let cy = cy0 - rr; cy <= cy0 + rr; cy++) for (let cx = cx0 - rr; cx <= cx0 + rr; cx++) {
      const id = World.node(cx, cy); if (id < 0) continue;
      const d = Math.hypot((cx + 0.5) * CS - x, ((cy + 1) * CS - y) * 1.2);
      if (d < bd) { bd = d; best = id; }
    }
    return bd <= maxR * 1.3 ? best : -1;
  },
  // Where a finger on (x, y) means him to go: the standable places near the point, the floor under
  // it counting most (a tap in the air above a ledge means the ledge); among those he can reach,
  // the nearest to the finger; if none of them, the reachable place nearest to it.
  pickTarget(from, x, y, costs) {
    costs = costs || World.costsFrom(from);
    let best = -1, bd = Infinity, any = -1, ad = Infinity;
    const cx0 = Math.floor(x / CS), cy0 = Math.floor(y / CS);
    for (let cy = cy0 - 7; cy <= cy0 + 9; cy++) for (let cx = cx0 - 7; cx <= cx0 + 7; cx++) {
      const id = World.node(cx, cy); if (id < 0 || costs[id] === Infinity) continue;
      const fx = (cx + 0.5) * CS, fy = (cy + 1) * CS, dy = y - fy;
      // Above the floor (dy < 0) counts little, up to his height; below it counts much more.
      const d = Math.hypot(fx - x, dy < 0 ? Math.max(0, -dy - 40) * 0.8 + -dy * 0.25 : dy * 1.6);
      if (d < bd) { bd = d; best = id; }
    }
    if (best >= 0 && bd < 70) return best;
    for (let id = 0; id < World.nx.length; id++) {
      if (costs[id] === Infinity) continue;
      const d = Math.hypot(World.feetX(id) - x, (World.feetY(id) - y) * 1.1);
      if (d < ad) { ad = d; any = id; }
    }
    return any >= 0 ? any : best;
  },

  // ---- The crags as drawn ---------------------------------------------------------------------------
  // Trace round every mass of rock (and every cave's back wall), cell edge by cell edge, then
  // make it angular: the tops he stands on stay flat and true; the faces and the undersides are
  // straightened into slants, broken into jagged teeth, and hung with spikes beneath.
  traceLoops(isIn) {
    const Cc = World.cols, R = World.rows, out = new Map(), key = (x, y) => x * 4096 + y;
    const addE = (x0, y0, x1, y1) => { const k = key(x0, y0); let l = out.get(k); if (!l) out.set(k, l = []); l.push([x0, y0, x1, y1, false]); };
    const at = (x, y) => (x < 0 || x >= Cc || y >= R ? isIn(-1, -1, true) : y < 0 ? false : isIn(x, y, false));
    for (let y = 0; y < R; y++) for (let x = 0; x < Cc; x++) {
      if (!isIn(x, y, false)) continue;
      if (!at(x, y - 1)) addE(x, y, x + 1, y);
      if (!at(x + 1, y)) addE(x + 1, y, x + 1, y + 1);
      if (!at(x, y + 1)) addE(x + 1, y + 1, x, y + 1);
      if (!at(x - 1, y)) addE(x, y + 1, x, y);
    }
    const loops = [];
    for (const [, list] of out) for (const e0 of list) {
      if (e0[4]) continue;
      const loop = []; let e = e0, guard = 0;
      while (e && !e[4] && guard++ < 100000) {
        e[4] = true; loop.push([e[0], e[1]]);
        const dx = e[2] - e[0], dy = e[3] - e[1], cands = (out.get(key(e[2], e[3])) || []).filter((c) => !c[4]);
        if (!cands.length) break;
        // Turn right first (keeps to the same mass where two touch at a corner), then straight, then left.
        const pref = (c) => { const cx = c[2] - c[0], cy = c[3] - c[1]; if (cx === -dy && cy === dx) return 0; if (cx === dx && cy === dy) return 1; return 2; };
        cands.sort((a, b) => pref(a) - pref(b)); e = cands[0];
      }
      if (loop.length >= 4) loops.push(loop);
    }
    return loops;
  },
  // Corners only (drop the points in the middle of straight runs).
  corners(loop) {
    const n = loop.length, out = [];
    for (let i = 0; i < n; i++) {
      const a = loop[(i - 1 + n) % n], b = loop[i], c = loop[(i + 1) % n];
      if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) !== 0) out.push(b);
    }
    return out;
  },
  buildArt() {
    const rnd = (i, j, k) => hash2(i, j, k);
    const rockLoops = World.traceLoops((x, y, oob) => (oob ? true : World.grid[y * World.cols + x] === 1));
    // The rock runs on past the sides and the floor of the world: one great rectangle round it all,
    // wound against the outline of the open air, so the air inside comes out empty.
    const rock = new Path2D(), rim = [], M = 400;
    rock.moveTo(-M, 0); rock.lineTo(World.w + M, 0); rock.lineTo(World.w + M, World.h + M); rock.lineTo(-M, World.h + M); rock.closePath();
    for (const raw of rockLoops) {
      const pts = World.corners(raw), n = pts.length; if (n < 3) continue;
      // Each segment: is it a top he stands on (air above, rock below, running left to right)?
      const isTop = (i) => { const a = pts[i], b = pts[(i + 1) % n]; return a[1] === b[1] && b[0] > a[0]; };
      // Keep the ends of every top; between them, straighten the stairs of the faces and
      // undersides (a stair of single cells becomes a slant), keeping the long straight faces.
      const keep = new Uint8Array(n);
      for (let i = 0; i < n; i++) if (isTop(i)) { keep[i] = 1; keep[(i + 1) % n] = 1; }
      let start = keep.indexOf(1); if (start < 0) { start = 0; keep[0] = 1; }
      const shape = [];
      for (let k = 0; k < n; k++) {
        const i = (start + k) % n; if (!keep[i]) continue;
        // The run of points from this kept point to the next kept one.
        let j = (i + 1) % n; const run = [pts[i]]; while (!keep[j]) { run.push(pts[j]); j = (j + 1) % n; } run.push(pts[j]);
        const simple = World.rdp(run, 0.72);
        for (let m = 0; m < simple.length - 1; m++) shape.push({ p: simple[m], top: isTop(i) && run.length === 2 });
      }
      // Now make it sharp: jagged teeth on the faces, spikes hanging beneath.
      const out = [];
      for (let m = 0; m < shape.length; m++) {
        const a = shape[m].p, b = shape[(m + 1) % shape.length].p, ax = a[0] * CS, ay = a[1] * CS, bx = b[0] * CS, by = b[1] * CS;
        out.push([ax, ay]);
        // The top of the world (where the rock that runs off the edges meets the sky) stays plain.
        if (a[1] === 0 && b[1] === 0) continue;
        const L = Math.hypot(bx - ax, by - ay); if (L < 1) continue;
        const ux = (bx - ax) / L, uy = (by - ay) / L, nx = uy, ny = -ux;   // outward, into the air
        if (shape[m].top) { rim.push([ax, ay, bx, by, nx, ny, 1]); continue; }
        const pieces = Math.max(1, Math.round(L / (ny > 0.5 ? 9 : 13)));
        let px = ax, py = ay;
        for (let q = 1; q <= pieces; q++) {
          const u = q / pieces, qx = lerp(ax, bx, u), qy = lerp(ay, by, u), h = rnd(Math.round(qx), Math.round(qy), 7);
          if (q < pieces || pieces === 1) {
            const mx = lerp(px, qx, 0.5), my = lerp(py, qy, 0.5);
            let off;
            if (ny > 0.45) off = h < 0.55 ? 5 + h * 30 * (0.4 + ny) : 1 + h * 3;     // undersides: spikes
            else off = -1.2 + h * 4.2;                                                // faces: teeth
            const tx = mx + nx * off + ux * (rnd(Math.round(mx), Math.round(my), 3) - 0.5) * 3, ty = my + ny * off;
            if (L > 6) { out.push([tx, ty]); rim.push([px, py, tx, ty, nx, ny, 0], [tx, ty, qx, qy, nx, ny, 0]); }
            else rim.push([px, py, qx, qy, nx, ny, 0]);
          }
          if (q < pieces) out.push([qx, qy]);
          px = qx; py = qy;
        }
      }
      if (out.length < 3) continue;
      rock.moveTo(out[0][0], out[0][1]); for (let i = 1; i < out.length; i++) rock.lineTo(out[i][0], out[i][1]); rock.closePath();
    }
    // The back walls of the caves: dark grey, angular, slightly larger than the cells so no mist
    // shows at the seams; the rock is drawn over their edges.
    const back = new Path2D();
    for (const raw of World.traceLoops((x, y, oob) => (oob ? false : World.back[y * World.cols + x] === 1))) {
      const pts = World.rdp(World.corners(raw).concat([World.corners(raw)[0]]), 0.9);
      back.moveTo(pts[0][0] * CS, pts[0][1] * CS); for (let i = 1; i < pts.length; i++) back.lineTo(pts[i][0] * CS, pts[i][1] * CS); back.closePath();
    }
    // Cracks in the back walls, and the cracks the demons come from.
    const cracks = new Path2D();
    for (let y = 0; y < World.rows; y++) for (let x = 0; x < World.cols; x++) {
      if (!World.back[y * World.cols + x] || rnd(x, y, 11) > 0.12) continue;
      const x0 = (x + rnd(x, y, 12)) * CS, y0 = (y + rnd(x, y, 13)) * CS; cracks.moveTo(x0, y0);
      let px = x0, py = y0; for (let k = 0; k < 3; k++) { px += (rnd(x, y, 20 + k) - 0.5) * 22; py += 6 + rnd(x, y, 30 + k) * 10; cracks.lineTo(px, py); }
    }
    World.art = { rock, back, cracks, rim };
  },
  // Ramer-Douglas-Peucker on a run of points (cells), keeping both ends.
  rdp(pts, eps) {
    if (pts.length < 3) return pts.slice();
    const a = pts[0], b = pts[pts.length - 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-6;
    let bi = -1, bd = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = Math.abs((b[0] - a[0]) * (a[1] - pts[i][1]) - (a[0] - pts[i][0]) * (b[1] - a[1])) / L;
      if (d > bd) { bd = d; bi = i; }
    }
    if (bd <= eps) return [a, b];
    const l = World.rdp(pts.slice(0, bi + 1), eps), r = World.rdp(pts.slice(bi), eps);
    return l.slice(0, -1).concat(r);
  },

  // Drawn in world coordinates (the camera already applied).
  drawBack() {
    if (!World.art) World.buildArt();
    ctx.fillStyle = "#121214"; ctx.fill(World.art.back);
    ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = 1.2; ctx.stroke(World.art.cracks);
  },
  drawRock() { if (!World.art) World.buildArt(); ctx.fillStyle = C.ink; ctx.fill(World.art.rock); },
  // The torch's warm light on the faces of the rock that turn toward it, inside its reach.
  drawRim(lx, ly, R, k) {
    if (!World.art) World.buildArt();
    const segs = World.art.rim, R2 = R * R;
    ctx.lineCap = "round";
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i], mx = (s[0] + s[2]) / 2, my = (s[1] + s[3]) / 2, dx = lx - mx, dy = ly - my, d2 = dx * dx + dy * dy;
      if (d2 > R2) continue;
      const d = Math.sqrt(d2) || 1, face = (dx * s[4] + dy * s[5]) / d;
      if (face <= 0.05) continue;
      const a = face * Math.pow(1 - d / R, 1.3) * (k || 1);
      if (a < 0.03) continue;
      ctx.strokeStyle = s[6] ? "rgba(255,190,110," + (a * 0.9).toFixed(3) + ")" : "rgba(255,150,70," + (a * 0.75).toFixed(3) + ")";
      ctx.lineWidth = s[6] ? 2 : 1.5;
      ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke();
    }
  },
};
if (typeof module !== "undefined") module.exports = { World, HOLLOW, CS };
