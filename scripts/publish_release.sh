#!/usr/bin/env bash

set -u -e -o pipefail

# Publishes our npm packages
# To dry-run:
#   ./scripts/publish_release.sh pack
# To verify:
#   for p in $(ls packages); do if [[ -d packages/$p ]]; then b="@bazel/$p"; echo -ne "\n$b\n-------\n"; npm dist-tag ls $b; fi; done
# Googlers: you should npm login using the go/npm-publish service:
# $ npm login --registry https://wombat-dressing-room.appspot.com

readonly NPM_COMMAND=${1:-publish}
readonly BAZEL_BIN=./node_modules/.bin/bazel

# Use a new output_base so we get a clean build
# Bazel can't know if the git metadata changed
readonly TMP=$(mktemp -d -t bazel-release.XXXXXXX)
readonly BAZEL="$BAZEL_BIN --output_base=$TMP"
readonly PKG_NPM_LABELS=`$BAZEL query --output=label 'kind("pkg_npm rule", //packages/...) - attr("tags", "\[.*do-not-publish.*\]", //packages/...)'`

$BAZEL build --config=release $PKG_NPM_LABELS
# publish one package at a time to make it easier to spot any errors or warnings
for pkg in $PKG_NPM_LABELS ; do
  $BAZEL run --config=release -- ${pkg}.${NPM_COMMAND} --access public --tag latest ${NPM_REGISTRY:-}
done
