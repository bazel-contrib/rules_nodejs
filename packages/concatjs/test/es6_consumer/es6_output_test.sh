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

readonly FOO_JS=$(cat $(rlocation "build_bazel_rules_nodejs/packages/concatjs/test/foobar/foo.mjs"))
readonly BAR_JS=$(cat $(rlocation "build_bazel_rules_nodejs/packages/concatjs/test/foobar/bar.mjs"))
readonly LIBRARY_JS=$(cat $(rlocation "build_bazel_rules_nodejs/packages/concatjs/test/some_library/library.mjs"))

# should not down-level ES2015 syntax, eg. `class`
if [[ "$FOO_JS" != *"class Greeter"* ]]; then
  echo "Expected foo.js to contain 'class Greeter' but was"
  echo "$FOO_JS"
  exit 1
fi

# should not down-level ES Modules
if [[ "$LIBRARY_JS" != *"export const cool = 1;"* ]]; then
  echo "Expected library.js to contain 'export const cool = 1;' but was"
  echo "$LIBRARY_JS"
  exit 1
fi

# should not down-level dynamic import
if [[ "$BAR_JS" != *"import('./foo')"* ]]; then
  echo "Expected bar.js to contain 'import('./foo')' but was"
  echo "$BAR_JS"
  exit 1
fi
