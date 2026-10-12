# Tools
- deploy.sh NEWVER "title" "body" files... : bumps ?v= in index.html and notes.js, runs smoke.js, commits and pushes the branch, then copies files to gh-pages and pushes. Needs a local server: `cd /home/user/Monastic-games && python3 -m http.server 8100`.
- smoke.js: loads the game in Playwright and prints the script versions.
- trace2.js jobs.json > traced.json : traces black shapes from art-src images (crop, erase rects, fill, scale) into outline loops; boxes.js finds figure boxes on a sheet; prev2.js renders traced.json to a PNG; crop.js crops a region with a grid.
- claude-page.html: the page published as the claude.ai artifact (with the game's .js files as supporting files).
Run node scripts with NODE_PATH=/opt/node22/lib/node_modules.
