#!/bin/bash
set -e

readonly EXPECTED="${TEST_TMPDIR}/EXPECTED.txt"
(cat <<'EOF'
Hello, Node.js!
EOF
) > $EXPECTED

readonly EXPECTED="${TEST_TMPDIR}/ACTUAL.txt"
${TEST_SCRDIR}/build_bazel_rules_nodejs/examples/local/local.js

readonly ACTUAL="${TEST_SRCDIR}/build_bazel_rules_nodejs/examples/rollup/bundle.js"
diff $ACTUAL $EXPECTED || (
  echo "Expected"
  cat $EXPECTED
  echo "But was"
  cat $ACTUAL
  exit 1
)
