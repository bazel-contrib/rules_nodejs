#!/bin/bash
set -e

# --- begin runfiles.bash initialization ---
# Source the runfiles library:
# https://github.com/bazelbuild/bazel/blob/master/tools/bash/runfiles/runfiles.bash
# The runfiles library defines rlocation, which is a platform independent function
# used to lookup the runfiles locations. This code snippet is needed at the top
# of scripts that use rlocation to lookup the location of runfiles.bash and source it
if [[ ! -d "${RUNFILES_DIR:-/dev/null}" && ! -f "${RUNFILES_MANIFEST_FILE:-/dev/null}" ]]; then
    if [[ -f "$0.runfiles_manifest" ]]; then
      export RUNFILES_MANIFEST_FILE="$0.runfiles_manifest"
    elif [[ -f "$0.runfiles/MANIFEST" ]]; then
      export RUNFILES_MANIFEST_FILE="$0.runfiles/MANIFEST"
    elif [[ -f "$0.runfiles/bazel_tools/tools/bash/runfiles/runfiles.bash" ]]; then
      export RUNFILES_DIR="$0.runfiles"
    fi
fi
if [[ -f "${RUNFILES_DIR:-/dev/null}/bazel_tools/tools/bash/runfiles/runfiles.bash" ]]; then
  source "${RUNFILES_DIR}/bazel_tools/tools/bash/runfiles/runfiles.bash"
elif [[ -f "${RUNFILES_MANIFEST_FILE:-/dev/null}" ]]; then
  source "$(grep -m1 "^bazel_tools/tools/bash/runfiles/runfiles.bash " \
            "$RUNFILES_MANIFEST_FILE" | cut -d ' ' -f 2-)"
else
  echo >&2 "ERROR: cannot find @bazel_tools//tools/bash/runfiles:runfiles.bash"
  exit 1
fi
# --- end runfiles.bash initialization ---

readonly OUT=$($(rlocation "npm_bazel_typescript/examples/some_module/bin"))

if [ "$OUT" != "hello world" ]; then
  echo "Expected output 'hello world' but was $OUT"
  exit 1
fi
