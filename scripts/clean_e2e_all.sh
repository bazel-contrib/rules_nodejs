#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)
readonly E2E_DIR="${RULES_NODEJS_DIR}/e2e"

readonly E2E=$(ls -l ${E2E_DIR} | grep "^d" | awk -F" " '{print $9}')

${RULES_NODEJS_DIR}/scripts/clean_e2e.sh ${E2E[@]}
