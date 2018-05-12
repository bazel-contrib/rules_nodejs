#!/bin/bash
set -u
set -e

readonly TEST_BINARY="$1"

set +e
shift
"${TEST_BINARY}" "$@"
RESULT="$?"
set -e

if (( ${RESULT} == 0 )); then
  echo "Expected test to fail, but it succeeded" >&2
  exit 1
fi
