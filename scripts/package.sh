#!/usr/bin/env bash
# Build the Chrome Web Store zip package into dist/
set -euo pipefail

cd "$(dirname "$0")/.."

version=$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')
out="dist/gmail-shortcuts-v${version}.zip"

mkdir -p dist
rm -f "$out"

zip -r "$out" \
  manifest.json \
  content.js \
  options.html \
  options.js \
  icons/ \
  PRIVACY.md

echo
echo "Package created: $out"
unzip -l "$out"
