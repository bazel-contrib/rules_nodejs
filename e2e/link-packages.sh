#!/usr/bin/env bash

set -eux -o pipefail
# -e: exits if a command fails
# -u: errors if an variable is referenced before being set
# -x: shows the commands that get run
# -o pipefail: causes a pipeline to produce a failure return code if any command errors

# sedi makes `sed -i` work on both OSX & Linux
# See https://stackoverflow.com/questions/2320564/i-need-my-sed-i-command-for-in-place-editing-to-work-with-both-gnu-sed-and-bsd
sedi () {
  case $(uname) in
    Darwin*) sedi=('-i' '') ;;
    *) sedi='-i' ;;
  esac

  sed "${sedi[@]}" "$@"
}

sedi "s#\"bazel://@npm_bazel_jasmine//:npm_package\"#\"file://$PWD/../../packages/jasmine/bazel-bin/npm_package\"#" package.json
sedi "s#\"bazel://@npm_bazel_karma//:npm_package\"#\"file://$PWD/../../packages/karma/bazel-bin/npm_package\"#" package.json
sedi "s#\"bazel://@npm_bazel_typescript//:npm_package\"#\"file://$PWD/../../packages/typescript/bazel-bin/npm_package\"#" package.json