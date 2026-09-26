// New Apologetics — the battle: rules (Battle) and the stage (BattleView).
//
// Battle knows nothing about drawing. Each fighter takes turns in order of
// Readiness. A move lowers Composure (the fighter's cool) or Conviction (the
// fighter's certainty). An opponent whose Conviction runs out converts; one
// whose Composure runs out walks off, unconvinced. A hero whose Composure
// runs out is Discouraged until a friend encourages him.

const Battle = (() => {
  const HERO_CONV = 2;       // heroes start at 2 of 4 pips of Conviction
  const GRUNT_CONV = 4;
  const BOSS_CONV = 6;
  const HP_SCALE = { hero: 2.1, grunt: 5, boss: 6 };
  const FOE_PUNCH = 2.4;     // opponents argue harder than their listed stats

  const DEBUFFS = ["dumbfounded", "doubting", "muted", "examined", "called"];

  // A hero's level raises Composure and the strength of his arguments; each
  // chapter's opponents grow tougher to match.
  const HERO_GROWTH = 0.07;
  const FOE_GROWTH = 0.12;

  function makeUnit(id, side, slot, def, level) {
    const hero = side === "hero";
    const kind = hero ? "hero" : def.boss ? "boss" : "grunt";
    const grow = hero ? 1 + HERO_GROWTH * Math.max(0, (level || 1) - 1) : 1 + FOE_GROWTH * (level || 0);
    const punch = hero ? grow : FOE_PUNCH * grow * (def.boss ? 1.3 : 1);
    const maxHp = Math.round(def.stats[0] * HP_SCALE[kind] * grow);
    return {
      id, side, key: (hero ? "h" : "f") + slot, slot, def, kind,
      name: def.name, faction: def.faction || "catholic",
      maxHp, hp: maxHp,
      base: { r: def.stats[1] * punch, l: def.stats[2] * punch, c: def.stats[3], spd: def.stats[4] },
      bonus: { r: 0, l: 0, c: 0 },
      conv: hero ? HERO_CONV : def.boss ? BOSS_CONV : GRUNT_CONV,
      maxConv: hero ? 4 : def.boss ? BOSS_CONV : GRUNT_CONV,
      cd: def.skills.map((s) => s.start || 0),
      statuses: {}, called: null, buffs: [], shield: null, citation: false, counter: 0, immune: {},
      state: "in", since: 0,
    };
  }

  function create(opts) {
    const H = GameData.HEROES;
    const F = GameData.FOES;
    const rnd = opts.random || Math.random;
    const levels = opts.levels || {};
    // Moves unlock as a hero levels up. Without levels (the design page) or in
    // testing mode, every move is open.
    const gated = !!opts.levels && !opts.unlockAll;
    const units = opts.team.map((id, i) => {
      const level = levels[id] || 1;
      const u = makeUnit(id, "hero", i, H[id], level);
      u.level = level;
      u.locked = H[id].skills.map((s, k) => gated && unlockLevel(H[id], k) > Math.max(level, opts.movesAt || 0));
      return u;
    })
      .concat(opts.foes.map((id, i) => makeUnit(id, "foe", i, F[id], opts.level)));
    let queue = [];
    let round = 0;

    const heroes = () => units.filter((u) => u.side === "hero");
    const foes = () => units.filter((u) => u.side === "foe");
    const inPlay = (u) => u.state === "in";
    const others = (u) => units.filter((x) => x.side !== u.side);
    const friends = (u) => units.filter((x) => x.side === u.side);

    // Passive bonuses, set once at the start.
    for (const u of heroes()) {
      const p = u.def.passive;
      if (!p) continue;
      for (const f of heroes()) {
        if (p.allies) for (const k of Object.keys(p.allies)) f.bonus[k] += p.allies[k];
        if (p.group && p.group.includes(f.id)) for (const k of ["r", "l", "c"]) if (p[k]) f.bonus[k] += p[k];
        if (p.converts && p.converts.includes(f.id)) f.conv = Math.min(f.maxConv, f.conv + 1);
      }
    }

    function stat(u, s) {
      let m = 1 + (u.bonus[s] || 0);
      for (const b of u.buffs) if (b.stat === s) m += b.amt;
      return u.base[s] * Math.max(0.2, m);
    }
    function critChance(u) {
      let c = 0.1;
      for (const b of u.buffs) if (b.stat === "crit") c += b.amt;
      return c;
    }

    // ---- Turn order ---------------------------------------------------------------

    function nextUnit() {
      for (;;) {
        if (!queue.length) {
          round++;
          queue = units.filter(inPlay).sort((a, b) => stat(b, "spd") - stat(a, "spd") + (rnd() - 0.5) * 6);
          if (!queue.length) return null;
        }
        const u = queue.shift();
        if (inPlay(u)) return u;
      }
    }

    // At the start of a turn: Doubting wears on Composure, everything counts down.
    function startTurn(u) {
      const events = [];
      if (u.statuses.doubting > 0) {
        const d = Math.round(u.maxHp * 0.05);
        u.hp = Math.max(0, u.hp - d);
        events.push({ key: u.key, text: "−" + d, color: "#c69ae8" });
        checkOut(u, events);
      }
      const skip = inPlay(u) && u.statuses.dumbfounded > 0;
      for (const k of Object.keys(u.statuses)) if (u.statuses[k] > 0) u.statuses[k]--;
      if (u.called && --u.called.n <= 0) u.called = null;
      u.buffs = u.buffs.filter((b) => --b.n > 0);
      if (u.shield && --u.shield.n <= 0) u.shield = null;
      for (const k of Object.keys(u.immune)) if (u.immune[k] > 0) u.immune[k]--;
      if (u.counter > 0) u.counter--;
      u.cd = u.cd.map((c) => Math.max(0, c - 1));
      if (skip) events.push({ key: u.key, text: "Dumbfounded", color: "#ffd84a" });
      return { skip: skip || !inPlay(u), events };
    }

    // ---- Choosing ---------------------------------------------------------------------

    function partnerHere(u, skill) {
      return !skill.duo || units.some((x) => x.side === u.side && x.id === skill.duo && inPlay(x));
    }
    function usable(u) {
      return u.def.skills.map((s, i) => ({ s, i })).filter(({ s, i }) =>
        u.cd[i] === 0 && !(u.locked && u.locked[i]) && (i === 0 || !(u.statuses.muted > 0)) && partnerHere(u, s)).map(({ i }) => i);
    }
    // Who can be picked for a move that asks for one target.
    function choices(u, i) {
      const s = u.def.skills[i];
      if (s.target === "foe") {
        const opp = others(u).filter(inPlay);
        if (u.called) { const c = units.find((x) => x.key === u.called.by && inPlay(x)); if (c) return [c]; }
        return opp;
      }
      if (s.target === "ally") return friends(u).filter((x) => x.state === "in" || x.state === "discouraged");
      return [];
    }

    // A simple opponent: its best ready move, most of the time.
    function think(u) {
      const ready = usable(u);
      let i = 0;
      for (const j of ready.slice().sort((a, b) => b - a)) if (j > 0 && rnd() < 0.7) { i = j; break; }
      const s = u.def.skills[i];
      let target = null;
      const c = choices(u, i);
      if (s.target === "foe" && c.length) {
        target = c.slice().sort((a, b) => (a.side === "foe" ? a.conv - b.conv : a.hp / a.maxHp - b.hp / b.maxHp))[rnd() < 0.6 ? 0 : Math.floor(rnd() * c.length)];
      } else if (s.target === "ally" && c.length) {
        target = c.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      }
      return { i, target };
    }

    // ---- Doing --------------------------------------------------------------------------

    function targetsOf(u, s, chosen) {
      const opp = others(u).filter(inPlay);
      switch (s.target) {
        case "foe": return chosen ? [chosen] : opp.slice(0, 1);
        case "two": return opp.slice().sort(() => rnd() - 0.5).slice(0, 2);
        case "foes": return opp;
        case "ally": return chosen ? [chosen] : [u];
        case "allies": return friends(u).filter((x) => x.state === "in" || x.state === "discouraged");
        default: return [u];
      }
    }

    function aim(u, i, chosen) { return targetsOf(u, u.def.skills[i], chosen); }

    function use(u, i, chosen, fixed) {
      const s = u.def.skills[i];
      const targets = fixed || targetsOf(u, s, chosen);
      const events = [];
      const done = new Set();          // effects that happen once per move
      let broke = false;
      u.cd[i] = s.cd;
      for (const t of targets) {
        for (const e of s.effects) {
          if (e.chance !== undefined && rnd() > e.chance) continue;
          if (e.faction && t.faction !== e.faction) continue;
          if (t.state === "converted" || t.state === "walked") break;
          if (e.dmg) {
            for (let h = 0; h < (e.hits || 1); h++) hit(u, t, e, s, events, false);
            if (e.splash) for (const o of others(u).filter((x) => inPlay(x) && x !== t)) hit(u, o, { ...e, dmg: e.dmg * 0.4 }, s, events, true);
            if (s.target === "foe" && t.counter > 0 && inPlay(t) && inPlay(u)) {
              events.push({ key: t.key, text: "Rebuttal!", color: "#e8b94a" });
              hit(t, u, { dmg: 0.6, stat: "r" }, t.def.skills[0], events, true);
            }
          }
          if (e.conv) { if (conviction(t, e.conv, s, events)) broke = true; }
          if (e.status) { t.statuses[e.status] = Math.max(t.statuses[e.status] || 0, e.turns); events.push({ key: t.key, text: label(e.status, t), color: "#ffd84a" }); }
          if (e.taunt) { t.called = { by: u.key, n: e.taunt }; events.push({ key: t.key, text: "Called Out", color: "#de5e55" }); }
          if (e.tauntAll && !done.has("tauntAll")) { done.add("tauntAll"); for (const o of others(u).filter(inPlay)) { o.called = { by: u.key, n: e.tauntAll }; events.push({ key: o.key, text: "Called Out", color: "#de5e55" }); } }
          if (e.buff) { t.buffs.push({ stat: e.buff, amt: e.amt, n: e.turns + 1 }); events.push({ key: t.key, text: (e.amt > 0 ? "▲ " : "▼ ") + statName(e.buff), color: e.amt > 0 ? "#74c07a" : "#de5e55" }); }
          if (e.heal) heal(t, e.heal, events);
          if (e.cleanse) { for (const k of DEBUFFS) t.statuses[k] = 0; t.called = null; t.buffs = t.buffs.filter((b) => b.amt > 0); events.push({ key: t.key, text: "Examen", color: "#74c07a" }); }
          if (e.purge) purge(t, e.purge, events);
          if (e.shield) { t.shield = { amt: Math.round(t.maxHp * e.shield), n: e.turns + 1 }; events.push({ key: t.key, text: "Shield of Faith", color: "#7ea4e6" }); }
          if (e.citation) { t.citation = true; events.push({ key: t.key, text: "Citation", color: "#7ea4e6" }); }
          if (e.counter) { t.counter = e.counter + 1; events.push({ key: t.key, text: "Rebuttal ready", color: "#e8b94a" }); }
          if (e.selfCounter && !done.has("selfCounter")) { done.add("selfCounter"); u.counter = e.selfCounter + 1; }
          if (e.immune) { t.immune[e.immune] = e.turns + 1; events.push({ key: t.key, text: immuneName(e.immune), color: "#7ea4e6" }); }
          if (e.selfConv && !done.has("selfConv")) { done.add("selfConv"); conviction(u, e.selfConv, s, events); }
          if (e.allyConv && !done.has("allyConv")) { done.add("allyConv"); for (const f of friends(u).filter(inPlay)) conviction(f, e.allyConv, s, events); }
          if (e.friendsCleanse && !done.has("fc")) { done.add("fc"); for (const f of friends(u)) f.statuses[e.friendsCleanse] = 0; }
          if (e.randomLift) {
            const lifts = [{ buff: "r", amt: 0.5, turns: 3 }, { buff: "crit", amt: 0.5, turns: 3 }, { shield: 0.25, turns: 3 }, { heal: 0.2 }];
            const l = lifts[Math.floor(rnd() * lifts.length)];
            if (l.buff) { t.buffs.push({ stat: l.buff, amt: l.amt, n: l.turns + 1 }); events.push({ key: t.key, text: "▲ " + statName(l.buff), color: "#74c07a" }); }
            if (l.shield) { t.shield = { amt: Math.round(t.maxHp * l.shield), n: l.turns + 1 }; events.push({ key: t.key, text: "Shield of Faith", color: "#7ea4e6" }); }
            if (l.heal) heal(t, l.heal, events);
          }
          if (e.summon && !done.has("summon")) {
            done.add("summon");
            const free = [0, 1, 2].find((sl) => !units.some((x) => x.side === "foe" && x.slot === sl && inPlay(x)));
            if (free !== undefined) {
              const old = units.findIndex((x) => x.side === "foe" && x.slot === free);
              const nu = makeUnit(e.summon, "foe", free, F[e.summon], opts.level);
              if (old >= 0) units.splice(old, 1, nu); else units.push(nu);
              events.push({ key: nu.key, text: "Joins in", color: "#de5e55", summon: true });
            }
          }
        }
      }
      for (const e of s.effects) if (e.onBreak && broke) conviction(u, e.onBreak, s, events);
      return { skill: s, targets, events };
    }

    function hit(u, t, e, s, events, quiet) {
      if (!inPlay(t)) return;
      let d = stat(u, e.stat) * e.dmg * (0.92 + rnd() * 0.16);
      if (u.side === "hero") d *= 1 + 0.05 * (u.conv - 2);
      if (e.vs) {
        const [what, mult] = e.vs;
        if (what === "guarded" ? t.shield || t.citation : t.statuses[what] > 0) d *= mult;
      }
      if (e.stat === "l" && t.statuses.examined > 0) d *= 1.3;
      if (e.stat === "l" && t.immune.learning > 0) { events.push({ key: t.key, text: "Unmoved", color: "#a9a6bd" }); return; }
      d *= 1 - Math.min(60, stat(t, "c")) / 100;
      const crit = rnd() < critChance(u);
      if (crit) d *= 1.5;
      if (t.citation) { d *= 0.3; t.citation = false; }
      d = Math.round(d);
      if (t.shield) { const a = Math.min(t.shield.amt, d); t.shield.amt -= a; d -= a; if (t.shield.amt <= 0) t.shield = null; }
      t.hp = Math.max(0, t.hp - d);
      events.push({ key: t.key, text: (crit ? "Crit! " : "") + "−" + d, color: crit ? "#ffd84a" : "#ece4d0" });
      if (crit) conviction(t, -1, s, events);
      checkOut(t, events);
    }

    function conviction(t, n, s, events) {
      if (!inPlay(t)) return false;
      const pierce = (s && s.pierce) || [];
      if (n < 0) {
        const held = t.immune.conviction > 0 || (t.immune.security > 0 && !pierce.includes("security")) || (t.immune.faith > 0 && !pierce.includes("faith"));
        if (held) { events.push({ key: t.key, text: "Holds firm", color: "#a9a6bd" }); return false; }
      }
      const before = t.conv;
      t.conv = Math.max(0, Math.min(t.maxConv, t.conv + n));
      if (t.conv !== before) events.push({ key: t.key, text: (n > 0 ? "+" : "−") + Math.abs(t.conv - before) + " Conviction", color: "#7ea4e6" });
      if (t.side === "foe" && t.conv === 0) {
        t.state = "converted"; t.since = 0;
        events.push({ key: t.key, text: "Converted!", color: "#e8b94a", out: "converted" });
        return true;
      }
      return false;
    }

    function heal(t, frac, events) {
      const a = Math.round(t.maxHp * frac);
      if (t.state === "discouraged") { t.state = "in"; events.push({ key: t.key, text: "Encouraged!", color: "#74c07a", back: true }); }
      if (t.state !== "in") return;
      t.hp = Math.min(t.maxHp, t.hp + a);
      events.push({ key: t.key, text: "+" + a, color: "#74c07a" });
    }

    function purge(t, n, events) {
      const good = t.buffs.filter((b) => b.amt > 0);
      const drop = n === "all" ? good.length : n;
      let removed = 0;
      for (const b of good.slice(0, drop)) { t.buffs.splice(t.buffs.indexOf(b), 1); removed++; }
      if (n === "all") { if (t.shield) removed++; if (t.citation) removed++; t.shield = null; t.citation = false; for (const k of Object.keys(t.immune)) { if (t.immune[k]) removed++; t.immune[k] = 0; } }
      else if (removed < drop && t.shield) { t.shield = null; removed++; }
      if (removed) events.push({ key: t.key, text: "Fact-Checked", color: "#de5e55" });
    }

    function checkOut(t, events) {
      if (t.hp > 0 || !inPlay(t)) return;
      if (t.side === "foe") { t.state = "walked"; t.since = 0; events.push({ key: t.key, text: "Walks off", color: "#a9a6bd", out: "walked" }); }
      else { t.state = "discouraged"; events.push({ key: t.key, text: "Discouraged", color: "#a9a6bd" }); }
    }

    function outcome() {
      if (!foes().some(inPlay)) return "win";
      if (!heroes().some(inPlay)) return "lose";
      return null;
    }

    return {
      units, heroes, foes, nextUnit, startTurn, usable, choices, think, aim, use, outcome, stat,
      get round() { return round; },
    };
  }

  const LABELS = { dumbfounded: "Dumbfounded", doubting: "Doubting", muted: "Muted", examined: "Cross-Examined", called: "Called Out" };
  // An apologist under pressure is flustered, not doubting his faith: the same
  // status (it wears on Composure) takes a different name on the heroes' side.
  const label = (s, u) => (s === "doubting" && u && u.side === "hero" ? "Flustered" : LABELS[s] || s);
  const statName = (s) => ({ r: "Rhetoric", l: "Learning", c: "Poise", crit: "Crit" }[s] || s);
  const immuneName = (k) => ({ conviction: "Steadfast", learning: "Testimony", faith: "Faith Alone", security: "Eternal Security" }[k] || k);

  // Fight to the end. `choose(u)` returns a promise of { i, target } for a hero
  // the player controls; without it, everyone plays themselves.
  async function run(b, view, opts) {
    const o = opts || {};
    for (;;) {
      if (o.stopped && o.stopped()) return "stopped";
      const out = b.outcome();
      if (out) return out;
      const u = b.nextUnit();
      if (!u) return b.outcome();
      view.setActive(u.key);
      const st = b.startTurn(u);
      if (st.events.length) { view.show(st.events); await view.sleep(0.7); }
      if (st.skip || b.outcome()) continue;
      const pick = u.side === "hero" && o.choose ? await o.choose(u) : b.think(u);
      if (o.stopped && o.stopped()) return "stopped";
      const targets = b.aim(u, pick.i, pick.target);
      if (o.onAction) o.onAction(u, u.def.skills[pick.i]);
      view.setActive(null);
      await view.perform(u, pick.i, targets);
      const r = b.use(u, pick.i, pick.target, targets);
      view.show(r.events);
      await view.sleep(r.events.some((e) => e.out) ? 2.0 : 0.9);
    }
  }

  // Experience: level L needs 50·L·(L−1) points (100 for level 2, 300 for 3, …).
  const levelOf = (xp) => { let L = 1; while (50 * (L + 1) * L <= (xp || 0)) L++; return L; };
  const xpFor = (L) => 50 * L * (L - 1);
  // The level at which a hero's move opens: the basic move and the first skill
  // from the start, the second skill at 2, the great move at 4, a duo move at 6.
  function unlockLevel(def, i) {
    const s = def.skills[i];
    if (s.duo) return 6;
    const great = def.skills.filter((x) => !x.duo).length - 1;
    return i === great ? 4 : i <= 1 ? 1 : 2;
  }

  return { create, label, run, levelOf, xpFor, unlockLevel };
})();

// ---- The stage --------------------------------------------------------------------------

const BattleView = (() => {
  const FONT = "'Pixelify Sans', 'Courier New', monospace";

  function create(canvas, battle, opts) {
    const o = opts || {};
    const byKey = () => Object.fromEntries(battle.units.map((u) => [u.key, u]));
    let floaters = [];
    let active = null;
    let targetable = new Set();
    let now = 0;
    let done = null;

    const theater = Theater.create(canvas, {
      state(a) {
        const u = byKey()[a.key];
        if (!u) return { hidden: true };
        if (u.state === "converted") {
          const k = now - u.outAt;
          if (k > 1.6) return { hidden: true };
          return { alpha: Math.floor(k * 12) % 2 ? 0.15 : 1 };
        }
        if (u.state === "walked") {
          const k = now - u.outAt;
          if (k > 1.2) return { hidden: true };
          return { alpha: 1 - k / 1.2, dx: a.side === "foe" ? k * 60 : -k * 60, flip: a.side !== "foe" };
        }
        if (u.state === "discouraged") return { alpha: 0.4 };
        return null;
      },
      hud(ctx, actors, t, cinematic) {
        if (cinematic) return;
        const units = byKey();
        for (const a of actors) {
          const u = units[a.key];
          if (!u) continue;
          if (u.state === "converted" && now - u.outAt > 1.4) { sign(ctx, a.x, a.y, Math.min(1, (now - u.outAt - 1.4) * 2)); continue; }
          if (a.hidden) continue;
          const x = a.x - 30;
          const y = a.y + 6;
          // Composure.
          ctx.fillStyle = "#1a1326"; ctx.fillRect(x - 1, y - 1, 62, 7);
          ctx.fillStyle = "#2a2f55"; ctx.fillRect(x, y, 60, 5);
          ctx.fillStyle = u.hp / u.maxHp > 0.3 ? "#74c07a" : "#de8a4a"; ctx.fillRect(x, y, Math.round(60 * u.hp / u.maxHp), 5);
          if (u.shield) { ctx.fillStyle = "#7ea4e6"; ctx.fillRect(x, y - 3, Math.min(60, Math.round(60 * u.shield.amt / u.maxHp)), 2); }
          // Conviction.
          const w = Math.min(12, Math.floor(60 / u.maxConv) - 2);
          for (let i = 0; i < u.maxConv; i++) { ctx.fillStyle = i < u.conv ? "#7ea4e6" : "#3a2a3e"; ctx.fillRect(x + i * (w + 2), y + 8, w, 4); }
          // Statuses, as small letters.
          const tags = [];
          if (u.statuses.dumbfounded > 0) tags.push(["Z", "#ffd84a"]);
          if (u.statuses.doubting > 0) tags.push(u.side === "hero" ? ["!", "#e89a4a"] : ["?", "#c69ae8"]);
          if (u.statuses.muted > 0) tags.push(["M", "#de5e55"]);
          if (u.statuses.examined > 0) tags.push(["X", "#e8b94a"]);
          if (u.called) tags.push(["!", "#de5e55"]);
          if (u.citation) tags.push(["C", "#7ea4e6"]);
          if (u.counter > 0) tags.push(["R", "#e8b94a"]);
          if (Object.values(u.immune).some((v) => v > 0)) tags.push(["◆", "#7ea4e6"]);
          if (u.buffs.some((b) => b.amt > 0)) tags.push(["▲", "#74c07a"]);
          if (u.buffs.some((b) => b.amt < 0)) tags.push(["▼", "#de5e55"]);
          ctx.font = "700 10px " + FONT; ctx.textAlign = "left";
          tags.forEach(([g, c], i) => { ctx.fillStyle = "#1a1326"; ctx.fillRect(x + i * 11 - 1, y + 14, 11, 11); ctx.fillStyle = c; ctx.fillText(g, x + i * 11 + 1, y + 23); });
          // Whose turn it is, and who can be chosen.
          const top = a.y - 108;
          if (active === a.key) { const b = Math.sin(t * 6) * 3; ctx.fillStyle = "#e8b94a"; ctx.beginPath(); ctx.moveTo(a.x - 7, top - 10 + b); ctx.lineTo(a.x + 7, top - 10 + b); ctx.lineTo(a.x, top - 2 + b); ctx.fill(); }
          if (targetable.has(a.key)) { ctx.strokeStyle = `rgba(232,185,74,${0.5 + Math.sin(t * 8) * 0.4})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(a.x, a.y, 38, 9, 0, 0, Math.PI * 2); ctx.stroke(); }
        }
        // Numbers and words that float up from the fighters.
        floaters = floaters.filter((f) => now - f.t0 < 2.2);
        for (const f of floaters) {
          const a = actors.find((x) => x.key === f.key);
          if (!a) continue;
          const k = (now - f.t0) / 2.2;
          ctx.globalAlpha = Math.min(1, (1 - k) * 3);
          ctx.font = "700 17px " + FONT; ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.strokeStyle = "#1a1326";
          const y = a.y - 112 - k * 20 - f.row * 18;
          ctx.strokeText(f.text, a.x, y); ctx.fillStyle = f.color; ctx.fillText(f.text, a.x, y);
          ctx.globalAlpha = 1;
        }
      },
    });
    theater.setTeam(battle.heroes().map((u) => u.id));
    theater.setFoes(battle.foes().map((u) => u.id));
    theater.onDone(() => { if (done) { const d = done; done = null; d(); } });

    function sign(ctx, x, y, a) {
      ctx.globalAlpha = a;
      ctx.fillStyle = "#8a5a2b"; ctx.fillRect(x - 3, y - 40, 6, 40);
      ctx.fillStyle = "#1a1326"; ctx.fillRect(x - 38, y - 78, 76, 42);
      ctx.fillStyle = "#f7f1de"; ctx.fillRect(x - 36, y - 76, 72, 38);
      ctx.font = "700 18px " + FONT; ctx.textAlign = "center"; ctx.fillStyle = "#b3261e"; ctx.fillText("OCIA", x, y - 54);
      ctx.font = "600 9px " + FONT; ctx.fillStyle = "#1a1326"; ctx.fillText("TUES · 7 PM", x, y - 43);
      ctx.globalAlpha = 1;
    }

    // Play a move's animation; resolves when it ends.
    function perform(u, i, targets) {
      let move;
      if (u.side === "hero") move = Theater.MOVES[u.id][i];
      else {
        const s = u.def.skills[i];
        const a = s.anim;
        move = { name: s.name, ...a, kind: Theater.kinds[a.kind] };
        // A volley shows at most one mark; the others take a list (possibly empty).
        move.mark = a.kind === "volley" ? (a.mark ? [].concat(a.mark)[0] : undefined) : [].concat(a.mark || []);
      }
      theater.act(u.key, move, now, targets.map((t) => t.key));
      return new Promise((res) => { done = res; });
    }

    function show(events) {
      const rows = {};
      for (const e of events) {
        rows[e.key] = (rows[e.key] || 0);
        floaters.push({ key: e.key, text: e.text, color: e.color, t0: now + rows[e.key] * 0.12, row: rows[e.key] });
        rows[e.key]++;
        if (e.out) { const u = byKey()[e.key]; if (u) u.outAt = now; }
        if (e.summon) theater.setFoes([0, 1, 2].map((s) => { const x = battle.units.find((v) => v.side === "foe" && v.slot === s); return x ? x.id : "skeptic"; }));
      }
    }

    let sleepers = [];
    return {
      frame(t) {
        now = t;
        theater.frame(t);
        const due = sleepers.filter((s) => s.at <= now);
        sleepers = sleepers.filter((s) => s.at > now);
        due.forEach((s) => s.res());
      },
      sleep(sec) { return new Promise((res) => sleepers.push({ at: now + sec, res })); },
      perform, show,
      setActive(key) { active = key; },
      setTargets(keys) { targetable = new Set(keys); },
      // Which fighter is under a point on the canvas (in canvas pixels)?
      pick(x, y) {
        for (const u of battle.units) {
          if (u.state === "converted" || u.state === "walked") continue;
          const slot = u.side === "hero" ? Theater.HERO_SLOTS[u.slot] : Theater.FOE_SLOTS[u.slot];
          if (Math.abs(x - slot[0]) < 36 && y < slot[1] + 12 && y > slot[1] - 110) return u;
        }
        return null;
      },
    };
  }

  return { create };
})();
