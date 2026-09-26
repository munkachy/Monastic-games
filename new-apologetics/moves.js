// New Apologetics — every move, animated.
//
// Ordinary moves share a handful of animations, as in most battle games:
// a volley of words, a walk across the
// floor to hand someone something, an aura over the team, a hex over the
// other side. Each hero fills them with their own words and things.
// Every hero's great move has its own full-screen cinematic instead.
//
// Theater.create(canvas) returns a stage that can play any hero's moves.

const Theater = (() => {
  const W = 640;
  const H = 360;
  const SCALE = 2;
  const FIG_W = 40 * SCALE;
  const FIG_H = 52 * SCALE;
  const FONT = "'Pixelify Sans', 'Courier New', monospace";

  // ---- Little helpers ------------------------------------------------------------

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

  function text(ctx, str, x, y, size, color, align, weight) {
    ctx.font = (weight || 700) + " " + size + "px " + FONT;
    ctx.textAlign = align || "center";
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  function outlinedText(ctx, str, x, y, size, color, edge) {
    ctx.font = "700 " + size + "px " + FONT;
    ctx.textAlign = "center";
    ctx.lineWidth = Math.max(3, size / 6);
    ctx.strokeStyle = edge || "#1a1326";
    ctx.lineJoin = "round";
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  // A pixel speech bubble with its tail pointing down at (x, y).
  function bubble(ctx, str, x, y, opts) {
    const o = opts || {};
    ctx.font = "600 " + (o.size || 14) + "px " + FONT;
    const w = Math.ceil(ctx.measureText(str).width) + 16;
    const h = (o.size || 14) + 14;
    const bx = Math.round(clamp(x - w / 2, 4, W - w - 4));
    const by = Math.round(y - h - 8);
    ctx.fillStyle = "#1a1326";
    ctx.fillRect(bx - 2, by - 2, w + 4, h + 4);
    ctx.fillStyle = o.bg || "#fdfaf2";
    ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = "#1a1326";
    ctx.fillRect(Math.round(x) - 3, by + h, 8, 4);
    ctx.fillStyle = o.bg || "#fdfaf2";
    ctx.fillRect(Math.round(x) - 1, by + h, 4, 4);
    ctx.fillRect(Math.round(x) + 1, by + h + 4, 2, 4);
    text(ctx, str, bx + w / 2, by + h - 9, o.size || 14, o.color || "#1a1326", "center", 600);
  }

  function px(ctx, x, y, s, color) { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), s, s); }

  // Small pixel things the heroes carry or throw.
  const ITEMS = {
    book(ctx, x, y, c) { ctx.fillStyle = "#1a1326"; ctx.fillRect(x - 9, y - 11, 18, 22); ctx.fillStyle = c || "#7a1f2b"; ctx.fillRect(x - 7, y - 9, 14, 18); ctx.fillStyle = "#f4efe0"; ctx.fillRect(x + 5, y - 8, 2, 16); ctx.fillStyle = "#e8b94a"; ctx.fillRect(x - 4, y - 5, 6, 2); ctx.fillRect(x - 2, y - 7, 2, 6); },
    scroll(ctx, x, y) { ctx.fillStyle = "#1a1326"; ctx.fillRect(x - 11, y - 8, 22, 16); ctx.fillStyle = "#f3e6c4"; ctx.fillRect(x - 9, y - 6, 18, 12); ctx.fillStyle = "#c9b27a"; ctx.fillRect(x - 11, y - 8, 4, 16); ctx.fillRect(x + 7, y - 8, 4, 16); ctx.fillStyle = "#6a5a3a"; for (let i = 0; i < 3; i++) ctx.fillRect(x - 5, y - 3 + i * 3, 10, 1); },
    pint(ctx, x, y) { ctx.fillStyle = "#1a1326"; ctx.fillRect(x - 7, y - 11, 14, 22); ctx.fillStyle = "#d9962b"; ctx.fillRect(x - 5, y - 5, 10, 14); ctx.fillStyle = "#fbf6e8"; ctx.fillRect(x - 5, y - 9, 10, 5); ctx.fillStyle = "#cfd6dc"; ctx.fillRect(x + 7, y - 4, 3, 8); },
    rose(ctx, x, y) { ctx.fillStyle = "#2f7a3a"; ctx.fillRect(x - 1, y - 2, 2, 14); ctx.fillRect(x + 1, y + 4, 4, 2); ctx.fillStyle = "#1a1326"; ctx.fillRect(x - 6, y - 10, 12, 10); ctx.fillStyle = "#d8324a"; ctx.fillRect(x - 4, y - 8, 8, 6); ctx.fillStyle = "#ff6a80"; ctx.fillRect(x - 2, y - 7, 3, 3); },
    phone(ctx, x, y) { ctx.fillStyle = "#1a1326"; ctx.fillRect(x - 7, y - 12, 14, 24); ctx.fillStyle = "#9fd0ff"; ctx.fillRect(x - 5, y - 10, 10, 17); ctx.fillStyle = "#de5e55"; ctx.fillRect(x - 3, y - 8, 3, 3); },
    timer(ctx, x, y) { ctx.fillStyle = "#1a1326"; ctx.fillRect(x - 8, y - 12, 16, 24); ctx.fillStyle = "#c9b27a"; ctx.fillRect(x - 8, y - 12, 16, 3); ctx.fillRect(x - 8, y + 9, 16, 3); ctx.fillStyle = "#e8d9a8"; ctx.fillRect(x - 5, y - 8, 10, 4); ctx.fillRect(x - 2, y - 4, 4, 6); ctx.fillRect(x - 5, y + 3, 10, 5); },
    clipboard(ctx, x, y) { ctx.fillStyle = "#1a1326"; ctx.fillRect(x - 9, y - 12, 18, 24); ctx.fillStyle = "#8a5a2b"; ctx.fillRect(x - 7, y - 10, 14, 20); ctx.fillStyle = "#fdfaf2"; ctx.fillRect(x - 5, y - 7, 10, 15); ctx.fillStyle = "#3a6ad8"; for (let i = 0; i < 4; i++) ctx.fillRect(x - 3, y - 4 + i * 3, 6 - (i % 2) * 2, 1); },
    mute(ctx, x, y) { ctx.fillStyle = "#1a1326"; ctx.fillRect(x - 11, y - 11, 22, 22); ctx.fillStyle = "#de5e55"; ctx.fillRect(x - 9, y - 9, 18, 18); ctx.fillStyle = "#fff"; ctx.fillRect(x - 6, y - 3, 4, 6); ctx.fillRect(x - 2, y - 5, 2, 10); for (let i = 0; i < 5; i++) { ctx.fillRect(x + 2 + i, y - 3 + i, 1, 1); ctx.fillRect(x + 6 - i, y - 3 + i, 1, 1); } },
  };

  // ---- Status marks on a figure ------------------------------------------------------
  // (x, y) is the top of the head.
  const MARKS = {
    dumbfounded(ctx, x, y, t) {
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + (i * Math.PI * 2) / 3;
        const sx = x + Math.cos(a) * 22;
        const sy = y - 6 + Math.sin(a) * 6;
        px(ctx, sx - 1, sy - 4, 3, "#ffd84a"); px(ctx, sx - 4, sy - 1, 3, "#ffd84a"); px(ctx, sx + 2, sy - 1, 3, "#ffd84a"); px(ctx, sx - 1, sy + 2, 3, "#ffd84a"); px(ctx, sx - 1, sy - 1, 3, "#fff6c0");
      }
    },
    doubting(ctx, x, y, t) { outlinedText(ctx, "?", x + 20 + Math.sin(t * 9) * 3, y - 2, 22, "#c69ae8"); },
    muted(ctx, x, y) { ctx.fillStyle = "#2a2a33"; ctx.fillRect(x - 12, y + 30, 24, 8); ctx.fillStyle = "#de5e55"; for (let i = 0; i < 8; i++) { ctx.fillRect(x - 4 + i, y + 30 + i, 2, 2); ctx.fillRect(x + 3 - i, y + 30 + i, 2, 2); } },
    examined(ctx, x, y, t) { const mx = x + 18 + Math.sin(t * 4) * 6; ctx.strokeStyle = "#1a1326"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(mx, y + 20, 11, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = "#e8b94a"; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = "rgba(190,225,255,0.45)"; ctx.fill(); ctx.fillStyle = "#8a5a2b"; ctx.fillRect(mx + 7, y + 28, 4, 10); },
    called(ctx, x, y, t) { outlinedText(ctx, "!", x, y - 8 - Math.abs(Math.sin(t * 8)) * 4, 26, "#de5e55"); },
    factcheck(ctx, x, y, t, k) {
      ctx.save(); ctx.translate(x, y + 44); ctx.rotate(-0.25); const s = 1 + (1 - clamp(k * 4, 0, 1)) * 0.8; ctx.scale(s, s);
      ctx.strokeStyle = "#de5e55"; ctx.lineWidth = 3; ctx.strokeRect(-46, -14, 92, 24); text(ctx, "FACT-CHECK", 0, 4, 14, "#de5e55"); ctx.restore();
    },
    down(ctx, x, y, t) { const b = (t * 30) % 10; ctx.fillStyle = "#de5e55"; for (let i = 0; i < 3; i++) { ctx.fillRect(x + 20, y + 4 + b + i * 3, 6 - i * 2 + 4, 2); } outlinedText(ctx, "↓", x + 24, y + 22 + b, 18, "#de5e55"); },
    halo(ctx, x, y, t) { ctx.strokeStyle = "#ffe07a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y - 4, 18, 5, 0, 0, Math.PI * 2); ctx.stroke(); for (let i = 0; i < 4; i++) { const a = t * 3 + i * 1.6; px(ctx, x + Math.cos(a) * 26, y + 20 + Math.sin(a) * 30, 3, "#fff6c0"); } },
    heal(ctx, x, y, t) { for (let i = 0; i < 3; i++) { const k = (t * 1.5 + i / 3) % 1; const cx = x - 16 + i * 16; const cy = y + 60 - k * 70; ctx.globalAlpha = 1 - k; px(ctx, cx - 2, cy - 6, 4, "#74c07a"); ctx.fillStyle = "#74c07a"; ctx.fillRect(cx - 6, cy - 2, 12, 4); ctx.fillRect(cx - 2, cy - 6, 4, 12); ctx.globalAlpha = 1; } },
    shield(ctx, x, y, t) { ctx.strokeStyle = "rgba(126,164,230,0.9)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y + 48, 44, 58, 0, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = "rgba(126,164,230,0.14)"; ctx.fill(); px(ctx, x - 28, y + 14 + Math.sin(t * 3) * 3, 4, "#dbe8ff"); },
    up(ctx, x, y, t) { const b = (t * 30) % 10; outlinedText(ctx, "↑", x + 24, y + 26 - b, 18, "#74c07a"); },
    hearts(ctx, x, y, t) { for (let i = 0; i < 3; i++) { const k = (t * 1.2 + i / 3) % 1; const cx = x - 18 + i * 18 + Math.sin(k * 6 + i) * 4; const cy = y + 50 - k * 70; ctx.globalAlpha = 1 - k; heart(ctx, cx, cy, 2, "#ff7a9a"); ctx.globalAlpha = 1; } },
    pipDown(ctx, x, y, t, k) { ctx.globalAlpha = 1 - k; outlinedText(ctx, "−1 CONVICTION", x, y - 16 - k * 20, 13, "#7ea4e6"); ctx.globalAlpha = 1; },
    pipUp(ctx, x, y, t, k) { ctx.globalAlpha = 1 - k; outlinedText(ctx, "+1 CONVICTION", x, y - 16 - k * 20, 13, "#7ea4e6"); ctx.globalAlpha = 1; },
    crit(ctx, x, y, t) { for (let i = 0; i < 6; i++) { const a = i * 1.05 + t * 2; const r = 30 + Math.sin(t * 6 + i) * 6; px(ctx, x + Math.cos(a) * r, y + 40 + Math.sin(a) * r * 1.3, 4, "#ffd84a"); } },
  };

  function heart(ctx, x, y, s, color) {
    const rows = ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"];
    ctx.fillStyle = color;
    rows.forEach((r, j) => { for (let i = 0; i < 7; i++) if (r[i] === "1") ctx.fillRect(Math.round(x + (i - 3.5) * s), Math.round(y + (j - 3) * s), s, s); });
  }

  // ---- The stage --------------------------------------------------------------------

  // Where each fighter stands: feet position. Heroes on the left, foes on the right.
  const HERO_SLOTS = [[190, 318], [80, 318], [120, 206], [226, 206]];
  const FOE_SLOTS = [[450, 318], [560, 318], [506, 206]];

  function create(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const C = Art.CAST;
    let team = ["akin", "muse", "fradd", "bertuzzi"];
    let foes = ["elder", "preacher", "skeptic"];
    let current = null;       // { hero, move, start }
    let listeners = [];
    let tNow = 0;

    const actors = () => team.map((id, i) => ({ id, side: "hero", x: HERO_SLOTS[i][0], y: HERO_SLOTS[i][1] }))
      .concat(foes.map((id, i) => ({ id, side: "foe", x: FOE_SLOTS[i][0], y: FOE_SLOTS[i][1] })));

    function setTeam(ids) { team = ids.slice(0, 4); }

    function drawFloor() {
      ctx.fillStyle = "#0e1122"; ctx.fillRect(0, 0, W, H);
      // A studio set: a back wall with panels, a stage floor, two pools of light.
      for (let x = 0; x < W; x += 40) { ctx.fillStyle = x % 80 ? "#131733" : "#11142c"; ctx.fillRect(x, 0, 40, 170); }
      ctx.fillStyle = "#1b2040"; ctx.fillRect(0, 170, W, 6);
      for (let y = 176; y < H; y += 16) for (let x = (y / 16) % 2 ? 0 : 20; x < W; x += 40) { ctx.fillStyle = "#171b36"; ctx.fillRect(x, y, 20, 16); }
      ctx.fillStyle = "rgba(232,185,74,0.06)"; ctx.fillRect(40, 0, 220, H); ctx.fillStyle = "rgba(222,94,85,0.05)"; ctx.fillRect(400, 0, 220, H);
    }

    function drawFigure(id, x, feet, pose, flip, alpha, shake) {
      const g = Art.figure(C[id], pose || "stand");
      ctx.globalAlpha = alpha === undefined ? 1 : alpha;
      // A soft shadow on the floor.
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(Math.round(x - 30), Math.round(feet - 4), 60, 6);
      Art.paint(ctx, g, Math.round(x - FIG_W / 2 + (shake ? Math.round(Math.sin(tNow * 70) * 3) : 0)), Math.round(feet - FIG_H), SCALE, flip);
      ctx.globalAlpha = 1;
    }

    // Everything a move needs to act itself out.
    function frame(t) {
      tNow = t;
      const list = actors();
      const byId = {};
      for (const a of list) { a.pose = "stand"; a.flip = a.side === "foe"; a.marks = []; byId[a.id + ":" + a.side] = a; }
      const after = [];
      let overlay = null;
      if (current) {
        const k = t - current.start;
        const hero = list.find((a) => a.side === "hero" && a.id === current.hero);
        const api = {
          t: k, now: t, ctx, W, H, hero, actors: list,
          foes: list.filter((a) => a.side === "foe"),
          allies: list.filter((a) => a.side === "hero"),
          head: (a) => ({ x: a.x, y: a.y - FIG_H + 4 }),
          mouth: (a) => ({ x: a.x + (a.side === "hero" ? 14 : -14), y: a.y - FIG_H + 38 }),
          hand: (a) => ({ x: a.x + (a.side === "hero" ? 30 : -30), y: a.y - 42 }),
          after: (fn) => after.push(fn),
          overlay: (fn) => { overlay = fn; },
          mark: (a, name, since) => a.marks.push([name, since]),
        };
        current.move.run(api);
        if (k > current.move.duration) {
          const done = current;
          current = null;
          listeners.forEach((fn) => fn(done));
        }
      }
      drawFloor();
      list.slice().sort((a, b) => a.y - b.y).forEach((a) => {
        drawFigure(a.id, a.x + (a.dx || 0), a.y + (a.dy || 0), a.pose, a.flip, a.alpha, a.shake);
        for (const [name, since] of a.marks) MARKS[name](ctx, a.x + (a.dx || 0), a.y + (a.dy || 0) - FIG_H + 4, t, clamp(since, 0, 1));
      });
      after.forEach((fn) => fn());
      if (overlay) overlay();
      if (current) {
        const k = t - current.start;
        if (!current.move.cinematic && k < current.move.duration - 0.2) banner(current.move.name, C[current.hero]);
      }
    }

    function banner(name) {
      ctx.font = "700 18px " + FONT;
      const w = ctx.measureText(name).width + 28;
      ctx.fillStyle = "rgba(20,23,42,0.92)"; ctx.fillRect(W / 2 - w / 2, 10, w, 30);
      ctx.strokeStyle = "#e8b94a"; ctx.lineWidth = 2; ctx.strokeRect(W / 2 - w / 2, 10, w, 30);
      text(ctx, name, W / 2, 31, 18, "#ece4d0");
    }

    function play(hero, index, now) {
      if (!team.includes(hero)) team = [hero, ...team.filter((h) => h !== hero)].slice(0, 4);
      else team = [hero, ...team.filter((h) => h !== hero)];
      const move = MOVES[hero][index];
      if (move.duo && !team.includes(move.duo)) team = [hero, move.duo, ...team.filter((h) => h !== hero && h !== move.duo)].slice(0, 4);
      current = { hero, move: build(move, hero), start: now, index };
    }

    return {
      frame, play, setTeam,
      get busy() { return !!current; },
      onDone(fn) { listeners.push(fn); },
    };
  }

  // ---- Shared animations -----------------------------------------------------------

  // Pick targets: the first foe, two foes, every foe, the hero, or allies.
  function pick(api, who) {
    if (who === "all") return api.foes;
    if (who === "two") return [api.foes[0], api.foes[1]];
    if (who === "self") return [api.hero];
    if (who === "allies") return api.allies;
    if (who === "ally") return [api.allies[1]];
    return [api.foes[0]];
  }

  // A volley of words or signs flies from the hero's mouth.
  function volley(m) {
    const count = m.glyphs.length;
    return {
      duration: 1.1 + count * 0.16,
      run(api) {
        const { t, hero } = api;
        hero.dx = Math.sin(span(t, 0, 0.25) * Math.PI) * 14;
        hero.pose = t < 0.9 ? "raise" : "stand";
        const targets = pick(api, m.to);
        m.glyphs.forEach((g, i) => {
          const target = targets[i % targets.length];
          const k = span(t, 0.15 + i * 0.16, 0.6 + i * 0.16);
          if (k <= 0) return;
          const from = api.mouth(hero);
          const to = api.head(target);
          if (k < 1) {
            api.after(() => {
              const x = lerp(from.x, to.x, k);
              const y = lerp(from.y, to.y + 30, k) - Math.sin(k * Math.PI) * 50;
              if (g.length > 2) bubble(api.ctx, g, x, y + 10, { size: 13 });
              else outlinedText(api.ctx, g, x, y, 26, m.color || "#ffd84a");
            });
          } else if (t < 0.6 + i * 0.16 + 0.3) {
            target.shake = true;
            api.after(() => burst(api.ctx, to.x, to.y + 34, span(t, 0.6 + i * 0.16, 0.9 + i * 0.16), m.color || "#ffd84a"));
          }
        });
        if (m.mark) for (const target of targets) if (t > 0.7 + (count - 1) * 0.16) api.mark(target, m.mark, t - 0.7);
      },
    };
  }

  function burst(ctx, x, y, k, color) {
    ctx.globalAlpha = 1 - k;
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; px(ctx, x + Math.cos(a) * k * 28 - 2, y + Math.sin(a) * k * 28 - 2, 4, color); }
    ctx.globalAlpha = 1;
  }

  // The hero walks across, does something to (or for) someone, and walks back.
  function approach(m) {
    return {
      duration: 3,
      run(api) {
        const { t, hero } = api;
        const target = pick(api, m.to)[0];
        const toFoe = target.side === "foe";
        const stand = toFoe ? target.x - 74 : target.x + 70;
        const out = ease(span(t, 0, 0.8));
        const back = ease(span(t, 2.1, 2.9));
        const x = lerp(hero.x, stand, out - back);
        const dy = lerp(0, target.y - hero.y, out - back);
        const walking = (t < 0.8 || (t > 2.1 && t < 2.9));
        hero.dx = x - hero.x;
        hero.dy = dy;
        hero.flip = t > 2.1 && t < 2.9 ? toFoe : !toFoe && t < 2.1;
        hero.pose = walking ? (Math.floor(t * 8) % 2 ? "walkA" : "walkB") : (t < 2.1 ? m.pose || "reach" : "stand");
        if (t > 0.9 && t < 2.1) {
          const hx = hero.x + hero.dx + (hero.flip ? -30 : 30);
          const hy = hero.y + dy - 44;
          if (m.item) api.after(() => ITEMS[m.item](api.ctx, Math.round(lerp(hx, hx + (hero.flip ? -6 : 6), span(t, 0.9, 1.2))), Math.round(hy - 6)));
          if (m.say) api.after(() => bubble(api.ctx, m.say, hero.x + hero.dx + 8, hero.y + dy - FIG_H - 2, { size: 13 }));
          if (m.bow) hero.dy = dy + Math.sin(span(t, 1, 1.8) * Math.PI) * 6;
        }
        if (t > 1.3) {
          if (t < 1.6 && toFoe) target.shake = true;
          if (m.mark) api.mark(target, m.mark, t - 1.3);
          if (m.mark2) api.mark(target, m.mark2, t - 1.3);
        }
      },
    };
  }

  // An aura over the hero or the team: hands raised, blessings fall.
  function aura(m) {
    return {
      duration: 2.2,
      run(api) {
        const { t, hero } = api;
        hero.pose = t < 1.8 ? "raise" : "stand";
        if (m.say && t < 1.8) api.after(() => bubble(api.ctx, m.say, hero.x + 10, hero.y - FIG_H - 2, { size: 13 }));
        if (m.backdrop) api.after(() => m.backdrop(api.ctx, hero, t));
        const targets = pick(api, m.to);
        if (t > 0.5) for (const a of targets) {
          for (const name of [].concat(m.mark)) api.mark(a, name, t - 0.5);
        }
        if (m.foes && t > 0.7) for (const a of api.foes) api.mark(a, m.foes, t - 0.7);
        if (t > 0.3 && t < 0.9) api.after(() => {
          const k = span(t, 0.3, 0.9);
          api.ctx.globalAlpha = 1 - k;
          api.ctx.strokeStyle = m.color || "#ffe07a"; api.ctx.lineWidth = 4;
          api.ctx.beginPath(); api.ctx.arc(hero.x, hero.y - 50, 20 + k * 120, 0, Math.PI * 2); api.ctx.stroke();
          api.ctx.globalAlpha = 1;
        });
      },
    };
  }

  // A hex over the other side: something flies or spreads to the foes.
  function hex(m) {
    return {
      duration: 2.3,
      run(api) {
        const { t, hero } = api;
        hero.pose = t < 1.6 ? (m.pose || "reach") : "stand";
        hero.dx = Math.sin(span(t, 0, 0.3) * Math.PI) * 10;
        if (m.say && t < 1.7) api.after(() => bubble(api.ctx, m.say, hero.x + 10, hero.y - FIG_H - 2, { size: 13 }));
        const targets = pick(api, m.to);
        const k = span(t, 0.3, 1.0);
        if (m.fx) api.after(() => m.fx(api.ctx, api, hero, targets, t, k));
        if (t > 1.0) for (const a of targets) {
          if (t < 1.3) a.shake = true;
          for (const name of [].concat(m.mark)) api.mark(a, name, t - 1.0);
        }
      },
    };
  }

  // Waves from the hero to every target, for broadcasts and big voices.
  function waves(ctx, api, hero, targets, t, k, color) {
    const from = api.mouth(hero);
    for (const a of targets) {
      const to = api.head(a);
      for (let i = 0; i < 4; i++) {
        const q = clamp(k * 1.4 - i * 0.12, 0, 1);
        if (q <= 0 || q >= 1) continue;
        const x = lerp(from.x, to.x, q);
        const y = lerp(from.y, to.y + 40, q);
        ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.globalAlpha = 1 - q * 0.5;
        ctx.beginPath(); ctx.arc(x, y, 8 + i * 4, -0.9, 0.9); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  // ---- Great moves: the cinematics ----------------------------------------------------
  // Each one: a wipe in the hero's color, a full-screen close-up over a scene
  // that belongs only to that move, a wipe back, then the effect lands.

  function cinematic(m) {
    return {
      cinematic: true,
      duration: 4.4,
      name: m.name,
      run(api) {
        const { t, ctx } = api;
        const S = 0.35;           // wipe in
        const E = 2.75;           // wipe out
        if (t > E + 0.3) {
          const k = t - E - 0.3;
          for (const a of pick(api, m.to)) { if (k < 0.35) a.shake = m.to !== "allies" && m.to !== "self"; for (const name of [].concat(m.mark)) api.mark(a, name, k); }
          if (m.impact) api.after(() => m.impact(ctx, api, k));
          api.overlay(() => titleCard(ctx, m.name, clamp(1 - (t - E - 0.3) / 1.2, 0, 1) * 0.9));
          return;
        }
        api.overlay(() => {
          const k = t - S;
          if (t >= S && t < E) {
            m.scene(ctx, k, api);
            const slide = ease(span(k, 0, 0.35));
            if (m.closeUp !== false) {
              const g = m.face ? m.face(k) : Art.bust(Art.CAST[api.hero.id]);
              const sc = m.faceScale || (m.face ? 5 : 7);
              const size = g.w * sc;
              Art.paint(ctx, g, Math.round(lerp(-size, m.faceX === undefined ? 24 : m.faceX, slide)), H - g.h * sc + (m.faceDrop || 0), sc);
            }
            if (m.front) m.front(ctx, k, api);
            nameplate(ctx, Art.CAST[api.hero.id], m.who, m.name, ease(span(k, 0.15, 0.5)), m.color);
          }
          // The wipes.
          const wipe = t < S ? span(t, 0, S) : t > E ? 1 - span(t, E, E + 0.3) : null;
          if (wipe !== null) {
            ctx.fillStyle = m.color;
            for (let i = 0; i < 8; i++) {
              const w = (W + 200) * wipe;
              ctx.fillRect(t < S ? -100 + i * 6 : W + 100 - w - i * 6, i * 45, w, 45);
            }
          }
        });
      },
    };
  }

  function nameplate(ctx, s, who, move, k, color) {
    const x = lerp(W + 10, W - 340, k);
    ctx.fillStyle = "#1a1326"; ctx.fillRect(x - 4, 16, 344, 72);
    ctx.fillStyle = color; ctx.fillRect(x, 20, 340, 64);
    ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(x, 20, 340, 3);
    text(ctx, who.toUpperCase(), x + 16, 42, 13, "rgba(253,250,242,0.8)", "left");
    // Shrink a long name until it fits the plate.
    let size = 26;
    ctx.font = "700 " + size + "px " + FONT;
    while (size > 14 && ctx.measureText(move.toUpperCase()).width > 312) { size--; ctx.font = "700 " + size + "px " + FONT; }
    text(ctx, move.toUpperCase(), x + 16, 72, size, "#fdfaf2", "left");
  }

  function titleCard(ctx, name, a) {
    if (a <= 0) return;
    ctx.globalAlpha = a;
    outlinedText(ctx, name.toUpperCase(), W / 2, 44, 24, "#e8b94a");
    ctx.globalAlpha = 1;
  }

  function stars(ctx, k, n, color) {
    for (let i = 0; i < n; i++) {
      const x = (i * 97 + k * 20 * (1 + (i % 3))) % W;
      const y = (i * 53) % H;
      px(ctx, x, y, i % 5 ? 2 : 3, color || "#ffffff");
    }
  }

  function speedLines(ctx, k, color) {
    for (let i = 0; i < 26; i++) {
      const y = (i * 37) % H;
      const x = (W - ((k * 900 + i * 173) % (W + 300)));
      ctx.fillStyle = color; ctx.fillRect(x, y, 120 + (i % 4) * 40, 3);
    }
  }

  const SCENES = {
    // Jimmy Akin: a night sky, a saucer sweeping its beam, case files stamped.
    ufo(ctx, k) {
      ctx.fillStyle = "#070a1c"; ctx.fillRect(0, 0, W, H); stars(ctx, k, 90, "#cfd8ff");
      const ux = 300 + Math.sin(k * 2) * 140; const uy = 90;
      ctx.fillStyle = "rgba(160,255,190,0.18)"; ctx.beginPath(); ctx.moveTo(ux - 20, uy + 14); ctx.lineTo(ux + 20, uy + 14); ctx.lineTo(ux + 90, H); ctx.lineTo(ux - 90, H); ctx.fill();
      ctx.fillStyle = "#1a1326"; ctx.fillRect(ux - 44, uy - 4, 88, 20); ctx.fillStyle = "#9aa3b8"; ctx.fillRect(ux - 40, uy, 80, 12); ctx.fillStyle = "#bfe8ff"; ctx.fillRect(ux - 16, uy - 14, 32, 14);
      for (let i = 0; i < 5; i++) px(ctx, ux - 32 + i * 16, uy + 4, 4, Math.floor(k * 8 + i) % 2 ? "#ffd84a" : "#74c07a");
    },
    akinFront(ctx, k) {
      // Case files drift down and get stamped.
      for (let i = 0; i < 3; i++) {
        const x = 360 + i * 80; const y = 150 + i * 40 + Math.sin(k * 3 + i) * 4;
        ctx.fillStyle = "#1a1326"; ctx.fillRect(x - 32, y - 22, 64, 44); ctx.fillStyle = "#e9d9a8"; ctx.fillRect(x - 30, y - 20, 60, 40);
        ctx.fillStyle = "#8a7a4a"; for (let j = 0; j < 4; j++) ctx.fillRect(x - 24, y - 12 + j * 6, 40 - (j % 2) * 12, 2);
        if (k > 0.6 + i * 0.35) { ctx.save(); ctx.translate(x, y); ctx.rotate(-0.3); ctx.strokeStyle = "#2f8a4a"; ctx.lineWidth = 3; ctx.strokeRect(-34, -10, 68, 20); text(ctx, "EXPLAINED", 0, 5, 12, "#2f8a4a"); ctx.restore(); }
      }
    },
    // Fr. Mike: calendar pages fly off, from Day 1 to Day 365.
    calendar(ctx, k) {
      ctx.fillStyle = "#f3e9d2"; ctx.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 24) { ctx.fillStyle = "#e6d9bd"; ctx.fillRect(0, y, W, 2); }
      const day = Math.min(365, Math.floor(1 + Math.pow(span(k, 0.2, 1.9), 2) * 364));
      for (let i = 0; i < 5; i++) {
        const q = (k * 3 + i / 5) % 1;
        ctx.globalAlpha = 1 - q; ctx.save(); ctx.translate(430 + q * 220, 190 - q * 140); ctx.rotate(q * 1.2);
        ctx.fillStyle = "#1a1326"; ctx.fillRect(-40, -46, 80, 92); ctx.fillStyle = "#fdfaf2"; ctx.fillRect(-38, -44, 76, 88); ctx.fillStyle = "#c33"; ctx.fillRect(-38, -44, 76, 18); ctx.restore(); ctx.globalAlpha = 1;
      }
      ctx.fillStyle = "#1a1326"; ctx.fillRect(360, 110, 170, 190); ctx.fillStyle = "#fdfaf2"; ctx.fillRect(364, 114, 162, 182); ctx.fillStyle = "#b8322a"; ctx.fillRect(364, 114, 162, 40);
      text(ctx, "DAY", 445, 144, 20, "#fdfaf2"); text(ctx, String(day), 445, 250, 64, "#1a1326");
    },
    // Cameron Bertuzzi: the probability climbs as the evidence comes in.
    bayes(ctx, k) {
      ctx.fillStyle = "#101a2e"; ctx.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 32) { ctx.fillStyle = "#16233d"; ctx.fillRect(x, 0, 1, H); }
      for (let y = 0; y < H; y += 32) { ctx.fillStyle = "#16233d"; ctx.fillRect(0, y, W, 1); }
      const p = Math.round(lerp(12, 99, ease(span(k, 0.3, 2.0))));
      text(ctx, "P(Catholicism | evidence)", 470, 128, 16, "#9fd0ff");
      ctx.fillStyle = "#1a1326"; ctx.fillRect(330, 150, 280, 40); ctx.fillStyle = "#2a3a5a"; ctx.fillRect(334, 154, 272, 32);
      ctx.fillStyle = "#74c07a"; ctx.fillRect(334, 154, Math.round(272 * p / 100), 32);
      text(ctx, p + "%", 470, 250, 56, "#fdfaf2");
      const ev = ["+ papacy", "+ Eucharist", "+ early Fathers", "+ miracles"];
      ev.forEach((e, i) => { if (k > 0.4 + i * 0.35) text(ctx, e, 350 + (i % 2) * 140, 290 + Math.floor(i / 2) * 22, 14, "#e8b94a", "left"); });
    },
    // Trent Horn: his books slam down into a stack, then fly out.
    books(ctx, k) {
      ctx.fillStyle = "#2a1a14"; ctx.fillRect(0, 0, W, H);
      for (let y = 60; y < H; y += 90) { ctx.fillStyle = "#4a2e1e"; ctx.fillRect(0, y, W, 10); }
      const titles = [["THE CASE FOR CATHOLICISM", "#7a1f2b"], ["WHY WE'RE CATHOLIC", "#1f3b6b"], ["HARD SAYINGS", "#2f5a3a"], ["ANSWERING ATHEISM", "#5a3a6b"], ["PERSUASIVE PRO-LIFE", "#8a5a1b"]];
      titles.forEach(([title, c], i) => {
        const land = 0.2 + i * 0.28;
        const q = ease(span(k, land - 0.2, land));
        const y = lerp(-60, 300 - i * 34, q);
        ctx.fillStyle = "#1a1326"; ctx.fillRect(360, y - 2, 250, 34); ctx.fillStyle = c; ctx.fillRect(362, y, 246, 30);
        ctx.fillStyle = "#f4efe0"; ctx.fillRect(362, y + 26, 246, 4);
        text(ctx, title, 485, y + 20, 12, "#fdfaf2");
        if (q >= 1 && k < land + 0.1) { ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(0, 0, W, H); }
      });
    },
    // Matt Fradd: a pub, and two pints meeting in a toast.
    pub(ctx, k) {
      ctx.fillStyle = "#2a1810"; ctx.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 64) { ctx.fillStyle = "#3a2216"; ctx.fillRect(x, 0, 30, H); }
      ctx.fillStyle = "#1a1326"; ctx.fillRect(380, 104, 220, 60); ctx.fillStyle = "#1f4a2e"; ctx.fillRect(384, 108, 212, 52);
      text(ctx, "PINTS WITH", 490, 130, 16, "#e8b94a"); text(ctx, "AQUINAS", 490, 154, 20, "#e8b94a");
      const meet = ease(span(k, 0.2, 0.9));
      for (const [side, dir] of [[400, 1], [580, -1]]) {
        const x = side + dir * meet * 50;
        ctx.save(); ctx.translate(x, 250); ctx.rotate(dir * -0.15 * meet); ctx.scale(3, 3); ITEMS.pint(ctx, 0, 0); ctx.restore();
      }
      if (k > 0.9) { for (let i = 0; i < 14; i++) { const q = (k - 0.9 + i * 0.07) % 1.2; px(ctx, 490 + Math.sin(i * 2.3) * 60 * q, 200 - q * 160, 5, "#fbf6e8"); } text(ctx, "CHEERS!", 490, 330, 26, "#fbf6e8"); }
    },
    // GodLogic: two circles slide together until they share common ground.
    venn(ctx, k) {
      ctx.fillStyle = "#1c1030"; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 12; i++) { const q = (k * 0.6 + i / 12) % 1; text(ctx, i % 2 ? "♪" : "♫", 330 + (i * 53) % 300, 340 - q * 330, 20, "rgba(200,160,255,0.6)"); }
      const d = lerp(150, 60, ease(span(k, 0.2, 1.2)));
      ctx.globalAlpha = 0.55; ctx.fillStyle = "#7ea4e6"; ctx.beginPath(); ctx.arc(470 - d / 2, 190, 90, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#de5e55"; ctx.beginPath(); ctx.arc(470 + d / 2, 190, 90, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      text(ctx, "CHRISTIANS", 470 - d / 2 - 40, 130, 12, "#fdfaf2"); text(ctx, "MUSLIMS", 470 + d / 2 + 40, 130, 12, "#fdfaf2");
      if (k > 1.2) outlinedText(ctx, "ONE GOD", 470, 200, 18, "#ffe07a");
    },
    godlogicFront(ctx, k) {
      // The sunglasses of smoothness descend onto the close-up.
      // (The close-up is the 32-pixel bust at 7×, standing on the bottom edge.)
      const u = 7;
      const y = lerp(-40, H - 32 * u + 11 * u, ease(span(k, 0.5, 1.1)));
      const x = 24 + 10 * u;
      ctx.fillStyle = "#0b0b10"; ctx.fillRect(x - u, y, 14 * u, u);
      ctx.fillRect(x, y + u, 5 * u, 2 * u); ctx.fillRect(x + 7 * u, y + u, 5 * u, 2 * u);
      ctx.fillStyle = "#8ad0ff"; ctx.fillRect(x + u, y + u, u, u); ctx.fillRect(x + 8 * u, y + u, u, u);
    },
    // Bishop Barron: the world goes beige, then stained glass breaks through.
    beige(ctx, k) {
      ctx.fillStyle = "#d8ccb4"; ctx.fillRect(0, 0, W, H);
      const q = ease(span(k, 0.5, 1.6));
      const cx = 480; const cy = 180;
      const colors = ["#c33a3a", "#2f5ad8", "#e8b94a", "#2f8a4a", "#8a3ad8", "#e87a2a"];
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, q * 260, (i * Math.PI) / 6, ((i + 1) * Math.PI) / 6); ctx.fill();
      }
      ctx.strokeStyle = "#1a1326"; ctx.lineWidth = 4;
      for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos((i * Math.PI) / 6) * q * 260, cy + Math.sin((i * Math.PI) / 6) * q * 260); ctx.stroke(); }
      if (q > 0) { ctx.beginPath(); ctx.arc(cx, cy, q * 90, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, q * 180, 0, Math.PI * 2); ctx.stroke(); }
      if (k < 0.9) outlinedText(ctx, "BEIGE", cx, cy + 10, 40, "#bfb29a", "#8a7e66");
    },
    // Fr. Boniface: the lights go down to one candle; the Rule begins.
    candle(ctx, k) {
      ctx.fillStyle = "#07060c"; ctx.fillRect(0, 0, W, H);
      const glow = ctx.createRadialGradient(470, 200, 10, 470, 200, 240);
      glow.addColorStop(0, "rgba(255,200,110,0.45)"); glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#1a1326"; ctx.fillRect(458, 212, 24, 90); ctx.fillStyle = "#f3ead2"; ctx.fillRect(462, 216, 16, 86);
      const f = Math.sin(k * 20) * 2;
      ctx.fillStyle = "#ffcf5a"; ctx.fillRect(466 + f / 2, 192, 8, 18); ctx.fillStyle = "#fff6c0"; ctx.fillRect(468 + f / 2, 198, 4, 10);
      const line = "OBSCULTA, O FILI, PRAECEPTA MAGISTRI";
      const n = Math.floor(span(k, 0.4, 1.9) * line.length);
      text(ctx, line.slice(0, n), 470, 120, 14, "#e8d6a8");
      if (k > 1.6) text(ctx, "Listen, my son, to the master's precepts.", 470, 146, 12, "#a89878", "center", 400);
    },
    // Fr. Gregory Pine: an article of the Summa writes itself.
    summa(ctx, k) {
      ctx.fillStyle = "#e9dcc0"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#d8c8a6"; ctx.fillRect(310, 0, 3, H);
      const lines = [["VIDETUR QUOD…", "#7a1f2b"], ["Objection 1. It seems that…", "#3a2a1a"], ["SED CONTRA…", "#7a1f2b"], ["On the contrary, it is written…", "#3a2a1a"], ["RESPONDEO DICENDUM…", "#7a1f2b"], ["I answer that…", "#3a2a1a"]];
      lines.forEach(([l, c], i) => {
        const n = Math.floor(span(k, 0.2 + i * 0.26, 0.45 + i * 0.26) * l.length);
        text(ctx, l.slice(0, n), 344, 124 + i * 36, i % 2 ? 13 : 17, c, "left", i % 2 ? 400 : 700);
      });
      ctx.fillStyle = "#7a1f2b"; ctx.fillRect(330, 104, 4, 220);
    },
    // Sr. Mary Grace: roses bloom across the screen.
    roses(ctx, k) {
      ctx.fillStyle = "#1f2f66"; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 26; i++) {
        const x = 300 + (i * 71) % 330; const y = 30 + (i * 113) % 310;
        const q = span(k, i * 0.05, i * 0.05 + 0.4);
        if (q <= 0) continue;
        ctx.save(); ctx.translate(x, y); ctx.scale(q * 2, q * 2); ITEMS.rose(ctx, 0, 0); ctx.restore();
      }
      if (k > 1.1) outlinedText(ctx, "EVERY LIFE IS GOOD", 470, 200, 22, "#fdfaf2", "#1f2f66");
    },
    // Lila Rose: a camera's viewfinder, and a heartbeat that draws a heart.
    rec(ctx, k) {
      ctx.fillStyle = "#101014"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#fdfaf2"; ctx.lineWidth = 3;
      for (const [x, y, dx, dy] of [[320, 20, 1, 1], [620, 20, -1, 1], [320, 340, 1, -1], [620, 340, -1, -1]]) { ctx.beginPath(); ctx.moveTo(x, y + dy * 30); ctx.lineTo(x, y); ctx.lineTo(x + dx * 30, y); ctx.stroke(); }
      if (Math.floor(k * 3) % 2 === 0) { ctx.fillStyle = "#de5e55"; ctx.beginPath(); ctx.arc(350, 50, 8, 0, Math.PI * 2); ctx.fill(); }
      text(ctx, "REC", 366, 56, 16, "#fdfaf2", "left");
      const q = span(k, 0.2, 1.8);
      ctx.strokeStyle = "#ff6a80"; ctx.lineWidth = 4; ctx.beginPath();
      // A heartbeat line that runs into the outline of a heart.
      const pts = [[330, 200], [390, 200], [405, 170], [420, 235], [440, 140], [460, 200], [470, 200]];
      const heartPts = [];
      for (let i = 0; i <= 60; i++) { const a = (i / 60) * Math.PI * 2; heartPts.push([530 + 16 * Math.pow(Math.sin(a), 3) * 3.6, 200 - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 3.6]); }
      const all = pts.concat(heartPts);
      const n = Math.floor(q * all.length);
      all.slice(0, n).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    },
    // Brian Holdsworth: a house with a cross builds itself, and seven children look out.
    house(ctx, k) {
      ctx.fillStyle = "#8fb8d8"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#5a8a4a"; ctx.fillRect(0, 300, W, 60);
      const rows = 8;
      const built = Math.floor(span(k, 0.1, 1.2) * rows * 6);
      let n = 0;
      for (let r = 0; r < rows; r++) for (let c = 0; c < 6; c++) {
        if (n++ >= built) break;
        ctx.fillStyle = "#1a1326"; ctx.fillRect(380 + c * 32, 280 - r * 20, 32, 20);
        ctx.fillStyle = (r + c) % 2 ? "#c9784a" : "#b8683a"; ctx.fillRect(381 + c * 32, 281 - r * 20, 30, 18);
      }
      if (k > 1.2) {
        const q = ease(span(k, 1.2, 1.5));
        ctx.fillStyle = "#7a2a2a"; ctx.beginPath(); ctx.moveTo(370, 140); ctx.lineTo(476, 140 - 70 * q); ctx.lineTo(582, 140); ctx.fill();
        ctx.fillStyle = "#e8b94a"; ctx.fillRect(472, 30, 8, 44 * q); ctx.fillRect(460, 42, 32 * q, 8);
      }
      if (k > 1.4) for (let i = 0; i < 7; i++) { const pop = ease(span(k, 1.4 + i * 0.08, 1.6 + i * 0.08)); ctx.fillStyle = "#1a1326"; ctx.fillRect(392 + i * 24, 300 - pop * 22, 16, 22 * pop); ctx.fillStyle = "#f1c6a6"; ctx.fillRect(394 + i * 24, 302 - pop * 22, 12, 10 * pop); }
    },
    // Alex Jurado: a voice so big the screen shakes and the letters stand up.
    voice(ctx, k) {
      ctx.fillStyle = "#111016"; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 64; i++) {
        const h = (Math.sin(i * 0.7 + k * 14) * 0.5 + 0.5) * (40 + Math.sin(i * 0.23 + k * 3) * 30) * span(k, 0.1, 0.5) + 4;
        ctx.fillStyle = i % 2 ? "#e8b94a" : "#c9962a"; ctx.fillRect(10 * i, 180 - h, 6, h * 2);
      }
      const shake = k > 0.8 && k < 1.8 ? Math.sin(k * 80) * 4 : 0;
      ctx.save(); ctx.translate(shake, 0);
      if (k > 0.8) outlinedText(ctx, "VOICE", 470, 150, 48 + span(k, 0.8, 1.0) * 10, "#fdfaf2");
      if (k > 1.0) outlinedText(ctx, "OF", 470, 200, 30, "#fdfaf2");
      if (k > 1.2) outlinedText(ctx, "REASON", 470, 262, 54 + span(k, 1.2, 1.4) * 8, "#e8b94a");
      ctx.restore();
    },
    // Joe Heschmeyer: three quick thrusts, each one a Church Father.
    fathers(ctx, k) {
      ctx.fillStyle = "#1a1f38"; ctx.fillRect(0, 0, W, H);
      speedLines(ctx, k, "#252c50");
      const names = [["IGNATIUS OF ANTIOCH", "c. 107"], ["IRENAEUS OF LYONS", "c. 180"], ["CLEMENT OF ROME", "c. 96"]];
      names.forEach(([n, d], i) => {
        const q = ease(span(k, 0.25 + i * 0.4, 0.45 + i * 0.4));
        if (q <= 0) return;
        const y = 110 + i * 70;
        ctx.save(); ctx.translate(lerp(W + 300, 470, q), y); ctx.rotate(-0.08);
        ctx.fillStyle = "#1a1326"; ctx.fillRect(-160, -26, 320, 48); ctx.fillStyle = "#f3e6c4"; ctx.fillRect(-156, -22, 312, 40);
        text(ctx, "“" + n + "”", 0, 2, 16, "#7a1f2b"); text(ctx, d, 0, 14, 10, "#6a5a3a", "center", 600);
        ctx.restore();
      });
      // The keys of Peter, crossed.
      if (k > 1.6) { ctx.fillStyle = "#e8b94a"; ctx.save(); ctx.translate(470, 330); ctx.rotate(0.6); ctx.fillRect(-40, -3, 80, 6); ctx.restore(); ctx.save(); ctx.translate(470, 330); ctx.rotate(-0.6); ctx.fillStyle = "#cfd6dc"; ctx.fillRect(-40, -3, 80, 6); ctx.restore(); }
    },
    // Fr. Spitzer: the universe expands from a single point. It had a beginning.
    bigbang(ctx, k) {
      ctx.fillStyle = "#04050e"; ctx.fillRect(0, 0, W, H);
      const cx = 470; const cy = 190;
      const r = ease(span(k, 0.15, 1.6)) * 330;
      for (let i = 0; i < 140; i++) {
        const a = i * 2.39996; const d = ((i * 37) % 100) / 100;
        const x = cx + Math.cos(a) * d * r; const y = cy + Math.sin(a) * d * r * 0.8;
        px(ctx, x, y, i % 7 ? 2 : 3, i % 3 ? "#cfd8ff" : i % 3 === 1 ? "#ffd8a0" : "#ffffff");
      }
      if (k < 0.5) { ctx.fillStyle = `rgba(255,255,255,${1 - k * 2})`; ctx.beginPath(); ctx.arc(cx, cy, 10 + k * 80, 0, Math.PI * 2); ctx.fill(); }
      if (k > 0.9) text(ctx, "H(avg) > 0  ⇒  past-incomplete", cx, 318, 15, "#9fd0ff");
      if (k > 1.3) outlinedText(ctx, "THE UNIVERSE BEGAN", cx, 128, 24, "#ffe07a");
    },
    // Ethan Muse and Fr. Spitzer together: the miracles that point to one Church.
    miracles(ctx, k) {
      ctx.fillStyle = "#1a1530"; ctx.fillRect(0, 0, W, H);
      const cards = [
        ["FATIMA", "1917", (x, y, q) => { for (let i = 0; i < 12; i++) { const a = i * 0.52 + q * 6; ctx.fillStyle = i % 2 ? "#ffd84a" : "#ff9a3a"; ctx.fillRect(x + Math.cos(a) * 26 - 3, y + Math.sin(a) * 26 - 3, 6, 6); } ctx.fillStyle = "#fff2a8"; ctx.beginPath(); ctx.arc(x + Math.sin(q * 9) * 6, y, 16, 0, Math.PI * 2); ctx.fill(); }],
        ["LANCIANO", "8TH C.", (x, y) => { ctx.fillStyle = "#f3ead2"; ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#b8322a"; ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#e8b94a"; ctx.fillRect(x - 2, y - 30, 4, 10); }],
        ["GUADALUPE", "1531", (x, y) => { ctx.fillStyle = "#2f8a7a"; ctx.beginPath(); ctx.moveTo(x, y - 26); ctx.lineTo(x + 16, y + 24); ctx.lineTo(x - 16, y + 24); ctx.fill(); ctx.fillStyle = "#f1c6a6"; ctx.fillRect(x - 4, y - 22, 8, 8); for (let i = 0; i < 10; i++) { ctx.fillStyle = "#ffd84a"; ctx.fillRect(x - 22 + (i % 2) * 44, y - 20 + i * 4, 3, 3); } }],
        ["LOURDES", "1858", (x, y, q) => { ctx.fillStyle = "#6a6a72"; ctx.beginPath(); ctx.arc(x, y + 8, 26, Math.PI, 0); ctx.fill(); ctx.fillStyle = "#f7f5ee"; ctx.fillRect(x - 4, y - 12, 8, 16); ctx.fillStyle = "#6fb4d4"; for (let i = 0; i < 4; i++) ctx.fillRect(x - 12 + i * 8, y + 12 + ((q * 60 + i * 5) % 12), 3, 5); }],
      ];
      cards.forEach(([name, year, draw], i) => {
        const x = 110 + (i % 2) * 150 + 160; const y = 130 + Math.floor(i / 2) * 116;
        const q = ease(span(k, 0.15 + i * 0.3, 0.45 + i * 0.3));
        if (q <= 0) return;
        ctx.globalAlpha = q;
        ctx.fillStyle = "#1a1326"; ctx.fillRect(x - 66, y - 50, 132, 100); ctx.fillStyle = "#2a2450"; ctx.fillRect(x - 62, y - 46, 124, 92);
        draw(x, y - 6, k);
        text(ctx, name, x, y + 38, 12, "#fdfaf2"); text(ctx, year, x, y - 32, 10, "#a9a6bd");
        ctx.globalAlpha = 1;
        if (k > 0.55 + i * 0.3) { ctx.save(); ctx.translate(x, y + 4); ctx.rotate(-0.25); ctx.strokeStyle = "#e8b94a"; ctx.lineWidth = 3; ctx.strokeRect(-56, -12, 112, 22); text(ctx, "VINDICATED", 0, 5, 13, "#e8b94a"); ctx.restore(); }
      });
    },
    miraclesFront(ctx, k) {
      // Both apologists, one on each side.
      const slide = ease(span(k, 0, 0.35));
      Art.paint(ctx, Art.bust(Art.CAST.muse), Math.round(lerp(-200, 0, slide)), H - 32 * 5, 5);
      Art.paint(ctx, Art.bust(Art.CAST.spitzer), Math.round(lerp(W + 40, W - 160, slide)), H - 32 * 5, 5, true);
    },
    // Ethan Muse's Camera Mog: a recording frame, and the lean-in.
    mog(ctx, k) {
      ctx.fillStyle = "#0e1122"; ctx.fillRect(0, 0, W, H);
      speedLines(ctx, k, "#1b2146");
      if (Math.floor(k * 3) % 2 === 0) { ctx.fillStyle = "#de5e55"; ctx.fillRect(20, 20, 12, 12); }
      text(ctx, "REC", 40, 32, 16, "#ece4d0", "left");
    },
  };

  // A small flash where a great move lands on each target.
  function impactOn(color) {
    return (ctx, api, k) => {
      for (const a of api.foes) burst(ctx, a.x, a.y - 60, clamp(k * 2, 0, 1), color);
    };
  }

  // ---- The move list --------------------------------------------------------------

  const say = (text) => text;
  const MOVES = {
    akin: [
      { name: "Precise Distinction", kind: volley, glyphs: ["1.", "2."], color: "#7ea4e6" },
      { name: "Senior Apologist", kind: approach, to: "foe", say: say("Actually, there are three views…"), mark: "dumbfounded" },
      { name: "Logical Paradox", kind: hex, to: "all", say: "This sentence is false.", mark: ["dumbfounded", "pipDown"], fx: (ctx, api, h, targets, t, k) => { for (const a of targets) { const p = api.head(a); if (k > 0 && k < 1) outlinedText(ctx, "∞", lerp(api.mouth(h).x, p.x, k), lerp(api.mouth(h).y, p.y + 30, k), 28, "#c69ae8"); } } },
      { name: "Mysterious World", kind: cinematic, who: "Jimmy Akin", color: "#3a6a4a", scene: SCENES.ufo, front: SCENES.akinFront, to: "two", mark: ["examined", "factcheck"] },
    ],
    muse: [
      { name: "Pointed Question", kind: volley, glyphs: ["?"], color: "#de5e55", mark: "doubting" },
      { name: "Open Challenge", kind: hex, to: "all", pose: "raise", say: "I'll debate any of you. Right now.", mark: ["called", "pipDown"], fx: (ctx, api, h, targets, t, k) => waves(ctx, api, h, targets, t, k, "#de5e55") },
      { name: "Steelman Stance", kind: aura, to: "self", mark: ["shield", "up"], say: "Let me put your case better.", color: "#cfd6dc" },
      { name: "Camera Mog", kind: cinematic, who: "Ethan Muse", color: "#de5e55", scene: SCENES.mog, face: (k) => Art.mog(Art.CAST.muse, ease(span(k, 0.5, 1.3))), faceX: 136, faceScale: 7, faceDrop: 0, to: "one", mark: ["dumbfounded", "pipDown"] },
      { name: "Vindicatory Miracles", duo: "spitzer", kind: cinematic, who: "Ethan Muse & Fr. Spitzer", color: "#5a3a8a", scene: SCENES.miracles, front: SCENES.miraclesFront, closeUp: false, to: "all", mark: ["factcheck", "pipDown", "dumbfounded"], impact: impactOn("#e8b94a") },
    ],
    schmitz: [
      { name: "Two-Minute Homily", kind: volley, glyphs: ["Here's the thing…"], color: "#e8b94a" },
      { name: "I'm Praying for You", kind: approach, to: "ally", say: "I'm praying for you.", mark: "halo", mark2: "heal" },
      { name: "The Bible in a Year", kind: aura, to: "allies", mark: ["up", "pipUp"], say: "Day one. Genesis.", backdrop: (ctx, h, t) => { if (t > 0.2 && t < 1.9) ITEMS.book(ctx, h.x + 34, h.y - 150 + Math.sin(t * 5) * 3, "#7a1f2b"); } },
      { name: "The Catechism in a Year", kind: cinematic, who: "Fr. Mike Schmitz", color: "#b8322a", scene: SCENES.calendar, to: "allies", mark: ["shield", "up"] },
    ],
    bertuzzi: [
      { name: "Clarifying Questions", kind: volley, glyphs: ["?", "?", "?"], color: "#9fd0ff" },
      { name: "Time's Up", kind: approach, to: "foe", item: "timer", say: "Time's up.", mark: "down" },
      { name: "Point of Order", kind: hex, to: "all", pose: "raise", say: "Point of order!", mark: ["factcheck", "pipDown"] },
      { name: "Bayesian Update", kind: cinematic, who: "Cameron Bertuzzi", color: "#2f5a8a", scene: SCENES.bayes, to: "allies", mark: ["heal", "shield"] },
    ],
    horn: [
      { name: "Rapid Response", kind: volley, glyphs: ["But—", "Actually,", "Consider:"], color: "#e8b94a" },
      { name: "Why We're Catholic", kind: aura, to: "allies", mark: ["up", "pipUp"], backdrop: (ctx, h, t) => { if (t < 1.9) ITEMS.book(ctx, h.x + 34, h.y - 150, "#1f3b6b"); } },
      { name: "Hard Sayings", kind: hex, to: "all", say: "Hebrews 6, verses 4 to 6.", mark: ["down", "pipDown"], fx: (ctx, api, h, targets, t, k) => { for (const a of targets) { const p = api.head(a); if (k > 0 && k < 1) ITEMS.scroll(ctx, lerp(h.x + 30, p.x, k), lerp(h.y - 60, p.y + 30, k) - Math.sin(k * Math.PI) * 40); } } },
      { name: "The Case for Catholicism", kind: cinematic, who: "Trent Horn", color: "#7a1f2b", scene: SCENES.books, to: "all", mark: ["pipDown"], impact: impactOn("#e8b94a") },
    ],
    fradd: [
      { name: "Cheeky Question", kind: volley, glyphs: ["Mate…"], color: "#e8b94a" },
      { name: "Pints with Aquinas", kind: approach, to: "ally", item: "pint", say: "Cheers, mate!", mark: "heal", mark2: "pipUp" },
      { name: "Australian Charm", kind: approach, to: "ally", say: "G'day! You've got this.", mark: "up", mark2: "hearts" },
      { name: "Summa Session", kind: cinematic, who: "Matt Fradd", color: "#1f4a2e", scene: SCENES.pub, to: "allies", mark: ["shield", "heal"] },
    ],
    godlogic: [
      { name: "Smooth Question", kind: volley, glyphs: ["♪", "♫"], color: "#c69ae8" },
      { name: "Smooth Pivot", kind: approach, to: "ally", item: "scroll", say: "Here's your citation.", mark: "shield" },
      { name: "Stay Smooth", kind: aura, to: "allies", mark: ["shield", "pipUp"], say: "Stay smooth.", color: "#c69ae8" },
      { name: "Common Ground", kind: cinematic, who: "GodLogic", color: "#6a2a8a", scene: SCENES.venn, front: SCENES.godlogicFront, to: "all", mark: ["factcheck", "down"] },
    ],
    barron: [
      { name: "Sunday Sermon", kind: volley, glyphs: ["Friends,"], color: "#e8b94a" },
      { name: "Word on Fire", kind: hex, to: "all", pose: "raise", say: "Friends, the Gospel is good news!", mark: ["pipDown"], fx: (ctx, api, h, targets, t, k) => { waves(ctx, api, h, targets, t, k, "#ff8a3a"); for (const a of targets) if (k >= 1 && t < 1.6) { const p = api.head(a); ctx.fillStyle = "#ffcf5a"; ctx.fillRect(p.x - 4, p.y - 22, 8, 14); ctx.fillStyle = "#ff8a3a"; ctx.fillRect(p.x - 2, p.y - 16, 4, 8); } } },
      { name: "The Way of Beauty", kind: aura, to: "self", mark: ["shield", "up"], foes: "called", backdrop: (ctx, h, t) => { const q = span(t, 0.1, 0.7); const cx = h.x; const cy = h.y - 120; const cs = ["#c33a3a", "#2f5ad8", "#e8b94a", "#2f8a4a"]; for (let i = 0; i < 8; i++) { ctx.fillStyle = cs[i % 4]; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 60 * q, (i * Math.PI) / 4, ((i + 1) * Math.PI) / 4); ctx.fill(); ctx.globalAlpha = 1; } } },
      { name: "No Beige Catholicism", kind: cinematic, who: "Bishop Barron", color: "#9b1f5a", scene: SCENES.beige, to: "one", mark: ["muted", "pipDown"] },
    ],
    hicks: [
      { name: "Gentle Correction", kind: approach, to: "foe", say: "Peace be with you.", bow: true, pose: "stand", mark: "down" },
      { name: "Discernment of Spirits", kind: hex, to: "all", say: "Which voice is God's?", mark: "examined" },
      { name: "Obsculta", kind: hex, to: "one", say: "Listen.", mark: ["dumbfounded", "pipDown"], fx: (ctx, api, h, targets, t, k) => { if (k > 0 && k < 1) { ctx.strokeStyle = "#e8d6a8"; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(h.x + 20, h.y - 70, 20 + k * 200 + i * 30, -0.5, 0.5); ctx.stroke(); } ctx.globalAlpha = 1; } } },
      { name: "Spiritual Direction", kind: cinematic, who: "Fr. Boniface Hicks, OSB", color: "#3a2a1a", scene: SCENES.candle, to: "one", mark: ["pipDown", "dumbfounded"] },
    ],
    pine: [
      { name: "Distinguo", kind: volley, to: "two", glyphs: ["I distinguish…", "…the major."], color: "#e8b94a" },
      { name: "Sed Contra", kind: aura, to: "allies", mark: ["crit", "shield"], say: "Sed contra!" },
      { name: "The Five Ways", kind: hex, to: "all", say: "First, from motion…", mark: ["down", "pipDown"], fx: (ctx, api, h, targets, t, k) => { ["I", "II", "III", "IV", "V"].forEach((n, i) => { const q = clamp(k * 1.6 - i * 0.15, 0, 1); if (q <= 0 || q >= 1) return; const a = targets[i % targets.length]; const p = api.head(a); outlinedText(ctx, n, lerp(h.x + 30, p.x, q), lerp(h.y - 70, p.y + 30, q) - Math.sin(q * Math.PI) * 30, 22, "#e8b94a"); }); } },
      { name: "Respondeo", kind: cinematic, who: "Fr. Gregory Pine, OP", color: "#1d1d24", scene: SCENES.summa, to: "one", mark: ["factcheck", "pipDown"], impact: impactOn("#e8b94a") },
    ],
    marygrace: [
      { name: "A Word of Truth", kind: volley, glyphs: ["♥"], color: "#ff7a9a" },
      { name: "Let Love", kind: aura, to: "allies", mark: ["hearts", "pipUp"], say: "You are loved.", color: "#ff7a9a" },
      { name: "Every Life Is Good", kind: cinematic, who: "Sr. Mary Grace, SV", color: "#1f2f66", scene: SCENES.roses, to: "all", mark: ["down", "hearts"] },
    ],
    rose: [
      { name: "Every Life", kind: volley, glyphs: ["♥", "♥"], color: "#ff6a80" },
      { name: "Sense Deception", kind: approach, to: "foe", item: "phone", say: "Is that really true?", mark: "examined", mark2: "factcheck" },
      { name: "Counsel", kind: approach, to: "ally", say: "You're not alone.", mark: "hearts", mark2: "pipUp" },
      { name: "Live Action", kind: cinematic, who: "Lila Rose", color: "#b8505a", scene: SCENES.rec, to: "all", mark: ["down", "pipDown"] },
    ],
    holdsworth: [
      { name: "Ten-Minute Essay", kind: volley, glyphs: ["Here's why."], color: "#e8b94a" },
      { name: "Beauty Will Save the World", kind: aura, to: "allies", mark: "heal", say: "Beauty will save the world." },
      { name: "Cultural Diagnosis", kind: approach, to: "foe", item: "clipboard", say: "Let's look at the culture.", mark: "examined", mark2: "down" },
      { name: "Authentic Catholic Culture", kind: cinematic, who: "Brian Holdsworth", color: "#7a4a2a", scene: SCENES.house, to: "allies", mark: ["shield", "pipUp"] },
    ],
    jurado: [
      { name: "One-Two", kind: volley, glyphs: ["Look.", "Listen."], color: "#e8b94a" },
      { name: "Deep Cut", kind: approach, to: "foe", say: "Let's go deeper.", mark: "doubting", mark2: "pipDown" },
      { name: "Stallone Voice", kind: hex, to: "one", say: "Let me tell you something…", mark: "dumbfounded", fx: (ctx, api, h, targets, t, k) => { waves(ctx, api, h, targets, t, k, "#e8b94a"); if (k > 0.5 && t < 1.4) { ctx.fillStyle = "rgba(232,185,74,0.12)"; ctx.fillRect(0, 0, 640, 360); } } },
      { name: "Voice of Reason", kind: cinematic, who: "Alex Jurado", color: "#8a6a1a", scene: SCENES.voice, to: "all", mark: ["factcheck", "pipDown"], impact: impactOn("#e8b94a") },
    ],
    spitzer: [
      { name: "Fine-Tuning", kind: volley, glyphs: ["Λ", "G"], color: "#9fd0ff", mark: "factcheck" },
      { name: "The Four Levels of Happiness", kind: aura, to: "allies", mark: ["shield", "up"], say: "Level four: the transcendent.", color: "#ffe07a", backdrop: (ctx, h, t) => { const q = span(t, 0.1, 0.8); for (let i = 0; i < 4; i++) { if (q * 4 < i) break; ctx.fillStyle = ["#6a6a72", "#7ea4e6", "#74c07a", "#e8b94a"][i]; ctx.fillRect(h.x + 44 + i * 16, h.y - 24 - i * 16, 16, 24 + i * 16); } } },
      { name: "Borde–Guth–Vilenkin", kind: cinematic, who: "Fr. Robert Spitzer, SJ", color: "#23305a", scene: SCENES.bigbang, to: "all", mark: ["muted", "pipDown"], impact: impactOn("#ffe07a") },
      { name: "Vindicatory Miracles", duo: "muse", kind: cinematic, who: "Ethan Muse & Fr. Spitzer", color: "#5a3a8a", scene: SCENES.miracles, front: SCENES.miraclesFront, closeUp: false, to: "all", mark: ["factcheck", "pipDown", "dumbfounded"], impact: impactOn("#e8b94a") },
    ],
    heschmeyer: [
      { name: "Ignatius of Antioch", kind: volley, glyphs: ["“Catholic Church”", "c. 107"], color: "#e8b94a", mark: "doubting" },
      { name: "Former Litigator", kind: aura, to: "allies", mark: "crit", say: "Objection!", color: "#e8b94a" },
      { name: "Shameless Popery", kind: cinematic, who: "Joe Heschmeyer", color: "#3a4356", scene: SCENES.fathers, to: "one", mark: ["pipDown", "doubting"], impact: impactOn("#e8b94a") },
    ],
  };

  for (const list of Object.values(MOVES)) {
    const solo = list.filter((m) => !m.duo);
    solo[solo.length - 1].great = true;
  }

  function build(m, hero) {
    const move = m.kind(m);
    move.name = m.name;
    return move;
  }

  return { create, MOVES };
})();
