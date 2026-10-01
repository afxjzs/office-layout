#!/usr/bin/env bash
# End-to-end test for the office layout planner.
# Needs the page served first:  python3 serve.py   (from the project folder)
# Run from the project folder:  bash tests/run-e2e.sh
set -euo pipefail
B="$HOME/.claude/skills/gstack/browse/dist/browse"

# Reuse whichever gstack browser is running. A plain `status` fails with a config mismatch
# when the running browser is the visible (headed) one used for reading store pages.
MODE=()
if status_out="$("$B" status 2>&1)"; then
  echo "E2E browser: headless"
elif [[ "$status_out" == *"headed mismatch"* ]]; then
  MODE=(--headed)
  echo "E2E browser: the already-open visible browser (its current tab will be navigated away)"
else
  echo "E2E could not reach the gstack browser:" >&2
  echo "$status_out" >&2
  exit 1
fi
b() { "$B" "${MODE[@]}" "$@"; }

b goto http://localhost:8765/index.html
# Start from known saved layouts that predate the one-time upgrades, so the test covers the
# upgrades that add and fix pieces:
#  - "Old": the futon, plus the bookcase at its old guessed depth
#  - "Screenshot": the Shaker bookcase still holding the price from the user's screenshot, no link
b js 'localStorage.clear(); localStorage.setItem("office-layout.v1", JSON.stringify({version:1, current:"Old", layouts:{Old:[{id:"futon",kind:"futon",name:"Futon",w:57,d:47,h:41,x:42.5,y:23.5,rot:0,z:0,color:"#3d4556",est:true},{id:"store-bookcase",kind:"bookcab",name:"Bookcase + cabinet",w:31.5,d:16.5,h:70.87,upperD:15.75,legH:6.02,cabH:14.57,r:3,x:110,y:50,rot:0,z:0,color:"#7a4a2c",est:true,hidden:true}], Screenshot:[{id:"shelf-shaker",kind:"shaker",name:"Shaker bookcase",w:30,d:13.25,h:72,x:60,y:62,rot:0,z:0,color:"#4a3326",hidden:true,price:299.99,priceNote:"From your screenshot of the Latitude Run listing: Rich Brown, 6 shelves (was $355.99). No link yet."}]}})); "seeded"'
b goto http://localhost:8765/index.html
# load twice so the test also proves one-time setup steps don't repeat on reload
b goto http://localhost:8765/index.html
b eval tests/e2e.js >/dev/null
for i in {1..30}; do
  out="$(b js "window.__e2e || ''")"
  if [ -n "$out" ]; then
    echo "$out"
    [[ "$out" == *"ALL PASS"* ]] && exit 0
    exit 1
  fi
  sleep 0.5
done
echo "E2E timed out: the test never reported a result" >&2
exit 1
