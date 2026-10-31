# Usage: python3 -I reverbs.py <folder of downloaded impulse responses> <sounds folder>
# The reverbs: recordings of real spaces (impulse responses: a sweep played in the room, and how
# the room rang, recorded), made ready for the app's convolution reverb. Each is made stereo (a
# B-format recording through two virtual microphones turned left and right, 90 degrees apart; two
# single microphones side by side as left and right), the silence before the sound arrives and the direct sound itself cut,
# the tail trimmed where it has died away (and faded), and every space set to the same energy, so
# the reverb amount means the same in each. Written to <sounds>/reverbs/<id>.wav, 48 kHz 16-bit.
#
# Sources (all freely licensed; credited in the app's Help):
#   aachen    St. Nicholas Chapel, Aachen Cathedral: M. Zerwas and S. Kayku, Zenodo 22207913, CC BY 4.0
#             (impulse_responses.zip: Nikolauskapelle_Source1_BRIR/S1-Do_R10.wav, B-format FuMa)
#   ely       Lady Chapel, Ely Cathedral: L. Alvarez-Morales, M. Lopez, A. Alvarez-Corbacho, P. Bustamante,
#             Zenodo 5150020 (CA-MRIR-EC-LC/MRIR_EC_S0_DO_Sw_R05_Bformat.wav, measured), CC BY 4.0
#             in its record (its description says CC BY-NC-SA 4.0; the app keeps to the stricter)
#   stalbans  Lady Chapel, St Albans Cathedral: OpenAIR, University of York (stereo/stalbans_a_ortf.wav), CC BY 4.0
#   cremona   a church in Cremona (ChurchIR): R. Giampiccolo, S. Parrinelli, F. Antonacci, Zenodo 14901751,
#             CC BY 4.0 (OMNI/SC_ML_OMNI_10.wav and SC_MR_OMNI_10.wav, as left and right)
#   stairwell a stairwell, Aalto University: T. McKenzie, S. Schlecht, V. Pulkki, Zenodo 4506379, CC BY 4.0
#             (Office to Stairwell/Source in Room 2/With Line of Sight/RIR_450cm, RIR_500cm; channel 1)
#   room      a meeting room, Aalto University: the same dataset (Meeting Room to Hallway/Source in Room 1/
#             With Line of Sight/RIR_0cm, RIR_10cm; channel 1)
import sys, os, struct
import numpy as np

SRC, OUT = sys.argv[1], os.path.join(sys.argv[2], 'reverbs')
RATE = 48000

def read(path):           # PCM 16/24/32-bit or 32-bit float WAV -> (channels x samples float, rate)
    b = open(path, 'rb').read(); p = 12; fmt = None
    while p < len(b) - 8:
        cid, n = b[p:p + 4], struct.unpack('<I', b[p + 4:p + 8])[0]
        if cid == b'fmt ': fmt = struct.unpack('<HHIIHH', b[p + 8:p + 24])
        if cid == b'data': data = b[p + 8:p + 8 + n]; break
        p += 8 + n + (n & 1)
    tag, ch, rate, _, _, bits = fmt
    if tag == 0xFFFE: tag = 3 if bits == 32 and b'\x03\x00\x00\x00\x00\x00\x10\x00' in b[:200] else 1
    if tag == 3: x = np.frombuffer(data, '<f4' if bits == 32 else '<f8').astype(np.float64)
    elif bits == 16: x = np.frombuffer(data, '<i2') / 32768.0
    elif bits == 24:
        a = np.frombuffer(data, np.uint8).reshape(-1, 3).astype(np.int32)
        x = ((a[:, 0] | (a[:, 1] << 8) | (a[:, 2] << 16)) << 8 >> 8) / 8388608.0
    else: x = np.frombuffer(data, '<i4') / 2147483648.0
    return x.reshape(-1, ch).T, rate

def resample(x, r):
    if r == RATE: return x
    t = np.arange(0, x.shape[1] * RATE / r) * r / RATE
    return np.stack([np.interp(t, np.arange(x.shape[1]), c) for c in x])

def bformat(path):        # W, X, Y, Z (FuMa: W scaled by 1/sqrt 2) -> left, right cardioids at +-45 degrees
    x, r = read(path); W, X, Y = x[0] * np.sqrt(2), x[1], x[2]
    c, s = np.cos(np.pi / 4), np.sin(np.pi / 4)
    return resample(np.stack([0.5 * (W + c * X + s * Y), 0.5 * (W + c * X - s * Y)]), r)

def pair(a, b, ch=0):     # two single microphones as left and right
    xa, r = read(a); xb, _ = read(b); n = min(xa.shape[1], xb.shape[1])
    return resample(np.stack([xa[ch, :n], xb[ch, :n]]), r)

def stereo(path):
    x, r = read(path); return resample(x[:2], r)

# the old made-up hall's energy (noise fading over 2.6 s): every space is set to it
HALL = 0.25 / 3 * (2.6 * RATE) / 7

def finish(x, longest):
    m = np.abs(x).max(0); start = max(0, int(np.argmax(m > m.max() * 0.05)) - int(0.002 * RATE))
    x = x[:, start:].copy()
    # the direct sound (the first, loudest click, straight from the speaker) out, the room after it kept:
    # the reverb is added to the dry sound, which needs no second copy of itself
    d0, d1 = int(0.006 * RATE), int(0.014 * RATE)
    x[:, :d0] = 0; x[:, d0:d1] *= np.sin(np.linspace(0, np.pi / 2, d1 - d0)) ** 2
    e = np.cumsum((x ** 2).sum(0)[::-1])[::-1]               # energy still to come, from each sample on
    end = int(np.argmax(e < e[0] * 1e-6)) or x.shape[1]      # -60 dB
    end = min(end, int(longest * RATE)); x = x[:, :end].copy()
    f = int(min(0.25 * end, 0.6 * RATE)); x[:, end - f:] *= np.cos(np.linspace(0, np.pi / 2, f)) ** 2
    x *= np.sqrt(HALL / ((x ** 2).sum(1).mean()))
    return x

def write(name, x):
    top = np.abs(x).max(); y = x / top if top > 1 else x          # kept in range (the app levels it again)
    pcm = (np.clip(y, -1, 1) * 32767).round().astype('<i2').T.reshape(-1).tobytes()
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name + '.wav'), 'wb') as f:
        f.write(b'RIFF' + struct.pack('<I', 36 + len(pcm)) + b'WAVEfmt ' + struct.pack('<IHHIIHH', 16, 1, 2, RATE, RATE * 4, 4, 16) + b'data' + struct.pack('<I', len(pcm)) + pcm)
    print(f'{name:10s} {x.shape[1] / RATE:.2f} s  gain kept {1 / top if top > 1 else 1:.3f}')
    return 1 / top if top > 1 else 1

S = lambda f: os.path.join(SRC, f)
levels = {}
levels['aachen'] = write('aachen', finish(bformat(S('aachen_R10.wav')), 5.0))
levels['ely'] = write('ely', finish(bformat(S('ely_R05.wav')), 4.0))
levels['stalbans'] = write('stalbans', finish(stereo(S('stalbans_a_ortf.wav')), 4.0))
levels['cremona'] = write('cremona', finish(pair(S('cremona_SC_ML_OMNI_10.wav'), S('cremona_SC_MR_OMNI_10.wav')), 4.0))
levels['stairwell'] = write('stairwell', finish(pair(S('stair_450.wav'), S('stair_500.wav')), 1.5))
levels['room'] = write('room', finish(pair(S('meeting_0.wav'), S('meeting_10.wav')), 1.0))
import json      # how much louder each plays than it is stored (kept in range in the file)
json.dump({k: round(1 / v, 4) for k, v in levels.items()}, open(os.path.join(OUT, 'levels.json'), 'w'))
print('levels', {k: round(1 / v, 4) for k, v in levels.items()})
