# Usage: python3 -I inbox.py <a checkout of the library-inbox branch> <sounds folder> <SOUNDS.md>
# Files what was sent to the library from the app (☁ Send to the library): each inbox/<item>/ holds
# pack.pocketpack.json (the sounds, and a Loops set if one was sent) and notes.json (what it is, who
# made it, where from and its license). Each is copied to <sounds>/shared/<name>.pocketpack.json,
# listed in <sounds>/shared/index.json (which the app's ☁ Shared folder reads, on every device), and
# entered in SOUNDS.md with its credit and whether it could stay if the app were sold. Prints the
# inbox folders filed, to be removed from the inbox branch afterwards (see CLAUDE.md).
import sys, os, json, re, shutil

INBOX, SOUNDS, LEDGER = sys.argv[1], sys.argv[2], sys.argv[3]
OUT = os.path.join(SOUNDS, 'shared'); os.makedirs(OUT, exist_ok=True)
INDEX = os.path.join(OUT, 'index.json')
index = json.load(open(INDEX)) if os.path.exists(INDEX) else {'about': "Packs sent to the library from the app, filed by tools/inbox.py; the app's ☁ Shared folder lists them.", 'items': []}
have = {x['sent'] + x['name'] for x in index['items']}

def selling(n):
    # the made-by-him ones are his; else by the license given (CC0, CC BY, MIT, public domain allow it)
    if n['who'] == 'me': return 'Yes (his own)'
    s = (n.get('source') or '').lower()
    if re.search(r'\bnc\b|non-?commercial', s): return '**No**: non-commercial'
    if re.search(r'cc0|cc[ -]?by(?![ -]?nc)|\bmit\b|public domain', s): return 'Yes (with the credit asked)'
    return '**Check**: license not settled'

rows, filed = [], []
root = os.path.join(INBOX, 'inbox')
for d in sorted(os.listdir(root)) if os.path.isdir(root) else []:
    p = os.path.join(root, d)
    if not os.path.exists(os.path.join(p, 'notes.json')): continue
    n = json.load(open(os.path.join(p, 'notes.json')))
    if n['sent'] + n['name'] in have: filed.append(d); continue
    slug = re.sub(r'[^\w]+', '-', n['name'].lower()).strip('-')[:40] or 'pack'
    file = f"{n['sent'][:10]}-{slug}.pocketpack.json"
    shutil.copy(os.path.join(p, n.get('file', 'pack.pocketpack.json')), os.path.join(OUT, file))
    index['items'].append({**{k: n.get(k) for k in ('name', 'about', 'who', 'credit', 'source', 'sent', 'device', 'sounds', 'set', 'bpm')}, 'file': file,
                           'size': os.path.getsize(os.path.join(OUT, file))})
    names = ', '.join(s['name'] for s in n.get('sounds', [])) or '(a set)'
    rows.append(f"| {n['name']}: {names}{' (and a Loops set)' if n.get('set') else ''} | {n['credit']}{('; from ' + n['source']) if n.get('source') else ''}; sent from the app {n['sent'][:10]} (sounds/shared/{file}) | {n.get('source') or 'his own'} | {'none needed' if n['who'] == 'me' else 'as the source asks'} | {selling(n)} |")
    filed.append(d)
index['items'].sort(key=lambda x: x['sent'], reverse=True)
json.dump(index, open(INDEX, 'w'), indent=1, ensure_ascii=False)
if rows:
    L = open(LEDGER).read(); H = '## Shared from the app (☁ Send to the library)'
    if H not in L:
        L = L.replace('## If it were ever sold', f"{H}\n\n| What | Source | License | Credit | Selling |\n|---|---|---|---|---|\n\n## If it were ever sold")
    a = L.index(H); b = L.index('\n\n## ', a + len(H))
    L = L[:b] + '\n' + '\n'.join(rows) + L[b:]
    open(LEDGER, 'w').write(L)
print(f'{len(rows)} filed, {len(filed) - len(rows)} already in the library')
for d in filed: print('inbox/' + d)
