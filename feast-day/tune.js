import { C } from './config.js';
// Pause button. In the claude.ai artifact (db available): sliders for every C number + feedback box.
const css = `
#pz{position:fixed;top:8px;right:8px;z-index:9;font:16px sans-serif;width:40px;height:40px;border-radius:50%;
 border:2px solid #fff8;background:#0005;color:#fff}
#pp{position:fixed;inset:0;z-index:8;display:none;overflow:auto;background:#1b1420e8;color:#eee;font:13px sans-serif;padding:16px 16px 60px}
#pp h2{margin:0 0 8px;font-size:18px}#pp label{display:grid;grid-template-columns:110px 1fr 60px;gap:8px;align-items:center;margin:2px 0}
#pp textarea{width:100%;box-sizing:border-box;height:70px;margin-top:6px}#pp button{margin:6px 6px 0 0;padding:6px 12px}
#pp .row{max-width:520px}`;
export function makeTune(scene, monk, level = 'test') {
  const el = (t, p, h) => { const e = document.createElement(t); if (h) e.innerHTML = h; p.appendChild(e); return e; };
  el('style', document.head, css);
  const btn = el('button', document.body, '❚❚'); btn.id = 'pz';
  const panel = el('div', document.body); panel.id = 'pp';
  el('h2', panel, 'Paused');
  const resume = el('button', panel, 'Resume');
  const tools = el('div', panel); tools.className = 'row';
  let paused = false;
  const toggle = () => {
    paused = !paused;
    panel.style.display = paused ? 'block' : 'none';
    btn.textContent = paused ? '▶' : '❚❚';
    scene.input.keyboard.enabled = !paused;
    if (paused) { scene.input.keyboard.disableGlobalCapture(); scene.scene.pause(); }
    else { scene.input.keyboard.enableGlobalCapture(); scene.physics.world.gravity.y = C.gravity; scene.scene.resume(); }
  };
  btn.onclick = resume.onclick = toggle;
  addEventListener('keydown', e => { if (e.key === 'Escape' || (e.key === 'p' && e.target.tagName !== 'TEXTAREA')) toggle(); });
  window.claude?.use?.('db').then(db => db && devTools(tools, db, monk, level, el));
}
function devTools(tools, db, monk, level, el) {
  el('h2', tools, 'Feedback');
  const box = el('textarea', tools); box.placeholder = 'What feels wrong or right?';
  const send = el('button', tools, 'Send'), note = el('span', tools);
  send.onclick = async () => {
    if (!box.value.trim()) return;
    const b = monk.box;
    note.textContent = 'Saving…';
    try {
      await db.collection('feedback').add({ text: box.value.trim(), level, x: Math.round(b.x), y: Math.round(b.y),
        state: monk.state, C: { ...C }, at: new Date().toISOString() });
      box.value = ''; note.textContent = 'Saved. Thank you!';
    } catch (e) { note.textContent = 'Not saved: ' + (e.code || e.message); }
  };
  el('h2', tools, 'Tuning');
  const start = { ...C };
  for (const k of Object.keys(C)) {
    const row = el('label', tools, `<span>${k}</span>`);
    const max = (start[k] || 1) * 3, s = el('input', row), n = el('span', row, C[k]);
    Object.assign(s, { type: 'range', min: 0, max, step: max / 300, value: C[k] });
    s.oninput = () => { C[k] = +(+s.value).toPrecision(3); n.textContent = C[k]; };
  }
}
