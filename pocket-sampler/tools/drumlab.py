# Usage: python3 drumlab.py design <sounds folder> <pack> <out folder>    render a pack's hits, measure, draw
#        python3 drumlab.py bake   <sounds folder> <pack> <out folder>    the same, then write them into sounds
#        python3 drumlab.py refs   <sounds folder> <out folder>           draw the yardstick (the recorded kits)
# Needs numpy, scipy and matplotlib (a tool for making sounds, not part of the app).
#
# The drum lab: percussion hits designed in code, from models of how drums make sound, and
# checked against real ones before they are kept.
#
# The models:
#   kick   a drumhead's lowest mode, its pitch falling as the head slackens after the hit (a fast
#          chirp for the punch, a slower glide into the note), with the beater's click, an
#          optional "knock" (a mid resonance, the boom bap punch), drive and tone.
#   head   a struck drumhead: the modes of a round membrane (1, 1.59, 2.14, 2.30, 2.65, 2.92,
#          3.16, 3.50 times the lowest, each weighted by where it is struck and fading at its own
#          rate), the pitch bent up for a moment at the hit (a tight head, briefly tighter).
#   snare  a head, with snare wires: noise that the head sets rattling, so it starts a moment late
#          and follows the head, plus the stick's crack.
#   clap   several hands a few milliseconds apart (bursts of band-passed noise, unevenly spaced),
#          then the room's short tail.
#   metal  hats, cymbals, rides: many partials at inharmonic ratios (the 808's six square waves, or
#          a cymbal's scattered partials), each fading at its own rate, through a band-pass, with
#          sizzle (noise).
#   beads  shakers and tambourines (Perry Cook's PhISEM): beads or jingles colliding at random, more
#          often while the shake has energy, each collision ringing the shell's resonances.
#   wood   rims, blocks, cowbells: a few strongly resonant modes, struck.
#   grit   an old sampler's sound (the SP-1200's 26 kHz, 12 bits): held samples and coarse steps.
#
# The yardstick: every hit of the recorded kits (acoustic, Karoryfer, the sampled 808, the
# electro machines), measured by part (kicks, snares, claps, hats...). Each hit designed here is
# measured the same way: attack, decay (to -20 and -40 dB), how bright it is at the hit, just
# after and in the tail, the low end's share, its pitch at the hit and after, how noisy it is,
# and whether it ends cleanly. Where a measure is far outside what the real ones do, it says so;
# it names the closest real hit, and draws each designed hit beside it (wave and spectrogram), so
# a hit can be judged by eye as well as by ear. Being unlike the real ones is not wrong in itself
# (a hit can be meant to be odd); being unlike them by accident usually is.
#
# A pack is its kit (16 hits: kicks, snares and claps, tops) and its loops, made of those hits: kick
# loops, snare loops and tops loops, a part each, so any three go together (see EBB_LOOPS). Bake
# writes them as banks (<pack>kit, <pack>kloops, <pack>sloops, <pack>tloops: 32 kHz mono WAVs, the
# names and tempos in banks.json) and puts the loops in the pack's set (its Kick, Snare and Tops
# columns); the app plays them as recordings. Design writes, to look at and listen to: each part's
# report and picture, and every loop as a WAV (twice over), with the first of each part together.
import sys, os, json, wave
import numpy as np
from scipy.signal import butter, sosfilt, lfilter, hilbert

RATE = 32000

# ---------------------------------------------------------------------------- building blocks
def T(secs): return np.arange(int(secs * RATE)) / RATE

def filt(x, kind, f, order=2):
    f = np.clip(np.atleast_1d(f), 20, RATE / 2 - 200)
    return sosfilt(butter(order, f if len(f) > 1 else f[0], kind, fs=RATE, output='sos'), x)
lp = lambda x, f, o=2: filt(x, 'lowpass', f, o)
hp = lambda x, f, o=2: filt(x, 'highpass', f, o)
bp = lambda x, lo, hi, o=2: filt(x, 'bandpass', [lo, hi], o)

def reson(x, f, q):
    # a two-pole resonator at f Hz (a mode that rings when struck), unity gain at its peak
    r = np.exp(-np.pi * f / (q * RATE)); w = 2 * np.pi * f / RATE
    return lfilter([1 - r], [1, -2 * r * np.cos(w), r * r], x)

def ring(t, secs, shape=1.0):
    # falls 60 dB over secs; shape > 1 holds first and then drops (a boom), < 1 drops then lingers
    return np.exp(-6.9 * (t / secs) ** shape)

def attack(t, secs): return np.where(t < secs, np.sin(np.pi / 2 * np.minimum(1, t / max(secs, 1e-6))) ** 2, 1.0)

def sat(x, drive):
    # soft clipping: drive 0 is clean; 1-3 warms and thickens; more is distortion
    return x if drive <= 0 else np.tanh(x * (1 + drive)) / np.tanh(1 + drive)

def grit(x, rate=26040, bits=12):
    # an old sampler: each sample held to its rate (the aliasing is its sound), stepped to its bits
    held = x[(np.floor(np.arange(len(x)) * rate / RATE) * RATE / rate).astype(int)]
    q = 2 ** (bits - 1); return np.round(held * q) / q

def finish(x, peak=0.95, fade=0.004):
    # ends silent (a short fade where it has died away), no DC, at the level asked
    x = hp(x, 18, 1)
    e = np.abs(x); top = e.max() or 1
    tail = np.nonzero(e > top * 10 ** (-60 / 20))[0]
    n = min(len(x), (tail[-1] + 1) if len(tail) else len(x))
    x = x[:n].copy(); f = min(n, int(fade * RATE)); x[n - f:] *= np.cos(np.linspace(0, np.pi / 2, f)) ** 2
    return x * (peak / (np.abs(x).max() or 1))

def mix(*parts):
    n = max(len(p) for p in parts); out = np.zeros(n)
    for p in parts: out[: len(p)] += p
    return out

# ---------------------------------------------------------------------------- the models
MEMBRANE = np.array([1, 1.594, 2.136, 2.296, 2.653, 2.918, 3.156, 3.501])    # a round drumhead's modes

def kick(f=43.65, sweep=3.5, glide=0.04, chirp=0.6, secs=0.6, shape=1.0, click=0.25, beater=0.0, knock=0.0,
         knockf=170, drive=1.0, tone=6000, sub=0.0, phase=0.0, seed=0):
    rng = np.random.default_rng(seed); t = T(secs * 1.15 + 0.03)
    fr = f * (1 + (sweep - 1) * np.exp(-t / glide)) + f * sweep * chirp * np.exp(-t / 0.0035)
    ph = 2 * np.pi * np.cumsum(fr) / RATE + phase * np.pi / 2
    body = np.sin(ph) * ring(t, secs, shape) * attack(t, 0.0004)
    parts = [body]
    if sub: parts.append(sub * np.sin(2 * np.pi * f * t) * ring(t, secs * 1.3, 1.6) * attack(t, 0.012))   # a held sine under it
    n = rng.uniform(-1, 1, len(t))
    if click: parts.append(click * hp(n, 2500) * np.exp(-t / 0.0012))
    if beater: parts.append(beater * bp(n, 700, 3500) * np.exp(-t / 0.006))
    if knock: k = reson(n * np.exp(-t / 0.002), knockf, 5); parts.append(knock * k / (np.abs(k).max() or 1) * ring(t, 0.12))
    x = sat(mix(*parts), drive)
    return lp(x, tone) if tone else x

def head(f=200, secs=0.2, strike=0.35, bend=0.08, modes=8, ratios=None, seed=0):
    # struck at `strike` (0 middle, 1 edge): the middle sounds the lowest mode, the edge the others
    rng = np.random.default_rng(seed); t = T(secs * 1.2 + 0.02); x = np.zeros(len(t))
    R = MEMBRANE[:modes] if ratios is None else np.array(ratios)
    for i, r in enumerate(R):
        a = (1 - strike) if i == 0 else strike * (0.75 ** (i - 1)) * rng.uniform(0.7, 1.2)
        fr = f * r * (1 + bend * np.exp(-t / 0.015))
        x += a * np.sin(2 * np.pi * np.cumsum(fr) / RATE + rng.uniform(0, 0.5)) * ring(t, secs / (1 + 0.35 * i))
    return x * attack(t, 0.0005)

def snare(f=200, secs=0.14, strike=0.45, bend=0.1, wires=0.7, wsecs=0.3, wlo=500, whi=7000, crack=0.15,
          drive=0.8, tone=11000, ratios=None, wattack=0.005, dark=0.5, seed=1):
    # secs: how long the head rings; wsecs: the wires (real snares: the tone goes first, the wires carry the tail)
    rng = np.random.default_rng(seed)
    h = head(f, secs, strike, bend, ratios=ratios, seed=seed)
    t = T(max(secs, wsecs) * 1.2 + 0.03); n = rng.uniform(-1, 1, len(t))
    # the wires: set going by the head a moment after the hit, rattling as long as it moves
    henv = lfilter([0.002], [1, -0.998], np.abs(np.pad(h, (0, len(t) - len(h))))); henv /= henv.max() or 1
    # most of a real snare's rattle is low (its middle sits near 1 kHz): dark tilts it down
    w = bp(n, wlo, whi); w = (1 - dark) * w + dark * 2.5 * lp(w, 1800, 1)
    w = w * attack(t, wattack) * (0.55 * ring(t, wsecs, 0.9) + 0.45 * henv * ring(t, wsecs * 1.4))
    c = hp(n, 3000) * np.exp(-t / 0.0018) + 0.5 * bp(n, 3500, 6000) * np.exp(-t / 0.004)
    x = sat(mix(h * (1 - 0.4 * wires), wires * w / (np.abs(w).max() or 1) * 0.9, crack * c), drive)
    return lp(x, tone) if tone else x

def clap(f=1250, hands=4, gap=0.0105, spread=0.3, tail=0.18, width=1.9, sheen=0.15, drive=0.6, tone=11000, seed=2):
    rng = np.random.default_rng(seed); t = T(hands * gap + tail * 1.2 + 0.02); n = rng.uniform(-1, 1, len(t))
    env = np.zeros(len(t)); at = 0.0
    for i in range(hands):
        d = t - at; env += np.where(d >= 0, attack(np.maximum(d, 0), 0.0003) * np.exp(-np.maximum(d, 0) / 0.0045), 0) * rng.uniform(0.7, 1)
        at += gap * rng.uniform(1 - spread, 1 + spread)
    d = t - at + gap; env += np.where(d >= 0, 0.55 * ring(np.maximum(d, 0), tail), 0)
    x = bp(n, f / width, f * width) * env + sheen * hp(n, 6000) * env
    x = sat(x / (np.abs(x).max() or 1), drive)
    return lp(x, tone) if tone else x

def metal(kind='808', base=1.0, secs=0.06, shape=1.0, lo=7000, hi=15000, sizzle=0.3, count=50, drive=0.3, seed=3):
    rng = np.random.default_rng(seed); t = T(secs * 1.2 + 0.02); x = np.zeros(len(t))
    if kind == '808':            # six square waves (band-limited), the 808's hats and cymbal
        for f in np.array([205.3, 304.4, 369.6, 522.7, 540.0, 800.0]) * base:
            p = rng.uniform(0, 2 * np.pi)
            for k in range(1, int(15000 / f) + 1, 2): x += np.sin(2 * np.pi * k * f * t + k * p) / k
    else:                        # a cymbal: partials scattered from 400 Hz up, each ringing its own time
        fs = np.exp(rng.uniform(np.log(400 * base), np.log(15000), count))
        for f in fs: x += rng.uniform(0.3, 1) * (f / 1000) ** -0.25 * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.3)) * ring(t, secs * rng.uniform(0.5, 1.4))
    x = x / (np.abs(x).max() or 1) + sizzle * rng.uniform(-1, 1, len(t))
    x = bp(x, lo, min(hi, RATE / 2 - 300)) * ring(t, secs, shape) * attack(t, 0.0004)
    return sat(x / (np.abs(x).max() or 1), drive)

def beads(f=(3200,), q=(3,), objects=40, shake=0.07, secs=0.12, lift=0.012, rattle=0.0, seed=4):
    # PhISEM: energy rises with the shake and dies away; collisions come at random, more of them
    # (and harder) while there is energy, each ringing the shell (or the jingles) at f
    rng = np.random.default_rng(seed); t = T(lift + secs * 1.3 + 0.02)
    e = attack(t, lift) * ring(np.maximum(t - lift, 0), secs) * (1 + 0.0 * t)
    if shake: e *= 1 + 0.6 * np.exp(-((t - lift) / shake) ** 2)
    hit = (rng.random(len(t)) < np.minimum(1, objects * e / 200)) * rng.uniform(-1, 1, len(t)) * e
    x = sum(reson(hit, fi, qi) for fi, qi in zip(f, q))
    if rattle: x = x + rattle * hp(hit, 5000)
    return x

def wood(fs=(800, 2210, 4320), qs=(40, 30, 25), amps=(1, 0.5, 0.25), click=0.3, secs=None, seed=5):
    rng = np.random.default_rng(seed); t = T(secs or 0.25); imp = np.zeros(len(t)); imp[0] = 1
    imp[1:int(0.0008 * RATE)] = rng.uniform(-0.5, 0.5, int(0.0008 * RATE) - 1)
    x = sum(a * reson(imp, f, q) for f, q, a in zip(fs, qs, amps))
    x = x / (np.abs(x).max() or 1) + click * hp(rng.uniform(-1, 1, len(t)), 4000) * np.exp(-t / 0.0008)
    return x

def cowbell(f=540, f2=800, secs=0.35, seed=6):
    t = T(secs * 1.2); x = np.zeros(len(t))
    for fr in (f, f2):
        for k in range(1, int(12000 / fr) + 1, 2): x += np.sin(2 * np.pi * k * fr * t) / k
    x = bp(x, 450, 2600) * (0.7 * np.exp(-t / 0.012) + 0.3 * ring(t, secs)) * attack(t, 0.0003)
    return sat(x / np.abs(x).max(), 0.4)

# ---------------------------------------------------------------------------- Plaits
# Mutable Instruments Plaits' drum engines (Emilie Gillet, MIT license): its 808-style and
# synthetic bass drums and snares, its hi-hats, its modal resonator (struck bars, bells, rims) and
# its particles (dust ringing resonators). plaits_hit.cc renders one hit; it is built from a
# checkout of github.com/pichenettes/eurorack (with github.com/pichenettes/stmlib in it), given
# as EURORACK=<folder>. Its knobs, 0 to 1 (as on the module):
#   kick   harmonics: attack FM, then self FM, then drive; timbre: tone; morph: decay
#   snare  harmonics: the head's tone against the snare's noise; timbre: tone; morph: decay
#   hat    harmonics: metal against noise; timbre: tone (high-pass); morph: decay
#   modal  harmonics: structure (bar, to plate, to bell); timbre: brightness; morph: damping
#   particle  timbre: density; morph: resonance (or diffusion, under 0.5); harmonics: spread
# Each engine has two outputs: out (the analog model) and aux (the synthetic one; for the hat,
# its second model).
HERE = os.path.dirname(os.path.abspath(__file__))
def plaits_bin():
    exe = os.path.join(os.environ.get('DRUMLAB_BUILD', '/tmp'), 'plaits_hit')
    if not os.path.exists(exe):
        import subprocess
        E = os.environ['EURORACK']
        import glob                    # every engine (but the six-op FM, which needs its patches loaded)
        srcs = sorted({*glob.glob(f'{E}/plaits/dsp/engine/*.cc'), *glob.glob(f'{E}/plaits/dsp/engine2/*.cc'), *glob.glob(f'{E}/plaits/dsp/*/*.cc')} - {f'{E}/plaits/dsp/engine2/six_op_engine.cc'}) + \
               [f'{E}/plaits/resources.cc', f'{E}/stmlib/dsp/units.cc', f'{E}/stmlib/utils/random.cc']
        subprocess.run(['g++', '-O2', '-std=c++11', '-DTEST', f'-I{E}', '-o', exe, f'{HERE}/plaits_hit.cc', *srcs], check=True)
    return exe

def plaits(engine, note, harmonics=0.5, timbre=0.5, morph=0.5, accent=0.8, secs=1.0, out='out', *moves):
    # moves: vibrato (semitones, Hz), timbre swing, glide (semitones, s), for a held note (plaits_hit.cc)
    import subprocess
    from scipy.signal import resample_poly
    raw = subprocess.run([plaits_bin(), engine, str(note), str(harmonics), str(timbre), str(morph), str(accent), str(secs), *map(str, moves)],
                         capture_output=True, check=True).stdout
    pair = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(float)
    x = pair[:, 0] if out == 'out' else pair[:, 1] if out == 'aux' else pair.mean(1)
    return resample_poly(x, 2, 3)                      # 48 kHz to 32 kHz

def shaped(x, secs, a=0.0005):
    # an envelope put on a sound that has none of its own (particles, a sustained tone)
    t = T(len(x) / RATE); return x * attack(t, a) * ring(t, secs)

def clap_of(noise, hands=4, gap=0.0105, spread=0.3, tail=0.2, seed=2):
    # a clap made of any noise: hands a few ms apart, then the room
    rng = np.random.default_rng(seed); t = T(len(noise) / RATE); env = np.zeros(len(t)); at = 0.0
    for i in range(hands):
        d = np.maximum(t - at, 0); env += np.where(t >= at, attack(d, 0.0003) * np.exp(-d / 0.0045), 0) * rng.uniform(0.7, 1)
        at += gap * rng.uniform(1 - spread, 1 + spread)
    d = np.maximum(t - at + gap, 0); env += np.where(t >= at - gap, 0.55 * ring(d, tail), 0)
    return noise * env

# ---------------------------------------------------------------------------- the packs
# Each hit: (name, a function that makes it, its level). The name gives its part (and colour)
# in the app: kick, snare, clap, hat, open hat, cymbal/ride, else percussion.
# Electro Boom Bap is in F minor: the kicks and the snares' heads sit on its notes (F1 is MIDI 29).
F1, AB1, BB1, C2 = 29, 32, 34, 36

hz = lambda m: 440 * 2 ** ((m - 69) / 12)
def punch(note, knock=0.4, seed=0):
    # the first 60 ms of a kick from the model above: a falling chirp, the beater and a knock, laid
    # over a Plaits kick whose own attack is soft
    return kick(hz(note), sweep=4, glide=0.008, chirp=0.8, secs=0.06, click=0.25, beater=0.3, knock=knock, knockf=170, drive=1, tone=8000, seed=seed)

def ebb_kit():
    P = plaits
    return [
        ('Boom kick', lambda: mix(P('kick', AB1, 0.25, 0.42, 0.68, 0.9, 1.3), 0.5 * punch(AB1, 0.2)), 0.95),
        ('Dusty kick', lambda: lp(grit(sat(mix(P('kick', AB1, 0.25, 0.6, 0.45, 0.9, 1.0), 0.6 * punch(AB1, 0.5, 1)), 1.2) * 0.85), 5500), 0.95),
        ('Knock kick', lambda: sat(P('kick', BB1, 0.4, 0.62, 0.3, 0.9, 0.8, 'aux'), 1.5), 0.95),
        ('Electro kick', lambda: P('kick', C2, 0.62, 0.72, 0.38, 0.9, 0.8, 'aux'), 0.95),
        ('Tape kick', lambda: lp(sat(P('kick', F1, 0.7, 0.42, 0.5, 0.85, 1.0), 2.5), 3200, 1), 0.95),
        ('Dusty snare', lambda: lp(grit(sat(P('snare', 56, 0.6, 0.5, 0.5, 0.85, 0.8), 1.2) * 0.85), 7000), 0.95),
        ('Crack snare', lambda: lp(P('snare', 60, 0.55, 0.55, 0.35, 0.95, 0.6, 'aux'), 9000), 0.95),
        ('Fat snare', lambda: sat(P('snare', 53, 0.5, 0.35, 0.57, 0.85, 0.8), 1.0), 0.95),
        ('Clap', lambda: clap_of(bp(P('snare', 60, 1.0, 0.6, 0.9, 0.9, 0.5, 'aux'), 600, 3200), seed=24), 0.95),
        ('Rimshot', lambda: mix(shaped(P('modal', 72, 0.25, 0.75, 0.05, 0.9, 0.3), 0.07) * 1.2, 0.35 * lp(P('snare', 58, 0.4, 0.5, 0.2, 0.9, 0.3, 'aux'), 6000)), 0.9),
        ('Hat', lambda: P('hat', 60, 0.5, 0.6, 0.25, 0.8, 0.4), 0.6),
        ('Dusty hat', lambda: lp(grit(P('hat', 60, 0.3, 0.5, 0.3, 0.8, 0.4, 'aux')), 8500), 0.6),
        ('Open hat', lambda: P('hat', 60, 0.5, 0.6, 0.65, 0.8, 1.2), 0.55),
        ('Shaker', lambda: beads((3200, 6400), (9, 6), objects=60, shake=0.03, secs=0.14, lift=0.02, rattle=0.05, seed=34), 0.6),
        ('Cowbell', lambda: shaped(P('modal', 72, 0.55, 0.55, 0.35, 0.9, 0.6), 0.4), 0.55),            # C, the fifth of F minor
        ('Ride', lambda: mix(P('hat', 60, 0.65, 0.6, 0.85, 0.8, 2.5), 0.3 * P('modal', 77, 0.85, 0.6, 0.6, 0.8, 2.0)), 0.5),
    ]

# The loops: a part each (kicks only, snares only, tops only), so any kick loop goes with any
# snare loop and any tops loop. Two bars, 16 steps a bar: x a full hit, o a softer one, - a ghost.
# On the grid exactly, with the pack's swing (the off sixteenths a little late) and nothing else:
# no drifting in time. Several hits can share a loop: [(hit, bar 1, bar 2), ...]. Hats choke:
# a hat cuts the open hat ringing before it.
EBB_LOOPS = {
    'kick': [
        ('Boom bap kick', [('Dusty kick', 'x......x..x.....', 'x.x....x..x.....')]),
        ('Knock bounce', [('Knock kick', 'x..x......x.....', 'x..x....x.x...o.')]),
        ('Long boom', [('Boom kick', 'x.........x.....', 'x.......x.....x.')]),
        ('Electro kick', [('Electro kick', 'x.....x...x..x..', 'x.....x.x...x...')]),
        ('Half time kick', [('Tape kick', 'x..........x....', 'x.....x.........')]),
        ('Double kick', [('Dusty kick', 'x.........x.....', 'x.........x.....'), ('Knock kick', '..........-o....', '.......o........')]),
    ],
    'snare': [
        ('Dusty backbeat', [('Dusty snare', '....x.......x...', '....x.......x...')]),
        ('Snare and ghosts', [('Dusty snare', '....x..-.-..x...', '....x..-....x.-.')]),
        ('Clap backbeat', [('Clap', '....x.......x...', '....x.......x.o.')]),
        ('Half time snare', [('Fat snare', '........x.......', '........x......-')]),
        ('Rimshot groove', [('Rimshot', '....x..o....x...', '....x.......x..o')]),
        ('Crack and clap', [('Crack snare', '....x.......x...', '....x.......x...'), ('Clap', '............o...', '............o.-.')]),
    ],
    'tops': [
        ('Hats in eighths', [('Hat', 'x.o.x.o.x.o.x.o.', 'x.o.x.o.x.o.x.o.')]),
        ('Hats in sixteenths', [('Hat', 'x-o-x-o-x-o-x-o-', 'x-o-x-o-x-o-xoo-')]),
        ('Dusty hats, open', [('Dusty hat', 'x.x.x.x.x.x.x...', 'x.x.x.x.x.x.x...'), ('Open hat', '..............o.', '..............o.')]),
        ('Offbeat open hats', [('Open hat', '..o...o...o...o.', '..o...o...o...o.'), ('Hat', 'o...o...o...o...', 'o...o...o...o...')]),
        ('Shaker', [('Shaker', 'x-o-x-o-x-o-x-o-', 'x-o-x-o-x-o-x-oo')]),
        ('Ride and cowbell', [('Ride', 'o.-.o.-.o.-.o.-.', 'o.-.o.-.o.-.o.-.'), ('Cowbell', '...o......o.....', '...o....o..o....')]),
    ]}
LOOP_PARTS = [('kick', 'kloops', 'Kick loops'), ('snare', 'sloops', 'Snare loops'), ('tops', 'tloops', 'Tops loops')]
VEL = {'x': 1.0, 'o': 0.6, '-': 0.3}
CHOKE = {'Hat', 'Dusty hat', 'Open hat', 'Tight hat'}
# How loud each part's loops are (RMS): the Electro Boom Bap set's levels for its drum columns
LOOP_RMS = {'kick': 0.105, 'snare': 0.0385, 'tops': 0.0175}

def render_loop(pattern, hits, bpm, swing, part):
    step = 60 / bpm / 4; n = int(round(32 * step * RATE)); out = np.zeros(n)
    events = []
    for name, *bars in pattern:
        for b, bar in enumerate(bars):
            for i, ch in enumerate(bar):
                if ch in VEL:
                    at = (b * 16 + i) * step + (swing / 50 - 1) * step * (i % 2)     # swing: the off sixteenths late
                    events.append((int(round(at * RATE)), name, VEL[ch]))
    events.sort()
    for j, (a, name, v) in enumerate(events):
        x = hits[name] * v
        if name in CHOKE:              # a hat after it cuts it, with a 5 ms fade
            nxt = next((e[0] for e in events[j + 1:] + [(events[0][0] + n, None, 0)] if e[1] in CHOKE), None)
            if nxt is not None and nxt - a < len(x):
                x = x[: nxt - a].copy(); f = min(len(x), int(0.005 * RATE)); x[len(x) - f:] *= np.linspace(1, 0, f)
        idx = (a + np.arange(len(x))) % n              # the tail of the last bar rings into the first: a seamless loop
        np.add.at(out, idx, x)
    out *= min(LOOP_RMS[part] / max(1e-6, np.sqrt(np.mean(out ** 2))), 0.95 / np.abs(out).max())
    return out

# Vigils (vigils.py): G minor, 144 BPM, broken beats; soft deep kicks under crisp electronic snares,
# shuffled hats, glassy ticks and a chime, for night electronica. The kicks sit on G and D.
G1, D2 = 31, 38
def vig_kit():
    P = plaits
    return [
        ('Soft kick', lambda: lp(mix(P('kick', G1, 0.22, 0.36, 0.42, 0.8, 0.8), 0.25 * punch(G1, 0.2, 5)), 3500), 0.95),
        ('Deep kick', lambda: mix(P('kick', G1, 0.22, 0.38, 0.6, 0.9, 1.2), 0.35 * punch(G1, 0.15, 3)), 0.95),
        ('Click kick', lambda: P('kick', D2, 0.5, 0.75, 0.3, 0.9, 0.6, 'aux'), 0.95),
        ('Thump kick', lambda: sat(mix(P('kick', G1, 0.3, 0.45, 0.4, 0.9, 0.8, 'aux'), 0.5 * punch(G1, 0.5, 4)), 1.2), 0.95),
        ('Broken snare', lambda: lp(P('snare', 62, 0.62, 0.62, 0.42, 0.95, 0.7, 'aux'), 10000), 0.95),
        ('Snap snare', lambda: lp(sat(P('snare', 67, 0.4, 0.5, 0.3, 0.95, 0.5), 0.8), 8000), 0.95),
        ('Clap', lambda: clap_of(bp(P('snare', 62, 1.0, 0.55, 0.95, 0.9, 0.7, 'aux'), 700, 4000), hands=3, gap=0.009, tail=0.32, seed=40), 0.9),
        ('Rimshot', lambda: mix(shaped(P('modal', 74, 0.3, 0.7, 0.15, 0.9, 0.3), 0.1) * 2.5, 0.7 * lp(P('snare', 62, 0.45, 0.5, 0.2, 0.9, 0.3, 'aux'), 7000)), 0.85),
        ('Ghost snare', lambda: lp(P('snare', 62, 0.55, 0.4, 0.3, 0.6, 0.4, 'aux'), 6000), 0.35),
        ('Hat', lambda: P('hat', 62, 0.45, 0.65, 0.2, 0.8, 0.35), 0.6),
        ('Tight hat', lambda: P('hat', 66, 0.35, 0.75, 0.1, 0.8, 0.2, 'aux'), 0.55),
        ('Open hat', lambda: P('hat', 62, 0.45, 0.6, 0.6, 0.8, 1.0), 0.5),
        ('Shaker', lambda: beads((3600, 7200), (10, 7), objects=70, shake=0.025, secs=0.11, lift=0.015, rattle=0.04, seed=41), 0.55),
        ('Glass tick', lambda: shaped(P('modal', 96, 0.8, 0.9, 0.2, 0.8, 0.3), 0.06), 0.5),
        ('Chime', lambda: shaped(P('modal', 86, 0.7, 0.65, 0.55, 0.8, 1.6), 1.2), 0.45),   # D, the fifth
        ('Ride', lambda: P('hat', 58, 0.7, 0.55, 0.8, 0.8, 2.2), 0.45),
    ]
VIG_LOOPS = {
    'kick': [
        ('Two-step kick', [('Deep kick', 'x.........x.....', 'x.........x..x..')]),
        ('Broken kick', [('Thump kick', 'x..x......x.....', 'x......x.x......')]),
        ('Four on the floor', [('Soft kick', 'x...x...x...x...', 'x...x...x...x...')]),
        ('Half time kick', [('Deep kick', 'x...............', 'x.........x.....')]),
        ('Rolling kick', [('Click kick', 'x..x..x...x..x..', 'x..x..x...x.....')]),
        ('Sparse thump', [('Thump kick', 'x...............', '..........x.....')]),
    ],
    'snare': [
        ('Backbeat', [('Broken snare', '....x.......x...', '....x.......x...')]),
        ('Half time snare', [('Snap snare', '........x.......', '........x.......')]),
        ('Two-step snare', [('Broken snare', '....x.......x...', '....x.......x...'), ('Ghost snare', '.......x.....x..', '......x..x.....x')]),
        ('Clap and rim', [('Clap', '....x.......x...', '....x.......x...'), ('Rimshot', '.......o...o....', '..o....o......o.')]),
        ('Rim shuffle', [('Rimshot', '...o..x..o...x..', '...o..x..o..x.o.')]),
        ('Ghost rolls', [('Broken snare', '....x.......x...', '....x.......x...'), ('Ghost snare', '.x.x...x.x.x..x.', '..x..x.x.x..x.xx')]),
    ],
    'tops': [
        ('Shuffled hats', [('Hat', 'x.o.x.o.x.o.x.o.', 'x.o.x.o.x.o.x.oo')]),
        ('Garage hats', [('Open hat', '..x...x...x...x.', '..x...x...x...x.'), ('Tight hat', 'o...o...o...o...', 'o...o...o...o..o')]),
        ('Glass ticks', [('Glass tick', 'x-o-x-o-x-o-x-o-', 'x-o-x-o-x-oox-o-')]),
        ('Shaker', [('Shaker', 'x-o-x-o-x-o-x-o-', 'x-o-x-o-x-o-x-oo')]),
        ('Ride', [('Ride', 'o.-.o.-.o.-.o.-.', 'o.-.o.-.o.-.o.-.')]),
        ('Chimes', [('Chime', '..o.....x.....o.', '......o...x.....')]),
    ]}

PACKS = {'ebb': ('EBB', [('kit', 'Kit', ebb_kit)], EBB_LOOPS, 92, 58),
         'vig': ('Vigils', [('kit', 'Kit', vig_kit)], VIG_LOOPS, 144, 54)}
def loop_cells(pack):            # the set's Kick, Snare and Tops columns: the loops, in order
    _, _, loops, _, _ = PACKS[pack]
    return [[{'lib': f'{pack}{bid}', 'k': k, 'mode': 'loop', 'name': name} for k, (name, _) in enumerate(loops[part])] for part, bid, _ in LOOP_PARTS]

# ---------------------------------------------------------------------------- measuring
def part(name):          # the app's hitPart
    n = name.lower()
    if 'open hat' in n or 'loose hat' in n: return 'open'
    if 'kick' in n or 'bass drum' in n: return 'kick'
    if 'clap' in n: return 'clap'
    if any(w in n for w in ('snare', 'ghost', 'rim', 'cross', 'stick', 'flam')): return 'snare'
    if 'hat' in n: return 'hat'
    if 'tom' in n: return 'tom'
    if any(w in n for w in ('crash', 'ride', 'cymbal')): return 'cym'
    return 'perc'

def spectrum(x, a, b):
    seg = x[int(a * RATE): int(b * RATE)]
    if len(seg) < 64: return None, None
    S = np.abs(np.fft.rfft(seg * np.hanning(len(seg)), 8192)) ** 2
    return np.fft.rfftfreq(8192, 1 / RATE), S

def measure(x):
    x = np.asarray(x, float); peak = np.abs(x).max() or 1; x = x / peak
    # attack: when the envelope (Hilbert, smoothed over 1 ms, so it follows a 40 Hz kick too) peaks;
    # decay: when the energy still to come has fallen 20 and 40 dB (claps' gaps don't fool it)
    w = int(0.001 * RATE); env = np.convolve(np.abs(hilbert(x)), np.ones(w) / w, 'same')
    top = int(env.argmax()); e = np.cumsum((x[top:] ** 2)[::-1])[::-1]; db = 10 * np.log10(e / e[0] + 1e-12)
    after = lambda lvl: (np.argmax(db < lvl) or len(db)) / RATE * 1000
    m = {'attack ms': top / RATE * 1000, 'decay -20 ms': after(-20), 'decay -40 ms': after(-40)}
    for key, a, b in (('bright at hit', 0, 0.01), ('bright after', 0.01, 0.06), ('bright tail', 0.06, 0.25)):
        f, S = spectrum(x, a, b); m[key] = float((f * S).sum() / S.sum()) if S is not None and S.sum() > 1e-9 else None
    f, S = spectrum(x, 0, 0.3); m['low share'] = float(S[f < 150].sum() / S.sum())
    for key, a, b in (('pitch at hit', 0.002, 0.022), ('pitch after', 0.04, 0.12)):
        f, S = spectrum(x, a, b)
        m[key] = float(f[(f > 25) & (f < 400)][np.argmax(S[(f > 25) & (f < 400)])]) if S is not None else None
    f, S = spectrum(x, 0.01, 0.06)
    m['noisiness'] = float(np.exp(np.mean(np.log(S[1:] + 1e-12))) / np.mean(S[1:])) if S is not None else None
    m['end'] = float(np.abs(x[-int(0.003 * RATE):]).max())
    m['length ms'] = len(x) / RATE * 1000
    return m

LOG = {'attack ms', 'decay -20 ms', 'decay -40 ms', 'bright at hit', 'bright after', 'bright tail', 'pitch at hit', 'pitch after', 'length ms'}
COMPARE = {'kick': ['decay -20 ms', 'decay -40 ms', 'bright at hit', 'bright after', 'low share', 'pitch at hit', 'pitch after', 'attack ms'],
           'snare': ['decay -20 ms', 'decay -40 ms', 'bright at hit', 'bright after', 'bright tail', 'noisiness', 'attack ms', 'low share'],
           'clap': ['decay -20 ms', 'decay -40 ms', 'bright at hit', 'bright after', 'noisiness'],
           'hat': ['decay -20 ms', 'decay -40 ms', 'bright at hit', 'bright after', 'noisiness'],
           'open': ['decay -20 ms', 'decay -40 ms', 'bright at hit', 'bright after', 'bright tail', 'noisiness'],
           'cym': ['decay -20 ms', 'decay -40 ms', 'bright after', 'bright tail', 'noisiness'],
           'perc': ['decay -20 ms', 'decay -40 ms', 'bright at hit', 'bright after', 'noisiness'],
           'tom': ['decay -20 ms', 'decay -40 ms', 'pitch at hit', 'pitch after', 'bright after']}
POOL = {'clap': ('clap', 'snare'), 'open': ('open', 'cym'), 'tom': ('tom', 'kick')}     # too few of these alone: with their neighbours
REF_KITS = ['acoustic', 'boombap', 'gogodze', 'gogodzelofi', 'bigrusty', 'swirly', 'tr808', 'electro', 'drumtraks', 'percussion', 'shakers']

def read_wav(path):
    w = wave.open(path); r, n, ch = w.getframerate(), w.getnframes(), w.getnchannels()
    x = np.frombuffer(w.readframes(n), '<i2').reshape(-1, ch).mean(1) / 32768; return x, r

def references(sounds):
    banks = json.load(open(f'{sounds}/banks.json')); out = []
    for kit in REF_KITS:
        b = banks.get(kit)
        if not b or not os.path.exists(f'{sounds}/{kit}.wav'): continue
        x, r = read_wav(f'{sounds}/{kit}.wav')
        for (a, e), name in zip(b['slices'], b['from']):
            y = x[a:e]
            if r != RATE: y = np.interp(np.arange(0, len(y) * RATE / r) * r / RATE, np.arange(len(y)), y)
            if np.abs(y).max() < 1e-4: continue
            out.append({'name': f'{name} ({kit})', 'part': part(name), 'x': y, 'm': measure(y)})
    return out

def judge(m, p, refs):
    # how each measure stands among the real hits of its part: z-scores (in log for times and
    # frequencies), the closest real hit, and the measures outside every real one's range
    rs = [r for r in refs if r['part'] in POOL.get(p, (p,))] or refs
    keys = [k for k in COMPARE.get(p, COMPARE['perc']) if m.get(k) is not None and all(r['m'].get(k) is not None for r in rs)]
    val = lambda v, k: np.log(max(v, 1e-6)) if k in LOG else v
    R = np.array([[val(r['m'][k], k) for k in keys] for r in rs]); mu, sd = R.mean(0), R.std(0) + 1e-6
    me = np.array([val(m[k], k) for k in keys]); z = (me - mu) / sd
    near = rs[int(np.argmin((((R - me) / sd) ** 2).sum(1)))]
    lo, hi = R.min(0), R.max(0)
    out = [(k, m[k], z[i], 'below every real one' if me[i] < lo[i] else 'above every real one' if me[i] > hi[i] else '') for i, k in enumerate(keys)]
    return out, near, len(rs)

# ---------------------------------------------------------------------------- drawing
def draw(rows, path, title):
    import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
    fig, ax = plt.subplots(len(rows), 4, figsize=(16, 2.1 * len(rows)), squeeze=False, gridspec_kw={'width_ratios': [1, 1.4, 1, 1.4]})
    for i, (a, b) in enumerate(rows):
        for j, h in enumerate((a, b)):
            if h is None: ax[i, 2 * j].axis('off'); ax[i, 2 * j + 1].axis('off'); continue
            x = h['x'] / (np.abs(h['x']).max() or 1); t = np.arange(len(x)) / RATE * 1000
            A = ax[i, 2 * j]; A.plot(t, x, lw=0.5, color='#c33' if j == 0 else '#36c'); A.set_xlim(0, max(60, min(t[-1], 1200)))
            A.set_ylim(-1.05, 1.05); A.set_title(h['name'], fontsize=8, loc='left'); A.tick_params(labelsize=6)
            B = ax[i, 2 * j + 1]; n = 512; hop = 64
            if len(x) > n:
                fr = np.array([np.abs(np.fft.rfft(x[k:k + n] * np.hanning(n))) for k in range(0, len(x) - n, hop)]).T
                B.imshow(20 * np.log10(fr + 1e-5), origin='lower', aspect='auto', vmin=-80, vmax=20, cmap='magma',
                         extent=[0, len(x) / RATE * 1000, 0, RATE / 2])
                B.set_yscale('symlog', linthresh=500); B.set_ylim(30, RATE / 2); B.set_xlim(0, max(60, min(len(x) / RATE * 1000, 1200)))
            B.tick_params(labelsize=6)
    fig.suptitle(title, fontsize=10); fig.tight_layout(); fig.savefig(path, dpi=70); plt.close(fig)

# ---------------------------------------------------------------------------- writing
def preview(path, x):            # a WAV to listen to (a loop twice over)
    w = wave.open(path, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
    w.writeframes((np.clip(x, -1, 1) * 32767).round().astype('<i2').tobytes()); w.close()
pack_set = lambda pack: {'ebb': 'electroboombap', 'vig': 'vigils'}[pack]
def write_bank(sounds, bid, name, hits, loops=None, gap=int(0.02 * RATE)):
    data, slices, names = [], [], []
    for h in hits:
        slices.append([len(data), len(data) + len(h['x'])]); names.append(h['name'])
        data.extend(h['x'].tolist()); data.extend([0.0] * gap)
    pcm = (np.clip(np.array(data), -1, 1) * 32767).round().astype('<i2')
    w = wave.open(f'{sounds}/{bid}.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(pcm.tobytes()); w.close()
    banks = json.load(open(f'{sounds}/banks.json'))
    banks[bid] = {'name': name, 'rate': RATE, 'slices': slices, 'from': names, **({'loops': loops} if loops else {})}
    json.dump(banks, open(f'{sounds}/banks.json', 'w'), separators=(',', ':'))
    print(f'wrote {bid}.wav: {len(hits)} hits, {len(data) / RATE:.1f} s, {os.path.getsize(f"{sounds}/{bid}.wav") / 1e3:.0f} kB')

if __name__ == '__main__':
    cmd, sounds = sys.argv[1], sys.argv[2]
    refs = references(sounds)
    if cmd == 'refs':
        out = sys.argv[3]; os.makedirs(out, exist_ok=True)
        for p in sorted({r['part'] for r in refs}):
            rs = [r for r in refs if r['part'] == p]
            draw([(rs[i], rs[i + 1] if i + 1 < len(rs) else None) for i in range(0, len(rs), 2)], f'{out}/refs-{p}.png', f'The yardstick: {p} ({len(rs)})')
        sys.exit()
    pack, out = sys.argv[3], sys.argv[4]; os.makedirs(out, exist_ok=True)
    prefix, groups, loops, bpm, swing = PACKS[pack]
    kit = {}
    for gid, gname, make in groups:
        hits, rows, report = [], [], []
        for name, fn, level in make():
            x = finish(fn(), level); m = measure(x); p = part(name)
            verdict, near, nref = judge(m, p, refs)
            hits.append({'name': name, 'x': x, 'm': m}); rows.append((hits[-1], near))
            report.append(f'\n{name}  [{p}, against {nref} real ones; closest: {near["name"]}]  {len(x) / RATE * 1000:.0f} ms, ends at {m["end"]:.4f}')
            for k, v, z, flag in verdict:
                report.append(f'   {k:14s} {v:9.3f}   z {z:+5.1f}  {flag}')
        txt = '\n'.join(report); print(f'==== {prefix} {gname}', txt)
        open(f'{out}/{pack}{gid}.txt', 'w').write(txt)
        draw(rows, f'{out}/{pack}{gid}.png', f'{prefix} {gname}: each designed hit (red) beside the closest real one (blue)')
        if cmd == 'bake': write_bank(sounds, f'{pack}{gid}', f'{prefix} {gname}', hits)
        kit.update({h['name']: h['x'] for h in hits})
    for part, bid, bname in LOOP_PARTS:
        made = [{'name': name, 'x': render_loop(pat, kit, bpm, swing, part)} for name, pat in loops[part]]
        for h in made: preview(f'{out}/{pack}{bid}-{h["name"].replace(" ", "_").replace(",", "")}.wav', np.tile(h['x'], 2))
        if cmd == 'bake':
            write_bank(sounds, f'{pack}{bid}', f'{prefix} {bname}', made, loops=[[bpm, 2]] * len(made), gap=0)
    together = sum(render_loop(loops[part][0][1], kit, bpm, swing, part) for part, _, _ in LOOP_PARTS)
    preview(f'{out}/{pack}-together.wav', np.tile(together, 2)); print(f'the first loop of each part together: peak {np.abs(together).max():.2f}')
    if cmd == 'bake' and os.path.exists(f'{sounds}/sets/{pack_set(pack)}.json'):      # the set's drum columns: these loops
        path = f'{sounds}/sets/{pack_set(pack)}.json'; st = json.load(open(path)); st['cells'][:3] = loop_cells(pack)
        json.dump(st, open(path, 'w'), separators=(',', ':')); print('the set:', path)
