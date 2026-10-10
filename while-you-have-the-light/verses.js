"use strict";
// The verses on the rock. They are the Douay-Rheims by default (Psalm 118 in the Vulgate's
// numbering; climb.js holds them). Or they are the player's own, in another translation (the
// Grail from the breviary, say): put in from a text file or pasted in, and kept on this device.
// The blank form names the twenty-two stanzas, Aleph to Tau, with the verse used from each. The
// Douay of each is there as a note, to find the place by. The verse used from a stanza can be
// changed in the form, and so can the psalm's number (119, as the breviary numbers it).

const Verses = (() => {
  const KEY = "wyhtl-verses";
  // Each stanza: its letter, the name the Douay gives it, the verse of it used, and the other ways its name is spelt.
  const STANZAS = [
    ["א", "ALEPH", 1, "ALEF"], ["ב", "BETH", 11, "BET|VETH"], ["ג", "GIMEL", 18, "GIMMEL|GHIMEL"], ["ד", "DALETH", 25, "DALET"],
    ["ה", "HE", 33, "HEH"], ["ו", "VAU", 45, "VAV|WAW|WAU|VAW"], ["ז", "ZAIN", 54, "ZAYIN"], ["ח", "HETH", 62, "HET|CHETH|CHET|KHETH"],
    ["ט", "TETH", 71, "TET"], ["י", "JOD", 73, "YOD|YODH|IOD"], ["כ", "CAPH", 81, "KAPH|KAF"], ["ל", "LAMED", 89, "LAMEDH"],
    ["מ", "MEM", 103, ""], ["נ", "NUN", 105, ""], ["ס", "SAMECH", 114, "SAMEKH|SAMEK"], ["ע", "AIN", 125, "AYIN"],
    ["פ", "PHE", 130, "PE|PEH|FE"], ["צ", "SADE", 137, "TSADE|TSADDI|TZADDI|SADHE|TSADHE|ZADE"], ["ק", "COPH", 147, "QOPH|QOF|KOPH|KOF"],
    ["ר", "RES", 160, "RESH"], ["ש", "SIN", 164, "SHIN|SCHIN"], ["ת", "TAU", 176, "TAV|TAW|THAU"],
  ];
  const which = (word) => { const w = word.toUpperCase(); return STANZAS.findIndex(([, n, , alt]) => n === w || (alt && alt.split("|").includes(w))); };
  const V = { custom: null };
  try { const j = JSON.parse(localStorage.getItem(KEY) || "null"); if (j && Array.isArray(j.list) && j.list.length === 22) V.custom = j; } catch (e) { }
  V.list = () => (V.custom ? V.custom.list : CLIMB_VERSES);
  V.label = () => "PSALM " + (V.custom ? V.custom.psalm : 118);
  V.name = () => (V.custom ? "Your own (" + V.custom.src + "), Psalm " + V.custom.psalm : "Douay-Rheims, Psalm 118");

  // The blank form, to be filled in.
  V.form = function () {
    const L = ["# While You Have the Light: the verses on the rock, in your own translation.",
      "# One verse for each letter of the psalm, Aleph to Tau. Write each after its letter's colon",
      "# (it may go on over the next lines). Lines that begin with # are notes, and are left out.",
      "# The number in brackets is the verse used: change it to use another verse of that stanza.",
      "# The line below gives the psalm's number as it will be shown: 119 is the breviary's.",
      "", "PSALM 119", ""];
    STANZAS.forEach(([, name, n], i) => { L.push(name + " [" + n + "]: ", "# Douay: " + CLIMB_VERSES[i][3], ""); });
    return L.join("\n");
  };
  // Reading a filled-in form; or JSON: twenty-two strings, or { psalm, verses: [{ verse, text }] };
  // or a whole psalter (a "selah pack": every psalm, verse by verse), from which the verse of each
  // stanza is taken, out of Psalm 118 as the Vulgate numbers it, or 119 as the Hebrew does.
  V.parse = function (text) {
    text = String(text || "").replace(/^\uFEFF/, "");
    const out = STANZAS.map(([g, name, n]) => [g, name, n, ""]);
    let psalm = 119, src = "";
    const t = text.trim();
    if (t[0] === "[" || t[0] === "{") {
      let j;
      try { j = JSON.parse(t); } catch (e) { return { error: "That file is not a form this can read." }; }
      if (j && !Array.isArray(j) && j.selahPack && Array.isArray(j.psalms)) {
        psalm = /hebr|masor/i.test(String(j.numbering || "")) ? 119 : 118;
        const P = j.psalms.find((p) => p && +p.n === psalm);
        if (!P || !Array.isArray(P.verses)) return { error: "There is no Psalm " + psalm + " in that psalter." };
        out.forEach((o) => { const v = P.verses.find((q) => q && +q.v === o[2]); if (v) o[3] = Array.isArray(v.lines) ? v.lines.join(" ") : String(v.text || ""); });
        src = String(j.displayName || j.name || "").slice(0, 40);
      } else {
        const arr = Array.isArray(j) ? j : (j && j.verses) || [];
        if (!Array.isArray(j) && j && Number.isFinite(+j.psalm)) psalm = +j.psalm;
        arr.slice(0, 22).forEach((v, i) => { if (typeof v === "string") out[i][3] = v.trim(); else if (v) { out[i][3] = String(v.text || "").trim(); if (Number.isFinite(+v.verse)) out[i][2] = +v.verse; } });
      }
    } else {
      let cur = -1, heads = 0;
      for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line[0] === "#") { if (!line && cur >= 0 && out[cur][3]) out[cur][3] += "\n"; continue; }
        const ps = line.match(/^PSALM\s+(\d{1,3})\s*$/i);
        if (ps) { psalm = +ps[1]; continue; }
        // A letter's line: its name; the verse in brackets, if any; a colon (or nothing more).
        const m = line.match(/^([A-Za-z]+)\s*(?:\[\s*(\d{1,3})\s*\])?\s*(?::\s*(.*))?$/);
        const k = m && (m[2] !== undefined || m[3] !== undefined || line.toUpperCase() === m[1].toUpperCase()) ? which(m[1]) : -1;
        if (k >= 0) { cur = k; heads++; out[k][1] = m[1].toUpperCase(); if (m[2]) out[k][2] = +m[2]; out[k][3] = (m[3] || "").trim(); continue; }
        if (cur >= 0) out[cur][3] = (out[cur][3] + " " + line).trim();
      }
      // No letters at all: twenty-two paragraphs, in order, will do.
      if (!heads) {
        const paras = text.split(/\n\s*\n/).map((p) => p.split(/\r?\n/).filter((l) => l.trim() && l.trim()[0] !== "#").join(" ").trim()).filter(Boolean);
        if (paras.length >= 22) paras.slice(0, 22).forEach((p, i) => { out[i][3] = p; });
      }
    }
    for (const v of out) v[3] = v[3].replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim();
    const filled = out.filter((v) => v[3]).length;
    if (!filled) return { error: "No verses found in it. Is it the filled-in form?" };
    // (Any left empty keep the Douay.)
    // (Each with its psalm's number as it is to be shown: the Douay's left in, 118.)
    out.forEach((v, i) => { if (!v[3]) { v[1] = CLIMB_VERSES[i][1]; v[2] = CLIMB_VERSES[i][2]; v[3] = CLIMB_VERSES[i][3]; v[4] = 118; } else v[4] = psalm; });
    return { list: out, psalm, filled, src };
  };
  V.use = function (p, src) {
    V.custom = { list: p.list, psalm: p.psalm, src: String(src || "pasted").slice(0, 40), filled: p.filled };
    try { localStorage.setItem(KEY, JSON.stringify(V.custom)); } catch (e) { }
    keep();
  };
  V.reset = function () { V.custom = null; try { localStorage.removeItem(KEY); } catch (e) { } keep(); };

  // On claude.ai the device may forget them between visits. There they are also kept in the player's
  // own private place, which only they can read, and taken from it at the start. (Going back to the
  // Douay is kept there too, so another device does not bring the old verses back.)
  let cloud = null;
  function keep() {
    if (!cloud) return;
    cloud.set({ json: V.custom ? JSON.stringify(V.custom) : "", t: Date.now() }).catch(() => { });
  }
  try {
    const C = window.claude;
    if (C && C.use) Promise.all([C.use("db"), C.use("user")]).then(async ([db, user]) => {
      if (!db || !user || !user.id) return;
      const id = await user.id(); if (!id) return;
      const ref = db.collection("data/users/" + id).doc("verses"), s = await ref.get();
      cloud = ref;
      if (!s.exists) { if (V.custom) keep(); return; }
      const d = s.data() || {};
      let j = null; try { j = d.json ? JSON.parse(d.json) : null; } catch (e) { }
      if (j && Array.isArray(j.list) && j.list.length === 22) {
        V.custom = j; try { localStorage.setItem(KEY, JSON.stringify(j)); } catch (e) { }
      } else if (d.json === "") { V.custom = null; try { localStorage.removeItem(KEY); } catch (e) { } }
      if (box && !box.hidden) show();
    }).catch(() => { });
  } catch (e) { }

  // ---- The box for it, over the pause screen ----
  let box = null, ta = null, msg = null, now = null, showAgain = 0;
  function build() {
    const st = document.createElement("style");
    st.textContent = `
      #verse-box { position: fixed; inset: 0; z-index: 10; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box;
        background: rgba(3,3,5,0.8); touch-action: auto; -webkit-user-select: text; user-select: text; font-family: Montserrat, "Helvetica Neue", Arial, sans-serif; color: #e9e6df; }
      #verse-box[hidden] { display: none; }
      #verse-panel { width: 100%; max-width: 600px; max-height: 100%; overflow: auto; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px;
        background: #0d0c0f; border: 1px solid rgba(255,179,71,0.45); border-radius: 6px; padding: 16px; }
      #verse-title { font-family: Cinzel, Georgia, serif; font-weight: 700; letter-spacing: 0.12em; font-size: 15px; color: #fff; margin: 0; }
      #verse-now { font-size: 12px; color: #ffcf8a; margin: 0; }
      #verse-help { font-size: 12px; line-height: 1.45; color: #b9b3a6; margin: 0; }
      #verse-text { width: 100%; box-sizing: border-box; min-height: 110px; resize: vertical; font: 16px/1.4 Montserrat, "Helvetica Neue", Arial, sans-serif;
        color: #f1ede4; background: #050506; border: 1px solid rgba(233,230,223,0.25); border-radius: 4px; padding: 10px; -webkit-user-select: text; user-select: text; }
      #verse-text:focus { outline: 2px solid rgba(255,179,71,0.7); outline-offset: 1px; }
      .verse-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
      #verse-msg { font-size: 12px; color: #ffcf8a; min-height: 1em; }
      .verse-btn { font: 800 11px Montserrat, "Helvetica Neue", Arial, sans-serif; letter-spacing: 0.1em; padding: 10px 12px; border-radius: 4px; cursor: pointer;
        border: 1px solid rgba(233,230,223,0.3); background: #141217; color: #e9e6df; }
      .verse-btn.hot { border-color: #ffb347; background: rgba(255,179,71,0.18); color: #fff3dc; }
      .verse-btn:focus-visible { outline: 2px solid #ffb347; outline-offset: 2px; }
      #verse-file { display: none; }`;
    document.head.appendChild(st);
    box = document.createElement("div"); box.id = "verse-box"; box.hidden = true;
    box.innerHTML = `<div id="verse-panel" role="dialog" aria-labelledby="verse-title">
      <p id="verse-title">THE VERSES ON THE ROCK</p>
      <p id="verse-now"></p>
      <p id="verse-help">To use another translation: choose a psalter file (such as a Grail pack), or the blank form filled in with each verse after its letter; or paste the filled-in form in the box and use that. Only the twenty-two verses are kept, and only for you.</p>
      <div class="verse-row"><button type="button" class="verse-btn" id="verse-save">SAVE THE BLANK FORM</button><button type="button" class="verse-btn" id="verse-show">SHOW IT HERE</button><button type="button" class="verse-btn hot" id="verse-choose">CHOOSE THE FILE</button><input type="file" id="verse-file" accept=".txt,.json,text/plain,application/json"></div>
      <textarea id="verse-text" placeholder="…or paste the filled-in form here"></textarea>
      <div class="verse-row"><button type="button" class="verse-btn hot" id="verse-paste">USE THE TEXT IN THE BOX</button><button type="button" class="verse-btn" id="verse-douay">BACK TO THE DOUAY</button><button type="button" class="verse-btn" id="verse-close">CLOSE</button></div>
      <span id="verse-msg" aria-live="polite"></span></div>`;
    document.body.appendChild(box);
    for (const t of ["pointerdown", "pointermove", "pointerup", "pointercancel", "touchstart", "touchend", "touchcancel", "keydown", "keyup", "contextmenu", "wheel"]) box.addEventListener(t, (e) => e.stopPropagation());
    ta = box.querySelector("#verse-text"); msg = box.querySelector("#verse-msg"); now = box.querySelector("#verse-now");
    // (What is typed or pasted in the box is kept as it is written, so leaving does not lose it.)
    try { ta.value = localStorage.getItem(KEY + "-draft") || ""; } catch (e) { }
    ta.addEventListener("input", () => { try { localStorage.setItem(KEY + "-draft", ta.value); } catch (e) { } });
    const file = box.querySelector("#verse-file");
    box.querySelector("#verse-close").addEventListener("click", close);
    box.querySelector("#verse-douay").addEventListener("click", () => { V.reset(); show(); msg.textContent = "The Douay-Rheims again."; });
    box.querySelector("#verse-show").addEventListener("click", () => {
      // (Over text already in the box, only at a second press: a dialog may not be allowed here.)
      if (ta.value.trim() && ta.value !== V.form() && !(showAgain > performance.now())) { showAgain = performance.now() + 4000; msg.textContent = "There is writing in the box. Press SHOW IT HERE again to put the blank form in its place."; return; }
      showAgain = 0;
      ta.value = V.form(); try { localStorage.setItem(KEY + "-draft", ta.value); } catch (e) { }
      msg.textContent = "The blank form is in the box: write each verse after its letter, then USE THE TEXT IN THE BOX.";
    });
    box.querySelector("#verse-save").addEventListener("click", () => {
      try {
        const url = URL.createObjectURL(new Blob([V.form()], { type: "text/plain" })), a = document.createElement("a");
        a.href = url; a.download = "verses-form.txt"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
        msg.textContent = "Saved as verses-form.txt (if nothing came, use SHOW IT HERE).";
      } catch (e) { msg.textContent = "It could not be saved here: use SHOW IT HERE."; }
    });
    box.querySelector("#verse-choose").addEventListener("click", () => { file.value = ""; file.click(); });
    file.addEventListener("change", () => {
      const f = file.files && file.files[0]; if (!f) return;
      if (f.size > 8e6) { msg.textContent = "That file is too big to be a form or a psalter."; return; }
      const r = new FileReader();
      r.onload = () => take(String(r.result || ""), f.name.replace(/\.[^.]*$/, ""));
      r.onerror = () => { msg.textContent = "That file could not be read."; };
      r.readAsText(f);
    });
    box.querySelector("#verse-paste").addEventListener("click", () => take(ta.value, "pasted"));
    ta.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }
  function take(text, src) {
    const p = V.parse(text);
    if (p.error) { msg.textContent = p.error; return; }
    V.use(p, p.src || src); show();
    msg.textContent = p.filled === 22 ? "All twenty-two verses taken in." : p.filled + " of the twenty-two taken in; the rest are the Douay's.";
  }
  function show() { now.textContent = "Now: " + V.name() + (V.custom && V.custom.filled < 22 ? " (" + V.custom.filled + " of 22 verses yours)" : ""); }
  V.open = function () { if (!box) build(); show(); msg.textContent = ""; box.hidden = false; };
  function close() { if (box) box.hidden = true; }
  V.isOpen = () => !!box && !box.hidden;
  return V;
})();
