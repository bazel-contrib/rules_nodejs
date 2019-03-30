#!/usr/bin/env bash

set -eu -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

readonly RULES_NODEJS_DIR=$(cd $(dirname "$0")/..; pwd)

echo_and_run() { echo "+ $@" ; "$@" ; }

# sedi makes `sed -i` work on both OSX & Linux
# See https://stackoverflow.com/questions/2320564/i-need-my-sed-i-command-for-in-place-editing-to-work-with-both-gnu-sed-and-bsd
sedi () {
  case $(uname) in
    Darwin*) sedi=('-i' '') ;;
    *) sedi='-i' ;;
  esac

  sed "${sedi[@]}" "$@"
}

# Replaces "file://..." with absolute path to generated npm package under /dist/npm_bazel_foobar$RANDOM
# back to "bazel://@npm_bazel_foobar//:npm_package"
echo_and_run sedi "s#\"file://${RULES_NODEJS_DIR}/dist/npm_bazel_\([a-z_]*\)\$*[0-9]*\"#\"bazel://@npm_bazel_\1//:npm_package\"#" package.json
