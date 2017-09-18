#!/bin/bash
set -e

readonly EXPECTED="${TEST_TMPDIR}/EXPECTED.js"
(cat <<'EOF'
const name = 'Alice';

console.log(`Hello, ${name}`);
EOF
) > $EXPECTED

readonly ACTUAL="${TEST_SRCDIR}/build_bazel_rules_nodejs/examples/rollup/bundle.js"
diff $ACTUAL $EXPECTED || (
  echo "Expected"
  cat $EXPECTED
  echo "But was"
  cat $ACTUAL
  exit 1
)
