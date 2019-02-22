#!/usr/bin/env bash

set -u -e -o pipefail

# Publishes our npm packages
# To dry-run:
#   NPM_COMMAND=pack ./tools/publish_release.sh
# To verify:
#   for p in $(ls packages); do if [[ -d packages/$p ]]; then b="@bazel/$p"; echo -ne "\n$b\n-------\n"; npm dist-tag ls $b; fi; done

readonly NPM_COMMAND=${NPM_COMMAND:-publish}
# Use a new output_base so we get a clean build
# Bazel can't know if the git metadata changed
readonly TMP=$(mktemp -d -t bazel-release.XXXXXXX)

for pkg in jasmine typescript karma; do (
    cd packages/$pkg
    bazel --output_base=$TMP run  --workspace_status_command=../../tools/current_version.sh //:npm_package.${NPM_COMMAND}
) done
