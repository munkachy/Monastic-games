// New Apologetics — the battle: rules (Battle) and the stage (BattleView).
//
// Battle knows nothing about drawing. Each fighter takes turns in order of
// Speed. Every fighter has two things to lose:
// Composure (health) and Zeal. Zeal starts at 0 and runs from +3 down to
// a floor. Anyone at 0 or above may back up a teammate: when a friend argues,
// they can jump in with their basic move, more often the higher their Zeal.
// Out of Composure, an opponent concedes; at the Zeal floor, he leaves the
// debate. Either way he is out. A few opponents (a secret the player finds by
// playing) convert instead when their Zeal bottoms out. A hero out of
// Composure or Zeal is Discouraged until a friend encourages him.

const Battle = (() => {
  const ZEAL_MAX = 3;
  const HERO_FLOOR = -4;     // how far Zeal can fall before a fighter is out
  const GRUNT_FLOOR = -5;
  const BOSS_FLOOR = -6;
  // Chance that each friend backs up a move, by his Zeal 0..3. Every friend
  // rolls for himself, so a fired-up team often piles in two or three strong.
  let BACKUP = [0.25, 0.4, 0.55, 0.7];
  // The Zeal from which opponents pile on (their chance counts from here).
  // The same as the heroes' (0) gives the fairest fight; tuned in BALANCE.md.
  let FOE_BACKUP_FROM = 0;
  // A hero's great move (and a duo move) hits, heals and shields this much
  // harder: reaching it should feel like a real upgrade (tuned in BALANCE.md).
  let GREAT_KICK = 1.5;
  // Each point of Zeal below zero takes this much off a debater's arguments
  let ZEAL_SAP = 0.1;
  // Extra strength of the heroes' own shields and podiums (and the Catechism's):
  // sized so a good shield soaks up most of one heavy opponent's hit
  let HERO_SHIELD = 3;
  // A debater behind a Shield of Faith argues more boldly: this much more Attack
  let SHIELD_BOLD = 0.15;
  // A boss's closing argument: his first wind-up comes on his second turn,
  // and each one after that three turns after the last
  const CLOSER_FIRST = 2, CLOSER_EVERY = 3;
  let CLOSERS_ON = true;       // off only for testing
  // Knock this share of a boss's Composure off while he winds up and he loses his thread
  let RATTLE = 0.2;
  let HERO_HEAL = 1;          // extra strength of the heroes' own healing
  // An evangelist brought back from Discouraged returns with at least this much Composure
  let REVIVE = 0.75;
  let SHAKEN = 1;             // Zeal each friend loses when a hero is Discouraged
  // Impact: every debater's Composure, and every shield and podium, is divided
  // by this, so each hit, heal and shield counts for more and debates end
  // sooner, the same for both sides (tuned in BALANCE.md).
  let IMPACT = 2;
  const CARE_K = 4.5;        // shield or podium strength per point of the caster's Care
  const careK = () => CARE_K / IMPACT;
  const HP_SCALE = { hero: 2.1, grunt: 5.6, boss: 6 };
  let FOE_PUNCH = 2.65;     // opponents argue harder than their listed stats

  const DEBUFFS = ["dumbfounded", "doubting", "muted", "examined", "called"];
  const floorOf = (def, hero) => (hero ? HERO_FLOOR : def.boss ? BOSS_FLOOR : def.secretConvert ? -4 : GRUNT_FLOOR);

  // A hero's level raises Composure and the strength of his arguments; each
  // chapter's opponents grow tougher to match.
  const HERO_GROWTH = 0.07;
  const GRUNT_CONVERT = 0.5;    // chance a rank-and-file opponent converts as he goes out
  let FOE_GROWTH = 0.12;
  let FOE_ZEAL_GROWTH = 0;      // extra Zeal depth per chapter (tuned below)

  // Difficulty, from Gentle to Crucible. Opponents get tougher (Composure)
  // and hit harder, think more sharply (how often they pick their best move
  // and best target), bring podiums more often, and pay more experience.
  // Three steps, one star each: Gentle, Normal (the game as designed), and
  // Crucible, tested like gold in the fire (1 Peter 1:7).
  // hp, atk: multiply the opponents' Composure and Attack; zeal: extra Zeal
  // depth; resolve: extra chance to shrug off a Zeal loss; sharp: how often
  // they pick their best move and target; cover: chance of each starting
  // behind a podium; reserve: reinforcements waiting to step in; xp: reward.
  const DIFFICULTY = [
    { name: "Gentle", hp: 0.5, atk: 0.45, zeal: -2, closer: 0.5, resolve: 0, sharp: 0.3, cover: 0, reserve: 0, xp: 0.75, blurb: "For the story, or to jump ahead to a chapter above your level. Opponents are much softer, and you earn a little less experience." },
    { name: "Normal", hp: 1, atk: 1, zeal: 0, resolve: 0, sharp: 0.6, cover: 0.35, reserve: 0, xp: 1, blurb: "The game as designed: you'll win most debates, but not without thinking." },
    { name: "Crucible", hp: 1.15, atk: 1.06, zeal: 1, resolve: 0.04, sharp: 0.8, cover: 0.5, reserve: 1, xp: 1.25, blurb: "Tested like gold in the fire (1 Peter 1:7). Tougher, sharper opponents, more podiums, and a fresh opponent waiting to step in. Win every debate here to open the epilogue." },
  ];

  function makeUnit(id, side, slot, def, level, diff) {
    const hero = side === "hero";
    // A boss's closing argument rides along as two extra moves: the wind-up and the blow.
    if (!hero && def.closer) def = { ...def, skills: def.skills.concat(def.closer) };
    const kind = hero ? "hero" : def.boss ? "boss" : "grunt";
    const d = hero ? { hp: 1, atk: 1, zeal: 0, resolve: 0 } : diff || DIFFICULTY[1];
    const grow = hero ? 1 + HERO_GROWTH * Math.max(0, (level || 1) - 1) : 1 + FOE_GROWTH * (level || 0);
    const punch = (hero ? grow : FOE_PUNCH * grow * (def.boss ? 1.3 : 1)) * d.atk;
    const maxHp = Math.round(def.stats[0] * HP_SCALE[kind] * grow * d.hp / IMPACT);
    const t = def.traits || { care: 60, glance: [0.05, 0.15], crit: [0.05, 1.3], resolve: 0.06 };
    return {
      id, side, key: (hero ? "h" : "f") + slot, slot, def, kind,
      name: def.name, faction: def.faction || "catholic",
      maxHp, hp: maxHp,
      base: { atk: def.stats[1] * punch, def: def.stats[2], spd: def.stats[3] },
      bonus: { atk: 0, def: 0 },
      // Care makes this fighter's shields and podiums stronger; glance is the
      // chance to deflect part of a hit; resolve, to shrug off a loss of Zeal.
      care: t.care * grow, glance: t.glance[0], glanceCut: t.glance[1], crit: t.crit[0], critDmg: t.crit[1], resolve: t.resolve + (d.resolve || 0),
      cover: null, tie: 0,
      // Later chapters' opponents, and harder difficulties, hold out longer on Zeal.
      zeal: 0, floor: floorOf(def, hero) - (hero ? 0 : (d.zeal || 0) + Math.floor(Math.max(0, level || 0) * FOE_ZEAL_GROWTH)), downs: 0,
      cd: def.skills.map((s) => s.start || 0),
      statuses: {}, called: null, buffs: [], shield: null, counter: 0, immune: {},
      state: "in", since: 0,
      closerIn: !hero && def.closer ? CLOSER_FIRST : 0, windup: false,
    };
  }

  // A hero's book, applied at the start of a debate.
  function readBook(u, fx) {
    u.book = fx;
    if (fx.hp) { u.maxHp = Math.round(u.maxHp * (1 + fx.hp)); u.hp = u.maxHp; }
    if (fx.def) u.bonus.def += fx.def;
    if (fx.atk) u.bonus.atk += fx.atk;
    if (fx.crit) u.crit += fx.crit;
    if (fx.resist) u.resist = fx.resist;
    if (fx.regen) u.regen = { pct: fx.regen[0], n: fx.regen[1] };
    if (fx.shield) u.shield = { amt: Math.round(u.care * fx.shield * careK() * HERO_SHIELD), n: 4 };
    if (fx.opening) u.buffs.push({ stat: "atk", amt: fx.opening, n: 2 });
    if (u.shield && u.shield.amt <= 0) u.shield = null;
  }

  function create(opts) {
    const H = GameData.HEROES;
    const F = GameData.FOES;
    const rnd = opts.random || Math.random;
    const levels = opts.levels || {};
    // The difficulty, combined with this chapter's power (how far the
    // opponents have come since Chapter 1): Composure, Attack, Zeal depth.
    const base = DIFFICULTY[opts.difficulty === undefined ? 1 : opts.difficulty] || DIFFICULTY[1];
    // A chapter's power k scales Composure by k, Attack by √k, and adds Zeal
    // depth: tuned so Normal wins about nine regular debates in ten and three
    // boss debates in four (see BALANCE.md).
    const k = typeof opts.power === "number" ? opts.power : 1;
    const pw = { hp: k, atk: Math.sqrt(k), zeal: Math.max(0, Math.round((k - 1) * 2)) };
    // ease (0 to 1) softens the difficulty's extra toughness, for early chapters.
    const e = opts.ease || 0, soft = (v, n) => n + (v - n) * (1 - e);
    const diff = { ...base, hp: soft(base.hp, 1) * (pw.hp || 1), atk: soft(base.atk, 1) * (pw.atk || 1), zeal: Math.round(soft(base.zeal || 0, 0)) + (pw.zeal || 0), resolve: soft(base.resolve || 0, 0) };
    // Moves unlock as a hero levels up. Without levels (the design page) or in
    // testing mode, every move is open.
    const gated = !!opts.levels && !opts.unlockAll;
    const units = opts.team.map((id, i) => {
      const level = levels[id] || 1;
      const u = makeUnit(id, "hero", i, H[id], level);
      u.level = level;
      u.locked = H[id].skills.map((s, k) => gated && unlockLevel(H[id], k) > Math.max(level, opts.movesAt || 0));
      const book = opts.books && GameData.BOOKS[opts.books[id]];
      if (book) readBook(u, book.fx);
      return u;
    })
      .concat(opts.foes.map((id, i) => makeUnit(id, "foe", i, F[id], opts.level, diff)));
    let queue = [];
    let round = 0;
    units.forEach((u) => { u.tie = rnd(); });

    // Podiums: some fighters start the battle behind one. It takes the hits
    // meant for them until it falls.
    const avgHp = units.reduce((n, u) => n + u.maxHp, 0) / units.length;
    const cover = opts.cover || {};
    // Some debaters always bring their own (def.podium names its look).
    for (const u of units) if (u.def.podium || ((u.side === "hero" ? cover.hero : cover.foe) || []).includes(u.slot)) {
      const hp = Math.round(avgHp * (cover.size || 0.4));
      u.cover = { hp, max: hp };
    }

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
        if (p.group && p.group.includes(f.id)) for (const k of ["atk", "def"]) if (p[k]) f.bonus[k] += p[k];
        // Scott Hahn's passive: fellow converts to the Church start fired up.
        if (p.converts && p.converts.includes(f.id)) f.zeal = Math.min(ZEAL_MAX, f.zeal + 1);
      }
    }

    function stat(u, s) {
      let m = 1 + (u.bonus[s] || 0);
      for (const b of u.buffs) if (b.stat === s) m += b.amt;
      if (s === "atk" && u.shield) m += SHIELD_BOLD;
      return u.base[s] * Math.max(0.2, m);
    }
    function critChance(u) {
      let c = u.crit;
      for (const b of u.buffs) if (b.stat === "crit") c += b.amt;
      return c;
    }

    // ---- Turn order ---------------------------------------------------------------

    // Everyone acts once a round, fastest first. Speed never changes, so the
    // player can plan around it; the turn order is shown on screen.
    const bySpeed = (a, b) => stat(b, "spd") - stat(a, "spd") || b.tie - a.tie;
    function nextUnit() {
      for (;;) {
        if (!queue.length) {
          round++;
          queue = units.filter(inPlay).sort(bySpeed);
          if (!queue.length) return null;
        }
        const u = queue.shift();
        if (inPlay(u)) return u;
      }
    }
    // Who acts next: the rest of this round, then the next one.
    function upcoming(n) {
      const now = queue.filter(inPlay);
      const next = units.filter(inPlay).sort(bySpeed);
      return now.concat(next, next).slice(0, n);
    }

    // At the start of a turn: Doubting wears on Composure, everything counts down.
    function startTurn(u) {
      const events = [];
      if (u.regen && u.regen.n > 0 && inPlay(u)) {
        u.regen.n--;
        const a = Math.min(u.maxHp - u.hp, Math.round(u.maxHp * u.regen.pct));
        if (a > 0) { u.hp += a; events.push({ key: u.key, text: "+" + a, color: "#74c07a" }); }
      }
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
      if (u.def.closer && !u.windup) u.closerIn--;
      u.cd = u.cd.map((c) => Math.max(0, c - 1));
      if (skip) events.push({ key: u.key, text: "Dumbfounded: loses this turn", color: "#ffd84a" });
      return { skip: skip || !inPlay(u), events };
    }

    // ---- Choosing ---------------------------------------------------------------------

    function partnerHere(u, skill) {
      return !skill.duo || units.some((x) => x.side === u.side && x.id === skill.duo && inPlay(x));
    }
    // A stance can't be taken again while it still holds (Steelman Stance).
    const inStance = (u, s) => s.target === "self" && s.effects.some((e) => e.counter) && u.counter > 0;
    function usable(u) {
      return u.def.skills.map((s, i) => ({ s, i })).filter(({ s, i }) =>
        !s.closer && u.cd[i] === 0 && !(u.locked && u.locked[i]) && (i === 0 || !(u.statuses.muted > 0)) && partnerHere(u, s) && !inStance(u, s)).map(({ i }) => i);
    }
    // Who can be picked for a move that asks for one target.
    function choices(u, i) {
      const s = u.def.skills[i];
      if (s.target === "foe") {
        const opp = others(u).filter(inPlay);
        if (u.called) { const c = units.find((x) => x.key === u.called.by && inPlay(x)); if (c) return [c]; }
        return opp;
      }
      if (s.target === "ally") return friends(u).filter((x) => x.state === "in" || (x.state === "discouraged" && revives(s)));
      return [];
    }
    // Only a move that restores Composure can reach a Discouraged friend:
    // anything else (a shield, a boost, Zeal) would do him no good.
    const revives = (s) => s.effects.some((e) => e.heal);

    // A simple opponent: its best ready move, most of the time.
    function think(u) {
      // A boss winds up his closing argument, then lands it.
      if (CLOSERS_ON && u.def.closer && (u.windup || u.closerIn <= 0)) return { i: u.def.skills.findIndex((x) => x.closer === (u.windup ? "strike" : "wind")), target: null };
      if (u.side === "hero" && opts.randomHeroes) {
        // For testing only: any ready move, any target.
        const ready = usable(u);
        const i = ready[Math.floor(rnd() * ready.length)];
        const c = choices(u, i);
        return { i, target: c.length ? c[Math.floor(rnd() * c.length)] : null };
      }
      if (u.side === "hero" && !opts.simpleHeroes) return thinkHero(u);
      const ready = usable(u);
      // How sharp an opponent is depends on the difficulty (Normal: 0.6).
      const sharp = u.side === "foe" ? diff.sharp : 0.6;
      let i = 0;
      for (const j of ready.slice().sort((a, b) => b - a)) if (j > 0 && rnd() < 0.4 + 0.5 * sharp) { i = j; break; }
      // Anyone who can go Undercover does so whenever they're in the open.
      const hide = ready.find((j) => u.def.skills[j].effects.some((e) => e.status === "cloaked"));
      if (hide !== undefined && !(u.statuses.cloaked > 0)) i = hide;
      const s = u.def.skills[i];
      let target = null;
      const c = choices(u, i);
      if (s.target === "foe" && c.length) {
        const score = (x) => x.hp / x.maxHp + (x.zeal - x.floor) * 0.1 + (x.cover && !(s.pierce || []).includes("cover") ? 0.5 : 0) + (x.statuses.cloaked > 0 ? 1 : 0);
        target = c.slice().sort((a, b) => score(a) - score(b))[rnd() < sharp ? 0 : Math.floor(rnd() * c.length)];
      } else if (s.target === "ally" && c.length) {
        target = c.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      }
      return { i, target };
    }

    // Auto for the heroes: weigh each ready move by what the team needs now,
    // bring back the Discouraged, heal the hurt, shield, clear setbacks, and
    // otherwise press the attack on the opponent nearest to giving way.
    function thinkHero(u) {
      const ready = usable(u);
      const team = friends(u).filter((x) => x.state === "in" || x.state === "discouraged");
      const down = team.filter((x) => x.state === "discouraged");
      const hurt = team.filter((x) => x.state === "in" && x.hp / x.maxHp < 0.5);
      const opp = others(u).filter(inPlay);
      const setbacks = (x) => DEBUFFS.filter((k) => x.statuses[k] > 0).length + x.buffs.filter((b) => b.amt < 0).length;
      const nearZealFloor = (x) => x.zeal - x.floor;
      // A boss winding up his closing argument: shield the team, or stop him.
      const winding = opp.find((x) => x.windup);
      const stops = (e) => e.status === "dumbfounded" || e.status === "muted";
      let best = 0, bestScore = -1;
      for (const i of ready) {
        const sk = u.def.skills[i];
        const many = sk.target === "foes" || sk.target === "allies" || sk.target === "random4" ? Math.max(1, sk.target === "allies" ? team.length : opp.length) : sk.target === "two" ? 2 : 1;
        let sc = i === 0 ? 1 : 1.5;
        for (const e of sk.effects) {
          const p = e.chance === undefined ? 1 : e.chance;
          if (e.dmg) sc += e.dmg * (e.hits || 1) * (sk.target === "random4" ? 4 : many) * 0.9;
          if (e.heal) sc += (down.length * 5 + hurt.length * 2.5) * (sk.target === "allies" ? 1 : 0.8);
          if (e.shield) sc += team.filter((x) => x.state === "in" && !x.shield).length * (sk.target === "allies" ? 0.8 : 1) + (hurt.length ? 1.5 : 0);
          if (e.podium) sc += winding ? 3 : 1.5;
          if (winding && e.shield) sc += team.filter((x) => x.state === "in" && !x.shield).length * (sk.target === "allies" ? 2 : 0.8);
          if (winding && stops(e)) sc += 6 * p;
          if (winding && e.dmg && sk.target === "foe") sc += e.dmg * (e.hits || 1) * 0.8;
          if (winding && e.buff === "def" && e.amt > 0) sc += many * 0.8;
          if (e.cleanse) sc += team.reduce((n, x) => n + setbacks(x), 0) * 1.2;
          if (e.zeal < 0) sc += -e.zeal * p * many * (opp.some((x) => nearZealFloor(x) <= 2) ? 1.8 : 1.1);
          if (e.zeal > 0 || e.allyZeal || e.selfZeal) sc += 1;
          if (e.status === "dumbfounded") sc += 2.5 * p * many;
          if (e.status === "muted" || e.status === "examined" || e.status === "doubting") sc += 1.2 * p * many;
          if (e.status === "cloaked") sc += u.statuses.cloaked > 0 ? -5 : 4;
          if (e.buff) sc += (e.amt > 0 ? 0.8 : 0.9) * many * p;
          if (e.purge) sc += opp.some((x) => x.shield || x.buffs.some((b) => b.amt > 0)) ? 1.5 : 0.2;
          if (e.taunt || e.tauntAll) sc += hurt.length ? 2.5 : 1;
          if (e.counter || e.selfCounter) sc += 1.5;
          if (e.command) sc += 2.5;
        }
        sc *= 0.85 + rnd() * 0.3;
        if (sc > bestScore) { bestScore = sc; best = i; }
      }
      const sk = u.def.skills[best];
      const c = choices(u, best);
      let target = null;
      if (sk.target === "foe" && c.length) {
        const zealMove = sk.effects.some((e) => e.zeal < 0);
        const pierce = (sk.pierce || []).includes("cover") || sk.effects.some((e) => e.vs && e.vs[0] === "guarded");
        const score = (x) => (zealMove ? nearZealFloor(x) * 0.25 : x.hp / x.maxHp) + (x.cover && !pierce && !zealMove ? 0.6 : 0) + (x.statuses.cloaked > 0 ? 0.5 : 0);
        target = winding && c.includes(winding) && sk.effects.some((e) => stops(e) || e.dmg) ? winding : c.slice().sort((a, b) => score(a) - score(b))[0];
      } else if (sk.target === "ally" && c.length) {
        const heals = sk.effects.some((e) => e.heal || e.cleanse);
        const cmd = sk.effects.some((e) => e.command);
        const pool = c.filter((x) => x !== u || !cmd);
        target = (heals ? pool.slice().sort((a, b) => (a.state === "discouraged" ? -1 : a.hp / a.maxHp) - (b.state === "discouraged" ? -1 : b.hp / b.maxHp))
          : pool.filter((x) => x.state === "in").sort((a, b) => stat(b, "atk") - stat(a, "atk")))[0] || c[0];
      }
      return { i: best, target };
    }

    // ---- Doing --------------------------------------------------------------------------

    function targetsOf(u, s, chosen) {
      const opp = others(u).filter(inPlay);
      switch (s.target) {
        case "foe": return chosen ? [chosen] : opp.slice(0, 1);
        case "two": return opp.slice().sort(() => rnd() - 0.5).slice(0, 2);
        case "random4": return opp.length ? [0, 1, 2, 3].map(() => opp[Math.floor(rnd() * opp.length)]) : [];
        case "foes": return opp;
        case "ally": return chosen ? [chosen] : [u];
        case "allies": return friends(u).filter((x) => x.state === "in" || (x.state === "discouraged" && revives(s)));
        default: return [u];
      }
    }

    function aim(u, i, chosen) { return targetsOf(u, u.def.skills[i], chosen); }

    // How much of his strength a debater's arguments carry: less below Zeal 0.
    const sapped = (u) => (u.zeal < 0 ? Math.max(0.2, 1 + ZEAL_SAP * u.zeal) : 1);

    // How much harder this move lands: a hero's great move or duo move.
    function kick(u, s) {
      if (!s || u.side !== "hero") return 1;
      const own = u.def.skills.filter((x) => !x.duo);
      return s.duo || s === own[own.length - 1] ? GREAT_KICK : 1;
    }

    // Shields of Faith stack, as in Legends: a second one adds to the first and
    // lasts as long as the longer of the two. All together they can hold no
    // more than the debater's full Composure: a second bar, never a wall.
    function addShield(t, amount, turns, events) {
      const add = Math.round(amount);
      if (t.shield) {
        t.shield.amt = Math.min(t.maxHp, t.shield.amt + add);
        t.shield.n = Math.max(t.shield.n, turns);
        events.push({ key: t.key, text: "Shield grows", color: "#7ea4e6" });
      } else {
        t.shield = { amt: Math.min(t.maxHp, add), n: turns, fresh: true };
        events.push({ key: t.key, text: "Shield of Faith", color: "#7ea4e6" });
      }
    }

    // `answering` marks a Rebuttal: it can't set off another one.
    function use(u, i, chosen, fixed, answering) {
      const s = u.def.skills[i];
      const targets = fixed || targetsOf(u, s, chosen);
      const events = [];
      const done = new Set();          // effects that happen once per move
      let broke = false;
      let commanded = null;
      const rebuttals = [];            // who was hurt and will answer back
      u.cd[i] = s.cd;
      if (s.closer === "strike") { u.windup = false; u.closerIn = CLOSER_EVERY; }
      for (const t of targets) {
        for (const e of s.effects) {
          if (e.chance !== undefined && rnd() > e.chance) continue;
          if (e.faction && t.faction !== e.faction) continue;
          if (e.onlyFor && !e.onlyFor.includes(t.id)) continue;
          if (t.state === "converted" || t.state === "walked" || t.state === "left") break;
          // A Discouraged friend is reached only by the Composure that brings
          // him back; once he is back, the rest of the move applies to him.
          if (t.state === "discouraged" && !e.heal) continue;
          if (e.share && inPlay(t)) blow(t, e.share, events);
          if (e.dmg) {
            let hurt = false;
            for (let h = 0; h < (e.hits || 1); h++) hurt = hit(u, t, e, s, events, false) || hurt;
            if (e.splash) for (const o of others(u).filter((x) => inPlay(x) && x !== t)) hit(u, o, { ...e, dmg: e.dmg * 0.4 }, s, events, true);
            // Rebuttal: anyone ready to answer back, and actually hurt by an
            // opponent's move (a podium's hit doesn't count), answers once.
            if (hurt && !answering && t.side !== u.side && t.counter > 0 && !(t.statuses.dumbfounded > 0) && !rebuttals.includes(t)) rebuttals.push(t);
          }
          // (and costs no Zeal)
          if (e.zeal && !(s.closer && (diff.closer || 1) < 1)) { if (zeal(t, e.zeal, s, events)) broke = true; }
          if (e.status && t.resist && t.resist[e.status] && rnd() < t.resist[e.status]) events.push({ key: t.key, text: "Resisted", color: "#a9a6bd" });
          else if (e.status) {
            t.statuses[e.status] = Math.max(t.statuses[e.status] || 0, e.turns);
            events.push({ key: t.key, text: label(e.status, t), color: "#ffd84a" });
            // Dumbfounded or Muted mid wind-up: the closing argument never comes.
            if (t.windup && (e.status === "dumbfounded" || e.status === "muted")) { t.windup = false; t.closerIn = CLOSER_EVERY; events.push({ key: t.key, text: "Closing argument stopped!", color: "#74c07a" }); }
          }
          if (e.windup) { u.windup = true; u.windHp = u.hp; events.push({ key: u.key, text: "Winding up!", color: "#ff5a4e" }); }
          if (e.taunt) { t.called = { by: u.key, n: e.taunt }; events.push({ key: t.key, text: "Called Out", color: "#de5e55" }); }
          if (e.tauntAll && !done.has("tauntAll")) { done.add("tauntAll"); for (const o of others(u).filter(inPlay)) { o.called = { by: u.key, n: e.tauntAll }; events.push({ key: o.key, text: "Called Out", color: "#de5e55" }); } }
          if (e.buff) { t.buffs.push({ stat: e.buff, amt: e.amt, n: e.turns + 1 }); events.push({ key: t.key, text: (e.amt > 0 ? "▲ " : "▼ ") + statName(e.buff), color: e.amt > 0 ? "#74c07a" : "#de5e55" }); }
          if (e.heal) heal(t, e.heal * kick(u, s) * (u.side === "hero" ? HERO_HEAL : 1), events);
          if (e.cleanse) { for (const k of DEBUFFS) t.statuses[k] = 0; t.called = null; t.buffs = t.buffs.filter((b) => b.amt > 0); events.push({ key: t.key, text: "Examen", color: "#74c07a" }); }
          if (e.purge) purge(t, e.purge, events);
          if (e.shield) addShield(t, u.care * e.shield * careK() * kick(u, s) * (u.side === "hero" ? HERO_SHIELD : 1), e.turns + 1, events);
          if (e.podium) { const hp = Math.round(u.care * e.podium * careK() * kick(u, s) * (u.side === "hero" ? HERO_SHIELD : 1)); t.cover = { hp, max: hp }; events.push({ key: t.key, text: "Podium up", color: "#7ea4e6" }); }
          if (e.command && t !== u && inPlay(t)) commanded = t;
          if (e.counter) { t.counter = e.counter + 1; events.push({ key: t.key, text: "Rebuttal ready", color: "#e8b94a" }); }
          if (e.selfCounter && !done.has("selfCounter")) { done.add("selfCounter"); u.counter = e.selfCounter + 1; }
          if (e.immune) { t.immune[e.immune] = e.turns + 1; events.push({ key: t.key, text: immuneName(e.immune), color: "#7ea4e6" }); }
          if (e.selfZeal && !done.has("selfZeal")) { done.add("selfZeal"); zeal(u, e.selfZeal, s, events); }
          if (e.allyZeal && !done.has("allyZeal")) { done.add("allyZeal"); for (const f of friends(u).filter(inPlay)) zeal(f, e.allyZeal, s, events); }
          if (e.friendsCleanse && !done.has("fc")) { done.add("fc"); for (const f of friends(u)) f.statuses[e.friendsCleanse] = 0; }
          if (e.randomLift) {
            const lifts = [{ buff: "atk", amt: 0.5, turns: 3 }, { buff: "crit", amt: 0.5, turns: 3 }, { shield: 0.2, turns: 3 }, { heal: 0.2 }];
            const l = lifts[Math.floor(rnd() * lifts.length)];
            if (l.buff) { t.buffs.push({ stat: l.buff, amt: l.amt, n: l.turns + 1 }); events.push({ key: t.key, text: "▲ " + statName(l.buff), color: "#74c07a" }); }
            // Free-for-All Friday's shield is sized from the one receiving it,
            // not from Trent's Care (he has almost none): a fifth of his Composure.
            if (l.shield) addShield(t, t.maxHp * l.shield * HERO_SHIELD, l.turns + 1, events);
            if (l.heal) heal(t, l.heal, events);
          }
          if (e.summon && !done.has("summon")) {
            done.add("summon");
            const free = [0, 1, 2].find((sl) => !units.some((x) => x.side === "foe" && x.slot === sl && inPlay(x)));
            if (free !== undefined) {
              const old = units.findIndex((x) => x.side === "foe" && x.slot === free);
              const nu = makeUnit(e.summon, "foe", free, F[e.summon], opts.level, diff);
              if (old >= 0) { gone.push(units[old]); units.splice(old, 1, nu); } else units.push(nu);
              events.push({ key: nu.key, text: "Joins in", color: "#de5e55", summon: true });
            }
          }
        }
      }
      for (const t of targets) if (!inPlay(t) && t.side !== u.side) broke = true;
      // Zeal for putting someone out; already at full Zeal, some Composure back instead.
      for (const e of s.effects) if (e.onBreak && broke && inPlay(u)) {
        if (u.zeal >= ZEAL_MAX) { events.push({ key: u.key, text: "Zeal full", color: "#7ea4e6" }); heal(u, 0.15, events); }
        else zeal(u, e.onBreak, s, events);
      }
      for (const e of s.effects) if (e.onBreakCloak && broke && inPlay(u)) { u.statuses.cloaked = e.onBreakCloak; events.push({ key: u.key, text: "Undercover", color: "#9fd0ff" }); }
      return { skill: s, targets, events, commanded, rebuttals: rebuttals.filter((t) => inPlay(t) && inPlay(u)) };
    }

    // A commanded ally answers at once: basic move on the opponent most
    // worth hitting (in the open, and nearest to giving way).
    function commandTarget(ally) {
      const pierce = ally.def.skills[0].pierce || [];
      const opp = others(ally).filter(inPlay);
      if (!opp.length) return null;
      return opp.slice().sort((a, b) => ((a.cover && !pierce.includes("cover")) - (b.cover && !pierce.includes("cover"))) || a.hp / a.maxHp - b.hp / b.maxHp)[0];
    }

    // After an argument against the other side, one friend with Zeal 0 or
    // more may jump in with a basic move on the same opponent.
    function backup(u, i, targets) {
      const s = u.def.skills[i];
      const offensive = s.effects.some((e) => e.dmg || e.zeal < 0 || e.status);
      const target = targets.find((t) => t.side !== u.side && inPlay(t));
      if (!offensive || !target || !inPlay(u)) return null;
      // Every friend with Zeal 0 or higher rolls for himself, so a fired-up
      // team can pile in two or three strong.
      const from = u.side === "foe" ? FOE_BACKUP_FROM : 0;
      const helpers = friends(u).filter((f) => f !== u && inPlay(f) && f.zeal >= from && !(f.statuses.dumbfounded > 0)).sort(() => rnd() - 0.5);
      const joined = helpers.filter((f) => rnd() < BACKUP[Math.min(ZEAL_MAX, f.zeal - from)]).map((f) => ({ ally: f, target }));
      return joined.length ? joined : null;
    }

    // Returns true if the fighter himself took the hit.
    function hit(u, t, e, s, events, quiet) {
      if (!inPlay(t)) return false;
      let d = stat(u, "atk") * e.dmg * (0.92 + rnd() * 0.16) * kick(u, s) * sapped(u);
      if (e.vs) {
        const [what, mult] = e.vs;
        if (what === "guarded" ? t.shield || t.cover : t.statuses[what] > 0) d *= mult;
      }
      const crit = rnd() < critChance(u);
      if (crit) d *= u.critDmg;
      // A podium in front takes the hit, unless the move goes around it.
      if (t.cover && !((s && s.pierce) || []).includes("cover")) {
        const c = Math.round(d);
        t.cover.hp -= c;
        events.push({ key: t.key, text: (crit ? "Crit! " : "") + "−" + c + " podium", color: "#c9b48a" });
        if (t.cover.hp <= 0) { t.cover = null; events.push({ key: t.key, text: "Podium falls!", color: "#e8b94a" }); }
        return false;
      }
      if (t.statuses.examined > 0) d *= 1.3;
      if (t.immune.testimony > 0) d *= 0.5;
      d *= 1 - Math.min(60, stat(t, "def")) / 100;
      // Exposed fighters can't deflect anything.
      // Undercover: every hit on her is deflected, unless she has been Exposed.
      const glance = !(t.statuses.examined > 0) && (t.statuses.cloaked > 0 || rnd() < t.glance);
      if (glance) d *= t.statuses.cloaked > 0 && !(t.statuses.examined > 0) ? 0.25 : 1 - t.glanceCut;
      d = Math.round(d);
      if (t.shield) { const a = Math.min(t.shield.amt, d); t.shield.amt -= a; d -= a; if (t.shield.amt <= 0) t.shield = null; }
      t.hp = Math.max(0, t.hp - d);
      events.push({ key: t.key, text: (crit ? "Crit! " : glance ? "Deflected " : "") + "−" + d, color: crit ? "#ffd84a" : glance ? "#9fd0ff" : "#ece4d0" });
      if (crit) zeal(t, -1, s, events);
      // Hit hard enough while winding up, a boss loses his thread.
      if (t.windup && t.windHp - t.hp >= t.maxHp * RATTLE && t.hp > 0) { t.windup = false; t.closerIn = CLOSER_EVERY; events.push({ key: t.key, text: "Lost his thread!", color: "#74c07a" }); }
      checkOut(t, events);
      return true;
    }

    // A boss's closing argument: a set share of each hero's Composure (half
    // on Gentle). A podium or a Shield of Faith soaks it up first; defense
    // and deflecting don't come into it.
    function blow(t, share, events) {
      let d = Math.round(t.maxHp * share * (diff.closer || 1));
      if (t.cover) {
        const c = Math.min(t.cover.hp, d); t.cover.hp -= c; d -= c;
        events.push({ key: t.key, text: "−" + c + " podium", color: "#c9b48a" });
        if (t.cover.hp <= 0) { t.cover = null; events.push({ key: t.key, text: "Podium falls!", color: "#e8b94a" }); }
      }
      if (t.shield && d > 0) {
        const a = Math.min(t.shield.amt, d); t.shield.amt -= a; d -= a;
        events.push({ key: t.key, text: "Shield soaks " + a, color: "#7ea4e6" });
        if (t.shield.amt <= 0) t.shield = null;
      }
      if (d > 0) { t.hp = Math.max(0, t.hp - d); events.push({ key: t.key, text: "−" + d, color: "#ece4d0" }); }
      checkOut(t, events);
    }

    // Returns true if the change puts the fighter out.
    function zeal(t, n, s, events) {
      if (!inPlay(t)) return false;
      const pierce = (s && s.pierce) || [];
      if (n < 0) {
        const held = t.immune.steadfast > 0 || (t.immune.security > 0 && !pierce.includes("security")) || (t.immune.faith > 0 && !pierce.includes("faith"));
        if (held) { events.push({ key: t.key, text: "Holds firm", color: "#a9a6bd" }); return false; }
        if (rnd() < t.resolve) { events.push({ key: t.key, text: "Resilient!", color: "#a9a6bd" }); return false; }
      }
      const before = t.zeal;
      t.zeal = Math.max(t.floor, Math.min(ZEAL_MAX, t.zeal + n));
      const d = t.zeal - before;
      if (d) events.push({ key: t.key, text: (d > 0 ? "▲".repeat(d) : "▼".repeat(-d)) + " Zeal", color: d > 0 ? "#7ea4e6" : "#de5e55" });
      if (t.zeal > t.floor) return false;
      if (t.side === "foe" && (t.def.secretConvert || mayConvert(t))) convert(t, events);
      else if (t.side === "foe") {
        t.state = "left"; t.since = 0;
        events.push({ key: t.key, text: "Leaves the debate", color: "#a9a6bd", out: "left" });
      } else discourage(t, events);
      return true;
    }

    // A hero goes down, and it shakes the team: each friend still standing
    // loses 1 Zeal (Resilience and Steadfast can hold it). It doesn't chain:
    // a friend it discourages shakes no one further.
    let shaking = false;
    function discourage(t, events) {
      t.state = "discouraged"; t.downs++;
      events.push({ key: t.key, text: "Discouraged", color: "#a9a6bd" });
      if (shaking || !SHAKEN) return;
      shaking = true;
      for (const f of friends(t).filter(inPlay)) { events.push({ key: f.key, text: "Shaken", color: "#de5e55" }); zeal(f, -SHAKEN, null, events); }
      shaking = false;
    }

    function heal(t, frac, events) {
      let a = Math.round(t.maxHp * frac);
      if (t.state === "discouraged") {
        t.state = "in"; t.zeal = Math.max(t.zeal, 0); t.hp = Math.max(t.hp, 1);
        events.push({ key: t.key, text: "Encouraged!", color: "#74c07a", back: true });
        // A friend brought back returns with at least three quarters of his Composure.
        a = Math.max(a, Math.round(t.maxHp * REVIVE) - t.hp);
      }
      if (t.state !== "in") return;
      t.hp = Math.min(t.maxHp, t.hp + a);
      events.push({ key: t.key, text: "+" + a, color: "#74c07a" });
    }

    function purge(t, n, events) {
      const good = t.buffs.filter((b) => b.amt > 0);
      const drop = n === "all" ? good.length : n;
      let removed = 0;
      for (const b of good.slice(0, drop)) { t.buffs.splice(t.buffs.indexOf(b), 1); removed++; }
      if (n === "all") { if (t.shield) removed++; if (t.statuses.cloaked > 0) removed++; t.shield = null; t.statuses.cloaked = 0; for (const k of Object.keys(t.immune)) { if (t.immune[k]) removed++; t.immune[k] = 0; } }
      else if (removed < drop && t.shield) { t.shield = null; removed++; }
      if (removed) events.push({ key: t.key, text: "Fact-Checked", color: "#de5e55" });
    }

    // The rank and file: when one goes out of the debate, whether he concedes
    // or leaves, there is an even chance he converts instead. The argument
    // only clears the ground; the rest is the Holy Spirit's work, so the game
    // leaves it to chance, not to the player. Bosses never convert; Joe
    // Schmid always does, however he goes out.
    function mayConvert(t) { return t.def.grunt && rnd() < GRUNT_CONVERT; }
    function convert(t, events) {
      t.state = "converted"; t.since = 0;
      events.push({ key: t.key, text: "Converted!", color: "#e8b94a", out: "converted" });
    }

    function checkOut(t, events) {
      if (t.hp > 0 || !inPlay(t)) return;
      if (t.side === "foe" && (t.def.secretConvert || mayConvert(t))) convert(t, events);
      else if (t.side === "foe") { t.state = "walked"; t.since = 0; events.push({ key: t.key, text: "Concedes", color: "#a9a6bd", out: "walked" }); }
      else discourage(t, events);
    }

    // Reinforcements: when an opponent goes out, the next one waiting steps
    // into the empty place. Harder difficulties keep
    // more in reserve.
    const reserve = (opts.reserve || []).slice();
    function reinforce() {
      const events = [];
      for (const sl of [0, 1, 2]) {
        if (!reserve.length) break;
        const here = units.find((x) => x.side === "foe" && x.slot === sl);
        if (here && here.state === "in") continue;
        if (!here && !units.some((x) => x.side === "foe" && x.slot === sl) && sl >= opts.foes.length) continue;
        const id = reserve.shift();
        const nu = makeUnit(id, "foe", sl, F[id], opts.level, diff);
        nu.tie = rnd();
        const old = units.indexOf(here);
        if (old >= 0) { gone.push(here); units.splice(old, 1, nu); } else units.push(nu);
        events.push({ key: nu.key, text: "Joins the debate", color: "#de5e55", summon: true });
      }
      return events;
    }
    const waiting = () => reserve.length;
    // Everyone who has faced the team, including those since replaced.
    const gone = [];
    const allFoes = () => gone.concat(foes());

    function outcome() {
      if (!foes().some(inPlay) && !reserve.length) return "win";
      if (!heroes().some(inPlay)) return "lose";
      return null;
    }

    return {
      units, heroes, foes, allFoes, nextUnit, upcoming, reinforce, waiting, startTurn, usable, choices, think, aim, use, backup, commandTarget, outcome, stat,
      get round() { return round; },
    };
  }

  const LABELS = { dumbfounded: "Dumbfounded", doubting: "Doubting", muted: "Muted", examined: "Exposed", called: "Called Out", cloaked: "Undercover" };
  // An apologist under pressure is flustered, not doubting his faith: the same
  // status (it wears on Composure) takes a different name on the heroes' side.
  const label = (s, u) => (s === "doubting" && u && u.side === "hero" ? "Flustered" : LABELS[s] || s);
  const statName = (s) => ({ atk: "Attack", def: "Defense", crit: "Crit" }[s] || s);
  // Everything that is on a debater, spelled out in short words: statuses,
  // protections, renewal, and boosts and setbacks by stat (stacked ones
  // counted). The stage shows these under each bar; the game lists them too.
  const GUARDS = { steadfast: "STEADY", security: "SECURE", faith: "FAITH ALONE", testimony: "HALF DMG" };
  const STAT_TAG = { atk: "ATK", def: "DEF", crit: "CRIT", spd: "SPD" };
  function marks(u) {
    const tags = [];
    if (u.statuses.dumbfounded > 0) tags.push(["STUN", "#ffd84a"]);
    if (u.statuses.doubting > 0) tags.push(u.side === "hero" ? ["FLUSTERED", "#e89a4a"] : ["DOUBTING", "#c69ae8"]);
    if (u.statuses.muted > 0) tags.push(["MUTED", "#de5e55"]);
    if (u.statuses.examined > 0) tags.push(["EXPOSED", "#e8b94a"]);
    if (u.statuses.cloaked > 0) tags.push(["HIDDEN", "#9fd0ff"]);
    if (u.called) tags.push(["CALLED OUT", "#de5e55"]);
    if (u.counter > 0) tags.push(["REBUTTAL", "#e8b94a"]);
    for (const [k, v] of Object.entries(u.immune)) if (v > 0) tags.push([GUARDS[k] || "GUARDED", "#7ea4e6"]);
    if (u.regen && u.regen.n > 0) tags.push(["RENEW", "#74c07a"]);
    // Boosts and setbacks on the same stat cancel out: two Attack Ups and one
    // Attack Down show as a single ATK▲.
    for (const st of ["atk", "def", "crit", "spd"]) {
      const net = u.buffs.filter((b) => b.stat === st).reduce((n, b) => n + (b.amt > 0 ? 1 : b.amt < 0 ? -1 : 0), 0);
      if (net > 0) tags.push([STAT_TAG[st] + "▲" + (net > 1 ? net : ""), "#74c07a"]);
      if (net < 0) tags.push([STAT_TAG[st] + "▼" + (net < -1 ? -net : ""), "#ff6a5e"]);
    }
    return tags;
  }

  const immuneName = (k) => ({ steadfast: "Steadfast", testimony: "Testimony", faith: "Faith Alone", security: "Eternal Security" }[k] || k);

  // Fight to the end. `choose(u)` returns a promise of { i, target } for a hero
  // the player controls; without it, everyone plays themselves.
  // What a fighter says this time (see lines.js): picked once per use, so
  // the stage and the log agree.
  function lineOf(u, i) {
    if (typeof Lines === "undefined") return null;
    const move = u.side === "hero" ? (typeof Theater !== "undefined" && Theater.MOVES[u.id] || [])[i] : { name: u.def.skills[i].name, ...(u.def.skills[i].anim || {}) };
    return Lines.pick(move);
  }

  async function run(b, view, opts) {
    const o = opts || {};
    const inPlayNow = (u) => u.state === "in";
    // Rebuttals: whoever was hit and is ready answers the attacker at once,
    // with his basic move. A rebuttal never sets off another.
    async function rebut(r, attacker) {
      for (const t of r.rebuttals || []) {
        if (b.outcome() || t.state !== "in" || attacker.state !== "in") return;
        // A Dumbfounded hero can't answer back, even with a Rebuttal ready
        // (the same move may have just dumbfounded him).
        if (t.statuses.dumbfounded > 0) { view.show([{ key: t.key, text: "Too dumbfounded to answer", color: "#ffd84a" }]); await view.sleep(0.5); continue; }
        const rt = b.aim(t, 0, attacker);
        view.show([{ key: t.key, text: "Rebuttal!", color: "#e8b94a" }]);
        const line = lineOf(t, 0);
        if (o.onAction) o.onAction(t, t.def.skills[0], "rebuttal", line);
        await view.perform(t, 0, rt, line);
        const r4 = b.use(t, 0, attacker, rt, true);
        view.show(r4.events);
        await view.sleep(r4.events.some((e) => e.out) ? 2.0 : 0.8);
      }
    }
    for (;;) {
      if (o.stopped && o.stopped()) return "stopped";
      const out = b.outcome();
      if (out) return out;
      const r0 = b.reinforce();
      if (r0.length) { view.show(r0); if (o.onReinforce) o.onReinforce(); await view.sleep(1.0); }
      const u = b.nextUnit();
      if (!u) return b.outcome();
      view.setActive(u.key);
      const st = b.startTurn(u);
      if (st.events.length) { view.show(st.events); await view.sleep(0.7); }
      if (st.skip && inPlayNow(u) && o.onSkip) o.onSkip(u);
      if (st.skip || b.outcome()) continue;
      const pick = u.side === "hero" && o.choose ? await o.choose(u) : b.think(u);
      if (o.stopped && o.stopped()) return "stopped";
      const targets = b.aim(u, pick.i, pick.target);
      const line = lineOf(u, pick.i);
      if (o.onAction) o.onAction(u, u.def.skills[pick.i], undefined, line);
      view.setActive(null);
      await view.perform(u, pick.i, targets, line);
      const r = b.use(u, pick.i, pick.target, targets);
      view.show(r.events);
      await view.sleep(r.events.some((e) => e.out) ? 2.0 : 0.9);
      await rebut(r, u);
      const ri = b.reinforce();
      if (ri.length) { view.show(ri); if (o.onReinforce) o.onReinforce(); await view.sleep(1.0); }
      // A commanded ally answers at once.
      if (r.commanded && !b.outcome() && r.commanded.state === "in") {
        const ally = r.commanded, tgt = b.commandTarget(ally);
        if (tgt) {
          const ct = b.aim(ally, 0, tgt);
          view.show([{ key: ally.key, text: "Sent in!", color: "#e8b94a" }]);
          const cl = lineOf(ally, 0);
          if (o.onAction) o.onAction(ally, ally.def.skills[0], "command", cl);
          await view.perform(ally, 0, ct, cl);
          const r3 = b.use(ally, 0, tgt, ct);
          view.show(r3.events);
          await view.sleep(r3.events.some((e) => e.out) ? 2.0 : 0.8);
          await rebut(r3, ally);
        }
      }
      // A friend with good Zeal may jump in.
      const bks = b.outcome() ? null : b.backup(u, pick.i, targets);
      for (const bk of bks || []) {
        if (b.outcome() || !inPlayNow(bk.ally)) break;
        // If the first backers already put him out, the next one takes
        // whoever is left on the other side.
        if (!inPlayNow(bk.target)) { const next = (bk.ally.side === "hero" ? b.foes() : b.heroes()).find(inPlayNow); if (!next) break; bk.target = next; }
        const bt = b.aim(bk.ally, 0, bk.target);
        view.show([{ key: bk.ally.key, text: bk.ally.side === "hero" ? "Backs you up!" : "Piles on!", color: "#7ea4e6" }]);
        const bl = lineOf(bk.ally, 0);
        if (o.onAction) o.onAction(bk.ally, bk.ally.def.skills[0], true, bl);
        await view.perform(bk.ally, 0, bt, bl);
        const r2 = b.use(bk.ally, 0, bk.target, bt);
        view.show(r2.events);
        await view.sleep(r2.events.some((e) => e.out) ? 2.0 : 0.8);
        await rebut(r2, bk.ally);
      }
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

  // A move in plain words, for the player: hits on Composure, Zeal up or
  // down, and the statuses. No hidden numbers.
  function describe(sk) {
    const out = [];
    const pct = (e) => (e.chance !== undefined && e.chance < 1 ? Math.round(e.chance * 100) + "% chance: " : "");
    const STATUS = { cloaked: "Undercover (hard to single out, and hits land at a quarter strength, unless Exposed)", dumbfounded: "Dumbfounded (loses turns)", doubting: "Doubting (loses Composure each turn)", muted: "Muted (basic move only)", examined: "Exposed (takes harder hits)", called: "Called Out" };
    for (const e of sk.effects) {
      if (e.dmg) {
        const total = e.dmg * (e.hits || 1);
        const size = total < 0.9 ? "Light hit" : total < 1.4 ? "Hit" : total < 2.2 ? "Strong hit" : total < 3.5 ? "Heavy hit" : "Crushing hit";
        let t = e.hits > 1 ? e.hits + " quick hits on Composure (together, a " + size.toLowerCase() + ")" : size + " on Composure";
        if (e.vs) t += e.vs[0] === "guarded" ? ", harder against a shield or podium" : ", harder against " + (e.vs[0] === "doubting" ? "the Doubting" : e.vs[0]);
        if ((sk.pierce || []).includes("cover")) t += ", straight past any podium";
        if (e.splash) t += ", with some for everyone else";
        out.push(t);
      }
      if (e.zeal) out.push(pct(e) + (e.zeal < 0 ? "Zeal down " + -e.zeal : "Zeal up " + e.zeal) + (e.faction ? " (" + e.faction + " only)" : ""));
      if (e.status) out.push(pct(e) + STATUS[e.status]);
      if (e.share) out.push("Hits each for " + Math.round(e.share * 100) + "% of his Composure; a Shield of Faith or a podium soaks it up first");
      if (e.windup) out.push("Winds up his closing argument: next turn it lands on the whole team. Shield your team, leave him Dumbfounded or Muted, or knock a fifth of his Composure off first to stop it");
      if (e.taunt || e.tauntAll) out.push("Calls them out: they must answer this evangelist. A spotlight shows who, and a red arrow over each opponent points his way");
      if (e.buff) out.push(pct(e) + statName(e.buff) + (e.amt > 0 ? " Up" : " Down"));
      if (e.heal) out.push("Restores Composure (and encourages the Discouraged)");
      if (e.cleanse) out.push("Examen: clears every setback");
      if (e.purge) out.push(pct(e) + (e.purge === "all" ? "Fact-Checks every boost" : "Fact-Checks a boost") + (e.faction ? " (" + e.faction + " only)" : ""));
      if (e.shield) out.push("Shield of Faith");
      if (e.podium) out.push("Sets up a podium that takes the hits (stronger with more Care)");
      if (e.command) out.push("Sends this friend in: they answer at once with their basic move");
      if (e.counter || e.selfCounter) out.push("Rebuttal: whenever an opponent's move hits this evangelist, the evangelist answers back at once with the basic move (not while Dumbfounded)" + (e.counter && sk.target === "self" ? ". Arms folded and a ring of steel show the stance, and it can't be taken again while it holds" : ""));
      if (e.immune) out.push({ steadfast: "Steadfast: no Zeal loss", testimony: "Testimony: hits land at half strength", faith: "Faith Alone", security: "Eternal Security" }[e.immune]);
      if (e.selfZeal) out.push("Zeal up " + e.selfZeal + " for this evangelist");
      if (e.allyZeal) out.push("Zeal up " + e.allyZeal + " for the whole team");
      if (e.onBreak) out.push("Zeal up if it puts someone out (already at full Zeal: some Composure back instead)");
      if (e.onBreakCloak) out.push("Goes Undercover if it puts someone out");
      if (e.randomLift) out.push("A lift for each, picked at random: Attack Up, Crit Up, a Shield of Faith, or Composure back");
      if (e.friendsCleanse) out.push("Frees friends from being " + (LABELS[e.friendsCleanse] || e.friendsCleanse));
      if (e.summon) out.push("Calls in help");
    }
    return [...new Set(out)].join(" · ");
  }

  // When a move is worth using: one or two plain tips for the player, taken
  // from what the move does. The first match wins in each group.
  function advise(sk) {
    const fx = sk.effects;
    const has = (f) => fx.some(f);
    const tips = [];
    const dmg = fx.reduce((t, e) => t + (e.dmg || 0) * (e.hits || 1), 0);
    const many = ["foes", "two", "random4"].includes(sk.target);
    const friendly = ["ally", "allies", "self"].includes(sk.target);
    // What the move is for.
    if (has((e) => e.status === "cloaked")) tips.push("Go Undercover when the other side keeps singling this evangelist out, or to line up a big hit.");
    else if (has((e) => e.heal)) tips.push("Save it for a friend who is low on Composure or Discouraged: it brings them back into the debate.");
    else if (has((e) => e.cleanse || e.friendsCleanse)) tips.push("Use it when a friend is Dumbfounded, Muted or Doubting, not before.");
    else if (has((e) => e.shield || e.podium)) tips.push("Put it in front of the friend taking the most hits, or the one with the least Composure, before the other side moves.");
    else if (has((e) => e.command)) tips.push("Send in your hardest hitter, or the friend whose basic move can put someone out.");
    else if (has((e) => e.counter || e.selfCounter)) tips.push("Best just before the other side attacks: every hit on this evangelist earns a free answer back.");
    else if (has((e) => e.taunt || e.tauntAll)) tips.push("Use it to pull attacks away from a weaker friend, on an evangelist with plenty of Composure.");
    else if (has((e) => e.randomLift)) tips.push("A good all-round lift when nothing is urgent, best early, before the team's big moves.");
    // What it does to the other side.
    if (has((e) => e.status === "dumbfounded")) tips.push("Aim it at the most dangerous opponent: a Dumbfounded speaker loses turns.");
    else if (has((e) => e.status === "examined")) tips.push("Use it first, then hit the Exposed opponent with your strongest moves.");
    else if (has((e) => e.status === "muted")) tips.push("Mute the opponent whose big moves are nearly ready.");
    else if (has((e) => e.status === "doubting")) tips.push("Doubt keeps wearing an opponent down each turn, so use it early on someone who will stay a while.");
    if (has((e) => e.zeal < 0)) tips.push("Wears down Zeal, the other way to win: an opponent whose Zeal hits bottom leaves the debate.");
    else if (friendly && has((e) => e.zeal > 0 || e.allyZeal || e.selfZeal)) tips.push("Zeal keeps your side in the debate: use it when a friend's Zeal is running low.");
    if (has((e) => (e.vs || [])[0] === "guarded") || (sk.pierce || []).includes("cover")) tips.push("The answer to podiums and shields.");
    const purge = fx.find((e) => e.purge);
    if (purge) tips.push(purge.faction ? "Strongest against " + purge.faction[0].toUpperCase() + purge.faction.slice(1) + " opponents: it strips their boosts." : "Strip an opponent's boosts right after they have been helped.");
    if (has((e) => e.buff && e.amt > 0) && friendly) tips.push("Use it early, before the big moves, so the boost counts.");
    if (has((e) => e.buff && e.amt < 0)) tips.push("Weaken the opponent who hits hardest.");
    // Plain hits.
    if (dmg > 0 && tips.length < 2) tips.push(many ? "Best when several opponents are standing." : dmg >= 2.2 ? "Save it to put an opponent out, or to break through a tough one." : "The steady choice when nothing else is ready.");
    if (sk.cd === 0 && dmg > 0 && tips.length < 2) tips.push("Always ready, so use it while the bigger moves are waiting.");
    return tips.slice(0, 2);
  }

  return { create, label, run, levelOf, xpFor, unlockLevel, describe, advise, marks, DIFFICULTY, tune(k, v) { if (k === "zealGrowth") FOE_ZEAL_GROWTH = v; if (k === "growth") FOE_GROWTH = v; if (k === "backup") BACKUP = v; if (k === "foeFrom") FOE_BACKUP_FROM = v; if (k === "shaken") SHAKEN = v; if (k === "impact") IMPACT = v; if (k === "punch") FOE_PUNCH = v; if (k === "kick") GREAT_KICK = v; if (k === "sap") ZEAL_SAP = v; if (k === "heroShield") HERO_SHIELD = v; if (k === "heroHeal") HERO_HEAL = v; if (k === "bold") SHIELD_BOLD = v; if (k === "closers") CLOSERS_ON = v; if (k === "rattle") RATTLE = v; if (k === "revive") REVIVE = v; } };
})();

// ---- The stage --------------------------------------------------------------------------

const BattleView = (() => {
  const FONT = "'Pixelify Sans', 'Courier New', monospace";
  // Floating words and status letters: the clearer face, drawn large, since
  // the stage is shrunk to about half size on a phone.
  const CLEAR = "'Jersey 15', 'Pixelify Sans', 'Courier New', monospace";

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
        if (u.state === "walked" || u.state === "left") {
          const k = now - u.outAt;
          if (k > 1.2) return { hidden: true };
          return { alpha: 1 - k / 1.2, dx: a.side === "foe" ? k * 60 : -k * 60, flip: a.side !== "foe" };
        }
        if (u.state === "discouraged") return { alpha: 0.4 };
        // A reinforcement walks in from the side.
        if (u.joinedAt !== undefined && now - u.joinedAt < 0.8) {
          const k = (now - u.joinedAt) / 0.8;
          return { dx: Math.round((1 - k) * 160), pose: Math.floor(now * 8) % 2 ? "walkA" : "walkB" };
        }
        // Dumbfounded: swaying on his feet.
        if (u.statuses.dumbfounded > 0) return { dx: Math.round(Math.sin(now * 5 + u.slot) * 3) };
        // A Rebuttal ready: arms folded, feet planted, waiting for it.
        if (u.counter > 0) return { pose: "guard" };
        return null;
      },
      hud(ctx, actors, t, cinematic) {
        if (cinematic) return;
        const units = byKey();
        for (const a of actors) {
          const u = units[a.key];
          if (!u) continue;
          if (u.state === "converted" && now - u.outAt > 1.4) { sign(ctx, a.x, a.y, Math.min(1, (now - u.outAt - 1.4) * 2), u.def.sign || SIGNS[u.faction]); continue; }
          if (a.hidden) continue;
          if (u.statuses.dumbfounded > 0) stunStars(ctx, a.x + (a.dx || 0), a.y, t, Math.min(3, u.statuses.dumbfounded));
          if (u.windup && u.state === "in") windupMark(ctx, a.x + (a.dx || 0), a.y, t);
          // Called out: a spotlight on the one they must answer, and a red
          // arrow over each opponent he has called, pointing his way.
          const calling = Object.values(units).some((f) => f.called && f.called.by === u.key && f.state === "in");
          if (calling && u.state === "in") spotlight(ctx, a.x + (a.dx || 0), a.y, t);
          if (u.called && u.state === "in") { const by = units[u.called.by]; if (by && by.state === "in") calledArrow(ctx, a.x + (a.dx || 0), a.y, t, by.side === "hero" ? -1 : 1); }
          if (u.counter > 0 && u.state === "in") stanceRing(ctx, a.x + (a.dx || 0), a.y, t);
          // A new shield shows only once its "Shield of Faith" has popped up,
          // not while the move that gives it is still playing.
          const shield = u.shield && (!u.shield.fresh || (u.shield.revealAt !== undefined && now >= u.shield.revealAt)) ? u.shield : null;
          if (shield) shieldAura(ctx, a.x + (a.dx || 0), a.y + (a.dy || 0), t, u.slot * 1.7 + (u.side === "foe" ? 0.9 : 0));
          if (u.cover) barrier(ctx, a.x + (u.side === "hero" ? 30 : -30), a.y, u.cover, u.def.podium || (u.side === "foe" ? o.coverKind || "podium" : "podium"));
          const x = a.x - 30;
          const y = a.y + 6;
          // Composure, with any Shield of Faith added on the end in white:
          // when the two together pass full, the bar grows
          // longer (up to half again), so the shield's strength is plain.
          const hpW = Math.round(60 * u.hp / u.maxHp);
          const shW = shield ? Math.min(90 - hpW, Math.max(2, Math.round(60 * shield.amt / u.maxHp))) : 0;
          const barW = Math.max(60, hpW + shW);
          ctx.fillStyle = "#1a1326"; ctx.fillRect(x - 1, y - 1, barW + 2, 7);
          ctx.fillStyle = "#2a2f55"; ctx.fillRect(x, y, 60, 5);
          ctx.fillStyle = u.hp / u.maxHp > 0.3 ? "#74c07a" : "#de8a4a"; ctx.fillRect(x, y, hpW, 5);
          if (shW) { ctx.fillStyle = "#f4f6ff"; ctx.fillRect(x + hpW, y, shW, 5); ctx.fillStyle = "#9fb8ee"; ctx.fillRect(x + hpW, y + 4, shW, 1); }
          // Zeal: blue arrows up when it is good; red arrows down when it
          // falls, with dim ones showing how far until the floor.
          const step = Math.min(14, Math.floor(62 / Math.max(3, -u.floor)));
          if (u.zeal > 0) for (let i = 0; i < u.zeal; i++) arrow(ctx, x + 5 + i * 14, y + 9, true, "#7ea4e6");
          else if (u.zeal < 0) for (let i = 0; i < -u.floor; i++) arrow(ctx, x + 5 + i * step, y + 9, false, i < -u.zeal ? "#ff5a4e" : "#4a3040");
          else { ctx.fillStyle = "#8a8aa8"; ctx.fillRect(x, y + 12, 12, 3); }
          const tags = Battle.marks(u);
          ctx.font = "400 15px " + CLEAR; ctx.textAlign = "center";
          // One row under the bar, as many as fit, then "+2" for the rest (the
          // game lists them all in full under the stage).
          let tx = x;
          const ty = y + 18, room = 112;
          tags.forEach(([g, c], i) => {
            if (tx === null) return;
            const w = Math.ceil(ctx.measureText(g).width) + 8;
            const more = "+" + (tags.length - i), mw = Math.ceil(ctx.measureText(more).width) + 8;
            const last = i === tags.length - 1;
            if (tx + w > x + room || (!last && tx + w + 2 + mw > x + room)) {
              if (tx + mw > x + room && tx > x) return;
              ctx.fillStyle = "#1a1326"; ctx.fillRect(tx - 1, ty, mw, 16); ctx.fillStyle = "#ece4d0"; ctx.fillText(more, tx - 1 + mw / 2, ty + 12);
              tx = null; return;
            }
            ctx.fillStyle = "#1a1326"; ctx.fillRect(tx - 1, ty, w, 16); ctx.fillStyle = c; ctx.fillText(g, tx - 1 + w / 2, ty + 12);
            tx += w + 2;
          });
          // Whose turn it is, and who can be chosen.
          const top = a.y - 108;
          if (active === a.key) { const b = Math.sin(t * 6) * 3; ctx.fillStyle = "#e8b94a"; ctx.beginPath(); ctx.moveTo(a.x - 7, top - 10 + b); ctx.lineTo(a.x + 7, top - 10 + b); ctx.lineTo(a.x, top - 2 + b); ctx.fill(); }
          if (targetable.has(a.key)) { ctx.strokeStyle = `rgba(232,185,74,${0.5 + Math.sin(t * 8) * 0.4})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(a.x, a.y, 38, 9, 0, 0, Math.PI * 2); ctx.stroke(); }
        }
        // Numbers and words that float up from the fighters.
        // A long one wraps onto more lines, and every one is kept inside the
        // stage, so nothing runs off the edge over the right-hand debaters.
        floaters = floaters.filter((f) => now - f.t0 < 2.2);
        ctx.font = "400 28px " + CLEAR;
        const LINE = 24, MAX_W = 160, SW = ctx.canvas.width;
        for (const f of floaters) if (!f.lines) {
          f.lines = [];
          for (const word of String(f.text).split(" ")) {
            const last = f.lines[f.lines.length - 1];
            if (last !== undefined && ctx.measureText(last + " " + word).width <= MAX_W) f.lines[f.lines.length - 1] = last + " " + word;
            else f.lines.push(word);
          }
          f.width = Math.max(...f.lines.map((l) => ctx.measureText(l).width));
        }
        // Stack each debater's words by how many lines the ones below take up.
        const lift = new Map(), used = {};
        for (const f of floaters.slice().sort((a, b) => a.row - b.row)) { lift.set(f, used[f.key] || 0); used[f.key] = (used[f.key] || 0) + f.lines.length; }
        // Two neighbours' words that would overlap: the later one rises above.
        const placed = [];
        for (const f of floaters) {
          const a = actors.find((x) => x.key === f.key);
          if (!a) continue;
          const k = (now - f.t0) / 2.2;
          ctx.globalAlpha = Math.min(1, (1 - k) * 3);
          ctx.font = "400 28px " + CLEAR; ctx.textAlign = "center"; ctx.lineWidth = 6; ctx.lineJoin = "round"; ctx.strokeStyle = "#1a1326";
          const x = Math.max(f.width / 2 + 8, Math.min(SW - f.width / 2 - 8, a.x));
          let base = a.y - 112 - k * 20 - lift.get(f) * LINE;
          const box = () => ({ l: x - f.width / 2 - 4, r: x + f.width / 2 + 4, t: base - f.lines.length * LINE, b: base + 6 });
          for (let tries = 0; tries < 6; tries++) {
            const me = box(), hit = placed.find((o) => o.key !== f.key && me.l < o.r && o.l < me.r && me.t < o.b && o.t < me.b);
            if (!hit) break;
            base -= me.b - hit.t + 2;
          }
          placed.push({ key: f.key, ...box() });
          f.lines.forEach((l, i) => {
            const y = base - (f.lines.length - 1 - i) * LINE;
            ctx.strokeText(l, x, y); ctx.fillStyle = f.color; ctx.fillText(l, x, y);
          });
          ctx.globalAlpha = 1;
        }
      },
    });
    theater.setTeam(battle.heroes().map((u) => u.id));
    theater.setFoes(battle.foes().map((u) => u.id));
    theater.onDone(() => { if (done) { const d = done; done = null; d(); } });

    // What stands in front of a fighter depends on where the debate is: a
    // podium in a studio, a soapbox on the street, a stepladder at Speakers'
    // Corner, a pulpit in a Reformed church, a streamer's desk online.
    function barrier(ctx, bx, by, c, kind) {
      // Drawn half again as large as the figures' pixels, so it reads on a phone.
      ctx.save(); ctx.translate(bx, by); ctx.scale(1.5, 1.5);
      const x = 0, y = 0;
      const px = (dx, dy, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x + dx), Math.round(y + dy), w, h); };
      if (kind === "soapbox") {
        px(-17, -26, 34, 26, "#1a1326"); px(-15, -24, 30, 22, "#a8743e");
        for (let i = 0; i < 3; i++) px(-15, -22 + i * 8, 30, 2, "#7e5228");
        px(-9, -18, 18, 5, "#f7f1de"); ctx.fillStyle = "#1a1326"; ctx.font = "700 5px " + FONT; ctx.textAlign = "center"; ctx.fillText("SOAP", x, y - 14);
      } else if (kind === "stepladder") {
        px(-14, -40, 4, 40, "#1a1326"); px(10, -40, 4, 40, "#1a1326");
        px(-13, -40, 2, 40, "#c9ccd4"); px(11, -40, 2, 40, "#c9ccd4");
        for (let i = 0; i < 4; i++) px(-13, -36 + i * 10, 26, 3, "#8a8e99");
      } else if (kind === "pulpit") {
        px(-18, -44, 36, 44, "#1a1326"); px(-16, -42, 32, 40, "#5a3620"); px(-16, -42, 32, 5, "#7a4a2c");
        // An open Bible on the desk of the pulpit.
        px(-12, -48, 24, 7, "#1a1326"); px(-11, -47, 10, 5, "#f7f1de"); px(1, -47, 10, 5, "#f7f1de"); px(-1, -47, 2, 5, "#7a2a2a");
      } else if (kind === "desk") {
        px(-20, -30, 40, 30, "#1a1326"); px(-18, -28, 36, 6, "#3a3f4a"); px(-16, -22, 4, 22, "#2a2f3a"); px(12, -22, 4, 22, "#2a2f3a");
        px(-8, -40, 16, 12, "#1a1326"); px(-7, -39, 14, 9, "#5aa0e0");
        ctx.strokeStyle = "#f7f1de"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x - 24, y - 38, 5, 0, Math.PI * 2); ctx.stroke();
      } else if (kind === "gunner") {
        // Joe Schmid's own podium: football-club red, white trim, a little gold cannon.
        px(-16, -42, 32, 42, "#1a1326"); px(-14, -40, 28, 38, "#d8232a"); px(-14, -40, 28, 3, "#f4f4f4"); px(-14, -5, 28, 3, "#f4f4f4");
        px(-11, -32, 3, 6, "#e8b94a");                                           // muzzle
        px(-9, -31, 16, 4, "#e8b94a"); px(-9, -31, 16, 1, "#fff0b0");            // barrel
        px(6, -32, 4, 6, "#b8862a");                                             // breech
        for (const wx of [-5, 3]) { px(wx - 1, -27, 7, 7, "#7a5a1a"); px(wx, -26, 5, 5, "#e8b94a"); px(wx + 2, -24, 1, 1, "#7a5a1a"); }   // wheels
        px(-4, -52, 2, 12, "#2a2a33"); px(-6, -54, 6, 4, "#2a2a33");
      } else if (kind === "display") {
        px(-16, -46, 32, 46, "#1a1326"); px(-14, -44, 28, 30, "#f7f1de"); px(-14, -14, 28, 12, "#7e5228");
        px(-10, -40, 20, 3, "#1f2d4f"); px(-10, -34, 16, 2, "#6a6a88"); px(-10, -30, 18, 2, "#6a6a88");
      } else {
        px(-16, -42, 32, 42, "#1a1326"); px(-14, -40, 28, 38, "#7a5236"); px(-14, -40, 28, 4, "#9a6a46");
        px(-4, -52, 2, 12, "#2a2a33"); px(-6, -54, 6, 4, "#2a2a33");
      }
      // The podium's own strength, as a small tan bar.
      px(-13, -9, 26, 5, "#1a1326"); px(-12, -8, Math.max(1, Math.round(24 * c.hp / c.max)), 3, "#f0dca0");
      ctx.restore();
    }

    // A Shield of Faith (Ephesians 6:16): a glowing bubble, clear at the
    // centre and bright at the edge; two broken rings of light turning in
    // opposite directions; little cross-shaped sparks rising through it; and
    // a faint cross that shimmers in the middle.
    function shieldAura(ctx, x, y, t, seed) {
      const cx = x, cy = y - 50, rx = 34, ry = 62;
      const pulse = 0.5 + Math.sin(t * 3 + seed) * 0.5;
      ctx.save();
      // The bubble.
      ctx.translate(cx, cy); ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, rx * 0.35, 0, 0, rx);
      g.addColorStop(0, "rgba(126,164,230,0)");
      g.addColorStop(0.75, `rgba(126,164,230,${0.10 + pulse * 0.06})`);
      g.addColorStop(1, `rgba(190,215,255,${0.38 + pulse * 0.2})`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
      // Two broken rings of light, turning opposite ways.
      ctx.lineWidth = 2.5;
      for (const [dir, r, col] of [[1, rx, "rgba(230,240,255,0.85)"], [-1, rx - 5, "rgba(232,185,74,0.6)"]]) {
        ctx.strokeStyle = col;
        for (let k = 0; k < 4; k++) {
          const a0 = dir * t * 1.4 + seed + (k * Math.PI) / 2;
          ctx.beginPath(); ctx.arc(0, 0, r, a0, a0 + 0.7); ctx.stroke();
        }
      }
      ctx.restore();
      // A faint cross at the centre, breathing in and out.
      ctx.fillStyle = `rgba(255,236,170,${0.16 + pulse * 0.2})`;
      ctx.fillRect(Math.round(cx) - 2, Math.round(cy) - 16, 4, 28);
      ctx.fillRect(Math.round(cx) - 9, Math.round(cy) - 8, 18, 4);
      // Sparks rising through the bubble.
      for (let i = 0; i < 5; i++) {
        const k = (t * 0.45 + i / 5 + seed * 0.13) % 1;
        const sx = Math.round(cx + Math.sin(i * 2.3 + seed) * rx * 0.6);
        const sy = Math.round(cy + ry * 0.8 - k * ry * 1.6);
        ctx.globalAlpha = Math.sin(k * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(sx - 1, sy - 3, 2, 6); ctx.fillRect(sx - 3, sy - 1, 6, 2);
      }
      ctx.globalAlpha = 1;
    }

    // Dumbfounded: stars circling his head, one for each turn he has left to
    // lose. The ones passing behind his head are dimmer.
    // A boss winding up his closing argument: a pulsing red warning over his head.
    function windupMark(ctx, x, y, t) {
      const cy = y - 118, pulse = 0.55 + 0.45 * Math.abs(Math.sin(t * 4));
      ctx.globalAlpha = pulse;
      ctx.fillStyle = "#1a1326"; ctx.fillRect(x - 13, cy - 17, 26, 34);
      ctx.fillStyle = "#ff5a4e"; ctx.fillRect(x - 11, cy - 15, 22, 30);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(x - 3, cy - 11, 6, 14); ctx.fillRect(x - 3, cy + 6, 6, 5);
      ctx.globalAlpha = 1;
    }
    function stunStars(ctx, x, y, t, n) {
      const cx = x, cy = y - 112;
      for (let i = 0; i < n + 1; i++) {
        const ang = t * 3.2 + (i * Math.PI * 2) / (n + 1);
        const sx = Math.round(cx + Math.cos(ang) * 26), sy = Math.round(cy + Math.sin(ang) * 8);
        ctx.globalAlpha = Math.sin(ang) > 0 ? 1 : 0.6;
        const c = i < n ? "#ffd84a" : "#ffffff";
        // A chunky four-pointed star with a dark outline.
        ctx.fillStyle = "#1a1326";
        ctx.fillRect(sx - 7, sy - 2, 15, 5); ctx.fillRect(sx - 2, sy - 7, 5, 15); ctx.fillRect(sx - 4, sy - 4, 9, 9);
        ctx.fillStyle = c;
        ctx.fillRect(sx - 6, sy - 1, 13, 3); ctx.fillRect(sx - 1, sy - 6, 3, 13); ctx.fillRect(sx - 3, sy - 3, 7, 7);
        ctx.fillStyle = "#ffffff"; ctx.fillRect(sx - 1, sy - 1, 2, 2);
      }
      ctx.globalAlpha = 1;
    }

    function arrow(ctx, x, y, up, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.strokeStyle = "#1a1326"; ctx.lineWidth = 2;
      if (up) { ctx.moveTo(x - 6, y + 8); ctx.lineTo(x + 6, y + 8); ctx.lineTo(x, y); }
      else { ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 8); }
      ctx.closePath(); ctx.stroke();
      ctx.fill();
    }

    // The spotlight on a hero who has called the other side out: a warm beam
    // from above and a slow pulse on the floor. Every attack comes to him.
    function spotlight(ctx, x, y, t) {
      const pulse = 0.5 + Math.sin(t * 3) * 0.5;
      ctx.save();
      const g = ctx.createLinearGradient(0, 0, 0, y);
      g.addColorStop(0, "rgba(255,120,90,0)");
      g.addColorStop(1, `rgba(255,120,90,${0.16 + pulse * 0.08})`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x - 12, 0); ctx.lineTo(x + 12, 0); ctx.lineTo(x + 44, y + 4); ctx.lineTo(x - 44, y + 4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(255,110,80,${0.55 + pulse * 0.4})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, 40 + pulse * 4, 9 + pulse, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // Over an opponent who has been called out: a red arrow toward the one
    // he must answer.
    function calledArrow(ctx, x, y, t, dir) {
      const top = y - 124 + Math.sin(t * 5) * 2;
      ctx.fillStyle = "#1a1326";
      ctx.beginPath(); ctx.moveTo(x + dir * 14, top); ctx.lineTo(x - dir * 4, top - 10); ctx.lineTo(x - dir * 4, top + 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ff6e50";
      ctx.beginPath(); ctx.moveTo(x + dir * 11, top); ctx.lineTo(x - dir * 2, top - 7); ctx.lineTo(x - dir * 2, top + 7); ctx.closePath(); ctx.fill();
      ctx.fillRect(Math.min(x - dir * 2, x - dir * 12), top - 2, 10, 4);
    }
    // A Rebuttal ready: a ring of steel around his feet, turning slowly.
    function stanceRing(ctx, x, y, t) {
      ctx.save();
      ctx.lineWidth = 3;
      for (let k = 0; k < 6; k++) {
        const a0 = t * 1.2 + (k * Math.PI) / 3;
        ctx.strokeStyle = k % 2 ? "rgba(200,212,230,0.9)" : "rgba(120,140,170,0.9)";
        ctx.beginPath(); ctx.ellipse(x, y + 1, 34, 8, 0, a0, a0 + 0.7); ctx.stroke();
      }
      ctx.restore();
    }

    // What each kind of convert's sign says, exact for where he's coming from:
    // the unbaptized are baptized at the Easter Vigil; a baptized Protestant
    // is received into full communion, not baptized again; Latter-day Saint
    // baptism is not recognized as valid (CDF, 2001), so he is baptized.
    const SIGNS = { atheist: ["OCIA", "EASTER VIGIL"], protestant: ["OCIA", "FULL COMMUNION"], lds: ["OCIA", "BAPTISM AT THE VIGIL"], islam: ["OCIA", "EASTER VIGIL"], newage: ["OCIA", "ALL WELCOME"], secular: ["OCIA", "EASTER VIGIL"] };

    // The sign a converted opponent leaves behind. Someone baptized who comes
    // back to the Church goes to confession, not to OCIA; his entry says so.
    function sign(ctx, x, y, a, words) {
      const [big, small] = words || ["OCIA", "TUES · 7 PM"];
      ctx.globalAlpha = a;
      ctx.font = "600 9px " + FONT;
      const sw = ctx.measureText(small).width;
      ctx.font = "700 16px " + FONT;
      const w = Math.max(72, ctx.measureText(big).width + 14, sw + 12);
      ctx.fillStyle = "#8a5a2b"; ctx.fillRect(x - 3, y - 40, 6, 40);
      ctx.fillStyle = "#1a1326"; ctx.fillRect(x - w / 2 - 2, y - 78, w + 4, 42);
      ctx.fillStyle = "#f7f1de"; ctx.fillRect(x - w / 2, y - 76, w, 38);
      ctx.textAlign = "center"; ctx.fillStyle = "#b3261e"; ctx.fillText(big, x, y - 54);
      ctx.font = "600 9px " + FONT; ctx.fillStyle = "#1a1326"; ctx.fillText(small, x, y - 43);
      ctx.globalAlpha = 1;
    }

    // Play a move's animation; resolves when it ends.
    function perform(u, i, targets, line) {
      let move;
      if (u.side === "hero") move = Theater.MOVES[u.id][i];
      else {
        const s = u.def.skills[i];
        const a = s.anim;
        move = { name: s.name, ...a, kind: Theater.kinds[a.kind] };
        // A volley shows at most one mark; the others take a list (possibly empty).
        move.mark = a.kind === "volley" ? (a.mark ? [].concat(a.mark)[0] : undefined) : [].concat(a.mark || []);
      }
      if (line) move = { ...move, ...line };
      // Stun marks only when a stun really lands (drawn from the fighter's
      // actual state), never just because the move might stun.
      // (Volleys and walk-overs take one mark or none; other kinds a list.)
      const single = move.kind === Theater.kinds.volley || move.kind === Theater.kinds.approach;
      const noStun = (m) => {
        const list = [].concat(m || []).filter((x) => x && x !== "dumbfounded");
        return single ? list[0] : list;
      };
      move = { ...move, mark: noStun(move.mark), mark2: noStun(move.mark2) };
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
        if (e.summon) { const nu = byKey()[e.key]; if (nu) nu.joinedAt = now; }
        if (e.text === "Shield of Faith") { const su = byKey()[e.key]; if (su && su.shield && su.shield.fresh) su.shield.revealAt = now + rows[e.key] * 0.12 - 0.12; }
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
          if (u.state === "converted" || u.state === "walked" || u.state === "left") continue;
          const slot = u.side === "hero" ? Theater.HERO_SLOTS[u.slot] : Theater.FOE_SLOTS[u.slot];
          if (Math.abs(x - slot[0]) < 36 && y < slot[1] + 12 && y > slot[1] - 110) return u;
        }
        return null;
      },
    };
  }

  return { create };
})();
