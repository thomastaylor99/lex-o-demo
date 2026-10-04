#!/usr/bin/env bash
# Stop hook. When files changed since the last passing run, run the quick checks.
# On failure, exit 2: Claude sees the verdict and keeps working. The retry turn is never blocked.

input="$(cat)"
if [[ "$(jq -r '.stop_hook_active // false' <<<"$input" 2>/dev/null)" == "true" ]]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}" || exit 0
stamp=".claude/.verify-pass"

# fingerprint of every tracked and untracked file that git does not ignore
fingerprint="$(git ls-files -co --exclude-standard -z 2>/dev/null \
  | xargs -0 shasum 2>/dev/null | shasum | cut -d' ' -f1)"
if [[ -f "$stamp" && "$(cat "$stamp")" == "$fingerprint" ]]; then
  exit 0
fi

if output="$(scripts/verify --quick 2>&1)"; then
  printf '%s\n' "$fingerprint" > "$stamp"
  exit 0
fi

{
  echo "scripts/verify --quick failed. Fix what you can, then explain anything left."
  echo
  tail -n 40 <<<"$output"
} >&2
exit 2
