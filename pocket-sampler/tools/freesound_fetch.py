# Fetches sounds from Freesound on YOUR computer (Freesound refuses traffic from
# the cloud, where Claude works), and hands them to Claude through a branch of
# this repository.
#
#   python3 freesound_fetch.py                 # uses the wish list on GitHub
#   python3 freesound_fetch.py my-list.json    # or a wish list on disk
#
# It asks for your Freesound API key (or reads FREESOUND_KEY); the key is used
# only to talk to Freesound and is never written to a file. For each wish it
# searches Freesound, downloads the best few results' high-quality MP3
# previews into ./freesound-inbox/<category>/, and writes credits.json (who
# made each sound, its license and its page). Then, if this folder is inside a
# clone of the Monastic-games repository, it can push them to the branch
# "freesound-inbox", without touching your own work: it uses a separate git
# worktree. Needs Python 3.8+ (standard library only) and, for pushing, git.
import getpass, json, os, re, shutil, subprocess, sys, tempfile, time, urllib.parse, urllib.request

LIST_URL = ('https://raw.githubusercontent.com/munkachy/Monastic-games/claude/amazing-dijkstra-bxwozt/'
            'pocket-sampler/tools/freesound-wishlist.json')
API = 'https://freesound.org/apiv2/search/text/'
FIELDS = 'id,name,username,license,url,previews,duration,tags,num_downloads,avg_rating'
OUT = os.path.abspath('freesound-inbox')
BRANCH = 'freesound-inbox'

def get(url, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'pocket-sampler-fetch/1'})
            with urllib.request.urlopen(req, timeout=60) as r: return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (401, 403): sys.exit(f'Freesound said {e.code}: check the API key.')
            if e.code == 429 or e.code >= 500: time.sleep(2 ** i + 1); continue
            raise
        except urllib.error.URLError: time.sleep(2 ** i + 1)
    raise RuntimeError('could not reach ' + url.split('?')[0])

def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:40] or 'sound'

def main():
    wishes = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else json.loads(get(LIST_URL))
    key = os.environ.get('FREESOUND_KEY') or getpass.getpass('Freesound API key (not shown, not saved): ').strip()
    os.makedirs(OUT, exist_ok=True)
    credits_path = os.path.join(OUT, 'credits.json')
    credits = json.load(open(credits_path)) if os.path.exists(credits_path) else {}
    for w in wishes['wishes']:
        cat, q, n = w['category'], w['query'], w.get('count', 4)
        params = {'query': q, 'fields': FIELDS, 'page_size': max(n * 3, 15), 'sort': w.get('sort', 'downloads_desc'), 'token': key}
        if w.get('filter'): params['filter'] = w['filter']
        res = json.loads(get(API + '?' + urllib.parse.urlencode(params)))['results']
        got = 0
        for s in res:
            if got >= n: break
            if str(s['id']) in credits: got += 1; continue
            if w.get('min_rating') and (s.get('avg_rating') or 0) < w['min_rating']: continue
            path = os.path.join(OUT, cat, f"{s['id']}-{slug(s['name'])}.mp3")
            os.makedirs(os.path.dirname(path), exist_ok=True)
            open(path, 'wb').write(get(s['previews']['preview-hq-mp3']))
            credits[str(s['id'])] = {'file': os.path.relpath(path, OUT), 'name': s['name'], 'by': s['username'], 'license': s['license'],
                                    'page': s['url'], 'duration': s['duration'], 'tags': s['tags'][:12], 'wish': q}
            got += 1
            time.sleep(0.3)        # be gentle with Freesound
        print(f'{cat:28} {q[:40]:40} {got} sounds')
        json.dump(credits, open(credits_path, 'w'), indent=1)
    print(f'\n{len(credits)} sounds in {OUT}')
    push()

def push():
    try: top = subprocess.run(['git', 'rev-parse', '--show-toplevel'], capture_output=True, text=True, check=True).stdout.strip()
    except Exception: top = ''
    if not top or 'Monastic-games'.lower() not in os.path.basename(top).lower():
        print('Not inside a clone of Monastic-games: upload the freesound-inbox folder to the repository by hand '
              '(on GitHub: Add file > Upload files, onto a new branch named freesound-inbox).'); return
    if input(f'Push them to the branch "{BRANCH}" for Claude? [y/N] ').strip().lower() != 'y': return
    tmp = tempfile.mkdtemp(prefix='fs-inbox-')
    g = lambda *a, **k: subprocess.run(['git', '-C', k.get('cwd', top), *a], check=True)
    g('worktree', 'add', '--detach', tmp)
    try:
        g('checkout', '--orphan', BRANCH + '-tmp', cwd=tmp)
        g('rm', '-rfq', '--ignore-unmatch', '.', cwd=tmp)
        shutil.copytree(OUT, os.path.join(tmp, 'freesound-inbox'))
        g('add', 'freesound-inbox', cwd=tmp)
        g('commit', '-qm', 'Freesound inbox for Pocket Sampler', cwd=tmp)
        g('push', '-f', 'origin', f'HEAD:refs/heads/{BRANCH}', cwd=tmp)
        print(f'Pushed. Tell Claude: the sounds are on the branch {BRANCH}.')
    finally:
        g('worktree', 'remove', '--force', tmp)
        subprocess.run(['git', '-C', top, 'branch', '-D', BRANCH + '-tmp'], capture_output=True)

if __name__ == '__main__':
    main()
