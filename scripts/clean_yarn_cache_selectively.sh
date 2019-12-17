#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly YARN_CACHE_ROOT=$(dirname $(yarn cache dir))

echo_and_run() { echo "+ $@" ; "$@" ; }

echo "yarn cache root: ${YARN_CACHE_ROOT}"

readonly PKG_NPM_LABELS=`bazel query --output=package 'kind("pkg_npm", //packages/...)'`

for npmPackageLabel in ${PKG_NPM_LABELS[@]} ; do
  # Trim packages/foobar to foobar
  package=$(echo ${npmPackageLabel} | cut -c 10-)
  echo_and_run yarn cache clean @bazel/${package}
  # Also clean cache for different versions of yarn since the locally installed
  # yarn may have a different cache version from yarn version used by Bazel
  echo_and_run rm -rf ${YARN_CACHE_ROOT}/*/npm-@bazel-${package}-*
done
