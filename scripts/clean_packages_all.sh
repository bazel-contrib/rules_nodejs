#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)
readonly PACKAGES_DIR="${RULES_NODEJS_DIR}/package"

readonly PACKAGES=$(ls ${PACKAGES_DIR})

${RULES_NODEJS_DIR}/scripts/clean_package.sh ${PACKAGES[@]}
