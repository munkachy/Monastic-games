# Usage: python3 -I records.py <sounds folder> <download folder>
# Real old records, in place of the vinyl noise once made in code: the hiss and crackle of
# Edison's own discs and cylinders (1888-1925), from the quiet grooves before and after the music.
# All are public domain (published before 1926, and marked so by the Internet Archive, which holds
# the Thomas Edison National Historical Park's transfers). Each piece is cut where there is no music
# (checked by ear-less means: no steady tones in its spectrum, and drawn to be looked at), lightly
# cleaned (the rumble under 30 Hz taken out), and made a seamless loop of about 10 s: a short piece
# is drawn out by joining short stretches of it in a shuffled order, overlapped so no joint clicks
# (it is still the record's own sound, only reordered); the seam of the loop is a crossfade.
# The first three replace the made-up vinyl in the Vinyl & Ambience bank, where every cell and pad
# that used them keeps working; the rest are added at its end.
import sys, os, json, wave, subprocess, urllib.request
import numpy as np

SOUNDS, DL = sys.argv[1], sys.argv[2]
R = 32000
# (name, archive.org item, from, to (s), level (RMS)); the first three take the vinyl's places
RECORDS = [
    ('Record hiss', 'EDIS-SRP-0165-12', 206.1, 209.46, 0.035),       # Edison Diamond Disc, 1922: the run-out
    ('Record crackle', 'EDIS-SRP-0191-06', 0.15, 6.0, 0.06),         # Edison, 1914 (the Secretary of the Navy's remarks): the lead-in
    ('Cylinder pops', 'EDIS-SRP-0204-17', 0.15, 3.34, 0.08),         # Edison Concert cylinder, 1900: the lead-in
    ('Record hiss 2', 'EDIS-SRP-0198-06', 207.57, 210.77, 0.03),     # Edison Diamond Disc test pressing, 1925: the run-out
    ('Cylinder crackle', 'EDIS-SRP-0191-08', 227.36, 230.65, 0.05),  # Edison Blue Amberol cylinder, 1914: the run-out
    ('Wax cylinder, 1888', 'EDIS-SRP-0190-12', 186.97, 189.98, 0.05),  # Gladstone's greeting to Edison, 1888: the run-out
    ('Run-out groove', 'EDIS-SRP-0192-13', 214.26, 228.79, 0.04),    # Edison Diamond Disc, 1919 (Rachmaninoff): the run-out, as it is
]
OLD = ['Vinyl light', 'Vinyl dusty', 'Vinyl worn']

def fetch(item):
    path = os.path.join(DL, item + '.mp3')
    if not os.path.exists(path) or os.path.getsize(path) < 10000:
        os.makedirs(DL, exist_ok=True)
        urllib.request.urlretrieve(f'https://archive.org/download/{item}/{item}.mp3', path)
    return path

def cut(path, a, b):
    x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(a), '-t', str(b - a), '-i', path, '-ac', '1', '-ar', str(R),
                                      '-af', 'highpass=f=30', '-f', 'f32le', '-'], capture_output=True, check=True).stdout, np.float32)
    return x.astype(float)

def drawn_out(x, secs, seed):
    # stretches of 0.4-0.8 s from anywhere in the piece, joined with 30 ms overlaps (equal power)
    rng = np.random.default_rng(seed); X = int(0.03 * R); out = np.zeros(0)
    fade_in, fade_out = np.sin(np.linspace(0, np.pi / 2, X)), np.cos(np.linspace(0, np.pi / 2, X))
    while len(out) < secs * R + X:
        n = int(rng.uniform(0.4, 0.8) * R); a = int(rng.integers(0, len(x) - n)); g = x[a:a + n].copy()
        if len(out): out[-X:] = out[-X:] * fade_out + g[:X] * fade_in; out = np.concatenate([out, g[X:]])
        else: out = g
    return out

def seamless(x):
    # the end crossfades into the start: the loop goes round without a seam
    X = int(0.25 * R); y = x[:-X].copy()
    y[:X] = y[:X] * np.sin(np.linspace(0, np.pi / 2, X)) + x[-X:] * np.cos(np.linspace(0, np.pi / 2, X))
    return y

made = []
for i, (name, item, a, b, level) in enumerate(RECORDS):
    x = cut(fetch(item), a, b)
    y = seamless(x if b - a > 10 else drawn_out(x, 10, i))
    y *= level / np.sqrt(np.mean(y ** 2)); y *= min(1, 0.95 / np.abs(y).max())
    made.append((name, y)); print(f'{name:20} {item}  {len(y) / R:5.1f} s  peak {np.abs(y).max():.2f}')

banks = json.load(open(f'{SOUNDS}/banks.json')); B = banks['ambience']
w = wave.open(f'{SOUNDS}/ambience.wav'); old = np.frombuffer(w.readframes(w.getnframes()), '<i2') / 32768; assert w.getframerate() == B['rate'] == R
keep = [(n, old[s:e]) for (s, e), n in zip(B['slices'], B['from'])]
# the first three: the vinyl's places (or these records', made again); the rest go at the end, once
assert all(keep[i][0] in (OLD[i], made[i][0]) for i in range(3)), [n for n, _ in keep[:3]]
later = {n for n, _ in made[3:]}
parts = made[:3] + [p for p in keep[3:] if p[0] not in later] + made[3:]
gap = int(0.02 * R); data, slices = [], []
for n, x in parts:
    slices.append([len(data), len(data) + len(x)]); data.extend(x.tolist()); data.extend([0.0] * gap)
pcm = (np.clip(np.array(data), -1, 1) * 32767).round().astype('<i2')
w = wave.open(f'{SOUNDS}/ambience.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(R); w.writeframes(pcm.tobytes()); w.close()
B.update(slices=slices, **{'from': [n for n, _ in parts]})
if 'loops' in B: B['loops'] = (B['loops'] + [None] * len(parts))[:len(parts)]
json.dump(banks, open(f'{SOUNDS}/banks.json', 'w'), separators=(',', ':'))
print('ambience:', B['from'], f'{os.path.getsize(f"{SOUNDS}/ambience.wav") / 1e6:.2f} MB')
