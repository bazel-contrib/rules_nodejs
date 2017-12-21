#!/bin/bash
set -e

# should not down-level ES2015 syntax, eg. `class`
readonly FOO_JS=$(cat $TEST_SRCDIR/build_bazel_rules_typescript/examples/es6_output/es6_output.es6/examples/foo.js)
if [[ "$FOO_JS" != *"class Greeter"* ]]; then
  echo "Expected foo.js to contain 'class Greeter' but was"
  echo "$FOO_JS"
  exit 1
fi

# should not down-level ES2015 syntax, eg. `class`
readonly LIBRARY_JS=$(cat $TEST_SRCDIR/build_bazel_rules_typescript/examples/es6_output/es6_output.es6/examples/some_library/library.js)
if [[ "$LIBRARY_JS" != *"export const cool = 1;"* ]]; then
  echo "Expected library.js to contain 'export const cool = 1;' but was"
  echo "$LIBRARY_JS"
  exit 1
fi
