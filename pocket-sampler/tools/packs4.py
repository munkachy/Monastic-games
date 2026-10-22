# Usage: python3 packs4.py <dirt> <vcsl> <work folder> <sounds folder> [pack ids]
# Builds Build 4's packs of hits (up to 16 sounds each, one per key) and loops,
# as banks (one WAV each, slices in banks.json), like banks.py.
#
# Sources:
#   dirt/  TidalCycles' Dirt-Samples, https://github.com/tidalcycles/Dirt-Samples
#          (gathered over the years for the live-coding community; mostly from
#          freesound.org and the people who made them; licenses vary)
#   808:   the TR-808 recorded by Michael Fischer (1994), as packaged in
#          @fluid-music/tr-808 on npm (fetched from cdn.jsdelivr.net)
#   vcsl/  Versilian Community Sample Library, CC0
#   gen:   made here: risers, sirens, a respirator, vinyl crackle
#   work:  files made beforehand in the work folder: hype/*.wav, words spoken by
#          Vox Machina's eSpeak voices (rendered in the browser)
# Each sound is cut to `cap` seconds, started just before its attack, and
# levelled (peak 0.9 x level). Loops keep their own length, are not trimmed,
# and carry a tempo and a length in bars, so the app keeps them in time.
import os, sys, json, glob, wave, subprocess, urllib.request
import numpy as np

DIRT, VCSL, WORK, OUT = sys.argv[1:5]
RATE = 32000
rng = np.random.default_rng(11)
TR808 = 'https://cdn.jsdelivr.net/npm/@fluid-music/tr-808@0.0.2/TR808WAV/'

def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(RATE), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()

def dirt(spec):            # "folder/3" (the 4th file, as the folder sorts) or "folder/name"
    d, k = spec.split('/', 1); fs = sorted(glob.glob(f'{DIRT}/{d}/*'))
    return decode(fs[int(k)] if k.isdigit() else next(f for f in fs if os.path.basename(f).startswith(k)))

def tr808(path):
    local = f'{WORK}/808/{path}'
    if not os.path.exists(local):
        os.makedirs(os.path.dirname(local), exist_ok=True)
        open(local, 'wb').write(urllib.request.urlopen(TR808 + path, timeout=60).read())
    return decode(local)

def vcsl(path): return decode(f'{VCSL}/{path}')

# ---- made here ----
t_ = lambda s: np.arange(int(s * RATE)) / RATE
def lowpass(x, a): y = np.zeros_like(x); acc = 0.0
def onepole(x, a):
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x): acc += a * (v - acc); y[i] = acc
    return y
def riser(secs, up=True):
    t = t_(secs); f = 200 * (40 ** (t / secs if up else 1 - t / secs))
    noise = rng.uniform(-1, 1, len(t)); ph = np.cumsum(2 * np.pi * f / RATE)
    tone = np.sin(ph) * 0.3 + np.sign(np.sin(ph * 1.01)) * 0.1
    filt = np.zeros(len(t)); acc = 0.0
    for i in range(len(t)):
        a = min(0.99, f[i] * 4 / RATE); acc += a * (noise[i] - acc); filt[i] = acc
    env = (t / secs) ** 2 if up else (1 - t / secs) ** 2
    return (filt * 0.8 + tone) * env
def siren(kind, secs=3.0):
    t = t_(secs)
    if kind == 'wail': f = 700 + 500 * (0.5 - 0.5 * np.cos(2 * np.pi * t / 3.0))
    elif kind == 'yelp': f = 700 + 500 * ((t * 3.5) % 1)
    else: f = np.where((t * 1.5) % 1 < 0.5, 950, 700)                         # hi-lo
    ph = np.cumsum(2 * np.pi * f / RATE)
    x = np.sign(np.sin(ph)) * 0.4 + np.sin(2 * ph) * 0.2
    return np.convolve(x, np.ones(4) / 4, 'same') * np.minimum(1, t / 0.05)
def respirator(secs=3.6):
    # a mask: a slow breath in (rising hiss through a narrow pipe), a valve clack, a breath out (lower, rougher)
    t = t_(secs); half = len(t) // 2; noise = rng.uniform(-1, 1, len(t)); x = np.zeros(len(t))
    for a, b, f0, f1, rough in ((0, half, 900, 1400, 0.2), (half, len(t), 700, 500, 0.6)):
        n = b - a; tt = np.arange(n) / n
        env = np.sin(np.pi * tt) ** 0.7
        f = f0 + (f1 - f0) * tt; seg = np.zeros(n); acc = 0.0; acc2 = 0.0
        for i in range(n):     # a resonant band of the noise: the pipe
            w = 2 * np.pi * f[i] / RATE; r = 0.985
            y = noise[a + i] + 2 * r * np.cos(w) * acc - r * r * acc2; acc2, acc = acc, y; seg[i] = y
        seg *= 1 + rough * np.sin(2 * np.pi * 31 * np.arange(n) / RATE)      # the rasp
        x[a:b] = seg / (np.abs(seg).max() or 1) * env
    for at in (0, half):
        k = np.arange(int(0.03 * RATE)); x[at:at + len(k)] += np.sin(2 * np.pi * 180 * k / RATE) * np.exp(-k / 120) * 0.6
    return x
def vinyl(secs, crackle, hiss, rumble, seed):
    r = np.random.default_rng(seed); n = int(secs * RATE)
    x = onepole(r.normal(0, 1, n), 0.25) * hiss                              # the hiss, dulled
    pops = r.random(n) < crackle / RATE                                      # clicks and pops, some bigger
    x[pops] += r.choice([-1, 1], pops.sum()) * r.uniform(0.2, 1.0, pops.sum())
    x = np.convolve(x, [0.5, 0.3, 0.2], 'same')
    x += np.sin(2 * np.pi * (33.3 / 60) * np.arange(n) / RATE * 1) * 0 + onepole(r.normal(0, 1, n), 0.002) * rumble   # rumble
    return x
def rain(secs):
    # rain: a soft wash of noise and many small drops, each a short ping
    r = np.random.default_rng(5); n = int(secs * RATE)
    x = onepole(r.normal(0, 1, n), 0.3) * 0.15
    for at in r.integers(0, n - 800, int(secs * 60)):
        k = np.arange(600); f = r.uniform(1500, 5000)
        x[at:at + 600] += np.sin(2 * np.pi * f * k / RATE) * np.exp(-k / r.uniform(40, 150)) * r.uniform(0.05, 0.4)
    return x
GEN = {'riser': lambda: riser(4.0), 'riser2': lambda: riser(2.0), 'downlifter': lambda: riser(2.5, False),
       'wail': lambda: siren('wail'), 'yelp': lambda: siren('yelp'), 'hilo': lambda: siren('hilo'),
       'respirator': respirator, 'respirator2': lambda: respirator(4.4),
       'vinyl-light': lambda: vinyl(8.0, 6, 0.05, 0.05, 1), 'vinyl-dusty': lambda: vinyl(8.0, 25, 0.12, 0.1, 2),
       'vinyl-worn': lambda: vinyl(8.0, 70, 0.25, 0.25, 3), 'rain': lambda: rain(8.0)}
def amen(_):
    return np.concatenate([decode(f) for f in sorted(glob.glob(f'{DIRT}/amencutup/*'))])

def src(spec):
    kind, path = spec.split(':', 1)
    return {'dirt': dirt, '808': tr808, 'vcsl': vcsl, 'gen': lambda p: GEN[p](), 'work': lambda p: decode(f'{WORK}/{p}'), 'amen': amen}[kind](path)

V = 'Idiophones/Struck Idiophones/'
PACKS = {
  # Drums. Hit names say what each is, so the beat maker finds kick, snare, hat...
  'tr808': ('TR-808', [('Kick', '808:BD/BD0050.WAV'), ('Boom kick', '808:BD/BD2575.WAV', 3.0), ('Short kick', '808:BD/BD5025.WAV'),
    ('Snare', '808:SD/SD0050.WAV'), ('Snappy snare', '808:SD/SD5075.WAV'), ('Clap', '808:CP/CP.WAV'), ('Rimshot', '808:RS/RS.WAV'),
    ('Hat', '808:CH/CH.WAV', 0.3, 0.6), ('Open hat', '808:OH/OH25.WAV', 1.0, 0.6), ('Cymbal', '808:CY/CY0050.WAV', 2.0, 0.55),
    ('Cowbell', '808:CB/CB.WAV', 1.0, 0.7), ('Clave', '808:CL/CL.WAV', 0.5, 0.7), ('High tom', '808:HT/HT50.WAV'), ('Low tom', '808:LT/LT50.WAV'),
    ('Conga', '808:HC/HC25.WAV'), ('Maracas', '808:MA/MA.WAV', 0.4, 0.6)]),
  'electro': ('Electro Kit', [('Kick', 'dirt:electro1/005'), ('Kick 2', 'dirt:electro1/006'), ('Snare', 'dirt:electro1/011'), ('Snare 2', 'dirt:tech/tn1snare2'),
    ('Hat', 'dirt:electro1/000', 0.3, 0.6), ('Open hat', 'dirt:electro1/007', 0.8, 0.6), ('Linn hat', 'dirt:linnhats/1', 0.3, 0.6), ('Linn hat 2', 'dirt:linnhats/3', 0.3, 0.6),
    ('Crash', 'dirt:electro1/001', 1.5, 0.6), ('Ride', 'dirt:electro1/010', 1.5, 0.55), ('Hit', 'dirt:electro1/002'), ('Hit 2', 'dirt:electro1/003'),
    ('Hit 3', 'dirt:electro1/004'), ('Perc', 'dirt:electro1/008'), ('Perc 2', 'dirt:electro1/009'), ('Linn kick', 'dirt:kicklinn/0')]),
  'drumtraks': ('Drumtraks', [('Kick', 'dirt:drumtraks/006'), ('Snare', 'dirt:drumtraks/009'), ('Clap', 'dirt:drumtraks/001'), ('Rimshot', 'dirt:drumtraks/008'),
    ('Hat', 'dirt:drumtraks/004', 0.3, 0.6), ('Open hat', 'dirt:drumtraks/005', 0.8, 0.6), ('Crash', 'dirt:drumtraks/003', 1.5, 0.6), ('Ride', 'dirt:drumtraks/007', 1.5, 0.55),
    ('Cowbell', 'dirt:drumtraks/002', 0.8, 0.7), ('Tambourine', 'dirt:drumtraks/010', 0.8, 0.6), ('Cabasa', 'dirt:drumtraks/000', 0.5, 0.6),
    ('High tom', 'dirt:drumtraks/011'), ('Low tom', 'dirt:drumtraks/012'), ('Linn kick', 'dirt:kicklinn/0'), ('Linn hat', 'dirt:linnhats/2', 0.3, 0.6), ('Linn hat 2', 'dirt:linnhats/5', 0.3, 0.6)]),
  'boombap': ('Boom Bap Kit', [('Kick', 'dirt:jazz/000'), ('Kick 2', 'dirt:bd/3'), ('Kick 3', 'dirt:bd/9'), ('Snare', 'dirt:jazz/007'),
    ('Snare 2', 'dirt:sn/7'), ('Snare 3', 'dirt:sn/12'), ('Ghost snare', 'dirt:sn/2', 0.3, 0.35), ('Hat', 'dirt:jazz/003', 0.3, 0.6),
    ('Open hat', 'dirt:jazz/004', 0.8, 0.6), ('Hat 2', 'dirt:hh/6', 0.3, 0.55), ('Rimshot', 'dirt:gretsch/010'), ('Cowbell', 'dirt:jazz/001', 0.6, 0.6),
    ('Perc', 'dirt:jazz/005'), ('Perc 2', 'dirt:jazz/006'), ('Brush snare', 'dirt:gretsch/002'), ('Crash', 'dirt:gretsch/007', 1.6, 0.6)]),
  # Percussion
  'bells2': ('Bells', [('Cowbell', f'vcsl:{V}Cowbells/Cowbell1_Hit_v3_rr1_Mid.wav'), ('Cowbell muted', f'vcsl:{V}Cowbells/Cowbell1_Muted_v3_rr1_Mid.wav'),
    ('Double cowbell', f'vcsl:{V}Cowbells/Cowbell2_Double_v2_rr1_Mid.wav'), ('Hand bell', f'vcsl:{V}Hand Bells, Nepalese/HB_1.wav', 3.0),
    ('Hand bell 2', f'vcsl:{V}Hand Bells, Nepalese/HB_2.wav', 3.0), ('Hand bell 3', f'vcsl:{V}Hand Bells, Nepalese/HB_3.wav', 3.0),
    ('Gong', f'vcsl:{V}Gong 1/gong_f.wav', 4.0), ('Gong soft', f'vcsl:{V}Gong 1/gong_mf.wav', 4.0), ('Sleigh bells', 'vcsl:' + V + 'Sleigh Bells/', 1.5),
    ('Triangle', 'vcsl:' + V + 'Triangles/', 2.5), ('Agogo', 'vcsl:' + V + 'Agogo Bells/'), ('Bell tree', 'vcsl:' + V + 'Bell Tree/', 2.5),
    ('Mark tree', 'vcsl:' + V + 'Mark Trees/', 2.5), ('Finger cymbals', 'vcsl:' + V + 'Finger Cymbals/', 2.0), ('Metal', 'dirt:metal/3'), ('Metal 2', 'dirt:metal/7')]),
  'shakers': ('Tambourine & Shakers', [('Tambourine', f'vcsl:{V}Tambourine 1/Tamb1_Hit_v2_rr1_Mid.wav'), ('Tambourine shake', f'vcsl:{V}Tambourine 1/Tamb1_Shake_rr1_Mid.wav'),
    ('Tambourine roll', f'vcsl:{V}Tambourine 1/Tamb1_Roll_v2_rr1_Mid.wav', 2.0), ('Tambourine 2', 'vcsl:' + V + 'Tambourine 2/'),
    ('Shaker', 'vcsl:' + V + 'Shaker, Small/'), ('Big shaker', 'vcsl:' + V + 'Shaker, Large/'), ('Cabasa', 'vcsl:' + V + 'Cabasa/'),
    ('Guiro', 'vcsl:' + V + 'Guiro/'), ('Claves', 'vcsl:' + V + 'Claves/'), ('Woodblock', 'vcsl:' + V + 'Woodblock/'),
    ('Vibraslap', 'vcsl:' + V + 'Vibraslap/', 2.0), ('Ratchet', 'vcsl:' + V + 'Ratchet/'), ('Slapstick', 'vcsl:' + V + 'Slapstick/'),
    ('Sleigh bells', 'vcsl:' + V + 'Sleigh Bells/', 1.5), ('Claps', 'vcsl:' + V + 'Claps/'), ('Flexatone', 'vcsl:' + V + 'Flexatone/', 1.5)]),
  # Vocals
  'hype': ('Hype Words (robot)', [(w, f'work:hype/{f}.wav', 1.2) for w, f in [('Yeah', 'yeah'), ('Uh', 'uh'), ('Ho', 'ho'), ('Check it', 'checkit'),
    ('Come on', 'comeon'), ("Let's go", 'letsgo'), ('Hit it', 'hitit'), ('One two', 'onetwo'), ('Say what', 'saywhat'), ('Drop', 'drop'),
    ('Word', 'word'), ('Peace', 'peace'), ('Amen', 'amen'), ('Alleluia', 'alleluia'), ('Selah', 'selah'), ('Again', 'again')]]),
  'robotvox': ('Robot Voices', [(f'Speak & Spell {i + 1}', f'dirt:speakspell/{i}') for i in range(12)]
    + [(f'Diphone {i + 1}', f'dirt:diphone/{k}') for i, k in enumerate([0, 9, 18, 27])]),
  'vocchops': ('Vocal Chops', [(n, f'dirt:speechless/{i}') for i, n in enumerate(['A', 'Pe', 'Pepepe', 'Pepepepepe', 'Pepper', 'Pepperpot', 'Pick', 'Pickle', 'Po', 'Te'])]
    + [(f'Speech {i + 1}', f'dirt:speech/{i}') for i in range(6)]),
  # Ambient
  'nature': ('Nature', [(f'Birds {i + 1}', f'dirt:birds/{k}', 3.0) for i, k in enumerate([0, 2, 4, 6, 8])] + [(f'Birdsong {i + 1}', f'dirt:birds3/{k}', 3.0) for i, k in enumerate([0, 5, 10])]
    + [('Crow', 'dirt:crow/0', 2.0), ('Crow 2', 'dirt:crow/2', 2.0), ('Katydid', 'dirt:insect/2', 3.0), ('Cricket', 'dirt:insect/0', 3.0),
       ('Fire', 'dirt:fire/0', 4.0), ('Wind', 'dirt:wind/0', 4.0), ('Wind 2', 'dirt:wind/5', 4.0), ('Outdoors', 'dirt:outdoor/0', 4.0)]),
  'airwater': ('Air & Water', [('Respirator', 'gen:respirator', 4.0), ('Respirator 2', 'gen:respirator2', 5.0), ('Breath', 'dirt:breath/0', 3.0),
    ('Ocean drum', 'vcsl:Membranophones/Other Membranophones/Ocean Drum/OceanDrum_Sus_1_Mid.wav', 4.0)]
    + [(f'Bubble {i + 1}', f'dirt:bubble/{k}', 1.0) for i, k in enumerate([0, 2, 4, 6])] + [(f'Wind {i + 1}', f'dirt:wind/{k}', 4.0) for i, k in enumerate([1, 3, 7, 9])]
    + [(f'Space {i + 1}', f'dirt:space/{k}', 3.0) for i, k in enumerate([0, 4, 8, 12])]),
  # FX
  'arcade': ('Arcade FX', [(f'Invader {i + 1}', f'dirt:invaders/{k}', 1.5) for i, k in enumerate([0, 3, 6, 9])]
    + [(n, f'dirt:tacscan/{k}', 1.5) for n, k in [('1-up', 3), ('Credit', 4), ('Explosion', 5), ('Shot', 6)]]
    + [(f'Sub {i + 1}', f'dirt:subroc3d/{k}', 1.5) for i, k in enumerate([0, 4])]
    + [(n, f'dirt:cosmicg/{k}', 1.5) for n, k in [('Attack', 0), ('Gun', 6), ('Destroy', 2)]] + [(f'SID {i + 1}', f'dirt:sid/{k}', 1.0) for i, k in enumerate([3, 5, 11])]),
  'machines': ('Machines', [(f'Machine {i + 1}', f'dirt:industrial/{k}', 2.0) for i, k in enumerate(range(0, 32, 3))][:11]
    + [(f'Metal {i + 1}', f'dirt:metal/{k}', 1.5) for i, k in enumerate([0, 2, 5, 8, 9])]),
  'noisefx': ('Noise & Risers', [('Riser', 'gen:riser', 4.0), ('Short riser', 'gen:riser2', 2.0), ('Downlifter', 'gen:downlifter', 2.5), ('White noise', 'dirt:noise/0', 2.0)]
    + [(f'Noise {i + 1}', f'dirt:noise2/{k}', 2.0) for i, k in enumerate([0, 2, 4, 6])] + [(f'Speed up/down {i + 1}', f'dirt:speedupdown/{k}', 2.0) for i, k in enumerate([0, 3, 6])]
    + [(f'Bend {i + 1}', f'dirt:bend/{k}', 2.0) for i, k in enumerate([0, 2])] + [(f'Distortion {i + 1}', f'dirt:dist/{k}', 1.5) for i, k in enumerate([0, 4, 8])]),
  'sirens': ('Sirens', [('Wail', 'gen:wail', 3.0), ('Yelp', 'gen:yelp', 3.0), ('Hi-lo', 'gen:hilo', 3.0)]
    + [(f'Siren whistle {i + 1}', f'vcsl:Aerophones/Free Aerophones/Siren/{n}', 3.0) for i, n in enumerate(['Main_SirenWhistle-002.wav', 'Main_SirenWhistle-005.wav', 'Main_SirenWhistle-008.wav', 'Main_SirenWhistle-009.wav', 'Main_SirenWhistle-010.wav'])]),
  # Synth
  'stabs': ('Synth Stabs', [(f'Juno {n}', f'dirt:juno/{k}', 1.5) for n, k in [('low', 0), ('mid', 1), ('high', 2), ('chorus low', 3), ('chorus mid', 4), ('chorus high', 5)]]
    + [(f'Stab {i + 1}', f'dirt:stab/{k}', 1.0) for i, k in enumerate([0, 4, 8, 12, 16, 20])] + [('Hoover', 'dirt:hoover/0', 1.5), ('Hoover 2', 'dirt:hoover/3', 1.5),
       ('Arp', 'dirt:arpy/0', 0.5), ('Arp 2', 'dirt:arpy/5', 0.5)]),
  'basshits': ('Bass Hits', [(f'JV bass {i + 1}', f'dirt:jvbass/{k}') for i, k in enumerate([0, 2, 4, 6, 8, 10])]
    + [(n, f'dirt:jungbass/{k}', 2.0) for n, k in [('Deep low', 0), ('808 sub', 1), ('Glide', 3), ('808 glide', 4), ('Sub down', 5), ('Sine', 7)]]
    + [('Moog C', 'dirt:moog/0', 2.0), ('Moog G', 'dirt:moog/3', 2.0), ('Bass hit', 'dirt:bass1/0', 1.0), ('Bass hit 2', 'dirt:bass3/0', 1.0)]),
  'pads': ('Pads', [('Alien monolith', 'dirt:pad/0', 6.0), ('Angel', 'dirt:pad/1', 6.0), ('Bell harmonics', 'dirt:pad/2', 6.0), ('Abduction', 'dirt:padlong/0', 8.0),
    ('Juno release low', 'dirt:juno/6', 3.0), ('Juno release mid', 'dirt:juno/7', 3.0), ('Juno long', 'dirt:juno/9', 3.4), ('Juno long 2', 'dirt:juno/10', 3.4)]),
  'funkhorns': ('Funk Horns', [(n, f'dirt:trump/{k}', 1.0) for n, k in [('Tight stab B', 0), ('Tight stab B low', 1), ('Tight stab E', 2), ('Tight stab G', 3),
    ('Stab B', 5), ('Stab B low', 6), ('Stab E', 7), ('Stab G', 8)]]),
}

# Loops: (name, source, tempo, bars). A loop with a tempo is cut to exactly
# that many bars and kept in time by the app (stretched to the tempo playing);
# one without (ambience) loops at its own length, its end blended into its start.
DRUMLOOPS = [('Boom bap', 'boombap', 90), ('Lo-fi', 'lofi', 76), ('Lazy hip hop', 'hiphop', 84), ('Trap', 'trap', 140),
  ('Funky break', 'funkybreak', 100), ('Funk', 'funk', 104), ('House', 'house', 124), ('Techno', 'techno', 132), ('Disco', 'disco', 118),
  ('Jazz brushes', 'jazzbrush', 132), ('Drum & bass', 'dnb', 172), ('Electro break', 'electrobreak', 110), ('Dembow', 'dembow', 96), ('Dubstep', 'dubstep', 140)]
LOOPS = {
  'drumloops': ('Drum Loops', [(f'{n} {b}', f'work:loops/{f}.wav', b, 2) for n, f, b in DRUMLOOPS]),
  'breaks': ('Breakbeats', [('Amen', 'amen:', 16 * 60 / 6.44, 4), ('Amen 152', 'dirt:breaks152/0', 12 * 60 / 4.70, 3),
    ('Stick break', 'dirt:breaks125/0', 4 * 60 / 1.87, 1), ('Stomp break', 'dirt:breaks125/1', 4 * 60 / 1.94, 1),
    ('Plead break', 'dirt:breaks157/0', 157, 1), ('Raw break', 'dirt:breaks165/0', 4 * 60 / 1.42, 1)]),
  'ambience': ('Vinyl & Ambience', [('Vinyl light', 'gen:vinyl-light', None, 0), ('Vinyl dusty', 'gen:vinyl-dusty', None, 0),
    ('Vinyl worn', 'gen:vinyl-worn', None, 0), ('Rain', 'gen:rain', None, 0), ('Wind', 'dirt:wind/0', None, 0), ('Wind 2', 'dirt:wind/5', None, 0),
    ('Birdsong', 'dirt:birds3/0', None, 0), ('Ocean', 'vcsl:Membranophones/Other Membranophones/Ocean Drum/OceanDrum_Sus_2_Mid.wav', None, 0),
    ('Fire', 'dirt:fire/0', None, 0), ('Respirator', 'gen:respirator', None, 0)]),
}

def first_of(path):        # a folder given: its first file (round robin 1, a middle velocity, as the folder sorts)
    if not path.endswith('/'): return path
    fs = sorted(os.path.relpath(os.path.join(d, f), f'{VCSL}/{path}') for d, _, ff in os.walk(f'{VCSL}/{path}') for f in ff if f.lower().endswith('.wav'))
    pick = [f for f in fs if 'rr1' in f.lower() and ('v2' in f.lower() or 'mf' in f.lower())] or [f for f in fs if 'rr1' in f.lower()] or fs
    return path + pick[0]

def checkout_vcsl(paths):
    need = []
    for p in paths:
        if p.endswith('/'):
            out = subprocess.run(['git', '-C', VCSL, 'ls-tree', '-r', '--name-only', 'HEAD', p], capture_output=True, text=True).stdout.split('\n')
            need += [f for f in out if f.lower().endswith('.wav')]
        else: need.append(p)
    for i in range(0, len(need), 50): subprocess.run(['git', '-C', VCSL, 'checkout', '-q', 'HEAD', '--'] + need[i:i + 50], check=True)

index = json.load(open(f'{OUT}/banks.json'))
for pid, (name, hits) in PACKS.items():
    if len(sys.argv) > 5 and pid not in sys.argv[5:]: continue
    checkout_vcsl([s.split(':', 1)[1] for _, s, *r in hits if s.startswith('vcsl:')])
    data, slices, names = [], [], []
    for label, spec, *rest in hits[:16]:
        cap = rest[0] if rest else 0.8; level = rest[1] if len(rest) > 1 else 1.0
        if spec.startswith('vcsl:'): spec = 'vcsl:' + first_of(spec[5:])
        x = src(spec)
        if not len(x): print('  empty:', spec); continue
        pk = float(np.max(np.abs(x))) or 1; a = int(np.argmax(np.abs(x) > pk * 0.05))
        x = x[max(0, a - RATE // 1000):][:int(cap * RATE)] * (0.9 * level / pk)
        fade = min(len(x), int(0.02 * RATE)); x[-fade:] *= np.linspace(1, 0, fade)
        slices.append([len(data), len(data) + len(x)]); names.append(label)
        data.extend(x.tolist()); data.extend([0.0] * int(0.02 * RATE))
    pcm = (np.clip(np.array(data), -1, 1) * 32767).astype('<i2')
    w = wave.open(f'{OUT}/{pid}.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(pcm.tobytes()); w.close()
    index[pid] = {'name': name, 'rate': RATE, 'slices': slices, 'from': names}
    print(f'{pid:10} {len(slices):2} sounds, {len(data) / RATE:5.1f} s, {os.path.getsize(f"{OUT}/{pid}.wav") / 1e6:.2f} MB')
for pid, (name, loops) in LOOPS.items():
    if len(sys.argv) > 5 and pid not in sys.argv[5:]: continue
    checkout_vcsl([s.split(':', 1)[1] for _, s, *r in loops if s.startswith('vcsl:')])
    data, slices, names, tempo = [], [], [], []
    for label, spec, bpm, bars in loops:
        x = src(spec)
        if bpm:                                   # exactly so many bars: trimmed, or padded with silence
            n = int(round(bars * 240 / bpm * RATE)); x = np.concatenate([x, np.zeros(max(0, n - len(x)))])[:n]
        else:                                     # ambience: the end blended into the start, so it loops without a seam
            X = min(len(x) // 4, int(0.5 * RATE)); w = np.linspace(0, 1, X)
            x = x.copy(); x[:X] = x[:X] * w + x[-X:] * (1 - w); x = x[:-X]
        x = x * (0.9 / (float(np.max(np.abs(x))) or 1))
        slices.append([len(data), len(data) + len(x)]); names.append(label); tempo.append([round(bpm, 3), bars] if bpm else None)
        data.extend(x.tolist())
    pcm = (np.clip(np.array(data), -1, 1) * 32767).astype('<i2')
    w = wave.open(f'{OUT}/{pid}.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(pcm.tobytes()); w.close()
    index[pid] = {'name': name, 'rate': RATE, 'slices': slices, 'from': names, 'loops': tempo}
    print(f'{pid:10} {len(slices):2} loops, {len(data) / RATE:5.1f} s, {os.path.getsize(f"{OUT}/{pid}.wav") / 1e6:.2f} MB')
json.dump(index, open(f'{OUT}/banks.json', 'w'), separators=(',', ':'))
