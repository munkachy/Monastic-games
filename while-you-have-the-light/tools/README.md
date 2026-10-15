# Tools
- deploy.sh NEWVER "title" "body" files... : bumps ?v= in index.html and notes.js, runs smoke.js, commits and pushes the branch, then copies files to gh-pages and pushes. Needs a local server: `cd /home/user/Monastic-games && python3 -m http.server 8100`.
- smoke.js: loads the game in Playwright and prints the script versions (deploy.sh uses it).
- smoke2.js [outdir]: visits every screen (title, endless climb, its pause, each of the seven mountains, the monastery, the white room, the end, art.html, design.html), presses keys in each, and prints any error, including those the game loop catches. Screenshots to outdir if given.
- lint.js: names used but defined nowhere, names defined but never used, top-level names no file uses (all the scripts share one scope; browser-globals.json lists the browser's own names). Should print "clean".
- replay.js URL [frames]: plays fixed runs (seeded random, clock stepped by hand, scripted keys) and prints fingerprints of the climb's state. Serve an older commit on another port (git worktree + `python3 -m http.server 8101`) and diff the two outputs to prove a change left play as it was.
- Scenes in replay.js: after the three plain runs, six runs start from white-room scenes (a fight, Avarice's coins, Lust's briars, a great demon with a block, a summit, a boon), played by a simple fighter that taps the nearest demon with each arrow in turn.
- coverage.js a.json b.json: run smoke2.js and replay.js with COVER=file set, then this lists every named function no test ran, by file, and the share that did. Add a scene to replay.js for what matters and is missing.
- check-cart.js, check-great.js, check-tips.js, check-look.js: tests of one system each, printing what happened step by step (the cart: in, out, back; great demons: where they come, the summit's block taken, an ordinary one's cut free).
- codemap.js: regenerates the index in ../CODEMAP.md (sections and functions with line numbers). Run it after changing code.
- trace2.js jobs.json > traced.json : traces black shapes from art-src images (crop, erase rects, fill, scale) into outline loops; boxes.js finds figure boxes on a sheet; prev2.js renders traced.json to a PNG; crop.js crops a region with a grid.
- claude-page.html: the page published as the claude.ai artifact (with the game's .js files as supporting files). Its script list must match index.html's.
Run node scripts with NODE_PATH=/opt/node22/lib/node_modules.
