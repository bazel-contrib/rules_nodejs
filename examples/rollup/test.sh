#!/bin/bash
set -e

readonly EXPECTED="${TEST_TMPDIR}/EXPECTED.js"
(cat <<'EOF'
const name = 'Alice';

console.log(`Hello, ${name}`);
EOF
) > $EXPECTED

readonly BUNDLE="build_bazel_rules_nodejs/examples/rollup/bundle.js"

# On Windows, the runfiles symlink tree does not exist, so we must resolve paths
# using the mapping in the runfiles_manifest file.
# See https://github.com/bazelbuild/bazel/issues/3726
if [[ -n "$RUNFILES_MANIFEST_ONLY" ]]; then
  readonly MANIFEST="${RUNFILES_MANIFEST_FILE}"
  # Lookup the real paths from the runfiles manifest with no dependency on posix
  while read line; do
    declare -a PARTS=($line)
    if [ "${PARTS[0]}" == "${BUNDLE}" ]; then
      readonly ACTUAL="${PARTS[1]}"
    fi
  done < ${MANIFEST}
  if [ -z "${ACTUAL}" ]; then
    echo "Failed to find ${BUNDLE} in manifest ${MANIFEST}"
    exit 1
  fi
else
  readonly ACTUAL="${TEST_SRCDIR}/${BUNDLE}"
fi

echo "TEST_SRCDIR" $TEST_SRCDIR
echo "ACTUAL" $ACTUAL
echo "EXPECTED" $EXPECTED

diff $ACTUAL $EXPECTED || (
  echo "Expected"
  cat $EXPECTED
  echo "But was"
  cat $ACTUAL
  exit 1
)
