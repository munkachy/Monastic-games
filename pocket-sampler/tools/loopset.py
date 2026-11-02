# Usage: python3 loopset.py songs <renders.json>
#        python3 loopset.py pack <rendered folder> <sounds folder>
# The Electro Boom Bap loop set for the Loops tab: F minor, 92 BPM, swing 58,
# built on the 8-bar song in songs.py. Every loop is written here as a short
# song (the same format as songs.py: which built-in sound on which slot, and
# the notes, bar by bar) from the app's own sounds. Then:
#   songs: writes the loops to render, for render_loops.js, which plays each in
#          the app and renders it with the app's own export (one seamless loop);
#   pack:  packs the rendered loops into banks, one per column (ebbbass ...
#          ebbvox; the drum columns come from drumlab.py, mono, slices in banks.json, each with its tempo and bars), and
#          writes sounds/sets/electroboombap.json: the 8 x 6 grid.
# The harmonic loops are four bars, a chord a bar (Fm7, Dbmaj7, Bbm7, Cm7), so any
# of them fit together and with the drums; they follow the key (keyOf F).
import os, sys, json, wave, subprocess
import numpy as np

BPM, SWING, ROOT = 92, 58, 5            # F
BAR = 240 / BPM

# Keys: melodic sounds count steps of F minor from F (0 F, 1 G, 2 Ab, 3 Bb, 4 C, 5 Db,
# 6 Eb, 7 F...); kits count their sounds.
BB = dict(kick=0, kick2=1, kick3=2, snare=3, snare2=4, snare3=5, ghost=6, hat=7, open=8, hat2=9, rim=10, cowbell=11, perc=12, perc2=13, brush=14, crash=15)
TR = dict(kick=0, boom=1, short=2, snare=3, snappy=4, clap=5, rim=6, hat=7, open=8, cym=9, cowbell=10, clave=11, hitom=12, lotom=13, conga=14, maracas=15)
EL = dict(kick=0, kick2=1, snare=2, snare2=3, hat=4, open=5, linnhat=6, linnhat2=7, crash=8, ride=9, hit=10, hit2=11, hit3=12, perc=13, perc2=14, linnkick=15)
SH = dict(tamb=0, tambshake=1, shaker=4, bigshaker=5, cabasa=6)
HY = dict(yeah=0, uh=1, ho=2, checkit=3, comeon=4, letsgo=5, hitit=6, onetwo=7, saywhat=8, drop=9, word=10, peace=11, amen=12, alleluia=13, selah=14, again=15)
# The four chords: their tones (steps of F minor), the bass root (step, octave), and the
# Juno stab's tuning (it is a C-G-Bb chord) to sit on each.
CHORDS = ['Fm7', 'Dbmaj7', 'Bbm7', 'Cm7']
TONES = {'Fm7': [0, 2, 4, 6], 'Dbmaj7': [0, 2, 4, 5], 'Bbm7': [0, 2, 3, 5], 'Cm7': [3, 4, 6, 8]}
ROOTS = {'Fm7': (0, 0), 'Dbmaj7': (5, -1), 'Bbm7': (3, 0), 'Cm7': (4, -1)}
STAB = {'Fm7': 5, 'Dbmaj7': 5, 'Bbm7': -2, 'Cm7': 0}

def song(sounds, bars):
    """sounds: [(slot, factory, vol, trig)]; bars: a list of note lists [step, slot, key, {x}]."""
    return {'bpm': BPM, 'swing': SWING, 'root': ROOT, 'scale': 'minor',
            'sounds': [{'slot': s, 'factory': f, 'vol': v, **({'trig': t} if t else {})} for s, f, v, t in sounds],
            'patterns': bars, 'chain': list(range(len(bars)))}

def N(step, slot, key, **x): return [step, slot, key, x] if x else [step, slot, key]

def drums(sounds, *bars):
    """Each bar: {slot: {key: [steps or (step, vol)]}}."""
    out = []
    for bar in bars:
        n = []
        for slot, keys in bar.items():
            for key, steps in keys.items():
                for st in steps:
                    if isinstance(st, tuple): n.append(N(st[0], slot, key, vol=st[1]))
                    else: n.append(N(st, slot, key))
        out.append(n)
    return song(sounds, out)

def harmonic(sounds, per_bar):
    """per_bar(chord, bar number) -> the bar's notes; four bars, a chord each."""
    return song(sounds, [per_bar(ch, b) for b, ch in enumerate(CHORDS)])

def octv(k, oc):                       # a note an octave (or two) away, as a key and an octave
    return {'oc': oc} if oc else {}

K, T, E, S_ = 8, 9, 10, 11             # slots for the kits: boom bap, TR-808, electro, shakers
BBK = [(K, 'boombap', 0.9, None)]; TRK = [(T, 'tr808', 0.75, None)]; ELK = [(E, 'electro', 0.6, None)]
hats8 = [(s, 1.0 if s % 4 == 0 else 0.75) for s in range(0, 16, 2)]

LOOPS = {}       # id -> (column, name, song, mode, follows the key)
def loop(col, lid, name, sng, mode='loop', key=False): LOOPS[lid] = (col, name, sng, mode, key)

# --- Drums (Kick, Snare, Tops): kick loops, snare loops and tops loops, a part each, made in
# drumlab.py from the set's own kit (Plaits' drum engines); it bakes them and puts them in the set.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
# --- Bass (808, electric, Reese, upright) ------------------------------------------------
B = 0
def bassline(steps, extra=None, held=None):
    def bar(ch, b):
        r, oc = ROOTS[ch]; n = []
        for st in steps[b % len(steps)]:
            k, d = (st[1], st[2]) if isinstance(st, tuple) else (0, None)
            step = st[0] if isinstance(st, tuple) else st
            x = {**octv(0, oc + (1 if k >= 7 else 0)), **({'d': d} if d else {}), **({'d': held} if held and not d else {})}
            n.append(N(step, B, r + (k % 7), **x))
        return n
    return bar
loop(3, 'b1', '808 roots', harmonic([(B, 'bass808', 0.85, None)], bassline([[0, 7, 10], [0, 3, 10, 14]])), key=True)
loop(3, 'b2', '808 long', harmonic([(B, 'bass808', 0.8, 'gate')], bassline([[(0, 0, 6), (10, 0, 5)]])), key=True)
loop(3, 'b3', '808 bounce', harmonic([(B, 'bass808', 0.85, None)], bassline([[0, 7, (10, 4, None), (14, 7, None)]])), key=True)
loop(3, 'b4', 'Electric bass', harmonic([(B, 'elecbass', 0.8, None)], bassline([[0, 3, (6, 4, None), (8, 7, None), 10, (13, 6, None)]])), key=True)
loop(3, 'b5', 'Reese', harmonic([(B, 'reese', 0.6, 'gate')], bassline([[(0, 0, 14)]])), key=True)
loop(3, 'b6', 'Upright walk', harmonic([(B, 'uprightbass', 0.9, None)], bassline([[0, (4, 2, None), (8, 4, None), (12, 6, None)]])), key=True)
# --- Chords -------------------------------------------------------------------------------
C = 1
def chord_hits(hits, slot=C, up=0, d=None):
    def bar(ch, b):
        return [N(st, slot, k + up, **({'vol': v} if v != 1 else {}), **({'d': d} if d else {})) for st, v in hits for k in TONES[ch]]
    return bar
loop(4, 'c1', 'Rhodes chords', harmonic([(C, 'rhodes', 0.7, None)], chord_hits([(0, 1), (10, 0.6)])), key=True)
loop(4, 'c2', 'Rhodes stabs', harmonic([(C, 'rhodes', 0.65, None)], chord_hits([(0, 1), (3, 0.6), (7, 0.7), (10, 0.6), (14, 0.5)])), key=True)
loop(4, 'c3', 'Warm pad', harmonic([(C, 'pad', 0.45, 'gate')], chord_hits([(0, 1)], d=16)), key=True)
loop(4, 'c4', "Men's choir", harmonic([(C, 'choirmen', 0.45, 'gate')], chord_hits([(0, 1)], d=16)), key=True)
def broken(ch, b):
    t = TONES[ch] + [k + 7 for k in TONES[ch][:2]]
    return [N(st, C, t[i % len(t)], vol=0.8 if i % 2 else 1.0) for i, st in enumerate((0, 2, 4, 6, 8, 10, 12, 14))]
loop(4, 'c5', 'Rhodes broken chords', harmonic([(C, 'rhodes', 0.6, None)], broken), key=True)
loop(4, 'c6', 'Organ', harmonic([(C, 'organ', 0.35, 'gate')], chord_hits([(0, 1), (8, 0.8)], d=7)), key=True)
# --- Lead ---------------------------------------------------------------------------------
L = 2
def juno(steps, key):
    return lambda ch, b: [N(st, L, key, pitch=STAB[ch]) for st in steps[b % len(steps)]]
loop(5, 'l1', 'Juno stabs', harmonic([(L, 'stabs', 0.45, None)], juno([(6, 14), (3, 10)], 4)), key=True)
loop(5, 'l2', 'Juno stabs 2', harmonic([(L, 'stabs', 0.45, None)], juno([(0, 3, 6, 10)], 1)), key=True)
def arp(ch, b):
    t = [k + 7 for k in TONES[ch]]
    return [N(st, L, t[[0, 1, 2, 3, 2, 1][i % 6]], vol=1.0 if st % 4 == 0 else 0.7) for i, st in enumerate(range(16))]
loop(5, 'l3', 'Pluck arp', harmonic([(L, 'pluck', 0.5, None)], arp), key=True)
MELODY = [[(0, 11), (3, 9), (6, 7), (10, 9), (12, 11)], [(0, 12), (3, 11), (6, 9), (8, 7)],
          [(0, 10), (3, 9), (6, 7), (10, 6), (12, 7)], [(0, 8), (2, 9), (4, 11), (6, 12), (8, 11), (12, 9)]]
loop(5, 'l4', 'Chip melody', harmonic([(L, 'chip', 0.4, None)], lambda ch, b: [N(st, L, k) for st, k in MELODY[b]]), key=True)
loop(5, 'l5', 'Trumpet stabs', harmonic([(L, 'trumpet', 0.55, None)], lambda ch, b: [N(st, L, TONES[ch][-1] + 7) for st in ((6, 14) if b % 2 == 0 else (3, 10))]), key=True)
BELLS = [[(0, 14), (6, 11), (10, 9)], [(0, 12), (6, 9)], [(0, 10), (6, 9), (10, 7)], [(0, 11), (4, 8), (8, 9), (12, 11)]]
loop(5, 'l6', 'Bell melody', harmonic([(L, 'fmbell', 0.4, None)], lambda ch, b: [N(st, L, k) for st, k in BELLS[b]]), key=True)
# --- Sub ----------------------------------------------------------------------------------
U = 3
def sub(steps):
    def bar(ch, b):
        r, oc = ROOTS[ch]
        return [N(st, U, r + (7 if up else 0), d=d, **octv(0, oc - 1 + (1 if up else 0))) for st, d, up in steps]
    return bar
loop(6, 'u1', 'Sub roots', harmonic([(U, 'subsine', 0.8, 'gate')], sub([(0, 15, 0)])), key=True)
loop(6, 'u2', 'Sub halves', harmonic([(U, 'subsine', 0.8, 'gate')], sub([(0, 7, 0), (8, 7, 0)])), key=True)
loop(6, 'u3', 'Sub bounce', harmonic([(U, 'subsine', 0.8, 'gate')], sub([(0, 5, 0), (7, 2, 0), (10, 4, 0)])), key=True)
loop(6, 'u4', 'Sub 8ths', harmonic([(U, 'subsine', 0.75, 'gate')], sub([(s, 1, 0) for s in range(0, 16, 2)])), key=True)
loop(6, 'u5', 'Sub octaves', harmonic([(U, 'subsine', 0.75, 'gate')], sub([(0, 6, 0), (8, 3, 1), (12, 3, 0)])), key=True)
loop(6, 'u6', 'Sub drop', harmonic([(U, 'subsine', 0.8, 'gate')], sub([(0, 3, 0), (10, 2, 0)])), key=True)
# --- Vox / keys -----------------------------------------------------------------------------
V = 12
HYK = [(V, 'hype', 0.8, None)]
loop(7, 'v1', 'Check it, yeah', drums(HYK, {V: {HY['checkit']: [0], HY['uh']: [14]}}, {V: {HY['yeah']: [12]}}))
loop(7, 'v2', 'One two, hit it', drums(HYK, {V: {HY['onetwo']: [0], HY['hitit']: [8]}}, {}))
loop(7, 'v4', "Women's choir", harmonic([(V, 'choirwomen', 0.35, 'gate')], chord_hits([(0, 1)], slot=V, up=0, d=16)), key=True)

# The grid: per column, its six cells in order. A loop rendered here, or a sound the app
# already has ({lib, k}) played as is.
def hit(lib, k, name, vol=0.6): return {'lib': lib, 'k': k, 'mode': 'oneshot', 'name': name, 'vol': vol}
from drumlab import loop_cells
GRID = [*loop_cells('ebb'),
        ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'], ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'],
        ['l1', 'l2', 'l3', 'l4', 'l5', 'l6'], ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'],
        ['v1', 'v2', 'v4', {'lib': 'ambience', 'k': 1, 'mode': 'loop', 'name': 'Old record'},
         {'lib': 'hype', 'k': HY['alleluia'], 'mode': 'oneshot', 'name': 'Alleluia'},
         {'lib': 'hype', 'k': HY['selah'], 'mode': 'oneshot', 'name': 'Selah'}]]
BANKS = [None, None, None, 'ebbbass', 'ebbchords', 'ebblead', 'ebbsub', 'ebbvox']        # Kick, Snare, Tops: from drumlab.py
NAMES = [None, None, None, 'EBB Bass', 'EBB Chords', 'EBB Lead', 'EBB Sub', 'EBB Vox & Keys']
RATES = [32000, 32000, 32000, 22050, 24000, 32000, 16000, 24000]     # what each needs: the sub, little above 1 kHz
# How loud each column's loops are (RMS): the cells in a column take turns, so they are levelled
# to the same loudness, and the columns to a mix that sits together with every fader at 80.
# Drums are sparse, so their RMS is low for their loudness; the sub is a sine, felt more than heard.
# All of it at once (a cell in every column, faders at 80) peaks near 1.05, so the limiter
# rounds off only the very tops.
TARGET = [x * 0.7 for x in (0.15, 0.055, 0.025, 0.16, 0.13, 0.08, 0.16, 0.06)]
VOL = {}

def bars_of(lid): return len(LOOPS[lid][2]['patterns'])

if sys.argv[1] == 'songs':
    json.dump([{'id': lid, 'song': s} for lid, (_, _, s, _, _) in LOOPS.items()], open(sys.argv[2], 'w'))
    print(len(LOOPS), 'loops to render,', sum(bars_of(l) for l in LOOPS), 'bars')
elif sys.argv[1] == 'pack':
    WORK, OUT = sys.argv[2], sys.argv[3]
    def read(lid):                          # the render: float32 mono at 44.1 kHz, exactly its bars long
        return np.fromfile(f'{WORK}/{lid}.f32', np.float32)
    index = json.load(open(f'{OUT}/banks.json'))
    for c, (bank, name, rate) in enumerate(zip(BANKS, NAMES, RATES)):
        ids = [x for x in GRID[c] if isinstance(x, str)]
        if not ids: continue
        data, slices, names, tempo = [], [], [], []
        for lid in ids:
            x = read(lid)
            x = x * min(TARGET[c] / max(1e-6, float(np.sqrt(np.mean(x * x)))), 0.95 / float(np.max(np.abs(x))))
            bpm = LOOPS[lid][2]['bpm']                     # its own (a groove can be a little off 92)
            n = int(round(bars_of(lid) * 240 / bpm * rate))
            # resampled as a loop: three copies round it, the middle one kept, so the seam stays seamless
            three = np.tile(x, 3).astype(np.float32).tobytes()
            y = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', '44100', '-ac', '1', '-i', '-', '-ar', str(rate),
                                              '-f', 'f32le', '-'], input=three, capture_output=True, check=True).stdout, np.float32)
            m = len(y) // 3; y = y[m:m + n]
            if len(y) < n: y = np.concatenate([y, np.zeros(n - len(y), np.float32)])
            slices.append([len(data), len(data) + n]); names.append(LOOPS[lid][1]); tempo.append([bpm, bars_of(lid)])
            data.extend(y.tolist())
        pcm = (np.clip(np.array(data), -1, 1) * 32767).astype('<i2')
        w = wave.open(f'{OUT}/{bank}.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm.tobytes()); w.close()
        index[bank] = {'name': name, 'rate': rate, 'slices': slices, 'from': names, 'loops': tempo}
        print(f'{bank:10} {len(slices)} loops, {len(data) / rate:5.1f} s at {rate} Hz, {os.path.getsize(f"{OUT}/{bank}.wav") / 1e6:.2f} MB')
    for old in ('ebbkick', 'ebbsnare', 'ebbtops'):        # the first version's columns
        index.pop(old, None)
        if os.path.exists(f'{OUT}/{old}.wav'): os.remove(f'{OUT}/{old}.wav')
    json.dump(index, open(f'{OUT}/banks.json', 'w'), separators=(',', ':'))
    cells = []
    for c, col in enumerate(GRID):
        ids = [x for x in col if isinstance(x, str)]; out = []
        for x in col:
            if isinstance(x, dict): out.append(x); continue
            _, name, _, mode, key = LOOPS[x]
            out.append({'lib': BANKS[c], 'k': ids.index(x), 'mode': mode, 'name': name, **({'keyOf': ROOT, 'follow': True} if key else {}),
                        **({'vol': VOL[x]} if x in VOL else {})})
        cells.append(out)
    os.makedirs(f'{OUT}/sets', exist_ok=True)
    json.dump({'id': 'electroboombap', 'name': 'Electro Boom Bap', 'by': 'Claude', 'about': 'F minor · 92 BPM · swing 58',
               'bpm': BPM, 'root': ROOT, 'scale': 'minor', 'cells': cells}, open(f'{OUT}/sets/electroboombap.json', 'w'), separators=(',', ':'))
    print('sets/electroboombap.json: 8 columns x 6 cells')
