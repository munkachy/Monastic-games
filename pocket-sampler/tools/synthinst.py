# Usage: python3 synthinst.py <sounds folder> [ids]
# Instruments no free library had, made by modelling the instrument and
# rendering a note every few semitones, packed like the sampled instruments
# (one WAV each, zones in banks.json):
#   nylon, steelgtr, twelve: plucked strings (Karplus-Strong: a burst of noise
#     goes round a delay line one period long, losing a little treble each
#     time, so it rings at the string's pitch and mellows as it dies), through
#     a guitar body (a few low resonances). Nylon is softer and warmer; the
#     12-string adds a second string an octave up (the lower four courses) or
#     in unison, a few cents apart, plucked a moment later.
#   steeldrum: a struck steel pan, from the tones a pan is tuned to (the note,
#     its octave and the twelfth above), each fading at its own rate, and a
#     short metallic ping.
import sys, json, wave
import numpy as np

OUT = sys.argv[1]
RATE = 32000
rng = np.random.default_rng(7)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)

def string(f, secs, bright, decay, pos=0.18):
    # one plucked string at f Hz: Karplus-Strong with a fractional delay
    n = int(secs * RATE); N = RATE / f; L = int(N); frac = N - L
    burst = rng.uniform(-1, 1, L + 2)
    k = max(1, int(L * pos)); burst[k:] -= burst[:-k]            # where it is plucked: some harmonics cancel
    for _ in range(int(3 - 2 * bright)): burst = 0.5 * (burst + np.roll(burst, 1))   # a softer finger, fewer highs
    y = np.zeros(n + L + 2); y[:L + 2] = burst
    a = 0.5 + 0.45 * bright                                         # how much treble survives each trip
    g = decay ** (1 / max(1.0, f / 110))                            # high strings die sooner
    for i in range(L + 2, n + L + 2):
        d = y[i - L] * (1 - frac) + y[i - L - 1] * frac
        y[i] = g * (a * d + (1 - a) * y[i - 1]) if i > L + 2 else d
    return y[L + 2:]

def body(x, peaks):
    # a guitar body: a few resonant bands added to the string
    out = x.copy(); t = np.arange(len(x))
    for fc, q, gain in peaks:
        w = 2 * np.pi * fc / RATE; r = np.exp(-w / (2 * q))
        b1, b2 = 2 * r * np.cos(w), -r * r; y = np.zeros(len(x))
        for i in range(2, len(x)): y[i] = x[i] + b1 * y[i - 1] + b2 * y[i - 2]
        out += gain * y * (1 - r)
    return out

def guitar(m, kind):
    f, secs = hz(m), 2.4
    if kind == 'nylon':
        x = string(f, secs, 0.25, 0.9975, 0.22); peaks = [(105, 6, 0.5), (210, 5, 0.35), (420, 4, 0.2)]
    elif kind == 'steel':
        x = string(f, secs, 0.75, 0.9985, 0.15); peaks = [(98, 6, 0.4), (200, 5, 0.3), (2400, 2, 0.15)]
    else:   # twelve: a second string an octave up on the low courses, in unison on the high ones, a hair sharp and late
        x = string(f, secs, 0.75, 0.9985, 0.15)
        f2 = f * (2 if m < 64 else 1) * 2 ** (6 / 1200)
        y = string(f2, secs, 0.8, 0.998, 0.12) * (0.6 if m < 64 else 0.8)
        d = int(0.012 * RATE); x[d:] += y[:-d]
        peaks = [(98, 6, 0.4), (200, 5, 0.3), (2400, 2, 0.2)]
    return body(x, peaks)

def steeldrum(m):
    f, secs = hz(m), 1.8; t = np.arange(int(secs * RATE)) / RATE
    x = np.zeros(len(t))
    for ratio, amp, life in [(1, 1.0, 0.9), (2, 0.55, 0.6), (3, 0.3, 0.35), (4.02, 0.12, 0.2), (5.97, 0.06, 0.12)]:
        x += amp * np.sin(2 * np.pi * f * ratio * t * (1 + 0.002 * np.exp(-t * 30))) * np.exp(-t / life)
    ping = rng.uniform(-1, 1, len(t)) * np.exp(-t * 120) * 0.15
    x += np.convolve(ping, np.ones(6) / 6, 'same')
    return x * np.minimum(1, t / 0.002)

KINDS = {
  'nylon': ('Nylon Guitar', 40, 84, lambda m: guitar(m, 'nylon')),
  'steelgtr': ('Acoustic Guitar', 40, 84, lambda m: guitar(m, 'steel')),
  'twelve': ('12-String Guitar', 40, 79, lambda m: guitar(m, 'twelve')),
  'steeldrum': ('Steel Drum', 55, 91, steeldrum),
}

index = json.load(open(f'{OUT}/banks.json'))
for key, (name, lo, hi, make) in KINDS.items():
    if len(sys.argv) > 2 and key not in sys.argv[2:]: continue
    data, zones = [], []
    for m in range(lo, hi + 1, 3):
        x = make(m); x = x / (np.max(np.abs(x)) or 1) * 0.9
        fade = min(len(x), int(0.05 * RATE)); x[-fade:] *= np.linspace(1, 0, fade)
        s = len(data); data.extend(x.tolist()); zones.append([m, s, len(data)]); data.extend([0.0] * int(0.02 * RATE))
    pcm = (np.clip(np.array(data), -1, 1) * 32767).astype('<i2')
    w = wave.open(f'{OUT}/{key}.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(pcm.tobytes()); w.close()
    index[key] = {'name': name, 'rate': RATE, 'zones': zones, 'made': 'modelled'}
    print(f'{key}: {len(zones)} zones, {len(data) / RATE:.1f} s')
json.dump(index, open(f'{OUT}/banks.json', 'w'), separators=(',', ':'))
