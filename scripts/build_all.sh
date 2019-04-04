#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)

${RULES_NODEJS_DIR}/scripts/build_release.sh
${RULES_NODEJS_DIR}/scripts/build_packages_all.sh
