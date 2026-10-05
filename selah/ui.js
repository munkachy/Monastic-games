"use strict";
// SELAH: the screens around the play. The title, the psalms, settings, calibration, pause and
// results; the saves; and the Voice: the Douay, built in, or a psalter the player imports from
// their own device (a Grail file), kept in this browser on this device and never sent anywhere.
const UI = (() => {
  const $ = (id) => document.getElementById(id);
  const U = {};
  // The psalms in this build: their songs and their colors.
  const PSALMS = [
    { n: 1, song: "ps1", mood: "#e8b04a" },
    { n: 2, song: "ps2", mood: "#e2563c" },
    { n: 3, song: "ps3", mood: "#5ab6cc" },
    { n: 4, song: "ps4", mood: "#8f86e0" },
    { n: 90, song: "ps90", mood: "#3fb59c" },
    { n: 116, song: "ps116", mood: "#f0905a" },
    { n: 133, song: "ps133", mood: "#4f6fe0" },
    { n: 150, song: "ps150", mood: "#f2d27a", spectrum: true },
  ];
  const params = new URLSearchParams(location.search);

  // ---- The save --------------------------------------------------------------------------------------
  const KEY = "selah.v1";
  // kit: which kit sounds ("song": each song's own); song, yours: the levels (%) of the song's own drum
  // part and of the drums the player's hits play, for the whole kit (all) and for each drum
  const EVEN = { all: 100, kick: 100, snare: 100, hats: 100, toms: 100, cymbals: 100 }, YOURS = Object.assign({}, EVEN, { all: 70 });
  let save = { settings: { voice: "douay", offset: 0, speed: 5, music: 80, kit: "song", song: Object.assign({}, EVEN), yours: Object.assign({}, YOURS), noFlash: false, reducedMotion: false }, records: {} };
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.settings) {
      const o = s.settings;
      // from the first drums page: one volume and one mix, for the song's drums; and the old hit-tick switch
      if (!o.song && o.mix) o.song = Object.assign({ all: Math.min(100, Math.round((o.drums === undefined ? 80 : o.drums) / 0.8)) }, o.mix);
      if (!o.yours && o.hits === false) o.yours = Object.assign({}, YOURS, { all: 0 });
      save = { settings: Object.assign(save.settings, o, { song: Object.assign({}, EVEN, o.song), yours: Object.assign({}, YOURS, o.yours) }), records: s.records || {} };
      delete save.settings.mix; delete save.settings.drums; delete save.settings.hits;
    }
  } catch (e) { }
  let fresh = true; try { fresh = !localStorage.getItem(KEY); } catch (e) { }
  if (fresh && window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) save.settings.reducedMotion = true;
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { } };
  const set = () => save.settings;

  // ---- The Grail file, kept on this device ---------------------------------------------------------
  function db(mode, fn) {
    return new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error("no storage"));
      const r = indexedDB.open("selah", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("packs");
      r.onerror = () => rej(r.error);
      r.onsuccess = () => {
        const d = r.result, tx = d.transaction("packs", mode), q = fn(tx.objectStore("packs"));
        tx.oncomplete = () => { d.close(); res(q.result); };
        tx.onerror = tx.onabort = () => { d.close(); rej(tx.error); };
      };
    });
  }
  let grail = null;            // the parsed pack, once loaded
  function loadGrail() {
    if (grail) return Promise.resolve(grail);
    return db("readonly", (s) => s.get("grail")).catch(() => null).then((text) => { grail = text ? JSON.parse(text) : null; return grail; });
  }
  // A psalm from a pack, in the Douay's numbering (a Hebrew-numbered pack is gathered and split).
  function packPsalm(pack, n) {
    if (!pack) return null;
    if (pack.numbering === "vulgate") return pack.psalms.find((p) => p.n === n) || null;
    const parts = [];
    for (const p of pack.psalms) for (const v of p.verses) { const m = SelahPack.toVulgate("hebrew", p.n, v.v); if (m.n === n) parts.push({ part: m.part, v }); }
    if (!parts.length) return null;
    parts.sort((a, b) => a.part - b.part);
    return { n, incipit: "", verses: parts.map((x) => x.v) };
  }
  // The text a psalm is played in, and what the HUD calls it.
  function textFor(n) {
    const d = DOUAY.psalms[n - 1];
    if (set().voice === "grail" && grail) {
      const g = packPsalm(grail, n);
      if (g) return { psalm: g, label: grail.displayName || "Grail" };
      return { psalm: d, label: "Douay (not in your Grail file)" };
    }
    return { psalm: d, label: "Douay" };
  }

  // ---- Screens -------------------------------------------------------------------------------------------
  function show(id) {
    for (const s of document.querySelectorAll(".screen")) { if (s.id === id) { s.classList.add("on"); requestAnimationFrame(() => s.classList.add("show")); } else { s.classList.remove("on", "show"); } }
  }
  const sheet = (id, on) => $(id).classList.toggle("on", on);
  let begun = false;
  function begin() {
    if (begun) { if (!Game.running()) toSelect(); return; }
    begun = true;
    Sound.init();
    Sound.setMusicVolume(set().music / 100);
    applyDrums();
    // Sideways, and full screen, where the phone allows it.
    try {
      const el = document.documentElement, fs = el.requestFullscreen || el.webkitRequestFullscreen;
      const lock = () => { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => { }); } catch (e) { } };
      if (fs && matchMedia("(pointer: coarse)").matches) { const r = fs.call(el); if (r && r.then) r.then(lock, () => { }); else lock(); }
    } catch (e) { }
    Sound.play(SONGS.title);
    toSelect();
  }
  // Back to the title, the title song still playing; a tap there comes back to the psalms.
  function toTitle() { sheet("settings", false); show("title"); }
  $("homeBtn").onclick = () => { Sound.ui(false); toTitle(); };
  $("brandBtn").onclick = () => { Sound.ui(false); toTitle(); };
  function toSelect() {
    Game.stop(); $("pauseBtn").style.display = "none"; $("screen").style.visibility = "hidden";
    sheet("results", false); sheet("pause", false);
    if (Sound.song() !== SONGS.title) Sound.play(SONGS.title);
    renderCards(); show("select");
  }

  // The psalms: one card each, with a button for every rank.
  function renderCards() {
    const box = $("cards");
    box.innerHTML = "";
    $("voiceName").textContent = "Voice: " + (set().voice === "grail" && grail ? (grail.displayName || "Grail") : "Douay");
    for (const P of PSALMS) {
      const song = SONGS[P.song];
      const c = document.createElement("div");
      c.className = "card"; c.style.setProperty("--mood", P.mood);
      const vkey = set().voice === "grail" && grail ? "grail" : "douay";
      c.innerHTML = '<div class="top"><div class="caps">Psalm</div><button class="listen">▸ Listen</button></div><div class="num">' + P.n + '</div><div class="inc"></div><div class="meta"></div><div class="first"></div><div class="ranks"></div>';
      c.querySelector(".inc").textContent = "“" + song.title + "”";
      // its opening words, in the Voice chosen
      const first = textFor(P.n).psalm.verses.find((v) => !v.title);
      c.querySelector(".first").textContent = first ? first.lines.join(" ") : "";
      c.querySelector(".meta").textContent = song.genre + " · " + song.bpm + " bpm · " + song.meters;
      const ranks = c.querySelector(".ranks");
      for (const r of Compiler.RANK_ORDER) {
        const R = Compiler.RANKS[r], rec = save.records[vkey + ":" + P.n + ":" + r];
        const b = document.createElement("button");
        b.className = "rank";
        b.innerHTML = "<b></b><span></span>";
        b.querySelector("b").textContent = R.name;
        b.querySelector("span").innerHTML = rec ? String(rec.score).padStart(7, "0") + '<em class="g' + (rec.grade === "AMEN" ? " amen" : "") + '">' + rec.grade + (rec.fc && rec.grade !== "AMEN" ? " ◦" : "") + "</em>" : R.what;
        b.onclick = () => { Sound.ui(true); play(P, r, false); };
        ranks.appendChild(b);
      }
      c.querySelector(".listen").onclick = () => { Sound.ui(true); play(P, "memoria", true); };
      box.appendChild(c);
    }
  }

  // ---- A play --------------------------------------------------------------------------------------------
  let current = null;
  function play(P, rank, auto) {
    current = { P, rank, auto };
    let { psalm, label } = textFor(P.n);
    // For testing: ?verses=2 plays only the first verses.
    if (params.get("verses")) { let k = +params.get("verses"); psalm = Object.assign({}, psalm, { verses: psalm.verses.filter((v) => v.title || k-- > 0) }); }
    const chart = Compiler.compile(psalm, SONGS[P.song], rank);
    show(""); sheet("results", false); sheet("pause", false);
    $("screen").style.visibility = "visible";
    $("pauseBtn").style.display = "block"; placePause();
    const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fonts.then(() => Game.start(chart, {
      song: SONGS[P.song], voice: label, mood: P.mood, spectrum: !!P.spectrum, auto: auto || params.get("auto") === "1",
      settings: set(), onEnd: (r) => results(P, rank, r, label),
    }));
  }
  function placePause() {
    const cvs = $("screen").getBoundingClientRect(), b = $("pauseBtn");
    b.style.left = (cvs.left + 8) + "px"; b.style.top = (cvs.top + 8) + "px";
  }
  addEventListener("resize", () => { if (Game.running()) placePause(); });
  function pause() { if (!Game.running() || Game.isPaused()) return; Game.pause(); sheet("pause", true); }
  $("pauseBtn").onclick = (e) => { e.stopPropagation(); pause(); };
  $("pResume").onclick = () => {
    sheet("pause", false);
    // three beats to find the place again
    const cnt = $("count"); let k = 3; cnt.style.display = "grid"; cnt.textContent = k;
    const step = () => { k--; if (k > 0) { cnt.textContent = k; setTimeout(step, 450); } else { cnt.style.display = "none"; Game.resume(); } };
    setTimeout(step, 450);
  };
  $("pRestart").onclick = () => { sheet("pause", false); Game.stop(); Sound.resume(); if (current) play(current.P, current.rank, current.auto); };
  $("pQuit").onclick = () => { sheet("pause", false); Sound.resume().then(toSelect); };
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
  addEventListener("orientationchange", () => setTimeout(() => { if (innerHeight > innerWidth) pause(); }, 200));

  // ---- Results --------------------------------------------------------------------------------------------
  function results(P, rank, r, label) {
    $("pauseBtn").style.display = "none";
    const vkey = set().voice === "grail" && grail && !/^Douay/.test(label) ? "grail" : "douay";
    const key = vkey + ":" + P.n + ":" + rank, old = save.records[key];
    if (!r.auto && (!old || r.score > old.score)) { save.records[key] = { score: r.score, grade: r.grade, fc: r.fc }; store(); }
    $("rGrade").textContent = r.grade; $("rGrade").className = "big" + (r.grade === "AMEN" ? " amen" : "");
    $("rRing").className = "ring" + (r.fc ? " fc" : "");
    $("rFc").textContent = r.auto ? "Listening" : r.all ? "All perfect" : r.fc ? "Full combo" : old && r.score > old.score ? "New best" : " ";
    $("rTitle").textContent = "Psalm " + P.n + " · " + Compiler.RANKS[rank].name + " · " + label;
    $("rScore").textContent = String(r.score).padStart(7, "0");
    const stat = (k, v) => "<div><b>" + v + "</b>" + k + "</div>";
    $("rStats").innerHTML = stat("Accuracy", (100 * r.accuracy).toFixed(2) + "%") + stat("Max combo", r.maxCombo + " / " + r.total) +
      stat("Perfect", r.n.perfect) + stat("Good", r.n.good) + stat("Bad", r.n.bad) + stat("Miss", r.n.miss);
    const tr = $("rTrack"); tr.innerHTML = "";
    for (const dt of r.early.slice(-200)) { const i = document.createElement("i"); i.style.left = (50 + Math.max(-1, Math.min(1, dt / 0.18)) * 50) + "%"; tr.appendChild(i); }
    const v = r.bestVerse;
    $("rVerse").innerHTML = "";
    if (v) {
      // the psalm's own words, without any said again
      const words = v.lines.map((l) => l.tokens.filter((x) => !x.rep).map((x) => x.text).join(" ")).join(" ");
      const vt = document.createElement("span"); vt.className = "vt"; vt.textContent = words; $("rVerse").appendChild(vt);
      const sm = document.createElement("small"); sm.textContent = "PSALM " + P.n + ":" + v.v; $("rVerse").appendChild(sm);
    }
    sheet("results", true);
  }
  $("rRetry").onclick = () => { sheet("results", false); if (current) play(current.P, current.rank, current.auto); };
  $("rBack").onclick = () => toSelect();

  // ---- Settings ------------------------------------------------------------------------------------------
  function openSettings() {
    const s = set();
    loadGrail().then(() => {
      for (const b of $("voiceSeg").children) { b.classList.toggle("on", b.dataset.v === (s.voice === "grail" && grail ? "grail" : "douay")); b.disabled = b.dataset.v === "grail" && !grail; }
      $("grailNote").textContent = grail ? (grail.name || grail.displayName) + " · " + grail.psalms.length + " psalms · kept on this device only, never sent anywhere." : "Grail is not included. If you own it, import a pack file.";
      $("grailImport").textContent = grail ? "Replace…" : "Import…";
      $("grailRemove").style.display = grail ? "" : "none";
      $("grailMsg").style.display = "none";
      $("offset").value = s.offset; $("offsetVal").textContent = s.offset + " ms";
      $("speed").value = s.speed; $("speedVal").textContent = s.speed;
      $("music").value = s.music; $("musicVal").textContent = s.music + "%";
      $("drumsNote").textContent = kitInfo(s.kit)[1] + " · the song's " + s.song.all + "% · yours " + s.yours.all + "%";
      $("noFlash").classList.toggle("on", s.noFlash); $("reduced").classList.toggle("on", s.reducedMotion);
      sheet("settings", true);
    });
  }
  $("setBtn").onclick = openSettings; $("voiceChip").onclick = openSettings;
  const closeSettings = () => { sheet("settings", false); store(); renderCards(); };
  $("setDone").onclick = closeSettings;
  $("setTitle").onclick = () => { closeSettings(); toTitle(); };
  // a tap on the dark around the sheet closes it too
  $("settings").addEventListener("click", (e) => { if (e.target === $("settings")) closeSettings(); });
  $("voiceSeg").onclick = (e) => { const b = e.target.closest("button"); if (!b || b.disabled) return; set().voice = b.dataset.v; store(); openSettings(); };
  $("offset").oninput = () => { set().offset = +$("offset").value; $("offsetVal").textContent = set().offset + " ms"; };
  $("speed").oninput = () => { set().speed = +$("speed").value; $("speedVal").textContent = set().speed; };
  $("music").oninput = () => { set().music = +$("music").value; $("musicVal").textContent = set().music + "%"; Sound.setMusicVolume(set().music / 100); };

  // ---- Drums: the kit; the song's drums and the player's hits, each drum's level -------------------------
  // The song stays as it is; its drum part and the player's hits are played on the chosen kit, each at
  // the levels set here. Your hits sound on the beat of their notes (game.js).
  const kitInfo = (id) => KIT_LIST.find((k) => k[0] === id) || KIT_LIST[0];
  function applyDrums() {
    const s = set();
    DRUMS.kit = kitInfo(s.kit)[0];
    for (const who of ["song", "yours"]) for (const k in EVEN) DRUMS[who][k] = (s[who][k] === undefined ? 100 : s[who][k]) / 100;
    // a missed note's soft knock goes with the player's hits
    Sound.hitVolume = s.yours.all > 0 ? 0.8 : 0;
  }
  function showDrums() {
    const s = set(), [, name, note] = kitInfo(s.kit);
    $("kitName").textContent = name; $("kitNote").textContent = note;
    for (const el of document.querySelectorAll("#drums .mix")) { const v = s[el.dataset.who][el.dataset.drum]; el.value = v; el.nextElementSibling.textContent = v + "%"; }
  }
  $("drumsOpen").onclick = () => { sheet("settings", false); showDrums(); sheet("drums", true); };
  const closeDrums = () => { sheet("drums", false); store(); openSettings(); };
  $("drumsDone").onclick = closeDrums;
  $("drums").addEventListener("click", (e) => { if (e.target === $("drums")) closeDrums(); });
  $("drumsPlay").onclick = () => drumDemo(DRUMS.kit);
  const stepKit = (d) => {
    const i = KIT_LIST.findIndex((k) => k[0] === kitInfo(set().kit)[0]);
    set().kit = KIT_LIST[(i + d + KIT_LIST.length) % KIT_LIST.length][0];
    applyDrums(); showDrums(); store();
    drumDemo(DRUMS.kit);
  };
  $("kitPrev").onclick = () => stepKit(-1); $("kitNext").onclick = () => stepKit(1);
  // each level: set as it slides, with a stroke of that drum to hear (a few a second at most)
  let lastOne = 0;
  for (const el of document.querySelectorAll("#drums .mix")) {
    el.oninput = () => {
      set()[el.dataset.who][el.dataset.drum] = +el.value; el.nextElementSibling.textContent = el.value + "%"; applyDrums();
      const now = performance.now(); if (now - lastOne > 160) { lastOne = now; drumOne(DRUMS.kit, el.dataset.drum, el.dataset.who); }
    };
    el.onchange = store;
  }
  // the song's drums down to the kick alone, for the player to play the rest
  $("mixKick").onclick = () => { Object.assign(set().song, { kick: 100, snare: 0, hats: 0, toms: 0, cymbals: 0 }); if (!set().song.all) set().song.all = 100; applyDrums(); showDrums(); store(); drumDemo(DRUMS.kit); };
  $("mixEven").onclick = () => { set().song = Object.assign({}, EVEN); set().yours = Object.assign({}, YOURS); applyDrums(); showDrums(); store(); drumDemo(DRUMS.kit); };
  const toggle = (id, k, after) => { $(id).onclick = () => { set()[k] = !set()[k]; $(id).classList.toggle("on", set()[k]); store(); after && after(); }; };
  toggle("noFlash", "noFlash"); toggle("reduced", "reducedMotion");
  // Import: read on the device, check, keep on the device. Nothing leaves it.
  $("grailImport").onclick = () => { $("grailFile").value = ""; $("grailFile").click(); };
  $("grailFile").onchange = () => {
    const f = $("grailFile").files[0], say = (t) => { $("grailMsg").textContent = t; $("grailMsg").style.display = "block"; };
    if (!f) return;
    if (f.size > SelahPack.MAX_BYTES) return say("That file is too large to be a pack (4 MB at most).");
    const rd = new FileReader();
    rd.onerror = () => say("Could not read that file.");
    rd.onload = () => {
      let p;
      try { p = JSON.parse(rd.result); } catch (e) { return say("That file is not a pack (it is not JSON)."); }
      const r = SelahPack.validate(p);
      if (!r.ok) return say("That pack has problems: " + r.errors.slice(0, 2).join("; ") + (r.errors.length > 2 ? "…" : ""));
      db("readwrite", (s) => s.put(rd.result, "grail")).then(() => {
        grail = p; set().voice = "grail"; store();
        try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }
        openSettings();
      }).catch(() => say("This browser would not keep the file. (Is it in private browsing?)"));
    };
    rd.readAsText(f);
  };
  $("grailRemove").onclick = () => {
    db("readwrite", (s) => s.delete("grail")).catch(() => { }).then(() => { grail = null; set().voice = "douay"; store(); openSettings(); });
  };

  // ---- Calibration ---------------------------------------------------------------------------------------
  // Twelve clicks at 100 a minute; the taps on the last eight, against the clicks, give the offset.
  let cal = null;
  $("calibBtn").onclick = () => { sheet("settings", false); sheet("calib", true); runCalib(); };
  function runCalib() {
    Sound.stop();
    const beat = 0.6, t0 = Sound.ctx().currentTime + 0.6;
    cal = { t0, beat, taps: [], result: null };
    for (let i = 0; i < 12; i++) Sound.click(t0 + i * beat, i % 4 === 0);
    $("calibOut").textContent = " ";
    clearTimeout(cal.timer);
    cal.timer = setTimeout(endCalib, (0.6 + 12 * beat + 0.4) * 1000);
  }
  $("calibPad").addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    if (!cal) return;
    const t = Sound.heard(ev.timeStamp > 1e12 || !ev.timeStamp ? performance.now() : ev.timeStamp) - cal.t0;
    const k = Math.round(t / cal.beat);
    if (k >= 4 && k < 12) cal.taps.push(t - k * cal.beat);
    $("calibPad").classList.add("flash"); setTimeout(() => $("calibPad").classList.remove("flash"), 90);
  });
  function endCalib() {
    if (!cal) return;
    const d = cal.taps.slice().sort((a, b) => a - b);
    if (d.length < 4) { $("calibOut").textContent = "Too few taps to tell. Try again."; return; }
    const mid = d.slice(Math.floor(d.length * 0.2), Math.ceil(d.length * 0.8)), avg = mid.reduce((a, b) => a + b, 0) / mid.length;
    cal.result = Math.round((set().offset + avg * 1000) / 5) * 5;
    cal.result = Math.max(-200, Math.min(300, cal.result));
    $("calibOut").textContent = "Your taps fell " + Math.abs(Math.round(avg * 1000)) + " ms " + (avg >= 0 ? "late" : "early") + " of the clicks. Offset: " + cal.result + " ms.";
  }
  $("calibAgain").onclick = runCalib;
  $("calibCancel").onclick = () => { clearTimeout(cal && cal.timer); cal = null; sheet("calib", false); Sound.play(SONGS.title); openSettings(); };
  $("calibSave").onclick = () => { if (cal && cal.result != null) { set().offset = cal.result; store(); } clearTimeout(cal && cal.timer); cal = null; sheet("calib", false); Sound.play(SONGS.title); openSettings(); };

  // ---- Start ---------------------------------------------------------------------------------------------
  Game.mount($("screen"));
  $("screen").style.visibility = "hidden";
  loadGrail().then(() => { if (set().voice === "grail" && !grail) set().voice = "douay"; });
  show("title");
  $("title").addEventListener("pointerup", begin);
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && Game.running()) pause();
    else if (e.key === "Escape" && $("drums").classList.contains("on")) closeDrums();
    else if (e.key === "Escape" && $("settings").classList.contains("on")) closeSettings();
    if (!begun && (e.key === "Enter" || e.key === " ")) begin();
  });
  // For testing: ?psalm=3&rank=festum starts that chart on the first tap.
  U.play = (n, rank, auto) => play(PSALMS.find((p) => p.n === n), rank || "memoria", !!auto);
  U.begin = begin;
  U.save = () => save;
  U.loadGrail = loadGrail;
  return U;
})();
