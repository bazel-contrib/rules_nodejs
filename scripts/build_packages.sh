#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly PACKAGES=${@:?"No package names specified"}

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)
readonly PACKAGES_DIR="${RULES_NODEJS_DIR}/packages"
readonly DIST_DIR="${RULES_NODEJS_DIR}/dist"

echo_and_run() { echo "+ $@" ; "$@" ; }

for package in ${PACKAGES[@]} ; do
  (
    readonly DEST_DIR="${DIST_DIR}/npm_bazel_${package}"

    # Build npm package
    printf "\n\nBuilding package ${package} //packages/${package}:npm_package\n"
    echo_and_run bazel build //packages/${package}:npm_package

    # Copy the npm_package to /dist
    echo "Copying npm package to ${DEST_DIR}"
    rm -rf ${DEST_DIR}
    mkdir -p ${DIST_DIR}
    readonly BAZEL_BIN=$(bazel info bazel-bin)
    echo_and_run cp -R "${BAZEL_BIN}/packages/${package}/npm_package" ${DEST_DIR}
    chmod -R u+w ${DEST_DIR}

    # Touch downstream package.json that depend on this package
    ${RULES_NODEJS_DIR}/scripts/touch_deps.sh ${package}
  )
done
