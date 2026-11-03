# Usage: python3 instruments.py <folder with the source checkouts> <output folder> [--list]
# Builds the pitched instruments: one recording every few semitones ("zones"),
# each a 32 kHz mono clip, packed into one WAV per instrument, with each
# zone's note and start/end (and loop points, for held sounds) in banks.json.
#
# Sources, all CC0:
#   vcsl/       https://github.com/sgossner/VCSL (Versilian Community Sample Library)
#   meatbass/   https://github.com/sfzinstruments/karoryfer.meatbass (Karoryfer Samples)
#   growlybass/ https://github.com/sfzinstruments/karoryfer.growlybass (Karoryfer Samples)
#   sso/        https://github.com/peastman/sso (Sonatina Symphonic Orchestra, CC Sampling Plus 1.0;
#               its celeste is CC0)
#   vsco/       https://github.com/sgossner/VSCO-2-CE (VSCO 2 Community Edition, CC0)
#   bgg/        https://github.com/sfzinstruments/karoryfer.black-and-green-guitars (Karoryfer, CC0)
#   emily/      https://github.com/sfzinstruments/karoryfer.emilyguitar (Karoryfer, CC0)
#   rhodes/     https://github.com/sfzinstruments/jlearman.jRhodes3d (Jeff Learman; samples CC BY-NC 4.0)
# Clone each with --filter=blob:none --no-checkout; this script checks out only
# the files it uses. Needs git, ffmpeg and numpy.
#
# Notes come from the file names, checked against the pitch of the recordings
# (autocorrelation): if the names are off by a constant, as several VCSL
# instruments' are by an octave (they call middle C "C3"), the measured offset
# is applied. Where measuring can't be trusted, OFFSET fixes it by hand: the
# glockenspiel is above the detector's 2 kHz range, the pipe organ's strong
# second harmonic fools it half the time, and a bell's pitch is not
# its loudest overtone (both checked by ear against their spectra).
OFFSET = {'glock': 12, 'bells': 0, 'pipeorgan': 12}
import subprocess, sys, os, json, re, wave
import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
LIST = '--list' in sys.argv
RATE = 32000

# id: (name, repo, folder, file regex, lowest, highest, step, seconds, loop)
INSTRUMENTS = {
  'piano': ('Grand Piano', 'vcsl', 'Chordophones/Zithers/Grand Piano, Steinway B/Sus/', r'_vl3_rr1\.wav$', 36, 96, 5, 2.6, False),
  'upright': ('Upright Piano', 'vcsl', 'Chordophones/Zithers/Upright Piano, Yamaha/Sustains/', r'_vl3_rr1\.wav$', 36, 96, 5, 2.4, False),
  'epiano': ('FM E-Piano', 'vcsl', 'Electrophones/TX81Z/FM Piano/', r'_vl2\.wav$', 36, 96, 5, 2.0, False),
  'harpsichord': ('Harpsichord', 'vcsl', 'Chordophones/Zithers/Harpsichord, Flemish/Sustains/', r'HarpsiRH_Low_Far_.*_rr1\.wav$', 36, 90, 5, 2.0, False),
  'pipeorgan': ('Pipe Organ', 'vcsl', 'Aerophones/Edge-blown Aerophones/Pipe Organ/Loud/', r'Rode_Man3Open_.*\.wav$', 36, 90, 5, 2.2, True),
  'renorgan': ('Renaissance Organ', 'vcsl', "Aerophones/Edge-blown Aerophones/Renaissance Organ/8'/", r'_rr1\.wav$', 36, 90, 5, 2.2, True),
  'vibes': ('Vibraphone', 'vcsl', 'Idiophones/Struck Idiophones/Vibraphone/Soft Mallets/', r'_v2_rr1_Main\.wav$', 48, 90, 5, 2.4, False),
  'marimba': ('Marimba', 'vcsl', 'Idiophones/Struck Idiophones/Marimba/', r'_loud_01\.wav$', 36, 96, 5, 1.4, False),
  'kalimba': ('Kalimba', 'vcsl', 'Idiophones/Plucked Idiophones/Kalimba, Tanzania/', r'\.wav$', 40, 90, 4, 1.6, False),
  'bells': ('Tubular Bells', 'vcsl', 'Idiophones/Struck Idiophones/Tubular Bells 2/', r'_v4_1\.wav$', 55, 80, 3, 3.0, False),
  'harp': ('Harp', 'vcsl', 'Chordophones/Composite Chordophones/Concert Harp/', r'_mf1\.wav$', 36, 96, 5, 2.2, False),
  'glock': ('Glockenspiel', 'vcsl', 'Idiophones/Struck Idiophones/Glockenspiel/', r'glock_medium_.*_01\.wav$', 60, 108, 5, 1.6, False),
  'uprightbass': ('Upright Bass', 'meatbass', 'Samples/pizz/', r'_vl3_rr1\.wav$', 24, 60, 4, 1.6, False),
  'elecbass': ('Electric Bass', 'growlybass', 'sustain/', r'_f_rr1\.wav$', 24, 60, 4, 1.8, True),
  # Build 4: strings, guitars, horns, choirs and more
  'violin': ('Violin', 'sso', 'Sonatina Symphonic Orchestra/Samples/Violin/', r'/violin-[a-g]#?\d\.(wav|flac)$', 55, 100, 3, 2.4, True),
  'viola': ('Viola', 'sso', 'Sonatina Symphonic Orchestra/Samples/Viola/', r'/viola-sus-', 48, 88, 3, 2.4, True),
  'cello': ('Cello', 'sso', 'Sonatina Symphonic Orchestra/Samples/Cello/', r'/cello-[a-g]#?\d\.(wav|flac)$', 36, 76, 3, 2.4, True),
  'contrabass': ('Double Bass', 'sso', 'Sonatina Symphonic Orchestra/Samples/Bass/', r'/bass-sus-', 28, 60, 4, 2.4, True),
  'pizz': ('Pizzicato Cello', 'sso', 'Sonatina Symphonic Orchestra/Samples/Cello/', r'/cello-piz-rr1-', 36, 76, 4, 1.2, False),
  'choirmen': ('Choir (men)', 'sso', 'Sonatina Symphonic Orchestra/Samples/Chorus/', r'/chorus-male-', 40, 70, 3, 2.6, True),
  'choirwomen': ('Choir (women)', 'sso', 'Sonatina Symphonic Orchestra/Samples/Chorus/', r'/chorus-female-', 60, 88, 3, 2.6, True),
  'celeste': ('Celeste', 'sso', 'Sonatina Symphonic Orchestra/Samples/Celeste/', r'/celeste-[a-g]#?\d-hard', 60, 108, 5, 1.6, False),
  'gretsch': ('Gretsch Guitar', 'bgg', 'Samples/green/ord/', r'_f_rr1\.wav$', 40, 84, 3, 2.2, False),
  'hofner': ('Hofner Guitar', 'bgg', 'Samples/black/ord/', r'_f_rr1\.wav$', 40, 84, 3, 2.2, False),
  'emily': ('Electric Guitar', 'emily', 'notes/', r'_f_rr1\.wav$', 40, 84, 3, 2.0, False),
  'rhodes': ('Rhodes', 'rhodes', 'jRhodes3d-mono/', r'_[23]\.flac$', 36, 96, 4, 2.6, False),
  'trumpet': ('Trumpet Stab', 'vsco', 'Brass/Trumpet/stac/', r'_v2_rr1\.wav$', 52, 84, 3, 0.8, False),
  'trombone': ('Trombone Stab', 'vsco', 'Brass/Tenor Trombone/stac/', r'_v2_rr1\.wav$', 40, 72, 3, 0.8, False),
  'tenorsax': ('Tenor Sax', 'vcsl', 'Aerophones/Reed Aerophones/Tenor Saxophone/', r'_vl3_rr1\.wav$', 44, 80, 4, 2.0, True),
  'xylophone': ('Xylophone', 'vcsl', 'Idiophones/Struck Idiophones/Xylophone/', r'_ff_01_far\.wav$', 60, 108, 5, 1.0, False),
}

def files_of(repo):
    out = subprocess.run(['git', '-C', f'{SRC}/{repo}', 'ls-tree', '-r', '--name-only', 'HEAD'], capture_output=True, text=True, check=True).stdout
    return out.splitlines()

def checkout(repo, paths):
    for i in range(0, len(paths), 50):
        subprocess.run(['git', '-C', f'{SRC}/{repo}', 'checkout', '-q', 'HEAD', '--'] + paths[i:i + 50], check=True)

def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(RATE), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

def pitch(x):
    # The fundamental of the steadiest part (from 80 ms in), by autocorrelation,
    # as a MIDI note number (with cents as a fraction).
    a = int(0.08 * RATE); seg = x[a:a + int(0.25 * RATE)]
    if len(seg) < 2048: seg = x[:int(0.3 * RATE)]
    seg = (seg - seg.mean()) * np.hanning(len(seg))
    n = 1 << (len(seg) * 2 - 1).bit_length()
    f = np.fft.rfft(seg, n); ac = np.fft.irfft(f * np.conj(f))[:len(seg)]
    lo, hi = int(RATE / 2000), int(RATE / 25)          # 25 Hz .. 2 kHz
    lag = lo + int(np.argmax(ac[lo:hi]))
    # prefer the shortest lag whose peak is nearly as strong (avoids octave-down errors)
    for div in (4, 3, 2):
        l2 = lag // div
        if l2 >= lo:
            w = slice(max(lo, l2 - 2), l2 + 3); k = w.start + int(np.argmax(ac[w]))
            if ac[k] > 0.85 * ac[lag]: lag = k; break
    if 1 <= lag < len(ac) - 1:                         # parabolic peak for sub-sample accuracy
        y0, y1, y2 = ac[lag - 1], ac[lag], ac[lag + 1]; d = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2 or 1); lag += d
    return 69 + 12 * np.log2(RATE / lag / 440)

NOTE = re.compile(r'(?:^|[_-])([A-Ga-g])(#|b)?(-?\d)(?=[_.-]|$)')
def named(path):           # "C#4", "eb1", "A0": MIDI note, C4 = 60
    m = NOTE.search(os.path.basename(path))
    if not m: return None
    pc = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}[m.group(1).upper()] + {'#': 1, 'b': -1}.get(m.group(2), 0)
    return 12 * (int(m.group(3)) + 1) + pc

def seamless_loop(x):
    # Loop from 40% in to the end; the last 150 ms fade into what comes just
    # before the loop start, so the jump back is smooth.
    a, b, X = int(len(x) * 0.4), len(x), int(0.15 * RATE)
    w = np.linspace(0, 1, X, dtype=np.float32)
    x[b - X:b] = x[b - X:b] * (1 - w) + x[a - X:a] * w
    return a, b

index = json.load(open(f'{OUT}/banks.json'))
for key, (name, repo, folder, rx, lo, hi, step, cap, loop) in INSTRUMENTS.items():
    if len(sys.argv) > 3 and sys.argv[3] not in ('--list', key) and key not in sys.argv[3:]: continue
    cands = [f for f in files_of(repo) if f.startswith(folder) and re.search(rx, f)]
    if LIST: print(key, len(cands), [os.path.basename(c) for c in cands[:4]]); continue
    checkout(repo, cands)
    takes = []
    for f in cands:
        x = load(f'{SRC}/{repo}/{f}')
        if len(x) < RATE * 0.2 or np.max(np.abs(x)) < 1e-3: continue
        m = pitch(x)
        takes.append((f, x, m if np.isfinite(m) else None))
    offs = [round(m - named(f)) for f, _, m in takes if m is not None and named(f) is not None]
    off = OFFSET.get(key, int(np.median(offs)) if offs else 0)
    agree = sum(o == off for o in offs)
    print(f'  {key}: names {off:+d} semitones; {agree} of {len(offs)} recordings measure exactly that')
    note = lambda f, m: named(f) + off if named(f) is not None else None
    notes = {}
    for f, x, m in takes:
        n = note(f, m)
        if n is not None: notes.setdefault(n, (n, x, f))
    zones, data, last = [], [], -99
    for mi in sorted(notes):
        if not lo <= mi <= hi or mi - last < step: continue
        m, x, f = notes[mi]
        pk = float(np.max(np.abs(x))); a = int(np.argmax(np.abs(x) > pk * 0.05))
        x = x[max(0, a - RATE // 1000):][:int(cap * RATE)]
        x = (x / (np.max(np.abs(x)) or 1) * 0.9).astype(np.float32)
        if loop:
            la, lb = seamless_loop(x)
        else:
            fade = min(len(x), int(0.05 * RATE)); x[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32); la = lb = 0
        start = len(data)
        data.extend(x.tolist()); data.extend([0.0] * int(0.02 * RATE))
        z = [round(float(m), 2), start, start + len(x)] + ([start + la, start + lb] if loop else [])
        zones.append(z); last = mi
    pcm = (np.clip(np.array(data, dtype=np.float32), -1, 1) * 32767).astype('<i2')
    w = wave.open(f'{OUT}/{key}.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
    w.writeframes(pcm.tobytes()); w.close()
    index[key] = {'name': name, 'rate': RATE, 'zones': zones}
    print(f'{key}: {len(zones)} zones, notes {[round(z[0]) for z in zones]}, {len(data) / RATE:.1f} s, {os.path.getsize(f"{OUT}/{key}.wav") / 1e6:.2f} MB')
if not LIST: json.dump(index, open(f'{OUT}/banks.json', 'w'), separators=(',', ':'))
