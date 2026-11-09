#!/bin/bash
# Only dependency preparation belongs here; never wrap builds or tests.
set -euo pipefail
log=$(mktemp)
trap 'rm -f "$log"' EXIT
for attempt in 1 2 3; do
  if "$@" >"$log" 2>&1; then
    cat "$log"
    exit 0
  else
    status=$?
  fi
  cat "$log" >&2
  # Fail immediately for resolution, compilation, checksum or assertion errors.
  if ! grep -Eq 'badResponseStatusCode\((429|502|503|504)\)|HTTP response code: (429|502|503|504)|SocketTimeoutException|[Cc]onnection timed out|[Rr]ead timed out|Could not resolve host' "$log"; then
    exit "$status"
  fi
  if [ "$attempt" = 3 ]; then exit "$status"; fi
  echo "Transient dependency download failure; retry $attempt/2 in 10 seconds" >&2
  sleep 10
done
