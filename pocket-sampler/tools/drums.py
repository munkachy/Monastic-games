# Usage: python3 drums.py <virtuosity_drums checkout> <output folder>
# Builds the Acoustic Kit and Percussion banks (16 hits each) from Karoryfer
# Samples' Virtuosity Drums (CC0): https://github.com/sfzinstruments/virtuosity_drums
# Mid mic, round robin 1. Each hit is cut to `cap` seconds with a short fade;
# each starts 1 ms before its attack and is brought up to full level (one
# distant mic hears the hi-hat far quieter than the snare), except the hits
# in QUIET, kept softer on purpose. Each bank is one 32 kHz mono WAV, plus
# each hit's start and end in banks.json. Needs ffmpeg (the source is FLAC).
import subprocess, sys, os, json, array, glob, wave, re
SRC, OUT = sys.argv[1], sys.argv[2]
RATE = 32000
QUIET = {'Soft kick': 0.4, 'Ghost': 0.3, 'Hat pedal': 0.4, 'Triangle mute': 0.6, 'Hat': 0.55, 'Half hat': 0.55, 'Open hat': 0.6,
         'Ride': 0.5, 'Ride bell': 0.5, 'Crash': 0.6, 'Shaker': 0.6, 'Shaker up': 0.6, 'Tambourine': 0.6, 'Cabasa': 0.6}

def top(pattern, down=0):
    # The loudest velocity layer (or `down` layers below it), round robin 1.
    fs = [f for f in glob.glob(f'{SRC}/Samples/{pattern}*') if '_rr' not in f or '_rr1_' in f or '_rr1.' in f]
    def layer(f):
        m = re.search(r'_vl?(\d+)[_.]', os.path.basename(f))
        return int(m.group(1)) if m else 0
    fs.sort(key=layer)
    assert fs, pattern
    return fs[max(0, len(fs) - 1 - down)]

BANKS = {
  'acoustic': ('Acoustic Kit', [
    ('Kick', top('mid/kick/mid_kick_snoff_'), 0.8), ('Soft kick', top('mid/kick/mid_kick_snoff_', 2), 0.8),
    ('Snare', top('mid/snare/mid_snare_center_', 1), 0.7), ('Ghost', top('mid/snare/mid_snare_center_', 99), 0.4),
    ('Rimshot', top('mid/snare/mid_snare_rimshot_'), 0.8), ('Cross-stick', top('mid/snare/mid_snare_crossstick_'), 0.4),
    ('Flam', top('mid/snare/mid_snare_flam_'), 0.7), ('Hat', top('mid/hh/mid_hh_closed_', 1), 0.3),
    ('Hat pedal', top('mid/hh/mid_hh_pedal_'), 0.3), ('Half hat', top('mid/hh/mid_hh_half_', 1), 0.6),
    ('Open hat', top('mid/hh/mid_hh_open_'), 1.5), ('Low tom', top('mid/ltom/mid_ltom_center_'), 1.2),
    ('High tom', top('mid/htom/mid_htom_center_'), 1.0), ('Ride', top('mid/ride/mid_ride_ride_', 1), 2.0),
    ('Ride bell', top('mid/ride/mid_ride_bell_'), 2.0), ('Crash', top('mid/crash/mid_crash_crash_'), 2.5)]),
  'percussion': ('Percussion', [
    ('Conga', top('perc/mid/conga/Conga_22_HitN_101_127'), 0.8), ('Conga mute', top('perc/mid/conga/Conga_17_HitHM1_71_127'), 0.5),
    ('Tumba', top('perc/mid/tumba/Tumba_24_HitN_101_127'), 0.9), ('Bongo high', top('perc/mid/bongoh/BongoH_Hit1_v'), 0.5),
    ('Bongo low', top('perc/mid/bongol/BongoL_Hit1_v'), 0.6), ('Claves', top('perc/mid/claves/Claves1_Hit_v'), 0.4),
    ('Cowbell', top('perc/mid/cowbell/Cowbell1_Normal_v'), 0.7), ('Agogo high', top('perc/mid/agogo/Agogo_High_v'), 0.8),
    ('Agogo low', top('perc/mid/agogo/Agogo_Low_v'), 0.8), ('Shaker', top('perc/mid/shaker/LShaker_Shake1D'), 0.4),
    ('Shaker up', top('perc/mid/shaker/LShaker_Shake1U'), 0.4), ('Tambourine', top('perc/mid/tambourine/Tamb1_Shake'), 0.6),
    ('Triangle', top('perc/mid/triangle/Triangle1_Hit_v'), 2.0), ('Triangle mute', top('perc/mid/triangle/Triangle1_HitM_v'), 0.4),
    ('Cabasa', top('perc/mid/cabasa/Cabasa1_Rub_v'), 0.5), ('Vibraslap', top('perc/mid/vibraslap/Vibraslap1_1_Hit_71_127'), 1.5)]),
}

index = json.load(open(f'{OUT}/banks.json'))
for key, (name, hits) in BANKS.items():
    data, slices = [], []
    for label, f, cap in hits:
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', str(RATE), '-f', 'f32le', '-'],
                             capture_output=True, check=True).stdout
        x = array.array('f', raw)
        pk = max(abs(v) for v in x) or 1
        a = next(i for i, v in enumerate(x) if abs(v) > pk * 0.05)
        x = x[max(0, a - RATE // 1000):][:int(cap * RATE)]
        g = 0.95 * QUIET.get(label, 1) / pk
        x = array.array('f', (v * g for v in x))
        fade = min(len(x), int(0.03 * RATE))
        for i in range(fade): x[len(x) - 1 - i] *= i / fade
        slices.append([len(data), len(data) + len(x)])
        data.extend(x); data.extend([0.0] * int(0.02 * RATE))
    pcm = array.array('h', (int(max(-1, min(1, v)) * 32767) for v in data))
    w = wave.open(f'{OUT}/{key}.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
    w.writeframes(pcm.tobytes()); w.close()
    index[key] = {'name': name, 'rate': RATE, 'slices': slices, 'from': [h[0] for h in hits]}
    print(key, len(data) / RATE, 's')
json.dump(index, open(f'{OUT}/banks.json', 'w'), separators=(',', ':'))
