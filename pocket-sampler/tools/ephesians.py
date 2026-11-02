# Usage: python3 ephesians.py songs <renders.json>
#        python3 ephesians.py pack <rendered folder> <sounds folder>
# Ephesians, a loop set for the Loops tab: A minor, 139 BPM, straight (no swing). Industrial
# techno in the line of Voltage Techno (Remixlive), which it is inspired by and borrows nothing
# from: a four-on-the-floor of steel and concrete (drumlab.py's Ephesians kit), a rolling voltage
# bass, stabs and a strained drone, a siren-like signal and steel clangs that fall in threes
# against the fours, in a hard stairwell. Most of it is on its own instruments, made with Plaits
# (plaitsinst.py: Emergency Signal, Strained Drone, Voltage Bass, Steel Clang, Voltage Stab).
# In the Vox column, words of Ephesians 3 (Good News Translation), said by two robot voices that
# answer each other ("God revealed his secret plan…" / "…and made it known to me"), each a robot
# cell whose words can be changed.
#
# Unlike Vigils (a chord every two bars, broken beats, slow chant), the harmony here sits on A
# minor for four bars, then F and E minor for two each, and the voices are quick and flat.
# As vigils.py:
#   songs: writes the loops and lines to render, for render_loops.js;
#   pack:  packs the renders into banks, one per column (ephbass ... ephvox; the drum columns come
#          from drumlab.py), and writes sounds/sets/ephesians.json.
import os, sys, json, wave, subprocess
import numpy as np

BPM, SWING, ROOT = 139, 50, 9            # A
# Keys count steps of A minor from A (0 A, 1 B, 2 C, 3 D, 4 E, 5 F, 6 G, 7 A...).
CHORDS = ['Am', 'Am', 'Am', 'Am', 'Fmaj7', 'Fmaj7', 'Em7', 'Em7']
TONES = {'Am': [0, 2, 4, 7], 'Fmaj7': [-2, 0, 2, 4], 'Em7': [-3, -1, 1, 3]}
# the bass: A, F (a third under), E (a fourth under)
BASSR = {'Am': (0, 0), 'Fmaj7': (5, -1), 'Em7': (4, -1)}

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

LOOPS = {}       # id -> (column, name, song, mode, follows the key)
def loop(col, lid, name, sng, mode='loop', key=True): LOOPS[lid] = (col, name, sng, mode, key)
starts = lambda b: b == 0 or CHORDS[b] != CHORDS[b - 1]          # the first bar of a chord
def span(b):                                                     # how many steps the chord lasts from bar b
    n = 1
    while b + n < len(CHORDS) and CHORDS[b + n] == CHORDS[b]: n += 1
    return n * 16 - 1

# --- Bass ---------------------------------------------------------------------------------
B = 0
def bass(steps, oc=0, d=None):
    # steps: (step, steps above the root, length) or a step, the same each bar
    def bar(ch, b):
        out = []
        for st in (steps(b) if callable(steps) else steps):
            s, up, dd = st if isinstance(st, tuple) else (st, 0, d)
            r, o = BASSR[ch]
            out.append(N(s, B, r + up, oc=o + oc, **({'d': dd} if dd else {}), vol=1.0 if s % 4 == 2 else 0.8))
        return out
    return bar
ROLL = [s for s in range(16) if s % 4]                             # every sixteenth but the kick's
loop(3, 'b1', 'Voltage roll', harmonic([(B, 'ephvolt', 0.65, None)], bass(ROLL, d=1)))
loop(3, 'b2', 'Offbeat voltage', harmonic([(B, 'ephvolt', 0.7, None)], bass([(2, 0, 1), (6, 0, 1), (10, 0, 1), (14, 7, 1)])))
loop(3, 'b3', 'Acid wire', harmonic([(B, 'acid', 0.55, None)], bass([0, (3, 7, None), 6, (8, 2, None), (11, 7, None), (14, 4, None)])))
loop(3, 'b4', 'Reese pressure', harmonic([(B, 'reese', 0.5, 'gate')], bass(lambda b: [(0, 0, span(b))] if starts(b) else [])))
loop(3, 'b5', 'Gallop', harmonic([(B, 'sawbass', 0.65, None)], bass([(0, 0, 1), (3, 0, 1), (4, 0, 1), (8, 0, 1), (11, 0, 1), (12, 0, 1)])))
loop(3, 'b6', '808 drop', harmonic([(B, 'bass808', 0.6, 'gate')], bass(lambda b: [(0, 0, 9), (10, 7, 5)])))

# --- Chords: the drone, stabs, organ and choir ---------------------------------------------
C = 1
def held(slot=C, up=0):          # the chord, held as long as it lasts
    return lambda ch, b: [N(0, slot, k + up, d=span(b)) for k in TONES[ch]] if starts(b) else []
def hits(at, slot=C, up=0):
    return lambda ch, b: [N(s, slot, k + up, **({'vol': v} if v != 1 else {})) for s, v in at for k in TONES[ch]]
loop(4, 'c1', 'Strained drone', harmonic([(C, 'ephdrone', 0.4, 'gate')], held()))
loop(4, 'c2', 'Voltage stabs', harmonic([(C, 'ephstab', 0.45, None)], hits([(3, 1), (6, 0.7), (11, 0.85)])))
loop(4, 'c3', 'Iron organ', harmonic([(C, 'pipeorgan', 0.35, 'gate')], held()))
loop(4, 'c4', "Men's choir", harmonic([(C, 'choirmen', 0.4, 'gate')], held()))
loop(4, 'c5', 'Brass alarm', harmonic([(C, 'brass', 0.4, None)], lambda ch, b: hits([(0, 1), (7, 0.6)])(ch, b) if starts(b) or b % 2 == 0 else []))
loop(4, 'c6', 'Glass offbeats', harmonic([(C, 'glass', 0.4, None)], hits([(2, 0.8), (6, 0.6), (10, 0.8), (14, 0.6)], up=7)))

# --- Lead: the signal, clangs in threes, saws, bells --------------------------------------
L = 2
def threes(slot=L, up=7, every=3):
    # a note every three sixteenths, running on across the bars: three against the kick's four
    def bar(ch, b):
        t = [k + up for k in TONES[ch]]
        return [N(s, slot, t[((b * 16 + s) // every) % len(t)], vol=1.0 if (b * 16 + s) % 12 == 0 else 0.7)
                for s in range(16) if (b * 16 + s) % every == 0]
    return bar
def arp(pattern, every=1, up=7, slot=L):
    def bar(ch, b):
        t = [k + up for k in TONES[ch]] + [k + up + 7 for k in TONES[ch][:2]]
        return [N(s, slot, t[pattern[i % len(pattern)]], vol=1.0 if s % 4 == 0 else 0.72) for i, s in enumerate(range(0, 16, every))]
    return bar
# the signal: a long call each chord, answered higher
SIGNAL = [[(0, 11, 12)], [(4, 9, 10)], [(0, 11, 12)], [(4, 14, 10)], [(0, 9, 14)], [(8, 11, 6)], [(0, 8, 14)], [(8, 7, 6)]]
CALL = [[(0, 14), (3, 14), (6, 11)], [], [(0, 14), (3, 14), (6, 16)], [(8, 14)],
        [(0, 12), (3, 12), (6, 9)], [], [(0, 11), (3, 11), (6, 10)], [(8, 8)]]
loop(5, 'l1', 'Emergency signal', harmonic([(L, 'ephsignal', 0.35, 'gate')], lambda ch, b: [N(s, L, k, d=d) for s, k, d in SIGNAL[b]]))
loop(5, 'l2', 'Clangs in threes', harmonic([(L, 'ephclang', 0.4, None)], threes()))
loop(5, 'l3', 'Supersaw climb', harmonic([(L, 'supersaw', 0.3, None)], arp([0, 1, 2, 3, 4, 5, 4, 2], every=2)))
loop(5, 'l4', 'Bell call', harmonic([(L, 'fmbell', 0.4, None)], lambda ch, b: [N(s, L, k) for s, k in CALL[b]]))
loop(5, 'l5', 'Pluck threes', harmonic([(L, 'pluck', 0.45, None)], threes(up=0, every=3)))
loop(5, 'l6', 'Low signal', harmonic([(L, 'ephsignal', 0.35, 'gate')], lambda ch, b: [N(s, L, k - 7, d=d) for s, k, d in SIGNAL[b]]))

# --- Sub and color --------------------------------------------------------------------------
U = 3
loop(6, 'u1', 'Sub roots', harmonic([(U, 'subsine', 0.8, 'gate')], lambda ch, b: [N(0, U, BASSR[ch][0], oc=BASSR[ch][1] - 1, d=span(b))] if starts(b) else []))
loop(6, 'u2', 'Sub offbeats', harmonic([(U, 'subsine', 0.75, 'gate')], lambda ch, b: [N(s, U, BASSR[ch][0], oc=BASSR[ch][1] - 1, d=2) for s in (2, 6, 10, 14)]))

# --- Vox: Ephesians 3 (GNT), two voices answering each other --------------------------------
# Said by the robot voice (eSpeak NG, as on the Voice page): the first of each pair low and flat
# (Robosoft), the answer higher and quicker (Anika Robot). Quick, with no tune: an announcement,
# not a chant (Vigils' voice is slow and sung).
CALLV = {'variant': 'robosoft', 'pitch': 30, 'range': 0, 'speed': 160, 'vowel': 1.0, 'gap': 2, 'cut': 'natural'}
ANSWER = {'variant': 'anikaRobot', 'pitch': 62, 'range': 4, 'speed': 175, 'vowel': 1.0, 'gap': 2, 'cut': 'natural'}
SAY = [('God revealed his secret plan…', 'Eph 3:3 (GNT)', CALLV),
       ('…and made it known to me', 'Eph 3:3 (GNT)', ANSWER),
       ('The Good News…', 'Eph 3:8 (GNT)', CALLV),
       ('…the infinite riches of Christ', 'Eph 3:8 (GNT)', ANSWER),
       ('The angelic rulers and powers…', 'Eph 3:10 (GNT)', CALLV),
       ('…might learn of his wisdom in all its different forms', 'Eph 3:10 (GNT)', ANSWER)]
spoken = lambda t: t.replace('…', '').strip()

def hitcell(lib, k, name, mode='loop', vol=None): return {'lib': lib, 'k': k, 'mode': mode, 'name': name, 'follow': False, **({'vol': vol} if vol else {})}   # rain and risers: as recorded
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from drumlab import loop_cells
GRID = [*loop_cells('eph'),
        ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'], ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'],
        ['l1', 'l2', 'l3', 'l4', 'l5', 'l6'],
        ['u1', 'u2', hitcell('ambience', 3, 'Rain'), hitcell('noisefx', 0, 'Riser', 'oneshot', 0.7),
         hitcell('noisefx', 1, 'Short riser', 'oneshot', 0.7), hitcell('noisefx', 2, 'Downlifter', 'oneshot', 0.7)],
        [f'v{i}' for i in range(len(SAY))]]
BANKS = [None, None, None, 'ephbass', 'ephchords', 'ephlead', 'ephsub', 'ephvox']
NAMES = [None, None, None, 'Ephesians Bass', 'Ephesians Chords', 'Ephesians Lead', 'Ephesians Sub', 'Ephesians Vox']
RATES = [32000, 32000, 32000, 22050, 24000, 32000, 16000, 24000]
TARGET = [x * 0.7 for x in (0.15, 0.055, 0.025, 0.15, 0.12, 0.075, 0.16, 0.07)]   # as Vigils' columns
# the column effects (any number each, in the app's pedal order) and the room
FX = [{'on': {'tape': 0.3}}, {'on': {'reverb': 0.25}}, {'on': {'highpass': 0.3}}, {'on': {'overdrive': 0.35}},
      {'on': {'tape': 0.3, 'reverb': 0.4}}, {'on': {'pingpong': 0.3, 'reverb': 0.3}}, {'on': {'reverb': 0.3}},
      {'on': {'distortion': 0.25, 'reverb': 0.45}}]
SPACE = 'stairwell'

def bars_of(lid): return len(LOOPS[lid][2]['patterns'])

if sys.argv[1] == 'songs':
    items = [{'id': lid, 'song': s} for lid, (_, _, s, _, _) in LOOPS.items()]
    items += [{'id': f'v{i}', 'say': {'text': spoken(t), 'voice': v}} for i, (t, _, v) in enumerate(SAY)]
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
                text, _, voice = SAY[int(x[1:])]; secs = (slices_of[BANKS[c]][k][1] - slices_of[BANKS[c]][k][0]) / RATES[c]
                beats = 4 if secs < 4 * 60 / BPM - 0.1 else 8 if secs < 8 * 60 / BPM - 0.1 else 16     # every bar, 2 or 4
                out.append({'lib': BANKS[c], 'k': k, 'mode': 'loop', 'beats': beats, 'name': text, 'follow': False,
                            'robot': {'text': spoken(text), 'voice': voice}})
        cells.append(out)
    os.makedirs(f'{OUT}/sets', exist_ok=True)
    json.dump({'id': 'ephesians', 'name': 'Ephesians', 'by': 'Claude', 'about': 'A minor · 139 BPM · industrial techno',
               'bpm': BPM, 'root': ROOT, 'scale': 'minor', 'cells': cells, 'fx': FX, 'space': SPACE},
              open(f'{OUT}/sets/ephesians.json', 'w'), separators=(',', ':'))
    print('sets/ephesians.json: 8 columns x 6 cells')
