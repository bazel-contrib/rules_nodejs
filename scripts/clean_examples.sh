#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly EXAMPLES=${@:?"No example names specified"}

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)
readonly EXAMPLES_DIR="${RULES_NODEJS_DIR}/examples"

echo_and_run() { echo "+ $@" ; "$@" ; }

for example in ${EXAMPLES[@]} ; do
  (
    # Clean example
    cd "${EXAMPLES_DIR}/${example}"
    printf "\n\nCleaning example ${example}\n"
    echo_and_run bazel clean --expunge
    echo_and_run rm -rf `find . -type d -name node_modules -prune`
  )
done
