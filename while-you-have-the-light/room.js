"use strict";
// The white room: an empty white place with the monk standing in it, and a box to write in. Say
// the scene ("the top of Gluttony, to fight the great demon"; "Avarice at 300 m, three demons
// round me, my torch nearly out") and Claude makes it: the game sets him down in it. For trying
// things out. Only on the copy kept on claude.ai, where Claude can be asked; elsewhere it is not
// shown. Nothing done in a scene is kept, and no place kept on a mountain is touched.

const Room = (() => {
  const R = { ok: false, sample: null, t: 0, busy: false, log: [], now: null, go: null };
  try {
    const C = window.claude;
    if (C && C.use) C.use("sample").then((s) => { R.sample = s; R.ok = !!s; }).catch(() => { });
  } catch (e) { }

  // ---- What Claude is told: the game as it is, and the shape of the answer ----
  const FACTS = `You set up scenes in a test room for a 2D climbing game, "While You Have the Light". A monk climbs a mountain in the dark by the light of his torch, with a hook and rope, and fights demons. The player is the game's designer, trying things out. He tells you a scene in his own words; you answer with one JSON object, and the game builds the scene from it.

What is in the game now:
- Mountains, one for each sin. Only four are built: "gluttony" (swollen caverns over a pit; fat demons that suck him in and swallow his legs), "lust" (long climbing corridors hung with briars; quick demons), "avarice" (a mine hung with chains; demons throw coins that weigh him down), "wrath" (fire thrown at him; rock that crumbles). Envy, sloth and pride are not built yet.
- "metres": how high up the mountain, 0 to 3000. The mountains have no top yet: they go on.
- "place": "shaft" (a climb straight up, with ledges), "crossing" (a long way across: a tunnel with pits, or Gluttony's caverns, or Lust's terraces of briars), or "any".
- "demons": 0 to 3, how many demons wait in each place along the way (they come back when cast out).
- "near": demons right beside him at the start: a list of {"sin": "gluttony" | "lust" | "avarice" | "wrath", "count": 1 to 6}. Demons of any of the four can be put on any mountain.
- "summit": true puts him on the top of the mountain, out under the open sky, with a block: the greatest of its demons waits there (the Maw at its biggest, stronger than any met on the way). "metres" and "place" do not matter then. (The first summit is about 1000 m up.)
- "great": a great demon, 0 (none) to 4 (strongest). Only one kind exists, the Maw of Gluttony; it can be put on any mountain. It moves only while he faces it in his light (at 4 it hunts him even when he turns away), swallows him head and shoulders, and only a stone block swung into it while he swings on the rope can hurt it (thrown, or struck from the ground, it only drives it back). It is set a little way off, and he is given a block.
- "block": true ties a stone block from an idol to his belt, to throw or swing.
- "boon": a relic's power for 20 to 30 seconds, or null: "double" (A Double Portion: every blessing counts twice), "unconsumed" (the torch cannot be dimmed, and its light reaches farther), "friar" (The Flying Friar: he falls slowly and swings high), "vade" (Vade Retro: no demon can come near him).
- "torch": how much light he has, 0.05 (nearly out) to 1 (full). "endlessTorch": true means no blow can dim it.
- "flare": the flare (slowed time) meter, 0 to 1. "endlessFlare": true means it never runs out.
- When the summit's demon is cast down, an angel comes down and carries him home (and in a scene from this room, nothing of it is kept).
- Not built yet: the home base itself (its buildings, library and choir), the Easy Yoke (the gift for a summit won), other great demons, the hidden side passages, new relics. If he asks for one of these, say plainly that it is not built yet, and make the nearest thing that is.`;
  const SHAPE = `{"say": "one or two plain sentences to him: what you made (or what is not built yet, and what you made instead); or the answer, if he asked a question", "scene": {"title": "a short name for the scene, at most five words", "mountain": "gluttony", "summit": false, "metres": 0, "place": "any", "demons": 1, "near": [], "great": 0, "block": false, "boon": null, "torch": 1, "endlessTorch": false, "flare": 1, "endlessFlare": false}}`;
  function prompt(ask) {
    const said = R.log.filter((e) => e.who !== "note").slice(-6).map((e) => (e.who === "you" ? "He said: " : "You said: ") + e.text).join("\n");
    return FACTS + "\n\nThe scene he is in now: " + (R.now ? JSON.stringify(Object.assign({}, R.now, { seed: undefined })) : "none yet (he is in the empty white room).") +
      (said ? "\n\nWhat was said before, oldest first:\n" + said : "") +
      "\n\nWhat he asks now: " + JSON.stringify(ask) +
      "\n\nAnswer with only this JSON, nothing else:\n" + SHAPE +
      "\nUse \"scene\": null only when he asks a question or asks for no scene. When he asks to change the scene he is in (\"harder\", \"more of them\", \"again but in Lust\"), start from the scene now. For anything he does not say, choose what makes the scene he wants (for \"the top\" of a mountain or its boss, \"summit\": true).";
  }
  // (Only what the game knows, each within its bounds.)
  const MOUNTAINS = ["gluttony", "lust", "avarice", "wrath"], SINS4 = MOUNTAINS, BOONS = ["double", "unconsumed", "friar", "vade"];
  const num = (v, a, b, d) => { const n = +v; return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : d; };
  function clean(s) {
    if (!s || typeof s !== "object") return null;
    return {
      title: String(s.title || "The scene").slice(0, 40),
      mountain: MOUNTAINS.includes(s.mountain) ? s.mountain : "gluttony",
      summit: !!s.summit,
      metres: Math.round(num(s.metres, 0, 3000, 0)),
      place: s.place === "shaft" || s.place === "crossing" ? s.place : "any",
      demons: Math.round(num(s.demons, 0, 3, 1)),
      near: (Array.isArray(s.near) ? s.near : []).slice(0, 4).filter((n) => n && SINS4.includes(n.sin)).map((n) => ({ sin: n.sin, count: Math.round(num(n.count, 1, 6, 1)) })),
      great: Math.round(num(s.great, 0, 4, 0)),
      block: !!s.block,
      boon: BOONS.includes(s.boon) ? s.boon : null,
      torch: num(s.torch, 0.05, 1, 1), endlessTorch: !!s.endlessTorch,
      flare: num(s.flare, 0, 1, 1), endlessFlare: !!s.endlessFlare,
    };
  }

  // ---- Asking ----
  async function ask(words) {
    words = String(words || "").trim().slice(0, 600);
    if (!words || R.busy || !R.sample) return;
    R.busy = true; say("you", words); ta.value = ""; setBusy(true);
    let a = null;
    try { a = await R.sample.json(prompt(words), { modelTier: "quick", cache: false }); }
    catch (e) {
      const c = e && e.code;
      if (c === "not_granted" || c === "sampling_disabled" || c === "not_declared" || c === "capability_disabled" || c === "capability_removed") {
        R.ok = false; say("note", "Claude can't be asked from here, so the white room is closed.");
      } else if (c === "rate_limited") say("note", "Too many asks just now. Wait a little, then try again.");
      else if (c === "refused") say("note", "Claude won't make that one. Ask for another scene.");
      else if (c === "invalid_json" || c === "empty_completion") say("note", "That answer came back garbled. Say it again, perhaps in other words.");
      else if (c === "session_expired") say("note", "You need to sign in to claude.ai again.");
      else say("note", "Claude couldn't be reached just then. Try again.");
      R.busy = false; setBusy(false); return;
    }
    R.busy = false; setBusy(false);
    const reply = a && typeof a.say === "string" ? a.say.slice(0, 400) : "", sc = clean(a && a.scene);
    if (reply) say("claude", reply);
    if (!sc) { if (!reply) say("note", "No scene came back. Say it another way?"); return; }
    sc.seed = (Math.random() * 1e9) | 0;
    R.now = sc; R.go = { t: 0, sc };                   // (a moment to read the answer; then he goes)
    box.querySelector(".room-chips").hidden = true;    // (the examples given way to what has been said)
  }
  function enter(sc) {
    hide(); R.go = null;
    Game.scene(sc);
    Fade.t = 0; Fade.to = mode; mode = Fade;
  }
  // From the white into the dark: the scene comes up through the white as it fades.
  const Fade = {
    t: 0, to: null,
    step(dt) { Fade.t += dt; if (Fade.t >= 0.7) mode = Fade.to; },
    draw() { Fade.to.draw(); rect(0, 0, W, H, "rgba(250,249,246," + Math.max(0, 1 - Fade.t / 0.7) + ")"); },
    key() { },
  };

  // ---- The room, drawn ----
  R.step = (dt) => {
    R.t += dt;
    if (R.go) { R.go.t += dt; if (R.go.t > 1.6) enter(R.go.sc); }
  };
  R.draw = () => {
    const t = R.t, fy = H * 0.76, mx = Math.min(W * 0.26, (W - panelW()) * 0.5);
    // White without end: lighter overhead, a floor that fades into the distance.
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#fdfcfa"); g.addColorStop(0.62, "#f3f1ec"); g.addColorStop(1, "#e2ded6");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const f = ctx.createLinearGradient(0, fy - 30, 0, fy + 4); f.addColorStop(0, "rgba(226,222,214,0)"); f.addColorStop(1, "rgba(214,209,199,0.55)");
    ctx.fillStyle = f; ctx.fillRect(0, fy - 30, W, 34);
    // His shadow, and he.
    const sh = ctx.createRadialGradient(mx, fy, 0, mx, fy, 46); sh.addColorStop(0, "rgba(40,36,30,0.28)"); sh.addColorStop(1, "rgba(40,36,30,0)");
    ctx.save(); ctx.translate(mx, fy); ctx.scale(1, 0.16); ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(0, 0, 46, 0, TAU); ctx.fill(); ctx.restore();
    const goT = R.go ? R.go.t : 0, fade = R.go ? Math.max(0, 1 - Math.max(0, goT - 0.9) / 0.7) : 1;
    const r = drawMonk(mx, fy, 1, MONK_ANIM.idle((t * 0.4) % 1, t), { t, alpha: fade });
    if (r && r.torch && fade > 0.05) { drawFlame(r.torch[0], r.torch[1], 1.1, t, {}); glow(r.torch[0], r.torch[1], 26, C.flame, 0.35 * fade); }
    // While Claude makes it: a slow ring of light about him.
    if (R.busy || R.go) for (let i = 0; i < 3; i++) {
      const u = ((t * 0.5 + i / 3) % 1), rr = 30 + u * 120;
      ctx.save(); ctx.translate(mx, fy); ctx.scale(1, 0.22); ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.restore();
      ctx.strokeStyle = "rgba(196,150,80," + (0.4 * (1 - u)) + ")"; ctx.lineWidth = 1.2; ctx.stroke();
    }
    const x = 22;
    text("THE WHITE ROOM", x, 40, { font: FONT.title, size: 20, weight: 700, spacing: 5, color: "#26231f", max: W - panelW() - 40 });
    text("Tell me the scene, and I will put you in it.", x + 1, 60, { font: FONT.line, italic: true, size: 14, color: "#7a6c58", max: W - panelW() - 40 });
    if (R.busy) text("Making it…", mx, fy + 26, { align: "center", font: FONT.line, italic: true, size: 13, color: "#7a6c58" });
    // (In the room's own colours, not the dark buttons of the rest.)
    buttons.push({ x: 14, y: H - 44, w: 80, h: 30, act: back });
    ctx.strokeStyle = "rgba(60,52,40,0.35)"; ctx.lineWidth = 1; ctx.strokeRect(14.5, H - 43.5, 79, 29);
    text("BACK", 54, H - 29, { align: "center", base: "middle", size: 10, weight: 700, spacing: 2, color: "#4a4238" });
    if (R.go && goT > 0.9) rect(0, 0, W, H, "rgba(250,249,246," + Math.min(1, (goT - 0.9) / 0.7) + ")");
  };
  R.key = (code, down) => { if (down && code === "Escape") back(); };
  function back() { hide(); R.go = null; Game.toTitle(); }

  // ---- The box to write in, beside him ----
  let box = null, logEl = null, ta = null, sendB = null;
  // (How much of the screen the box takes, in the canvas's own units, so he stands clear of it.)
  const panelW = () => (box && !box.hidden ? Math.min(W * 0.5, box.getBoundingClientRect().width / (scale || 1) + 16) : 0);
  function build() {
    const st = document.createElement("style");
    st.textContent = `
      #room-box { position: fixed; inset: 0; z-index: 9; pointer-events: none; font-family: Montserrat, "Helvetica Neue", Arial, sans-serif; }
      #room-box[hidden] { display: none; }
      @media (orientation: portrait) { #room-box { display: none; } }
      #room-panel { pointer-events: auto; position: absolute; top: max(10px, env(safe-area-inset-top)); bottom: max(10px, env(safe-area-inset-bottom)); right: max(10px, env(safe-area-inset-right));
        width: min(48vw, 420px); box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; padding: 12px;
        background: rgba(255,255,255,0.82); border: 1px solid rgba(60,52,40,0.18); border-radius: 8px; box-shadow: 0 6px 30px rgba(60,52,40,0.12);
        color: #26231f; touch-action: auto; -webkit-user-select: text; user-select: text; }
      #room-log { flex: 1; min-height: 40px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; font-size: 13px; line-height: 1.4; }
      #room-log p { margin: 0; }
      #room-log .you { align-self: flex-end; max-width: 88%; background: #ece7de; border-radius: 10px 10px 2px 10px; padding: 6px 10px; }
      #room-log .claude { max-width: 92%; font-family: "Cormorant Garamond", Georgia, serif; font-style: italic; font-size: 16px; color: #5b4a33; }
      #room-log .note { font-size: 11px; color: #9a5a3a; }
      #room-log .hint { font-size: 12px; color: #7a6c58; }
      .room-chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .room-chip { font: 600 11px Montserrat, "Helvetica Neue", Arial, sans-serif; color: #5b4a33; background: #f6f2ea; border: 1px solid rgba(60,52,40,0.2); border-radius: 14px; padding: 5px 10px; cursor: pointer; text-align: left; }
      .room-row { display: flex; gap: 6px; align-items: stretch; }
      #room-text { flex: 1; min-width: 0; resize: none; height: 44px; box-sizing: border-box; font: 16px/1.3 Montserrat, "Helvetica Neue", Arial, sans-serif; color: #26231f;
        background: #fff; border: 1px solid rgba(60,52,40,0.3); border-radius: 6px; padding: 6px 8px; -webkit-user-select: text; user-select: text; }
      #room-text:focus { outline: 2px solid rgba(196,150,80,0.7); outline-offset: 1px; }
      #room-send { font: 800 11px Montserrat, "Helvetica Neue", Arial, sans-serif; letter-spacing: 0.08em; padding: 0 12px; border-radius: 6px; cursor: pointer;
        border: 1px solid #b07a32; background: #c4914a; color: #fff; }
      #room-send:disabled { opacity: 0.5; cursor: default; }`;
    document.head.appendChild(st);
    box = document.createElement("div"); box.id = "room-box"; box.hidden = true;
    box.innerHTML = `<div id="room-panel" role="dialog" aria-label="The white room">
      <div id="room-log" aria-live="polite"></div>
      <div class="room-chips"></div>
      <div class="room-row"><textarea id="room-text" placeholder="Where do you want to be?" enterkeyhint="send"></textarea><button type="button" id="room-send">PUT ME<br>THERE</button></div></div>`;
    document.body.appendChild(box);
    for (const t of ["pointerdown", "pointermove", "pointerup", "pointercancel", "touchstart", "touchend", "touchcancel", "keydown", "keyup", "contextmenu", "wheel"]) box.querySelector("#room-panel").addEventListener(t, (e) => e.stopPropagation());
    logEl = box.querySelector("#room-log"); ta = box.querySelector("#room-text"); sendB = box.querySelector("#room-send");
    const chips = box.querySelector(".room-chips");
    for (const c of ["The top of Gluttony, to fight the great demon", "Avarice at 300 m, three demons round me", "Lust with my torch nearly out"]) {
      const b = document.createElement("button"); b.type = "button"; b.className = "room-chip"; b.textContent = c;
      b.addEventListener("click", () => ask(c)); chips.appendChild(b);
    }
    sendB.addEventListener("click", () => ask(ta.value));
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(ta.value); }
      else if (e.key === "Escape") back();
    });
    const p = document.createElement("p"); p.className = "hint";
    p.textContent = "Say where you want to be and what should be there: the mountain, how high, the demons, the great demon, a block, a relic, how much light. Claude makes it, and you go in. Nothing done there is kept.";
    logEl.appendChild(p);
  }
  function say(who, words) {
    R.log.push({ who, text: words }); if (R.log.length > 30) R.log.shift();
    const p = document.createElement("p"); p.className = who; p.textContent = words; logEl.appendChild(p);
    logEl.scrollTop = logEl.scrollHeight;
  }
  function setBusy(on) { sendB.disabled = on; }
  function hide() { dropKeys(); if (box) box.hidden = true; }
  R.open = () => {
    if (!box) build();
    R.go = null; R.busy = false; setBusy(false);
    box.hidden = false; mode = R;
    Sound.flare(false); Sound.muffle(false); Sound.play(SONGS.title); Sound.setLevel(0); Sound.ambience({ wind: 0.15 });
  };
  R.isOpen = () => !!box && !box.hidden;
  // (For trying it out without Claude: a scene straight in.)
  R.clean = clean; R.prompt = prompt; R.enter = (sc) => enter(clean(sc));
  return R;
})();
