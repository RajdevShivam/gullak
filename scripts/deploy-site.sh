#!/usr/bin/env bash
# Publish gullak/ to https://shivamrajdev.com/gullak/
# The site is the portfolio-website repo (Cloudflare Pages builds its main branch), so a push to THIS repo
# does not change the site. This copies the four game files into public/gullak/ there, pushes main,
# and waits until the live files match.
# Usage: scripts/deploy-site.sh [site-worktree]   (default ../pw-gullak, created from ../PersonalWebsite if missing)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="${1:-$ROOT/../pw-gullak}"
FILES="index.html style.css game.js ui.js"
node --test "$ROOT/tests/" >/dev/null || { echo "unit tests failed; not deploying"; exit 1; }
if [ ! -d "$SITE" ]; then
  git -C "$ROOT/../PersonalWebsite" fetch -q origin
  git -C "$ROOT/../PersonalWebsite" worktree add -q "$SITE" origin/main -b add-gullak
fi
git -C "$SITE" fetch -q origin && git -C "$SITE" reset -q --hard origin/main   # this worktree only ever carries the game copy
mkdir -p "$SITE/public/gullak"
for f in $FILES; do cp "$ROOT/gullak/$f" "$SITE/public/gullak/"; done
# The site caches .js/.css for 4 hours but rechecks the page, so stamp the asset links: a deploy always loads matching files.
VER=$(cat "$ROOT/gullak/"{style.css,game.js,ui.js} | tr -d '\r' | md5sum | cut -c1-8)
sed -i -E "s#(href=\"style\.css|src=\"game\.js|src=\"ui\.js)\"#\1?v=$VER\"#g" "$SITE/public/gullak/index.html"
git -C "$SITE" add public/gullak
if git -C "$SITE" diff --cached --quiet; then echo "site already has this version"; exit 0; fi
git -C "$SITE" commit -q -m "Gullak: update from gullak@$(git -C "$ROOT" rev-parse --short HEAD)"
git -C "$SITE" push -q origin HEAD:main
sum() { tr -d '\r' | md5sum | cut -c1-32; }   # ignore CRLF vs LF
for i in $(seq 1 40); do
  same=1
  for f in game.js ui.js; do
    [ "$(sum < "$ROOT/gullak/$f")" = "$(curl -s "https://shivamrajdev.com/gullak/$f?v=$RANDOM" | sum)" ] || same=0
  done
  curl -s "https://shivamrajdev.com/gullak/?v=$RANDOM" | grep -q "game.js?v=$VER" || same=0
  [ "$same" = 1 ] && { echo "live: https://shivamrajdev.com/gullak/"; exit 0; }
  sleep 15
done
echo "pushed, but the live files still differ after 10 min; check Cloudflare Pages"; exit 1
