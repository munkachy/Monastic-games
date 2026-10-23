# Usage: python3 vigils.py songs <renders.json>
#        python3 vigils.py pack <rendered folder> <sounds folder>
# Vigils, a loop set for the Loops tab: G minor, 144 BPM, broken beats. The night office, sung in
# the dark before dawn: deep, atmospheric electronica in the line of Rival Consoles and Max Cooper,
# after Engineering Samples' "Breakpoint Electro" (Remixlive), which it is inspired by and borrows
# nothing from. Broken two-step beats; deep analog bass; night pads, the abbey organ and the women's
# choir; celestial arpeggios, bells and a howling lead; sub, rain and risers; and, in the Vox
# column, words of the Rule of St Benedict, said by the robot voice in pairs that answer each other
# ("A little rule..." / "...for beginners"), each a robot cell whose words can be changed.
#
# Every loop is written here as a short song (songs.py's format) on the app's own sounds, and the
# words as lines for the voice. Then:
#   songs: writes them to render, for render_loops.js (the loops with the app's own export, the
#          words with its voice);
#   pack:  packs the renders into banks, one per column (vigbass ... vigvox; the drum columns come
#          from drumlab.py), and writes sounds/sets/vigils.json: the 8 x 6 grid, its column effects
#          (reverb on the pads and words, echoes on the lead) and its reverb space.
# The harmony is eight bars, a chord every two (Gm9, Ebmaj7, Cm9, Dm7), so any loop fits any other.
import os, sys, json, wave, subprocess
import numpy as np

BPM, SWING, ROOT = 144, 54, 7            # G
# Keys count steps of G minor from G (0 G, 1 A, 2 Bb, 3 C, 4 D, 5 Eb, 6 F, 7 G...); below G they
# go negative and are written as a key and an octave down.
CHORDS = ['Gm9', 'Gm9', 'Ebmaj7', 'Ebmaj7', 'Cm9', 'Cm9', 'Dm7', 'Dm7']
TONES = {'Gm9': [0, 2, 4, 8], 'Ebmaj7': [-2, 0, 2, 4], 'Cm9': [-4, -2, 2, 4], 'Dm7': [-3, -1, 1, 3]}
ROOTS = {'Gm9': 0, 'Ebmaj7': -2, 'Cm9': -4, 'Dm7': -3}
# the bass falls G2, Eb2, C2, D2 (98 to 65 Hz: low, and still heard on a phone); the sub an octave under it
BASSR = {'Gm9': (0, 0), 'Ebmaj7': (5, -1), 'Cm9': (3, -1), 'Dm7': (4, -1)}

def song(sounds, bars):
    return {'bpm': BPM, 'swing': SWING, 'root': ROOT, 'scale': 'minor',
            'sounds': [{'slot': s, 'factory': f, 'vol': v, **({'trig': t} if t else {})} for s, f, v, t in sounds],
            'patterns': bars, 'chain': list(range(len(bars)))}

def N(step, slot, key, **x):
    oc = x.pop('oc', 0) + key // 7 if key < 0 else x.pop('oc', 0)
    key = key % 7 if key < 0 else key
    if oc: x['oc'] = oc
    return [step, slot, key, x] if x else [step, slot, key]

def harmonic(sounds, per_bar): return song(sounds, [per_bar(ch, b) for b, ch in enumerate(CHORDS)])

def drums(sounds, *bars):
    out = []
    for bar in bars:
        out.append([N(st[0] if isinstance(st, tuple) else st, slot, key, **({'vol': st[1]} if isinstance(st, tuple) else {}))
                    for slot, keys in bar.items() for key, steps in keys.items() for st in steps])
    return song(sounds, out)

LOOPS = {}       # id -> (column, name, song, mode, follows the key)
def loop(col, lid, name, sng, mode='loop', key=True): LOOPS[lid] = (col, name, sng, mode, key)
first = lambda b: b % 2 == 0          # the first bar of a chord's two

# --- Bass ---------------------------------------------------------------------------------
B = 0
def bass(steps, oc=0, held=None):
    # steps: (step, steps above the root, length) or a step; in the chord's two bars, or each bar
    def bar(ch, b):
        out = []
        for st in (steps(b) if callable(steps) else steps):
            s, up, d = st if isinstance(st, tuple) else (st, 0, held)
            r, o = BASSR[ch]
            out.append(N(s, B, r + up, oc=o + oc, **({'d': d} if d else {}), **({'vol': 1.0 if s % 4 == 0 else 0.8})))
        return out
    return bar
loop(3, 'b1', 'Analog pulse', harmonic([(B, 'sawbass', 0.7, None)], bass([0, 2, 4, 6, 8, 10, 12, 14])))
loop(3, 'b2', 'Two-step bass', harmonic([(B, 'sqbass', 0.7, None)], bass([0, 3, (6, 7, None), 10, (13, 7, None)])))
loop(3, 'b3', 'Reese drift', harmonic([(B, 'reese', 0.55, 'gate')], bass(lambda b: [(0, 0, 31)] if first(b) else [])))
loop(3, 'b4', 'Offbeat FM bass', harmonic([(B, 'fmbass', 0.7, None)], bass([2, 6, 10, 14])))
loop(3, 'b5', 'Octave bass', harmonic([(B, 'sawbass', 0.7, None)], bass([0, (4, 7, None), 8, (12, 7, None)])))
loop(3, 'b6', 'Slow wobble', harmonic([(B, 'wobble', 0.5, 'gate')], bass(lambda b: [(0, 0, 31)] if first(b) else [])))

# --- Chords -------------------------------------------------------------------------------
C = 1
def held(slot=C, up=0):          # the chord, held through its two bars
    return lambda ch, b: [N(0, slot, k + up, d=31) for k in TONES[ch]] if first(b) else []
def hits(at, slot=C, up=0):
    return lambda ch, b: [N(s, slot, k + up, **({'vol': v} if v != 1 else {})) for s, v in at for k in TONES[ch]]
def broken(slot=C, up=7, vol=1):
    def bar(ch, b):
        t = [k + up for k in TONES[ch]]; order = [0, 2, 1, 3, 2, 0, 3, 1]
        return [N(s, slot, t[order[i]], vol=vol * (1.0 if i % 2 == 0 else 0.75)) for i, s in enumerate(range(0, 16, 2))]
    return bar
loop(4, 'c1', 'Night pad', harmonic([(C, 'pad', 0.45, 'gate')], held()))
loop(4, 'c2', 'Glass chords', harmonic([(C, 'glass', 0.5, None)], hits([(0, 1), (6, 0.6), (10, 0.75)])))
loop(4, 'c3', 'Abbey organ', harmonic([(C, 'pipeorgan', 0.4, 'gate')], held()))
loop(4, 'c4', "Women's choir", harmonic([(C, 'choirwomen', 0.4, 'gate')], held(up=7)))
loop(4, 'c5', 'Strings', harmonic([(C, 'strings', 0.4, 'gate')], held()))
loop(4, 'c6', 'Celeste, broken', harmonic([(C, 'celeste', 0.55, None)], broken()))

# --- Lead: celestial arpeggios, bells, the howl -------------------------------------------
L = 2
def arp(pattern, every=1, up=7, slot=L):
    def bar(ch, b):
        t = [k + up for k in TONES[ch]] + [k + up + 7 for k in TONES[ch][:2]]
        return [N(s, slot, t[pattern[i % len(pattern)]], vol=1.0 if s % 4 == 0 else 0.72) for i, s in enumerate(range(0, 16, every))]
    return bar
# the howl: long notes over the chords, two bars to a chord
HOWL = [[(0, 11, 14)], [(0, 9, 6), (8, 10, 8)], [(0, 11, 16)], [(0, 12, 6), (8, 11, 8)],
        [(0, 9, 16)], [(0, 10, 6), (8, 9, 8)], [(0, 8, 16)], [(0, 7, 6), (8, 8, 8)]]
GLOCK = [[(0, 14), (6, 11), (10, 9)], [(4, 12)], [(0, 11), (6, 9), (10, 7)], [(2, 9), (8, 11)],
         [(0, 9), (6, 7), (10, 6)], [(4, 8)], [(0, 8), (6, 10), (10, 12)], [(2, 11), (8, 10), (12, 8)]]
loop(5, 'l1', 'Celestial arp', harmonic([(L, 'pluck', 0.45, None)], arp([0, 1, 2, 3, 4, 3, 2, 1])))
loop(5, 'l2', 'Bell arp', harmonic([(L, 'fmbell', 0.35, None)], arp([0, 2, 4, 2, 1, 3, 5, 3], every=2)))
loop(5, 'l3', 'Howling lead', harmonic([(L, 'supersaw', 0.3, 'gate')], lambda ch, b: [N(s, L, k, d=d) for s, k, d in HOWL[b]]))
loop(5, 'l4', 'Glockenspiel', harmonic([(L, 'glock', 0.45, None)], lambda ch, b: [N(s, L, k) for s, k in GLOCK[b]]))
loop(5, 'l5', 'Vibraphone', harmonic([(L, 'vibes', 0.5, None)], arp([0, 3, 1, 4, 2, 5], every=2, up=0)))     # (the kalimba's recordings are up to half a step out of tune)
loop(5, 'l6', 'Night violin', harmonic([(L, 'violin', 0.4, 'gate')], lambda ch, b: [N(s, L, k - 7, d=d) for s, k, d in HOWL[b]]))

# --- Sub and color --------------------------------------------------------------------------
U, G = 3, 8
loop(6, 'u1', 'Sub roots', harmonic([(U, 'subsine', 0.8, 'gate')], lambda ch, b: [N(0, U, BASSR[ch][0], oc=BASSR[ch][1] - 1, d=31)] if first(b) else []))
loop(6, 'u2', 'Sub pulse', harmonic([(U, 'subsine', 0.75, 'gate')], lambda ch, b: [N(s, U, BASSR[ch][0], oc=BASSR[ch][1] - 1, d=3) for s in (0, 4, 8, 12)]))
GL = [(G, 'glitch', 0.45, None)]
loop(6, 'u3', 'Glitch ticks', drums(GL, {G: {0: [0, (7, 0.6)], 3: [(10, 0.7)], 5: [(13, 0.5)]}}, {G: {1: [(3, 0.6)], 0: [8], 6: [(14, 0.6)]}}), key=False)

# --- Vox: the Rule of St Benedict, in pairs that answer each other ----------------------------
# Said by the robot voice (eSpeak NG, as on the Voice page), slow, low and with long vowels, like a
# chant; the words are Claude's own English from the Latin of the Rule (6th century).
VOICE = {'variant': 'm7', 'pitch': 36, 'range': 20, 'speed': 125, 'vowel': 2.0, 'gap': 4, 'cut': 'natural'}
SAY = [('A little rule…', 'RB 73.8: "hanc minimam inchoationis regulam"'),
       ('…for beginners', 'RB 73.8'),
       ('Listen…', 'Prologue 1: "Ausculta, o fili"'),
       ('…with the ear of your heart', 'Prologue 1: "inclina aurem cordis tui"'),
       ('Prefer nothing…', 'RB 4.21: "Nihil amori Christi praeponere"'),
       ('…to the love of Christ', 'RB 4.21')]
spoken = lambda t: t.replace('…', '').strip()

def hitcell(lib, k, name, mode='loop', vol=None): return {'lib': lib, 'k': k, 'mode': mode, 'name': name, 'follow': False, **({'vol': vol} if vol else {})}   # rain and risers: as recorded
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from drumlab import loop_cells
GRID = [*loop_cells('vig'),
        ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'], ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'],
        ['l1', 'l2', 'l3', 'l4', 'l5', 'l6'],
        ['u1', 'u2', 'u3', hitcell('ambience', 3, 'Night rain'), hitcell('noisefx', 0, 'Riser', 'oneshot', 0.7), hitcell('noisefx', 2, 'Downlifter', 'oneshot', 0.7)],
        [f'v{i}' for i in range(len(SAY))]]
BANKS = [None, None, None, 'vigbass', 'vigchords', 'viglead', 'vigsub', 'vigvox']
NAMES = [None, None, None, 'Vigils Bass', 'Vigils Chords', 'Vigils Lead', 'Vigils Sub', 'Vigils Vox']
RATES = [32000, 32000, 32000, 22050, 24000, 32000, 16000, 24000]
TARGET = [x * 0.7 for x in (0.15, 0.055, 0.025, 0.15, 0.12, 0.075, 0.16, 0.07)]   # as Electro Boom Bap's columns
# the column effects (reverb on the pads, the words and the color, echoes on the lead) and the room
FX = [None, None, None, None, {'type': 'reverb', 'amt': 0.45}, {'type': 'pingpong', 'amt': 0.3}, {'type': 'reverb', 'amt': 0.35}, {'type': 'reverb', 'amt': 0.55}]
SPACE = 'aachen'

def bars_of(lid): return len(LOOPS[lid][2]['patterns'])

if sys.argv[1] == 'songs':
    items = [{'id': lid, 'song': s} for lid, (_, _, s, _, _) in LOOPS.items()]
    items += [{'id': f'v{i}', 'say': {'text': spoken(t), 'voice': VOICE}} for i, (t, _) in enumerate(SAY)]
    json.dump(items, open(sys.argv[2], 'w'))
    print(len(LOOPS), 'loops to render,', sum(bars_of(l) for l in LOOPS), 'bars;', len(SAY), 'lines to say')
elif sys.argv[1] == 'pack':
    WORK, OUT = sys.argv[2], sys.argv[3]
    index = json.load(open(f'{OUT}/banks.json'))
    def resample(x, a, b):
        return np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(a), '-ac', '1', '-i', '-', '-ar', str(b), '-f', 'f32le', '-'],
                                            input=x.astype(np.float32).tobytes(), capture_output=True, check=True).stdout, np.float32)
    for c, (bank, name, rate) in enumerate(zip(BANKS, NAMES, RATES)):
        ids = [x for x in GRID[c] if isinstance(x, str)]
        if not bank or not ids: continue
        data, slices, names, tempo = [], [], [], []
        for lid in ids:
            x = np.fromfile(f'{WORK}/{lid}.f32', np.float32); sr = int(open(f'{WORK}/{lid}.sr').read())
            x = x * min(TARGET[c] / max(1e-6, float(np.sqrt(np.mean(x * x)))), 0.95 / float(np.max(np.abs(x))))
            if lid in LOOPS:                       # a loop: resampled as a loop (three copies, the middle kept), exactly its bars long
                n = int(round(bars_of(lid) * 240 / BPM * rate))
                y = resample(np.tile(x, 3), sr, rate); m = len(y) // 3; y = y[m:m + n]
                if len(y) < n: y = np.concatenate([y, np.zeros(n - len(y), np.float32)])
                tempo.append([BPM, bars_of(lid)]); names.append(LOOPS[lid][1])
            else:                                  # words: as said, with a short fade at the end
                y = resample(x, sr, rate).copy(); f = min(len(y), int(0.01 * rate)); y[len(y) - f:] *= np.linspace(1, 0, f)
                names.append(SAY[int(lid[1:])][0])
            slices.append([len(data), len(data) + len(y)]); data.extend(y.tolist())
        pcm = (np.clip(np.array(data), -1, 1) * 32767).astype('<i2')
        w = wave.open(f'{OUT}/{bank}.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm.tobytes()); w.close()
        index[bank] = {'name': name, 'rate': rate, 'slices': slices, 'from': names, **({'loops': tempo} if tempo else {}), 'key': [ROOT, 'minor']}
        print(f'{bank:10} {len(slices)} sounds, {len(data) / rate:5.1f} s at {rate} Hz, {os.path.getsize(f"{OUT}/{bank}.wav") / 1e6:.2f} MB')
    json.dump(index, open(f'{OUT}/banks.json', 'w'), separators=(',', ':'))
    slices_of = {b: index[b]['slices'] for b in BANKS if b}
    cells = []
    for c, col in enumerate(GRID):
        ids = [x for x in col if isinstance(x, str)]; out = []
        for x in col:
            if isinstance(x, dict): out.append(x); continue
            k = ids.index(x)
            if x in LOOPS:
                _, name, _, mode, key = LOOPS[x]
                out.append({'lib': BANKS[c], 'k': k, 'mode': mode, 'name': name, **({'keyOf': ROOT, 'follow': True} if key else {'follow': False})})
            else:                                  # the words: a robot cell, said again when its words change
                text = SAY[int(x[1:])][0]; secs = (slices_of[BANKS[c]][k][1] - slices_of[BANKS[c]][k][0]) / RATES[c]
                beats = 8 if secs < 8 * 60 / BPM - 0.1 else 16          # every 2 bars, or 4 for a long line
                out.append({'lib': BANKS[c], 'k': k, 'mode': 'loop', 'beats': beats, 'name': text, 'follow': False,
                            'robot': {'text': spoken(text), 'voice': VOICE}})
        cells.append(out)
    os.makedirs(f'{OUT}/sets', exist_ok=True)
    json.dump({'id': 'vigils', 'name': 'Vigils', 'by': 'Claude', 'about': 'G minor · 144 BPM · broken beats',
               'bpm': BPM, 'root': ROOT, 'scale': 'minor', 'cells': cells, 'fx': FX, 'space': SPACE},
              open(f'{OUT}/sets/vigils.json', 'w'), separators=(',', ':'))
    print('sets/vigils.json: 8 columns x 6 cells')
