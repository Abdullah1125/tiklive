#!/bin/zsh
cd -- "${0:A:h}" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null; then
  print "Node.js 22.9 veya üstünü kurup tekrar açın."
  exit 1
fi
# Wait for the local server before handing the panel to the browser.
address=$(node --env-file-if-exists=.env -p "'http://127.0.0.1:' + (process.env.PORT || 4317)")
is_ready() { curl -fsS --max-time 1 "$address/api/state" 2>/dev/null | grep -q '"capacity":'; }
if is_ready; then
  open "$address"
  exit
fi
(
  for attempt in {1..30}; do
    if is_ready; then open "$address"; exit; fi
    sleep 0.2
  done
) &
exec node --env-file-if-exists=.env server.js
