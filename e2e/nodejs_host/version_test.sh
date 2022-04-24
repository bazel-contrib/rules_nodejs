#!/bin/bash

# --- begin runfiles.bash initialization v2 ---
# Copy-pasted from the Bazel Bash runfiles library v2.
set -uo pipefail; f=build_bazel_rules_nodejs/third_party/github.com/bazelbuild/bazel/tools/bash/runfiles/runfiles.bash
source "${RUNFILES_DIR:-/dev/null}/$f" 2>/dev/null || \
  source "$(grep -sm1 "^$f " "${RUNFILES_MANIFEST_FILE:-/dev/null}" | cut -f2- -d' ')" 2>/dev/null || \
  source "$0.runfiles/$f" 2>/dev/null || \
  source "$(grep -sm1 "^$f " "$0.runfiles_manifest" | cut -f2- -d' ')" 2>/dev/null || \
  source "$(grep -sm1 "^$f " "$0.exe.runfiles_manifest" | cut -f2- -d' ')" 2>/dev/null || \
  { echo>&2 "ERROR: cannot find $f"; exit 1; }; f=; set -e
# --- end runfiles.bash initialization v2 ---

readonly EXPECTED_NODE_VERSION=$($(rlocation "$1/node") --version 2>&1)
readonly OUT=$($(rlocation "$1/$2") --verbose 2>&1)

echo "-----"
echo $OUT
echo "-----"

if ! [[ $OUT =~ .*node@$EXPECTED_NODE_VERSION.* ]]; then
  echo "Error: No match on expected node version $EXPECTED_NODE_VERSION"
  exit 1
fi

if ! [[ $OUT =~ .*"$1"/nodejs/bin/node.* ]]; then
  echo "Error: No match on expected node path $1/nodejs/bin/node"
  exit 1
fi

exit 0
