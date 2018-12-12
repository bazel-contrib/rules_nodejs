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

readonly LIBRARY_JS=$(cat $(rlocation "build_bazel_rules_typescript/examples/some_library/library.js"))
readonly BAR_JS=$(cat $(rlocation "build_bazel_rules_typescript/examples/bar.js"))
readonly FOO_JS=$(cat $(rlocation "build_bazel_rules_typescript/examples/foo.js"))

# should produce named UMD modules
if [[ "$LIBRARY_JS" != *"define(\"some-lib\""* ]]; then
  echo "Expected library.js to declare module named some-lib, but was"
  echo "$LIBRARY_JS"
  exit 1
fi

# should produce named UMD modules
if [[ "$BAR_JS" != *"define(\"build_bazel_rules_typescript/examples/bar\""* ]]; then
  echo "Expected bar.js to declare named module, but was"
  echo "$BAR_JS"
  exit 1
fi

# should give a name to required modules
if [[ "$BAR_JS" != *"require(\"build_bazel_rules_typescript/examples/foo\")"* ]]; then
  echo "Expected bar.js to require named module foo, but was"
  echo "$BAR_JS"
  exit 1
fi

# should give a name to required modules from other compilation unit
if [[ "$BAR_JS" != *"require(\"some-lib\")"* ]]; then
  echo "Expected bar.js to require named module library, but was"
  echo "$BAR_JS"
  exit 1
fi

# should give a name to required generated modules without bazel-bin
if [[ "$BAR_JS" != *"require(\"build_bazel_rules_typescript/examples/generated_ts/foo\")"* ]]; then
  echo "Expected bar.js to require generated named module foo, but was"
  echo "$BAR_JS"
  exit 1
fi

# should not give a module name to external modules
if [[ "$BAR_JS" != *"require(\"typescript\")"* ]]; then
  echo "Expected bar.js to require typescript by its original name, but was"
  echo "$BAR_JS"
  exit 1
fi

# should produce named UMD modules
if [[ "$FOO_JS" != *"define(\"build_bazel_rules_typescript/examples/foo\""* ]]; then
  echo "Expected foo.js to declare named module, but was"
  echo "$FOO_JS"
  exit 1
fi

# should produce es2015 classes
if [[ "$FOO_JS" != *"class Greeter"* ]]; then
  echo "Expected foo.js produce a es2015, but was"
  echo "$FOO_JS"
  exit 1
fi