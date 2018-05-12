#!/bin/bash
set -u
set -e

readonly TEST_BINARY="$1"

set +e
shift
"${TEST_BINARY}" "$@"
RESULT="$?"
set -e

if (( ${RESULT} == 0 )); then
  echo "Expected test to fail, but it succeeded" >&2
  # This exit code is handled specially by Bazel:
  # https://github.com/bazelbuild/bazel/blob/486206012a664ecb20bdb196a681efc9a9825049/src/main/java/com/google/devtools/build/lib/util/ExitCode.java#L44
  BAZEL_EXIT_TESTS_FAILED = 3;
  exit ${BAZEL_EXIT_TESTS_FAILED}
fi
