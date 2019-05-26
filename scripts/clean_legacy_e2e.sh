#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly E2E_TESTS=${@:?"No e2e test names specified"}

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)
readonly E2E_DIR="${RULES_NODEJS_DIR}/internal/e2e"

echo_and_run() { echo "+ $@" ; "$@" ; }

for e2eTest in ${E2E_TESTS[@]} ; do
  (
    # Clean e2e test
    cd "${E2E_DIR}/${e2eTest}"
    printf "\n\nCleaning legacy e2e test ${e2eTest}\n"
    echo_and_run bazel clean --expunge
    echo_and_run rm -rf `find . -type d -name node_modules -prune`
  )
done
