"use strict";
// Notes for Claude. On the copy of the game kept on claude.ai (and only there: the page can tell,
// because only there can it keep anything), the climb's pause screen has a button for a note: what
// happened, what should change. The note is saved with a picture of the moment the pause began and
// the game's own record of the last half-minute (where he was, what he and the demons near him were
// doing, the blows, the ward, the blocks), in the page's store, where Claude reads it.

const Notes = (() => {
  const VERSION = "v=20261010o";                 // (kept in step with index.html's)
  const N = { ready: false, db: null, assets: null };
  const C = window.claude;
  if (C && typeof C.use === "function") {
    C.use("db").then((db) => { N.db = db; N.ready = !!db; }).catch(() => { });
    C.use("assets").then((a) => { N.assets = a; }).catch(() => { });
  }

  let box = null, ta = null, msg = null, sendB = null, shot = null, rec = null, busy = false;
  // The note box: over the pause screen, in the game's own dark and flame, large enough to type in
  // on a tablet. It keeps every tap and key to itself, so the game under it hears nothing.
  function build() {
    const st = document.createElement("style");
    st.textContent = `
      #note-box { position: fixed; inset: 0; z-index: 10; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box;
        background: rgba(3,3,5,0.78); touch-action: auto; -webkit-user-select: text; user-select: text; font-family: Montserrat, "Helvetica Neue", Arial, sans-serif; color: #e9e6df; }
      #note-box[hidden] { display: none; }
      #note-panel { width: 100%; max-width: 560px; max-height: 100%; overflow: auto; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px;
        background: #0d0c0f; border: 1px solid rgba(255,179,71,0.45); border-radius: 6px; padding: 16px; }
      #note-head { display: flex; gap: 12px; align-items: center; }
      #note-head img { width: 132px; max-width: 34%; border-radius: 3px; border: 1px solid rgba(233,230,223,0.15); flex: none; }
      #note-title { font-family: Cinzel, Georgia, serif; font-weight: 700; letter-spacing: 0.12em; font-size: 15px; color: #fff; margin: 0; }
      #note-sub { font-size: 12px; line-height: 1.4; color: #b9b3a6; margin: 4px 0 0; }
      #note-text { width: 100%; box-sizing: border-box; min-height: 96px; resize: vertical; font: 16px/1.4 Montserrat, "Helvetica Neue", Arial, sans-serif;
        color: #f1ede4; background: #050506; border: 1px solid rgba(233,230,223,0.25); border-radius: 4px; padding: 10px; -webkit-user-select: text; user-select: text; }
      #note-text:focus { outline: 2px solid rgba(255,179,71,0.7); outline-offset: 1px; }
      #note-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
      #note-msg { flex: 1 1 160px; min-width: 0; font-size: 12px; color: #ffcf8a; }
      .note-btn { font: 800 12px Montserrat, "Helvetica Neue", Arial, sans-serif; letter-spacing: 0.12em; padding: 10px 16px; border-radius: 4px; cursor: pointer;
        border: 1px solid rgba(233,230,223,0.3); background: #141217; color: #e9e6df; }
      .note-btn.hot { border-color: #ffb347; background: rgba(255,179,71,0.18); color: #fff3dc; }
      .note-btn:focus-visible { outline: 2px solid #ffb347; outline-offset: 2px; }
      .note-btn:disabled { opacity: 0.5; cursor: default; }`;
    document.head.appendChild(st);
    box = document.createElement("div"); box.id = "note-box"; box.hidden = true;
    box.innerHTML = `<div id="note-panel" role="dialog" aria-labelledby="note-title">
      <div id="note-head"><img id="note-shot" alt="The moment the game was paused"><div><p id="note-title">A NOTE FOR CLAUDE</p>
      <p id="note-sub">What happened, or what should change. It is sent with this picture and the game's record of the last half-minute.</p></div></div>
      <textarea id="note-text" placeholder="The shield went away when I hit the demon..."></textarea>
      <div id="note-row"><span id="note-msg" aria-live="polite"></span><button type="button" class="note-btn" id="note-cancel">CANCEL</button><button type="button" class="note-btn hot" id="note-send">SEND</button></div></div>`;
    document.body.appendChild(box);
    for (const t of ["pointerdown", "pointermove", "pointerup", "pointercancel", "touchstart", "touchend", "touchcancel", "keydown", "keyup", "contextmenu", "wheel"]) box.addEventListener(t, (e) => e.stopPropagation());
    ta = box.querySelector("#note-text"); msg = box.querySelector("#note-msg"); sendB = box.querySelector("#note-send");
    box.querySelector("#note-cancel").addEventListener("click", close);
    sendB.addEventListener("click", send);
    ta.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); });
    try { ta.value = localStorage.getItem("wyhtl-note-draft") || ""; } catch (e) { }
    ta.addEventListener("input", () => { try { localStorage.setItem("wyhtl-note-draft", ta.value); } catch (e) { } });
  }
  N.open = function (pic, record) {
    if (!N.ready) return;
    if (!box) build();
    shot = pic || null; rec = record || null; busy = false; sendB.disabled = false; msg.textContent = "";
    const img = box.querySelector("#note-shot");
    try { if (shot) { img.src = shot.toDataURL("image/jpeg", 0.6); img.hidden = false; } else img.hidden = true; } catch (e) { img.hidden = true; }
    box.hidden = false;
    // (Within the tap itself, so a tablet raises its keyboard; and again a moment later, for the rest.)
    try { ta.focus(); } catch (e) { }
    setTimeout(() => { try { if (document.activeElement !== ta) ta.focus(); } catch (e) { } }, 60);
  };
  function close() { if (box) box.hidden = true; busy = false; }
  N.isOpen = () => !!box && !box.hidden;

  async function send() {
    if (busy) return;
    const text = ta.value.trim();
    if (!text) { msg.textContent = "Write a few words first."; ta.focus(); return; }
    busy = true; sendB.disabled = true; msg.textContent = "Sending…";
    // The picture first (if this view may store one), then the note, which points to it.
    let picture = null;
    if (shot && N.assets) {
      try {
        const blob = await new Promise((res) => shot.toBlob(res, "image/jpeg", 0.82));
        if (blob) picture = (await N.assets.upload(blob, { type: "image/jpeg" })).id;
      } catch (e) { picture = null; }
    }
    const note = { text, at: new Date().toISOString(), version: VERSION, picture,
      screen: { w: innerWidth, h: innerHeight, touch: typeof usingKeys === "function" ? !usingKeys() : null }, game: rec };
    // (A store document holds 256 KiB: if the record is too long, the oldest of it goes.)
    while (note.game && note.game.recent && note.game.recent.length > 8 && JSON.stringify(note).length > 230000) note.game.recent = note.game.recent.slice(Math.floor(note.game.recent.length / 2));
    try {
      await N.db.collection("notes").add(note);
      msg.textContent = "Sent. Claude can read it now.";
      ta.value = ""; try { localStorage.removeItem("wyhtl-note-draft"); } catch (e) { }
      setTimeout(close, 1100);
    } catch (e) {
      const code = e && e.code;
      msg.textContent = code === "quota_exceeded" ? "The notes store is full. Ask Claude to clear old notes."
        : code === "unavailable" || code === "resource_exhausted" ? "It could not be sent just now. Wait a moment and press Send again."
        : code === "revoked" || code === "not_granted" ? "This page can no longer save notes. Reload it and try again."
        : "It could not be sent. Your note is kept here; press Send to try again.";
      busy = false; sendB.disabled = false;
    }
  }
  return N;
})();
