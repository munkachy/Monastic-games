# Usage: python3 artifact.py <output folder>
# Builds the claude.ai artifact copy of Pocket Sampler: the same app, with paths made
# local, the voice engine's wasm in two halves (an artifact file may be at most 15 MB),
# and a "Send to Claude" button that saves a note, the log and a screenshot for Claude.
import os, re, shutil, sys
R = '/home/user/Monastic-games'; OUT = sys.argv[1]
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT + '/vox-machina/lib'); os.makedirs(OUT + '/selah')
shutil.copytree(R + '/pocket-sampler/sounds', OUT + '/sounds')
app = open(R + '/pocket-sampler/app.js').read()
app = re.sub(r"\?v=\d+[a-z]*", '', app)
app = app.replace("'../vox-machina/engine.js'", "'./vox-machina/engine.js'").replace("'../selah/douay.js'", "'./selah/douay.js'")
assert '../vox-machina' not in app and '../selah' not in app
open(OUT + '/app.js', 'w').write(app)
shutil.copy(R + '/pocket-sampler/audio.js', OUT + '/audio.js')
shutil.copy(R + '/selah/douay.js', OUT + '/selah/douay.js')
shutil.copy(R + '/vox-machina/lib/espeak-ng.js', OUT + '/vox-machina/lib/espeak-ng.js')
w = open(R + '/vox-machina/lib/espeak-ng.wasm', 'rb').read(); h = len(w) // 2
open(OUT + '/vox-machina/lib/espeak-ng.1.wasm', 'wb').write(w[:h]); open(OUT + '/vox-machina/lib/espeak-ng.2.wasm', 'wb').write(w[h:])
eng = open(R + '/vox-machina/engine.js').read()
old = """    const url = new URL('./lib/espeak-ng.wasm', import.meta.url);
    const bytes = await (await fetch(url)).arrayBuffer();"""
assert old in eng
eng = eng.replace(old, """    // (artifact copy: the wasm comes in two halves)
    const parts = await Promise.all([1, 2].map(async i => new Uint8Array(await (await fetch(new URL('./lib/espeak-ng.' + i + '.wasm', import.meta.url))).arrayBuffer())));
    const bytes = new Uint8Array(parts[0].length + parts[1].length); bytes.set(parts[0]); bytes.set(parts[1], parts[0].length);""")
open(OUT + '/vox-machina/engine.js', 'w').write(eng)

page = open(R + '/pocket-sampler/index.html').read()
title = re.search(r'<title>.*?</title>', page, re.S).group(0)
style = re.search(r'<style>.*?</style>', page, re.S).group(0)
body = re.search(r'<body>(.*)</body>', page, re.S).group(1)
body = re.sub(r"\?v=\d+[a-z]*", '', body)
link = '<a href="../" title="Monastic Games">◂ Games</a>'
assert link in body
body = body.replace(link, '<button id="ccOpen" type="button">💬 Claude</button>')
extra = r"""
<style>
  #ccOpen { font: inherit; font-size: 10px; font-weight: 700; letter-spacing: .06em; border: 0; border-radius: 6px; padding: 4px 8px;
    background: #22546a; color: #e4eff3; text-transform: none; }
  #ccBox textarea { min-height: 90px; }
  #ccShot { max-width: 100%; max-height: 180px; object-fit: contain; border-radius: 6px; border: 1px solid #b7b09e; justify-self: start; }
</style>
<div id="ccBox" class="overlay" hidden>
  <div class="sheet">
    <b>Send to Claude</b>
    <textarea id="ccNote" aria-label="Your note" placeholder="What happened, or what you would like changed"></textarea>
    <img id="ccShot" alt="The screen as it was when you tapped the button">
    <label class="check"><input type="checkbox" id="ccWithShot" checked> Include this screenshot</label>
    <div class="btns"><button id="ccSend" class="go" type="button">Send</button><button id="ccCancel" type="button">Cancel</button></div>
    <p class="note" id="ccMsg">Sends your note, the app's log and settings, and the screenshot. Claude reads them from here; nothing else is sent.</p>
  </div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script type="module">
  const $ = id => document.getElementById(id);
  let shot = null;
  const dbP = window.claude?.use ? window.claude.use('db') : Promise.resolve(null);
  const assetsP = window.claude?.use ? window.claude.use('assets') : Promise.resolve(null);
  // The screenshot is taken first, so it shows the screen as it was, not this box.
  $('ccOpen').addEventListener('click', async () => {
    shot = null; $('ccShot').hidden = true; $('ccMsg').textContent = 'Taking a screenshot…';
    try {
      const c = await html2canvas(document.body, { backgroundColor: '#1b1a17', scale: Math.min(2, devicePixelRatio || 1),
        x: scrollX, y: scrollY, width: innerWidth, height: innerHeight, logging: false });
      shot = await new Promise(ok => c.toBlob(ok, 'image/png'));
      $('ccShot').src = URL.createObjectURL(shot); $('ccShot').hidden = false;
    } catch (e) { shot = null; }
    $('ccMsg').textContent = "Sends your note, the app's log and settings" + (shot ? ', and the screenshot' : '') + '. Claude reads them from here; nothing else is sent.';
    $('ccBox').hidden = false; $('ccNote').focus();
  });
  $('ccCancel').addEventListener('click', () => { $('ccBox').hidden = true; });
  $('ccSend').addEventListener('click', async () => {
    const db = await dbP, btn = $('ccSend');
    if (!db) { $('ccMsg').textContent = 'Sending needs you to be signed in to Claude on this page. Use the comment button instead.'; return; }
    btn.disabled = true; $('ccMsg').textContent = 'Sending…';
    try {
      let image = null;
      if (shot && $('ccWithShot').checked) { const a = await assetsP; if (a) image = (await a.upload(shot)).id; }
      const r = window.pocketDebug?.report?.() || {};
      let state = JSON.stringify(r.state || {}); if (state.length > 150000) state = state.slice(0, 150000);
      await db.collection('reports').add({ at: new Date().toISOString(), note: $('ccNote').value.trim(), build: r.build || '',
        log: (r.log || '').slice(-60000), state, image, screen: innerWidth + 'x' + innerHeight, ua: navigator.userAgent });
      $('ccNote').value = ''; $('ccMsg').textContent = 'Sent. Tell Claude in the chat, or keep playing.';
      setTimeout(() => { $('ccBox').hidden = true; }, 1200);
    } catch (e) { $('ccMsg').textContent = 'Could not send: ' + (e?.message || e); }
    btn.disabled = false;
  });
</script>
"""
open(OUT + '/index.html', 'w').write(title + '\n' + style + '\n' + body + extra)
print('built', OUT, sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(OUT) for f in fs) // 1e6, 'MB')
