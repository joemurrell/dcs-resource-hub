#!/usr/bin/env bash
# Runs the same checks CI runs, locally. From the repo root: `script/test.sh`.
set -euo pipefail

# The SCSS converter needs a UTF-8 locale (the stylesheet has em-dashes).
export LANG="${LANG:-C.UTF-8}"
export LC_ALL="${LC_ALL:-C.UTF-8}"

cd "$(dirname "$0")/.."

echo "==> Validating _data/resources.yml"
ruby script/validate_resources.rb

echo "==> Syntax-checking the Cloudflare Worker"
node --check worker/src/index.js

echo "==> Running worker unit tests"
( cd worker && node --test )

echo "==> Building the site"
JEKYLL_ENV=production bundle exec jekyll build --trace

echo "==> Proofing generated HTML"
bundle exec htmlproofer ./_site \
  --disable-external \
  --allow-hash-href \
  --ignore-urls "/^\/dcs-resource-hub/"

echo "==> All checks passed."
