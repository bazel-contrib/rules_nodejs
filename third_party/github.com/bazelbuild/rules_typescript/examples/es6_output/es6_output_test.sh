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

readonly FOO_JS=$(cat $(rlocation "build_bazel_rules_typescript/examples/es6_output/es6_output.es6/examples/foo.js"))
readonly BAR_JS=$(cat $(rlocation "build_bazel_rules_typescript/examples/es6_output/es6_output.es6/examples/bar.js"))
readonly LIBRARY_JS=$(cat $(rlocation "build_bazel_rules_typescript/examples/es6_output/es6_output.es6/examples/some_library/library.js"))

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
