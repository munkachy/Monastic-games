# Usage: python3 basslines.py <FiloBass folder: musicxml_no_repeats/*.xml> <sounds folder>
# Basslines played by people: one-bar phrases from FiloBass (Xavier Riley and Simon Dixon,
# Queen Mary University of London, ISMIR 2023; MIT licence; https://huggingface.co/datasets/xavriley/FiloBass):
# 48 walking basslines by professional jazz bassists, transcribed by hand. A bar is kept when
# one chord holds through it and the bass starts on its root; each note is stored as its
# distance in half steps from that root, so the app plays it in any key, on any bass sound.
# Writes <sounds>/humanbass.json: { bars: [{ tune, bar, quality, hits: [[16th, half steps], ...] }] }
import os, sys, re, json, glob, collections
import xml.etree.ElementTree as ET

STEP = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def quality(kind, text):
    k = (text or '') + ' ' + (kind or '')
    if re.search(r'm7b5|ø|half|dim', k): return None                       # too particular to loop
    if re.search(r'minor|^m(?!aj)|\bm\d|min', (text or kind or '')): return 'minor'
    if re.search(r'maj|major|Δ|\^|^6', k) and not re.search(r'dominant|^7', text or ''): return 'major'
    if re.search(r'dominant|^7|^9|^13|other', k): return 'dominant'
    return None

def bars_of(path):
    root = ET.parse(path).getroot()
    title = (root.findtext('.//work-title') or os.path.basename(path)).replace('.xml', '').replace('-', ' ')
    part = root.find('part'); div = 1; out = []
    for mi, meas in enumerate(part.findall('measure')):
        pos = 0; notes = []; chords = []
        for el in meas:
            if el.tag == 'attributes' and el.find('divisions') is not None: div = int(el.findtext('divisions'))
            elif el.tag == 'harmony':
                r = el.find('root'); st = STEP[r.findtext('root-step')] + int(r.findtext('root-alter') or 0)
                kind = el.find('kind'); chords.append((pos, st % 12, quality(kind.text, kind.get('text'))))
            elif el.tag == 'backup': pos -= int(el.findtext('duration'))
            elif el.tag == 'forward': pos += int(el.findtext('duration'))
            elif el.tag == 'note':
                if el.find('chord') is not None: continue
                d = int(el.findtext('duration') or 0)
                tied = any(t.get('type') == 'stop' for t in el.findall('tie'))
                p = el.find('pitch')
                if p is not None and not tied:
                    midi = 12 * (int(p.findtext('octave')) + 1) + STEP[p.findtext('step')] + int(float(p.findtext('alter') or 0))
                    notes.append((pos / div, midi))
                pos += d
        out.append((mi + 1, pos / div, notes, chords))
    return title, out

bars = []
for path in sorted(glob.glob(os.path.join(sys.argv[1], '*.xml'))):
    title, ms = bars_of(path)
    for num, length, notes, chords in ms:
        if abs(length - 4) > 0.01 or len(chords) != 1 or chords[0][0] != 0 or chords[0][2] is None or len(notes) < 3: continue
        _, rt, q = chords[0]
        if not notes or notes[0][0] > 0.01 or notes[0][1] % 12 != rt: continue     # it starts on the root, on beat 1
        base = notes[0][1]
        hits = []
        for beat, midi in notes:
            p = beat * 4; step = round(p)
            if abs(p - step) > 0.2 or step > 15: continue                        # triplets and the like don't sit on 16ths
            hits.append([step, midi - base])
        if len(hits) < 3 or max(abs(h[1]) for h in hits) > 19: continue
        bars.append({'tune': title, 'bar': num, 'quality': q, 'hits': hits})
# Keep each line once; from every tune in turn (two at most from any one), the livelier first (a
# bassist's skips and pickups between the beats), up to 24 of each kind.
seen, keep, per, from_tune = set(), [], collections.Counter(), collections.Counter()
bars.sort(key=lambda b: (-sum(1 for h in b['hits'] if h[0] % 4), -len(b['hits'])))
by_tune = collections.defaultdict(list)
for b in bars: by_tune[b['tune']].append(b)
while any(by_tune.values()):
    for t in sorted(by_tune):
        if not by_tune[t]: continue
        b = by_tune[t].pop(0); key = (b['quality'], tuple(map(tuple, b['hits'])))
        if key in seen or per[b['quality']] >= 24 or from_tune[(t, b['quality'])] >= 2: continue
        seen.add(key); per[b['quality']] += 1; from_tune[(t, b['quality'])] += 1; keep.append(b)
keep.sort(key=lambda b: (['minor', 'dominant', 'major'].index(b['quality']), b['tune'], b['bar']))
json.dump({'from': 'FiloBass (Xavier Riley and Simon Dixon, QMUL, ISMIR 2023; MIT licence)', 'bars': keep},
          open(os.path.join(sys.argv[2], 'humanbass.json'), 'w'), separators=(',', ':'))
print(len(bars), 'bars found;', len(keep), 'kept:', dict(per))
