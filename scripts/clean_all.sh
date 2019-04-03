#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)
cd ${RULES_NODEJS_DIR}

echo_and_run() { echo "+ $@" ; "$@" ; }

echo_and_run rm -rf ./dist
echo_and_run rm -rf ./node_modules
echo_and_run rm -rf ./examples/program/node_modules
echo_and_run rm -rf ./internal/npm_install/test/package/node_modules

echo_and_run bazel clean --expunge

${RULES_NODEJS_DIR}/scripts/clean_e2e_all.sh
${RULES_NODEJS_DIR}/scripts/clean_examples_all.sh
${RULES_NODEJS_DIR}/scripts/clean_packages_all.sh

(
  cd internal/e2e
  for subDir in $(ls) ; do
    [[ -d "${subDir}" ]] || continue
    (
      cd ${subDir}
      if [[ -e 'WORKSPACE' ]] ; then
        printf "\n\nCleaning /internal/e2e/${subDir}\n"
        echo_and_run bazel clean --expunge
        echo_and_run rm -rf node_modules
      fi
    )
  done
)
