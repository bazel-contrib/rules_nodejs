#!/bin/bash
set -e

# should produce named UMD modules
readonly A_JS=$(cat $TEST_SRCDIR/build_bazel_rules_typescript/examples/es5_output/a.js)
if [[ "$A_JS" != *"define(\"build_bazel_rules_typescript/examples/es5_output/a\","* ]]; then
  echo "Expected a.js to declare named module, but was"
  echo "$A_JS"
  exit 1
fi

# should give a name to required modules
readonly B_JS=$(cat $TEST_SRCDIR/build_bazel_rules_typescript/examples/es5_output/b.js)
if [[ "$B_JS" != *"require(\"build_bazel_rules_typescript/examples/es5_output/a\")"* ]]; then
  echo "Expected b.js to require named module a, but was"
  echo "$B_JS"
  exit 1
fi

# should give a name to required modules from other compilation unit
if [[ "$A_JS" != *"require(\"build_bazel_rules_typescript/examples/es5_output/rand/rand\")"* ]]; then
  echo "Expected a.js to require named module c, but was"
  echo "$A_JS"
  exit 1
fi

# should give a name to required generated modules without bazel-bin
if [[ "$B_JS" != *"require(\"build_bazel_rules_typescript/examples/es5_output/generated\")"* ]]; then
  echo "Expected b.js to require named module generated, but was"
  echo "$B_JS"
  exit 1
fi
