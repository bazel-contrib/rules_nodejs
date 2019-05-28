#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly EXAMPLES=${@:?"No example names specified"}

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)
readonly EXAMPLES_DIR="${RULES_NODEJS_DIR}/examples"
readonly KERNEL_NAME=$(uname -s)

echo_and_run() { echo "+ $@" ; "$@" ; }

for example in ${EXAMPLES[@]} ; do
  (
    # Test example
    if [[ ${example} == "vendored_node" && ${KERNEL_NAME} != Linux* ]] ; then
      printf "\n\nSkipping vendored_node test as it only runs on Linux while we are executing on ${KERNEL_NAME}\n"
    else
      cd "${EXAMPLES_DIR}/${example}"
      printf "\n\nRunning example ${example}\n"
      ${RULES_NODEJS_DIR}/scripts/check_deps.sh
      echo_and_run yarn test
      if grep -q "\"e2e\":" package.json; then
        echo_and_run yarn e2e
      fi
    fi
  )
done
