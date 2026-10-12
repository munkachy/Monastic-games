#!/bin/bash
# tools/deploy.sh NEWVER "commit title" "commit body" file...   (files relative to while-you-have-the-light/)
set -e
NEW=$1; TITLE=$2; BODY=$3; shift 3
REPO=/home/user/Monastic-games; G=$REPO/while-you-have-the-light; GP=${GP:-/tmp/ghpages}
[ -d $GP/.git ] || git clone -q -b gh-pages "$(git -C $REPO remote get-url origin)" $GP
OLD=$(grep -o 'v=2026[0-9a-z]*' $G/notes.js | head -1 | cut -d= -f2)
sed -i "s/v=$OLD/v=$NEW/g" $G/index.html $G/notes.js
cd $G/tools && NODE_PATH=/opt/node22/lib/node_modules timeout 60 node smoke.js | grep -q "v=$NEW" || { echo SMOKE FAILED; exit 1; }
cd $REPO
for f in "$@" index.html notes.js; do git add while-you-have-the-light/$f; done
git commit -q -m "$TITLE" -m "$BODY" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EvvhEHwbMCZCDTLbrLNi3Q"
for i in 1 2 3 4; do git push -q -u origin claude/browser-game-reskin-explore-hdpkw2 2>&1 | tail -1 && break || sleep $((2**i)); done
cd $GP && git fetch -q origin gh-pages && git reset -q --hard origin/gh-pages
for f in "$@" index.html notes.js; do mkdir -p $(dirname while-you-have-the-light/$f); cp $G/$f while-you-have-the-light/$f; done
for f in $(ls $G); do [ -f while-you-have-the-light/$f ] && ! cmp -s $G/$f while-you-have-the-light/$f && echo "DIFFERS: $f"; done
git add while-you-have-the-light && git commit -q -m "Deploy While You Have the Light v$NEW" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EvvhEHwbMCZCDTLbrLNi3Q"
for i in 1 2 3 4; do git push -q origin HEAD:gh-pages 2>&1 | tail -1 && break || sleep $((2**i)); done
echo "deployed v$NEW: $(cd $REPO && git log --oneline -1)"
