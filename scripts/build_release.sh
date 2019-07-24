#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)
readonly DEST_DIR="${RULES_NODEJS_DIR}/release/build_bazel_rules_nodejs"
readonly UNTAR_DIR="${RULES_NODEJS_DIR}/release/build_bazel_rules_nodejs/release"

echo_and_run() { echo "+ $@" ; "$@" ; }

# Build rules_nodejs archive
printf "\n\nBuilding //:release archive\n"
cd ${RULES_NODEJS_DIR}
echo_and_run bazel build //:release

# Copy the release archive to /release
echo "Copying archive to ${DEST_DIR}"
rm -rf ${DEST_DIR}
mkdir -p ${DEST_DIR}
readonly BAZEL_BIN=$(bazel info bazel-bin)
echo_and_run cp "${BAZEL_BIN}/release.tar.gz" ${DEST_DIR}
chmod -R u+w ${DEST_DIR}

# Extract contents of archive
echo "Extracting archive to ${UNTAR_DIR}"
rm -rf ${UNTAR_DIR}
mkdir -p ${UNTAR_DIR}
echo_and_run tar xvzf "${DEST_DIR}/release.tar.gz" -C ${UNTAR_DIR}
chmod -R u+w ${UNTAR_DIR}
echo "workspace(name = \"build_bazel_rules_nodejs\")" >> ${UNTAR_DIR}/WORKSPACE
