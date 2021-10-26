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

readonly LIBRARY_JS=$(cat $(rlocation "build_bazel_rules_nodejs/packages/concatjs/test/some_library/library.js"))
readonly BAR_JS=$(cat $(rlocation "build_bazel_rules_nodejs/packages/concatjs/test/foobar/bar.js"))
readonly FOO_JS=$(cat $(rlocation "build_bazel_rules_nodejs/packages/concatjs/test/foobar/foo.js"))

# should produce named UMD modules
if [[ "$LIBRARY_JS" != *"define(\"some-lib\""* ]]; then
  echo "Expected library.js to declare module named some-lib, but was"
  echo "$LIBRARY_JS"
  exit 1
fi

# should produce named UMD modules
if [[ "$BAR_JS" != *"define(\"build_bazel_rules_nodejs/packages/concatjs/test/foobar/bar\""* ]]; then
  echo "Expected bar.js to declare named module, but was"
  echo "$BAR_JS"
  exit 1
fi

# should give a name to required modules
if [[ "$BAR_JS" != *"require(\"build_bazel_rules_nodejs/packages/concatjs/test/foobar/foo\")"* ]]; then
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
if [[ "$BAR_JS" != *"require(\"build_bazel_rules_nodejs/packages/concatjs/test/generated_ts/foo\")"* ]]; then
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
if [[ "$FOO_JS" != *"define(\"build_bazel_rules_nodejs/packages/concatjs/test/foobar/foo\""* ]]; then
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