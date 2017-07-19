#!/bin/bash
set -e

readonly OUT=$($TEST_SRCDIR/build_bazel_rules_typescript/examples/some_module/bin)
if [ "$OUT" != "hello world" ]; then
  echo "Expected output 'hello world' but was $OUT"
  exit 1
fi
