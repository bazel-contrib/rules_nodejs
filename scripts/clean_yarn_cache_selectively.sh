#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly YARN_CACHE_ROOT=$(dirname $(yarn cache dir))
readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)
source "${RULES_NODEJS_DIR}/scripts/packages.sh"

echo_and_run() { echo "+ $@" ; "$@" ; }

echo "yarn cache root: ${YARN_CACHE_ROOT}"

for package in ${PACKAGES[@]} ; do
  echo_and_run yarn cache clean @bazel/${package}
done

# Also clean cache for different versions of yarn since the locally installed
# yarn may have a different cache version from yarn version used by Bazel
for package in ${PACKAGES[@]} ; do
  echo_and_run rm -rf ${YARN_CACHE_ROOT}/*/npm-@bazel-${package}-*
done
