#!/usr/bin/env bash

set -u -e -o pipefail
# To dry-run: NPM_COMMAND=pack ./tools/publish_release.sh

readonly NPM_COMMAND=${NPM_COMMAND:-publish}
# Use a new output_base so we get a clean build
# Bazel can't know if the git metadata changed
readonly TMP=$(mktemp -d -t bazel-release.XXXXXXX)

for pkg in jasmine typescript; do (
    cd packages/$pkg
    bazel --output_base=$TMP run  --workspace_status_command=../../tools/current_version.sh //:npm_package.${NPM_COMMAND}
) done
