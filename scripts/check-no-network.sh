#!/usr/bin/env bash
# Pre-flight check: verify the extension code makes no network requests.
# The Chrome Web Store privacy declaration states no data collection/telemetry,
# so content.js/options.js must not use any network APIs.
set -euo pipefail

cd "$(dirname "$0")/.."

# Network request APIs: fetch, XHR, beacons, sockets, server-sent events.
pattern='fetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource'

status=0
for f in content.js options.js options.html; do
  if grep -nE "$pattern" "$f"; then
    echo "FAIL: potential network request found in $f" >&2
    status=1
  fi
done

if (( status != 0 )); then
  echo "FAIL: PRIVACY.md declares no network activity — fix the code or update the declaration." >&2
  exit 1
fi

echo "OK: no network request APIs in content.js, options.js, options.html"
