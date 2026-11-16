#!/bin/bash
# Re-captures the screenshots of the in-app user guide (public/docs/*.png).
# Needs the dev server on :5199 (npx vite --port 5199) and agent-browser.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
set -u
AB=agent-browser
# the Mac display may be asleep; without these Chrome stops producing frames and screenshots hang
export AGENT_BROWSER_ARGS="--disable-gpu,--disable-gpu-vsync,--disable-frame-rate-limit,--disable-renderer-backgrounding,--disable-background-timer-throttling,--disable-backgrounding-occluded-windows"
OUT="$(cd "$(dirname "$0")/../../public/docs" && pwd)"
URL=http://localhost:5199
cd "$(dirname "$0")"

fresh() { $AB open "$URL/?store=$1" >/dev/null; $AB eval 'localStorage.clear(); localStorage.setItem("vauthz-playground:v1:theme","dark"); 1' >/dev/null; $AB open "$URL/?store=$1" >/dev/null; $AB wait 2000 >/dev/null; }
# screenshots sometimes hang in CDP; give each 40s, then retry once
snap() {
  for attempt in 1 2; do
    $AB screenshot "$@" >/dev/null 2>&1 & local pid=$!
    local n=0
    while kill -0 $pid 2>/dev/null && [ $n -lt 40 ]; do sleep 1; n=$((n+1)); done
    if kill -0 $pid 2>/dev/null; then kill $pid 2>/dev/null; echo "retry $*"; sleep 2; else wait $pid && return 0; fi
  done
  return 1
}
shot() { snap "$1" "$OUT/$2.png" && echo "ok $2" || echo "FAIL $2"; }
full() { snap "$OUT/$1.png" && echo "ok $1" || echo "FAIL $1"; }
tab()  { $AB eval "[...document.querySelectorAll('[role=tab]')].find(t=>t.innerText.trim().startsWith('$1'))?.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); document.activeElement?.blur(); 1" >/dev/null; $AB wait 400 >/dev/null; }
radio(){ $AB eval "[...document.querySelectorAll('[role=radio]')].find(t=>t.innerText.trim()==='$1')?.click(); 1" >/dev/null; $AB wait 500 >/dev/null; }
setcheck() { # user action resource
  $AB eval "(()=>{const set=(id,v)=>{const el=document.querySelector(id); el.focus(); const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value'); d.set.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true})); el.blur()}; set('#q-user','$1'); set('#q-action','$2'); set('#q-resource','$3'); return 1})()" >/dev/null
  $AB wait 200 >/dev/null
  # close the suggestion lists the inputs opened
  $AB press Escape >/dev/null; $AB eval "document.activeElement?.blur(); 1" >/dev/null; $AB wait 500 >/dev/null
}

init() { $AB set viewport 1440 960 2 >/dev/null; }

ANNOTATE="$(cat "$HERE/annotate.js")"
init

# overview, header, menus, graphs
fresh entitlements
$AB eval "$ANNOTATE" >/dev/null; full overview; $AB eval 'document.querySelectorAll(".doc-anno").forEach(e=>e.remove()); 1' >/dev/null
shot header header
shot '[data-tour=editor]' editor-text
$AB eval '[...document.querySelectorAll("header button")].find(b=>b.innerText.includes("Store")).dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,button:0,pointerType:"mouse"})); 1' >/dev/null; $AB wait 500 >/dev/null
full _store-menu; $AB press Escape >/dev/null
$AB eval '[...document.querySelectorAll("header button")].find(b=>b.innerText.includes("Export")).dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,button:0,pointerType:"mouse"})); 1' >/dev/null; $AB wait 500 >/dev/null
full _export-menu; $AB press Escape >/dev/null
$AB hover '.react-flow__node[data-id="set:beta_testers"]' >/dev/null; $AB wait 500 >/dev/null
shot '[data-tour=graph]' graph-policy
tab "Dữ liệu"; $AB wait 1500 >/dev/null
$AB hover '.react-flow__node[data-id="user:beth"]' >/dev/null; $AB wait 500 >/dev/null
shot '[data-tour=graph]' graph-data

# editor errors and matrix views
fresh drive
$AB click '.cm-line:nth-child(13)' >/dev/null; $AB press End >/dev/null; $AB keyboard type ", publish" >/dev/null; $AB wait 600 >/dev/null
$AB hover '.cm-lintRange-error' >/dev/null; $AB wait 800 >/dev/null
shot '[data-tour=editor]' editor-error
tab "Problems"; shot '[data-tour=panels]' problems
fresh drive
radio "Matrix"; shot '[data-tour=editor]' matrix-resource
radio "Overview"; shot '[data-tour=editor]' matrix-overview

# panels, on a taller window so their content fits
$AB set viewport 1440 1500 2 >/dev/null
fresh drive
shot '[data-tour=panels]' check-allowed
setcheck bob edit document:salaries
shot '[data-tour=panels]' check-denied
tab "Tests"; shot '[data-tour=panels]' tests
tab "Data"; shot '[data-tour=panels]' data
tab "Matrix"; shot '[data-tour=panels]' user-matrix
tab "Syntax"; shot '[data-tour=panels]' syntax

cd "$OUT"
python3 - <<'PY'
from PIL import Image
Image.open("_store-menu.png").crop((0, 0, 1480, 860)).save("store-menu.png")
Image.open("_export-menu.png").crop((1740, 0, 2880, 320)).save("export-menu.png")
PY
rm -f _store-menu.png _export-menu.png
python3 "$HERE/trim.py" check-allowed.png check-denied.png tests.png data.png user-matrix.png problems.png syntax.png
