# Usage: python3 kits.py <folder with the source checkouts> <output folder>
# Builds more sampled drum kits, 16 hits each, like drums.py: each hit is the
# loudest velocity layer (or `down` layers below it), round robin 1, cut to
# `cap` seconds, started 1 ms before its attack and levelled (cymbals and
# such kept softer, per LEVEL). A hit can blend more than one microphone:
# `mix` lists (old, new) swaps in the file's path that give the same hit on
# another mic, and they are summed; 'all mics' sums every file of that layer.
#
# Sources, all CC0, from Karoryfer Samples (clone with --filter=blob:none
# --no-checkout; this checks out only the files it uses). Needs git and ffmpeg.
#   gogodze-phu-vol-ii/  https://github.com/sfzinstruments/karoryfer.gogodze-phu-vol-ii
#   big-rusty-drums/     https://github.com/sfzinstruments/karoryfer.big-rusty-drums
#   swirly-drums/        https://github.com/sfzinstruments/karoryfer.swirly-drums
import subprocess, sys, json, re, wave, fnmatch
import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
RATE = 32000
LEVEL = {'Soft kick': 0.4, 'Ghost': 0.3, 'Hat pedal': 0.4, 'Hat': 0.55, 'Half hat': 0.55, 'Loose hat': 0.55,
         'Tight hat': 0.5, 'Open hat': 0.6, 'Ride': 0.5, 'Crash': 0.6, 'China': 0.6, 'Splash': 0.6, 'Brush stir': 0.7}

def gogodze(mic):
    h = lambda label, code, down=0, cap=0.8: (label, f'Samples/{mic}/{code}_vl*_rr1.wav', down, cap, [])
    return [h('Kick', 'ks'), h('Soft kick', 'ks', 3), h('Snare', 'sc', 1), h('Ghost', 'sc', 99, 0.4), h('Snare edge', 'se'),
            h('Cross-stick', 'ss', 0, 0.4), h('Hat', 'hc', 1, 0.3), h('Hat pedal', 'hf', 0, 0.3), h('Half hat', 'hh', 1, 0.6),
            h('Loose hat', 'hl', 1, 0.6), h('Open hat', 'ho', 0, 1.4), h('Tight hat', 'ht', 1, 0.25), h('High tom', 'th', 0, 1.0),
            h('Mid tom', 'tm', 0, 1.1), h('Low tom', 'tl', 0, 1.3), h('Soft snare', 'sc', 4)]

def rusty(label, path, down=0, cap=0.8, mic=None, other=None):
    return (label, f'Samples/{path}_rr1.flac', down, cap, [(f'/{mic}/', f'/{other}/')] if other else [])

def swirly(label, d, down=0, cap=0.8):     # names and mics differ by folder: sum every mic of the hit
    return (label, f'Samples/{d}/*_vl*_rr1*.wav', down, cap, 'all mics')

KITS = {
  'gogodze': ('Gogodze', 'gogodze-phu-vol-ii', gogodze('front_mic')),
  'gogodzelofi': ('Gogodze Lo-fi', 'gogodze-phu-vol-ii', gogodze('retro_mic')),
  'bigrusty': ('Big Rusty', 'big-rusty-drums', [
    rusty('Kick', 'kick_24/kick/kick/k_vl*', 0, 0.9, 'kick', 'oh'), rusty('Boom', 'kick_24_nodamp/kick/kick/*_vl*', 0, 1.6, 'kick', 'oh'),
    rusty('Snare', 'snare_14/center/top/*_vl*', 1, 0.8, 'top', 'oh'), rusty('Ghost', 'snare_14/center/top/*_vl*', 99, 0.4, 'top', 'oh'),
    rusty('Rimshot', 'snare_14/rimshot/top/*_vl*', 0, 0.9, 'top', 'oh'), rusty('Cross-stick', 'snare_14/sidestick/top/*_vl*', 0, 0.4, 'top', 'oh'),
    rusty('Hat', 'hihat_14/cl/cl/*_vl*', 1, 0.35, 'cl', 'oh'), rusty('Hat pedal', 'hihat_14/chik/cl/*_vl*', 0, 0.35, 'cl', 'oh'),
    rusty('Open hat', 'hihat_14/open/cl/*_vl*', 0, 1.5, 'cl', 'oh'), rusty('High tom', 'tom_14/center/cl/*_vl*', 0, 1.0, 'cl', 'oh'),
    rusty('Mid tom', 'tom_15/center/cl/*_vl*', 0, 1.1, 'cl', 'oh'), rusty('Low tom', 'tom_18/center/cl/*_vl*', 0, 1.3, 'cl', 'oh'),
    rusty('Floor tom', 'tom_22/center/cl/*_vl*', 0, 1.5, 'cl', 'oh'), rusty('Ride', 'ride_22/rd/oh/*_vl*', 1, 2.0, 'oh', 'cl'),
    rusty('Crash', 'crash_17/cr/oh/*_vl*', 0, 2.5, 'oh', 'cl'), rusty('China', 'china_18/cn/oh/*_vl*', 0, 2.0, 'oh', 'cl')]),
  'swirly': ('Swirly Brushes', 'swirly-drums', [
    swirly('Kick', 'kick_buzz'), swirly('Cajon', 'cajon_kick'), swirly('Snare', 'snare_main', 1), swirly('Ghost', 'snare_main', 99, 0.4),
    swirly('Snare edge', 'snare_edge'), ('Brush stir', 'Samples/snare_stir/stir_dl*_rr1.wav', 0, 1.2, []), swirly('Snare dig', 'snare_dig'),
    swirly('Hat', 'hat_closed', 1, 0.35), swirly('Hat pedal', 'hat_foot', 0, 0.35), swirly('Half hat', 'hat_half', 1, 0.6),
    swirly('Open hat', 'hat_open', 0, 1.4), swirly('High tom', 'tom_mhi', 0, 1.0), swirly('Low tom', 'tom_floor', 0, 1.3),
    swirly('Ride', 'ride', 1, 2.0), swirly('Crash', 'crash', 0, 2.2), swirly('Splash', 'splash', 0, 1.5)]),
}

def files_of(repo):
    return subprocess.run(['git', '-C', f'{SRC}/{repo}', 'ls-tree', '-r', '--name-only', 'HEAD'],
                          capture_output=True, text=True, check=True).stdout.splitlines()

def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(RATE), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

layer = lambda f: int(m.group(1)) if (m := re.search(r'_[dv]l(\d+)', f)) else 0     # vl: velocity; dl: the stir's length

index = json.load(open(f'{OUT}/banks.json'))
for key, (name, repo, hits) in KITS.items():
    if len(sys.argv) > 3 and key not in sys.argv[3:]: continue
    allf = files_of(repo)
    picked = []
    for label, pat, down, cap, mix in hits:
        fs = sorted((f for f in allf if fnmatch.fnmatch(f, pat)), key=layer)
        assert fs, (key, label, pat)
        if mix == 'all mics':
            vls = sorted({layer(f) for f in fs}); v = vls[max(0, len(vls) - 1 - down)]
            picked.append((label, [f for f in fs if layer(f) == v], cap)); continue
        f = fs[max(0, len(fs) - 1 - down)]
        # the mic is the last match in the path (Big Rusty has folders like kick/kick/)
        picked.append((label, [f] + [b.join(f.rsplit(a, 1)) for a, b in mix], cap))
    need = sorted({p for _, ps, _ in picked for p in ps})
    for i in range(0, len(need), 50):
        subprocess.run(['git', '-C', f'{SRC}/{repo}', 'checkout', '-q', 'HEAD', '--'] + need[i:i + 50], check=True)
    data, slices = [], []
    for label, paths, cap in picked:
        xs = [load(f'{SRC}/{repo}/{p}') for p in paths]
        n = max(len(x) for x in xs); x = np.zeros(n, dtype=np.float32)
        for y in xs: x[:len(y)] += y
        pk = float(np.max(np.abs(x))) or 1
        a = int(np.argmax(np.abs(x) > pk * 0.05))
        x = x[max(0, a - RATE // 1000):][:int(cap * RATE)] * (0.95 * LEVEL.get(label, 1) / pk)
        fade = min(len(x), int(0.03 * RATE)); x[-fade:] *= np.linspace(1, 0, fade)
        slices.append([len(data), len(data) + len(x)])
        data.extend(x.tolist()); data.extend([0.0] * int(0.02 * RATE))
    pcm = (np.clip(np.array(data), -1, 1) * 32767).astype('<i2')
    w = wave.open(f'{OUT}/{key}.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
    w.writeframes(pcm.tobytes()); w.close()
    index[key] = {'name': name, 'rate': RATE, 'slices': slices, 'from': [h[0] for h in hits]}
    print(f'{key}: {len(slices)} hits, {len(data) / RATE:.1f} s, {[p[1][0].split("/")[-1] for p in picked][:4]}...')
json.dump(index, open(f'{OUT}/banks.json', 'w'), separators=(',', ':'))
