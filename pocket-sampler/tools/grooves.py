# Usage: python3 grooves.py songs <groove folder> <renders.json>
#        python3 grooves.py pack <rendered folder> <sounds folder>
# Beats played by people: two bars from each of 16 performances in the Groove MIDI
# Dataset (Magenta; Gillick, Roberts, Engel, Eck and Bamman, 2019; CC BY 4.0;
# https://magenta.tensorflow.org/datasets/groove), ten drummers playing an electronic
# kit to a click, recorded as MIDI. Each hit keeps the drummer's own timing (how far
# after the 16th note it fell) and loudness. Written as songs for the app's recorded
# acoustic kit, rendered by render_loops.js, packed as the bank 'grooves' (Human Grooves).
# loopset.py uses groove_song() for the Electro Boom Bap beats.
import os, sys, csv, json, wave, subprocess
import numpy as np
import mido

# The drums the dataset's kit (a Roland TD-11) sends, by part.
PART = {36: 'kick', 38: 'snare', 40: 'rim', 37: 'xstick', 42: 'hat', 22: 'hat', 44: 'pedal', 46: 'open', 26: 'open',
        48: 'hitom', 50: 'hitom', 45: 'hitom', 47: 'hitom', 43: 'lotom', 58: 'lotom', 51: 'ride', 59: 'ride', 53: 'bell',
        49: 'crash', 55: 'crash', 57: 'crash', 52: 'crash'}
# Where each part goes on a kit: (key, or a quieter key under a velocity).
ACOUSTIC = {'kick': (0, 50, 1), 'snare': (2, 45, 3), 'rim': (4,), 'xstick': (5,), 'hat': (7,), 'pedal': (8,), 'open': (10,),
            'hitom': (12,), 'lotom': (11,), 'ride': (13,), 'bell': (14,), 'crash': (15,)}
BOOMBAP = {'kick': (0,), 'snare': (3, 45, 6), 'rim': (10,), 'xstick': (10,), 'hat': (7,), 'pedal': (9,), 'open': (8,),
           'hitom': (12,), 'lotom': (13,), 'ride': (9,), 'bell': (11,), 'crash': (15,)}

def notes_of(path):
    """Every hit: (time in beats, part, velocity)."""
    m = mido.MidiFile(path); tpb = m.ticks_per_beat; out = []
    for tr in m.tracks:
        t = 0
        for msg in tr:
            t += msg.time
            if msg.type == 'note_on' and msg.velocity > 0 and msg.note in PART: out.append((t / tpb, PART[msg.note], msg.velocity))
    return sorted(out)

def steadiest(hits, bars):
    """The bar to start from: the steadiest stretch of the groove, to loop. No crashes or tom fills
    (they would come round every time), a kick on the first beat, the snare on 2 and 4."""
    total = int(hits[-1][0] // 4) if hits else 0; best, at = None, 0
    for w in range(0, max(1, total - bars + 1)):
        win = [(t - w * 4, p) for t, p, v in hits if w * 4 - 0.12 <= t < (w + bars) * 4 - 0.12]
        if len(win) < 8: continue
        near = lambda beat, part: any(abs(t - beat) < 0.15 and p == part for t, p in win)
        score = -3 * sum(p == 'crash' for t, p in win) - 2 * sum(p in ('hitom', 'lotom') for t, p in win)
        score += 3 * near(0, 'kick') + sum(near(b * 4 + k, 'snare') for b in range(bars) for k in (1, 3))
        score -= 0.5 * (w == 0)                       # the first bar: often still settling in
        if best is None or score > best: best, at = score, w
    return at

def groove_song(path, bpm, kit, slot, factory, bars=2, start=None):
    """Two bars of a performance as a song: each hit on its nearest 16th, with o (how far off it:
    a drummer plays a little ahead or behind) and vol from its velocity."""
    hits = notes_of(path)
    if start is None: start = steadiest(hits, bars)
    a, L = start * 4, bars * 4
    pats = [[] for _ in range(bars)]
    for t, part, vel in hits:
        p = (t - a) * 4                                   # in 16ths from the loop's start
        if p < -0.5 or p >= L * 4 - 0.5: continue
        step = int(np.round(p)) % (L * 4); o = round(p - np.round(p), 3)      # the nearest 16th, and how far off it (-0.5 to 0.5)
        if step == 0 and o < 0: o = 0.0                   # the loop's very first hit can't come before the loop
        key = kit[part][0] if len(kit[part]) == 1 or vel >= kit[part][1] else kit[part][2]
        vol = round(min(1.0, (vel / 110) ** 1.3), 3)
        x = {'vol': vol, **({'o': o} if abs(o) > 0.01 else {})}
        pats[step // 16].append([step % 16, slot, key, x])
    return {'bpm': bpm, 'swing': 50, 'root': 0, 'scale': 'minor',
            'sounds': [{'slot': slot, 'factory': factory, 'vol': 0.9}], 'patterns': pats, 'chain': list(range(bars))}

def pick(groove_dir, style, bpm, n=0):
    """The n-th 4/4 beat of a style at a tempo (the nearest)."""
    rows = [r for r in csv.DictReader(open(f'{groove_dir}/info.csv'))
            if r['beat_type'] == 'beat' and r['time_signature'] == '4-4' and r['style'].split('/')[0] == style and float(r['duration']) > 12]
    rows.sort(key=lambda r: (abs(int(r['bpm']) - bpm), r['id']))
    r = rows[n]
    return f'{groove_dir}/{r["midi_filename"]}', int(r['bpm']), r

# The Human Grooves pack: a style each.
GROOVES = [('Hip hop', 'hiphop', 92, 0), ('Hip hop, slow', 'hiphop', 75, 0), ('Funk', 'funk', 100, 0), ('Funk, slow', 'funk', 84, 0),
           ('Soul', 'soul', 100, 0), ('Rock', 'rock', 120, 0), ('Pop', 'pop', 110, 0), ('Punk', 'punk', 170, 0),
           ('Jazz', 'jazz', 140, 0), ('Latin', 'latin', 110, 0), ('Afrobeat', 'afrobeat', 110, 0), ('Afro-Cuban', 'afrocuban', 100, 0),
           ('Reggae', 'reggae', 80, 0), ('New Orleans', 'neworleans', 100, 0), ('Blues shuffle', 'blues', 90, 0), ('Dance', 'dance', 120, 0)]

if __name__ == '__main__':
    if sys.argv[1] == 'songs':
        G = sys.argv[2]; out = []
        for name, style, bpm, n in GROOVES:
            path, b, r = pick(G, style, bpm, n)
            out.append({'id': 'g_' + style + str(bpm), 'name': f'{name} {b}', 'song': groove_song(path, b, ACOUSTIC, 8, 'acoustic')})
            print(f'{name:14} {b:3} BPM  {r["drummer"]}/{r["id"]}')
        json.dump(out, open(sys.argv[3], 'w'))
    elif sys.argv[1] == 'pack':
        WORK, OUT = sys.argv[2], sys.argv[3]; RATE = 32000
        data, slices, names, tempo = [], [], [], []
        songs = json.load(open(f'{WORK}/grooves.json'))
        loops = [(s['id'], s['name'], s['song']['bpm']) for s in songs]
        x_all = {i: np.fromfile(f'{WORK}/{i}.f32', np.float32) for i, _, _ in loops}
        for i, name, bpm in loops:
            x = x_all[i]; x = x * min(0.13 / max(1e-6, float(np.sqrt(np.mean(x * x)))), 0.9 / float(np.max(np.abs(x))))
            n = int(round(2 * 240 / bpm * RATE))
            y = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', '44100', '-ac', '1', '-i', '-', '-ar', str(RATE), '-f', 'f32le', '-'],
                                             input=np.tile(x, 3).astype(np.float32).tobytes(), capture_output=True, check=True).stdout, np.float32)
            m = len(y) // 3; y = y[m:m + n]
            if len(y) < n: y = np.concatenate([y, np.zeros(n - len(y), np.float32)])
            slices.append([len(data), len(data) + n]); names.append(name); tempo.append([bpm, 2]); data.extend(y.tolist())
        pcm = (np.clip(np.array(data), -1, 1) * 32767).astype('<i2')
        w = wave.open(f'{OUT}/grooves.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(pcm.tobytes()); w.close()
        index = json.load(open(f'{OUT}/banks.json'))
        index['grooves'] = {'name': 'Human Grooves', 'rate': RATE, 'slices': slices, 'from': names, 'loops': tempo}
        json.dump(index, open(f'{OUT}/banks.json', 'w'), separators=(',', ':'))
        print(f'grooves  {len(slices)} loops, {len(data) / RATE:.1f} s, {os.path.getsize(f"{OUT}/grooves.wav") / 1e6:.2f} MB')
