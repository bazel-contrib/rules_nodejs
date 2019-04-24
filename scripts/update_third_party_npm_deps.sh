#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)

(
  cd ${RULES_NODEJS_DIR}/third_party/npm
  rm -rf node_modules
  rm -f BUILD.bazel
  yarn
  node ./generate_build_files.js
)
